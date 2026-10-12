// Run prototypes headlessly and report problems.
//
//   node smoke.mjs coconut-climbers            one game
//   node smoke.mjs coconut-climbers dance-mat  several
//   node smoke.mjs all                         every game in the manifest
//
// Options:
//   --seconds=16        how long to run each game
//   --players=3         squad size to pick when the HUD asks
//   --shots=2,6,12      when to take screenshots (seconds)
//   --width=1920        window width (height follows the 4800 x 1000 world)
//   --seed=1            seed for Math.random, so runs repeat (0 for real randomness)
//   --speed=1           run the page's clock this many times faster (timers,
//                       animations, Date, audio), to reach later rounds quickly.
//                       --seconds and --shots stay in real time.
//   --motion=random     how simulated players move: random (a random move every
//                       2s), wiggle (everyone sways, squats and walks
//                       continuously, so games actually get played) or still
//   --old               run the same game in the old platform (../igb/igb-proto)
//                       to compare against
//   --chrome            keep the launcher's controls and simulator in shots
//   --eval="js"         run this in the page once the game has started
//
// Screenshots and a report.json go to tools/out/<id>/. The exit code is 1
// if any game had problems (exceptions, console errors, failed requests).

import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const OLD_ROOT = path.resolve(PROJECT, '../igb/igb-proto');

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
	const a = argv.find((x) => x.startsWith(`--${name}=`));
	return a ? a.slice(name.length + 3) : fallback;
};
const flag = (name) => argv.includes(`--${name}`);

const seconds = parseFloat(opt('seconds', '16'));
const players = parseInt(opt('players', '3'), 10);
const shots = opt('shots', '2,6,12').split(',').map(Number).filter((n) => !isNaN(n)).sort((a, b) => a - b);
const width = parseInt(opt('width', '1920'), 10);
const height = Math.round(width * 1000 / 4800);
const seed = parseInt(opt('seed', '1'), 10);
const speed = parseFloat(opt('speed', '1'));
const motion = opt('motion', 'random');
const old = flag('old');
const keepChrome = flag('chrome');
const evalJs = opt('eval', '');

// Injected into the page: make its clock run `speed` times faster.
function warpTime(speed) {
	const realNow = Date.now.bind(Date);
	const t0 = realNow();
	const perfNow = performance.now.bind(performance);
	const p0 = perfNow();
	const RealDate = Date;
	const fastNow = () => t0 + (realNow() - t0) * speed;
	class FastDate extends RealDate {
		constructor(...a) { if (a.length) super(...a); else super(fastNow()); }
		static now() { return fastNow(); }
	}
	window.Date = FastDate;
	performance.now = () => p0 + (perfNow() - p0) * speed;
	const st = window.setTimeout;
	const si = window.setInterval;
	window.setTimeout = (fn, ms, ...a) => st(fn, (ms || 0) / speed, ...a);
	window.setInterval = (fn, ms, ...a) => si(fn, (ms || 0) / speed, ...a);
	const raf = window.requestAnimationFrame;
	window.requestAnimationFrame = (cb) => raf((t) => cb(p0 + (t - p0) * speed));
	const play = HTMLMediaElement.prototype.play;
	HTMLMediaElement.prototype.play = function () {
		try { this.playbackRate = Math.min(16, speed); } catch (e) { /* some rates are refused */ }
		return play.call(this);
	};
}

// Injected into the page: keep every simulated player moving, swaying,
// squatting and walking about, through the same message path the tracker uses.
function wiggle() {
	setInterval(function () {
		if (typeof window.forceMessage !== 'function') return;
		const t = Date.now() / 1000;
		const data = [];
		for (let i = 0; i < 7; i++) {
			data.push({
				X: 0.6 * Math.sin(t * 0.7 + i * 1.1),
				Y: 0.1 + 0.4 * Math.sin(t * 2.3 + i * 1.3),
				Z: 0.6 * Math.sin(t * 0.45 + i * 2.1),
			});
		}
		window.forceMessage(JSON.stringify(data) + '|Front,0,0,None');
	}, 50);
}

// Read the manifest without a browser.
function manifest() {
	const src = fs.readFileSync(path.join(PROJECT, 'games/manifest.js'), 'utf8');
	const IGB = {};
	new Function('IGB', src)(IGB);
	return IGB.manifest.flatMap((f) => f.games);
}

