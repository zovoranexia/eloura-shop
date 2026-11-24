'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Loader2, X, ZoomIn, ZoomOut, ImagePlus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useI18n, useT } from '@/components/I18nProvider';
import { api, errorMessage } from '@/lib/client/api';
import { cn } from '@/lib/client/cn';
import { LOCALES, LOCALE_LABEL } from '@/lib/i18n-shared';
import { centsToInput, parseUSD } from '@/lib/money';
import { useToast } from '@/components/ui/Toast';

/* ------------------------------------------------------------------ layout bits */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-medium leading-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-taupe">{subtitle}</p>}
        <div className="mt-2 h-px w-16 bg-gold" />
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className, pad = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cn('card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-line px-5 py-3.5">
          <h2 className="font-serif text-xl font-semibold">{title}</h2>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

const TONES = {
  gray: 'bg-cream-deep text-taupe', green: 'bg-emerald-100 text-emerald-800', amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800', blue: 'bg-sky-100 text-sky-800', mauve: 'bg-mauve-soft text-mauve-dark',
};
export type Tone = keyof typeof TONES;
export const Badge = ({ tone = 'gray', children, className }: { tone?: Tone; children: ReactNode; className?: string }) => (
  <span className={cn('badge whitespace-nowrap', TONES[tone], className)}>{children}</span>
);

const ORDER_TONE: Record<string, Tone> = {
  PENDING_PAYMENT: 'amber', AWAITING_VERIFICATION: 'blue', PENDING_CONFIRMATION: 'amber', PROCESSING: 'mauve', PACKED: 'mauve',
  OUT_FOR_DELIVERY: 'blue', DELIVERED: 'green', CANCELLED: 'red',
};
const PAY_TONE: Record<string, Tone> = { UNPAID: 'gray', AWAITING_VERIFICATION: 'blue', PAID: 'green', REFUND_PENDING: 'amber', REFUNDED: 'gray' };
const PROOF_TONE: Record<string, Tone> = { SUBMITTED: 'blue', APPROVED: 'green', REJECTED: 'red', VOID: 'gray' };

export function OrderStatusBadge({ status }: { status: string }) {
  const t = useT();
  return <Badge tone={ORDER_TONE[status] ?? 'gray'}>{t(`status.order.${status}`)}</Badge>;
}
export function PaymentStatusBadge({ status }: { status: string }) {
  const t = useT();
  return <Badge tone={PAY_TONE[status] ?? 'gray'}>{t(`status.payment.${status}`)}</Badge>;
}
export function ProofStatusBadge({ status }: { status: string }) {
  const t = useT();
  return <Badge tone={PROOF_TONE[status] ?? 'gray'}>{t(`status.proof.${status}`)}</Badge>;
}
export function MethodBadge({ method }: { method: string }) {
  const t = useT();
  return <Badge tone={method === 'COD' ? 'amber' : 'mauve'}>{t(`status.method.${method}`)}</Badge>;
}

export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn('animate-spin text-mauve', className)} size={20} aria-hidden />;
export function Loading() {
  const t = useT();
  return <div className="flex items-center justify-center gap-2 py-16 text-sm text-taupe"><Spinner /> {t('common.loading')}</div>;
}
export function Empty({ text }: { text?: string }) {
  const t = useT();
  return <div className="py-14 text-center text-sm text-taupe">{text ?? t('common.noResults')}</div>;
}
export function ErrorBox({ error }: { error: unknown }) {
  const t = useT();
  return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{errorMessage(t, error)}</div>;
}

export const th = 'whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-taupe';
export const td = 'px-4 py-3 align-middle';
export const trCls = 'border-t border-cream-line transition-colors hover:bg-cream/70';

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="card overflow-x-auto"><table className="w-full min-w-[640px] text-sm">{children}</table></div>;
}

