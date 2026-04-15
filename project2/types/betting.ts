export type SportKey =
  | 'baseball_mlb'
  | 'basketball_nba'
  | 'americanfootball_nfl'
  | 'icehockey_nhl'
  | 'mma_mixed_martial_arts';

export type BetRecommendation = 'MAX BET' | 'STRONG +EV' | 'LEAN' | 'PASS' | 'FADE';

export interface Outcome {
  name: string;
  price: number;
  point?: number;
}

export interface Market {
  key: string;
  last_update: string;
  outcomes: Outcome[];
}

export interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: Market[];
}

export interface Game {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

export interface BookmakerOdds {
  bookmakerKey: string;
  bookmakerTitle: string;
  homeOdds: number | null;
  awayOdds: number | null;
  lastUpdate: string;
}

export interface ProcessedGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakerOdds: BookmakerOdds[];
  bestOdds: {
    home: { odds: number; bookmaker: string } | null;
    away: { odds: number; bookmaker: string } | null;
  };
  impliedProbabilities: {
    home: number;
    away: number;
  };
  noVigProbabilities: {
    home: number;
    away: number;
  };
  ev: {
    home: number;
    away: number;
  };
  recommendation: {
    home: BetRecommendation;
    away: BetRecommendation;
  };
}

export interface NewsItem {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  description: string;
}

export interface BettingSplits {
  homePublicPct: number;
  awayPublicPct: number;
  homeSharpPct: number;
  awaySharpPct: number;
  totalBets: number;
  homeHandlePct: number;
  awayHandlePct: number;
}

export interface SportTab {
  label: string;
  key: SportKey;
  icon: string;
}

export interface OddsApiResponse {
  games: ProcessedGame[];
  remainingRequests: number;
  sport: SportKey;
}

export interface AlertPayload {
  game: string;
  team: string;
  odds: number;
  ev: number;
  bookmaker: string;
  sport: string;
}
