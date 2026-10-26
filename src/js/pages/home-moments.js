// The moments carousel. The track is a native horizontal scroller, so swipe, trackpad, keyboard and no-JavaScript
// visitors all work already; this adds the previous and next buttons and, for a mouse, drag with a little momentum.
import { isPaused } from '../shell.js';

export function initMoments(section) {
  const track = section?.querySelector('[data-moments-track]');
  if (!track) return;
  const controls = section.querySelector('[data-moments-controls]');
  const previous = section.querySelector('[data-moments-prev]');
  const next = section.querySelector('[data-moments-next]');

  // One card plus the gap between cards.
  const step = () => {
    const card = track.querySelector('.home-moment');
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
  };
  const go = direction => track.scrollBy({ left: direction * step(), behavior: isPaused() ? 'auto' : 'smooth' });
  const sync = () => {
    const end = track.scrollWidth - track.clientWidth - 2;
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= end;
  };
  previous.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  track.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  controls.hidden = false;
  sync();

  // Mouse drag: the track follows the pointer, then coasts to a stop (no coasting when motion is paused).
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  track.classList.add('is-draggable');
  let drag = null;
  let coast = 0;
  const glide = velocity => {
    let last = performance.now();
    const tick = now => {
      const ms = now - last;
      last = now;
      track.scrollLeft -= velocity * ms;
      velocity *= Math.pow(0.94, ms / 16);
      if (Math.abs(velocity) > 0.02) coast = requestAnimationFrame(tick);
      else track.classList.remove('is-dragging');
    };
    coast = requestAnimationFrame(tick);
  };
  track.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    cancelAnimationFrame(coast);
    track.classList.remove('is-dragging');
    drag = { id: event.pointerId, x: event.clientX, left: track.scrollLeft, moved: false, velocity: 0, lastX: event.clientX, lastTime: event.timeStamp };
  });
  track.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 5) return;
      drag.moved = true;
      track.setPointerCapture(event.pointerId);
      track.classList.add('is-dragging');
    }
    track.scrollLeft = drag.left - dx;
    const ms = Math.max(1, event.timeStamp - drag.lastTime);
    drag.velocity = Math.max(-2.5, Math.min(2.5, (event.clientX - drag.lastX) / ms)); // px per ms, capped so a flick stays in hand
    drag.lastX = event.clientX;
    drag.lastTime = event.timeStamp;
  });
  const release = event => {
    if (!drag || event.pointerId !== drag.id) return;
    const { moved, velocity } = drag;
    drag = null;
    if (!moved) return;
    // A drag is not a click on whatever is under the pointer.
    track.addEventListener('click', stop => stop.preventDefault(), { capture: true, once: true });
    if (isPaused() || Math.abs(velocity) < 0.05) track.classList.remove('is-dragging');
    else glide(velocity);
  };
  track.addEventListener('pointerup', release);
  track.addEventListener('pointercancel', release);
}
