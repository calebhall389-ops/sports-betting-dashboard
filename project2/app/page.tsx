'use client';
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * ODDSJAM-STYLE BETTING DASHBOARD
 *
 * Added in this version:
 * - Stronger +EV model from no-vig consensus pricing
 * - Sharp/public tracking hooks
 * - Player props scanner
 * - AI scoring model for sides + props
 * - Best-bet board, prop board, sportsbook comparison, alerts
 *
 * Expected server routes:
 * - GET  /api/odds?sport=<sportKey>
 * - GET  /api/player-props?sport=<sportKey>&markets=<comma-separated markets>
 * - GET  /api/betting-splits?home=<team>&away=<team>&sport=<sportKey>
 * - GET  /api/sports-news?q=<query>
 * - POST /api/send-best-bet-alert
 */

const SPORTS = [
  { key: "baseball_mlb", label: "MLB", propMarkets: ["batter_home_runs", "pitcher_strikeouts", "batter_hits"] },
  { key: "basketball_nba", label: "NBA", propMarkets: ["player_points", "player_rebounds", "player_assists"] },
  { key: "americanfootball_nfl", label: "NFL", propMarkets: ["player_pass_yds", "player_rush_yds", "player_receptions"] },
  { key: "icehockey_nhl", label: "NHL", propMarkets: ["player_goals", "player_points", "player_shots_on_goal"] },
  { key: "mma_mixed_martial_arts", label: "MMA", propMarkets: ["fight_winner"] },
];

const REFRESH_MS = 60_000;
const ALERT_THRESHOLD_EV = 3;

const formatOdds = (odds: number | null | undefined) => {
  if (odds === null || odds === undefined || Number.isNaN(Number(odds))) return "—";
  const n = Number(odds);
  return n > 0 ? `+${n}` : `${n}`;
};

const formatPct = (n: number | null | undefined, digits = 2) => {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "—";
  return `${Number(n).toFixed(digits)}%`;
};

const americanToImplied = (odds: number) => {
  if (!Number.isFinite(Number(odds)) || Number(odds) === 0) return 0;
  return Number(odds) > 0 ? 100 / (Number(odds) + 100) : Math.abs(Number(odds)) / (Math.abs(Number(odds)) + 100);
};

const americanProfitOn100 = (odds: number) => {
  if (!Number.isFinite(Number(odds)) || Number(odds) === 0) return 0;
  return Number(odds) > 0 ? Number(odds) : (100 / Math.abs(Number(odds))) * 100;
};

const avg = (arr: number[]) => {
  if (!arr.length) return 0;
  return arr.reduce((sum, x) => sum + x, 0) / arr.length;
};

const bestLine = (prices: { price: number }[]) => {
  if (!prices.length) return null;
  return prices.reduce((best, current) => (Number(current.price) > Number(best.price) ? current : best));
};

const normalizeNoVig = (items: { consensusImplied: number }[]) => {
  const total = items.reduce((sum, item) => sum + item.consensusImplied, 0);
  if (!total) return items.map((item) => ({ ...item, fairProbability: 0 }));
  return items.map((item) => ({ ...item, fairProbability: item.consensusImplied / total }));
};

const evPercent = (fairProbability: number, bestOddsPrice: number) => {
  const winProfit = americanProfitOn100(bestOddsPrice);
  return fairProbability * winProfit - (1 - fairProbability) * 100;
};

const kellyPercent = (fairProbability: number, bestOddsPrice: number) => {
  const b = americanProfitOn100(bestOddsPrice) / 100;
  if (!b) return 0;
  const q = 1 - fairProbability;
  const k = (b * fairProbability - q) / b;
  return Math.max(0, k * 100);
};

const getSharpSummary = (ticketPct?: number | null, moneyPct?: number | null) => {
  const tickets = Number(ticketPct ?? 0);
  const money = Number(moneyPct ?? 0);
  const diff = money - tickets;

  if (moneyPct == null || ticketPct == null) {
    return {
      sharpLabel: "No splits feed",
      publicLabel: "No public data",
      sharpScore: 0,
      note: "Connect a real tickets-vs-money source to sharpen this signal.",
    };
  }

  if (diff >= 12) {
    return {
      sharpLabel: "Sharp money signal",
      publicLabel: "Public lighter than money",
      sharpScore: 2,
      note: "Money % is well above ticket %.",
    };
  }

  if (diff >= 6) {
    return {
      sharpLabel: "Moderate sharp signal",
      publicLabel: "Pros slightly heavier",
      sharpScore: 1,
      note: "Money % is modestly above ticket %.",
    };
  }

  if (diff <= -12) {
    return {
      sharpLabel: "Public-heavy side",
      publicLabel: "Tickets outweigh money",
      sharpScore: -2,
      note: "Ticket % is much higher than money %.",
    };
  }

  return {
    sharpLabel: "Balanced splits",
    publicLabel: "No strong split edge",
    sharpScore: 0,
    note: "Tickets and money are close.",
  };
};

