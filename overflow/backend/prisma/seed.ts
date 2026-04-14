import { PrismaClient } from '@prisma/client';
import { SELL_TAX_BY_RANK } from '../src/common/constants';

const prisma = new PrismaClient();

const PSL_TEAMS = [
  { name: 'Islamabad United',    symbol: 'IU', color: '#E4002B', ranking: 1, performanceScore: 78, wins: 7, losses: 2, nrr: 0.85 },
  { name: 'Lahore Qalandars',    symbol: 'LQ', color: '#00A651', ranking: 2, performanceScore: 72, wins: 6, losses: 3, nrr: 0.52 },
  { name: 'Multan Sultans',      symbol: 'MS', color: '#00AEEF', ranking: 3, performanceScore: 65, wins: 5, losses: 3, nrr: 0.28 },
  { name: 'Peshawar Zalmi',      symbol: 'PZ', color: '#FFC72C', ranking: 4, performanceScore: 55, wins: 4, losses: 4, nrr: -0.05 },
  { name: 'Quetta Gladiators',   symbol: 'QG', color: '#7B2D8E', ranking: 5, performanceScore: 48, wins: 3, losses: 5, nrr: -0.35 },
  { name: 'Karachi Kings',       symbol: 'KK', color: '#004B87', ranking: 6, performanceScore: 38, wins: 2, losses: 5, nrr: -0.62 },
  { name: 'Hyderabad Kingsmen',  symbol: 'HK', color: '#D4AF37', ranking: 7, performanceScore: 42, wins: 3, losses: 6, nrr: -0.48 },
  { name: 'Rawalpindiz',         symbol: 'RW', color: '#FF6B35', ranking: 8, performanceScore: 35, wins: 2, losses: 7, nrr: -0.78 },
];

const BASE_PRICES: Record<string, number> = {
  IU: 2.50, LQ: 2.20, MS: 1.80, PZ: 1.40, QG: 1.10, KK: 0.80, HK: 0.95, RW: 0.70,
};

// Use the shared SELL_TAX_BY_RANK constant from common/constants.ts
const TAX_RATES = SELL_TAX_BY_RANK;

function randomWalk(start: number, steps: number, volatility: number): number[] {
  const prices: number[] = [start];
  for (let i = 1; i < steps; i++) {
    const prev = prices[i - 1] ?? start;
    const change = (Math.random() - 0.48) * volatility;
    prices.push(Math.max(0.01, prev + change));
  }
  return prices;
}

async function main(): Promise<void> {
  console.log('Seeding Overflow database...\n');

  // Clear existing data in dependency order
  await prisma.ballEvent.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.position.deleteMany();
  await prisma.pricePoint.deleteMany();
  await prisma.upsetEvent.deleteMany();
  await prisma.match.deleteMany();
  await prisma.team.deleteMany();
  await prisma.vaultState.deleteMany();

  // Create 8 PSL teams
  const createdTeams: Array<{ id: string; symbol: string; name: string }> = [];

  for (const team of PSL_TEAMS) {
    const basePrice = BASE_PRICES[team.symbol] ?? 1.0;
    const created = await prisma.team.create({
      data: {
        ...team,
        currentPrice: basePrice,
        priceChange24h: parseFloat(((Math.random() - 0.4) * 12).toFixed(2)),
        sellTaxRate: TAX_RATES[team.ranking] ?? 5,
      },
    });
    createdTeams.push({ id: created.id, symbol: created.symbol, name: created.name });
    console.log(`  Team: ${team.name} (${team.symbol}) — $${basePrice} — rank #${team.ranking}`);
  }

  // Create price history (last 48 hours, hourly candles = 48 candles per team)
  const now = new Date();
  for (const team of createdTeams) {
    const basePrice = BASE_PRICES[team.symbol] ?? 1.0;
    const prices = randomWalk(basePrice, 48, basePrice * 0.025);

    for (let i = 0; i < prices.length; i++) {
      const price = prices[i] ?? basePrice;
      const timestamp = new Date(now.getTime() - (48 - i) * 60 * 60 * 1000);
      const variance = price * 0.02;
      const open = price - variance * (Math.random() - 0.5);
      const close = price + variance * (Math.random() - 0.5);
      const high = Math.max(open, close) + Math.random() * variance;
      const low = Math.min(open, close) - Math.random() * variance;

      await prisma.pricePoint.create({
        data: {
          teamId: team.id,
          price: close,
          open, high, low, close,
          volume: Math.random() * 8000 + 1000,
          timestamp,
        },
      });
    }
    console.log(`  Price history: ${team.symbol} — 48 hourly candles`);
  }

  // Create vault state
  await prisma.vaultState.create({
    data: {
      id: 'vault',
      balance: 42800,
      totalIn: 292520,
      totalOut: 249720,
    },
  });
  console.log('\n  Vault: $42,800 balance');

  console.log('\nSeed complete! Run backend to sync live PSL matches from CricAPI.\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
