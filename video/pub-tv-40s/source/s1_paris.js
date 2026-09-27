import * as THREE from 'three';
import { makeSky, canvasTex, rng, V, vlerp, ease, lerp, sstep, stdMat } from './lib.js';

// Plan 1 — drone au lever du soleil sur Paris, plongée vers un immeuble haussmannien, zoom sur une fenêtre éclairée
export default function (ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 4000);
  const sunDir = V(-0.28, 0.05, -1);
  scene.add(makeSky({ top: 0x2a3550, mid: 0x9a6a58, horizon: 0xffb070, sunDir, sunColor: 0xffa550, sunSize: 3000, sunGlow: 4, glowStrength: 1.3, sunPower: 10 }));
  scene.fog = new THREE.FogExp2(0xc98f66, 0.0008);
  scene.add(new THREE.HemisphereLight(0x9aa6c0, 0x3a2818, 1.0));
  const sun = new THREE.DirectionalLight(0xffb070, 3.2); sun.position.copy(sunDir).multiplyScalar(400); scene.add(sun);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -160, right: 160, top: 160, bottom: -160, near: 10, far: 1200 });
  sun.shadow.bias = -0.0004;

  const R = rng(7);
  // facade texture (pierre de taille, fenêtres, balcons)
  const facade = (lit) => canvasTex(512, 512, (g, w, h) => {
    const r = rng(lit ? 11 : 12);
    g.fillStyle = lit ? '#000' : '#cdb99a'; g.fillRect(0, 0, w, h);
    if (!lit) { for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${90 + r() * 60},${70 + r() * 50},${50 + r() * 40},0.06)`; g.fillRect(r() * w, r() * h, 3, 2); }
      for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(80,60,40,0.12)'; g.fillRect(0, y, w, 1); } }
    const cols = 6, rows = 6;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = 22 + i * (w - 30) / cols, y = 18 + j * h / rows, ww = 36, hh = 54;
      if (lit) { if (r() < 0.16) { const k = 0.6 + r() * 0.4; g.fillStyle = `rgb(${255 * k},${170 * k},${80 * k})`; g.fillRect(x, y, ww, hh); } }
      else {
        g.fillStyle = '#3a3230'; g.fillRect(x, y, ww, hh);
        g.fillStyle = 'rgba(160,140,120,0.5)'; g.fillRect(x + ww / 2 - 1, y, 2, hh); g.fillRect(x, y + hh * 0.35, ww, 2);
        g.fillStyle = '#e2d2b6'; g.fillRect(x - 4, y - 6, ww + 8, 5);
        if (j === 1 || j === 4) { g.fillStyle = '#1c1816'; g.fillRect(x - 6, y + hh - 10, ww + 12, 10); for (let k = 0; k < 10; k++) g.fillRect(x - 6 + k * 5, y + hh - 16, 1.4, 8); }
      }
    }
    if (!lit) { g.fillStyle = '#b7a283'; g.fillRect(0, h - 70, w, 70); g.fillStyle = '#2a2420'; for (let i = 0; i < 4; i++) g.fillRect(20 + i * 125, h - 62, 70, 60); }
  });
  const fTex = facade(false), fLit = facade(true);
  const matF = new THREE.MeshStandardMaterial({ map: fTex, emissiveMap: fLit, emissive: 0xffffff, emissiveIntensity: 1.6, roughness: 0.85 });
  const matRoof = stdMat(0x4a5058, 0.45, 0.6);
  const matGround = stdMat(0x2b2724, 0.95);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), matGround); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // blocs d'immeubles (instanced)
  const boxG = new THREE.BoxGeometry(1, 1, 1);
  const roofG = new THREE.CylinderGeometry(0.62, 0.71, 1, 4, 1); roofG.rotateY(Math.PI / 4);
  const N = 2400;
  const blocks = new THREE.InstancedMesh(boxG, matF, N), roofs = new THREE.InstancedMesh(roofG, matRoof, N);
  blocks.castShadow = blocks.receiveShadow = roofs.castShadow = roofs.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); let n = 0;
  for (let gx = -13; gx <= 13 && n < N; gx++) for (let gz = -38; gz <= 9 && n < N; gz++) {
    const bx = gx * 34, bz = gz * 30;
    if (Math.abs(gx) <= 0 && gz === 0) continue; // hero block
    if (gz >= 1 && Math.abs(gx) <= 1) continue; // place devant l'immeuble
    if ((gx + 60) % 7 === 3) continue; // boulevard
    const rot = (R() - 0.5) * 0.12 + (gx * 0.02);
    for (let k = 0; k < 2 && n < N; k++) {
      const w = 14 + R() * 8, d = 11 + R() * 4, hgt = 19 + R() * 5;
      const x = bx + (k - 0.5) * 15, z = bz + (R() - 0.5) * 4;
      q.setFromAxisAngle(V(0, 1, 0), rot);
      m4.compose(V(x, hgt / 2, z), q, V(w, hgt, d)); blocks.setMatrixAt(n, m4);
      m4.compose(V(x, hgt + 2.4, z), q, V(w, 4.8, d)); roofs.setMatrixAt(n, m4); n++;
    }
  }
  blocks.count = roofs.count = n; blocks.frustumCulled = roofs.frustumCulled = false; scene.add(blocks, roofs);

  // hero haussmann building
  const hero = new THREE.Group(); scene.add(hero);
  const hb = new THREE.Mesh(boxG, matF); hb.scale.set(26, 22, 14); hb.position.set(0, 11, 0); hb.castShadow = hb.receiveShadow = true; hero.add(hb);
  const hr = new THREE.Mesh(roofG, matRoof); hr.scale.set(26, 5, 14); hr.position.set(0, 24.5, 0); hr.castShadow = true; hero.add(hr);
  // hero window (4th floor) — bright office
  const win = new THREE.Group(); win.position.set(1.2, 15.2, 7.02); hero.add(win);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.6, 0.12), stdMat(0xd8c8a8, 0.8)); frame.position.z = -0.02; win.add(frame);
  const room = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.4), new THREE.MeshBasicMaterial({ map: canvasTex(256, 400, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffe2a8'); gr.addColorStop(0.6, '#f5b560'); gr.addColorStop(1, '#8a4a20'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(60,30,10,0.85)'; g.fillRect(20, 250, 216, 16); g.fillRect(40, 266, 10, 130); g.fillRect(206, 266, 10, 130); // desk
    g.fillStyle = 'rgba(40,20,8,0.9)'; g.beginPath(); g.ellipse(128, 225, 22, 26, 0, 0, 7); g.fill(); g.fillRect(100, 240, 56, 20); // silhouette
    g.fillStyle = 'rgba(255,250,220,0.9)'; g.beginPath(); g.ellipse(200, 60, 40, 12, 0, 0, 7); g.fill(); // lustre
  }), toneMapped: true }));
  room.material.color.setScalar(1.15); room.position.z = 0.05; win.add(room);
  const mull = stdMat(0xe8dcc4, 0.6);
  [[0, 0, 0.04, 2.4], [0, 0.3, 1.5, 0.04], [0, -0.45, 1.5, 0.04]].forEach(([x, y, w, h]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), mull); b.position.set(x, y, 0.09); win.add(b); });
  const balc = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.5), stdMat(0x121010, 0.4, 0.8)); balc.position.set(0, -1.35, 0.3); win.add(balc);
  for (let i = 0; i < 16; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.9, 0.02), balc.material); b.position.set(-1.15 + i * 0.153, -0.9, 0.53); win.add(b); }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 0.04), balc.material); rail.position.set(0, -0.45, 0.53); win.add(rail);
  const wl = new THREE.PointLight(0xffb060, 12, 10, 2); wl.position.set(1.2, 15.2, 9); scene.add(wl);

  // Tour Eiffel silhouette
  const prof = []; for (let i = 0; i <= 30; i++) { const y = i / 30 * 324; const r = 62 * Math.pow(1 - y / 330, 2.6) + 1.2; prof.push(new THREE.Vector2(r, y)); }
  const eiffel = new THREE.Mesh(new THREE.LatheGeometry(prof, 4), stdMat(0x2a2220, 0.8, 0.3)); eiffel.position.set(-330, 0, -1150); eiffel.rotation.y = Math.PI / 4; scene.add(eiffel);
  [57, 115, 276].forEach((y, i) => { const p = new THREE.Mesh(new THREE.BoxGeometry([70, 42, 14][i], 5, [70, 42, 14][i]), eiffel.material); p.position.set(-330, y, -1150); p.rotation.y = Math.PI / 4; scene.add(p); });
  // Seine
  const seine = new THREE.Mesh(new THREE.PlaneGeometry(90, 4000), new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.08, metalness: 0.9 }));
  seine.rotation.x = -Math.PI / 2; seine.rotation.z = 0.5; seine.position.set(-260, 0.2, -600); scene.add(seine);

  const P0 = V(40, 260, 330), P1 = V(12, 90, 120), P2 = V(3.5, 22, 34), P3 = V(1.3, 15.3, 12.6);
  const T0 = V(-60, 140, -500), T1 = V(0, 14, 0), T3 = V(1.2, 15.1, 7);
  const tgt = new THREE.Vector3();
  return {
    scene, camera, exposure: 1.0,
    dof: t => ({ focus: camera.position.distanceTo(T3), aperture: 0.00012 + sstep(3.5, 5, t) * 0.0006, maxblur: 0.008 }),
    update(t) {
      const u = t / 5.3;
      const a = ease(Math.min(1, u / 0.62)), b = ease((u - 0.55) / 0.45);
      const p = u < 0.55 ? vlerp(P0, P1, a).lerp(P2, ease(Math.max(0, (u - 0.3) / 0.35)) * 0.6) : null;
      if (p) camera.position.copy(p); else camera.position.copy(vlerp(vlerp(P1, P2, 0.6).lerp(P2, ease((u - 0.3) / 0.35) ), P3, b));
      tgt.copy(vlerp(T0, T1, ease(u / 0.5))).lerp(T3, ease((u - 0.45) / 0.5));
      camera.lookAt(tgt);
      camera.fov = lerp(38, 26, ease((u - 0.5) / 0.5)); camera.updateProjectionMatrix();
      sun.shadow.camera.updateProjectionMatrix();
    }
  };
}
