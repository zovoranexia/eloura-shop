import { formatUSD } from '@/lib/money';

export function Price({ cents, compareAt, size = 'md' }: { cents: number; compareAt?: number | null; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base';
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span className={`${cls} font-bold text-mauve`}>{formatUSD(cents)}</span>
      {compareAt ? <span className={`${size === 'lg' ? 'text-base' : 'text-xs'} text-taupe/70 line-through`}>{formatUSD(compareAt)}</span> : null}
    </span>
  );
}