export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  const t = useT();
  if (pages <= 1) return null;
  return (
    <nav className="no-print mt-4 flex items-center justify-between gap-3 text-sm text-taupe" aria-label="pagination">
      <span>{t('common.page', { page, pages })}</span>
      <div className="flex gap-2">
        <button type="button" className="btn-outline btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={14} /> {t('common.previous')}</button>
        <button type="button" className="btn-outline btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>{t('common.next')} <ChevronRight size={14} /></button>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ forms */
export function Field({ label, error, hint, children, className }: { label?: ReactNode; error?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-taupe">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn('inline-flex items-center gap-2 text-sm', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
      <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-mauve' : 'bg-cream-line')}>
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
      {label}
    </label>
  );
}

/** USD input that edits integer cents (accepts "12.5" and "12,50"). `null` = empty. */
export function MoneyInput({ cents, onChange, allowEmpty, className, disabled, placeholder }: {
  cents: number | null; onChange: (c: number | null) => void; allowEmpty?: boolean; className?: string; disabled?: boolean; placeholder?: string;
}) {
  const [text, setText] = useState(centsToInput(cents));
  const last = useRef(cents);
  useEffect(() => { if (cents !== last.current) { last.current = cents; setText(centsToInput(cents)); } }, [cents]);
  return (
    <div className={cn('relative', className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-taupe">$</span>
      <input className="input pl-7" inputMode="decimal" value={text} disabled={disabled} placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value.trim() === '') { if (allowEmpty) { last.current = null; onChange(null); } return; }
          const c = parseUSD(e.target.value);
          if (c !== null) { last.current = c; onChange(c); }
        }}
        onBlur={() => setText(centsToInput(cents))} />
    </div>
  );
}

/** One input per language (TET default, PT, EN, ID) behind tabs; tabs without text are marked with a dot. */
export function LangTabs({ value, onChange, multiline, rows = 4, label, error, disabled, placeholder }: {
  value: Record<string, string>; onChange: (v: Record<string, string>) => void; multiline?: boolean; rows?: number; label?: ReactNode; error?: string; disabled?: boolean; placeholder?: string;
}) {
  const [tab, setTab] = useState<(typeof LOCALES)[number]>('tet');
  const set = (v: string) => onChange({ ...value, [tab]: v });
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="mb-2 inline-flex overflow-hidden rounded-full border border-cream-line bg-white text-xs font-semibold" role="tablist">
        {LOCALES.map((l) => (
          <button key={l} type="button" role="tab" aria-selected={tab === l} onClick={() => setTab(l)}
            className={cn('px-3 py-1.5 transition-colors', tab === l ? 'bg-mauve text-white' : 'text-taupe hover:bg-cream-deep')}>
            {LOCALE_LABEL[l]}{value[l]?.trim() ? '' : <span className="ml-1 text-gold" title="—">•</span>}
          </button>
        ))}
      </div>
      {multiline
        ? <textarea className={cn('input', error && 'input-error')} rows={rows} value={value[tab] ?? ''} onChange={(e) => set(e.target.value)} disabled={disabled} placeholder={placeholder} />
        : <input className={cn('input', error && 'input-error')} value={value[tab] ?? ''} onChange={(e) => set(e.target.value)} disabled={disabled} placeholder={placeholder} />}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ modal / lightbox / confirm */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-espresso/50 p-3 sm:p-8" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" className={cn('card w-full', w)}>
        <header className="flex items-center justify-between border-b border-cream-line px-5 py-3.5">
          <h2 className="font-serif text-xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="rounded-full p-1.5 text-taupe hover:bg-cream-deep"><X size={18} /></button>
        </header>
        <div className="p-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-cream-line px-5 py-3.5">{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmModal({ open, title, text, confirmLabel, danger, busy, onConfirm, onClose }: {
  open: boolean; title: string; text: ReactNode; confirmLabel?: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<><button type="button" className="btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} disabled={busy} onClick={onConfirm}>{busy && <Spinner className="!text-white" />}{confirmLabel ?? t('common.confirm')}</button></>}>
      <p className="text-sm text-taupe">{text}</p>
    </Modal>
  );
}

/** Full-screen image viewer with zoom (click the image or use the buttons). */
export function Lightbox({ src, alt, onClose }: { src: string | null; alt?: string; onClose: () => void }) {
  const t = useT();
  const [zoom, setZoom] = useState(1);
  useEffect(() => { setZoom(1); }, [src]);
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [src, onClose]);
  if (!src) return null;
  return (
    <div className="no-print fixed inset-0 z-[60] flex flex-col bg-black/85" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex items-center justify-end gap-2 p-3 text-white">
        <button type="button" className="rounded-full bg-white/10 p-2 hover:bg-white/20" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} aria-label="−"><ZoomOut size={18} /></button>
        <span className="w-12 text-center text-sm">{Math.round(zoom * 100)}%</span>
        <button type="button" className="rounded-full bg-white/10 p-2 hover:bg-white/20" onClick={() => setZoom((z) => Math.min(4, z + 0.5))} aria-label="+"><ZoomIn size={18} /></button>
        <button type="button" className="rounded-full bg-white/10 p-2 hover:bg-white/20" onClick={onClose} aria-label={t('common.close')}><X size={18} /></button>
      </div>
      <div className="flex-1 overflow-auto p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? ''} onClick={() => setZoom((z) => (z >= 3 ? 1 : z + 1))} style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? '100%' : 'none' }}
          className={cn('mx-auto block h-auto', zoom >= 3 ? 'cursor-zoom-out' : 'cursor-zoom-in')} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ image upload */
async function uploadImage(file: File, kind: string): Promise<string> {
  const form = new FormData();
  form.set('file', file);
  form.set('kind', kind);
  return (await api<{ url: string }>('/api/admin/uploads', { form })).url;
}

export function ImageUploader({ value, onChange, kind, disabled, className }: { value: string | null; onChange: (url: string | null) => void; kind: 'products' | 'banners' | 'categories' | 'qr'; disabled?: boolean; className?: string }) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function pick(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setBusy(true);
    try { onChange(await uploadImage(f, kind)); } catch (e) { toast.error(errorMessage(t, e)); } finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gold bg-cream">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="text-gold" />}
      </div>
      <div className="flex flex-col gap-2">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files)} disabled={disabled} />
        <button type="button" className="btn-outline btn-sm" disabled={busy || disabled} onClick={() => input.current?.click()}>{busy ? <Spinner /> : <ImagePlus size={14} />} {t('admin.upload.choose')}</button>
        {value && !disabled && <button type="button" className="btn-ghost btn-sm text-red-700" onClick={() => onChange(null)}><Trash2 size={14} /> {t('common.remove')}</button>}
        <p className="text-xs text-taupe">{t('admin.upload.hint')}</p>
      </div>
    </div>
  );
}

