'use client';
import { useState } from 'react';
import { KeyRound, Pencil, Plus } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { ApiError, api, fieldMessage } from '@/lib/client/api';
import { cn } from '@/lib/client/cn';
import { useAdminData } from '@/components/admin/hooks';
import { useAdminUser } from '@/components/admin/AdminUser';
import { Badge, Empty, ErrorBox, Field, Loading, Modal, PageHeader, Spinner, Switch, TableWrap, td, th, trCls, useAction } from '@/components/admin/ui';
import { roleLabel } from '@/components/admin/constants';
import { formatDateTime } from '@/lib/time';
import { LOCALES, LOCALE_NAME } from '@/lib/i18n-shared';

type Member = { id: number; name: string; email: string; isActive: boolean; lastLoginAt: string | null; createdAt: string; roles: { key: string; name: string }[] };
type Role = { id: number; key: string; name: string; permissions: string[]; isSystem: boolean };
type Form = { id?: number; name: string; email: string; password: string; roleKeys: string[]; isActive: boolean; locale: string };
const blank: Form = { name: '', email: '', password: '', roleKeys: [], isActive: true, locale: 'tet' };

export function Staff() {
  const { t, locale } = useI18n();
  const { user, can } = useAdminUser();
  const staff = useAdminData<Member[]>('/api/admin/staff');
  const roles = useAdminData<Role[]>('/api/admin/roles');
  const { busy, run } = useAction();
  const [form, setForm] = useState<Form | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const mine = new Set(user.permissions);
  const grantable = (r: Role) => r.key !== 'CUSTOMER' && r.permissions.every((p) => mine.has(p));
  const isSelf = form?.id === user.id;

  async function save() {
    if (!form) return;
    setErrs({});
    const r = await run(async () => {
      try {
        if (form.id) {
          // Send roles / active flag only when they changed: re-sending unchanged roles makes the server re-check "can the actor grant them?",
          // which would wrongly block a name change or password reset on someone holding a role the actor cannot grant.
          const orig = staff.data?.find((m) => m.id === form.id);
          const origRoles = (orig?.roles ?? []).map((r) => r.key).sort().join();
          const rolesChanged = !isSelf && [...form.roleKeys].sort().join() !== origRoles;
          const activeChanged = !isSelf && !!orig && form.isActive !== orig.isActive;
          return await api(`/api/admin/staff/${form.id}`, { method: 'PATCH', body: { name: form.name, isActive: activeChanged ? form.isActive : undefined, roleKeys: rolesChanged ? form.roleKeys : undefined, password: form.password || undefined } });
        }
        return await api('/api/admin/staff', { body: { name: form.name, email: form.email, password: form.password, roleKeys: form.roleKeys, locale: form.locale } });
      } catch (e) { if (e instanceof ApiError) setErrs(e.fields); throw e; }
    }, t('common.saved'));
    if (r) { setForm(null); staff.reload(); }
  }

  const toggleRole = (key: string) => setForm((f) => (f ? { ...f, roleKeys: f.roleKeys.includes(key) ? f.roleKeys.filter((k) => k !== key) : [...f.roleKeys, key] } : f));

  return (
    <>
      <PageHeader title={t('admin.staff.title')} subtitle={t('admin.staff.subtitle')} actions={<button type="button" className="btn-primary" onClick={() => { setErrs({}); setForm(blank); }}><Plus size={16} /> {t('admin.staff.new')}</button>} />
      {staff.error ? <ErrorBox error={staff.error} /> : staff.loading && !staff.data ? <Loading /> : !staff.data?.length ? <div className="card"><Empty /></div> : (
        <TableWrap>
          <thead className="bg-cream"><tr><th className={th}>{t('common.name')}</th><th className={th}>{t('admin.staff.roles')}</th><th className={th}>{t('admin.customers.lastLogin')}</th><th className={th}>{t('common.status')}</th><th className={th} /></tr></thead>
          <tbody>
            {staff.data.map((m) => {
              const locked = m.roles.some((r) => r.key === 'SUPER_ADMIN') && !user.roles.some((r) => r.key === 'SUPER_ADMIN');
              return (
                <tr key={m.id} className={trCls}>
                  <td className={td}><b>{m.name}</b>{m.id === user.id && <Badge tone="mauve" className="ml-2">{t('admin.staff.you')}</Badge>}<div className="text-xs text-taupe">{m.email}</div></td>
                  <td className={td}><div className="flex flex-wrap gap-1.5">{m.roles.map((r) => <Badge key={r.key} tone={r.key === 'SUPER_ADMIN' ? 'mauve' : 'blue'}>{roleLabel(t, r.key, r.name)}</Badge>)}</div></td>
                  <td className={`${td} text-taupe`}>{formatDateTime(m.lastLoginAt, locale)}</td>
                  <td className={td}>{m.isActive ? <Badge tone="green">{t('admin.common.active')}</Badge> : <Badge>{t('admin.common.inactive')}</Badge>}</td>
                  <td className={`${td} text-right`}>
                    <button type="button" className="btn-ghost btn-sm" disabled={locked} title={locked ? t('admin.staff.superLocked') : undefined}
                      onClick={() => { setErrs({}); setForm({ id: m.id, name: m.name, email: m.email, password: '', roleKeys: m.roles.map((r) => r.key), isActive: m.isActive, locale: 'tet' }); }}><Pencil size={14} /> {t('common.edit')}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} size="lg" title={form?.id ? t('admin.staff.edit') : t('admin.staff.new')}
        footer={<><button type="button" className="btn-ghost" onClick={() => setForm(null)}>{t('common.cancel')}</button>
          <button type="button" className="btn-primary" disabled={busy || !form?.name || (!form?.id && (!form?.email || !form?.password)) || (!isSelf && !form?.roleKeys.length)} onClick={save}>{busy && <Spinner className="!text-white" />}{t('common.save')}</button></>}>
        {form && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('common.name')} error={errs.name ? fieldMessage(t, errs.name) : undefined}><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label={t('common.email')} error={errs.email ? fieldMessage(t, errs.email) : undefined}><input type="email" className="input" disabled={!!form.id} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label={form.id ? t('admin.staff.resetPassword') : t('common.password')} hint={form.id ? t('admin.staff.resetHint') : t('admin.staff.passwordHint')} error={errs.password ? fieldMessage(t, errs.password) : undefined}>
                <div className="relative"><KeyRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
                  <input type="password" autoComplete="new-password" className="input pl-9" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              </Field>
              {!form.id && (
                <Field label={t('common.language')}><select className="input" value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })}>{LOCALES.map((l) => <option key={l} value={l}>{LOCALE_NAME[l]}</option>)}</select></Field>
              )}
            </div>
            <div>
              <p className="label">{t('admin.staff.roles')}</p>
              {isSelf && <p className="mb-2 text-xs text-amber-700">{t('admin.staff.selfLocked')}</p>}
              <div className="flex flex-wrap gap-2">
                {(roles.data ?? []).filter((r) => r.key !== 'CUSTOMER').map((r) => {
                  const on = form.roleKeys.includes(r.key);
                  const dis = isSelf || (!on && !grantable(r));
                  return (
                    <button key={r.key} type="button" disabled={dis} onClick={() => toggleRole(r.key)} aria-pressed={on}
                      className={cn('rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40', on ? 'border-mauve bg-mauve text-white' : 'border-cream-line bg-white text-taupe hover:bg-cream-deep')}>
                      {roleLabel(t, r.key, r.name)}
                    </button>
                  );
                })}
              </div>
              {errs.roleKeys && <p className="field-error">{fieldMessage(t, errs.roleKeys)}</p>}
              {!can('roles.manage') && <p className="mt-2 text-xs text-taupe">{t('admin.staff.grantHint')}</p>}
            </div>
            {form.id && <Switch checked={form.isActive} disabled={isSelf} onChange={(isActive) => setForm({ ...form, isActive })} label={t('admin.staff.accountActive')} />}
          </div>
        )}
      </Modal>
    </>
  );
}
