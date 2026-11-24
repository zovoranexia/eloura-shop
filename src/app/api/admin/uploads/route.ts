import { route } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { isUploadKind, savePublicImage } from '@/lib/upload';

/** Image upload for products / banners / categories / payment QR codes. Re-encoded to WebP, EXIF stripped, max 5 MB. */
export const POST = route({ anyPerm: ['products.create', 'products.update', 'categories.manage', 'banners.manage', 'settings.manage'], limit: ['upload', 60, 10 * 60_000] }, async (ctx) => {
  let form: FormData;
  try { form = await ctx.req.formData(); } catch { throw new AppError(400, 'BAD_FORM'); }
  const file = form.get('file');
  const kind = String(form.get('kind') ?? 'products');
  if (!(file instanceof File)) throw new AppError(400, 'FILE_INVALID');
  const url = await savePublicImage(file, isUploadKind(kind) ? kind : 'products');
  await audit(ctx, 'upload.image', kind, null, { url });
  return { url };
});
