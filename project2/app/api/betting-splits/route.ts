import { NextRequest, NextResponse } from 'next/server';

function generateSplits(gameId: string, homeTeam: string) {
  const seed = gameId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = (min: number, max: number) => {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    const frac = x - Math.floor(x);
    return Math.floor(frac * (max - min + 1)) + min;
  };

  const homePublicPct = rand(30, 70);
  const awayPublicPct = 100 - homePublicPct;

  const homeSharpPct = rand(20, 80);
  const awaySharpPct = 100 - homeSharpPct;

  const homeHandlePct = rand(25, 75);
  const awayHandlePct = 100 - homeHandlePct;

  const totalBets = rand(500, 15000);

  return {
    homeTeam,
    homePublicPct,
    awayPublicPct,
    homeSharpPct,
    awaySharpPct,
    homeHandlePct,
    awayHandlePct,
    totalBets,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId') || 'default';
  const homeTeam = searchParams.get('homeTeam') || 'Home';

  await new Promise((r) => setTimeout(r, 50));

  const splits = generateSplits(gameId, homeTeam);

  return NextResponse.json(splits);
}
