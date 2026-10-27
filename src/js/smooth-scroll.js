// Smooth scrolling (Lenis) for pages without their own scroll story; the home page drives Lenis from home-intro.js.
// Off while motion is paused or reduced, so the browser's own scrolling takes over.
import Lenis from 'lenis';
import { isPaused, onMotionChange } from './shell.js';

export function initSmoothScroll() {
  let lenis = null;
  let frame = 0;
  const raf = time => {
    lenis?.raf(time);
    frame = requestAnimationFrame(raf);
  };
  const sync = () => {
    cancelAnimationFrame(frame);
    lenis?.destroy();
    lenis = null;
    if (isPaused()) return;
    lenis = new Lenis({ anchors: true, lerp: 0.09 });
    frame = requestAnimationFrame(raf);
  };
  onMotionChange(sync);
  sync();
}
