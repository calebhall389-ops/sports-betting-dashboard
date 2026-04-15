import type { BetRecommendation, BookmakerOdds, ProcessedGame, Game } from '@/types/betting';

export function americanToDecimal(american: number): number {
  if (american > 0) return american / 100 + 1;
  return 100 / Math.abs(american) + 1;
}

export function impliedProbability(american: number): number {
  if (american > 0) return 100 / (american + 100);
  return Math.abs(american) / (Math.abs(american) + 100);
}

export function removeVig(
  prob1: number,
  prob2: number
): { prob1: number; prob2: number } {
  const total = prob1 + prob2;
  return {
    prob1: prob1 / total,
    prob2: prob2 / total,
  };
}

export function calculateEV(americanOdds: number, noVigProb: number): number {
  const decimal = americanToDecimal(americanOdds);
  const profit = decimal - 1;
  return noVigProb * profit - (1 - noVigProb);
}

export function getRecommendation(ev: number): BetRecommendation {
  if (ev >= 0.08) return 'MAX BET';
  if (ev >= 0.05) return 'STRONG +EV';
  if (ev >= 0.02) return 'LEAN';
  if (ev >= -0.01) return 'PASS';
  return 'FADE';
}

export function formatAmericanOdds(odds: number): string {
  if (odds > 0) return `+${odds}`;
  return `${odds}`;
}

export function formatProbability(prob: number): string {
  return `${(prob * 100).toFixed(1)}%`;
}

export function formatEV(ev: number): string {
  const pct = (ev * 100).toFixed(1);
  return ev >= 0 ? `+${pct}%` : `${pct}%`;
}

export function processGame(game: Game): ProcessedGame {
  const bookmakerOdds: BookmakerOdds[] = [];

  for (const bk of game.bookmakers) {
    const h2h = bk.markets.find((m) => m.key === 'h2h');
    if (!h2h) continue;

    const homeOutcome = h2h.outcomes.find((o) => o.name === game.home_team);
    const awayOutcome = h2h.outcomes.find((o) => o.name === game.away_team);

    bookmakerOdds.push({
      bookmakerKey: bk.key,
      bookmakerTitle: bk.title,
      homeOdds: homeOutcome?.price ?? null,
      awayOdds: awayOutcome?.price ?? null,
      lastUpdate: bk.last_update,
    });
  }

  let bestHome: { odds: number; bookmaker: string } | null = null;
  let bestAway: { odds: number; bookmaker: string } | null = null;

  for (const bk of bookmakerOdds) {
    if (bk.homeOdds !== null) {
      const homeDecimal = americanToDecimal(bk.homeOdds);
      if (!bestHome || homeDecimal > americanToDecimal(bestHome.odds)) {
        bestHome = { odds: bk.homeOdds, bookmaker: bk.bookmakerTitle };
      }
    }
    if (bk.awayOdds !== null) {
      const awayDecimal = americanToDecimal(bk.awayOdds);
      if (!bestAway || awayDecimal > americanToDecimal(bestAway.odds)) {
        bestAway = { odds: bk.awayOdds, bookmaker: bk.bookmakerTitle };
      }
    }
  }

  const homeImplied = bestHome ? impliedProbability(bestHome.odds) : 0.5;
  const awayImplied = bestAway ? impliedProbability(bestAway.odds) : 0.5;

  const { prob1: noVigHome, prob2: noVigAway } = removeVig(homeImplied, awayImplied);

  const homeEV = bestHome ? calculateEV(bestHome.odds, noVigHome) : 0;
  const awayEV = bestAway ? calculateEV(bestAway.odds, noVigAway) : 0;

  return {
    id: game.id,
    sport_key: game.sport_key,
    sport_title: game.sport_title,
    commence_time: game.commence_time,
    home_team: game.home_team,
    away_team: game.away_team,
    bookmakerOdds,
    bestOdds: { home: bestHome, away: bestAway },
    impliedProbabilities: { home: homeImplied, away: awayImplied },
    noVigProbabilities: { home: noVigHome, away: noVigAway },
    ev: { home: homeEV, away: awayEV },
    recommendation: {
      home: getRecommendation(homeEV),
      away: getRecommendation(awayEV),
    },
  };
}

export function getRecommendationColor(rec: BetRecommendation): string {
  switch (rec) {
    case 'MAX BET':
      return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    case 'STRONG +EV':
      return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
    case 'LEAN':
      return 'text-sky-400 bg-sky-400/10 border-sky-400/30';
    case 'PASS':
      return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
    case 'FADE':
      return 'text-red-400 bg-red-400/10 border-red-400/30';
  }
}

export function getEVColor(ev: number): string {
  if (ev >= 0.05) return 'text-emerald-400';
  if (ev >= 0.02) return 'text-sky-400';
  if (ev >= 0) return 'text-slate-300';
  return 'text-red-400';
}
