import * as THREE from 'three';
import { makePerson, canvasTex, rng, V, ease, lerp, clamp, stdMat } from './lib.js';

// Plan 8 — une équipe marche vers la caméra au ralenti dans un couloir baigné de lumière
export default function (ctx) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0806);
  scene.environment = ctx.envMap; scene.environmentIntensity = 0.15;
  scene.fog = new THREE.Fog(0xd8b080, 14, 110);
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 300);
  scene.add(new THREE.HemisphereLight(0xfff0dc, 0x3a2a1a, 0.35));
  const R = rng(8);

  const wallM = stdMat(0xe8e0d0, 0.8), dark = stdMat(0x2a2420, 0.6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 120), new THREE.MeshPhysicalMaterial({ color: 0x3a3430, roughness: 0.18, clearcoat: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = -40; floor.receiveShadow = true; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(6, 120), wallM); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.6, -40); scene.add(ceil);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(120, 3.6), wallM); right.rotation.y = -Math.PI / 2; right.position.set(3, 1.8, -40); right.receiveShadow = true; scene.add(right);
  // mur gauche : grandes fenêtres (piliers) -> rais de lumière
  for (let i = 0; i < 24; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.6, 0.9), wallM); p.position.set(-3, 1.8, 4 - i * 4); p.castShadow = true; scene.add(p); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 120), wallM); top.position.set(-3, 3.35, -40); scene.add(top);
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(120, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.2, 2.2) })); outside.rotation.y = Math.PI / 2; outside.position.set(-6, 2, -40); scene.add(outside);
  const sun = new THREE.DirectionalLight(0xffcf90, 6); sun.position.set(-30, 16, -45); sun.target.position.set(0, 0, -6); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 100 });
  // fond du couloir : lumière intense
  const endW = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5, 3.6) })); endW.position.set(0, 1.8, -60); scene.add(endW);
  // faisceaux volumétriques
  const beamT = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,220,160,0)'); gr.addColorStop(0.5, 'rgba(255,220,160,0.5)'); gr.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const gx = g.createLinearGradient(0, 0, w, 0); });
  const beamM = new THREE.MeshBasicMaterial({ map: beamT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35, side: THREE.DoubleSide, fog: false });
  for (let i = 0; i < 18; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 7), beamM); b.position.set(-1.2, 1.7, 2 - i * 4); b.rotation.set(0, 0.35, -1.0); scene.add(b); }
  // poussière
  const dg = new THREE.BufferGeometry(); const dp = []; for (let i = 0; i < 1500; i++) dp.push((R() - 0.5) * 5.6, R() * 3.5, 4 - R() * 40);
  dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
  const dot = canvasTex(32, 32, g => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,240,210,1)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: dot, size: 0.02, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.6, 1.4, 1.1) })); scene.add(dust);

  // l'équipe
  const team = [];
  const cfg = [[0, 0, 0x16181e, 0xc49a7a], [-0.85, -0.7, 0x1e1c1a, 0x7a5038], [0.85, -0.6, 0x101218, 0xd0a888], [-1.6, -1.6, 0x22201c, 0xa87858], [1.6, -1.5, 0x14161a, 0x8a6048]];
  cfg.forEach(([x, z, suit, skin], i) => {
    const p = makePerson({ suit, shirt: 0xeeeae2, skin, hair: i === 2 ? 0x5a3a20 : 0x1a1410, scale: 0.98 + (i % 3) * 0.03 });
    scene.add(p.group); team.push({ p, x, z, ph: i * 0.9 });
  });

  return {
    scene, camera, exposure: 0.75,
    dof: () => ({ focus: camera.position.distanceTo(team[0].p.group.position) - 0.3, aperture: 0.0012, maxblur: 0.01 }),
    update(t) {
      const slow = 0.45, speed = 1.35 * slow;
      team.forEach(m => { m.p.group.position.set(m.x, 0, m.z - 9.5 + t * speed); m.p.walk(m.ph + t * 5.4 * slow, 0.9); });
      dust.position.y = -t * 0.02; dust.position.x = t * 0.03;
      const u = t / 4;
      camera.position.set(lerp(0.15, 0, u), lerp(1.45, 1.4, u), lerp(-2, -3.4, ease(u)) + t * 0.0);
      camera.lookAt(0, 1.25, -20);
    }
  };
}
