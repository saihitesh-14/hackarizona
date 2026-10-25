/** Shared motion and theme state. Page modules subscribe through the re-exports in shell.js. */
const root = document.documentElement;
const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionListeners = new Set();
const themeListeners = new Set();
// The inline head script already applied a saved pause or reduced motion before first paint.
let paused = root.dataset.motion === 'paused' || reducedQuery.matches;

export const prefersReducedMotion = () => reducedQuery.matches;
export const isPaused = () => paused;
export const currentTheme = () => (root.dataset.theme === 'dark' ? 'dark' : 'light');

/** fn(paused) runs on every pause change. Returns an unsubscribe function. */
export function onMotionChange(fn) {
  motionListeners.add(fn);
  return () => motionListeners.delete(fn);
}

/** fn(theme) runs after every theme change ('light' or 'dark'). Returns an unsubscribe function. */
export function onThemeChange(fn) {
  themeListeners.add(fn);
  return () => themeListeners.delete(fn);
}

export function setPaused(value, { save = true } = {}) {
  paused = value;
  root.dataset.motion = document.body.dataset.motion = paused ? 'paused' : 'running';
  if (save) {
    try {
      if (paused) localStorage.setItem('motion', 'paused');
      else localStorage.removeItem('motion');
    } catch {
      // Private windows can refuse storage; the choice still holds on this page.
    }
  }
  motionListeners.forEach(fn => fn(paused));
}

export function emitTheme(theme) {
  themeListeners.forEach(fn => fn(theme));
}

// Reduced motion pauses everything, and lifting it restores the visitor's own choice.
reducedQuery.addEventListener('change', () => {
  let saved = false;
  try {
    saved = localStorage.getItem('motion') === 'paused';
  } catch {
    // Storage unavailable: fall back to the system setting alone.
  }
  setPaused(reducedQuery.matches || saved, { save: false });
});
