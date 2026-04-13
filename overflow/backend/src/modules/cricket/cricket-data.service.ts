import { PrismaClient } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import * as cron from 'node-cron';
import { CricApiClient, CricApiMatch, CricApiScore } from './cricapi.client';
import { BallEventData, MatchStatusUpdate } from '../../common/types';
import { FanWarsService } from '../fanwars/fanwars.service';

// ---------------------------------------------------------------------------
// PSL team name → our DB symbol mapping
// ---------------------------------------------------------------------------

const PSL_TEAM_MAP: Record<string, string> = {
  'islamabad united': 'IU',
  'lahore qalandars': 'LQ',
  'multan sultans': 'MS',
  'karachi kings': 'KK',
  'peshawar zalmi': 'PZ',
  'quetta gladiators': 'QG',
  'hyderabad kingsmen': 'HK',
  'rawalpindiz': 'RW',
};

function resolveTeamSymbol(teamName: string): string | null {
  const key = teamName.trim().toLowerCase();
  return PSL_TEAM_MAP[key] ?? null;
}

// ---------------------------------------------------------------------------
// Mock data for fallback when API is not configured
// ---------------------------------------------------------------------------

const MOCK_BATTERS = [
  'Babar Azam', 'Shadab Khan', 'Shaheen Afridi', 'Mohammad Rizwan',
  'Fakhar Zaman', 'Saim Ayub', 'Imam-ul-Haq', 'Mohammad Nawaz',
];

