import fs from 'node:fs/promises';
import { mediaPath } from '@/lib/upload';

export const dynamic = 'force-dynamic';

/** Public uploaded images (products, banners, categories, QR codes). Proofs are NOT served here (private, see /api/admin/payments/[id]/file). */
export async function GET(_req: Request, props: { params: Promise<{ path: string[] }> }) {
  const params = await props.params;
  const p = mediaPath(params.path);
  if (!p) return new Response('Not found', { status: 404 });
  try {
    const buf = await fs.readFile(p);
    return new Response(new Uint8Array(buf), {
      headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=2592000, immutable', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
