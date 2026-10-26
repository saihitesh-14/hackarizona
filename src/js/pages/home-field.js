// The hero's signal field: the logo's circuit language as a living background. Traces run on a grid with 45° bends
// and end in pads; a pulse travels along one, lights the pad when it arrives, and another sets off. Near the pointer
// the traces light up. Colours come from the tokens and follow the theme. The loop runs only while the hero is on
// screen, the tab is visible and motion is not paused; paused or reduced motion gets one still frame.
import { isPaused, onMotionChange, onThemeChange } from '../shell.js';

const GRID = 34; // px between trace nodes
const TAIL = 120; // px of fading tail behind a pulse
const GLOW_RADIUS = 230; // px around the pointer where traces light up
// Eight directions, clockwise from east; even indexes are orthogonal, odd ones diagonal.
const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

/** Small seeded generator, so a given size always grows the same circuit. */
function random32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Grows traces on a cols x rows grid. Each runs straight, may bend 45° for a step or two and turn, and keeps a
    one-node gap from the others. Returns arrays of [col, row] nodes. */
function growTraces(cols, rows, random) {
  const used = new Uint8Array(cols * rows);
  const free = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && !used[r * cols + c];
  const traces = [];
  const wanted = Math.round((cols * rows) / 15);
  for (let tries = 0; tries < wanted * 8 && traces.length < wanted; tries++) {
    let c = Math.floor(random() * cols);
    let r = Math.floor(random() * rows);
    if (!free(c, r)) continue;
    let heading = Math.floor(random() * 4) * 2;
    let bend = 0; // diagonal steps left before settling on the new heading
    let turnTo = heading;
    const nodes = [[c, r]];
    const length = 4 + Math.floor(random() * 11);
    for (let step = 0; step < length; step++) {
      if (!bend && step > 1 && random() < 0.24) {
        const side = random() < 0.5 ? 1 : -1;
        turnTo = random() < 0.65 ? (heading + 2 * side + 8) % 8 : heading; // a corner, or a jog back to the same heading
        heading = (heading + side + 8) % 8;
        bend = 1 + Math.floor(random() * 2);
      } else if (bend && --bend === 0) {
        heading = turnTo;
      }
      const [dc, dr] = DIRS[heading];
      if (!free(c + dc, r + dr) || nodes.some(([nc, nr]) => nc === c + dc && nr === r + dr)) break;
      c += dc;
      r += dr;
      nodes.push([c, r]);
    }
    if (nodes.length < 4) continue;
    for (const [nc, nr] of nodes) {
      for (const [dc, dr] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (nc + dc >= 0 && nr + dr >= 0 && nc + dc < cols && nr + dr < rows) used[(nr + dr) * cols + nc + dc] = 1;
      }
    }
    traces.push(nodes);
  }
  return traces;
}

