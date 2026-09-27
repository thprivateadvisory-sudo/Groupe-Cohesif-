import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clamp, sstep } from './lib.js';

const params = new URLSearchParams(location.search);
const W = +(params.get('w') || 1920), H = +(params.get('h') || 1080);
const only = params.get('only');

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const ctx = { renderer, envMap, pmrem };

// timeline: [start, end, module, dissolveIn]
const TL = [
  [0.0, 5.3, 's1_paris', 0],
  [4.8, 9.0, 's2_sign', 0.5],
  [9.0, 12.0, 's3_site', 0],
  [12.0, 14.0, 's3_house', 0],
  [14.0, 16.2, 's4_port', 0],
  [16.2, 17.9, 's4_warehouse', 0],
  [17.9, 19.0, 's4_food', 0],
  [19.0, 22.3, 's5_car', 0],
  [21.7, 24.0, 's5_solar', 0.6],
  [24.0, 28.0, 's6_stadium', 0],
  [28.0, 31.0, 's7_hands', 0],
  [30.6, 33.0, 's7_ai', 0.4],
  [33.0, 37.0, 's8_corridor', 0],
];
const shots = [];
for (const [s, e, mod, dis] of TL) {
  if (only && !only.split(',').includes(mod)) { shots.push(null); continue; }
  const m = await import(`./${mod}.js`);
  const shot = m.default(ctx);
  shot.scene.environment = shot.scene.environment ?? null;
  shots.push({ s, e, mod, dis, shot });
}

function makeSlot() {
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const comp = new EffectComposer(renderer, rt);
  comp.renderToScreen = false;
  const rp = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  const bp = new BokehPass(new THREE.Scene(), new THREE.PerspectiveCamera(), { focus: 10, aperture: 0.0002, maxblur: 0.01 });
  comp.addPass(rp); comp.addPass(bp);
  return { comp, rp, bp };
}
const slots = [makeSlot(), makeSlot()];

function renderShot(slot, sh, tl) {
  sh.shot.update(tl);
  slot.rp.scene = sh.shot.scene; slot.rp.camera = sh.shot.camera;
  const d = sh.shot.dof ? sh.shot.dof(tl) : null;
  slot.bp.enabled = !!d;
  if (d) {
    slot.bp.scene = sh.shot.scene; slot.bp.camera = sh.shot.camera;
    const u = slot.bp.uniforms;
    u.focus.value = d.focus; u.aperture.value = d.aperture; u.maxblur.value = d.maxblur;
    u.nearClip.value = sh.shot.camera.near; u.farClip.value = sh.shot.camera.far; u.aspect.value = sh.shot.camera.aspect;
  }
  slot.comp.render();
  return slot.comp.readBuffer.texture;
}

// final composite
const final = new EffectComposer(renderer);
const blend = new ShaderPass({
  uniforms: { tA: { value: null }, tB: { value: null }, mixv: { value: 0 }, expA: { value: 1 }, expB: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `uniform sampler2D tA,tB; uniform float mixv,expA,expB; varying vec2 vUv;
    void main(){ vec3 a = texture2D(tA,vUv).rgb*expA; vec3 b = mixv>0.? texture2D(tB,vUv).rgb*expB : a; gl_FragColor = vec4(mix(a,b,mixv),1.); }`
}, 'none');
final.addPass(blend);
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.6, 0.82); final.addPass(bloom);
final.addPass(new OutputPass());

