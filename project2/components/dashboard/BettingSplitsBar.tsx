'use client';

import { useEffect, useState } from 'react';

interface SplitsData {
  homeTeam: string;
  homePublicPct: number;
  awayPublicPct: number;
  homeSharpPct: number;
  awaySharpPct: number;
  homeHandlePct: number;
  awayHandlePct: number;
  totalBets: number;
}

interface Props {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
}

function PercentBar({
  leftLabel,
  rightLabel,
  leftPct,
  leftColor,
  rightColor,
}: {
  leftLabel: string;
  rightLabel: string;
  leftPct: number;
  leftColor: string;
  rightColor: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>
          {leftLabel}{' '}
          <span className="font-semibold text-slate-200">{leftPct}%</span>
        </span>
        <span>
          <span className="font-semibold text-slate-200">{100 - leftPct}%</span> {rightLabel}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-700 overflow-hidden flex">
        <div
          className={`h-full rounded-l-full transition-all duration-700 ${leftColor}`}
          style={{ width: `${leftPct}%` }}
        />
        <div
          className={`h-full flex-1 rounded-r-full ${rightColor}`}
        />
      </div>
    </div>
  );
}

export default function BettingSplitsBar({ gameId, homeTeam, awayTeam }: Props) {
  const [splits, setSplits] = useState<SplitsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(
      `/api/betting-splits?gameId=${encodeURIComponent(gameId)}&homeTeam=${encodeURIComponent(homeTeam)}`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((data) => {
        setSplits(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => controller.abort();
  }, [gameId, homeTeam]);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-slate-700/50 rounded w-1/3" />
        <div className="h-2 bg-slate-700/50 rounded" />
        <div className="h-2 bg-slate-700/50 rounded" />
      </div>
    );
  }

  if (!splits) return null;

  const awayShortName = awayTeam.split(' ').slice(-1)[0];
  const homeShortName = homeTeam.split(' ').slice(-1)[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Money Splits
        </span>
        <span className="text-xs text-slate-600">
          {splits.totalBets.toLocaleString()} bets
        </span>
      </div>

      <PercentBar
        leftLabel={`${awayShortName} Public`}
        rightLabel={`${homeShortName} Public`}
        leftPct={splits.awayPublicPct}
        leftColor="bg-sky-500"
        rightColor="bg-slate-600"
      />

      <PercentBar
        leftLabel={`${awayShortName} Sharp`}
        rightLabel={`${homeShortName} Sharp`}
        leftPct={splits.awaySharpPct}
        leftColor="bg-amber-500"
        rightColor="bg-slate-600"
      />

      <PercentBar
        leftLabel={`${awayShortName} Handle`}
        rightLabel={`${homeShortName} Handle`}
        leftPct={splits.awayHandlePct}
        leftColor="bg-emerald-500"
        rightColor="bg-slate-600"
      />
    </div>
  );
}
