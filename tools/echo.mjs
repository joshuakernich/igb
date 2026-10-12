// Checks Echo's core mechanic with three players:
//   1. Dodge: a full-width pulse shatters on echoes. A player who stood
//      still is sheltered by their own echo; one who kept moving is hit.
//   2. Beacon: a step towards the wall freezes that player's echo.
//   3. Collect: a spark dropped on an echo is collected by its owner.
//   4. Erase: tapping a player's echo on the right wall spends a charge
//      and blanks their front-wall echo.
//   5. Don't cross: a player who stands still is zapped by their own echo;
//      one who keeps running one way is not.
//
//   node echo.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const out = path.join(PROJECT, 'tools/out/echo');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 1920, height: 400 });
await page.addInitScript(() => {
	window.__pos = [-0.5, 0.0, 0.75].map((X) => ({ X, Y: 0, Z: 0 }));
	setInterval(() => window.forceMessage && window.forceMessage(JSON.stringify(window.__pos.map((q) => Object.assign({}, q, { Z: q.Z === undefined ? q.Z : -q.Z }))) + '|'), 30);
});
await page.goto(`${srv.url}/index.html?echo`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(1000);
await page.evaluate(() => document.querySelector('button[count="3"]').click());
const state = () => page.evaluate(() => IGB.current.state());
const shot = (name) => page.screenshot({ path: path.join(out, name), timeout: 180000 });
const results = {};

// Move player n's X smoothly from a to b over ms.
async function run(n, a, b, ms) {
	const steps = Math.round(ms / 50);
	for (let i = 0; i <= steps; i++) {
		await page.evaluate(([n, x]) => { window.__pos[n].X = x; }, [n, a + (b - a) * i / steps]);
		await sleep(50);
	}
}

/* ---------- 1. dodge ---------- */
await sleep(1500);
await page.evaluate(() => IGB.current.test.phase(0));
await sleep(2500); // everyone's echo settles under them
// Player 1 starts running; the full pulse drops while they're mid-run.
const running = run(1, -0.3, 0.45, 3200);
await sleep(300);
await page.evaluate(() => IGB.current.test.pulse());
let s;
for (let i = 0; i < 80; i++) {
	s = await state();
	if (s.pulses.length && s.pulses[0].cut && !results.cutShot) { results.cutShot = true; await shot('test-shelter.png'); }
	if (s.pulses.length && s.pulses[0].hit) break;
	await sleep(50);
}
await running;
console.log('dodge: hits', s.players.map((p) => p.hits).join(','), 'survived', s.players.map((p) => p.survived).join(','), 'blocked', s.pulsesBlocked);
results.dodge = s.players[0].hits === 0 && s.players[2].hits === 0 && s.players[1].hits === 1 && s.pulsesBlocked === 1;

/* ---------- 2. beacon ---------- */
await page.evaluate(() => { window.__pos[2].Z = 0.6; });
await sleep(300);
await page.evaluate(() => { window.__pos[2].Z = -0.9; });
await sleep(300);
s = await state();
const frozenAt = s.players[2].echoX;
console.log('beacon: frozen', s.players[2].frozen, 'ready', s.players[2].beaconReady);
await page.evaluate(() => { window.__pos[2].Z = 0; });
results.beacon = s.players[2].frozen && !s.players[2].beaconReady;
await shot('test-beacon.png');

/* ---------- 3. collect ---------- */
await page.evaluate(() => IGB.current.test.phase(1));
await sleep(2500);
// Player 0 runs right; drop a spark onto where their echo is, away from everyone.
const running2 = run(0, -0.8, -0.1, 2500);
await sleep(2200);
s = await state();
const ex = s.players[0].echoX;
await page.evaluate((x) => IGB.current.test.spark(x, 600), ex);
await sleep(700);
await running2;
s = await state();
console.log('collect: echo sparks', s.players.map((p) => p.echoSparks).join(','), 'sparks', s.players.map((p) => p.sparks).join(','));
results.collect = s.players[0].echoSparks === 1 && s.players[0].sparks >= 1;

/* ---------- 4. erase ---------- */
s = await state();
const tap = s.players[1].right;
await page.evaluate((t) => {
	const rect = document.querySelector('igb-world').getBoundingClientRect();
	const x = rect.left + t.x * IGB.scale;
	const y = rect.top + t.y * IGB.scale;
	document.elementFromPoint(x, y).dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
}, tap);
await sleep(200);
s = await state();
console.log('erase: charges', s.players.map((p) => p.erases).join(','), 'echo active', s.players.map((p) => p.echoActive).join(','));
results.erase = s.players[1].erases === 2 && !s.players[1].echoActive && s.players[0].erases === 3;
await shot('test-erase.png');

/* ---------- 5. don't cross ---------- */
await page.evaluate(() => { window.__pos[0].X = -0.6; window.__pos[2].X = 0.8; });
await page.evaluate(() => IGB.current.test.phase(2));
// Player 0 stands still; player 1 runs steadily right the whole time.
const running3 = run(1, -0.9, 0.7, 7000);
await sleep(3500); // the echoes sink onto the track; erasing wears off
const z0 = (await state()).players.map((p) => p.zaps);
await running3;
s = await state();
const dz = s.players.map((p, i) => p.zaps - z0[i]);
console.log('cross: echoY', Math.round(s.echoY), 'new zaps', dz.join(','), 'avoided', s.players.map((p) => p.avoided).join(','));
results.cross = s.echoY > 860 && dz[0] >= 1 && dz[1] === 0;
await shot('test-zap.png');

const ok = results.dodge && results.beacon && results.collect && results.erase && results.cross;
const errors = problems.filter((p) => !/favicon|Failed to load resource/.test(p.text));
console.log(JSON.stringify(results));
console.log(ok ? 'PASS: echoes shelter, beacons freeze, echoes collect, taps erase, and echoes zap' : 'FAIL');
console.log('problems', JSON.stringify(errors));
await b.close();
srv.close();
process.exit(ok && !errors.length ? 0 : 1);
