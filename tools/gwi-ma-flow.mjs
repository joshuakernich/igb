// Runs Gwi-Ma Showdown's whole show, start to finish, with the page's clock
// sped up: the squad picker, the title drop, the clock intro, the controls, Gwi-Ma's
// entrance, the rounds (one cleared on purpose, then the clock wound on to
// its last seconds), TIME!, the scores, the ranking, the team total, the
// leaderboard and the replay. Checks every beat is reached, in order, and
// the game completes. Screenshots of each beat go to
// tools/out/gwi-ma-showdown/flow-NN-<beat>.png.
//
//   node gwi-ma-flow.mjs [--speed=3]
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const speed = parseFloat((process.argv.find((a) => a.startsWith('--speed=')) || '--speed=3').slice(8));
const out = path.join(PROJECT, 'tools/out/gwi-ma-showdown');
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (/^flow-/.test(f)) fs.unlinkSync(path.join(out, f));

// Injected into the page: make its clock run `speed` times faster.
function warpTime(speed) {
	const realNow = Date.now.bind(Date);
	const t0 = realNow();
	const perfNow = performance.now.bind(performance);
	const p0 = perfNow();
	const RealDate = Date;
	const fastNow = () => t0 + (realNow() - t0) * speed;
	class FastDate extends RealDate {
		constructor(...a) { if (a.length) super(...a); else super(fastNow()); }
		static now() { return fastNow(); }
	}
	window.Date = FastDate;
	performance.now = () => p0 + (perfNow() - p0) * speed;
	const st = window.setTimeout;
	const si = window.setInterval;
	window.setTimeout = (fn, ms, ...a) => st(fn, (ms || 0) / speed, ...a);
	window.setInterval = (fn, ms, ...a) => si(fn, (ms || 0) / speed, ...a);
	const raf = window.requestAnimationFrame;
	window.requestAnimationFrame = (cb) => raf((t) => cb(p0 + (t - p0) * speed));
}

const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 1920, height: 400 });
await page.addInitScript(warpTime, speed);
await page.addInitScript(() => {
	// three players wandering the room, through the tracker's message path
	setInterval(function () {
		if (typeof window.forceMessage !== 'function') return;
		const t = Date.now() / 1000;
		const data = [0, 1, 2].map((i) => ({ X: 0.55 * Math.sin(t * 0.6 + i * 2.1), Y: 0, Z: 0.6 * Math.sin(t * 0.4 + i * 1.7) }));
		window.forceMessage(JSON.stringify(data) + '|');
	}, 40);
});
const logs = [];
page.on('console', (m) => logs.push(m.text()));
await page.goto(`${srv.url}/index.html#gwi-ma-showdown`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(1500);

let shot = 0;
const shots = [];
async function snap(name) {
	shot++;
	const file = path.join(out, `flow-${String(shot).padStart(2, '0')}-${name}.png`);
	await page.screenshot({ path: file, timeout: 180000 });
	shots.push(path.relative(PROJECT, file));
}
const state = () => page.evaluate(() => IGB.current && IGB.current.state());

await snap('squad');
await page.evaluate(() => document.querySelector('button[count="3"]').click());

// When to photograph each beat (seconds into it, show time).
const AT = {
	clock: [1.3, 3.5, 5.1],
	gwima: [2.4, 3.6, 4.4, 6.4, 7.6],
	timeup: [0.6, 2.4],
	scores: [3.6],
	rank: [2.8, 4.6, 7.4],
	team: [1.2, 2.6, 6.6],
	board: [1.6, 3.4, 8.5],
	replay: [6, 13],
	end: [1.2],
};
const taken = new Set();
const stepsShot = new Set();
let s;
let cleared = false;
let wound = false;
let playShots = 0;
const started = Date.now();
while (Date.now() - started < 400000) {
	s = await state().catch(() => null);
	if (!s) { await sleep(50); continue; }
	if (s.beat === 'end' && s.bt > 1.5) break;
	for (const at of AT[s.beat] || []) {
		const key = s.beat + at;
		if (s.bt >= at && !taken.has(key)) { taken.add(key); await snap(s.beat); }
	}
	if (s.beat === 'controls' && s.step && s.stepAge > 1.4 && !stepsShot.has(s.step)) {
		stepsShot.add(s.step);
		await snap('controls-' + s.step);
	}
	if (s.beat === 'play') {
		if (playShots === 0 && s.bt > 3) { playShots++; await snap('play'); }
		if (!cleared && s.bt > 4) {
			// clear round 1 on purpose: the burst and the ROUND 1 CLEAR banner
			cleared = true;
			await page.evaluate(() => { const g = IGB.current; g.test.hp(1); g.test.ball(g.state().boss.x, 300, 0, -700, 'slow', 1); });
		}
		if (cleared && s.boss.banished === 1 && playShots === 1) { playShots++; await sleep(500 / speed); await snap('play-clear'); }
		if (playShots === 2 && s.round === 2 && s.boss.rise > 0.5) { playShots++; await snap('play-round2'); }
		if (playShots === 3 && !wound) {
			wound = true;
			await sleep(3000 / speed);
			await snap('play-round2-fight');
			await page.evaluate(() => IGB.current.test.timeLeft(9));
			playShots++;
		}
		if (playShots === 4 && s.timeLeft < 5) { playShots++; await snap('play-countdown'); }
	}
	await sleep(40);
}

const EXPECT = ['squad', 'title', 'clock', 'controls', 'gwima', 'play', 'timeup', 'scores', 'rank', 'team', 'board', 'replay', 'end'];
const checks = {
	order: JSON.stringify(s && s.seen) === JSON.stringify(EXPECT),
	allSteps: stepsShot.size === 5,
	roundCleared: !!(s && s.marks.length >= 1),
	recorded: !!(s && s.samples > 10),
	completed: logs.some((l) => /Game complete/.test(l)),
};
console.log('seen', JSON.stringify(s && s.seen));
console.log(JSON.stringify(checks));
console.log('shots', shots.length, shots[0], '…', shots[shots.length - 1]);
const errors = problems.filter((p) => !/favicon|Failed to load resource/.test(p.text));
console.log('problems', JSON.stringify(errors));
const ok = Object.values(checks).every(Boolean) && !errors.length;
console.log(ok ? 'PASS' : 'FAIL');
await b.close();
srv.close();
process.exit(ok ? 0 : 1);
