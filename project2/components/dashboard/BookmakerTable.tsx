import type { BookmakerOdds, ProcessedGame } from '@/types/betting';
import { formatAmericanOdds, americanToDecimal } from '@/lib/betting-utils';

interface Props {
  bookmakerOdds: BookmakerOdds[];
  homeTeam: string;
  awayTeam: string;
  bestOdds: ProcessedGame['bestOdds'];
}

function isBestOdds(
  odds: number | null,
  team: 'home' | 'away',
  bestOdds: ProcessedGame['bestOdds'],
  bookmakerTitle: string
): boolean {
  if (!odds) return false;
  const best = team === 'home' ? bestOdds.home : bestOdds.away;
  if (!best) return false;
  return best.bookmaker === bookmakerTitle && best.odds === odds;
}

function shortTeamName(name: string): string {
  const parts = name.split(' ');
  if (parts.length <= 2) return name;
  return parts.slice(-1)[0];
}

export default function BookmakerTable({ bookmakerOdds, homeTeam, awayTeam, bestOdds }: Props) {
  const sorted = [...bookmakerOdds].sort((a, b) => {
    if (!a.homeOdds) return 1;
    if (!b.homeOdds) return -1;
    return americanToDecimal(b.homeOdds) - americanToDecimal(a.homeOdds);
  });

  if (sorted.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-4">No bookmaker data available</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50">
            <th className="text-left text-slate-400 font-medium py-2 pr-4 text-xs uppercase tracking-wider">
              Book
            </th>
            <th className="text-center text-slate-400 font-medium py-2 px-2 text-xs uppercase tracking-wider">
              {shortTeamName(awayTeam)}
            </th>
            <th className="text-center text-slate-400 font-medium py-2 pl-2 text-xs uppercase tracking-wider">
              {shortTeamName(homeTeam)}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((bk) => {
            const homeBest = isBestOdds(bk.homeOdds, 'home', bestOdds, bk.bookmakerTitle);
            const awayBest = isBestOdds(bk.awayOdds, 'away', bestOdds, bk.bookmakerTitle);

            return (
              <tr
                key={bk.bookmakerKey}
                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
              >
                <td className="py-2 pr-4 text-slate-300 font-medium text-xs">
                  {bk.bookmakerTitle}
                </td>
                <td className="py-2 px-2 text-center">
                  {bk.awayOdds !== null ? (
                    <span
                      className={`font-mono font-semibold text-sm ${
                        awayBest
                          ? 'text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded'
                          : 'text-slate-300'
                      }`}
                    >
                      {formatAmericanOdds(bk.awayOdds)}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="py-2 pl-2 text-center">
                  {bk.homeOdds !== null ? (
                    <span
                      className={`font-mono font-semibold text-sm ${
                        homeBest
                          ? 'text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded'
                          : 'text-slate-300'
                      }`}
                    >
                      {formatAmericanOdds(bk.homeOdds)}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
