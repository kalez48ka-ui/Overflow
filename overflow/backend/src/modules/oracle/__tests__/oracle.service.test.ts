import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OracleService } from '../oracle.service';
import { createMockPrismaClient } from '../../../__mocks__/prisma';
import {
  WIN_SCORE_DELTA,
  LOSS_SCORE_DELTA,
  UPSET_THRESHOLD,
  SELL_TAX_BY_RANK,
  getMultiplier,
} from '../../../common/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTeam(overrides: Record<string, unknown> = {}) {
  return {
    id: 'team-iu',
    name: 'Islamabad United',
    symbol: 'IU',
    tokenAddress: '0x1c8a5A026A4F5CBf7BC4fdE2898d78628A199f1e',
    color: '#FF0000',
    currentPrice: 5,
    priceChange24h: 0,
    sellTaxRate: 5,
    performanceScore: 50,
    ranking: 4,
    wins: 3,
    losses: 2,
    nrr: 0.5,
    ...overrides,
  };
}

function makeMatch(homeTeam: ReturnType<typeof makeTeam>, awayTeam: ReturnType<typeof makeTeam>, overrides: Record<string, unknown> = {}) {
  return {
    id: 'match-1',
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    homeTeam,
    awayTeam,
    status: 'LIVE',
    startTime: new Date(),
    endTime: null,
    winnerId: null,
    isUpset: false,
    upsetScore: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock ethers so the constructor never tries to connect to a real RPC
vi.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: vi.fn(),
    Wallet: vi.fn(),
    Contract: vi.fn(),
  },
}));

// Mock config so requireEnv doesn't throw
vi.mock('../../../config', () => ({
  config: {
    rpcUrl: '',
    oracleAddress: '',
  },
}));

