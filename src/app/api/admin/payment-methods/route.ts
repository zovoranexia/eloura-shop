import { route } from '@/lib/api';
import { allMethods, isConfigured } from '@/server/payments';

/** Full payment configuration (account numbers, wallet numbers, QR images, instructions). Requires settings.manage. */
export const GET = route({ perm: 'settings.manage' }, async () => (await allMethods()).map((m) => ({ ...m, configured: isConfigured(m) })));
