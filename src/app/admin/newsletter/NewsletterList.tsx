'use client';
import { Download } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { useAdminData } from '@/components/admin/hooks';
import { Empty, ErrorBox, Loading, PageHeader, TableWrap, td, th, trCls } from '@/components/admin/ui';
import { formatDateTime } from '@/lib/time';
import { LOCALE_NAME, isLocale } from '@/lib/i18n-shared';

type Row = { id: number; email: string; locale: string | null; createdAt: string };

export function NewsletterList() {
  const { t, locale } = useI18n();
  const { data, loading, error } = useAdminData<Row[]>('/api/admin/newsletter');
  return (
    <>
      <PageHeader title={t('admin.newsletter.title')} subtitle={t('admin.newsletter.subtitle', { n: data?.length ?? 0 })}
        actions={<a className="btn-outline btn-sm" href="/api/admin/newsletter?format=csv"><Download size={14} /> {t('admin.newsletter.csv')}</a>} />
      {error ? <ErrorBox error={error} /> : loading && !data ? <Loading /> : !data?.length ? <div className="card"><Empty /></div> : (
        <TableWrap>
          <thead className="bg-cream"><tr><th className={th}>{t('common.email')}</th><th className={th}>{t('common.language')}</th><th className={th}>{t('common.date')}</th></tr></thead>
          <tbody>{data.map((r) => <tr key={r.id} className={trCls}><td className={td}>{r.email}</td><td className={td}>{r.locale && isLocale(r.locale) ? LOCALE_NAME[r.locale] : '—'}</td><td className={`${td} text-taupe`}>{formatDateTime(r.createdAt, locale)}</td></tr>)}</tbody>
        </TableWrap>
      )}
    </>
  );
}
