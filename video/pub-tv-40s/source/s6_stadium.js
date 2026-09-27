import * as THREE from 'three';
import { makeSky, makePerson, canvasTex, rng, V, ease, lerp, clamp, sstep, stdMat } from './lib.js';

// Plan 6 — stade au crépuscule, joueur en ralenti extrême frappant le ballon, gouttes d'eau et gazon qui volent
export default function (ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.02, 3000);
  const sunDir = V(-0.3, 0.02, -1);
  scene.add(makeSky({ top: 0x0c1428, mid: 0x3a3050, horizon: 0xc06040, sunDir, sunColor: 0xff7030, sunSize: 200, sunGlow: 0.2, glowStrength: 0.5, sunPower: 5 }));
  scene.add(new THREE.HemisphereLight(0x6a7aa0, 0x10180c, 0.5));
  const R = rng(66);

  const stripes = canvasTex(1024, 1024, (g, w, h) => {
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#2f6a26' : '#3a7a2e'; g.fillRect(0, i * h / 16, w, h / 16); }
    for (let i = 0; i < 30000; i++) { g.fillStyle = `rgba(${20 + R() * 40},${60 + R() * 60},${10 + R() * 30},0.35)`; g.fillRect(R() * w, R() * h, 1.5, 3); }
    g.strokeStyle = 'rgba(240,240,230,0.9)'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2, 90, 0, 7); g.stroke();
  });
  stripes.anisotropy = 16;
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(110, 110), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.55, metalness: 0 }));
  pitch.rotation.x = -Math.PI / 2; pitch.receiveShadow = true; scene.add(pitch);
  // tribunes
  const crowd = canvasTex(2048, 256, (g, w, h) => {
    g.fillStyle = '#0a0a0e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const c = R(); g.fillStyle = c < 0.1 ? 'rgba(220,200,160,0.7)' : `rgba(${40 + R() * 60},${30 + R() * 40},${30 + R() * 50},0.9)`; g.fillRect(R() * w, R() * h, 3, 4); }
    for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, y, w, 3); }
  }, { repeat: [4, 1] });
  const standG = new THREE.CylinderGeometry(120, 72, 38, 96, 1, true);
  const stand = new THREE.Mesh(standG, new THREE.MeshStandardMaterial({ map: crowd, side: THREE.BackSide, roughness: 0.9, emissive: 0xffffff, emissiveMap: crowd, emissiveIntensity: 0.08 }));
  stand.position.y = 19; scene.add(stand);
  const roof = new THREE.Mesh(new THREE.RingGeometry(95, 128, 96), stdMat(0x0a0a0c, 0.8)); roof.rotation.x = Math.PI / 2; roof.position.y = 40; scene.add(roof);
  // flashs d'appareils
  const flashG = new THREE.BufferGeometry(); const fp = [];
  for (let i = 0; i < 700; i++) { const a = R() * Math.PI * 2, rr = 78 + R() * 38, y = 3 + (rr - 72) / 48 * 36; fp.push(Math.cos(a) * rr, y, Math.sin(a) * rr); }
  flashG.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  const dot = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const flashM = new THREE.PointsMaterial({ map: dot, size: 1.3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(3, 3, 3) });
  scene.add(new THREE.Points(flashG, flashM));
  // projecteurs
  const fl = [];
  [[-70, -70], [70, -70], [-70, 70], [70, 70], [0, -95]].forEach(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, 52, z); g.lookAt(0, 0, 0); scene.add(g);
    for (let a = 0; a < 5; a++) for (let b = 0; b < 3; b++) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(14, 13, 11) })); l.position.set(-4 + a * 2, -2 + b * 2, 0.2); g.add(l); }
    const pan = new THREE.Mesh(new THREE.BoxGeometry(11, 7, 0.3), stdMat(0x111111)); g.add(pan);
    const sl = new THREE.SpotLight(0xfff4e4, 9000, 250, 0.6, 0.5, 2); sl.position.set(x, 52, z); sl.target.position.set(0, 0, 0); scene.add(sl, sl.target); fl.push(sl);
  });
  fl[1].castShadow = true; fl[1].shadow.mapSize.set(2048, 2048); fl[1].shadow.camera.near = 20; fl[1].shadow.camera.far = 200; fl[1].shadow.bias = -0.0002;

  // joueur
  const rimS = new THREE.SpotLight(0xffe0b0, 160, 30, 0.4, 0.5, 2); rimS.position.set(5, 3.5, -6); rimS.target.position.set(0, 0.8, -0.5); scene.add(rimS, rimS.target);
  const pl = makePerson({ suit: 0x13204a, pants: 0x0c1430, skin: 0x8a5a40, hair: 0x100c08, shoes: 0x111111 });
  pl.group.position.set(0.12, 0, -0.78); scene.add(pl.group);
  // chaussettes
  // ballon
  const ballT = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1a1a'; for (let i = 0; i < 14; i++) { const x = (i % 7) * w / 7 + (i > 6 ? w / 14 : 0), y = i > 6 ? h * 0.7 : h * 0.3; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; g.lineTo(x + Math.cos(a) * 22, y + Math.sin(a) * 30); } g.fill(); } g.fillStyle = '#c89a3a'; g.fillRect(0, h / 2 - 3, w, 6); });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 48, 32), new THREE.MeshPhysicalMaterial({ map: ballT, roughness: 0.35, clearcoat: 0.6 }));
  ball.castShadow = true; scene.add(ball);
  const ball0 = V(0.03, 0.11, -0.3);

  // particules : gouttes + brins de gazon
  const NP = 900; const pg = new THREE.BufferGeometry(); const pos = new Float32Array(NP * 3); const vel = [];
  for (let i = 0; i < NP; i++) {
    const a = R() * Math.PI * 2, up = 0.4 + R() * 2.4, sp = 0.6 + R() * 2.2;
    vel.push(V(Math.cos(a) * sp * 0.7, up, Math.sin(a) * sp * 0.5 + 1.4 * R()));
  }
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const drops = new THREE.Points(pg, new THREE.PointsMaterial({ map: dot, size: 0.03, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(2.2, 2.2, 2.4) }));
  drops.frustumCulled = false; scene.add(drops);
  const NG = 160; const grass = new THREE.InstancedMesh(new THREE.BoxGeometry(0.006, 0.035, 0.002), stdMat(0x3a8a2a, 0.6), NG); grass.frustumCulled = false; scene.add(grass);
  const gvel = []; for (let i = 0; i < NG; i++) { const a = R() * Math.PI * 2; gvel.push([V(Math.cos(a) * (0.3 + R()), 0.5 + R() * 1.6, Math.sin(a) * 0.6 + R()), R() * 20]); }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), look = new THREE.Vector3();

  return {
    scene, camera, exposure: 1.25,
    dof: () => ({ focus: camera.position.distanceTo(ball0), aperture: 0.0016, maxblur: 0.01 }),
    update(t) {
      const k = clamp((t + 0.35) / 3.6);           // phase de frappe
      const contact = 0.5;
      // jambe droite (RL) : armé -> frappe -> accompagnement
      const hip = k < contact ? lerp(0.9, -0.35, ease(k / contact)) : lerp(-0.35, -1.25, ease((k - contact) / (1 - contact)));
      const knee = k < contact ? lerp(1.7, 0.05, sstep(0.1, 1, k / contact)) : lerp(0.05, 0.5, (k - contact) * 2);
      pl.RL.hp.rotation.x = hip; pl.RL.kn.rotation.x = knee;
      pl.LL.hp.rotation.x = -0.15; pl.LL.kn.rotation.x = 0.35;
      pl.L.sh.rotation.set(-0.3, 0, 0.9); pl.R.sh.rotation.set(0.5, 0, -0.7); pl.L.el.rotation.x = -0.5; pl.R.el.rotation.x = -0.6;
      pl.torso.rotation.set(0.12, -0.3 + k * 0.5, 0); pl.hips.position.y = 0.9;
      pl.group.position.z = -0.78 + k * 0.12;
      // ballon
      const s = Math.max(0, k - contact);
      ball.position.set(ball0.x + s * 0.3, ball0.y + s * 1.8 - s * s * 1.2, ball0.z + s * 6);
      ball.rotation.x = s * 30; ball.scale.set(1 - Math.exp(-s * 60) * 0.12 * (s > 0), 1, 1);
      // particules
      const pos = pg.attributes.position.array;
      for (let i = 0; i < NP; i++) {
        const tt = s * 1.4, v = vel[i];
        pos[i * 3] = ball0.x + v.x * tt; pos[i * 3 + 1] = s > 0 ? Math.max(0.005, 0.02 + v.y * tt - 4.9 * tt * tt) : -10; pos[i * 3 + 2] = ball0.z - 0.05 + v.z * tt;
      }
      pg.attributes.position.needsUpdate = true;
      for (let i = 0; i < NG; i++) {
        const [v, r] = gvel[i], tt = s * 1.2;
        q.setFromEuler(new THREE.Euler(r + tt * 8, r * 2 + tt * 5, 0));
        m.compose(s > 0 ? V(ball0.x + v.x * tt, Math.max(0.005, 0.01 + v.y * tt - 4.9 * tt * tt), ball0.z + v.z * tt - 0.05) : V(0, -10, 0), q, V(1, 1, 1));
        grass.setMatrixAt(i, m);
      }
      grass.instanceMatrix.needsUpdate = true;
      flashM.opacity = 0.4 + 0.6 * Math.abs(Math.sin(t * 37.1));
      // caméra basse, ralenti extrême
      camera.position.set(lerp(-3.7, -3.3, t / 4), 0.22, lerp(2.3, 2.5, t / 4));
      look.set(lerp(0.0, 0.25, t / 4), lerp(1.0, 1.05, t / 4), lerp(-0.5, -0.2, t / 4)); camera.lookAt(look);
    }
  };
}
