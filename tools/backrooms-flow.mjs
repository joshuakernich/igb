// Runs Backrooms' whole show, start to finish, with the page's clock sped
// up: the squad picker, the title drop, the clock intro, the controls (the
// practice chair tapped, a wrong tap made), the thing in the corridor, the
// rounds (one cleared, one where nobody finds anything so it rewinds and
// goes again, then the clock wound on to its last seconds), TIME!, the
// scores, the ranking, the team total, the leaderboard and the replay.
// Checks every beat is reached, in order, and the game completes.
// Screenshots of each beat go to tools/out/backrooms/flow-NN-<beat>.png.
//
//   node backrooms-flow.mjs [--speed=3]
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const speed = parseFloat((process.argv.find((a) => a.startsWith('--speed=')) || '--speed=3').slice(8));
const out = path.join(PROJECT, 'tools/out/backrooms');
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
await page.goto(`${srv.url}/index.html#backrooms`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(2000);

let shot = 0;
const shots = [];
async function snap(name) {
	shot++;
	const file = path.join(out, `flow-${String(shot).padStart(2, '0')}-${name}.png`);
	await page.evaluate(() => IGB.current.pause(true));
	await page.screenshot({ path: file, timeout: 180000 });
	await page.evaluate(() => IGB.current.pause(false));
	shots.push(path.relative(PROJECT, file));
}
const state = () => page.evaluate(() => IGB.current && IGB.current.state());
// A tap on the walls at world point p.
const click = (p) => page.evaluate((p) => {
	const rect = document.querySelector('igb-world').getBoundingClientRect();
	const x = rect.left + p.x * IGB.scale;
	const y = rect.top + p.y * IGB.scale;
	document.elementFromPoint(x, y).dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
}, p);

await snap('squad');
await page.evaluate(() => document.querySelector('button[count="3"]').click());

// When to photograph each beat (seconds into it, show time).
const AT = {
	title: [2.4, 4.2],
	clock: [1.3, 3.5, 5.1],
	entity: [1.2, 3.6, 5.2, 6.6, 9.0],
	timeup: [0.6, 2.4],
	scores: [3.6],
	rank: [2.8, 6],
	team: [2.6, 6.6],
	board: [3.4, 8],
	replay: [6],
	end: [1.2],
};
const taken = new Set();
const stepsShot = new Set();
let s;
let practiceTapped = false;
let practiceFound = false;
let wrongTapped = false;
let rounds = 0;            // rounds played through in 'play'
let failed = false;
let retried = false;
let wound = false;
const done = new Set();
const once = async (key, fn) => { if (!done.has(key)) { done.add(key); await fn(); } };
const started = Date.now();
while (Date.now() - started < 600000) {
	s = await state().catch(() => null);
	if (!s) { await sleep(50); continue; }
	if (s.beat === 'end' && s.bt > 1.5) break;
	for (const at of AT[s.beat] || []) {
		const key = s.beat + at;
		if (s.bt >= at && !taken.has(key)) { taken.add(key); await snap(s.beat); }
	}
	if (s.beat === 'controls') {
		if (s.step === 'look' && s.stepAge > 1.6 && !stepsShot.has('look')) { stepsShot.add('look'); await snap('controls-look'); }
		if (s.step === 'tap' && s.practice && s.stepAge > 2.2 && !practiceTapped) {
			if (!stepsShot.has('tap')) { stepsShot.add('tap'); await snap('controls-tap'); }
			practiceTapped = true;
			await click(s.practice);
			await sleep(300 / speed);
			const after = await state();
			practiceFound = !!(after.practice && after.practice.found);
			await snap('controls-tap-found');
		}
		if (s.step === 'wrong' && s.stepAge > 2.2 && !wrongTapped) {
			// the demonstration's wrong tap, then one of ours
			wrongTapped = true;
			stepsShot.add('wrong');
			await snap('controls-wrong');
			await click({ x: 900, y: 600 });
		}
	}
	if (s.beat === 'play') {
		if (s.phase === 'ready' && s.level === 0 && !s.retry) await once('ready0', async () => { await sleep(700 / speed); await snap('play-ready'); });
		if (s.phase === 'look') {
			await once('look' + s.level + s.retry, async () => {
				await sleep(1200 / speed);
				if (s.level === 0) await snap('play-look');
				await page.evaluate(() => IGB.current.skipLook());
			});
		}
		if (s.phase === 'descend' && s.level === 0) await once('descend', async () => { await sleep(2300 / speed); await snap('play-descend'); });
		if (s.phase === 'tap' && s.level === 0) {
			await once('tap0', async () => {
				await sleep(3000 / speed);
				// find all but one, a wrong tap, then the last
				await page.evaluate(() => IGB.current.pause(true));
				const diffs = (await state()).differences;
				for (const d of diffs.slice(0, -1)) { await click(d); await sleep(60); }
				await page.evaluate(() => IGB.current.pause(false));
				await click({ x: 2400, y: 120 });
				await sleep(250 / speed);
				await snap('play-tap');
				await page.evaluate(() => IGB.current.pause(true));
				await click(diffs[diffs.length - 1]);
				await page.evaluate(() => IGB.current.pause(false));
				rounds++;
			});
		}
		if (s.phase === 'reveal' && s.level === 0) await once('reveal0', async () => { await sleep(400 / speed); await snap('play-allfound'); });
		if (s.phase === 'ready' && s.level === 1 && !s.retry) await once('ready1', async () => { await sleep(700 / speed); await snap('play-round2'); });
		if (s.phase === 'tap' && s.level === 1 && !s.retry) {
			// nobody finds anything: the tape runs out
			await once('fail', async () => { await sleep(2000 / speed); await page.evaluate(() => IGB.current.test.tapLeft(0.05)); failed = true; });
		}
		if (s.phase === 'reveal' && s.level === 1 && failed && !s.retry) await once('revealFail', async () => { await sleep(900 / speed); await snap('play-nothing'); });
		if (s.phase === 'rewind') await once('rewind', async () => { await sleep(1000 / speed); await snap('play-rewind'); });
		if (s.phase === 'ready' && s.retry) await once('again', async () => { retried = true; await sleep(700 / speed); await snap('play-again'); });
		if (s.phase === 'tap' && s.level === 1 && s.retry && !wound) {
			await once('wind', async () => {
				await sleep(3500 / speed);
				// find two, then wind the clock on to its last seconds
				await page.evaluate(() => IGB.current.pause(true));
				const diffs = (await state()).differences;
				for (const d of diffs.slice(0, 2)) { await click(d); await sleep(60); }
				await page.evaluate(() => IGB.current.pause(false));
				wound = true;
				await page.evaluate(() => IGB.current.test.timeLeft(9));
			});
		}
		if (wound && s.clockLeft < 5) await once('countdown', () => snap('play-countdown'));
	}
	await sleep(40);
}

const EXPECT = ['squad', 'title', 'clock', 'visors', 'controls', 'entity', 'play', 'timeup', 'scores', 'rank', 'team', 'board', 'replay', 'rate', 'end'];
const checks = {
	order: JSON.stringify(s && s.seen) === JSON.stringify(EXPECT),
	allSteps: stepsShot.size === 3,
	practiceFound,
	roundCleared: !!(s && s.marks.length >= 1),
	nothingFoundGoesAgain: retried,
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
