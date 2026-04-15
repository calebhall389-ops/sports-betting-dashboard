'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Newspaper } from 'lucide-react';

interface NewsItem {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  description: string;
}

interface Props {
  sport: string;
  homeTeam: string;
  awayTeam: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NewsSection({ sport, homeTeam, awayTeam }: Props) {
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const team = homeTeam.split(' ').slice(-1)[0];
    fetch(
      `/api/sports-news?sport=${encodeURIComponent(sport)}&team=${encodeURIComponent(team)}`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((data) => {
        setArticles(data.articles || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => controller.abort();
  }, [sport, homeTeam, awayTeam]);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-8 bg-slate-700/40 rounded" />
        ))}
      </div>
    );
  }

  if (articles.length === 0) return null;

  const visible = expanded ? articles : articles.slice(0, 2);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Newspaper className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Latest News
        </span>
      </div>
      <div className="space-y-1.5">
        {visible.map((article, i) => (
          <a
            key={i}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 group-hover:text-white transition-colors leading-snug line-clamp-2">
                {article.title}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-slate-600">{article.source}</span>
                <span className="text-slate-700">·</span>
                <span className="text-xs text-slate-600">{timeAgo(article.publishedAt)}</span>
              </div>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-slate-400 shrink-0 mt-0.5 transition-colors" />
          </a>
        ))}
      </div>
      {articles.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {expanded ? 'Show less' : `+${articles.length - 2} more articles`}
        </button>
      )}
    </div>
  );
}
