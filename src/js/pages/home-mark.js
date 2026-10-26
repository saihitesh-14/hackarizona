// The hero mark: the Hack Arizona logo as a motion graphic. It draws itself the way the loader does (once the loader
// has lifted, on a first visit), then sends a pulse up the saguaro to the pads every few seconds. It leans toward the
// pointer, and a click replays the whole draw-on. Paused or reduced motion shows the finished logo, still; so does a
// visit without JavaScript (the markup has no masks until this module adds them).
import { createDrawOn, DRAW_END, PULSE_START } from '../shell/loader.js';
import { isPaused, onMotionChange } from '../shell.js';

const SPEED = 1.1; // timeline seconds per second
const AFTERGLOW = 0.6; // timeline seconds the last pad keeps glowing after a pulse
const REST = 3.4; // seconds between pulses
const TILT = 11; // degrees, with the pointer at the edge of the mark

export function initMark(mark) {
  const svg = mark?.querySelector('.home-mark-svg');
  if (!svg) return;
  const render = createDrawOn(svg);
  const root = document.documentElement;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let phase = 'draw'; // 'draw' from 0, 'pulse' from PULSE_START, or 'rest' between pulses
  let t = 0;
  let wait = 0;
  let visible = false;
  let frame = 0;
  let last = 0;
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };

  const setTilt = () => {
    mark.style.setProperty('--tilt-x', `${tilt.x.toFixed(2)}deg`);
    mark.style.setProperty('--tilt-y', `${tilt.y.toFixed(2)}deg`);
  };

  const step = seconds => {
    if (phase === 'rest') {
      wait -= seconds;
      if (wait <= 0) {
        phase = 'pulse';
        t = PULSE_START;
      }
    } else {
      t += seconds * SPEED;
      if (t >= DRAW_END + AFTERGLOW) {
        phase = 'rest';
        wait = REST;
        render(DRAW_END + AFTERGLOW + 10);
      } else {
        render(t);
      }
    }
    const ease = Math.min(1, seconds * 6);
    tilt.x += (tilt.tx - tilt.x) * ease;
    tilt.y += (tilt.ty - tilt.y) * ease;
    setTilt();
  };

  const tick = now => {
    step(Math.min(0.05, (now - (last || now)) / 1000));
    last = now;
    frame = requestAnimationFrame(tick);
  };

  const sync = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    if (isPaused()) {
      phase = 'rest';
      wait = REST;
      render(DRAW_END + 10);
      tilt.x = tilt.y = tilt.tx = tilt.ty = 0;
      setTilt();
    } else if (visible && !document.hidden && !root.classList.contains('is-loading')) {
      frame = requestAnimationFrame(tick);
    }
    mark.classList.add('is-ready');
  };

  // On a first visit the loader draws the logo full screen; this one waits until that has lifted.
  new MutationObserver(() => {
    if (!root.classList.contains('is-loading')) sync();
  }).observe(root, { attributes: true, attributeFilter: ['class'] });
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(mark);
  document.addEventListener('visibilitychange', sync);
  onMotionChange(sync);

  mark.addEventListener('click', () => {
    if (isPaused()) return;
    phase = 'draw';
    t = 0;
    render(0);
  });

  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !finePointer.matches || isPaused()) return;
    const box = mark.getBoundingClientRect();
    const dx = (event.clientX - (box.left + box.width / 2)) / box.width;
    const dy = (event.clientY - (box.top + box.height / 2)) / box.height;
    const near = Math.abs(dx) < 1.5 && Math.abs(dy) < 1.5;
    tilt.tx = near ? Math.max(-1, Math.min(1, dx)) * TILT : 0;
    tilt.ty = near ? Math.max(-1, Math.min(1, dy)) * -TILT : 0;
  }, { passive: true });

  render(0);
  sync();
}
