import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { V, ease, lerp, sstep, stdMat } from './lib.js';

// Plan 5a — showroom sombre, les phares d'une voiture premium s'allument, la caméra glisse le long de la carrosserie
export default function (ctx) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020203);
  // environnement de studio : bandes lumineuses
  const envScene = new THREE.Scene(); envScene.background = new THREE.Color(0x000000);
  const strip = (w, h, x, y, z, rx, ry, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k * 0.93, k * 0.82), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); envScene.add(m); };
  for (let i = -2; i <= 2; i++) strip(14, 0.5, 0, 6, i * 2.2, Math.PI / 2, 0, 3);
  strip(0.6, 4, -9, 2, 0, 0, Math.PI / 2, 1.2); strip(0.6, 4, 9, 2, 3, 0, Math.PI / 2, 0.8);
  strip(20, 0.3, 0, 1.2, -9, 0, 0, 0.6);
  scene.environment = ctx.pmrem.fromScene(envScene, 0.01).texture; scene.environmentIntensity = 1.7;

  const floor = new Reflector(new THREE.PlaneGeometry(60, 60), { textureWidth: 1024, textureHeight: 576, color: 0x6a6a6a });
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const gloss = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.35, metalness: 0, transparent: true, opacity: 0.82 }));
  gloss.rotation.x = -Math.PI / 2; gloss.position.y = 0.003; scene.add(gloss);
  // plafond lumineux (visible au loin)
  for (let i = -2; i <= 2; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(10, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.35) })); l.position.set(0, 5.5, i * 2.2); l.rotation.x = Math.PI / 2; scene.add(l); }
  const top = new THREE.RectAreaLight ? null : null;
  const soft = new THREE.SpotLight(0xfff2e0, 160, 20, 0.7, 0.9, 2); soft.position.set(0, 7, 0); soft.target.position.set(0, 0, 0); scene.add(soft, soft.target);
  const rimL = new THREE.SpotLight(0xffd8a0, 120, 20, 0.5, 0.8, 2); rimL.position.set(-5, 3.5, -6); rimL.target.position.set(0, 0.8, 0); scene.add(rimL, rimL.target);

  // carrosserie
  const car = new THREE.Group(); scene.add(car);
  const s = new THREE.Shape();
  s.moveTo(-2.3, 0.28); s.lineTo(2.2, 0.28); s.quadraticCurveTo(2.42, 0.3, 2.42, 0.5); s.quadraticCurveTo(2.4, 0.68, 2.2, 0.72);
  s.lineTo(0.95, 0.9); s.quadraticCurveTo(0.45, 1.25, 0.05, 1.3); s.quadraticCurveTo(-0.7, 1.33, -1.1, 1.22); s.quadraticCurveTo(-1.8, 1.02, -2.25, 0.96); s.quadraticCurveTo(-2.44, 0.9, -2.42, 0.6); s.quadraticCurveTo(-2.4, 0.3, -2.3, 0.28);
  const bodyG = new THREE.ExtrudeGeometry(s, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.1, bevelSegments: 20, curveSegments: 64 });
  bodyG.translate(0, 0, -0.8);
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x0c0d10, metalness: 0.6, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.03 });
  const body = new THREE.Mesh(bodyG, paint); car.add(body);
  // vitres latérales
  const w = new THREE.Shape(); w.moveTo(0.85, 0.96); w.quadraticCurveTo(0.42, 1.2, 0.05, 1.24); w.quadraticCurveTo(-0.65, 1.26, -1.05, 1.16); w.quadraticCurveTo(-1.5, 1.04, -1.75, 0.97); w.lineTo(0.85, 0.96);
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x050608, metalness: 0.2, roughness: 0.02, clearcoat: 1 });
  [-1, 1].forEach(side => { const g = new THREE.Mesh(new THREE.ShapeGeometry(w, 24), glassM); g.position.z = side * 0.965; if (side < 0) g.rotation.y = Math.PI, g.scale.x = -1; car.add(g); });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe0d0b0, metalness: 1, roughness: 0.12 });
  [-1, 1].forEach(side => { const t = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.018, 0.01), chrome); t.position.set(-0.45, 0.945, side * 0.975); car.add(t); });
  // roues
  const tireM = stdMat(0x0a0a0a, 0.8), rimM = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, metalness: 1, roughness: 0.2 });
  [[1.48, 1], [1.48, -1], [-1.5, 1], [-1.5, -1]].forEach(([x, sd]) => {
    const wg = new THREE.Group(); wg.position.set(x, 0.37, sd * 0.84); car.add(wg);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.1, 16, 48), tireM); wg.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.06, 48), rimM); rim.rotation.x = Math.PI / 2; rim.position.z = sd * 0.08; wg.add(rim);
    for (let k = 0; k < 10; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.44, 0.03), rimM); sp.rotation.z = k * Math.PI / 5; sp.position.z = sd * 0.115; wg.add(sp); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 24), chrome); hub.rotation.x = Math.PI / 2; hub.position.z = sd * 0.13; wg.add(hub);
    const cal = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.05), new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.7, roughness: 0.3 })); cal.position.set(0.14, 0.12, sd * 0.05); wg.add(cal);
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.3, 32, 1, false, 0, Math.PI), stdMat(0x020202, 1)); arch.rotation.x = Math.PI / 2; arch.rotation.y = 0; arch.position.set(0, 0.0, -sd * 0.05); arch.rotation.z = 0; wg.add(arch);
  });
  // phares : bandes LED + projecteurs
  const ledM = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const leds = [];
  [-1, 1].forEach(sd => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.46), ledM); l.position.set(2.43, 0.62, sd * 0.62); l.rotation.y = sd * 0.25; car.add(l); leds.push(l);
    const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.05), ledM); l2.position.set(2.3, 0.66, sd * 0.86); car.add(l2);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), ledM); lens.position.set(2.4, 0.55, sd * 0.58); lens.scale.set(0.5, 1, 1.4); car.add(lens);
  });
  const beams = [];
  [-1, 1].forEach(sd => { const b = new THREE.SpotLight(0xf0f4ff, 0, 30, 0.45, 0.4, 1.5); b.position.set(2.5, 0.6, sd * 0.6); b.target.position.set(12, 0, sd * 1.5); car.add(b, b.target); beams.push(b); });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 1.7), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.1, 0.05) })); tail.position.set(-2.44, 0.84, 0); car.add(tail);
  car.rotation.y = -0.35; car.updateMatrixWorld();

  const tgt = new THREE.Vector3();
  return {
    scene, camera: new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 200), exposure: 1.0,
    dof(t) { return { focus: this.camera.position.distanceTo(tgt), aperture: 0.0012, maxblur: 0.008 }; },
    update(t) {
      const cam = this.camera;
      const k = sstep(0.3, 1.6, t);
      ledM.color.setRGB(5 * k, 5.2 * k, 6 * k);
      beams.forEach(b => b.intensity = 90 * k);
      const u = t / 3.3;
      // glisse depuis l'avant 3/4 vers le flanc
      const e = ease(u);
      const lp = V(lerp(4.6, 0.6, e), lerp(0.55, 0.85, e), lerp(2.6, 4.6, e));
      tgt.set(lerp(1.9, -0.4, e), 0.6, 0);
      car.localToWorld(tgt); cam.position.copy(car.localToWorld(lp));
      cam.lookAt(tgt);
    }
  };
}
