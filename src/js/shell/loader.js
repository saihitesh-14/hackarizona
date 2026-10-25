/*
 * First-visit loader: the Hack Arizona mark draws itself, then the block wipes away (adapted from
 * prototypes/motion/src/loader.js). The mark is revealed through masks whose strokes follow its centre lines, so
 * the final frame is the logo itself. A signal leaves the base of the trunk and every part appears when it arrives.
 * Prototype timeline (seconds), played at 1.25x so it lasts about 1.8s:
 *   0.00 to 0.70  the disc fades in and the white ring draws round from the bottom
 *   0.35 to 1.45  the signal grows the trunk, the arms and the pads
 *   1.45 to 2.20  a red pulse runs up the traces and each pad flashes as it arrives
 */
const SPEED = 1.25;
const END = 2.25; // prototype seconds; the masks drop here so the last frame is the plain mark
const LIFT = 800; // the clip-path wipe in base.css lasts as long

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2;
const clamp01 = v => Math.min(1, Math.max(0, v));
// Time at which easeInOutSine reaches a given fraction.
const inverseEase = fraction => Math.acos(1 - 2 * clamp01(fraction)) / Math.PI;

function createDrawOn(svg) {
  const q = selector => svg.querySelector(selector);
  const disc = q('[data-part="disc"]');
  const ringArcs = [...svg.querySelectorAll('[data-ring-arc]')];
  const pulseDots = [...svg.querySelectorAll('[data-pulse]')];
  const flashes = Object.fromEntries([...svg.querySelectorAll('[data-flash]')].map(el => [el.dataset.flash, el]));
  const masked = [...svg.querySelectorAll('[data-masked]')];
  const trunk = q('[data-grow="trunk"]');
  const armLeft = q('[data-grow="arm-left"]');
  const armRight = q('[data-grow="arm-right"]');
  // pathLength="1" in the markup normalises dashes; getTotalLength still returns real lengths for the timing.
  const trunkLength = trunk.getTotalLength();
  const leftLength = armLeft.getTotalLength();
  const rightLength = armRight.getTotalLength();
  // Distance along the trunk (from its base at y 1145) at which each arm branches off.
  const leftStart = 1145 - 699.2;
  const rightStart = 1145 - 886.5;
  const strokes = [
    { el: trunk, start: 0, length: trunkLength },
    { el: armLeft, start: leftStart, length: leftLength },
    { el: armRight, start: rightStart, length: rightLength },
  ];
  const padStart = { top: trunkLength, left: leftStart + leftLength, right: rightStart + rightLength };
  svg.querySelectorAll('[data-pad-arc]').forEach(el => strokes.push({ el, start: padStart[el.dataset.padArc], length: el.getTotalLength() }));
  const maxDistance = Math.max(...strokes.map(s => s.start + s.length));
  const branches = [
    { path: trunk, start: 0, length: trunkLength, pad: 'top' },
    { path: armLeft, start: leftStart, length: leftLength, pad: 'left' },
    { path: armRight, start: rightStart, length: rightLength, pad: 'right' },
  ];
  const pulseEnd = Math.max(...branches.map(b => b.start + b.length));

  return function render(t) {
    const complete = t >= END;
    masked.forEach(el => (complete ? el.removeAttribute('mask') : el.setAttribute('mask', el.dataset.masked)));

    const discT = easeOutCubic(clamp01(t / 0.6));
    disc.style.opacity = String(discT);
    disc.style.transform = `scale(${0.94 + 0.06 * discT})`;
    const ringT = easeOutCubic(clamp01(t / 0.7));
    ringArcs.forEach(el => {
      el.style.strokeDashoffset = String(1 - ringT);
      el.style.visibility = ringT > 0.001 ? 'visible' : 'hidden';
    });

    const reach = easeOutCubic(clamp01((t - 0.35) / 1.1)) * maxDistance;
    strokes.forEach(s => {
      const fraction = clamp01((reach - s.start) / s.length);
      s.el.style.strokeDashoffset = String(1 - fraction);
      s.el.style.visibility = fraction > 0.001 ? 'visible' : 'hidden';
    });

    // One pulse per branch, travelling together from the base; each pad flashes on arrival, then fades.
    const pulseT = clamp01((t - 1.45) / 0.75);
    const travelled = easeInOutSine(pulseT) * pulseEnd;
    branches.forEach((b, i) => {
      const dot = pulseDots[i];
      const along = travelled - b.start;
      const visible = pulseT > 0 && pulseT < 1 && along > 0 && along < b.length;
      if (visible) {
        const p = b.path.getPointAtLength(along);
        dot.setAttribute('cx', p.x.toFixed(1));
        dot.setAttribute('cy', p.y.toFixed(1));
      }
      dot.style.opacity = visible ? '1' : '0';
      const since = t - (1.45 + 0.75 * inverseEase((b.start + b.length) / pulseEnd));
      flashes[b.pad].style.opacity = (since < 0 ? 0 : Math.exp(-since / 0.28)).toFixed(3);
    });
  };
}

export function runLoader() {
  const root = document.documentElement;
  const loader = document.querySelector('.loader');
  if (!loader || !root.classList.contains('is-loading')) return;
  try {
    sessionStorage.setItem('intro-seen', '1');
  } catch {
    // Without session storage the loader may show again on the next page, which is harmless.
  }
  const svg = loader.querySelector('.loader-mark');
  const render = svg ? createDrawOn(svg) : () => {};
  const start = performance.now();
  let frame = 0;
  let lifted = false;

  const tick = now => {
    const t = (now - start) / 1000 * SPEED;
    render(t);
    if (t < END) frame = requestAnimationFrame(tick);
    else lift();
  };

  // Any key or click skips ahead to the finished mark and lifts the block.
  function lift() {
    if (lifted) return;
    lifted = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('keydown', lift);
    loader.removeEventListener('pointerdown', lift);
    render(10);
    root.classList.add('is-leaving');
    setTimeout(() => root.classList.remove('is-loading', 'is-leaving'), LIFT);
  }
  window.addEventListener('keydown', lift);
  loader.addEventListener('pointerdown', lift);
  render(0);
  frame = requestAnimationFrame(tick);
}
