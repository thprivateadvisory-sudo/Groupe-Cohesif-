import * as THREE from 'three';
import { makeSky, canvasTex, rng, V, ease, lerp, stdMat } from './lib.js';

// Plan 3b — maison neuve moderne terminée, baie vitrée illuminée au crépuscule
export default function (ctx) {
  const scene = new THREE.Scene();
  scene.environment = ctx.envMap; scene.environmentIntensity = 0.08;
  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 3000);
  const sunDir = V(0.5, 0.02, -1);
  scene.add(makeSky({ top: 0x0c1430, mid: 0x3a3a66, horizon: 0xe07a4a, sunDir, sunColor: 0xff8040, sunSize: 400, sunGlow: 0.3, glowStrength: 0.9, sunPower: 6 }));
  scene.fog = new THREE.Fog(0x4a3a50, 40, 500);
  scene.add(new THREE.HemisphereLight(0x5a6a9a, 0x1a1410, 0.6));
  const moon = new THREE.DirectionalLight(0xff9a70, 0.8); moon.position.set(60, 20, -80); scene.add(moon);

  const R = rng(5);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), stdMat(0x1a2414, 1)); lawn.rotation.x = -Math.PI / 2; lawn.receiveShadow = true; scene.add(lawn);
  const white = stdMat(0xe8e4dc, 0.7), dark = stdMat(0x2a2624, 0.6, 0.2), wood = stdMat(0x6a4a30, 0.7);
  const H = new THREE.Group(); H.position.set(0, 0, -14); scene.add(H);
  const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; H.add(b); return b; };
  box(16, 0.4, 9, 0, 0.2, 0, white);            // socle
  box(16, 0.35, 9.5, 0, 3.4, 0.2, white);       // dalle RDC
  box(0.35, 3.1, 9, -7.8, 1.8, 0, white);
  box(10, 3.1, 0.3, -2.8, 1.8, -4.3, white);
  box(11, 0.35, 8, 2.2, 6.6, -0.5, white);      // toit étage (porte-à-faux)
  box(11, 3.0, 0.3, 2.2, 5.0, -4.3, white);
  box(0.3, 3.0, 8, 7.6, 5.0, -0.5, white);
  box(3.2, 3.0, 0.25, -1.9, 5.0, 3.35, wood);   // bardage bois
  box(5, 3.1, 0.25, -5.3, 1.8, 4.3, dark);
  // baies vitrées illuminées
  const interior = canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffd89a'); gr.addColorStop(1, '#b8743a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(70,40,20,0.8)'; g.fillRect(40, 170, 180, 40); g.fillRect(50, 150, 160, 22); // canapé
    g.fillStyle = 'rgba(255,245,220,1)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(300 + i * 60, 30, 10, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(60,35,18,0.7)'; g.fillRect(300, 150, 150, 10); g.fillRect(320, 160, 8, 60); g.fillRect(420, 160, 8, 60); // table
    g.fillStyle = 'rgba(40,60,30,0.8)'; g.beginPath(); g.ellipse(470, 130, 22, 60, 0, 0, 7); g.fill();
  });
  const glass = (w, h, x, y, z, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: interior, color: new THREE.Color(k, k, k) })); m.position.set(x, y, z); H.add(m);
    for (let i = 0; i <= 4; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, 0.08), dark); f.position.set(x - w / 2 + i * w / 4, y, z + 0.04); H.add(f); }
  };
  glass(9.5, 2.9, 1.6, 1.85, 4.2, 0.9);
  glass(5.2, 2.8, 4.9, 5.0, 3.3, 0.75);
  const spill = new THREE.PointLight(0xffb060, 60, 14, 2); spill.position.set(1.6, 1.8, -8); scene.add(spill);
  const spill2 = new THREE.PointLight(0xffb060, 30, 10, 2); spill2.position.set(4.9, 5, -9.5); scene.add(spill2);
  // piscine
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.5), new THREE.MeshStandardMaterial({ color: 0x0a3050, emissive: 0x0a4a70, emissiveIntensity: 1.4, roughness: 0.05, metalness: 0.3 }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(1, 0.05, -6.5); scene.add(pool);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 0.1, 6), wood); deck.position.set(1, 0.02, -6.5); deck.receiveShadow = true; scene.add(deck);
  // bornes lumineuses
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.2) })); b.position.set(-9 + i * 3.5, 0.25, -2); scene.add(b); }
  // arbres silhouettes
  for (let i = 0; i < 10; i++) { const tr = new THREE.Mesh(new THREE.ConeGeometry(2 + R() * 2, 9 + R() * 6, 8), stdMat(0x0c120c, 1)); tr.position.set(-40 + i * 9 + R() * 4, 5, -35 - R() * 20); scene.add(tr); }

  return {
    scene, camera, exposure: 0.75,
    dof: () => ({ focus: camera.position.distanceTo(V(1.6, 2, -9.8)), aperture: 0.0003, maxblur: 0.006 }),
    update(t) {
      const u = t / 2;
      camera.position.set(lerp(-3.5, -2.2, ease(u)), lerp(1.5, 1.7, u), lerp(14, 10.5, ease(u)));
      camera.lookAt(1.2, 3.0, -12);
    }
  };
}
