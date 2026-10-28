import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const partials = resolve(root, 'src/partials');

// Page key -> HTML file. The key fills {{page}} and marks the dock item with aria-current="page".
export const pages = {
  home: 'index.html',
  story: 'story/index.html',
  events: 'events/index.html',
  sponsor: 'sponsor/index.html',
  team: 'team/index.html',
};

const pageFile = filename => relative(root, filename).split('\\').join('/');

/**
 * <!-- @include partials/NAME.html --> pulls in src/partials/NAME.html. Then {{root}} becomes the relative path
 * to the site root ('./' or '../'), so the built site works from any subfolder, and {{page}} becomes the page key.
 */
function includes() {
  return {
    name: 'hackaz-includes',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const file = pageFile(ctx.filename);
        // Pages outside the five (dev/medallion.html, say) still get includes and {{root}}, just no current dock item.
        const page = Object.keys(pages).find(key => pages[key] === file) || '';
        const up = '../'.repeat(file.split('/').length - 1) || './';
        // Partials may include partials (the header includes the wordmark), so expand until none are left.
        const include = /<!--\s*@include\s+partials\/([\w-]+)\.html\s*-->/g;
        let expanded = html;
        for (let depth = 0; include.test(expanded); depth++) {
          if (depth > 4) throw new Error(`hackaz-includes: includes nest too deep in ${file}`);
          expanded = expanded.replace(include, (_, name) => readFileSync(resolve(partials, `${name}.html`), 'utf8'));
        }
        const out = expanded
          .replaceAll('{{root}}', up)
          .replaceAll('{{page}}', page);
        return page ? out.replace(`data-dock="${page}"`, `data-dock="${page}" aria-current="page"`) : out;
      },
    },
    configureServer(server) {
      // Partials are not in the module graph, so a change reloads the page.
      server.watcher.add(partials);
      server.watcher.on('change', file => {
        if (file.startsWith(partials)) server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

/** Build only: preload the sans (the display face) so headlines do not swap late. */
function preloadDisplayFont() {
  return {
    name: 'hackaz-preload-font',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const font = Object.keys(ctx.bundle || {}).find(name => /schibsted-grotesk-latin-wght-normal.*\.woff2$/.test(name));
        if (!font) return html;
        const href = relative(dirname(pageFile(ctx.filename)), font).split('\\').join('/');
        return [{ tag: 'link', attrs: { rel: 'preload', href, as: 'font', type: 'font/woff2', crossorigin: '' }, injectTo: 'head' }];
      },
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [includes(), preloadDisplayFont()],
  build: {
    rolldownOptions: {
      input: Object.fromEntries(Object.entries(pages).map(([key, file]) => [key, resolve(root, file)])),
    },
  },
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
});
