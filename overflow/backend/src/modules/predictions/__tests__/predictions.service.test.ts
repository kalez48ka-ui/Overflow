import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PredictionsService } from '../predictions.service';
import { createMockPrismaClient } from '../../../__mocks__/prisma';

describe('PredictionsService', () => {
  let service: PredictionsService;
  let prisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    service = new PredictionsService(prisma as any);
  });

  // -------------------------------------------------------------------------
  // settlePool — 10/30/60 split calculation
  // -------------------------------------------------------------------------
  describe('settlePool — 10/30/60 split', () => {
    const matchId = 'match-001';

    function buildPoolFixture(opts: {
      entries: Array<{
        id: string;
        wallet: string;
        answers: Array<{
          id: string;
          chosenOption: number;
          question: { questionIndex: number; points: number };
        }>;
      }>;
      totalPool: number;
    }) {
      return {
        id: 'pool-1',
        matchId,
        status: 'LIVE',
        totalPool: opts.totalPool,
        entryFee: 10,
        participantCount: opts.entries.length,
        questions: [
          { id: 'q-0', questionIndex: 0, questionText: 'Who wins?', options: ['IU', 'LQ'], points: 10, isLive: false },
          { id: 'q-1', questionIndex: 1, questionText: 'Top scorer?', options: ['A', 'B', 'C'], points: 20, isLive: false },
        ],
        entries: opts.entries.map((e) => ({
          id: e.id,
          wallet: e.wallet,
          claimed: false,
          payout: null,
          totalScore: null,
          answers: e.answers.map((a) => ({
            id: a.id,
            chosenOption: a.chosenOption,
            question: {
              ...a.question,
              id: `q-${a.question.questionIndex}`,
              questionText: 'Q',
              options: ['A', 'B', 'C'],
              isLive: false,
            },
          })),
        })),
      };
    }

    it('distributes 10% platform, 30% safety floor, 60% accuracy', async () => {
      const pool = buildPoolFixture({
        totalPool: 100,
        entries: [
          {
            id: 'e-1',
            wallet: '0xaaa',
            answers: [
              { id: 'a-1', chosenOption: 0, question: { questionIndex: 0, points: 10 } },
              { id: 'a-2', chosenOption: 1, question: { questionIndex: 1, points: 20 } },
            ],
          },
          {
            id: 'e-2',
            wallet: '0xbbb',
            answers: [
              { id: 'a-3', chosenOption: 1, question: { questionIndex: 0, points: 10 } },
              { id: 'a-4', chosenOption: 1, question: { questionIndex: 1, points: 20 } },
            ],
          },
        ],
      });

      (prisma as any).predictionPool.findUnique.mockResolvedValue(pool);
      (prisma as any).predictionAnswer.updateMany.mockResolvedValue({ count: 1 });
      (prisma as any).predictionAnswer.update.mockResolvedValue({});
      (prisma as any).predictionEntry.update.mockResolvedValue({});
      (prisma as any).predictionQuestion.update.mockResolvedValue({});
      (prisma as any).predictionPool.update.mockResolvedValue({});

      // Both answers correct: q0=0, q1=1
      await service.settlePool(matchId, [
        { questionIndex: 0, correctOption: 0 },
        { questionIndex: 1, correctOption: 1 },
      ]);

      // Verify pool update includes correct split amounts
      const poolUpdateCall = (prisma as any).predictionPool.update.mock.calls[0][0];
      expect(poolUpdateCall.data.platformShare).toBe(10);       // 10% of 100
      expect(poolUpdateCall.data.safetyFloorPool).toBe(30);     // 30% of 100
      expect(poolUpdateCall.data.accuracyPool).toBe(60);        // 60% of 100
      expect(poolUpdateCall.data.status).toBe('SETTLED');
    });

    it('splits accuracy pool equally when all scores are zero', async () => {
      const pool = buildPoolFixture({
        totalPool: 100,
        entries: [
          {
            id: 'e-1',
            wallet: '0xaaa',
            answers: [
              { id: 'a-1', chosenOption: 1, question: { questionIndex: 0, points: 10 } },
              { id: 'a-2', chosenOption: 0, question: { questionIndex: 1, points: 20 } },
            ],
          },
          {
            id: 'e-2',
            wallet: '0xbbb',
            answers: [
              { id: 'a-3', chosenOption: 1, question: { questionIndex: 0, points: 10 } },
              { id: 'a-4', chosenOption: 0, question: { questionIndex: 1, points: 20 } },
            ],
          },
        ],
      });

      (prisma as any).predictionPool.findUnique.mockResolvedValue(pool);
      (prisma as any).predictionAnswer.updateMany.mockResolvedValue({ count: 1 });
      (prisma as any).predictionAnswer.update.mockResolvedValue({});
      (prisma as any).predictionEntry.update.mockResolvedValue({});
      (prisma as any).predictionQuestion.update.mockResolvedValue({});
      (prisma as any).predictionPool.update.mockResolvedValue({});

      // Both got everything wrong: correct is 0 and 1, they picked 1 and 0
      await service.settlePool(matchId, [
        { questionIndex: 0, correctOption: 0 },
        { questionIndex: 1, correctOption: 1 },
      ]);

      // Each entry should get: safetyFloor/2 + accuracyBonus/2 = 15 + 30 = 45
      const entryUpdateCalls = (prisma as any).predictionEntry.update.mock.calls;
      const payouts = entryUpdateCalls.map((c: any) => c[0].data.payout);
      expect(payouts[0]).toBe(45);
      expect(payouts[1]).toBe(45);
    });

    it('awards accuracy bonus proportional to score', async () => {
      const pool = buildPoolFixture({
        totalPool: 100,
        entries: [
          {
            id: 'e-1',
            wallet: '0xaaa',
            answers: [
              { id: 'a-1', chosenOption: 0, question: { questionIndex: 0, points: 10 } },
              { id: 'a-2', chosenOption: 1, question: { questionIndex: 1, points: 20 } },
            ],
          },
          {
            id: 'e-2',
            wallet: '0xbbb',
            answers: [
              { id: 'a-3', chosenOption: 0, question: { questionIndex: 0, points: 10 } },
              { id: 'a-4', chosenOption: 0, question: { questionIndex: 1, points: 20 } },
            ],
          },
        ],
      });

      (prisma as any).predictionPool.findUnique.mockResolvedValue(pool);
      (prisma as any).predictionAnswer.updateMany.mockResolvedValue({ count: 1 });
      (prisma as any).predictionAnswer.update.mockResolvedValue({});
      (prisma as any).predictionEntry.update.mockResolvedValue({});
      (prisma as any).predictionQuestion.update.mockResolvedValue({});
      (prisma as any).predictionPool.update.mockResolvedValue({});

      // e-1 gets both right (score=30), e-2 gets only q0 right (score=10)
      await service.settlePool(matchId, [
        { questionIndex: 0, correctOption: 0 },
        { questionIndex: 1, correctOption: 1 },
      ]);

      const entryUpdateCalls = (prisma as any).predictionEntry.update.mock.calls;
      // Find updates by entryId
      const e1Update = entryUpdateCalls.find((c: any) => c[0].where.id === 'e-1');
      const e2Update = entryUpdateCalls.find((c: any) => c[0].where.id === 'e-2');

      // e-1: safety = 15, accuracy = (30/40)*60 = 45 => total = 60
      expect(e1Update[0].data.payout).toBe(60);
      expect(e1Update[0].data.totalScore).toBe(30);

      // e-2: safety = 15, accuracy = (10/40)*60 = 15 => total = 30
      expect(e2Update[0].data.payout).toBe(30);
      expect(e2Update[0].data.totalScore).toBe(10);
    });
  });

  // -------------------------------------------------------------------------
  // claimReward
  // -------------------------------------------------------------------------
  describe('claimReward', () => {
    const matchId = 'match-001';
    const wallet = '0xAbC1234567890aBcDeF1234567890AbCdEf123456';

    it('rejects when pool is not settled', async () => {
      (prisma as any).predictionPool.findUnique.mockResolvedValue({
        id: 'pool-1',
        matchId,
        status: 'LIVE',
      });

      await expect(
        service.claimReward(matchId, wallet),
      ).rejects.toThrow('cannot claim yet');
    });

    it('rejects when entry already claimed', async () => {
      (prisma as any).predictionPool.findUnique.mockResolvedValue({
        id: 'pool-1',
        matchId,
        status: 'SETTLED',
        claimDeadline: new Date(Date.now() + 86400_000),
      });
      (prisma as any).predictionEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        wallet: wallet.toLowerCase(),
        claimed: true,
        payout: 50,
      });

      await expect(
        service.claimReward(matchId, wallet),
      ).rejects.toThrow('Reward already claimed');
    });

    it('rejects when claim window has expired', async () => {
      (prisma as any).predictionPool.findUnique.mockResolvedValue({
        id: 'pool-1',
        matchId,
        status: 'SETTLED',
        claimDeadline: new Date(Date.now() - 1000), // expired
      });

      await expect(
        service.claimReward(matchId, wallet),
      ).rejects.toThrow('Claim window has expired');
    });

    it('returns payout on successful claim', async () => {
      (prisma as any).predictionPool.findUnique.mockResolvedValue({
        id: 'pool-1',
        matchId,
        status: 'SETTLED',
        claimDeadline: new Date(Date.now() + 86400_000),
      });
      (prisma as any).predictionEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        wallet: wallet.toLowerCase(),
        claimed: false,
        payout: 45.5,
      });
      (prisma as any).predictionEntry.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.claimReward(matchId, wallet);

      expect(result.payout).toBe(45.5);
      expect(result.matchId).toBe(matchId);
    });

    it('rejects double-claim via atomic updateMany guard', async () => {
      (prisma as any).predictionPool.findUnique.mockResolvedValue({
        id: 'pool-1',
        matchId,
        status: 'SETTLED',
        claimDeadline: new Date(Date.now() + 86400_000),
      });
      (prisma as any).predictionEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        wallet: wallet.toLowerCase(),
        claimed: false,
        payout: 45.5,
      });
      // Simulate race condition: updateMany returns 0 (someone else claimed first)
      (prisma as any).predictionEntry.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.claimReward(matchId, wallet),
      ).rejects.toThrow('Reward already claimed');
    });
  });

  // -------------------------------------------------------------------------
  // settlePool — cancels when no participants
  // -------------------------------------------------------------------------
  describe('settlePool — edge cases', () => {
    it('cancels pool when there are no participants', async () => {
      (prisma as any).predictionPool.findUnique.mockResolvedValue({
        id: 'pool-1',
        matchId: 'match-001',
        status: 'LIVE',
        totalPool: 0,
        entryFee: 10,
        participantCount: 0,
        questions: [
          { id: 'q-0', questionIndex: 0, questionText: 'Q?', options: ['A', 'B'], points: 10, isLive: false },
        ],
        entries: [],
      });
      (prisma as any).predictionPool.update.mockResolvedValue({});

      await service.settlePool('match-001', [{ questionIndex: 0, correctOption: 0 }]);

      const updateCall = (prisma as any).predictionPool.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe('CANCELLED');
    });
  });
});
