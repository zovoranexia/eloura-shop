import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { env } from './env';
import { AppError } from './errors';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const root = () => path.resolve(env.uploadDir);
const publicDir = () => path.join(root(), 'public');
const proofDir = () => path.join(root(), 'private', 'proofs');
const rand = (n = 8) => crypto.randomBytes(n).toString('base64url');

export type UploadKind = 'products' | 'banners' | 'categories' | 'qr' | 'misc';
const KINDS: UploadKind[] = ['products', 'banners', 'categories', 'qr', 'misc'];
export const isUploadKind = (v: unknown): v is UploadKind => KINDS.includes(v as UploadKind);

async function fileBuffer(file: File, maxBytes = MAX_UPLOAD_BYTES): Promise<Buffer> {
  if (file.size > maxBytes) throw new AppError(413, 'FILE_TOO_LARGE');
  if (file.size === 0) throw new AppError(400, 'FILE_INVALID');
  return Buffer.from(await file.arrayBuffer());
}

/** Decode + re-encode as WebP: validates real image content (never trusts the client mime), strips EXIF/metadata. */
async function toWebp(buf: Buffer, maxWidth: number): Promise<Buffer> {
  try {
    const img = sharp(buf, { limitInputPixels: 40_000_000, failOn: 'error' });
    const meta = await img.metadata();
    if (!meta.format || !['jpeg', 'png', 'webp'].includes(meta.format)) throw new Error('format');
    return await img.rotate().resize({ width: maxWidth, withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
  } catch {
    throw new AppError(400, 'FILE_INVALID');
  }
}

/** Public catalogue/banner/QR image -> served by /media/<kind>/<file>. Returns the public URL. */
export async function savePublicImage(file: File, kind: UploadKind): Promise<string> {
  const out = await toWebp(await fileBuffer(file), kind === 'banners' ? 2400 : 1400);
  const dir = path.join(publicDir(), kind);
  await fs.mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}-${rand(6)}.webp`;
  await fs.writeFile(path.join(dir, name), out);
  return `/media/${kind}/${name}`;
}

const isPdf = (b: Buffer) => b.subarray(0, 5).toString('latin1') === '%PDF-';

/** Payment proof: JPG/PNG (re-encoded to WebP) or PDF, max 5 MB. Stored privately - only served through an authorised API route. */
export async function saveProof(file: File): Promise<{ fileKey: string; mime: string; size: number }> {
  const buf = await fileBuffer(file);
  await fs.mkdir(proofDir(), { recursive: true });
  const stamp = `${Date.now().toString(36)}-${rand(10)}`;
  if (isPdf(buf)) {
    const fileKey = `${stamp}.pdf`;
    await fs.writeFile(path.join(proofDir(), fileKey), buf);
    return { fileKey, mime: 'application/pdf', size: buf.length };
  }
  const out = await toWebp(buf, 2000);
  const fileKey = `${stamp}.webp`;
  await fs.writeFile(path.join(proofDir(), fileKey), out);
  return { fileKey, mime: 'image/webp', size: out.length };
}

export async function deleteProof(fileKey: string) {
  if (/^[\w-]+\.(webp|pdf)$/.test(fileKey)) await fs.rm(path.join(proofDir(), fileKey), { force: true });
}

export async function readProof(fileKey: string | null | undefined) {
  if (!fileKey || !/^[\w-]+\.(webp|pdf)$/.test(fileKey)) return null;
  try {
    return await fs.readFile(path.join(proofDir(), fileKey));
  } catch {
    return null;
  }
}

/** Resolve a /media/<kind>/<file> request to a safe absolute path (no traversal). */
export function mediaPath(segments: string[]): string | null {
  if (segments.length !== 2 || !isUploadKind(segments[0]) || !/^[\w-]+\.webp$/.test(segments[1])) return null;
  return path.join(publicDir(), segments[0], segments[1]);
}
