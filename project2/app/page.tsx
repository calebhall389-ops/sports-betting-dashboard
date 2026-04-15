'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ProcessedGame, SportKey, AlertPayload } from '@/types/betting';
import Header from '@/components/dashboard/Header';
import SportsTabs from '@/components/dashboard/SportsTabs';
import MatchupCard from '@/components/dashboard/MatchupCard';
import StatsBar from '@/components/dashboard/StatsBar';
import AlertToast, { type ToastMessage } from '@/components/dashboard/AlertToast';
import { Search, SlidersHorizontal } from 'lucide-react';

const REFRESH_INTERVAL = 60;

type SortOption = 'ev' | 'time' | 'recommendation';

function EmptyState({ sport, loading }: { sport: SportKey; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-52 rounded-xl bg-slate-900 border border-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">
          {sport === 'baseball_mlb' ? '⚾' :
           sport === 'basketball_nba' ? '🏀' :
           sport === 'americanfootball_nfl' ? '🏈' :
           sport === 'icehockey_nhl' ? '🏒' : '🥊'}
        </span>
      </div>
      <h3 className="text-slate-300 font-semibold mb-2">No games found</h3>
      <p className="text-slate-500 text-sm max-w-sm mx-auto">
        No upcoming games are available for this sport right now. Check back later or try another sport.
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [activeSport, setActiveSport] = useState<SportKey>('baseball_mlb');
  const [gamesCache, setGamesCache] = useState<Partial<Record<SportKey, ProcessedGame[]>>>({});
  const [remainingRequests, setRemainingRequests] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextRefresh, setNextRefresh] = useState(REFRESH_INTERVAL);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('ev');
  const [search, setSearch] = useState('');
  const [showHighEVOnly, setShowHighEVOnly] = useState(false);
  const [alertSent, setAlertSent] = useState<Set<string>>(new Set());

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchOdds = useCallback(
    async (sport: SportKey, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetch(`/api/odds?sport=${sport}`);
        const data = await res.json();

        if (!res.ok) {
          if (!silent) {
            addToast({
              type: 'error',
              title: 'Failed to load odds',
              message: data.error || 'Please check your API key configuration.',
            });
          }
          return;
        }

        const games: ProcessedGame[] = data.games || [];
        setGamesCache((prev) => ({ ...prev, [sport]: games }));
        setRemainingRequests(data.remainingRequests ?? null);
        setLastUpdated(new Date());
        setNextRefresh(REFRESH_INTERVAL);

        const highEVBets = games.flatMap((g) => {
          const bets: { game: ProcessedGame; side: 'home' | 'away'; ev: number }[] = [];
          if (g.ev.away >= 0.03) bets.push({ game: g, side: 'away', ev: g.ev.away });
          if (g.ev.home >= 0.03) bets.push({ game: g, side: 'home', ev: g.ev.home });
          return bets;
        });

        for (const bet of highEVBets) {
          const key = `${bet.game.id}-${bet.side}`;
          if (!alertSent.has(key)) {
            const team = bet.side === 'home' ? bet.game.home_team : bet.game.away_team;
            const oddsData = bet.side === 'home' ? bet.game.bestOdds.home : bet.game.bestOdds.away;
            if (oddsData) {
              setAlertSent((prev) => { const s = new Set(Array.from(prev)); s.add(key); return s; });
              const payload: AlertPayload = {
                game: `${bet.game.away_team} @ ${bet.game.home_team}`,
                team,
                odds: oddsData.odds,
                ev: bet.ev,
                bookmaker: oddsData.bookmaker,
                sport: bet.game.sport_title,
              };
              fetch('/api/send-best-bet-alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              }).catch(() => {});
            }
          }
        }
      } catch {
        if (!silent) {
          addToast({
            type: 'error',
            title: 'Connection error',
            message: 'Unable to fetch odds data. Check your network.',
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [addToast, alertSent]
  );

  useEffect(() => {
    fetchOdds(activeSport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSport]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    intervalRef.current = setInterval(() => {
      fetchOdds(activeSport, true);
    }, REFRESH_INTERVAL * 1000);

    countdownRef.current = setInterval(() => {
      setNextRefresh((prev) => (prev <= 1 ? REFRESH_INTERVAL : prev - 1));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSport]);

  const handleManualRefresh = useCallback(() => {
    fetchOdds(activeSport);
  }, [activeSport, fetchOdds]);

  const handleSendAlert = useCallback(
    async (game: ProcessedGame, side: 'home' | 'away') => {
      const team = side === 'home' ? game.home_team : game.away_team;
      const oddsData = side === 'home' ? game.bestOdds.home : game.bestOdds.away;
      const ev = side === 'home' ? game.ev.home : game.ev.away;
      if (!oddsData) return;

      const payload: AlertPayload = {
        game: `${game.away_team} @ ${game.home_team}`,
        team,
        odds: oddsData.odds,
        ev,
        bookmaker: oddsData.bookmaker,
        sport: game.sport_title,
      };

      try {
        const res = await fetch('/api/send-best-bet-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          addToast({ type: 'success', title: 'Alert sent!', message: `SMS alert sent for ${team}` });
        } else {
          const data = await res.json();
          addToast({ type: 'error', title: 'Alert failed', message: data.error || 'Could not send SMS.' });
        }
      } catch {
        addToast({ type: 'error', title: 'Alert failed', message: 'Network error.' });
      }
    },
    [addToast]
  );

  const gameCounts = Object.fromEntries(
    Object.entries(gamesCache).map(([k, v]) => [k, v?.length ?? 0])
  ) as Partial<Record<SportKey, number>>;

  const rawGames = gamesCache[activeSport] || [];

  let filteredGames = rawGames.filter((g) => {
    const q = search.toLowerCase();
    if (q && !g.home_team.toLowerCase().includes(q) && !g.away_team.toLowerCase().includes(q))
      return false;
    if (showHighEVOnly && g.ev.home < 0.03 && g.ev.away < 0.03)
      return false;
    return true;
  });

  const recOrder = ['MAX BET', 'STRONG +EV', 'LEAN', 'PASS', 'FADE'];

  if (sortBy === 'ev') {
    filteredGames = [...filteredGames].sort(
      (a, b) => Math.max(b.ev.home, b.ev.away) - Math.max(a.ev.home, a.ev.away)
    );
  } else if (sortBy === 'time') {
    filteredGames = [...filteredGames].sort(
      (a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
    );
  } else if (sortBy === 'recommendation') {
    filteredGames = [...filteredGames].sort((a, b) => {
      const aRec = Math.min(recOrder.indexOf(a.recommendation.home), recOrder.indexOf(a.recommendation.away));
      const bRec = Math.min(recOrder.indexOf(b.recommendation.home), recOrder.indexOf(b.recommendation.away));
      return aRec - bRec;
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header
        lastUpdated={lastUpdated}
        nextRefresh={nextRefresh}
        isLoading={loading}
        onRefresh={handleManualRefresh}
        remainingRequests={remainingRequests}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <SportsTabs
          activeSport={activeSport}
          onSportChange={(sport) => {
            setActiveSport(sport);
            setSearch('');
          }}
          gameCounts={gameCounts}
        />

        {rawGames.length > 0 && <StatsBar games={rawGames} />}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search teams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 px-3 py-2 focus:outline-none focus:border-slate-600 transition-colors cursor-pointer"
            >
              <option value="ev">Sort: Best EV</option>
              <option value="time">Sort: Game Time</option>
              <option value="recommendation">Sort: Recommendation</option>
            </select>

            <button
              onClick={() => setShowHighEVOnly(!showHighEVOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all whitespace-nowrap ${
                showHighEVOnly
                  ? 'bg-emerald-600/20 border-emerald-600/40 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              +EV Only
            </button>
          </div>
        </div>

        {loading && rawGames.length === 0 ? (
          <EmptyState sport={activeSport} loading />
        ) : filteredGames.length === 0 ? (
          <EmptyState sport={activeSport} loading={false} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredGames.map((game) => (
              <MatchupCard key={game.id} game={game} onAlert={handleSendAlert} />
            ))}
          </div>
        )}
      </main>

      <AlertToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
