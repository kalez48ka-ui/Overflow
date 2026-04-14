import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';

// ---------------------------------------------------------------------------
// CricAPI v1 response types
// ---------------------------------------------------------------------------

export interface CricApiScore {
  r: number;    // runs
  w: number;    // wickets
  o: number;    // overs (e.g. 18.3)
  inning: string; // "Islamabad United Inning 1"
}

export interface CricApiMatch {
  id: string;
  name: string;           // "Islamabad United vs Lahore Qalandars, 23rd Match"
  status: string;         // "Islamabad United won by 5 wkts" or "Match not started" or live description
  matchType: string;      // "t20", "odi", "test"
  venue: string;
  date: string;           // "YYYY-MM-DD"
  dateTimeGMT: string;    // "YYYY-MM-DDTHH:MM:SS"
  teams: string[];        // ["Islamabad United", "Lahore Qalandars"]
  teamInfo?: Array<{
    name: string;
    shortname: string;
    img: string;
  }>;
  score?: CricApiScore[];
  series_id: string;
  fantasyEnabled: boolean;
  bbbEnabled?: boolean;
  hasSquad?: boolean;
  matchStarted?: boolean;
  matchEnded?: boolean;
  tossWinner?: string;
  tossChoice?: string;
  matchWinner?: string;
}

export interface CricApiSeries {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  odi: number;
  t20: number;
  test: number;
  squads: number;
  matches: number;
}

export interface CricApiResponse<T> {
  apikey: string;
  data: T;
  status: 'success' | 'failure';
  info: {
    hitsToday: number;
    hitsLimit: number;
    credits: number;
    server: number;
    offsetRows: number;
    totalRows: number;
    queryTime: number;
  };
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class CricApiClient {
  private http: AxiosInstance;
  private apiKey: string;

  // Circuit breaker state
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;
  private static readonly MAX_CONSECUTIVE_FAILURES = 5;
  private static readonly CIRCUIT_OPEN_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.apiKey = config.cricketApi.key || '';
    this.http = axios.create({
      baseURL: config.cricketApi.url || 'https://api.cricapi.com/v1',
      timeout: 15000,
    });
  }

  /**
   * Check if the circuit breaker is open (too many consecutive failures).
   * Returns true if calls should be skipped.
   */
  private isCircuitOpen(): boolean {
    if (this.circuitOpenUntil === 0) return false;
    if (Date.now() < this.circuitOpenUntil) {
      return true;
    }
    // Circuit timer expired — allow a probe request (half-open)
    this.circuitOpenUntil = 0;
    return false;
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.circuitOpenUntil = 0;
  }

