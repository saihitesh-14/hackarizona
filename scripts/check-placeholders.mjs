// Lists every data-placeholder and data-unconfirmed in the source HTML (pages and partials) and in the built dist,
// with file, line, what is missing and the visible text. Placeholders must never ship: --strict exits 1 if any exist.
// Run: npm run check:placeholders [-- --strict]
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = fileURLToPath(new URL('..', import.meta.url));
const strict = process.argv.includes('--strict');

function htmlFiles(dir, skip = []) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap(name => {
    const file = path.join(dir, name);
    if (skip.includes(name)) return [];
    if (statSync(file).isDirectory()) return htmlFiles(file, skip);
    return name.endsWith('.html') ? [file] : [];
  });
}

/** Every marker in one file: { line, kind, note, text, inComment }. */
export function findMarkers(html) {
  const comments = [...html.matchAll(/<!--[\s\S]*?-->/g)].map(match => [match.index, match.index + match[0].length]);
  const markers = [];
  for (const match of html.matchAll(/data-(placeholder|unconfirmed)(?:\s*=\s*"([^"]*)")?/g)) {
    const inComment = comments.some(([start, end]) => match.index > start && match.index < end);
    // The visible text: what follows the end of the opening tag, up to the next tag.
    const tagEnd = html.indexOf('>', match.index);
    const text = inComment || tagEnd < 0 ? '' : html.slice(tagEnd + 1, html.indexOf('<', tagEnd + 1)).replace(/\s+/g, ' ').trim();
    markers.push({ line: html.slice(0, match.index).split('\n').length, kind: match[1], note: match[2] || '', text, inComment });
  }
  return markers;
}

// Self-check on a tiny sample, so a broken pattern cannot report "none found".
{
  const sample = '<p>\n<span data-placeholder="Discord invite link">[TBC: invite link]</span>\n<!-- data-placeholder="font": note --><b data-unconfirmed>150+</b></p>';
  const found = findMarkers(sample);
  const ok = found.length === 3 && found[0].text === '[TBC: invite link]' && found[0].line === 2 && found[1].inComment && found[2].kind === 'unconfirmed' && found[2].text === '150+';
  if (!ok) {
    console.error('check-placeholders: self-check failed', found);
    process.exit(2);
  }
}

const groups = {
  source: [
    ...['index.html', 'story/index.html', 'events/index.html', 'sponsor/index.html', 'team/index.html'].map(file => path.join(WEB, file)).filter(existsSync),
    ...htmlFiles(path.join(WEB, 'src')),
  ],
  dist: htmlFiles(path.join(WEB, 'dist')),
};

let total = 0;
for (const [group, files] of Object.entries(groups)) {
  console.log(`\n${group}${group === 'dist' && !files.length ? ' (no dist yet: run npm run build)' : ''}`);
  for (const file of files) {
    const markers = findMarkers(readFileSync(file, 'utf8'));
    if (!markers.length) continue;
    console.log(`  ${path.relative(WEB, file)}`);
    for (const marker of markers) {
      total++;
      const where = marker.inComment ? ' (in a comment)' : '';
      console.log(`    ${String(marker.line).padStart(4)}  ${marker.kind}${where}  ${marker.note ? `"${marker.note}"` : ''}${marker.text ? `  ${marker.text}` : ''}`);
    }
  }
}
console.log(`\n${total} marker(s) found.`);
if (strict && total) {
  console.error('Placeholders or unconfirmed facts remain; they must not ship.');
  process.exit(1);
}
