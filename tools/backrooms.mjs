// Plays a level of Backrooms: the look phase, the descent through the
// floor, then one tap on a real difference (found, credited to the player
// nearest that wall) and one on an empty spot (a time penalty). Then it
// finds the rest, and checks the game goes down to the next floor. A round
// where nobody finds anything rewinds and goes again; it plays four floors
// through, then winds the show's clock out and checks the game completes.
// (The intros are skipped; tools/backrooms-flow.mjs runs the whole show.)
//
//   node backrooms.mjs [--width=1920]
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const width = parseInt((process.argv.find((a) => a.startsWith('--width=')) || '--width=1920').slice(8), 10);
const out = path.join(PROJECT, 'tools/out/backrooms');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width, height: Math.round(width * 1000 / 4800) });
await page.addInitScript(() => {
	// Player 0 by the left wall, 1 in the middle, 2 by the right wall.
	window.__pos = [{ X: -0.8, Y: 0, Z: 0 }, { X: 0, Y: 0, Z: -0.2 }, { X: 0.8, Y: 0, Z: 0 }];
	setInterval(() => window.forceMessage && window.forceMessage(JSON.stringify(window.__pos.map((q) => Object.assign({}, q, { Z: q.Z === undefined ? q.Z : -q.Z }))) + '|'), 30);
});
await page.goto(`${srv.url}/index.html?backrooms`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(1000);
await page.waitForSelector('button[count="3"]', { timeout: 180000 });
await page.evaluate(() => document.querySelector('button[count="3"]').click());
await sleep(300);
await page.evaluate(() => IGB.current.test.skipTo('play'));
const state = () => page.evaluate(() => IGB.current.state());
const waitFor = async (fn, what) => {
	for (let i = 0; i < 5000; i++) {
		const s = await state();
		if (fn(s)) return s;
		await sleep(100);
	}
	throw new Error(`timed out waiting for ${what}`);
};
const pause = (on) => page.evaluate((on) => IGB.current.pause(on), on);
// Screenshots are slow on a busy machine: the game's clock stands still for them.
const shot = async (name) => {
	await pause(true);
	await page.screenshot({ path: path.join(out, name), timeout: 180000 });
	await pause(false);
};
const click = (p) => page.evaluate((p) => {
	const rect = document.querySelector('igb-world').getBoundingClientRect();
	const x = rect.left + p.x * IGB.scale;
	const y = rect.top + p.y * IGB.scale;
	document.elementFromPoint(x, y).dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
}, p);
const checks = [];
const check = (ok, what) => { checks.push(ok); console.log(ok ? '  ok  ' : '  FAIL', what); };

// The look phase.
let s = await waitFor((s) => s.phase === 'look', 'the look phase');
await sleep(2500);
s = await state();
await shot('look.png');
check(s.phase === 'look' && s.differences.length >= 5, `looking at level ${s.floor}, ${s.differences.length} differences waiting below`);
console.log('  differences:', s.differences.map((d) => `${d.kind}@${d.wall}`).join(' '));
const lookY = s.camY;

// Skip the rest of the look: the camera sinks to the floor below.
await page.evaluate(() => IGB.current.skipLook());
s = await waitFor((s) => s.phase === 'descend', 'the descent');
check(true, 'the descent starts after the look phase');
// Catch it just as it drops out of the ceiling below: watched in the page,
// frame by frame, then the clock is held for the screenshot.
await page.evaluate((y) => new Promise((resolve) => {
	const tick = () => {
		if (IGB.current.state().camY < y) { IGB.current.pause(true); resolve(); } else requestAnimationFrame(tick);
	};
	tick();
}), lookY - 3.0);
s = await state();
await page.screenshot({ path: path.join(out, 'descent.png'), timeout: 180000 });
await pause(false);
check(s.phase === 'descend' && s.camY < lookY - 1, `mid-descent, the camera has sunk ${(lookY - s.camY).toFixed(2)} m`);

s = await waitFor((s) => s.phase === 'tap', 'the tap phase');
check(s.floor === 1 && s.camY < lookY - 3.5, `landed on level ${s.floor}`);
await sleep(3200);
// Hold the clock while tapping, so a slow machine can't run the timer out.
await pause(true);

// Tap one real difference.
s = await state();
const target = s.differences[0];
await click(target);
await sleep(400);
s = await state();
const hit = s.differences[0];
const nearestPlayer = target.wall === 0 ? 0 : target.wall === 2 ? 2 : null;
check(hit.found, `tapped the ${target.kind} difference on wall ${target.wall}: found`);
if (nearestPlayer !== null) check(hit.by === nearestPlayer && s.scores[nearestPlayer] === 1, `credited to player ${hit.by} (nearest that wall: ${nearestPlayer})`);
else check(hit.by >= 0 && s.scores[hit.by] === 1, `credited to player ${hit.by}`);

// Tap an empty spot: the point on the walls farthest from every difference.
let empty = null;
let bestD = -1;
for (let x = 120; x < 4800; x += 60) {
	for (let y = 120; y < 900; y += 60) {
		if (x % 1600 < 100 || x % 1600 > 1500) continue;
		const d = Math.min(...s.differences.map((q) => Math.hypot(q.x - x, q.y - y) - q.r));
		if (d > bestD) { bestD = d; empty = { x, y }; }
	}
}
const before = s.timeLeft;
await click(empty);
s = await state();
check(s.misses === 1 && before - s.timeLeft > 2.5 && s.differences.filter((d) => d.found).length === 1, `an empty tap at ${empty.x},${empty.y}: penalty, ${(before - s.timeLeft).toFixed(1)} s lost`);
await pause(false);
await sleep(1000);
await shot('tap.png');
await pause(true);

// Find the rest; the level should end and the camera drop to a new floor.
for (const d of s.differences.slice(1)) {
	await click(d);
	await sleep(250);
}
s = await state();
check(s.differences.every((d) => d.found), `all ${s.differences.length} found; scores ${s.scores}`);
await pause(false);
await sleep(400);
await shot('found.png');
await pause(false);
s = await waitFor((s) => s.phase === 'look' && s.level === 1, 'level 2');
check(s.floor === 2, `down again, to a fresh floor (level ${s.floor})`);
await sleep(1500);
await shot('look-2.png');

// Play the remaining floors through: find everything on each, down to the
// bottom, where the game should finish and hand out rewards.
await page.evaluate(() => IGB.handleComplete((r) => { window.__rewards = r; }));

// Nobody finds anything on level 2: it rewinds back up and goes again, the
// same differences waiting.
await waitFor((s) => s.phase === 'look' && s.level === 1, 'level 2');
await page.evaluate(() => IGB.current.skipLook());
s = await waitFor((s) => s.phase === 'tap', 'the tap phase');
const firstTry = s.differences.map((d) => d.kind + d.x + ',' + d.y).join(' ');
await page.evaluate(() => IGB.current.test.tapLeft(0.05));
s = await waitFor((s) => s.phase === 'rewind', 'the rewind');
check(s.level === 1 && s.differences.every((d) => !d.found), 'nothing found: the tape rewinds');
s = await waitFor((s) => s.phase === 'look' && s.level === 1, 'level 2 again');
check(s.retry && s.floor === 2 && s.levelsDone === 1 && s.differences.map((d) => d.kind + d.x + ',' + d.y).join(' ') === firstTry, 'back up on level 2, the same differences waiting');

for (let L = 1; L < 4; L++) {
	await waitFor((s) => s.phase === 'look' && s.level === L, `level ${L + 1}`);
	if (L === 3) { await sleep(800); await shot('look-4.png'); }
	await page.evaluate(() => IGB.current.skipLook());
	s = await waitFor((s) => s.phase === 'tap', 'the tap phase');
	console.log(`  level ${L + 1}: ${s.differences.length} differences: ${s.differences.map((d) => d.kind).join(' ')}`);
	await sleep(3000);
	await pause(true);
	for (const d of s.differences) { await click(d); await sleep(120); }
	s = await state();
	check(s.differences.every((d) => d.found), `level ${L + 1}: all found`);
	if (L === 3) { await pause(false); await sleep(400); await shot('found-4.png'); }
	await pause(false);
}
// Past the fourth floor the rounds go on, until the show's clock runs out.
s = await waitFor((s) => s.phase === 'ready' && s.level === 4, 'level 5');
check(s.floor === 8, 'a fifth floor, past the old four');
await page.evaluate(() => IGB.current.test.timeLeft(1));
s = await waitFor((s) => s.beat === 'timeup', 'TIME!');
check(s.phase === 'over', 'the clock runs out: TIME!');
await page.evaluate(() => IGB.current.test.skipTo('end'));
const rewards = await (async () => { for (let i = 0; i < 150; i++) { const r = await page.evaluate(() => window.__rewards); if (r) return r; await sleep(100); } return null; })();
check(!!rewards && rewards.length === 3, `the end: scores ${s.scores}, rewards ${JSON.stringify(rewards)}`);

const errors = problems.filter((p) => !/favicon|Failed to load resource/.test(p.text));
console.log('problems', JSON.stringify(errors));
const ok = checks.every(Boolean) && !errors.length;
console.log(ok ? 'PASS' : 'FAIL');
await b.close();
srv.close();
process.exit(ok ? 0 : 1);
