// Small Talk's radio: a short instrumental for each phase of the party,
// made with ElevenLabs Music, packed end to end into one file,
// assets/small-talk/radio.mp3, with where each sits written back into
// games/small-talk/vignettes.js (RADIO). The game plays them through a
// tinny little radio (sound.js); here they're kept clean. Tracks already
// made (same prompt) are kept in tools/out/small-talk-radio/.
//
//   node small-talk-radio.mjs
// Needs ~/.config/elevenlabs/key and ffmpeg.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { PROJECT } from './harness.mjs';

const KEY = fs.readFileSync(path.join(os.homedir(), '.config/elevenlabs/key'), 'utf8').trim();
const CACHE = path.join(PROJECT, 'tools/out/small-talk-radio');
fs.mkdirSync(CACHE, { recursive: true });
const FFMPEG = ['/opt/homebrew/bin/ffmpeg', '/opt/homebrew/Caskroom/mambaforge/base/bin/ffmpeg'].find((f) => fs.existsSync(f)) || 'ffmpeg';
const RATE = 22050;
const SECONDS = 30;

// One per phase, in vignettes.js PHASES order. All instrumental, all invented.
const TRACKS = [
	'Instrumental bland mid-tempo soft rock, clean electric guitar and gentle drums, unremarkable daytime radio filler, playing in an empty function room while tables are set up',
	'Instrumental light lounge jazz, gentle piano trio with upright bass and brushed drums, polite and unobtrusive, hotel lobby as guests arrive',
	'Instrumental smooth jazz, breathy saxophone melody over soft electric piano, slightly cheesy 1980s corporate party background music',
	'Instrumental bossa nova, nylon-string guitar and soft flute, relaxed dinner music for a buffet',
	'Instrumental sentimental slow piano ballad with soft strings, quiet and a little cheesy, a retirement tribute',
	'Instrumental upbeat 1970s disco, funky bass line, four-on-the-floor drums, strings and handclaps, a wedding dance floor',
	'Instrumental cheesy 1980s pop party anthem, big synths and big drums, sloppy late-night singalong energy',
	'Instrumental frantic polka with accordion, tuba and clarinet, far too cheerful and chaotic, as if nothing is wrong',
	'Instrumental slow melancholy music box waltz, sparse, slightly out of tune and winding down, lonely, the morning after',
];

async function compose(prompt, file) {
	for (let attempt = 0; attempt < 5; attempt++) {
		const res = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', {
			method: 'POST',
			headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
			body: JSON.stringify({ prompt, music_length_ms: SECONDS * 1000, model_id: 'music_v1' }),
		});
		if (res.ok) { fs.writeFileSync(file, Buffer.from(await res.arrayBuffer())); return; }
		const msg = await res.text();
		if (res.status !== 429) throw new Error(`${res.status} ${msg}`);
		console.log('  busy, waiting...');
		await new Promise((r) => setTimeout(r, 15000));
	}
	throw new Error('still busy');
}

function pcm(file) {
	const raw = execFileSync(FFMPEG, ['-v', 'quiet', '-i', file, '-f', 's16le', '-ac', '1', '-ar', String(RATE), '-'], { maxBuffer: 1 << 28 });
	return new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2).slice();
}

const parts = [];
const radio = [];
let at = 0;
for (const [i, prompt] of TRACKS.entries()) {
	const hash = crypto.createHash('md5').update(prompt + SECONDS).digest('hex').slice(0, 10);
	const file = path.join(CACHE, `${i}-${hash}.mp3`);
	if (!fs.existsSync(file)) { console.log(`composing ${i}...`); await compose(prompt, file); }
	const s = pcm(file);
	radio.push([+at.toFixed(3), +(s.length / RATE).toFixed(3)]);
	parts.push(s);
	at += s.length / RATE;
}
const all = new Int16Array(parts.reduce((a, s) => a + s.length, 0));
let o = 0;
for (const s of parts) { all.set(s, o); o += s.length; }
const rawFile = path.join(CACHE, 'all.raw');
fs.writeFileSync(rawFile, Buffer.from(all.buffer));
const out = path.join(PROJECT, 'assets/small-talk/radio.mp3');
execFileSync(FFMPEG, ['-v', 'quiet', '-y', '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-i', rawFile, '-b:a', '56k', out]);

const vf = path.join(PROJECT, 'games/small-talk/vignettes.js');
const src = fs.readFileSync(vf, 'utf8');
const body = 'export const RADIO = [\n' + radio.map((v, i) => `\t[${v[0]}, ${v[1]}],   // ${i}`).join('\n') + '\n];';
const block = `// RADIO-BEGIN\n${body}\n// RADIO-END`;
fs.writeFileSync(vf, /\/\/ RADIO-BEGIN/.test(src) ? src.replace(/\/\/ RADIO-BEGIN\n[\s\S]*?\n\/\/ RADIO-END/, block) : src.trimEnd() + '\n\n// Where each phase\'s radio music sits in assets/small-talk/radio.mp3: [offset, seconds].\n// Written by tools/small-talk-radio.mjs.\n' + block + '\n');
console.log(`${radio.length} tracks, ${at.toFixed(1)} s, ${(fs.statSync(out).size / 1024).toFixed(0)} KB -> assets/small-talk/radio.mp3`);
