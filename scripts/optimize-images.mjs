// Builds public/img/ (AVIF + WebP + JPEG at several widths, og.jpg, manifest.json) from scripts/photo-selection.json.
// Run: npm run images   (re-run after changing the selection; files no photo uses any more are removed)
// A source under refs/ is in this repository; any other is in Sai's HackAZ folder. Without that folder (a cloud
// checkout), the photos built from it are kept as last built.
import sharp from 'sharp';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const WEB = fileURLToPath(new URL('..', import.meta.url));
const HACKAZ = path.resolve(WEB, '..');
const OUT = path.join(WEB, 'public/img');
const DEFAULT_WIDTHS = [480, 960, 1600];
const BOARD_WIDTHS = [480, 960]; // board cards render small; 960 covers them at 2x
const JPG_MAX = 960; // JPEG is only the fallback for browsers without AVIF/WebP; capped to stay under the budget
const QUALITY = { avif: { quality: 50 }, webp: { quality: 72 }, jpg: { quality: 78, mozjpeg: true } };
const OG = { width: 1200, height: 630 };
const BUDGET = 12 * 1024 * 1024; // the whole folder; a page loads only the few photos it shows (8 MB until Sai's 26 Oct photos)

// Crop box of aspect w:h, as large as fits, centred on the focal point and kept inside the image.
function focalBox(srcW, srcH, w, h, { x, y }) {
  const scale = Math.min(srcW / w, srcH / h);
  const cw = Math.round(w * scale), ch = Math.round(h * scale);
  const clamp = (v, max) => Math.min(Math.max(v, 0), max);
  return { left: clamp(Math.round(x * srcW - cw / 2), srcW - cw), top: clamp(Math.round(y * srcH - ch / 2), srcH - ch), width: cw, height: ch };
}
assert.deepEqual(focalBox(4000, 3000, 1200, 630, { x: 0.5, y: 0.5 }), { left: 0, top: 450, width: 4000, height: 2100 });
assert.deepEqual(focalBox(4000, 3000, 1200, 630, { x: 0.5, y: 0 }), { left: 0, top: 0, width: 4000, height: 2100 });

const { photos } = JSON.parse(await readFile(path.join(WEB, 'scripts/photo-selection.json'), 'utf8'));
assert.equal(new Set(photos.map(p => p.id)).size, photos.length, 'duplicate photo id');
assert.equal(photos.filter(p => p.slots.includes('og')).length, 1, 'exactly one photo needs the og slot');

await mkdir(OUT, { recursive: true });
const exists = file => stat(file).then(() => true, () => false);
const previous = (await exists(path.join(OUT, 'manifest.json'))) ? JSON.parse(await readFile(path.join(OUT, 'manifest.json'), 'utf8')) : [];
const sourcePath = source => path.join(source.startsWith('refs/') ? WEB : HACKAZ, source);
const outputs = entry => [...entry.widths.flatMap(w => ['avif', 'webp'].map(ext => `${entry.id}-${w}.${ext}`)), ...entry.jpgWidths.map(w => `${entry.id}-${w}.jpg`)];

const manifest = [], kept = [];
for (const p of photos) {
  assert.ok(p.alt && p.caption && p.focal, `${p.id}: alt, caption and focal are required`);
  if (!(await exists(sourcePath(p.source)))) {
    const old = previous.find(entry => entry.id === p.id && entry.source === p.source);
    assert.ok(old, `${p.id}: ${p.source} not found, and there is no earlier build of it to keep`);
    for (const f of outputs(old)) assert.ok(await exists(path.join(OUT, f)), `${p.id}: kept build is missing ${f}`);
    manifest.push({ ...old, slots: p.slots, year: p.year, event: p.event, alt: p.alt, caption: p.caption, focal: p.focal });
    kept.push(p.id);
    continue;
  }
  // rotate() applies EXIF orientation; sharp drops all metadata (EXIF, GPS, ICC) unless asked to keep it.
  const base = sharp(sourcePath(p.source), { failOn: 'none' }).rotate().toColorspace('srgb');
  const { data: src, info } = await base.raw().toBuffer({ resolveWithObject: true });
  const onlyBoard = p.slots.every(s => s === 'board');
  const widths = (p.widths ?? (onlyBoard ? BOARD_WIDTHS : DEFAULT_WIDTHS)).filter(w => w <= info.width);
  const jpgWidths = widths.filter(w => w <= JPG_MAX);
  assert.ok(widths.length, `${p.id}: source is narrower than every width`);

  for (const w of widths) {
    const resized = sharp(src, { raw: info }).resize({ width: w });
    await Promise.all(Object.entries(QUALITY).filter(([ext]) => ext !== 'jpg' || jpgWidths.includes(w)).map(([ext, opts]) =>
      resized.clone().toFormat(ext === 'jpg' ? 'jpeg' : ext, opts).toFile(path.join(OUT, `${p.id}-${w}.${ext}`))));
  }
  if (p.slots.includes('og')) {
    await sharp(src, { raw: info }).extract(focalBox(info.width, info.height, OG.width, OG.height, p.focal))
      .resize(OG.width, OG.height).jpeg(QUALITY.jpg).toFile(path.join(OUT, 'og.jpg'));
  }

  const w = widths.at(-1);
  manifest.push({
    id: p.id, slots: p.slots, year: p.year, event: p.event,
    width: w, height: Math.round(info.height * w / info.width), widths, jpgWidths,
    alt: p.alt, caption: p.caption, source: p.source, focal: p.focal,
  });
  console.log(`${p.id}: ${info.width}x${info.height} -> ${widths.join(', ')}`);
}
if (kept.length) console.log(`kept as last built (source not found): ${kept.join(', ')}`);
await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const used = new Set([...manifest.flatMap(outputs), 'og.jpg', 'manifest.json']);
for (const f of await readdir(OUT)) if (!used.has(f)) await rm(path.join(OUT, f));

// Self-check: every output opens, carries no EXIF/GPS, and the folder fits the budget.
let total = 0;
for (const f of await readdir(OUT)) {
  const file = path.join(OUT, f);
  total += (await stat(file)).size;
  if (f.endsWith('.json')) continue;
  const meta = await sharp(file).metadata();
  assert.ok(meta.width > 0, `${f} does not open`);
  assert.ok(!meta.exif && !meta.xmp, `${f} still has metadata`);
}
console.log(`public/img: ${(total / 1024 / 1024).toFixed(2)} MB of ${BUDGET / 1024 / 1024} MB`);
assert.ok(total <= BUDGET, 'public/img is over budget');
