// Runs Mingle's whole show, start to finish, with the page's clock sped up:
// the squad picker, the title drop, the clock intro, the controls (onto the
// carousel, out to a wall to see yourself, into a practice room, tap to
// lock it), the host's hall, the rounds (one cleared, one where everyone
// stays out on the carousel and is shot, so it's played again, then the
// clock wound on to its last seconds), TIME!, the scores, the ranking, the
// team total, the leaderboard and the replay. Checks every beat is reached,
// in order, every controls step is done by the players, the hall shows
// behind the intros and is hidden under the results, a wiped-out round is
// replayed, and the game completes. Then, on a fresh page, that the SKIP
// button jumps from the intros into round 1. Screenshots of each beat go to
// tools/out/mingle/flow-NN-<beat>.png.
//
//   node mingle-flow.mjs [--speed=2]
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const speed = parseFloat((process.argv.find((a) => a.startsWith('--speed=')) || '--speed=2').slice(8));
const out = path.join(PROJECT, 'tools/out/mingle');
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

// Injected into the page: three players, through the tracker's message
// path, doing what the game asks. On the carousel by default; out to the
// front wall to see themselves; at a door in groups of the called number
// when the doors are open (unless window.__wipe, when they all stay out on
// the carousel), and tapping their door to lock it once their group is
// there (in the practice, only on the lock step). Tracking has Z = +1 at
// the front wall; the game's spots count pz from the front.
function players() {
	const pos = [0, 1, 2].map(() => ({ X: 0, Y: 0, Z: 0 }));
	setInterval(function () {
		if (typeof window.forceMessage !== 'function') return;
		const g = window.IGB && IGB.current && IGB.current.state && IGB.current.state();
		const n = pos.length;
		const doors = g && g.doors ? g.doors.filter((d) => !d.barred).sort((a, b) => a.number - b.number) : [];
		pos.forEach(function (p, i) {
			const a = i / n * Math.PI * 2;
			p.X = 0.13 * Math.cos(a);
			p.Z = 0.13 * Math.sin(a);
			if (!g) return;
			if (g.beat === 'controls' && g.step === 'reveal') {
				p.X = -0.6 + 0.6 * i;
				p.Z = 0.86;
			}
			if (g.phase === 'rush' && !window.__wipe && g.number) {
				const k = Math.floor(i / g.number);
				const d = doors[k];
				if (d && (k + 1) * g.number <= n) {
					const j = i - k * g.number;
					const off = (j - (g.number - 1) / 2) * 0.06;
					p.X = 2 * d.spot.px - 1 + (d.wall === 1 ? off : 0);
					p.Z = 1 - 2 * d.spot.pz + (d.wall === 1 ? 0 : off);
				}
			}
		});
		window.forceMessage(JSON.stringify(pos) + '|');
		// tap a door with its group at it, as a touch on the wall
		if (g && g.phase === 'rush' && !window.__wipe && (g.beat === 'play' || g.step === 'lock')) {
			for (const d of g.doors) {
				if (d.locked || !d.open || d.occupants.length !== g.number) continue;
				const rect = document.querySelector('igb-world').getBoundingClientRect();
				const x = rect.left + d.tap.x * IGB.scale;
				const y = rect.top + d.tap.y * IGB.scale;
				document.elementFromPoint(x, y).dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
			}
		}
	}, 40);
}

