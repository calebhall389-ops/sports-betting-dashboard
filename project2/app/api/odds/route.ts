import { NextRequest, NextResponse } from 'next/server';
import type { Game } from '@/types/betting';
import { processGame } from '@/lib/betting-utils';

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport') || 'baseball_mlb';

  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ODDS_API_KEY is not configured' },
      { status: 500 }
    );
  }

  try {
    const url = new URL(`${ODDS_API_BASE}/sports/${sport}/odds`);
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('regions', 'us');
    url.searchParams.set('markets', 'h2h');
    url.searchParams.set('oddsFormat', 'american');
    url.searchParams.set('dateFormat', 'iso');

    const res = await fetch(url.toString(), {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Odds API error: ${res.status} ${text}` },
        { status: res.status }
      );
    }

    const games: Game[] = await res.json();
    const processed = games.map(processGame);

    const remainingRequests = res.headers.get('x-requests-remaining') ?? 'unknown';
    const usedRequests = res.headers.get('x-requests-used') ?? 'unknown';

    return NextResponse.json({
      games: processed,
      sport,
      remainingRequests,
      usedRequests,
    });
  } catch (err) {
    console.error('Error fetching odds:', err);
    return NextResponse.json(
      { error: 'Failed to fetch odds data' },
      { status: 500 }
    );
  }
}
