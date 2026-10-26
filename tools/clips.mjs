// Records a short looping clip of each game in the menu, mid-play, for the
// show's end-screen carousel: the front wall, 1200 x 750, a few seconds of
// play, saved as assets/shared/clips/<id>.webm. (Frames are screenshots of
// the front wall, encoded to VP8 by the ffmpeg playwright keeps.)
//
//   node clips.mjs [id ...]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const out = path.join(PROJECT, 'assets/shared/clips');
fs.mkdirSync(out, { recursive: true });

// the ffmpeg playwright keeps (mjpeg in, vp8 webm out is all it needs to do)
const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
const ffdir = fs.readdirSync(cache).find((d) => d.startsWith('ffmpeg'));
const FFMPEG = path.join(cache, ffdir, fs.readdirSync(path.join(cache, ffdir)).find((f) => f.startsWith('ffmpeg')));

const CLIP = 5;        // seconds of play in each clip
const WARM = { 'red-light-green-light': 9, mingle: 8, backrooms: 8, 'gwi-ma-showdown': 7, 'roll-call': 6, 'loop-island': 6, 'quill-relay': 7, 'iron-stride': 8, 'twin-tail-tower': 7, 'tails-escape': 7, 'knuckles-quest': 7 };   // seconds to let each play first

const server = await serve(PROJECT);
const b = await browser();
const menu = await (async () => {
	const { page } = await openPage(b, { width: 3600, height: 1000 });
	await page.goto(server.url + '/index.html');
	await page.waitForFunction(() => window.IGB && IGB.menu);
	const m = await page.evaluate(() => IGB.menu.filter((id) => id !== 'show-debug'));
	await page.close();
	return m;
})();
const ids = process.argv.slice(2).length ? process.argv.slice(2) : menu;

// the players wandering about, so the clip has some life
// (as many as the game set up when it jumped in: three, or its own default; a spare one would read as a wrong visor)
const PLAYERS = { 'iron-stride': 2 };
const wander = (page, t, n = 4) => page.evaluate(([t, n]) => {
	if (!IGB.players || !IGB.players.receive) return;
	const pos = Array.from({ length: n }, (_, k) => ({ X: Math.sin(t * 0.3 + k * 1.7) * 0.6, Y: 0, Z: Math.cos(t * 0.23 + k * 2.1) * 0.5 }));
	IGB.players.receive(JSON.stringify(pos) + '|');
}, [t, n]);

for (const id of ids) {
	const { page, problems } = await openPage(b, { width: 3600, height: 1000 });
	await page.goto(`${server.url}/index.html#${id}`);
	await page.waitForFunction(() => window.IGB && IGB.current, null, { timeout: 15000 });
	await sleep(1200);
	// straight into play (no squad picker, no sting); again after a moment, past anything the first jump set off
	const toPlay = () => page.evaluate(() => {
		const g = IGB.current;
		try { (g.test.skipTo || g.test.jump)('play'); } catch (e) { /* (a game without a play beat) */ }
	});
	await toPlay();
	await sleep(1500);
	await toPlay();
	let t = 0;
	for (let i = 0; i < (WARM[id] || 7) * 4; i++) { await wander(page, t++ * 0.25 * 4, PLAYERS[id]); await sleep(250); }
	await page.addStyleTag({ content: 'igb-simulator, igb-controls, igb-log, showtime-picker { display: none !important; }' });
	await sleep(300);
	const box = await page.evaluate(() => {
		const r = document.querySelector('igb-world').getBoundingClientRect();
		return { x: r.x, y: r.y, w: r.width, h: r.height };
	});
	const wall = box.w / 3;
	const clip = { x: Math.round(box.x + wall), y: Math.round(box.y), width: Math.round(wall) & ~1, height: Math.round(box.h) & ~1 };
	// the frames, as fast as they come, for CLIP seconds
	const frames = [];
	const start = Date.now();
	while (Date.now() - start < CLIP * 1000) {
		frames.push(await page.screenshot({ type: 'jpeg', quality: 85, clip }));
		await wander(page, t++ * 0.25 * 4 * 0.3, PLAYERS[id]);
	}
	const fps = frames.length / ((Date.now() - start) / 1000);
	const file = path.join(out, id + '.webm');
	await new Promise((resolve, reject) => {
		const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', fps.toFixed(2), '-i', 'pipe:0',
			'-c:v', 'libvpx', '-b:v', '2M', '-an', file]);
		ff.on('error', reject);
		ff.on('close', (code) => (code ? reject(new Error('ffmpeg ' + code)) : resolve()));
		for (const f of frames) ff.stdin.write(f);
		ff.stdin.end();
	});
	console.log(id, clip.width + 'x' + clip.height, frames.length + ' frames', fps.toFixed(1) + ' fps', Math.round(fs.statSync(file).size / 1024) + ' KB', problems.length ? problems.slice(0, 2).map((p) => p.text).join(' | ') : '');
	await page.close();
}
await b.close();
server.close();
