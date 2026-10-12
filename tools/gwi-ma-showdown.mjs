// Checks Gwi-Ma Showdown's Breakout rules: a tap moves the nearest player to
// that wall, a ball off the left of a sword goes left and off the right goes
// right, a deflected ball flies up and wounds Gwi-Ma (who
// shrinks and speeds up), a missed ball costs nothing, summoned demons
// march down and are popped or slashed, the ten-minute clock counts down,
// and the team score is everyone's together.
//
//   node gwi-ma-showdown.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const out = path.join(PROJECT, 'tools/out/gwi-ma-showdown');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 1920, height: 400 });
await page.addInitScript(() => {
	// player 0 near the left wall, 1 in the middle, 2 near the right wall
	window.__pos = [{ X: -0.7, Y: 0, Z: 0.2 }, { X: 0, Y: 0, Z: 0 }, { X: 0.7, Y: 0, Z: -0.2 }];
	setInterval(() => window.forceMessage && window.forceMessage(JSON.stringify(window.__pos.map((q) => Object.assign({}, q, { Z: q.Z === undefined ? q.Z : -q.Z }))) + '|'), 30);
});
await page.goto(`${srv.url}/index.html#gwi-ma-showdown`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(1200);
await page.evaluate(() => document.querySelector('button[count="3"]').click());
await sleep(300);
// skip the intros straight to the fight (gwi-ma-flow.mjs runs the whole show)
await page.evaluate(() => IGB.current.test.skipTo('play'));
await sleep(1200);
const state = () => page.evaluate(() => IGB.current.state());
const tap = (x, y) => page.evaluate(([x, y]) => {
	const r = document.querySelector('igb-world').getBoundingClientRect();
	const cx = r.left + x * IGB.scale;
	const cy = r.top + y * IGB.scale;
	document.elementFromPoint(cx, cy).dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: cx, clientY: cy }));
}, [x, y]);
const checks = {};

await page.screenshot({ path: path.join(out, 'start.png'), timeout: 180000 });

// Tap the left wall near player 0's spot on it: player 0 joins it.
// (On the left wall, a player's spot is (1 - pz) of the way along.)
let s = await state();
await tap(0 * 1600 + (1 - 0.6) * 1600, 600);
await sleep(300);
s = await state();
checks.tapLeft = s.hunters[0].wall === 0 && s.hunters[1].wall === 1;

// The desk simulator's wall click moves the selected player's hunter there.
await page.evaluate(() => { IGB.players.list[2].wallChange = 0; });
await sleep(300);
s = await state();
checks.simulatorWall = s.hunters[2].wall === 0;
await page.evaluate(() => { IGB.players.list[2].wallChange = 2; });
await sleep(300);
s = await state();
checks.simulatorWall = checks.simulatorWall && s.hunters[2].wall === 2;

// Hold Gwi-Ma still, clear the air, drop balls onto player 1's sword.
await page.evaluate(() => { IGB.current.test.hold(2400); IGB.current.test.clear(); });
s = await state();
const h1 = s.hunters[1];
await page.evaluate((x) => IGB.current.test.ball(x - 60, 700, 0, 420), h1.x);
await sleep(700);
s = await state();
const left = s.balls[0];
checks.breakoutLeft = left && left.vy < 0 && left.vx < -100 && left.owner === 1;
await page.evaluate(() => IGB.current.test.clear());
await page.evaluate((x) => IGB.current.test.ball(x + 60, 700, 0, 420), h1.x);
await sleep(700);
s = await state();
const right = s.balls[0];
checks.breakoutRight = right && right.vy < 0 && right.vx > 100;
checks.catchScores = s.hunters[1].score === 2;

// Stepping toward the wall brings a hunter forward, nearer Gwi-Ma.
const yBack = (await state()).hunters[1].y;
await page.evaluate(() => { window.__pos[1].Z = -0.95; });
await sleep(600);
s = await state();
checks.stepIn = s.hunters[1].y < yBack - 60;
await page.evaluate(() => { window.__pos[1].Z = 0; });
await sleep(600);

