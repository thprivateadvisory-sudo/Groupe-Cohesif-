// usage: node render.js preview <only> <w> <h> t1,t2,...   |  node render.js full <out.mp4> [fps] [start] [end]
const { chromium } = require('playwright-core');
const { spawn } = require('child_process'); const fs = require('fs');
(async () => {
  const mode = process.argv[2];
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
  const page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text().slice(0, 300)); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  let W = 1920, H = 1080, only = '';
  if (mode === 'preview') { only = process.argv[3]; W = +process.argv[4]; H = +process.argv[5]; }
  await page.setViewportSize({ width: W, height: H });
  await page.goto(`http://localhost:8765/?w=${W}&h=${H}` + (only && only !== 'all' ? `&only=${only}` : ''));
  await page.waitForFunction('window.READY === true', null, { timeout: 300000 });
  const grab = async t => {
    const b64 = await page.evaluate(t => { window.renderFrame(t); return document.querySelector('canvas').toDataURL('image/jpeg', 0.95).split(',')[1]; }, t);
    return Buffer.from(b64, 'base64');
  };
  if (mode === 'preview') {
    const ts = process.argv[6].split(',').map(Number);
    fs.mkdirSync('prev', { recursive: true });
    for (const t of ts) { const t0 = Date.now(); fs.writeFileSync(`prev/${only}_${t.toFixed(2)}.jpg`, await grab(t)); console.log('t', t, Date.now() - t0, 'ms'); }
  } else {
    const out = process.argv[3], fps = +(process.argv[4] || 24), s = +(process.argv[5] || 0), e = +(process.argv[6] || 40);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n0 = Math.round(s * fps), n1 = Math.round(e * fps); const T0 = Date.now();
    for (let i = n0; i < n1; i++) {
      const buf = await grab(i / fps);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 24 === 0) console.log('frame', i, 'of', n1, ((Date.now() - T0) / 1000).toFixed(0) + 's');
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
