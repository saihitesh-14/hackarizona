/** Scroll-linked shell parts: the dock dot for in-page sections, and the word band. Adapted from the starter.
    The current page's dock item is marked at build time (aria-current="page", vite.config.js). A section with
    data-dock-section="sponsor" (say, a sponsor block on the home page) shows the dot on that item while it crosses
    a line 35% down the screen, without changing aria-current. */
import { isPaused, prefersReducedMotion } from './state.js';

export function initSections() {
  const canMove = () => !isPaused() && !prefersReducedMotion();
  const dockLinks = new Map(Array.from(document.querySelectorAll('.dock [data-dock]')).map(link => [link.dataset.dock, link]));

  function markCurrent() {
    const focus = window.innerHeight * .35;
    const section = Array.from(document.querySelectorAll('[data-dock-section]')).find(element => {
      const rect = element.getBoundingClientRect();
      return rect.top <= focus && rect.bottom > focus;
    });
    const current = section?.dataset.dockSection;
    dockLinks.forEach((link, key) => link.classList.toggle('is-here', key === current && !link.hasAttribute('aria-current')));
  }

  // The word band drifts sideways at about the speed of scrolling while it crosses the screen.
  function drawBands() {
    document.querySelectorAll('.marquee').forEach(band => {
      const track = band.querySelector('.marquee-track');
      if (!track) return;
      if (!canMove()) {
        track.style.transform = '';
        return;
      }
      const rect = band.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const travel = Math.min(track.scrollWidth - band.clientWidth, window.innerWidth * 1.1);
      track.style.transform = `translate3d(${(-progress * travel).toFixed(1)}px, 0, 0)`;
    });
  }

  let frame = 0;
  function onScroll() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      markCurrent();
      drawBands();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();
  return { sync: drawBands };
}
