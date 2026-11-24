import { route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { cleanI18n } from '@/lib/i18n-shared';
import { settingsSchema } from '@/server/admin-content';
import { getAllSettings, setSetting } from '@/server/settings';

export const GET = route({ perm: 'settings.manage' }, async () => getAllSettings());

export const PUT = route({ perm: 'settings.manage' }, async (ctx) => {
  const b = await ctx.body(settingsSchema);
  await setSetting('store', { ...b.store, tagline: cleanI18n(b.store.tagline) });
  await setSetting('commerce', b.commerce);
  await audit(ctx, 'settings.update', 'settings', null, { cod: { min: b.commerce.codMinCents, max: b.commerce.codMaxCents, fee: b.commerce.codFeeCents } });
  return getAllSettings();
});
