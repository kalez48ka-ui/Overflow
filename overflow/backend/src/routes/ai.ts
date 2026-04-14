import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { AiSignal } from '../common/types';

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:5001';

// Concurrent request limiter to prevent event loop exhaustion
let activeAIRequests = 0;
const MAX_CONCURRENT_AI = 5;

export function createAiRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/analysis/:matchId', async (req: Request, res: Response) => {
    try {
      const matchId = String(req.params.matchId);

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          homeTeam: true,
          awayTeam: true,
        },
      });

      if (!match) {
        res.status(404).json({ success: false, error: 'Match not found' });
        return;
      }

      // Return cached analysis without consuming a concurrency slot
      if (match.aiAnalysis) {
        res.json({ success: true, data: { matchId, analysis: match.aiAnalysis } });
        return;
      }

      // Concurrency gate: only for upstream AI calls
      if (activeAIRequests >= MAX_CONCURRENT_AI) {
        // Fall back to mock analysis instead of rejecting
        const analysis = generateMockAnalysis(
          match.homeTeam.name,
          match.awayTeam.name,
          match.homeTeam.performanceScore,
          match.awayTeam.performanceScore,
          match.venue || 'TBD'
        );
        res.json({ success: true, data: { matchId, analysis, fallback: true } });
        return;
      }

      activeAIRequests++;
      let analysis: string;

      try {
        const response = await axios.post(
          `${AI_ENGINE_URL}/api/ai/analyze`,
          {
            homeTeam: match.homeTeam.symbol,
            awayTeam: match.awayTeam.symbol,
          },
          { timeout: 15000 }
        );
        analysis = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        console.log(`[AI] Got analysis from AI engine for ${match.homeTeam.symbol} vs ${match.awayTeam.symbol}`);
      } catch (aiErr) {
        console.warn('[AI] AI engine unavailable, falling back to mock analysis:', (aiErr as Error).message);
        analysis = generateMockAnalysis(
          match.homeTeam.name,
          match.awayTeam.name,
          match.homeTeam.performanceScore,
          match.awayTeam.performanceScore,
          match.venue || 'TBD'
        );
      } finally {
        activeAIRequests--;
      }

      await prisma.match.update({
        where: { id: matchId },
        data: { aiAnalysis: analysis },
      });

      res.json({ success: true, data: { matchId, analysis } });
    } catch (err) {
      console.error('[AI] GET /analysis/:matchId error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch AI analysis' });
    }
  });

  router.get('/signals', async (_req: Request, res: Response) => {
    // Signals endpoint may fan out to AI engine for each live match.
    // Check concurrency before starting upstream calls.
    if (activeAIRequests >= MAX_CONCURRENT_AI) {
      // Fall back to team-based signals when AI is saturated
      try {
        const teams = await prisma.team.findMany({ orderBy: { ranking: 'asc' } });
        const fallbackSignals: AiSignal[] = teams.map((t) => generateFallbackSignal(t));
        res.json({ success: true, data: fallbackSignals, fallback: true });
      } catch (fallbackErr) {
        console.error('[AI] Fallback signals error:', fallbackErr);
        res.status(503).json({ success: false, error: 'AI service busy' });
      }
      return;
    }

    activeAIRequests++;
    try {
      const liveMatches = await prisma.match.findMany({
        where: { status: 'LIVE' },
        include: {
          homeTeam: true,
          awayTeam: true,
        },
      });

      const signals: AiSignal[] = [];

      for (const match of liveMatches) {
        try {
          const matchState = {
            batting_team: match.homeTeam.symbol,
            bowling_team: match.awayTeam.symbol,
            score: match.homeScore || '0',
            wickets: 0,
            overs: 0,
            target: null,
            innings: 1,
          };

          const response = await axios.post(
            `${AI_ENGINE_URL}/api/ai/signal`,
            { matchState },
            { timeout: 10000 }
          );

          const data = response.data;

          if (data && data.signal) {
            signals.push({
              teamSymbol: match.homeTeam.symbol,
              signal: data.signal,
              confidence: data.confidence ?? 0.5,
              reason: data.reason ?? 'AI engine signal',
              timestamp: new Date(),
            });
          }

          if (data && data.signals && Array.isArray(data.signals)) {
            for (const s of data.signals) {
              signals.push({
                teamSymbol: s.teamSymbol ?? match.homeTeam.symbol,
                signal: s.signal ?? 'HOLD',
                confidence: s.confidence ?? 0.5,
                reason: s.reason ?? 'AI engine signal',
                timestamp: new Date(),
              });
            }
          }
        } catch (aiErr) {
          console.warn(`[AI] AI engine signal failed for match ${match.id}, using fallback:`, (aiErr as Error).message);
          // Fallback: generate basic signals from team stats
          signals.push(
            generateFallbackSignal(match.homeTeam),
            generateFallbackSignal(match.awayTeam)
          );
        }
      }

      // If no live matches, fall back to team-based signals
      if (liveMatches.length === 0) {
        const teams = await prisma.team.findMany({
          orderBy: { ranking: 'asc' },
        });

        for (const team of teams) {
          signals.push(generateFallbackSignal(team));
        }
      }

      res.json({ success: true, data: signals });
    } catch (err) {
      console.error('[AI] GET /signals error:', err);
      res.status(500).json({ success: false, error: 'Failed to generate signals' });
    } finally {
      activeAIRequests--;
    }
  });

  router.post('/query', async (req: Request, res: Response) => {
    if (activeAIRequests >= MAX_CONCURRENT_AI) {
      res.status(503).json({
        success: false,
        error: 'AI service busy — too many concurrent requests. Please try again shortly.',
      });
      return;
    }

    activeAIRequests++;
    try {
      const { question } = req.body;

      if (!question || typeof question !== 'string') {
        res.status(400).json({ success: false, error: 'Missing "question" in request body' });
        return;
      }

      const response = await axios.post(
        `${AI_ENGINE_URL}/api/ai/query`,
        { question },
        { timeout: 30000 }
      );

      res.json({ success: true, data: response.data });
    } catch (err) {
      console.error('[AI] POST /query error:', err);
      res.status(500).json({ success: false, error: 'AI query failed' });
    } finally {
      activeAIRequests--;
    }
  });

  router.get('/health', async (_req: Request, res: Response) => {
    try {
      const response = await axios.get(`${AI_ENGINE_URL}/api/ai/health`, { timeout: 5000 });
      res.json({ success: true, data: response.data });
    } catch {
      res.json({ success: false, error: 'AI engine unreachable' });
    }
  });

  return router;
}

