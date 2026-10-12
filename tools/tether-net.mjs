// Checks Tether Net's nets: four firefighters spread across the front wall
// hold one long chain of nets, so the first jumpers should bounce and be
// rescued on the right wall. Then a quick step towards the wall is a flick.
//
//   node tether-net.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const out = path.join(PROJECT, 'tools/out/tether-net');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 1920, height: 400 });
await page.addInitScript(() => {
	window.__pos = [-0.8, -0.3, 0.25, 0.85].map((X) => ({ X, Y: 0, Z: -0.6 }));
	setInterval(() => window.forceMessage && window.forceMessage(JSON.stringify(window.__pos.map((q) => Object.assign({}, q, { Z: q.Z === undefined ? q.Z : -q.Z }))) + '|'), 30);
});
await page.goto(`${srv.url}/index.html?tether-net`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(1000);
await page.evaluate(() => document.querySelector('button[count="4"]').click());
const state = () => page.evaluate(() => IGB.current.state());

let s;
let shot = false;
for (let i = 0; i < 400; i++) {
	s = await state();
	if (!shot && s.bounces > 0) {
		shot = true;
		await page.screenshot({ path: path.join(out, 'test-bounce.png'), timeout: 180000 });
	}
	if (s.saved > 0) break;
	await sleep(100);
}
console.log('nets', s.surfaces.map((x) => x.key + (x.burnt ? '(burnt)' : '')).join(' '));
console.log('bounces', s.bounces, 'saved', s.saved, 'oofs', s.oofs, 'scores', s.scores.join(','));
await sleep(300);
await page.screenshot({ path: path.join(out, 'test-saved.png'), timeout: 180000 });
const rescued = s.bounces > 0 && s.saved > 0;

// A flick: player 1 steps quickly from the back towards the wall.
await page.evaluate(() => { window.__pos[1].Z = 0.6; });
await sleep(600);
await page.evaluate(() => { window.__pos[1].Z = -0.8; });
let flicked = false;
for (let i = 0; i < 10 && !flicked; i++) {
	await sleep(40);
	flicked = (await state()).players[1].flick;
}
console.log('flick', flicked);

const ok = rescued && flicked;
const errors = problems.filter((p) => !/favicon|Failed to load resource/.test(p.text));
console.log(ok ? 'PASS: the net bounced a jumper to the rescue cushion, and a quick step flicked' : 'FAIL');
console.log('problems', JSON.stringify(errors));
await b.close();
srv.close();
process.exit(ok && !errors.length ? 0 : 1);
