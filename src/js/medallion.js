/*
 * The Home hero object: the Hack Arizona logo as a two-sided 3D medallion (model in ./medallion/model.js).
 * Motion: a coin-flip spin-in that lands face-on, idle sway and float, a lean toward the pointer, drag and throw with a
 * spring back to the front face, a light scroll link, and a red signal that runs round the circuit every few seconds.
 * Cost: one render loop, only while on screen and the tab is visible, never while paused. DPR capped at 2.
 * Without WebGL (or when the context is lost) it calls onFallback() so the page keeps the static SVG logo.
 */
import { WebGLRenderer, Scene, PerspectiveCamera, Group, PMREMGenerator, NeutralToneMapping, SRGBColorSpace } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildMedallion, LOGO, Z } from './medallion/model.js';

const TURN = Math.PI * 2;
const INTRO = 1.6; // seconds for the spin-in
const FLIPS = 2; // whole turns of the toss, so it lands on the front face
const PULSE_EVERY = 6; // seconds between idle signals
const PULSE_TIME = 2.6; // seconds for the signal to run the whole circuit
const HALF = 1.25; // half the framed height in world units (the coin's radius is 1): room for float and shadow
const FOV = 18; // a long product lens keeps the face-on view close to the flat logo
const FLOAT_PX = 7;
const LABEL_KEYS = new Set(['Enter', ' ']);

// Studio settings per theme. Desert night dims the room but keeps the light panels, so highlights survive.
const STUDIO = {
  light: { porcelain: 2.2, enamel: 0.86, exposure: 1, shadow: 0.3, room: 0.3 },
  dark: { porcelain: 1.05, enamel: 0.62, exposure: 1, shadow: 0.5, room: 0.16 },
};
const ENV_YAW = 0.5; // turns the studio so, face-on, the bright panels reflect near the rim, not across the enamel

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const follow = (current, target, rate, dt) => target + (current - target) * Math.exp(-rate * dt);
const easeOutQuart = p => 1 - Math.pow(1 - p, 4);
const noop = () => {};
const inert = { setTheme: noop, setPaused: noop, pulse: noop, replay: noop, destroy: noop, debug: () => null };

/**
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas
 * @param {HTMLElement} [o.container] the role="img" wrapper: drag, click and Enter/Space land here
 * @param {'light'|'dark'} [o.theme]
 * @param {boolean} [o.paused]
 * @param {boolean} [o.reducedMotion] starts static and face-on, with no loop
 * @param {string} [o.accent] the signal colour (the page passes its accent fill token)
 * @param {() => void} [o.onFallback] WebGL missing or lost: show the static SVG logo
 * @param {() => void} [o.onReady] the first frame is on the canvas
 */
