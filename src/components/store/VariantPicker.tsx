'use client';
import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { useT } from '@/components/I18nProvider';

export type Variant = { id: number; size: string | null; color: string | null; colorHex: string | null; stock: number; priceCents: number };

/** Colour + size selection over a variant matrix; combinations without stock are disabled. */
export function useVariantSelection(variants: Variant[]) {
  const colors = useMemo(() => [...new Map(variants.filter((v) => v.color).map((v) => [v.color!, v.colorHex])).entries()].map(([name, hex]) => ({ name, hex })), [variants]);
  const sizes = useMemo(() => [...new Set(variants.map((v) => v.size).filter((s): s is string => !!s))], [variants]);
  const first = variants.find((v) => v.stock > 0) ?? variants[0];
  const [color, setColor] = useState<string | null>(first?.color ?? null);
  const [size, setSize] = useState<string | null>(first?.size ?? null);

  const selected = variants.find((v) => (colors.length ? v.color === color : true) && (sizes.length ? v.size === size : true)) ?? null;
  const sizeAvailable = (s: string) => variants.some((v) => v.size === s && (!colors.length || v.color === color) && v.stock > 0);
  const colorAvailable = (c: string) => variants.some((v) => v.color === c && v.stock > 0);

  function pickColor(c: string) {
    setColor(c);
    // keep the size when still available for the new colour, otherwise move to the first available one
    if (size && !variants.some((v) => v.color === c && v.size === size && v.stock > 0)) setSize(variants.find((v) => v.color === c && v.stock > 0)?.size ?? size);
  }
  return { colors, sizes, color, size, setSize, pickColor, selected, sizeAvailable, colorAvailable };
}

export function VariantPicker({ sel }: { sel: ReturnType<typeof useVariantSelection> }) {
  const t = useT();
  return (
    <div className="space-y-4">
      {sel.colors.length > 0 ? (
        <fieldset>
          <legend className="label">{t('product.color')}: <span className="font-medium normal-case tracking-normal text-espresso">{sel.color}</span></legend>
          <div className="flex flex-wrap gap-2.5">
            {sel.colors.map((c) => (
              <button key={c.name} type="button" onClick={() => sel.pickColor(c.name)} disabled={!sel.colorAvailable(c.name)} aria-pressed={sel.color === c.name} aria-label={c.name} title={c.name}
                className={`relative grid h-9 w-9 place-items-center rounded-full border-2 transition ${sel.color === c.name ? 'border-mauve' : 'border-cream-line hover:border-gold'} disabled:opacity-40`}>
                <span className="h-6 w-6 rounded-full border border-black/10" style={{ background: c.hex || '#ddd' }} />
                {sel.color === c.name ? <Check size={12} className="absolute text-white mix-blend-difference" /> : null}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      {sel.sizes.length > 0 ? (
        <fieldset>
          <legend className="label">{t('product.size')}: <span className="font-medium normal-case tracking-normal text-espresso">{sel.size}</span></legend>
          <div className="flex flex-wrap gap-2">
            {sel.sizes.map((s) => (
              <button key={s} type="button" onClick={() => sel.setSize(s)} disabled={!sel.sizeAvailable(s)} aria-pressed={sel.size === s}
                className={`min-w-11 rounded-full border px-3.5 py-2 text-sm font-medium transition ${sel.size === s ? 'border-mauve bg-mauve text-white' : 'border-cream-line bg-white hover:border-mauve'} disabled:cursor-not-allowed disabled:text-taupe/40 disabled:line-through`}>
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}
