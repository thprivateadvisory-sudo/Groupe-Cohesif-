import * as THREE from 'three';
import { makeSky, canvasTex, V, ease, lerp, stdMat } from './lib.js';

// Plan 5b — champ de panneaux solaires étincelant au soleil couchant
export default function (ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 5000);
  const sunDir = V(0.05, 0.07, -1);
  const sky = makeSky({ top: 0x1a2440, mid: 0x9a5a50, horizon: 0xffa050, sunDir, sunColor: 0xffa040, sunSize: 2500, sunGlow: 5, glowStrength: 0.6, sunPower: 24 });
  scene.add(sky);
  const envS = new THREE.Scene(); envS.add(makeSky({ top: 0x1a2440, mid: 0x9a5a50, horizon: 0xffa050, sunDir, sunColor: 0xffa040, sunSize: 600, sunGlow: 6, glowStrength: 1.0, sunPower: 10, radius: 100 }));
  scene.environment = ctx.pmrem.fromScene(envS, 0).texture; scene.environmentIntensity = 1.0;
  scene.fog = new THREE.Fog(0x9a6a50, 120, 1200);
  scene.add(new THREE.HemisphereLight(0x8090b0, 0x2a2010, 0.5));
  const sun = new THREE.DirectionalLight(0xffa050, 3); sun.position.copy(sunDir).multiplyScalar(300); scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), stdMat(0x3a3420, 1)); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const cells = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#0c1630'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(180,190,210,0.55)'; g.lineWidth = 2;
    for (let x = 0; x <= w; x += w / 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += h / 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = 'rgba(200,200,210,0.9)'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
  });
  const pm = new THREE.MeshStandardMaterial({ map: cells, metalness: 0.9, roughness: 0.16, color: 0xffffff });
  const panelG = new THREE.BoxGeometry(2.0, 0.04, 1.0);
  const N = 9000; const P = new THREE.InstancedMesh(panelG, pm, N), legs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 1, 0.06), stdMat(0x777777, 0.5, 0.8), N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0, 0)); let n = 0;
  for (let r = 0; r < 70 && n < N; r++) for (let c = -60; c < 60 && n < N; c++) {
    const x = c * 2.08, z = -r * 5.5, yb = 1.1;
    for (let k = 0; k < 1; k++) { m.compose(V(x, yb, z), q, V(1, 1, 1)); P.setMatrixAt(n, m); m.compose(V(x, 0.5, z + 0.2), new THREE.Quaternion(), V(1, 1, 1)); legs.setMatrixAt(n, m); n++; }
  }
  P.count = legs.count = n; P.frustumCulled = legs.frustumCulled = false; scene.add(P, legs);

  return {
    scene, camera, exposure: 0.7,
    dof: null,
    update(t) {
      const u = t / 2.9;
      camera.position.set(lerp(-3, 1, u), lerp(9, 6.5, ease(u)), lerp(20, 4, u));
      camera.lookAt(camera.position.x + 1, 1, camera.position.z - 60);
    }
  };
}
