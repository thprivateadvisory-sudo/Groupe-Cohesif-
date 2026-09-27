import * as THREE from 'three';
import { makeSky, makePerson, rng, V, vlerp, ease, lerp, sstep, stdMat } from './lib.js';

// Plan 3a — chantier au lever du jour, grue en contre-jour, ouvriers casqués en travelling latéral
export function lattice(len, w, mat, step = 1.6) {
  const bars = [];
  const add = (a, b, r) => bars.push([a, b, r]);
  const c = [V(-w / 2, 0, -w / 2), V(w / 2, 0, -w / 2), V(w / 2, 0, w / 2), V(-w / 2, 0, w / 2)];
  for (let k = 0; k < 4; k++) add(c[k].clone(), c[k].clone().setY(len), 0.09);
  for (let y = 0; y < len - 0.01; y += step) for (let k = 0; k < 4; k++) {
    const a = c[k].clone().setY(y), b = c[(k + 1) % 4].clone().setY(y + step);
    add(a, b, 0.045); add(c[k].clone().setY(y), c[(k + 1) % 4].clone().setY(y), 0.045);
  }
  const geo = new THREE.CylinderGeometry(1, 1, 1, 6);
  const im = new THREE.InstancedMesh(geo, mat, bars.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0);
  bars.forEach(([a, b, r], i) => {
    const d = b.clone().sub(a), l = d.length(); q.setFromUnitVectors(up, d.normalize());
    m.compose(a.clone().add(b).multiplyScalar(0.5), q, V(r, l, r)); im.setMatrixAt(i, m);
  });
  im.castShadow = true; im.frustumCulled = false;
  return im;
}

