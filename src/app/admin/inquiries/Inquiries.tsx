'use client';
import { useState } from 'react';
import { Mail, MailOpen, MessageCircle, Trash2 } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { api } from '@/lib/client/api';
import { cn } from '@/lib/client/cn';
import { useAdminData } from '@/components/admin/hooks';
import { Badge, Card, ConfirmModal, Empty, ErrorBox, Loading, PageHeader, useAction } from '@/components/admin/ui';
import { formatDateTime } from '@/lib/time';
import { normalizePhone } from '@/lib/phone';

type Msg = { id: number; name: string; email: string; phone: string | null; message: string; isRead: boolean; createdAt: string };

export function Inquiries() {
  const { t, locale } = useI18n();
  const { data, loading, error, reload } = useAdminData<Msg[]>('/api/admin/inquiries');
  const { busy, run } = useAction();
  const [del, setDel] = useState<Msg | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const rows = (data ?? []).filter((m) => filter === 'all' || !m.isRead);

  const mark = async (m: Msg, isRead: boolean) => { if (await run(() => api(`/api/admin/inquiries/${m.id}`, { method: 'PATCH', body: { isRead } }))) reload(); };
  return (
    <>
      <PageHeader title={t('admin.inquiries.title')} subtitle={t('admin.inquiries.subtitle')}
        actions={<div className="flex gap-1">{(['all', 'unread'] as const).map((k) => <button key={k} type="button" onClick={() => setFilter(k)} className={cn('rounded-full px-4 py-1.5 text-sm font-semibold', filter === k ? 'bg-mauve text-white' : 'bg-white text-taupe hover:bg-cream-deep')}>{t(k === 'all' ? 'common.all' : 'admin.inquiries.unread')}</button>)}</div>} />
      {error ? <ErrorBox error={error} /> : loading && !data ? <Loading /> : !rows.length ? <div className="card"><Empty /></div> : (
        <div className="space-y-3">
          {rows.map((m) => {
            const p = normalizePhone(m.phone ?? '');
            return (
              <Card key={m.id} className={cn(!m.isRead && 'ring-2 ring-mauve/30')}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 font-semibold">{m.name}{!m.isRead && <Badge tone="mauve">{t('admin.inquiries.new')}</Badge>}</p>
                    <p className="text-xs text-taupe">{m.email}{m.phone ? ` · ${m.phone}` : ''} · {formatDateTime(m.createdAt, locale)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a className="btn-outline btn-sm" href={`mailto:${m.email}`} onClick={() => !m.isRead && mark(m, true)}><Mail size={14} /> {t('admin.inquiries.reply')}</a>
                    {p.valid && <a className="btn-outline btn-sm" href={`https://wa.me/${p.wa}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> WhatsApp</a>}
                    <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => mark(m, !m.isRead)}><MailOpen size={14} /> {m.isRead ? t('admin.inquiries.markUnread') : t('admin.inquiries.markRead')}</button>
                    <button type="button" className="btn-ghost btn-sm text-red-700" onClick={() => setDel(m)} aria-label={t('common.delete')}><Trash2 size={14} /></button>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
              </Card>
            );
          })}
        </div>
      )}
      <ConfirmModal open={!!del} danger title={t('common.delete')} text={t('admin.inquiries.deleteText')} busy={busy} onClose={() => setDel(null)}
        onConfirm={async () => { if (del && (await run(() => api(`/api/admin/inquiries/${del.id}`, { method: 'DELETE' }), t('common.saved')))) { setDel(null); reload(); } }} />
    </>
  );
}
