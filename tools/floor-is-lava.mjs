// Checks Floor Is Lava's core loop with three players:
//   - player 0 rides a sound piece of furniture across the front wall and
//     survives surges (scoring), never burnt;
//   - player 1 stands in a gap between pieces and gets burnt by a surge;
//   - player 2 stands in a gap and jumps (a quick step towards the wall)
//     just as a surge hits, and is still safe in the air mid-surge;
//   - then the clock skips to the final minute: player 0 escapes by standing
//     at the far right of the front wall while the exit ledge is out, and
//     player 1 escapes by a touch on the exit door, second.
//
//   node floor-is-lava.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const out = path.join(PROJECT, 'tools/out/floor-is-lava');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 1920, height: 400 });

// The players are steered inside the page, so they keep up with the conveyor.
await page.addInitScript(() => {
	window.__pos = [0, 0, 0].map(() => ({ X: 0, Y: 0, Z: 0 }));
	window.__mode = ['ride', 'gap', 'gap'];
	window.__ride = null;
	const W = 1600;
	const toX = (x) => Math.max(-1, Math.min(1, ((x - W) / W) * 2 - 1));
	setInterval(function () {
		const g = window.IGB && IGB.current && IGB.current.state && IGB.current.state();
		if (g) {
			const solid = g.pieces.filter((p) => p.state === 'ok' || p.state === 'warn');
			// Ride: stay on the middle of one hazard-free piece; pick a new one when it nears the right.
			let ride = solid.find((p) => p.id === window.__ride);
			if (!ride || ride.x > 2 * W - 300) {
				ride = solid.filter((p) => !p.hazard && p.x > W + 300 && p.x < W + 900).sort((a, b) => b.w - a.w)[0];
				window.__ride = ride ? ride.id : null;
			}
			// A gap: the widest stretch of lava on the front wall's middle.
			const span = solid.map((p) => [p.left, p.right]).sort((a, b) => a[0] - b[0]);
			let gap = null;
			for (let i = 0; i < span.length - 1; i++) {
				const a = span[i][1];
				const c = span[i + 1][0];
				const mid = (a + c) / 2;
				if (c - a > 70 && mid > W + 200 && mid < 2 * W - 200 && (!gap || c - a > gap.w)) gap = { x: mid, w: c - a };
			}
			window.__gap = gap;
			window.__mode.forEach(function (m, n) {
				if (m === 'ride' && ride) window.__pos[n].X = toX(ride.x);
				if (m === 'gap' && gap) window.__pos[n].X = toX(gap.x + (n - 1.5) * 20);
			});
		}
		window.forceMessage && window.forceMessage(JSON.stringify(window.__pos.map((q) => Object.assign({}, q, { Z: q.Z === undefined ? q.Z : -q.Z }))) + '|');
	}, 30);
});
await page.goto(`${srv.url}/index.html?floor-is-lava`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(1000);
await page.evaluate(() => document.querySelector('button[count="3"]').click());
const state = () => page.evaluate(() => IGB.current.state());
const shot = (name) => page.screenshot({ path: path.join(out, name), timeout: 180000 });

// Two surges with players riding and wading.
let s;
let shotSurge = false;
for (let i = 0; i < 400; i++) {
	s = await state();
	if (s.surging && !shotSurge) { shotSurge = true; await sleep(250); await shot('test-surge.png'); }
	if (s.surges >= 2) break;
	await sleep(100);
}
const [p0, p1] = s.players;
console.log('surges', s.surges, 'rider', JSON.stringify(p0), 'wader', JSON.stringify(p1));
const rideOk = p0.survived >= 1 && p0.burns === 0 && p0.score >= 1;
const burnOk = p1.burns >= 1;

// A jump in a gap as a surge hits: in the air, so not burnt.
await page.evaluate(() => { window.__pos[2].Z = 0.6; });
let jumpOk = false;
for (let i = 0; i < 200 && !jumpOk; i++) {
	s = await state();
	const p2 = s.players[2];
	if (s.phase === 'live' && p2.state === 'play' && s.warning && s.nextSurge - s.t < 0.2) {
		await page.evaluate(() => { window.__pos[2].Z = -0.8; });
		for (let j = 0; j < 30; j++) {
			s = await state();
			const q = s.players[2];
			if (s.surging && q.airborne && q.state === 'play' && !q.on) { jumpOk = true; console.log('mid-surge jump over the lava', JSON.stringify(q)); await shot('test-jump.png'); break; }
			if (q.state === 'burnt') break;
			await sleep(30);
		}
		await page.evaluate(() => { window.__pos[2].Z = 0.6; });
	}
	await sleep(40);
}
console.log('jump', jumpOk);

// The final minute: the exit door opens.
await page.evaluate(() => { window.__mode = ['hold', 'hold', 'gap']; window.__pos[0].X = 0; window.__pos[1].X = 0.8; IGB.current.skipTo(181); });
await sleep(400);
s = await state();
console.log('exit', s.exit, 'door open', s.doorOpen);
// Player 0 steps to the far right, onto the ledge.
await page.evaluate(() => { window.__pos[0].X = 0.94; });
let esc0 = false;
for (let i = 0; i < 60 && !esc0; i++) {
	s = await state();
	esc0 = s.players[0].rank === 0;
	await sleep(100);
}
await shot('test-escape.png');
// Player 1 (px 0.9) touches the door.
let esc1 = false;
for (let i = 0; i < 60 && !esc1; i++) {
	s = await state();
	if (s.doorOpen && s.players[1].state === 'play') {
		await page.evaluate((d) => {
			const rect = document.querySelector('igb-world').getBoundingClientRect();
			const x = rect.left + d.x * IGB.scale;
			const y = rect.top + d.y * IGB.scale;
			document.elementFromPoint(x, y).dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
		}, s.door);
	}
	await sleep(150);
	s = await state();
	esc1 = s.players[1].rank === 1;
}
await sleep(1500);
await shot('test-escaped.png');
s = await state();
console.log('escapes', JSON.stringify(s.players.map((p) => [p.state, p.rank, p.score])));

const ok = rideOk && burnOk && jumpOk && esc0 && esc1;
const errors = problems.filter((p) => !/favicon|Failed to load resource/.test(p.text));
console.log('ride', rideOk, 'burn', burnOk, 'jump', jumpOk, 'ledge escape', esc0, 'door touch escape', esc1);
console.log(ok ? 'PASS: furniture saves you from a surge, lava burns, a jump clears it, and the exit lets players out in order' : 'FAIL');
console.log('problems', JSON.stringify(errors));
await b.close();
srv.close();
process.exit(ok && !errors.length ? 0 : 1);
