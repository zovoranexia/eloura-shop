import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { toCsv } from '@/server/reports';

/** GET /api/admin/newsletter -> JSON; GET /api/admin/newsletter?format=csv -> CSV download. */
export const GET = route({ anyPerm: ['banners.manage', 'reports.export'] }, async (ctx) => {
  const rows = await prisma.newsletterSubscriber.findMany({ orderBy: { id: 'desc' }, take: 5000 });
  if (ctx.req.nextUrl.searchParams.get('format') === 'csv') {
    await audit(ctx, 'newsletter.export', 'newsletter', null, { rows: rows.length });
    return new Response(toCsv(['email', 'language', 'subscribed_at_utc'], rows.map((r) => [r.email, r.locale, r.createdAt.toISOString()])), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="newsletter-subscribers.csv"' },
    });
  }
  return rows;
});
