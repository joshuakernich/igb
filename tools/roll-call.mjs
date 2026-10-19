// Runs Roll Call's whole show with three players, the page's clock sped up:
// the squad picker, the sting, the title, the clock intro, the visor check,
// the tutorial (standing still wakes nobody; waving wakes your meep in your
// colour; walking to both zones; stepping forward and back; tapping the
// "?"), the intro, then the play: each player walks onto their own pad;
// trivia scores only the players in the right zone, the forward/back
// question counts a step forward as yes and back as no, opinion polls tally
// who stands where, a tap on the left wall's "?" shows the hint; the players
// line up in card order and the whole line scores; round 2 begins. Then the
// clock is wound on to TIME!, and the scores, ranking, team, leaderboard,
// replay, rating and end follow. Checks every beat is reached, in order, and
// the game completes with no console errors.
//
//   node roll-call.mjs [--speed=3]
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const SPEED = parseFloat((process.argv.find((a) => a.startsWith('--speed=')) || '--speed=3').slice(8));
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 1920, height: 400 });

// Injected into the page: make its clock run `speed` times faster (frames
// too: the show runs off them), and three players, each at a base position
// with an optional left/right wave, through the tracker's message path.
await page.addInitScript((speed) => {
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
	window.__pos = [-0.15, 0, 0.15].map((X) => ({ X, Y: 0, Z: 0 }));
	window.__wave = [true, true, true];   // (wiggling, for the visor check)
	si(() => {
		if (!window.forceMessage) return;
		const t = realNow() / 1000;
		const data = window.__pos.map((p, i) => ({ X: p.X + (window.__wave[i] ? 0.2 * Math.sin(t * 5 + i) : 0), Y: p.Y, Z: p.Z }));
		window.forceMessage(JSON.stringify(data.map((q) => Object.assign({}, q, { Z: q.Z === undefined ? q.Z : -q.Z }))) + '|');
	}, 30);
}, SPEED);

