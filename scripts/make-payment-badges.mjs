// Redraws the five payment logos (design/source/payments/*.png) as one uniform badge family for the footer:
// identical size, corner radius, optical margin and hairline, so the row reads as a precise, symmetric set.
// Output: public/images/payments/{bank-bnctl,atm-p24,tpay,mosan,cod}.webp (256x256, transparent corners).
// Run: node scripts/make-payment-badges.mjs
import sharp from 'sharp';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = (f) => path.join(root, 'design/source/payments', f);
const out = (f) => path.join(root, 'public/images/payments', f);

const SIZE = 256;
const RADIUS = 58;          // ~22.5% corner radius, same for every badge
const INNER = 0.74;         // artwork fits inside 74% of the badge (optical margin), centred
const WHITE = '#ffffff';

const tileMask = Buffer.from(`<svg width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" rx="${RADIUS}" fill="#fff"/></svg>`);
const hairline = (color) => Buffer.from(
  `<svg width="${SIZE}" height="${SIZE}"><rect x="1" y="1" width="${SIZE - 2}" height="${SIZE - 2}" rx="${RADIUS - 1}" fill="none" stroke="${color}" stroke-width="2"/></svg>`);

const solid = (color) => sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: color } }).png().toBuffer();

/** artwork (any aspect) -> fitted into the INNER box, centred on a transparent SIZE x SIZE canvas */
async function fitted(buf, inner = INNER) {
  const box = Math.round(SIZE * inner);
  const art = await sharp(buf).resize({ width: box, height: box, fit: 'inside', kernel: 'lanczos3' }).png().toBuffer();
  return { input: art, gravity: 'center' };
}

async function finish(tile, stroke, file) {
  const masked = await sharp(tile).composite([{ input: tileMask, blend: 'dest-in' }]).png().toBuffer();
  await sharp(masked).composite([{ input: hairline(stroke) }]).webp({ quality: 94, alphaQuality: 100 }).toFile(out(file));
}

/** Cut coloured artwork out of a neutral background (white, grey gloss, or a baked-in transparency checkerboard) using saturation as alpha. */
async function cutOut(buf, lo, hi) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = Buffer.alloc(data.length);
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    px[i] = r; px[i + 1] = g; px[i + 2] = b;
    px[i + 3] = Math.round(255 * smooth(lo, hi, mx === 0 ? 0 : (mx - mn) / mx));
  }
  return sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** drop a near-white background and trim the empty margin */
const trimWhite = (buf) => sharp(buf).flatten({ background: WHITE }).trim({ background: WHITE, threshold: 14 }).png().toBuffer();

// ---- ATM transfer (P24): star on white
{
  const art = await trimWhite(await sharp(src('p24.png')).toBuffer());
  await finish(await sharp(await solid(WHITE)).composite([await fitted(art, 0.76)]).png().toBuffer(), 'rgba(62,51,53,0.14)', 'atm-p24.webp');
}

// ---- Bank transfer (BNCTL): cut the blue emblem out of its grey glossy tile via colour saturation, centre it on white
{
  const cut = await cutOut(await sharp(src('bnctl.png')).extract({ left: 52, top: 52, width: 343, height: 343 }).toBuffer(), 0.16, 0.42);
  const art = await sharp(cut).trim({ threshold: 6 }).png().toBuffer();
  await finish(await sharp(await solid(WHITE)).composite([await fitted(art, 0.76)]).png().toBuffer(), 'rgba(62,51,53,0.14)', 'bank-bnctl.webp');
}

// ---- T-Pay: the round black badge re-set on a black rounded square (grey ring dropped, artwork centred)
{
  const S = 512, inner = 226;
  const circle = Buffer.from(`<svg width="${S}" height="${S}"><circle cx="${S / 2}" cy="${S / 2}" r="${inner}" fill="#fff"/></svg>`);
  const disc = await sharp(src('tpay.png')).resize(S, S).composite([{ input: circle, blend: 'dest-in' }]).png().toBuffer();
  const base = await sharp({ create: { width: S, height: S, channels: 4, background: '#000000' } }).composite([{ input: disc }]).png().toBuffer();
  // zoom slightly so the wordmark carries the same visual weight as the other badges
  const zoomed = await sharp(base).extract({ left: 30, top: 30, width: S - 60, height: S - 60 }).resize(SIZE, SIZE, { kernel: 'lanczos3' }).png().toBuffer();
  await finish(zoomed, 'rgba(255,255,255,0.14)', 'tpay.webp');
}

// ---- Mosan: orange square, re-masked to the shared radius (slightly over-scaled so no corner gaps appear)
{
  const m = await sharp(src('mosan.png')).metadata();
  const crop = Math.round(m.width * 0.94), off = Math.round((m.width - crop) / 2);
  const zoomed = await sharp(src('mosan.png')).flatten({ background: '#ff5500' }).extract({ left: off, top: off, width: crop, height: crop }).resize(SIZE, SIZE, { kernel: 'lanczos3' }).png().toBuffer();
  await finish(zoomed, 'rgba(255,255,255,0.18)', 'mosan.webp');
}

// ---- Cash on delivery: parcel + red "COD" (the tiny subtitle is dropped: unreadable at badge size), on white
{
  const m = await sharp(src('cod.png')).metadata();
  const cropped = await sharp(src('cod.png')).extract({ left: 8, top: Math.round(m.height * 0.16), width: m.width - 24, height: Math.round(m.height * 0.60) }).toBuffer();
  const art = await sharp(await cutOut(cropped, 0.12, 0.30)).trim({ threshold: 6 }).png().toBuffer();
  await finish(await sharp(await solid(WHITE)).composite([await fitted(art, 0.80)]).png().toBuffer(), 'rgba(62,51,53,0.14)', 'cod.webp');
}

// ---- optional contact sheet on the footer colour for a quick visual check: node scripts/make-payment-badges.mjs <sheet.png>
if (process.argv[2]) {
const names = ['bank-bnctl', 'atm-p24', 'tpay', 'mosan', 'cod'];
const gap = 24, pad = 32, W = pad * 2 + names.length * SIZE + (names.length - 1) * gap, H = SIZE + pad * 2;
const tiles = await Promise.all(names.map(async (n, i) => ({ input: await sharp(out(`${n}.webp`)).png().toBuffer(), left: pad + i * (SIZE + gap), top: pad })));
await sharp({ create: { width: W, height: H, channels: 4, background: '#3E3335' } }).composite(tiles).png().toFile(process.argv[2]);
}
console.log('payment badges generated');
