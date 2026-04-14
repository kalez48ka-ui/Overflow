import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultService } from '../vault.service';
import { createMockPrismaClient } from '../../../__mocks__/prisma';

describe('VaultService', () => {
  let service: VaultService;
  let prisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    service = new VaultService(prisma as any);
  });

  // -------------------------------------------------------------------------
  // getMultiplier (exposed indirectly through processUpsetEvent)
  // We test it via reflection since it is private.
  // -------------------------------------------------------------------------
  describe('getMultiplier (tested via processUpsetEvent multiplier field)', () => {
    // getMultiplier is private, so we verify it indirectly by checking the
    // multiplier value written to upsetEvent.create during processUpsetEvent.

    function setupForMultiplierTest(upsetScore: number) {
      (prisma as any).upsetEvent.findFirst.mockResolvedValue(null);
      (prisma as any).vaultState.findUnique.mockResolvedValue({
        id: 'vault',
        balance: 1000,
        totalIn: 1000,
        totalOut: 0,
      });
      (prisma as any).team.findUnique.mockResolvedValue({
        id: 'team-iu',
        symbol: 'IU',
      });
      (prisma as any).position.findMany.mockResolvedValue([
        { id: 'pos-1', wallet: '0xabc', amount: 50 },
      ]);
      (prisma as any).upsetEvent.create.mockResolvedValue({});
      (prisma as any).vaultState.update.mockResolvedValue({ balance: 900 });
    }

    async function getRecordedMultiplier(upsetScore: number): Promise<number> {
      setupForMultiplierTest(upsetScore);
      (prisma as any).upsetEvent.create.mockClear();
      await service.processUpsetEvent('match-mult', 'IU', 'LQ', upsetScore);
      const createCall = (prisma as any).upsetEvent.create.mock.calls[0][0];
      return createCall.data.multiplier;
    }

    it('returns 1x for upsetScore 10 (below 20 threshold)', async () => {
      expect(await getRecordedMultiplier(10)).toBe(1);
    });

    it('returns 1x for upsetScore 19 (just below 20 threshold)', async () => {
      expect(await getRecordedMultiplier(19)).toBe(1);
    });

    it('returns 2x for upsetScore 20 (exact threshold)', async () => {
      expect(await getRecordedMultiplier(20)).toBe(2);
    });

    it('returns 2x for upsetScore 39', async () => {
      expect(await getRecordedMultiplier(39)).toBe(2);
    });

    it('returns 3x for upsetScore 40', async () => {
      expect(await getRecordedMultiplier(40)).toBe(3);
    });

    it('returns 3x for upsetScore 59', async () => {
      expect(await getRecordedMultiplier(59)).toBe(3);
    });

    it('returns 4x for upsetScore 60', async () => {
      expect(await getRecordedMultiplier(60)).toBe(4);
    });

    it('returns 4x for upsetScore 79', async () => {
      expect(await getRecordedMultiplier(79)).toBe(4);
    });

    it('returns 5x for upsetScore 80', async () => {
      expect(await getRecordedMultiplier(80)).toBe(5);
    });

    it('returns 5x for upsetScore 100', async () => {
      expect(await getRecordedMultiplier(100)).toBe(5);
    });
  });

  // -------------------------------------------------------------------------
  // addToVault
  // -------------------------------------------------------------------------
  describe('addToVault', () => {
    it('calls upsert to increment vault balance', async () => {
      (prisma as any).vaultState.upsert.mockResolvedValue({
        id: 'vault',
        balance: 1100,
        totalIn: 1100,
        totalOut: 0,
      });

      await service.addToVault(100);

      expect((prisma as any).vaultState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vault' },
          update: {
            balance: { increment: 100 },
            totalIn: { increment: 100 },
          },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // processUpsetEvent
  // -------------------------------------------------------------------------
  describe('processUpsetEvent', () => {
    const matchId = 'match-001';
    const winnerSymbol = 'IU';
    const loserSymbol = 'LQ';

    it('skips processing when vault balance is zero (vaultRelease <= 0)', async () => {
      (prisma as any).upsetEvent.findFirst.mockResolvedValue(null);
      (prisma as any).vaultState.findUnique.mockResolvedValue({
        id: 'vault',
        balance: 0,
        totalIn: 1000,
        totalOut: 1000,
      });

      await service.processUpsetEvent(matchId, winnerSymbol, loserSymbol, 50);

      // Should not create an upset event when release is 0
      expect((prisma as any).upsetEvent.create).not.toHaveBeenCalled();
      expect((prisma as any).vaultState.update).not.toHaveBeenCalled();
    });

    it('guards against duplicate upset processing for same matchId', async () => {
      (prisma as any).upsetEvent.findFirst.mockResolvedValue({
        id: 'existing-upset',
        matchId,
      });

      await service.processUpsetEvent(matchId, winnerSymbol, loserSymbol, 50);

      // Should return early without creating a new event
      expect((prisma as any).upsetEvent.create).not.toHaveBeenCalled();
      expect((prisma as any).vaultState.update).not.toHaveBeenCalled();
    });

    it('processes upset and decrements vault balance', async () => {
      (prisma as any).upsetEvent.findFirst.mockResolvedValue(null);
      (prisma as any).vaultState.findUnique.mockResolvedValue({
        id: 'vault',
        balance: 1000,
        totalIn: 1000,
        totalOut: 0,
      });
      (prisma as any).team.findUnique.mockResolvedValue({
        id: 'team-iu',
        symbol: 'IU',
      });
      (prisma as any).position.findMany.mockResolvedValue([
        { id: 'pos-1', wallet: '0xabc', amount: 50 },
        { id: 'pos-2', wallet: '0xdef', amount: 100 },
      ]);
      (prisma as any).upsetEvent.create.mockResolvedValue({});
      (prisma as any).vaultState.update.mockResolvedValue({
        balance: 850,
      });

      await service.processUpsetEvent(matchId, winnerSymbol, loserSymbol, 30);

      expect((prisma as any).upsetEvent.create).toHaveBeenCalledTimes(1);
      expect((prisma as any).vaultState.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vault' },
          data: expect.objectContaining({
            balance: expect.objectContaining({ decrement: expect.any(Number) }),
            totalOut: expect.objectContaining({ increment: expect.any(Number) }),
          }),
        }),
      );
    });

    it('creates vault record if none exists', async () => {
      (prisma as any).upsetEvent.findFirst.mockResolvedValue(null);
      (prisma as any).vaultState.findUnique.mockResolvedValue(null);
      (prisma as any).vaultState.create.mockResolvedValue({
        id: 'vault',
        balance: 1000,
        totalIn: 1000,
        totalOut: 0,
      });
      (prisma as any).team.findUnique.mockResolvedValue({
        id: 'team-iu',
        symbol: 'IU',
      });
      (prisma as any).position.findMany.mockResolvedValue([
        { id: 'pos-1', wallet: '0xabc', amount: 50 },
      ]);
      (prisma as any).upsetEvent.create.mockResolvedValue({});
      (prisma as any).vaultState.update.mockResolvedValue({ balance: 900 });

      await service.processUpsetEvent(matchId, winnerSymbol, loserSymbol, 30);

      expect((prisma as any).vaultState.create).toHaveBeenCalled();
      expect((prisma as any).upsetEvent.create).toHaveBeenCalled();
    });
  });
});
