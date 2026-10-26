// Builds public/logos/ and public/team/ (files + manifest.json) from Sai's read-only asset folders, plus the sponsor
// logos taken from the official site (refs/sponsors-site/, see SOURCES.md there).
// Run: node scripts/optimize-brand-assets.mjs   (re-run after adding or replacing a source file)
// Without Sai's folders (a cloud checkout), the logos and headshots built from them are kept as last built.
import sharp from 'sharp';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const WEB = fileURLToPath(new URL('..', import.meta.url));
const HACKAZ = path.resolve(WEB, '..');
const LOGO_SRC = path.join(HACKAZ, '03 Sponsors/Sponsor Logos');
const SITE_SRC = path.join(WEB, 'refs/sponsors-site');
const TEAM_SRC = path.join(HACKAZ, '05 Organizers');
const OUT = path.join(WEB, 'public');

const LOGO_H = 128; // 2x of the 64px display height
// Backgrounds the logos are checked against. Measurement only; the site's real colours live in tokens.css.
const WHITE = [255, 255, 255];
const NAVY = [7, 21, 46]; // ~#07152E, dark theme page

// One entry per brand. light/dark = source file names (in dir, default LOGO_SRC). opaqueBg = the file has a baked-in
// white background. official = listed on https://hack.arizona.edu/sponsors (Sai: show every one of them). forcePlate =
// needs a plate on dark although the measure passes (white fringes left by background removal fool it).
// Sai asked on 26 Oct 2026 not to use the UA Computer Science (uacs.png) and Banner Health (Banner.png) logos.
const LOGOS = [
  { id: 'general-dynamics-mission-systems', name: 'General Dynamics Mission Systems', light: 'General_Dynamics_Mission_Systems_logo.svg', official: true,
    notes: 'SVG chosen over GeneralDynamicsLogo.png (stacked) and general-dynamics-1.png (one line); both PNGs read "General Dynamics" without "Mission Systems". Sai to confirm which name the sponsor uses.' },
  { id: 'amazon', name: 'Amazon Tempe Town Lake Campus', light: 'amazon_tempe_town_lake_logo_-_transparent.png', official: true,
    dark: 'amazon_tempe_town_lake_campus_logo_-_white_and_orange_-_transparent.png',
    notes: 'Campus lockup, not the plain Amazon logo. dark = the supplied white-and-orange version. amazon.png.png and amazon.webp are small copies on white, not used.' },
  { id: 'nuclearn', name: 'Nuclearn', light: '2025 Logo Horizontal(1).png', official: true,
    notes: 'Source "2025 Logo Horizontal(1).png" is the Nuclearn logo (transparent). "Nuclearn Logo 2x1.jpg" is an older copy on white, not used.' },
  { id: 'ending-pandemics-academy', name: 'Ending Pandemics Academy', light: 'NEW-EP-ACADEMY-LOGO.png', opaqueBg: 'outside',
    notes: 'Lockup with "The University of Arizona Mel & Enid Zuckerman College of Public Health Global Health Institute". Supplied on white only; only the white around the logo was removed, so the block A\'s white band and the letter counters stay white: keep it on a light surface (paper or plate).' },
  { id: 'rtx', name: 'Raytheon Technologies (RTX)', light: 'RTX_Raytheon_Technologies_logo.svg.png',
    notes: 'The logo itself reads "RTX"; the name comes from the file name. Black only; no white version supplied.' },
  { id: 'asua', name: 'Associated Students of the University of Arizona (ASUA)', light: 'ASUA.png', official: true, notes: 'ASUA-logo.png is the same file.' },
  { id: 'github', name: 'GitHub', light: 'Git-hub.png', official: true,
    notes: 'Horizontal lockup chosen over GitHub-logo.png (stacked, mostly empty canvas). Black only; no white version supplied.' },
  { id: 'mlh', name: 'Major League Hacking', light: 'mlh-logo-color.png', notes: 'No white version supplied.' },
  { id: 'responsible-ai', name: 'Responsible Artificial Intelligence', light: 'Responsible-Artificial-Intelligence_WEB.png', official: true,
    notes: 'University of Arizona block A lockup. Responsible-Artificial-Intelligence.png is the same file.' },
  { id: 'center-philosophy-of-freedom', name: 'Center for the Philosophy of Freedom', light: 'PROVOST_Center-for-the-Philosophy-of-Freedom_PRIMARY.png', official: true,
    notes: 'Lockup with "The University of Arizona Office of the Provost".' },
  // From the official sponsors page. The University of Arizona units come on 1920x1080 canvases; the trim crops them.
  { id: 'university-of-arizona', name: 'University of Arizona', dir: SITE_SRC, light: 'university-of-arizona.png', official: true,
    notes: 'Block A over "The University of Arizona", stacked.' },
  { id: 'university-libraries', name: 'University Libraries', dir: SITE_SRC, light: 'university-libraries.png', official: true, notes: 'Block A lockup.' },
  { id: 'honors-college', name: 'W.A. Franke Honors College', dir: SITE_SRC, light: 'honors-college.png', opaqueBg: 'outside', official: true, forcePlate: true,
    notes: 'Block A lockup supplied on white; only the white around the logo was removed.' },
  { id: 'tech-launch-arizona', name: 'Tech Launch Arizona', dir: SITE_SRC, light: 'tech-launch-arizona.png', opaqueBg: 'outside', official: true, forcePlate: true,
    notes: 'Block A lockup supplied on white; only the white around the logo was removed.' },
  { id: 'startup-wildcats', name: 'Startup Wildcats', dir: SITE_SRC, light: 'startup-wildcats.png', opaqueBg: 'outside', official: true,
    notes: 'Supplied on white with a light grey square behind the mark; both removed.' },
  { id: 'information-technology', name: 'Information Technology', dir: SITE_SRC, light: 'information-technology.png', official: true, notes: 'Block A lockup.' },
  { id: 'office-of-the-provost', name: 'Office of the Provost', dir: SITE_SRC, light: 'office-of-the-provost.png', official: true, notes: 'Block A lockup.' },
  { id: 'engineering', name: 'Engineering', dir: SITE_SRC, light: 'engineering.png', official: true, notes: 'Block A lockup (College of Engineering).' },
  { id: 'startup-tucson', name: 'Startup Tucson', dir: SITE_SRC, light: 'startup-tucson.png', opaqueBg: 'outside', official: true,
    notes: 'Supplied on white; only the white around the logo was removed.' },
  { id: 'research-innovation-impact', name: 'Research, Innovation & Impact', dir: SITE_SRC, light: 'research-innovation-impact.png', official: true,
    notes: 'Block A lockup. The official page captions it "Rresearch, Innovation & Impact" (typo).' },
  { id: 'veridise', name: 'Veridise', dir: SITE_SRC, light: 'veridise-dark-text.svg', dark: 'veridise.svg', official: true,
    notes: 'From veridise.com (the official page shows a thank-you banner, not a logo). Veridise publishes a white wordmark only; the light file is a copy with the wordmark recoloured #0F172A. Ask Veridise for an official version.' },
  { id: 'general-education', name: 'General Education', dir: SITE_SRC, light: 'general-education.png', official: true, notes: 'Block A lockup.' },
];

