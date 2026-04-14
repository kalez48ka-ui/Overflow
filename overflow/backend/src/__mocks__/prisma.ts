import { vi } from 'vitest';

/**
 * Creates a deeply-mocked PrismaClient where every model method returns
 * vi.fn(). The $transaction mock executes the callback directly with the
 * same mock instance so transactional code paths work transparently.
 */
export function createMockPrismaClient() {
  const modelMethods = [
    'findUnique',
    'findFirst',
    'findMany',
    'create',
    'update',
    'updateMany',
    'delete',
    'deleteMany',
    'upsert',
    'count',
    'groupBy',
  ];

  function mockModel() {
    const model: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of modelMethods) {
      model[method] = vi.fn();
    }
    return model;
  }

  const prisma: Record<string, unknown> = {
    team: mockModel(),
    pricePoint: mockModel(),
    vaultState: mockModel(),
    upsetEvent: mockModel(),
    position: mockModel(),
    match: mockModel(),
    fanWar: mockModel(),
    fanWarLock: mockModel(),
    predictionPool: mockModel(),
    predictionQuestion: mockModel(),
    predictionEntry: mockModel(),
    predictionAnswer: mockModel(),
  };

  // $transaction executes the callback with the prisma mock itself,
  // so code like `tx.team.findUnique(...)` works seamlessly.
  prisma.$transaction = vi.fn(async (cbOrArray: unknown, _opts?: unknown) => {
    if (typeof cbOrArray === 'function') {
      return (cbOrArray as (tx: typeof prisma) => Promise<unknown>)(prisma);
    }
    // Array-style transactions: just await all promises
    return Promise.all(cbOrArray as Promise<unknown>[]);
  });

  return prisma as unknown;
}