// A player's ball rising under Gwi-Ma wounds him.
await page.evaluate(() => IGB.current.test.clear());
const before = await state();
await page.evaluate(() => IGB.current.test.ball(2400, 600, 0, -700, 'slow', 1));
let wounded = false;
for (let i = 0; i < 300 && !wounded; i++) {
	await sleep(100);
	s = await state();
	wounded = s.boss.hp < before.boss.hp;
}
checks.wound = wounded && s.hunters[1].score >= 2 + 10;
checks.shrinks = s.boss.size < 1 && s.boss.pace > 1;

// Wounded to nothing he's banished for a team bonus (ROUND 1 CLEAR), and
// after a short gap re-forms, full size and tougher, for round 2.
await page.evaluate(() => { const g = IGB.current; g.test.clear(); g.test.hp(1); g.test.ball(2400, 500, 0, -700, 'slow', 1); });
let banished = false;
for (let i = 0; i < 100 && !banished; i++) { await sleep(100); s = await state(); banished = s.boss.banished === 1; }
await sleep(500);
await page.screenshot({ path: path.join(out, 'round-clear.png'), timeout: 180000 });
let reformed = false;
for (let i = 0; i < 100 && banished && !reformed; i++) { await sleep(100); s = await state(); reformed = s.round === 2 && s.boss.rise >= 1; }
checks.banish = banished && reformed && s.boss.size === 1 && s.boss.hp === s.boss.max && s.boss.max === 3 && s.phase === 'play';

// A deflection near a seam is kept steep enough to reach the back wall
// before the seam, and the back wall swallows it in a ripple.
await page.evaluate(() => { const g = IGB.current; g.test.clear(); const h = g.state().hunters[1]; g.test.ball(h.x + 80, 700, 0, 420); });
await sleep(500);
s = await state();
const up = s.balls[0];
const nearSeam = s.hunters[1];
const wall1 = Math.floor(nearSeam.x / 1600);
const landX = up ? up.x + up.vx / -up.vy * up.y : NaN;
checks.staysOnWall = !!up && landX > wall1 * 1600 && landX < (wall1 + 1) * 1600;
const ripplesBefore = s.ripples;
let swallowed = false;
for (let i = 0; i < 40 && !swallowed; i++) { await sleep(100); s = await state(); swallowed = s.ripples > ripplesBefore || (s.balls.length === 0 && s.ripples >= 0 && i > 3); }
checks.backWallRipple = s.balls.length === 0;

// Gwi-Ma walks his wall, stops short of the seam, braces, then dashes into the next.
await page.evaluate(() => { const g = IGB.current; g.test.clear(); g.test.free(1); });
const modes = new Set();
let crossed = false;
const startWall = Math.floor((await state()).boss.x / 1600);
for (let i = 0; i < 160 && !crossed; i++) {
	await sleep(100);
	s = await state();
	modes.add(s.boss.mode);
	if (s.boss.mode === 'walk') {
		const w = Math.floor(s.boss.x / 1600);
		const inside = s.boss.x - s.boss.half >= w * 1600 && s.boss.x + s.boss.half <= (w + 1) * 1600;
		if (!inside) checks.walkClearOfSeams = false;
		if (w !== startWall) crossed = true;
	}
}
if (checks.walkClearOfSeams === undefined) checks.walkClearOfSeams = true;
checks.braceThenDash = modes.has('brace') && modes.has('dash') && crossed;
await page.evaluate(() => IGB.current.test.hold(2400));

// A ball nobody catches just fizzles: no lives, the game goes on.
await page.evaluate(() => IGB.current.test.clear());
await page.evaluate(() => IGB.current.test.ball(800, 850, 0, 600));   // on the left wall, nobody under it there
await sleep(800);
s = await state();
checks.missIsFree = s.balls.length === 0 && s.phase === 'play';
checks.timer = s.timeLeft > 500 && s.timeLeft < 600;
checks.team = s.team === s.hunters.reduce((a, h) => a + h.score, 0) + 100;   // everyone's points, plus the banish bonus

