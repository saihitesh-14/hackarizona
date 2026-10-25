#!/usr/bin/env node
/*
 * Verify a site built with this skill. Serve it first, then:
 *
 *   node qa-site.cjs http://127.0.0.1:4173/ <out-dir>
 *
 * Checks: console errors and failed requests; horizontal overflow at 320, 375, 768 and 1440px;
 * content that stays invisible while on screen; reduced motion and no-JavaScript
 * visitors seeing everything; the pause control stopping animation; a visible focus style on
 * every element reached by Tab. Saves a screenshot of each top-level section in light and dark,
 * plus contact sheets. Prints a JSON report; exits 1 when a check fails.
 */
const fs = require('fs');
const path = require('path');

function loadPlaywright() {
  for (const candidate of [process.env.PLAYWRIGHT_PATH, 'playwright', '/opt/node22/lib/node_modules/playwright']) {
    if (!candidate) continue;
    try {
      return require(candidate);
    } catch {
      // Try the next location.
    }
  }
  console.error('Playwright not found. Install it with `npm i -D playwright && npx playwright install chromium`, or set PLAYWRIGHT_PATH.');
  process.exit(1);
}

const [url, outDir] = process.argv.slice(2);
if (!url || !outDir) {
  console.error('Usage: node qa-site.cjs <url> <out-dir>');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
const launchArgs = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const report = { url, errors: [], overflow: {}, stuckHidden: [], reducedMotion: {}, noScript: {}, pause: null, focusWithoutStyle: [], screenshots: [] };

function watch(page, label) {
  page.on('pageerror', error => report.errors.push(`${label}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(`${label}: ${message.text()}`); });
  page.on('response', response => { if (response.status() >= 400) report.errors.push(`${label}: ${response.status()} ${response.url()}`); });
}

// Elements that take up space but cannot be seen, ignoring decoration hidden from assistive technology.
// With inView, only elements on screen count: content scrolled past during a fast jump may legitimately
// still be waiting to reveal, but content on screen must never stay invisible.
const findInvisible = inView => [...document.querySelectorAll('main *, footer *')].filter(element => {
  if (element.closest('[aria-hidden="true"], [hidden], dialog, .loader')) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width < 20 || rect.height < 20) return false;
  if (inView && (rect.bottom < 0 || rect.top > window.innerHeight)) return false;
  let node = element;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (Number(style.opacity) < .05) return true;
    node = node.parentElement;
  }
  return false;
}).slice(0, 10).map(element => element.tagName.toLowerCase() + (element.id ? `#${element.id}` : '') + (element.className && typeof element.className === 'string' ? `.${element.className.trim().split(/\s+/).join('.')}` : ''));

async function scrollThrough(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += 600) {
    await page.evaluate(top => window.scrollTo(0, top), y);
    await page.waitForTimeout(220);
  }
  await page.waitForTimeout(1500);
}

async function newPage(browser, options, label) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  // Skip a once-per-visit loader so it does not cover the checks.
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('intro-seen', '1');
    } catch {
      // Storage can be unavailable; the loader then times out on its own.
    }
  });
  watch(page, label);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  return { context, page };
}

