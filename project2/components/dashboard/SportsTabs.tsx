import type { SportKey } from '@/types/betting';

const SPORTS: { key: SportKey; label: string; shortLabel: string; emoji: string }[] = [
  { key: 'baseball_mlb', label: 'MLB', shortLabel: 'MLB', emoji: '⚾' },
  { key: 'basketball_nba', label: 'NBA', shortLabel: 'NBA', emoji: '🏀' },
  { key: 'americanfootball_nfl', label: 'NFL', shortLabel: 'NFL', emoji: '🏈' },
  { key: 'icehockey_nhl', label: 'NHL', shortLabel: 'NHL', emoji: '🏒' },
  { key: 'mma_mixed_martial_arts', label: 'MMA', shortLabel: 'MMA', emoji: '🥊' },
];

interface Props {
  activeSport: SportKey;
  onSportChange: (sport: SportKey) => void;
  gameCounts: Partial<Record<SportKey, number>>;
}

export default function SportsTabs({ activeSport, onSportChange, gameCounts }: Props) {
  return (
    <div className="flex gap-1 p-1 bg-slate-900/60 rounded-xl border border-slate-800 overflow-x-auto scrollbar-hide">
      {SPORTS.map((sport) => {
        const isActive = activeSport === sport.key;
        const count = gameCounts[sport.key];

        return (
          <button
            key={sport.key}
            onClick={() => onSportChange(sport.key)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              isActive
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="text-base">{sport.emoji}</span>
            <span>{sport.label}</span>
            {count !== undefined && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
