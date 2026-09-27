import * as THREE from 'three';
import { canvasTex, rng, V, vlerp, ease, lerp, sstep, stdMat } from './lib.js';

// Plan 2 — macro : main qui signe un contrat au stylo plume noir et or (unités : cm)
export default function (ctx) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0604);
  scene.environment = ctx.envMap; scene.environmentIntensity = 0.18;
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 2000);
  scene.add(new THREE.HemisphereLight(0x8a7a6a, 0x1a0e06, 0.15));
  const key = new THREE.DirectionalLight(0xffc27a, 1.6); key.position.set(-60, 45, -30); scene.add(key);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 300 }); key.shadow.bias = -0.0005; key.shadow.radius = 4;
  const rim = new THREE.PointLight(0xffe0b0, 500, 200, 2); rim.position.set(30, 25, -40); scene.add(rim);

  const R = rng(3);
  const wood = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#3b2213'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const y = R() * h, a = 0.05 + R() * 0.12, dk = R() < 0.5;
      g.strokeStyle = dk ? `rgba(20,8,2,${a})` : `rgba(140,80,40,${a * 0.7})`; g.lineWidth = 1 + R() * 5;
      g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.006 + i) * 8 + Math.sin(x * 0.02 + i * 3) * 2); g.stroke();
    }
  }, { repeat: [2, 2] });
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshPhysicalMaterial({ map: wood, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 }));
  desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true; scene.add(desk);

  const paperTex = canvasTex(1024, 1448, (g, w, h) => {
    g.fillStyle = '#f3ede0'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(40,40,50,0.55)';
    for (let i = 0; i < 26; i++) { const y = 140 + i * 34; if (i === 9 || i === 18) continue; g.fillRect(110, y, (w - 220) * (i % 9 === 8 ? 0.55 : 0.92 + R() * 0.08), 7); }
    g.fillStyle = 'rgba(40,40,50,0.8)'; g.fillRect(110, 1150, 330, 2); g.fillRect(600, 1150, 330, 2);
  });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(21, 29.7), new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.9 }));
  paper.rotation.x = -Math.PI / 2; paper.rotation.z = 0.12; paper.position.set(0, 0.02, 0); paper.receiveShadow = true; scene.add(paper);

  // signature curve (sur la ligne de signature, zone droite)
  const pts = [];
  for (let i = 0; i <= 220; i++) {
    const s = i / 220, x = -3.2 + s * 6.4;
    const y = Math.sin(s * 19) * 0.55 * (1 - s * 0.4) + Math.sin(s * 7 + 1) * 0.35 + (s < 0.15 ? (0.15 - s) * 6 : 0);
    const xx = x + Math.cos(s * 19) * 0.35;
    pts.push(V(xx, 0.06, -y));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const TS = 600, RS = 6;
  const ink = new THREE.Mesh(new THREE.TubeGeometry(curve, TS, 0.028, RS), new THREE.MeshStandardMaterial({ color: 0x0a0d1c, roughness: 0.15, metalness: 0.2 }));
  const sig = new THREE.Group(); sig.add(ink); sig.position.set(4.2, 0, 10.6); sig.rotation.y = 0.12; scene.add(sig);

  // stylo plume
  const pen = new THREE.Group();
  const black = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.12, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a24a, roughness: 0.18, metalness: 1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.52, 9.5, 48), black); body.position.y = 6.8; pen.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 3.2, 48), black); cap.position.y = 13.1; pen.add(cap);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), black); top.position.y = 14.7; pen.add(top);
  [2.0, 11.5, 11.8, 14.2].forEach(y => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.07, 12, 48), gold); r.rotation.x = Math.PI / 2; r.position.y = y; pen.add(r); });
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.5, 0.12), gold); clip.position.set(0, 12.4, 0.68); pen.add(clip);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 1.8, 48), black); grip.position.y = 1.2; pen.add(grip);
  const nibG = new THREE.ConeGeometry(0.42, 1.9, 48, 1, false); nibG.scale(1, 1, 0.3);
  const nib = new THREE.Mesh(nibG, gold); nib.rotation.x = Math.PI; nib.position.y = 0.5; nib.rotation.y = Math.PI / 2; pen.add(nib);
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.015, 1.0, 0.2), new THREE.MeshBasicMaterial({ color: 0x000000 })); slit.position.set(0, 0.2, 0.08); pen.add(slit);
  // main (hors focus)
  const skin = new THREE.MeshPhysicalMaterial({ color: 0xb07a5a, roughness: 0.5, sheen: 0.6, sheenColor: 0xffc0a0 });
  const hand = new THREE.Group(); pen.add(hand);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), skin); palm.scale.set(4.2, 5.2, 2.3); palm.position.set(2.8, 9.5, -2.0); hand.add(palm);
  const finger = (len, r, pos, rot) => { const f = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 16), skin); f.position.copy(pos); f.rotation.set(...rot); hand.add(f); };
  finger(3.2, 0.62, V(0.9, 3.4, 0.55), [0.25, 0, 0.15]);   // index
  finger(2.8, 0.7, V(-0.9, 3.8, -0.2), [-0.2, 0, -0.5]);   // pouce
  finger(2.6, 0.62, V(1.2, 3.3, -0.9), [-0.35, 0, 0.35]);  // majeur
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 8, 32), new THREE.MeshStandardMaterial({ color: 0x14161e, roughness: 0.7 })); cuff.position.set(4.8, 14.5, -3); cuff.rotation.z = 0.6; hand.add(cuff);
  const shirt = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.1, 1.2, 32), new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.6 })); shirt.position.set(3.2, 12.3, -2.2); shirt.rotation.z = 0.6; hand.add(shirt);
  const link = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.3), gold); link.position.set(2.3, 12.4, 0.8); hand.add(link);
  pen.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  pen.rotation.set(-0.85, 0.0, -0.75, 'YXZ');
  const holder = new THREE.Group(); holder.add(pen); scene.add(holder);

  const tip = new THREE.Vector3(), look = new THREE.Vector3();
  return {
    scene, camera, exposure: 1.0,
    dof: () => ({ focus: camera.position.distanceTo(tip), aperture: 0.0035, maxblur: 0.01 }),
    update(t) {
      const p = 0.03 + 0.85 * (ease(t / 4.4) * 0.3 + (t / 4.4) * 0.7);
      const cnt = Math.floor(p * TS) * RS * 6;
      ink.geometry.setDrawRange(0, cnt);
      tip.copy(curve.getPointAt(Math.min(1, p))); sig.localToWorld(tip);
      holder.position.copy(tip).add(V(0, 0.05 + 0.04 * Math.sin(t * 9), 0));
      pen.rotation.z = -0.75 + Math.sin(t * 2.2) * 0.03;
      const cp = vlerp(V(-14, 6.5, 12), V(-9.5, 3.8, 8.8), ease(t / 4.4));
      camera.position.copy(tip).add(cp);
      look.copy(tip).add(V(1.8, 1.4, -1.2)); camera.lookAt(look);
      camera.fov = lerp(30, 24, ease(t / 4.4)); camera.updateProjectionMatrix();
    }
  };
}
