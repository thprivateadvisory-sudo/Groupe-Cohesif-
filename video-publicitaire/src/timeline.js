/* Groupe Cohesif — film corporate.
   Moteur déterministe : renderAt(t) dessine l'image exacte au temps t (secondes).
   Le rendu vidéo est fait image par image (tools/render.js), l'audio est synchronisé sur CUES. */
(() => {
const stage = document.getElementById('stage');
const SC = document.getElementById('scenes');
const W = innerWidth, H = innerHeight, AR = W / H;
const FMT = AR > 1.3 ? 'land' : AR < 0.8 ? 'port' : 'sq';
stage.classList.add(FMT);
const LAND = FMT === 'land', PORT = FMT === 'port', SQ = FMT === 'sq';
const CX = W / 2, CY = H / 2;
const pick = (l, p, s) => LAND ? l : PORT ? p : s;

/* ---------- utils ---------- */
const C = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const P = (t, a, b) => C((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const E = {
  o3: k => 1 - Math.pow(1 - k, 3),
  oX: k => k >= 1 ? 1 : 1 - Math.pow(2, -10 * k),
  io: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
  io2: k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2,
  i2: k => k * k,
  i3: k => k * k * k,
  oB: k => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
};
const env = (t, a, b, di = .6, dout = .4) => (t < a || t > b) ? 0 : Math.min(E.o3(P(t, a, a + di)), 1 - E.i2(P(t, b - dout, b)));
function h(tag, cls, html, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  (parent || SC).appendChild(e);
  return e;
}
const css = (el, o) => { for (const k in o) el.style[k] = o[k]; return el; };
const vis = (el, v) => { el.style.visibility = v ? 'visible' : 'hidden'; };
const rect = el => el.getBoundingClientRect();
const ctr = (el, ox = .5, oy = .5) => { const r = rect(el); if (!r.width && !r.height) return null; return [r.left + r.width * ox, r.top + r.height * oy]; };

const PNGS = new Set(['ac7', 'ac22', 'dcmurale', 'dcdouble', 'dcpied', 'dcultra', 'batterie', 'panneau', 'onduleur', 'murale', 'chariot']);
const IMG = k => `assets/img/${k}.${PNGS.has(k) ? 'png' : 'jpg'}`;
const LOGO = k => `assets/logos/${k}.png`;
const bgi = k => `url(${IMG(k)})`;

const CUES = [];
const cue = (t, type, v = 1) => CUES.push({ t: +t.toFixed(3), type, v });

/* text reveal through a mask */
function RV(parent, cls, html) {
  const o = h('div', 'rv ' + (cls || ''), null, parent);
  const i = h('div', 'rvi', html, o);
  return { o, i };
}
function rv(r, t, a, b, o = {}) {
  const inD = o.inD ?? .9, outD = o.outD ?? .45;
  if (t < a || t >= b) { vis(r.o, 0); return 0; }
  vis(r.o, 1);
  const pi = E.oX(P(t, a, a + inD)), po = E.i2(P(t, b - outD, b));
  r.i.style.transform = `translate3d(0,calc(${((1 - pi) * 108).toFixed(3)}% - ${(po * 14).toFixed(2)}px),0)`;
  r.i.style.opacity = (1 - po).toFixed(4);
  r.i.style.filter = po > .002 ? `blur(${(po * 7).toFixed(2)}px)` : 'none';
  if (o.ls) r.i.style.letterSpacing = lerp(o.ls[0], o.ls[1], E.o3(P(t, a, a + (o.lsD ?? 2.4)))).toFixed(4) + 'em';
  return pi * (1 - po);
}
/* fade + slide */
function fu(el, t, a, b, o = {}) {
  const di = o.di ?? .7, dout = o.dout ?? .4, dy = o.dy ?? 24, dx = o.dx ?? 0;
  if (t < a || t >= b) { vis(el, 0); return 0; }
  vis(el, 1);
  const pi = E.o3(P(t, a, a + di)), po = E.i2(P(t, b - dout, b));
  const op = pi * (1 - po);
  el.style.opacity = op.toFixed(4);
  el.style.transform = (o.base || '') + ` translate3d(${((1 - pi) * dx - po * (o.ox ?? 0)).toFixed(2)}px,${((1 - pi) * dy - po * (o.oy ?? 10)).toFixed(2)}px,0)` + (o.sc ? ` scale(${lerp(o.sc, 1, pi).toFixed(4)})` : '');
  if (o.blur !== false) {
    const b2 = (1 - pi) * (o.bi ?? 5) + po * (o.bo ?? 5);
    el.style.filter = b2 > .02 ? `blur(${b2.toFixed(2)}px)` : 'none';
  }
  return op;
}
const scenes = [];
function scene(a, b, upd) { const root = h('div', 'scene'); const s = { a, b, root, upd }; scenes.push(s); return s; }

/* ---------- icons ---------- */
const ICON = {
  cart: '<path d="M2.5 3.5h2.2l2.5 11a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8l1.7-7.5H6" /><circle cx="9.2" cy="19.3" r="1.4"/><circle cx="17" cy="19.3" r="1.4"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  truck: '<path d="M2 6h11v10H2z"/><path d="M13 9h4.2l3 3.2V16H13z"/><circle cx="6" cy="17.6" r="1.8"/><circle cx="16.6" cy="17.6" r="1.8"/>',
  shield: '<path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z"/><path d="M9 12l2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pointer: '<path d="M6 3.5l12.5 7.2-5.6 1.6-2.4 5.7z"/><path d="M13 12.4l4.6 6.1"/>',
  box: '<path d="M3.5 7.5L12 3.6l8.5 3.9v9L12 20.4l-8.5-3.9z"/><path d="M3.5 7.5L12 11.4l8.5-3.9M12 11.4v9"/>',
  home: '<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.2 14.6l2 2 3.8-3.9"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};
const svgI = (k, sz = 20, stroke = 'currentColor', sw = 1.8, extra = '') =>
  `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${extra}>${ICON[k]}</svg>`;

/* ---------- background, grain ---------- */
const g1 = stage.querySelector('.g1'), g2 = stage.querySelector('.g2');
const grain = document.getElementById('grain');
const blackout = document.getElementById('blackout');
{
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const cx = cv.getContext('2d'); const id = cx.createImageData(256, 256);
  let s = 1234567;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < id.data.length; i += 4) { const v = rnd() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  cx.putImageData(id, 0, 0);
  grain.style.backgroundImage = `url(${cv.toDataURL()})`;
}
function bgUpdate(t, frame) {
  css(g1, { left: (W * .22 + Math.sin(t * .11) * W * .12 - 450) + 'px', top: (H * .3 + Math.cos(t * .09) * H * .12 - 350) + 'px' });
  css(g2, { left: (W * .72 + Math.cos(t * .07) * W * .1 - 350) + 'px', top: (H * .66 + Math.sin(t * .1) * H * .1 - 300) + 'px' });
  const r1 = (Math.sin(frame * 12.9898) * 43758.5453) % 1, r2 = (Math.sin(frame * 78.233) * 12543.123) % 1;
  void r1; void r2; // grain fixe : dithering anti-banding sans coût de débit
}

/* ---------- cursor ---------- */
const cursorEl = document.getElementById('cursor'), rippleEl = document.getElementById('ripple');
const CUR = { moves: [], clicks: [], wins: [] };
function curMove(t0, t1, target, from) { CUR.moves.push({ t0, t1, target, from }); }
function curClick(tc, snd = 'click') { CUR.clicks.push(tc); cue(tc, snd); }
function curShow(a, b) { CUR.wins.push([a, b]); }
function curUpdate(t) {
  let v = 0;
  for (const [a, b] of CUR.wins) v = Math.max(v, env(t, a, b, .35, .35));
  if (v <= 0) { cursorEl.style.display = 'none'; rippleEl.style.display = 'none'; return; }
  const ms = CUR.moves;
  let i = -1;
  for (let k = 0; k < ms.length; k++) if (ms[k].t0 <= t) i = k;
  let pos;
  if (i < 0) pos = ms[0].from ? ms[0].from() : ms[0].target();
  else {
    const m = ms[i];
    const end = m.target() || CUR.last || [CX, CY];
    if (t >= m.t1) pos = end;
    else {
      const start = (m.from ? m.from() : (i > 0 ? ms[i - 1].target() : end)) || CUR.last || end;
      const k = E.io(P(t, m.t0, m.t1));
      const dx = end[0] - start[0], dy = end[1] - start[1];
      const arc = Math.sin(Math.PI * k) * .08;
      pos = [lerp(start[0], end[0], k) - dy * arc, lerp(start[1], end[1], k) + dx * arc];
    }
  }
  if (!pos) pos = CUR.last || [CX, CY];
  CUR.last = pos;
  let sc = 1, rip = null;
  for (const tc of CUR.clicks) {
    const k = P(t, tc, tc + .2); if (k > 0 && k < 1) sc = Math.min(sc, 1 - .2 * Math.sin(Math.PI * k));
    const k2 = P(t, tc, tc + .55); if (k2 > 0 && k2 < 1) rip = k2;
  }
  css(cursorEl, { display: 'block', opacity: v, transform: `translate(${(pos[0] - 3).toFixed(1)}px,${(pos[1] - 3).toFixed(1)}px) scale(${sc.toFixed(3)})` });
  if (rip != null) {
    const r = 8 + 34 * E.o3(rip);
    css(rippleEl, { display: 'block', left: (pos[0] - r) + 'px', top: (pos[1] - r) + 'px', width: 2 * r + 'px', height: 2 * r + 'px', opacity: (.8 * (1 - rip) * v).toFixed(3) });
  } else rippleEl.style.display = 'none';
}

/* ---------- shared content ---------- */
const POLES = [
  { k: 'btp', short: 'BTP', name: 'COHESIF BTP', chips: ['CONSTRUCTION', 'RÉNOVATION', 'CHANTIERS'], line: 'Des solutions pour vos projets de construction.', url: 'cohesifbtp.fr', vis: 'photos', ph: ['chantier', 'engin', 'minipelle25'] },
  { k: 'negoce', short: 'NÉGOCE', name: 'COHESIF NÉGOCE', chips: ['MATÉRIAUX', 'FOURNITURES', 'APPROVISIONNEMENT'], line: 'Les ressources nécessaires à vos projets.', url: 'cohesifnegoce.fr', vis: 'negoce' },
  { k: 'energy', short: 'ENERGY', name: 'COHESIF ENERGY', chips: ['ÉNERGIE', 'PHOTOVOLTAÏQUE', 'MOBILITÉ ÉLECTRIQUE'], line: 'Des solutions pour vos projets énergétiques.', url: 'cohesifenergy.fr', vis: 'photos', ph: ['parking', 'maison', 'station'] },
  { k: 'auto', short: 'AUTO', name: 'COHESIF AUTO', chips: ['MOBILITÉ', 'TRANSPORT', 'LOGISTIQUE'], line: 'Vente, import et flottes professionnelles.', url: 'cohesifauto.fr', vis: 'photos', ph: ['flotte', 'classique', 'prestige'] },
  { k: 'commerce', short: 'COMMERCE', name: 'COHESIF COMMERCE', chips: ['DISTRIBUTION', 'B2B · B2C', 'E-COMMERCE'], line: 'Vous pouvez acheter en ligne.', url: 'cohesifcommerce.fr', vis: 'shop', tall: true },
  { k: 'access', short: 'ACCESS', name: 'COHESIF ACCESS', chips: ['IMMOBILIER', "APPORT D'AFFAIRES", 'RÉSEAU PRIVÉ'], line: "Un réseau privé d'apporteurs d'affaires immobilier.", url: 'cohesifaccess.fr', vis: 'access' },
  { k: 'agro', short: 'AGRO', name: 'COHESIF AGRO', chips: ['ÉQUIPEMENTS', 'EMBALLAGES', 'SOURCING'], line: "Solutions B2B pour l'agroalimentaire.", url: 'cohesifagro.fr', vis: 'photos', ph: ['filmeuse', 'burger', 'filmeuse2'], light: [false, true, true] },
  { k: 'sport', short: 'SPORT', name: 'COHESIF SPORT', chips: ['FOOTBALL', 'GESTION DE CLUBS', 'INFRASTRUCTURES'], line: 'La gestion de clubs de football.', url: 'cohesifsport.fr', vis: 'sport' },
];
const NB = ' ';

/* ring of poles around the group logo (used by the hub and the ecosystem scene) */
function makeRing(parent, o) {
  const root = h('div', 'hub', null, parent);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  root.appendChild(svg);
  const logo = h('div', 'hubLogo', `<img src="${LOGO('groupe-white')}">`, root);
  css(logo, { left: o.cx + 'px', top: o.cy + 'px', width: o.logoW + 'px' });
  const nodes = [], lines = [], pulses = [];
  POLES.forEach((p, i) => {
    const ang = -Math.PI / 2 + i * Math.PI * 2 / 8;
    const x = o.cx + Math.cos(ang) * o.rx, y = o.cy + Math.sin(ang) * o.ry;
    const n = h('div', 'node' + (y < o.cy - 1 ? ' up' : ''), `<div class="dot"><i></i></div><div class="lab"><small>COHESIF</small><b>${p.short}</b></div>`, root);
    css(n, { left: x + 'px', top: y + 'px' });
    const dx = x - o.cx, dy = y - o.cy, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const r0 = o.r0, x0 = o.cx + ux * r0, y0 = o.cy + uy * r0 * (o.ry / o.rx > 1 ? 1 : 1), x1 = x - ux * 16, y1 = y - uy * 16;
    const ln = document.createElementNS(svgNS, 'path');
    ln.setAttribute('d', o.inward ? `M${x1} ${y1} L${x0} ${y0}` : `M${x0} ${y0} L${x1} ${y1}`);
    ln.setAttribute('pathLength', 1);
    ln.setAttribute('stroke', 'rgba(198,163,94,.55)'); ln.setAttribute('stroke-width', 1.2); ln.setAttribute('fill', 'none');
    ln.setAttribute('stroke-dasharray', '1 1');
    svg.appendChild(ln);
    const pu = document.createElementNS(svgNS, 'circle'); pu.setAttribute('r', 3.2); pu.setAttribute('fill', '#e0c690');
    svg.appendChild(pu);
    nodes.push({ el: n, x, y, dot: n.querySelector('.dot'), core: n.querySelector('.dot i') });
    lines.push(ln); pulses.push({ el: pu, x0: x1, y0: y1, x1: x0, y1: y0 });
  });
  return { root, logo, nodes, lines, pulses };
}
function ringLines(R, t, a, step = .06, dur = 1) {
  R.lines.forEach((ln, i) => ln.setAttribute('stroke-dashoffset', (1 - E.io(P(t, a + step * i, a + step * i + dur))).toFixed(4)));
}
function ringNodes(R, t, a, step = .08, lit = null) {
  R.nodes.forEach((n, i) => {
    const k = P(t, a + step * i, a + step * i + .55);
    const s = E.oB(k);
    n.el.style.opacity = E.o3(k).toFixed(3);
    n.dot.style.transform = `scale(${s.toFixed(3)})`;
    const L = lit ? lit(i) : 0;
    n.core.style.opacity = (.25 + .75 * L).toFixed(3);
    n.dot.style.boxShadow = L > .01 ? `0 0 ${(18 * L).toFixed(1)}px rgba(224,198,144,${(.7 * L).toFixed(2)})` : 'none';
  });
}
function ringPulses(R, t, a, b) {
  R.pulses.forEach((p, i) => {
    if (t < a || t > b) { p.el.setAttribute('opacity', 0); return; }
    const f = ((t - a) / 1.3 + i * .137) % 1;
    const op = Math.sin(Math.PI * f) * env(t, a, b, .5, .5);
    p.el.setAttribute('cx', lerp(p.x0, p.x1, f).toFixed(1)); p.el.setAttribute('cy', lerp(p.y0, p.y1, f).toFixed(1));
    p.el.setAttribute('opacity', op.toFixed(3));
  });
}

/* =====================================================================
   SCENE 1 — INTRODUCTION (0 → 12)
   ===================================================================== */
{
  const s = scene(0, 12.3, upd);
  const hair = h('div', 'hair abs', null, s.root);
  const lw = h('div', null, `<img src="${LOGO('groupe-white')}"><div class="sheen"></div>`, s.root); lw.id = 'logoWrap';
  const sheen = lw.querySelector('.sheen');
  const lwW = pick(520, 560, 500);
  lw.style.width = lwW + 'px';
  const mk = txt => RV(h('div', 'centerblock', null, s.root), 'h1', txt);
  const t1 = mk('UN GROUPE.'), t2 = mk('PLUSIEURS EXPERTISES.'), t3 = mk('DES SOLUTIONS POUR VOS PROJETS.');
  const hair3 = h('div', 'hair abs', null, s.root);
  cue(.9, 'swell'); cue(2.4, 'impact'); cue(4.9, 'whoosh_soft'); cue(7.25, 'whoosh_soft'); cue(9.65, 'whoosh_soft');
  function upd(t) {
    blackout.style.opacity = (1 - E.io(P(t, 0, 1.6))).toFixed(3);
    const lh = lwW * 465 / 669;
    css(hair, { left: CX - 230 + 'px', width: '460px', top: (CY + lh / 2 + 34) + 'px', transform: `scaleX(${E.io(P(t, .3, 2.0)).toFixed(4)})`, opacity: env(t, .3, 4.6, .4, .7).toFixed(3) });
    const op = E.o3(P(t, 1.0, 3.0)) * (1 - E.i2(P(t, 4.2, 4.95)));
    const sc = lerp(1.07, 1, E.o3(P(t, 1.0, 4.2))) * lerp(1, .96, E.i2(P(t, 4.2, 4.95)));
    const bl = (1 - E.o3(P(t, 1.0, 2.7))) * 12 + E.i2(P(t, 4.2, 4.95)) * 8;
    css(lw, { opacity: op.toFixed(3), transform: `translate(-50%,-50%) scale(${sc.toFixed(4)})`, filter: bl > .02 ? `blur(${bl.toFixed(2)}px)` : 'none', display: op > 0 ? 'block' : 'none' });
    css(sheen, { backgroundPosition: `${lerp(120, -20, E.io(P(t, 2.2, 3.8))).toFixed(2)}% 0`, opacity: env(t, 2.1, 3.9, .3, .4).toFixed(3) });
    rv(t1, t, 4.9, 7.25, { ls: [.3, .14] });
    rv(t2, t, 7.25, 9.65, { ls: [.3, .14] });
    rv(t3, t, 9.65, 12.2, { ls: [.24, .12] });
    const r3 = rect(t3.o);
    css(hair3, { left: CX - 160 + 'px', width: '320px', top: (r3.bottom + 26) + 'px', transform: `scaleX(${E.io(P(t, 10.2, 11.3)).toFixed(4)})`, opacity: env(t, 10.2, 12.05, .3, .4).toFixed(3) });
  }
}

/* =====================================================================
   SCENE 2 — QUI EST GROUPE COHESIF ? (12 → 19.2)
   ===================================================================== */
{
  const s = scene(11.95, 19.65, upd);
  const VERBS = [['CONSTRUIRE', 'chantier'], ['APPROVISIONNER', 'filmeuse'], ['ÉQUIPER', 'minipelle'], ['TRANSPORTER', 'flotte'], ['ACCOMPAGNER', 'parking']];
  const photosWrap = h('div', 'abs', null, s.root); css(photosWrap, { inset: 0 });
  const photos = VERBS.map(([, k]) => { const p = h('div', 'photo', `<div class="im" style="background-image:${bgi(k)}"></div><div class="tint"></div><div class="ov"></div>`, photosWrap); return { p, im: p.querySelector('.im') }; });
  const idx = h('div', 'verbIdx', '', s.root); idx.style.top = (CY - pick(110, 110, 104)) + 'px';
  const verbs = VERBS.map(([v]) => RV(h('div', 'centerblock', null, s.root), 'h1', v));
  const fin = RV(h('div', 'centerblock', null, s.root), 'h1', 'GROUPE COHESIF');
  const finSub = h('div', 'verbIdx', 'UN GROUPE MULTI-ACTIVITÉS', s.root); finSub.style.top = (CY - 104) + 'px';
  const row = h('div', 'verbRow', VERBS.map(([v]) => `<span>${v}</span>`).join(''), s.root);
  const spans = [...row.children];
  VERBS.forEach((_, i) => cue(12 + 1.2 * i, 'whoosh', .7));
  cue(18.0, 'impact_soft');
  function upd(t) {
    s.root.style.opacity = (1 - E.i2(P(t, 19.15, 19.65))).toFixed(3);
    photos.forEach((ph, i) => {
      const ti = 12 + 1.2 * i;
      const p = E.io(P(t, ti - .05, ti + .5));
      vis(ph.p, p > 0);
      ph.p.style.clipPath = i === 0 ? `inset(0 0 0 0)` : `inset(0 0 0 ${((1 - p) * 100).toFixed(2)}%)`;
      ph.p.style.opacity = i === 0 ? E.o3(P(t, 11.95, 12.6)).toFixed(3) : 1;
      const kb = P(t, ti - .2, ti + 2.4);
      ph.im.style.transform = `scale(${lerp(1.14, 1.03, E.o3(kb)).toFixed(4)}) translateX(${lerp(14, -14, kb).toFixed(2)}px)`;
    });
    photosWrap.style.opacity = (1 - E.io(P(t, 17.85, 18.5))).toFixed(3);
    let act = -1;
    verbs.forEach((r, i) => { const a = 12 + 1.2 * i; rv(r, t, a + .05, a + 1.2, { inD: .55, outD: .28 }); if (t >= a && t < a + 1.2) act = i; });
    if (act >= 0) { idx.textContent = `0${act + 1}${NB}/${NB}05`; vis(idx, 1); idx.style.opacity = env(t, 12 + 1.2 * act, 12 + 1.2 * act + 1.2, .3, .25).toFixed(3); } else vis(idx, 0);
    rv(fin, t, 18.05, 19.6, { inD: .8, ls: [.28, .18], lsD: 1.6 });
    fu(finSub, t, 18.3, 19.6, { dy: 10 });
    const allOn = E.o3(P(t, 18.0, 18.6));
    spans.forEach((sp, i) => {
      const on = Math.max(i === act ? 1 : 0, allOn);
      sp.style.color = `rgba(${on > .5 ? '243,245,249' : '255,255,255'},${(.3 + .62 * on).toFixed(3)})`;
    });
    row.style.opacity = E.o3(P(t, 12.1, 12.8)).toFixed(3);
  }
}

/* =====================================================================
   SCENE 3 — LES PÔLES (19.2 → 52.8)
   ===================================================================== */
const WS = i => 22.8 + 3.6 * i;              // window start of pole i
{
  const s = scene(19.2, 53.3, upd);
  /* hub */
  const hubG = pick({ cx: 960, cy: 575, rx: 640, ry: 318, r0: 175, logoW: 300 }, { cx: 540, cy: 1000, rx: 360, ry: 470, r0: 190, logoW: 320 }, { cx: 540, cy: 590, rx: 400, ry: 320, r0: 160, logoW: 260 });
  const hubTitle = h('div', 'hubTitle', `<div class="eyebrow">NOS PÔLES D'ACTIVITÉ</div>`, s.root);
  const hubT2 = RV(hubTitle, 'h3', 'UN ÉCOSYSTÈME, PLUSIEURS EXPERTISES');
  hubT2.o.style.marginTop = '14px';
  const R = makeRing(s.root, hubG);
  /* panel */
  const panel = h('div', 'panel', null, s.root);
  const nav = h('div', 'nav', `<img class="navLogo" src="${LOGO('groupe-white')}"><div class="navHead">L'ÉCOSYSTÈME</div>`, panel);
  const items = h('div', 'items', null, nav);
  const its = POLES.map((p, i) => h('div', 'it', `<small>0${i + 1}</small>${p.short}`, items));
  const bar = h('div', 'bar', null, items);
  const VIS = pick([640, 700], [960, 620], [1000, 450]);
  const groups = POLES.map((p, i) => buildPole(p, i, panel));

  cue(19.4, 'swell_short', .6);
  POLES.forEach((_, i) => cue(19.6 + .08 * i, 'blip', .35));
  cue(22.15, 'zoom');
  for (let i = 0; i < 8; i++) cue(WS(i) - .3, 'whoosh_ui', .55);
  cue(51.75, 'zoom_out');

  curShow(20.5, 48.0);
  const nodeP = i => [R.nodes[i].x, R.nodes[i].y];
  curMove(20.7, 21.75, () => nodeP(0), () => [W * .82, H * .9]);
  curClick(21.95);
  const itemP = i => LAND ? (() => { const r = rect(its[i]); return [r.left + 110, r.top + r.height / 2]; })() : ctr(its[i]);
  curMove(22.9, 23.9, () => [pick(1380, 820, 860), pick(820, 1500, 880)]);
  for (let i = 1; i < 8; i++) { curMove(WS(i) - 1.5, WS(i) - .9, () => itemP(i)); curClick(WS(i) - .8, 'click'); }
  curMove(WS(7) + .2, WS(7) + 1.3, () => [pick(1400, 800, 860), pick(900, 1600, 900)]);

  function buildPole(p, i, parent) {
    const g = h('div', 'pc', null, parent);
    const tx = h('div', 'pc-text', null, g);
    const lc = h('div', 'lcard' + (p.tall ? ' tall' : ''), `<img src="${LOGO(p.k)}">`, tx);
    const num = h('div', 'pc-num', `PÔLE 0${i + 1}`, tx);
    const title = RV(tx, 'pc-title', p.name.replace('COHESIF ', 'COHESIF<br>'));
    const chips = h('div', 'pc-chips', p.chips.join('<em>•</em>'), tx);
    const hair = h('div', 'pc-hair', null, tx);
    const line = h('div', 'pc-line', p.line, tx);
    const url = h('div', 'pc-url', p.url, tx);
    const v = h('div', 'pc-vis', null, g);
    const G = { g, lc, num, title, chips, hair, line, url, v, tiles: [], extra: {} };
    const [vw, vh] = VIS, gap = 14;
    const tile = (x, y, w, hh, k, light) => {
      const tl = h('div', 'tile' + (light ? ' light' : ''), `<div class="im" style="background-image:${bgi(k)}"></div><div class="edge"></div>`, v);
      css(tl, { left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px' });
      G.tiles.push({ el: tl, im: tl.querySelector('.im') });
      return tl;
    };
    if (p.vis === 'photos') {
      const L = p.light || [];
      if (SQ) { const w1 = Math.round(vw * .6); tile(0, 0, w1, vh, p.ph[0], L[0]); tile(w1 + gap, 0, vw - w1 - gap, (vh - gap) / 2, p.ph[1], L[1]); tile(w1 + gap, (vh + gap) / 2, vw - w1 - gap, (vh - gap) / 2, p.ph[2], L[2]); }
      else { const h1 = Math.round(vh * .58); tile(0, 0, vw, h1, p.ph[0], L[0]); tile(0, h1 + gap, (vw - gap) / 2, vh - h1 - gap, p.ph[1], L[1]); tile((vw + gap) / 2, h1 + gap, (vw - gap) / 2, vh - h1 - gap, p.ph[2], L[2]); }
    } else if (p.vis === 'negoce') {
      const MATS = ['BOIS', 'MÉTAUX', 'CUIVRE', 'ISOLANTS', 'CLOISONS', 'FIXATIONS'];
      let gx, gy, gw, gh, cols;
      if (SQ) { const w1 = Math.round(vw * .44); tile(0, 0, w1, vh, 'filmeuse'); gx = w1 + gap; gy = 0; gw = vw - gx; gh = vh; cols = 2; }
      else { const h1 = Math.round(vh * .5); tile(0, 0, vw, h1, 'filmeuse'); gx = 0; gy = h1 + gap; gw = vw; gh = vh - gy; cols = PORT ? 3 : 2; }
      const rows = Math.ceil(6 / cols), cw = (gw - gap * (cols - 1)) / cols, ch = (gh - gap * (rows - 1)) / rows;
      G.mats = MATS.map((m, j) => {
        const el = h('div', 'mat', `<small>0${j + 1}</small><b>${m}</b>`, v);
        css(el, { left: gx + (j % cols) * (cw + gap) + 'px', top: gy + Math.floor(j / cols) * (ch + gap) + 'px', width: cw + 'px', height: ch + 'px' });
        return el;
      });
    } else if (p.vis === 'shop') {
      const ms = h('div', 'mstore', `<div class="mh"><b>BOUTIQUE EN LIGNE</b><div style="position:relative;color:#0c1a31">${svgI('cart', 26)}<div class="badge" style="right:-12px;top:-10px">1</div></div></div><div class="mgrid"></div>`, v);
      const mg = ms.querySelector('.mgrid');
      const items = [['ac7', 'Borne de recharge 7 kW'], ['ac22', 'Borne de recharge 22 kW'], ['batterie', 'Batterie lithium LiFePO4 12 V 100 Ah'], ['dcmurale', 'Borne rapide DC murale']];
      G.mcards = items.map(([k, n]) => h('div', 'mcard', `<div class="mi" style="background-image:${bgi(k)}"></div><div class="mt">${n}</div><div class="mb">COHESIF ENERGY</div><div class="madd">Ajouter au panier</div>`, mg));
      G.badge = ms.querySelector('.badge'); G.store = ms;
    } else if (p.vis === 'access') {
      G.svg = accessSVG(v, vw, vh);
    } else if (p.vis === 'sport') {
      G.svg = sportSVG(v, vw, vh);
    }
    return G;
  }

  function upd(t) {
    /* hub */
    const zoomIn = E.i3(P(t, 22.1, 22.75)), back = E.o3(P(t, 51.8, 52.5));
    let hs = 1, hop = 1, origin = [R.nodes[0].x, R.nodes[0].y];
    if (t < 30) { hs = lerp(1, 2.6, zoomIn); hop = (1 - E.io(P(t, 22.15, 22.75))) * E.o3(P(t, 19.2, 19.6)); }
    else { origin = [R.nodes[7].x, R.nodes[7].y]; hs = lerp(2.6, 1, back); hop = E.io(P(t, 51.8, 52.3)) * (1 - E.i2(P(t, 52.45, 52.85))); }
    css(R.root, { transformOrigin: `${origin[0]}px ${origin[1]}px`, transform: `scale(${hs.toFixed(4)})`, opacity: hop.toFixed(3), display: hop > 0 ? 'block' : 'none' });
    css(hubTitle, { opacity: hop.toFixed(3), display: hop > 0 ? 'block' : 'none' });
    if (hop > 0) {
      const lineA = t < 30 ? 19.35 : -10;
      ringLines(R, t, lineA, .06, 1.0);
      ringNodes(R, t, t < 30 ? 19.6 : -10, .08, i => t < 30 ? (i === 0 ? E.o3(P(t, 21.95, 22.2)) : 0) : 1);
      ringPulses(R, t, t < 30 ? 99 : 52.0, t < 30 ? 99 : 53.3);
      R.logo.style.opacity = (t < 30 ? E.o3(P(t, 19.3, 20.4)) : 1).toFixed(3);
      if (t < 30) rv(hubT2, t, 19.7, 22.3, { outD: .35 }); else rv(hubT2, t, 51.9, 52.85, { inD: .7, outD: .35 });
      hubTitle.firstChild.style.opacity = (t < 30 ? E.o3(P(t, 19.5, 20.2)) : E.o3(P(t, 51.8, 52.4)) * (1 - P(t, 52.45, 52.85))).toFixed(3);
    }
    /* panel */
    const pin = E.o3(P(t, 22.35, 23.0)), pout = E.io(P(t, 51.45, 51.85));
    const pop = pin * (1 - pout);
    css(panel, { opacity: pop.toFixed(3), display: pop > 0 ? 'block' : 'none', transform: `scale(${(lerp(1.05, 1, pin) * lerp(1, .94, pout)).toFixed(4)})`, filter: pout > .01 ? `blur(${(pout * 6).toFixed(2)}px)` : 'none' });
    if (pop <= 0) return;
    /* nav indicator */
    let a = 0; for (let i = 1; i < 8; i++) if (t >= WS(i) - .8) a = i;
    const k = E.io(P(t, WS(a) - .8, WS(a) - .35));
    const ra = rect(its[a]), rb = rect(its[Math.max(0, a - 1)]), rI = rect(items);
    const top = lerp(rb.top, ra.top, a ? k : 1) - rI.top, left = lerp(rb.left, ra.left, a ? k : 1) - rI.left;
    if (LAND) css(bar, { top: (top + 12) + 'px', height: (ra.height - 24) + 'px' });
    else css(bar, { left: (left + 14) + 'px', width: (ra.width - 28) + 'px' });
    its.forEach((el, i) => { const on = i === a ? (a ? k : 1) : (i === a - 1 ? 1 - k : 0); el.style.color = `rgba(243,245,249,${(.34 + .66 * on).toFixed(3)})`; });
    /* content */
    groups.forEach((G, i) => {
      const a0 = i === 0 ? 22.5 : WS(i) - .35, b0 = i === 7 ? 51.9 : WS(i + 1) - .4;
      if (t < a0 || t >= b0) { G.g.style.display = 'none'; return; }
      G.g.style.display = 'block';
      const o = { dout: .35, oy: 0, ox: 40, bo: 6 };
      fu(G.lc, t, a0, b0, { ...o, dy: 20, di: .6 });
      fu(G.num, t, a0 + .08, b0, { ...o, dy: 14 });
      rv(G.title, t, a0 + .1, b0, { inD: .8, outD: .35 });
      fu(G.chips, t, a0 + .22, b0, { ...o, dy: 16 });
      G.hair.style.transform = `scaleX(${E.io(P(t, a0 + .3, a0 + .9)).toFixed(3)})`; G.hair.style.transformOrigin = LAND ? '0 50%' : '50% 50%';
      G.hair.style.opacity = (1 - P(t, b0 - .35, b0)).toFixed(3);
      fu(G.line, t, a0 + .34, b0, { ...o, dy: 18 });
      fu(G.url, t, a0 + .5, b0, { ...o, dy: 12 });
      const vo = 1 - E.i2(P(t, b0 - .35, b0));
      css(G.v, { opacity: vo.toFixed(3), transform: `translateX(${(-30 * (1 - vo)).toFixed(1)}px)` });
      G.tiles.forEach((tl, j) => {
        const kk = E.o3(P(t, a0 + .05 + .12 * j, a0 + .75 + .12 * j));
        css(tl.el, { opacity: kk.toFixed(3), transform: `translateY(${((1 - kk) * 36).toFixed(1)}px)`, clipPath: `inset(${((1 - kk) * 30).toFixed(1)}% 0 0 0 round 16px)` });
        tl.im.style.transform = `scale(${lerp(tl.el.classList.contains('light') ? 1.04 : 1.14, 1, E.o3(P(t, a0, a0 + 4))).toFixed(4)})`;
      });
      if (G.mats) G.mats.forEach((m, j) => fu(m, t, a0 + .45 + .09 * j, b0, { dy: 18, di: .5, dout: .3, blur: false }));
      if (G.mcards) {
        G.mcards.forEach((m, j) => { const kk = E.o3(P(t, a0 + .25 + .1 * j, a0 + .85 + .1 * j)); css(m, { opacity: kk, transform: `translateY(${((1 - kk) * 24).toFixed(1)}px)` }); });
        const press = P(t, a0 + 1.55, a0 + 1.75); const btn = G.mcards[0].querySelector('.madd');
        btn.style.transform = `scale(${(1 - .06 * Math.sin(Math.PI * press)).toFixed(3)})`;
        btn.style.background = t > a0 + 1.65 ? '#1d6b47' : '';
        btn.textContent = t > a0 + 1.65 ? 'Ajouté au panier ✓' : 'Ajouter au panier';
        const bk = P(t, a0 + 1.8, a0 + 2.15); G.badge.style.transform = `scale(${bk <= 0 ? 0 : E.oB(bk).toFixed(3)})`;
        const sv = E.o3(P(t, a0, a0 + .7)); css(G.store, { opacity: sv, transform: `translateY(${((1 - sv) * 30).toFixed(1)}px)` });
      }
      if (G.svg) G.svg(t, a0, b0);
    });
  }
  /* mini store sounds */
  cue(WS(4) - .35 + 1.65, 'cart', .6); cue(WS(4) - .35 + 1.85, 'pop', .6);
}

function accessSVG(v, vw, vh) {
  const NS = 'http://www.w3.org/2000/svg';
  const box = h('div', 'tile', '', v); css(box, { left: 0, top: 0, width: vw + 'px', height: vh + 'px', background: 'linear-gradient(160deg,#0f1b31,#0a1222)' });
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', vw); svg.setAttribute('height', vh); box.appendChild(svg);
  const cx = vw / 2, cy = vh * (SQ ? .5 : .47);
  const R1 = Math.min(vw, vh) * (SQ ? .36 : .33);
  const groups = [['VENDEURS', -150], ['ACHETEURS', -30], ["APPORTEURS D'AFFAIRES", 90]];
  const els = [];
  const line = (x1, y1, x2, y2, col = 'rgba(198,163,94,.6)', w = 1.3) => { const l = document.createElementNS(NS, 'path'); l.setAttribute('d', `M${x1} ${y1} L${x2} ${y2}`); l.setAttribute('pathLength', 1); l.setAttribute('stroke', col); l.setAttribute('stroke-width', w); l.setAttribute('fill', 'none'); l.setAttribute('stroke-dasharray', '1 1'); svg.appendChild(l); return l; };
  const circ = (x, y, r, fill, stroke) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', r); c.setAttribute('fill', fill); if (stroke) { c.setAttribute('stroke', stroke); c.setAttribute('stroke-width', 1.5); } svg.appendChild(c); return c; };
  const sat = [];
  groups.forEach(([lab, deg], gi) => {
    const a = deg * Math.PI / 180, x = cx + Math.cos(a) * R1 * (SQ ? 1.5 : 1.05), y = cy + Math.sin(a) * R1;
    const l = line(cx, cy, x, y);
    for (let j = 0; j < 3; j++) {
      const b = a + (j - 1) * .62, rr = R1 * .42, sx = x + Math.cos(b) * rr, sy = y + Math.sin(b) * rr;
      const l2 = line(x, y, sx, sy, 'rgba(255,255,255,.25)', 1);
      const c2 = circ(sx, sy, 5, '#0a1222', 'rgba(255,255,255,.55)');
      sat.push({ l: l2, c: c2, gi });
    }
    const c = circ(x, y, 11, '#0a1222', '#c6a35e');
    const t = h('div', '', lab, box);
    const ly = y + (deg < 0 ? -48 : 26);
    css(t, { position: 'absolute', left: (x - 160) + 'px', width: '320px', top: ly + 'px', textAlign: 'center', fontFamily: 'Inter', fontWeight: 600, fontSize: (SQ ? 12 : 13) + 'px', letterSpacing: '.24em', color: '#f3f5f9' });
    els.push({ l, c, t });
  });
  const core = circ(cx, cy, 34, 'rgba(198,163,94,.12)', '#e0c690');
  const coreT = h('div', '', 'RÉSEAU<br>PRIVÉ', box);
  css(coreT, { position: 'absolute', left: (cx - 80) + 'px', width: '160px', top: (cy - 16) + 'px', textAlign: 'center', fontFamily: 'Inter', fontWeight: 700, fontSize: '11px', lineHeight: '16px', letterSpacing: '.2em', color: '#e0c690' });
  const badge = h('div', '', 'ADHÉSION SUR CANDIDATURE', box);
  if (SQ) badge.style.display = 'none';
  css(badge, { position: 'absolute', left: '50%', bottom: (SQ ? 18 : 30) + 'px', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontFamily: 'Inter', fontWeight: 600, fontSize: '13px', letterSpacing: '.26em', color: '#f3f5f9', border: '1px solid rgba(198,163,94,.6)', borderRadius: '30px', padding: '10px 20px' });
  return (t, a0, b0) => {
    const k0 = E.o3(P(t, a0, a0 + .6)); box.style.opacity = k0; box.style.transform = `translateY(${((1 - k0) * 30).toFixed(1)}px)`;
    core.setAttribute('r', (34 * E.oB(P(t, a0 + .2, a0 + .7))).toFixed(2)); coreT.style.opacity = E.o3(P(t, a0 + .4, a0 + .9));
    els.forEach((e, i) => {
      e.l.setAttribute('stroke-dashoffset', 1 - E.io(P(t, a0 + .4 + .15 * i, a0 + 1.0 + .15 * i)));
      e.c.setAttribute('r', (11 * E.oB(P(t, a0 + .8 + .15 * i, a0 + 1.2 + .15 * i))).toFixed(2));
      e.t.style.opacity = E.o3(P(t, a0 + .9 + .15 * i, a0 + 1.4 + .15 * i));
    });
    sat.forEach((s2, j) => { s2.l.setAttribute('stroke-dashoffset', 1 - E.io(P(t, a0 + 1.1 + .05 * j, a0 + 1.6 + .05 * j))); s2.c.setAttribute('opacity', E.o3(P(t, a0 + 1.4 + .05 * j, a0 + 1.8 + .05 * j))); });
    badge.style.opacity = E.o3(P(t, a0 + 1.6, a0 + 2.1));
  };
}

function sportSVG(v, vw, vh) {
  const NS = 'http://www.w3.org/2000/svg';
  const box = h('div', 'tile', '', v); css(box, { left: 0, top: 0, width: vw + 'px', height: vh + 'px', background: 'linear-gradient(160deg,#0f1b31,#0a1222)' });
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', vw); svg.setAttribute('height', vh); box.appendChild(svg);
  const m = 34, horiz = vw > vh;
  // pitch in local coords (length L along main axis, width Wd)
  const L = (horiz ? vw : vh) - 2 * m, Wd = (horiz ? vh : vw) - 2 * m;
  const map = (u, w) => horiz ? [m + u, m + w] : [m + w, m + u];
  const paths = [];
  const pth = (pts, close) => { const d = pts.map((p, i) => (i ? 'L' : 'M') + map(p[0], p[1]).join(' ')).join(' ') + (close ? ' Z' : ''); const e = document.createElementNS(NS, 'path'); e.setAttribute('d', d); e.setAttribute('pathLength', 1); e.setAttribute('fill', 'none'); e.setAttribute('stroke', 'rgba(243,245,249,.75)'); e.setAttribute('stroke-width', 1.6); e.setAttribute('stroke-dasharray', '1 1'); svg.appendChild(e); paths.push(e); return e; };
  pth([[0, 0], [L, 0], [L, Wd], [0, Wd]], true);
  pth([[L / 2, 0], [L / 2, Wd]]);
  const pb = L * .16, pw = Wd * .55, gb = L * .06, gw = Wd * .26;
  pth([[0, (Wd - pw) / 2], [pb, (Wd - pw) / 2], [pb, (Wd + pw) / 2], [0, (Wd + pw) / 2]]);
  pth([[L, (Wd - pw) / 2], [L - pb, (Wd - pw) / 2], [L - pb, (Wd + pw) / 2], [L, (Wd + pw) / 2]]);
  pth([[0, (Wd - gw) / 2], [gb, (Wd - gw) / 2], [gb, (Wd + gw) / 2], [0, (Wd + gw) / 2]]);
  pth([[L, (Wd - gw) / 2], [L - gb, (Wd - gw) / 2], [L - gb, (Wd + gw) / 2], [L, (Wd + gw) / 2]]);
  const cc = document.createElementNS(NS, 'circle'); const [ccx, ccy] = map(L / 2, Wd / 2);
  cc.setAttribute('cx', ccx); cc.setAttribute('cy', ccy); cc.setAttribute('r', Math.min(L, Wd) * .14); cc.setAttribute('pathLength', 1); cc.setAttribute('fill', 'none'); cc.setAttribute('stroke', 'rgba(243,245,249,.75)'); cc.setAttribute('stroke-width', 1.6); cc.setAttribute('stroke-dasharray', '1 1'); svg.appendChild(cc); paths.push(cc);
  // players and passing sequence
  const PL = [[.2, .5], [.36, .22], [.45, .7], [.58, .38], [.7, .78], [.82, .5]].map(([u, w]) => map(u * L, w * Wd));
  const pdots = PL.map(([x, y]) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 7); c.setAttribute('fill', '#f3f5f9'); svg.appendChild(c); return c; });
  const trail = document.createElementNS(NS, 'path'); trail.setAttribute('fill', 'none'); trail.setAttribute('stroke', 'rgba(224,198,144,.75)'); trail.setAttribute('stroke-width', 2); trail.setAttribute('stroke-dasharray', '6 7'); svg.appendChild(trail);
  const ball = document.createElementNS(NS, 'circle'); ball.setAttribute('r', 6.5); ball.setAttribute('fill', '#e0c690'); svg.appendChild(ball);
  const goal = map(L, Wd / 2);
  const route = [...PL, goal];
  return (t, a0, b0) => {
    const k0 = E.o3(P(t, a0, a0 + .6)); box.style.opacity = k0; box.style.transform = `translateY(${((1 - k0) * 30).toFixed(1)}px)`;
    paths.forEach((p, i) => p.setAttribute('stroke-dashoffset', 1 - E.io(P(t, a0 + .15 + .06 * i, a0 + .95 + .06 * i))));
    pdots.forEach((d, i) => d.setAttribute('opacity', E.o3(P(t, a0 + .7 + .06 * i, a0 + 1.0 + .06 * i))));
    const f = P(t, a0 + 1.0, b0 - .5) * (route.length - 1);
    const seg = Math.min(route.length - 2, Math.floor(f)), kk = E.io2(f - seg);
    const [x1, y1] = route[seg], [x2, y2] = route[seg + 1];
    const bx = lerp(x1, x2, kk), by = lerp(y1, y2, kk);
    ball.setAttribute('cx', bx.toFixed(1)); ball.setAttribute('cy', by.toFixed(1)); ball.setAttribute('opacity', E.o3(P(t, a0 + .9, a0 + 1.1)));
    let d = `M${route[0][0]} ${route[0][1]}`; for (let j = 1; j <= seg; j++) d += ` L${route[j][0]} ${route[j][1]}`; d += ` L${bx.toFixed(1)} ${by.toFixed(1)}`;
    trail.setAttribute('d', d); trail.setAttribute('opacity', E.o3(P(t, a0 + 1.0, a0 + 1.3)) * .9);
  };
}

/* =====================================================================
   SCENE 4 — LA BOUTIQUE (52.8 → 76.8)
   ===================================================================== */
const SH = 52.8, ST = k => SH + 3 * k;
{
  const s = scene(52.7, 77.05, upd);
  const STEPS = ['Arrivée sur la boutique', 'Navigation dans une catégorie', "Sélection d'un produit", 'Fiche produit', 'Ajout au panier', 'Ouverture du panier', 'Passage de commande', 'Confirmation'];
  const cap = h('div', 'shopCap', `<div class="eyebrow">LA BOUTIQUE EN LIGNE</div>`, s.root);
  const sline = h('div', 'stepLine', null, cap);
  const sls = STEPS.map((x, i) => h('div', 'sl', `<span>0${i + 1}</span>${x}`, sline));
  const prog = h('div', 'progress', STEPS.map(() => '<i><b></b></i>').join(''), cap);
  const pbars = [...prog.querySelectorAll('b')];

  const BR = pick([210, 190, 1500, 850], [50, 480, 980, 1160], [60, 150, 960, 900]);
  const br = h('div', 'browser', null, s.root);
  css(br, { left: BR[0] + 'px', top: BR[1] + 'px', width: BR[2] + 'px', height: BR[3] + 'px' });
  const chrome = h('div', 'chrome', `<div class="dots"><i></i><i></i><i></i></div>`, br);
  const url = h('div', 'url', svgI('lock', 15, '#8fd3a8', 2), chrome);
  const URLS = ['cohesifenergy.fr/boutique', 'cohesifenergy.fr/boutique-borne-recharge-7kw', 'cohesifcommerce.fr/commande', 'cohesifcommerce.fr/commande-confirmee'];
  const us = URLS.map(u => h('div', 'u', u, url));
  h('div', '', '', chrome).style.width = '70px';
  const vp = h('div', 'viewport', null, br);

  /* sticky header */
  const hdr = h('div', 'shdr', `<img class="slogo" src="${LOGO('energy')}"><nav><span>Bornes de recharge</span><span>Solaire et stockage</span><span>Batteries lithium</span><span>Contact</span></nav><div class="cart">${svgI('cart', 22, '#0c1a31')}<div class="badge">1</div></div>`, vp);
  const cartBtn = hdr.querySelector('.cart'), badge = hdr.querySelector('.badge');

  /* page A : boutique */
  const pA = h('div', 'page', null, vp); pA.style.top = '76px';
  const scr = h('div', 'scroll', null, pA);
  h('div', 'hero', `<small>BOUTIQUE COHESIF ENERGY</small><b>Bornes, batteries &amp; solaire</b>`, scr);
  const chipsEl = h('div', 'chips', null, scr);
  const CH = ['Tous les produits', 'Bornes de recharge', 'Solaire et stockage', 'Batteries lithium'];
  const chips = CH.map((c, i) => h('div', 'chip' + (i === 0 ? ' on' : ''), c, chipsEl));
  if (SQ) chips[3].style.display = 'none';
  const gw = h('div', '', null, scr); gw.style.position = 'relative';
  const PR = {
    ac7: ['Borne de recharge 7 kW', '499 € TTC'], ac22: ['Borne de recharge 22 kW', '599 € TTC'],
    panneau: ['Panneau solaire 640 W biface', 'Sur devis'], batterie: ['Batterie lithium LiFePO4 12 V 100 Ah', '279 € TTC'],
    onduleur: ['Onduleur hybride triphasé · 8 à 12 kW', 'Sur devis'], dcmurale: ['Borne rapide DC murale', 'dès 4 990 € TTC'],
    dcdouble: ['Borne rapide DC murale 60 kW · 2 points de charge', '8 990 € TTC'], dcpied: ['Borne rapide DC sur pied · 2 points de charge', 'dès 8 490 € TTC'],
    dcultra: ['Borne ultra-rapide DC · 120 à 240 kW', 'dès 14 990 € TTC'],
  };
  const card = (k, parent) => h('div', 'card', `<div class="ci" style="background-image:${bgi(k)}"></div><div class="cn">${PR[k][0]}</div><div class="cp">${PR[k][1]}<em>Voir ›</em></div><div class="view">Voir le produit</div><div class="ring"></div>`, parent);
  const gA = h('div', 'grid', null, gw), gB = h('div', 'grid', null, gw);
  css(gB, { position: 'absolute', left: 0, right: 0, top: 0 });
  const cA = ['ac7', 'ac22', 'panneau', 'batterie', 'onduleur', 'dcmurale'].map(k => card(k, gA));
  const cB = ['ac7', 'ac22', 'dcmurale', 'dcdouble', 'dcpied', 'dcultra'].map(k => card(k, gB));
  const target = cB[0];

  /* page B : fiche produit */
  const pB = h('div', 'page', null, vp); pB.style.top = '76px';
  const pp = h('div', 'pp', null, pB); pp.style.top = '0';
  h('div', 'crumb', 'Boutique › Bornes de recharge › Borne de recharge 7 kW', pp);
  const ppimg = h('div', 'ppimg', `<div class="im" style="background-image:${bgi('ac7')}"></div>`, pp);
  const info = h('div', 'ppinfo', `<span class="pbadge">Meilleure vente</span><div class="ppname">Borne de recharge 7 kW</div><div class="ppacc">La borne murale pour recharger chez vous, jusqu'à 7× plus vite qu'une prise classique.</div>`, pp);
  const vars = h('div', 'vars', null, info);
  const v1 = h('div', 'var', `<div class="rd"><i></i></div><div><b>Borne seule</b><small>Livrée chez vous</small></div><span>499 €</span>`, vars);
  h('div', 'var', `<div class="rd"><i></i></div><div><b>Borne + pose IRVE</b><small>Mise en service incluse</small></div><span>1 190 €</span>`, vars);
  h('div', 'perks', `<div>${svgI('truck', 18, '#0c1a31')}Livraison offerte en France métropolitaine</div><div>${svgI('clock', 18, '#0c1a31')}Expédiée sous 7 à 12 jours ouvrés</div><div>${svgI('shield', 18, '#0c1a31')}Garantie 2 ans</div>`, info);
  const addBtn = h('div', 'btn', `${svgI('cart', 20, '#fff')}Ajouter au panier<div class="ok">✓ Ajouté au panier</div>`, info);
  const addOk = addBtn.querySelector('.ok');
  if (PORT) css(ppimg, { marginTop: '18px' });

  /* drawer */
  const dim = h('div', 'dim', null, vp);
  const drawer = h('div', 'drawer', `<div style="display:flex;justify-content:space-between;align-items:center"><h4>Votre panier (1)</h4>${svgI('x', 22, '#5d6779')}</div>
    <div class="ditem"><div class="th" style="background-image:${bgi('ac7')}"></div><div><b>Borne de recharge 7 kW</b><small>Borne seule</small><div class="q"><i>−</i><i>1</i><i>+</i></div></div><div style="margin-left:auto;font-weight:700">499 €</div></div>
    <div class="dtot2"><span>Livraison</span><span>Offerte</span></div>
    <div class="dtot"><span>Total TTC</span><span>499 €</span></div>`, vp);
  const orderBtn = h('div', 'btn', 'Commander', drawer);

  /* checkout */
  const ck = h('div', 'ck', null, vp); ck.style.zIndex = 8;
  h('div', 'ckh', `<img class="cl" src="${LOGO('commerce')}"><div class="t"><b>COHESIF COMMERCE</b><small>Société du Groupe Cohesif</small></div><div class="sec">${svgI('lock', 16, '#1d6b47', 2)}Paiement 100 % sécurisé</div>`, ck);
  const stepper = h('div', 'stepper', `<div class="s done"><i>✓</i>Récapitulatif</div><div class="sep"></div><div class="s on"><i>2</i>Livraison et paiement</div><div class="sep"></div><div class="s"><i>3</i>Confirmation</div>`, ck);
  const sts = stepper.querySelectorAll('.s');
  const ckb = h('div', 'ckbody', null, ck);
  const form = h('div', 'box', `<h5>Adresse de livraison</h5>`, ckb);
  const FW = [.52, .7, .3, .46, .6];
  const fld = (lab, parent) => { const f = h('div', 'field', `<label>${lab}</label><div class="in"><i></i><div class="car"></div></div>`, parent); return f.querySelector('.in'); };
  const fins = [fld('Nom complet', form), fld('Adresse', form)];
  const r2 = h('div', 'row2', null, form); fins.push(fld('Code postal', r2), fld('Ville', r2)); fins.push(fld('E-mail', form));
  const sum = h('div', 'box', `<h5>Récapitulatif</h5><div class="sumi"><div class="th" style="background-image:${bgi('ac7')}"></div><div><b>Borne de recharge 7 kW</b><small>Borne seule · Quantité 1</small></div></div>
    <div class="sumrow"><span>Livraison</span><span>Offerte</span></div><div class="sumrow t"><span>Total TTC</span><span>499 €</span></div>`, ckb);
  const payBtn = h('div', 'btn', `${svgI('lock', 18, '#fff', 2)}Continuer vers le paiement sécurisé`, sum);
  payBtn.style.fontSize = SQ ? '13px' : '15px';
  h('div', 'pay', '<span>CB</span><span>VISA</span><span>MASTERCARD</span><span>AMEX</span><span>APPLE PAY</span><span>GOOGLE PAY</span>', sum);
  h('div', 'payNote', `${svgI('lock', 13, '#5d6779', 2)}Paiement chiffré, traité par Stripe`, sum);
  const conf = h('div', 'conf', `<svg width="110" height="110" viewBox="0 0 110 110"><circle cx="55" cy="55" r="50" fill="none" stroke="#1d6b47" stroke-width="3" pathLength="1" stroke-dasharray="1 1"/><path d="M33 56 L49 71 L78 40" fill="none" stroke="#1d6b47" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1"/></svg><h3>Merci, votre commande est confirmée${NB}!</h3><p>Un reçu et votre facture vous ont été envoyés par e-mail.</p><div class="btn">Retour à la boutique</div>`, ck);
  const [cc, cpth] = conf.querySelectorAll('circle,path');
  const confT = [conf.querySelector('h3'), conf.querySelector('p'), conf.querySelector('.btn')];

  /* cues & cursor */
  cue(52.95, 'open'); cue(ST(1) + .05, 'page', .6); cue(61.0, 'page'); cue(63.05, 'tick', .7);
  cue(64.85, 'cart'); cue(65.78, 'pop'); cue(67.85, 'whoosh_ui'); cue(70.55, 'page');
  fins.forEach((_, i) => { for (let j = 0; j < 5; j++) cue(71.3 + .28 * i + j * .05, 'type', .35); });
  cue(73.85, 'page', .6); cue(74.3, 'confirm');
  STEPS.forEach((_, i) => i && cue(ST(i), 'tick', .35));
  curShow(54.4, 74.2);
  curMove(54.6, 55.5, () => ctr(chips[1]), () => [BR[0] + BR[2] * .82, BR[1] + BR[3] * .95]);
  curClick(55.75);
  curMove(57.0, 57.9, () => ctr(target, .5, .42));
  curMove(59.6, 60.35, () => ctr(target.querySelector('.view')));
  curClick(60.75);
  curMove(62.1, 62.8, () => ctr(v1, .3, .5));
  curClick(63.0, 'none');
  curMove(63.5, 64.4, () => ctr(addBtn, .55, .5));
  curClick(64.75);
  curMove(66.3, 67.3, () => ctr(cartBtn));
  curClick(67.75);
  curMove(68.9, 69.9, () => ctr(orderBtn, .55, .5));
  curClick(70.4);
  curMove(72.4, 73.2, () => ctr(payBtn, .6, .5));
  curClick(73.5);

  const fly = document.getElementById('fly'); fly.style.backgroundImage = bgi('ac7');

  function upd(t) {
    /* caption */
    const capOp = env(t, 52.85, 76.95, .6, .45);
    cap.style.opacity = capOp.toFixed(3);
    sls.forEach((el, i) => fu(el, t, i === 0 ? 53.2 : ST(i), i === 7 ? 76.9 : ST(i + 1), { dy: 18, di: .5, dout: .25, oy: -12, bi: 3, bo: 3 }));
    pbars.forEach((b, i) => { b.style.transform = `scaleX(${E.io(P(t, ST(i) + (i ? 0 : .4), ST(i + 1) - .1)).toFixed(3)})`; });
    /* browser */
    const bi = E.o3(P(t, 52.95, 53.7)), bo = E.i2(P(t, 76.35, 76.95));
    css(br, { opacity: (bi * (1 - bo)).toFixed(3), transform: `translateY(${((1 - bi) * 50).toFixed(1)}px) scale(${(lerp(.95, 1, bi) * lerp(1, .97, bo)).toFixed(4)})` });
    /* url */
    const ui = t < 61.0 ? 0 : t < 70.55 ? 1 : t < 73.85 ? 2 : 3;
    us.forEach((u, i) => { u.style.opacity = i === ui ? E.o3(P(t, [52.9, 61.0, 70.55, 73.85][i], [52.9, 61.0, 70.55, 73.85][i] + .3)).toFixed(3) : 0; });
    /* page A */
    const aIn = E.o3(P(t, 53.3, 53.9)), aOut = E.io(P(t, 61.0, 61.16));
    css(pA, { opacity: (aIn * (1 - aOut)).toFixed(3), transform: `translateX(${(-40 * aOut).toFixed(1)}px)`, display: aOut >= 1 ? 'none' : 'block' });
    css(hdr, { opacity: E.o3(P(t, 53.2, 53.7)).toFixed(3) });
    cA.forEach((c, i) => { const k = E.o3(P(t, 53.55 + .07 * i, 54.15 + .07 * i)); css(c, { opacity: k.toFixed(3), transform: `translateY(${((1 - k) * 26).toFixed(1)}px)` }); });
    const sw = E.io(P(t, 55.85, 56.35));
    chips[0].classList.toggle('on', t < 55.85); chips[1].classList.toggle('on', t >= 55.85);
    chips[1].style.transform = `scale(${(1 - .05 * Math.sin(Math.PI * P(t, 55.75, 55.95))).toFixed(3)})`;
    gA.style.opacity = (1 - sw).toFixed(3);
    gB.style.opacity = sw > 0 ? 1 : 0;
    cB.forEach((c, i) => { const k = E.o3(P(t, 55.95 + .06 * i, 56.5 + .06 * i)); css(c, { opacity: k.toFixed(3), transform: `translateY(${((1 - k) * 20).toFixed(1)}px)` }); });
    const scrollY = pick(170, 190, 180) * E.io(P(t, 56.5, 57.4));
    scr.style.transform = `translateY(${(-scrollY).toFixed(1)}px)`;
    const hov = E.o3(P(t, 57.85, 58.2)) * (1 - E.io(P(t, 61.0, 61.3)));
    target.style.transform = `translateY(${(-6 * hov).toFixed(2)}px)`;
    target.style.boxShadow = `0 ${(18 * hov).toFixed(1)}px ${(40 * hov).toFixed(1)}px rgba(12,26,49,${(.18 * hov).toFixed(3)})`;
    target.querySelector('.ring').style.opacity = (hov * .9).toFixed(3);
    const view = target.querySelector('.view');
    view.style.opacity = E.o3(P(t, 58.1, 58.45)).toFixed(3);
    view.style.transform = `scale(${(1 - .05 * Math.sin(Math.PI * P(t, 60.75, 60.95))).toFixed(3)})`;
    /* page B */
    const bIn = E.o3(P(t, 61.14, 61.5));
    css(pB, { opacity: bIn.toFixed(3), transform: `translateX(${(40 * (1 - bIn)).toFixed(1)}px)`, display: bIn > 0 ? 'block' : 'none' });
    ppimg.querySelector('.im').style.transform = `scale(${lerp(1.08, 1, E.o3(P(t, 61.1, 63.5))).toFixed(4)})`;
    const vsel = E.oB(P(t, 63.0, 63.3));
    v1.querySelector('.rd i').style.transform = `scale(${t < 63 ? 0 : vsel.toFixed(3)})`;
    v1.style.borderColor = t >= 63 ? '#0c1a31' : '';
    v1.style.transform = `scale(${(1 - .02 * Math.sin(Math.PI * P(t, 63.0, 63.2))).toFixed(4)})`;
    addBtn.style.transform = `scale(${(1 - .04 * Math.sin(Math.PI * P(t, 64.75, 64.95))).toFixed(3)})`;
    addOk.style.opacity = (E.o3(P(t, 64.9, 65.1)) * (1 - E.o3(P(t, 66.6, 67.0)))).toFixed(3);
    /* fly to cart */
    const fk = P(t, 65.0, 65.75);
    if (fk > 0 && fk < 1) {
      const [x0, y0] = ctr(ppimg), [x1, y1] = ctr(cartBtn);
      const k = E.io2(fk), x = lerp(x0, x1, k), y = lerp(y0, y1, k) - Math.sin(Math.PI * k) * 140, sc = lerp(1.6, .35, k);
      css(fly, { display: 'block', left: (x - 45) + 'px', top: (y - 45) + 'px', transform: `scale(${sc.toFixed(3)})`, opacity: (1 - E.i3(P(fk, .85, 1))).toFixed(3) });
    } else fly.style.display = 'none';
    const bk = P(t, 65.75, 66.1);
    badge.style.transform = `scale(${t < 65.75 ? 0 : E.oB(bk).toFixed(3)})`;
    cartBtn.style.transform = `scale(${(1 + .12 * Math.sin(Math.PI * P(t, 65.7, 66.0)) - .06 * Math.sin(Math.PI * P(t, 67.75, 67.95))).toFixed(3)})`;
    /* drawer */
    const dk = E.o3(P(t, 67.85, 68.4)), dOut = E.io(P(t, 70.55, 70.95));
    dim.style.opacity = (dk * (1 - dOut)).toFixed(3);
    drawer.style.transform = `translateX(${((1 - dk) * 105 + dOut * 0).toFixed(2)}%)`;
    drawer.style.display = dk > 0 ? 'block' : 'none';
    orderBtn.style.transform = `scale(${(1 - .04 * Math.sin(Math.PI * P(t, 70.4, 70.6))).toFixed(3)})`;
    /* checkout */
    const ckIn = E.o3(P(t, 70.6, 70.82));
    css(ck, { opacity: ckIn.toFixed(3), transform: `translateY(${((1 - ckIn) * 30).toFixed(1)}px)`, display: ckIn > 0 ? 'block' : 'none' });
    fins.forEach((f, i) => {
      const k = P(t, 71.3 + .28 * i, 71.55 + .28 * i);
      const bar = f.querySelector('i'), car = f.querySelector('.car');
      const wpx = (f.clientWidth - 28) * FW[i] * k;
      bar.style.width = wpx.toFixed(1) + 'px';
      const active = t >= 71.3 + .28 * i - .05 && t < 71.6 + .28 * i;
      car.style.left = (14 + wpx + 3).toFixed(1) + 'px'; car.style.opacity = active ? 1 : 0;
      f.style.borderColor = active ? '#0c1a31' : '';
    });
    payBtn.style.transform = `scale(${(1 - .04 * Math.sin(Math.PI * P(t, 73.5, 73.7))).toFixed(3)})`;
    const cf = E.o3(P(t, 73.85, 74.3));
    ckb.style.opacity = (1 - cf).toFixed(3); ckb.style.display = cf >= 1 ? 'none' : 'grid';
    conf.style.opacity = cf.toFixed(3); conf.style.display = cf > 0 ? 'block' : 'none';
    if (t >= 73.85) { sts[1].className = 's done'; sts[1].querySelector('i').textContent = '✓'; sts[2].className = 's on'; }
    else { sts[1].className = 's on'; sts[1].querySelector('i').textContent = '2'; sts[2].className = 's'; }
    cc.setAttribute('stroke-dashoffset', 1 - E.io(P(t, 74.05, 74.6)));
    cpth.setAttribute('stroke-dashoffset', 1 - E.o3(P(t, 74.45, 74.9)));
    confT.forEach((el, i) => fu(el, t, 74.5 + .15 * i, 99, { dy: 14, blur: false }));
  }
}

/* =====================================================================
   SCENE 5 — COMMENT ÇA SE PASSE ? (76.8 → 86.4)
   ===================================================================== */
{
  const s = scene(76.8, 86.6, upd);
  const ttl = h('div', 'procTitle', null, s.root);
  const eb = h('div', 'eyebrow', 'DE LA COMMANDE À LA LIVRAISON', ttl);
  const tt = RV(ttl, 'h2', `COMMENT ÇA SE PASSE${NB}?`); tt.o.style.marginTop = '14px';
  const STP = [['pointer', 'JE CHOISIS', "Je sélectionne le produit ou la solution dont j'ai besoin."],
    ['cart', 'JE COMMANDE', 'En ligne, ou en contactant le groupe pour un besoin spécifique.'],
    ['box', 'NOUS PRÉPARONS', 'La commande est prise en charge.'],
    ['truck', 'NOUS EXPÉDIONS', "Elle est préparée pour l'expédition et la livraison."],
    ['home', 'JE REÇOIS', 'Je reçois ma commande.']];
  const wrap = h('div', 'steps', null, s.root);
  const track = h('div', 'track', '<b></b>', s.root); const tfill = track.firstChild;
  const steps = STP.map(([ic, t1, d], i) => {
    const el = h('div', 'step', `<div class="ic"><div class="ringG"></div>${svgI(ic, 46, '#f3f5f9', 1.5, 'class="isv"')}</div><div class="n">0${i + 1}</div><div class="t">${t1}</div><div class="d">${d}</div>`, wrap);
    el.querySelectorAll('.isv path,.isv circle,.isv rect').forEach(p => { p.setAttribute('pathLength', 1); p.setAttribute('stroke-dasharray', '1 1'); });
    return { el, ic: el.querySelector('.ic'), ring: el.querySelector('.ringG'), paths: [...el.querySelectorAll('.isv path,.isv circle,.isv rect')], txt: [el.querySelector('.n'), el.querySelector('.t'), el.querySelector('.d')] };
  });
  const flow = h('div', 'flowLine', ['CHOISIR', 'COMMANDER', 'PRÉPARER', 'EXPÉDIER', 'RECEVOIR'].map((w, i) => (i ? '<em>→</em>' : '') + `<span>${w}</span>`).join(''), s.root);
  const fparts = [...flow.children];
  const SA = i => 77.6 + 1.45 * i;
  STP.forEach((_, i) => cue(SA(i), 'step', .8));
  cue(84.5, 'swell_short', .5);
  function upd(t) {
    const out = 1 - E.i2(P(t, 86.0, 86.55));
    s.root.style.opacity = out.toFixed(3);
    fu(eb, t, 76.95, 99, { dy: 10 });
    rv(tt, t, 77.05, 99);
    steps.forEach((S, i) => {
      const a = SA(i);
      const k = E.o3(P(t, a - .2, a + .45));
      css(S.el, { opacity: (.0 + k).toFixed(3), transform: `translateY(${((1 - k) * 24).toFixed(1)}px)` });
      S.paths.forEach(p => p.setAttribute('stroke-dashoffset', 1 - E.io(P(t, a - .1, a + .7))));
      const act = E.o3(P(t, a, a + .4));
      S.ring.style.opacity = act.toFixed(3);
      S.ic.style.boxShadow = `0 0 ${(40 * act).toFixed(1)}px rgba(198,163,94,${(.25 * act).toFixed(3)})`;
      S.ic.style.transform = `scale(${(1 + .06 * Math.sin(Math.PI * P(t, a, a + .35))).toFixed(3)})`;
    });
    /* track geometry between first and last icon */
    const r0 = rect(steps[0].ic), r4 = rect(steps[4].ic);
    if (LAND) {
      css(track, { left: (r0.right + 10) + 'px', width: (r4.left - r0.right - 20) + 'px', top: (r0.top + r0.height / 2) + 'px' });
      tfill.style.transform = `scaleX(${C((t - SA(0)) / (SA(4) - SA(0))).toFixed(4)})`;
    } else {
      css(track, { left: (r0.left + r0.width / 2) + 'px', top: (r0.bottom + 8) + 'px', height: (r4.top - r0.bottom - 16) + 'px' });
      tfill.style.transform = `scaleY(${C((t - SA(0)) / (SA(4) - SA(0))).toFixed(4)})`;
    }
    track.style.opacity = E.o3(P(t, 77.5, 78)).toFixed(3);
    fparts.forEach((p, i) => { const k = E.o3(P(t, 84.3 + .1 * i, 84.8 + .1 * i)); p.style.opacity = k.toFixed(3); p.style.display = 'inline-block'; p.style.transform = `translateY(${((1 - k) * 10).toFixed(1)}px)`; });
  }
}

/* =====================================================================
   SCENE 6 — PLUS QU'UNE BOUTIQUE (86.4 → 98.4)
   ===================================================================== */
const QS = [['UN CHANTIER', 'chantier', 'CHANTIER'], ["UN BESOIN D'APPROVISIONNEMENT", 'filmeuse', 'APPROVISIONNEMENT'], ['DU MATÉRIEL', 'minipelle', 'MATÉRIEL'],
  ['UNE SOLUTION ÉNERGÉTIQUE', 'parking', 'ÉNERGIE'], ['UN BESOIN EN TRANSPORT', 'flotte', 'TRANSPORT'], ['UN BESOIN PROFESSIONNEL', 'engin', 'PROFESSIONNEL']];
{
  const s = scene(86.4, 98.6, upd);
  const eb = h('div', 'eyebrow abs', "PLUS QU'UNE BOUTIQUE EN LIGNE", s.root); css(eb, { left: 0, right: 0, top: (CY - pick(100, 110, 100)) + 'px' });
  const q0 = RV(h('div', 'centerblock', null, s.root), 'h1', `VOUS AVEZ UN PROJET${NB}?`);
  const photos = QS.map(([, k]) => { const p = h('div', 'photo', `<div class="im" style="background-image:${bgi(k)}"></div><div class="tint"></div><div class="ov"></div>`, s.root); return { p, im: p.querySelector('.im') }; });
  const qs = QS.map(([q]) => RV(h('div', 'centerblock', null, s.root), 'h1', `${q}${NB}?`));
  const tiles = h('div', 'qTiles', null, s.root);
  const [cols, tw, th, gap] = pick([3, 440, 250, 30], [2, 440, 290, 26], [3, 300, 210, 20]);
  const rows = 6 / cols, gwid = cols * tw + (cols - 1) * gap, ghei = rows * th + (rows - 1) * gap;
  const tl = QS.map(([, k, lab], i) => {
    const el = h('div', 'qt', `<div class="im" style="background-image:${bgi(k)}"></div><div class="ov"></div><b>${lab}</b>`, tiles);
    const x = CX - gwid / 2 + (i % cols) * (tw + gap), y = CY - ghei / 2 + Math.floor(i / cols) * (th + gap);
    css(el, { left: x + 'px', top: y + 'px', width: tw + 'px', height: th + 'px' });
    if (SQ) el.querySelector('b').style.fontSize = '12px';
    return { el, x: x + tw / 2, y: y + th / 2 };
  });
  const QA = i => 88.8 + 1.2 * i;
  cue(86.7, 'whoosh_soft'); QS.forEach((_, i) => cue(QA(i), 'whoosh', .8));
  cue(96.0, 'whoosh_ui', .7); cue(97.3, 'reverse', .9);
  function upd(t) {
    fu(eb, t, 86.5, 88.75, { dy: 10, dout: .3 });
    rv(q0, t, 86.7, 88.8, { ls: [.22, .12], lsD: 2 });
    photos.forEach((ph, i) => {
      const a = QA(i), p = E.io(P(t, a - .05, a + .42));
      const end = i === 5 ? 96.3 : QA(i + 1) + .45;
      const show = t >= a - .05 && t < end;
      vis(ph.p, show);
      if (!show) return;
      const dir = i % 2 ? 1 : -1;
      ph.p.style.clipPath = dir > 0 ? `inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0)` : `inset(0 0 0 ${((1 - p) * 100).toFixed(2)}%)`;
      ph.p.style.opacity = i === 5 ? (1 - E.io(P(t, 95.9, 96.3))).toFixed(3) : 1;
      ph.im.style.transform = `scale(${lerp(1.15, 1.04, E.o3(P(t, a, a + 1.6))).toFixed(4)})`;
    });
    qs.forEach((r, i) => rv(r, t, QA(i) + .04, QA(i) + 1.2, { inD: .5, outD: .22 }));
    tl.forEach((T, i) => {
      const k = E.o3(P(t, 96.0 + .06 * i, 96.55 + .06 * i));
      const c = E.i3(P(t, 97.3 + .05 * i, 98.25 + .02 * i));
      const x = lerp(0, CX - T.x, c), y = lerp(0, CY - T.y, c);
      css(T.el, { display: k > 0 && c < 1 ? 'block' : 'none', opacity: (k * (1 - c * c)).toFixed(3), transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(lerp(.9, 1, k) * lerp(1, .12, c)).toFixed(4)})` });
    });
  }
}

/* =====================================================================
   SCENE 7 — L'ÉCOSYSTÈME (98.4 → 105.6)
   ===================================================================== */
{
  const s = scene(98.1, 105.9, upd);
  const G = pick({ cx: 960, cy: 440, rx: 620, ry: 270, r0: 150, logoW: 250, inward: true, ty: 905 }, { cx: 540, cy: 820, rx: 360, ry: 430, r0: 170, logoW: 290, inward: true, ty: 1440 }, { cx: 540, cy: 430, rx: 400, ry: 255, r0: 140, logoW: 220, inward: true, ty: 880 });
  const R = makeRing(s.root, G);
  const flash = h('div', 'abs', null, s.root);
  css(flash, { left: (G.cx - 400) + 'px', top: (G.cy - 400) + 'px', width: '800px', height: '800px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(240,220,180,.35),transparent)' });
  const mk = (txt, cls = 'h2') => { const b = h('div', 'abs', null, s.root); css(b, { left: '60px', right: '60px', top: (G.ty - 40) + 'px' }); return RV(b, cls, txt); };
  const t1 = mk('PLUSIEURS ACTIVITÉS.'), t2 = mk('UN SEUL GROUPE.'), t3 = mk('DES SOLUTIONS POUR VOS PROJETS.');
  t2.i.classList.add('gold');
  cue(98.4, 'impact');
  POLES.forEach((_, i) => cue(98.7 + .07 * i, 'blip', .3));
  function upd(t) {
    s.root.style.opacity = (1 - E.i2(P(t, 105.1, 105.55))).toFixed(3);
    const lk = E.o3(P(t, 98.2, 98.7));
    css(R.logo, { opacity: lk.toFixed(3), transform: `translate(-50%,-50%) scale(${lerp(.86, 1, E.oB(P(t, 98.2, 98.8))).toFixed(4)})` });
    css(flash, { opacity: (Math.sin(Math.PI * P(t, 98.3, 99.2)) * .9).toFixed(3), transform: `scale(${lerp(.6, 1.3, P(t, 98.3, 99.2)).toFixed(3)})` });
    ringNodes(R, t, 98.7, .07, i => E.o3(P(t, 99.5 + .07 * i, 99.9 + .07 * i)));
    ringLines(R, t, 98.95, .06, .8);
    ringPulses(R, t, 99.6, 105.6);
    rv(t1, t, 99.3, 101.45);
    rv(t2, t, 101.45, 103.45);
    rv(t3, t, 103.45, 105.55, { outD: .45 });
  }
}

/* =====================================================================
   SCENE 8 — CONFIANCE (105.6 → 115.2)
   ===================================================================== */
{
  const s = scene(105.55, 115.45, upd);
  const FR = pick([210, 100, 1500, 640], [60, 330, 960, 920], [60, 70, 960, 600]);
  const TY = pick(870, 1390, 820);
  const fr = h('div', 'cframe', null, s.root);
  css(fr, { left: FR[0] + 'px', top: FR[1] + 'px', width: FR[2] + 'px', height: FR[3] + 'px' });
  const PH = [['engin', 105.6], ['filmeuse', 108.0], ['flotte', 110.4], ['parking', 112.8]];
  const photos = PH.map(([k]) => { const p = h('div', 'photo', `<div class="im" style="background-image:${bgi(k)}"></div><div class="tint"></div><div class="ov"></div>`, fr); return { p, im: p.querySelector('.im') }; });
  const corners = [0, 1, 2, 3].map(i => {
    const c = h('div', 'corner', null, s.root);
    const L2 = i % 2 === 0, T = i < 2;
    css(c, { left: (L2 ? FR[0] - 14 : FR[0] + FR[2] - 12) + 'px', top: (T ? FR[1] - 14 : FR[1] + FR[3] - 12) + 'px', [T ? 'borderTopWidth' : 'borderBottomWidth']: '1.5px', [L2 ? 'borderLeftWidth' : 'borderRightWidth']: '1.5px' });
    return c;
  });
  const mk = txt => { const b = h('div', 'cText', null, s.root); b.style.top = (TY - 30) + 'px'; if (!LAND) css(b, { left: '50px', right: '50px' }); return RV(b, 'h3', txt); };
  const t1 = mk('UN PROJET NE SE RÉSUME PAS À UN PRODUIT.'), t2 = mk('NOUS IDENTIFIONS LE BESOIN.'), t3 = mk('NOUS VOUS ORIENTONS VERS LA SOLUTION ADAPTÉE.');
  cue(105.7, 'swell', .6);
  function upd(t) {
    const fi = E.o3(P(t, 105.6, 106.6)), fo = E.i2(P(t, 114.85, 115.4));
    css(fr, { opacity: (fi * (1 - fo)).toFixed(3), transform: `scale(${lerp(1.03, 1, fi).toFixed(4)})` });
    photos.forEach((ph, i) => {
      const a = PH[i][1];
      const op = i === 0 ? 1 : E.io(P(t, a - .4, a + .6));
      vis(ph.p, t >= a - .4 && t < (i < 3 ? PH[i + 1][1] + .7 : 999));
      ph.p.style.opacity = op.toFixed(3);
      const k = P(t, a - .4, a + 3.2);
      ph.im.style.transform = `scale(${lerp(1.1, 1.02, k).toFixed(4)}) translateX(${lerp(i % 2 ? -18 : 18, i % 2 ? 18 : -18, k).toFixed(1)}px)`;
    });
    corners.forEach((c, i) => { const k = E.o3(P(t, 106.0 + .08 * i, 106.6 + .08 * i)) * (1 - fo); c.style.opacity = k.toFixed(3); });
    rv(t1, t, 105.95, 109.0, { inD: 1.1, outD: .5 });
    rv(t2, t, 109.05, 112.0, { inD: 1.1, outD: .5 });
    rv(t3, t, 112.05, 115.15, { inD: 1.1, outD: .5 });
  }
}

/* =====================================================================
   SCENE 10 — FINAL (115.2 → 130)
   ===================================================================== */
const DURATION = 130;
{
  const s = scene(115.15, DURATION + 1, upd);
  const QQ = ['UN BESOIN', 'UN PROJET', 'UN CHANTIER', 'UNE COMMANDE'];
  const qs = QQ.map(q => { const b = h('div', 'centerblock', null, s.root); const e = h('div', 'h1', `${q}${NB}?`, b); e.style.fontSize = pick(92, 76, 74) + 'px'; return b; });
  const qhair = h('div', 'hair abs', null, s.root);
  const LG = pick({ y: 420, w: 560, ty: 700, y2: 250, w2: 300, cta: 520 }, { y: 760, w: 600, ty: 1070, y2: 560, w2: 360, cta: 850 }, { y: 380, w: 480, ty: 640, y2: 230, w2: 280, cta: 455 });
  const lw = h('div', 'abs', `<img src="${LOGO('groupe-white')}" style="width:100%"><div class="sheen"></div>`, s.root);
  css(lw, { left: CX + 'px', width: LG.w + 'px' });
  const sheen = lw.querySelector('.sheen');
  const flash = h('div', 'abs', null, s.root);
  css(flash, { left: (CX - 600) + 'px', top: (LG.y - 600) + 'px', width: '1200px', height: '1200px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(240,225,190,.32),transparent)' });
  const tg = h('div', 'abs', null, s.root); css(tg, { left: '60px', right: '60px', top: LG.ty + 'px' });
  const tg1 = RV(tg, 'h3', 'PLUSIEURS EXPERTISES.'), tg2 = RV(tg, 'h3', 'UNE SEULE DYNAMIQUE.');
  tg2.i.classList.add('gold');
  const cta = h('div', 'abs cta', null, s.root); css(cta, { left: '40px', right: '40px', top: LG.cta + 'px' });
  const ceb = h('div', 'eyebrow', 'DÉCOUVREZ NOS ACTIVITÉS', cta);
  const curl = RV(cta, 'url2', 'www.groupecohesif.fr'); curl.o.style.marginTop = '22px';
  const chair = h('div', 'hair', null, cta); css(chair, { width: '420px', marginTop: '18px' });
  const cmail = h('div', 'mail', 'contact@groupecohesif.fr', cta); cmail.style.marginTop = '24px';
  const row = h('div', 'poleRow', POLES.map(p => `<span>${p.short}</span>`).join(''), s.root);
  const rsp = [...row.children];
  [115.2, 115.8, 116.4, 117.0].forEach((a, i) => cue(a, 'hit', .8 + .07 * i));
  cue(117.6, 'impact'); cue(122.35, 'whoosh_soft', .7); cue(122.9, 'tick', .5);
  function upd(t) {
    qs.forEach((b, i) => {
      const a = 115.2 + .6 * i, k = P(t, a, a + .6);
      const show = t >= a && t < a + .6;
      vis(b, show); if (!show) return;
      const op = Math.min(E.o3(P(t, a, a + .12)), 1 - E.i2(P(t, a + .5, a + .6)));
      css(b, { opacity: op.toFixed(3), transform: `translateY(-50%) scale(${lerp(1.06, 1, E.o3(k)).toFixed(4)})` });
    });
    css(qhair, { left: CX - 150 + 'px', width: '300px', top: (CY + pick(80, 120, 80)) + 'px', opacity: env(t, 115.2, 117.55, .2, .15).toFixed(3), transform: `scaleX(${E.io(P(t, 115.2, 117.5)).toFixed(3)})` });
    /* logo */
    const li = E.o3(P(t, 117.6, 118.3));
    const mv = E.io(P(t, 122.3, 123.1));
    const w = lerp(LG.w, LG.w2, mv), y = lerp(LG.y, LG.y2, mv);
    const sc = lerp(1.12, 1, E.o3(P(t, 117.6, 119.5)));
    const bl = (1 - E.o3(P(t, 117.6, 118.2))) * 14;
    css(lw, { display: li > 0 ? 'block' : 'none', opacity: li.toFixed(3), width: w.toFixed(1) + 'px', top: y + 'px', transform: `translate(-50%,-50%) scale(${sc.toFixed(4)})`, filter: bl > .02 ? `blur(${bl.toFixed(2)}px)` : 'none' });
    css(sheen, { backgroundPosition: `${lerp(120, -20, E.io(P(t, 118.0, 119.6))).toFixed(2)}% 0`, opacity: env(t, 117.9, 119.7, .3, .4).toFixed(3) });
    css(flash, { opacity: (Math.sin(Math.PI * P(t, 117.55, 118.6)) * .95).toFixed(3), transform: `scale(${lerp(.5, 1.25, P(t, 117.55, 118.6)).toFixed(3)})` });
    rv(tg1, t, 118.4, 122.45, { inD: 1, outD: .4 });
    rv(tg2, t, 118.95, 122.45, { inD: 1, outD: .4 });
    fu(ceb, t, 122.85, 999, { dy: 12 });
    rv(curl, t, 123.05, 999, { inD: 1.1 });
    chair.style.transform = `scaleX(${E.io(P(t, 123.5, 124.4)).toFixed(3)})`;
    fu(cmail, t, 123.7, 999, { dy: 12 });
    rsp.forEach((sp, i) => { const k = E.o3(P(t, 124.2 + .07 * i, 124.8 + .07 * i)); sp.style.opacity = k.toFixed(3); });
    row.style.display = t > 124 ? 'flex' : 'none';
  }
}

/* ---------- render ---------- */
const FPS = 30;
function renderAt(t) {
  const frame = Math.round(t * FPS);
  bgUpdate(t, frame);
  if (t > 1.7) blackout.style.opacity = 0;
  for (const s of scenes) {
    const on = t >= s.a && t < s.b;
    s.root.style.display = on ? 'block' : 'none';
    if (on) s.upd(t);
  }
  curUpdate(t);
}
CUES.sort((a, b) => a.t - b.t);
window.DURATION = DURATION;
window.CUES = CUES.filter(c => c.type !== 'none');
window.renderAt = renderAt;
window.FORMAT = FMT;
const urls = new Set();
document.querySelectorAll('img').forEach(i => urls.add(i.src));
document.querySelectorAll('[style*="background-image"]').forEach(e => { const m = /url\(["']?([^"')]+)/.exec(e.style.backgroundImage); if (m) urls.add(m[1]); });
['groupe-white'].forEach(k => urls.add(LOGO(k)));
window.READY = Promise.all([document.fonts.ready, ...[...urls].map(u => new Promise(res => { const im = new Image(); im.onload = im.onerror = () => (im.decode ? im.decode().catch(() => 0) : Promise.resolve()).then(res); im.src = u; }))])
  .then(() => document.fonts.load('600 40px Mont')).then(() => document.fonts.load('500 20px Inter')).then(() => document.fonts.load('400 20px Inter')).then(() => document.fonts.load('700 20px Inter')).then(() => document.fonts.load('300 20px Mont')).then(() => document.fonts.load('500 20px Mont')).then(() => true);
const q = new URLSearchParams(location.search);
if (q.has('t')) window.READY.then(() => renderAt(+q.get('t')));
})();