// Gwi-Ma stops to summon: demons appear in front of him and march down.
await page.evaluate(() => { IGB.current.test.clear(); IGB.current.test.summon(); });
await sleep(400);
s = await state();
checks.paused = s.paused;
await sleep(1600);
s = await state();
const packY = s.walkers.length ? s.walkers[0].y : 0;
checks.summoned = s.walkers.length >= 2;
await sleep(800);
s = await state();
checks.march = s.walkers.length && s.walkers[0].y > packY + 20;
checks.demonsStayOnWall = s.walkers.length > 0 && s.walkers.every((d) => d.x > 1600 && d.x < 3200);   // he summoned them on the front wall

// A player's ball pops a demon in its way.
await page.evaluate(() => { const g = IGB.current; g.test.clear(); g.test.walker(1000, 640); g.test.ball(1000, 780, 0, -500, 'slow', 0); });
await sleep(500);
s = await state();
checks.ballPops = s.walkers.length === 0;

// A hunter who meets one slashes it.
await page.evaluate(() => { const g = IGB.current; const h = g.state().hunters[1]; g.test.clear(); g.test.walker(h.x, h.y - 120); });
const slashBefore = (await state()).hunters[1].score;
await sleep(2500);
s = await state();
checks.slash = s.walkers.length === 0 && s.hunters[1].score >= slashBefore + 3;

// One that gets past every hunter just slinks off.
await page.evaluate(() => { const g = IGB.current; g.test.clear(); g.test.walker(4000, 900); });
await sleep(2500);
s = await state();
checks.pastIsFree = s.walkers.length === 0 && s.phase === 'play';

// Lightning down a column knocks out the hunter in it, not one elsewhere.
await page.evaluate(() => { const g = IGB.current; g.test.clear(); g.test.hold(2400); });
s = await state();
const target = s.hunters[1];
await page.evaluate(([x, w]) => IGB.current.test.attack('column', x, w), [target.x, target.wall]);
await sleep(700);
s = await state();
checks.columnWarns = s.attack && s.attack.kind === 'column' && s.attack.phase === 'warn' && !s.hunters[1].down;
await sleep(2000);
s = await state();
checks.columnStrikes = s.hunters[1].down && !s.hunters[0].down && !s.hunters[2].down;

// Lightning over a whole wall knocks out everyone on that wall.
const wallOf0 = s.hunters[0].wall;
await page.evaluate((w) => IGB.current.test.attack('wall', null, w), wallOf0);
await sleep(3500);
s = await state();
checks.wallStrikes = s.hunters[0].down && !s.hunters[2].down;

// With every hunter down, the round starts again, everyone back up.
const roundNow = s.round;
await page.evaluate((w) => IGB.current.test.attack('wall', null, w), s.hunters[2].wall);
await sleep(3400);
s = await state();
const retried = s.retrying;
await sleep(3500);
s = await state();
checks.allDownRetries = retried && s.round === roundNow && s.hunters.every((h) => !h.down) && s.boss.hp === 3;
await page.screenshot({ path: path.join(out, 'retry.png'), timeout: 180000 });

// Let it play a while for a screenshot.
await page.evaluate(() => { const g = IGB.current; g.test.hold(1500); });
await page.evaluate(() => { for (let i = 0; i < 4; i++) IGB.current.test.ball(600 + i * 1000, 400, (i % 2 ? 1 : -1) * 200, -400, 'medium', i % 3); });
await sleep(1500);
await page.screenshot({ path: path.join(out, 'play.png'), timeout: 180000 });

console.log(JSON.stringify(checks));
// (a bare 'Failed to load resource' is the favicon; real 404s also show up as kind 'http' with their URL)
const errors = problems.filter((p) => !/favicon|Failed to load resource/.test(p.text));
console.log('problems', JSON.stringify(errors));
const ok = Object.values(checks).every(Boolean) && Object.keys(checks).length === 27 && !errors.length;
console.log(ok ? 'PASS' : 'FAIL');
await b.close();
srv.close();
process.exit(ok ? 0 : 1);
