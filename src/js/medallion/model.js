/*
 * The Hack Arizona medallion, built from the logo itself.
 * - Body: the white outer ring as a solid coin with a rounded rim (a lathe profile).
 * - Enamel: the gradient disc, inset on both faces, painted with the logo's exact gradient.
 * - Saguaro: the logo's own white path (evenodd, so the pads keep their holes), extruded with a small bevel.
 * - Signal: thin tubes along the measured centre lines (geometry.js) that a moving window lights up.
 * One world unit is the outer ring's radius (588.6 viewBox units). The back face is the front turned half a turn
 * about the vertical axis, so the logo reads correctly when the medallion is spun round.
 */
import {
  Group, Mesh, Shape, Path, Vector2, Vector3, Curve, LineCurve3, CubicBezierCurve3, CurvePath,
  LatheGeometry, CircleGeometry, ExtrudeGeometry, TubeGeometry, PlaneGeometry, Float32BufferAttribute,
  MeshPhysicalMaterial, MeshBasicMaterial, ShaderMaterial, CanvasTexture, SRGBColorSpace, Color,
  CustomBlending, OneFactor, OneMinusSrcAlphaFactor,
} from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import markSvg from '../../../brand/hackaz-mark.svg?raw';
import * as G from './geometry.js';

/* Material constants. They must match brand/hackaz-mark.svg exactly; nothing else in the module names a colour. */
export const LOGO = {
  white: '#FFFFFF',
  gradient: { y1: 319, y2: 885, top: '#AA1F23', bottom: '#15244A' }, // the SVG's own stops (userSpaceOnUse)
  shadow: '#15244A', // the contact shadow is the logo's navy
};

const S = 1 / G.OUTER_RING.r;
const R_DISC = G.DISC.r * S;
// Depths along the axis (z): ring face, enamel surface, saguaro top. The relief sits just below the rim, like a coin.
export const Z = { face: 0.075, enamel: 0.05, saguaro: 0.069 };
const RIM_FLAT = 0.955; // where the flat ring face starts to round over into the rim
const RING_SIGNAL_R = (R_DISC + RIM_FLAT) / 2; // the ring's signal runs round the middle of the flat face

const toWorld = (x, y) => new Vector2((x - G.OUTER_RING.cx) * S, (G.OUTER_RING.cy - y) * S);
const toWorld3 = (x, y, z) => { const p = toWorld(x, y); return new Vector3(p.x, p.y, z); };

function ringBody() {
  const pts = [];
  const add = (r, z) => pts.push(new Vector2(r, z));
  const fillet = 0.006;
  const arc = (cx, cz, rx, rz, a0, a1, steps) => {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (a1 - a0) * (i / steps);
      add(cx + rx * Math.cos(a), cz + rz * Math.sin(a));
    }
  };
  // Profile as (radius, z), ordered so the lathe's normals point out of the solid.
  add(R_DISC, -Z.enamel + 0.01);
  arc(R_DISC + fillet, -Z.face + fillet, fillet, fillet, Math.PI, Math.PI * 1.5, 4);
  // Rounded rim: a quarter ellipse down to the equator and back up, tangent to both faces.
  arc(RIM_FLAT, 0, 1 - RIM_FLAT, Z.face, -Math.PI / 2, Math.PI / 2, 28);
  arc(R_DISC + fillet, Z.face - fillet, fillet, fillet, Math.PI / 2, Math.PI, 4);
  add(R_DISC, Z.enamel - 0.01);
  const geometry = new LatheGeometry(pts, 160);
  geometry.rotateX(Math.PI / 2); // lathe axis (y) becomes the coin's axis (z)
  return geometry;
}