// Square crops [left, top, side] in source pixels, set by eye: face centred, head about half the frame.
const CROPS = {
  'Eramus Poleate': [0, 0, 414], 'Siddhartha Singh': [38, 0, 376], 'Deevanshi Malhotra': [101, 64, 247],
  'Eva Jarvis': [22, 53, 367], 'Fatih Bozdogan': [0, 215, 414], 'Jesus Manuel Mercado': [0, 0, 414],
  'Luis Fernando Angulo': [0, 0, 414], 'Nandika Barjatya': [120, 110, 181], 'Santiago Vargas Roldan': [85, 203, 243],
  'Thrupthi Ananth Byadarahalli': [75, 119, 260],
  'Om Jariwala': [89, 51, 253], "Hidoyat Odilbek o'g'li Ruzmetov": [99, 112, 238], 'Olivia Grace Sobczak': [138, 30, 167],
  'Dongyoung Yang': [44, 49, 323], 'Kory M Smith': [0, 0, 414],
};
const TEAM_DIRS = { current: 'current_organizres_headshots', previous: 'previous-organizers-headshots' };

const slug = (s) => s.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const rel = (...p) => p.join('/'); // manifest paths are relative to the site root (public/)
const exists = (p) => stat(p).then(() => true, () => false);
const readManifest = async (dir) => (await exists(path.join(dir, 'manifest.json'))) ? JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8')) : [];
const filePaths = (o) => (typeof o === 'string' ? [o] : Object.values(o).flatMap(filePaths));