describe('OracleService', () => {
  let service: OracleService;
  let prisma: ReturnType<typeof createMockPrismaClient>;
  let mockVaultService: { processUpsetEvent: ReturnType<typeof vi.fn> };
  let mockFanWarsService: { settleMatch: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = createMockPrismaClient();
    mockVaultService = { processUpsetEvent: vi.fn().mockResolvedValue(undefined) };
    mockFanWarsService = { settleMatch: vi.fn().mockResolvedValue(undefined) };

    service = new OracleService(
      prisma as any,
      mockVaultService as any,
      mockFanWarsService as any,
    );

    // Default: recalculateRankings and updateSellTaxes need findMany to return teams
    (prisma as any).team.findMany.mockResolvedValue([]);
    (prisma as any).team.update.mockResolvedValue({});
  });

  // =========================================================================
  // processMatchResult
  // =========================================================================
  describe('processMatchResult', () => {
    const homeTeam = makeTeam({ id: 'team-iu', symbol: 'IU', performanceScore: 50, ranking: 4, wins: 3, losses: 2 });
    const awayTeam = makeTeam({ id: 'team-lq', symbol: 'LQ', performanceScore: 40, ranking: 6, wins: 2, losses: 4 });

    function setupMatch(home = homeTeam, away = awayTeam) {
      const match = makeMatch(home, away);
      (prisma as any).match.findUnique.mockResolvedValue(match);
      (prisma as any).match.update.mockResolvedValue({});
      return match;
    }

    it('adds WIN_SCORE_DELTA (+8) to winner performance score', async () => {
      setupMatch();
      await service.processMatchResult('match-1', 'team-iu');

      const winnerUpdate = (prisma as any).team.update.mock.calls.find(
        (c: any) => c[0].where.id === 'team-iu',
      );
      expect(winnerUpdate).toBeDefined();
      expect(winnerUpdate[0].data.performanceScore).toBe(50 + WIN_SCORE_DELTA);
    });

    it('subtracts LOSS_SCORE_DELTA (-5) from loser performance score', async () => {
      setupMatch();
      await service.processMatchResult('match-1', 'team-iu');

      const loserUpdate = (prisma as any).team.update.mock.calls.find(
        (c: any) => c[0].where.id === 'team-lq',
      );
      expect(loserUpdate).toBeDefined();
      expect(loserUpdate[0].data.performanceScore).toBe(40 - LOSS_SCORE_DELTA);
    });

    it('clamps winner score to max 100', async () => {
      const strongHome = makeTeam({ id: 'team-iu', symbol: 'IU', performanceScore: 97, ranking: 1, wins: 7, losses: 0 });
      setupMatch(strongHome, awayTeam);

      await service.processMatchResult('match-1', 'team-iu');

      const winnerUpdate = (prisma as any).team.update.mock.calls.find(
        (c: any) => c[0].where.id === 'team-iu',
      );
      // 97 + 8 = 105 -> clamped to 100
      expect(winnerUpdate[0].data.performanceScore).toBe(100);
    });

    it('clamps loser score to min 0', async () => {
      const weakAway = makeTeam({ id: 'team-lq', symbol: 'LQ', performanceScore: 3, ranking: 8, wins: 0, losses: 7 });
      setupMatch(homeTeam, weakAway);

      await service.processMatchResult('match-1', 'team-iu');

      const loserUpdate = (prisma as any).team.update.mock.calls.find(
        (c: any) => c[0].where.id === 'team-lq',
      );
      // 3 - 5 = -2 -> clamped to 0
      expect(loserUpdate[0].data.performanceScore).toBe(0);
    });

    it('increments winner wins count by 1', async () => {
      setupMatch();
      await service.processMatchResult('match-1', 'team-iu');

      const winnerUpdate = (prisma as any).team.update.mock.calls.find(
        (c: any) => c[0].where.id === 'team-iu',
      );
      expect(winnerUpdate[0].data.wins).toEqual({ increment: 1 });
    });

    it('increments loser losses count by 1', async () => {
      setupMatch();
      await service.processMatchResult('match-1', 'team-iu');

      const loserUpdate = (prisma as any).team.update.mock.calls.find(
        (c: any) => c[0].where.id === 'team-lq',
      );
      expect(loserUpdate[0].data.losses).toEqual({ increment: 1 });
    });

    it('sets match status to COMPLETED', async () => {
      setupMatch();
      await service.processMatchResult('match-1', 'team-iu');

      const matchUpdate = (prisma as any).match.update.mock.calls[0][0];
      expect(matchUpdate.data.status).toBe('COMPLETED');
    });

    it('sets match winnerId correctly', async () => {
      setupMatch();
      await service.processMatchResult('match-1', 'team-iu');

      const matchUpdate = (prisma as any).match.update.mock.calls[0][0];
      expect(matchUpdate.data.winnerId).toBe('team-iu');
    });

    it('detects upset when upset score >= UPSET_THRESHOLD (20)', async () => {
      // For upset: winner must have HIGHER ranking number (worse rank) than loser
      // calculateUpsetScore: rankDiff = winner.ranking - loser.ranking (must be > 0)
      // then: rankDiff * 10 + scoreDiff * 0.5
      // winner rank 8, loser rank 1 => rankDiff=7, scoreDiff = loser(90) - winner(20) = 70
      // upsetScore = 7*10 + 70*0.5 = 70 + 35 = 105
      const underdog = makeTeam({ id: 'team-iu', symbol: 'IU', performanceScore: 20, ranking: 8, wins: 0, losses: 7 });
      const favorite = makeTeam({ id: 'team-lq', symbol: 'LQ', performanceScore: 90, ranking: 1, wins: 7, losses: 0 });
      setupMatch(underdog, favorite);

      await service.processMatchResult('match-1', 'team-iu');

      const matchUpdate = (prisma as any).match.update.mock.calls[0][0];
      expect(matchUpdate.data.isUpset).toBe(true);
      expect(matchUpdate.data.upsetScore).toBeGreaterThanOrEqual(UPSET_THRESHOLD);
    });

    it('triggers vault payout on upset', async () => {
      const underdog = makeTeam({ id: 'team-iu', symbol: 'IU', performanceScore: 20, ranking: 8, wins: 0, losses: 7 });
      const favorite = makeTeam({ id: 'team-lq', symbol: 'LQ', performanceScore: 90, ranking: 1, wins: 7, losses: 0 });
      setupMatch(underdog, favorite);

      await service.processMatchResult('match-1', 'team-iu');

      expect(mockVaultService.processUpsetEvent).toHaveBeenCalledWith(
        'match-1',
        'IU',
        'LQ',
        expect.any(Number),
      );
    });

    it('does NOT detect upset when score difference < 20', async () => {
      // Same ranking => rankDiff = 0 => upset score = 0
      const teamA = makeTeam({ id: 'team-iu', symbol: 'IU', performanceScore: 50, ranking: 4, wins: 3, losses: 2 });
      const teamB = makeTeam({ id: 'team-lq', symbol: 'LQ', performanceScore: 48, ranking: 4, wins: 3, losses: 2 });
      setupMatch(teamA, teamB);

      await service.processMatchResult('match-1', 'team-iu');

      const matchUpdate = (prisma as any).match.update.mock.calls[0][0];
      expect(matchUpdate.data.isUpset).toBeUndefined();
    });

    it('does NOT call vault payout when no upset', async () => {
      const teamA = makeTeam({ id: 'team-iu', symbol: 'IU', performanceScore: 50, ranking: 4, wins: 3, losses: 2 });
      const teamB = makeTeam({ id: 'team-lq', symbol: 'LQ', performanceScore: 48, ranking: 4, wins: 3, losses: 2 });
      setupMatch(teamA, teamB);

      await service.processMatchResult('match-1', 'team-iu');

      expect(mockVaultService.processUpsetEvent).not.toHaveBeenCalled();
    });

    it('calls recalculateRankings after updating team scores', async () => {
      setupMatch();
      await service.processMatchResult('match-1', 'team-iu');

      // recalculateRankings calls team.findMany — verify it was called
      expect((prisma as any).team.findMany).toHaveBeenCalled();
    });

    it('calls updateSellTaxes after result processing', async () => {
      const teamsAfterRanking = [
        makeTeam({ id: 'team-iu', ranking: 1, sellTaxRate: 5 }),
        makeTeam({ id: 'team-lq', ranking: 2, sellTaxRate: 5 }),
      ];
      // findMany is called by both recalculateRankings and updateSellTaxes
      (prisma as any).team.findMany.mockResolvedValue(teamsAfterRanking);
      setupMatch();

      await service.processMatchResult('match-1', 'team-iu');

      // updateSellTaxes calls findMany then update for each team with changed tax
      // At minimum, findMany should have been called at least twice (rankings + taxes)
      expect((prisma as any).team.findMany.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('returns early without error when match not found', async () => {
      (prisma as any).match.findUnique.mockResolvedValue(null);

      // Should not throw
      await service.processMatchResult('nonexistent', 'team-iu');

      // No team updates should happen
      expect((prisma as any).team.update).not.toHaveBeenCalled();
    });

    it('settles fan war after match result', async () => {
      setupMatch();
      await service.processMatchResult('match-1', 'team-iu');

      expect(mockFanWarsService.settleMatch).toHaveBeenCalledWith(
        'match-1',
        'team-iu',
        expect.stringMatching(/^(CLOSE|NORMAL|DOMINANT)$/),
      );
    });

    it('does not throw if fan war settlement fails', async () => {
      setupMatch();
      mockFanWarsService.settleMatch.mockRejectedValue(new Error('no fan war'));

      // Should not propagate the error
      await expect(service.processMatchResult('match-1', 'team-iu')).resolves.toBeUndefined();
    });

    it('handles away team as winner correctly', async () => {
      setupMatch();
      await service.processMatchResult('match-1', 'team-lq');

      // Away team (LQ) should be the winner — gets +8
      const lqUpdate = (prisma as any).team.update.mock.calls.find(
        (c: any) => c[0].where.id === 'team-lq',
      );
      expect(lqUpdate[0].data.performanceScore).toBe(40 + WIN_SCORE_DELTA);
      expect(lqUpdate[0].data.wins).toEqual({ increment: 1 });

      // Home team (IU) should be the loser — gets -5
      const iuUpdate = (prisma as any).team.update.mock.calls.find(
        (c: any) => c[0].where.id === 'team-iu',
      );
      expect(iuUpdate[0].data.performanceScore).toBe(50 - LOSS_SCORE_DELTA);
      expect(iuUpdate[0].data.losses).toEqual({ increment: 1 });
    });
  });

  // =========================================================================
  // recalculateRankings
  // =========================================================================
  describe('recalculateRankings', () => {
    it('assigns rankings 1 through N based on sort order', async () => {
      const teams = [
        makeTeam({ id: 'team-a', wins: 7, nrr: 1.2, performanceScore: 90 }),
        makeTeam({ id: 'team-b', wins: 5, nrr: 0.5, performanceScore: 70 }),
        makeTeam({ id: 'team-c', wins: 3, nrr: -0.3, performanceScore: 40 }),
      ];
      (prisma as any).team.findMany.mockResolvedValue(teams);

      await service.recalculateRankings();

      const updateCalls = (prisma as any).team.update.mock.calls;
      // Should have 3 update calls
      expect(updateCalls).toHaveLength(3);

      // Verify rankings assigned in order
      const rankById: Record<string, number> = {};
      for (const call of updateCalls) {
        rankById[call[0].where.id] = call[0].data.ranking;
      }
      expect(rankById['team-a']).toBe(1);
      expect(rankById['team-b']).toBe(2);
      expect(rankById['team-c']).toBe(3);
    });

    it('sorts primarily by wins descending', async () => {
      const teams = [
        makeTeam({ id: 'team-low', wins: 2, nrr: 2.0, performanceScore: 95 }),
        makeTeam({ id: 'team-high', wins: 6, nrr: -1.0, performanceScore: 30 }),
      ];
      // findMany returns pre-sorted by the DB query (wins desc, nrr desc, score desc)
      // The mock simulates DB returning them already sorted
      (prisma as any).team.findMany.mockResolvedValue([teams[1], teams[0]]);

      await service.recalculateRankings();

      const updateCalls = (prisma as any).team.update.mock.calls;
      const rankById: Record<string, number> = {};
      for (const call of updateCalls) {
        rankById[call[0].where.id] = call[0].data.ranking;
      }
      expect(rankById['team-high']).toBe(1);
      expect(rankById['team-low']).toBe(2);
    });

    it('handles empty teams list without error', async () => {
      (prisma as any).team.findMany.mockResolvedValue([]);

      await expect(service.recalculateRankings()).resolves.toBeUndefined();
      expect((prisma as any).team.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // updateSellTaxes (called indirectly via processMatchResult)
  // =========================================================================
  describe('updateSellTaxes (via processMatchResult)', () => {
    it('assigns correct sell tax based on ranking position', async () => {
      const teams = [
        makeTeam({ id: 'team-1', ranking: 1, sellTaxRate: 5 }),
        makeTeam({ id: 'team-2', ranking: 2, sellTaxRate: 5 }),
        makeTeam({ id: 'team-3', ranking: 3, sellTaxRate: 5 }),
        makeTeam({ id: 'team-4', ranking: 4, sellTaxRate: 5 }),
        makeTeam({ id: 'team-5', ranking: 5, sellTaxRate: 5 }),
        makeTeam({ id: 'team-6', ranking: 6, sellTaxRate: 5 }),
        makeTeam({ id: 'team-7', ranking: 7, sellTaxRate: 5 }),
        makeTeam({ id: 'team-8', ranking: 8, sellTaxRate: 5 }),
      ];

      // First call is from recalculateRankings, second from updateSellTaxes
      (prisma as any).team.findMany
        .mockResolvedValueOnce(teams)  // recalculateRankings
        .mockResolvedValueOnce(teams); // updateSellTaxes

      const homeTeam = makeTeam({ id: 'team-iu', symbol: 'IU', performanceScore: 50, ranking: 4, wins: 3, losses: 2 });
      const awayTeam = makeTeam({ id: 'team-lq', symbol: 'LQ', performanceScore: 40, ranking: 6, wins: 2, losses: 4 });
      const match = makeMatch(homeTeam, awayTeam);
      (prisma as any).match.findUnique.mockResolvedValue(match);
      (prisma as any).match.update.mockResolvedValue({});

      await service.processMatchResult('match-1', 'team-iu');

      // Find the tax update calls (those that set sellTaxRate)
      const taxUpdates = (prisma as any).team.update.mock.calls.filter(
        (c: any) => c[0].data.sellTaxRate !== undefined,
      );

      // All 8 teams should get tax updates since all had sellTaxRate=5 which
      // differs from their ranking-based tax (except rank 3 which is also 5)
      // Rank 1->2, 2->3, 3->5(same), 4->7, 5->9, 6->12, 7->15, 8->15
      expect(taxUpdates.length).toBeGreaterThanOrEqual(7); // at least 7 changed

      for (const call of taxUpdates) {
        const teamId = call[0].where.id;
        const team = teams.find((t) => t.id === teamId);
        if (team) {
          const expectedTax = SELL_TAX_BY_RANK[team.ranking] ?? 5;
          expect(call[0].data.sellTaxRate).toBe(expectedTax);
        }
      }
    });

    it('skips update for teams whose tax already matches their ranking', async () => {
      const teams = [
        makeTeam({ id: 'team-1', ranking: 1, sellTaxRate: 2 }),  // already correct
        makeTeam({ id: 'team-2', ranking: 2, sellTaxRate: 3 }),  // already correct
      ];

      (prisma as any).team.findMany.mockResolvedValue(teams);

      const homeTeam = makeTeam({ id: 'team-iu', symbol: 'IU', performanceScore: 50, ranking: 4, wins: 3, losses: 2 });
      const awayTeam = makeTeam({ id: 'team-lq', symbol: 'LQ', performanceScore: 40, ranking: 6, wins: 2, losses: 4 });
      const match = makeMatch(homeTeam, awayTeam);
      (prisma as any).match.findUnique.mockResolvedValue(match);
      (prisma as any).match.update.mockResolvedValue({});

      await service.processMatchResult('match-1', 'team-iu');

      // Tax updates should not include team-1 or team-2 since taxes already match
      const taxUpdates = (prisma as any).team.update.mock.calls.filter(
        (c: any) => c[0].data.sellTaxRate !== undefined,
      );
      const taxTeamIds = taxUpdates.map((c: any) => c[0].where.id);
      expect(taxTeamIds).not.toContain('team-1');
      expect(taxTeamIds).not.toContain('team-2');
    });
  });

  // =========================================================================
  // deriveMarginType (tested indirectly via fan war settlement)
  // =========================================================================
  describe('deriveMarginType (via settleMatch call)', () => {
    it('derives CLOSE margin when score diff <= 5', async () => {
      const homeTeam = makeTeam({ id: 'team-iu', symbol: 'IU', performanceScore: 50, ranking: 4, wins: 3, losses: 2 });
      const awayTeam = makeTeam({ id: 'team-lq', symbol: 'LQ', performanceScore: 48, ranking: 5, wins: 3, losses: 3 });
      const match = makeMatch(homeTeam, awayTeam);
      (prisma as any).match.findUnique.mockResolvedValue(match);
      (prisma as any).match.update.mockResolvedValue({});

      await service.processMatchResult('match-1', 'team-iu');

      expect(mockFanWarsService.settleMatch).toHaveBeenCalledWith('match-1', 'team-iu', 'CLOSE');
    });

    it('derives DOMINANT margin when score diff >= 20', async () => {
      const homeTeam = makeTeam({ id: 'team-iu', symbol: 'IU', performanceScore: 80, ranking: 1, wins: 7, losses: 0 });
      const awayTeam = makeTeam({ id: 'team-lq', symbol: 'LQ', performanceScore: 30, ranking: 7, wins: 1, losses: 6 });
      const match = makeMatch(homeTeam, awayTeam);
      (prisma as any).match.findUnique.mockResolvedValue(match);
      (prisma as any).match.update.mockResolvedValue({});

      await service.processMatchResult('match-1', 'team-iu');

      expect(mockFanWarsService.settleMatch).toHaveBeenCalledWith('match-1', 'team-iu', 'DOMINANT');
    });

    it('derives NORMAL margin when score diff is between 6 and 19', async () => {
      const homeTeam = makeTeam({ id: 'team-iu', symbol: 'IU', performanceScore: 60, ranking: 2, wins: 5, losses: 1 });
      const awayTeam = makeTeam({ id: 'team-lq', symbol: 'LQ', performanceScore: 50, ranking: 5, wins: 3, losses: 3 });
      const match = makeMatch(homeTeam, awayTeam);
      (prisma as any).match.findUnique.mockResolvedValue(match);
      (prisma as any).match.update.mockResolvedValue({});

      await service.processMatchResult('match-1', 'team-iu');

      expect(mockFanWarsService.settleMatch).toHaveBeenCalledWith('match-1', 'team-iu', 'NORMAL');
    });
  });

  // =========================================================================
  // getMultiplier (from constants)
  // =========================================================================
  describe('getMultiplier', () => {
    it('returns 1 for upset score 0-19', () => {
      expect(getMultiplier(0)).toBe(1);
      expect(getMultiplier(10)).toBe(1);
      expect(getMultiplier(19)).toBe(1);
    });

    it('returns 2 for upset score 20-39', () => {
      expect(getMultiplier(20)).toBe(2);
      expect(getMultiplier(30)).toBe(2);
      expect(getMultiplier(39)).toBe(2);
    });

    it('returns 3 for upset score 40-59', () => {
      expect(getMultiplier(40)).toBe(3);
      expect(getMultiplier(50)).toBe(3);
      expect(getMultiplier(59)).toBe(3);
    });

    it('returns 4 for upset score 60-79', () => {
      expect(getMultiplier(60)).toBe(4);
      expect(getMultiplier(70)).toBe(4);
      expect(getMultiplier(79)).toBe(4);
    });

    it('returns 5 for upset score 80+', () => {
      expect(getMultiplier(80)).toBe(5);
      expect(getMultiplier(100)).toBe(5);
      expect(getMultiplier(150)).toBe(5);
    });
  });
});
