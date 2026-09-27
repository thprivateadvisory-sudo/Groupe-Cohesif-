import * as THREE from 'three';
import { makePerson, canvasTex, rng, V, ease, lerp, clamp, sstep, stdMat } from './lib.js';

// Plan 7a — salon d'affaires luxueux, deux entrepreneurs se serrent la main au ralenti
export default function (ctx) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060403);
  scene.environment = ctx.envMap; scene.environmentIntensity = 0.12;
  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.05, 200);
  scene.add(new THREE.HemisphereLight(0x8a7a6a, 0x1a100a, 0.25));
  const R = rng(77);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshPhysicalMaterial({ color: 0x1a120c, roughness: 0.25, clearcoat: 0.8 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  // grande baie dorée en fond (contre-jour)
  const win = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 440, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f6c784'); gr.addColorStop(0.7, '#f0a860'); gr.addColorStop(1, '#6a4020'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(80,50,30,0.55)'; for (let i = 0; i < 40; i++) { const bw = 10 + R() * 40, bh = 40 + R() * 150; g.fillRect(R() * w, h * 0.72 - bh, bw, bh + 200); }
  }), color: new THREE.Color(1.9, 1.8, 1.6) }));
  win.position.set(0, 3, -6); scene.add(win);
  for (let i = 0; i < 7; i++) { const mu = new THREE.Mesh(new THREE.BoxGeometry(0.08, 6, 0.1), stdMat(0x0a0806, 0.5)); mu.position.set(-7 + i * 2.33, 3, -5.95); scene.add(mu); }
  // boiseries latérales
  const wood = stdMat(0x2a160c, 0.45, 0.1);
  [-5, 5].forEach(x => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 14), wood); w.position.set(x, 2.5, -1); scene.add(w); });
  // lampes -> bokeh
  const bulbs = [];
  for (let i = 0; i < 18; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 5, 2.2) })); b.position.set((R() - 0.5) * 9, 0.8 + R() * 2.8, -2.5 - R() * 3); scene.add(b); bulbs.push(b); }
  const key = new THREE.SpotLight(0xffc890, 30, 20, 0.5, 0.7, 2); key.position.set(2.5, 3.5, 3); key.target.position.set(0, 1.2, 0); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  const back = new THREE.SpotLight(0xffb870, 220, 20, 0.6, 0.6, 2); back.position.set(0, 3, -5); back.target.position.set(0, 1.2, 0); scene.add(back, back.target);

  const A = makePerson({ suit: 0x14161c, shirt: 0xf0ece4, skin: 0xc49a7a, hair: 0x2a1c12 });
  const B = makePerson({ suit: 0x1c1a18, shirt: 0xe8e6e0, skin: 0x7a5038, hair: 0x0a0806 });
  A.group.position.set(-0.46, 0, 0); A.group.rotation.y = Math.PI / 2; scene.add(A.group);
  B.group.position.set(0.46, 0, 0); B.group.rotation.y = -Math.PI / 2; scene.add(B.group);
  // montre en or
  const watch = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 10, 24), new THREE.MeshStandardMaterial({ color: 0xd4a24a, metalness: 1, roughness: 0.2 }));
  watch.rotation.x = Math.PI / 2; watch.position.y = -0.24; A.R.el.add(watch);
  const hand = new THREE.Vector3();

  return {
    scene, camera, exposure: 0.85,
    dof: () => ({ focus: camera.position.distanceTo(hand), aperture: 0.0035, maxblur: 0.012 }),
    update(t) {
      const k = ease(clamp((t + 0.6) / 2.0));
      const pump = t > 1.6 ? Math.sin((t - 1.6) * 3.2) * 0.07 * sstep(1.6, 2.0, t) : 0;
      [A, B].forEach((P, i) => {
        P.R.sh.rotation.set(lerp(0.05, -0.95, k) + pump, 0, lerp(-0.06, 0.28, k));
        P.R.el.rotation.x = lerp(-0.1, -0.55, k);
        P.L.sh.rotation.set(0.05, 0, 0.06); P.L.el.rotation.x = -0.15;
        P.torso.rotation.x = 0.04 * k; P.head.rotation.x = -0.05;
        P.head.rotation.y = 0.0;
      });
      A.R.hand.getWorldPosition(hand);
      const u = t / 3;
      camera.position.set(lerp(-0.25, 0.1, u), lerp(1.2, 1.15, u), lerp(2.3, 1.45, ease(u)));
      camera.lookAt(0, lerp(1.1, 1.05, u), 0);
    }
  };
}
