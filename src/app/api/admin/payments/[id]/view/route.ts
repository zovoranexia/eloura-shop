import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { notFound } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { readProof } from '@/lib/upload';

/**
 * Inline preview of a private payment proof for the admin verification center (same access rule as /file: payments.view).
 * Unlike /file this does NOT send `sandbox` in the CSP, because browsers refuse to render PDFs inside a sandboxed document.
 * It stays locked down: no scripts, no external loads, framable only by our own origin, never cached, never sniffed.
 */
export const GET = route<{ id: string }>({ perm: 'payments.view' }, async (ctx) => {
  const p = await prisma.paymentProof.findUnique({ where: { id: Number(ctx.params.id) } });
  const buf = p ? await readProof(p.fileKey) : null;
  if (!p || !buf) throw notFound();
  await audit(ctx, 'payment.view_proof', 'payment', p.id);
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': p.fileMime ?? 'application/octet-stream',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; object-src 'self'; frame-ancestors 'self'",
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Disposition': 'inline',
    },
  });
});
