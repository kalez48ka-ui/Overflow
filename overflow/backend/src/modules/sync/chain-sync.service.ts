import { PrismaClient, Prisma } from '@prisma/client';
import { ethers } from 'ethers';
import { Server as SocketServer } from 'socket.io';
import { config } from '../../config';
import { PriceService } from '../price/price.service';
import { VaultService } from '../vault/vault.service';

/**
 * Minimal ABI for the TeamTokenFactory events we need to listen to.
 * Sourced from the compiled artifact at contracts/artifacts/contracts/TeamTokenFactory.sol/TeamTokenFactory.json
 *
 * TokensPurchased: emitted on every buy() call
 *   - token (indexed): ERC-20 team token address
 *   - buyer (indexed): wallet that purchased
 *   - amount: tokens minted (in wei, 18 decimals)
 *   - cost: ETH/WIRE spent (in wei, 18 decimals)
 *   - fee: buy fee deducted (in wei, 18 decimals)
 *
 * TokensSold: emitted on every sell() call
 *   - token (indexed): ERC-20 team token address
 *   - seller (indexed): wallet that sold
 *   - amount: tokens burned (in wei, 18 decimals)
 *   - proceeds: ETH/WIRE received by seller (in wei, 18 decimals)
 *   - fee: sell fee deducted (in wei, 18 decimals)
 */
const FACTORY_ABI = [
  'event TokensPurchased(address indexed token, address indexed buyer, uint256 amount, uint256 cost, uint256 fee)',
  'event TokensSold(address indexed token, address indexed seller, uint256 amount, uint256 proceeds, uint256 fee)',
];

/** How often to poll for missed events (milliseconds) */
const POLL_INTERVAL_MS = 30_000;

/** How many blocks to scan in a single batch during catch-up */
const BATCH_SIZE = 2000;

/** Retry delay when RPC is unreachable (milliseconds) */
const RETRY_DELAY_MS = 30_000;

/** Cache of token address (lowercased) -> team DB record */
interface CachedTeam {
  id: string;
  symbol: string;
  name: string;
  sellTaxRate: number;
}

export class ChainSyncService {
  private prisma: PrismaClient;
  private priceService: PriceService;
  private vaultService: VaultService;
  private io: SocketServer;

  private provider: ethers.JsonRpcProvider | null = null;
  private contract: ethers.Contract | null = null;

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private lastProcessedBlock = 0;

  /** In-memory cache: lowercased token address -> team record */
  private teamCache: Map<string, CachedTeam> = new Map();

  constructor(
    prisma: PrismaClient,
    priceService: PriceService,
    vaultService: VaultService,
    io: SocketServer,
  ) {
    this.prisma = prisma;
    this.priceService = priceService;
    this.vaultService = vaultService;
    this.io = io;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    console.log('[ChainSync] Starting on-chain event sync...');

    try {
      const wirefluid = ethers.Network.from(92533);
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl, wirefluid, { staticNetwork: wirefluid });
      this.contract = new ethers.Contract(config.factoryAddress, FACTORY_ABI, this.provider);
      console.log(`[ChainSync] Connected to RPC: ${config.rpcUrl}`);
      console.log(`[ChainSync] Watching factory: ${config.factoryAddress}`);
    } catch (err) {
      console.warn('[ChainSync] Failed to connect to RPC, will retry in background:', (err as Error).message);
      this.scheduleRetry();
      return;
    }

    // Load team cache
    await this.refreshTeamCache();

    // Load last processed block from DB
    await this.loadSyncState();

    // Catch up on missed events
    await this.catchUp();

    // Start real-time event listeners
    this.attachListeners();

    // Start periodic poll as backup
    this.pollTimer = setInterval(() => {
      this.pollForEvents().catch((err) => {
        console.error('[ChainSync] Poll error:', err);
      });
    }, POLL_INTERVAL_MS);

