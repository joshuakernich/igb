// Small Talk's three walls as the virtual gamebox copies them (3072 x 640,
// left | front | right), at a chosen phase of the night and moment of its
// scene, for folding into slides. Saves tools/out/small-talk-strip.png.
//
//   node small-talk-strip.mjs [--phase=6] [--t=1.6]
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1];
const phase = Number(arg('phase', 6)), at = Number(arg('t', 1.6));
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 1060, height: 650 });
await page.goto(`${srv.url}/gamebox.html?game=small-talk&players=3&view=Outside&embed=1&size=1060x650`, { timeout: 120000 });
await page.waitForFunction(() => window.gamebox && window.gamebox.game && window.gamebox.beat === 'play', null, { timeout: 60000 });
await page.evaluate((n) => window.gamebox.game.test.party(n), phase);
await page.waitForFunction((t) => { const s = window.gamebox.game.state(); return s.phase === 'look' && s.sceneT >= t; }, at, { timeout: 120000, polling: 50 });
await page.evaluate(() => window.__pause && window.__pause(true));
await sleep(200);
const url = await page.evaluate(() => window.gamebox.strip.toDataURL('image/png'));
const out = path.join(PROJECT, 'tools/out/small-talk-strip.png');
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
console.log(out, await page.evaluate(() => { const s = window.gamebox.game.state(); return s.scene + ' ' + s.sceneT.toFixed(2); }));
console.log(problems.length ? problems.slice(0, 5) : 'no problems');
await b.close();
srv.close();
