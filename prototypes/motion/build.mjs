import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const result = await build(
{
    entryPoints: ['src/main.js'],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020'],
    write: false,
    legalComments: 'none'
});
const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const cactus = readFileSync('src/cactus_path.txt', 'utf8').trim();
const html = readFileSync('index.template.html', 'utf8')
    .replace('{{CACTUS}}', cactus)
    .replace('{{SCRIPT}}', () => script);
writeFileSync('dist/hackaz-motion-prototype.html', html);
console.log('script', (script.length / 1024).toFixed(1), 'KB; html', (html.length / 1024).toFixed(1), 'KB');
