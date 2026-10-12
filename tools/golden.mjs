// Plays a whole show of Golden with four scripted performers, with the
// page's clock (and the music) running three times faster.
//
//   node golden.mjs
//
// Players 0-2 always walk to their own mark (stepping to the wall for star
// marks); player 3 joins in for the verse, then stands still at the back
// until the finale, so it should score far less. Player 0 chases the spotlight in the bridge, and player 1
// walks to a fan banner on a side wall and touches it. Checks: marks score
// on the beat, poses count, the stage goes all-on, solos and gifts score,
// the finale is golden, and the beat clock follows the music.
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const SPEED = 3;
const out = path.join(PROJECT, 'tools/out/golden');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 1920, height: 400 });

await page.addInitScript((speed) => {
	// The smoke tool's clock warp: timers, rAF, performance.now and media.
	const perfNow = performance.now.bind(performance);
	const p0 = perfNow();
	performance.now = () => p0 + (perfNow() - p0) * speed;
	const st = window.setTimeout;
	const si = window.setInterval;
	window.setTimeout = (fn, ms, ...a) => st(fn, (ms || 0) / speed, ...a);
	window.setInterval = (fn, ms, ...a) => si(fn, (ms || 0) / speed, ...a);
	const raf = window.requestAnimationFrame;
	window.requestAnimationFrame = (cb) => raf((t) => cb(p0 + (t - p0) * speed));
	const play = HTMLMediaElement.prototype.play;
	HTMLMediaElement.prototype.play = function () {
		this.playbackRate = speed;
		return play.call(this);
	};

	// The scripted performers, driven through the tracker's message path.
	window.__pos = [0, 1, 2, 3].map(() => ({ X: 0, Y: 0, Z: 0 }));
	window.__mode = { gift: null };
	window.__log = { clock: [] };
	si(function () {
		const g = window.IGB && IGB.current && IGB.current.state && IGB.current.state();
		if (g && g.formation) {
			const f = g.formation;
			for (let n = 0; n < 4; n++) {
				const m = f.marks[n];
				const lazy = n === 3 && f.hit >= 80 && !f.finale;
				if (lazy) { window.__pos[n] = { X: 0.9, Y: 0, Z: 0.8 }; continue; }
				window.__pos[n] = { X: m.px * 2 - 1, Y: 0, Z: m.pose ? -0.8 : 0 };
			}
		}
		if (g && g.spots.length) window.__pos[0] = { X: g.spots[0] * 2 - 1, Y: 0, Z: 0 };
		const gift = window.__mode.gift;
		if (gift) {
			// Stand at the side wall under the banner.
			const W = 1600;
			const fx = (gift.x - gift.wall * W) / W;
			window.__pos[1] = gift.wall === 0 ? { X: -1, Y: 0, Z: (1 - fx) * 2 - 1 } : { X: 1, Y: 0, Z: fx * 2 - 1 };
		}
		if (g && g.music && !g.music.paused) window.__log.clock.push([g.beat, g.music.t]);
		if (window.forceMessage) window.forceMessage(JSON.stringify(window.__pos.map((q) => Object.assign({}, q, { Z: q.Z === undefined ? q.Z : -q.Z }))) + '|');
	}, 15);
}, SPEED);

await page.goto(`${srv.url}/index.html?golden`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(1000);
await page.evaluate(() => document.querySelector('button[count="4"]').click());
const state = () => page.evaluate(() => IGB.current.state());
const shot = (name) => page.screenshot({ path: path.join(out, name), timeout: 180000 }).catch(() => {});

let s;
let giftTried = 0;
let caught = false;
const shots = { pose: false, bridge: false, rush: false, finale: false };
for (let i = 0; i < 2400; i++) {
	s = await state();
	if (s.over) break;
	// Touch a fan banner once player 1 is standing under it.
	if (!caught && s.gifts.length && s.beat > 90 && giftTried < 3 && s.section !== 'bridge') {
		const g = s.gifts[0];
		await page.evaluate((g) => { window.__mode.gift = g; }, g);
		await sleep(250);
		await page.evaluate((t) => {
			const rect = document.querySelector('igb-world').getBoundingClientRect();
			const x = rect.left + t.x * IGB.scale;
			const y = rect.top + t.y * IGB.scale;
			document.elementFromPoint(x, y).dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
		}, g);
		await sleep(100);
		const after = await state();
		caught = after.players[1].gifts > 0;
		giftTried++;
		if (caught) await shot('test-gift.png');
		await page.evaluate(() => { window.__mode.gift = null; });
	}
	if (!shots.pose && s.formation && s.formation.marks.some((m) => m.pose) && s.formation.hit - s.beat < 0.3 && s.formation.hit - s.beat > 0) { shots.pose = true; await sleep(120); await shot('test-pose.png'); }
	if (!shots.bridge && s.beat > 170 && s.spots.length) { shots.bridge = true; await shot('test-bridge.png'); }
	if (!shots.rush && s.beat > 290) { shots.rush = true; await shot('test-rush.png'); }
	if (!shots.finale && s.golden !== null) { shots.finale = true; await sleep(400); await shot('test-finale.png'); }
	await sleep(50);
}
const clock = await page.evaluate(() => window.__log.clock);
await sleep(2500);
await shot('test-scores.png');

// The beat clock should sit on the music's own time: beat = pass * 144 + (t - 0.13) * 2.
const drift = clock.map(([beat, t]) => {
	const inLoop = (t - 0.13) * 2;
	const d = ((beat - inLoop) % 144 + 144) % 144;
	return Math.min(d, 144 - d);
});
const maxDrift = Math.max(...drift);
const p = s.players;
console.log('beat', s.beat.toFixed(1), 'resolved', s.resolved, '/', s.total, 'all-on', s.allOnCount, 'golden', s.golden);
p.forEach((x, n) => console.log(`player ${n}: score ${x.score} marks ${x.marks} poses ${x.poses} solos ${x.solos} gifts ${x.gifts}`));
console.log('clock samples', clock.length, 'max drift from the music (beats)', maxDrift.toFixed(3));

const checks = {
	'show finished': s.over && s.resolved === s.total,
	'followers hit nearly every mark': [1, 2].every((n) => p[n].marks >= s.total * 0.85),
	'poses scored': p[2].poses >= 8,
	'still player scores less': p[3].score < p[2].score / 2 && p[3].marks < p[2].marks / 2,
	'stage went all-on': s.allOnCount >= 6,
	'spotlight solos': p[0].solos > 20 && p[2].solos < p[0].solos,
	'fan gift caught': caught && p[1].gifts > 0,
	'golden finale': s.golden === true,
	'clock locked to the music': clock.length > 100 && maxDrift < 0.3,
};
for (const [k, v] of Object.entries(checks)) console.log(v ? 'ok  ' : 'FAIL', k);
const ok = Object.values(checks).every(Boolean);
const errors = problems.filter((x) => !/favicon|Failed to load resource/.test(x.text));
console.log(ok ? 'PASS: performers on their marks scored on the beat, posed, soloed, caught a gift and went golden' : 'FAIL');
console.log('problems', JSON.stringify(errors));
await b.close();
srv.close();
process.exit(ok && !errors.length ? 0 : 1);
