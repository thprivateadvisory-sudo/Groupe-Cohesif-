import * as THREE from 'three';
import { canvasTex, rng, V, ease, lerp, stdMat } from './lib.js';

// Plan 7b — écran lumineux affichant une interface d'intelligence artificielle épurée (sans texte)
export default function (ctx) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020304);
  scene.environment = ctx.envMap; scene.environmentIntensity = 0.05;
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 100);
  const R = rng(99);
  const nodes = []; for (let i = 0; i < 70; i++) nodes.push({ x: 0.08 + R() * 0.84, y: 0.1 + R() * 0.8, p: R() * 6, r: 1 + R() * 2.5 });
  const W = 1280, H = 720;
  const tex = canvasTex(W, H, () => {});
  const draw = (t) => {
    const g = tex.ctx;
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#05080f'); bg.addColorStop(1, '#0b0f1a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // grille fine
    g.strokeStyle = 'rgba(120,140,180,0.06)'; g.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // réseau neuronal
    const P = nodes.map(n => ({ x: (n.x + Math.sin(t * 0.5 + n.p) * 0.008) * W, y: (n.y + Math.cos(t * 0.4 + n.p) * 0.01) * H, n }));
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const dx = P[i].x - P[j].x, dy = P[i].y - P[j].y, d = Math.hypot(dx, dy);
      if (d < 170) { const a = (1 - d / 170) * 0.5; g.strokeStyle = `rgba(212,170,90,${a})`; g.lineWidth = 1; g.beginPath(); g.moveTo(P[i].x, P[i].y); g.lineTo(P[j].x, P[j].y); g.stroke(); }
    }
    // impulsions
    for (let i = 0; i < 10; i++) { const a = P[(i * 7) % P.length], b = P[(i * 7 + 3) % P.length]; const f = (t * 0.8 + i * 0.13) % 1; const x = lerp(a.x, b.x, f), y = lerp(a.y, b.y, f); const gr = g.createRadialGradient(x, y, 0, x, y, 10); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(x - 10, y - 10, 20, 20); }
    P.forEach(p => { const pulse = 0.5 + 0.5 * Math.sin(t * 2 + p.n.p); g.fillStyle = `rgba(255,${210 + pulse * 40},${150 + pulse * 80},${0.6 + pulse * 0.4})`; g.beginPath(); g.arc(p.x, p.y, p.n.r + pulse, 0, 7); g.fill(); });
    // noyau central
    const cx = W / 2, cy = H / 2;
    for (let r = 0; r < 4; r++) { g.strokeStyle = `rgba(240,200,120,${0.5 - r * 0.1})`; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 80 + r * 26 + Math.sin(t * 1.5 + r) * 4, t * (0.4 + r * 0.2) + r, t * (0.4 + r * 0.2) + r + Math.PI * (1.1 + r * 0.2)); g.stroke(); }
    const core = g.createRadialGradient(cx, cy, 0, cx, cy, 70); core.addColorStop(0, 'rgba(255,250,230,1)'); core.addColorStop(0.35, 'rgba(240,190,100,0.8)'); core.addColorStop(1, 'rgba(200,140,60,0)'); g.fillStyle = core; g.beginPath(); g.arc(cx, cy, 70, 0, 7); g.fill();
    // onde vocale
    g.strokeStyle = 'rgba(255,230,180,0.9)'; g.lineWidth = 2; g.beginPath();
    for (let x = 0; x <= 360; x += 3) { const y = H * 0.84 + Math.sin(x * 0.08 + t * 6) * 14 * Math.sin(x / 360 * Math.PI) * (0.6 + 0.4 * Math.sin(t * 3)); g.lineTo(cx - 180 + x, y); } g.stroke();
    // barres latérales
    for (let i = 0; i < 14; i++) { const h = 20 + Math.abs(Math.sin(t * 2 + i * 0.7)) * 70; g.fillStyle = 'rgba(212,170,90,0.55)'; g.fillRect(70 + i * 12, H * 0.8 - h, 6, h); g.fillRect(W - 238 + i * 12, H * 0.8 - h * 0.7, 6, h * 0.7); }
    // cadres d'interface
    g.strokeStyle = 'rgba(200,210,230,0.25)'; g.lineWidth = 1.5;
    [[60, 60, 260, 150], [W - 320, 60, 260, 150]].forEach(([x, y, w, h]) => { g.strokeRect(x, y, w, h); g.fillStyle = 'rgba(200,210,230,0.15)'; for (let k = 0; k < 4; k++) g.fillRect(x + 16, y + 22 + k * 30, (w - 32) * (0.3 + 0.7 * Math.abs(Math.sin(t + k + x))), 6); });
    tex.needsUpdate = true;
  };
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.5, 1.5, 1.5) }));
  screen.position.set(0, 1.5, 0); scene.add(screen);
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(3.28, 1.88, 0.05), stdMat(0x0a0a0c, 0.3, 0.6)); bezel.position.set(0, 1.5, -0.03); scene.add(bezel);
  const desk = new THREE.Mesh(new THREE.BoxGeometry(6, 0.06, 2.5), new THREE.MeshPhysicalMaterial({ color: 0x0a0806, roughness: 0.12, clearcoat: 1 })); desk.position.set(0, 0.5, 1.1); scene.add(desk);
  const glow = new THREE.RectAreaLight ? new THREE.PointLight(0xffd8a0, 8, 6, 2) : null; glow.position.set(0, 1.4, 0.8); scene.add(glow);
  const look = new THREE.Vector3();
  return {
    scene, camera, exposure: 1.0,
    dof: () => ({ focus: camera.position.distanceTo(screen.position), aperture: 0.0015, maxblur: 0.008 }),
    update(t) {
      draw(t + 1);
      const u = t / 2.4;
      camera.position.set(lerp(-1.4, -0.5, ease(u)), lerp(1.1, 1.35, u), lerp(4.2, 2.9, ease(u)));
      look.set(lerp(-0.2, 0, u), 1.45, 0); camera.lookAt(look);
    }
  };
}
