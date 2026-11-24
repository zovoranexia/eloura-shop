import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { notFound } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { readProof } from '@/lib/upload';

/** Payment proofs are private: only staff with payments.view can open them. Served with a locked-down CSP (no scripts, sandboxed). */
export const GET = route<{ id: string }>({ perm: 'payments.view' }, async (ctx) => {
  const p = await prisma.paymentProof.findUnique({ where: { id: Number(ctx.params.id) } });
  const buf = p ? await readProof(p.fileKey) : null;
  if (!p || !buf) throw notFound();
  await audit(ctx, 'payment.view_proof', 'payment', p.id);
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': p.fileMime ?? 'application/octet-stream', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox", 'Content-Disposition': 'inline',
    },
  });
});
