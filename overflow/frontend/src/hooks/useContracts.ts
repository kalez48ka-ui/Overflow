import { useReadContract, useWriteContract, useWatchContractEvent } from "wagmi";
import { parseEther, formatEther, type Address } from "viem";
import { useCallback, useState } from "react";
import {
  TeamTokenFactoryABI,
  TeamTokenABI,
  PerformanceOracleABI,
  RewardDistributorABI,
  UpsetVaultABI,
  CircuitBreakerABI,
} from "@/contracts/abis";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** WireFluid Testnet chain ID — all write transactions target this chain. */
const WIREFLUID_CHAIN_ID = 92533 as const;

/** Sentinel zero address used when env vars are missing. */
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// ---------------------------------------------------------------------------
// Contract addresses -- populated from env vars, fallback to zero-placeholders
// ---------------------------------------------------------------------------
export const CONTRACTS = {
  factory: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ||
    ZERO_ADDRESS) as Address,
  oracle: (process.env.NEXT_PUBLIC_ORACLE_ADDRESS ||
    ZERO_ADDRESS) as Address,
  rewards: (process.env.NEXT_PUBLIC_REWARDS_ADDRESS ||
    ZERO_ADDRESS) as Address,
  vault: (process.env.NEXT_PUBLIC_VAULT_ADDRESS ||
    ZERO_ADDRESS) as Address,
  circuitBreaker: (process.env.NEXT_PUBLIC_CIRCUIT_BREAKER_ADDRESS ||
    ZERO_ADDRESS) as Address,
} as const;

/** Returns true when contract address is deployed (not zero). */
function isDeployed(addr: Address): boolean {
  return addr !== ZERO_ADDRESS;
}

// ---------------------------------------------------------------------------
// Factory hooks
// ---------------------------------------------------------------------------

/** Buy team tokens via the Factory's bonding curve (payable).
 *  @param slippageBps — max acceptable slippage in basis points (default 300 = 3%).
 *  @param estimatedTokens — estimated output from useEstimateBuyTokens. When
 *         provided the min-output is `estimated * (1 - slippage)`; otherwise a
 *         rough floor of `inputWei * (1 - slippage)` is used as a last resort.
 */
export function useBuyTokens() {
  const { writeContract, isPending, isSuccess, isError, error, data } =
    useWriteContract();

  const buy = useCallback(
    (
      tokenAddress: Address,
      ethAmount: string,
      estimatedTokens?: bigint,
      slippageBps: number = 300,
    ) => {
      const inputWei = parseEther(ethAmount);
      const base = estimatedTokens ?? inputWei;
      const minTokensOut =
        (base * BigInt(10_000 - slippageBps)) / BigInt(10_000);

      writeContract({
        chainId: WIREFLUID_CHAIN_ID,
        address: CONTRACTS.factory,
        abi: TeamTokenFactoryABI,
        functionName: "buy",
        args: [tokenAddress, minTokensOut],
        value: inputWei,
      });
    },
    [writeContract],
  );

  return { buy, isPending, isSuccess, isError, error, txHash: data };
}

/** Sell team tokens back to the Factory's bonding curve.
 *  @param slippageBps — max acceptable slippage in basis points (default 300 = 3%).
 *  @param estimatedProceeds — estimated ETH output from useEstimateSellProceeds.
 *         When provided the min-proceeds is `estimated * (1 - slippage)`;
 *         otherwise zero is used (caller should always pass an estimate).
 */
export function useSellTokens() {
  const { writeContract, isPending, isSuccess, isError, error, data } =
    useWriteContract();

  const sell = useCallback(
    (
      tokenAddress: Address,
      tokenAmount: bigint,
      estimatedProceeds?: bigint,
      slippageBps: number = 300,
    ) => {
      const minProceeds = estimatedProceeds
        ? (estimatedProceeds * BigInt(10_000 - slippageBps)) / BigInt(10_000)
        : BigInt(0);

      writeContract({
        chainId: WIREFLUID_CHAIN_ID,
        address: CONTRACTS.factory,
        abi: TeamTokenFactoryABI,
        functionName: "sell",
        args: [tokenAddress, tokenAmount, minProceeds],
      });
    },
    [writeContract],
  );

  return { sell, isPending, isSuccess, isError, error, txHash: data };
}

/** Read the current buy price for a team token from the bonding curve. */
export function useTokenPrice(tokenAddress: Address | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.factory,
    abi: TeamTokenFactoryABI,
    functionName: "getBuyPrice",
    args: tokenAddress ? [tokenAddress] : undefined,
    query: {
      enabled: !!tokenAddress && isDeployed(CONTRACTS.factory),
    },
  });

  return {
    price: typeof data === 'bigint' ? data : undefined,
    priceFormatted: typeof data === 'bigint' ? formatEther(data) : undefined,
    isLoading,
    error,
    refetch,
  };
}

