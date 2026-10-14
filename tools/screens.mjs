// Takes a screenshot of each game in the menu, mid-play, for the show's
// "play another game" carousel: the front wall, 800 x 500, saved as
// assets/shared/screens/<id>.jpg.
//
//   node screens.mjs [id ...]
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const out = path.join(PROJECT, 'assets/shared/screens');
fs.mkdirSync(out, { recursive: true });

// how long to let each game play before the shot (seconds, after the skip)
const PLAY = { 'red-light-green-light': 9, mingle: 8, backrooms: 8, 'gwi-ma-showdown': 7, 'roll-call': 6 };

const server = await serve(PROJECT);
const b = await browser();
const menu = await (async () => {
	const { page } = await openPage(b, { width: 2400, height: 700 });
	await page.goto(server.url + '/index.html');
	await page.waitForFunction(() => window.IGB && IGB.menu);
	const m = await page.evaluate(() => IGB.menu.filter((id) => id !== 'show-debug'));
	await page.close();
	return m;
})();
const ids = process.argv.slice(2).length ? process.argv.slice(2) : menu;

for (const id of ids) {
	const { page, problems } = await openPage(b, { width: 2400, height: 700 });
	await page.goto(`${server.url}/index.html#${id}`);
	await page.waitForFunction(() => window.IGB && IGB.current, null, { timeout: 15000 });
	await sleep(1200);
	// a squad of four, if it asks
	const pick = await page.$('button[count="4"]');
	if (pick) await pick.click();
	await sleep(800);
	await page.evaluate(() => {
		const g = IGB.current;
		if (g.test && g.test.skipTo) { try { g.test.skipTo('play'); } catch (e) { /* (a game without a play beat) */ } }
	});
	// wander the players about a bit, so the shot has some life
	for (let i = 0; i < (PLAY[id] || 7) * 4; i++) {
		await page.evaluate((t) => {
			const list = IGB.players && IGB.players.list;
			if (!list || !IGB.players.receive) return;
			const pos = [0, 1, 2, 3].map((n) => ({ X: Math.sin(t * 0.3 + n * 1.7) * 0.6, Y: 0, Z: Math.cos(t * 0.23 + n * 2.1) * 0.5 }));
			IGB.players.receive(JSON.stringify(pos) + '|');
		}, i);
		await sleep(250);
	}
	// (without the desk simulator over the bottom of the walls)
	await page.addStyleTag({ content: 'igb-simulator, igb-controls, igb-log { display: none !important; }' });
	await sleep(300);
	const box = await page.evaluate(() => {
		const r = document.querySelector('igb-world').getBoundingClientRect();
		return { x: r.x, y: r.y, w: r.width, h: r.height };
	});
	const wall = box.w / 3;
	await page.screenshot({ path: path.join(out, id + '.jpg'), type: 'jpeg', quality: 82, clip: { x: box.x + wall, y: box.y, width: wall, height: box.h } });
	console.log(id, Math.round(wall) + 'x' + Math.round(box.h), problems.length ? problems.slice(0, 2).map((p) => p.text).join(' | ') : '');
	await page.close();
}
await b.close();
server.close();
