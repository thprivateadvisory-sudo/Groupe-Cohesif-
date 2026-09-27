import * as THREE from 'three';

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = t => Math.pow(clamp(t), 2.2);
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const vlerp = (a, b, t) => a.clone().lerp(b, t);

// deterministic RNG
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...opts.repeat); }
  t.canvas = c; t.ctx = g;
  return t;
}

// Gradient sky dome with sun
export function makeSky({ top, mid, horizon, ground = 0x050403, sunDir, sunColor = 0xffc070, sunSize = 2200, sunGlow = 6, sunPower = 12, glowStrength = 0.8, radius = 3000 }) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(mid) }, horizon: { value: new THREE.Color(horizon) },
      ground: { value: new THREE.Color(ground) }, sunDir: { value: sunDir.clone().normalize() }, sunColor: { value: new THREE.Color(sunColor) },
      sunSize: { value: sunSize }, sunGlow: { value: sunGlow }, sunPower: { value: sunPower }, glowStrength: { value: glowStrength }
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix*vec4(position,1.)).xyz - cameraPosition); gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 top,mid,horizon,ground,sunDir,sunColor; uniform float sunSize,sunGlow,sunPower,glowStrength; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec3 c = h>0. ? mix(horizon, mid, smoothstep(0.,0.18,h)) : mix(horizon, ground, smoothstep(0.,0.08,-h));
        c = h>0.18 ? mix(mid, top, smoothstep(0.18,0.8,h)) : c;
        float s = max(dot(d, normalize(sunDir)),0.);
        c += sunColor * (pow(s, sunSize)*sunGlow*8. + pow(s, sunPower)*glowStrength + pow(s,3.)*0.15*glowStrength);
        gl_FragColor = vec4(c,1.); }`
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), mat);
  m.renderOrder = -10; m.frustumCulled = false;
  return m;
}

const capsule = (r, l, mat) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 12), mat);

// articulated mannequin
export function makePerson({ suit = 0x151a24, pants, skin = 0xb98a6c, shirt, helmet, vest, hair = 0x1a1410, scale = 1, shoes = 0x0a0a0a } = {}) {
  const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.62, metalness: 0.02 });
  const mSuit = M(suit), mPants = M(pants ?? suit), mSkin = M(skin), mShoes = new THREE.MeshStandardMaterial({ color: shoes, roughness: 0.3 });
  const g = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.95; g.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  const chest = capsule(0.165, 0.42, vest ? M(vest) : mSuit); chest.scale.set(1.22, 1, 0.72); chest.position.y = 0.33; torso.add(chest);
  if (shirt) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.14, 0.02), M(shirt)); s.position.set(0, 0.6, 0.115); torso.add(s); }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 10), mSkin); neck.position.y = 0.68; torso.add(neck);
  const head = new THREE.Group(); head.position.y = 0.8; torso.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.105, 20, 16), mSkin); skull.scale.set(0.9, 1.1, 1); head.add(skull);
  const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.108, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), M(hair)); hairM.position.y = 0.015; hairM.scale.set(0.93, 1.12, 1.03); head.add(hairM);
  if (helmet) {
    const hm = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: helmet, roughness: 0.35 }));
    hm.position.y = 0.03; head.add(hm);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 20), hm.material); brim.position.set(0, 0.03, 0.02); head.add(brim);
  }
  const arm = side => {
    const sh = new THREE.Group(); sh.position.set(side * 0.215, 0.56, 0); torso.add(sh);
    const up = capsule(0.052, 0.24, vest ? M(vest) : mSuit); up.position.y = -0.15; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    const fo = capsule(0.045, 0.22, mSuit); fo.position.y = -0.13; el.add(fo);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), mSkin); hand.scale.set(0.8, 1.3, 0.55); hand.position.y = -0.3; el.add(hand);
    return { sh, el, hand };
  };
  const leg = side => {
    const hp = new THREE.Group(); hp.position.set(side * 0.095, 0, 0); hips.add(hp);
    const th = capsule(0.072, 0.36, mPants); th.position.y = -0.22; hp.add(th);
    const kn = new THREE.Group(); kn.position.y = -0.45; hp.add(kn);
    const sh = capsule(0.058, 0.36, mPants); sh.position.y = -0.22; kn.add(sh);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.24), mShoes); ft.position.set(0, -0.46, 0.05); kn.add(ft);
    return { hp, kn };
  };
  const L = arm(1), R = arm(-1), LL = leg(1), RL = leg(-1);
  g.scale.setScalar(scale);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const p = { group: g, hips, torso, head, L, R, LL, RL };
  p.walk = (ph, amt = 1) => {
    const s = Math.sin(ph);
    LL.hp.rotation.x = s * 0.42 * amt; RL.hp.rotation.x = -s * 0.42 * amt;
    LL.kn.rotation.x = Math.max(0, Math.sin(ph + 1.7)) * 0.75 * amt; RL.kn.rotation.x = Math.max(0, Math.sin(ph + 1.7 + Math.PI)) * 0.75 * amt;
    L.sh.rotation.x = -s * 0.32 * amt; R.sh.rotation.x = s * 0.32 * amt;
    L.el.rotation.x = -0.25 * amt; R.el.rotation.x = -0.25 * amt;
    L.sh.rotation.z = 0.06; R.sh.rotation.z = -0.06;
    hips.position.y = 0.95 + Math.abs(Math.cos(ph)) * 0.025 * amt;
    torso.rotation.y = s * 0.07 * amt;
  };
  return p;
}

export function stdMat(color, rough = 0.6, metal = 0, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
}
