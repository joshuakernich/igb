// Checks Honmoon's barrier: one singer standing under a front-wall crack
// sings it closed, two singers on one crack seal it about twice as fast (and
// share the credit), a tap on a side-wall demon slashes it, a singer under a
// front-wall demon blasts it off, stepping up to the wall sounds the power
// note (a wider reach, draining stamina that refills standing back), and the
// finale seals the barrier golden when everyone stands on their mark.
//
//   node honmoon.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const out = path.join(PROJECT, 'tools/out/honmoon');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 1920, height: 400 });
await page.addInitScript(() => {
	window.__pos = [-0.95, 0.95, 0.95].map((X) => ({ X, Y: 0, Z: 0 }));
	setInterval(() => window.forceMessage && window.forceMessage(JSON.stringify(window.__pos.map((q) => Object.assign({}, q, { Z: q.Z === undefined ? q.Z : -q.Z }))) + '|'), 30);
});
await page.goto(`${srv.url}/index.html?honmoon`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(1000);
await page.evaluate(() => document.querySelector('button[count="3"]').click());

const state = () => page.evaluate(() => IGB.current.state());
const debug = (fn, ...a) => page.evaluate(([fn, a]) => IGB.current.debug[fn](...a), [fn, a]);
// Front-wall world x to tracking X (-1..1).
const X = (x) => (x - 1600) / 1600 * 2 - 1;
const move = (n, pos) => page.evaluate(([n, pos]) => Object.assign(window.__pos[n], pos), [n, pos]);
const waitFor = async (fn, ms = 20000) => {
	for (let i = 0; i < ms / 50; i++) {
		const s = await state();
		if (fn(s)) return s;
		await sleep(50);
	}
	throw new Error('timed out');
};
const shot = (name) => page.screenshot({ path: path.join(out, name), timeout: 180000 });
const checks = {};

await waitFor((s) => s.phase === 'live', 30000);
await debug('calm');
await debug('clear');
await sleep(300);

// One singer seals a crack.
let id = await debug('crack', 2000, 1);
let s0 = await state();
await move(0, { X: X(1990) });
let s = await waitFor((s) => !s.cracks.some((c) => c.id === id));
const solo = s.t - s0.t;
console.log('solo seal', solo.toFixed(2), 's; p0 sealed', s.players[0].sealed.toFixed(2));
checks.solo = solo > 1 && solo < 5 && s.players[0].sealed > 0.9;

// Two singers on one crack seal it about twice as fast, sharing the credit.
id = await debug('crack', 2800, 1);
await sleep(100);
s0 = await state();
await move(1, { X: X(2790) });
await move(2, { X: X(2810) });
await sleep(1000);
await shot('test-duet.png');
s = await waitFor((s) => !s.cracks.some((c) => c.id === id));
const duet = s.t - s0.t;
console.log('duet seal', duet.toFixed(2), 's; shares', s.players[1].sealed.toFixed(2), s.players[2].sealed.toFixed(2));
checks.duet = duet < solo * 0.7 && s.players[1].sealed > 0.3 && s.players[2].sealed > 0.3;

// A tap on a side-wall demon slashes it; the player nearest that wall gets it.
await move(1, { X: 0.95 });
await move(2, { X: 0.95 });
await debug('demon', 800);
await sleep(300);
s = await state();
const dm = s.demons[0];
await page.evaluate((t) => {
	const rect = document.querySelector('igb-world').getBoundingClientRect();
	const x = rect.left + t.x * IGB.scale;
	const y = rect.top + t.y * IGB.scale;
	document.elementFromPoint(x, y).dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
}, { x: dm.x, y: dm.y - 70 });
await sleep(150);
await shot('test-slash.png');
s = await state();
console.log('slashed', s.slashed, 'by p0', s.players[0].slashed);
checks.slash = s.slashed === 1 && s.players[0].slashed === 1;

// A singer under a front-wall demon blasts it off.
await sleep(800);
await debug('demon', 2400);
await move(0, { X: X(2400) });
s = await waitFor((s) => s.pushed > 0);
console.log('pushed', s.pushed, 'by p0', s.players[0].pushed);
checks.push = s.players[0].pushed === 1;
await sleep(200);
await shot('test-push.png');
await debug('clear');

// The power note: up at the wall the reach widens and stamina drains...
await move(1, { X: X(2600), Z: -0.9 });
await sleep(1500);
s = await state();
const p = s.players[1];
console.log('power', p.power, 'reach', p.reach, 'stamina', p.stamina.toFixed(2));
checks.power = p.power && p.reach > 200 && p.stamina < 0.9;
await shot('test-power.png');
// ...and standing back refills it.
await move(1, { Z: 0.9 });
await sleep(1500);
s = await state();
console.log('rested: power', s.players[1].power, 'stamina', s.players[1].stamina.toFixed(2));
checks.rest = !s.players[1].power && s.players[1].stamina > p.stamina;

// The finale: everyone on their mark seals the barrier golden.
await debug('finale');
s = await waitFor((s) => s.phase === 'finale');
for (let n = 0; n < 3; n++) await move(n, { X: X(s.marks[n].x), Z: 0 });
await sleep(1200);
await shot('test-lineup.png');
s = await waitFor((s) => s.phase === 'golden', 8000);
await sleep(1200);
await shot('test-golden.png');
s = await state();
console.log('golden', s.phase, 'flare', s.flare.toFixed(2), 'demons', s.demons.length, 'scores', s.scores.join(','));
checks.golden = s.phase === 'golden' && s.integrity === 100;

const ok = Object.values(checks).every(Boolean);
const errors = problems.filter((p) => !/favicon|Failed to load resource/.test(p.text));
console.log('checks', JSON.stringify(checks));
console.log(ok ? 'PASS: singing seals (twice as fast together), taps slash, singers push demons off, the power note works, and the line seals it golden' : 'FAIL');
console.log('problems', JSON.stringify(errors));
await b.close();
srv.close();
process.exit(ok && !errors.length ? 0 : 1);
