import * as THREE from 'three';
import { canvasTex, rng, V, ease, lerp, stdMat } from './lib.js';

// Plan 4b — entrepôt moderne, chariot élévateur déplaçant des palettes
export default function (ctx) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080a);
  scene.environment = ctx.envMap; scene.environmentIntensity = 0.25;
  scene.fog = new THREE.Fog(0x14110c, 25, 110);
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 500);
  scene.add(new THREE.HemisphereLight(0xa0a8b8, 0x2a2018, 0.5));
  const R = rng(9);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 400), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.25, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 400), new THREE.MeshBasicMaterial({ color: 0xc8a020 })); lane.rotation.x = -Math.PI / 2; lane.position.set(-2.4, 0.01, 0); scene.add(lane);
  const lane2 = lane.clone(); lane2.position.x = 2.4; scene.add(lane2);

  // rayonnages
  const up = stdMat(0x1a3a7a, 0.5, 0.6), beam = stdMat(0xe06a10, 0.5, 0.4), wood = stdMat(0x9a7a50, 0.9);
  const boxT = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#b89568'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(80,50,20,0.35)'; g.fillRect(0, h / 2 - 6, w, 12); g.strokeStyle = 'rgba(60,40,20,0.5)'; g.strokeRect(2, 2, w - 4, h - 4); });
  const boxM = new THREE.MeshStandardMaterial({ map: boxT, roughness: 0.9 });
  const U = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 12, 0.12), up, 400), B = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.16, 2.8), beam, 1200);
  const BX = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 1.2, 1.2), boxM, 3000), PL = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.14, 1.2), wood, 1500);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(); let nu = 0, nb = 0, nx = 0, np = 0;
  for (const side of [-1, 1]) for (let i = 0; i < 40; i++) {
    const x = side * 5.2, z = 20 - i * 2.9;
    for (const dx of [-0.6, 0.6]) { m.compose(V(x + dx, 6, z), q, V(1, 1, 1)); U.setMatrixAt(nu++, m); }
    for (let lv = 0; lv < 5; lv++) {
      const y = 0.2 + lv * 2.3;
      for (const dx of [-0.6, 0.6]) { m.compose(V(x + dx, y, z + 1.45), q, V(1, 1, 1)); B.setMatrixAt(nb++, m); }
      if (R() < 0.85) { m.compose(V(x, y + 0.1, z + 1.45), q, V(1, 1, 2.2)); PL.setMatrixAt(np++, m);
        for (const dz of [0.8, 2.1]) { m.compose(V(x, y + 0.8, z + dz), q, V(1, 0.8 + R() * 0.4, 1)); BX.setMatrixAt(nx++, m); } }
    }
  }
  [U, B, BX, PL].forEach((im, k) => { im.count = [nu, nb, nx, np][k]; im.castShadow = im.receiveShadow = true; im.frustumCulled = false; scene.add(im); });

  // luminaires
  for (let i = 0; i < 14; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.2, 4) })); l.position.set(0, 13, 18 - i * 8.5); scene.add(l);
  }
  const lights = [];
  for (let i = 0; i < 4; i++) { const sl = new THREE.SpotLight(0xfff0d8, 380, 60, 0.9, 0.6, 2); sl.position.set(0, 12.8, 14 - i * 17); sl.target.position.set(0, 0, 14 - i * 17); scene.add(sl, sl.target); lights.push(sl); }
  lights[0].castShadow = true; lights[0].shadow.mapSize.set(1024, 1024);
  // lumière du jour par le quai
  const dock = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.6, 2.2) })); dock.position.set(0, 3.5, -100); scene.add(dock);

  // chariot élévateur
  const fk = new THREE.Group(); scene.add(fk);
  const yel = new THREE.MeshPhysicalMaterial({ color: 0xe8a810, roughness: 0.35, clearcoat: 0.6 }), blk = stdMat(0x111111, 0.6, 0.3);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 2.2), yel); body.position.set(0, 0.85, 0); fk.add(body);
  const cw = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.6), yel); cw.position.set(0, 0.9, -1.1); fk.add(cw);
  [[-0.5, 0.95], [0.5, 0.95]].forEach(([x]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 0.06), blk); p.position.set(x, 2.05, 0.35); fk.add(p); const p2 = p.clone(); p2.position.z = -0.65; fk.add(p2); });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 1.1), blk); roof.position.set(0, 2.7, -0.15); fk.add(roof);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.4), blk); seat.position.set(0, 1.6, -0.4); fk.add(seat);
  [[-0.62, 0.3, 0.7], [0.62, 0.3, 0.7], [-0.62, 0.3, -0.8], [0.62, 0.3, -0.8]].forEach(([x, y, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.25, 20), blk); w.rotation.z = Math.PI / 2; w.position.set(x, y, z); fk.add(w); });
  const mast = new THREE.Group(); mast.position.set(0, 0, 1.2); fk.add(mast);
  [-0.35, 0.35].forEach(x => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.2, 0.12), blk); r.position.set(x, 1.6, 0); mast.add(r); });
  const carriage = new THREE.Group(); mast.add(carriage);
  [-0.3, 0.3].forEach(x => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 1.2), stdMat(0x222222, 0.4, 0.8)); f.position.set(x, 0.1, 0.65); carriage.add(f); });
  const pal = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 1.2), wood); pal.position.set(0, 0.2, 0.65); carriage.add(pal);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.55), boxM); b.position.set((i % 2 - 0.5) * 0.58, 0.53 + Math.floor(i / 2) * 0.52, 0.65 + (i % 2 ? 0.25 : -0.25)); carriage.add(b); }
  const beaconM = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 4, 0.5) })); beaconM.position.set(0, 2.8, -0.5); fk.add(beaconM);
  const headL = new THREE.SpotLight(0xfff4e0, 60, 20, 0.5, 0.5, 2); headL.position.set(0, 2.4, 0.5); headL.target.position.set(0, 0, 6); fk.add(headL, headL.target);
  fk.traverse(o => { if (o.isMesh) o.castShadow = true; });

  return {
    scene, camera, exposure: 0.9,
    dof: () => ({ focus: camera.position.distanceTo(fk.position), aperture: 0.0008, maxblur: 0.008 }),
    update(t) {
      const u = t / 1.7;
      fk.position.set(-0.3, 0, lerp(-8, -3.2, u)); fk.rotation.y = 0;
      carriage.position.y = lerp(0.2, 1.4, ease(u));
      beaconM.material.color.setScalar(0).setRGB(8 * (0.5 + 0.5 * Math.sin(t * 12)), 4 * (0.5 + 0.5 * Math.sin(t * 12)), 0.5);
      camera.position.set(lerp(2.6, 1.8, u), lerp(1.2, 1.5, u), lerp(8.5, 7.2, u));
      camera.lookAt(fk.position.x - 0.3, 1.4, fk.position.z - 2);
    }
  };
}
