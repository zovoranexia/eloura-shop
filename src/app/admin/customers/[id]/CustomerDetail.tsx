'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Ban, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { api } from '@/lib/client/api';
import { useAdminData } from '@/components/admin/hooks';
import { useAdminUser } from '@/components/admin/AdminUser';
import { Badge, Card, ConfirmModal, Empty, ErrorBox, Field, Loading, MethodBadge, Modal, OrderStatusBadge, PageHeader, PaymentStatusBadge, TableWrap, td, th, trCls, useAction } from '@/components/admin/ui';
import { areaLabel } from '@/components/admin/constants';
import { formatDate, formatDateTime } from '@/lib/time';
import { formatUSD } from '@/lib/money';

type Detail = {
  id: number; name: string; email: string; phone: string | null; isActive: boolean; locale: string; createdAt: string; lastLoginAt: string | null;
  codBlocked: boolean; codBlockedReason: string | null; codRefusals: number;
  addresses: { id: number; label: string | null; recipient: string; phone: string; municipality: string; adminPost: string | null; suco: string | null; street: string }[];
  orders: { id: number; code: string; status: string; paymentStatus: string; paymentMethod: string; totalCents: number; createdAt: string }[];
};

export function CustomerDetail({ id }: { id: number }) {
  const { t, locale } = useI18n();
  const { can } = useAdminUser();
  const { data, error, reload } = useAdminData<Detail>(`/api/admin/customers/${id}`);
  const { busy, run } = useAction();
  const [flagOpen, setFlagOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [toggleOpen, setToggleOpen] = useState(false);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;

  const setFlag = async (blocked: boolean) => {
    const r = await run(() => api(`/api/admin/customers/${id}/cod-flag`, { body: { blocked, reason: reason.trim() || undefined } }), t('admin.customers.flagSaved'));
    if (r) { setFlagOpen(false); setReason(''); reload(); }
  };
  const setActive = async () => {
    const r = await run(() => api(`/api/admin/customers/${id}`, { method: 'PATCH', body: { isActive: !data.isActive } }), t('common.saved'));
    if (r) { setToggleOpen(false); reload(); }
  };

  return (
    <>
      <PageHeader title={data.name} subtitle={data.email} actions={<Link href="/admin/customers" className="btn-ghost btn-sm"><ArrowLeft size={14} /> {t('common.back')}</Link>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card title={t('admin.customers.profile')}>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-taupe">{t('common.phone')}</dt><dd>{data.phone ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-taupe">{t('common.language')}</dt><dd className="uppercase">{data.locale}</dd></div>
              <div className="flex justify-between"><dt className="text-taupe">{t('admin.customers.joined')}</dt><dd>{formatDate(data.createdAt, locale)}</dd></div>
              <div className="flex justify-between"><dt className="text-taupe">{t('admin.customers.lastLogin')}</dt><dd>{formatDateTime(data.lastLoginAt, locale)}</dd></div>
              <div className="flex justify-between"><dt className="text-taupe">{t('common.status')}</dt><dd>{data.isActive ? <Badge tone="green">{t('admin.common.active')}</Badge> : <Badge>{t('admin.common.inactive')}</Badge>}</dd></div>
            </dl>
            {can('customers.manage') && <button type="button" className="btn-outline btn-sm mt-4" onClick={() => setToggleOpen(true)}>{data.isActive ? <UserX size={14} /> : <UserCheck size={14} />} {data.isActive ? t('admin.customers.deactivate') : t('admin.customers.activate')}</button>}
          </Card>

          <Card title={<span className="flex items-center gap-2"><Ban size={18} className={data.codBlocked ? 'text-red-600' : 'text-taupe'} />{t('admin.customers.codControl')}</span>}>
            <p className="text-sm">{data.codBlocked ? <Badge tone="red">{t('admin.customers.codBlocked')}</Badge> : <Badge tone="green"><ShieldCheck size={12} className="mr-1" />{t('admin.customers.codAllowed')}</Badge>}</p>
            <p className="mt-2 text-sm text-taupe">{t('admin.customers.refusals', { n: data.codRefusals })}</p>
            {data.codBlockedReason && <p className="mt-1 text-xs text-taupe">“{data.codBlockedReason}”</p>}
            <p className="mt-2 text-xs text-taupe">{t('admin.customers.codHint')}</p>
            {can('cod.flag_customers') && (
              <button type="button" className={data.codBlocked ? 'btn-outline btn-sm mt-4' : 'btn-danger btn-sm mt-4'} onClick={() => (data.codBlocked ? setFlag(false) : setFlagOpen(true))} disabled={busy}>
                {data.codBlocked ? t('admin.customers.unflag') : t('admin.customers.flag')}
              </button>
            )}
          </Card>

          <Card title={t('admin.customers.addresses')}>
            {!data.addresses.length ? <p className="text-sm text-taupe">{t('common.noResults')}</p> : (
              <ul className="space-y-3 text-sm">
                {data.addresses.map((a) => <li key={a.id}><p className="font-semibold">{a.label || a.recipient}</p><p className="text-taupe">{a.street}, {areaLabel(a)}<br />{a.recipient} · {a.phone}</p></li>)}
              </ul>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title={t('admin.customers.orders')} pad={false}>
            {!data.orders.length ? <Empty /> : (
              <TableWrap>
                <thead className="bg-cream"><tr><th className={th}>{t('admin.orders.order')}</th><th className={th}>{t('common.date')}</th><th className={th}>{t('admin.orders.method')}</th><th className={`${th} text-right`}>{t('common.total')}</th><th className={th}>{t('common.status')}</th><th className={th}>{t('admin.orders.payment')}</th></tr></thead>
                <tbody>
                  {data.orders.map((o) => (
                    <tr key={o.id} className={trCls}>
                      <td className={td}><Link href={`/admin/orders/${o.id}`} className="font-semibold text-mauve hover:underline">{o.code}</Link></td>
                      <td className={`${td} text-taupe`}>{formatDateTime(o.createdAt, locale)}</td><td className={td}><MethodBadge method={o.paymentMethod} /></td>
                      <td className={`${td} text-right font-semibold`}>{formatUSD(o.totalCents)}</td><td className={td}><OrderStatusBadge status={o.status} /></td><td className={td}><PaymentStatusBadge status={o.paymentStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </Card>
        </div>
      </div>

      <Modal open={flagOpen} onClose={() => setFlagOpen(false)} title={t('admin.customers.flag')} size="sm"
        footer={<><button type="button" className="btn-ghost" onClick={() => setFlagOpen(false)}>{t('common.cancel')}</button><button type="button" className="btn-danger" disabled={busy} onClick={() => setFlag(true)}>{t('admin.customers.flag')}</button></>}>
        <p className="mb-3 text-sm text-taupe">{t('admin.customers.flagText')}</p>
        <Field label={t('admin.orders.reason')}><input className="input" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} /></Field>
      </Modal>
      <ConfirmModal open={toggleOpen} title={data.isActive ? t('admin.customers.deactivate') : t('admin.customers.activate')} text={data.isActive ? t('admin.customers.deactivateText') : t('admin.customers.activateText')}
        danger={data.isActive} busy={busy} onClose={() => setToggleOpen(false)} onConfirm={setActive} />
    </>
  );
}
