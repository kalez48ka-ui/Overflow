// NOTE: Backend uses 0-based answer indexing. PredictionPool contract uses 1-based
// (0 = unanswered). Translate +1 when submitting to contract.
import { PrismaClient, Prisma } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import {
  PredictionPoolStatus,
  PredictionQuestionInfo,
  PredictionEntryInfo,
  PredictionAnswerInfo,
  PredictionClaimResult,
  PredictionLeaderboardEntry,
} from '../../common/types';

export class PredictionsService {
  private prisma: PrismaClient;
  private io: SocketServer | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  setSocket(io: SocketServer): void {
    this.io = io;
  }

  // ---------------------------------------------------------------------------
  // Pool management (admin)
  // ---------------------------------------------------------------------------

  /**
   * Create a prediction pool for a match.
   * One pool per match. Entry fee is the cost to participate.
   */
  async createPool(matchId: string, entryFee: number, deadline: Date): Promise<{ id: string }> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    const existing = await this.prisma.predictionPool.findUnique({
      where: { matchId },
    });

    if (existing) {
      throw new Error(`Prediction pool already exists for match ${matchId}`);
    }

    if (entryFee <= 0) {
      throw new Error('Entry fee must be positive');
    }

    if (deadline <= new Date()) {
      throw new Error('Deadline must be in the future');
    }

    const pool = await this.prisma.predictionPool.create({
      data: {
        matchId,
        entryFee,
        deadline,
        status: 'OPEN',
      },
    });