const MOCK_BOWLERS = [
  'Haris Rauf', 'Naseem Shah', 'Usama Mir', 'Mohammad Amir',
  'Wahab Riaz', 'Imad Wasim', 'Iftikhar Ahmed', 'Rumman Raees',
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CricketDataService {
  private prisma: PrismaClient;
  private io: SocketServer | null = null;
  private api: CricApiClient;
  private pollingJob: ReturnType<typeof cron.schedule> | null = null;
  private pslSeriesId: string | null = null;
  private lastApiHits = 0;
  private fanWarsService: FanWarsService | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.api = new CricApiClient();
  }

  setFanWarsService(service: FanWarsService): void {
    this.fanWarsService = service;
  }

  setSocket(io: SocketServer): void {
    this.io = io;
  }

  get isLive(): boolean {
    return this.api.isConfigured;
  }

  // =========================================================================
  // Polling lifecycle
  // =========================================================================

  private hasLiveMatch = false;
  private fastPollJob: ReturnType<typeof cron.schedule> | null = null;
  private slowPollJob: ReturnType<typeof cron.schedule> | null = null;

  startPolling(): void {
    if (this.api.isConfigured) {
      console.log('[CricketData] CricAPI key detected — using LIVE data');

      // Fast poll: every 10s — only active when a match is LIVE
      this.fastPollJob = cron.schedule('*/10 * * * * *', async () => {
        if (!this.hasLiveMatch) return;
        try {
          await this.pollLiveData();
        } catch (err) {
          console.error('[CricketData] Fast poll error:', err);
        }
      });

      // Slow poll: every 5 minutes — checks for new matches, updates state
      this.slowPollJob = cron.schedule('*/5 * * * *', async () => {
        try {
          const liveMatches = await this.prisma.match.findMany({ where: { status: 'LIVE' } });
          const wasLive = this.hasLiveMatch;
          this.hasLiveMatch = liveMatches.length > 0;

          if (!wasLive && this.hasLiveMatch) {
            console.log('[CricketData] Match went LIVE — switching to 10s fast polling');
          } else if (wasLive && !this.hasLiveMatch) {
            console.log('[CricketData] No live matches — switching to 5min slow polling');
          }

          // Also poll data on slow cycle as fallback
          await this.pollLiveData();
        } catch (err) {
          console.error('[CricketData] Slow poll error:', err);
        }
      });

      // Initial sync
      this.syncPSLMatches().then(async () => {
        // Check if any match is currently live
        const liveMatches = await this.prisma.match.findMany({ where: { status: 'LIVE' } });
        this.hasLiveMatch = liveMatches.length > 0;
        console.log(`[CricketData] ${this.hasLiveMatch ? 'LIVE match detected — fast polling (10s)' : 'No live match — slow polling (5min)'}`);
        // Immediate first poll
        await this.pollLiveData();
      }).catch((err) =>
        console.error('[CricketData] Initial PSL sync failed:', err)
      );
    } else {
      console.log('[CricketData] No CricAPI key — using MOCK data');
      this.pollingJob = cron.schedule('*/30 * * * * *', async () => {
        try {
          await this.pollMockData();
        } catch (err) {
          console.error('[CricketData] Mock polling error:', err);
        }
      });
    }

    console.log('[CricketData] Adaptive polling started');
  }

  stopPolling(): void {
    if (this.fastPollJob) { this.fastPollJob.stop(); this.fastPollJob = null; }
    if (this.slowPollJob) { this.slowPollJob.stop(); this.slowPollJob = null; }
    if (this.pollingJob) {
      this.pollingJob.stop();
      this.pollingJob = null;
      console.log('[CricketData] Polling stopped');
    }
  }

  // =========================================================================
  // LIVE DATA — CricAPI integration
  // =========================================================================

  /** One-time: find the PSL series and upsert all its matches into our DB */
  async syncPSLMatches(): Promise<void> {
    try {
      // Search for PSL series
      const seriesRes = await this.api.getSeries('PSL');
      if (seriesRes.status !== 'success' || !seriesRes.data?.length) {
        console.warn('[CricketData] No PSL series found, trying "Pakistan Super League"');
        const retry = await this.api.getSeries('Pakistan Super League');
        if (retry.status === 'success' && retry.data?.length) {
          this.pslSeriesId = retry.data[0]!.id;
        }
      } else {
        // Pick the most recent PSL series (first result usually)
        this.pslSeriesId = seriesRes.data[0]!.id;
      }

      this.lastApiHits = seriesRes.info.hitsToday;
      console.log(`[CricketData] API hits today: ${this.lastApiHits}/${seriesRes.info.hitsLimit}`);

      if (!this.pslSeriesId) {
        console.warn('[CricketData] Could not find PSL series — will rely on currentMatches');
        return;
      }

      console.log(`[CricketData] PSL series ID: ${this.pslSeriesId}`);

      // Fetch all PSL matches from series
      const seriesInfo = await this.api.getSeriesInfo(this.pslSeriesId);
      if (seriesInfo.status !== 'success') return;

      const matchList = seriesInfo.data?.matchList ?? [];
      console.log(`[CricketData] Found ${matchList.length} PSL matches`);

      for (const m of matchList) {
        await this.upsertMatchFromApi(m);
      }
    } catch (err) {
      console.error('[CricketData] syncPSLMatches failed:', err);
    }
  }

  /** Poll for live match updates */
  private async pollLiveData(): Promise<void> {
    try {
      const res = await this.api.getCurrentMatches();
      if (res.status !== 'success' || !res.data) return;

      this.lastApiHits = res.info.hitsToday;

      // Filter only PSL matches (check if any team is a PSL team)
      const pslMatches = res.data.filter((m) => this.isPSLMatch(m));

      for (const apiMatch of pslMatches) {
        await this.upsertMatchFromApi(apiMatch);

        // Push score updates via WebSocket
        if (apiMatch.score && apiMatch.score.length > 0 && this.io) {
          this.io.emit('match:liveScore', {
            cricApiId: apiMatch.id,
            name: apiMatch.name,
            status: apiMatch.status,
            teams: apiMatch.teams,
            score: apiMatch.score,
            venue: apiMatch.venue,
            matchType: apiMatch.matchType,
          });
        }
      }

      // Also check DB matches that are LIVE but not in API response (might have ended)
      const dbLiveMatches = await this.prisma.match.findMany({
        where: { status: 'LIVE' },
      });

      for (const dbMatch of dbLiveMatches) {
        if (!dbMatch.cricApiId) continue;
        const inApi = pslMatches.find((m) => m.id === dbMatch.cricApiId);
        if (!inApi) {
          // Match might have ended — check with match_info
          await this.refreshMatchInfo(dbMatch.cricApiId, dbMatch.id);
        }
      }
    } catch (err) {
      console.error('[CricketData] pollLiveData error:', err);
    }
  }

  /** Fetch full detail for a single match and update DB */
  private async refreshMatchInfo(cricApiId: string, dbMatchId: string): Promise<void> {
    try {
      const res = await this.api.getMatchInfo(cricApiId);
      if (res.status !== 'success' || !res.data) return;

      const apiMatch = res.data;
      const status = this.resolveMatchStatus(apiMatch);

      const updateData: Record<string, unknown> = { status };

      if (apiMatch.score) {
        const { homeScore, awayScore } = this.parseScores(apiMatch);
        if (homeScore) updateData.homeScore = homeScore;
        if (awayScore) updateData.awayScore = awayScore;
      }

      if (status === 'COMPLETED') {
        updateData.endTime = new Date();
        if (apiMatch.matchWinner) {
          const winnerSymbol = resolveTeamSymbol(apiMatch.matchWinner);
          if (winnerSymbol) {
            const winnerTeam = await this.prisma.team.findUnique({ where: { symbol: winnerSymbol } });
            if (winnerTeam) updateData.winnerId = winnerTeam.id;
          }
        }
      }

      await this.prisma.match.update({
        where: { id: dbMatchId },
        data: updateData,
      });

      if (status === 'COMPLETED' && this.io) {
        const statusUpdate: MatchStatusUpdate = {
          matchId: dbMatchId,
          status: 'COMPLETED',
          homeScore: typeof updateData.homeScore === 'string' ? updateData.homeScore : undefined,
          awayScore: typeof updateData.awayScore === 'string' ? updateData.awayScore : undefined,
        };
        this.io.emit('match:status', statusUpdate);
      }
    } catch (err) {
      console.error(`[CricketData] refreshMatchInfo failed for ${cricApiId}:`, err);
    }
  }

  /** Upsert a CricAPI match into our DB */
  private async upsertMatchFromApi(apiMatch: CricApiMatch): Promise<void> {
    // Resolve teams
    const teamNames = apiMatch.teams ?? [];
    if (teamNames.length < 2) return;

    const homeSymbol = resolveTeamSymbol(teamNames[0]!);
    const awaySymbol = resolveTeamSymbol(teamNames[1]!);
    if (!homeSymbol || !awaySymbol) return;

    const homeTeam = await this.prisma.team.findUnique({ where: { symbol: homeSymbol } });
    const awayTeam = await this.prisma.team.findUnique({ where: { symbol: awaySymbol } });
    if (!homeTeam || !awayTeam) return;

    const status = this.resolveMatchStatus(apiMatch);
    const startTime = apiMatch.dateTimeGMT
      ? new Date(apiMatch.dateTimeGMT)
      : new Date(apiMatch.date);

    const { homeScore, awayScore } = this.parseScores(apiMatch);

    // Check if we already have this match by cricApiId
    const existing = await this.prisma.match.findFirst({
      where: { cricApiId: apiMatch.id },
    });

    const matchData = {
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      status,
      venue: apiMatch.venue || null,
      startTime,
      homeScore,
      awayScore,
      cricApiId: apiMatch.id,
      cricApiName: apiMatch.name || null,
    };

    if (existing) {
      await this.prisma.match.update({
        where: { id: existing.id },
        data: matchData,
      });
    } else {
      const created = await this.prisma.match.create({ data: matchData });
      console.log(`[CricketData] Created match: ${apiMatch.name}`);

      // Auto-create a fan war for the new match
      if (this.fanWarsService) {
        try {
          await this.fanWarsService.createFanWar(created.id);
        } catch (fwErr) {
          console.error(`[CricketData] Failed to auto-create fan war for match ${created.id}:`, fwErr);
        }
      }
    }
  }

  // =========================================================================
  // MOCK DATA — fallback when no API key
  // =========================================================================

  private async pollMockData(): Promise<void> {
    let liveMatches = await this.prisma.match.findMany({
      where: { status: 'LIVE' },
      include: { homeTeam: true, awayTeam: true },
    });

    // Auto-promote: if no LIVE matches, check for UPCOMING matches whose startTime has passed
    if (liveMatches.length === 0) {
      const now = new Date();
      const overdue = await this.prisma.match.findFirst({
        where: {
          status: 'UPCOMING',
          startTime: { lte: now },
        },
        include: { homeTeam: true, awayTeam: true },
        orderBy: { startTime: 'asc' },
      });

      if (overdue) {
        await this.prisma.match.update({
          where: { id: overdue.id },
          data: { status: 'LIVE' },
        });
        console.log(`[CricketData] Auto-promoted to LIVE: ${overdue.cricApiName ?? overdue.id}`);
        liveMatches = [overdue];

        if (this.io) {
          this.io.emit('match:status', {
            matchId: overdue.id,
            status: 'LIVE',
          });
        }
      }
    }

    for (const match of liveMatches) {
      await this.generateMockBallEvent(match.id);
    }
  }

  private async generateMockBallEvent(matchId: string): Promise<void> {
    const lastBall = await this.prisma.ballEvent.findFirst({
      where: { matchId },
      orderBy: { timestamp: 'desc' },
    });

    let innings = lastBall?.innings ?? 1;
    let over = lastBall?.over ?? 0;
    let ball = lastBall ? lastBall.ball + 1 : 1;

    if (ball > 6) {
      ball = 1;
      over += 1;
    }

    if (over >= 20) {
      if (innings === 1) {
        innings = 2;
        over = 0;
        ball = 1;
      } else {
        await this.updateMatchStatus(matchId, 'COMPLETED');
        return;
      }
    }

    const isWicket = Math.random() < 0.08;
    const runs = isWicket ? 0 : [0, 0, 1, 1, 1, 2, 2, 4, 4, 6][Math.floor(Math.random() * 10)] ?? 0;
    const extras = Math.random() < 0.05 ? 1 : 0;
    const batter = MOCK_BATTERS[Math.floor(Math.random() * MOCK_BATTERS.length)] ?? 'Unknown';
    const bowler = MOCK_BOWLERS[Math.floor(Math.random() * MOCK_BOWLERS.length)] ?? 'Unknown';

    let commentary = `${over}.${ball} ${bowler} to ${batter}, `;
    if (isWicket) {
      commentary += 'OUT!';
    } else if (runs === 6) {
      commentary += 'SIX!';
    } else if (runs === 4) {
      commentary += 'FOUR!';
    } else {
      commentary += `${runs} run${runs !== 1 ? 's' : ''}`;
    }

    const wicketTypes = ['bowled', 'caught', 'lbw', 'run out', 'stumped'];

    const ballEvent: BallEventData = {
      matchId,
      innings,
      over,
      ball,
      batter,
      bowler,
      runs,
      extras,
      isWicket,
      wicketType: isWicket ? wicketTypes[Math.floor(Math.random() * wicketTypes.length)] : undefined,
      commentary,
    };

    await this.prisma.ballEvent.create({ data: ballEvent });

    // Recompute score for the current innings
    const allBalls = await this.prisma.ballEvent.findMany({
      where: { matchId, innings },
    });

    const totalRuns = allBalls.reduce((sum, b) => sum + b.runs + b.extras, 0);
    const totalWickets = allBalls.filter((b) => b.isWicket).length;
    const lastBallInInnings = allBalls[allBalls.length - 1];
    const currentOver = lastBallInInnings ? `${lastBallInInnings.over}.${lastBallInInnings.ball}` : '0.0';
    const scoreStr = `${totalRuns}/${totalWickets} (${currentOver})`;

    if (innings === 1) {
      await this.prisma.match.update({
        where: { id: matchId },
        data: { homeScore: scoreStr },
      });
    } else {
      await this.prisma.match.update({
        where: { id: matchId },
        data: { awayScore: scoreStr },
      });
    }

    if (this.io) {
      this.io.emit('match:ball', ballEvent);
    }
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private isPSLMatch(match: CricApiMatch): boolean {
    // Check if match name or teams contain PSL team names
    const teams = match.teams ?? [];
    return teams.some((t) => resolveTeamSymbol(t) !== null);
  }

  private resolveMatchStatus(match: CricApiMatch): 'UPCOMING' | 'LIVE' | 'COMPLETED' {
    const status = (match.status || '').toLowerCase();

    if (match.matchEnded === true || status.includes('won') || status.includes('draw') || status.includes('tied') || status.includes('no result')) {
      return 'COMPLETED';
    }

    if (match.matchStarted === true) {
      return 'LIVE';
    }

    // Check date — if match time has passed, it might be live
    const matchTime = new Date(match.dateTimeGMT || match.date);
    const now = new Date();
    if (matchTime <= now && !status.includes('not started')) {
      // Might be live or completed
      if (status.includes('won') || status.includes('result')) return 'COMPLETED';
      if (match.score && match.score.length > 0) return 'LIVE';
    }

    return 'UPCOMING';
  }

  private parseScores(match: CricApiMatch): { homeScore: string | null; awayScore: string | null } {
    if (!match.score || match.score.length === 0) {
      return { homeScore: null, awayScore: null };
    }

    const formatScore = (s: CricApiScore): string => `${s.r}/${s.w} (${s.o})`;

    // First innings = home team, second innings = away team
    const homeScore = match.score[0] ? formatScore(match.score[0]) : null;
    const awayScore = match.score[1] ? formatScore(match.score[1]) : null;

    return { homeScore, awayScore };
  }

  async updateMatchStatus(matchId: string, status: 'UPCOMING' | 'LIVE' | 'COMPLETED'): Promise<void> {
    const match = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        status,
        endTime: status === 'COMPLETED' ? new Date() : undefined,
      },
      include: { homeTeam: true, awayTeam: true },
    });

    if (status === 'COMPLETED') {
      let winnerId: string | null = null;
      const homeRuns = this.parseScoreRuns(match.homeScore);
      const awayRuns = this.parseScoreRuns(match.awayScore);

      if (homeRuns !== null && awayRuns !== null) {
        if (homeRuns > awayRuns) winnerId = match.homeTeamId;
        else if (awayRuns > homeRuns) winnerId = match.awayTeamId;
      }

      if (winnerId) {
        await this.prisma.match.update({
          where: { id: matchId },
          data: { winnerId },
        });

        console.log(
          `[CricketData] Match ${matchId} completed. Winner: ${winnerId}. ` +
          `Home: ${match.homeScore}, Away: ${match.awayScore}`
        );

        if (this.io) {
          this.io.emit('match:winner', {
            matchId,
            winnerId,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
          });
        }
      }
    }

    const statusUpdate: MatchStatusUpdate = {
      matchId,
      status,
      homeScore: match.homeScore ?? undefined,
      awayScore: match.awayScore ?? undefined,
    };

    if (this.io) {
      this.io.emit('match:status', statusUpdate);
    }
  }

  private parseScoreRuns(score: string | null): number | null {
    if (!score) return null;
    const m = score.match(/^(\d+)\//);
    if (!m || !m[1]) return null;
    const runs = parseInt(m[1], 10);
    return isNaN(runs) ? null : runs;
  }

  // =========================================================================
  // Public query methods (used by routes)
  // =========================================================================

  async getLiveMatches() {
    return this.prisma.match.findMany({
      where: { status: 'LIVE' },
      include: {
        homeTeam: true,
        awayTeam: true,
        balls: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });
  }

  async getUpcomingMatches() {
    return this.prisma.match.findMany({
      where: { status: 'UPCOMING' },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { startTime: 'asc' },
    });
  }

  async getCompletedMatches(limit = 20) {
    return this.prisma.match.findMany({
      where: { status: 'COMPLETED' },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { endTime: 'desc' },
      take: limit,
    });
  }

  async getAllMatches() {
    return this.prisma.match.findMany({
      include: { homeTeam: true, awayTeam: true },
      orderBy: { startTime: 'desc' },
    });
  }

  async getMatchById(matchId: string) {
    return this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        balls: { orderBy: { timestamp: 'asc' } },
      },
    });
  }

  async getMatchBalls(matchId: string) {
    return this.prisma.ballEvent.findMany({
      where: { matchId },
      orderBy: { timestamp: 'asc' },
      take: 300,
    });
  }

  /** Force-refresh a specific match from CricAPI (admin endpoint) */
  async forceRefreshMatch(cricApiId: string): Promise<CricApiMatch | null> {
    if (!this.api.isConfigured) return null;

    const res = await this.api.getMatchInfo(cricApiId);
    if (res.status !== 'success' || !res.data) return null;

    await this.upsertMatchFromApi(res.data);
    return res.data;
  }

  /** Return API usage stats */
  getApiStats() {
    return {
      isLive: this.api.isConfigured,
      hitsToday: this.lastApiHits,
      pslSeriesId: this.pslSeriesId,
    };
  }
}
