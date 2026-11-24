'use client';
import { useState } from 'react';
import { Ban, Check, Plus, Save, X } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { api } from '@/lib/client/api';
import { cn } from '@/lib/client/cn';
import { useAdminData } from '@/components/admin/hooks';
import { Badge, Card, ErrorBox, Field, Loading, MoneyInput, PageHeader, Spinner, Switch, useAction } from '@/components/admin/ui';

type Suco = { id: number; zoneId: number; name: string; codEnabled: boolean; isActive: boolean };
type Zone = { id: number; municipality: string; adminPost: string | null; name: string; codEnabled: boolean; deliveryFeeCents: number; freeOverCents: number | null; etaText: string | null; sortOrder: number; isActive: boolean; sucos: Suco[] };

export function Zones() {
  const { t } = useI18n();
  const { data, loading, error, reload } = useAdminData<Zone[]>('/api/admin/zones');
  if (error) return <ErrorBox error={error} />;
  if (loading && !data) return <Loading />;
  const dili = (data ?? []).filter((z) => z.municipality === 'dili');
  const others = (data ?? []).filter((z) => z.municipality !== 'dili');
  return (
    <>
      <PageHeader title={t('admin.zones.title')} subtitle={t('admin.zones.subtitle')} />
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t('admin.zones.codRule')}</div>

      <h2 className="mb-3 text-2xl">{t('admin.zones.diliTitle')}</h2>
      <div className="mb-10 grid gap-5 xl:grid-cols-2">{dili.map((z) => <DiliZone key={z.id} zone={z} onSaved={reload} />)}</div>

      <h2 className="mb-3 text-2xl">{t('admin.zones.othersTitle')}</h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-cream"><tr className="text-left text-[11px] uppercase tracking-wider text-taupe">
            <th className="px-4 py-2.5">{t('admin.zones.municipality')}</th><th className="px-4 py-2.5">{t('admin.zones.fee')}</th><th className="px-4 py-2.5">{t('admin.zones.freeOver')}</th>
            <th className="px-4 py-2.5">{t('admin.zones.eta')}</th><th className="px-4 py-2.5">COD</th><th className="px-4 py-2.5">{t('admin.common.active')}</th><th className="px-4 py-2.5" />
          </tr></thead>
          <tbody>{others.map((z) => <OtherRow key={z.id} zone={z} onSaved={reload} />)}</tbody>
        </table>
      </div>
    </>
  );
}

function useZoneDraft(zone: Zone, onSaved: () => void) {
  const { t } = useI18n();
  const [d, setD] = useState({ name: zone.name, codEnabled: zone.codEnabled, deliveryFeeCents: zone.deliveryFeeCents, freeOverCents: zone.freeOverCents, etaText: zone.etaText ?? '', isActive: zone.isActive });
  const { busy, run } = useAction();
  const dirty = JSON.stringify(d) !== JSON.stringify({ name: zone.name, codEnabled: zone.codEnabled, deliveryFeeCents: zone.deliveryFeeCents, freeOverCents: zone.freeOverCents, etaText: zone.etaText ?? '', isActive: zone.isActive });
  const save = async () => { if (await run(() => api(`/api/admin/zones/${zone.id}`, { method: 'PUT', body: { ...d, etaText: d.etaText || null } }), t('common.saved'))) onSaved(); };
  return { d, setD, busy, dirty, save };
}