/** Estimate how many tokens you get for a given ETH amount. */
export function useEstimateBuyTokens(
  tokenAddress: Address | undefined,
  ethAmount: string,
) {
  const weiAmount = ethAmount ? parseEther(ethAmount) : BigInt(0);

  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.factory,
    abi: TeamTokenFactoryABI,
    functionName: "estimateBuyTokens",
    args: tokenAddress ? [tokenAddress, weiAmount] : undefined,
    query: {
      enabled: !!tokenAddress && weiAmount > BigInt(0) && isDeployed(CONTRACTS.factory),
    },
  });

  return {
    estimatedTokens: typeof data === 'bigint' ? data : undefined,
    estimatedFormatted: typeof data === 'bigint' ? formatEther(data) : undefined,
    isLoading,
    error,
  };
}

/** Estimate ETH proceeds from selling a given token amount. */
export function useEstimateSellProceeds(
  tokenAddress: Address | undefined,
  tokenAmount: bigint | undefined,
) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.factory,
    abi: TeamTokenFactoryABI,
    functionName: "estimateSellProceeds",
    args:
      tokenAddress && tokenAmount ? [tokenAddress, tokenAmount] : undefined,
    query: {
      enabled: !!tokenAddress && !!tokenAmount && tokenAmount > BigInt(0) && isDeployed(CONTRACTS.factory),
    },
  });

  return {
    estimatedProceeds: typeof data === 'bigint' ? data : undefined,
    estimatedFormatted: typeof data === 'bigint' ? formatEther(data) : undefined,
    isLoading,
    error,
  };
}

// ---------------------------------------------------------------------------
// TeamToken hooks
// ---------------------------------------------------------------------------

/** Read the dynamic sell tax rate for a given seller on a team token. */
export function useSellTaxRate(
  teamTokenAddress: Address | undefined,
  sellerAddress: Address | undefined,
) {
  const { data, isLoading, error } = useReadContract({
    address: teamTokenAddress,
    abi: TeamTokenABI,
    functionName: "getSellTaxBps",
    args: sellerAddress ? [sellerAddress] : undefined,
    query: {
      enabled: !!teamTokenAddress && !!sellerAddress,
    },
  });

  return {
    taxBps: typeof data === 'bigint' ? data : undefined,
    taxPercent: typeof data === 'bigint' ? Number(data) / 100 : undefined,
    isLoading,
    error,
  };
}

/** Read a user's token balance for a specific team token. */
export function useTokenBalance(
  teamTokenAddress: Address | undefined,
  account: Address | undefined,
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: teamTokenAddress,
    abi: TeamTokenABI,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: {
      enabled: !!teamTokenAddress && !!account,
    },
  });

  return {
    balance: typeof data === 'bigint' ? data : undefined,
    balanceFormatted: typeof data === 'bigint' ? formatEther(data) : undefined,
    isLoading,
    error,
    refetch,
  };
}

/** Read the total supply of a team token. */
export function useTokenTotalSupply(teamTokenAddress: Address | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: teamTokenAddress,
    abi: TeamTokenABI,
    functionName: "totalSupply",
    query: {
      enabled: !!teamTokenAddress,
    },
  });

  return {
    totalSupply: typeof data === 'bigint' ? data : undefined,
    totalSupplyFormatted: typeof data === 'bigint' ? formatEther(data) : undefined,
    isLoading,
    error,
  };
}

// ---------------------------------------------------------------------------
// PerformanceOracle hooks
// ---------------------------------------------------------------------------

/** Read the composite performance score for a team. */
export function usePerformanceScore(teamTokenAddress: Address | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.oracle,
    abi: PerformanceOracleABI,
    functionName: "getPerformanceScore",
    args: teamTokenAddress ? [teamTokenAddress] : undefined,
    query: {
      enabled: !!teamTokenAddress && isDeployed(CONTRACTS.oracle),
    },
  });

  return {
    score: typeof data === 'bigint' ? data : undefined,
    isLoading,
    error,
  };
}

/** Read the oracle-computed sell tax rate for a team. */
export function useOracleSellTaxRate(teamTokenAddress: Address | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.oracle,
    abi: PerformanceOracleABI,
    functionName: "getSellTaxRate",
    args: teamTokenAddress ? [teamTokenAddress] : undefined,
    query: {
      enabled: !!teamTokenAddress && isDeployed(CONTRACTS.oracle),
    },
  });

  return {
    taxRate: typeof data === 'bigint' ? data : undefined,
    taxPercent: typeof data === 'bigint' ? Number(data) / 100 : undefined,
    isLoading,
    error,
  };
}