async function sheet(browser, files, name) {
  if (!files.length) return;
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;display:grid;grid-template-columns:repeat(2,720px)}img{width:720px;height:450px;display:block;object-fit:cover;object-position:top}</style>${files.map(file => `<img src="${path.basename(file)}">`).join('')}`;
  const htmlPath = path.join(outDir, `${name}.html`);
  fs.writeFileSync(htmlPath, html);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('file://' + path.resolve(htmlPath));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
  await page.close();
  fs.unlinkSync(htmlPath);
}

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ args: launchArgs });

  for (const width of [320, 375, 768, 1440]) {
    const mobile = width < 768;
    const { context, page } = await newPage(browser, { viewport: { width, height: 860 }, isMobile: mobile, hasTouch: mobile }, `${width}px`);
    await scrollThrough(page);
    report.overflow[width] = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (width === 1440) {
      // Walk the page again, pausing long enough for every entrance to finish, and look at what is on screen.
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      const stuck = new Set();
      for (let y = 0; y <= height; y += 700) {
        await page.evaluate(top => window.scrollTo(0, top), y);
        await page.waitForTimeout(1600);
        (await page.evaluate(findInvisible, true)).forEach(item => stuck.add(item));
      }
      report.stuckHidden = [...stuck].slice(0, 10);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    const file = path.join(outDir, `top-${width}.png`);
    await page.screenshot({ path: file });
    report.screenshots.push(file);
    await context.close();
  }

  for (const scheme of ['light', 'dark']) {
    const { context, page } = await newPage(browser, { viewport: { width: 1440, height: 900 }, colorScheme: scheme }, scheme);
    const ids = await page.evaluate(() => [...document.querySelectorAll('main > section[id], main > [id]')].map(element => element.id));
    const files = [];
    for (const id of ids) {
      await page.evaluate(target => { const element = document.getElementById(target); window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 30); }, id);
      await page.waitForTimeout(1600);
      const file = path.join(outDir, `${scheme}-${id}.png`);
      await page.screenshot({ path: file });
      files.push(file);
    }
    report.screenshots.push(...files);
    await sheet(browser, files, `sheet-${scheme}`);
    await context.close();
  }

  {
    const { context, page } = await newPage(browser, { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }, 'reduced-motion');
    await page.waitForTimeout(500);
    report.reducedMotion = await page.evaluate(() => ({
      runningAnimations: document.getAnimations().filter(animation => animation.playState === 'running').length,
      loaderShowing: document.documentElement.classList.contains('is-loading'),
    }));
    report.reducedMotion.invisibleBeforeScrolling = await page.evaluate(findInvisible, false);
    await context.close();
  }

  {
    const { context, page } = await newPage(browser, { viewport: { width: 1440, height: 900 }, javaScriptEnabled: false }, 'no-js');
    await page.waitForTimeout(1200);
    report.noScript.invisible = await page.evaluate(findInvisible, false);
    await context.close();
  }

  {
    const { context, page } = await newPage(browser, { viewport: { width: 1440, height: 900 } }, 'keyboard');
    const toggle = await page.$('.motion-toggle:not([hidden])');
    if (toggle) {
      await toggle.click();
      await page.waitForTimeout(400);
      report.pause = await page.evaluate(() => ({
        paused: document.body.dataset.motion === 'paused',
        runningAnimations: document.getAnimations().filter(animation => animation.playState === 'running').length,
      }));
      await toggle.click();
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    for (let step = 0; step < 40; step++) {
      await page.keyboard.press('Tab');
      const missing = await page.evaluate(() => {
        const element = document.activeElement;
        if (!element || element === document.body) return null;
        const style = getComputedStyle(element);
        const visible = (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none';
        return visible ? null : (element.tagName.toLowerCase() + ' ' + (element.textContent || '').trim().slice(0, 30));
      });
      if (missing) report.focusWithoutStyle.push(missing);
    }
    await context.close();
  }

  await browser.close();
  const failures = [
    report.errors.length && 'errors',
    Object.values(report.overflow).some(value => value > 0) && 'overflow',
    report.stuckHidden.length && 'content invisible while on screen',
    report.reducedMotion.invisibleBeforeScrolling?.length && 'hidden with reduced motion',
    report.reducedMotion.loaderShowing && 'loader with reduced motion',
    report.reducedMotion.runningAnimations > 0 && 'animation running with reduced motion',
    report.noScript.invisible?.length && 'hidden without JavaScript',
    report.pause && (!report.pause.paused || report.pause.runningAnimations > 0) && 'pause leaves animation running',
    report.focusWithoutStyle.length && 'focus without a visible style',
  ].filter(Boolean);
  report.failures = failures;
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, screenshots: `${report.screenshots.length} files in ${outDir}` }, null, 2));
  process.exit(failures.length ? 1 : 0);
})();