const entries = manifest();
let ids = argv.filter((a) => !a.startsWith('--'));
if (ids.includes('all')) ids = entries.map((e) => e.id);
if (!ids.length) {
	console.error('usage: node smoke.mjs <id ...|all> [--old] [--seconds=16] [--players=3] [--shots=2,6,12]');
	process.exit(1);
}

const HIDE_NEW = 'igb-controls, igb-log, igb-simulator { display: none !important; }';
const HIDE_OLD = 'igbmenu, logger, gameboxwrapper { display: none !important; }';

// Old-platform noise that has nothing to do with the game under test.
const OLD_NOISE = [/dribbler\.js/, /favicon\.ico/];
const NEW_NOISE = [/favicon\.ico/];

const server = await serve(old ? OLD_ROOT : PROJECT);
const b = await browser();
let failed = 0;
const summary = [];

for (const id of ids) {
	const entry = entries.find((e) => e.id === id);
	if (!entry) {
		console.log(JSON.stringify({ id, error: 'not in the manifest' }));
		failed++;
		continue;
	}
	const outDir = path.join(PROJECT, 'tools/out', id);
	fs.mkdirSync(outDir, { recursive: true });
	const variant = old ? 'old' : 'new';

	const { page, problems } = await openPage(b, { width, height });
	if (seed) {
		await page.addInitScript((s) => {
			let a = s >>> 0;
			Math.random = function () {
				a |= 0; a = (a + 0x6D2B79F5) | 0;
				let t = Math.imul(a ^ (a >>> 15), 1 | a);
				t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
				return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
			};
		}, seed);
	}
	if (speed !== 1) await page.addInitScript(warpTime, speed);
	if (motion === 'wiggle') await page.addInitScript(wiggle);

	const query = old ? encodeURIComponent(entry.name) : entry.id;
	const started = Date.now();
	await page.goto(`${server.url}/index.html?${query}`, { waitUntil: 'load' });
	if (!keepChrome) await page.addStyleTag({ content: old ? HIDE_OLD : HIDE_NEW });

	const taken = [];
	let clicked = false;
	let nextMove = 2;
	let evaluated = false;
	const pending = shots.slice();

	while ((Date.now() - started) / 1000 < seconds) {
		const t = (Date.now() - started) / 1000;
		if (!clicked && t > 0.8) {
			clicked = await page.evaluate((n) => {
				const btn = document.querySelector(`button[count="${n}"]`);
				if (btn) { btn.click(); return true; }
				return false;
			}, players).catch(() => false);
		}
		if (evalJs && !evaluated && t > 1) {
			evaluated = true;
			await page.evaluate(evalJs).catch((err) => problems.push({ kind: 'eval', text: String(err) }));
		}
		if (motion === 'random' && t > nextMove) {
			nextMove += 2;
			await page.evaluate((isOld) => {
				if (isOld) window.$ && $('[btn=move]').trigger('click');
				else window.IGB && IGB.players.randomMove();
			}, old).catch(() => {});
		}
		if (pending.length && t >= pending[0]) {
			const at = pending.shift();
			const file = path.join(outDir, `${variant}-${String(at).padStart(2, '0')}s.png`);
			await page.screenshot({ path: file });
			taken.push(path.relative(PROJECT, file));
		}
		await sleep(100);
	}

	const noise = old ? OLD_NOISE : NEW_NOISE;
	const counted = {};
	for (const p of problems) {
		if (noise.some((re) => re.test(p.text))) continue;
		// "Failed to load resource" console lines repeat the http entries.
		if (p.kind === 'console' && /Failed to load resource/.test(p.text)) continue;
		const key = `${p.kind}: ${p.text.split('\n').slice(0, 3).join(' | ')}`;
		counted[key] = (counted[key] || 0) + 1;
	}
	const list = Object.entries(counted).map(([text, count]) => (count > 1 ? `${text} (x${count})` : text));
	const report = { id, variant, ok: list.length === 0, squadClicked: clicked, problems: list, shots: taken };
	fs.writeFileSync(path.join(outDir, `report-${variant}.json`), JSON.stringify(report, null, 1));
	console.log(JSON.stringify(report));
	summary.push(report);
	if (!report.ok) failed++;
	await page.close();
}

await b.close();
server.close();
if (ids.length > 1) {
	console.log(`\n${summary.filter((r) => r.ok).length}/${summary.length} ran clean`);
}
process.exit(failed ? 1 : 0);
