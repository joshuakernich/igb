// Checks Lava Couch's group steering and balance with four riders:
//   - spread evenly, the couch stays level and cool;
//   - all shifted a little right, it steers right without dipping;
//   - a rock dead ahead bonks a balanced couch, but steering dodges one;
//   - everyone crammed on one end dips it, heats it up and flips it (a life);
//   - a cat on the cushions stays put under a rider, and slides when they leave;
//   - tapping a geyser on the left wall plugs it, so it never erupts;
//   - tapping treasure on the left wall reels it in to the couch;
//   - stepping forward together hops the rapids; staying back crunches them.
//
//   node lava-couch.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const out = path.join(PROJECT, 'tools/out/lava-couch');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 1920, height: 400 });
await page.addInitScript(() => {
	window.__pos = [-0.6, -0.2, 0.2, 0.6].map((X) => ({ X, Y: 0, Z: 0.3 }));
	setInterval(() => window.forceMessage && window.forceMessage(JSON.stringify(window.__pos.map((q) => Object.assign({}, q, { Z: q.Z === undefined ? q.Z : -q.Z }))) + '|'), 30);
});
await page.goto(`${srv.url}/index.html?lava-couch`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(1000);
await page.evaluate(() => document.querySelector('button[count="4"]').click());
const state = () => page.evaluate(() => IGB.current.state());
const setX = (xs) => page.evaluate((xs) => xs.forEach((X, i) => { window.__pos[i].X = X; }), xs);
const setZ = (z) => page.evaluate((z) => window.__pos.forEach((p) => { p.Z = z; }), z);
const spawn = (kind, ahead, side) => page.evaluate(([k, a, sd]) => IGB.current.spawn(k, a, sd), [kind, ahead, side]);
const shot = (name) => page.screenshot({ path: path.join(out, name), timeout: 180000 });
const waitFor = async (fn, ms = 15000) => {
	const t0 = Date.now();
	while (Date.now() - t0 < ms) {
		const s = await state();
		if (fn(s)) return s;
		await sleep(80);
	}
	return null;
};
const click = (pt) => page.evaluate((t) => {
	const rect = document.querySelector('igb-world').getBoundingClientRect();
	const x = rect.left + t.x * IGB.scale;
	const y = rect.top + t.y * IGB.scale;
	document.elementFromPoint(x, y).dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
}, pt);
const byId = (s, id) => s.items.find((it) => it.id === id) || null;
const results = {};
const check = (name, ok, info) => {
	results[name] = ok;
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`, info === undefined ? '' : JSON.stringify(info));
};
const BALANCED = [-0.6, -0.2, 0.2, 0.6];

await waitFor((s) => s.live, 20000);
await page.evaluate(() => IGB.current.calm(true));

// 1. Spread evenly: level, cool.
await sleep(1500);
let s = await state();
check('balanced: level and cool', Math.abs(s.tilt) < 1 && s.heat === 0 && !s.dipping, { tilt: s.tilt, heat: s.heat });

// 2. Everyone shifts a little right: it steers right, still not dipping.
let rel0 = s.camX - s.centre;
await setX(BALANCED.map((x) => x + 0.24));
await sleep(1200);
s = await state();
let rel1 = s.camX - s.centre;
check('shift right: steers right without dipping', rel1 - rel0 > 300 && !s.dipping && s.heat === 0 && s.tilt > 3, { moved: Math.round(rel1 - rel0), tilt: s.tilt, heat: s.heat });
await setX(BALANCED);
await sleep(1500);

// 3. A rock dead ahead bonks a balanced couch...
s = await state();
let bonks = s.stats.bonks;
await spawn('rock', 2500, 0);
s = await waitFor((s) => s.stats.bonks > bonks, 8000);
check('rock ahead, no steering: bonk', !!s, s && { heat: s.heat });
await sleep(1500);
// ...and steering dodges one.
s = await state();
bonks = s.stats.bonks;
const ri = await spawn('rock', 4500, 0);
await setX(BALANCED.map((x) => x - 0.3));
await waitFor((s) => byId(s, ri) && byId(s, ri).d < -300, 10000);
await setX(BALANCED);
s = await state();
check('rock ahead, steered round it: no bonk', s.stats.bonks === bonks, { bonks: s.stats.bonks, was: bonks });

// 4. Everyone on the right end: dips, heats, flips.
await setX([0.75, 0.8, 0.85, 0.9]);
let dip = await waitFor((s) => s.dipping && s.heat > 0.3, 4000);
if (dip) await shot('test-dip.png');
s = await waitFor((s) => s.stats.flips > 0, 6000);
check('crammed on one end: dips, heats and flips (a life)', !!dip && !!s && s.lives === 2, s && { lives: s.lives, flips: s.stats.flips });
await setX(BALANCED);
await waitFor((s) => !s.flipping, 6000);
await sleep(1500);

// 5. A cat stays put over a rider, and slides when they step away.
await setX([-0.4, 0.2, 0.3, 0.4]);
await sleep(300);
await spawn('cat', 0.3);
await sleep(2500);
s = await state();
const cat = s.cushions[0];
check('cat held under player 1', cat && Math.abs(cat.u - 0.3) < 0.02 && cat.holder === 0, cat);
await shot('test-cat.png');
await setX([0.1, 0.2, 0.3, 0.4]);
await sleep(1500);
s = await state();
const cat2 = s.cushions[0];
check('cat slides downhill once its rider leaves', !cat2 || cat2.u > 0.38 || cat2.falling, cat2);
await setX(BALANCED);
await page.evaluate(() => IGB.current.calm(true));
await sleep(1000);

// 6. Tap a geyser on the left wall: plugged, it never erupts.
const gi = await spawn('geyser', 9000, 300);
await sleep(1200);
s = await state();
let g = byId(s, gi);
console.log('geyser on wall', g.wall, 'at', g.left && g.left.x.toFixed(0), g.left && g.left.y.toFixed(0));
await click(g.left);
await sleep(200);
s = await state();
g = byId(s, gi);
check('tap geyser on the left wall: plugged', g.plugged && s.stats.plugs === 1, { plugged: g.plugged, scores: s.scores });
await shot('test-plug.png');
await waitFor((s) => byId(s, gi) && byId(s, gi).d < -200, 15000);
s = await state();
check('plugged geyser never erupts', !byId(s, gi).erupted, byId(s, gi));

// 7. Tap treasure on the left wall: it reels in to the couch.
const ti = await spawn('treasure', 9500, 1200);
await sleep(1200);
s = await state();
const team0 = s.team;
const collected0 = s.stats.collected;
await click(byId(s, ti).left);
await sleep(200);
s = await state();
check('tap treasure: reeling', byId(s, ti) && byId(s, ti).reel, byId(s, ti));
await sleep(2500);
await shot('test-reel.png');
s = await waitFor((s) => s.stats.collected > collected0, 15000);
check('reeled treasure reaches the couch', !!s && s.team > team0, s && { team: s.team, collected: s.stats.collected });

// 8. Rapids: step forward together to hop.
await spawn('ridge', 4500);
await waitFor((s) => s.rapids, 5000);
await sleep(600);
await shot('test-rapids.png');
await setZ(-0.7);
s = await waitFor((s) => s.stats.hops > 0, 8000);
if (s) await shot('test-hop.png');
check('everyone forward: the couch hops the rapids', !!s, s && { hops: s.stats.hops });
await setZ(0.4);
await sleep(1500);
s = await state();
const missed0 = s.stats.missedHops;
await spawn('ridge', 4000);
s = await waitFor((s) => s.stats.missedHops > missed0, 10000);
check('nobody forward: the rapids crunch', !!s && s.stats.hops === 1, s && { hops: s.stats.hops, missed: s.stats.missedHops });

s = await state();
console.log('team', s.team, 'scores', s.scores.join(','), 'lives', s.lives);
const errors = problems.filter((p) => !/favicon|Failed to load resource/.test(p.text));
const ok = Object.values(results).every(Boolean);
console.log('problems', JSON.stringify(errors));
console.log(ok && !errors.length ? 'PASS' : 'FAIL');
await b.close();
srv.close();
process.exit(ok && !errors.length ? 0 : 1);
