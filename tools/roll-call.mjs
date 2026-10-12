// Checks Roll Call from start to finish with three players, at 3x speed.
// Standing still wakes nobody; waving wakes your meep in your colour.
// Each player walks onto their own pad. Then the questions: trivia scores
// only the players in the right zone, the depth question counts a step
// forward as yes and back as no, opinion polls tally who stands where, and
// a tap on the left wall's "?" shows the hint. Last, the players line up in
// card order and the whole line scores.
//
//   node roll-call.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const SPEED = 3;
const out = path.join(PROJECT, 'tools/out/roll-call');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 1920, height: 400 });

await page.addInitScript((speed) => {
	// Run the page's clock faster (as smoke.mjs --speed does).
	const realNow = Date.now.bind(Date);
	const t0 = realNow();
	const RealDate = Date;
	const fastNow = () => t0 + (realNow() - t0) * speed;
	class FastDate extends RealDate {
		constructor(...a) { if (a.length) super(...a); else super(fastNow()); }
		static now() { return fastNow(); }
	}
	window.Date = FastDate;
	const st = window.setTimeout;
	const si = window.setInterval;
	window.setTimeout = (fn, ms, ...a) => st(fn, (ms || 0) / speed, ...a);
	window.setInterval = (fn, ms, ...a) => si(fn, (ms || 0) / speed, ...a);
	// Players: a base position each, and an optional left/right wave.
	window.__pos = [-0.6, 0, 0.6].map((X) => ({ X, Y: 0, Z: 0 }));
	window.__wave = [false, false, false];
	si(() => {
		if (!window.forceMessage) return;
		const t = realNow() / 1000;
		const data = window.__pos.map((p, i) => ({ X: p.X + (window.__wave[i] ? 0.2 * Math.sin(t * 5 + i) : 0), Y: p.Y, Z: p.Z }));
		window.forceMessage(JSON.stringify(data.map((q) => Object.assign({}, q, { Z: q.Z === undefined ? q.Z : -q.Z }))) + '|');
	}, 30);
}, SPEED);

await page.goto(`${srv.url}/index.html?roll-call`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(1000);
await page.evaluate(() => document.querySelector('button[count="3"]').click());

const state = () => page.evaluate(() => IGB.current.state());
const shot = (name) => page.screenshot({ path: path.join(out, name), timeout: 180000 });
const setPos = (i, xz) => page.evaluate(([i, xz]) => Object.assign(window.__pos[i], xz), [i, xz]);
const pxToX = (px) => px * 2 - 1;
async function until(fn, ms = 30000) {
	const end = Date.now() + ms;
	let s;
	while (Date.now() < end) {
		s = await state();
		if (fn(s)) return s;
		await sleep(80);
	}
	return s;
}
const checks = [];
function check(name, ok, detail = '') {
	checks.push(ok);
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${detail}`);
}

// 1. Wave. Standing still wakes nobody.
let s = await until((x) => x.phase === 'wave');
await sleep(1500);
s = await state();
check('standing still keeps meeps grey', s.players.every((p) => !p.woke));
await page.evaluate(() => { window.__wave = [true, true, false]; });
s = await until((x) => x.players[0].woke && x.players[1].woke, 6000);
check('waving wakes meeps 0 and 1, not 2', s.players[0].woke && s.players[1].woke && !s.players[2].woke && s.players[0].colour);
await shot('test-wave.png');
await page.evaluate(() => { window.__wave = [true, true, true]; });
s = await until((x) => x.phase === 'find', 8000);
check('everyone woke, pads are out', s.phase === 'find' && s.pads.length === 3);
await page.evaluate(() => { window.__wave = [false, false, false]; });

// 2. Find your colour: walk onto your own pad, one after another.
for (let i = 0; i < 3; i++) {
	await setPos(i, { X: pxToX(s.pads[i].px) });
	await sleep(500);
}
await sleep(300);
await shot('test-found.png');
s = await until((x) => x.phase === 'found', 8000);
const findTotal = s.scores.reduce((a, c) => a + c, 0);
check('all found their colour', s.players.every((p) => p.found), `scores ${s.scores}`);
check('finding points are 3 + 2 + 1', findTotal === 6);

// 3. Questions.
let seen = -1;
let hintTapped = false;
const shots = {};
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
		const wrong = (q.answer + 1) % n;
		plan = [q.answer, wrong, q.answer];
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
		await page.evaluate((t) => {
			const rect = document.querySelector('igb-world').getBoundingClientRect();
			const x = rect.left + t.x * IGB.scale;
			const y = rect.top + t.y * IGB.scale;
			document.elementFromPoint(x, y).dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
		}, s.hint);
		await sleep(200);
		check('tapping "?" shows the hint', (await state()).hint.shown);
	}
	const live = (await state()).tally;
	if (!shots[q.kind]) await shot(`test-${q.kind}-vote.png`);
	s = await until((x) => x.phase === 'reveal' && x.question.revealed, 15000);
	await sleep(500);
	s = await state();
	if (!shots[q.kind]) { shots[q.kind] = true; await shot(`test-${q.kind}-reveal.png`); }
	const votes = s.players.map((p) => p.vote);
	const delta = s.scores.map((c, i) => c - before[i]);
	const want = q.zones.map((_, z) => plan.filter((v) => v === z).length);
	let ok = JSON.stringify(votes) === JSON.stringify(plan) && JSON.stringify(s.tally) === JSON.stringify(want) && JSON.stringify(live) === JSON.stringify(want);
	if (q.kind === 'trivia') ok = ok && delta[0] === 2 && delta[1] === 0 && delta[2] === 2;
	else ok = ok && delta.every((d) => d === 0);
	check(`Q${s.questionIndex + 1} ${q.kind}: "${q.text}"`, ok, `votes ${votes} tally ${s.tally} delta ${delta}`);
}
await setPos(0, { Z: 0 }); await setPos(1, { Z: 0 }); await setPos(2, { Z: 0 });
check('seven questions, one of them the depth question', seen === 6 && shots.depth);

// 4. Line-up by card: smallest on the left.
s = await until((x) => x.phase === 'lineup', 40000);
const order = [0, 1, 2].sort((a, c) => s.players[a].card - s.players[c].card);
console.log('cards', s.players.map((p) => p.card).join(','));
for (let k = 0; k < 3; k++) await setPos(order[k], { X: pxToX((k + 0.5) / 3) });
await sleep(600);
await shot('test-lineup.png');
const beforeLine = s.scores.slice();
s = await until((x) => x.phase === 'lineup-reveal', 20000);
await sleep(1000);
await shot('test-lineup-reveal.png');
s = await until((x) => x.phase === 'done', 10000);
const lineDelta = s.scores.map((c, i) => c - beforeLine[i]);
check('the whole line is right and scores', s.perfectLine && lineDelta.every((d) => d === 3), `delta ${lineDelta}`);

s = await until((x) => x.complete, 15000);
check('the game completes', s.complete, `final scores ${s.scores}`);

const errors = problems.filter((p) => !/favicon|Failed to load resource/.test(p.text));
const ok = checks.every(Boolean) && !errors.length;
console.log(ok ? 'PASS: wave, find your colour, stand-to-answer and the line-up all work' : 'FAIL');
console.log('problems', JSON.stringify(errors));
await b.close();
srv.close();
process.exit(ok ? 0 : 1);
