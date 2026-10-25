/** Pointer play for mice and trackpads: a trailing cursor, magnetic controls, and cards that tilt toward the pointer.
    Adapted from the minimal-motion-web starter. Elements are found under the pointer (not collected at start), so
    content a page module renders later works too. Off for touch, paused or reduced motion. */
import { follow } from './motion-utils.js';
import { isPaused, prefersReducedMotion } from './state.js';

const RING = 30;
const RING_LINK = 50;
const RING_LABEL = 78;
const RING_LENS = 66;
const MAGNET_PULL = .28;
const MAGNET_LIMIT = 12;
const TILT_DEGREES = 4.5;
const interactiveSelector = 'a[href], button:not(:disabled), summary, [role="tab"], [data-cursor]';

export function initCursor() {
  const root = document.documentElement;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  glow.setAttribute('aria-hidden', 'true');
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span class="cursor-ring"><span class="cursor-label"></span></span><span class="cursor-dot"></span>';
  const ring = cursor.querySelector('.cursor-ring');
  const label = cursor.querySelector('.cursor-label');
  const dot = cursor.querySelector('.cursor-dot');
  document.body.prepend(glow);
  document.body.append(cursor);

  const pointer = { x: -100, y: -100, inside: false, pressed: false };
  const ringState = { x: -100, y: -100, w: RING, h: RING, press: 1 };
  const glowState = { x: -100, y: -100 };
  // Elements currently pulled or tilted, kept until they have eased back to rest.
  const magnets = new Map();
  const tilts = new Map();
  let target = null;
  let stuck = null;
  let tilted = null;
  let enabled = false;
  let frame = 0;
  let lastFrame = 0;

  function setStyleTranslate(element, x, y) {
    element.style.translate = Math.abs(x) < .05 && Math.abs(y) < .05 ? '' : `${x.toFixed(2)}px ${y.toFixed(2)}px`;
  }

  function classify() {
    const under = pointer.inside ? document.elementFromPoint(pointer.x, pointer.y) : null;
    target = under?.closest(interactiveSelector) || null;
    stuck = target?.hasAttribute('data-magnetic') ? target : null;
    tilted = under?.closest('[data-tilt]') || null;
    const text = target?.dataset.cursor || '';
    if (text) label.textContent = text;
    cursor.classList.toggle('is-label', Boolean(text));
    // A lens is a hollow ring with its label below, so whatever is under the pointer stays visible.
    cursor.classList.toggle('is-lens', Boolean(text) && target.dataset.cursorStyle === 'lens');
    cursor.classList.toggle('is-stuck', Boolean(stuck) && !text);
    cursor.classList.toggle('is-link', Boolean(target) && !text && !stuck);
    if (stuck && !magnets.has(stuck)) {
      magnets.set(stuck, { parts: Array.from(stuck.querySelectorAll(':scope > .arrow, :scope > svg')), x: 0, y: 0, tx: 0, ty: 0 });
    }
    if (tilted && !tilts.has(tilted)) tilts.set(tilted, { x: 0, y: 0, tx: 0, ty: 0 });
  }

  function aim() {
    magnets.forEach((magnet, element) => {
      if (element !== stuck) {
        magnet.tx = magnet.ty = 0;
        return;
      }
      // Measure without the current pull, so the pull does not feed back into itself.
      const rect = element.getBoundingClientRect();
      const cx = rect.left - magnet.x + rect.width / 2;
      const cy = rect.top - magnet.y + rect.height / 2;
      magnet.tx = Math.max(-MAGNET_LIMIT, Math.min(MAGNET_LIMIT, (pointer.x - cx) * MAGNET_PULL));
      magnet.ty = Math.max(-MAGNET_LIMIT, Math.min(MAGNET_LIMIT, (pointer.y - cy) * MAGNET_PULL));
    });
    tilts.forEach((tilt, element) => {
      const over = element === tilted;
      element.classList.toggle('is-lit', over);
      if (!over) {
        tilt.tx = tilt.ty = 0;
        return;
      }
      const rect = element.getBoundingClientRect();
      const nx = (pointer.x - rect.left) / rect.width * 2 - 1;
      const ny = (pointer.y - rect.top) / rect.height * 2 - 1;
      // The side under the pointer presses away.
      tilt.tx = -ny * TILT_DEGREES;
      tilt.ty = nx * TILT_DEGREES;
      element.style.setProperty('--mx', `${(pointer.x - rect.left).toFixed(1)}px`);
      element.style.setProperty('--my', `${(pointer.y - rect.top).toFixed(1)}px`);
    });
  }

  function render(delta) {
    let busy = false;
    const settle = (value, goal, rate) => {
      const next = follow(value, goal, rate, delta);
      if (Math.abs(next - goal) > .05) {
        busy = true;
        return next;
      }
      return goal;
    };
    let goalX = pointer.x;
    let goalY = pointer.y;
    let goalW = RING;
    let goalH = RING;
    if (cursor.classList.contains('is-label')) {
      goalW = goalH = cursor.classList.contains('is-lens') ? RING_LENS : RING_LABEL;
    } else if (stuck) {
      // The ring wraps the control it is stuck to.
      const rect = stuck.getBoundingClientRect();
      goalX = rect.left + rect.width / 2;
      goalY = rect.top + rect.height / 2;
      goalW = rect.width + 14;
      goalH = rect.height + 14;
    } else if (target) {
      goalW = goalH = RING_LINK;
    }
    ringState.x = settle(ringState.x, goalX, 20);
    ringState.y = settle(ringState.y, goalY, 20);
    ringState.w = settle(ringState.w, goalW, 16);
    ringState.h = settle(ringState.h, goalH, 16);
    ringState.press = settle(ringState.press, pointer.pressed ? .86 : 1, 22);
    glowState.x = settle(glowState.x, pointer.x, 3.5);
    glowState.y = settle(glowState.y, pointer.y, 3.5);
    ring.style.width = `${ringState.w.toFixed(2)}px`;
    ring.style.height = `${ringState.h.toFixed(2)}px`;
    ring.style.transform = `translate3d(${(ringState.x - ringState.w / 2).toFixed(2)}px, ${(ringState.y - ringState.h / 2).toFixed(2)}px, 0) scale(${ringState.press.toFixed(3)})`;
    dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
    glow.style.transform = `translate3d(${glowState.x.toFixed(1)}px, ${glowState.y.toFixed(1)}px, 0)`;

    magnets.forEach((magnet, element) => {
      magnet.x = settle(magnet.x, magnet.tx, 14);
      magnet.y = settle(magnet.y, magnet.ty, 14);
      setStyleTranslate(element, magnet.x, magnet.y);
      // Icons and arrows inside travel a little further, for depth.
      magnet.parts.forEach(part => setStyleTranslate(part, magnet.x * .45, magnet.y * .45));
      if (element !== stuck && !magnet.x && !magnet.y) magnets.delete(element);
    });
    tilts.forEach((tilt, element) => {
      tilt.x = settle(tilt.x, tilt.tx, 9);
      tilt.y = settle(tilt.y, tilt.ty, 9);
      const angle = Math.hypot(tilt.x, tilt.y);
      element.style.rotate = angle < .02 ? '' : `${tilt.x.toFixed(3)} ${tilt.y.toFixed(3)} 0 ${angle.toFixed(3)}deg`;
      if (element !== tilted && !tilt.x && !tilt.y) tilts.delete(element);
    });
    return busy;
  }

  function tick(now) {
    frame = 0;
    // Slow devices keep real time down to 10fps; a stalled tab is not replayed.
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, .1) : 1 / 60;
    lastFrame = now;
    if (render(delta)) frame = requestAnimationFrame(tick);
    else lastFrame = 0;
  }
  function wake() {
    if (enabled && !frame) frame = requestAnimationFrame(tick);
  }
  function update() {
    classify();
    aim();
    wake();
  }

  function onMove(event) {
    if (!enabled || event.pointerType === 'touch') return;
    const entering = !pointer.inside;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.inside = true;
    if (entering) {
      // Appear where the pointer is, rather than flying in from the last position.
      Object.assign(ringState, { x: pointer.x, y: pointer.y });
      Object.assign(glowState, { x: pointer.x, y: pointer.y });
    }
    cursor.classList.add('is-visible');
    glow.classList.add('is-visible');
    update();
  }
  function onLeave() {
    pointer.inside = false;
    cursor.classList.remove('is-visible');
    glow.classList.remove('is-visible');
    update();
  }
  // The element under a still pointer changes as the page scrolls.
  const onScroll = () => {
    if (enabled && pointer.inside) update();
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') return;
    pointer.pressed = true;
    wake();
  }, { passive: true });
  window.addEventListener('pointerup', () => {
    pointer.pressed = false;
    wake();
  }, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  root.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);

  /** Turn everything off when motion is paused or reduced, or the pointer is not a mouse. */
  function sync() {
    const next = finePointer.matches && !isPaused() && !prefersReducedMotion();
    if (next === enabled) return;
    enabled = next;
    root.classList.toggle('has-cursor', enabled);
    if (enabled) return;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    pointer.inside = false;
    target = stuck = tilted = null;
    cursor.classList.remove('is-visible', 'is-link', 'is-stuck', 'is-label', 'is-lens');
    glow.classList.remove('is-visible');
    magnets.forEach((magnet, element) => {
      setStyleTranslate(element, 0, 0);
      magnet.parts.forEach(part => setStyleTranslate(part, 0, 0));
    });
    tilts.forEach((tilt, element) => {
      element.style.rotate = '';
      element.classList.remove('is-lit');
    });
    magnets.clear();
    tilts.clear();
  }
  finePointer.addEventListener?.('change', sync);
  sync();
  return { sync };
}