export function createMedallion({ canvas, container = canvas?.parentElement, theme = 'light', paused = false, reducedMotion = false, accent = LOGO.gradient.top, onFallback = noop, onReady = noop }) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    onFallback();
    return inert;
  }

  let model, pmrem;
  const env = {};
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  const pivot = new Group();
  try {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NeutralToneMapping;
    pmrem = new PMREMGenerator(renderer);
    model = buildMedallion({ accent });
    pivot.add(model.coin);
    scene.add(pivot, model.shadow);
  } catch (error) {
    console.error(error);
    renderer.dispose();
    onFallback();
    return inert;
  }

  const root = document.documentElement;
  // While the shell's loader covers the page, the coin waits to be tossed.
  const behindLoader = () => root.classList.contains('is-loading') && !root.classList.contains('is-leaving');
  const hero = container?.closest('section') || container || canvas;
  const s = {
    paused: paused || reducedMotion,
    visible: true,
    theme: theme === 'dark' ? 'dark' : 'light',
    intro: 0, // 0 to 1
    clock: 0,
    idle: 0, // seconds of idle motion since landing or resuming, so sway and float start from rest
    yaw: 0, yawV: 0, pitch: 0,
    lean: [0, 0], leanTarget: [0, 0],
    scroll: 0, scrollTarget: 0,
    head: null, nextPulse: Infinity,
    frames: 0, pxPerUnit: 1, cssHeight: 1, ready: false, dead: false,
  };
  const drag = { active: false, id: null, x: 0, y: 0, time: 0, startX: 0, startY: 0, startTime: 0 };
  let raf = 0;
  let last = 0;

  function studio(name) {
    if (env[name]) return env[name];
    const room = new RoomEnvironment();
    const dim = STUDIO[name].room;
    if (dim !== 1) {
      room.traverse(o => {
        if (o.isPointLight) o.intensity *= dim;
        else if (o.material?.isMeshStandardMaterial) o.material.color.multiplyScalar(dim);
      });
    }
    env[name] = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    return env[name];
  }

  function applyTheme() {
    const t = STUDIO[s.theme];
    const { porcelain, enamel } = model.materials;
    porcelain.envMap = enamel.envMap = studio(s.theme);
    porcelain.envMapIntensity = t.porcelain;
    enamel.envMapIntensity = t.enamel;
    renderer.toneMappingExposure = t.exposure;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const tan = Math.tan((FOV * Math.PI) / 360);
    // Fit HALF in both directions. Distances are measured from the enamel plane so it lands at exactly pxPerUnit.
    const distance = Math.max(HALF / tan, HALF / (tan * camera.aspect));
    camera.position.set(0, 0, Z.enamel + distance);
    camera.lookAt(0, 0, Z.enamel);
    camera.updateProjectionMatrix();
    s.pxPerUnit = height / 2 / (distance * tan);
    s.cssHeight = height;
    return rect.width > 0 && rect.height > 0;
  }

  function pose() {
    const e = easeOutQuart(clamp(s.intro, 0, 1));
    const r = 1 - e;
    const still = s.paused;
    // Idle: a few degrees of sway and a slow float, both starting from rest so nothing jumps.
    const swayYaw = still ? 0 : Math.sin(s.idle * 0.7) * 0.055;
    const swayPitch = still ? 0 : Math.sin(s.idle * 0.53) * 0.03;
    const floatPx = still ? 0 : Math.sin((s.idle * TURN) / 7) * FLOAT_PX;
    // The toss: the coin flips about its horizontal axis, drops in and lands face-on.
    pivot.rotation.x = -r * FLIPS * TURN + s.pitch + s.lean[1] + s.scroll * 0.1 + swayPitch;
    pivot.rotation.z = r * 0.35;
    model.coin.rotation.y = s.yaw + s.lean[0] + s.scroll * 0.08 + swayYaw;
    pivot.position.y = r * 0.35 + floatPx / s.pxPerUnit;
    pivot.scale.setScalar(0.55 + 0.45 * e);
    // The contact shadow fades in as the coin lands and shrinks as it rises.
    const shadow = model.shadow;
    const lift = 1 - floatPx / 90;
    shadow.scale.set(1.5 * lift * (0.5 + 0.5 * e), 0.13 * lift, 1);
    shadow.material.opacity = STUDIO[s.theme].shadow * e * (1 - floatPx / 40);
    // The studio turns slightly with the lean and drifts while idle, which moves the highlights.
    const rotY = ENV_YAW + s.lean[0] * 0.8 + (still ? 0 : Math.sin(s.idle * 0.21) * 0.12);
    model.materials.porcelain.envMapRotation.y = model.materials.enamel.envMapRotation.y = rotY;
    // The signal.
    for (const mesh of model.signals) mesh.visible = s.head !== null;
    if (s.head !== null) model.signalMaterial.uniforms.uHead.value = s.head;
  }

  function render() {
    if (s.dead || renderer.getContext().isContextLost()) return;
    pose();
    renderer.render(scene, camera);
    s.frames++;
    if (!s.ready) {
      s.ready = true;
      onReady();
    }
  }

  function startPulse() {
    s.head = -40;
    s.nextPulse = s.clock + PULSE_EVERY;
  }

  function step(dt) {
    s.clock += dt;
    if (s.intro < 1) {
      if (!behindLoader()) s.intro = Math.min(1, s.intro + dt / INTRO);
      if (s.intro === 1) s.nextPulse = s.clock + 0.5; // the first signal right after landing
    } else {
      s.idle += dt;
    }
    const idle = !drag.active && Math.abs(s.yawV) < 0.5;
    if (s.head === null && idle && s.clock >= s.nextPulse) startPulse();
    if (s.head !== null) {
      s.head += (dt * model.signalLength) / PULSE_TIME;
      if (s.head > model.signalLength + 6 * model.signalMaterial.uniforms.uTail.value) s.head = null;
    }
    s.scroll = follow(s.scroll, s.scrollTarget, 7, dt);
    s.lean = s.lean.map((v, i) => follow(v, s.leanTarget[i], 3.5, dt));
    if (!drag.active) {
      // A spring toward the nearest whole turn (the front face), with friction: it coasts, slows and lands.
      const rest = Math.round(s.yaw / TURN) * TURN;
      s.yawV += (rest - s.yaw) * 5 * dt;
      s.yawV *= Math.exp(-2 * dt);
      s.yaw += s.yawV * dt;
      if (Math.abs(s.yawV) < 0.003 && Math.abs(rest - s.yaw) < 0.0008) s.yaw = s.yawV = 0;
      s.pitch = follow(s.pitch, 0, 3, dt);
    }
  }

  const running = () => !s.paused && s.visible && !document.hidden && !s.dead;
  function frame(now) {
    raf = 0;
    if (!running()) {
      last = 0;
      return;
    }
    // Real time down to 10fps; a stalled tab is not replayed.
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
    last = now;
    step(dt);
    render();
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (!raf && running()) raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }

  function settleStill() {
    // Paused (or reduced motion): the intro completes and the coin freezes face-on. Scroll no longer moves it.
    s.intro = 1;
    s.idle = 0;
    s.yaw = s.yawV = s.pitch = 0;
    s.lean = [0, 0];
    s.leanTarget = [0, 0];
    s.scroll = s.scrollTarget = 0;
    s.head = null;
    drag.active = false;
  }

  function measureScroll() {
    const rect = hero.getBoundingClientRect();
    return clamp(-rect.top / Math.max(rect.height, 200), 0, 1);
  }

  /* Input */
  const onScroll = () => {
    if (!s.paused) s.scrollTarget = measureScroll();
  };
  const onPointerMove = event => {
    if (event.pointerType === 'touch' || s.paused) return;
    s.leanTarget = [(event.clientX / window.innerWidth - 0.5) * 0.3, (event.clientY / window.innerHeight - 0.5) * 0.18];
  };
  const onPointerLeave = () => {
    s.leanTarget = [0, 0];
  };
  const onDown = event => {
    if (s.paused || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const t = event.timeStamp;
    Object.assign(drag, { active: true, id: event.pointerId, x: event.clientX, y: event.clientY, time: t, startX: event.clientX, startY: event.clientY, startTime: t });
    s.yawV = 0;
    container.setPointerCapture?.(event.pointerId);
    start();
  };
  const onDrag = event => {
    if (!drag.active || event.pointerId !== drag.id) return;
    const seconds = Math.max((event.timeStamp - drag.time) / 1000, 1 / 240);
    const turn = (event.clientX - drag.x) * 0.011;
    s.yaw += turn;
    s.pitch = clamp(s.pitch + (event.clientY - drag.y) * 0.006, -0.6, 0.6);
    // Blend recent samples so a flick releases at the speed it was thrown.
    s.yawV = clamp(s.yawV * 0.4 + (turn / seconds) * 0.6, -24, 24);
    Object.assign(drag, { x: event.clientX, y: event.clientY, time: event.timeStamp });
  };
  const onUp = event => {
    if (!drag.active || event.pointerId !== drag.id) return;
    drag.active = false;
    // Holding still before letting go means no throw.
    if (event.timeStamp - drag.time > 90) s.yawV = 0;
    const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (event.type === 'pointerup' && moved < 6 && event.timeStamp - drag.startTime < 400) pulse();
  };
  const onKey = event => {
    if (!LABEL_KEYS.has(event.key) || event.target !== container || s.paused) return;
    event.preventDefault();
    pulse();
  };
  const onVisibility = () => (document.hidden ? stop() : start());
  const onContextLost = () => {
    destroy();
    onFallback();
  };

  function pulse() {
    if (s.paused || s.dead) return;
    startPulse();
    start();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  root.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onContextLost);
  if (container) {
    container.style.touchAction = 'pan-y'; // vertical swipes still scroll the page; horizontal ones spin the coin
    if (!container.hasAttribute('tabindex')) container.tabIndex = 0;
    container.addEventListener('pointerdown', onDown);
    container.addEventListener('pointermove', onDrag);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) container.addEventListener(type, onUp);
    container.addEventListener('keydown', onKey);
  }
  const resizer = new ResizeObserver(() => {
    if (resize() && !raf) render();
  });
  resizer.observe(canvas);
  const observer = new IntersectionObserver(([entry]) => {
    s.visible = entry.isIntersecting;
    if (s.visible) start();
  });
  observer.observe(container || canvas);

  function destroy() {
    if (s.dead) return;
    s.dead = true;
    stop();
    resizer.disconnect();
    observer.disconnect();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('pointermove', onPointerMove);
    root.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    if (container) {
      container.removeEventListener('pointerdown', onDown);
      container.removeEventListener('pointermove', onDrag);
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) container.removeEventListener(type, onUp);
      container.removeEventListener('keydown', onKey);
    }
    const done = new Set();
    scene.traverse(o => {
      if (!o.isMesh) return;
      done.add(o.geometry);
      done.add(o.material);
      for (const key of ['map', 'alphaMap']) if (o.material[key]) done.add(o.material[key]);
    });
    for (const texture of Object.values(env)) done.add(texture);
    done.forEach(resource => resource.dispose());
    pmrem.dispose();
    renderer.dispose();
  }

  applyTheme();
  if (s.paused) settleStill();
  else s.scrollTarget = measureScroll();
  if (resize()) render();
  start();

  return {
    setTheme(name) {
      s.theme = name === 'dark' ? 'dark' : 'light';
      applyTheme();
      if (!raf) render();
    },
    setPaused(value) {
      s.paused = Boolean(value);
      if (s.paused) {
        stop();
        settleStill();
        render();
      } else {
        s.nextPulse = s.clock + 2;
        s.scrollTarget = measureScroll();
        start();
      }
    },
    pulse,
    replay() {
      s.intro = s.paused ? 1 : 0;
      s.idle = 0;
      s.yaw = s.yawV = s.pitch = 0;
      s.head = null;
      s.nextPulse = Infinity;
      if (!raf) render();
      start();
    },
    destroy,
    /** Test hook: a read-only snapshot of the motion state. */
    debug: () => ({
      intro: s.intro, yaw: s.yaw, yawVelocity: s.yawV, pitch: s.pitch, spinY: model.coin.rotation.y, tiltX: pivot.rotation.x,
      head: s.head, running: Boolean(raf), frames: s.frames, pxPerUnit: s.pxPerUnit, paused: s.paused, theme: s.theme,
    }),
  };
}