// --- colour helpers -------------------------------------------------------
const LIN = Array.from({ length: 256 }, (_, c) => (c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (r, g, b) => 0.2126 * LIN[r] + 0.7152 * LIN[g] + 0.0722 * LIN[b];
const ratio = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

// Share of the logo's outline (solid pixels next to transparency) where nothing within 6px (3px at display size)
// reaches 2:1 against bg. Only the outline counts: it separates the logo from the page. The band lets a keyline count (ASUA's white
// rim on white is fine because the navy sits right inside it).
function weakShare({ data, info: { width: w, height: h } }, bg) {
  const lb = lum(...bg), solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] >= 200;
  let edge = 0, weak = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!solid(x, y) || (solid(x - 1, y) && solid(x + 1, y) && solid(x, y - 1) && solid(x, y + 1))) continue;
    edge++; let best = 0;
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) if (solid(x + dx, y + dy)) {
      const i = ((y + dy) * w + x + dx) * 4; best = Math.max(best, ratio(lum(data[i], data[i + 1], data[i + 2]), lb));
    }
    if (best < 2) weak++;
  }
  return weak / edge;
}

// Makes a baked-in white or checkerboard background transparent.
// mode 'all': every light grey pixel goes (a checkerboard runs through the counters too).
// mode 'outside': only light pixels connected to the image border go, so white inside the logo
// (the block A's white band, letter counters) stays white as supplied.
// The 1px ring around removed pixels gets colour-to-alpha against white, so the logo looks identical on white.
function clearBackground(data, w, h, mode) {
  const light = (p) => {
    const i = p * 4, mn = Math.min(data[i], data[i + 1], data[i + 2]), mx = Math.max(data[i], data[i + 1], data[i + 2]);
    return mn >= 225 && mx - mn <= 16;
  };
  const removed = new Uint8Array(w * h);
  if (mode === 'outside') {
    const stack = [];
    for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
    while (stack.length) {
      const p = stack.pop();
      if (removed[p] || !light(p)) continue;
      removed[p] = 1; const x = p % w;
      if (x > 0) stack.push(p - 1); if (x < w - 1) stack.push(p + 1); if (p >= w) stack.push(p - w); if (p < w * (h - 1)) stack.push(p + w);
    }
  } else for (let p = 0; p < w * h; p++) removed[p] = light(p) ? 1 : 0;
  for (let p = 0; p < w * h; p++) if (removed[p]) data[p * 4 + 3] = 0;
  for (let p = 0; p < w * h; p++) {
    if (removed[p]) continue;
    const x = p % w, y = (p / w) | 0; let edge = false;
    for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && removed[yy * w + xx]) { edge = true; break; }
    }
    if (!edge) continue;
    const i = p * 4, a = Math.max(255 - data[i], 255 - data[i + 1], 255 - data[i + 2]);
    for (let c = 0; c < 3; c++) data[i + c] = a ? Math.round(255 - (255 - data[i + c]) * 255 / a) : 0;
    data[i + 3] = Math.round(a * data[i + 3] / 255);
  }
  assert.equal(data[3], 0, 'background removal left the top-left corner opaque');
}

// Bounding box of pixels with alpha > 4 (trims transparent padding).
function alphaBox(data, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 4) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  assert.ok(x1 >= 0, 'logo is fully transparent');
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

const rawRGBA = (img) => img.toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });

