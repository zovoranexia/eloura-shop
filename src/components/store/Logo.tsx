import Link from 'next/link';

/** Official Eloura Chic wordmark (signature script + gold curve). `light` = cream version for dark backgrounds. */
export function Logo({ variant = 'wordmark', light = false, className = '' }: { variant?: 'wordmark' | 'full'; light?: boolean; className?: string }) {
  const src =
    variant === 'full'
      ? light ? '/images/brand/logo-full-light.png' : '/images/brand/logo-full.png'
      : light ? '/images/brand/logo-wordmark-light.png' : '/images/brand/logo-wordmark.png';
  return (
    <Link href="/" aria-label="Eloura Chic — Fashion & Accessories" className="inline-block shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Eloura Chic" className={className || 'h-[54px] w-auto md:h-[62px]'} width={variant === 'full' ? 300 : 128} height={variant === 'full' ? 238 : 67} />
    </Link>
  );
}
