// Plays three bouts of Tug of War with four players, driving their steps
// in time with the game's drum from inside the page.
//
//   bout 1: players 0 and 1 stand bunched in the left half and step back on
//           every beat; 2 and 3 on the right stand still. LEFT should win,
//           bunched (x1.6), and a tap on the LEFT rally pad should surge.
//   bout 2: 0 and 1 cross to the right half and pull on the beat; 2 and 3
//           move left and step back off the beat, which costs them. RIGHT wins.
//   bout 3: everyone crowds the left half, so the teams split by order
//           (0, 1 left; 2, 3 right). Both pull on the beat, but only 2 and 3
//           stay together: RIGHT wins, after the LEAN BACK beat.
// Scores (bouts won) should end 2, 2, 1, 1.
//
//   node tug-of-war.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const out = path.join(PROJECT, 'tools/out/tug-of-war');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 1920, height: 400 });
await page.addInitScript(() => {
	// Each player: X across the room, and how they step: 'on' the beat,
	// 'off' it, or 'still'.
	window.__plan = [{ X: -0.5, mode: 'on' }, { X: -0.4, mode: 'on' }, { X: 0.4, mode: 'still' }, { X: 0.8, mode: 'still' }];
	window.__minContrib = [0, 0, 0, 0];
	setInterval(function () {
		if (!window.forceMessage) return;
		const s = window.IGB && IGB.current && IGB.current.state && IGB.current.state();
		const beat = s && s.beat;
		const pos = window.__plan.map(function (p) {
			let Z = -0.5;
			if (beat && p.mode === 'on' && beat.inWindow) Z = 0.3;
			if (beat && p.mode === 'off' && beat.toNext > 0.5 && beat.toNext < 0.95) Z = 0.3;
			return { X: p.X, Y: 0, Z };
		});
		if (s && s.contestants) s.contestants.forEach((c) => { if (!c.bot) window.__minContrib[c.n] = Math.min(window.__minContrib[c.n], c.contrib); });
		window.forceMessage(JSON.stringify(pos.map((q) => Object.assign({}, q, { Z: q.Z === undefined ? q.Z : -q.Z }))) + '|');
	}, 20);
});
await page.goto(`${srv.url}/index.html?tug-of-war`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(1000);
await page.evaluate(() => document.querySelector('button[count="4"]').click());
const state = () => page.evaluate(() => IGB.current.state());
const waitFor = async (fn, what) => {
	for (let i = 0; i < 1500; i++) {
		const s = await state();
		if (fn(s)) return s;
		await sleep(80);
	}
	throw new Error('timed out waiting for ' + what);
};
const shot = (name) => page.screenshot({ path: path.join(out, name), timeout: 180000 });
const plan = (p) => page.evaluate((p) => { window.__plan = p; }, p);
const tap = (x, y) => page.evaluate(({ x, y }) => {
	const rect = document.querySelector('igb-world').getBoundingClientRect();
	const cx = rect.left + x * IGB.scale;
	const cy = rect.top + y * IGB.scale;
	document.elementFromPoint(cx, cy).dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: cx, clientY: cy }));
}, { x, y });

