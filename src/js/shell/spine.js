/** Signal spine: where you are on the page. A pulse travels down the left construction line as you scroll, and the
    pad on each .section's top rule lights when the pulse reaches it (the latest one is current and pings once).
    Phones, paused and reduced motion keep the pads (measured against a still line 35% down) without the pulse. */
import { isPaused, prefersReducedMotion } from './state.js';

export function initSpine() {
  const spine = document.createElement('div');
  spine.className = 'spine';
  spine.setAttribute('aria-hidden', 'true');
  spine.innerHTML = '<span class="spine-pulse"></span>';
  document.body.append(spine);
  const pulse = spine.firstElementChild;
  const wide = window.matchMedia('(min-width: 768px)');
  let frame = 0;
  let started = false;

  function update() {
    frame = 0;
    const sections = document.querySelectorAll('.section');
    const height = window.innerHeight;
    const max = document.documentElement.scrollHeight - height;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    const moving = !isPaused() && !prefersReducedMotion();
    const live = moving && wide.matches && sections.length > 0;
    // The pulse runs from below the header to above the dock, in step with the scroll position.
    const line = live ? 150 + Math.max(0, height - 270) * progress : height * .35;
    spine.classList.toggle('is-live', live);
    if (live) pulse.style.transform = `translate3d(0, ${line.toFixed(1)}px, 0)`;
    let current = null;
    sections.forEach(section => {
      const reached = section.getBoundingClientRect().top <= line;
      if (reached) current = section;
      if (reached && started && moving && !section.classList.contains('is-reached')) {
        section.classList.remove('is-arriving');
        void section.offsetWidth;
        section.classList.add('is-arriving');
      }
      section.classList.toggle('is-reached', reached);
    });
    sections.forEach(section => section.classList.toggle('is-current', section === current));
    started = true;
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  wide.addEventListener?.('change', schedule);
  document.addEventListener('animationend', event => {
    if (event.target.classList?.contains('is-arriving')) event.target.classList.remove('is-arriving');
  });
  update();
  return { sync: update };
}