function generateFallbackSignal(team: {
  symbol: string;
  performanceScore: number;
  priceChange24h: number;
  ranking: number;
  wins: number;
  losses: number;
  sellTaxRate: number;
}): AiSignal {
  let signal: 'BUY' | 'SELL' | 'HOLD';
  let confidence: number;
  let reason: string;

  if (team.performanceScore >= 70 && team.priceChange24h < 5) {
    signal = 'BUY';
    confidence = Math.min(0.95, 0.6 + (team.performanceScore - 70) * 0.01);
    reason = `Strong performance (${team.performanceScore.toFixed(0)}) with room for price growth. ` +
      `Currently ranked #${team.ranking} with ${team.wins}W-${team.losses}L record.`;
  } else if (team.performanceScore <= 35 && team.priceChange24h > 0) {
    signal = 'SELL';
    confidence = Math.min(0.9, 0.5 + (35 - team.performanceScore) * 0.015);
    reason = `Weak performance (${team.performanceScore.toFixed(0)}) suggests price correction incoming. ` +
      `Sell tax at ${team.sellTaxRate}% — consider exiting before further losses.`;
  } else if (team.priceChange24h > 15) {
    signal = 'SELL';
    confidence = 0.65;
    reason = `Price surged ${team.priceChange24h.toFixed(1)}% in 24h — potential overbought. ` +
      `Consider taking profits.`;
  } else if (team.priceChange24h < -15) {
    signal = 'BUY';
    confidence = 0.6;
    reason = `Price dropped ${team.priceChange24h.toFixed(1)}% in 24h — potential oversold. ` +
      `Performance score at ${team.performanceScore.toFixed(0)} suggests value.`;
  } else {
    signal = 'HOLD';
    confidence = 0.5;
    reason = `Stable conditions. Performance score: ${team.performanceScore.toFixed(0)}, ` +
      `24h change: ${team.priceChange24h.toFixed(1)}%. Wait for clearer signal.`;
  }

  return {
    teamSymbol: team.symbol,
    signal,
    confidence,
    reason,
    timestamp: new Date(),
  };
}

function generateMockAnalysis(
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  venue: string
): string {
  const favorite = homeScore >= awayScore ? homeTeam : awayTeam;
  const underdog = homeScore >= awayScore ? awayTeam : homeTeam;
  const favScore = Math.max(homeScore, awayScore);
  const undScore = Math.min(homeScore, awayScore);
  const diff = favScore - undScore;

  let matchup: string;
  if (diff > 20) {
    matchup = `${favorite} are clear favorites with a significant performance advantage.`;
  } else if (diff > 10) {
    matchup = `${favorite} hold an edge but ${underdog} could pull off an upset.`;
  } else {
    matchup = `This is an evenly matched contest — either team can win.`;
  }

  return [
    `PRE-MATCH ANALYSIS: ${homeTeam} vs ${awayTeam}`,
    `Venue: ${venue}`,
    '',
    `Performance Ratings: ${homeTeam} (${homeScore.toFixed(0)}) vs ${awayTeam} (${awayScore.toFixed(0)})`,
    '',
    matchup,
    '',
    `KEY FACTORS:`,
    `- ${favorite} performance score of ${favScore.toFixed(0)} indicates strong recent form`,
    `- ${underdog} at ${undScore.toFixed(0)} needs improvement to compete`,
    `- Venue factor at ${venue} could play a role`,
    '',
    `TRADING IMPLICATIONS:`,
    `- ${favorite} token expected to see increased buying pressure pre-match`,
    `- ${underdog} token holders face higher sell tax (lower ranking)`,
    `- Upset potential: ${diff < 15 ? 'HIGH' : diff < 25 ? 'MODERATE' : 'LOW'} — ` +
      `${underdog} win would trigger UpsetVault payout`,
    '',
    `RECOMMENDATION: ${diff < 10
      ? `Consider small positions on both teams — upset payout could be significant`
      : `Lean toward ${favorite} but watch for ${underdog} value play`
    }`,
  ].join('\n');
}
