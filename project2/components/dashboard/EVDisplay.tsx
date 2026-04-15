import { formatEV, getEVColor } from '@/lib/betting-utils';

interface Props {
  ev: number;
  label?: string;
}

export default function EVDisplay({ ev, label = 'EV' }: Props) {
  const colorClass = getEVColor(ev);

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{label}</span>
      <span className={`text-sm font-bold ${colorClass}`}>{formatEV(ev)}</span>
    </div>
  );
}
