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

  constructor() {
    this.apiKey = config.cricketApi.key || '';
    this.http = axios.create({
      baseURL: config.cricketApi.url || 'https://api.cricapi.com/v1',
      timeout: 15000,
    });
  }

  get isConfigured(): boolean {
    return this.apiKey.length > 0 && this.apiKey !== 'your_cricapi_key';
  }

  // ---------------------------------------------------------------------------
  // Current / Live matches
  // ---------------------------------------------------------------------------

  async getCurrentMatches(offset = 0): Promise<CricApiResponse<CricApiMatch[]>> {
    const { data } = await this.http.get<CricApiResponse<CricApiMatch[]>>('/currentMatches', {
      params: { apikey: this.apiKey, offset },
    });
    return data;
  }

  // ---------------------------------------------------------------------------
  // All matches (upcoming + past)
  // ---------------------------------------------------------------------------

  async getMatches(offset = 0): Promise<CricApiResponse<CricApiMatch[]>> {
    const { data } = await this.http.get<CricApiResponse<CricApiMatch[]>>('/matches', {
      params: { apikey: this.apiKey, offset },
    });
    return data;
  }

  // ---------------------------------------------------------------------------
  // Single match detail / scorecard
  // ---------------------------------------------------------------------------

  async getMatchInfo(matchId: string): Promise<CricApiResponse<CricApiMatch>> {
    const { data } = await this.http.get<CricApiResponse<CricApiMatch>>('/match_info', {
      params: { apikey: this.apiKey, id: matchId },
    });
    return data;
  }

  // ---------------------------------------------------------------------------
  // Series list (search for PSL)
  // ---------------------------------------------------------------------------

  async getSeries(search?: string, offset = 0): Promise<CricApiResponse<CricApiSeries[]>> {
    const params: Record<string, string | number> = { apikey: this.apiKey, offset };
    if (search) params.search = search;

    const { data } = await this.http.get<CricApiResponse<CricApiSeries[]>>('/series', {
      params,
    });
    return data;
  }

  // ---------------------------------------------------------------------------
  // Series matches
  // ---------------------------------------------------------------------------

  async getSeriesInfo(seriesId: string): Promise<CricApiResponse<{ info: CricApiSeries; matchList: CricApiMatch[] }>> {
    const { data } = await this.http.get<CricApiResponse<{ info: CricApiSeries; matchList: CricApiMatch[] }>>('/series_info', {
      params: { apikey: this.apiKey, id: seriesId },
    });
    return data;
  }
}
