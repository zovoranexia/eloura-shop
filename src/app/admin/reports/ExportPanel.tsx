'use client';
import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { Card, Field } from '@/components/admin/ui';
import { addDays, diliDay } from '@/lib/time';

const TYPES = ['orders', 'payments', 'cod', 'revenue'] as const;

export function ExportPanel({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const { t } = useI18n();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to;
  const preset = (days: number) => { setTo(diliDay()); setFrom(addDays(diliDay(), -(days - 1))); };
  return (
    <Card title={t('admin.reports.exports')}>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <Field label={t('common.from')}><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label={t('common.to')}><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <div className="flex gap-1.5 pb-0.5">{[7, 30, 90].map((d) => <button key={d} type="button" className="btn-ghost btn-sm" onClick={() => preset(d)}>{t('admin.reports.lastDays', { n: d })}</button>)}</div>
      </div>
      {!valid && <p className="mb-3 text-sm text-red-700">{t('admin.reports.badRange')}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TYPES.map((k) => (
          <a key={k} aria-disabled={!valid} tabIndex={valid ? undefined : -1} onClick={(e) => { if (!valid) e.preventDefault(); }} className={`card flex flex-col gap-1 p-4 transition-shadow hover:shadow-soft ${valid ? '' : 'pointer-events-none opacity-50'}`}
            href={`/api/admin/reports/export?type=${k}&from=${from}&to=${to}`}>
            <FileSpreadsheet className="text-mauve" size={22} />
            <span className="font-semibold">{t(`admin.reports.type.${k}`)}</span>
            <span className="text-xs text-taupe">{t(`admin.reports.typeHint.${k}`)}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-mauve"><Download size={13} /> CSV</span>
          </a>
        ))}
      </div>
      <p className="mt-4 text-xs text-taupe">{t('admin.reports.note')}</p>
    </Card>
  );
}