export default function (ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 3000);
  const sunDir = V(-0.12, 0.04, -1);
  scene.add(makeSky({ top: 0x1c2640, mid: 0x7a5a60, horizon: 0xffa050, sunDir, sunColor: 0xffb060, sunSize: 2500, sunGlow: 6, glowStrength: 1.6, sunPower: 14 }));
  scene.fog = new THREE.Fog(0x8a5a40, 50, 500);
  scene.add(new THREE.HemisphereLight(0x7080a0, 0x302018, 0.7));
  const sun = new THREE.DirectionalLight(0xffa860, 4); sun.position.copy(sunDir).multiplyScalar(200); scene.add(sun);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 500 });

  const R = rng(21);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), stdMat(0x4a3a2c, 1)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // gravats / relief
  for (let i = 0; i < 60; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + R() * 0.8, 0), stdMat(0x5a4838, 1)); r.position.set((R() - 0.5) * 60, 0, -4 - R() * 40); r.scale.y = 0.4; r.castShadow = r.receiveShadow = true; scene.add(r); }

  // structure béton en cours
  const conc = stdMat(0x8a8078, 0.9);
  for (let f = 0; f < 4; f++) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(24, 0.3, 12), conc); slab.position.set(4, f * 3.3 + 0.15, -26); slab.castShadow = slab.receiveShadow = true; scene.add(slab);
    if (f < 3) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.3, 0.4), conc); c.position.set(4 - 11 + i * 4.4, f * 3.3 + 1.8, -26 - 5.5 + j * 5.5); c.castShadow = true; scene.add(c); }
  }
  for (let i = 0; i < 6; i++) { const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 4), stdMat(0x3a2418, 0.7, 0.5)); rb.position.set(-7 + i * 4.4, 10.9 + 0.8, -20.5); scene.add(rb); }

  // grue à tour
  const steel = stdMat(0x1a1410, 0.6, 0.7);
  const crane = new THREE.Group(); crane.position.set(-4, 0, -62); scene.add(crane);
  const mast = lattice(46, 1.8, steel); crane.add(mast);
  const jib = lattice(52, 1.3, steel, 2.2); jib.rotation.z = -Math.PI / 2; jib.position.set(0, 47, 0); crane.add(jib);
  const cjib = lattice(14, 1.3, steel, 2.2); cjib.rotation.z = Math.PI / 2; cjib.position.set(0, 47, 0); crane.add(cjib);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.4), steel); cab.position.set(0, 45.5, 1.8); crane.add(cab);
  const cw = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 2), steel); cw.position.set(-12, 46, 0); crane.add(cw);
  const apex = lattice(7, 1.2, steel, 1.75); apex.position.set(0, 47.6, 0); crane.add(apex);
  const tie1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 4), steel); crane.add(tie1);
  const setBar = (m, a, b) => { const d = b.clone().sub(a); m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.set(1, d.length(), 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); };
  setBar(tie1, V(0, 54.5, 0), V(32, 48.3, 0));
  const tie2 = tie1.clone(); crane.add(tie2); setBar(tie2, V(0, 54.5, 0), V(-13, 48.3, 0));
  const cable = tie1.clone(); cable.scale.set(0.4, 1, 0.4); crane.add(cable);
  const load = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 0.4), steel); crane.add(load);
  const trolleyX = 26;
  setBar(cable, V(trolleyX, 46.3, 0), V(trolleyX, 24, 0)); cable.scale.x = cable.scale.z = 0.3; load.position.set(trolleyX, 23.8, 0);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 1.2, 0.3) })); beacon.position.set(0, 55, 0); crane.add(beacon);

  // échafaudage premier plan (parallaxe)
  const scaf = stdMat(0x6a6058, 0.5, 0.8);
  for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 8, 8), scaf); p.position.set(-8 + i * 3.2, 4, -2.2); p.castShadow = true; scene.add(p); }
  for (let j = 0; j < 4; j++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 22, 8), scaf); p.rotation.z = Math.PI / 2; p.position.set(1.6, 0.4 + j * 2, -2.2); scene.add(p); }

  // ouvriers
  const workers = [];
  const cfg = [
    { x: -5.5, z: -4.5, dir: 1, sp: 0.9, helmet: 0xf2c200 }, { x: 0.5, z: -6.5, dir: -1, sp: 0.8, helmet: 0xf5f5f0 },
    { x: 3.2, z: -4.2, dir: 0, sp: 0, helmet: 0xf2c200 }, { x: -7, z: -9, dir: 1, sp: 1.0, helmet: 0xff7a1a }, { x: 7, z: -10, dir: -1, sp: 0.7, helmet: 0xf2c200 },
  ];
  cfg.forEach((c, i) => {
    const p = makePerson({ suit: 0x2a3140, pants: 0x1c2230, vest: 0xff6a10, helmet: c.helmet, skin: 0x9a6a50 });
    p.group.position.set(c.x, 0, c.z); p.group.rotation.y = c.dir === 0 ? 0.6 : c.dir * Math.PI / 2; scene.add(p.group);
    workers.push({ p, c, ph: i * 1.3 });
  });
  // plans (worker at rest looks at plans)
  const plan = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), new THREE.MeshStandardMaterial({ color: 0xdfe8f5, side: THREE.DoubleSide, roughness: 0.8 }));
  workers[2].p.R.el.add(plan); plan.position.set(0.15, -0.32, 0.18); plan.rotation.set(-1.0, 0, 0);
  workers[2].p.R.sh.rotation.x = -0.9; workers[2].p.R.el.rotation.x = -0.9; workers[2].p.L.sh.rotation.x = -0.7; workers[2].p.L.el.rotation.x = -1.1;
  workers[2].p.head.rotation.x = 0.45;

  const look = new THREE.Vector3();
  return {
    scene, camera, exposure: 0.62,
    dof: () => ({ focus: 7.5, aperture: 0.0006, maxblur: 0.007 }),
    update(t) {
      const slow = 0.42; // ralenti
      workers.forEach(w => {
        if (w.c.sp) { w.p.walk(w.ph + t * 5.2 * slow, 1); w.p.group.position.x = w.c.x + w.c.dir * w.c.sp * t * slow; }
      });
      const u = t / 3;
      camera.position.set(lerp(-7, 1.5, ease(u) * 0.35 + u * 0.65), 1.25 + u * 0.3, 3.5);
      look.set(camera.position.x + lerp(-0.5, -3.5, u), 14 + u * 3, -60);
      camera.lookAt(look);
    }
  };
}
