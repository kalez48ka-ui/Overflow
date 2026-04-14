import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FanWarsService } from '../fanwars.service';
import { createMockPrismaClient } from '../../../__mocks__/prisma';
import { MarginType } from '../../../common/types';

describe('FanWarsService', () => {
  let service: FanWarsService;
  let prisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    service = new FanWarsService(prisma as any);
  });

  // -------------------------------------------------------------------------
  // getBoostSplits (private, tested via reflection)
  // -------------------------------------------------------------------------
  describe('getBoostSplits', () => {
    const getSplits = (marginType: MarginType) => {
      return FanWarsService.prototype['getBoostSplits'].call(service, marginType);
    };

    it('CLOSE margin: 55% winner, 35% loser, 10% rollover', () => {
      const splits = getSplits('CLOSE');
      expect(splits.winner).toBe(0.55);
      expect(splits.loser).toBe(0.35);
      expect(splits.rollover).toBe(0.10);
      expect(splits.winner + splits.loser + splits.rollover).toBeCloseTo(1.0, 10);
    });

    it('NORMAL margin: 60% winner, 30% loser, 10% rollover', () => {
      const splits = getSplits('NORMAL');
      expect(splits.winner).toBe(0.60);
      expect(splits.loser).toBe(0.30);
      expect(splits.rollover).toBe(0.10);
      expect(splits.winner + splits.loser + splits.rollover).toBeCloseTo(1.0, 10);
    });

    it('DOMINANT margin: 65% winner, 25% loser, 10% rollover', () => {
      const splits = getSplits('DOMINANT');
      expect(splits.winner).toBe(0.65);
      expect(splits.loser).toBe(0.25);
      expect(splits.rollover).toBe(0.10);
      expect(splits.winner + splits.loser + splits.rollover).toBeCloseTo(1.0, 10);
    });

    it('unknown margin defaults to NORMAL split', () => {
      const splits = getSplits('UNKNOWN' as MarginType);
      expect(splits.winner).toBe(0.60);
      expect(splits.loser).toBe(0.30);
      expect(splits.rollover).toBe(0.10);
    });
  });

  // -------------------------------------------------------------------------
  // lockTokens
  // -------------------------------------------------------------------------
  describe('lockTokens', () => {
    const matchId = 'match-001';
    const wallet = '0xAbC1234567890aBcDeF1234567890AbCdEf123456';
    const homeTeamId = 'team-iu';
    const awayTeamId = 'team-lq';

    const openFanWar = {
      id: 'fw-1',
      matchId,
      homeTeamId,
      awayTeamId,
      status: 'OPEN',
      lockDeadline: new Date(Date.now() + 3600_000), // 1 hour from now
      totalHomeLocked: 0,
      totalAwayLocked: 0,
      boostPool: 0,
    };

    it('rejects zero or negative lock amount', async () => {
      await expect(
        service.lockTokens(matchId, wallet, homeTeamId, 0),
      ).rejects.toThrow('Lock amount must be positive');

      await expect(
        service.lockTokens(matchId, wallet, homeTeamId, -5),
      ).rejects.toThrow('Lock amount must be positive');
    });

    it('rejects when fan war does not exist', async () => {
      (prisma as any).fanWar.findUnique.mockResolvedValue(null);

      await expect(
        service.lockTokens(matchId, wallet, homeTeamId, 10),
      ).rejects.toThrow('No fan war found');
    });

    it('rejects when fan war is not OPEN', async () => {
      (prisma as any).fanWar.findUnique.mockResolvedValue({
        ...openFanWar,
        status: 'SETTLED',
      });

      await expect(
        service.lockTokens(matchId, wallet, homeTeamId, 10),
      ).rejects.toThrow('not accepting locks');
    });

    it('rejects when user has insufficient token balance', async () => {
      (prisma as any).fanWar.findUnique.mockResolvedValue(openFanWar);
      (prisma as any).fanWarLock.findUnique.mockResolvedValue(null);
      (prisma as any).position.findUnique.mockResolvedValue({
        id: 'pos-1',
        wallet: wallet.toLowerCase(),
        teamId: homeTeamId,
        amount: 5, // less than requested 10
      });

      await expect(
        service.lockTokens(matchId, wallet, homeTeamId, 10),
      ).rejects.toThrow('Insufficient token balance');
    });

    it('rejects when user has no position at all', async () => {
      (prisma as any).fanWar.findUnique.mockResolvedValue(openFanWar);
      (prisma as any).fanWarLock.findUnique.mockResolvedValue(null);
      (prisma as any).position.findUnique.mockResolvedValue(null);

      await expect(
        service.lockTokens(matchId, wallet, homeTeamId, 10),
      ).rejects.toThrow('Insufficient token balance');
    });

    it('rejects duplicate locks from same wallet', async () => {
      (prisma as any).fanWar.findUnique.mockResolvedValue(openFanWar);
      (prisma as any).fanWarLock.findUnique.mockResolvedValue({
        id: 'lock-existing',
        wallet: wallet.toLowerCase(),
      });

      await expect(
        service.lockTokens(matchId, wallet, homeTeamId, 10),
      ).rejects.toThrow('already locked tokens');
    });

    it('succeeds and returns lock info when valid', async () => {
      const createdAt = new Date();
      (prisma as any).fanWar.findUnique.mockResolvedValue(openFanWar);
      (prisma as any).fanWarLock.findUnique.mockResolvedValue(null);
      (prisma as any).position.findUnique.mockResolvedValue({
        id: 'pos-1',
        wallet: wallet.toLowerCase(),
        teamId: homeTeamId,
        amount: 100,
      });
      (prisma as any).position.update.mockResolvedValue({});
      (prisma as any).fanWarLock.create.mockResolvedValue({
        id: 'lock-1',
        wallet: wallet.toLowerCase(),
        teamId: homeTeamId,
        amount: 10,
        boostReward: null,
        claimed: false,
        createdAt,
      });
      (prisma as any).fanWar.update.mockResolvedValue({});

      const result = await service.lockTokens(matchId, wallet, homeTeamId, 10);

      expect(result.id).toBe('lock-1');
      expect(result.amount).toBe(10);
      expect(result.claimed).toBe(false);
      expect(result.boostReward).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // claimBoost
  // -------------------------------------------------------------------------
  describe('claimBoost', () => {
    const matchId = 'match-001';
    const wallet = '0xAbC1234567890aBcDeF1234567890AbCdEf123456';

    it('rejects when fan war is not settled', async () => {
      (prisma as any).fanWar.findUnique.mockResolvedValue({
        id: 'fw-1',
        matchId,
        status: 'LOCKED',
      });

      await expect(
        service.claimBoost(matchId, wallet),
      ).rejects.toThrow('cannot claim yet');
    });

    it('rejects when already claimed', async () => {
      (prisma as any).fanWar.findUnique.mockResolvedValue({
        id: 'fw-1',
        matchId,
        status: 'SETTLED',
      });
      (prisma as any).fanWarLock.findUnique.mockResolvedValue({
        id: 'lock-1',
        wallet: wallet.toLowerCase(),
        teamId: 'team-iu',
        amount: 10,
        boostReward: 2.5,
        claimed: true,
      });

      await expect(
        service.claimBoost(matchId, wallet),
      ).rejects.toThrow('Boost already claimed');
    });

    it('returns correct boost and tokens on successful claim', async () => {
      (prisma as any).fanWar.findUnique.mockResolvedValue({
        id: 'fw-1',
        matchId,
        status: 'SETTLED',
      });
      (prisma as any).fanWarLock.findUnique.mockResolvedValue({
        id: 'lock-1',
        wallet: wallet.toLowerCase(),
        teamId: 'team-iu',
        amount: 10,
        boostReward: 2.5,
        claimed: false,
      });
      (prisma as any).fanWarLock.updateMany.mockResolvedValue({ count: 1 });
      (prisma as any).position.findUnique.mockResolvedValue({
        id: 'pos-1',
        wallet: wallet.toLowerCase(),
        teamId: 'team-iu',
        amount: 50,
      });
      (prisma as any).position.update.mockResolvedValue({});

      const result = await service.claimBoost(matchId, wallet);

      expect(result.boostReward).toBe(2.5);
      expect(result.tokensReturned).toBe(10);
    });
  });
});
