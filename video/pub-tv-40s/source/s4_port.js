import * as THREE from 'three';
import { makeSky, canvasTex, rng, V, vlerp, ease, lerp, stdMat } from './lib.js';

// Plan 4a — port de commerce, conteneurs empilés vus du ciel
export default function (ctx) {
  const scene = new THREE.Scene();
  scene.environment = ctx.envMap; scene.environmentIntensity = 0.2;
  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 1, 5000);
  const sunDir = V(-1, 0.28, -0.3);
  scene.add(makeSky({ top: 0x2a3a58, mid: 0x8a7a70, horizon: 0xf0a868, sunDir, sunColor: 0xffb060 }));
  scene.fog = new THREE.FogExp2(0x9a8a80, 0.00045);
  scene.add(new THREE.HemisphereLight(0x8aa0c0, 0x302418, 0.8));
  const sun = new THREE.DirectionalLight(0xffc080, 3.4); sun.position.copy(sunDir).multiplyScalar(500); scene.add(sun);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -180, right: 180, top: 180, bottom: -180, near: 10, far: 1500 }); sun.shadow.bias = -0.0005;

  const R = rng(44);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ color: 0x103448, roughness: 0.12, metalness: 0.5 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -2; scene.add(water);
  const quay = new THREE.Mesh(new THREE.BoxGeometry(420, 4, 260), stdMat(0x6a6660, 0.95)); quay.position.set(0, 0, -40); quay.receiveShadow = true; scene.add(quay);
  // marquages au sol
  const marks = new THREE.Mesh(new THREE.PlaneGeometry(420, 260), new THREE.MeshStandardMaterial({ transparent: true, roughness: 1, map: canvasTex(1024, 640, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(240,220,160,0.55)'; g.lineWidth = 2;
    for (let x = 30; x < w; x += 44) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x, h - 20); g.stroke(); }
  }) }));
  marks.rotation.x = -Math.PI / 2; marks.position.set(0, 2.02, -40); scene.add(marks);

  // conteneurs (40 pieds : 12.2 x 2.6 x 2.44)
  const ribs = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x, 0, 3, h); } g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3); });
  const cmat = new THREE.MeshStandardMaterial({ map: ribs, roughness: 0.6, metalness: 0.3 });
  const colors = [0x8a3a2c, 0x2d4a6a, 0xa0663a, 0x3a5a4a, 0x7a7a78, 0x6a2f2a, 0x243850, 0xa08a4a, 0xc8c4bc];
  const MAX = 3000; const cont = new THREE.InstancedMesh(new THREE.BoxGeometry(12.2, 2.6, 2.44), cmat, MAX);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(); let n = 0;
  for (let bx = -6; bx <= 6; bx++) for (let row = 0; row < 11; row++) {
    if (bx === 0 && row === 5) continue;
    const baseX = bx * 28, baseZ = -150 + row * 22;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 7; j++) {
      const hgt = 1 + Math.floor(R() * 5); if (R() < 0.08) continue;
      for (let k = 0; k < hgt && n < MAX; k++) {
        m.compose(V(baseX + i * 12.8, 2 + 1.3 + k * 2.6, baseZ + j * 2.6), q, V(1, 1, 1));
        cont.setMatrixAt(n, m); cont.setColorAt(n, col.set(colors[Math.floor(R() * colors.length)])); n++;
      }
    }
  }
  cont.count = n; cont.castShadow = cont.receiveShadow = true; cont.frustumCulled = false; scene.add(cont);

  // portiques
  const craneMat = stdMat(0xd0a020, 0.5, 0.5);
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(); g.position.set(-120 + i * 70, 2, 95); scene.add(g);
    [[-10, -8], [10, -8], [-10, 8], [10, 8]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(1.4, 45, 1.4), craneMat); l.position.set(x, 22.5, z); l.castShadow = true; g.add(l); });
    const boom = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 110), craneMat); boom.position.set(0, 46, 20); boom.castShadow = true; g.add(boom);
    const bx = new THREE.Mesh(new THREE.BoxGeometry(24, 4, 3), craneMat); bx.position.set(0, 44, 0); g.add(bx);
  }
  // porte-conteneurs à quai
  const ship = new THREE.Group(); ship.position.set(-20, -2, 135); scene.add(ship);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(300, 18, 42), stdMat(0x1a1c22, 0.6, 0.3)); hull.position.y = 5; hull.castShadow = true; ship.add(hull);
  const hullRed = new THREE.Mesh(new THREE.BoxGeometry(300.5, 4, 42.5), stdMat(0x7a1a14, 0.7)); hullRed.position.y = -2; ship.add(hullRed);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(14, 22, 38), stdMat(0xe8e4dc, 0.6)); bridge.position.set(110, 25, 0); bridge.castShadow = true; ship.add(bridge);
  const sc = new THREE.InstancedMesh(new THREE.BoxGeometry(12.2, 2.6, 2.44), cmat, 1200); let sn = 0;
  for (let bx = -10; bx < 8; bx++) for (let j = 0; j < 15; j++) { const h = 3 + Math.floor(R() * 4); for (let k = 0; k < h; k++) { m.compose(V(bx * 13, 15.3 + k * 2.6, -18 + j * 2.6), q, V(1, 1, 1)); sc.setMatrixAt(sn, m); sc.setColorAt(sn, col.set(colors[Math.floor(R() * colors.length)])); sn++; } }
  sc.count = sn; sc.castShadow = true; sc.frustumCulled = false; ship.add(sc);
  // cavaliers qui se déplacent
  const straddle = [];
  for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(4, 14, 13), stdMat(0xe0dcd0, 0.5, 0.3)); s.position.set(-80 + i * 40, 9, -40 + i * 11); s.castShadow = true; scene.add(s); straddle.push(s); }

  return {
    scene, camera, exposure: 0.95,
    dof: null,
    update(t) {
      const u = t / 2.2;
      camera.position.set(lerp(-60, -20, ease(u)), lerp(520, 400, ease(u)), lerp(80, 30, u));
      camera.up.set(1, 0, 0).applyAxisAngle(V(0, 1, 0), 0.4 + u * 0.18);
      camera.lookAt(camera.position.x + 12, 0, camera.position.z - 30);
      straddle.forEach((s, i) => s.position.x = -80 + i * 40 + t * 6 * (i % 2 ? 1 : -1));
    }
  };
}
