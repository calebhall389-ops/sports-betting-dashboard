'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Bell, Clock } from 'lucide-react';
import type { ProcessedGame } from '@/types/betting';
import {
  formatAmericanOdds,
  formatProbability,
  formatEV,
  getEVColor,
  getRecommendationColor,
} from '@/lib/betting-utils';
import RecommendationBadge from './RecommendationBadge';
import BookmakerTable from './BookmakerTable';
import BettingSplitsBar from './BettingSplitsBar';
import NewsSection from './NewsSection';

interface Props {
  game: ProcessedGame;
  onAlert?: (game: ProcessedGame, team: 'home' | 'away') => void;
}

function formatGameTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function TeamOddsBlock({
  team,
  odds,
  bookmaker,
  impliedProb,
  noVigProb,
  ev,
  recommendation,
  isHome,
  onAlert,
}: {
  team: string;
  odds: number | null;
  bookmaker: string | null;
  impliedProb: number;
  noVigProb: number;
  ev: number;
  recommendation: ProcessedGame['recommendation']['home'];
  isHome: boolean;
  onAlert?: () => void;
}) {
  const evColor = getEVColor(ev);
  const recColor = getRecommendationColor(recommendation);
  const highEV = ev >= 0.03;

  return (
    <div
      className={`relative flex-1 p-3 rounded-lg border transition-all ${
        highEV
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-slate-700/50 bg-slate-800/40'
      }`}
    >
      {highEV && (
        <div className="absolute -top-px left-3 right-3 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-xs text-slate-500 mb-0.5">{isHome ? 'Home' : 'Away'}</div>
          <div className="font-semibold text-slate-100 text-sm leading-tight truncate">
            {team}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <RecommendationBadge recommendation={recommendation} size="sm" />
          {highEV && onAlert && (
            <button
              onClick={onAlert}
              title="Send SMS alert"
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        {odds !== null ? (
          <span className="text-xl font-bold font-mono text-slate-100">
            {formatAmericanOdds(odds)}
          </span>
        ) : (
          <span className="text-slate-600 text-sm">No odds</span>
        )}
        {bookmaker && (
          <span className="text-xs text-slate-500">@ {bookmaker}</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1 text-center">
        <div>
          <div className="text-xs text-slate-600 mb-0.5">Implied</div>
          <div className="text-xs font-semibold text-slate-300">
            {formatProbability(impliedProb)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-600 mb-0.5">No-Vig</div>
          <div className="text-xs font-semibold text-slate-200">
            {formatProbability(noVigProb)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-600 mb-0.5">EV</div>
          <div className={`text-xs font-bold ${evColor}`}>{formatEV(ev)}</div>
        </div>
      </div>
    </div>
  );
}

export default function MatchupCard({ game, onAlert }: Props) {
  const [expanded, setExpanded] = useState(false);

  const maxEV = Math.max(game.ev.home, game.ev.away);
  const isHighValue = maxEV >= 0.03;

  const handleAlert = async (side: 'home' | 'away') => {
    onAlert?.(game, side);
  };

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all duration-200 hover:border-slate-600 ${
        isHighValue
          ? 'border-emerald-600/30 bg-slate-900'
          : 'border-slate-700/50 bg-slate-900/80'
      }`}
    >
      {isHighValue && (
        <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-transparent" />
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatGameTime(game.commence_time)}</span>
          </div>
          <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded">
            {game.sport_title}
          </span>
        </div>

        <div className="flex gap-2 mb-3">
          <TeamOddsBlock
            team={game.away_team}
            odds={game.bestOdds.away?.odds ?? null}
            bookmaker={game.bestOdds.away?.bookmaker ?? null}
            impliedProb={game.impliedProbabilities.away}
            noVigProb={game.noVigProbabilities.away}
            ev={game.ev.away}
            recommendation={game.recommendation.away}
            isHome={false}
            onAlert={() => handleAlert('away')}
          />
          <div className="flex items-center justify-center px-1">
            <span className="text-slate-600 text-sm font-medium">vs</span>
          </div>
          <TeamOddsBlock
            team={game.home_team}
            odds={game.bestOdds.home?.odds ?? null}
            bookmaker={game.bestOdds.home?.bookmaker ?? null}
            impliedProb={game.impliedProbabilities.home}
            noVigProb={game.noVigProbabilities.home}
            ev={game.ev.home}
            recommendation={game.recommendation.home}
            isHome
            onAlert={() => handleAlert('home')}
          />
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-300 transition-colors py-1.5 border-t border-slate-800"
        >
          <span>{expanded ? 'Hide details' : 'Show sportsbook comparison & analysis'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-800 p-4 space-y-5 bg-slate-950/40">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Sportsbook Odds Comparison
            </h4>
            <BookmakerTable
              bookmakerOdds={game.bookmakerOdds}
              homeTeam={game.home_team}
              awayTeam={game.away_team}
              bestOdds={game.bestOdds}
            />
          </div>

          <div className="border-t border-slate-800 pt-4">
            <BettingSplitsBar
              gameId={game.id}
              homeTeam={game.home_team}
              awayTeam={game.away_team}
            />
          </div>

          <div className="border-t border-slate-800 pt-4">
            <NewsSection
              sport={game.sport_key}
              homeTeam={game.home_team}
              awayTeam={game.away_team}
            />
          </div>
        </div>
      )}
    </div>
  );
}
