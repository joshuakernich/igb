// Runs Red Light Green Light's whole show, start to finish, with the page's
// clock sped up: the squad picker, the title drop, the clock intro, the controls (the
// players steered through every step: moving, stepping, their practice
// circles, the practice red light and the corner skips), the doll's
// entrance, the rounds (round 1 played through to its banner and round 2's,
// then the clock wound on to its last seconds), TIME!, the scores, the
// ranking, the team total, the leaderboard and the replay. Checks every
// beat is reached, in order, that nobody is shot in practice, and the game
// completes. Screenshots of each beat go to
// tools/out/red-light-green-light/flow-NN-<beat>.png.
//
//   node rlgl-flow.mjs [--speed=3]
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const speed = parseFloat((process.argv.find((a) => a.startsWith('--speed=')) || '--speed=3').slice(8));
const out = path.join(PROJECT, 'tools/out/red-light-green-light');
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
	// Three players, through the tracker's message path: they wander, then
	// sway and step for those steps of the controls, head for their circles
	// when there are circles, and hold still on red light.
	const clip = (v) => Math.max(-0.8, Math.min(0.8, v));   // inside the page's debug simulator's clamp
	const pos = [0, 1, 2].map(() => ({ X: 0, Y: 0, Z: 0 }));
	setInterval(function () {
		if (typeof window.forceMessage !== 'function') return;
		const t = Date.now() / 1000;
		const g = window.IGB && IGB.current && IGB.current.state && IGB.current.state();
		const red = g && (g.phase === 'red' || g.phase === 'drill-red');
		// on the practice red light, player 0 sways a little (a lean) and 1 a lot (TOO MUCH!)
		if (g && g.phase === 'drill-red') {
			pos[0].X = clip(pos[0].X + 0.004 * Math.sin(t * 8));
			if (!window.__leant) { window.__leant = true; pos[1].X = clip(pos[1].X + (pos[1].X > 0 ? -0.3 : 0.3)); }
		}
		pos.forEach(function (p, i) {
			if (red) return;
			const c = g && g.contestants && g.contestants[i];
			const zone = c && g.zones && (g.zones.find((z) => z.id === c.zone) || g.zones.find((z) => z.for === i)
				|| g.zones.filter((z) => z.wall === c.wall && z.owner === null && z.for === null).sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0]);
			if (c && c.alive && !c.safe && zone && (g.phase === 'dash' || g.phase === 'warning' || g.phase === 'drill')) {
				p.X = clip(zone.px * 2 - 1);
				p.Z = clip(zone.pz * 2 - 1);
			} else {
				p.X = clip(0.55 * Math.sin(t * 0.9 + i * 2.1) + (i - 1) * 0.25);
				p.Z = clip(0.6 * Math.sin(t * 0.7 + i * 1.7));
			}
		});
		window.forceMessage(JSON.stringify(pos) + '|');
	}, 40);
});
const logs = [];
page.on('console', (m) => logs.push(m.text()));
await page.goto(`${srv.url}/index.html#red-light-green-light`, { timeout: 180000 });
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
	doll: [0.4, 2.2, 4.4, 5.8, 7.2, 8.9],
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
const stepsDone = new Set();
let practiceDeaths = 0;
let drills = 0;
let s;
let playShots = 0;
let wound = false;
let lastPhase = '';
const started = Date.now();
while (Date.now() - started < 400000) {
	s = await state().catch(() => null);
	if (!s) { await sleep(50); continue; }
	if (s.beat === 'end' && s.bt > 1.5) break;
	for (const at of AT[s.beat] || []) {
		const key = s.beat + at;
		if (s.bt >= at && !taken.has(key)) { taken.add(key); await snap(s.beat); }
	}
	if (s.beat === 'controls' || s.beat === 'doll') {
		if (s.contestants.some((c) => !c.alive)) practiceDeaths++;
	}
	if (s.beat === 'controls' && s.step) {
		if (s.stepDone) stepsDone.add(s.step);
		drills = Math.max(drills, Math.min(...s.contestants.map((c) => c.drill)));
		const at = s.step === 'freeze' ? 2.6 : s.step === 'corner' ? 0.9 : 1.6;
		if (s.stepAge > at && !stepsShot.has(s.step)) {
			stepsShot.add(s.step);
			await snap('controls-' + s.step);
		}
		if (s.step === 'corner' && !stepsShot.has('skip') && s.contestants.some((c) => c.hopping)) {
			stepsShot.add('skip');
			await sleep(150 / speed);
			await snap('controls-corner-skip');
		}
		if (s.step === 'corner' && !stepsShot.has('side') && s.contestants.some((c) => c.wall !== 1 && !c.hopping)) {
			stepsShot.add('side');
			await snap('controls-corner-side');
		}
	}
	if (s.beat === 'play') {
		if (playShots === 0 && s.bt > 2.5) { playShots++; await snap('play'); }
		if (playShots === 1 && s.phase === 'red' && lastPhase !== 'red') { playShots++; await sleep(600 / speed); await snap('play-red'); }
		if (playShots === 2 && s.phase === 'cleared') { playShots++; await sleep(700 / speed); await snap('play-cleared'); }
		if (playShots === 3 && s.phase === 'ready') { playShots++; await sleep(500 / speed); await snap('play-round2'); }
		if (playShots === 4 && s.phase === 'green' && !wound) {
			wound = true;
			await sleep(2500 / speed);
			await snap('play-round2-green');
			await page.evaluate(() => IGB.current.test.timeLeft(9));
			playShots++;
		}
		if (playShots === 5 && s.timeLeft < 5) { playShots++; await snap('play-countdown'); }
	}
	lastPhase = s.phase;
	await sleep(40);
}

const EXPECT = ['squad', 'title', 'clock', 'visors', 'controls', 'doll', 'play', 'timeup', 'scores', 'rank', 'team', 'board', 'replay', 'end'];
const checks = {
	order: JSON.stringify(s && s.seen) === JSON.stringify(EXPECT),
	allSteps: ['move', 'step', 'zone', 'freeze', 'corner'].every((k) => stepsShot.has(k)),
	stepsDone: stepsDone.size >= 4,
	cornerSkips: drills >= 2,
	noPracticeShots: practiceDeaths === 0,
	roundTwo: playShots >= 5,
	recorded: !!(s && s.samples > 10),
	completed: logs.some((l) => /Game complete/.test(l)),
};
console.log('seen', JSON.stringify(s && s.seen));
console.log('steps done', [...stepsDone].join(' '), 'corner skips each', drills, 'scores', JSON.stringify(s && s.contestants.map((c) => c.score)));
console.log(JSON.stringify(checks));
console.log('shots', shots.length, shots[0], '…', shots[shots.length - 1]);
const errors = problems.filter((p) => !/favicon|Failed to load resource/.test(p.text));
console.log('problems', JSON.stringify(errors));
const ok = Object.values(checks).every(Boolean) && !errors.length;
console.log(ok ? 'PASS' : 'FAIL');
await b.close();
srv.close();
process.exit(ok ? 0 : 1);
