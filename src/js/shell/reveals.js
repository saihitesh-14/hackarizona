/** Section reveals without the jump, and count-ups. Adapted from the minimal-motion-web starter's interactions.js.
    base.css hides [data-reveal] only under html.js; this adds .is-revealed as each one enters the screen. */
import { isPaused, prefersReducedMotion } from './state.js';

const canMove = () => !isPaused() && !prefersReducedMotion();

/** Count a figure such as "400+" or "$5K" up from zero, once. The final text is always what the markup says. */
export function countUp(element) {
  const match = element.textContent.trim().match(/^(\D*)(\d+)(\D*)$/);
  if (!match || !canMove()) return;
  const [, prefix, digits, suffix] = match;
  const target = Number(digits);
  const duration = 1400;
  const start = performance.now();
  // Hold the final width so neighbouring figures do not shift while counting.
  element.style.minWidth = `${element.getBoundingClientRect().width}px`;
  // One text node, updated in place: replacing the text every frame would insert a new node each time.
  element.textContent = `${prefix}0${suffix}`;
  const text = element.firstChild;
  let shown = '';
  const tick = now => {
    const progress = Math.min(1, (now - start) / duration);
    if (progress >= 1 || !canMove()) {
      text.nodeValue = prefix + digits + suffix;
      return;
    }
    const value = prefix + Math.round(target * (1 - Math.pow(1 - progress, 4))) + suffix;
    if (value !== shown) text.nodeValue = shown = value;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function initReveals() {
  const tracked = new WeakSet();
  const pending = new Set();
  const counted = new WeakSet();

  function reveal(element, order = 0) {
    pending.delete(element);
    // Elements entering together, such as a row of cards, cascade in reading order.
    element.style.setProperty('--reveal-delay', `${Math.min(order, 4) * 90}ms`);
    element.classList.add('is-revealed');
  }

  const supported = 'IntersectionObserver' in window;
  const revealObserver = supported && new IntersectionObserver(entries => {
    entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
      .forEach((entry, order) => {
        revealObserver.unobserve(entry.target);
        reveal(entry.target, order);
      });
  }, { rootMargin: '0px 0px 15% 0px' }); // start just before content scrolls in, so a fast scroll never lands on blank space

  // Figures count up the first time most of them is on screen, only when motion is allowed.
  const countObserver = supported && new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      countObserver.unobserve(entry.target);
      if (counted.has(entry.target)) return;
      counted.add(entry.target);
      countUp(entry.target);
    });
  }, { threshold: .6 });

  // A jump (End key, a far link, a slow device) can carry content past the screen between two observations.
  // Anything already scrolled past is shown at once, so scrolling back up finds it in place.
  let sweepFrame = 0;
  function sweep() {
    sweepFrame = 0;
    pending.forEach(element => {
      if (element.getBoundingClientRect().bottom < 0) {
        revealObserver?.unobserve(element);
        reveal(element);
      }
    });
  }
  window.addEventListener('scroll', () => {
    if (!sweepFrame && pending.size) sweepFrame = requestAnimationFrame(sweep);
  }, { passive: true });

  /** Start watching [data-reveal] and [data-count] inside scope. Safe to call again for content added later. */
  function watch(scope = document) {
    scope.querySelectorAll('[data-reveal]').forEach(element => {
      if (tracked.has(element)) return;
      tracked.add(element);
      if (!revealObserver) return reveal(element);
      pending.add(element);
      revealObserver.observe(element);
    });
    scope.querySelectorAll('[data-count]').forEach(element => {
      if (tracked.has(element)) return;
      tracked.add(element);
      countObserver?.observe(element);
    });
    sweep();
  }

  watch();
  // Tells the inline head script the modules loaded, so it keeps html.js (and the hidden reveal states).
  document.documentElement.classList.add('motion-ready');
  return { watch, sync() {} };
}