    console.log(`[Predictions] Created pool for match ${matchId}, fee=${entryFee}`);
    return { id: pool.id };
  }

  /**
   * Add a question to an existing prediction pool.
   * Questions are indexed sequentially.
   */
  async addQuestion(
    poolId: string,
    data: {
      questionText: string;
      options: string[];
      points: number;
      isLive: boolean;
      deadline: Date;
    }
  ): Promise<{ id: string; questionIndex: number }> {
    const pool = await this.prisma.predictionPool.findUnique({
      where: { id: poolId },
      include: { questions: { orderBy: { questionIndex: 'desc' }, take: 1 } },
    });

    if (!pool) {
      throw new Error(`Pool ${poolId} not found`);
    }

    if (pool.status === 'SETTLED' || pool.status === 'CANCELLED') {
      throw new Error(`Pool is ${pool.status}, cannot add questions`);
    }

    if (!data.questionText || data.questionText.trim().length === 0) {
      throw new Error('Question text is required');
    }

    if (!data.options || data.options.length < 2) {
      throw new Error('At least 2 options are required');
    }

    if (data.points <= 0) {
      throw new Error('Points must be positive');
    }

    const nextIndex = pool.questions.length > 0 ? pool.questions[0].questionIndex + 1 : 0;

    const question = await this.prisma.predictionQuestion.create({
      data: {
        poolId,
        questionIndex: nextIndex,
        questionText: data.questionText.trim(),
        options: data.options.map((o) => o.trim()),
        points: data.points,
        isLive: data.isLive,
        deadline: data.deadline,
      },
    });

    // Emit live question event for real-time questions
    if (data.isLive && this.io) {
      this.io.to(`prediction:${pool.matchId}`).emit('prediction:live', {
        matchId: pool.matchId,
        question: {
          questionIndex: question.questionIndex,
          questionText: question.questionText,
          options: question.options,
          points: question.points,
          deadline: question.deadline.toISOString(),
        },
      });
    }

    console.log(
      `[Predictions] Added question #${nextIndex} to pool ${poolId}: "${data.questionText.slice(0, 50)}"`
    );

    return { id: question.id, questionIndex: question.questionIndex };
  }

  // ---------------------------------------------------------------------------
  // User actions
  // ---------------------------------------------------------------------------

  /**
   * Enter a prediction pool with answers to pre-match questions.
   * Uses a serializable transaction to prevent double entries.
   */
  async enterPrediction(
    matchId: string,
    wallet: string,
    answers: Array<{ questionIndex: number; chosenOption: number }>
  ): Promise<PredictionEntryInfo> {
    wallet = wallet.toLowerCase();

    if (!answers || answers.length === 0) {
      throw new Error('At least one answer is required');
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const pool = await tx.predictionPool.findUnique({
          where: { matchId },
          include: {
            questions: { where: { isLive: false }, orderBy: { questionIndex: 'asc' } },
          },
        });

        if (!pool) {
          throw new Error(`No prediction pool found for match ${matchId}`);
        }

        if (pool.status !== 'OPEN') {
          throw new Error(`Pool is ${pool.status}, not accepting entries`);
        }

        const now = new Date();
        if (now >= pool.deadline) {
          // Auto-transition to LIVE when deadline passes
          await tx.predictionPool.update({
            where: { id: pool.id },
            data: { status: 'LIVE' },
          });
          throw new Error('Entry deadline has passed — pool is now live');
        }

        // Check for existing entry
        const existingEntry = await tx.predictionEntry.findUnique({
          where: { poolId_wallet: { poolId: pool.id, wallet } },
        });

        if (existingEntry) {
          throw new Error('You have already entered this prediction pool');
        }

        // Validate all answers reference valid pre-match questions
        const questionMap = new Map(pool.questions.map((q) => [q.questionIndex, q]));
        const answeredIndices = new Set<number>();

        for (const answer of answers) {
          const question = questionMap.get(answer.questionIndex);
          if (!question) {
            throw new Error(`Invalid question index: ${answer.questionIndex}`);
          }
          if (answer.chosenOption < 0 || answer.chosenOption >= question.options.length) {
            throw new Error(
              `Invalid option ${answer.chosenOption} for question ${answer.questionIndex} (max: ${question.options.length - 1})`
            );
          }
          if (answeredIndices.has(answer.questionIndex)) {
            throw new Error(`Duplicate answer for question ${answer.questionIndex}`);
          }
          answeredIndices.add(answer.questionIndex);
        }

        // All pre-match questions must be answered
        for (const q of pool.questions) {
          if (!answeredIndices.has(q.questionIndex)) {
            throw new Error(`Missing answer for question ${q.questionIndex}: "${q.questionText}"`);
          }
        }

        // Create entry
        const entry = await tx.predictionEntry.create({
          data: {
            poolId: pool.id,
            wallet,
          },
        });

        // Create answers
        const answerRecords = [];
        for (const answer of answers) {
          const question = questionMap.get(answer.questionIndex)!;
          const record = await tx.predictionAnswer.create({
            data: {
              entryId: entry.id,
              questionId: question.id,
              chosenOption: answer.chosenOption,
            },
          });
          answerRecords.push({
            questionIndex: answer.questionIndex,
            chosenOption: record.chosenOption,
            isCorrect: null,
            pointsEarned: null,
          });
        }

        // Increment pool counters
        const entryFeeNum = Number(pool.entryFee);
        await tx.predictionPool.update({
          where: { id: pool.id },
          data: {
            participantCount: { increment: 1 },
            totalPool: { increment: entryFeeNum },
          },
        });

        return {
          id: entry.id,
          wallet: entry.wallet,
          totalScore: null,
          payout: null,
          claimed: false,
          answers: answerRecords,
          participantCount: pool.participantCount + 1,
          totalPool: Number(pool.totalPool) + entryFeeNum,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    // Emit socket event outside the transaction
    if (this.io) {
      this.io.to(`prediction:${matchId}`).emit('prediction:update', {
        matchId,
        participantCount: result.participantCount,
        totalPool: result.totalPool,
      });
    }

    console.log(
      `[Predictions] Entry recorded: wallet ${wallet.slice(0, 6)}... in match ${matchId}`
    );

    return {
      id: result.id,
      wallet: result.wallet,
      totalScore: result.totalScore,
      payout: result.payout,
      claimed: result.claimed,
      answers: result.answers,
    };
  }

  /**
   * Submit a live answer for a real-time question during the match.
   * The user must have already entered the pool.
   * Wrapped in a transaction with P2002 handling for concurrent duplicate submissions.
   */
  async submitLiveAnswer(
    matchId: string,
    wallet: string,
    questionIndex: number,
    chosenOption: number
  ): Promise<{ questionIndex: number; chosenOption: number }> {
    wallet = wallet.toLowerCase();

    try {
      await this.prisma.$transaction(async (tx) => {
        const pool = await tx.predictionPool.findUnique({
          where: { matchId },
          include: {
            questions: { where: { questionIndex } },
          },
        });

        if (!pool) {
          throw new Error(`No prediction pool found for match ${matchId}`);
        }

        if (pool.status !== 'LIVE' && pool.status !== 'OPEN') {
          throw new Error(`Pool is ${pool.status}, not accepting live answers`);
        }

        const question = pool.questions[0];
        if (!question) {
          throw new Error(`Question ${questionIndex} not found in this pool`);
        }

        if (!question.isLive) {
          throw new Error(`Question ${questionIndex} is not a live question`);
        }

        const now = new Date();
        if (now >= question.deadline) {
          throw new Error(`Deadline for question ${questionIndex} has passed`);
        }

        if (chosenOption < 0 || chosenOption >= question.options.length) {
          throw new Error(
            `Invalid option ${chosenOption} for question ${questionIndex} (max: ${question.options.length - 1})`
          );
        }

        // Find the user's entry
        const entry = await tx.predictionEntry.findUnique({
          where: { poolId_wallet: { poolId: pool.id, wallet } },
        });

        if (!entry) {
          throw new Error('You must enter the prediction pool before submitting live answers');
        }

        // Check if already answered this question
        const existingAnswer = await tx.predictionAnswer.findUnique({
          where: { entryId_questionId: { entryId: entry.id, questionId: question.id } },
        });

        if (existingAnswer) {
          // Update the existing answer (allow changing live answers before deadline)
          await tx.predictionAnswer.update({
            where: { id: existingAnswer.id },
            data: { chosenOption },
          });
        } else {
          await tx.predictionAnswer.create({
            data: {
              entryId: entry.id,
              questionId: question.id,
              chosenOption,
            },
          });
        }
      });
    } catch (error) {
      // Handle unique constraint violation (P2002) for concurrent answer submissions
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new Error('Answer already submitted for this question');
      }
      throw error;
    }

    console.log(
      `[Predictions] Live answer: wallet ${wallet.slice(0, 6)}... q${questionIndex}=${chosenOption}`
    );

    return { questionIndex, chosenOption };
  }

  /**
   * Claim reward from a settled prediction pool.
   * Must be within the claim window (48h after settlement).
   * Uses Serializable isolation to prevent double-claim race conditions.
   */
  async claimReward(matchId: string, wallet: string): Promise<PredictionClaimResult> {
    wallet = wallet.toLowerCase();

    const payout = await this.prisma.$transaction(
      async (tx) => {
        // Re-read everything inside the serializable transaction to prevent TOCTOU
        const pool = await tx.predictionPool.findUnique({
          where: { matchId },
        });

        if (!pool) {
          throw new Error(`No prediction pool found for match ${matchId}`);
        }

        if (pool.status !== 'SETTLED') {
          throw new Error(`Pool is ${pool.status}, cannot claim yet`);
        }

        if (pool.claimDeadline) {
          const now = new Date();
          if (now > pool.claimDeadline) {
            throw new Error('Claim window has expired');
          }
        }

        const entry = await tx.predictionEntry.findUnique({
          where: { poolId_wallet: { poolId: pool.id, wallet } },
        });

        if (!entry) {
          throw new Error('No entry found for this wallet in this pool');
        }

        if (entry.claimed) {
          throw new Error('Reward already claimed');
        }

        const entryPayout = Number(entry.payout ?? 0);

        // Atomic update with WHERE claimed = false as extra safety net
        const updateResult = await tx.predictionEntry.updateMany({
          where: { id: entry.id, claimed: false },
          data: {
            claimed: true,
            claimedAt: new Date(),
          },
        });

        if (updateResult.count === 0) {
          throw new Error('Reward already claimed');
        }

        return entryPayout;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    console.log(
      `[Predictions] Claim processed: wallet ${wallet.slice(0, 6)}... payout=${payout.toFixed(2)}`
    );

    return { payout, matchId };
  }

  // ---------------------------------------------------------------------------
  // Settlement
  // ---------------------------------------------------------------------------

  /**
   * Settle a prediction pool after the match.
   *
   * Distribution:
   *   10% platform share
   *   30% safety floor pool (split equally among all participants)
   *   60% accuracy bonus pool (distributed proportional to score)
   *
   * If totalScoreSum == 0, accuracy pool is also split equally.
   */
  async settlePool(
    matchId: string,
    correctAnswers: Array<{ questionIndex: number; correctOption: number }>
  ): Promise<void> {
    // Build correct answer map upfront (pure input validation, no DB state)
    const correctMap = new Map<number, number>();
    for (const ca of correctAnswers) {
      correctMap.set(ca.questionIndex, ca.correctOption);
    }

    // All reads AND writes happen inside a single Serializable transaction
    // to prevent race conditions where concurrent settlePool calls read
    // the same pool state and both attempt to settle.
    const settlementResult = await this.prisma.$transaction(
      async (tx) => {
        // Read pool inside the transaction to get a consistent snapshot
        const pool = await tx.predictionPool.findUnique({
          where: { matchId },
          include: {
            questions: { orderBy: { questionIndex: 'asc' } },
            entries: { include: { answers: { include: { question: true } } } },
          },
        });

        if (!pool) {
          throw new Error(`No prediction pool found for match ${matchId}`);
        }

        if (pool.status === 'SETTLED') {
          throw new Error(`Pool for match ${matchId} is already settled`);
        }

        if (pool.status === 'CANCELLED') {
          throw new Error(`Pool for match ${matchId} is cancelled`);
        }

        if (pool.entries.length === 0) {
          // No participants, just cancel
          await tx.predictionPool.update({
            where: { id: pool.id, status: { notIn: ['SETTLED', 'CANCELLED'] } },
            data: { status: 'CANCELLED', settledAt: new Date() },
          });
          return null; // Signal: cancelled, no settlement data
        }

        // Validate all questions have correct answers
        for (const q of pool.questions) {
          if (!correctMap.has(q.questionIndex)) {
            throw new Error(`Missing correct answer for question ${q.questionIndex}: "${q.questionText}"`);
          }
        }

        // Build question lookup
        const questionByIndex = new Map(pool.questions.map((q) => [q.questionIndex, q]));

        // Calculate scores for each entry
        const entryScores: Array<{ entryId: string; score: number; answerUpdates: Array<{ answerId: string; isCorrect: boolean; pointsEarned: number }> }> = [];

        for (const entry of pool.entries) {
          let score = 0;
          const answerUpdates: Array<{ answerId: string; isCorrect: boolean; pointsEarned: number }> = [];

          for (const answer of entry.answers) {
            const question = questionByIndex.get(answer.question.questionIndex);
            if (!question) continue;

            const correctOption = correctMap.get(question.questionIndex);
            const isCorrect = answer.chosenOption === correctOption;
            const pointsEarned = isCorrect ? question.points : 0;

            if (isCorrect) {
              score += question.points;
            }

            answerUpdates.push({
              answerId: answer.id,
              isCorrect,
              pointsEarned,
            });
          }

          entryScores.push({ entryId: entry.id, score, answerUpdates });
        }

        // Calculate pool distribution
        const totalPool = Number(pool.totalPool);
        const participantCount = pool.entries.length;
        const platformShareAmount = totalPool * 0.10;
        const safetyFloorAmount = totalPool * 0.30;
        const accuracyBonusAmount = totalPool * 0.60;

        const totalScoreSum = entryScores.reduce((sum, e) => sum + e.score, 0);
        const highestScore = Math.max(...entryScores.map((e) => e.score));

        // Calculate payouts
        const entryPayouts: Array<{ entryId: string; score: number; payout: number }> = [];

        for (const entry of entryScores) {
          const safetyPayout = safetyFloorAmount / participantCount;
          let accuracyPayout: number;

          if (totalScoreSum === 0) {
            // No one got anything right — split accuracy pool equally too
            accuracyPayout = accuracyBonusAmount / participantCount;
          } else {
            accuracyPayout = (entry.score / totalScoreSum) * accuracyBonusAmount;
          }

          const totalPayout = safetyPayout + accuracyPayout;
          entryPayouts.push({ entryId: entry.entryId, score: entry.score, payout: totalPayout });
        }

        // Update questions with correct answers (small N, 5-10 questions max — keep individual)
        for (const [qIndex, correctOption] of correctMap.entries()) {
          const question = questionByIndex.get(qIndex);
          if (question) {
            await tx.predictionQuestion.update({
              where: { id: question.id },
              data: { correctOption, resolved: true },
            });
          }
        }

        // Batch update answers by correctness using updateMany (replaces N*M individual updates)
        const allAnswerUpdates = entryScores.flatMap((e) => e.answerUpdates);
        const correctAnswerIds = allAnswerUpdates.filter((a) => a.isCorrect).map((a) => a.answerId);
        const incorrectAnswerIds = allAnswerUpdates.filter((a) => !a.isCorrect).map((a) => a.answerId);

        if (correctAnswerIds.length > 0) {
          await tx.predictionAnswer.updateMany({
            where: { id: { in: correctAnswerIds } },
            data: { isCorrect: true },
          });
        }

        if (incorrectAnswerIds.length > 0) {
          await tx.predictionAnswer.updateMany({
            where: { id: { in: incorrectAnswerIds } },
            data: { isCorrect: false },
          });
        }

        // Points need individual updates since each answer has a different value — parallelize
        await Promise.all(
          allAnswerUpdates.map((au) =>
            tx.predictionAnswer.update({
              where: { id: au.answerId },
              data: { pointsEarned: au.pointsEarned },
            })
          )
        );

        // Update all entries with scores and payouts — parallelize
        await Promise.all(
          entryPayouts.map((ep) =>
            tx.predictionEntry.update({
              where: { id: ep.entryId },
              data: { totalScore: ep.score, payout: ep.payout },
            })
          )
        );

        // Update pool status with WHERE guard to prevent double-settlement
        const claimDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
        await tx.predictionPool.update({
          where: { id: pool.id, status: { notIn: ['SETTLED', 'CANCELLED'] } },
          data: {
            status: 'SETTLED',
            platformShare: platformShareAmount,
            safetyFloorPool: safetyFloorAmount,
            accuracyPool: accuracyBonusAmount,
            totalScoreSum,
            highestScore,
            settledAt: new Date(),
            claimDeadline,
          },
        });

        return { participantCount, totalPool, highestScore };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    if (!settlementResult) {
      console.log(`[Predictions] Pool ${matchId} cancelled — no participants`);
      return;
    }

    const { participantCount, totalPool, highestScore } = settlementResult;

    console.log(
      `[Predictions] Settled pool for match ${matchId}. ` +
      `Participants: ${participantCount}, Pool: ${totalPool.toFixed(2)}, ` +
      `Highest: ${highestScore}, Platform: ${(totalPool * 0.10).toFixed(2)}`
    );

    if (this.io) {
      this.io.to(`prediction:${matchId}`).emit('prediction:settled', {
        matchId,
        highestScore,
        participantCount,
        totalPool,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------

  /**
   * Get full pool status for a match, optionally including the user's entry.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapPoolToStatus(pool: any, userEntry?: PredictionEntryInfo | null): PredictionPoolStatus {
    const homeTeam = pool.match?.homeTeam;
    const awayTeam = pool.match?.awayTeam;
    return {
      id: pool.id,
      matchId: pool.matchId,
      homeTeamName: homeTeam?.name ?? '',
      homeTeamSymbol: homeTeam?.symbol ? `$${homeTeam.symbol}` : '',
      homeTeamColor: homeTeam?.color ?? '#58A6FF',
      awayTeamName: awayTeam?.name ?? '',
      awayTeamSymbol: awayTeam?.symbol ? `$${awayTeam.symbol}` : '',
      awayTeamColor: awayTeam?.color ?? '#E4002B',
      matchVenue: pool.match?.venue ?? '',
      entryFee: Number(pool.entryFee),
      totalPool: Number(pool.totalPool),
      participantCount: pool._count?.entries ?? pool.participantCount ?? 0,
      status: pool.status,
      deadline: pool.deadline,
      settledAt: pool.settledAt,
      claimDeadline: pool.claimDeadline,
      highestScore: pool.highestScore !== null ? Number(pool.highestScore) : null,
      questions: (pool.questions ?? []).map((q: any) => ({
        id: q.id,
        questionIndex: q.questionIndex,
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        points: q.points,
        isLive: q.isLive,
        deadline: q.deadline,
        resolved: q.resolved,
      })),
      userEntry: userEntry !== undefined ? userEntry : (pool.userEntry ?? null),
    };
  }

  async getPoolStatus(matchId: string, wallet?: string): Promise<PredictionPoolStatus> {
    const pool = await this.prisma.predictionPool.findUnique({
      where: { matchId },
      include: {
        match: {
          include: {
            homeTeam: { select: { id: true, name: true, symbol: true, color: true } },
            awayTeam: { select: { id: true, name: true, symbol: true, color: true } },
          },
        },
        questions: { orderBy: { questionIndex: 'asc' } },
        _count: { select: { entries: true } },
      },
    });

    if (!pool) {
      throw new Error(`No prediction pool found for match ${matchId}`);
    }

    let userEntry: PredictionEntryInfo | null = null;

    if (wallet) {
      const normalizedWallet = wallet.toLowerCase();
      const entry = await this.prisma.predictionEntry.findUnique({
        where: { poolId_wallet: { poolId: pool.id, wallet: normalizedWallet } },
        include: { answers: { include: { question: true } } },
      });

      if (entry) {
        userEntry = {
          id: entry.id,
          wallet: entry.wallet,
          totalScore: entry.totalScore !== null ? Number(entry.totalScore) : null,
          payout: entry.payout !== null ? Number(entry.payout) : null,
          claimed: entry.claimed,
          answers: entry.answers.map((a) => ({
            questionIndex: a.question.questionIndex,
            chosenOption: a.chosenOption,
            isCorrect: a.isCorrect,
            pointsEarned: a.pointsEarned !== null ? Number(a.pointsEarned) : null,
          })),
        };
      }
    }

    return this.mapPoolToStatus(pool, userEntry);
  }

  /**
   * Get all active (OPEN or LIVE) prediction pools with match details.
   */
  async getActivePools(): Promise<PredictionPoolStatus[]> {
    const pools = await this.prisma.predictionPool.findMany({
      where: {
        status: { in: ['OPEN', 'LIVE'] },
      },
      include: {
        match: {
          include: {
            homeTeam: { select: { id: true, name: true, symbol: true, color: true } },
            awayTeam: { select: { id: true, name: true, symbol: true, color: true } },
          },
        },
        questions: { orderBy: { questionIndex: 'asc' } },
        _count: { select: { entries: true } },
      },
      orderBy: { deadline: 'asc' },
    });

    // Auto-transition OPEN pools past deadline to LIVE
    const now = new Date();
    for (const pool of pools) {
      if (pool.status === 'OPEN' && now >= pool.deadline) {
        await this.prisma.predictionPool.update({
          where: { id: pool.id },
          data: { status: 'LIVE' },
        });
        (pool as { status: string }).status = 'LIVE';
        console.log(`[Predictions] Auto-transitioned pool ${pool.id} from OPEN to LIVE`);
      }
    }

    return pools.map((pool) => this.mapPoolToStatus(pool));
  }

  /**
   * Get all prediction entries for a wallet across all pools.
   */
  async getUserPredictions(wallet: string, limit = 50, offset = 0): Promise<PredictionPoolStatus[]> {
    wallet = wallet.toLowerCase();

    const entries = await this.prisma.predictionEntry.findMany({
      where: { wallet },
      take: limit,
      skip: offset,
      include: {
        pool: {
          include: {
            match: {
              include: {
                homeTeam: { select: { id: true, name: true, symbol: true, color: true } },
                awayTeam: { select: { id: true, name: true, symbol: true, color: true } },
              },
            },
            questions: { orderBy: { questionIndex: 'asc' } },
            _count: { select: { entries: true } },
          },
        },
        answers: {
          include: { question: true },
          orderBy: { question: { questionIndex: 'asc' } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return entries.map((entry) => {
      const userEntry: PredictionEntryInfo = {
        id: entry.id,
        wallet: entry.wallet,
        totalScore: entry.totalScore !== null ? Number(entry.totalScore) : null,
        payout: entry.payout !== null ? Number(entry.payout) : null,
        claimed: entry.claimed,
        answers: entry.answers.map((a) => ({
          questionIndex: a.question.questionIndex,
          chosenOption: a.chosenOption,
          isCorrect: a.isCorrect,
          pointsEarned: a.pointsEarned !== null ? Number(a.pointsEarned) : null,
        })),
      };
      return this.mapPoolToStatus(entry.pool, userEntry);
    });
  }

  /**
   * Get prediction leaderboard — top earners across all settled pools.
   */
  async getLeaderboard(limit = 25): Promise<PredictionLeaderboardEntry[]> {
    const aggregated = await this.prisma.predictionEntry.groupBy({
      by: ['wallet'],
      _sum: {
        payout: true,
        totalScore: true,
      },
      _count: {
        id: true,
      },
      where: {
        pool: { status: 'SETTLED' },
      },
      orderBy: {
        _sum: {
          payout: 'desc',
        },
      },
      take: limit,
    });

    return aggregated.map((entry) => ({
      wallet: entry.wallet.slice(0, 6) + '...' + entry.wallet.slice(-4),
      totalEarnings: Number(entry._sum.payout ?? 0),
      totalPools: entry._count.id,
      avgScore: entry._count.id > 0
        ? Number(entry._sum.totalScore ?? 0) / entry._count.id
        : 0,
    }));
  }

  /**
   * Get questions for a prediction pool.
   */
  async getQuestions(matchId: string): Promise<PredictionQuestionInfo[]> {
    const pool = await this.prisma.predictionPool.findUnique({
      where: { matchId },
      include: { questions: { orderBy: { questionIndex: 'asc' } } },
    });

    if (!pool) {
      throw new Error(`No prediction pool found for match ${matchId}`);
    }

    return pool.questions.map((q) => ({
      id: q.id,
      questionIndex: q.questionIndex,
      questionText: q.questionText,
      options: q.options,
      correctOption: q.correctOption,
      points: q.points,
      isLive: q.isLive,
      deadline: q.deadline,
      resolved: q.resolved,
    }));
  }

  /**
   * Estimate payout for a hypothetical score in a given pool.
   * Useful for UI to show potential earnings.
   */
  async getEstimatedPayout(matchId: string, hypotheticalScore: number): Promise<number> {
    const pool = await this.prisma.predictionPool.findUnique({
      where: { matchId },
    });

    if (!pool) {
      throw new Error(`No prediction pool found for match ${matchId}`);
    }

    const totalPool = Number(pool.totalPool);
    const participantCount = pool.participantCount;

    if (participantCount === 0) {
      return 0;
    }

    // Simulate with current pool state + 1 hypothetical participant
    const simParticipants = participantCount + 1;
    const simTotalPool = totalPool + Number(pool.entryFee);
    const safetyFloor = simTotalPool * 0.30;
    const accuracyBonus = simTotalPool * 0.60;

    // Assume average competition: hypothetical user vs simParticipants sharing pool
    const safetyPayout = safetyFloor / simParticipants;

    // For accuracy, estimate assuming hypothetical score is the only scorer
    // This gives an optimistic upper bound
    let accuracyPayout: number;
    if (hypotheticalScore <= 0) {
      accuracyPayout = accuracyBonus / simParticipants; // Equal split if no one scores
    } else {
      // Assume this score is half the total (moderate estimate)
      const estimatedTotalScoreSum = hypotheticalScore * 2;
      accuracyPayout = (hypotheticalScore / estimatedTotalScoreSum) * accuracyBonus;
    }

    return Math.round((safetyPayout + accuracyPayout) * 100) / 100;
  }
}