export function MultiImageUploader({ value, onChange, kind = 'products', disabled }: { value: string[]; onChange: (urls: string[]) => void; kind?: 'products'; disabled?: boolean }) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function pick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const urls: string[] = [];
    try {
      for (const f of Array.from(files).slice(0, 10 - value.length)) urls.push(await uploadImage(f, kind));
    } catch (e) { toast.error(errorMessage(t, e)); } finally {
      if (urls.length) onChange([...value, ...urls]); // keep the images that did upload even when a later one failed
      setBusy(false); if (input.current) input.current.value = '';
    }
  }
  const move = (i: number, d: number) => { const a = [...value]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <div key={url} className="w-28">
            <div className="relative aspect-square overflow-hidden rounded-xl border border-cream-line bg-cream">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded-full bg-mauve px-2 py-0.5 text-[10px] font-semibold text-white">{t('admin.products.mainImage')}</span>}
            </div>
            {!disabled && (
              <div className="mt-1 flex justify-between">
                <button type="button" className="rounded p-1 text-taupe hover:bg-cream-deep" onClick={() => move(i, -1)} disabled={i === 0} aria-label="↑"><ArrowUp size={14} /></button>
                <button type="button" className="rounded p-1 text-taupe hover:bg-cream-deep" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="↓"><ArrowDown size={14} /></button>
                <button type="button" className="rounded p-1 text-red-700 hover:bg-red-50" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label={t('common.remove')}><Trash2 size={14} /></button>
              </div>
            )}
          </div>
        ))}
        {!disabled && value.length < 10 && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy}
            className="flex aspect-square w-28 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gold bg-cream text-xs text-taupe hover:bg-cream-deep">
            {busy ? <Spinner /> : <ImagePlus className="text-gold" />}{t('admin.upload.add')}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => pick(e.target.files)} />
      <p className="mt-2 text-xs text-taupe">{t('admin.upload.hint')}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ helpers */
/** Runs an async action with a busy flag and toast feedback. */
export function useAction() {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function run<T>(fn: () => Promise<T>, okMsg?: string): Promise<T | undefined> {
    setBusy(true);
    try {
      const r = await fn();
      if (okMsg !== undefined) toast.success(okMsg || t('common.saved'));
      return r;
    } catch (e) {
      toast.error(errorMessage(t, e));
      return undefined;
    } finally { setBusy(false); }
  }
  return { busy, run };
}

export const useLocaleCode = () => useI18n().locale;
