import * as THREE from 'three';
import { V, ease, easeOut, lerp, stdMat } from './lib.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Plan 4c — zoom rapide sur une ligne de production alimentaire en inox brillant
export default function (ctx) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c0e);
  scene.environment = ctx.pmrem.fromScene(new RoomEnvironment(), 0.02).texture; scene.environmentIntensity = 0.55;
  scene.fog = new THREE.Fog(0x08090a, 8, 40);
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 300);
  scene.add(new THREE.HemisphereLight(0xdde6ee, 0x202428, 0.15));
  const key = new THREE.DirectionalLight(0xfff0dc, 1.6); key.position.set(-5, 10, 6); scene.add(key);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 });

  const inox = new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.14, metalness: 1 });
  const inoxB = new THREE.MeshStandardMaterial({ color: 0xc0c6cc, roughness: 0.3, metalness: 1 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x2a2e32, roughness: 0.25, metalness: 0.2 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // convoyeur
  const conv = new THREE.Group(); scene.add(conv);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 40), inox); bed.position.y = 0.95; conv.add(bed);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 40), stdMat(0x1a1c1e, 0.5)); belt.position.y = 1.0; conv.add(belt);
  [-0.36, 0.36].forEach(x => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 40), inox); r.position.set(x, 1.06, 0); conv.add(r); });
  for (let i = 0; i < 14; i++) { [-0.3, 0.3].forEach(x => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 12), inox); l.position.set(x, 0.47, -18 + i * 2.8); conv.add(l); }); }
  // bocaux
  const jarG = new THREE.CylinderGeometry(0.075, 0.075, 0.18, 32);
  const jarM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.0, transparent: true, opacity: 0.28, metalness: 0, clearcoat: 1 });
  const fill = new THREE.MeshStandardMaterial({ color: 0xc86a1a, roughness: 0.4 });
  const lidM = new THREE.MeshStandardMaterial({ color: 0xc8a040, roughness: 0.25, metalness: 1 });
  const jars = new THREE.InstancedMesh(jarG, jarM, 120), fills = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.068, 0.068, 0.13, 24), fill, 120), lids = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.078, 0.078, 0.03, 32), lidM, 120);
  [jars, fills, lids].forEach(i => { i.frustumCulled = false; scene.add(i); });
  // cuves
  for (let i = 0; i < 5; i++) {
    const tk = new THREE.Group(); tk.position.set(-2.8, 0, -4 - i * 3.4); scene.add(tk);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3.4, 48), inox); c.position.y = 2.6; tk.add(c);
    const top = new THREE.Mesh(new THREE.SphereGeometry(1.1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), inox); top.position.y = 4.3; top.scale.y = 0.35; tk.add(top);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.8, 48), inox); cone.rotation.x = Math.PI; cone.position.y = 0.5; tk.add(cone);
    [[0.8, 0.8], [-0.8, 0.8], [0.8, -0.8], [-0.8, -0.8]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 10), inox); l.position.set(x, 0.6, z); tk.add(l); });
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 16), inoxB); pipe.rotation.z = Math.PI / 2; pipe.position.set(1.3, 1.3, 0); tk.add(pipe);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.11, 0.03, 8, 64), inoxB); ring.rotation.x = Math.PI / 2; ring.position.y = 2; tk.add(ring);
  }
  // remplisseuse
  const filler = new THREE.Group(); filler.position.set(0, 0, -1.5); scene.add(filler);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.6), inox); hood.position.y = 2.1; filler.add(hood);
  [-0.6, 0.6].forEach(x => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 1.6), inox); p.position.set(x, 1.4, 0); filler.add(p); });
  const nozzles = []; for (let i = 0; i < 4; i++) { const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.4, 12), inox); nz.position.set(0, 1.55, -0.6 + i * 0.4); filler.add(nz); nozzles.push(nz); }
  // lumières linéaires
  for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 5.4) })); l.position.set(0.5, 4.5, -i * 5); scene.add(l); }
  const pl = new THREE.PointLight(0xffe8c8, 40, 12, 2); pl.position.set(1.5, 3, 1); scene.add(pl);

  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  return {
    scene, camera, exposure: 0.8,
    dof: () => ({ focus: camera.position.distanceTo(V(0, 1.1, 0.5)), aperture: 0.002, maxblur: 0.01 }),
    update(t) {
      const off = t * 0.35;
      for (let i = 0; i < 120; i++) {
        const z = -12 + ((i * 0.42 + off) % 50);
        m.compose(V(0, 1.1, z), q, V(1, 1, 1)); jars.setMatrixAt(i, m);
        m.compose(V(0, 1.085, z), q, V(1, z > -1.5 ? 1 : 0.001, 1)); fills.setMatrixAt(i, m);
        m.compose(V(0, 1.205, z), q, V(1, z > -1 ? 1 : 0.001, 1)); lids.setMatrixAt(i, m);
      }
      jars.instanceMatrix.needsUpdate = fills.instanceMatrix.needsUpdate = lids.instanceMatrix.needsUpdate = true;
      const z = easeOut(t / 0.55); // zoom rapide
      camera.position.set(lerp(3.4, 0.75, z), lerp(3.2, 1.35, z), lerp(6.5, 1.3, z) - t * 0.15);
      camera.lookAt(0, 1.1, lerp(-3, 0.3, z));
      camera.fov = lerp(50, 32, z); camera.updateProjectionMatrix();
    }
  };
}
