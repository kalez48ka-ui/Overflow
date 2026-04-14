import { requireWalletAuth } from '../middleware/walletAuth';
import { Router, Request, Response } from 'express';
import { PredictionsService } from '../modules/predictions/predictions.service';
import { requireAdminAuth } from './admin';

export function createPredictionsRouter(predictionsService: PredictionsService): Router {
  const router = Router();

  // ---------------------------------------------------------------------------
  // Shared validation helpers
  // ---------------------------------------------------------------------------

  function isValidMatchId(matchId: string): boolean {
    return typeof matchId === 'string' && matchId.length > 0 && matchId.length <= 128 && /^[a-zA-Z0-9-]+$/.test(matchId);
  }

  function isValidWallet(wallet: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(wallet);
  }

  // ---------------------------------------------------------------------------
  // Public routes (defined before /:matchId to avoid param collision)
  // ---------------------------------------------------------------------------

  /**
   * GET /api/predictions/active
   * Returns all active (OPEN / LIVE) prediction pools.
   */
  router.get('/active', async (_req: Request, res: Response) => {
    try {
      const active = await predictionsService.getActivePools();
      res.json(active);
    } catch (err) {
      console.error('[Predictions] GET /active error:', err);
      res.status(500).json({ error: 'Failed to fetch active prediction pools' });
    }
  });

  /**
   * GET /api/predictions/leaderboard
   * Returns top prediction earners.
   */
  router.get('/leaderboard', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || '25')) || 25, 100);
      const leaderboard = await predictionsService.getLeaderboard(limit);
      res.json(leaderboard);
    } catch (err) {
      console.error('[Predictions] GET /leaderboard error:', err);
      res.status(500).json({ error: 'Failed to fetch prediction leaderboard' });
    }
  });

  /**
   * GET /api/predictions/user/:wallet
   * Returns all prediction entries for a given wallet.
   */
  router.get('/user/:wallet', async (req: Request, res: Response) => {
    try {
      const wallet = String(req.params.wallet).toLowerCase();

      if (!isValidWallet(wallet)) {
        res.status(400).json({ error: 'Invalid wallet address format' });
        return;
      }

      const limit = Math.min(Math.max(1, parseInt(String(req.query.limit || '50')) || 50), 200);
      const offset = Math.max(0, parseInt(String(req.query.offset || '0')) || 0);
      const predictions = await predictionsService.getUserPredictions(wallet, limit, offset);
      res.json(predictions);
    } catch (err) {
      console.error('[Predictions] GET /user/:wallet error:', err);
      res.status(500).json({ error: 'Failed to fetch user predictions' });
    }
  });

  /**
   * GET /api/predictions/:matchId
   * Returns full pool status for a specific match.
   * Optional query param: ?wallet=0x... to include user entry.
   */
  router.get('/:matchId', async (req: Request, res: Response) => {
    try {
      const matchId = String(req.params.matchId);

      if (!isValidMatchId(matchId)) {
        res.status(400).json({ error: 'Invalid matchId format' });
        return;
      }

      let wallet: string | undefined;
      if (req.query.wallet) {
        wallet = String(req.query.wallet).toLowerCase();
        if (!isValidWallet(wallet)) {
          res.status(400).json({ error: 'Invalid wallet address format' });
          return;
        }
      }

      const status = await predictionsService.getPoolStatus(matchId, wallet);
      res.json(status);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('No prediction pool found')) {
        res.status(404).json({ error: message });
      } else {
        console.error('[Predictions] GET /:matchId error:', err);
        res.status(500).json({ error: 'Failed to fetch pool status' });
      }
    }
  });

  /**
   * GET /api/predictions/:matchId/questions
   * Returns all questions for a prediction pool.
   */
  router.get('/:matchId/questions', async (req: Request, res: Response) => {
    try {
      const matchId = String(req.params.matchId);

      if (!isValidMatchId(matchId)) {
        res.status(400).json({ error: 'Invalid matchId format' });
        return;
      }

      const questions = await predictionsService.getQuestions(matchId);
      res.json(questions);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('No prediction pool found')) {
        res.status(404).json({ error: message });
      } else {
        console.error('[Predictions] GET /:matchId/questions error:', err);
        res.status(500).json({ error: 'Failed to fetch questions' });
      }
    }
  });

  /**
   * GET /api/predictions/:matchId/estimate/:score
   * Returns estimated payout for a hypothetical score.
   */
  router.get('/:matchId/estimate/:score', async (req: Request, res: Response) => {
    try {
      const matchId = String(req.params.matchId);

      if (!isValidMatchId(matchId)) {
        res.status(400).json({ error: 'Invalid matchId format' });
        return;
      }

      const score = Number(req.params.score);
      if (!Number.isFinite(score) || score < 0 || score > 10000) {
        res.status(400).json({ error: 'Score must be a finite number between 0 and 10000' });
        return;
      }

      const estimated = await predictionsService.getEstimatedPayout(matchId, score);
      res.json({ matchId, score, estimatedPayout: estimated });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('No prediction pool found')) {
        res.status(404).json({ error: message });
      } else {
        console.error('[Predictions] GET /:matchId/estimate/:score error:', err);
        res.status(500).json({ error: 'Failed to estimate payout' });
      }
    }
  });

  // ---------------------------------------------------------------------------
  // User action routes
  // ---------------------------------------------------------------------------

  /**
   * POST /api/predictions/:matchId/enter
   * Enter a prediction pool with answers.
   * Body: { wallet: string, answers: [{ questionIndex: number, chosenOption: number }] }
   */
  router.post('/:matchId/enter', requireWalletAuth('prediction:enter'), async (req: Request, res: Response) => {
    try {
      const matchId = String(req.params.matchId);

      if (!isValidMatchId(matchId)) {
        res.status(400).json({ error: 'Invalid matchId format' });
        return;
      }

      const { answers } = req.body;
      const normalizedWallet = req.verifiedWallet!;

      if (!answers) {
        res.status(400).json({ error: 'Missing required fields: answers' });
        return;
      }

      if (!Array.isArray(answers) || answers.length === 0) {
        res.status(400).json({ error: 'Answers must be a non-empty array' });
        return;
      }

      // Validate answer structure
      for (const answer of answers) {
        if (typeof answer.questionIndex !== 'number' || typeof answer.chosenOption !== 'number') {
          res.status(400).json({ error: 'Each answer must have questionIndex (number) and chosenOption (number)' });
          return;
        }
        if (!Number.isInteger(answer.questionIndex) || answer.questionIndex < 0) {
          res.status(400).json({ error: 'questionIndex must be a non-negative integer' });
          return;
        }
        if (!Number.isInteger(answer.chosenOption) || answer.chosenOption < 0) {
          res.status(400).json({ error: 'chosenOption must be a non-negative integer' });
          return;
        }
      }

      const entry = await predictionsService.enterPrediction(matchId, normalizedWallet, answers);
      res.status(201).json(entry);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (
        message.includes('No prediction pool found') ||
        message.includes('not accepting entries') ||
        message.includes('deadline has passed') ||
        message.includes('already entered') ||
        message.includes('Invalid question index') ||
        message.includes('Invalid option') ||
        message.includes('Duplicate answer') ||
        message.includes('Missing answer') ||
        message.includes('At least one answer')
      ) {
        res.status(400).json({ error: message });
      } else {
        console.error('[Predictions] POST /:matchId/enter error:', err);
        res.status(500).json({ error: 'Failed to enter prediction pool' });
      }
    }
  });

  /**
   * POST /api/predictions/:matchId/live-answer
   * Submit a live answer during the match.
   * Body: { wallet: string, questionIndex: number, chosenOption: number }
   */
  router.post('/:matchId/live-answer', requireWalletAuth('prediction:live-answer'), async (req: Request, res: Response) => {
    try {
      const matchId = String(req.params.matchId);

      if (!isValidMatchId(matchId)) {
        res.status(400).json({ error: 'Invalid matchId format' });
        return;
      }

      const { questionIndex, chosenOption } = req.body;
      const normalizedWallet = req.verifiedWallet!;

      if (questionIndex === undefined || chosenOption === undefined) {
        res.status(400).json({ error: 'Missing required fields: questionIndex, chosenOption' });
        return;
      }

      const qIdx = Number(questionIndex);
      const cOpt = Number(chosenOption);

      if (!Number.isInteger(qIdx) || qIdx < 0) {
        res.status(400).json({ error: 'questionIndex must be a non-negative integer' });
        return;
      }

      if (!Number.isInteger(cOpt) || cOpt < 0) {
        res.status(400).json({ error: 'chosenOption must be a non-negative integer' });
        return;
      }

      const result = await predictionsService.submitLiveAnswer(matchId, normalizedWallet, qIdx, cOpt);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (
        message.includes('No prediction pool found') ||
        message.includes('not accepting live answers') ||
        message.includes('not found in this pool') ||
        message.includes('not a live question') ||
        message.includes('Deadline for question') ||
        message.includes('Invalid option') ||
        message.includes('must enter the prediction pool')
      ) {
        res.status(400).json({ error: message });
      } else {
        console.error('[Predictions] POST /:matchId/live-answer error:', err);
        res.status(500).json({ error: 'Failed to submit live answer' });
      }
    }
  });

  /**
   * POST /api/predictions/:matchId/claim
   * Claim reward from a settled prediction pool.
   * Body: { wallet: string }
   */
  router.post('/:matchId/claim', requireWalletAuth('prediction:claim'), async (req: Request, res: Response) => {
    try {
      const matchId = String(req.params.matchId);

      if (!isValidMatchId(matchId)) {
        res.status(400).json({ error: 'Invalid matchId format' });
        return;
      }

      const normalizedWallet = req.verifiedWallet!;

      const result = await predictionsService.claimReward(matchId, normalizedWallet);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (
        message.includes('No prediction pool found') ||
        message.includes('cannot claim yet') ||
        message.includes('No entry found') ||
        message.includes('already claimed') ||
        message.includes('Claim window has expired')
      ) {
        res.status(400).json({ error: message });
      } else {
        console.error('[Predictions] POST /:matchId/claim error:', err);
        res.status(500).json({ error: 'Failed to claim reward' });
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Admin routes (require admin auth)
  // ---------------------------------------------------------------------------

  /**
   * POST /api/predictions/:matchId/create
   * Create a prediction pool for a match.
   * Body: { entryFee: number, deadline: string (ISO) }
   */
  router.post('/:matchId/create', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const matchId = String(req.params.matchId);

      if (!isValidMatchId(matchId)) {
        res.status(400).json({ error: 'Invalid matchId format' });
        return;
      }

      const { entryFee, deadline } = req.body;

      if (entryFee === undefined || !deadline) {
        res.status(400).json({ error: 'Missing required fields: entryFee, deadline' });
        return;
      }

      const numFee = Number(entryFee);
      if (!Number.isFinite(numFee) || numFee <= 0 || numFee > 1_000_000) {
        res.status(400).json({ error: 'Entry fee must be a finite positive number (max 1,000,000)' });
        return;
      }

      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        res.status(400).json({ error: 'Invalid deadline date format' });
        return;
      }

      const result = await predictionsService.createPool(matchId, numFee, deadlineDate);
      res.status(201).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (
        message.includes('not found') ||
        message.includes('already exists') ||
        message.includes('must be positive') ||
        message.includes('must be in the future')
      ) {
        res.status(400).json({ error: message });
      } else {
        console.error('[Predictions] POST /:matchId/create error:', err);
        res.status(500).json({ error: 'Failed to create prediction pool' });
      }
    }
  });

  /**
   * POST /api/predictions/:matchId/add-question
   * Add a question to a prediction pool.
   * Body: { questionText: string, options: string[], points: number, isLive: boolean, deadline: string (ISO) }
   */
  router.post('/:matchId/add-question', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const matchId = String(req.params.matchId);

      if (!isValidMatchId(matchId)) {
        res.status(400).json({ error: 'Invalid matchId format' });
        return;
      }

      const { questionText, options, points, isLive, deadline } = req.body;

      if (!questionText || !options || points === undefined || isLive === undefined || !deadline) {
        res.status(400).json({
          error: 'Missing required fields: questionText, options, points, isLive, deadline',
        });
        return;
      }

      if (typeof questionText !== 'string' || questionText.trim().length === 0) {
        res.status(400).json({ error: 'questionText must be a non-empty string' });
        return;
      }

      if (questionText.length > 500) {
        res.status(400).json({ error: 'questionText must be 500 characters or less' });
        return;
      }

      if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
        res.status(400).json({ error: 'Options must be an array of 2-10 items' });
        return;
      }

      for (const opt of options) {
        if (typeof opt !== 'string' || opt.trim().length === 0) {
          res.status(400).json({ error: 'Each option must be a non-empty string' });
          return;
        }
      }

      const numPoints = Number(points);
      if (!Number.isInteger(numPoints) || numPoints <= 0 || numPoints > 1000) {
        res.status(400).json({ error: 'Points must be a positive integer (max 1000)' });
        return;
      }

      if (typeof isLive !== 'boolean') {
        res.status(400).json({ error: 'isLive must be a boolean' });
        return;
      }

      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        res.status(400).json({ error: 'Invalid deadline date format' });
        return;
      }

      // Look up the pool by matchId
      const pool = await predictionsService.getPoolStatus(matchId);

      const result = await predictionsService.addQuestion(pool.id, {
        questionText,
        options,
        points: numPoints,
        isLive,
        deadline: deadlineDate,
      });

      res.status(201).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (
        message.includes('not found') ||
        message.includes('cannot add questions') ||
        message.includes('required') ||
        message.includes('At least 2') ||
        message.includes('must be positive')
      ) {
        res.status(400).json({ error: message });
      } else {
        console.error('[Predictions] POST /:matchId/add-question error:', err);
        res.status(500).json({ error: 'Failed to add question' });
      }
    }
  });

  /**
   * POST /api/predictions/:matchId/settle
   * Settle a prediction pool with correct answers.
   * Body: { correctAnswers: [{ questionIndex: number, correctOption: number }] }
   */
  router.post('/:matchId/settle', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const matchId = String(req.params.matchId);

      if (!isValidMatchId(matchId)) {
        res.status(400).json({ error: 'Invalid matchId format' });
        return;
      }

      const { correctAnswers } = req.body;

      if (!correctAnswers || !Array.isArray(correctAnswers) || correctAnswers.length === 0) {
        res.status(400).json({ error: 'correctAnswers must be a non-empty array' });
        return;
      }

      for (const ca of correctAnswers) {
        if (typeof ca.questionIndex !== 'number' || typeof ca.correctOption !== 'number') {
          res.status(400).json({
            error: 'Each correctAnswer must have questionIndex (number) and correctOption (number)',
          });
          return;
        }
        if (!Number.isInteger(ca.questionIndex) || ca.questionIndex < 0) {
          res.status(400).json({ error: 'questionIndex must be a non-negative integer' });
          return;
        }
        if (!Number.isInteger(ca.correctOption) || ca.correctOption < 0) {
          res.status(400).json({ error: 'correctOption must be a non-negative integer' });
          return;
        }
      }

      await predictionsService.settlePool(matchId, correctAnswers);
      res.json({ success: true, matchId, message: 'Pool settled successfully' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (
        message.includes('No prediction pool found') ||
        message.includes('already settled') ||
        message.includes('cancelled') ||
        message.includes('Missing correct answer')
      ) {
        res.status(400).json({ error: message });
      } else {
        console.error('[Predictions] POST /:matchId/settle error:', err);
        res.status(500).json({ error: 'Failed to settle prediction pool' });
      }
    }
  });

  return router;
}
