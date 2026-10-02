#!/usr/bin/env node
/* Rendu image par image du film (src/index.html) avec Chromium headless.
   Usage :
     node tools/render.js --format land --out renders/video_16x9.mp4 [--workers 3] [--fps 30]
     node tools/render.js --format land --stills 2.5,10,30 --outdir previews
     node tools/render.js --format land --cues renders/cues.json      (exporte les repères audio)
*/
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => { if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return a; }, []));
const FORMATS = { land: [1920, 1080], port: [1080, 1920], sq: [1080, 1080] };
const fmt = args.format || 'land';
const [W, H] = FORMATS[fmt];
const FPS = +(args.fps || 30);
const ROOT = path.resolve(__dirname, '..', 'src');

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.evaluate(() => window.READY);
  return page;
}

(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const browser = await pw.chromium.launch({ args: ['--disable-web-security', '--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] });
  const first = await openPage(browser, port);
  const DUR = await first.evaluate(() => window.DURATION);

  if (args.cues) {
    const cues = await first.evaluate(() => window.CUES);
    fs.writeFileSync(args.cues, JSON.stringify({ duration: DUR, cues }, null, 1));
    console.log('cues', cues.length);
  } else if (args.stills) {
    const outdir = args.outdir || 'previews';
    fs.mkdirSync(outdir, { recursive: true });
    for (const ts of String(args.stills).split(',')) {
      const t = +ts;
      await first.evaluate(t => window.renderAt(t), t);
      await first.screenshot({ path: path.join(outdir, `${fmt}_${t.toFixed(2)}.png`) });
    }
    console.log('stills done');
  } else {
    const out = args.out || `renders/video_${fmt}.mp4`;
    const total = Math.round(DUR * FPS);
    const from = Math.round(+(args.from || 0) * FPS), to = args.to ? Math.round(+args.to * FPS) : total;
    const workers = +(args.workers || 3);
    const tmp = out + '.parts'; fs.mkdirSync(tmp, { recursive: true });
    const per = Math.ceil((to - from) / workers);
    const t0 = Date.now();
    let done = 0;
    const jobs = [];
    for (let w = 0; w < workers; w++) {
      const a = from + w * per, b = Math.min(to, a + per);
      if (a >= b) continue;
      jobs.push((async () => {
        const page = w === 0 ? first : await openPage(browser, port);
        const seg = path.join(tmp, `seg${w}.mp4`);
        const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
          '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-g', '60', '-bf', '3', seg], { stdio: ['pipe', 'inherit', 'inherit'] });
        for (let f = a; f < b; f++) {
          await page.evaluate(t => window.renderAt(t), f / FPS);
          const buf = await page.screenshot({ type: 'jpeg', quality: 96 });
          if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
          done++;
          if (done % 150 === 0) { const el = (Date.now() - t0) / 1000; console.log(`${fmt}: ${done}/${to - from} frames, ${el.toFixed(0)}s, eta ${(el / done * (to - from - done)).toFixed(0)}s`); }
        }
        ff.stdin.end();
        await new Promise(r => ff.on('close', r));
        return seg;
      })());
    }
    const segs = await Promise.all(jobs);
    fs.writeFileSync(path.join(tmp, 'list.txt'), segs.map(s => `file '${path.resolve(s)}'`).join('\n'));
    await new Promise(r => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', out], { stdio: 'inherit' }).on('close', r));
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log('video done', out, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  await browser.close();
  srv.close();
})().catch(e => { console.error(e); process.exit(1); });