export function initField(field) {
  const canvas = field?.querySelector('canvas');
  const context = canvas?.getContext('2d');
  if (!context) return;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const layers = { dim: document.createElement('canvas'), lit: document.createElement('canvas'), spot: document.createElement('canvas') };
  let width = 0;
  let height = 0;
  let scale = 1;
  let traces = [];
  let colours = {};
  let pulses = [];
  let flashes = [];
  let sprite = null;
  let visible = false;
  let frame = 0;
  let last = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, strength: 0, inside: false };

  const readColours = () => {
    const style = getComputedStyle(document.documentElement);
    const token = name => style.getPropertyValue(name).trim();
    colours = { line: token('--line-accent'), accent: token('--accent'), paper: token('--paper'), mask: token('--mask') };
    // A soft dot drawn at the head of each pulse.
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = 48 * scale;
    const s = sprite.getContext('2d');
    const glow = s.createRadialGradient(24 * scale, 24 * scale, 0, 24 * scale, 24 * scale, 24 * scale);
    glow.addColorStop(0, colours.accent);
    glow.addColorStop(1, 'transparent');
    s.fillStyle = glow;
    s.globalAlpha = 0.85;
    s.fillRect(0, 0, sprite.width, sprite.height);
  };

  const drawTraces = (target, colour, alpha) => {
    const c = target.getContext('2d');
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.clearRect(0, 0, width, height);
    c.globalAlpha = alpha;
    c.strokeStyle = colour;
    c.lineWidth = 1.25;
    c.lineJoin = c.lineCap = 'round';
    for (const t of traces) {
      c.beginPath();
      t.points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
      const [sx, sy] = t.points[0];
      c.fillStyle = colour;
      c.beginPath();
      c.arc(sx, sy, 2, 0, Math.PI * 2);
      c.fill();
      const [ex, ey] = t.points.at(-1);
      c.fillStyle = colours.paper;
      c.beginPath();
      c.arc(ex, ey, 4.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
  };

  const layout = () => {
    const box = field.getBoundingClientRect();
    width = Math.round(box.width);
    height = Math.round(box.height);
    if (!width || !height) return;
    scale = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [canvas, ...Object.values(layers)]) {
      c.width = Math.round(width * scale);
      c.height = Math.round(height * scale);
    }
    const cols = Math.floor(width / GRID) + 1;
    const rows = Math.floor(height / GRID) + 1;
    const offsetX = (width - (cols - 1) * GRID) / 2;
    const offsetY = (height - (rows - 1) * GRID) / 2;
    traces = growTraces(cols, rows, random32(cols * 131 + rows)).map(nodes => {
      const points = nodes.map(([c, r]) => [offsetX + c * GRID, offsetY + r * GRID]);
      const lengths = [0];
      for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
      return { points, lengths, total: lengths.at(-1) };
    });
    pulses = [];
    flashes = [];
    readColours();
    paintLayers();
    render();
  };

  const paintLayers = () => {
    drawTraces(layers.dim, colours.line, 0.6);
    drawTraces(layers.lit, colours.accent, 0.9);
  };

  /** The point a given distance along a trace. */
  const pointAt = (t, distance) => {
    const d = Math.max(0, Math.min(t.total, distance));
    let i = 1;
    while (i < t.lengths.length - 1 && t.lengths[i] < d) i++;
    const span = t.lengths[i] - t.lengths[i - 1] || 1;
    const k = (d - t.lengths[i - 1]) / span;
    const [ax, ay] = t.points[i - 1];
    const [bx, by] = t.points[i];
    return [ax + (bx - ax) * k, ay + (by - ay) * k];
  };

  const spawn = () => {
    if (!traces.length) return;
    let pool = traces;
    if (pointer.inside && Math.random() < 0.55) {
      const near = traces.filter(t => t.points.some(([x, y]) => Math.hypot(x - pointer.x, y - pointer.y) < GLOW_RADIUS));
      if (near.length) pool = near;
    }
    const trace = pool[Math.floor(Math.random() * pool.length)];
    pulses.push({ trace, reverse: Math.random() < 0.5, distance: 0, speed: 120 + Math.random() * 140 });
  };

  const render = () => {
    const c = context;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.globalAlpha = 1;
    c.drawImage(layers.dim, 0, 0);
    // Traces light up around the pointer: the lit layer, cut to a soft disc.
    if (pointer.strength > 0.01) {
      const s = layers.spot.getContext('2d');
      s.setTransform(1, 0, 0, 1, 0, 0);
      s.globalCompositeOperation = 'source-over';
      s.clearRect(0, 0, layers.spot.width, layers.spot.height);
      const x = pointer.x * scale;
      const y = pointer.y * scale;
      const disc = s.createRadialGradient(x, y, 0, x, y, GLOW_RADIUS * scale);
      disc.addColorStop(0, colours.mask);
      disc.addColorStop(1, 'transparent');
      s.fillStyle = disc;
      s.fillRect(0, 0, layers.spot.width, layers.spot.height);
      s.globalCompositeOperation = 'source-in';
      s.drawImage(layers.lit, 0, 0);
      c.globalAlpha = pointer.strength;
      c.drawImage(layers.spot, 0, 0);
      c.globalAlpha = 1;
    }
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.lineCap = 'round';
    c.strokeStyle = colours.accent;
    // Pulses: a tail that fades out behind a glowing head.
    for (const p of pulses) {
      const at = d => pointAt(p.trace, p.reverse ? p.trace.total - d : d);
      const steps = 12;
      let [px, py] = at(p.distance - TAIL);
      for (let i = 1; i <= steps; i++) {
        const [x, y] = at(p.distance - TAIL + (TAIL * i) / steps);
        c.globalAlpha = (i / steps) ** 2 * 0.9;
        c.lineWidth = 1 + (i / steps) * 1.4;
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(x, y);
        c.stroke();
        px = x;
        py = y;
      }
      if (p.landed) continue;
      const [hx, hy] = at(p.distance);
      c.globalAlpha = 1;
      c.drawImage(sprite, hx - 24, hy - 24, 48, 48);
    }
    // A pad that just received a pulse: filled, with a ring spreading out.
    for (const f of flashes) {
      const k = f.age / 0.9;
      c.globalAlpha = 1 - k;
      c.fillStyle = colours.accent;
      c.beginPath();
      c.arc(f.x, f.y, 4.5, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(f.x, f.y, 5 + k * 16, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
  };

  const update = seconds => {
    const most = finePointer.matches ? 14 : 6;
    if (pulses.length < most && Math.random() < seconds * 6) spawn();
    for (const p of pulses) {
      p.distance += p.speed * seconds;
      if (!p.landed && p.distance >= p.trace.total) {
        p.landed = true;
        const [x, y] = p.reverse ? p.trace.points[0] : p.trace.points.at(-1);
        flashes.push({ x, y, age: 0 });
      }
    }
    pulses = pulses.filter(p => p.distance - TAIL < p.trace.total); // the tail drains into the pad before it goes
    flashes = flashes.filter(f => (f.age += seconds) < 0.9);
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, seconds * 10);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, seconds * 10);
    const target = pointer.inside ? 1 : 0;
    pointer.strength += (target - pointer.strength) * Math.min(1, seconds * 4);
  };

  const tick = now => {
    const seconds = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    update(seconds);
    render();
    frame = requestAnimationFrame(tick);
  };

  // One still frame for paused or reduced motion: a few pads lit, no movement.
  const still = () => {
    pulses = [];
    flashes = traces.filter((_, i) => i % 7 === 3).map(t => ({ x: t.points.at(-1)[0], y: t.points.at(-1)[1], age: 0.45 }));
    pointer.strength = 0;
    render();
  };

  const sync = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    if (isPaused()) still();
    else if (visible && !document.hidden) frame = requestAnimationFrame(tick);
  };

  // The pointer, in field coordinates; kept up to date when the page scrolls under a still mouse.
  let client = null;
  const place = () => {
    if (!client) return;
    const box = field.getBoundingClientRect();
    pointer.tx = client.x - box.left;
    pointer.ty = client.y - box.top;
    const inside = pointer.ty >= 0 && pointer.ty <= box.height;
    if (inside && !pointer.inside) {
      pointer.x = pointer.tx;
      pointer.y = pointer.ty;
    }
    pointer.inside = inside;
  };
  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !finePointer.matches) return;
    client = { x: event.clientX, y: event.clientY };
    place();
  }, { passive: true });
  window.addEventListener('scroll', place, { passive: true });
  document.addEventListener('pointerout', event => {
    if (!event.relatedTarget) pointer.inside = false;
  });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(field);
  new ResizeObserver(() => {
    layout();
    if (isPaused()) still();
  }).observe(field);
  document.addEventListener('visibilitychange', sync);
  onMotionChange(sync);
  onThemeChange(() => {
    readColours();
    paintLayers();
    if (isPaused()) still();
    else render();
  });
}
