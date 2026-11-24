import { route } from '@/lib/api';
import { dashboard } from '@/server/reports';

export const GET = route({ perm: 'dashboard.view' }, async (ctx) => dashboard(ctx.locale));
