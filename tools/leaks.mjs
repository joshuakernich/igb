// Checks that leaving a game really stops it: no timers, frame callbacks,
// jQuery tweens, music, Web Audio or speech left running afterwards.
//
//   node leaks.mjs                 every game in the manifest
//   node leaks.mjs mingle echo     some
//   --run=10                       seconds to play each game before leaving
//   --after=4                      seconds to watch after leaving
//
// Each game is started from the menu (#id), played with wiggling players,
// then left with the home button. Anything a game or shared component set
// up that still fires or plays after that is reported, with where it was
// created. Exit code 1 if anything leaked.

import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, sleep, PROJECT } from './harness.mjs';

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
	const a = argv.find((x) => x.startsWith(`--${name}=`));
	return a ? a.slice(name.length + 3) : fallback;
};
const RUN = parseFloat(opt('run', '10'));
const AFTER = parseFloat(opt('after', '4'));

// Every game id in the manifest.
function manifestIds() {
	const src = fs.readFileSync(path.join(PROJECT, 'games/manifest.js'), 'utf8');
	return [...src.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]);
}
let ids = argv.filter((a) => !a.startsWith('--'));
if (!ids.length) ids = manifestIds();

// Injected before anything loads: note where every timer, frame callback,
// media element, audio context and utterance comes from, and log any that
// fire (or start a sound) once window.__left is set. (The launcher's own
// chrome is left out: the menu's blueprint backdrop runs once the menu is back.)
function instrument() {
	const leak = window.__leak = { fired: new Map(), sounds: new Map(), media: new Set(), contexts: [] };
	const origin = function () {
		const lines = (new Error().stack || '').split('\n').slice(2);
		const line = lines.find((l) => /\/(games|shared|core)\//.test(l) && !/core\/(launcher|players|igb|home-bg)\.js/.test(l));
		return line ? line.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '') : null;
	};
	const note = function (map, key) {
		map.set(key, (map.get(key) || 0) + 1);
	};
	const wrap = function (kind, fn, where) {
		const made = window.__left ? ' (set after leaving)' : '';
		return function () {
			if (window.__left && where) note(leak.fired, kind + ' ' + where + made + (window.__stack && made ? ' ' + window.__stack : ''));
			return fn.apply(this, arguments);
		};
	};
	for (const name of ['setTimeout', 'setInterval']) {
		const orig = window[name];
		window[name] = function (fn, ms, ...rest) {
			if (typeof fn !== 'function') return orig.call(window, fn, ms, ...rest);
			return orig.call(window, wrap(name, fn, origin()), ms, ...rest);
		};
	}
	const raf = window.requestAnimationFrame;
	window.requestAnimationFrame = function (fn) {
		return raf.call(window, wrap('requestAnimationFrame', fn, origin()));
	};

	// media: anything played
	const play = HTMLMediaElement.prototype.play;
	HTMLMediaElement.prototype.play = function () {
		this.__origin = this.__origin || origin();
		leak.media.add(this);
		if (window.__left) note(leak.sounds, 'media.play ' + (this.__origin || '?') + ' ' + (this.currentSrc || this.src).replace(/^.*\/assets\//, 'assets/'));
		return play.apply(this, arguments);
	};

	// Web Audio: contexts, and every sound started after leaving
	const AC = window.AudioContext;
	if (AC) {
		window.AudioContext = window.webkitAudioContext = class extends AC {
			constructor(...args) {
				super(...args);
				this.__origin = origin();
				leak.contexts.push(this);
			}
		};
		const start = AudioScheduledSourceNode.prototype.start;
		AudioScheduledSourceNode.prototype.start = function () {
			if (window.__left) note(leak.sounds, 'webaudio.start ' + (this.context.__origin || '?'));
			return start.apply(this, arguments);
		};
	}

	// speech
	if (window.speechSynthesis) {
		const speak = speechSynthesis.speak.bind(speechSynthesis);
		speechSynthesis.speak = function (u) {
			if (window.__left) note(leak.sounds, 'speech "' + u.text + '" ' + origin());
			return speak(u);
		};
	}
}

const srv = await serve(PROJECT);
const b = await browser();
const report = [];

for (const id of ids) {
	const { page, problems } = await openPage(b, { width: 1280, height: 267 });
	await page.addInitScript(instrument);
	// wiggling players, so games actually get played
	await page.addInitScript(() => {
		let t = 0;
		setInterval(function () {
			t += 0.05;
			const pos = [0, 1, 2].map((i) => ({ X: Math.sin(t * (0.7 + i * 0.3) + i * 2) * 0.7, Y: 0, Z: Math.cos(t * (0.5 + i * 0.2) + i) * 0.6 }));
			if (window.forceMessage) window.forceMessage(JSON.stringify(pos) + '|');
		}, 50);
	});
	let result;
	try {
		await page.goto(`${srv.url}/index.html`, { timeout: 180000 });
		await page.waitForFunction(() => window.IGB && IGB.onFrame, null, { timeout: 60000 });
		// Frame listeners added through IGB.onFrame, with where they came from.
		await page.evaluate(() => {
			const on = IGB.onFrame;
			IGB.onFrame = function (fn) {
				const lines = (new Error().stack || '').split('\n').slice(2);
				const where = (lines.find((l) => /\/(games|shared)\//.test(l)) || '').trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '');
				return on(function (time) {
					if (window.__left && where) window.__leak.fired.set('IGB.onFrame ' + where, (window.__leak.fired.get('IGB.onFrame ' + where) || 0) + 1);
					return fn(time);
				});
			};
			// Watch from the moment the game has actually stopped.
			const stop = IGB.stop;
			IGB.stop = function (game) {
				const r = stop.apply(this, arguments);
				if (window.__leaving) window.__left = performance.now();
				return r;
			};
			location.hash = '';
		});
		await page.evaluate((id) => { location.hash = id; }, id);
		await sleep(1500);
		// pick a squad if asked
		await page.evaluate(() => {
			const btn = document.querySelector('button[count="3"]') || document.querySelector('button[count]');
			if (btn) btn.click();
		});
		await sleep(RUN * 1000);

		// Leave: the home button, as a person would.
		const before = await page.evaluate(() => ({
			running: !!IGB.current,
			contexts: window.__leak.contexts.length,
			media: [...window.__leak.media].filter((m) => !m.paused).length,
		}));
		await page.evaluate(() => {
			window.__leaving = true;
			document.querySelector('[btn=home]').click();
		});
		await sleep(AFTER * 1000);
		result = await page.evaluate(() => {
			const L = window.__leak;
			const out = [];
			for (const [k, n] of L.fired) out.push(`${k} ×${n}`);
			for (const [k, n] of L.sounds) out.push(`${k} ×${n}`);
			for (const m of L.media) if (!m.paused && !m.ended) out.push(`media still playing ${(m.currentSrc || m.src).replace(/^.*\/assets\//, 'assets/')} from ${m.__origin}`);
			for (const c of L.contexts) if (c.state === 'running') out.push(`AudioContext still running from ${c.__origin}`);
			if (window.speechSynthesis && (speechSynthesis.speaking || speechSynthesis.pending)) out.push('speech still speaking');
			const tweens = (window.jQuery ? jQuery.timers : []).filter((t) => !(t.elem && t.elem.nodeType && t.elem.closest && t.elem.closest('igb-ripple, igb-controls, igb-menu')));
			for (const t of tweens) out.push(`jQuery tween still running on ${t.elem && t.elem.nodeType ? t.elem.tagName : 'a plain object'} (${Object.keys(t.elem || {}).slice(0, 4).join(',')})`);
			if (IGB.current) out.push('IGB.current still set');
			if (document.querySelector('igb-stage')) out.push('a stage is still in the page');
			return out;
		});
		result = { id, started: before.running, leaks: result, problems: problems.filter((p) => !/favicon/.test(p.text)).map((p) => p.text.slice(0, 160)) };
	} catch (err) {
		result = { id, error: String(err).slice(0, 200), leaks: [], problems: [] };
	}
	report.push(result);
	const status = result.error ? 'ERROR ' + result.error : result.leaks.length ? 'LEAKS' : 'clean';
	console.log(`${id}: ${status}${result.started === false ? ' (never started?)' : ''}`);
	for (const l of result.leaks) console.log('   ' + l);
	await page.close();
}

fs.mkdirSync(path.join(PROJECT, 'tools/out'), { recursive: true });
fs.writeFileSync(path.join(PROJECT, 'tools/out/leaks.json'), JSON.stringify(report, null, 1));
const bad = report.filter((r) => r.error || r.leaks.length);
console.log(`\n${report.length - bad.length}/${report.length} clean`);
await b.close();
srv.close();
process.exit(bad.length ? 1 : 0);
