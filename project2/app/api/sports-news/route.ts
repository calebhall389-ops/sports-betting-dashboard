import { NextRequest, NextResponse } from 'next/server';

interface NewsAPIArticle {
  title: string;
  url: string;
  publishedAt: string;
  source?: { name?: string };
  description?: string;
}

const SPORT_QUERIES: Record<string, string> = {
  baseball_mlb: 'MLB baseball',
  basketball_nba: 'NBA basketball',
  americanfootball_nfl: 'NFL football',
  icehockey_nhl: 'NHL hockey',
  mma_mixed_martial_arts: 'UFC MMA fight',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport') || 'baseball_mlb';
  const team = searchParams.get('team') || '';

  const newsApiKey = process.env.NEWS_API_KEY;

  if (!newsApiKey) {
    return NextResponse.json({ articles: getMockNews(sport, team) });
  }

  try {
    const query = team
      ? `${team} ${SPORT_QUERIES[sport] || sport}`
      : SPORT_QUERIES[sport] || sport;

    const url = new URL('https://newsapi.org/v2/everything');
    url.searchParams.set('q', query);
    url.searchParams.set('sortBy', 'publishedAt');
    url.searchParams.set('language', 'en');
    url.searchParams.set('pageSize', '5');
    url.searchParams.set('apiKey', newsApiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 300 } });

    if (!res.ok) {
      return NextResponse.json({ articles: getMockNews(sport, team) });
    }

    const data = await res.json();
    const articles = (data.articles || []).map((a: NewsAPIArticle) => ({
      title: a.title,
      url: a.url,
      publishedAt: a.publishedAt,
      source: a.source?.name || 'Unknown',
      description: a.description || '',
    }));

    return NextResponse.json({ articles });
  } catch {
    return NextResponse.json({ articles: getMockNews(sport, team) });
  }
}

function getMockNews(sport: string, team: string) {
  const teamLabel = team || SPORT_QUERIES[sport] || sport;
  const now = new Date();

  return [
    {
      title: `${teamLabel}: Latest injury report ahead of tonight's matchup`,
      url: '#',
      publishedAt: new Date(now.getTime() - 1800000).toISOString(),
      source: 'ESPN',
      description: `Key updates on player availability and lineup changes for tonight.`,
    },
    {
      title: `Sharp money moving on ${teamLabel} — line movement analysis`,
      url: '#',
      publishedAt: new Date(now.getTime() - 3600000).toISOString(),
      source: 'The Athletic',
      description: `Sportsbooks have adjusted the line after significant sharp action came in on this matchup.`,
    },
    {
      title: `Weather and venue conditions for ${teamLabel} game`,
      url: '#',
      publishedAt: new Date(now.getTime() - 7200000).toISOString(),
      source: 'Rotowire',
      description: `Field conditions and environmental factors that could impact tonight's outcome.`,
    },
    {
      title: `${teamLabel} recent form: last 5 games breakdown`,
      url: '#',
      publishedAt: new Date(now.getTime() - 10800000).toISOString(),
      source: 'Action Network',
      description: `A look at recent performance trends and statistical analysis.`,
    },
  ];
}
