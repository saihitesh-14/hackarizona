/*
 * The circuit saguaro: a 3D object built from the Hack Arizona mark's own geometry.
 * The trunk, the two arms and the three ring pads use the measured centre lines and widths
 * from geometry.js; the arms are turned into their own planes so the shape reads as a real
 * cactus when it turns. The logo itself is never altered.
 *
 * One quantity drives both the intro and the pulses: every vertex knows its distance from
 * the base of the trunk along the traces (aDist). The intro reveals vertices as a signal
 * front passes them; a pulse lights a band of vertices around its current distance.
 */
import
{
    WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Vector3, Color, Matrix4,
    TubeGeometry, TorusGeometry, SphereGeometry, CubicBezierCurve3, LineCurve3, CurvePath,
    MeshPhysicalMaterial, MeshBasicMaterial, PlaneGeometry, CanvasTexture, PMREMGenerator,
    Float32BufferAttribute, NeutralToneMapping, SRGBColorSpace
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as G from './geometry.js';

const SCALE = 1 / 300;
const CENTER_Y = 650;
const YAW = { left: 0.5, right: 0.62 };
const TAPER = 0.32;

const follow = (current, target, rate, dt) => target + (current - target) * Math.exp(-rate * dt);

function toWorld(x, y, yaw = 0)
{
    const dx = (x - G.TRUNK_X) * SCALE;
    return new Vector3(dx * Math.cos(yaw), (CENTER_Y - y) * SCALE, -dx * Math.sin(yaw));
}

function gradientColor(svgY)
{
    const top = new Color(G.GRADIENT.top);
    const bottom = new Color(G.GRADIENT.bottom);
    const t = Math.min(1, Math.max(0, (svgY - G.GRADIENT.y1) / (G.GRADIENT.y2 - G.GRADIENT.y1)));
    return top.lerp(bottom, t);
}

// Adds aDist, aCenter, aPad and a vertex colour (the logo's vertical gradient) to a geometry
// that is already in object space.
function finishGeometry(geometry, centers, distances, isPad)
{
    const count = geometry.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const pads = new Float32Array(count).fill(isPad ? 1 : 0);
    const position = geometry.attributes.position;
    for (let i = 0; i < count; i++)
    {
        const svgY = CENTER_Y - position.getY(i) / SCALE;
        const c = gradientColor(svgY);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute('aDist', new Float32BufferAttribute(distances, 1));
    geometry.setAttribute('aCenter', new Float32BufferAttribute(centers, 3));
    geometry.setAttribute('aPad', new Float32BufferAttribute(pads, 1));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    return geometry;
}

function tubeAlong(path, radius, offset, tubularSegments)
{
    const radialSegments = 28;
    const geometry = new TubeGeometry(path, tubularSegments, radius, radialSegments, false);
    const length = path.getLength();
    const count = geometry.attributes.position.count;
    const centers = new Float32Array(count * 3);
    const distances = new Float32Array(count);
    for (let i = 0; i <= tubularSegments; i++)
    {
        const u = i / tubularSegments;
        const c = path.getPointAt(u);
        for (let j = 0; j <= radialSegments; j++)
        {
            const k = i * (radialSegments + 1) + j;
            centers.set([c.x, c.y, c.z], k * 3);
            distances[k] = offset + u * length;
        }
    }
    return finishGeometry(geometry, centers, distances, false);
}

// A ring pad in the plane of its branch, thickened front to back so the trunk or arm
// that runs into it is hidden inside the band.
function ringPad(pad, yaw, arrival)
{
    const R = G.PAD_RADIUS * SCALE;
    const r = (G.PAD_BAND / 2) * SCALE;
    const radialSegments = 22;
    const tubularSegments = 96;
    const geometry = new TorusGeometry(R, r, radialSegments, tubularSegments);
    const count = geometry.attributes.position.count;
    const centers = new Float32Array(count * 3);
    const distances = new Float32Array(count);

    const ax = pad.attach[0] - pad.cx;
    const ay = -(pad.attach[1] - pad.cy);
    const attachAngle = Math.atan2(ay, ax);

    for (let j = 0; j <= radialSegments; j++)
    {
        for (let i = 0; i <= tubularSegments; i++)
        {
            const k = j * (tubularSegments + 1) + i;
            const u = (i / tubularSegments) * Math.PI * 2;
            let delta = Math.abs(u - attachAngle) % (Math.PI * 2);
            if (delta > Math.PI)
            {
                delta = Math.PI * 2 - delta;
            }
            centers.set([R * Math.cos(u), R * Math.sin(u), 0], k * 3);
            distances[k] = arrival + delta * R;
        }
    }

    const matrix = new Matrix4()
        .makeTranslation(toWorld(pad.cx, pad.cy, yaw))
        .multiply(new Matrix4().makeRotationY(yaw))
        .multiply(new Matrix4().makeScale(1, 1, 2.0));
    geometry.applyMatrix4(matrix);
    const c = new Vector3();
    for (let k = 0; k < count; k++)
    {
        c.fromArray(centers, k * 3).applyMatrix4(matrix);
        c.toArray(centers, k * 3);
    }
    return finishGeometry(geometry, centers, distances, true);
}

function baseCap()
{
    const radius = (G.TRUNK_WIDTH / 2) * SCALE;
    const geometry = new SphereGeometry(radius, 28, 16);
    const base = toWorld(G.TRUNK_X, G.TRUNK_BASE_Y);
    geometry.translate(base.x, base.y, base.z);
    const count = geometry.attributes.position.count;
    const centers = new Float32Array(count * 3);
    for (let k = 0; k < count; k++)
    {
        centers.set([base.x, base.y, base.z], k * 3);
    }
    return finishGeometry(geometry, centers, new Float32Array(count), false);
}

function buildGeometries()
{
    const geometries = [];

    const trunkPath = new LineCurve3(
        toWorld(G.TRUNK_X, G.TRUNK_BASE_Y),
        toWorld(G.TRUNK_X, G.PADS.top.attach[1])
    );
    const trunkLength = trunkPath.getLength();
    geometries.push(tubeAlong(trunkPath, (G.TRUNK_WIDTH / 2) * SCALE, 0, 80));
    geometries.push(baseCap());
    geometries.push(ringPad(G.PADS.top, 0, trunkLength));

    let maxDist = trunkLength + Math.PI * G.PAD_RADIUS * SCALE;

    for (const side of ['left', 'right'])
    {
        const arm = G.ARMS[side];
        const pad = G.PADS[arm.pad];
        const yaw = YAW[side];
        const [p0, p1, p2, p3] = arm.bezier.map(([x, y]) => toWorld(x, y, yaw));
        const path = new CurvePath();
        path.add(new CubicBezierCurve3(p0, p1, p2, p3));
        path.add(new LineCurve3(p3, toWorld(pad.attach[0], pad.attach[1], yaw)));
        const start = (G.TRUNK_BASE_Y - arm.bezier[0][1]) * SCALE;
        geometries.push(tubeAlong(path, (G.ARM_WIDTH / 2) * SCALE, start, 90));
        const arrival = start + path.getLength();
        geometries.push(ringPad(pad, yaw, arrival));
        maxDist = Math.max(maxDist, arrival + Math.PI * G.PAD_RADIUS * SCALE);
    }

    return { geometries, maxDist };
}

function shadowTexture()
{
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(12,35,75,0.55)');
    g.addColorStop(0.45, 'rgba(12,35,75,0.18)');
    g.addColorStop(1, 'rgba(12,35,75,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new CanvasTexture(canvas);
}

const THEMES =
{
    light:
    {
        vertexColors: true,
        color: '#ffffff',
        roughness: 0.3,
        metalness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        pulse: [1.0, 0.93, 0.82],
        pulseIntensity: 2.3,
        envIntensity: 1.0,
        shadow: 0.9
    },
    dark:
    {
        vertexColors: false,
        color: '#eef1f7',
        roughness: 0.22,
        metalness: 0.0,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        pulse: [1.0, 0.1, 0.18],
        pulseIntensity: 3.0,
        envIntensity: 0.55,
        shadow: 0.0
    }
};

export function createSaguaro({ canvas, theme = 'light', paused = false, onFallback })
{
    let renderer;
    try
    {
        renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    }
    catch (error)
    {
        onFallback?.(error);
        return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new Scene();
    const pmrem = new PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new PerspectiveCamera(30, 1, 0.1, 100);
    const { geometries, maxDist } = buildGeometries();

    const uniforms =
    {
        uReveal: { value: 0 },
        uTaper: { value: TAPER },
        uRevealGlow: { value: 1 },
        uPulses: { value: [-10, -10, -10, -10] },
        uPulseColor: { value: new Color(1, 1, 1) },
        uPulseIntensity: { value: 3 },
        uPulseWidth: { value: 0.17 },
        uTail: { value: 0.32 }
    };

    const material = new MeshPhysicalMaterial();
    material.onBeforeCompile = (shader) =>
    {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
attribute float aDist;
attribute vec3 aCenter;
attribute float aPad;
uniform float uReveal;
uniform float uTaper;
varying float vDist;
varying float vGrow;
varying float vPad;`)
            .replace('#include <begin_vertex>', `
float grow = clamp((uReveal - aDist) / uTaper, 0.0, 1.0);
grow = grow * grow * (3.0 - 2.0 * grow);
vec3 transformed = aCenter + (position - aCenter) * grow;
vDist = aDist;
vGrow = grow;
vPad = aPad;`);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
uniform float uReveal;
uniform float uTaper;
uniform float uRevealGlow;
uniform float uPulses[4];
uniform vec3 uPulseColor;
uniform float uPulseIntensity;
uniform float uPulseWidth;
uniform float uTail;
varying float vDist;
varying float vGrow;
varying float vPad;`)
            .replace('void main() {', `void main() {
if (vGrow < 0.015) discard;`)
            .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float signal = 0.0;
float tail = mix(uTail, uTail * 2.0, vPad);
for (int i = 0; i < 4; i++)
{
    float x = vDist - uPulses[i];
    if (uPulses[i] > -5.0)
    {
        signal += exp(-(x * x) / (uPulseWidth * uPulseWidth));
        if (x < 0.0)
        {
            signal += 0.38 * exp(x / tail);
        }
    }
}
float front = vDist - (uReveal - uTaper * 0.6);
signal += uRevealGlow * exp(-(front * front) / (0.05));
totalEmissiveRadiance += uPulseColor * signal * uPulseIntensity;`);
    };

    const object = new Group();
    for (const geometry of geometries)
    {
        object.add(new Mesh(geometry, material));
    }
    const pivot = new Group();
    pivot.add(object);
    scene.add(pivot);

    const shadow = new Mesh(
        new PlaneGeometry(1.9, 1.9),
        new MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = (CENTER_Y - G.TRUNK_BASE_Y) * SCALE - 0.32;
    scene.add(shadow);

    const state =
    {
        theme,
        paused,
        visible: true,
        introStart: 0,
        introDone: false,
        idle: -0.18,
        spin: 0,
        spinVelocity: 0,
        lean: { x: 0, y: 0 },
        leanTarget: { x: 0, y: 0 },
        pulses: [],
        nextPulse: 0,
        time: 0,
        last: 0,
        frame: 0,
        drag: null
    };

    function applyTheme(name)
    {
        const t = THEMES[name];
        state.theme = name;
        material.vertexColors = t.vertexColors;
        material.color.set(t.color);
        material.roughness = t.roughness;
        material.metalness = t.metalness;
        material.clearcoat = t.clearcoat;
        material.clearcoatRoughness = t.clearcoatRoughness;
        material.needsUpdate = true;
        uniforms.uPulseColor.value.setRGB(...t.pulse);
        uniforms.uPulseIntensity.value = t.pulseIntensity;
        scene.environmentIntensity = t.envIntensity;
        shadow.material.opacity = t.shadow;
    }

    function resize()
    {
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, rect.width);
        const height = Math.max(1, rect.height);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        const halfH = 1.95;
        const halfW = 1.55;
        const tan = Math.tan((camera.fov * Math.PI) / 360);
        const distance = Math.max(halfH / tan, halfW / (tan * camera.aspect));
        camera.position.set(0, 0.15, distance);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
    }

    function sendPulse()
    {
        if (state.pulses.length < 4)
        {
            state.pulses.push(-0.2);
        }
        if (state.paused)
        {
            run();
        }
    }

    function update(dt)
    {
        state.time += dt;
        const introT = Math.min(1, (state.time - state.introStart) / 2.2);
        const eased = 1 - Math.pow(1 - introT, 3);
        uniforms.uReveal.value = eased * (maxDist + TAPER);
        uniforms.uRevealGlow.value = introT < 1 ? 1 : Math.max(0, uniforms.uRevealGlow.value - dt * 3);
        if (introT >= 1 && !state.introDone)
        {
            state.introDone = true;
            state.pulses.push(-0.2);
            state.nextPulse = state.time + 4.6;
        }
        if (state.introDone && state.time > state.nextPulse)
        {
            sendPulse();
            state.nextPulse = state.time + 4.6;
        }

        state.pulses = state.pulses.map((d) => d + dt * 2.4).filter((d) => d < maxDist + 1.6);
        const slots = [-10, -10, -10, -10];
        state.pulses.forEach((d, i) =>
        {
            slots[i] = d;
        });
        uniforms.uPulses.value = slots;

        if (!state.paused)
        {
            state.idle += dt * ((Math.PI * 2) / 56);
        }
        if (!state.drag)
        {
            state.spin += state.spinVelocity * dt;
            state.spinVelocity *= Math.exp(-dt * 1.7);
        }
        state.lean.x = follow(state.lean.x, state.leanTarget.x, 5, dt);
        state.lean.y = follow(state.lean.y, state.leanTarget.y, 5, dt);
        object.rotation.y = state.idle + state.spin + state.lean.y;
        pivot.rotation.x = state.lean.x;
        const float = state.paused ? 0 : Math.sin((state.time * Math.PI * 2) / 7) * 0.035;
        pivot.position.y = float;
        shadow.scale.setScalar(1 - float * 2.2);
        shadow.material.opacity = THEMES[state.theme].shadow * (1 - float * 4);
        scene.environmentRotation.y = state.time * 0.05;
    }

    function render()
    {
        renderer.render(scene, camera);
    }

    function loop(now)
    {
        const dt = Math.min(0.1, (now - state.last) / 1000);
        state.last = now;
        update(dt);
        render();
        const busy = state.pulses.length > 0 || Math.abs(state.spinVelocity) > 0.002 || state.drag;
        if (state.visible && (!state.paused || busy))
        {
            state.frame = requestAnimationFrame(loop);
        }
        else
        {
            state.frame = 0;
        }
    }

    function run()
    {
        if (!state.frame && state.visible)
        {
            state.last = performance.now();
            state.frame = requestAnimationFrame(loop);
        }
    }

    function showComplete()
    {
        uniforms.uReveal.value = maxDist + TAPER;
        uniforms.uRevealGlow.value = 0;
        state.introDone = true;
        state.introStart = state.time - 10;
    }

    // Pointer: lean toward the cursor, drag to turn, flick to spin, click to send a signal.
    function onPointerMove(event)
    {
        const rect = canvas.getBoundingClientRect();
        const px = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const py = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        if (event.pointerType === 'mouse' && !state.paused)
        {
            state.leanTarget.y = px * 0.32;
            state.leanTarget.x = py * 0.16;
        }
        if (state.drag)
        {
            const now = performance.now();
            const dx = event.clientX - state.drag.x;
            const dt = Math.max(0.008, (now - state.drag.t) / 1000);
            state.spin += dx * 0.009;
            state.spinVelocity = follow(state.spinVelocity, (dx * 0.009) / dt, 18, dt);
            state.drag.moved += Math.abs(dx);
            state.drag.x = event.clientX;
            state.drag.t = now;
            run();
        }
    }

    function onPointerDown(event)
    {
        state.drag = { x: event.clientX, t: performance.now(), start: performance.now(), moved: 0 };
        state.spinVelocity = 0;
        canvas.setPointerCapture?.(event.pointerId);
        run();
    }

    function onPointerUp()
    {
        if (!state.drag)
        {
            return;
        }
        const click = state.drag.moved < 6 && performance.now() - state.drag.start < 350;
        if (state.paused)
        {
            state.spinVelocity = 0;
        }
        state.drag = null;
        if (click)
        {
            sendPulse();
        }
        run();
    }

    function onPointerLeave()
    {
        state.leanTarget.x = 0;
        state.leanTarget.y = 0;
    }

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);

    const resizeObserver = new ResizeObserver(() =>
    {
        resize();
        if (!state.frame)
        {
            render();
        }
    });
    resizeObserver.observe(canvas);

    const visibility = new IntersectionObserver(([entry]) =>
    {
        state.visible = entry.isIntersecting && document.visibilityState === 'visible';
        if (state.visible && !state.paused)
        {
            run();
        }
    });
    visibility.observe(canvas);
    document.addEventListener('visibilitychange', () =>
    {
        state.visible = document.visibilityState === 'visible';
        if (state.visible && !state.paused)
        {
            run();
        }
    });

    applyTheme(theme);
    resize();
    if (paused)
    {
        showComplete();
        update(0);
        render();
    }
    else
    {
        run();
    }

    return {
        setTheme(name)
        {
            applyTheme(name);
            if (!state.frame)
            {
                render();
            }
        },
        setPaused(value)
        {
            state.paused = value;
            if (value)
            {
                showComplete();
                state.leanTarget.x = state.leanTarget.y = 0;
                state.pulses = [];
                uniforms.uPulses.value = [-10, -10, -10, -10];
                render();
            }
            else
            {
                state.nextPulse = state.time + 1.5;
                run();
            }
        },
        replay()
        {
            state.introStart = state.time;
            state.introDone = false;
            state.pulses = [];
            uniforms.uRevealGlow.value = 1;
            if (state.paused)
            {
                showComplete();
                render();
                return;
            }
            run();
        },
        pulse: sendPulse,
        // Testing hook: jump the whole object to a moment in its timeline.
        seek(seconds)
        {
            state.time = 0;
            state.idle = -0.18;
            state.spin = 0;
            state.spinVelocity = 0;
            state.introStart = 0;
            state.introDone = false;
            state.pulses = [];
            let t = 0;
            while (t < seconds)
            {
                const step = Math.min(1 / 60, seconds - t);
                update(step);
                t += step;
            }
            render();
        }
    };
}
