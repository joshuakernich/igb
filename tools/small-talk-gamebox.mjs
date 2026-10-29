// Small Talk in the virtual gamebox: runs it headless with three ghost
// players, reports how a round goes (anomalies found, the loop's end) and any
// errors, and saves a still of the box from outside mid-hunt (for the
// storyboard's fallback picture) to tools/out/small-talk-gamebox.png.
//
//   node small-talk-gamebox.mjs [--size=1060x650] [--at=26]
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1];
const [w, h] = arg('size', '1060x650').split('x').map(Number);
const at = Number(arg('at', 26));

const srv = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: w, height: h });
await page.goto(`${srv.url}/gamebox.html?game=small-talk&players=3&view=Outside&embed=1&size=${w}x${h}`, { timeout: 120000 });
await page.waitForFunction(() => window.gamebox && window.gamebox.game && window.gamebox.beat === 'play', null, { timeout: 60000 });
await page.evaluate(() => window.gamebox.startLoop());
const log = [];
let shot = false;
for (let s = 0; s < 80; s++) {
	await sleep(1000);
	const st = await page.evaluate(() => {
		const g = window.gamebox.game.state();
		return { phase: g.phase, scene: g.scene, found: g.differences.filter((d) => d.found).length, of: g.differences.length, left: Math.round(g.timeLeft), misses: g.misses, loop: window.gamebox.loopState() };
	});
	const line = `${s + 1}s ${st.scene} ${st.phase} ${st.found}/${st.of} tape ${st.left} misses ${st.misses}`;
	console.log(line);
	if (!shot && s + 1 >= at && st.phase === 'tap') {
		const out = path.join(PROJECT, 'tools/out/small-talk-gamebox.png');
		await page.screenshot({ path: out });
		console.log('still ->', out);
		shot = true;
	}
	if (st.loop.done) { console.log(`loop done at ${st.loop.t.toFixed(1)} s`); if (shot) break; }
}
console.log(problems.length ? problems.slice(0, 8) : 'no problems');
await b.close();
srv.close();