const logs = [];
page.on('console', (m) => logs.push(m.text()));
await page.goto(`${srv.url}/index.html#roll-call`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(1500);
await page.evaluate(() => document.querySelector('button[count="3"]').click());

const state = () => page.evaluate(() => IGB.current && IGB.current.state());
const setPos = (i, xz) => page.evaluate(([i, xz]) => Object.assign(window.__pos[i], xz), [i, xz]);
const setWave = (w) => page.evaluate((w) => { window.__wave = w; }, w);
const pxToX = (px) => px * 2 - 1;
async function until(fn, ms = 30000) {
	const end = Date.now() + ms;
	let s;
	while (Date.now() < end) {
		s = await state().catch(() => null);
		if (s && fn(s)) return s;
		await sleep(60);
	}
	return s;
}
const checks = [];
function check(name, ok, detail = '') {
	checks.push(ok);
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${detail}`);
}
async function tapHint(hint) {
	await page.evaluate((h) => {
		const rect = document.querySelector('igb-world').getBoundingClientRect();
		const x = rect.left + h.x * IGB.scale;
		const y = rect.top + h.y * IGB.scale;
		document.elementFromPoint(x, y).dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
	}, hint);
}

// 1. The opening: sting, title, clock, visors (everyone wiggling in the middle).
let s = await until((x) => x.beat === 'controls', 120000);
check('the opening runs to the tutorial', s.beat === 'controls', JSON.stringify(s.seen));
await setWave([false, false, false]);

// 2. The tutorial. Wave: standing still wakes nobody; waving wakes your meep.
s = await until((x) => x.step === 'wave');
await sleep(1200);
s = await state();
check('tutorial: standing still keeps meeps grey', s.step === 'wave' && s.players.every((p) => !p.woke));
await setWave([true, true, false]);
s = await until((x) => x.players[0].woke && x.players[1].woke, 6000);
check('tutorial: waving wakes meeps 0 and 1, not 2', s.players[0].woke && s.players[1].woke && !s.players[2].woke && s.players[0].colour);
await setWave([true, true, true]);
s = await until((x) => x.step === 'zone', 10000);
await setWave([false, false, false]);
// Zones: everyone stands on both sides.
for (const X of [-0.5, 0.5]) {
	for (let i = 0; i < 3; i++) await setPos(i, { X: X + (i - 1) * 0.05 });
	await sleep(700);
}
s = await until((x) => x.step === 'depth', 12000);
// Forward and back.
for (const Z of [-0.8, 0.8]) {
	for (let i = 0; i < 3; i++) await setPos(i, { Z });
	await sleep(700);
}
s = await until((x) => x.step === 'tap', 12000);
for (let i = 0; i < 3; i++) await setPos(i, { X: [-0.6, 0, 0.6][i], Z: 0 });
s = await until((x) => x.hint.up, 5000);
await tapHint(s.hint);
s = await until((x) => x.beat !== 'controls', 10000);
check('tutorial: every step done by the players (none timed out)', JSON.stringify(s.stepsPassed) === JSON.stringify(['wave', 'zone', 'depth', 'tap']), s.stepsPassed.join(','));
check('tutorial scores nothing', s.scores.every((c) => c === 0));
check('the intro follows the tutorial', s.beat === 'meet');

// 3. The play. Find your colour: walk onto your own pad, one after another.
s = await until((x) => x.beat === 'play' && x.phase === 'find', 15000);
check('play starts with find your colour, round 1', s.round === 1 && s.pads.length === 3 && s.players.every((p) => p.woke), `clock ${s.gameTimeLeft.toFixed(0)}s left`);
for (let i = 0; i < 3; i++) {
	await setPos(i, { X: pxToX(s.pads[i].px) });
	await sleep(400);
}
s = await until((x) => x.phase === 'found', 8000);
check('all found their colour, 3 + 2 + 1', s.players.every((p) => p.found) && s.scores.reduce((a, c) => a + c, 0) === 6, `scores ${s.scores}`);

// Questions.
let seen = -1;
let hintTapped = false;
const kinds = new Set();
while (true) {
	s = await until((x) => (x.phase === 'vote' && x.questionIndex !== seen) || x.phase === 'birthday', 30000);
	if (s.phase === 'birthday') break;
	seen = s.questionIndex;
	const q = s.question;
	const n = q.zones.length;
	const zoneX = (z) => pxToX((z + 0.5) / n);
	const before = s.scores.slice();
	let plan;
	if (q.kind === 'trivia') {
		plan = [q.answer, (q.answer + 1) % n, q.answer];
		for (let i = 0; i < 3; i++) await setPos(i, { X: zoneX(plan[i]) + (i - 1) * 0.04, Z: 0 });
	} else if (q.kind === 'depth') {
		plan = [0, 1, 0];
		await setPos(0, { X: -0.5, Z: -0.8 });
		await setPos(1, { X: 0, Z: 0.8 });
		await setPos(2, { X: 0.5, Z: -0.8 });
	} else {
		plan = [0, 0, n - 1];
		for (let i = 0; i < 3; i++) await setPos(i, { X: zoneX(plan[i]) + (i - 1) * 0.04, Z: 0 });
	}
	await sleep(500);
	if (q.kind === 'trivia' && !hintTapped) {
		hintTapped = true;
		await tapHint(s.hint);
		await sleep(200);
		check('tapping "?" shows the hint', (await state()).hint.shown);
	}
	const live = (await state()).tally;
	s = await until((x) => x.phase === 'reveal' && x.question.revealed, 15000);
	await sleep(300);
	s = await state();
	kinds.add(q.kind);
	const votes = s.players.map((p) => p.vote);
	const delta = s.scores.map((c, i) => c - before[i]);
	const want = q.zones.map((_, z) => plan.filter((v) => v === z).length);
	let ok = JSON.stringify(votes) === JSON.stringify(plan) && JSON.stringify(s.tally) === JSON.stringify(want) && JSON.stringify(live) === JSON.stringify(want);
	if (q.kind === 'trivia') ok = ok && delta[0] === 2 && delta[1] === 0 && delta[2] === 2;
	else ok = ok && delta.every((d) => d === 0);
	check(`Q${s.questionIndex + 1} ${q.kind}: "${q.text}"`, ok, `votes ${votes} tally ${s.tally} delta ${delta}`);
}
for (let i = 0; i < 3; i++) await setPos(i, { Z: 0 });
check('seven questions: opinion, trivia and forward/back', seen === 6 && kinds.has('depth') && kinds.has('trivia') && kinds.has('opinion'));

// Line-up by card: smallest on the left.
s = await until((x) => x.phase === 'lineup', 40000);
const order = [0, 1, 2].sort((a, c) => s.players[a].card - s.players[c].card);
for (let k = 0; k < 3; k++) await setPos(order[k], { X: pxToX((k + 0.5) / 3) });
await sleep(600);
const beforeLine = s.scores.slice();
s = await until((x) => x.phase === 'between' || x.round === 2, 30000);
const lineDelta = s.scores.map((c, i) => c - beforeLine[i]);
check('the whole line is right and scores', s.perfectLine && lineDelta.every((d) => d === 3), `delta ${lineDelta}`);
s = await until((x) => x.round === 2 && x.phase === 'find', 10000);
check('round 2 begins (find your colour again)', s.round === 2 && s.pads.length === 3);
check('the replay is recording', s.samples > 10, `samples ${s.samples}`);
const finalScores = s.scores.slice();

// 4. Wind the clock on to TIME!, then the results run themselves.
await page.evaluate(() => IGB.current.test.timeLeft(4));
s = await until((x) => x.beat === 'timeup', 15000);
check('TIME! when the clock runs out', s.beat === 'timeup');
s = await until((x) => x.beat === 'end' && x.bt > 1.5, 200000);

const EXPECT = ['squad', 'sting', 'title', 'clock', 'visors', 'controls', 'meet', 'play', 'timeup', 'scores', 'rank', 'team', 'board', 'replay', 'rate', 'end'];
console.log('seen', JSON.stringify(s && s.seen));
check('every beat, in order', JSON.stringify(s && s.seen) === JSON.stringify(EXPECT));
check('the game completes', !!(s && s.complete) && logs.some((l) => /Game complete/.test(l)), `scores ${finalScores}`);

// (the end screen's carousel shows every game's screenshot: one missing
// there is another game's, not Roll Call's)
const errors = problems.filter((p) => !/favicon|Failed to load resource|assets\/shared\/screens\//.test(p.text));
const ok = checks.every(Boolean) && !errors.length;
console.log('problems', JSON.stringify(errors));
console.log(ok ? 'PASS: the whole show, the tutorial, find your colour, stand-to-answer, the line-up and round 2 all work' : 'FAIL');
await b.close();
srv.close();
process.exit(ok ? 0 : 1);
