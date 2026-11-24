// Generates the web assets (logo variants, favicon, hero, category and product images)
// from the original design files in /design/source. Run: node scripts/make-assets.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = (f) => path.join(root, 'design/source', f);
const pub = (...p) => path.join(root, 'public', ...p);
for (const d of ['brand', 'hero', 'categories', 'products']) fs.mkdirSync(pub('images', d), { recursive: true });

const BG = [0xfb, 0xf6, 0xf0]; // brand cream #FBF6F0
const CREAM_LIGHT = [0xf3, 0xe4, 0xdc];

/** Turn the cream background of the logo into real transparency. `light` recolours the mauve/grey ink to cream
 *  (for dark backgrounds) while keeping the gold curve. */
async function transparentLogo(buffer, { light = false } = {}) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const p = [data[i], data[i + 1], data[i + 2]];
    const d = Math.max(BG[0] - p[0], BG[1] - p[1], BG[2] - p[2], 0);
    let a = Math.min(1, d / 150);
    if (a < 0.02) { out[i + 3] = 0; continue; }
    let c = p.map((v, k) => Math.max(0, Math.min(255, (v - (1 - a) * BG[k]) / a)));
    if (light) {
      const goldness = c[0] - c[2];
      if (goldness < 62) c = CREAM_LIGHT;
    }
    out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } });
}

// ---- Logo (crop from the 3840x2700 presentation; scale factor 1.92 vs. the 2000px preview) ----
const k = 1.92;
const crop = (l, t, r, b) => ({ left: Math.round(l * k), top: Math.round(t * k), width: Math.round((r - l) * k), height: Math.round((b - t) * k) });
const logoSrc = src('logo-presentation.jpg');
const fullRegion = crop(330, 262, 880, 700);
const wordRegion = crop(340, 268, 870, 545); // "Eloura" + gold curve

const fullBuf = await sharp(logoSrc).extract(fullRegion).png().toBuffer();
const wordBuf = await sharp(logoSrc).extract(wordRegion).png().toBuffer();

await sharp(fullBuf).resize({ width: 1200 }).png().toFile(pub('images/brand/logo-full-cream.png'));
(await transparentLogo(fullBuf)).resize({ width: 1200 }).png().toFile(pub('images/brand/logo-full.png'));
(await transparentLogo(fullBuf, { light: true })).resize({ width: 1200 }).png().toFile(pub('images/brand/logo-full-light.png'));
(await transparentLogo(wordBuf)).resize({ width: 640 }).png().toFile(pub('images/brand/logo-wordmark.png'));
(await transparentLogo(wordBuf, { light: true })).resize({ width: 640 }).png().toFile(pub('images/brand/logo-wordmark-light.png'));

// ---- Monogram "Ec" (final circle-mask icon from the Android icon presentation, 2000px preview coords) ----
const iconSrc = src('android-icon-presentation.jpg');
const mono = await sharp(iconSrc).extract(crop(1578, 285, 1684, 391)).toBuffer(); // ring on blush
const monoSize = 512;
const circle = Buffer.from(`<svg width="${monoSize}" height="${monoSize}"><circle cx="${monoSize / 2}" cy="${monoSize / 2}" r="${monoSize / 2}"/></svg>`);
const monoBig = await sharp(mono).resize(monoSize, monoSize, { kernel: 'lanczos3' }).toBuffer();
await sharp(monoBig).composite([{ input: circle, blend: 'dest-in' }]).png().toFile(pub('images/brand/monogram.png'));
// maskable PWA icons: blush square with monogram inside the safe zone
for (const size of [192, 512]) {
  const inner = Math.round(size * 0.78);
  const m = await sharp(mono).resize(inner, inner, { kernel: 'lanczos3' }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 3, background: { r: 0xeb, g: 0xd9, b: 0xd2 } } })
    .composite([{ input: m, gravity: 'center' }]).png().toFile(pub(`icon-${size}.png`));
}
const monoCircle = await sharp(monoBig).composite([{ input: circle, blend: 'dest-in' }]).png().toBuffer();
await sharp(monoCircle).resize(64, 64).png().toFile(pub('favicon.png'));
await sharp(monoBig).resize(180, 180).png().toFile(pub('apple-touch-icon.png'));

// ---- Hero banners (provided images) ----
const heroes = [['hero-1.png', 'hero-1.webp'], ['hero-2.webp', 'hero-2.webp'], ['hero-3.webp', 'hero-3.webp']];
for (const [from, to] of heroes) {
  await sharp(src(from)).webp({ quality: 92 }).toFile(pub('images/hero', to));
}

// ---- Categories + products cropped from the template (coords in the 1024x1536 template) ----
const tpl = src('template-velora.jpg');
const catTiles = [
  ['robes', 54, 540, 190, 638], ['tops', 207, 540, 343, 638], ['pantalons', 362, 540, 498, 638],
  ['sacs', 520, 540, 656, 638], ['chaussures', 677, 540, 813, 638], ['beaute', 835, 540, 970, 638],
];
for (const [name, l, t, r, b] of catTiles) {
  await sharp(tpl).extract({ left: l + 2, top: t + 2, width: r - l - 4, height: b - t - 4 })
    .resize({ width: 480, kernel: 'lanczos3' }).sharpen({ sigma: 0.7 }).webp({ quality: 90 }).toFile(pub('images/categories', `${name}.webp`));
}
const prodCards = [
  ['pull-oversize', 62, 766, 273, 908], ['sac-elegant', 300, 766, 501, 908],
  ['baskets', 529, 766, 731, 908], ['parfum-floral', 758, 766, 962, 908],
];
for (const [name, l, t, r, b] of prodCards) {
  // Crop a window that starts below the discount badge and stops before the heart icon (badge/heart live in the card corners).
  const w = r - l, h = b - t;
  await sharp(tpl).extract({ left: l + Math.round(w * 0.16), top: t + 31, width: Math.round(w * 0.72), height: h - 33 })
    .resize({ width: 640, kernel: 'lanczos3' }).sharpen({ sigma: 0.8 }).webp({ quality: 90 }).toFile(pub('images/products', `${name}.webp`));
}
// category tiles reused as extra catalogue shots
for (const [name] of catTiles) fs.copyFileSync(pub('images/categories', `${name}.webp`), pub('images/products', `cat-${name}.webp`));

// promo banner artwork (bag, hat, sunglasses, scarf) from the template
await sharp(tpl).extract({ left: 420, top: 1059, width: 440, height: 186 })
  .resize({ width: 1100, kernel: 'lanczos3' }).sharpen({ sigma: 0.8 }).webp({ quality: 90 }).toFile(pub('images/promo-art.webp'));

console.log('assets generated');