const lineMoveScore = (consensusPrice: number, bestPrice: number) => {
  if (!Number.isFinite(consensusPrice) || !Number.isFinite(bestPrice)) return 0;
  const delta = Number(bestPrice) - Number(consensusPrice);
  if (delta >= 20) return 2;
  if (delta >= 10) return 1;
  if (delta <= -20) return -2;
  if (delta <= -10) return -1;
  return 0;
};

const confidenceBucket = (score: number) => {
  if (score >= 7) return "🔥 MAX BET";
  if (score >= 5) return "💰 STRONG +EV";
  if (score >= 3) return "✅ LEAN";
  if (score <= 0) return "❌ FADE";
  return "⚠️ PASS";
};

const aiScore = ({ ev, kelly, sharpScore, lineScore, newsBoost = 0, propBoost = 0 }: { ev: number; kelly: number; sharpScore: number; lineScore: number; newsBoost?: number; propBoost?: number }) => {
  let score = 0;
  if (ev >= 5) score += 4;
  else if (ev >= 3) score += 3;
  else if (ev >= 1.5) score += 2;
  else if (ev > 0) score += 1;
  else score -= 2;

  if (kelly >= 5) score += 2;
  else if (kelly >= 2) score += 1;

  score += sharpScore;
  score += lineScore;
  score += newsBoost;
  score += propBoost;

  return score;
};

const flattenSidePrices = (game: any) => {
  const rows: any[] = [];
  (game.bookmakers || []).forEach((bookmaker: any) => {
    (bookmaker.markets || []).forEach((market: any) => {
      if (market.key !== "h2h") return;
      (market.outcomes || []).forEach((outcome: any) => {
        rows.push({
          bookmakerKey: bookmaker.key,
          bookmakerTitle: bookmaker.title,
          name: outcome.name,
          price: Number(outcome.price),
        });
      });
    });
  });
  return rows;
};

const flattenPropMarkets = (events: any[]) => {
  const props: any[] = [];
  events.forEach((event: any) => {
    (event.bookmakers || []).forEach((bookmaker: any) => {
      (bookmaker.markets || []).forEach((market: any) => {
        (market.outcomes || []).forEach((outcome: any) => {
          props.push({
            eventId: event.id,
            sportKey: event.sport_key,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            bookmakerTitle: bookmaker.title,
            marketKey: market.key,
            player: outcome.description || outcome.name,
            sideLabel: outcome.name,
            line: outcome.point ?? null,
            price: Number(outcome.price),
          });
        });
      });
    });
  });
  return props;
};

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="text-lg font-semibold">{title}</div>
      {subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}
    </div>
  );
}

