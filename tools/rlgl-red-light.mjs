// Checks Red Light Green Light's freeze rule: on red light, a small drift
// bends a contestant without killing them; a big one gets them shot.
//
//   node rlgl-red-light.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const out = path.join(PROJECT, 'tools/out/red-light-green-light');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b);
await page.addInitScript(() => {
	// Three players, held still on red light until the test moves them.
	window.__pos = [{ X: -0.5, Y: 0, Z: 0 }, { X: 0, Y: 0, Z: 0 }, { X: 0.5, Y: 0, Z: 0 }];
	// Between red lights each player heads for a free safe zone on their
	// wall (or the one they hold), as players must; on red light they hold.
	const clip = (v) => Math.max(-0.8, Math.min(0.8, v));   // inside the page's debug simulator's clamp
	setInterval(() => {
		const g = window.IGB && IGB.current && IGB.current.state && IGB.current.state();
		if (g && g.zones && (g.phase === 'dash' || g.phase === 'warning')) {
			const taken = new Set(g.contestants.filter((c) => c.zone).map((c) => c.zone));
			g.contestants.forEach(function (c, i) {
				if (!c.alive || c.safe || !window.__pos[i]) return;
				const z = g.zones.find((z) => z.id === c.zone)
					|| g.zones.filter((z) => z.wall === c.wall && z.owner === null && !taken.has(z.id)).sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0];
				if (!z) return;
				taken.add(z.id);
				window.__pos[i].X = clip(z.px * 2 - 1);
				window.__pos[i].Z = clip(z.pz * 2 - 1);
			});
		}
		window.forceMessage && window.forceMessage(JSON.stringify(window.__pos) + '|');
	}, 30);
});
await page.goto(`${srv.url}/index.html?red-light-green-light`, { timeout: 180000 });
await sleep(800);
await page.evaluate(() => document.querySelector('button[count="3"]').click());
// past the show's intros, straight into the rounds
await page.evaluate(() => IGB.current.test.skipTo('play'));
// (no blocks: this test steers players straight to their zones)
await page.evaluate(() => IGB.current.test.clearBlocks());

const state = () => page.evaluate(() => IGB.current && IGB.current.state && IGB.current.state());
let s;
for (let i = 0; i < 600; i++) {
	s = await state();
	if (s && s.phase === 'red') break;
	await sleep(100);
}
console.log('reached', s.phase, 'round', s.round);
await sleep(400); // past the grace period

// Player 0 drifts a little (2.5% of the wall: under the limit), player 2 a lot (15%).
// (both toward the middle, clear of the simulator's clamp at the room's edges)
await page.evaluate(() => { const p = window.__pos; p[0].X += p[0].X > 0 ? -0.05 : 0.05; p[2].X += p[2].X > 0 ? -0.3 : 0.3; });
// Sample while red light lasts: the small drift should bend player 0.
let maxLean = 0;
for (let i = 0; i < 40; i++) {
	const now = await state();
	if (now.phase !== 'red') break;
	maxLean = Math.max(maxLean, now.contestants[0].lean);
	if (i === 1) await page.screenshot({ path: path.join(out, 'red-drift.png'), timeout: 180000 });
	await sleep(100);
}
await sleep(1200);
s = await state();
await page.screenshot({ path: path.join(out, 'red-after.png'), timeout: 180000 });
console.log(JSON.stringify(s.contestants.map((c) => ({ n: c.n, alive: c.alive }))), 'max lean of player 0:', maxLean.toFixed(2));
const [small, still, big] = s.contestants;
const ok = small.alive && maxLean > 0.2 && still.alive && !big.alive;
console.log(ok ? 'PASS: small drift bends, stillness survives, big drift is shot' : 'FAIL');
console.log('problems', JSON.stringify(problems));
await b.close();
srv.close();
process.exit(ok ? 0 : 1);