/** Get the team ranking from the oracle. */
export function useTeamRanking() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.oracle,
    abi: PerformanceOracleABI,
    functionName: "getTeamRanking",
    query: {
      enabled: isDeployed(CONTRACTS.oracle),
    },
  });

  return {
    ranking: Array.isArray(data) ? (data as Address[]) : undefined,
    isLoading,
    error,
    refetch,
  };
}

// ---------------------------------------------------------------------------
// UpsetVault hooks
// ---------------------------------------------------------------------------

/** Read the vault's current ETH balance. */
export function useVaultBalance() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.vault,
    abi: UpsetVaultABI,
    functionName: "getVaultBalance",
    query: {
      enabled: isDeployed(CONTRACTS.vault),
    },
  });

  return {
    balance: typeof data === 'bigint' ? data : undefined,
    balanceFormatted: typeof data === 'bigint' ? formatEther(data) : undefined,
    isLoading,
    error,
    refetch,
  };
}

/** Read the claimable upset reward for a user at a given epoch. */
export function useClaimableUpsetReward(
  epoch: bigint | undefined,
  userAddress: Address | undefined,
) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.vault,
    abi: UpsetVaultABI,
    functionName: "getClaimableUpsetReward",
    args: epoch !== undefined && userAddress ? [epoch, userAddress] : undefined,
    query: {
      enabled: epoch !== undefined && !!userAddress && isDeployed(CONTRACTS.vault),
    },
  });

  return {
    reward: typeof data === 'bigint' ? data : undefined,
    rewardFormatted: typeof data === 'bigint' ? formatEther(data) : undefined,
    isLoading,
    error,
  };
}

/** Get upset event info for a given epoch. */
export function useUpsetEventInfo(epoch: bigint | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.vault,
    abi: UpsetVaultABI,
    functionName: "getUpsetEventInfo",
    args: epoch !== undefined ? [epoch] : undefined,
    query: {
      enabled: epoch !== undefined && isDeployed(CONTRACTS.vault),
    },
  });

  return {
    eventInfo: data != null && typeof data === 'object'
      ? (data as unknown as {
          winnerTeam: Address;
          loserTeam: Address;
          upsetScore: bigint;
          tier: number;
          multiplier: bigint;
          releasedAmount: bigint;
          timestamp: bigint;
        })
      : undefined,
    isLoading,
    error,
  };
}

/** Claim upset reward for a given epoch. */
export function useClaimUpsetReward() {
  const { writeContract, isPending, isSuccess, isError, error, data } =
    useWriteContract();

  const claim = useCallback(
    (epoch: bigint) => {
      writeContract({
        chainId: WIREFLUID_CHAIN_ID,
        address: CONTRACTS.vault,
        abi: UpsetVaultABI,
        functionName: "claimUpsetReward",
        args: [epoch],
      });
    },
    [writeContract],
  );

  return { claim, isPending, isSuccess, isError, error, txHash: data };
}

// ---------------------------------------------------------------------------
// RewardDistributor hooks
// ---------------------------------------------------------------------------

/** Read the current reward epoch. */
export function useCurrentEpoch() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.rewards,
    abi: RewardDistributorABI,
    functionName: "currentEpoch",
    query: {
      enabled: isDeployed(CONTRACTS.rewards),
    },
  });

  return {
    epoch: typeof data === 'bigint' ? data : undefined,
    isLoading,
    error,
  };
}

/** Read the claimable performance rewards for a user. */
export function useClaimableRewards(
  userAddress: Address | undefined,
  teamAddress: Address | undefined,
  epoch: bigint | undefined,
) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.rewards,
    abi: RewardDistributorABI,
    functionName: "getClaimableRewards",
    args:
      userAddress && teamAddress && epoch !== undefined
        ? [userAddress, teamAddress, epoch]
        : undefined,
    query: {
      enabled: !!userAddress && !!teamAddress && epoch !== undefined && isDeployed(CONTRACTS.rewards),
    },
  });

  return {
    reward: typeof data === 'bigint' ? data : undefined,
    rewardFormatted: typeof data === 'bigint' ? formatEther(data) : undefined,
    isLoading,
    error,
  };
}

/** Claim performance rewards for a given epoch + team. */
export function useClaimRewards() {
  const { writeContract, isPending, isSuccess, isError, error, data } =
    useWriteContract();

  const claim = useCallback(
    (epoch: bigint, teamAddress: Address) => {
      writeContract({
        chainId: WIREFLUID_CHAIN_ID,
        address: CONTRACTS.rewards,
        abi: RewardDistributorABI,
        functionName: "claimRewards",
        args: [epoch, teamAddress],
      });
    },
    [writeContract],
  );

  return { claim, isPending, isSuccess, isError, error, txHash: data };
}

