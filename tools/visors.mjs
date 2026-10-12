// Checks the shared visor check (Showtime's 'visors' beat), in Gwi-Ma
// Showdown: the squad's visors are shown, the clock holds still, a visor
// beyond the squad that moves is flagged with what to swap it for, squad
// visors wiggling in the middle of the room are ticked off one by one, and
// once all are in and the wrong one is gone it says ALL SET and moves on.
//
//   node visors.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const out = path.join(PROJECT, 'tools/out/visors');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 2400, height: 500 });
await page.addInitScript(() => {
	// Seven tracker slots, all still at the back; window.__wiggle lists the
	// slots to wiggle (in the middle of the room, or at __at[i] if given).
	window.__pos = Array.from({ length: 7 }, (_, i) => ({ X: -0.6 + i * 0.2, Y: 0, Z: -0.8 }));
	window.__wiggle = [];
	window.__at = {};
	let t = 0;
	setInterval(() => {
		t += 0.03;
		for (const i of window.__wiggle) {
			const at = window.__at[i] || { X: (i - 1) * 0.12, Z: 0 };
			window.__pos[i].X = at.X + Math.sin(t * 9 + i) * 0.12;
			window.__pos[i].Z = at.Z + Math.cos(t * 7 + i) * 0.06;
		}
		window.forceMessage && window.forceMessage(JSON.stringify(window.__pos) + '|');
	}, 30);
});
await page.goto(`${srv.url}/index.html?gwi-ma-showdown`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(1000);
await page.evaluate(() => document.querySelector('button[count="3"]').click());
await page.evaluate(() => IGB.current.test.skipTo('visors'));
const visors = () => page.evaluate(() => {
	const s = IGB.current.state();
	return { beat: s.beat, visors: s.visors, clock: s.timeLeft };
});
const shot = (name) => page.screenshot({ path: path.join(out, name), timeout: 180000 });
const results = {};
const check = (name, ok, detail) => { results[name] = ok; console.log(ok ? 'ok  ' : 'BAD ', name, detail || ''); };

await sleep(2500);
await shot('1-put-on.png');
let s = await visors();
console.log(JSON.stringify(s));
const left0 = s.clock;
await sleep(2500);
await shot('2-wiggle-ask.png');

// orange (slot 4) is moving about: flagged
await page.evaluate(() => { window.__wiggle = [4]; window.__at[4] = { X: 0.5, Z: 0.5 }; });
await sleep(1500);
s = await visors();
check('wrong visor flagged', s.visors && s.visors.wrong.includes(4), JSON.stringify(s.visors));
await shot('3-wrong.png');

// red and blue wiggle in the middle: ticked; green hasn't come in
await page.evaluate(() => { window.__wiggle = [4, 0, 1]; });
await sleep(1800);
s = await visors();
check('wigglers ticked', s.visors.ticked[0] && s.visors.ticked[1] && !s.visors.ticked[2], JSON.stringify(s.visors));
await shot('4-two-in.png');

// green too, and orange taken off: all set, then on to the controls
await page.evaluate(() => { window.__wiggle = [0, 1, 2]; });
await sleep(3600);
s = await visors();
check('all set', s.visors.allSet && !s.visors.wrong.length, JSON.stringify(s.visors));
await shot('5-all-set.png');
check('clock held through it', s.clock === left0, `${left0} -> ${s.clock}`);
for (let i = 0; i < 40 && s.beat === 'visors'; i++) { await sleep(100); s = await visors(); }
check('moves on', s.beat === 'controls', s.beat);

const errors = problems.filter((p) => !/favicon|Failed to load resource/.test(p.text));
console.log('problems', JSON.stringify(errors));
const ok = Object.values(results).every(Boolean) && !errors.length;
console.log(ok ? 'PASS' : 'FAIL');
await b.close();
srv.close();
process.exit(ok ? 0 : 1);
