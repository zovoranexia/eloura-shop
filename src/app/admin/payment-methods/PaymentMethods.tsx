'use client';
import { useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, CreditCard, Landmark, Save, Smartphone } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { ApiError, api, fieldMessage } from '@/lib/client/api';
import { useAdminData } from '@/components/admin/hooks';
import { Badge, Card, ErrorBox, Field, ImageUploader, LangTabs, Loading, PageHeader, Spinner, Switch, useAction } from '@/components/admin/ui';

type Cfg = { bankName?: string; accountHolder?: string; accountNumber?: string; branch?: string; swift?: string; merchantName?: string; merchantNumber?: string; qrImage?: string };
type Method = { key: 'BANK_BNCTL' | 'ATM_BNCTL' | 'TPAY' | 'MOSAN' | 'COD'; enabled: boolean; sortOrder: number; name: Record<string, string>; instructions: Record<string, string>; config: Cfg; configured: boolean };
const ICON = { BANK_BNCTL: Landmark, ATM_BNCTL: CreditCard, TPAY: Smartphone, MOSAN: Smartphone, COD: Banknote };

export function PaymentMethods() {
  const { t } = useI18n();
  const { data, loading, error, reload } = useAdminData<Method[]>('/api/admin/payment-methods');
  if (error) return <ErrorBox error={error} />;
  if (loading && !data) return <Loading />;
  return (
    <>
      <PageHeader title={t('admin.payments.methodsTitle')} subtitle={t('admin.payments.methodsSubtitle')} />
      <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">{t('admin.payments.walletNote')}</div>
      <div className="space-y-6">{data?.map((m) => <MethodCard key={m.key} method={m} onSaved={reload} />)}</div>
    </>
  );
}

function MethodCard({ method, onSaved }: { method: Method; onSaved: () => void }) {
  const { t } = useI18n();
  const [m, setM] = useState(method);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const { busy, run } = useAction();
  const Icon = ICON[m.key];
  const isBank = m.key === 'BANK_BNCTL' || m.key === 'ATM_BNCTL';
  const isWallet = m.key === 'TPAY' || m.key === 'MOSAN';
  const cfg = (k: keyof Cfg, v: string) => setM({ ...m, config: { ...m.config, [k]: v } });
  const ce = (k: string) => (errs[`config.${k}`] ? fieldMessage(t, errs[`config.${k}`]) : undefined);

  async function save() {
    setErrs({});
    const r = await run(async () => {
      try { return await api(`/api/admin/payment-methods/${m.key}`, { method: 'PUT', body: { enabled: m.enabled, sortOrder: m.sortOrder, name: m.name, instructions: m.instructions, config: m.config } }); }
      catch (e) { if (e instanceof ApiError) setErrs(e.fields); throw e; }
    }, t('common.saved'));
    if (r) onSaved();
  }

  const needsSetup = m.key !== 'COD' && m.enabled && !method.configured;
  return (
    <Card title={<span className="flex flex-wrap items-center gap-2"><Icon size={20} className="text-mauve" />{t(`status.method.${m.key}`)}{method.configured ? <Badge tone="green"><CheckCircle2 size={11} className="mr-1" />{t('admin.payments.configured')}</Badge> : m.key !== 'COD' ? <Badge tone="amber"><AlertTriangle size={11} className="mr-1" />{t('admin.payments.notConfigured')}</Badge> : null}</span>}
      actions={<button type="button" className="btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? <Spinner className="!text-white" /> : <Save size={14} />} {t('common.save')}</button>}>
      {needsSetup && <p className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{t('admin.payments.hiddenWarn')}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-6">
            <Switch checked={m.enabled} onChange={(enabled) => setM({ ...m, enabled })} label={<b>{t('admin.payments.enabled')}</b>} />
            <Field label={t('admin.categories.order')}><input type="number" min={0} max={99} className="input w-24" value={m.sortOrder} onChange={(e) => setM({ ...m, sortOrder: Math.max(0, Math.min(99, Number(e.target.value) || 0)) })} /></Field>
          </div>
          {isBank && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('admin.payments.bankName')} className="sm:col-span-2" error={ce('bankName')}><input className="input" value={m.config.bankName ?? ''} onChange={(e) => cfg('bankName', e.target.value)} /></Field>
              <Field label={t('admin.payments.accountHolder')} error={ce('accountHolder')}><input className="input" value={m.config.accountHolder ?? ''} onChange={(e) => cfg('accountHolder', e.target.value)} /></Field>
              <Field label={t('admin.payments.accountNumber')} error={ce('accountNumber')}><input className="input font-mono" value={m.config.accountNumber ?? ''} onChange={(e) => cfg('accountNumber', e.target.value)} /></Field>
              <Field label={t('admin.payments.branch')}><input className="input" value={m.config.branch ?? ''} onChange={(e) => cfg('branch', e.target.value)} /></Field>
              <Field label="SWIFT / BIC"><input className="input font-mono uppercase" value={m.config.swift ?? ''} maxLength={20} onChange={(e) => cfg('swift', e.target.value.toUpperCase())} /></Field>
            </div>
          )}
          {isWallet && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('admin.payments.merchantName')}><input className="input" value={m.config.merchantName ?? ''} onChange={(e) => cfg('merchantName', e.target.value)} /></Field>
                <Field label={t('admin.payments.merchantNumber')} error={ce('merchantNumber')} hint="+670 7XXX XXXX"><input className="input font-mono" value={m.config.merchantNumber ?? ''} onChange={(e) => cfg('merchantNumber', e.target.value)} /></Field>
              </div>
              <Field label={t('admin.payments.qr')} hint={t('admin.payments.qrHint')} error={ce('qrImage')}>
                <ImageUploader kind="qr" value={m.config.qrImage || null} onChange={(u) => cfg('qrImage', u ?? '')} />
              </Field>
            </div>
          )}
          {m.key === 'COD' && <p className="rounded-xl bg-cream p-3 text-sm text-taupe">{t('admin.payments.codInfo')}</p>}
        </div>
        <div className="space-y-4">
          <LangTabs label={t('admin.payments.displayName')} value={m.name} onChange={(name) => setM({ ...m, name })} />
          <LangTabs label={t('admin.payments.instructions')} value={m.instructions} onChange={(instructions) => setM({ ...m, instructions })} multiline rows={7} />
        </div>
      </div>
    </Card>
  );
}
