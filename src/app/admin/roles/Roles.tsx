'use client';
import { useEffect, useMemo, useState } from 'react';
import { Lock, Plus, Save, Trash2, Users } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { ApiError, api, errorMessage, fieldMessage } from '@/lib/client/api';
import { cn } from '@/lib/client/cn';
import { useToast } from '@/components/ui/Toast';
import { useAdminData } from '@/components/admin/hooks';
import { useAdminUser } from '@/components/admin/AdminUser';
import { Badge, Card, ConfirmModal, ErrorBox, Field, Loading, Modal, PageHeader, Spinner, useAction } from '@/components/admin/ui';
import { PERMISSION_GROUP_KEYS, roleDescription, roleLabel } from '@/components/admin/constants';

type Role = { id: number; key: string; name: string; description: string | null; isSystem: boolean; userCount: number; permissions: string[] };
type Perm = { key: string; group: string; description: string };

export function Roles() {
  const { t } = useI18n();
  const toast = useToast();
  const { can, user } = useAdminUser();
  const roles = useAdminData<Role[]>('/api/admin/roles');
  const perms = useAdminData<Perm[]>('/api/admin/permissions');
  const [selId, setSelId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ name: string; description: string; permissions: Set<string> } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [delOpen, setDelOpen] = useState(false);
  const { busy, run } = useAction();

  const list = roles.data ?? [];
  const sel = list.find((r) => r.id === selId) ?? null;
  useEffect(() => { if (!selId && list.length) setSelId(list[0].id); }, [list, selId]);
  useEffect(() => { if (sel) { setDraft({ name: sel.name, description: sel.description ?? '', permissions: new Set(sel.permissions) }); setErrs({}); } }, [sel]);

  const groups = useMemo(() => {
    const m = new Map<string, Perm[]>();
    for (const p of perms.data ?? []) m.set(p.group, [...(m.get(p.group) ?? []), p]);
    return [...m];
  }, [perms.data]);

  if (roles.error) return <ErrorBox error={roles.error} />;
  if ((roles.loading && !roles.data) || perms.loading || !perms.data) return <Loading />;

  const editable = can('roles.manage') && !!sel && sel.key !== 'SUPER_ADMIN' && sel.key !== 'CUSTOMER';
  const mine = new Set(user.permissions);
  const toggle = (k: string) => setDraft((d) => { if (!d) return d; const s = new Set(d.permissions); if (s.has(k)) s.delete(k); else s.add(k); return { ...d, permissions: s }; });
  const toggleGroup = (items: Perm[]) => setDraft((d) => {
    if (!d) return d;
    const s = new Set(d.permissions);
    const allOn = items.every((p) => s.has(p.key));
    for (const p of items) { if (allOn) s.delete(p.key); else if (mine.has(p.key)) s.add(p.key); }
    return { ...d, permissions: s };
  });
  const dirty = !!(sel && draft && (draft.name !== sel.name || draft.description !== (sel.description ?? '') || [...draft.permissions].sort().join() !== [...sel.permissions].sort().join()));

  async function save() {
    if (!sel || !draft) return;
    setErrs({});
    const r = await run(async () => {
      try { return await api(`/api/admin/roles/${sel.id}`, { method: 'PUT', body: { name: draft.name, description: draft.description, permissions: [...draft.permissions] } }); }
      catch (e) { if (e instanceof ApiError) setErrs(e.fields); throw e; }
    }, t('admin.roles.saved'));
    if (r) roles.reload();
  }
  async function create() {
    const r = await run(() => api<{ id: number }>('/api/admin/roles', { body: { name: newName.trim(), permissions: [] } }), t('common.saved'));
    if (r) { setCreateOpen(false); setNewName(''); await roles.reload(); setSelId(r.id); }
  }
  async function remove() {
    if (!sel) return;
    try { await api(`/api/admin/roles/${sel.id}`, { method: 'DELETE' }); toast.success(t('common.saved')); setDelOpen(false); setSelId(null); roles.reload(); }
    catch (e) { toast.error(errorMessage(t, e)); setDelOpen(false); }
  }

  return (
    <>
      <PageHeader title={t('admin.roles.title')} subtitle={t('admin.roles.subtitle')}
        actions={can('roles.manage') ? <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> {t('admin.roles.new')}</button> : undefined} />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="card self-start">
          <ul>
            {list.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setSelId(r.id)} className={cn('w-full border-b border-cream-line px-4 py-3 text-left last:border-0', r.id === selId ? 'bg-mauve-soft' : 'hover:bg-cream')}>
                  <div className="flex items-center justify-between gap-2"><span className="font-semibold">{roleLabel(t, r.key, r.name)}</span>
                    {(r.key === 'SUPER_ADMIN' || r.key === 'CUSTOMER') && <Lock size={13} className="text-taupe" />}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-taupe">
                    {r.isSystem ? <Badge tone="mauve">{t('admin.roles.system')}</Badge> : <Badge tone="blue">{t('admin.roles.custom')}</Badge>}
                    <span className="inline-flex items-center gap-1"><Users size={11} />{r.userCount}</span><span>· {r.key === 'SUPER_ADMIN' ? t('admin.roles.all') : r.permissions.length}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {sel && draft && (
          <Card title={roleLabel(t, sel.key, sel.name)}
            actions={<>
              {editable && !sel.isSystem && sel.userCount === 0 && <button type="button" className="btn-ghost btn-sm text-red-700" onClick={() => setDelOpen(true)}><Trash2 size={14} /> {t('common.delete')}</button>}
              {editable && <button type="button" className="btn-primary btn-sm" disabled={!dirty || busy} onClick={save}>{busy ? <Spinner className="!text-white" /> : <Save size={14} />} {t('common.save')}</button>}
            </>}>
            {!editable && <p className="mb-4 flex items-center gap-2 rounded-xl bg-cream p-3 text-sm text-taupe"><Lock size={15} />{sel.key === 'SUPER_ADMIN' || sel.key === 'CUSTOMER' ? t('admin.roles.locked') : t('admin.roles.viewOnly')}</p>}
            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <Field label={t('common.name')} error={errs.name ? fieldMessage(t, errs.name) : undefined}>
                <input className="input" value={sel.isSystem ? roleLabel(t, sel.key, draft.name) : draft.name} disabled={!editable || sel.isSystem} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
              <Field label={t('admin.roles.description')}>
                <input className="input" value={sel.isSystem ? roleDescription(t, sel.key, draft.description) : draft.description} disabled={!editable || sel.isSystem} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
            </div>
            {errs.permissions && <p className="field-error mb-2">{fieldMessage(t, errs.permissions)}</p>}
            <p className="label">{t('admin.roles.matrix')}</p>
            <div className="grid gap-4 md:grid-cols-2">
              {groups.map(([group, items]) => {
                const on = (k: string) => sel.key === 'SUPER_ADMIN' || draft.permissions.has(k);
                const count = items.filter((p) => on(p.key)).length;
                return (
                  <fieldset key={group} className="rounded-2xl border border-cream-line p-4">
                    <legend className="px-2 text-sm font-semibold text-mauve">{t(`admin.roles.groups.${PERMISSION_GROUP_KEYS[group] ?? group}`)} <span className="text-xs font-normal text-taupe">{count}/{items.length}</span></legend>
                    {editable && <button type="button" className="mb-2 text-xs text-mauve underline" onClick={() => toggleGroup(items)}>{count === items.length ? t('admin.roles.clearGroup') : t('admin.roles.selectGroup')}</button>}
                    <ul className="space-y-1.5">
                      {items.map((p) => {
                        const cannotGrant = editable && !mine.has(p.key) && !draft.permissions.has(p.key);
                        return (
                          <li key={p.key}>
                            <label className={cn('flex items-start gap-2 text-sm', cannotGrant && 'opacity-50')}>
                              <input type="checkbox" className="mt-1" checked={on(p.key)} disabled={!editable || cannotGrant} onChange={() => toggle(p.key)} />
                              <span><span className="font-medium">{t(`admin.perm.${p.key}`)}</span><br /><code className="text-[11px] text-taupe">{p.key}</code></span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                );
              })}
            </div>
            {editable && <p className="mt-4 text-xs text-taupe">{t('admin.roles.grantHint')}</p>}
          </Card>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('admin.roles.new')} size="sm"
        footer={<><button type="button" className="btn-ghost" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</button><button type="button" className="btn-primary" disabled={busy || newName.trim().length < 2} onClick={create}>{t('common.add')}</button></>}>
        <Field label={t('common.name')} hint={t('admin.roles.newHint')}><input className="input" value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} autoFocus /></Field>
      </Modal>
      <ConfirmModal open={delOpen} danger title={t('common.delete')} text={t('admin.roles.deleteText')} onClose={() => setDelOpen(false)} onConfirm={remove} />
    </>
  );
}
