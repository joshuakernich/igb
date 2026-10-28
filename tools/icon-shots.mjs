// Takes a screen capture of each game in the menu, mid-play (the walls, as
// the players see them), for its menu icon: a square cut from it, usually
// round the main character, saved as assets/icons/<id>.png (256 x 256).
//
//   node icon-shots.mjs grab [id ...]    the whole three walls, to tools/out/icon-shots/<id>.png
//   node icon-shots.mjs cut              the squares (CROPS below) from those, into assets/icons
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const OUT = path.join(PROJECT, 'tools/out/icon-shots');
fs.mkdirSync(OUT, { recursive: true });

// each game's square, in the grab's pixels (x, y, size), and the icon it makes
const CROPS = {
	'red-light-green-light': { x: 1695, y: 0, s: 210 },              // the doll
	'grub-o-tron': { x: 1339, y: 331, s: 220 },                      // a cyborg cook
	backrooms: { x: 1650, y: 200, s: 300 },                          // the entity, down the corridor
	'riddler-says': { x: 605, y: 90, s: 230 },                       // the Riddler, on a screen
	'melody-canvas': { x: 200, y: 250, s: 340 },                     // the pens at the playhead
	'temple-of-coins': { x: 1650, y: 195, s: 275 },                  // the Minotaur, in its lair
	'loop-island': { x: 1719, y: 252, s: 315, icon: 'sonic-dash' },   // a runner, from behind
	'quill-relay': { x: 1368, y: 270, s: 342, icon: 'sonic-classic' },    // the loop, rings round it
	// (iron-stride's icon, sonic-robot.png, is a posed hero shot from outside, made with IGB.current.test.hero(0.45, 12.5, 2.4, 2): not grabbed here)
};
// the beat to shoot in (default play) and how long after jumping to it (seconds), when it isn't play
const BEAT = { backrooms: ['entity', 4], 'riddler-says': ['intro', 2], 'grub-o-tron': ['play', 6], 'melody-canvas': ['play', 6], 'temple-of-coins': ['play', 7, 'lair'] };
const WARM = { 'red-light-green-light': 9, mingle: 8, backrooms: 8, 'gwi-ma-showdown': 7, 'roll-call': 6, 'loop-island': 6, 'quill-relay': 7 };

const [mode, ...rest] = process.argv.slice(2);
const server = await serve(PROJECT);
const b = await browser();

if (mode === 'grab') {
	const ids = rest.length ? rest : Object.keys(CROPS);
	const wander = (page, t) => page.evaluate((t) => {
		if (!IGB.players || !IGB.players.receive) return;
		const pos = [0, 1, 2, 3].map((n) => ({ X: Math.sin(t * 0.3 + n * 1.7) * 0.6, Y: 0, Z: Math.cos(t * 0.23 + n * 2.1) * 0.5 }));
		IGB.players.receive(JSON.stringify(pos) + '|');
	}, t);
	for (const id of ids) {
		const { page } = await openPage(b, { width: 3600, height: 1000 });
		await page.goto(`${server.url}/index.html?players=3#${id}`);
		await page.waitForFunction(() => window.IGB && IGB.current, null, { timeout: 15000 });
		await sleep(1200);
		await page.evaluate(() => {
			const g = IGB.current;
			try {
				if (g.test && g.test.skipTo) g.test.skipTo('play');
				else if (g.test && g.test.jump) g.test.jump('play');
			} catch (e) { /* (a game without a play beat) */ }
		});
		let t = 0;
		for (let i = 0; i < (WARM[id] || 7) * 4; i++) { await wander(page, t++); await sleep(250); }
		await page.addStyleTag({ content: 'igb-simulator, igb-controls, igb-log, showtime-picker { display: none !important; }' });
		await sleep(300);
		const [beat, after, lvl] = BEAT[id] || ['play', 1.5];
		await page.evaluate((beat) => { const g = IGB.current; try { (g.test.skipTo || g.test.jump)(beat); } catch (e) { /* */ } }, beat);
		if (lvl !== undefined) await page.evaluate((lvl) => IGB.current.test.level(lvl), lvl);   // (a game's own scene, as well as its beat)   // (again, past anything the first jump started; or the beat to shoot)
		for (let i = 0; i < after * 4; i++) { await wander(page, t++); await sleep(250); }
		const r = await page.evaluate(() => { const r = document.querySelector('igb-world').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
		await page.screenshot({ path: path.join(OUT, id + '.png'), clip: r });
		console.log(id, Math.round(r.width) + 'x' + Math.round(r.height));
		await page.close();
	}
}

if (mode === 'cut') {
	const page = await b.newPage();
	for (const [id, c] of Object.entries(CROPS)) {
		const src = path.join(OUT, id + '.png');
		if (!fs.existsSync(src)) continue;
		const data = 'data:image/png;base64,' + fs.readFileSync(src).toString('base64');
		const png = await page.evaluate(async ({ data, c }) => {
			const img = new Image();
			img.src = data;
			await img.decode();
			const cv = document.createElement('canvas');
			cv.width = cv.height = 256;
			cv.getContext('2d').drawImage(img, c.x, c.y, c.s, c.s, 0, 0, 256, 256);
			return cv.toDataURL('image/png').split(',')[1];
		}, { data, c });
		fs.writeFileSync(path.join(PROJECT, 'assets/icons', (c.icon || id) + '.png'), Buffer.from(png, 'base64'));
		console.log('icon', c.icon || id);
	}
}
await b.close();
server.close();
