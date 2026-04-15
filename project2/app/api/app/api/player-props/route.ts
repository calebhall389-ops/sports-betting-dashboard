import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport") || "basketball_nba";
  const markets =
    searchParams.get("markets") ||
    "player_points,player_rebounds,player_assists";

  const apiKey = process.env.ODDS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ODDS_API_KEY" },
      { status: 500 }
    );
  }

  const url =
    `https://api.the-odds-api.com/v4/sports/${sport}/odds` +
    `?apiKey=${apiKey}` +
    `&regions=us` +
    `&markets=${encodeURIComponent(markets)}` +
    `&oddsFormat=american`;

  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();

  return NextResponse.json(data, { status: response.status });
}
