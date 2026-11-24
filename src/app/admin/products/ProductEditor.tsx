'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Save, Trash2, Wand2 } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { ApiError, api, fieldMessage } from '@/lib/client/api';
import { useToast } from '@/components/ui/Toast';
import { useAdminData } from '@/components/admin/hooks';
import { useAdminUser } from '@/components/admin/AdminUser';
import { Card, ConfirmModal, ErrorBox, Field, LangTabs, Loading, MoneyInput, MultiImageUploader, PageHeader, Spinner, Switch, useAction } from '@/components/admin/ui';
import { loc } from '@/lib/i18n-shared';

type V = { id?: number; sku: string; size: string; color: string; colorHex: string; stock: number; priceCents: number | null; isActive: boolean };
type Form = {
  sku: string; slug: string; categoryId: number | null; name: Record<string, string>; description: Record<string, string>;
  priceCents: number; compareAtCents: number | null; isActive: boolean; isFeatured: boolean; images: string[]; variants: V[];
};
type Loaded = Omit<Form, 'variants'> & { id: number; variants: { id: number; sku: string; size: string | null; color: string | null; colorHex: string | null; stock: number; priceCents: number | null; isActive: boolean }[] };

const empty: Form = {
  sku: '', slug: '', categoryId: null, name: {}, description: {}, priceCents: 0, compareAtCents: null, isActive: true, isFeatured: false, images: [],
  variants: [{ sku: '', size: '', color: '', colorHex: '', stock: 0, priceCents: null, isActive: true }],
};