function DiliZone({ zone, onSaved }: { zone: Zone; onSaved: () => void }) {
  const { t } = useI18n();
  const { d, setD, busy, dirty, save } = useZoneDraft(zone, onSaved);
  const { busy: sBusy, run } = useAction();
  const [newSuco, setNewSuco] = useState('');
  const toggleSuco = async (s: Suco) => { if (await run(() => api(`/api/admin/sucos/${s.id}`, { method: 'PUT', body: { name: s.name, codEnabled: !s.codEnabled, isActive: s.isActive } }))) onSaved(); };
  const removeSuco = async (s: Suco) => { if (await run(() => api(`/api/admin/sucos/${s.id}`, { method: 'DELETE' }))) onSaved(); };
  const addSuco = async () => { const name = newSuco.trim(); if (name.length < 2) return; if (await run(() => api(`/api/admin/zones/${zone.id}/sucos`, { body: { name, codEnabled: true } }), t('common.saved'))) { setNewSuco(''); onSaved(); } };

  return (
    <Card title={<span className="flex items-center gap-2">{zone.name}{d.codEnabled ? <Badge tone="green"><Check size={11} className="mr-1" />COD</Badge> : <Badge tone="gray"><Ban size={11} className="mr-1" />COD</Badge>}</span>}
      actions={<button type="button" className="btn-primary btn-sm" disabled={!dirty || busy} onClick={save}>{busy ? <Spinner className="!text-white" /> : <Save size={14} />} {t('common.save')}</button>}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t('admin.zones.fee')}><MoneyInput cents={d.deliveryFeeCents} onChange={(c) => setD({ ...d, deliveryFeeCents: c ?? 0 })} /></Field>
        <Field label={t('admin.zones.freeOver')}><MoneyInput cents={d.freeOverCents} allowEmpty placeholder="—" onChange={(c) => setD({ ...d, freeOverCents: c })} /></Field>
        <Field label={`${t('admin.zones.eta')} (${t('common.days')})`}><input className="input" value={d.etaText} maxLength={40} placeholder="1-2" onChange={(e) => setD({ ...d, etaText: e.target.value })} /></Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-6">
        <Switch checked={d.codEnabled} onChange={(codEnabled) => setD({ ...d, codEnabled })} label={<b>{t('admin.zones.codEnabled')}</b>} />
        <Switch checked={d.isActive} onChange={(isActive) => setD({ ...d, isActive })} label={t('admin.zones.deliveryActive')} />
      </div>

      <div className="mt-5 border-t border-cream-line pt-4">
        <p className="label">{t('admin.zones.sucos', { n: zone.sucos.length })}</p>
        <p className="mb-2 text-xs text-taupe">{t('admin.zones.sucoHint')}</p>
        <ul className="flex flex-wrap gap-2">
          {zone.sucos.map((s) => (
            <li key={s.id} className={cn('flex items-center overflow-hidden rounded-full border text-xs', s.codEnabled ? 'border-emerald-300 bg-emerald-50' : 'border-cream-line bg-cream-deep text-taupe')}>
              <button type="button" disabled={sBusy} onClick={() => toggleSuco(s)} className="px-3 py-1.5 font-medium hover:underline" title={t('admin.zones.toggleSuco')}>{s.name}{!s.codEnabled && <span className="ml-1 text-[10px] uppercase">· {t('admin.zones.noCod')}</span>}</button>
              <button type="button" disabled={sBusy} onClick={() => removeSuco(s)} className="border-l border-black/5 px-2 py-1.5 text-taupe hover:bg-red-100 hover:text-red-700" aria-label={t('common.remove')}><X size={12} /></button>
            </li>
          ))}
        </ul>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void addSuco(); }}>
          <input className="input" value={newSuco} maxLength={80} placeholder={t('admin.zones.addSuco')} onChange={(e) => setNewSuco(e.target.value)} />
          <button type="submit" className="btn-outline btn-sm" disabled={sBusy || newSuco.trim().length < 2}><Plus size={14} /> {t('common.add')}</button>
        </form>
      </div>
    </Card>
  );
}

function OtherRow({ zone, onSaved }: { zone: Zone; onSaved: () => void }) {
  const { t } = useI18n();
  const { d, setD, busy, dirty, save } = useZoneDraft(zone, onSaved);
  return (
    <tr className="border-t border-cream-line">
      <td className="px-4 py-3 font-semibold">{zone.name}</td>
      <td className="px-4 py-3"><MoneyInput className="w-28" cents={d.deliveryFeeCents} onChange={(c) => setD({ ...d, deliveryFeeCents: c ?? 0 })} /></td>
      <td className="px-4 py-3"><MoneyInput className="w-28" cents={d.freeOverCents} allowEmpty placeholder="—" onChange={(c) => setD({ ...d, freeOverCents: c })} /></td>
      <td className="px-4 py-3"><input className="input w-24" value={d.etaText} maxLength={40} placeholder="3-5" onChange={(e) => setD({ ...d, etaText: e.target.value })} /></td>
      <td className="px-4 py-3"><span title={t('admin.zones.codDiliOnly')}><Switch checked={false} disabled onChange={() => undefined} label={<span className="text-xs text-taupe">{t('admin.zones.codDiliOnlyShort')}</span>} /></span></td>
      <td className="px-4 py-3"><Switch checked={d.isActive} onChange={(isActive) => setD({ ...d, isActive })} /></td>
      <td className="px-4 py-3 text-right"><button type="button" className="btn-primary btn-sm" disabled={!dirty || busy} onClick={save}>{busy ? <Spinner className="!text-white" /> : <Save size={14} />} {t('common.save')}</button></td>
    </tr>
  );
}
