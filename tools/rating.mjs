// Checks the shared rating (Showtime's 'rate' beat), in Gwi-Ma Showdown:
// five faces on every wall, TERRIBLE to EXCELLENT, one rating for the group
// (the first tap; later taps are ignored). A low rating (1-3) asks WHY THE
// LOW RATING? (tap one), then for most reasons which of them (tap one); a high one (4-5) offers PLAY
// AGAIN? with the menu's games, this one first, and NO THANKS. Then THANK
// YOU! and on to 'end'; picking a game starts it.
//
//   node rating.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const out = path.join(PROJECT, 'tools/out/rating');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(PROJECT);
const b = await browser();
const results = {};
const check = (name, ok, detail) => { results[name] = ok; console.log(ok ? 'ok  ' : 'BAD ', name, detail || ''); };
const allProblems = [];

async function open() {
	const { page, problems } = await openPage(b, { width: 2400, height: 500 });
	allProblems.push(problems);
	await page.goto(`${srv.url}/index.html#gwi-ma-showdown`, { timeout: 180000 });
	await page.addStyleTag({ content: 'igb-controls, igb-log, igb-simulator { display: none !important; }' });
	await sleep(1000);
	await page.evaluate(() => document.querySelector('button[count="3"]').click());
	await page.evaluate(() => IGB.current.test.skipTo('rate'));
	await sleep(1200);
	return page;
}
const state = (page) => page.evaluate(() => IGB.current.state());
const part = (page) => page.evaluate(() => (document.querySelector('showtime-rating') || {}).getAttribute?.('part') || null);
const front = (sel) => `showtime-rating > div:nth-child(2) ${sel}`;   // the front wall's copy
const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.png') }).then(() =>
	page.screenshot({ path: path.join(out, name + '-front.png'), clip: { x: 800, y: 0, width: 800, height: 500 } }));

// A low rating: reasons, then thanks, then the end.
let page = await open();
await shot(page, '1-faces');
const labels = await page.evaluate(() => [...document.querySelectorAll('showtime-rating button')].map((x) => x.textContent));
check('five faces on each wall', labels.length === 15 && labels.slice(0, 5).join(',') === 'TERRIBLE,NOT GREAT,OKAY,GOOD,EXCELLENT', labels.slice(0, 5).join(','));
await page.click(front('button[rating="2"]'));
await sleep(300);
check('a low rating asks what went wrong', await part(page) === 'reasons', await part(page));
await page.click(front('button[reason="TOO HARD"]'));
await sleep(300);
await shot(page, '2-reasons');
await page.click('showtime-rating > div:nth-child(3) button[reason="TOO LONG"]');   // from the right wall
let s = await state(page);
check('one rating, with its reasons', s.feedback.rating === 2 && s.feedback.reasons.join(',') === 'TOO HARD,TOO LONG', JSON.stringify(s.feedback));
await sleep(500);
await shot(page, '3-thanks');
for (let i = 0; i < 60 && s.beat === 'rate'; i++) { await sleep(100); s = await state(page); }
check('on to the end', s.beat === 'end', s.beat);
check('the buttons are cleared away', await page.evaluate(() => document.querySelectorAll('showtime-rating').length) === 0);
await page.close();

// A high rating: play again, and a second tap doesn't change the rating.
page = await open();
await page.click(front('button[rating="5"]'));
await page.evaluate(() => { const r = document.querySelector('showtime-rating button[rating="1"]'); if (r) r.click(); });
await sleep(300);
s = await state(page);
check('the first tap is the rating', s.feedback.rating === 5, JSON.stringify(s.feedback));
check('a high rating offers another game', await part(page) === 'again', await part(page));
const offered = await page.evaluate(() => [...document.querySelectorAll('showtime-rating > div:nth-child(2) button[game]')].map((x) => x.getAttribute('game')));
check('the menu\'s games, this one first', offered[0] === 'gwi-ma-showdown' && offered.includes('mingle') && !offered.includes('show-debug'), offered.join(','));
await shot(page, '4-again');
await page.click(front('button[game="mingle"]'));
await sleep(2500);
const now = await page.evaluate(() => ({ hash: location.hash, title: document.title }));
check('picking a game starts it', now.hash === '#mingle', JSON.stringify(now));
await page.close();

const errors = allProblems.flat().filter((p) => !/favicon|Failed to load resource/.test(p.text));
console.log('problems', JSON.stringify(errors));
const ok = Object.values(results).every(Boolean) && !errors.length;
console.log(ok ? 'PASS' : 'FAIL');
await b.close();
srv.close();
process.exit(ok ? 0 : 1);
