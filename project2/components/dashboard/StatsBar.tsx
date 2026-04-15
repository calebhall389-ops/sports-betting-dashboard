import type { ProcessedGame } from '@/types/betting';
import { TrendingUp, Target, TriangleAlert as AlertTriangle, Trophy } from 'lucide-react';

interface Props {
  games: ProcessedGame[];
}

export default function StatsBar({ games }: Props) {
  const allBets = games.flatMap((g) => [
    { ev: g.ev.home, rec: g.recommendation.home, team: g.home_team, odds: g.bestOdds.home?.odds },
    { ev: g.ev.away, rec: g.recommendation.away, team: g.away_team, odds: g.bestOdds.away?.odds },
  ]);

  const positiveEV = allBets.filter((b) => b.ev > 0).length;
  const maxBets = allBets.filter((b) => b.rec === 'MAX BET').length;
  const strongEV = allBets.filter((b) => b.rec === 'STRONG +EV').length;
  const avgEV = allBets.length
    ? allBets.reduce((s, b) => s + b.ev, 0) / allBets.length
    : 0;

  const stats = [
    {
      icon: Target,
      label: 'Games Today',
      value: games.length.toString(),
      color: 'text-slate-300',
      iconColor: 'text-slate-500',
    },
    {
      icon: TrendingUp,
      label: '+EV Bets',
      value: positiveEV.toString(),
      color: 'text-emerald-400',
      iconColor: 'text-emerald-600',
    },
    {
      icon: Trophy,
      label: 'Max Bets',
      value: maxBets.toString(),
      color: 'text-amber-400',
      iconColor: 'text-amber-600',
    },
    {
      icon: AlertTriangle,
      label: 'Strong +EV',
      value: strongEV.toString(),
      color: 'text-sky-400',
      iconColor: 'text-sky-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(({ icon: Icon, label, value, color, iconColor }) => (
        <div
          key={label}
          className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <div>
            <div className={`text-lg font-bold leading-tight ${color}`}>{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