/** Read the performance reward pool balance. */
export function useRewardPool() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.rewards,
    abi: RewardDistributorABI,
    functionName: "performanceRewardPool",
    query: {
      enabled: isDeployed(CONTRACTS.rewards),
    },
  });

  return {
    pool: typeof data === 'bigint' ? data : undefined,
    poolFormatted: typeof data === 'bigint' ? formatEther(data) : undefined,
    isLoading,
    error,
  };
}

// ---------------------------------------------------------------------------
// CircuitBreaker hooks
// ---------------------------------------------------------------------------

/** Check if trading is paused for a specific token. */
export function useIsTradingPaused(tokenAddress: Address | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.circuitBreaker,
    abi: CircuitBreakerABI,
    functionName: "isPaused",
    args: tokenAddress ? [tokenAddress] : undefined,
    query: {
      enabled: !!tokenAddress && isDeployed(CONTRACTS.circuitBreaker),
    },
  });

  return {
    isPaused: typeof data === 'boolean' ? data : undefined,
    isLoading,
    error,
  };
}

/** Get detailed pause state for a token. */
export function usePauseState(tokenAddress: Address | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.circuitBreaker,
    abi: CircuitBreakerABI,
    functionName: "getPauseState",
    args: tokenAddress ? [tokenAddress] : undefined,
    query: {
      enabled: !!tokenAddress && isDeployed(CONTRACTS.circuitBreaker),
    },
  });

  return {
    pauseState: data != null && typeof data === 'object'
      ? (data as unknown as { active: boolean; until: bigint; reason: bigint })
      : undefined,
    isLoading,
    error,
  };
}

// ---------------------------------------------------------------------------
// Event watchers
// ---------------------------------------------------------------------------

/** Watch for upset events emitted by UpsetVault. */
export function useUpsetEvents(
  onUpset?: (log: {
    epoch: bigint;
    winner: Address;
    loser: Address;
    upsetScore: bigint;
    tier: number;
    releasedAmount: bigint;
  }) => void,
) {
  useWatchContractEvent({
    address: CONTRACTS.vault,
    abi: UpsetVaultABI,
    eventName: "UpsetTriggered",
    onLogs(logs) {
      for (const log of logs) {
        const args = (log as { args: Record<string, unknown> }).args;
        onUpset?.({
          epoch: args.epoch as bigint,
          winner: args.winner as Address,
          loser: args.loser as Address,
          upsetScore: args.upsetScore as bigint,
          tier: args.tier as number,
          releasedAmount: args.releasedAmount as bigint,
        });
      }
    },
  });
}

/** Watch for token purchase events from the Factory. */
export function useTokenPurchaseEvents(
  onPurchase?: (log: {
    token: Address;
    buyer: Address;
    amount: bigint;
    cost: bigint;
    fee: bigint;
  }) => void,
) {
  useWatchContractEvent({
    address: CONTRACTS.factory,
    abi: TeamTokenFactoryABI,
    eventName: "TokensPurchased",
    onLogs(logs) {
      for (const log of logs) {
        const args = (log as { args: Record<string, unknown> }).args;
        onPurchase?.({
          token: args.token as Address,
          buyer: args.buyer as Address,
          amount: args.amount as bigint,
          cost: args.cost as bigint,
          fee: args.fee as bigint,
        });
      }
    },
  });
}

/** Watch for token sale events from the Factory. */
export function useTokenSaleEvents(
  onSale?: (log: {
    token: Address;
    seller: Address;
    amount: bigint;
    proceeds: bigint;
    fee: bigint;
  }) => void,
) {
  useWatchContractEvent({
    address: CONTRACTS.factory,
    abi: TeamTokenFactoryABI,
    eventName: "TokensSold",
    onLogs(logs) {
      for (const log of logs) {
        const args = (log as { args: Record<string, unknown> }).args;
        onSale?.({
          token: args.token as Address,
          seller: args.seller as Address,
          amount: args.amount as bigint,
          proceeds: args.proceeds as bigint,
          fee: args.fee as bigint,
        });
      }
    },
  });
}

/** Watch for performance update events from the Oracle. */
export function usePerformanceUpdateEvents(
  onUpdate?: (log: {
    teamToken: Address;
    compositeScore: bigint;
  }) => void,
) {
  useWatchContractEvent({
    address: CONTRACTS.oracle,
    abi: PerformanceOracleABI,
    eventName: "PerformanceUpdated",
    onLogs(logs) {
      for (const log of logs) {
        const args = (log as { args: Record<string, unknown> }).args;
        onUpdate?.({
          teamToken: args.teamToken as Address,
          compositeScore: args.compositeScore as bigint,
        });
      }
    },
  });
}
