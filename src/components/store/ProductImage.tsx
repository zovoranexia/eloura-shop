/* Product photo on a soft cream frame; falls back to the Eloura monogram when a product has no photo. */
export function ProductImage({ src, alt, className = '', cover = true }: { src: string | null | undefined; alt: string; className?: string; cover?: boolean }) {
  return (
    <div className={`relative overflow-hidden bg-[#F6ECE8] ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" decoding="async" className={`h-full w-full ${cover ? 'object-cover' : 'object-contain'}`} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/images/brand/monogram.png" alt="" aria-hidden className="absolute left-1/2 top-1/2 h-1/3 w-auto -translate-x-1/2 -translate-y-1/2 opacity-40" />
      )}
    </div>
  );
}
