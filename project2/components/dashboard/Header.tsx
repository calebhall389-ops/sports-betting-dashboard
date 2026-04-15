'use client';

import { RefreshCw, Zap, Activity } from 'lucide-react';

interface Props {
  lastUpdated: Date | null;
  nextRefresh: number;
  isLoading: boolean;
  onRefresh: () => void;
  remainingRequests: string | null;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function Header({
  lastUpdated,
  nextRefresh,
  isLoading,
  onRefresh,
  remainingRequests,
}: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-tight leading-none">
                  EdgeFinder
                </h1>
                <p className="text-xs text-slate-500 leading-none mt-0.5">
                  Sports Betting Analytics
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            {remainingRequests && (
              <div className="hidden sm:flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-xs text-slate-600">
                  {remainingRequests} API calls left
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {lastUpdated && (
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-slate-500">
                    Updated {formatTime(lastUpdated)}
                  </div>
                  <div className="text-xs text-slate-600">
                    Refresh in {nextRefresh}s
                  </div>
                </div>
              )}

              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-all text-xs font-medium text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isLoading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5">
            <div className="h-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse" />
          </div>
        )}
      </div>
    </header>
  );
}
