// Runs Loop Island's whole show, start to finish, with the page's clock sped
// up: the squad picker, the sting, the title drop, the clock intro, the visor
// check (everyone wiggling in the middle), the tutorial (3, 2, 1, GO!, then
// steer, run ahead, grab the rings), the hazards' entrance, the run (the
// clock wound on to its last seconds once it's going), TIME!, the scores,
// the ranking, the team total, the leaderboard, the replay, the rating and
// the end. Checks every beat is reached, in order, the tutorial's steps are
// done by the players, the run is recorded and the game completes, with no
// errors. Then, on a fresh page, that the SKIP button jumps from the
// tutorial to the hazards. No screenshots.
//
//   node loop-island-flow.mjs [--speed=3]
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const speed = parseFloat((process.argv.find((a) => a.startsWith('--speed=')) || '--speed=3').slice(8));

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

// Injected into the page: three players, through the tracker's message path.
// Wiggling in the middle of the room for the visor check; otherwise sweeping
// side to side and back and forth across the room (each out of step with the
// others). Tracking has Z = +1 at the front wall.
function players() {
	const pos = [0, 1, 2].map(() => ({ X: 0, Y: 0, Z: 0 }));
	const t0 = performance.now();
	setInterval(function () {
		if (typeof window.forceMessage !== 'function') return;
		const g = window.IGB && IGB.current && IGB.current.state && IGB.current.state();
		const t = (performance.now() - t0) / 1000;
		pos.forEach(function (p, i) {
			if (g && g.beat === 'visors') {
				p.X = 0.08 * Math.sin(t * 9 + i);
				p.Z = 0.08 * Math.cos(t * 7 + i);
			} else {
				p.X = 0.85 * Math.sin(t * 1.7 + i * 2.1);
				p.Z = 0.85 * Math.sin(t * 1.1 + i * 1.3);
			}
		});
		window.forceMessage(JSON.stringify(pos) + '|');
	}, 40);
}

const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 1920, height: 400 });
await page.addInitScript(warpTime, speed);
await page.addInitScript(players);
const logs = [];
page.on('console', (m) => logs.push(m.text()));
await page.goto(`${srv.url}/index.html#loop-island`, { timeout: 180000 });
await page.waitForSelector('button[count="3"]', { timeout: 180000 });
await sleep(500);
await page.evaluate(() => document.querySelector('button[count="3"]').click());

const state = () => page.evaluate(() => IGB.current && IGB.current.state());
const stepsDone = new Set();
let wound = false;
let s;
let maxRings = 0;
const started = Date.now();
while (Date.now() - started < 400000) {
	s = await state().catch(() => null);
	if (!s) { await sleep(50); continue; }
	if (process.env.TRACE) console.log(((Date.now() - started) / 1000).toFixed(1), s.beat, s.bt.toFixed(1), s.phase, s.step, s.stepDone, s.timeLeft.toFixed(0));
	if (s.beat === 'end' && s.bt > 1.5) break;
	if (s.beat === 'controls' && s.step !== null && s.stepDone) stepsDone.add(s.step);
	if (s.beat === 'play') maxRings = Math.max(maxRings, ...s.runners.map((r) => r.rings));
	// the run going for a while: on to its last seconds
	if (s.beat === 'play' && s.bt > 12 && !wound) { wound = true; await page.evaluate(() => IGB.current.test.timeLeft(6)); }
	await sleep(40);
}

const EXPECT = ['squad', 'sting', 'title', 'clock', 'visors', 'controls', 'hazards', 'play', 'timeup', 'scores', 'rank', 'team', 'board', 'replay', 'rate', 'end'];
const checks = {
	order: JSON.stringify(s && s.seen) === JSON.stringify(EXPECT),
	allSteps: [0, 1, 2].every((k) => stepsDone.has(k)),
	ringsInRun: maxRings > 0,
	recorded: !!(s && s.samples > 10),
	completed: logs.some((l) => /Game complete/.test(l)),
};
console.log('seen', JSON.stringify(s && s.seen));
console.log('steps done', [...stepsDone].join(' '), 'most rings in the run', maxRings);

// A fresh page: SKIP from the tutorial goes straight to the hazards.
const second = await openPage(b, { width: 1920, height: 400 });
await second.page.addInitScript(warpTime, speed);
await second.page.goto(`${srv.url}/index.html#loop-island`, { timeout: 180000 });
await second.page.waitForSelector('button[count="2"]', { timeout: 180000 });
await sleep(500);
await second.page.evaluate(() => document.querySelector('button[count="2"]').click());
await second.page.waitForFunction(() => IGB.current.state().beat === 'controls', null, { timeout: 180000, polling: 100 });
await second.page.evaluate(() => document.querySelector('button[skip]').click());
await sleep(300);
const skipped = await second.page.evaluate(() => IGB.current.state());
checks.skip = skipped.beat === 'hazards' && skipped.phase === 'run';
console.log('after SKIP', skipped.beat, skipped.phase);

console.log(JSON.stringify(checks));
const errors = problems.concat(second.problems).filter((p) => !/favicon|Failed to load resource/.test(p.text));
console.log('problems', JSON.stringify(errors));
const ok = Object.values(checks).every(Boolean) && !errors.length;
console.log(ok ? 'PASS' : 'FAIL');
await b.close();
srv.close();
process.exit(ok ? 0 : 1);