const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 1920, height: 400 });
await page.addInitScript(warpTime, speed);
await page.addInitScript(players);
const logs = [];
page.on('console', (m) => logs.push(m.text()));
await page.goto(`${srv.url}/index.html#mingle`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await page.waitForSelector('button[count="3"]', { timeout: 180000 });
await sleep(500);

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
	title: [2.2, 3.6],
	clock: [1.3, 3.5, 5.1],
	host: [2.2, 3.8, 6.0, 7.4, 9.4],
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
const glIn = {};               // was the hall's canvas showing, beat by beat
let practiceDeaths = 0;
let s;
let playShots = 0;
let wiped = null;              // the round everyone was shot in
let replayed = false;          // and it came round again
let lastPhase = '';
let lastRound = -1;
const started = Date.now();
while (Date.now() - started < 400000) {
	s = await state().catch(() => null);
	if (!s) { await sleep(50); continue; }
	if (process.env.TRACE) console.log(((Date.now() - started) / 1000).toFixed(1), s.beat, s.bt.toFixed(1), s.step, s.stepAge.toFixed(1), s.stepDone, s.phase);
	if (s.beat === 'end' && s.bt > 1.5) break;
	if (s.beat && s.bt > 0.5) glIn[s.beat] = (glIn[s.beat] === undefined ? true : glIn[s.beat]) && s.glVisible;
	for (const at of AT[s.beat] || []) {
		const key = s.beat + at;
		if (s.bt >= at && !taken.has(key)) { taken.add(key); await snap(s.beat); }
	}
	if (s.beat === 'controls' || s.beat === 'host') {
		if (s.contestants.some((c) => !c.alive)) practiceDeaths++;
	}
	if (s.beat === 'controls' && s.step) {
		if (s.stepDone) stepsDone.add(s.step);
		if (s.stepAge > 1.6 && !stepsShot.has(s.step)) {
			stepsShot.add(s.step);
			await snap('controls-' + s.step);
		}
		if (s.stepDone && !stepsShot.has(s.step + '-done')) {
			stepsShot.add(s.step + '-done');
			await snap('controls-' + s.step + '-done');
		}
	}
	if (s.beat === 'play') {
		if (playShots === 0 && s.phase === 'board' && s.bt > 0.4) { playShots++; await snap('play-round1'); }
		if (playShots === 1 && s.phase === 'spin') { playShots++; await sleep(1500 / speed); await snap('play-spin'); }
		if (playShots === 2 && s.phase === 'call') { playShots++; await sleep(300 / speed); await snap('play-call'); }
		if (playShots === 3 && s.phase === 'rush') { playShots++; await sleep(600 / speed); await snap('play-rush'); }
		if (playShots === 4 && s.phase === 'verdict') {
			playShots++;
			await sleep(700 / speed);
			await snap('play-verdict');
			// next round: everyone stays out on the carousel
			await page.evaluate(() => { window.__wipe = true; });
			wiped = s.round + 1;
		}
		if (playShots === 5 && s.round === wiped && s.phase === 'closing') { playShots++; await sleep(1500 / speed); await snap('play-shot'); }
		if (playShots === 6 && s.phase === 'verdict') { playShots++; await sleep(700 / speed); await snap('play-wiped'); }
		if (playShots === 7 && s.phase === 'board' && lastPhase === 'verdict') {
			replayed = s.round === wiped;
			await page.evaluate(() => { window.__wipe = false; });
			playShots++;
			await sleep(400 / speed);
			await snap('play-again');
		}
		if (playShots === 8 && s.round > wiped && s.phase === 'spin') {
			playShots++;
			await page.evaluate(() => IGB.current.test.timeLeft(9));
		}
		if (playShots === 9 && s.timeLeft < 5) { playShots++; await snap('play-countdown'); }
	}
	lastPhase = s.phase;
	lastRound = s.round;
	await sleep(40);
}

const EXPECT = ['squad', 'title', 'clock', 'visors', 'controls', 'host', 'play', 'timeup', 'scores', 'rank', 'team', 'board', 'replay', 'rate', 'end'];
const results = ['scores', 'rank', 'team', 'board', 'replay', 'rate', 'end'];
const checks = {
	order: JSON.stringify(s && s.seen) === JSON.stringify(EXPECT),
	allSteps: ['carousel', 'reveal', 'room', 'lock'].every((k) => stepsDone.has(k) || (s && s.stepsDone.includes(k))),
	noPracticeShots: practiceDeaths === 0,
	hallBehindIntros: ['title', 'clock', 'visors', 'controls', 'host', 'play', 'timeup'].every((b) => glIn[b] !== false) && Object.keys(glIn).length >= 9,
	hallHiddenInResults: results.every((b) => glIn[b] === false),
	wipedRoundReplayed: replayed,
	recorded: !!(s && s.samples > 10),
	marked: !!(s && s.marks.length >= 1),
	completed: logs.some((l) => /Game complete/.test(l)),
};
console.log('seen', JSON.stringify(s && s.seen));
console.log('steps done', s && s.stepsDone.join(' '), 'scores', JSON.stringify(s && s.contestants.map((c) => c.score)), 'wiped round', wiped);
console.log('hall shown', JSON.stringify(glIn));

// A fresh page: SKIP from the controls intro goes straight to round 1.
const second = await openPage(b, { width: 1920, height: 400 });
await second.page.addInitScript(warpTime, speed);
await second.page.goto(`${srv.url}/index.html#mingle`, { timeout: 180000 });
await second.page.waitForSelector('button[count="2"]', { timeout: 180000 });
await sleep(500);
await second.page.evaluate(() => document.querySelector('button[count="2"]').click());
await second.page.waitForFunction(() => IGB.current.state().beat === 'controls', null, { timeout: 180000, polling: 100 });
await second.page.evaluate(() => document.querySelector('button[skip]').click());
await sleep(1500);
const skipped = await second.page.evaluate(() => IGB.current.state());
checks.skip = skipped.beat === 'play' && skipped.round === 0 && skipped.guards === 0 && !(await second.page.evaluate(() => !!document.querySelector('button[skip]')));
console.log('after SKIP', skipped.beat, skipped.phase, 'round', skipped.round);

console.log(JSON.stringify(checks));
console.log('shots', shots.length, shots[0], '…', shots[shots.length - 1]);
const errors = problems.concat(second.problems).filter((p) => !/favicon|Failed to load resource/.test(p.text));
console.log('problems', JSON.stringify(errors));
const ok = Object.values(checks).every(Boolean) && !errors.length;
console.log(ok ? 'PASS' : 'FAIL');
await b.close();
srv.close();
process.exit(ok ? 0 : 1);