// Raster logo -> trimmed PNG + WebP at LOGO_H. Returns the output size and its pixels for measuring.
async function rasterLogo(file, opaqueBg, outBase) {
  const { data, info } = await rawRGBA(sharp(file));
  assert.equal(info.channels, 4);
  if (opaqueBg) clearBackground(data, info.width, info.height, opaqueBg);
  const pixels = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract(alphaBox(data, info.width, info.height))
    .resize({ height: LOGO_H, withoutEnlargement: true, kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = pixels.info, out = () => sharp(pixels.data, { raw: { width, height, channels: 4 } });
  await out().png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(`${outBase}.png`);
  await out().webp({ lossless: true, effort: 6 }).toFile(`${outBase}.webp`);
  return { width, height, pixels };
}

// SVG -> same paths, viewBox tightened to the drawn area, XML prolog/doctype/empty groups dropped.
async function svgLogo(file, outBase) {
  const src = await readFile(file, 'utf8');
  const vb = src.match(/viewBox="([^"]+)"/)[1].trim().split(/[\s,]+/).map(Number);
  const big = await rawRGBA(sharp(Buffer.from(src), { density: 288 }));
  const k = big.info.width / vb[2], b = alphaBox(big.data, big.info.width, big.info.height);
  const r = (n) => Math.round(n * 100) / 100;
  const box = [vb[0] + b.left / k - 0.5, vb[1] + b.top / k - 0.5, b.width / k + 1, b.height / k + 1].map(r);
  const svg = src.replace(/<\?xml[^>]*>|<!DOCTYPE[^>]*>|<g\/>/g, '').replace(/>\s+</g, '><').trim()
    .replace(/<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" width="${box[2]}" height="${box[3]}" viewBox="${box.join(' ')}">`);
  await writeFile(`${outBase}.svg`, svg);
  const pixels = await rawRGBA(sharp(Buffer.from(svg), { density: 72 * LOGO_H / box[3] }));
  return { width: Math.round(LOGO_H * box[2] / box[3]), height: LOGO_H, pixels };
}

async function buildLogos() {
  const dir = path.join(OUT, 'logos');
  await mkdir(dir, { recursive: true });
  const previous = await readManifest(dir), manifest = [], kept = [];
  for (const L of LOGOS) {
    const src = L.dir ?? LOGO_SRC;
    if (!(await exists(path.join(src, L.light)))) {
      const old = previous.find((p) => p.id === L.id);
      assert.ok(old, `${L.id}: ${path.join(src, L.light)} not found, and there is no earlier build to keep`);
      const { id, name, official, ...built } = old;
      manifest.push({ id: L.id, name: L.name, official: Boolean(L.official), ...built });
      kept.push(L.id);
      continue;
    }
    const isSvg = L.light.endsWith('.svg'), darkSvg = L.dark?.endsWith('.svg');
    const light = isSvg ? await svgLogo(path.join(src, L.light), path.join(dir, L.id)) : await rasterLogo(path.join(src, L.light), L.opaqueBg, path.join(dir, L.id));
    const dark = L.dark && (darkSvg ? await svgLogo(path.join(src, L.dark), path.join(dir, `${L.id}-dark`))
      : await rasterLogo(path.join(src, L.dark), false, path.join(dir, `${L.id}-dark`)));
    const lightOnWhite = weakShare(light.pixels, WHITE), lightOnNavy = weakShare(light.pixels, NAVY);
    const darkOnNavy = dark && weakShare(dark.pixels, NAVY);
    const pct = (n) => `${Math.round(n * 100)}%`;
    const files = { light: isSvg ? { svg: rel('logos', `${L.id}.svg`) } : { png: rel('logos', `${L.id}.png`), webp: rel('logos', `${L.id}.webp`) } };
    if (dark) files.dark = darkSvg ? { svg: rel('logos', `${L.id}-dark.svg`) } : { png: rel('logos', `${L.id}-dark.png`), webp: rel('logos', `${L.id}-dark.webp`) };
    const check = `Contrast check (share of the outline under 2:1, 5% or more = weak): light file on white ${pct(lightOnWhite)}, on navy ${pct(lightOnNavy)}` +
      (dark ? `; dark file on navy ${pct(darkOnNavy)}.` : '.');
    if (lightOnWhite >= 0.05) console.warn(`! ${L.id}: light file is weak on white (${pct(lightOnWhite)})`);
    manifest.push({
      id: L.id, name: L.name, official: Boolean(L.official), files, width: light.width, height: light.height,
      aspect: Math.round(light.width / light.height * 1000) / 1000,
      needsPlate: Boolean(L.forcePlate) || (dark ? darkOnNavy >= 0.05 : lightOnNavy >= 0.05),
      source: (L.dir ? path.relative(WEB, path.join(L.dir, L.light)).split(path.sep).join('/') : rel('03 Sponsors/Sponsor Logos', L.light)) + (L.dark ? ` + ${L.dark}` : ''),
      notes: `${L.notes} ${check}`,
    });
    if (dark && Math.abs(dark.width - light.width) > 2) console.warn(`! ${L.id}: dark file is ${dark.width}px wide, light ${light.width}px`);
  }
  const used = new Set(manifest.flatMap((m) => filePaths(m.files)).map((p) => path.basename(p)));
  for (const f of await readdir(dir)) if (f !== 'manifest.json' && !used.has(f)) await rm(path.join(dir, f));
  if (kept.length) console.log(`logos kept as last built (source not found): ${kept.join(', ')}`);
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

async function buildTeam() {
  const dir = path.join(OUT, 'team');
  if (!(await exists(TEAM_SRC))) {
    console.log('team kept as last built (source not found)');
    return readManifest(dir);
  }
  await rm(dir, { recursive: true, force: true }); await mkdir(dir, { recursive: true });
  const manifest = [];
  for (const [group, sub] of Object.entries(TEAM_DIRS)) {
    const files = (await readdir(path.join(TEAM_SRC, sub))).filter((f) => /\.(png|jpe?g)$/i.test(f));
    const people = files.map((f) => ({ f, name: f.replace(/^Screenshot \S+ at \S+ /, '').replace(/ Hack Arizona\.\w+$/, '').replace(/\s+/g, ' ').trim() }))
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const { f, name } of people) {
      const crop = CROPS[name]; assert.ok(crop, `no crop set for "${name}" (${f})`);
      const [left, top, side] = crop, id = slug(name);
      const src = path.join(TEAM_SRC, sub, f), meta = await sharp(src).metadata();
      assert.ok(left + side <= meta.width && top + side <= meta.height, `crop outside image for ${name}`);
      // Sources are 414px wide: 800 is always an upscale of the `nativePx` crop (400 too when nativePx < 400).
      // Swap in the original photos to get real detail at 800.
      const widths = [400, 800];
      const out = { avif: {}, webp: {}, jpg: {} };
      for (const w of widths) {
        const base = sharp(src).extract({ left, top, width: side, height: side }).resize(w, w, { kernel: 'lanczos3' }).removeAlpha().toColourspace('srgb');
        await base.clone().avif({ quality: 55, effort: 6 }).toFile(path.join(dir, `${id}-${w}.avif`));
        await base.clone().webp({ quality: 80, effort: 6 }).toFile(path.join(dir, `${id}-${w}.webp`));
        await base.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(dir, `${id}-${w}.jpg`));
        for (const fmt of ['avif', 'webp', 'jpg']) out[fmt][w] = rel('team', `${id}-${w}.${fmt}`);
      }
      manifest.push({ id, name, group, files: out, role: null, source: rel('05 Organizers', sub, f), nativePx: side });
    }
  }
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

// Self-check: every manifest file exists and is non-empty; headshots are square, metadata-free and the listed size.
async function verify(logos, team) {
  for (const L of logos) for (const p of filePaths(L.files)) assert.ok((await stat(path.join(OUT, p))).size > 0, p);
  for (const T of team) for (const [, byW] of Object.entries(T.files)) for (const [w, p] of Object.entries(byW)) {
    const m = await sharp(path.join(OUT, p)).metadata();
    assert.ok(m.width === +w && m.height === +w && !m.exif && !m.xmp, `${p}: ${m.width}x${m.height}, exif ${!!m.exif}`);
  }
  assert.equal(new Set(team.map((t) => t.id)).size, team.length, 'duplicate team ids');
}

const logos = await buildLogos();
const team = await buildTeam();
await verify(logos, team);
console.log(`logos: ${logos.length} (${logos.filter((l) => l.needsPlate).map((l) => l.id).join(', ')} need a plate on dark)`);
console.log(`team: ${team.length} (${team.filter((t) => t.nativePx < 400).map((t) => `${t.id} ${t.nativePx}px`).join(', ')} upscaled to 400)`);
