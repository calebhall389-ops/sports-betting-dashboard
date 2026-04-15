import type { BetRecommendation } from '@/types/betting';
import { getRecommendationColor } from '@/lib/betting-utils';

interface Props {
  recommendation: BetRecommendation;
  size?: 'sm' | 'md';
}

export default function RecommendationBadge({ recommendation, size = 'md' }: Props) {
  const colorClass = getRecommendationColor(recommendation);
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-3 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-bold tracking-wide ${colorClass} ${sizeClass}`}
    >
      {recommendation === 'MAX BET' && <span className="text-amber-400">★</span>}
      {recommendation}
    </span>
  );
}