function gradientTexture(radius) {
  // Painted in canvas space, which interpolates in sRGB exactly like the SVG's linearGradient.
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const top = G.DISC.cy - radius / S;
  const span = (2 * radius) / S;
  const toCanvas = y => ((y - top) / span) * canvas.height;
  const g = ctx.createLinearGradient(0, toCanvas(LOGO.gradient.y1), 0, toCanvas(LOGO.gradient.y2));
  g.addColorStop(0, LOGO.gradient.top);
  g.addColorStop(1, LOGO.gradient.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function saguaroGeometry() {
  const svg = new SVGLoader().parse(markSvg);
  const path = svg.paths.find(p => p.userData.node.tagName === 'path');
  const bevel = 4 * S;
  const depth = Z.saguaro - bevel - (Z.enamel - 0.008);
  // Resample every contour evenly (one point per SPACING viewBox units). The trace has sub-unit kinks where the bevel's
  // offset vectors spike and fold the cap; even spacing removes them and stays within a fraction of a pixel of the SVG.
  const SPACING = 4;
  const even = curve => curve.getSpacedPoints(Math.max(24, Math.round(curve.getLength() / SPACING))).slice(0, -1).map(p => toWorld(p.x, p.y));
  const parts = path.toShapes().map(shape => {
    const flat = new Shape(even(shape));
    flat.holes = shape.holes.map(h => new Path(even(h)));
    return new ExtrudeGeometry(flat, {
      depth, curveSegments: 1, steps: 1,
      bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 3,
    });
  });
  const geometry = parts.length > 1 ? mergeGeometries(parts) : parts[0];
  geometry.deleteAttribute('uv');
  // The bevel's widest edge sits exactly on the SVG outline; the top cap lands at Z.saguaro, the base is buried.
  geometry.translate(0, 0, Z.saguaro - bevel - depth);
  return geometry;
}

class Circle3 extends Curve {
  constructor(cx, cy, r, z, a0) { super(); Object.assign(this, { cx, cy, r, z, a0 }); }
  getPoint(t, target = new Vector3()) {
    const a = this.a0 + t * Math.PI * 2;
    return target.set(this.cx + this.r * Math.cos(a), this.cy + this.r * Math.sin(a), this.z);
  }
}

/**
 * A thin tube along a centre line, flattened to hug the surface it sits on. aDist is the distance along the circuit
 * from the base of the trunk (viewBox units) for every vertex; the shader's moving window reads it.
 */
function signalTube(curve, segments, distanceAt, radius, closed = false) {
  const radial = 12;
  const geometry = new TubeGeometry(curve, segments, radius, radial, closed);
  const position = geometry.attributes.position;
  const z = curve.getPoint(0).z;
  for (let i = 0; i < position.count; i++) position.setZ(i, z + (position.getZ(i) - z) * 0.35);
  const dist = new Float32Array(position.count);
  for (let i = 0; i <= segments; i++) dist.fill(distanceAt(i / segments), i * (radial + 1), (i + 1) * (radial + 1));
  geometry.setAttribute('aDist', new Float32BufferAttribute(dist, 1));
  geometry.deleteAttribute('uv');
  return geometry;
}

function signalGeometry() {
  const r = 15 * S;
  const z = Z.saguaro;
  const tubes = [];
  // Trunk: from the base (on the ring) up to the top pad.
  const trunkTop = G.PADS.top.attach[1];
  const trunkLength = G.TRUNK_BASE_Y - trunkTop;
  // vDist interpolates linearly, so a straight run needs only one segment.
  tubes.push(signalTube(new LineCurve3(toWorld3(G.TRUNK_X, G.TRUNK_BASE_Y, z), toWorld3(G.TRUNK_X, trunkTop, z)), 1, u => u * trunkLength, r));
  // A pad: the signal arrives at its attach point and runs round both ways, meeting on the far side.
  const pad = (p, arrival) => {
    const c = toWorld(p.cx, p.cy);
    const a = toWorld(p.attach[0], p.attach[1]);
    const a0 = Math.atan2(a.y - c.y, a.x - c.x);
    tubes.push(signalTube(new Circle3(c.x, c.y, G.PAD_RADIUS * S, z, a0), 72, u => arrival + Math.min(u, 1 - u) * Math.PI * 2 * G.PAD_RADIUS, r, true));
    return arrival + Math.PI * G.PAD_RADIUS;
  };
  let end = pad(G.PADS.top, trunkLength);
  for (const arm of [G.ARMS.left, G.ARMS.right]) {
    const p = G.PADS[arm.pad];
    const path = new CurvePath();
    const [p0, p1, p2, p3] = arm.bezier.map(([x, y]) => toWorld3(x, y, z));
    path.add(new CubicBezierCurve3(p0, p1, p2, p3));
    path.add(new LineCurve3(p3, toWorld3(p.attach[0], p.attach[1], z)));
    const start = G.TRUNK_BASE_Y - arm.bezier[0][1]; // arms branch where their centre line leaves the trunk
    const length = path.getLength() / S;
    tubes.push(signalTube(path, 56, u => start + u * length, r));
    end = Math.max(end, pad(p, start + length));
  }
  // Then round the outer ring, from the trunk's base both ways to the top.
  const ringStart = end - 60;
  const ringR = RING_SIGNAL_R / S;
  tubes.push(signalTube(new Circle3(0, 0, RING_SIGNAL_R, Z.face, -Math.PI / 2), 220, u => ringStart + Math.min(u, 1 - u) * Math.PI * 2 * ringR, r, true));
  return { geometry: mergeGeometries(tubes), length: ringStart + Math.PI * ringR };
}

const signalVertex = /* glsl */ `
attribute float aDist;
varying float vDist;
varying float vAcross;
void main() {
  vDist = aDist;
  vAcross = max(normal.z, 0.0); // 1 along the tube's crest, 0 at its edges, whatever the view
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Brightness is a moving window along the circuit: a soft front at uHead and a tail that fades behind it.
// Premultiplied "over" rather than pure additive: added red would vanish on white porcelain, this keeps it red.
const signalFragment = /* glsl */ `
uniform float uHead;
uniform float uTail;
uniform vec3 uColor;
varying float vDist;
varying float vAcross;
void main() {
  float behind = uHead - vDist;
  float w = behind < 0.0 ? exp(-behind * behind / 450.0) : exp(-behind / uTail);
  float a = clamp(w * vAcross * vAcross * 1.15, 0.0, 1.0);
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor * a, a);
}`;

function shadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  // A grey alpha mask (alphaMap reads green); the shadow's colour is LOGO.shadow.
  g.addColorStop(0, '#fff');
  g.addColorStop(0.5, '#666');
  g.addColorStop(1, '#000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}

/** Build the medallion. Returns the scene parts the runtime animates. */
export function buildMedallion({ accent }) {
  const porcelain = new MeshPhysicalMaterial({ color: LOGO.white, roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.1 });
  const enamelRadius = R_DISC + 0.002; // tucks under the ring's inner wall so no seam shows
  const enamel = new MeshPhysicalMaterial({
    map: gradientTexture(enamelRadius), roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.035,
    // A faint even floor of light. Neutral tone mapping subtracts about this much from the darkest channel, so
    // without it the navy is crushed wherever the clearcoat happens to reflect a dark corner of the studio.
    emissive: LOGO.white, emissiveIntensity: 0.009,
  });

  const coin = new Group();
  coin.add(new Mesh(ringBody(), porcelain));
  const disc = new CircleGeometry(enamelRadius, 160);
  disc.translate(0, (G.OUTER_RING.cy - G.DISC.cy) * S, Z.enamel);
  const saguaro = saguaroGeometry();
  const signal = signalGeometry();
  const signalMaterial = new ShaderMaterial({
    vertexShader: signalVertex,
    fragmentShader: signalFragment,
    uniforms: { uHead: { value: -1e4 }, uTail: { value: 200 }, uColor: { value: new Vector3() } },
    transparent: true, depthWrite: false,
    blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
  });
  const color = new Color(accent);
  const srgb = {};
  color.getRGB(srgb, SRGBColorSpace); // the shader writes straight to the sRGB canvas
  signalMaterial.uniforms.uColor.value.set(srgb.r, srgb.g, srgb.b);
  const signals = [];
  for (const turn of [0, Math.PI]) {
    const face = new Group();
    face.rotation.y = turn; // the back is the front turned round, so it reads correctly from behind
    face.add(new Mesh(disc, enamel), new Mesh(saguaro, porcelain));
    const s = new Mesh(signal.geometry, signalMaterial);
    s.renderOrder = 1;
    s.visible = false;
    signals.push(s);
    face.add(s);
    coin.add(face);
  }

  const shadow = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({
    color: LOGO.shadow, alphaMap: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.3,
  }));
  shadow.position.set(0, -1.17, -0.4);
  shadow.renderOrder = -1;

  return { coin, shadow, signals, signalMaterial, signalLength: signal.length, materials: { porcelain, enamel } };
}
