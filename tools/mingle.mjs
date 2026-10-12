// Plays a round of Mingle: four players stand on the carousel, then split
// into groups of the called size at open doors. The first group taps its
// door to lock it; the rest wait for the doors to close. Anyone left over
// (when the number doesn't divide the squad) stays in the hall and is shot.
// Also checks the hiding: on the carousel nobody shows on any wall; at a
// door, everyone shows on that door's wall. (The show's intros are skipped.)
//
//   node mingle.mjs [rounds]
// Positions below are written with Z = -1 at the front wall; they are
// mirrored as they are sent, since tracking has Z = +1 at the front wall.
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const ROUNDS = parseInt(process.argv[2] || '2', 10);
const out = path.join(PROJECT, 'tools/out/mingle');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 1920, height: 400 });
await page.addInitScript(() => {
	// Everyone near the middle of the room, on the carousel.
	window.__pos = [{ X: -0.15, Y: 0, Z: 0 }, { X: 0.15, Y: 0, Z: 0 }, { X: 0, Y: 0, Z: -0.15 }, { X: 0, Y: 0, Z: 0.15 }];
	setInterval(() => window.forceMessage && window.forceMessage(JSON.stringify(window.__pos.map((q) => Object.assign({}, q, { Z: q.Z === undefined ? q.Z : -q.Z }))) + '|'), 30);
});
await page.goto(`${srv.url}/index.html#mingle`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(1000);
await page.evaluate(() => document.querySelector('button[count="4"]').click());
await sleep(300);
await page.evaluate(() => IGB.current.test.skipTo('play'));
const state = () => page.evaluate(() => IGB.current.state());
const waitFor = async (fn) => {
	for (let i = 0; i < 1200; i++) {
		const s = await state();
		if (fn(s)) return s;
		await sleep(100);
	}
	throw new Error('timed out');
};
const shot = (name) => page.screenshot({ path: path.join(out, name), timeout: 180000 });

let ok = true;
for (let r = 0; r < ROUNDS; r++) {
	await page.evaluate(() => {
		window.__pos = [{ X: -0.15, Y: 0, Z: 0 }, { X: 0.15, Y: 0, Z: 0 }, { X: 0, Y: 0, Z: -0.15 }, { X: 0, Y: 0, Z: 0.15 }];
	});
	await waitFor((s) => s.phase === 'spin' && s.round === r);
	await sleep(1500);
	if (r === 0) await shot('spin.png');
	let s = await state();
	const hiddenMiddle = s.contestants.every((c) => Math.max(...c.vis) < 0.05);
	console.log(`round ${r}: on the carousel, hidden on every wall:`, hiddenMiddle, JSON.stringify(s.contestants.map((c) => c.vis.map((v) => +v.toFixed(2)))));
	s = await waitFor((s) => s.phase === 'rush');
	const N = s.number;
	const open = s.doors.filter((d) => d.open && !d.barred);
	// groups of N at different doors, the remainder stays put
	const groups = [];
	for (let i = 0; i + N <= 4; i += N) groups.push([0, 1, 2, 3].slice(i, i + N));
	const leftover = [0, 1, 2, 3].slice(groups.length * N);
	await page.evaluate(({ groups, open }) => {
		groups.forEach(function (g, gi) {
			const spot = open[gi].spot;
			g.forEach(function (n, j) {
				window.__pos[n] = { X: 2 * spot.px - 1, Y: 0, Z: 2 * spot.pz - 1 };
				// spread them a little across the doorway
				const off = (j - (g.length - 1) / 2) * 0.06;
				if (open[gi].wall === 1) window.__pos[n].X += off; else window.__pos[n].Z += off;
			});
		});
	}, { groups, open });
	await sleep(900);
	s = await state();
	console.log(`round ${r}: groups of ${N}; doors`, JSON.stringify(s.doors.filter((d) => d.occupants.length).map((d) => [d.number, d.wall, d.occupants])));
	if (r === 0) await shot('rush.png');
	// everyone at a door shows on its wall
	const atDoor = s.doors.flatMap((d) => d.occupants.map((n) => ({ n, wall: d.wall })));
	const shownAtWall = atDoor.length === groups.flat().length && atDoor.every(({ n, wall }) => s.contestants[n].vis[wall] > 0.9);
	console.log('  at a door, shown on its wall:', shownAtWall, JSON.stringify(atDoor.map(({ n, wall }) => [n, wall, +s.contestants[n].vis[wall].toFixed(2)])));

	// The first group locks its door with a tap.
	const tap = open[0].tap;
	await page.evaluate((t) => {
		const rect = document.querySelector('igb-world').getBoundingClientRect();
		const x = rect.left + t.x * IGB.scale;
		const y = rect.top + t.y * IGB.scale;
		document.elementFromPoint(x, y).dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
	}, tap);
	await sleep(400);
	s = await state();
	const locked = s.doors.find((d) => d.number === open[0].number).locked;
	console.log('  tap to lock:', locked);
	if (r === 0) await shot('locked.png');

	s = await waitFor((s) => s.phase === 'verdict');
	await sleep(500);
	s = await state();
	if (r === 0) await shot('verdict.png');
	const saved = s.contestants.filter((c) => c.saved).map((c) => c.n);
	const dead = s.contestants.filter((c) => !c.alive).map((c) => c.n);
	const want = groups.flat();
	const pass = hiddenMiddle && shownAtWall && locked && JSON.stringify(saved) === JSON.stringify(want) && JSON.stringify(dead) === JSON.stringify(leftover);
	console.log(`  saved ${saved} (want ${want}), shot ${dead} (want ${leftover}):`, pass ? 'ok' : 'WRONG');
	ok = ok && pass;
}

const errors = problems.filter((p) => !/favicon|Failed to load resource/.test(p.text));
console.log('problems', JSON.stringify(errors));
console.log(ok && !errors.length ? 'PASS' : 'FAIL');
await b.close();
srv.close();
process.exit(ok && !errors.length ? 0 : 1);