export default function BettingDashboard() {
  const [selectedSport, setSelectedSport] = useState(SPORTS[0].key);
  const [games, setGames] = useState<any[]>([]);
  const [propsBoard, setPropsBoard] = useState<any[]>([]);
  const [newsByGame, setNewsByGame] = useState<Record<string, any[]>>({});
  const [alertLog, setAlertLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState("");

  const selectedSportMeta = SPORTS.find((s) => s.key === selectedSport) || SPORTS[0];

  const fetchNewsForGame = useCallback(async (gameId: string, homeTeam: string, awayTeam: string) => {
    try {
      const q = encodeURIComponent(`${homeTeam} OR ${awayTeam}`);
      const res = await fetch(`/api/sports-news?q=${q}`);
      const json = await res.json();
      setNewsByGame((prev) => ({ ...prev, [gameId]: json.articles || [] }));
    } catch {
      setNewsByGame((prev) => ({ ...prev, [gameId]: [] }));
    }
  }, []);

  const fetchEverything = useCallback(async () => {
    setLoading(true);
    try {
      const oddsRes = await fetch(`/api/odds?sport=${selectedSport}`);
      const oddsJson = await oddsRes.json();

      const processedGames = await Promise.all(
        (oddsJson || []).map(async (game: any) => {
          const rows = flattenSidePrices(game);
          const sideNames = [...new Set(rows.map((row) => row.name))];

          const sideBase = sideNames.map((sideName) => {
            const prices = rows.filter((row) => row.name === sideName);
            const best = bestLine(prices);
            const consensusPrice = avg(prices.map((p) => Number(p.price)));
            return {
              sideName,
              allPrices: prices.sort((a, b) => Number(b.price) - Number(a.price)),
              bestBook: best?.bookmakerTitle || "—",
              bestPrice: best?.price ?? null,
              consensusPrice,
              consensusImplied: americanToImplied(consensusPrice),
            };
          });

          const fairSides = normalizeNoVig(sideBase);

          const splitsRes = await fetch(`/api/betting-splits?home=${encodeURIComponent(game.home_team)}&away=${encodeURIComponent(game.away_team)}&sport=${encodeURIComponent(selectedSport)}`);
          const splitsJson = splitsRes.ok ? await splitsRes.json() : { sides: {} };

          const enrichedSides = fairSides.map((side: any) => {
            const split = splitsJson?.sides?.[side.sideName] || {};
            const ev = evPercent(side.fairProbability, Number(side.bestPrice));
            const kelly = kellyPercent(side.fairProbability, Number(side.bestPrice));
            const sharp = getSharpSummary(split.ticketPct, split.moneyPct);
            const lineScore = lineMoveScore(Number(side.consensusPrice), Number(side.bestPrice));
            const score = aiScore({ ev, kelly, sharpScore: sharp.sharpScore, lineScore });
            return {
              ...side,
              ev,
              kelly,
              ticketPct: split.ticketPct ?? null,
              moneyPct: split.moneyPct ?? null,
              sharpLabel: sharp.sharpLabel,
              publicLabel: sharp.publicLabel,
              note: sharp.note,
              lineScore,
              aiScore: score,
              aiTag: confidenceBucket(score),
              bestBet: ev >= ALERT_THRESHOLD_EV,
            };
          });

          const strongestSide = [...enrichedSides].sort((a, b) => b.ev - a.ev)[0] || null;
          return {
            id: `${selectedSport}-${game.id}`,
            sportKey: selectedSport,
            homeTeam: game.home_team,
            awayTeam: game.away_team,
            commenceTime: game.commence_time,
            sides: enrichedSides,
            strongestSide,
          };
        })
      );

      setGames(processedGames);
      processedGames.slice(0, 6).forEach((game) => fetchNewsForGame(game.id, game.homeTeam, game.awayTeam));

      const propMarkets = selectedSportMeta.propMarkets.join(",");
      const propsRes = await fetch(`/api/player-props?sport=${selectedSport}&markets=${encodeURIComponent(propMarkets)}`);
      const propsJson = propsRes.ok ? await propsRes.json() : [];
      const flatProps = flattenPropMarkets(propsJson || []);

      const grouped = Object.values(
        flatProps.reduce((acc: Record<string, any>, row: any) => {
          const key = `${row.eventId}-${row.marketKey}-${row.player}-${row.sideLabel}-${row.line ?? "na"}`;
          if (!acc[key]) {
            acc[key] = {
              ...row,
              allPrices: [],
            };
          }
          acc[key].allPrices.push({ bookmakerTitle: row.bookmakerTitle, price: row.price });
          return acc;
        }, {})
      ).map((item: any) => {
        const prices = item.allPrices || [];
        const best = bestLine(prices);
        const consensusPrice = avg(prices.map((p: any) => Number(p.price)));
        const fairProbability = americanToImplied(consensusPrice);
        const ev = evPercent(fairProbability, Number(best?.price));
        const kelly = kellyPercent(fairProbability, Number(best?.price));
        const score = aiScore({ ev, kelly, sharpScore: 0, lineScore: lineMoveScore(consensusPrice, Number(best?.price)), propBoost: 1 });
        return {
          ...item,
          bestBook: best?.bookmakerTitle || "—",
          bestPrice: best?.price ?? null,
          consensusPrice,
          fairProbability,
          ev,
          kelly,
          aiScore: score,
          aiTag: confidenceBucket(score),
          bestBet: ev >= ALERT_THRESHOLD_EV,
        };
      }).sort((a: any, b: any) => b.ev - a.ev);

      setPropsBoard(grouped.slice(0, 40));
      setLastScan(new Date().toLocaleTimeString());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [fetchNewsForGame, selectedSport, selectedSportMeta.propMarkets]);

  useEffect(() => {
    fetchEverything();
    const interval = setInterval(fetchEverything, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchEverything]);

  const topSides = useMemo(() => {
    return games
      .map((g) => ({ game: g, side: g.strongestSide }))
      .filter((entry) => entry.side)
      .sort((a, b) => b.side.ev - a.side.ev)
      .slice(0, 10);
  }, [games]);

  const topProps = useMemo(() => propsBoard.filter((p) => p.bestBet).slice(0, 10), [propsBoard]);

  const sendAlert = useCallback(async (label: string, payload: any) => {
    try {
      await fetch("/api/send-best-bet-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, ...payload }),
      });
      setAlertLog((prev) => [`${new Date().toLocaleTimeString()} • ${label}`, ...prev].slice(0, 8));
    } catch {
      setAlertLog((prev) => [`${new Date().toLocaleTimeString()} • alert failed`, ...prev].slice(0, 8));
    }
  }, []);

  useEffect(() => {
    topSides.slice(0, 2).forEach(({ game, side }) => {
      const key = `side-${game.id}-${side.sideName}-${Math.round(side.ev * 10)}`;
      if (!alertLog.some((x) => x.includes(key))) {
        sendAlert(key, {
          matchup: `${game.awayTeam} @ ${game.homeTeam}`,
          pick: side.sideName,
          book: side.bestBook,
          odds: side.bestPrice,
          evPercent: side.ev,
          aiTag: side.aiTag,
        });
      }
    });

    topProps.slice(0, 2).forEach((prop) => {
      const key = `prop-${prop.eventId}-${prop.player}-${prop.marketKey}-${Math.round(prop.ev * 10)}`;
      if (!alertLog.some((x) => x.includes(key))) {
        sendAlert(key, {
          matchup: `${prop.awayTeam} @ ${prop.homeTeam}`,
          pick: `${prop.player} ${prop.sideLabel} ${prop.line ?? ""}`,
          book: prop.bestBook,
          odds: prop.bestPrice,
          evPercent: prop.ev,
          aiTag: prop.aiTag,
        });
      }
    });
  }, [topSides, topProps, alertLog, sendAlert]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 grid gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">EdgeFinder Pro</h1>
          <p className="text-sm text-slate-400">Odds scanner, +EV engine, sharp/public signals, player props, and AI recommendations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SPORTS.map((sport) => (
            <Button key={sport.key} variant={selectedSport === sport.key ? "default" : "outline"} onClick={() => setSelectedSport(sport.key)}>
              {sport.label}
            </Button>
          ))}
          <Button onClick={fetchEverything}>{loading ? "Scanning..." : "Refresh"}</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="text-sm text-slate-400">Last scan</div><div className="text-xl font-semibold">{lastScan || "—"}</div></CardContent></Card>
        <Card className="rounded-2xl bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="text-sm text-slate-400">Top side bets</div><div className="text-xl font-semibold">{topSides.length}</div></CardContent></Card>
        <Card className="rounded-2xl bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="text-sm text-slate-400">Top prop bets</div><div className="text-xl font-semibold">{topProps.length}</div></CardContent></Card>
        <Card className="rounded-2xl bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="text-sm text-slate-400">Alert threshold</div><div className="text-xl font-semibold">{ALERT_THRESHOLD_EV.toFixed(1)}% EV</div></CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-2xl bg-slate-900 border-slate-800">
          <CardContent className="p-4 grid gap-3">
            <SectionTitle title="Top +EV Side Bets" subtitle="Closest thing to an OddsJam-style best-bet board." />
            {topSides.length === 0 && <div className="text-sm text-slate-400">No side bets over your current threshold.</div>}
            {topSides.map(({ game, side }) => (
              <div key={`${game.id}-${side.sideName}`} className="rounded-xl border border-slate-800 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{game.awayTeam} @ {game.homeTeam}</div>
                    <div className="text-sm text-slate-400">Bet {side.sideName} at {side.bestBook} {formatOdds(side.bestPrice)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatPct(side.ev)}</div>
                    <div className="text-xs text-slate-400">{side.aiTag}</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-slate-900 border-slate-800">
          <CardContent className="p-4 grid gap-3">
            <SectionTitle title="Top +EV Player Props" subtitle="Best prop spots across books and markets." />
            {topProps.length === 0 && <div className="text-sm text-slate-400">No props over your current threshold.</div>}
            {topProps.map((prop) => (
              <div key={`${prop.eventId}-${prop.marketKey}-${prop.player}-${prop.line}`} className="rounded-xl border border-slate-800 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{prop.player}</div>
                    <div className="text-sm text-slate-400">{prop.marketKey} • {prop.sideLabel} {prop.line ?? ""}</div>
                    <div className="text-sm text-slate-400">{prop.bestBook} {formatOdds(prop.bestPrice)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatPct(prop.ev)}</div>
                    <div className="text-xs text-slate-400">{prop.aiTag}</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        {games.map((game) => (
          <Card key={game.id} className="rounded-2xl bg-slate-900 border-slate-800">
            <CardContent className="p-4 grid gap-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-lg font-bold">{game.awayTeam} @ {game.homeTeam}</div>
                  <div className="text-sm text-slate-400">Starts: {new Date(game.commenceTime).toLocaleString()}</div>
                </div>
                <div className="text-sm text-slate-400">Strongest angle: {game.strongestSide?.sideName || "—"}</div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {game.sides.map((side: any) => (
                  <div key={side.sideName} className="rounded-xl border border-slate-800 p-4 grid gap-3">
                    <div className="flex justify-between gap-3">
                      <div>
                        <div className="font-semibold">{side.sideName}</div>
                        <div className="text-sm text-slate-400">Best line: {side.bestBook} {formatOdds(side.bestPrice)}</div>
                        <div className="text-xs text-slate-500">Consensus: {formatOdds(side.consensusPrice)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatPct(side.ev)}</div>
                        <div className="text-xs text-slate-400">EV</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-lg bg-slate-800 p-2"><div className="text-slate-400">Fair %</div><div className="font-semibold">{formatPct(side.fairProbability * 100)}</div></div>
                      <div className="rounded-lg bg-slate-800 p-2"><div className="text-slate-400">Kelly</div><div className="font-semibold">{formatPct(side.kelly)}</div></div>
                      <div className="rounded-lg bg-slate-800 p-2"><div className="text-slate-400">AI</div><div className="font-semibold">{side.aiTag}</div></div>
                    </div>

                    <div className="rounded-lg bg-slate-800 p-3 text-sm">
                      <div className="font-medium">{side.sharpLabel}</div>
                      <div className="text-slate-400">{side.publicLabel}</div>
                      <div className="text-xs text-slate-500 mt-1">{side.note}</div>
                      <div className="mt-2 text-xs text-slate-400">Tickets: {formatPct(side.ticketPct, 0)} • Money: {formatPct(side.moneyPct, 0)}</div>
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium">Sportsbook prices</div>
                      <div className="max-h-44 overflow-auto rounded-lg border border-slate-800">
                        {side.allPrices.map((row: any, i: number) => (
                          <div key={`${row.bookmakerKey}-${i}`} className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-sm last:border-b-0">
                            <div>{row.bookmakerTitle}</div>
                            <div className="font-medium">{formatOdds(row.price)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 rounded-xl border border-slate-800 p-4">
                <SectionTitle title="Recent sports news" subtitle="Useful context before locking in a bet." />
                {(newsByGame[game.id] || []).length === 0 && <div className="text-sm text-slate-400">No articles loaded yet.</div>}
                {(newsByGame[game.id] || []).slice(0, 5).map((article, idx) => (
                  <a key={`${game.id}-${idx}`} href={article.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-800 p-3 hover:bg-slate-800/60">
                    <div className="font-medium">{article.title}</div>
                    <div className="text-xs text-slate-500">{article.source?.name || "Source"} • {article.publishedAt ? new Date(article.publishedAt).toLocaleString() : ""}</div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl bg-slate-900 border-slate-800">
        <CardContent className="p-4 grid gap-3">
          <SectionTitle title="Recent alerts" subtitle="Texts sent when a side or prop crosses your threshold." />
          {alertLog.length === 0 && <div className="text-sm text-slate-400">No alerts yet.</div>}
          {alertLog.map((line, i) => <div key={i} className="text-sm text-slate-300">{line}</div>)}
        </CardContent>
      </Card>
    </div>
  );
}

