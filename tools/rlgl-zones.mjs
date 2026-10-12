// Checks Red Light Green Light's safe zones and wall swaps: every green
// light lays exactly one zone per contestant still running, a zone holds
// only the first to step in, anyone outside a zone of their own at red
// light is shot, and an edge zone sends its holder skipping onto the
// adjacent wall at the next green light, where the avatar follows that
// wall's axis 1:1. Over a run, swaps keep happening, 30-50% of zones are
// edge zones, and a desk-simulator wall click moves a contestant there.
//
//   node rlgl-zones.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const out = path.join(PROJECT, 'tools/out/red-light-green-light');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 2400, height: 500 });
await page.addInitScript(() => {
	// Raw tracking (Z = +1 is the front wall), steered by window.__steer:
	// 'zone' heads for a zone on the player's wall, 'away' keeps clear of
	// every zone, a number stands in that zone, anything else holds still.
	window.__pos = [-0.6, -0.2, 0.2, 0.6].map((X) => ({ X, Y: 0, Z: 0 }));
	window.__steer = [];
	const W = 1600;
	const roomAt = (wall, u, near) => (wall === 0 ? { px: 1 - near, pz: u } : wall === 1 ? { px: u, pz: near } : { px: near, pz: 1 - u });
	// (kept inside +-0.8, where the page's own debug simulator clamps raw input between our messages)
	const clip = (v) => Math.max(-0.8, Math.min(0.8, v));
	const standAt = (i, p) => { window.__pos[i].X = clip(p.px * 2 - 1); window.__pos[i].Z = clip(p.pz * 2 - 1); };
	setInterval(() => {
		const g = window.IGB && IGB.current && IGB.current.state && IGB.current.state();
		if (g && g.zones && (g.phase === 'dash' || g.phase === 'warning')) {
			const taken = new Set(g.contestants.filter((c, i) => window.__steer[i] === 'zone' && c.zone).map((c) => c.zone));
			g.contestants.forEach(function (c, i) {
				const mode = window.__steer[i];
				if (!c.alive || c.safe) return;
				if (mode === 'zone') {
					const z = g.zones.find((z) => z.id === c.zone)
						|| g.zones.filter((z) => z.wall === c.wall && z.owner === null && !taken.has(z.id)).sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0];
					if (z) { taken.add(z.id); standAt(i, z); }
				} else if (typeof mode === 'number') {
					const z = g.zones.find((z) => z.id === mode);
					if (z) standAt(i, z);
				} else if (mode === 'away') {
					// the spot along the wall furthest from any zone there
					let best = 0.5;
					let bestD = -1;
					for (let u = 0.05; u < 0.96; u += 0.01) {
						const x = c.wall * W + u * W;
						const d = Math.min(...g.zones.filter((z) => z.wall === c.wall).map((z) => Math.abs(z.x - x)), 1e9);
						if (d > bestD) { bestD = d; best = u; }
					}
					standAt(i, roomAt(c.wall, best, 0.5));
				}
			});
		}
		window.forceMessage && window.forceMessage(JSON.stringify(window.__pos) + '|');
	}, 30);
});
await page.goto(`${srv.url}/index.html?red-light-green-light`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(1000);
await page.evaluate(() => document.querySelector('button[count="4"]').click());
// past the show's intros, straight into the rounds
await page.evaluate(() => IGB.current.test.skipTo('play'));
// (no block walls: this test steers players straight to their zones)
await page.evaluate(() => IGB.current.test.clearBlocks());
const state = () => page.evaluate(() => IGB.current.state());
const steer = (modes) => page.evaluate((m) => { window.__steer = m; }, modes);
const shot = (name) => page.screenshot({ path: path.join(out, name), timeout: 180000 });
const results = {};
const check = (name, ok, detail) => {
	results[name] = (results[name] ?? true) && ok;
	console.log(ok ? 'ok  ' : 'BAD ', name, detail || '');
};

// The first green light: zones for all four.
let s;
for (let i = 0; i < 600; i++) {
	s = await state();
	if (s.phase === 'dash' && s.zones.length) break;
	await sleep(100);
}
check('zone count = live players', s.zones.length === 4, `${s.zones.length} zones, walls ${s.zones.map((z) => z.wall).join(',')}, edges ${s.zones.filter((z) => z.edge).map((z) => z.target).join(',')}`);

// 0, 1 and 2 head for zones; 3 keeps out of them.
await steer(['zone', 'zone', 'zone', 'away']);
for (let i = 0; i < 30; i++) {
	s = await state();
	if (s.contestants[1].zone !== null) break;
	await sleep(50);
}
// 2 steps into 1's zone: it stays 1's.
const ones = s.contestants[1].zone;
await steer(['zone', 'zone', ones, 'away']);
await sleep(450);
s = await state();
const z1 = s.zones.find((z) => z.id === ones);
const c2 = s.contestants[2];
const inIt = Math.abs(c2.x - z1.x) < 105;
check('a zone holds only one', z1.owner === 1 && c2.zone !== ones && inIt, `zone ${ones} owner ${z1.owner}, contestant 2 holds ${c2.zone}, standing in it: ${inIt}`);
await steer(['zone', 'zone', 'zone', 'away']);
await sleep(700);
await shot('zones-front.png');

// Red light: 3 is shot, the rest survive.
for (let i = 0; i < 300; i++) {
	s = await state();
	if (s.phase === 'red') break;
	await sleep(50);
}
await sleep(900);
s = await state();
const alive = s.contestants.map((c) => c.alive);
check('in a zone survives, outside is shot', alive[0] && alive[1] && alive[2] && !alive[3], JSON.stringify(alive));
await shot('zones-red.png');

// Run on, everyone heading for zones, watching the swaps.
await steer(['zone', 'zone', 'zone', 'zone']);
let pending = null;        // { round, swaps: [[n, wall]] } marked at red light
let lastPhase = s.phase;
let swaps = 0;
let sideChecks = 0;
let sideBad = 0;
let countBad = 0;
let counts = 0;
let greenSeen = 0;
let gotSide = false;
let gotHop = false;
let gotFlag = false;
let lastPz = [];
const shares = [];
let shareBad = 0;
const visited = new Set();
const t0 = Date.now();
while (Date.now() - t0 < 150000) {
	s = await state();
	if (s.phase === 'red' && lastPhase !== 'red') {
		await sleep(500);
		s = await state();
		const marked = s.contestants.filter((c) => c.alive && c.swapTo !== null).map((c) => [c.n, c.swapTo]);
		pending = { round: s.round, swaps: marked };
		if (marked.length && !gotFlag) { gotFlag = true; await shot('zones-swap-flag.png'); }
	}
	if (s.phase === 'dash' && lastPhase !== 'dash') {
		greenSeen++;
		if (!gotHop && s.contestants.some((c) => c.hopping)) {
			await sleep(180);
			await shot('zones-skip.png');
			gotHop = true;
		}
		await sleep(650);
		s = await state();
		if (s.phase === 'dash' && s.zones.length) {
			const live = s.contestants.filter((c) => c.alive && !c.safe);
			counts++;
			const perWall = [0, 1, 2].map((w) => [live.filter((c) => c.wall === w).length, s.zones.filter((z) => z.wall === w).length]);
			if (s.zones.length !== live.length || perWall.some(([p, z]) => p !== z)) { countBad++; console.log('count mismatch', JSON.stringify(perWall)); }
			if (s.zones.length >= 2) {
				const share = s.zones.filter((z) => z.edge).length / s.zones.length;
				shares.push(share);
				// side walls lead only to the front; every edge zone sits within 12% of its corner
				const placed = s.zones.filter((z) => z.edge).every((z) => (z.wall === 1 ? z.target !== 1 : z.target === 1)
					&& Math.min(z.x - z.wall * 1600, (z.wall + 1) * 1600 - z.x) <= 0.12 * 1600
					&& (z.target < z.wall ? z.x - z.wall * 1600 : (z.wall + 1) * 1600 - z.x) <= 0.12 * 1600);
				if (share < 0.3 - 1e-9 || share > 0.5 + 1e-9 || !placed) { shareBad++; console.log('edge share off', share, JSON.stringify(s.zones.map((z) => [z.wall, Math.round(z.x), z.target]))); }
			}
		}
		if (pending && pending.round === s.round) {
			for (const [n, wall] of pending.swaps) {
				const c = s.contestants[n];
				if (!c.alive) continue;
				check('an edge zone sends its holder to the next wall', c.wall === wall, `contestant ${n} to wall ${wall}: now on ${c.wall}`);
				if (c.wall === wall) swaps++;
			}
		}
		pending = null;
	}
	// On a side wall the avatar sits 1:1 along it: pz along the left, 1 - pz along the right.
	const prevPz = lastPz;
	lastPz = s.contestants.map((c) => c.pz);
	for (const c of s.contestants) {
		if (!c.alive || c.hopping || c.glued || c.safe) continue;
		visited.add(`${c.n}:${c.wall}`);
		if (c.wall === 1) continue;
		// (the input can land between a frame and this sample, so its last value counts too)
		const wantAt = (pz) => c.wall * 1600 + Math.max(30, Math.min(1570, (c.wall === 0 ? pz : 1 - pz) * 1600));
		const want = wantAt(c.pz);
		const before = prevPz[c.n] === undefined ? c.pz : prevPz[c.n];
		sideChecks++;
		if (Math.abs(c.x - want) > 2 && Math.abs(c.x - wantAt(before)) > 2) { sideBad++; console.log('side axis off', c.n, c.wall, c.x, want, s.phase, c.zone, JSON.stringify(s.zones.filter((z) => z.wall === c.wall).map((z) => [z.id, Math.round(z.x), z.owner]))); }
		if (!gotSide && (s.phase === 'green' || s.phase === 'dash')) {
			gotSide = true;
			await shot('zones-side.png');
		}
	}
	lastPhase = s.phase;
	if (swaps >= 4 && sideChecks > 20 && gotHop && shares.length >= 5) break;
	await sleep(80);
}
// The desk simulator: clicking its right wall skips the selected player there.
for (let i = 0; i < 400; i++) {
	s = await state();
	if (s.phase === 'green' && s.contestants.some((c) => c.alive && !c.safe && c.wall !== 2 && !c.hopping)) break;
	await sleep(50);
}
const mover = s.contestants.find((c) => c.alive && !c.safe && c.wall !== 2 && !c.hopping);
if (mover) {
	await page.evaluate((n) => { IGB.players.list[n].wallChange = 2; }, mover.n);
	await sleep(150);
	const mid = (await state()).contestants[mover.n];
	await sleep(700);
	const after = (await state()).contestants[mover.n];
	check('a desk wall click moves the contestant there', after.wall === 2 && after.x >= 3200 && mid.hopping, `contestant ${mover.n} from wall ${mover.wall}: on ${after.wall} at x ${Math.round(after.x)}, skipped: ${mid.hopping}`);
} else {
	check('a desk wall click moves the contestant there', false, 'nobody to move');
}

check('zone count = live players, every green light', counts > 0 && countBad === 0, `${counts} green lights checked, ${countBad} wrong`);
check('30-50% of zones are edge zones, every green light', shares.length >= 3 && shareBad === 0, `${shares.map((x) => Math.round(x * 100) + '%').join(' ')}, ${shareBad} off`);
check('side wall avatar follows its axis', sideChecks > 0 && sideBad === 0, `${sideChecks} samples, ${sideBad} off`);
check('swaps happen over a run', swaps >= 3, `${swaps} swaps over ${greenSeen} green lights; visited ${[...visited].sort().join(' ')}`);

const real = problems.filter((p) => !/favicon|Failed to load resource/.test(p.text));
const ok = Object.values(results).every(Boolean) && Object.keys(results).length === 9 && !real.length;
console.log(ok ? 'PASS: zones fit the players, hold one each, save their holders, and edge zones swap walls' : 'FAIL');
console.log('problems', JSON.stringify(real));
await b.close();
srv.close();
process.exit(ok ? 0 : 1);
