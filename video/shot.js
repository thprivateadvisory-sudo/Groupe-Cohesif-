// Exporte visuel.html en PNG haute définition (2400×1254).
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 627 }, deviceScaleFactor: 2 });
  await p.goto('file://' + path.join(__dirname, 'visuel.html'));
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(__dirname, 'groupe-cohesif-linkedin-facebook.png') });
  await b.close();
})();
