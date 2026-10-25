// Full QA pass: build, serve dist from a subfolder on 127.0.0.1 (/hackaz/, like a GitHub Pages project site),
// check that every link and asset in the built HTML and CSS resolves there, run qa-site.cjs (console errors, failed
// requests, overflow at 320/375/768/1440, hidden content, reduced motion, no JavaScript, pause, focus styles, light
// and dark contact sheets) on each page into qa-output/<page>/, run contrast.py on the tokens, and print a summary.
// Run: node scripts/qa.mjs [port]      (default 4301; exits 1 when anything fails)
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pages } from '../vite.config.js';

const WEB = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.argv[2]) || 4301;
const SUB = 'hackaz';
const base = `http://127.0.0.1:${port}/${SUB}/`;
const failures = [];
const run = (command, args, options = {}) => spawnSync(command, args, { cwd: WEB, stdio: 'inherit', ...options }).status;

console.log('1. Build');
if (run(path.join(WEB, 'node_modules/.bin/vite'), ['build']) !== 0) {
  console.error('Build failed.');
  process.exit(1);
}

console.log(`\n2. Serve dist at ${base}`);
const root = mkdtempSync(path.join(os.tmpdir(), 'hackaz-qa-'));
cpSync(path.join(WEB, 'dist'), path.join(root, SUB), { recursive: true });
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', root], { stdio: 'ignore' });
const stop = () => {
  server.kill();
  rmSync(root, { recursive: true, force: true });
};
process.on('exit', stop);
process.on('SIGINT', () => process.exit(130));
for (let attempt = 0; ; attempt++) {
  try {
    if ((await fetch(base)).ok) break;
  } catch {
    // Not listening yet.
  }
  if (attempt > 50) {
    console.error(`Server did not start on port ${port}.`);
    process.exit(1);
  }
  await new Promise(resolve => setTimeout(resolve, 100));
}

console.log('\n3. Links and assets from the subfolder');
const distFiles = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? distFiles(file) : [file];
});
const targets = new Map();
for (const file of distFiles(path.join(WEB, 'dist')).filter(file => /\.(html|css)$/.test(file))) {
  const from = base + path.relative(path.join(WEB, 'dist'), file).split(path.sep).join('/');
  const text = readFileSync(file, 'utf8');
  const refs = file.endsWith('.html')
    ? [...text.matchAll(/\s(?:href|src)="([^"]+)"/g)].map(match => match[1])
    : [...text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map(match => match[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:|#)/.test(ref)) continue;
    const url = new URL(ref, from);
    url.hash = '';
    if (!targets.has(url.href)) targets.set(url.href, `${path.relative(WEB, file)} -> ${ref}`);
  }
}
for (const [url, origin] of targets) {
  const status = await fetch(url).then(response => response.status, () => 'no response');
  if (status !== 200) failures.push(`link ${status}: ${origin}`);
}
console.log(`  ${targets.size} distinct internal URLs checked`);

console.log('\n4. Browser checks per page (scripts/qa-site.cjs)');
const qaSite = path.join(WEB, 'scripts/qa-site.cjs');
for (const [key, file] of Object.entries(pages)) {
  const url = base + file.replace(/index\.html$/, '');
  const out = path.join(WEB, 'qa-output', key);
  rmSync(out, { recursive: true, force: true });
  console.log(`  ${key}: ${url}`);
  spawnSync('node', [qaSite, url, out], { cwd: WEB, stdio: 'ignore', env: { ...process.env, NODE_PATH: path.join(WEB, 'node_modules') } });
  const reportFile = path.join(out, 'report.json');
  if (!existsSync(reportFile)) {
    failures.push(`${key}: qa-site produced no report`);
    continue;
  }
  const report = JSON.parse(readFileSync(reportFile, 'utf8'));
  report.failures.forEach(failure => failures.push(`${key}: ${failure}`));
  report.errors.slice(0, 5).forEach(error => console.log(`    error: ${error}`));
  if (report.stuckHidden.length) console.log(`    hidden on screen: ${report.stuckHidden.join(', ')}`);
  if (report.focusWithoutStyle.length) console.log(`    focus without style: ${report.focusWithoutStyle.join(', ')}`);
  console.log(`    ${report.failures.length ? `FAIL ${report.failures.join('; ')}` : 'ok'}  (overflow ${JSON.stringify(report.overflow)}, screenshots in qa-output/${key}/)`);
}

console.log('\n5. Contrast (scripts/contrast.py src/styles/tokens.css)');
if (run('python3', [path.join(WEB, 'scripts/contrast.py'), path.join(WEB, 'src/styles/tokens.css')]) !== 0) failures.push('contrast: a token pair is below 4.5:1');

console.log(`\nSummary: ${failures.length ? `${failures.length} failure(s)` : 'all checks passed'}`);
failures.forEach(failure => console.log(`  - ${failure}`));
process.exit(failures.length ? 1 : 0);
