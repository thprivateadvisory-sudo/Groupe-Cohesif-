// usage: node render.js stills out_dir t1,t2,...
//        node render.js video out.mp4 fps [start end] [blend]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const [mode, out, a, b, c, d] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--disable-web-security', '--allow-file-access-from-files', '--force-color-profile=srgb', '--disable-gpu-vsync'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.log('[err]', e.message));
  await page.goto('file://' + path.resolve(__dirname, 'index.html'));
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  await page.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r }))));
  await page.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => 0))));

  if (mode === 'stills') {
    for (const t of a.split(',').map(Number)) {
      await page.evaluate(t => window.R(t), t);
      await page.screenshot({ path: `${out}/f_${t.toFixed(2)}.jpg`, type: 'jpeg', quality: 90 });
    }
  } else {
    const fps = Number(a), t0 = Number(b || 0), t1 = Number(c || 38), sub = Number(d || 1);
    const rfps = fps * sub;
    const n = Math.round((t1 - t0) * rfps);
    const vf = sub > 1 ? ['-vf', `tmix=frames=${sub},framestep=${sub}`] : [];
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(rfps), '-c:v', 'mjpeg', '-i', '-',
      ...vf, '-r', String(fps), '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const cdp = await page.context().newCDPSession(page);
    const st = Date.now();
    for (let i = 0; i < n; i++) {
      // subframe centred inside the output frame interval (shutter)
      const t = t0 + i / rfps;
      await page.evaluate(t => window.R(t), t);
      const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 96, optimizeForSpeed: false });
      const buf = Buffer.from(r.data, 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 200 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - st) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
