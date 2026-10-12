// Checks the Show Debug game: it starts at the squad picker, runs into the
// title, its DEBUG panel's buttons jump to every beat of the shared show
// (with a squad and scores filled in as needed), the clock buttons set the
// clock, VISORS OK and NEXT move on, and HIDE tucks the panel away.
//
//   node show-debug.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const out = path.join(PROJECT, 'tools/out/show-debug');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 2400, height: 500 });
await page.goto(`${srv.url}/index.html#show-debug`, { timeout: 180000 });
await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
await sleep(1200);
const results = {};
const check = (name, ok, detail) => { results[name] = ok; console.log(ok ? 'ok  ' : 'BAD ', name, detail || ''); };
const state = () => page.evaluate(() => IGB.current.state());
const shot = (name) => page.screenshot({ path: path.join(out, name + '.png') });

let s = await state();
check('starts at the squad picker', s.beat === 'squad' && await page.$('button[count="4"]') !== null, s.beat);
await shot('01-squad');
await page.click('button[count="4"]');
await sleep(2500);
s = await state();
check('into the title', s.beat === 'title' && s.players === 4, `${s.beat} ${s.players}`);
await shot('02-title');

const JUMPS = ['clock', 'visors', 'controls', 'villain', 'play', 'timeup', 'scores', 'rank', 'team', 'board', 'replay', 'rate', 'end'];
const reached = [];
for (const [i, id] of JUMPS.entries()) {
	await page.click(`debug-panel button[jump="${id}"]`);
	await sleep(1400);
	s = await state();
	reached.push(s.beat === id || (s.seen.slice(-2).includes(id)) ? id : `${id}->${s.beat}`);
	await shot(String(i + 3).padStart(2, '0') + '-' + id);
}
check('every jump lands', reached.every((r) => !r.includes('->')), reached.join(' '));

await page.click('debug-panel button[jump="play"]');
await page.click('debug-panel button[act="final"]');
await sleep(300);
s = await state();
check('CLOCK 0:15 sets the clock', s.timeLeft <= 15 && s.timeLeft > 13, s.timeLeft);
await page.click('debug-panel button[jump="visors"]');
await sleep(500);
await page.click('debug-panel button[act="visors"]');
await sleep(300);
s = await state();
check('VISORS OK moves on', s.beat === 'controls', s.beat);
await page.click('debug-panel button[act="next"]');
await sleep(300);
s = await state();
check('NEXT moves on', s.beat === 'villain', s.beat);
await page.click('debug-panel button[toggle]');
const hidden = await page.evaluate(() => !document.querySelector('debug-panel button[jump="play"]').offsetParent);
check('HIDE tucks the panel away', hidden);

const errors = problems.filter((p) => !/favicon|Failed to load resource/.test(p.text));
console.log('problems', JSON.stringify(errors));
const ok = Object.values(results).every(Boolean) && !errors.length;
console.log(ok ? 'PASS' : 'FAIL');
await b.close();
srv.close();
process.exit(ok ? 0 : 1);
