/*
 * The shell every page loads: loader, theme, pause motion, reveals and count-ups, cursor (magnetic, tilt and
 * spotlight), signal spine, dock, word band, tabs, copy buttons, external links, and page-change transitions.
 * Page modules import what they need from here:
 *
 *   import { isPaused, prefersReducedMotion, onMotionChange, onThemeChange, currentTheme, countUp, enhance } from '../shell.js';
 *
 * onMotionChange(fn) calls fn(paused) on every change; onThemeChange(fn) calls fn('light' | 'dark'). Both return an
 * unsubscribe function. Call enhance(element) after rendering markup into the page, so its reveals, counters, tabs,
 * copy buttons and external links are wired like the rest.
 */
import { currentTheme, isPaused, onMotionChange, onThemeChange, prefersReducedMotion, setPaused } from './shell/state.js';
import { runLoader } from './shell/loader.js';
import { initTheme } from './shell/theme.js';
import { countUp, initReveals } from './shell/reveals.js';
import { initCursor } from './shell/cursor.js';
import { initSpine } from './shell/spine.js';
import { initSections } from './shell/sections.js';
import { initTabs } from './shell/tabs.js';
import { initCopyButtons, initRegister, markExternal } from './shell/links.js';

export { countUp, currentTheme, isPaused, onMotionChange, onThemeChange, prefersReducedMotion };

// The site root for this page ('./' or '../', from the head partial), so JavaScript can build URLs that work from a
// subfolder deploy. Vite rewrites paths written in HTML and CSS, but not strings in JavaScript.
const siteRoot = new URL(document.querySelector('meta[name="site-root"]')?.content || './', location.href);
/** asset('img/manifest.json'), asset('/team/name-400.jpg') or asset('story/'): an absolute URL from any page. */
export const asset = path => new URL(path.replace(/^\//, ''), siteRoot).href;

runLoader();

// Pause motion: a button in the dock (desktop) and in the footer (every width). The choice is saved, and reduced
// motion starts the page paused (the inline head script applied both before first paint).
const motionButtons = Array.from(document.querySelectorAll('.motion-toggle'));
const showMotion = paused => motionButtons.forEach(button => {
  button.setAttribute('aria-pressed', String(paused));
  button.title = paused ? 'Play motion' : 'Pause motion';
  const label = button.querySelector('.motion-label');
  if (label) label.textContent = paused ? 'Play motion' : 'Pause motion';
});
setPaused(isPaused(), { save: false });
showMotion(isPaused());
motionButtons.forEach(button => {
  button.hidden = false;
  button.addEventListener('click', () => setPaused(!isPaused()));
});

initTheme(document.querySelector('.theme-toggle'));
initRegister();
markExternal();
initCopyButtons();
const reveals = initReveals();
const modules = [reveals, initCursor(), initSpine(), initSections(), initTabs()];
onMotionChange(paused => {
  showMotion(paused);
  modules.forEach(module => module.sync());
});

/** Wire markup a page module rendered after load. */
export function enhance(scope) {
  reveals.watch(scope);
  initTabs(scope);
  initCopyButtons(scope);
  markExternal(scope);
}

// Page changes: the header keeps its place only when it is on screen; scrolled away, it simply fades in on the new
// page instead of sliding down from above. A paused page changes without a transition.
const header = document.querySelector('.site-header');
window.addEventListener('pageswap', event => {
  if (!event.viewTransition) return;
  if (isPaused()) event.viewTransition.skipTransition();
  else if (header && header.getBoundingClientRect().bottom <= 0) header.style.viewTransitionName = 'none';
});
window.addEventListener('pageshow', () => header?.style.removeProperty('view-transition-name'));