export function ProductEditor({ id }: { id?: number }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const { can } = useAdminUser();
  const ro = !can(id ? 'products.update' : 'products.create');
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [delOpen, setDelOpen] = useState(false);
  const [gen, setGen] = useState({ sizes: '', colors: '' });
  const { busy, run } = useAction();
  const cats = useAdminData<{ id: number; name: Record<string, string> }[]>('/api/admin/categories');
  const loaded = useAdminData<Loaded>(`/api/admin/products/${id}`, {}, !!id);

  useEffect(() => {
    const p = loaded.data;
    if (!p) return;
    setForm({
      sku: p.sku, slug: p.slug, categoryId: p.categoryId, name: p.name ?? {}, description: p.description ?? {}, priceCents: p.priceCents, compareAtCents: p.compareAtCents,
      isActive: p.isActive, isFeatured: p.isFeatured, images: p.images,
      variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size ?? '', color: v.color ?? '', colorHex: v.colorHex ?? '', stock: v.stock, priceCents: v.priceCents, isActive: v.isActive })),
    });
  }, [loaded.data]);

  if (id && loaded.error) return <ErrorBox error={loaded.error} />;
  if (id && loaded.loading && !loaded.data) return <Loading />;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setVariant = (i: number, patch: Partial<V>) => setForm((f) => ({ ...f, variants: f.variants.map((v, k) => (k === i ? { ...v, ...patch } : v)) }));
  const err = (k: string) => fieldMessage(t, errors[k]);

  function generate() {
    const sizes = gen.sizes.split(',').map((s) => s.trim()).filter(Boolean);
    const colors = gen.colors.split(',').map((s) => s.trim()).filter(Boolean);
    const rows: V[] = [];
    for (const c of colors.length ? colors : ['']) for (const s of sizes.length ? sizes : ['']) {
      const sku = [form.sku, s, c && c.slice(0, 3).toUpperCase()].filter(Boolean).join('-');
      if (!form.variants.some((v) => v.sku === sku) && sku) rows.push({ sku, size: s, color: c, colorHex: '', stock: 0, priceCents: null, isActive: true });
    }
    if (!rows.length) return;
    setForm((f) => ({ ...f, variants: [...f.variants.filter((v) => v.sku || v.id), ...rows] }));
    setGen({ sizes: '', colors: '' });
  }

  async function save() {
    setErrors({});
    const body = {
      sku: form.sku.trim(), slug: form.slug.trim() || undefined, categoryId: form.categoryId, name: form.name, description: form.description,
      priceCents: form.priceCents, compareAtCents: form.compareAtCents || null, isActive: form.isActive, isFeatured: form.isFeatured, images: form.images,
      variants: form.variants.map((v) => ({ id: v.id, sku: v.sku.trim(), size: v.size.trim() || null, color: v.color.trim() || null, colorHex: v.colorHex || null, stock: v.stock, priceCents: v.priceCents, isActive: v.isActive })),
    };
    const r = await run(async () => {
      try {
        return id ? await api<{ id: number }>(`/api/admin/products/${id}`, { method: 'PUT', body }) : await api<{ id: number }>('/api/admin/products', { body });
      } catch (e) {
        if (e instanceof ApiError && e.fields && Object.keys(e.fields).length) setErrors(e.fields);
        throw e;
      }
    }, t('common.saved'));
    if (r) { if (id) loaded.reload(); else router.replace(`/admin/products/${r.id}`); }
  }

  async function remove() {
    const r = await run(() => api<{ result: 'deleted' | 'deactivated' }>(`/api/admin/products/${id}`, { method: 'DELETE' }));
    if (r) { toast.success(t(r.result === 'deleted' ? 'admin.products.deleted' : 'admin.products.deactivated')); router.replace('/admin/products'); }
  }

  const nameErr = errors.name ? fieldMessage(t, errors.name) : undefined;
  return (
    <>
      <PageHeader title={id ? (loc(form.name, locale) || t('admin.products.edit')) : t('admin.products.new')} subtitle={id ? form.sku : undefined}
        actions={<>
          <Link href="/admin/products" className="btn-ghost btn-sm"><ArrowLeft size={14} /> {t('common.back')}</Link>
          {id && can('products.delete') && <button type="button" className="btn-outline btn-sm !border-red-300 !text-red-700" onClick={() => setDelOpen(true)}><Trash2 size={14} /> {t('common.delete')}</button>}
          {!ro && <button type="button" className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner className="!text-white" /> : <Save size={16} />} {t('common.save')}</button>}
        </>} />
      {ro && <p className="mb-4 rounded-xl bg-cream-deep px-4 py-2 text-sm text-taupe">{t('admin.products.readOnly')}</p>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <Card title={t('admin.products.content')}>
            <div className="space-y-5">
              <LangTabs label={t('admin.products.name')} value={form.name} onChange={(v) => set('name', v)} error={nameErr} disabled={ro} />
              <LangTabs label={t('admin.products.description')} value={form.description} onChange={(v) => set('description', v)} multiline rows={5} disabled={ro} />
              <p className="text-xs text-taupe">{t('admin.products.langHint')}</p>
            </div>
          </Card>

          <Card title={t('admin.products.images')}><MultiImageUploader value={form.images} onChange={(v) => set('images', v)} disabled={ro} /></Card>

          <Card title={t('admin.products.variants')} pad={false}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-cream"><tr className="text-left text-[11px] uppercase tracking-wider text-taupe">
                  <th className="px-3 py-2">SKU</th><th className="px-3 py-2">{t('admin.products.size')}</th><th className="px-3 py-2">{t('admin.products.color')}</th><th className="px-3 py-2">{t('admin.products.hex')}</th>
                  <th className="px-3 py-2">{t('admin.products.stock')}</th><th className="px-3 py-2">{t('admin.products.priceOverride')}</th><th className="px-3 py-2">{t('admin.common.active')}</th><th className="px-3 py-2" />
                </tr></thead>
                <tbody>
                  {form.variants.map((v, i) => (
                    <tr key={v.id ?? `n${i}`} className="border-t border-cream-line">
                      <td className="px-3 py-2"><input className="input min-w-[130px]" value={v.sku} disabled={ro} onChange={(e) => setVariant(i, { sku: e.target.value })} /></td>
                      <td className="px-3 py-2"><input className="input w-20" value={v.size} disabled={ro} onChange={(e) => setVariant(i, { size: e.target.value })} /></td>
                      <td className="px-3 py-2"><input className="input w-28" value={v.color} disabled={ro} onChange={(e) => setVariant(i, { color: e.target.value })} /></td>
                      <td className="px-3 py-2"><div className="flex items-center gap-1.5"><input type="color" className="h-9 w-9 rounded border border-cream-line" value={v.colorHex || '#cccccc'} disabled={ro} onChange={(e) => setVariant(i, { colorHex: e.target.value })} aria-label={t('admin.products.hex')} />
                        {v.colorHex && !ro && <button type="button" className="text-xs text-taupe underline" onClick={() => setVariant(i, { colorHex: '' })}>×</button>}</div></td>
                      <td className="px-3 py-2"><input type="number" min={0} className="input w-24" value={v.stock} disabled={ro} onChange={(e) => setVariant(i, { stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} /></td>
                      <td className="px-3 py-2"><MoneyInput className="w-28" cents={v.priceCents} allowEmpty disabled={ro} placeholder="—" onChange={(c) => setVariant(i, { priceCents: c })} /></td>
                      <td className="px-3 py-2"><Switch checked={v.isActive} disabled={ro} onChange={(c) => setVariant(i, { isActive: c })} /></td>
                      <td className="px-3 py-2 text-right">{!ro && form.variants.length > 1 && <button type="button" className="rounded p-1.5 text-red-700 hover:bg-red-50" onClick={() => set('variants', form.variants.filter((_, k) => k !== i))} aria-label={t('common.remove')}><Trash2 size={15} /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {err('variants') && <p className="field-error px-5 pb-2">{err('variants')}</p>}
            {!ro && (
              <div className="flex flex-wrap items-end gap-3 border-t border-cream-line bg-cream/60 p-4">
                <button type="button" className="btn-outline btn-sm" onClick={() => set('variants', [...form.variants, { sku: '', size: '', color: '', colorHex: '', stock: 0, priceCents: null, isActive: true }])}><Plus size={14} /> {t('admin.products.addVariant')}</button>
                <div className="ml-auto flex flex-wrap items-end gap-2">
                  <Field label={t('admin.products.genSizes')}><input className="input w-40" placeholder="S, M, L" value={gen.sizes} onChange={(e) => setGen({ ...gen, sizes: e.target.value })} /></Field>
                  <Field label={t('admin.products.genColors')}><input className="input w-40" placeholder="Beige, Black" value={gen.colors} onChange={(e) => setGen({ ...gen, colors: e.target.value })} /></Field>
                  <button type="button" className="btn-dark btn-sm" disabled={!gen.sizes.trim() && !gen.colors.trim()} onClick={generate}><Wand2 size={14} /> {t('admin.products.generate')}</button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card title={t('admin.products.pricing')}>
            <div className="space-y-4">
              <Field label={t('admin.products.price')} error={err('priceCents')}><MoneyInput cents={form.priceCents} disabled={ro} onChange={(c) => set('priceCents', c ?? 0)} /></Field>
              <Field label={t('admin.products.compareAt')} error={err('compareAtCents')} hint={t('admin.products.compareHint')}><MoneyInput cents={form.compareAtCents} allowEmpty disabled={ro} onChange={(c) => set('compareAtCents', c)} /></Field>
            </div>
          </Card>
          <Card title={t('admin.products.organization')}>
            <div className="space-y-4">
              <Field label="SKU" error={err('sku')}><input className="input" value={form.sku} disabled={ro} onChange={(e) => set('sku', e.target.value)} /></Field>
              <Field label={t('admin.products.slug')} hint={t('admin.products.slugHint')}><input className="input" value={form.slug} disabled={ro} onChange={(e) => set('slug', e.target.value)} placeholder="auto" /></Field>
              <Field label={t('admin.products.category')} error={err('categoryId')}>
                <select className="input" value={form.categoryId ?? ''} disabled={ro} onChange={(e) => set('categoryId', e.target.value ? Number(e.target.value) : null)}>
                  <option value="">—</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{loc(c.name, locale)}</option>)}
                </select>
              </Field>
              <Switch checked={form.isActive} disabled={ro} onChange={(v) => set('isActive', v)} label={t('admin.products.visible')} />
              <Switch checked={form.isFeatured} disabled={ro} onChange={(v) => set('isFeatured', v)} label={t('admin.products.featuredHome')} />
            </div>
          </Card>
        </div>
      </div>
      <ConfirmModal open={delOpen} danger title={t('common.delete')} text={t('admin.products.deleteText')} busy={busy} onClose={() => setDelOpen(false)} onConfirm={remove} />
    </>
  );
}
