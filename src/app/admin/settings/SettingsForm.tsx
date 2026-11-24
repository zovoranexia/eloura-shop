'use client';
import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { ApiError, api, fieldMessage } from '@/lib/client/api';
import { useAdminData } from '@/components/admin/hooks';
import { Card, ErrorBox, Field, LangTabs, Loading, MoneyInput, PageHeader, Spinner, useAction } from '@/components/admin/ui';

type Settings = {
  store: { name: string; tagline: Record<string, string>; email: string; phone: string; whatsapp: string; address: string; instagram: string; facebook: string; tiktok: string; returnDays: number };
  commerce: { paymentDeadlineHours: number; codMinCents: number; codMaxCents: number; codFeeCents: number; codAutoBlockAfter: number; lowStockThreshold: number; maxQtyPerLine: number; codTermsVersion: string };
};

export function SettingsForm() {
  const { t } = useI18n();
  const { data, loading, error } = useAdminData<Settings>('/api/admin/settings');
  const [s, setS] = useState<Settings | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const { busy, run } = useAction();
  useEffect(() => { if (data) setS(data); }, [data]);
  if (error) return <ErrorBox error={error} />;
  if (loading || !s) return <Loading />;

  const store = (k: keyof Settings['store'], v: string | number | Record<string, string>) => setS({ ...s, store: { ...s.store, [k]: v } });
  const com = (k: keyof Settings['commerce'], v: string | number) => setS({ ...s, commerce: { ...s.commerce, [k]: v } });
  const num = (k: keyof Settings['commerce'], min = 0) => (e: React.ChangeEvent<HTMLInputElement>) => com(k, Math.max(min, Math.floor(Number(e.target.value) || 0)));
  const e = (k: string) => (errs[k] ? fieldMessage(t, errs[k]) : undefined);

  async function save() {
    if (!s) return;
    setErrs({});
    await run(async () => {
      try { return await api('/api/admin/settings', { method: 'PUT', body: s }); }
      catch (err) { if (err instanceof ApiError) setErrs(err.fields); throw err; }
    }, t('common.saved'));
  }

  return (
    <>
      <PageHeader title={t('admin.settings.title')} subtitle={t('admin.settings.subtitle')}
        actions={<button type="button" className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner className="!text-white" /> : <Save size={16} />} {t('common.save')}</button>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={t('admin.settings.storeInfo')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('admin.settings.storeName')} error={e('store.name')}><input className="input" value={s.store.name} onChange={(ev) => store('name', ev.target.value)} /></Field>
            <Field label={t('common.email')} error={e('store.email')}><input type="email" className="input" value={s.store.email} onChange={(ev) => store('email', ev.target.value)} /></Field>
            <Field label={t('common.phone')}><input className="input" value={s.store.phone} onChange={(ev) => store('phone', ev.target.value)} /></Field>
            <Field label="WhatsApp"><input className="input" value={s.store.whatsapp} onChange={(ev) => store('whatsapp', ev.target.value)} /></Field>
            <Field label={t('admin.settings.address')} className="sm:col-span-2"><input className="input" value={s.store.address} onChange={(ev) => store('address', ev.target.value)} /></Field>
            <div className="sm:col-span-2"><LangTabs label={t('admin.settings.tagline')} value={s.store.tagline} onChange={(v) => store('tagline', v)} /></div>
            <Field label="Instagram"><input className="input" value={s.store.instagram} onChange={(ev) => store('instagram', ev.target.value)} placeholder="https://instagram.com/…" /></Field>
            <Field label="Facebook"><input className="input" value={s.store.facebook} onChange={(ev) => store('facebook', ev.target.value)} placeholder="https://facebook.com/…" /></Field>
            <Field label="TikTok"><input className="input" value={s.store.tiktok} onChange={(ev) => store('tiktok', ev.target.value)} placeholder="https://tiktok.com/@…" /></Field>
            <Field label={t('admin.settings.returnDays')}><input type="number" min={0} max={90} className="input" value={s.store.returnDays} onChange={(ev) => store('returnDays', Math.max(0, Math.floor(Number(ev.target.value) || 0)))} /></Field>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title={t('admin.settings.codRules')}>
            <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{t('admin.settings.codRulesHint')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('admin.settings.codMin')} error={e('commerce.codMinCents')}><MoneyInput cents={s.commerce.codMinCents} onChange={(c) => com('codMinCents', c ?? 0)} /></Field>
              <Field label={t('admin.settings.codMax')} error={e('commerce')}><MoneyInput cents={s.commerce.codMaxCents} onChange={(c) => com('codMaxCents', c ?? 0)} /></Field>
              <Field label={t('admin.settings.codFee')} hint={t('admin.settings.codFeeHint')}><MoneyInput cents={s.commerce.codFeeCents} onChange={(c) => com('codFeeCents', c ?? 0)} /></Field>
              <Field label={t('admin.settings.codAutoBlock')} hint={t('admin.settings.codAutoBlockHint')}><input type="number" min={0} max={20} className="input" value={s.commerce.codAutoBlockAfter} onChange={num('codAutoBlockAfter')} /></Field>
              <Field label={t('admin.settings.codTermsVersion')} hint={t('admin.settings.codTermsVersionHint')} className="sm:col-span-2"><input className="input" maxLength={20} value={s.commerce.codTermsVersion} onChange={(ev) => com('codTermsVersion', ev.target.value)} /></Field>
            </div>
            <p className="mt-3 text-xs text-taupe">{t('admin.settings.zonesNote')}</p>
          </Card>
          <Card title={t('admin.settings.operations')}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t('admin.settings.deadline')} hint={t('admin.settings.deadlineHint')}><input type="number" min={1} max={168} className="input" value={s.commerce.paymentDeadlineHours} onChange={num('paymentDeadlineHours', 1)} /></Field>
              <Field label={t('admin.settings.lowStock')}><input type="number" min={0} className="input" value={s.commerce.lowStockThreshold} onChange={num('lowStockThreshold')} /></Field>
              <Field label={t('admin.settings.maxQty')}><input type="number" min={1} max={50} className="input" value={s.commerce.maxQtyPerLine} onChange={num('maxQtyPerLine', 1)} /></Field>
            </div>
            <p className="mt-3 text-xs text-taupe">{t('admin.settings.currencyNote')}</p>
          </Card>
        </div>
      </div>
    </>
  );
}