    console.log('[ChainSync] Sync service started successfully');
  }

  stop(): void {
    this.running = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.contract) {
      this.contract.removeAllListeners();
    }

    console.log('[ChainSync] Sync service stopped');
  }

  // ---------------------------------------------------------------------------
  // Initialization helpers
  // ---------------------------------------------------------------------------

  private async refreshTeamCache(): Promise<void> {
    const teams = await this.prisma.team.findMany({
      select: { id: true, symbol: true, name: true, tokenAddress: true, sellTaxRate: true },
    });

    this.teamCache.clear();
    for (const team of teams) {
      if (team.tokenAddress) {
        this.teamCache.set(team.tokenAddress.toLowerCase(), {
          id: team.id,
          symbol: team.symbol,
          name: team.name,
          sellTaxRate: Number(team.sellTaxRate),
        });
      }
    }

    console.log(`[ChainSync] Cached ${this.teamCache.size} team token addresses`);
  }

  private async loadSyncState(): Promise<void> {
    const state = await this.prisma.syncState.findUnique({
      where: { id: 'chain-sync' },
    });

    if (state) {
      this.lastProcessedBlock = state.lastBlock;
      console.log(`[ChainSync] Resuming from block ${this.lastProcessedBlock}`);
    } else {
      // First run: start from current block (no historical scan on first deploy)
      try {
        const currentBlock = await this.provider!.getBlockNumber();
        this.lastProcessedBlock = currentBlock;
        await this.prisma.syncState.create({
          data: { id: 'chain-sync', lastBlock: currentBlock },
        });
        console.log(`[ChainSync] First run — starting from current block ${currentBlock}`);
      } catch (err) {
        console.error('[ChainSync] Failed to get current block number:', err);
        this.lastProcessedBlock = 0;
      }
    }
  }

  private async saveSyncState(blockNumber: number): Promise<void> {
    this.lastProcessedBlock = blockNumber;
    await this.prisma.syncState.upsert({
      where: { id: 'chain-sync' },
      create: { id: 'chain-sync', lastBlock: blockNumber, lastSyncedAt: new Date() },
      update: { lastBlock: blockNumber, lastSyncedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // Catch-up: process historical events from last processed block to current
  // ---------------------------------------------------------------------------

  private async catchUp(): Promise<void> {
    if (!this.provider || !this.contract) return;

    try {
      const currentBlock = await this.provider.getBlockNumber();

      if (this.lastProcessedBlock >= currentBlock) {
        console.log('[ChainSync] Already up to date');
        return;
      }

      console.log(`[ChainSync] Catching up from block ${this.lastProcessedBlock + 1} to ${currentBlock}`);

      let fromBlock = this.lastProcessedBlock + 1;

      while (fromBlock <= currentBlock) {
        const toBlock = Math.min(fromBlock + BATCH_SIZE - 1, currentBlock);

        const [buyEvents, sellEvents] = await Promise.all([
          this.contract.queryFilter('TokensPurchased', fromBlock, toBlock),
          this.contract.queryFilter('TokensSold', fromBlock, toBlock),
        ]);

        // Merge and sort by block number, then log index for deterministic ordering
        const allEvents = [...buyEvents, ...sellEvents].sort((a, b) => {
          if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
          return a.index - b.index;
        });

        for (const event of allEvents) {
          const eventLog = event as ethers.EventLog;
          if (eventLog.eventName === 'TokensPurchased') {
            await this.handleTokensPurchased(eventLog);
          } else if (eventLog.eventName === 'TokensSold') {
            await this.handleTokensSold(eventLog);
          }
        }

        if (allEvents.length > 0) {
          console.log(`[ChainSync] Processed ${allEvents.length} events in blocks ${fromBlock}-${toBlock}`);
        }

        await this.saveSyncState(toBlock);
        fromBlock = toBlock + 1;
      }

      console.log(`[ChainSync] Catch-up complete at block ${currentBlock}`);
    } catch (err) {
      console.error('[ChainSync] Catch-up failed:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Real-time listeners
  // ---------------------------------------------------------------------------

  private attachListeners(): void {
    if (!this.contract) return;

    this.contract.on('TokensPurchased', async (...args: unknown[]) => {
      try {
        const event = args[args.length - 1] as ethers.ContractEventPayload;
        const log = event.log as ethers.EventLog;
        await this.handleTokensPurchased(log);
        await this.saveSyncState(log.blockNumber);
      } catch (err) {
        console.error('[ChainSync] Error processing TokensPurchased event:', err);
      }
    });

    this.contract.on('TokensSold', async (...args: unknown[]) => {
      try {
        const event = args[args.length - 1] as ethers.ContractEventPayload;
        const log = event.log as ethers.EventLog;
        await this.handleTokensSold(log);
        await this.saveSyncState(log.blockNumber);
      } catch (err) {
        console.error('[ChainSync] Error processing TokensSold event:', err);
      }
    });

    console.log('[ChainSync] Real-time event listeners attached');
  }

  // ---------------------------------------------------------------------------
  // Periodic poll (backup for dropped WebSocket connections)
  // ---------------------------------------------------------------------------

  private async pollForEvents(): Promise<void> {
    if (!this.provider || !this.contract) return;

    try {
      const currentBlock = await this.provider.getBlockNumber();

      if (this.lastProcessedBlock >= currentBlock) return;

      const fromBlock = this.lastProcessedBlock + 1;
      const toBlock = Math.min(fromBlock + BATCH_SIZE - 1, currentBlock);

      const [buyEvents, sellEvents] = await Promise.all([
        this.contract.queryFilter('TokensPurchased', fromBlock, toBlock),
        this.contract.queryFilter('TokensSold', fromBlock, toBlock),
      ]);

      const allEvents = [...buyEvents, ...sellEvents].sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
        return a.index - b.index;
      });

      for (const event of allEvents) {
        const eventLog = event as ethers.EventLog;
        if (eventLog.eventName === 'TokensPurchased') {
          await this.handleTokensPurchased(eventLog);
        } else if (eventLog.eventName === 'TokensSold') {
          await this.handleTokensSold(eventLog);
        }
      }

      if (allEvents.length > 0) {
        console.log(`[ChainSync] Poll: processed ${allEvents.length} events in blocks ${fromBlock}-${toBlock}`);
      }

      await this.saveSyncState(toBlock);
    } catch (err) {
      console.error('[ChainSync] Poll error:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle a TokensPurchased event (on-chain buy).
   *
   * Event args: (token indexed, buyer indexed, amount, cost, fee)
   * All uint256 values are in wei (18 decimals).
   */
  private async handleTokensPurchased(event: ethers.EventLog): Promise<void> {
    const txHash = event.transactionHash;

    // Deduplication: skip if already processed
    if (await this.isDuplicate(txHash)) return;

    const [tokenAddress, buyerAddress] = [
      (event.args[0] as string).toLowerCase(),
      (event.args[1] as string).toLowerCase(),
    ];
    const amountWei = event.args[2] as bigint;
    const costWei = event.args[3] as bigint;
    const feeWei = event.args[4] as bigint;

    // Convert from wei (18 decimals) to human-readable numbers
    const amount = parseFloat(ethers.formatEther(amountWei));
    const cost = parseFloat(ethers.formatEther(costWei));
    const fee = parseFloat(ethers.formatEther(feeWei));
    const price = amount > 0 ? cost / amount : 0;

    // Find team by token address
    const team = this.teamCache.get(tokenAddress);
    if (!team) {
      console.warn(`[ChainSync] TokensPurchased: unknown token address ${tokenAddress}, skipping`);
      return;
    }

    console.log(
      `[ChainSync] BUY: ${buyerAddress.slice(0, 8)}... bought ${amount.toFixed(4)} ${team.symbol} ` +
      `for ${cost.toFixed(4)} WIRE (fee: ${fee.toFixed(4)}) tx: ${txHash.slice(0, 10)}...`,
    );

    try {
      // Create trade + upsert position in a transaction
      await this.prisma.$transaction(async (tx) => {
        // Double-check dedup inside the transaction (race condition guard)
        const existing = await tx.trade.findUnique({ where: { txHash } });
        if (existing) return;

        await tx.trade.create({
          data: {
            teamId: team.id,
            wallet: buyerAddress,
            type: 'BUY',
            amount,
            price,
            totalValue: cost,
            fee,
            taxRate: 0,
            txHash,
          },
        });

        // Upsert position
        const existingPos = await tx.position.findUnique({
          where: { wallet_teamId: { wallet: buyerAddress, teamId: team.id } },
        });

        if (existingPos) {
          const existingAmount = new Prisma.Decimal(existingPos.amount);
          const decAmount = new Prisma.Decimal(amount);
          const newAmount = existingAmount.add(decAmount);
          const newAvg = new Prisma.Decimal(existingPos.avgBuyPrice)
            .mul(existingAmount)
            .add(new Prisma.Decimal(price).mul(decAmount))
            .div(newAmount);

          await tx.position.update({
            where: { id: existingPos.id },
            data: { amount: newAmount, avgBuyPrice: newAvg },
          });
        } else {
          await tx.position.create({
            data: {
              wallet: buyerAddress,
              teamId: team.id,
              amount,
              avgBuyPrice: price,
            },
          });
        }
      }, { isolationLevel: 'RepeatableRead' });

      // Side effects outside the transaction (non-critical)
      await this.priceService.updatePriceAfterTrade(team.id, 'BUY', amount, price).catch((err) => {
        console.error(`[ChainSync] Failed to update price after BUY:`, err);
      });

      // Add buy fee to vault (the fee is already deducted on-chain, mirror it in DB)
      if (fee > 0) {
        await this.vaultService.addToVault(fee).catch((err) => {
          console.error(`[ChainSync] Failed to add fee to vault:`, err);
        });
      }

      // Emit socket event
      this.io.to(`team:${team.symbol}`).emit('trade:new', {
        teamSymbol: team.symbol,
        teamName: team.name,
        type: 'BUY',
        amount,
        price,
        totalValue: cost,
        fee,
        wallet: buyerAddress.slice(0, 6) + '...' + buyerAddress.slice(-4),
        txHash,
        timestamp: new Date().toISOString(),
        source: 'on-chain',
      });
    } catch (err) {
      // Log but don't crash — the poll will retry on next cycle if the tx wasn't saved
      console.error(`[ChainSync] Failed to process BUY tx ${txHash}:`, err);
    }
  }

  /**
   * Handle a TokensSold event (on-chain sell).
   *
   * Event args: (token indexed, seller indexed, amount, proceeds, fee)
   * All uint256 values are in wei (18 decimals).
   */
  private async handleTokensSold(event: ethers.EventLog): Promise<void> {
    const txHash = event.transactionHash;

    // Deduplication
    if (await this.isDuplicate(txHash)) return;

    const [tokenAddress, sellerAddress] = [
      (event.args[0] as string).toLowerCase(),
      (event.args[1] as string).toLowerCase(),
    ];
    const amountWei = event.args[2] as bigint;
    const proceedsWei = event.args[3] as bigint;
    const feeWei = event.args[4] as bigint;

    const amount = parseFloat(ethers.formatEther(amountWei));
    const proceeds = parseFloat(ethers.formatEther(proceedsWei));
    const fee = parseFloat(ethers.formatEther(feeWei));
    const price = amount > 0 ? proceeds / amount : 0;

    const team = this.teamCache.get(tokenAddress);
    if (!team) {
      console.warn(`[ChainSync] TokensSold: unknown token address ${tokenAddress}, skipping`);
      return;
    }

    console.log(
      `[ChainSync] SELL: ${sellerAddress.slice(0, 8)}... sold ${amount.toFixed(4)} ${team.symbol} ` +
      `for ${proceeds.toFixed(4)} WIRE (fee: ${fee.toFixed(4)}) tx: ${txHash.slice(0, 10)}...`,
    );

    try {
      await this.prisma.$transaction(async (tx) => {
        // Double-check dedup inside transaction
        const existing = await tx.trade.findUnique({ where: { txHash } });
        if (existing) return;

        // Refresh sell tax from cache (may differ from on-chain fee, but record actual on-chain fee)
        await tx.trade.create({
          data: {
            teamId: team.id,
            wallet: sellerAddress,
            type: 'SELL',
            amount,
            price,
            totalValue: proceeds,
            fee,
            taxRate: team.sellTaxRate,
            txHash,
          },
        });

        // Update position: decrement amount, delete if zero
        const existingPos = await tx.position.findUnique({
          where: { wallet_teamId: { wallet: sellerAddress, teamId: team.id } },
        });

        if (existingPos) {
          const newAmount = new Prisma.Decimal(existingPos.amount).sub(new Prisma.Decimal(amount));
          if (newAmount.lte(0)) {
            await tx.position.delete({ where: { id: existingPos.id } });
          } else {
            await tx.position.update({
              where: { id: existingPos.id },
              data: { amount: newAmount },
            });
          }
        } else {
          // Position doesn't exist in DB — the sell happened on-chain before we started syncing.
          // Log it but don't fail; the trade record is still valuable for history.
          console.warn(
            `[ChainSync] SELL for ${sellerAddress} on ${team.symbol} but no position in DB. ` +
            `Trade recorded without position update.`,
          );
        }
      }, { isolationLevel: 'RepeatableRead' });

      // Side effects outside the transaction
      await this.priceService.updatePriceAfterTrade(team.id, 'SELL', amount, price).catch((err) => {
        console.error(`[ChainSync] Failed to update price after SELL:`, err);
      });

      // Sell fees also go to vault
      if (fee > 0) {
        await this.vaultService.addToVault(fee).catch((err) => {
          console.error(`[ChainSync] Failed to add sell fee to vault:`, err);
        });
      }

      // Emit socket event
      this.io.to(`team:${team.symbol}`).emit('trade:new', {
        teamSymbol: team.symbol,
        teamName: team.name,
        type: 'SELL',
        amount,
        price,
        totalValue: proceeds,
        fee,
        wallet: sellerAddress.slice(0, 6) + '...' + sellerAddress.slice(-4),
        txHash,
        timestamp: new Date().toISOString(),
        source: 'on-chain',
      });
    } catch (err) {
      console.error(`[ChainSync] Failed to process SELL tx ${txHash}:`, err);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Check if a transaction hash has already been recorded in the trades table.
   * Uses the unique index on txHash for an efficient lookup.
   */
  private async isDuplicate(txHash: string): Promise<boolean> {
    const existing = await this.prisma.trade.findUnique({ where: { txHash } });
    return existing !== null;
  }

  /**
   * Schedule a retry when initial RPC connection fails.
   * Keeps trying every RETRY_DELAY_MS until connected.
   */
  private scheduleRetry(): void {
    const retryTimer = setInterval(async () => {
      if (!this.running) {
        clearInterval(retryTimer);
        return;
      }

      console.log('[ChainSync] Retrying RPC connection...');

      try {
        const wirefluid = ethers.Network.from(92533);
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl, wirefluid, { staticNetwork: wirefluid });
        // Test the connection by fetching block number
        await this.provider.getBlockNumber();
        this.contract = new ethers.Contract(config.factoryAddress, FACTORY_ABI, this.provider);

        console.log(`[ChainSync] RPC reconnected: ${config.rpcUrl}`);
        clearInterval(retryTimer);

        // Resume normal startup sequence
        await this.refreshTeamCache();
        await this.loadSyncState();
        await this.catchUp();
        this.attachListeners();

        this.pollTimer = setInterval(() => {
          this.pollForEvents().catch((err) => {
            console.error('[ChainSync] Poll error:', err);
          });
        }, POLL_INTERVAL_MS);
      } catch {
        console.warn('[ChainSync] RPC still unreachable, will retry...');
      }
    }, RETRY_DELAY_MS);
  }
}
