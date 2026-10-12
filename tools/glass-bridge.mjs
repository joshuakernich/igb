// Plays Glass Bridge with three players. Player 1 jumps onto the tempered
// pane, then onto the wrong one and falls; player 2 takes over from the last
// safe pane and dithers until the guard fires; player 3 walks the lit panes
// and crosses the rest (one jump by tapping the wall), so survives. The
// waiting players' pointing is checked along the way, and a second bridge
// starts with everyone back.
//
//   node glass-bridge.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const out = path.join(PROJECT, 'tools/out/glass-bridge');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 1920, height: 400 });
await page.addInitScript(() => {
	// Everyone in the middle, standing back from the front wall.
	window.__pos = [0, 1, 2].map(() => ({ X: 0, Y: 0, Z: 0.3 }));
	setInterval(() => window.forceMessage && window.forceMessage(JSON.stringify(window.__pos.map((q) => Object.assign({}, q, { Z: q.Z === undefined ? q.Z : -q.Z }))) + '|'), 30);
});
await page.goto(`${srv.url}/index.html#glass-bridge`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(1000);
await page.evaluate(() => document.querySelector('button[count="3"]').click());

const state = () => page.evaluate(() => IGB.current.state());
const waitFor = async (fn, what, secs = 60) => {
	for (let i = 0; i < secs * 10; i++) {
		const s = await state();
		if (fn(s)) return s;
		await sleep(100);
	}
	throw new Error('timed out waiting for ' + what);
};
const shot = (name) => page.screenshot({ path: path.join(out, name), timeout: 180000 });
const setPos = (n, pos) => page.evaluate(({ n, pos }) => Object.assign(window.__pos[n], pos), { n, pos });
const sideX = (side) => (side ? 0.6 : -0.6);
let ok = true;
const check = (label, pass) => {
	console.log(`  ${label}:`, pass ? 'ok' : 'WRONG');
	ok = ok && pass;
};

// Lean to a side, then step forward to jump; back again afterwards.
async function jumpTo(n, side) {
	await setPos(n, { X: sideX(side), Z: 0.3 });
	await sleep(1000);
	await setPos(n, { Z: -0.8 });
	await waitFor((s) => s.phase !== 'choose', 'the jump');
	await setPos(n, { Z: 0.3 });
}

try {
	let s = await waitFor((s) => s.phase === 'choose' && s.active === 0, "player 1's turn");
	console.log(`rows ${s.rows}, tempered sides ${s.safe.join('')}`);

	// Player 1 leans to the tempered side; the others point opposite ways.
	await setPos(0, { X: sideX(s.safe[0]) });
	await setPos(1, { X: -0.6 });
	await setPos(2, { X: 0.6 });
	await sleep(1200);
	s = await state();
	check('player 1 eyes the tempered side', s.contestants[0].side === s.safe[0]);
	check('player 2 points left, player 3 right', s.contestants[1].advice === 0 && s.contestants[2].advice === 1);
	await shot('choose.png');

	await jumpTo(0, s.safe[0]);
	s = await waitFor((s) => s.phase === 'choose' && s.frontier === 0, 'landing on row 1');
	check('row 1 holds and stays lit', s.contestants[0].alive && s.proven[0][s.safe[0]] && s.contestants[0].score === 1);

	// Now the wrong pane.
	const wrong = 1 - s.safe[1];
	await setPos(0, { X: sideX(wrong) });
	await sleep(400);
	await shot('eyeing-wrong.png');
	await jumpTo(0, wrong);
	await sleep(500);
	s = await state();
	check('row 2 shatters, player 1 falls', !s.contestants[0].alive && s.broken[1][wrong]);
	await shot('shatter.png');

	// Player 2 walks up to the last safe pane, then does nothing.
	s = await waitFor((s) => s.phase === 'choose' && s.active === 1, "player 2's turn");
	check('player 2 takes over from row 1', Math.abs(s.contestants[1].s - 0) < 1e-3 && s.frontier === 0);
	const t0 = Date.now();
	s = await waitFor((s) => !s.contestants[1].alive, 'the guard', 30);
	const took = (Date.now() - t0) / 1000;
	check(`the guard fires when time runs out (${took.toFixed(1)}s, limit ${s.jumpLimit}s)`, took > s.jumpLimit - 2 && took < s.jumpLimit + 2);
	await sleep(300);
	await shot('shot.png');

	// Player 3 crosses: row 2 has one pane left; then the rest, one by tapping.
	s = await waitFor((s) => s.phase === 'choose' && s.active === 2, "player 3's turn");
	let tapped = false;
	while (s.frontier < s.rows - 1) {
		const row = s.frontier + 1;
		if (!tapped && row >= 3) {
			// tap the front wall's half for the tempered side
			await sleep(800);
			const x = 1600 + (s.safe[row] ? 1200 : 400);
			await page.evaluate((x) => {
				const rect = document.querySelector('igb-world').getBoundingClientRect();
				const cx = rect.left + x * IGB.scale;
				const cy = rect.top + 500 * IGB.scale;
				document.elementFromPoint(cx, cy).dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: cx, clientY: cy }));
			}, x);
			tapped = true;
		} else {
			await jumpTo(2, s.safe[row]);
		}
		s = await waitFor((s) => s.frontier === row || !s.contestants[2].alive, `row ${row + 1}`);
		console.log(`  row ${row + 1}: frontier ${s.frontier}, alive ${s.contestants[2].alive}, broken ${JSON.stringify(s.broken[row])}`);
		if (!s.contestants[2].alive) break;
		if (row === 5) await shot('crossing.png');
		if (s.frontier < s.rows - 1) s = await waitFor((s) => s.phase === 'choose', 'the next choice');
	}
	check('player 3 never fell', s.contestants[2].alive);
	s = await waitFor((s) => s.contestants[2].crossed, 'reaching the far platform');
	await sleep(600);
	await shot('survived.png');
	check(`player 3 survives with rows + bonus (score ${s.contestants[2].score})`, s.contestants[2].score === (s.rows - 2) + 5);

	s = await waitFor((s) => s.phase === 'verdict', 'the verdict');
	await shot('verdict.png');
	s = await waitFor((s) => s.crossing === 1 && s.phase === 'choose', 'the second bridge');
	check('second bridge: everyone back, last goes first', s.contestants.every((c) => c.alive && !c.crossed) && s.active === 2 && s.frontier === -1);
	await shot('bridge2.png');
} catch (e) {
	console.log('ERROR', e.message);
	ok = false;
}

const errors = problems.filter((p) => !/favicon|Failed to load resource/.test(p.text));
console.log('problems', JSON.stringify(errors));
console.log(ok && !errors.length ? 'PASS' : 'FAIL');
await b.close();
srv.close();
process.exit(ok && !errors.length ? 0 : 1);
