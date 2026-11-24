import { Star } from 'lucide-react';

export function Stars({ value, size = 14, className = '' }: { value: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} role="img" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(value) ? 'fill-gold text-gold' : 'fill-transparent text-gold/50'} aria-hidden />
      ))}
    </span>
  );
}