const logoTex = await new THREE.TextureLoader().loadAsync('/logo_gold.png');
logoTex.colorSpace = THREE.SRGBColorSpace;
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, fade: { value: 1 }, logo: { value: logoTex }, logoA: { value: 0 }, sweep: { value: -1 }, logoScale: { value: 1 }, res: { value: new THREE.Vector2(W, H) }, logoAspect: { value: logoTex.image.width / logoTex.image.height }, flash: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `uniform sampler2D tDiffuse, logo; uniform float time, fade, logoA, sweep, logoScale, logoAspect, flash; uniform vec2 res; varying vec2 vUv;
    float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
    void main(){
      vec2 uv = vUv; vec2 cc = uv-0.5;
      float ca = dot(cc,cc)*0.006;
      vec3 col; col.r = texture2D(tDiffuse, uv - cc*ca).r; col.g = texture2D(tDiffuse, uv).g; col.b = texture2D(tDiffuse, uv + cc*ca).b;
      // S-curve contrast + black crush
      col = clamp(col,0.,1.);
      col = mix(col, col*col*(3.-2.*col), 0.38);
      col = max(col-0.012,0.)/0.988;
      float lum = dot(col, vec3(0.2126,0.7152,0.0722));
      // split tone: deep neutral blacks, golden highlights, off-white peaks
      col *= mix(vec3(0.93,0.96,1.02), vec3(1.07,1.0,0.84), smoothstep(0.05,0.75,lum));
      col = mix(vec3(lum), col, 0.9);
      col = mix(col, vec3(1.0,0.97,0.9), smoothstep(0.85,1.0,lum)*0.25);
      // vignette
      float vig = smoothstep(1.05, 0.25, length(cc*vec2(1.25,1.0)));
      col *= mix(0.55, 1.0, vig);
      col *= fade;
      col += flash;
      // logo
      if (logoA > 0.) {
        vec2 p = (uv-0.5); p.x *= res.x/res.y; p /= logoScale;
        float lw = 0.62, lh = lw/logoAspect;
        vec2 luv = vec2(p.x/lw + 0.5, p.y/lh + 0.5);
        if (luv.x>0.&&luv.x<1.&&luv.y>0.&&luv.y<1.) {
          vec4 L = texture2D(logo, luv);
          float band = exp(-pow((luv.x - sweep + (luv.y-0.5)*0.35)*7.,2.));
          vec3 lc = L.rgb*(1.0+band*1.4) + band*0.25*L.a;
          col = mix(col, lc, L.a*logoA);
        }
        // soft golden glow behind
        col += vec3(0.35,0.24,0.08)*exp(-dot(p,p)*9.)*0.10*logoA;
      }
      // grain
      float gr = hash(uv*res + fract(time*17.3)*vec2(91.7,37.3)) - 0.5;
      col += gr * 0.035 * (1.0 - lum*0.6);
      // anamorphic letterbox 2.39:1
      float bar = (1.0 - (res.x/2.39)/res.y)*0.5;
      if (uv.y < bar || uv.y > 1.0-bar) col = vec3(0.);
      gl_FragColor = vec4(col,1.);
    }`
});
final.addPass(grade);

window.DURATION = 40;
window.renderFrame = (t) => {
  const act = shots.filter(x => x && t >= x.s && t < x.e);
  let texA, texB = null, mixv = 0;
  if (act.length === 0) { texA = null; }
  if (act.length >= 1) texA = renderShot(slots[0], act[0], t - act[0].s);
  if (act.length >= 2) { const b = act[1]; texB = renderShot(slots[1], b, t - b.s); mixv = sstep(0, 1, (t - b.s) / b.dis); }
  const u = blend.uniforms;
  u.tA.value = texA; u.tB.value = texB; u.mixv.value = texB ? mixv : 0;
  u.expA.value = act[0]?.shot.exposure ?? 1; u.expB.value = act[1]?.shot.exposure ?? 1;
  const g = grade.uniforms;
  g.time.value = t;
  // fades: in from black at start, out to black at end of corridor
  let fade = sstep(0, 0.8, t);
  fade *= 1 - sstep(35.9, 36.9, t);
  g.fade.value = fade;
  g.logoA.value = sstep(37.1, 38.4, t);
  g.logoScale.value = 0.94 + 0.06 * sstep(37.0, 40, t);
  g.sweep.value = -0.4 + 1.9 * sstep(38.0, 39.4, t);
  g.flash.value = 0;
  if (!texA) { blend.enabled = true; u.tA.value = slots[0].comp.readBuffer.texture; u.expA.value = 0; }
  final.render();
};
window.READY = true;