const checks = [];
const check = (name, ok, detail = '') => {
	checks.push(ok);
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`);
};

/* ---------- bout 1 ---------- */
await waitFor((s) => s.phase === 'pick' && s.bout === 0, 'bout 1');
await sleep(1500);
await shot('test-pick.png');
let s = await waitFor((s) => s.phase === 'pull', 'the first pull');
const teams1 = [0, 1].map((t) => s.contestants.filter((c) => c.team === t).map((c) => c.n));
check('bout 1 teams by side', JSON.stringify(teams1) === '[[0,1],[2,3]]', JSON.stringify(teams1));
s = await waitFor((s) => s.beat.resolved >= 0, 'a beat');
check('bunched teammates pull harder', s.bunch[0] > 1.5 && s.bunch[1] === 1, `bunch ${s.bunch}`);
check('stepping back on the beat pulls', s.contestants[0].contrib > 1 && s.force[0] > s.force[1], `contrib ${s.contestants[0].contrib.toFixed(2)}, force ${s.force.map((f) => f.toFixed(2))}`);
check('the ribbon moves toward the pulling team', s.rope < 0, `rope ${s.rope.toFixed(2)}`);
await shot('test-pull.png');
// tap the LEFT rally pad when it shows (at most PAD_EVERY in)
let padChecked = false;
s = await waitFor((s) => s.pads.some((p) => p.team === 0) || s.phase !== 'pull', 'a rally pad');
if (s.phase === 'pull') {
	await shot('test-pad.png');
	const p = s.pads.find((p) => p.team === 0);
	await tap(p.x, p.y);
	await sleep(150);
	s = await state();
	check('tapping the rally pad surges the team', s.surge[0] > 0 && !s.pads.some((p) => p.team === 0), `surge ${s.surge.map((x) => x.toFixed(1))}`);
	padChecked = true;
} else {
	console.log('     (bout ended before a rally pad; checked in bout 2)');
}
s = await waitFor((s) => s.phase === 'drop', 'the end of bout 1');
check('bout 1: LEFT wins', s.winner === 0, `winner ${s.winner}, rope ${s.rope.toFixed(2)}`);
await sleep(1600);
await shot('test-drop.png');
s = await waitFor((s) => s.phase === 'result', 'the result');
check('the losers went over the edge', s.contestants.filter((c) => c.team === 1).every((c) => c.fallen));
await shot('test-result.png');

/* ---------- bout 2 ---------- */
await plan([{ X: 0.45, mode: 'still' }, { X: 0.55, mode: 'still' }, { X: -0.6, mode: 'still' }, { X: -0.2, mode: 'still' }]);
await waitFor((s) => s.phase === 'pick' && s.bout === 1, 'bout 2');
s = await waitFor((s) => s.phase === 'ready', 'bout 2 teams');
const teams2 = [0, 1].map((t) => s.contestants.filter((c) => c.team === t).map((c) => c.n));
check('bout 2 teams re-picked by side', JSON.stringify(teams2) === '[[2,3],[0,1]]', JSON.stringify(teams2));
await plan([{ X: 0.45, mode: 'on' }, { X: 0.55, mode: 'on' }, { X: -0.6, mode: 'off' }, { X: -0.2, mode: 'off' }]);
await page.evaluate(() => { window.__minContrib = [0, 0, 0, 0]; });
await waitFor((s) => s.phase === 'pull', 'bout 2 pulling');
let tapped = padChecked;
for (;;) {
	s = await state();
	if (s.phase !== 'pull') break;
	if (!tapped && s.pads.some((p) => p.team === 1)) {
		const p = s.pads.find((p) => p.team === 1);
		await tap(p.x, p.y);
		await sleep(150);
		s = await state();
		check('tapping the rally pad surges the team', s.surge[1] > 0, `surge ${s.surge.map((x) => x.toFixed(1))}`);
		tapped = padChecked = true;
	}
	await sleep(80);
}
s = await waitFor((s) => s.phase === 'drop', 'the end of bout 2');
const minContrib = await page.evaluate(() => window.__minContrib);
check('stepping back off the beat costs pull', minContrib[2] < 0 && minContrib[3] < 0, `lowest ${minContrib.map((x) => x.toFixed(2))}`);
check('bout 2: RIGHT wins', s.winner === 1, `winner ${s.winner}`);
check('a rally pad was tapped', padChecked);

/* ---------- bout 3 ---------- */
await plan([{ X: -0.9, mode: 'still' }, { X: -0.5, mode: 'still' }, { X: -0.3, mode: 'still' }, { X: -0.25, mode: 'still' }]);
await waitFor((s) => s.phase === 'pick' && s.bout === 2, 'bout 3');
s = await waitFor((s) => s.phase === 'ready', 'bout 3 teams');
const teams3 = [0, 1].map((t) => s.contestants.filter((c) => c.team === t).map((c) => c.n));
check('everyone on one side splits in two', JSON.stringify(teams3) === '[[0,1],[2,3]]', JSON.stringify(teams3));
await plan([{ X: -0.9, mode: 'on' }, { X: -0.5, mode: 'on' }, { X: -0.3, mode: 'on' }, { X: -0.25, mode: 'on' }]);
await waitFor((s) => s.phase === 'pull', 'bout 3 pulling');
let leaned = false;
let leanForce = 0;
for (;;) {
	s = await state();
	if (s.phase !== 'pull') break;
	if (!leaned && s.beat.inWindow && s.beat.i === s.leanAt) {
		leaned = true;
		await shot('test-lean.png');
		s = await waitFor((s) => s.beat.resolved >= s.leanAt || s.phase !== 'pull', 'the lean back');
		leanForce = s.force[1];
	}
	await sleep(60);
}
check('the lean back pulls big', leaned && leanForce > 3, `force ${leanForce.toFixed(2)}`);
s = await waitFor((s) => s.phase === 'drop', 'the end of bout 3');
check('bout 3: RIGHT wins (together beats apart)', s.winner === 1, `winner ${s.winner}`);
s = await waitFor((s) => s.phase === 'over', 'the end');
await sleep(500);
await shot('test-over.png');
check('scores are bouts won', JSON.stringify(s.scores) === '[2,2,1,1]', JSON.stringify(s.scores));

const errors = problems.filter((p) => !/favicon|Failed to load resource/.test(p.text));
const ok = checks.every(Boolean) && !errors.length;
console.log('problems', JSON.stringify(errors));
console.log(ok ? 'PASS' : 'FAIL');
await b.close();
srv.close();
process.exit(ok ? 0 : 1);