  private recordFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= CricApiClient.MAX_CONSECUTIVE_FAILURES) {
      this.circuitOpenUntil = Date.now() + CricApiClient.CIRCUIT_OPEN_DURATION_MS;
      console.warn(
        `[CricAPI] Circuit breaker OPEN after ${this.consecutiveFailures} consecutive failures. ` +
        `Skipping API calls for ${CricApiClient.CIRCUIT_OPEN_DURATION_MS / 1000}s.`
      );
    }
  }

  /**
   * Fetch a URL with retry + exponential backoff.
   * Retries on 5xx and network errors only (NOT 4xx client errors).
   * Returns null if circuit is open or all retries exhausted.
   */
  private async fetchWithRetry<T>(
    path: string,
    params: Record<string, string | number>,
    maxRetries = 2
  ): Promise<T | null> {
    if (this.isCircuitOpen()) {
      console.warn(`[CricAPI] Circuit open — skipping request to ${path}`);
      return null;
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const { data } = await this.http.get<T>(path, { params });
        this.recordSuccess();
        return data;
      } catch (err: unknown) {
        lastError = err;

        // Don't retry 4xx errors — they're client errors (bad params, auth, not found)
        if (axios.isAxiosError(err) && err.response && err.response.status >= 400 && err.response.status < 500) {
          // Still counts as a "successful contact" with the server — don't increment circuit failures
          console.warn(`[CricAPI] Client error ${err.response.status} on ${path}, not retrying`);
          return null;
        }

        // Retry on 5xx or network errors
        if (attempt < maxRetries) {
          const delayMs = (attempt + 1) * 1000; // 1s, 2s
          console.warn(
            `[CricAPI] Request to ${path} failed (attempt ${attempt + 1}/${maxRetries + 1}), ` +
            `retrying in ${delayMs}ms: ${(err as Error).message}`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    // All retries exhausted
    this.recordFailure();
    console.error(`[CricAPI] All ${maxRetries + 1} attempts failed for ${path}: ${(lastError as Error).message}`);
    return null;
  }

  get isConfigured(): boolean {
    return this.apiKey.length > 0 && this.apiKey !== 'your_cricapi_key';
  }

  // ---------------------------------------------------------------------------
  // Current / Live matches
  // ---------------------------------------------------------------------------

  async getCurrentMatches(offset = 0): Promise<CricApiResponse<CricApiMatch[]>> {
    const result = await this.fetchWithRetry<CricApiResponse<CricApiMatch[]>>(
      '/currentMatches',
      { apikey: this.apiKey, offset }
    );
    if (!result) {
      return this.emptyResponse<CricApiMatch[]>([]);
    }
    return this.stripApiKey(result);
  }

  // ---------------------------------------------------------------------------
  // All matches (upcoming + past)
  // ---------------------------------------------------------------------------

  async getMatches(offset = 0): Promise<CricApiResponse<CricApiMatch[]>> {
    const result = await this.fetchWithRetry<CricApiResponse<CricApiMatch[]>>(
      '/matches',
      { apikey: this.apiKey, offset }
    );
    if (!result) {
      return this.emptyResponse<CricApiMatch[]>([]);
    }
    return this.stripApiKey(result);
  }

  // ---------------------------------------------------------------------------
  // Single match detail / scorecard
  // ---------------------------------------------------------------------------

  async getMatchInfo(matchId: string): Promise<CricApiResponse<CricApiMatch>> {
    const result = await this.fetchWithRetry<CricApiResponse<CricApiMatch>>(
      '/match_info',
      { apikey: this.apiKey, id: matchId }
    );
    if (!result) {
      return this.emptyResponse<CricApiMatch>(null as unknown as CricApiMatch);
    }
    return this.stripApiKey(result);
  }

  // ---------------------------------------------------------------------------
  // Series list (search for PSL)
  // ---------------------------------------------------------------------------

  async getSeries(search?: string, offset = 0): Promise<CricApiResponse<CricApiSeries[]>> {
    const params: Record<string, string | number> = { apikey: this.apiKey, offset };
    if (search) params.search = search;

    const result = await this.fetchWithRetry<CricApiResponse<CricApiSeries[]>>('/series', params);
    if (!result) {
      return this.emptyResponse<CricApiSeries[]>([]);
    }
    return this.stripApiKey(result);
  }

  // ---------------------------------------------------------------------------
  // Series matches
  // ---------------------------------------------------------------------------

  async getSeriesInfo(seriesId: string): Promise<CricApiResponse<{ info: CricApiSeries; matchList: CricApiMatch[] }>> {
    const result = await this.fetchWithRetry<CricApiResponse<{ info: CricApiSeries; matchList: CricApiMatch[] }>>(
      '/series_info',
      { apikey: this.apiKey, id: seriesId }
    );
    if (!result) {
      return this.emptyResponse<{ info: CricApiSeries; matchList: CricApiMatch[] }>(
        { info: null as unknown as CricApiSeries, matchList: [] }
      );
    }
    return this.stripApiKey(result);
  }

  /** Remove the apikey field from API responses to prevent leaking credentials */
  private stripApiKey<T>(response: CricApiResponse<T>): CricApiResponse<T> {
    return { ...response, apikey: '' };
  }

  /** Return a safe empty response when API call fails or circuit is open */
  private emptyResponse<T>(data: T): CricApiResponse<T> {
    return {
      apikey: '',
      data,
      status: 'failure',
      info: {
        hitsToday: 0,
        hitsLimit: 0,
        credits: 0,
        server: 0,
        offsetRows: 0,
        totalRows: 0,
        queryTime: 0,
      },
    };
  }
}
