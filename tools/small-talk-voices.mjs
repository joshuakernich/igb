// Small Talk's voices: every line in games/small-talk/vignettes.js, spoken
// by its character's ElevenLabs voice, packed end to end into one file,
// assets/small-talk/voices.mp3, with where each line sits written back into
// vignettes.js (VOICES). Lines already made (same voice, same words) are
// kept in tools/out/small-talk-vo/ and not asked for again.
//
//   node small-talk-voices.mjs
// Needs ~/.config/elevenlabs/key and ffmpeg.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { PROJECT } from './harness.mjs';

const { CAST, PHASES } = await import(path.join(PROJECT, 'games/small-talk/vignettes.js'));
const KEY = fs.readFileSync(path.join(os.homedir(), '.config/elevenlabs/key'), 'utf8').trim();
const CACHE = path.join(PROJECT, 'tools/out/small-talk-vo');
fs.mkdirSync(CACHE, { recursive: true });
const FFMPEG = ['/opt/homebrew/bin/ffmpeg', '/opt/homebrew/Caskroom/mambaforge/base/bin/ffmpeg'].find((f) => fs.existsSync(f)) || 'ffmpeg';
const RATE = 24000;
const GAP = 0.25;   // seconds of silence between lines

const SETTINGS = { stability: 0.4, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true };

async function speak(voice, text, file) {
	const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
		method: 'POST',
		headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
		body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: SETTINGS }),
	});
	if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
	fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

// Raw 16-bit mono at RATE, with the silence trimmed off both ends.
function pcm(file) {
	const raw = execFileSync(FFMPEG, ['-v', 'quiet', '-i', file, '-f', 's16le', '-ac', '1', '-ar', String(RATE), '-'], { maxBuffer: 1 << 28 });
	const s = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2);
	const loud = (v) => Math.abs(v) > 500;
	let a = 0, b = s.length;
	while (a < b && !loud(s[a])) a++;
	while (b > a && !loud(s[b - 1])) b--;
	a = Math.max(0, a - Math.round(RATE * 0.03));
	b = Math.min(s.length, b + Math.round(RATE * 0.06));
	return s.slice(a, b);
}

const parts = [];
const voices = {};
let at = 0;
let made = 0;
for (const [p, phase] of PHASES.entries()) {
	for (const [i, [t, who, text]] of phase.lines.entries()) {
		const key = `${p}-${i}`;
		const voice = CAST[who].voice;
		const hash = crypto.createHash('md5').update(voice + '|' + text + '|' + JSON.stringify(SETTINGS)).digest('hex').slice(0, 10);
		const file = path.join(CACHE, `${key}-${hash}.mp3`);
		if (!fs.existsSync(file)) { await speak(voice, text, file); made++; }
		const s = pcm(file);
		const secs = s.length / RATE;
		voices[key] = [+at.toFixed(3), +secs.toFixed(3)];
		parts.push(s, new Int16Array(Math.round(GAP * RATE)));
		at += secs + GAP;
		// warn when a line runs into the next one, or past the end of the scene
		const next = phase.lines[i + 1];
		const end = t + secs;
		if (next && end > next[0] - 0.1) console.log(`  ${phase.id} line ${i} (${who}) ends at ${end.toFixed(2)}, next starts ${next[0]}`);
		if (!next && end > phase.length - 0.3) console.log(`  ${phase.id} last line ends at ${end.toFixed(2)} of ${phase.length}`);
	}
}
const total = parts.reduce((a, s) => a + s.length, 0);
const all = new Int16Array(total);
let o = 0;
for (const s of parts) { all.set(s, o); o += s.length; }
const rawFile = path.join(CACHE, 'all.raw');
fs.writeFileSync(rawFile, Buffer.from(all.buffer));
const out = path.join(PROJECT, 'assets/small-talk/voices.mp3');
fs.mkdirSync(path.dirname(out), { recursive: true });
execFileSync(FFMPEG, ['-v', 'quiet', '-y', '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-i', rawFile, '-b:a', '64k', out]);

// write the offsets into vignettes.js
const vf = path.join(PROJECT, 'games/small-talk/vignettes.js');
const src = fs.readFileSync(vf, 'utf8');
const body = 'export const VOICES = {\n' + Object.entries(voices).map(([k, v]) => `\t'${k}': [${v[0]}, ${v[1]}],`).join('\n') + '\n};';
fs.writeFileSync(vf, src.replace(/\/\/ VOICES-BEGIN\n[\s\S]*?\n\/\/ VOICES-END/, `// VOICES-BEGIN\n${body}\n// VOICES-END`));
console.log(`${Object.keys(voices).length} lines (${made} new), ${at.toFixed(1)} s, ${(fs.statSync(out).size / 1024).toFixed(0)} KB -> assets/small-talk/voices.mp3`);
