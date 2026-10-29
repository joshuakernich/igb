/*
 * Boogie Woods
 *
 * A glistening, enchanted forest that plays music. The walls look out from
 * the middle of a clearing, and every creature in it bounces to the beat:
 * mushroom folk, frogs, hedgehogs, snails, owls, gnomes, fairies, singing
 * flowers, bunnies and one enormous troll, all with vintage cartoon faces
 * (tall eyes, pie-cut pupils, a toothy grin), noodly limbs and white gloves.
 *
 * The room is the clearing's floor, 1:1, and each creature stands just
 * beyond a wall. Everything you do lands on the beat:
 *   stand in front of a creature   it sings its part, over and over, while you stay
 *   touch it (low on the wall,     its trick: a mushroom fires its cap, a frog its
 *   where you can reach)           tongue, a gnome its hat, the troll drums its belly...
 *   jump                           the whole clearing hops, with a crash
 *   squat                          everyone ducks, with a big low BWOMP
 *   run about                      a shaker follows you
 * So a room of kids makes a band: the more creatures with someone in front
 * of them, the fuller the song.
 *
 * Five clearings, each with its own motif, creatures, key and tempo; the
 * camera glides down the forest path to the next every hundred seconds:
 *   MUSHROOM HOLLOW   the mushroom folk's marimba, under glowing giant toadstools
 *   FROGGY BOG        a croaking frog choir by a moonlit pond under a waterfall; wade in and your own tone shimmers
 *   HEDGEHOG HOEDOWN  a hedgehog drummer, kazoo bunnies and a tuba troll on a log stage
 *   FAIRY RING        bell-ringing fairies and a flower choir, and a mossy stone wall
 *                     overgrown with ivy and ferns, set with odd-shaped stones: a step
 *                     sequencer, 8 steps by 5 notes; touch a stone to light it, and a
 *                     shaft of light plays the wall left to right
 *   TROLL BRIDGE      the whole gang under a mossy bridge, and a stepping-stone piano
 *                     round the foot of all three walls: walk along near a wall
 *                     and each stone you step on plays its note, live
 *
 * Drawn in 3D (three.js, the shared wall rig and bloom): three cameras back to
 * back on one rig, so the three walls are one panorama. The music is all
 * synthesised here, on a clock everything else follows.
 *
 * Input: px / pz (where you stand; pz is 1 at the front wall), py (jumps and
 * squats), and touches low on a wall from a player near enough to reach them.
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { createWallComposer, createWallRig, canvasTexture, environmentFromShader, toScreen } from '../../lib/three/walls.js';
import { ShaderPass } from '../../lib/three/addons/postprocessing/ShaderPass.js';
import { mergeGeometries } from '../../lib/three/addons/utils/BufferGeometryUtils.js';

IGB.register('boogie-woods', function BoogieWoods(stage, playersMeta) {

	const self = this;
	const { W, H } = IGB;
	const WIDTH = IGB.WIDTH || W * 3;
	const art = IGB.art;
	const SECONDS = 600;
	const FONT = 'Lexend';
	const INK = '#140a26';

	/* ---------- tuning ---------- */

	const R = 2.6;                // the room's half-width, in forest metres (the room is the clearing's floor, 1:1)
	const EYE = 1.25;             // the walls look out from this high (a child's eye)
	const SPACING = 48;           // metres between clearings along the path
	const CLEARING_TIME = 100;    // seconds in each clearing before the path moves on
	const GLIDE = 6.5;            // seconds walking the path to the next
	const STAND = 0.17;           // standing this near a creature's spot (a share of the room) makes it sing
	const DEVICE_REACH = 0.34;    // (the stone wall and the web: a big target; a touch counts from anyone this near it)
	const REACH = 0.2;            // a touch counts from a player this near that spot on the wall
	const TOUCH_TOP = 0.4;        // ...and only below this far down the wall (where a child can reach)
	const JUMP = 0.075;           // rising this far above your usual height is a jump
	const SQUAT = 0.13;           // ...and sinking this far, a squat
	// The avatars go further than you do (a step toward a wall carries them well out),
	// but only so far: they reach AV_MAX from the middle when you're 70% of the way to
	// a wall, and stop there. Creatures and scenery stand beyond it; the things you stand
	// on or in (the moonbeams, the piano) are laid out inside it, where the avatars go.
	const AV_MAX = 2.45, AV_K = AV_MAX / (0.7 * R);
	const avCap = (v) => Math.sign(v) * Math.min(Math.abs(v) * AV_K, AV_MAX);
	const avatarAt = (px, pz) => ({ x: avCap((px - 0.5) * 2 * R), z: avCap((0.5 - pz) * 2 * R) });   // (from the clearing's middle)
	const RUN = 0.42;             // moving faster than this (rooms a second) shakes the shaker

	/* ---------- the music ---------- */

	const PENTA = [0, 2, 4, 7, 9];
	const freqOf = (root, deg) => root * Math.pow(2, (PENTA[((deg % 5) + 5) % 5] + 12 * Math.floor(deg / 5)) / 12);
	const n = null;
	const PAT = {
		mel1: [0, n, n, n, 2, n, n, n, 4, n, n, n, 2, n, n, n],
		mel2: [n, n, 4, n, n, n, 3, n, n, n, 4, n, n, n, 5, n],
		mel3: [0, n, 2, n, 4, n, 2, n, 0, n, 2, n, 4, n, 7, n],
		mel4: [7, n, n, 5, n, n, 4, n, 5, n, n, 4, n, n, 2, n],
		off: [n, n, 0, n, n, n, 0, n, n, n, 0, n, n, n, 0, n],
		croak: [0, n, n, 0, n, n, 2, n, 0, n, n, 0, n, n, 4, n],
		bass: [0, n, n, 0, n, n, 0, n, 0, n, n, 0, n, n, 3, n],
		bass2: [0, n, n, n, 0, n, 2, n, n, n, 3, n, 2, n, n, n],
		drum: ['k', n, 'h', n, 's', n, 'h', 'k', 'k', n, 'h', n, 's', n, 't', 't'],
		drum2: ['t', n, n, 't', n, n, 't', n, 't', n, 't', n, 't', 't', 't', 't'],
		vox: [0, n, n, n, n, n, n, n, 2, n, n, n, n, n, n, n],
		hey: [n, n, n, n, 0, n, n, n, n, n, n, n, 0, n, 0, n],
		hoot: [n, n, n, n, 0, n, n, 0, n, n, n, n, n, n, n, n],
		bells: [0, 2, 4, 7, n, n, n, n, 2, 4, 7, 9, n, n, n, n],
		bells2: [n, n, n, n, 9, 7, 4, 2, n, n, n, n, 7, n, 9, n],
		kazoo: [0, n, 0, 2, n, n, 4, n, 2, n, 0, n, n, n, n, n],
		tuba: [0, n, n, n, n, n, n, n, 3, n, n, n, 2, n, n, n],
	};

	/* ---------- little helpers ---------- */

	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const lerp = (a, b, k) => a + (b - a) * k;
	const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
	const colour = (n) => (window.PLAYER_COLORS && PLAYER_COLORS[n]) || '#ffffff';
	let seed = 1234;
	const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
	const rr = (a, b) => a + rnd() * (b - a);

	/* ---------- the clearings ---------- */
	// each creature: its kind, the wall it stands beyond (0 left, 1 front, 2 right),
	// how far along that wall (as the wall shows it), how far out past it, its note
	// and its pattern

	const CLEARINGS = [
		{ name: 'MUSHROOM HOLLOW', sub: 'SQUAT BY A PUMPKIN · STRUM THE SPIDERWEB', bpm: 100, root: 261.6, puffballs: [[0, 0.2], [0, 0.5], [0, 0.8]], web: [2, 0.5],
			sky: ['#2a1450', '#ff8fb8'], fog: '#5a2a5e', ground: '#5d7a3a', sun: '#ffb27a', lights: ['#ff5fd0', '#7affd8', '#ffd04a', '#8a7aff'],
			groove: { kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], snare: [] },
			motif: 'mushrooms',
			creatures: [
				{ kind: 'mushroom', wall: 1, along: 0.3, out: 0.7, note: 5, pat: 'mel1', tint: '#e8323c' },
				{ kind: 'bunny', wall: 1, along: 0.7, out: 0.5, note: 5, pat: 'kazoo', tint: '#d9c2a6' },
				{ kind: 'mushroom', wall: 1, along: 0.1, out: 0.6, note: 7, pat: 'mel2', tint: '#ff7a1a', big: 1.1 },
				{ kind: 'frog', wall: 1, along: 0.5, out: 0.4, note: 0, pat: 'croak', tint: '#4cc26a' },
				{ kind: 'mushroom', wall: 1, along: 0.9, out: 0.7, note: 9, pat: 'mel3', tint: '#7a4cff', big: 0.9 },
			] },
		{ name: 'FROGGY BOG', sub: 'WADE THROUGH THE POND TO MAKE IT SHIMMER', bpm: 92, root: 220, pond: true,
			sky: ['#061a2e', '#2f8a9a'], fog: '#123e4a', ground: '#2f5a3a', sun: '#bfe8ff', lights: ['#4affd0', '#7ab8ff', '#d8ff6a', '#4a8aff'],
			groove: { kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1], snare: [] },
			motif: 'pond',
			creatures: [
				{ kind: 'owl', wall: 0, along: 0.18, out: 0.8, note: 5, pat: 'hoot', tint: '#8a6a4a' },
				{ kind: 'frog', wall: 0, along: 0.5, out: 0.5, note: 2, pat: 'mel1', tint: '#3ad07a' },
				{ kind: 'frog', wall: 0, along: 0.82, out: 0.5, note: 4, pat: 'off', tint: '#9ad040' },
				{ kind: 'snail', wall: 2, along: 0.38, out: 0.4, note: -5, pat: 'bass', tint: '#ff9ad0' },
				{ kind: 'frog', wall: 2, along: 0.62, out: 0.5, note: 7, pat: 'mel2', tint: '#2ac0b0', big: 1.25 },
				{ kind: 'fairy', wall: 2, along: 0.15, out: 0.6, note: 10, pat: 'bells', tint: '#7affe8' },
				{ kind: 'frog', wall: 2, along: 0.86, out: 0.5, note: 0, pat: 'croak', tint: '#6a9a2a', big: 1.5 },
			] },
		{ name: 'HEDGEHOG HOEDOWN', sub: 'MOVE LEFT AND RIGHT: LINE YOUR ACORN UP WITH A PLANK TO PLAY IT', bpm: 116, root: 293.7, xylo: true,
			sky: ['#3a6aa0', '#ffd68a'], fog: '#c8a070', ground: '#7a8a3a', sun: '#ffe6a0', lights: ['#ffb24a', '#ff6a4a', '#ffe04a', '#ff8ad0'],
			groove: { kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
			motif: 'stage',
			creatures: [
				{ kind: 'bunny', wall: 0, along: 0.13, out: 0.5, note: 7, pat: 'kazoo', tint: '#f2e6d8' },
				{ kind: 'gnome', wall: 0, along: 0.9, out: 0.6, note: 5, pat: 'hey', tint: '#e8323c' },
				{ kind: 'hedgehog', wall: 0, along: 0.38, out: 0.4, note: 0, pat: 'drum', tint: '#8a5a3a' },
				{ kind: 'troll', wall: 0, along: 0.65, out: 1.3, note: -10, pat: 'tuba', tint: '#6a8a5a' },
				{ kind: 'hedgehog', wall: 2, along: 0.42, out: 0.4, note: 0, pat: 'drum2', tint: '#a07040', big: 0.85 },
				{ kind: 'gnome', wall: 2, along: 0.15, out: 0.6, note: 7, pat: 'vox', tint: '#32cd32' },
				{ kind: 'bunny', wall: 2, along: 0.72, out: 0.5, note: 9, pat: 'mel3', tint: '#c8a07a' },
			] },
		{ name: 'FAIRY RING', sub: 'TOUCH THE STONES IN THE WALL · STAND IN A MOONBEAM AND RISE AND DIP', bpm: 92, root: 329.6, grid: true, theremin: [2, [0.25, 0.5, 0.75]],
			sky: ['#0a0420', '#5a2a9a'], fog: '#2a1450', ground: '#3a4a3a', sun: '#c8b8ff', lights: ['#ff7aff', '#7ad8ff', '#fff07a', '#b07aff'],
			groove: { kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], hat: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], snare: [] },
			motif: 'ring',
			creatures: [
				{ kind: 'flower', wall: 0, along: 0.13, out: 0.5, note: 0, pat: 'vox', tint: '#ff4fa8' },
				{ kind: 'fairy', wall: 0, along: 0.38, out: 0.6, note: 10, pat: 'bells', tint: '#ffd0ff' },
				{ kind: 'fairy', wall: 0, along: 0.62, out: 0.6, note: 12, pat: 'bells2', tint: '#a0ffd0' },
				{ kind: 'snail', wall: 0, along: 0.87, out: 0.5, note: -5, pat: 'bass2', tint: '#b07aff' },
			] },
		{ name: 'TROLL BRIDGE', sub: 'WALK THE STEPPING STONES ON THE LEFT · SWIPE THE CHIMES UNDER THE ARCH', bpm: 108, root: 246.9, piano: 0, chimes: true,
			sky: ['#1a3a3a', '#a8e0a0'], fog: '#3a6a5a', ground: '#4a6a3a', sun: '#e8ffc8', lights: ['#a8ff6a', '#ff8a4a', '#6affff', '#ff5fd0'],
			groove: { kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
			motif: 'bridge',
			creatures: [
				{ kind: 'mushroom', wall: 2, along: 0.1, out: 0.6, note: 7, pat: 'mel1', tint: '#e8323c' },
				{ kind: 'troll', wall: 2, along: 0.32, out: 1.5, note: -10, pat: 'tuba', tint: '#5a7a8a' },
				{ kind: 'hedgehog', wall: 2, along: 0.55, out: 0.4, note: 0, pat: 'drum', tint: '#7a4a2a' },
				{ kind: 'snail', wall: 2, along: 0.74, out: 0.5, note: -5, pat: 'bass2', tint: '#ffd23a' },
				{ kind: 'fairy', wall: 2, along: 0.92, out: 0.6, note: 12, pat: 'bells', tint: '#ff9ad0' },
			] },
	];
	// The path between clearings winds: from clearing s to s + 1 it swings out and
	// back (x is 0 at both ends, and straight on at both ends, so the walls arrive square).
	const PATH_AMP = [3.6, -3.2, 3.0, -3.4];
	const pathX = (s, t) => (PATH_AMP[s] || 0) * Math.pow(Math.sin(Math.PI * t), 2) * Math.sin(2 * Math.PI * t) * 1.6;
	const pathSlope = (s, t) => (pathX(s, t + 0.001) - pathX(s, t - 0.001)) / (0.002 * SPACING);   // (dx per metre along)
	function pathDist(x, z) {
		const s = Math.floor(-z / SPACING), t = -z / SPACING - s;
		if (s < 0 || s >= PATH_AMP.length) return Math.abs(x);
		return Math.abs(x - pathX(s, t)) / Math.sqrt(1 + Math.pow(pathSlope(s, t), 2));
	}
	// Side walls: no more than 4 creatures each, spread over the front 3/4 of the wall, leaving
	// the back quarter of the screen clear (the back is the left edge of the left wall, the right
	// edge of the right wall).
	// Every wall keeps 1/8 of its width clear at each end, too.
	const SIDE = { 0: [0.25, 7 / 8], 1: [1 / 8, 7 / 8], 2: [1 / 8, 0.75] };
	for (const C of CLEARINGS) for (const w of [0, 1, 2]) {
		const list = C.creatures.filter((d) => d.wall === w).sort((a2, b2) => (w === 0 ? b2.along - a2.along : a2.along - b2.along));
		if (w !== 1) for (const d of list.slice(4)) C.creatures.splice(C.creatures.indexOf(d), 1);
		const keep = (w === 1 ? list : list.slice(0, 4)).sort((a2, b2) => a2.along - b2.along), [lo, hi] = SIDE[w];
		keep.forEach((d, k) => { d.along = lo + (k + 0.5) / keep.length * (hi - lo); });
	}
	// the moonbeams keep to the same rules: spread over their wall's span the way the creatures are
	for (const C of CLEARINGS) if (C.theremin) {
		const [w, al] = C.theremin, [lo, hi] = SIDE[w];
		C.theremin = [w, al.map((_, k) => lo + (k + 0.5) / al.length * (hi - lo))];
	}
	if (CLEARINGS[0].puffballs) CLEARINGS[0].puffballs = [[0, 0.35], [0, 0.6], [0, 0.84]];
	const CHORDS = [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]];
	// each clearing's sky: where its sun (or moon) hangs, ahead, and the glow round the horizon
	const SKY = [
		{ dir: [0.42, 0.13, -1], glow: '#ffa080', night: 0 },
		{ dir: [-0.35, 0.32, -1], glow: '#4ad0c8', night: 1 },
		{ dir: [0.55, 0.26, -1], glow: '#ffd890', night: 0 },
		{ dir: [0.3, 0.38, -1], glow: '#b07aff', night: 1 },
		{ dir: [-0.5, 0.2, -1], glow: '#d8ffc8', night: 0 },
	];   // I vi IV V, a bar each

	/* ---------- state ---------- */

	let count = 0;
	let scores = [];
	let latest = [];
	const pl = [];                // the players: their puffball, how they move
	let phase = 'off';            // 'tutorial', 'intro', 'play' or 'off'
	let here = 0;                 // the clearing the walls are in
	let glide = null;             // { from, to, t } while walking the path
	let clearT = 0;
	let banner = null;
	let floaters = [];
	let ripples = [];
	let t = 0;
	const tut = { sung: [], touched: [], jumped: [], lit: [] };

	/* ---------- the show ---------- */

	const show = new Showtime(stage, {
		id: 'boogie-woods',
		seconds: SECONDS,
		players: () => count,
		scores: () => scores,
		music: false,
		theme: { accent: '#ff5fb0', accent2: '#a8ff3e', gold: '#ffe27a', sky: ['#120826', '#2a1450'], glow: 'rgba(168,255,62,0.35)' },
		rivals: ['THE TOADSTOOL TOOTERS', 'BOG ROCKERS', 'THE NOODLE ARMS', 'GNOME SWEET GNOME', 'THE FUNGI FUNK', 'HOOT & HOLLER', 'SNAIL TRAIL', 'THE PIE-EYED PIPERS'],
		drawAvatar(ctx, n, x, y, scale) { drawPuff2D(ctx, n, x, y, 130 * scale); },
		menu: { restart: () => { goTo(here, true); } },
	});

	const enough = (arr) => arr.filter(Boolean).length >= Math.min(count, 3);
	const TUTORIAL = [
		{ caption: 'STAND IN FRONT OF A CREATURE TO MAKE IT SING', min: 3, max: 25, did: () => enough(tut.sung) },
		{ caption: 'TOUCH ONE, LOW ON THE WALL, FOR A TRICK', min: 2, max: 25, did: () => enough(tut.touched) },
		{ caption: 'NOW EVERYBODY JUMP!', min: 2, max: 15, did: () => enough(tut.jumped) },
	];

	show.sequence([
		{ id: 'squad', length: Infinity },
		show.beats.titleDrop(),
		show.beats.clockIntro(),
		show.beats.visors(),
		show.beats.tutorial({
			steps: TUTORIAL,
			enter() { phase = 'tutorial'; tut.sung = []; tut.touched = []; tut.jumped = []; tut.lit = []; goTo(0, true); },
			update(dt) { tick(dt); },
		}),
		{
			id: 'intro',
			length: 5,
			enter() { phase = 'intro'; scores = scores.map(() => 0); },
			update(dt) { tick(dt); },
			draw(ctx, bt) {
				show.onWalls(ctx, function (c) {
					show.slam(c, 'THE WOODS', W / 2, 250, 110, bt - 0.2, { font: 'Shrikhand', exact: true, fill: '#a8ff3e' });
					show.slam(c, 'WANT TO BOOGIE!', W / 2, 370, 96, bt - 0.8, { font: 'Shrikhand', exact: true, fill: '#ff5fb0' });
					show.slam(c, 'EVERY CREATURE IS AN INSTRUMENT', W / 2, 480, 50, bt - 1.6, { fill: 'white' });
				});
			},
		},
		{
			id: 'play',
			length: Infinity,
			enter() { phase = 'play'; clearT = 0; announce(); },
			update(dt) {
				tick(dt);
				show.record(t, latest.slice(0, count));
			},
			draw(ctx) { drawBanner(ctx); },
		},
		show.beats.timeUp({ enter() { phase = 'off'; banner = null; } }),
		show.beats.scores(),
		show.beats.rank(),
		show.beats.team(),
		show.beats.board(),
		show.beats.replay(),
		show.beats.rate(),
		show.beats.end({
			enter() { IGB.complete(scoresToRewards(scores)); },
		}),
	]);

	function initGame(nPlayers) {
		count = nPlayers;
		scores = new Array(nPlayers).fill(0);
		for (let i = 0; i < nPlayers; i++) {
			pl.push({ shim: null, shimE: 0, x: 0, z: 0, seen: false, base: null, jumpT: 0, squatT: 0, squatting: false, speed: 0, prev: null, mesh: buildPuff(i), at: -1 });
		}
		show.go('title');
	}

	function announce() {
		const c = CLEARINGS[here];
		banner = { title: c.name, sub: c.sub, t: 0 };
	}

	/* ---------- the clock and the synth ---------- */

	const AC = window.AudioContext || window.webkitAudioContext;
	const ac = AC ? new AC() : null;
	let bus = null, noiseBuf = null;
	const pans = [];
	if (ac) {
		const comp = ac.createDynamicsCompressor();
		comp.threshold.value = -16;
		comp.ratio.value = 4;
		bus = ac.createGain();
		bus.gain.value = 0.85;
		bus.connect(comp).connect(ac.destination);
		// a little room: a feedback delay, filtered, under everything
		const send = ac.createGain(); send.gain.value = 0.22;
		const dl = ac.createDelay(1); dl.delayTime.value = 0.23;
		const fb = ac.createGain(); fb.gain.value = 0.32;
		const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
		bus.connect(send).connect(dl).connect(lp).connect(fb).connect(dl);
		lp.connect(comp);
		for (const p of [-0.75, 0, 0.75]) { const s = ac.createStereoPanner(); s.pan.value = p; s.connect(bus); pans.push(s); }
		noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
		const d = noiseBuf.getChannelData(0);
		for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
	}
	const resume = () => { if (ac && ac.state !== 'running') ac.resume().catch(() => {}); };
	// a voice that holds while you hold it: a pumpkin's drone, the moonbeam's whistle
	// a held shimmer: glassy sine partials through a lowpass, trembling; set(e, pan) swells
	// it (louder, brighter, the upper partials blooming, the tremble quicker) and leans it
	// left or right; stop() lets it ring away
	function shimmerVoice(f, wall) {
		const t0 = ac.currentTime;
		const g = ac.createGain();
		g.gain.setValueAtTime(0.0001, t0);
		const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
		if (pan) { g.connect(pan); pan.connect(pans[wall] || bus); } else g.connect(pans[wall] || bus);
		const trem = ac.createGain(); trem.gain.value = 1; trem.connect(g);
		const lp = filt('lowpass', 900, 0.8, trem);
		const parts = [[1, 1, 0], [2, 0.5, 4], [3.01, 0.35, -5], [4.2, 0.25, 7], [6.3, 0.16, -8], [8.1, 0.1, 9]].map(([m, a, det]) => {
			const pg = ac.createGain(); pg.gain.value = m === 1 ? a : 0; pg.connect(lp);
			const o = osc('sine', f * m, t0, 600, pg); o.detune.value = det;
			const o2 = osc('sine', f * m, t0, 600, pg); o2.detune.value = det + 7;   // (a slow beating twin)
			return { pg, a, m, oscs: [o, o2] };
		});
		const lfo = ac.createOscillator(), lg = ac.createGain();
		lfo.frequency.value = 3; lg.gain.value = 0.15;
		lfo.connect(lg).connect(trem.gain); lfo.start(t0); lfo.stop(t0 + 600);
		return {
			set(e, p) {
				const t = ac.currentTime;
				g.gain.setTargetAtTime(0.0001 + e * 0.13, t, 0.08);
				lp.frequency.setTargetAtTime(700 + e * e * 7000, t, 0.1);
				for (const pt of parts) if (pt.m > 1) pt.pg.gain.setTargetAtTime(pt.a * clamp(e * 1.6 - pt.m * 0.08, 0, 1), t, 0.15);
				lfo.frequency.setTargetAtTime(2.5 + e * 7, t, 0.2);
				lg.gain.setTargetAtTime(0.1 + e * 0.25, t, 0.2);
				if (pan) pan.pan.setTargetAtTime(clamp(p, -1, 1) * 0.6, t, 0.1);
			},
			stop() { const t = ac.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0.0001, t, 0.15); for (const pt of parts) for (const o of pt.oscs) o.stop(t + 1); lfo.stop(t + 1); },
		};
	}
	function holdVoice(f, kind, wall) {
		if (!audioOn()) return null;
		const t0 = ac.currentTime;
		const g = ac.createGain();
		g.gain.setValueAtTime(0.0001, t0);
		g.gain.linearRampToValueAtTime(kind === 'drone' ? 0.16 : 0.14, t0 + 0.15);
		g.connect(pans[wall] || bus);
		const lp = filt('lowpass', kind === 'drone' ? 420 : 2400, kind === 'drone' ? 5 : 0.7, g);
		const oscs = (kind === 'drone' ? [['sawtooth', 1], ['sawtooth', 1.007], ['sine', 0.5]] : [['sine', 1], ['triangle', 2.002]]).map(([type, m]) => { const o = osc(type, f * m, t0, 600, lp); o.mult = m; return o; });
		const lfo = ac.createOscillator(), lg = ac.createGain();
		lfo.frequency.value = kind === 'drone' ? 0.6 : 5.5; lg.gain.value = f * (kind === 'drone' ? 0.004 : 0.012);
		lfo.connect(lg); for (const o of oscs) lg.connect(o.frequency);
		lfo.start(t0); lfo.stop(t0 + 600);
		return {
			glide(nf) { const t = ac.currentTime; for (const o of oscs) o.frequency.setTargetAtTime(nf * o.mult, t, 0.05); lg.gain.setTargetAtTime(nf * (kind === 'drone' ? 0.004 : 0.012), t, 0.05); },
			stop() { const t = ac.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0.0001, t, 0.12); for (const o of oscs) o.stop(t + 0.8); lfo.stop(t + 0.8); },
		};
	}
	stage.$el[0].addEventListener('pointerdown', resume, true);
	const audioOn = () => ac && ac.state === 'running';
	const perf0 = performance.now() / 1000;
	let clockOff = 0;   // (when the audio isn't running yet, the clock runs off the page's own)
	const clock = () => (audioOn() ? ac.currentTime : performance.now() / 1000 - perf0 + clockOff);
	let lastAudio = false;

	// a gain with an envelope, into a wall's panner (or the middle)
	function vca(time, attack, peak, decay, wall = 1) {
		const g = ac.createGain();
		g.gain.setValueAtTime(0.0001, time);
		g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
		g.connect(pans[wall] || bus);
		return g;
	}
	function osc(type, f, time, len, into) {
		const o = ac.createOscillator();
		o.type = type;
		o.frequency.setValueAtTime(f, time);
		o.connect(into);
		o.start(time);
		o.stop(time + len + 0.05);
		return o;
	}
	function noise(time, len, into) {
		const s = ac.createBufferSource();
		s.buffer = noiseBuf;
		s.connect(into);
		s.start(time, Math.random() * 0.5);
		s.stop(time + len + 0.05);
		return s;
	}
	function filt(type, f, q, into) {
		const b = ac.createBiquadFilter();
		b.type = type; b.frequency.value = f; b.Q.value = q;
		b.connect(into);
		return b;
	}
	const VOWEL = { a: [800, 1150], o: [450, 800], u: [325, 700], e: [400, 2100], ey: [550, 1900] };
	const SND = {
		mallet(time, f, v, w) {
			const g = vca(time, 0.002, v, 0.55, w);
			osc('sine', f, time, 0.6, g);
			const g2 = vca(time, 0.001, v * 0.35, 0.12, w);
			osc('sine', f * 4, time, 0.15, g2);
			if (f * 9.7 < 18000) { const g3 = vca(time, 0.001, v * 0.15, 0.03, w); osc('sine', f * 9.7, time, 0.05, g3); }
		},
		bell(time, f, v, w) {
			[[1, 1, 1.4], [2.01, 0.5, 1], [2.76, 0.35, 0.7], [5.4, 0.2, 0.35]].forEach(([m, a, d]) => {
				const g = vca(time, 0.002, v * a * 0.6, d, w);
				osc('sine', f * m, time, d + 0.1, g);
			});
		},
		croak(time, f, v, w) {
			for (const dt of [0, 0.085]) {
				const g = vca(time + dt, 0.008, v * (dt ? 0.7 : 1), 0.16, w);
				const b = filt('bandpass', f * 3, 5, g);
				const o = osc('sawtooth', f, time + dt, 0.22, b);
				o.frequency.exponentialRampToValueAtTime(f * 0.82, time + dt + 0.18);
			}
		},
		hoot(time, f, v, w) {
			const g = vca(time, 0.04, v, 0.38, w);
			const o = osc('sine', f * 0.9, time, 0.5, g);
			o.frequency.exponentialRampToValueAtTime(f, time + 0.08);
			const gn = vca(time, 0.03, v * 0.12, 0.3, w);
			noise(time, 0.35, filt('bandpass', f * 2, 2, gn));
		},
		vox(time, f, v, w, vowel = 'o', len = 0.5) {
			const g = vca(time, 0.04, v, len, w);
			const [f1, f2] = VOWEL[vowel] || VOWEL.o;
			const a = filt('bandpass', f1, 6, g), b = filt('bandpass', f2, 8, g);
			for (const det of [1, 1.006]) {
				const o = osc('sawtooth', f * det, time, len + 0.1, a);
				o.connect(b);
				const lfo = ac.createOscillator(), lg = ac.createGain();
				lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, time); lg.gain.linearRampToValueAtTime(f * 0.012, time + 0.2);
				lfo.connect(lg).connect(o.frequency); lfo.start(time); lfo.stop(time + len + 0.1);
			}
		},
		hey(time, f, v, w) { SND.vox(time, f, v * 1.3, w, 'ey', 0.22); const g = vca(time, 0.002, v * 0.3, 0.05, w); noise(time, 0.06, filt('highpass', 3000, 1, g)); },
		ooh(time, f, v, w) { SND.vox(time, f, v, w, 'u', 0.9); },
		kazoo(time, f, v, w) {
			const g = vca(time, 0.02, v, 0.28, w);
			const b = filt('bandpass', 1300, 1.6, g);
			const o = osc('square', f, time, 0.35, b);
			const lfo = ac.createOscillator(), lg = ac.createGain();
			lfo.frequency.value = 7; lg.gain.value = f * 0.02;
			lfo.connect(lg).connect(o.frequency); lfo.start(time); lfo.stop(time + 0.4);
		},
		bass(time, f, v, w) {
			const g = vca(time, 0.004, v, 0.38, w);
			const lp = filt('lowpass', 900, 4, g);
			lp.frequency.setValueAtTime(1200, time); lp.frequency.exponentialRampToValueAtTime(180, time + 0.3);
			osc('triangle', f, time, 0.45, lp);
			osc('sawtooth', f / 2, time, 0.45, lp);
		},
		tuba(time, f, v, w) {
			const g = vca(time, 0.03, v, 0.45, w);
			const lp = filt('lowpass', 520, 3, g);
			const o = osc('sawtooth', f * 0.93, time, 0.55, lp);
			o.frequency.exponentialRampToValueAtTime(f, time + 0.06);
		},
		kick(time, v, w = 1) {
			const g = vca(time, 0.002, v, 0.28, w);
			const o = osc('sine', 150, time, 0.3, g);
			o.frequency.exponentialRampToValueAtTime(44, time + 0.22);
		},
		snare(time, v, w = 1) {
			const g = vca(time, 0.002, v * 0.8, 0.16, w);
			noise(time, 0.2, filt('bandpass', 1900, 0.9, g));
			const g2 = vca(time, 0.002, v * 0.4, 0.08, w);
			osc('triangle', 190, time, 0.1, g2);
		},
		hat(time, v, w = 1) {
			const g = vca(time, 0.001, v * 0.5, 0.045, w);
			noise(time, 0.06, filt('highpass', 7000, 0.8, g));
		},
		tom(time, f, v, w) {
			const g = vca(time, 0.002, v, 0.25, w);
			const o = osc('sine', f * 1.5, time, 0.3, g);
			o.frequency.exponentialRampToValueAtTime(f * 0.8, time + 0.22);
		},
		shaker(time, v, w = 1) {
			const g = vca(time, 0.008, v * 0.4, 0.05, w);
			noise(time, 0.07, filt('bandpass', 6500, 1.5, g));
		},
		crash(time, v) {
			const g = vca(time, 0.002, v * 0.5, 1.4, 1);
			noise(time, 1.5, filt('highpass', 3200, 0.6, g));
		},
		boing(time, f, v, w) {
			const g = vca(time, 0.004, v, 0.5, w);
			const o = osc('sine', f, time, 0.55, g);
			o.frequency.exponentialRampToValueAtTime(f * 2.2, time + 0.12);
			o.frequency.exponentialRampToValueAtTime(f * 0.9, time + 0.45);
		},
		slide(time, f1, f2, len, v, w) {
			const g = vca(time, 0.03, v, len, w);
			const o = osc('sine', f1, time, len + 0.1, g);
			o.frequency.exponentialRampToValueAtTime(f2, time + len);
		},
		bwomp(time, v) {
			const g = vca(time, 0.01, v, 0.7, 1);
			const lp = filt('lowpass', 400, 6, g);
			lp.frequency.setValueAtTime(900, time); lp.frequency.exponentialRampToValueAtTime(90, time + 0.6);
			const o = osc('sawtooth', 70, time, 0.8, lp);
			o.frequency.exponentialRampToValueAtTime(38, time + 0.6);
		},
		plink(time, f, v, w) {   // a drop on water
			const g = vca(time, 0.002, v, 0.45, w);
			const o = osc('sine', f * 1.5, time, 0.5, g);
			o.frequency.exponentialRampToValueAtTime(f, time + 0.06);
			const g2 = vca(time, 0.001, v * 0.3, 0.25, w);
			osc('sine', f * 3.01, time, 0.3, g2);
		},
		harp(time, f, v, w) {    // a plucked web strand
			const g = vca(time, 0.002, v, 1.1, w);
			const lp = filt('lowpass', Math.min(f * 8, 10000), 0.6, g);
			lp.frequency.setValueAtTime(Math.min(f * 10, 12000), time); lp.frequency.exponentialRampToValueAtTime(f * 2, time + 0.8);
			osc('sawtooth', f, time, 1.2, lp);
			osc('triangle', f * 2, time, 1.2, lp);
		},
		woodlog(time, f, v, w) { // a hollow log
			const g = vca(time, 0.002, v, 0.32, w);
			osc('sine', f, time, 0.35, g);
			const g2 = vca(time, 0.001, v * 0.5, 0.07, w);
			osc('triangle', f * 3.9, time, 0.1, g2);
			const g3 = vca(time, 0.001, v * 0.3, 0.03, w);
			noise(time, 0.04, filt('bandpass', f * 6, 2, g3));
		},
		shimmer(time, f, v, w) {
			for (const [m, a, d, det] of [[1, 1, 1.6, 0], [2, 0.5, 1.2, 3], [3.01, 0.3, 0.9, -4], [4.2, 0.2, 0.7, 6], [6.3, 0.12, 0.5, -7]]) {
				const g = ac.createGain();
				g.gain.setValueAtTime(0.0001, time);
				g.gain.exponentialRampToValueAtTime(v * a, time + 0.06 + m * 0.01);
				g.gain.exponentialRampToValueAtTime(0.0001, time + d);
				g.connect(pans[w] || bus);
				const o = osc('sine', f * m, time, d + 0.1, g);
				o.detune.value = det;
				const lfo = ac.createOscillator(), lg = ac.createGain();
				lfo.frequency.value = 6 + m; lg.gain.value = f * m * 0.004;
				lfo.connect(lg).connect(o.frequency); lfo.start(time); lfo.stop(time + d + 0.1);
			}
		},
		piano(time, f, v, w) {
			const g = vca(time, 0.003, v, 1.4, w);
			const lp = filt('lowpass', Math.min(f * 7, 9000), 0.7, g);
			osc('triangle', f, time, 1.5, lp);
			const g2 = vca(time, 0.002, v * 0.35, 0.6, w);
			osc('sine', f * 2.005, time, 0.7, g2);
			const g3 = vca(time, 0.001, v * 0.25, 0.04, w);
			noise(time, 0.05, filt('bandpass', f * 4, 1.2, g3));
		},
		pad(time, root, chord, len, v) {
			for (const st of chord) {
				const f = root / 2 * Math.pow(2, st / 12);
				const g = ac.createGain();
				g.gain.setValueAtTime(0.0001, time);
				g.gain.linearRampToValueAtTime(v, time + 0.35);
				g.gain.setValueAtTime(v, time + len - 0.4);
				g.gain.linearRampToValueAtTime(0.0001, time + len);
				g.connect(bus);
				const lp = filt('lowpass', 1100, 0.7, g);
				osc('triangle', f, time, len, lp);
				osc('sawtooth', f * 1.004, time, len, filt('lowpass', 700, 0.5, g));
			}
		},
	};

	// each kind of creature: the voice it sings in, and how loud
	const VOICE = {
		mushroom: { v: 'mallet', vol: 0.5 }, frog: { v: 'croak', vol: 0.5 }, hedgehog: { v: 'drum', vol: 0.7 }, snail: { v: 'bass', vol: 0.55 },
		owl: { v: 'hoot', vol: 0.5 }, gnome: { v: 'hey', vol: 0.35 }, fairy: { v: 'bell', vol: 0.4 }, flower: { v: 'ooh', vol: 0.3 },
		bunny: { v: 'kazoo', vol: 0.32 }, troll: { v: 'tuba', vol: 0.75 },
	};
	function sing(c, step, time, deg) {
		if (!audioOn()) return;
		const root = CLEARINGS[c.clearing].root;
		const vc = VOICE[c.kind];
		if (vc.v === 'drum') {
			const k = deg;
			if (k === 'k') SND.kick(time, 0.6, c.wall);
			else if (k === 's') SND.snare(time, 0.5, c.wall);
			else if (k === 'h') SND.hat(time, 0.6, c.wall);
			else SND.tom(time, 110 + (step % 4) * 30, 0.5, c.wall);
			return;
		}
		SND[vc.v](time, freqOf(root, c.note + deg), vc.vol, c.wall);
	}
	// a creature's flourish when touched: a run up its own voice, with a boing
	function flourish(c, time) {
		if (!audioOn()) return;
		const root = CLEARINGS[c.clearing].root;
		const vc = VOICE[c.kind];
		const sixteenth = 60 / CLEARINGS[here].bpm / 4;
		if (vc.v === 'drum') { for (let k = 0; k < 6; k++) SND.tom(time + k * sixteenth * 0.5, 180 - k * 18, 0.5, c.wall); SND.crash(time + 3 * sixteenth, 0.35); return; }
		[0, 2, 4, 7].forEach((d, k) => SND[vc.v](time + k * sixteenth, freqOf(root, c.note + d + (vc.v === 'tuba' ? 0 : 0)), vc.vol * 0.9, c.wall));
		SND.boing(time + 4 * sixteenth, freqOf(root, c.note + 5) / 2, 0.25, c.wall);
	}

	/* ---------- the sequencer: every sixteenth, on the clock ---------- */

	let step = 0;
	let nextStep = 0;
	let beat0 = 0;                // the clock time of beat 0 (so tempo changes keep the count)
	let bpm = CLEARINGS[0].bpm;
	const pending = [];           // touches and jumps waiting for the next sixteenth or beat
	const visuals = [];           // what happens on screen, at its time
	const beatAt = (time) => (time - beat0) * bpm / 60;
	function setTempo(next) {
		const now = clock();
		const b = beatAt(now);
		bpm = next;
		beat0 = now - b * 60 / bpm;
		nextStep = beat0 + Math.ceil(beatAt(now) * 4 + 0.001) * 60 / bpm / 4;
	}
	function schedule() {
		const now = clock();
		if (audioOn() !== lastAudio) {
			// (the audio clock just took over, or let go: carry the count across)
			const b = (lastAudio ? (ac.currentTime - beat0) : (performance.now() / 1000 - perf0 + clockOff - beat0)) * bpm / 60;
			lastAudio = audioOn();
			beat0 = clock() - b * 60 / bpm;
			nextStep = beat0 + Math.ceil(beatAt(clock()) * 4 + 0.001) * 60 / bpm / 4;
			return;
		}
		if (nextStep < now - 0.25) nextStep = beat0 + Math.ceil(beatAt(now) * 4 + 0.001) * 60 / bpm / 4;
		const live = phase === 'tutorial' || phase === 'play' || phase === 'intro';
		while (nextStep < now + 0.12) {
			const time = nextStep;
			step = Math.round(beatAt(time) * 4);
			if (live && !show.paused) playStep(step, time);
			nextStep += 60 / bpm / 4;
		}
	}
	function playStep(st, time) {
		const s16 = ((st % 16) + 16) % 16;
		const c = CLEARINGS[here];
		const on = audioOn();
		// the groove underneath
		// (on the path, the clearing behind fades away, then the one ahead fades up)
		const gc = glide ? CLEARINGS[glide.switched ? glide.to : glide.from] : c;
		const away = glide ? (glide.switched ? clamp(glide.t * 2 - 1, 0, 1) : clamp(1 - glide.t * 2, 0, 1)) : 1;
		const f = away * away * (3 - 2 * away);
		if (on && f > 0.02) {
			const gr = gc.groove;
			if (gr.kick[s16]) SND.kick(time, 0.32 * f);
			if (gr.hat[s16]) SND.hat(time, 0.35 * f);
			if (gr.snare[s16]) SND.snare(time, 0.22 * f);
			const ch = choirs[CLEARINGS.indexOf(gc)];
			if (s16 === 0) SND.pad(time, gc.root, ch ? CHOIR[ch.idx].chord : CHORDS[Math.floor(st / 16) % 4], 60 / bpm * 4, 0.035 * Math.max(f, 0.15));
		}
		// creatures with someone in front of them sing their part
		const singers = glide ? [] : creatures.filter((cr) => cr.clearing === here && cr.singer >= 0);
		for (const cr of singers) {
			const deg = PAT[cr.pat][s16];
			if (deg === null || deg === undefined) continue;
			sing(cr, st, time, deg);
			visuals.push({ time, fn: () => { cr.singT = 1; cr.notes++; } });
			if (cr.singer < count) scores[cr.singer] += 1;
		}
		// the festoon: the playhead moves a light along on every eighth, and a lit one chimes
		const fe = festoons[here];
		if (fe && !glide && s16 % 2 === 0) {
			const i = ((Math.floor(st / 2) % FEST.n) + FEST.n) % FEST.n;
			if (on && fe.on[i]) { SND.bell(time, freqOf(c.root, fe.deg[i]), 0.2, fe.wall[i]); SND.mallet(time, freqOf(c.root, fe.deg[i]) * 2, 0.08, fe.wall[i]); }
			visuals.push({ time, fn: () => { fe.head[i] = 1; if (fe.on[i]) { fe.flash[i] = 1; spray(fe.pos[i], fe.col[i].getStyle(), 5, 0.9, 0.6); } } });
		}
		// the fungus wall: a column an eighth, every lit mushroom in it knocks out its note
		const gw = grids[here];
		if (gw && !glide && s16 % 2 === 0) {
			const col = ((Math.floor(st / 2) % GRID.cols) + GRID.cols) % GRID.cols;
			for (let r = 0; r < GRID.rows; r++) {
				const i = r * GRID.cols + col;
				if (!gw.on[i]) continue;
				if (on) { SND.mallet(time, freqOf(c.root, GRID.deg[r]), 0.32, 1); SND.bell(time, freqOf(c.root, GRID.deg[r]) * 2, 0.06, 1); }
			}
			visuals.push({ time, fn: () => {
				gw.head = col; gw.beam = 1;
				for (let r = 0; r < GRID.rows; r++) { const i = r * GRID.cols + col; if (gw.on[i]) { gw.flash[i] = 1; spray(gw.pos[i], gw.rowCol[i].getStyle(), 4, 0.9, 0.8); } }
			} });
		}
		// the bridge choir hums the chord the room has picked, a bar at a time
		const cho = choirs[here];
		if (cho && !glide && s16 === 0) {
			const seen = pl.filter((q) => q.seen);
			if (seen.length) cho.idx = clamp(Math.floor((seen.reduce((a, q) => a + q.x, 0) / seen.length / (2 * R) + 0.5) * 4), 0, 3);
			if (on) for (const st2 of CHOIR[cho.idx].chord) SND.vox(time, c.root / 2 * Math.pow(2, st2 / 12), 0.1, 1, 'u', 60 / bpm * 4 * 0.95);
			visuals.push({ time, fn: () => { cho.hum = 1; } });
		}
		// squashed pumpkins play their bass notes: straight in on the next eighth, then on every
		// beat, with a soft pickup on the last sixteenth before each, the pumpkin pumping to it
		if (!glide && phase !== 'intro') for (const pb of puffs[here] || []) {
			if (!pb.pressed) continue;
			const f = freqOf(c.root, pb.deg) / 2;
			let v = 0;
			if (pb.fresh && s16 % 2 === 0) { v = 0.6; pb.fresh = false; }
			else if (!pb.fresh && s16 % 4 === 0) v = 0.45;
			else if (!pb.fresh && s16 % 4 === 3) v = 0.18;
			if (!v) continue;
			if (on) SND.bass(time, f, v, pb.w);
			if (on && v > 0.5) SND.bass(time, f * 2, 0.18, pb.w);
			visuals.push({ time, fn: () => { pb.v -= 7 * v; pb.glow = 1; } });
			if (v > 0.3) scores[pb.who] += 1;
		}
		// every player's acorn lands on the beat: on a plank, a note; on the frame, nothing
		const xy = xylos[here];
		if (xy && !glide && s16 % 4 === 0 && phase !== 'intro') for (let i = 0; i < count; i++) {
			if (!pl[i].seen) continue;
			const lg = plankAt(xy, xy.conkers[i].x);
			if (!lg) continue;
			if (on) SND.woodlog(time, freqOf(c.root, lg.deg), 0.5, 1);
			visuals.push({ time, fn: () => { lg.hit = 1; lg.col = colour(i); } });
			scores[i] += 1;
			tut.sung[i] = true;
		}
		// whoever's running shakes along, on the eighths
		if (on && s16 % 2 === 0 && phase !== 'intro') for (const p of pl) if (p.seen && p.speed > RUN) SND.shaker(time, 0.5);
		// touches, on the next sixteenth; jumps and squats, on the next beat
		for (let k = pending.length - 1; k >= 0; k--) {
			const e = pending[k];
			if (e.beat && s16 % 4 !== 0) continue;
			pending.splice(k, 1);
			if (e.kind === 'trick') { flourish(e.c, time); visuals.push({ time, fn: () => trick(e.c) }); }
			if (e.kind === 'jump') { if (on) { SND.crash(time, 0.5); SND.kick(time, 0.7); SND.boing(time, c.root / 2, 0.3); } visuals.push({ time, fn: () => hopAll() }); }
			if (e.kind === 'squat') { if (on) SND.bwomp(time, 0.7); visuals.push({ time, fn: () => duckAll() }); }
		}
	}
	const sequencer = setInterval(schedule, 25);

	/* ---------- every tick ---------- */

	function tick(dt) {
		if (show.paused) return;
		t += dt;
		if (banner) banner.t += dt;
		if (glide) {
			glide.t += dt / GLIDE;
			if (!glide.switched && glide.t >= 0.5) { glide.switched = true; setTempo(CLEARINGS[glide.to].bpm); }   // (halfway, the next clearing's tempo takes over, faded right down)
			if (glide.t >= 1) {
				here = glide.to;
				glide = null;
				setTempo(CLEARINGS[here].bpm);
				showOnly([here]);
				if (phase === 'play') announce();
				show.fx('allSet', 0.4);
			}
		}
		if (phase === 'play' && !glide) {
			clearT += dt;
			if (clearT > CLEARING_TIME) { clearT = 0; walkTo((here + 1) % CLEARINGS.length); }
		}
		const live = phase === 'tutorial' || phase === 'play';
		readPlayers(dt, live);
		devices(dt, live);
		for (const f of floaters) f.t += dt;
		floaters = floaters.filter((f) => f.t < 1.4);
		for (const r of ripples) r.t += dt;
		ripples = ripples.filter((r) => r.t < 0.5);
	}

	// Each player in the pond has their own held shimmering tone (their own note of the
	// scale): a faint glassy hum standing still, swelling and brightening as they wade,
	// fading away when they step out of the water.
	const WADE_DEG = [5, 7, 9, 6, 8, 10];
	function wade(dt, on) {
		const pd = ponds[here];
		if (pd) pd.U.uNow.value = rt;
		for (let i = 0; i < pl.length; i++) {
			const q = pl[i];
			const ax = avCap(q.x), az = avCap(q.z);
			const inPond = !!pd && on && i < count && q.seen && az < -POND.front && Math.abs(ax) < POND.half;
			const v = inPond ? q.speed * 2 * R : 0;   // (m/s)
			// (its energy: quick to swell while you move, slow to settle, gone a second after you leave)
			const want = inPond ? 0.15 + 0.85 * clamp(v / 1.0, 0, 1) : 0;
			q.shimE = lerp(q.shimE || 0, want, 1 - Math.exp(-dt * (want > (q.shimE || 0) ? 4 : inPond ? 1.2 : 2.5)));
			if (inPond && !q.shim && audioOn()) q.shim = shimmerVoice(freqOf(CLEARINGS[here].root, WADE_DEG[i % 6]), 1);
			if (q.shim) {
				q.shim.set(q.shimE, ax / POND.half);
				if (!inPond && q.shimE < 0.01) { q.shim.stop(); q.shim = null; }
			}
			if (!inPond) { q.wadeD = 0; continue; }
			if (v < 0.12) continue;
			// (and a ripple every so often as you go)
			q.wadeD = (q.wadeD || 0) + v * dt;
			if (q.wadeD < 0.32) continue;
			q.wadeD = 0;
			const r = pd.rip[pd.next = (pd.next + 1) % POND.maxRip];
			r.set(pd.cx + ax, pd.cz + az, rt, Math.min(1, 0.45 + v * 0.5));
			scores[i] += 1;
			tut.sung[i] = true;
		}
	}

	function devices(dt, live) {
		const C = CLEARINGS[here];
		wade(dt, live && !glide);
		const on = live && !glide;
		// pumpkins: stand on one's hotspot to wake it; squat there and it plays its own bass note,
		// on the beat, for as long as you hold the squat (playStep)
		for (const pb of puffs[here] || []) {
			let who = -1;
			pb.stand = -1;
			if (on) for (let i = 0; i < count; i++) {
				const p = latest[i], q = pl[i];
				if (!p || !q.seen || !near(p, pb.spot)) continue;
				pb.stand = i;
				if (q.base !== null && p.py > q.base + SQUAT * 0.7) who = i;
			}
			if (who >= 0 && !pb.pressed) {
				pb.pressed = true; pb.who = who; pb.fresh = true;
				spray(pb.pos.clone().setY(0.6), '#ffd27a', 30, 2.2, 2.5);   // (a burst of seeds)
				pb.v -= 6;   // (a thump down)
				scores[who] += 3;
			} else if (who < 0 && pb.pressed) {
				pb.pressed = false;
				pb.v += 5;   // (and it springs back up)
			}
			if (pb.pressed && Math.random() < 0.3) spray(pb.pos.clone().setY(0.5), '#ffb84a', 2, 1, 2);
		}
		for (const [ci, list] of puffs.entries()) if (list && ci !== here) for (const pb of list) if (pb.voice) { pb.voice.stop(); pb.voice = null; pb.pressed = false; }
		// the moonbeam: whoever stands in it plays it; their height bends the note
		for (const th of theremins) {
			if (th.ci !== here) { if (th.voice) { th.voice.stop(); th.voice = null; th.who = -1; } continue; }
			let who = -1;
			if (on) for (let i = 0; i < count; i++) { const p = latest[i]; if (p && pl[i].seen && Math.hypot(avCap(pl[i].x) - (th.pos.x - walls.rig.position.x), avCap(pl[i].z) - (th.pos.z - walls.rig.position.z)) < 0.42) { who = i; break; } }   // (your avatar in the beam)
			if (who >= 0) {
				const p = latest[who], q = pl[who];
				const k = clamp(0.5 + (q.base - p.py) / 0.24, 0, 1);   // (up a little is higher, down lower)
				th.k = lerp(th.k, k, 1 - Math.exp(-dt * 10));
				const f = freqOf(C.root, th.deg) * Math.pow(2, (th.k - 0.5) * 2);   // (each beam its own range: low, middle, high)
				if (!th.voice && audioOn()) th.voice = holdVoice(f, 'whistle', th.w);
				if (th.voice) th.voice.glide(f);
				if (th.who !== who) scores[who] += 2;
				th.who = who;
				th.acc = (th.acc || 0) + dt;
				if (th.acc > 1) { th.acc -= 1; scores[who] += 1; }   // (a point a second in the beam)
			} else if (th.voice) { th.voice.stop(); th.voice = null; th.who = -1; }
		}
	}

	function readPlayers(dt, live) {
		for (const cr of creatures) cr.singer = -1;
		for (const pn of pianos) if (pn) pn.held.fill(-1);
		for (let i = 0; i < count; i++) {
			const p = latest[i], q = pl[i];
			if (!p) { q.seen = false; continue; }
			q.seen = true;
			const tx = (p.px - 0.5) * 2 * R, tz = (0.5 - p.pz) * 2 * R;
			const k = 1 - Math.exp(-dt * 20);
			const ox = q.x, oz = q.z;
			q.x += (tx - q.x) * k; q.z += (tz - q.z) * k;
			const sp = Math.hypot(q.x - ox, q.z - oz) / Math.max(dt, 1e-3) / (2 * R);
			q.speed = lerp(q.speed, sp, 1 - Math.exp(-dt * 6));
			q.stillT = q.speed < 0.05 ? (q.stillT || 0) + dt : 0;
			// jumps and squats, against your own usual height
			if (q.base === null) q.base = p.py;
			if (Math.abs(p.py - q.base) < 0.05) q.base = lerp(q.base, p.py, 1 - Math.exp(-dt * 0.8));
			q.jumpT = Math.max(0, q.jumpT - dt);
			if (live && p.py < q.base - JUMP && q.jumpT <= 0) {
				q.jumpT = 0.7;
				tut.jumped[i] = true;
				scores[i] += 3;
				if (!pending.some((e) => e.kind === 'jump')) pending.push({ kind: 'jump', beat: true });
			}
			if (p.py > q.base + SQUAT) { q.squatT += dt; if (live && q.squatT > 0.25 && !q.squatting) { q.squatting = true; scores[i] += 3; if (!pending.some((e) => e.kind === 'squat')) pending.push({ kind: 'squat', beat: true }); } }
			else { q.squatT = 0; q.squatting = false; }
			// the stepping-stone piano: the stone you step onto plays, now
			const pn = pianos[here];
			if (pn && live && !glide) {
				const { along, dist } = wallsOf(p);
				const w = pn.wall;
				// (the panel your avatar is standing on: its depth out toward the wall, and which strip of the fan)
				const ax = avCap(q.x), az = avCap(q.z);
				const depth = w === 0 ? -ax : w === 2 ? ax : -az, lat = w === 0 ? -az : w === 2 ? az : ax;
				const sF = depth > 0.1 ? lat / depth / (2 / 3) : 9;
				const key = depth > PIANO.from && Math.abs(sF) < 1.02 ? clamp(Math.floor((sF * 0.5 + 0.5) * PIANO.per), 0, PIANO.per - 1) : -1;
				if (key >= 0) pn.held[key] = i;
				if (key !== q.key) {
					q.key = key;
					if (key >= 0) {
						pn.flash[key] = 1;
						scores[i] += 1;
						if (audioOn()) SND.piano(clock() + 0.005, freqOf(CLEARINGS[here].root, key - 2), 0.45, w);
						spray(pn.pos[key], colour(i), 6, 1, 0.8);
					}
				}
			} else q.key = -1;
			// standing in front of a creature
			q.at = -1;
			if (!live || glide) continue;
			let best = null, bd = 0.48 / (2 * R);   // (within half a metre of its pad)
			for (const cr of creatures) {
				if (cr.clearing !== here) continue;
				const d = Math.hypot(avCap(q.x) - cr.hot.x, avCap(q.z) - cr.hot.y) / (2 * R);   // (your avatar on its hotspot)
				if (d < bd) { bd = d; best = cr; }
			}
			if (best) {
				if (best.singer < 0) best.singer = i;
				q.at = best.index;
				tut.sung[i] = tut.sung[i] || best.notes > 0;
			}
		}
	}

	/* ---------- touches ---------- */

	function wallsOf(p) {
		return { along: [p.pz, p.px, 1 - p.pz], dist: [p.px, 1 - p.pz, 1 - p.px] };
	}
	function hitters(wall, a, reach = REACH) {
		const near = [];
		for (let i = 0; i < count; i++) {
			const p = latest[i];
			if (!p) continue;
			const { along, dist } = wallsOf(p);
			if (dist[wall] > reach || Math.abs(along[wall] - a) > reach) continue;
			near.push({ i, d: Math.abs(along[wall] - a) + dist[wall] });
		}
		return near.sort((x, y) => x.d - y.d).map((q) => q.i);
	}
	function tap(at) {
		if (!at || !count || show.paused || glide) return;
		if (phase !== 'tutorial' && phase !== 'play') return;
		resume();
		const wall = clamp(Math.floor(at.x / W), 0, 2);
		const a = at.x / W - wall;
		ripples.push({ x: at.x, y: at.y, t: 0 });
		// the devices on the walls: the web and the stone wall take touches higher up and further along
		if (at.y >= H * 0.25) {
			const dev = hitters(wall, a, DEVICE_REACH);
			if (dev.length && (pluckAt(at, wall, dev[0]) || gridTouch(at, wall, dev[0]) || chimeAt(at, wall, dev[0]))) return;
		}
		if (at.y < H * TOUCH_TOP) return;   // (too high for a child: only the lower part of the wall counts)
		const who = hitters(wall, a);
		if (!who.length) return;
		// a festoon light under the finger: switch it
		const fe = festoons[here];
		if (fe) {
			let bi = -1, bd2 = 85;
			for (let i = 0; i < FEST.n; i++) {
				if (fe.wall[i] !== wall) continue;
				const sp = proj(wall, fe.pos[i]);
				const d = Math.hypot(sp.x - at.x, sp.y - at.y);
				if (d < bd2) { bd2 = d; bi = i; }
			}
			if (bi >= 0) {
				fe.on[bi] = !fe.on[bi];
				fe.flash[bi] = 1;
				tut.lit[who[0]] = true;
				scores[who[0]] += 2;
				if (audioOn()) SND.mallet(clock(), freqOf(CLEARINGS[here].root, fe.deg[bi]) * 2, fe.on[bi] ? 0.18 : 0.06, wall);
				return;
			}
		}
		// the creature drawn nearest the touch, on that wall
		let best = null, bd = 220;
		for (const cr of creatures) {
			if (cr.clearing !== here || cr.wall !== wall) continue;
			const s = proj(wall, cr.touchAt());
			const d = Math.hypot(s.x - at.x, (s.y - at.y) * 0.6);
			if (d < bd) { bd = d; best = cr; }
		}
		if (!best) return;
		tut.touched[who[0]] = true;
		scores[who[0]] += 5;
		if (!pending.some((e) => e.kind === 'trick' && e.c === best)) pending.push({ kind: 'trick', c: best });
	}
	stage.$el.on('click.boogie-woods', (e) => tap(IGB.toWorld(e)));
	// the web, dragged across: a strum
	let dragging = false;
	stage.$el.on('pointerdown.boogie-woods', () => { dragging = true; }).on('pointerup.boogie-woods pointerleave.boogie-woods', () => { dragging = false; const wb = webs[here]; if (wb) wb.last = -1; });
	stage.$el.on('pointermove.boogie-woods', (e) => {
		if (!dragging || !count || glide || (phase !== 'tutorial' && phase !== 'play')) return;
		const at = IGB.toWorld(e);
		const wall = clamp(Math.floor(at.x / W), 0, 2);
		if (at.y < H * 0.25) return;
		const who = hitters(wall, at.x / W - wall, DEVICE_REACH);
		if (who.length) { pluckAt(at, wall, who[0], true); chimeAt(at, wall, who[0], true); }
	});
	// the stone in the wall nearest a touch, switched: any touch on the stonework hits its nearest stone
	function gridTouch(at, wall, who) {
		const gw = grids[here];
		if (!gw || wall !== 1) return false;
		let bi = -1, bd3 = 200;
		for (let i = 0; i < gw.pos.length; i++) {
			const sp = proj(1, gw.pos[i]);
			const d = Math.hypot(sp.x - at.x, (sp.y - at.y) * 1.2);
			if (d < bd3) { bd3 = d; bi = i; }
		}
		if (bi < 0) return false;
		gw.on[bi] = !gw.on[bi];
		gw.flash[bi] = 1;
		scores[who] += 2;
		tut.touched[who] = true;
		if (audioOn()) SND.mallet(clock(), freqOf(CLEARINGS[here].root, GRID.deg[Math.floor(bi / GRID.cols)]), gw.on[bi] ? 0.25 : 0.08, 1);
		return true;
	}
	// the knot of the web nearest a touch (anywhere on the web), plucked: its spoke is the note
	function pluckAt(at, wall, who, strum) {
		const wb = webs[here];
		if (!wb || wb.wall !== wall) return false;
		let best = -1, bd = strum ? 70 : 140;
		const v = new THREE.Vector3();
		wb.nodes.forEach((nd, k) => {
			if (nd.spoke < 0) return;
			const q = proj(wall, wb.unit.localToWorld(v.set(nd.base.x, nd.base.y, 0)));
			const d = Math.hypot(q.x - at.x, q.y - at.y);
			if (d < bd) { bd = d; best = k; }
		});
		if (best < 0) return false;
		const nd = wb.nodes[best];
		if (strum && (nd.spoke === wb.last || rt - wb.lastT < 0.06)) return true;
		wb.last = nd.spoke; wb.lastT = rt;
		// the ripple, starting at that knot (shaken across its spoke, like a plucked string)
		const ang = Math.atan2(nd.base.y, nd.base.x);
		wb.plucks.push({ x: nd.base.x, y: nd.base.y, t: rt, px: -Math.sin(ang), py: Math.cos(ang) });
		if (wb.plucks.length > 6) wb.plucks.shift();
		wb.ring.position.set(nd.base.x, nd.base.y, 0.03);
		wb.ringT = 1;
		// the spider runs over to see what it caught
		Object.assign(wb.sp, { tx: nd.base.x * 0.85, ty: nd.base.y * 0.85, rush: true, wait: rr(1.2, 2.2) });
		if (audioOn()) SND.harp(clock() + 0.005, freqOf(CLEARINGS[here].root, 2 + nd.spoke), 0.28, wall);
		spray(wb.unit.localToWorld(v.set(nd.base.x, nd.base.y, 0)), '#e8f8ff', 14, 1.4, 0.6);
		scores[who] += 1;
		tut.touched[who] = true;
		return true;
	}
	const _zAxis = new THREE.Vector3(0, 0, 1);

	/* ---------- the path ---------- */

	function walkTo(k) {
		if (glide || k === here) return;
		glide = { from: here, to: k, t: 0 };
		showOnly([here, k]);
		show.fx('whooshLong', 0.4, 0.8);
		banner = null;
	}
	function goTo(k, now) {
		glide = null;
		here = k;
		clearT = 0;
		setTempo(CLEARINGS[k].bpm);
		showOnly([k]);
	}

	/* ---------- 3D ---------- */

	const renderer = new THREE.WebGLRenderer({ antialias: false });
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 0.92;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	$(renderer.domElement).css({ position: 'absolute', left: 0, top: 0, width: WIDTH + 'px', height: H + 'px' }).appendTo(stage.$bg);
	let post = null;
	let gradePx = null;   // (the grade's pixel size, once it exists)
	const sparkleU = { uTime: { value: 0 }, uPx: { value: 400 } };
	function resize() {
		const k = Math.min(IGB.scale * IGB.pixelRatio, 1);
		renderer.setPixelRatio(1);
		renderer.setSize(Math.round(WIDTH * k), Math.round(H * k), false);
		if (post) post.setSize();
		sparkleU.uPx.value = renderer.domElement.height / (2 * Math.tan(32 * Math.PI / 180));
		if (gradePx) gradePx.set(1 / renderer.domElement.width, 1 / renderer.domElement.height);
	}
	const unlisten = IGB.onResize(resize);
	resize();

	const scene = new THREE.Scene();
	scene.fog = new THREE.FogExp2(0x5a2a5e, 0.035);
	post = createWallComposer(renderer, scene, { strength: 0.45, radius: 0.5, threshold: 1.0, cap: 2.4, samples: 0 });   // (no multisampling: it halved the frame rate. FXAA in the grade does the edges instead)
	const envTex = environmentFromShader(renderer, `
		vec3 envColor(vec3 d) {
			float up = d.y * 0.5 + 0.5;
			vec3 c = mix(vec3(0.12, 0.2, 0.08), vec3(0.55, 0.5, 0.9), up);
			c += vec3(1.0, 0.75, 0.5) * pow(max(0.0, dot(d, normalize(vec3(0.3, 0.6, -0.7)))), 8.0) * 1.5;
			return c;
		}
	`);
	scene.environment = envTex;
	const gradeU = { tDiffuse: { value: null }, uPx: { value: new THREE.Vector2(1 / 3600, 1 / 750) }, uTime: sparkleU.uTime, uShadow: { value: new THREE.Color(1, 1, 1) }, uHigh: { value: new THREE.Color(1, 1, 1) }, uSat: { value: 1.18 } };
	const grade = new ShaderPass({
		uniforms: gradeU,
		vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
		fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uPx; uniform float uTime; uniform vec3 uShadow; uniform vec3 uHigh; uniform float uSat; varying vec2 vUv;
			float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
			float lum(vec3 c){ return dot(min(c, vec3(1.)), vec3(0.299, 0.587, 0.114)); }
			// FXAA (the classic cheap one): blur along an edge, only where there is one
			vec3 fxaa(vec2 uv){
				vec3 nw = texture2D(tDiffuse, uv + vec2(-1., -1.) * uPx).rgb, ne = texture2D(tDiffuse, uv + vec2(1., -1.) * uPx).rgb;
				vec3 sw = texture2D(tDiffuse, uv + vec2(-1., 1.) * uPx).rgb, se = texture2D(tDiffuse, uv + vec2(1., 1.) * uPx).rgb;
				vec3 m = texture2D(tDiffuse, uv).rgb;
				float lNW = lum(nw), lNE = lum(ne), lSW = lum(sw), lSE = lum(se), lM = lum(m);
				float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
				if (lMax - lMin < 0.04) return m;
				vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
				float red = max((lNW + lNE + lSW + lSE) * 0.03125, 1. / 128.);
				dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + red), -8., 8.) * uPx;
				vec3 a = 0.5 * (texture2D(tDiffuse, uv + dir * (1. / 3. - 0.5)).rgb + texture2D(tDiffuse, uv + dir * (2. / 3. - 0.5)).rgb);
				vec3 b = a * 0.5 + 0.25 * (texture2D(tDiffuse, uv - dir * 0.5).rgb + texture2D(tDiffuse, uv + dir * 0.5).rgb);
				float lB = lum(b);
				return (lB < lMin || lB > lMax) ? a : b;
			}
			void main(){
				vec4 c = texture2D(tDiffuse, vUv);
				vec3 col = fxaa(vUv);
				float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
				col = max(mix(vec3(l), col, uSat), 0.);
				col *= mix(uShadow, uHigh, clamp(l / (l + 0.5), 0., 1.));
				// (a vignette top and bottom, and at the strip's two far ends: never at the corners between walls)
				float v = smoothstep(0., 0.35, vUv.y) * 0.25 + 0.75;
				v *= 1. - smoothstep(0.75, 1.0, vUv.y) * 0.35;
				v *= smoothstep(0., 0.08, vUv.x) * 0.25 + 0.75;
				v *= smoothstep(1., 0.92, vUv.x) * 0.25 + 0.75;
				col *= v;
				col += (hash(vUv * 1024. + fract(uTime) * 61.) - 0.5) * 0.015;
				gl_FragColor = vec4(col, c.a);
			}`,
	});
	post.composer.insertPass(grade, post.composer.passes.length - 1);
	gradePx = gradeU.uPx.value;
	resize();
	scene.environmentIntensity = 0.55;

	const walls = createWallRig({ fov: 64, aspect: W / H, near: 0.05, far: 160 });
	scene.add(walls.rig);
	const cams = walls.cameras;
	const _v = new THREE.Vector3();
	function proj(wall, v) {
		return toScreen(v, cams[wall], wall * W, 0, W, H) || { x: wall * W + W / 2, y: H / 2, inside: false };
	}

	// light: a sky, a low sun through the trees, and coloured glows that follow the walls
	const hemi = new THREE.HemisphereLight(0xb8c8ff, 0x3a5a2a, 0.9);
	scene.add(hemi);
	const sun = new THREE.DirectionalLight(0xffd8a0, 2.6);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
	sun.shadow.bias = -0.0005;
	scene.add(sun, sun.target);
	const glows = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xffffff, 14, 9, 1.4); scene.add(l); return l; });
	const GLOW_AT = [[-3.4, 1.4, -1.5], [-1.5, 1.6, -3.6], [1.8, 1.4, -3.4], [3.5, 1.5, 1.2]];

	// the sky, round the walls
	const NOISE = `
		float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
		float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
			return mix(mix(hh(i), hh(i + vec2(1., 0.)), f.x), mix(hh(i + vec2(0., 1.)), hh(i + vec2(1., 1.)), f.x), f.y); }
		float fbm(vec2 p){ float s = 0., a = 0.5; for (int i = 0; i < 4; i++) { s += a * n2(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
`;
	const skyU = { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, glowC: { value: new THREE.Color() }, sunC: { value: new THREE.Color() },
		sunDir: { value: new THREE.Vector3(0, 0.2, -1) }, stars: { value: 0 }, moon: { value: 0 }, time: sparkleU.uTime };
	const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 48, 24), new THREE.ShaderMaterial({
		uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
		vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
		fragmentShader: `uniform vec3 top; uniform vec3 bot; uniform vec3 glowC; uniform vec3 sunC; uniform vec3 sunDir; uniform float stars; uniform float moon; uniform float time; varying vec3 vP;
			${NOISE}
			float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
			void main(){
				vec3 d = normalize(vP);
				vec3 c = mix(bot, top, smoothstep(-0.05, 0.75, d.y));
				float sd = max(dot(d, normalize(sunDir)), 0.);
				c += glowC * pow(1. - abs(d.y), 5.) * 0.7;
				c += sunC * (pow(sd, 6.) * 0.35 + pow(sd, 48.) * 1.2 + pow(sd, 400.) * 2.);
				float disc = smoothstep(0.9988, 0.9993, sd);
				c = mix(c, sunC * mix(5., 2.2, moon), disc);
				if (d.y > 0.0) {
					vec2 uv = d.xz / (d.y + 0.18) * 1.1 + vec2(time * 0.012, time * 0.005);
					float cl = smoothstep(0.42, 0.82, fbm(uv));
					vec3 cc = mix(top * 1.5 + 0.03, glowC * 0.9, 0.35) + sunC * pow(sd, 3.) * 0.8;
					c = mix(c, cc, cl * 0.6 * smoothstep(0.0, 0.25, d.y));
				}
				vec3 q = floor(d * 280.);
				float st = step(0.9965, h3(q)) * stars * smoothstep(0.08, 0.5, d.y) * (0.55 + 0.45 * sin(time * 2.5 + h3(q) * 60.));
				gl_FragColor = vec4(c + st * 1.8, 1.);
			}`,
	}));
	scene.add(sky);
	// the sun (or moon) ahead lights everything from behind: a rim on every edge
	const rimL = new THREE.DirectionalLight(0xffffff, 2.5);
	scene.add(rimL, rimL.target);

	/* textures, painted: the bump that makes fur, scales and skin */

	function paint(w, h, fn, srgb = true, rep = 1) {
		const tx = canvasTexture(w, h, fn, srgb);
		tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
		tx.repeat.set(rep, rep);
		tx.anisotropy = 4;
		return tx;
	}
	const TEX = {};
	TEX.fur = paint(256, 256, function (c, w) {
		c.fillStyle = '#808080'; c.fillRect(0, 0, w, w);
		for (let i = 0; i < 5000; i++) {
			const x = Math.random() * w, y = Math.random() * w, l = 4 + Math.random() * 9, a = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
			const v = Math.floor(Math.random() * 255);
			c.strokeStyle = `rgba(${v},${v},${v},0.55)`; c.lineWidth = 1 + Math.random();
			c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
		}
	}, false, 3);
	TEX.scales = paint(256, 256, function (c, w) {
		c.fillStyle = '#404040'; c.fillRect(0, 0, w, w);
		const s = 32;
		for (let row = -1; row < w / (s * 0.5) + 1; row++) for (let col = -1; col < w / s + 1; col++) {
			const x = col * s + (row % 2 ? s / 2 : 0), y = row * s * 0.5;
			const g = c.createRadialGradient(x, y - s * 0.2, 2, x, y, s * 0.62);
			g.addColorStop(0, '#ffffff'); g.addColorStop(0.75, '#9a9a9a'); g.addColorStop(1, '#202020');
			c.fillStyle = g; c.beginPath(); c.arc(x, y, s * 0.6, 0, Math.PI); c.fill();
		}
	}, false, 3);
	TEX.skin = paint(256, 256, function (c, w) {
		c.fillStyle = '#808080'; c.fillRect(0, 0, w, w);
		for (let i = 0; i < 260; i++) {
			const x = Math.random() * w, y = Math.random() * w, r = 3 + Math.random() * 16;
			const g = c.createRadialGradient(x, y, 0, x, y, r);
			const v = Math.random() > 0.5 ? 255 : 0;
			g.addColorStop(0, `rgba(${v},${v},${v},0.35)`); g.addColorStop(1, 'rgba(128,128,128,0)');
			c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
		}
		for (let i = 0; i < 3000; i++) { c.fillStyle = 'rgba(30,30,30,0.5)'; c.fillRect(Math.random() * w, Math.random() * w, 1.2, 1.2); }
	}, false, 2);
	TEX.bark = paint(256, 512, function (c, w, h) {
		c.fillStyle = '#5a4030'; c.fillRect(0, 0, w, h);
		for (let i = 0; i < 70; i++) {
			let x = Math.random() * w;
			c.strokeStyle = `rgba(${Math.random() > 0.5 ? '20,12,6' : '140,110,80'},${0.4 + Math.random() * 0.5})`;
			c.lineWidth = 2 + Math.random() * 6;
			c.beginPath(); c.moveTo(x, 0);
			for (let y = 0; y < h; y += 24) { x += (Math.random() - 0.5) * 12; c.lineTo(x, y); }
			c.stroke();
		}
	}, true, 1);
	TEX.moss = paint(512, 512, function (c, w) {
		c.fillStyle = '#6a6a6a'; c.fillRect(0, 0, w, w);
		for (let i = 0; i < 9000; i++) {
			const v = 60 + Math.floor(Math.random() * 180);
			c.fillStyle = `rgba(${v},${v},${v},0.5)`;
			const r = 1 + Math.random() * 4;
			c.beginPath(); c.arc(Math.random() * w, Math.random() * w, r, 0, Math.PI * 2); c.fill();
		}
	}, false, 14);
	TEX.leaf = paint(256, 256, function (c, w) {
		c.fillStyle = '#7a7a7a'; c.fillRect(0, 0, w, w);
		for (let i = 0; i < 380; i++) {
			const x = Math.random() * w, y = Math.random() * w, a = Math.random() * Math.PI * 2, s = 8 + Math.random() * 12;
			c.save(); c.translate(x, y); c.rotate(a);
			const v = 90 + Math.floor(Math.random() * 165);
			c.fillStyle = `rgb(${v},${v},${v})`;
			c.beginPath(); c.ellipse(0, 0, s, s * 0.45, 0, 0, Math.PI * 2); c.fill();
			c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-s, 0); c.lineTo(s, 0); c.stroke();
			c.restore();
		}
	}, true, 2);
	TEX.spots = paint(512, 256, function (c, w, h) {
		c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
		for (let i = 0; i < 26; i++) {
			const x = Math.random() * w, y = 20 + Math.random() * (h * 0.7), r = 10 + Math.random() * 22;
			c.fillStyle = '#000000'; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2); c.fill();
		}
	}, false, 1);
	TEX.floor = paint(1024, 1024, function (c, w) {
		c.fillStyle = '#6a8a4a'; c.fillRect(0, 0, w, w);
		for (let i = 0; i < 700; i++) {
			const x = Math.random() * w, y = Math.random() * w, r = 10 + Math.random() * 70;
			const g = c.createRadialGradient(x, y, 0, x, y, r);
			const pick = Math.random();
			const col = pick < 0.25 ? '90,70,40' : pick < 0.5 ? '40,70,30' : pick < 0.8 ? '120,150,70' : '70,100,50';
			g.addColorStop(0, `rgba(${col},0.45)`); g.addColorStop(1, `rgba(${col},0)`);
			c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
		}
		for (let i = 0; i < 14000; i++) {
			const v = Math.random();
			c.fillStyle = v < 0.5 ? 'rgba(30,50,20,0.35)' : 'rgba(170,200,110,0.3)';
			c.fillRect(Math.random() * w, Math.random() * w, 2, 2);
		}
		for (let i = 0; i < 160; i++) {
			c.fillStyle = `rgba(${Math.random() < 0.5 ? '150,90,40' : '200,160,60'},0.6)`;
			c.save(); c.translate(Math.random() * w, Math.random() * w); c.rotate(Math.random() * 6);
			c.beginPath(); c.ellipse(0, 0, 7, 3, 0, 0, Math.PI * 2); c.fill(); c.restore();
		}
	}, true, 5);
	TEX.soft = canvasTexture(128, 128, function (c, w) {
		const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
		g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
		c.fillStyle = g; c.fillRect(0, 0, w, w);
	});
	TEX.ray = canvasTexture(64, 256, function (c, w, h) {
		const g = c.createLinearGradient(0, 0, 0, h);
		g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.3, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
		c.fillStyle = g; c.fillRect(0, 0, w, h);
		const g2 = c.createLinearGradient(0, 0, w, 0);
		g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(0.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)');
		c.globalCompositeOperation = 'destination-out'; c.fillStyle = g2; c.fillRect(0, 0, w, h);
	});

	/* materials */

	// a rim of the clearing's magic light round every creature's edge (and, fainter, the leaves)
	const rimU = { uRim: { value: new THREE.Color() } };
	function rimify(m, k = 1) {
		m.onBeforeCompile = (sh) => {
			sh.uniforms.uRim = rimU.uRim;
			sh.fragmentShader = 'uniform vec3 uRim;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
				totalEmissiveRadiance += uRim * ${k.toFixed(2)} * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);`);
		};
		m.customProgramCacheKey = () => 'rim' + k;
		m.userData.rimK = k;
		return m;
	}
	// The wobble: every creature bends like jelly from its feet up, on its own
	// uniforms (where its feet are, how tall it is, which way and how far it
	// leans, how hard it jiggles). It's done to each vertex in world space, so
	// the face, the noodles and the hat all bend together.
	const wobT = { value: 0 };
	function wobblify(m, W) {
		const k = m.userData.rimK;
		m.onBeforeCompile = (sh) => {
			Object.assign(sh.uniforms, { uBase: W.base, uBend: W.bend, uH: W.h, uJig: W.jig, uT: wobT });
			sh.vertexShader = 'uniform vec3 uBase; uniform vec3 uBend; uniform float uH; uniform float uJig; uniform float uT;\n' + sh.vertexShader.replace('#include <project_vertex>', `
				vec4 wpos = vec4(transformed, 1.0);
				#ifdef USE_INSTANCING
				wpos = instanceMatrix * wpos;
				#endif
				wpos = modelMatrix * wpos;
				float hh = clamp((wpos.y - uBase.y) / uH, 0.0, 1.6);
				vec2 rel = wpos.xz - uBase.xz;
				// (a real bend, not a skew: every point turned about the feet in the bend's
				// plane, by an angle that grows with height, so the top tips over at an angle)
				float bl = length(uBend.xz);
				if (bl > 1e-3) {
					// (a spine curving at a steady rate from the feet: each point rides the spine at its
					// own height and leans with it there, so a cap tilts exactly as its stalk's top does)
					vec2 bd = uBend.xz / bl;
					float kk = bl / uH * 1.3 / uH;
					vec2 r0 = wpos.xz - uBase.xz;
					float u = dot(r0, bd), yy = wpos.y - uBase.y;
					vec2 perp = r0 - bd * u;
					float sArc = clamp(yy, 0.0, uH * 1.6), ex = yy - sArc, ph = kk * sArc;
					float cph = cos(ph), sph = sin(ph);
					wpos.xz = uBase.xz + perp + bd * ((1.0 - cph) / kk + u * cph + ex * sph);
					wpos.y = uBase.y + sph / kk - u * sph + ex * cph;
				}
				wpos.xz += rel * uJig * sin(hh * 5.5 - uT * 9.0) * hh;
				wpos.y -= uBend.y * hh * hh;
				vec4 mvPosition = viewMatrix * wpos;
				gl_Position = projectionMatrix * mvPosition;`);
			if (k !== undefined) {
				sh.uniforms.uRim = rimU.uRim;
				sh.fragmentShader = 'uniform vec3 uRim;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
					totalEmissiveRadiance += uRim * ${k.toFixed(2)} * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
					totalEmissiveRadiance += diffuseColor.rgb * 0.13;   // (a soft glow from within: colour in the shadows)`);
			}
		};
		m.customProgramCacheKey = () => 'wob' + (k === undefined ? '' : k);
		m.needsUpdate = true;
		return m;
	}
	// give a creature its own copy of every material under its bouncer, all wobbling together
	function wobbleCreature(c) {
		c.wob = { base: { value: new THREE.Vector3() }, bend: { value: new THREE.Vector3() }, h: { value: c.top * c.size }, jig: { value: 0 } };
		const own = new Map();
		c.bouncer.traverse((o) => {
			if (!o.material || o.material.isShaderMaterial || o.material.isPointsMaterial) return;
			if (!own.has(o.material)) { const m = o.material.clone(); m.userData.rimK = o.material.userData.rimK; own.set(o.material, wobblify(m, c.wob)); }
			o.material = own.get(o.material);
		});
		if (c.limbMat && own.has(c.limbMat)) c.limbMat = own.get(c.limbMat);
	}
	const furMat = (col, sheen) => rimify(new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.85, bumpMap: TEX.fur, bumpScale: 3, sheen: 1, sheenColor: new THREE.Color(sheen || col).lerp(new THREE.Color('#ffffff'), 0.2), sheenRoughness: 0.5 }));
	const slickMat = (col) => rimify(new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.32, bumpMap: TEX.skin, bumpScale: 1.6, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.4, sheenColor: new THREE.Color('#ffffff') }));
	const scaleMat = (col) => rimify(new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.45, bumpMap: TEX.scales, bumpScale: 2.5, clearcoat: 0.6, clearcoatRoughness: 0.2, iridescence: 0.5, iridescenceIOR: 1.4 }));
	const skinMat = (col) => rimify(new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.55, bumpMap: TEX.skin, bumpScale: 1.4, sheen: 0.5, sheenColor: new THREE.Color('#ffe8d8'), clearcoat: 0.2 }));
	const MAT = {
		eyeWhite: new THREE.MeshPhysicalMaterial({ color: '#f8f2e2', roughness: 0.15, clearcoat: 1 }),
		pupil: new THREE.MeshBasicMaterial({ color: '#0a0a0c' }),
		pupilGloss: new THREE.MeshPhysicalMaterial({ color: '#0a0a0c', roughness: 0.1, clearcoat: 1 }),
		cheek: new THREE.MeshBasicMaterial({ map: null, color: '#ff7a9a', transparent: true, opacity: 0.55, depthWrite: false }),
		shine: new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2) }),
		mouth: new THREE.MeshStandardMaterial({ color: '#3a0a10', roughness: 0.6 }),
		tongue: new THREE.MeshPhysicalMaterial({ color: '#ff5a7a', roughness: 0.3, clearcoat: 1 }),
		tooth: new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.3 }),
		glove: new THREE.MeshPhysicalMaterial({ color: '#ece6da', roughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color('#ffffff'), bumpMap: TEX.skin, bumpScale: 0.6 }),
		shoe: new THREE.MeshPhysicalMaterial({ color: '#2a1a14', roughness: 0.25, clearcoat: 1 }),
		bark: new THREE.MeshStandardMaterial({ map: TEX.bark, bumpMap: TEX.bark, bumpScale: 4, roughness: 0.95 }),
		stem: skinMat('#f2e6cc'),
		dark: new THREE.MeshStandardMaterial({ color: '#1a120c', roughness: 0.6 }),
		flame: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.5) }),
		shadow: new THREE.MeshBasicMaterial({ map: TEX.soft, color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }),
	};

	/* the vintage cartoon face: tall eyes, pie-cut pupils, a toothy grin */

	const GEO = {
		sph: new THREE.SphereGeometry(1, 40, 28),
		sphLo: new THREE.SphereGeometry(1, 14, 10),
		pie: new THREE.CircleGeometry(1, 28, Math.PI * 0.35, Math.PI * 2 - 0.75),
		disc: new THREE.CircleGeometry(1, 16),
		smile: new THREE.TorusGeometry(1, 0.11, 8, 24, Math.PI * 0.9),
		box: new THREE.BoxGeometry(1, 1, 1),
		cone: new THREE.ConeGeometry(1, 1, 16),
		cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
		shadow: new THREE.PlaneGeometry(1, 1),
	};
	function mesh(geo, mat, parent, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) {
		const m = new THREE.Mesh(geo, mat);
		m.position.set(x, y, z);
		m.scale.set(sx, sy, sz);
		m.castShadow = true;
		if (parent) parent.add(m);
		return m;
	}
	function makeFace(parent, s, x, y, z, opts = {}) {
		const g = new THREE.Group();
		g.position.set(x, y, z);
		parent.add(g);
		const eyes = [];
		s *= 0.85;   // (faces a touch smaller than they were built)
		const gap = (opts.gap || 0.26) * 0.72;   // (and the eyes closer together)
		for (const sx of [-1, 1]) {
			const eye = new THREE.Group();
			eye.position.set(sx * gap * s, 0.1 * s, 0);
			g.add(eye);
			// (no whites: just the black, pie-cut, like the old cartoons)
			const pupil = mesh(GEO.pie, MAT.pupil, eye, 0, 0, 0.05 * s, 0.12 * s, 0.19 * s);
			pupil.castShadow = false;
			mesh(GEO.disc, MAT.shine, pupil, -0.3, 0.42, 0.01, 0.22).castShadow = false;
			const brow = mesh(GEO.box, MAT.pupil, eye, 0, 0.36 * s, 0.03 * s, 0.26 * s, 0.045 * s, 0.03 * s);
			brow.rotation.z = -sx * 0.28;
			eyes.push({ eye, pupil, brow, sx });
		}
		const mouth = new THREE.Group();
		mouth.position.set(0, -0.2 * s, 0.02 * s);
		g.add(mouth);
		const open = mesh(GEO.sph, MAT.mouth, mouth, 0, 0, 0, 0.19 * s, 0.02 * s, 0.07 * s);
		const tongue = mesh(GEO.sph, MAT.tongue, mouth, 0, -0.05 * s, 0.03 * s, 0.11 * s, 0.05 * s, 0.05 * s);
		const teeth = [-1, 1].map((sx) => mesh(GEO.box, MAT.tooth, mouth, sx * 0.05 * s, 0.03 * s, 0.06 * s, 0.07 * s, 0.05 * s, 0.02 * s));
		const smile = mesh(GEO.smile, MAT.pupil, mouth, 0, 0.06 * s, 0.05 * s, 0.17 * s);
		smile.rotation.z = Math.PI + Math.PI * 0.05;
		for (const sx of [-1, 1]) {   // (rosy cheeks)
			const ch = mesh(GEO.disc, MAT.cheek, g, sx * (gap + 0.08) * s, -0.12 * s, 0.02 * s, 0.11 * s, 0.075 * s);
			ch.castShadow = false;
		}
		return { g, eyes, mouth: { open, tongue, teeth, smile }, s, blink: Math.random() * 4 };
	}

	/* the creatures */

	const creatures = [];
	const clearingGroups = [];
	// a creature's frame: a root that turns to face the middle, a bouncer that squashes on the beat
	function frame(def, ci) {
		const root = new THREE.Group();
		const bouncer = new THREE.Group();
		root.add(bouncer);
		const c = {
			kind: def.kind, clearing: ci, wall: def.wall, note: def.note, pat: def.pat, tint: new THREE.Color(def.tint),
			root, bouncer, limbs: [], face: null, parts: {}, size: def.big || 1,
			singer: -1, singT: 0, trickT: 0, hopT: 0, duckT: 0, notes: 0, phase: rnd() * Math.PI * 2, index: creatures.length,
			offbeat: rnd() < 0.3,
		};
		// where it stands: beyond its wall, drawn at `along` on that wall
		const D = R + Math.max(def.out, 0.6);   // (beyond the avatars' reach, AV_MAX, with room for its own girth)
		const lat = (def.along - 0.5) * 2 * D;
		if (def.wall === 1) root.position.set(lat, 0, -D);
		if (def.wall === 0) root.position.set(-D, 0, -lat);
		if (def.wall === 2) root.position.set(D, 0, lat);
		root.lookAt(0, 0, 0);
		// its spot in the room: in front of it, a little way in from the wall
		const sp = 0.12;
		c.spot = def.wall === 1 ? { px: def.along, pz: 1 - sp } : def.wall === 0 ? { px: sp, pz: def.along } : { px: 1 - sp, pz: 1 - def.along };
		const sh = mesh(GEO.shadow, MAT.shadow, root, 0, 0.02, 0, 1.1 * c.size, 1.1 * c.size);
		sh.rotation.x = -Math.PI / 2; sh.castShadow = false;
		// its hotspot: a glowing pad on the ground in front of it, exactly where your avatar
		// stands when you stand on it (from the clearing's middle; placed in the clearing later)
		// (pulled in toward the middle of its wall, so the perspective doesn't drag it out to the screen's edge)
		const pullA = 0.5 + (def.along - 0.5) * 0.8, sp2 = 0.12;   // (pulled in a little, not all the way)
		const hs = def.wall === 1 ? { px: pullA, pz: 1 - sp2 } : def.wall === 0 ? { px: sp2, pz: pullA } : { px: 1 - sp2, pz: 1 - pullA };
		const av = avatarAt(hs.px, hs.pz);
		c.hot = new THREE.Vector2(av.x, av.z);
		c.ring = new THREE.Group();
		c.ringFill = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: c.tint.clone().multiplyScalar(1.2), transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
		c.ringEdge = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: c.tint.clone().multiplyScalar(1.6), transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
		for (const m of [c.ringFill, c.ringEdge]) { m.rotation.x = -Math.PI / 2; c.ring.add(m); }
		c.ring.position.y = 0.035;
		bouncer.scale.setScalar(c.size);
		c.touchAt = () => c.root.localToWorld(_v.set(0, 0.35 * c.size, 0.2)).clone();
		c.headAt = () => c.root.localToWorld(_v.set(0, c.top * c.size, 0)).clone();
		return c;
	}
	// a noodly limb: from a shoulder or hip, to a gloved hand or a shoe
	function limb(c, from, rest, r, end, side, leg) {
		const m = new THREE.Mesh(new THREE.BufferGeometry(), c.limbMat || MAT.dark);
		m.castShadow = true;
		c.bouncer.add(m);
		let tip = null;
		if (end === 'glove') { tip = mesh(GEO.sph, MAT.glove, c.bouncer, 0, 0, 0, r * 2.4, r * 2.2, r * 2.2); }
		if (end === 'shoe') { tip = mesh(GEO.sph, MAT.shoe, c.bouncer, 0, 0, 0, r * 2.2, r * 1.4, r * 3.4); }
		if (end === 'eye') {
			tip = new THREE.Group(); c.bouncer.add(tip);
			mesh(GEO.sph, MAT.pupilGloss, tip, 0, 0, 0, r * 2.4, r * 3.2, r * 2.4);
			mesh(GEO.sph, MAT.shine, tip, -r * 0.8, r * 1.2, r * 2.1, r * 0.6).castShadow = false;
		}
		c.limbs.push({ m, from: new THREE.Vector3(...from), rest: new THREE.Vector3(...rest), r, tip, side, leg, end });
	}

	const STRAND = new THREE.ConeGeometry(1, 1, 5, 1).translate(0, 0.5, 0);
	function fuzz(parent, [x, y, z], [rx, ry, rz], col, n, len, opts = {}) {
		const mat = furMat(col);
		const im = new THREE.InstancedMesh(STRAND, mat, n);
		const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), nrm = new THREE.Vector3();
		let k = 0;
		for (let tries = 0; k < n && tries < n * 6; tries++) {
			d.set(rr(-1, 1), rr(-1, 1), rr(-1, 1));
			if (d.lengthSq() > 1 || d.lengthSq() < 0.05) continue;
			d.normalize();
			if (opts.face !== false && d.z > 0.35 && d.y > -0.55 && Math.abs(d.x) < 0.75) continue;   // (keep the face clear)
			if (opts.below !== undefined && d.y < opts.below) continue;
			nrm.set(d.x / rx, d.y / ry, d.z / rz).normalize();
			nrm.y -= opts.droop === undefined ? 0.25 : opts.droop; nrm.normalize();   // (combed down a little)
			q.setFromUnitVectors(up, nrm);
			const l = len * rr(0.6, 1.25), w = len * rr(0.12, 0.2);
			m4.compose(new THREE.Vector3(x + d.x * rx * 0.93, y + d.y * ry * 0.93, z + d.z * rz * 0.93), q, new THREE.Vector3(w, l, w));
			im.setMatrixAt(k++, m4);
		}
		im.count = k;
		im.castShadow = true;
		parent.add(im);
		return im;
	}
	const BUILD = {
		mushroom(c) {
			c.limbMat = MAT.stem;
			// a tall, slim stalk, in many rings so it bends smoothly (and no arms: just a stalk with a face)
			const prof = [[0, 0], [0.2, 0]];
			for (let k = 1; k <= 16; k++) { const y = k / 16 * 1.62; prof.push([0.19 - 0.05 * (k / 16) + Math.sin(k / 16 * Math.PI) * 0.015, y]); }
			prof.push([0.12, 1.66], [0, 1.67]);
			const stem = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 20), MAT.stem);
			stem.castShadow = true; c.bouncer.add(stem);
			const cap = new THREE.Group(); cap.position.y = 1.6; c.bouncer.add(cap);
			const capMat = new THREE.MeshPhysicalMaterial({ color: c.tint, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, bumpMap: TEX.skin, bumpScale: 1.5, emissive: c.tint, emissiveIntensity: 0.12 });
			mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), capMat, cap, 0, 0, 0, 0.5, 0.42, 0.5);
			mesh(GEO.cyl, new THREE.MeshStandardMaterial({ color: '#f0e0c0', roughness: 0.8 }), cap, 0, 0, 0, 0.48, 0.03, 0.48);
			for (let k = 0; k < 9; k++) {
				const a = rnd() * Math.PI * 2, e = rr(0.25, 1.2);
				const sp = mesh(GEO.sphLo, new THREE.MeshPhysicalMaterial({ color: '#fffaf0', roughness: 0.4, emissive: '#ffffff', emissiveIntensity: 0.25 }), cap, Math.cos(a) * Math.sin(e) * 0.48, Math.cos(e) * 0.4, Math.sin(a) * Math.sin(e) * 0.48, rr(0.05, 0.09), 0.025, rr(0.05, 0.09));
				sp.lookAt(cap.localToWorld(new THREE.Vector3(sp.position.x * 3, sp.position.y * 3, sp.position.z * 3)));
			}
			c.parts.cap = cap;
			c.face = makeFace(c.bouncer, 0.42, 0, 0.9, 0.165, { gap: 0.3 });
			limb(c, [-0.09, 0.08, 0.04], [-0.14, -0.08, 0.12], 0.035, 'shoe', -1, true);
			limb(c, [0.09, 0.08, 0.04], [0.14, -0.08, 0.12], 0.035, 'shoe', 1, true);
			// a frilly skirt round the stalk, under the cap
			const skirt = mesh(new THREE.CylinderGeometry(0.17, 0.27, 0.12, 24, 1, true), new THREE.MeshPhysicalMaterial({ color: '#fff6e6', roughness: 0.6, sheen: 1, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide }), c.bouncer, 0, 1.32, 0);
			skirt.castShadow = false;
			c.top = 2.05;
			c.bend = 1.6;   // (the bendiest thing in the woods)
		},
		frog(c) {
			const skin = slickMat(c.tint);
			c.limbMat = skin;
			mesh(GEO.sph, skin, c.bouncer, 0, 0.32, 0, 0.42, 0.32, 0.36);
			mesh(GEO.sph, slickMat(new THREE.Color(c.tint).lerp(new THREE.Color('#fff6c8'), 0.6)), c.bouncer, 0, 0.26, 0.14, 0.32, 0.22, 0.26);
			for (const sx of [-1, 1]) mesh(GEO.sph, skin, c.bouncer, sx * 0.2, 0.56, 0.08, 0.16, 0.14, 0.15);
			c.face = makeFace(c.bouncer, 0.62, 0, 0.5, 0.26, { gap: 0.53 });   // (the eyes sit on its two eye-bumps, x ±0.2)
			c.parts.sac = mesh(GEO.sph, new THREE.MeshPhysicalMaterial({ color: '#ffd8b0', roughness: 0.15, clearcoat: 1, sheen: 0.6, sheenColor: new THREE.Color('#ffffff') }), c.bouncer, 0, 0.2, 0.3, 0.12, 0.1, 0.1);
			c.parts.tongue = mesh(GEO.cyl, MAT.tongue, c.bouncer, 0, 0.3, 0.32, 0.03, 0.001, 0.03);
			c.parts.tongue.rotation.x = Math.PI / 2;
			limb(c, [-0.3, 0.25, 0.1], [-0.42, 0.04, 0.3], 0.045, 'glove', -1);
			limb(c, [0.3, 0.25, 0.1], [0.42, 0.04, 0.3], 0.045, 'glove', 1);
			limb(c, [-0.3, 0.12, -0.1], [-0.5, 0.0, 0.1], 0.06, 'shoe', -1, true);
			limb(c, [0.3, 0.12, -0.1], [0.5, 0.0, 0.1], 0.06, 'shoe', 1, true);
			// spots on its back
			for (let k = 0; k < 7; k++) { const a = rr(-1.2, 1.2), e = rr(0.3, 1.1); mesh(GEO.sphLo, slickMat(new THREE.Color(c.tint).multiplyScalar(0.55)), c.bouncer, Math.sin(a) * Math.sin(e) * 0.42, 0.32 + Math.cos(e) * 0.32, -Math.cos(a) * Math.sin(e) * 0.36, rr(0.04, 0.07), 0.02, rr(0.04, 0.07)).castShadow = false; }
			c.top = 0.9;
		},
		hedgehog(c) {
			const fur = furMat(c.tint);
			c.limbMat = skinMat('#e8c8a8');
			mesh(GEO.sph, fur, c.bouncer, 0, 0.42, -0.05, 0.42, 0.4, 0.4);
			mesh(GEO.sph, skinMat('#f2d6b8'), c.bouncer, 0, 0.38, 0.12, 0.3, 0.3, 0.26);
			const snout = mesh(GEO.cone, skinMat('#f2d6b8'), c.bouncer, 0, 0.36, 0.42, 0.1, 0.24, 0.1);
			snout.rotation.x = Math.PI / 2;
			mesh(GEO.sph, MAT.shoe, c.bouncer, 0, 0.36, 0.55, 0.05);
			// spines, all over the back
			const spines = new THREE.InstancedMesh(GEO.cone, new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c.tint).multiplyScalar(0.55), roughness: 0.4, clearcoat: 0.6 }), 160);
			const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
			for (let k = 0; k < 160; k++) {
				let d;
				do { d = new THREE.Vector3(rr(-1, 1), rr(-0.3, 1), rr(-1, 0.35)); } while (d.length() > 1 || d.length() < 0.3);
				d.normalize();
				q.setFromUnitVectors(up, d);
				const pos = new THREE.Vector3(d.x * 0.44, 0.42 + d.y * 0.42, -0.05 + d.z * 0.42);
				m4.compose(pos.addScaledVector(d, 0.08), q, new THREE.Vector3(0.035, 0.22, 0.035));
				spines.setMatrixAt(k, m4);
			}
			spines.castShadow = true;
			c.bouncer.add(spines);
			c.face = makeFace(c.bouncer, 0.5, 0, 0.52, 0.32);
			// its drum
			const drum = new THREE.Group(); drum.position.set(0.4, 0, 0.35); c.root.add(drum);
			mesh(GEO.cyl, new THREE.MeshPhysicalMaterial({ color: '#c8323c', roughness: 0.3, clearcoat: 1 }), drum, 0, 0.18, 0, 0.2, 0.34, 0.2);
			mesh(GEO.cyl, new THREE.MeshStandardMaterial({ color: '#f8f0e0', roughness: 0.7 }), drum, 0, 0.355, 0, 0.19, 0.01, 0.19);
			c.parts.drum = drum;
			limb(c, [-0.32, 0.4, 0.15], [-0.4, 0.2, 0.4], 0.04, 'glove', -1);
			limb(c, [0.32, 0.4, 0.15], [0.42, 0.38, 0.38], 0.04, 'glove', 1);
			limb(c, [-0.15, 0.1, 0.05], [-0.2, -0.06, 0.15], 0.045, 'shoe', -1, true);
			limb(c, [0.15, 0.1, 0.05], [0.2, -0.06, 0.15], 0.045, 'shoe', 1, true);
			// little round ears, a pink nose, a fuzz of soft fur on its face
			for (const sx of [-1, 1]) mesh(GEO.sph, skinMat('#d8a888'), c.bouncer, sx * 0.24, 0.72, 0.12, 0.07, 0.08, 0.04);
			mesh(GEO.sph, skinMat('#ff7a8a'), c.bouncer, 0, 0.36, 0.56, 0.055);
			fuzz(c.bouncer, [0, 0.36, 0.1], [0.3, 0.3, 0.26], '#f2d6b8', 140, 0.06, { droop: 0.1 });
			c.top = 1.0;
		},
		snail(c) {
			const body = slickMat('#c8b890');
			c.limbMat = body;
			const foot = mesh(GEO.sph, body, c.bouncer, 0, 0.14, 0.05, 0.25, 0.14, 0.55);
			foot.rotation.x = 0.1;
			const head = mesh(GEO.sph, body, c.bouncer, 0, 0.32, 0.4, 0.2, 0.24, 0.2);
			c.face = makeFace(c.bouncer, 0.4, 0, 0.33, 0.57, { gap: 0.2 });
			const shell = new THREE.Group(); shell.position.set(0, 0.48, -0.12); c.bouncer.add(shell);
			const shellMat = new THREE.MeshPhysicalMaterial({ color: c.tint, roughness: 0.2, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.6, bumpMap: TEX.scales, bumpScale: 0.6, emissive: c.tint, emissiveIntensity: 0.1 });
			// (one fat tube coiled two and a half turns, growing as it goes, in the snail's side plane: seen side-on, a spiral)
			mesh(spiralShellGeo(), shellMat, shell, 0, 0, 0);
			c.parts.shell = shell; c.parts.shellMat = shellMat;
			limb(c, [-0.08, 0.5, 0.42], [-0.16, 0.85, 0.5], 0.02, 'eye', -1);
			limb(c, [0.08, 0.5, 0.42], [0.16, 0.85, 0.5], 0.02, 'eye', 1);
			limb(c, [-0.18, 0.3, 0.35], [-0.42, 0.25, 0.5], 0.03, 'glove', -1);
			limb(c, [0.18, 0.3, 0.35], [0.42, 0.3, 0.5], 0.03, 'glove', 1);
			c.top = 1.05;
		},
		owl(c) {
			const fur = furMat(c.tint, '#ffe8c8');
			c.limbMat = fur;
			// a stump to sit on
			mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.55, 18), MAT.bark, c.root, 0, 0.27, 0);
			const body = new THREE.Group(); body.position.y = 0.55; c.bouncer.add(body);
			mesh(GEO.sph, fur, body, 0, 0.4, 0, 0.36, 0.44, 0.32);
			mesh(GEO.sph, furMat('#f2e2c0'), body, 0, 0.3, 0.12, 0.25, 0.3, 0.22);
			const head = new THREE.Group(); head.position.set(0, 0.86, 0); body.add(head);
			mesh(GEO.sph, fur, head, 0, 0, 0, 0.32, 0.27, 0.28);
			mesh(GEO.sph, furMat('#f8ecd4'), head, 0, 0, 0.12, 0.27, 0.2, 0.18);
			for (const sx of [-1, 1]) { const tuft = mesh(GEO.cone, fur, head, sx * 0.2, 0.24, 0, 0.07, 0.2, 0.07); tuft.rotation.z = -sx * 0.4; }
			const beak = mesh(GEO.cone, new THREE.MeshPhysicalMaterial({ color: '#ffb02b', roughness: 0.3, clearcoat: 1 }), head, 0, -0.06, 0.32, 0.04, 0.1, 0.04);
			beak.rotation.x = Math.PI * 0.6;
			c.face = makeFace(head, 0.6, 0, 0.03, 0.27, { gap: 0.3 });
			c.parts.head = head;
			limb(c, [-0.32, 1.0, 0.0], [-0.5, 0.7, 0.1], 0.05, 'glove', -1);
			limb(c, [0.32, 1.0, 0.0], [0.5, 0.7, 0.1], 0.05, 'glove', 1);
			// wings, folded at its sides, in layered feathers; a crest of fluff; a fluffy chest
			for (const sx of [-1, 1]) {
				const wing = new THREE.Group(); wing.position.set(sx * 0.33, 0.95, -0.02); wing.rotation.z = sx * 0.12; c.bouncer.add(wing);
				for (let k = 0; k < 4; k++) mesh(GEO.sph, furMat(new THREE.Color(c.tint).offsetHSL(0, 0, -0.06 * k).getStyle()), wing, 0, -k * 0.09, -k * 0.015, 0.09, 0.2 - k * 0.025, 0.2 - k * 0.02);
			}
			fuzz(c.parts.head, [0, 0, 0], [0.32, 0.27, 0.28], c.tint, 220, 0.07);
			fuzz(c.bouncer, [0, 0.95, 0], [0.36, 0.44, 0.32], c.tint, 260, 0.07);
			c.top = 1.85;
		},
		gnome(c) {
			const coat = furMat(c.tint);
			c.limbMat = coat;
			mesh(new THREE.ConeGeometry(0.34, 0.75, 24), coat, c.bouncer, 0, 0.45, 0);
			mesh(GEO.sph, MAT.shoe, c.bouncer, 0, 0.42, 0.25, 0.3, 0.05, 0.08);
			const head = new THREE.Group(); head.position.y = 0.92; c.bouncer.add(head);
			mesh(GEO.sph, skinMat('#ffc8a8'), head, 0, 0, 0, 0.22, 0.22, 0.2);
			mesh(GEO.sph, skinMat('#ff9a8a'), head, 0, -0.03, 0.22, 0.08);
			const beard = mesh(new THREE.ConeGeometry(0.22, 0.45, 20), furMat('#f8f4ee', '#ffffff'), head, 0, -0.26, 0.08);
			beard.rotation.x = Math.PI;
			const hat = new THREE.Group(); hat.position.y = 0.12; head.add(hat);
			const hatM = mesh(new THREE.ConeGeometry(0.24, 0.7, 24), furMat(new THREE.Color(c.tint).offsetHSL(0.5, 0, 0).getStyle()), hat, 0, 0.35, -0.03);
			hatM.rotation.x = -0.15;
			mesh(GEO.sph, new THREE.MeshPhysicalMaterial({ color: '#ffe04a', emissive: '#ffb000', emissiveIntensity: 0.6, roughness: 0.2 }), hat, 0, 0.7, -0.12, 0.05);
			c.parts.hat = hat;
			c.face = makeFace(head, 0.42, 0, 0.06, 0.18);
			limb(c, [-0.2, 0.7, 0.05], [-0.45, 0.5, 0.2], 0.04, 'glove', -1);
			limb(c, [0.2, 0.7, 0.05], [0.45, 0.52, 0.2], 0.04, 'glove', 1);
			limb(c, [-0.12, 0.1, 0.05], [-0.16, -0.08, 0.15], 0.045, 'shoe', -1, true);
			limb(c, [0.12, 0.1, 0.05], [0.16, -0.08, 0.15], 0.045, 'shoe', 1, true);
			// a big round nose and a curly moustache
			const nose = c.parts.hat.parent;
			mesh(GEO.sph, skinMat('#ff9a8a'), nose, 0, -0.04, 0.22, 0.075);
			for (const sx of [-1, 1]) { const mo = mesh(new THREE.TorusGeometry(0.06, 0.03, 8, 16, Math.PI * 1.2), furMat('#f8f4ee', '#ffffff'), nose, sx * 0.065, -0.1, 0.19); mo.rotation.z = sx > 0 ? -0.2 : Math.PI + 0.2; }
			fuzz(nose, [0, -0.24, 0.1], [0.2, 0.25, 0.12], '#f8f4ee', 160, 0.06, { face: false, droop: 0.6 });
			c.top = 1.85;
		},
		fairy(c) {
			const skin = skinMat('#ffd8e8');
			c.limbMat = skin;
			const body = new THREE.Group(); body.position.y = 0.9; c.bouncer.add(body);
			c.parts.float = body;
			mesh(new THREE.ConeGeometry(0.2, 0.45, 20), new THREE.MeshPhysicalMaterial({ color: c.tint, roughness: 0.2, iridescence: 1, sheen: 1, sheenColor: new THREE.Color('#ffffff'), emissive: c.tint, emissiveIntensity: 0.3 }), body, 0, -0.05, 0);
			mesh(GEO.sph, skin, body, 0, 0.3, 0, 0.17, 0.18, 0.16);
			mesh(GEO.sph, furMat(new THREE.Color(c.tint).offsetHSL(0.15, 0.2, -0.1).getStyle()), body, 0, 0.42, -0.04, 0.2, 0.15, 0.18);
			c.face = makeFace(body, 0.36, 0, 0.3, 0.15);
			const wingMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, transparent: true, opacity: 0.5, iridescence: 1, iridescenceIOR: 1.8, side: THREE.DoubleSide, emissive: c.tint, emissiveIntensity: 0.4, depthWrite: false });
			c.parts.wings = [-1, 1].map((sx) => {
				const w = new THREE.Group(); w.position.set(sx * 0.05, 0.12, -0.12); body.add(w);
				const m = mesh(new THREE.CircleGeometry(0.32, 24), wingMat, w, sx * 0.3, 0.12, 0, 1, 0.55);
				m.rotation.z = sx * 0.5; m.castShadow = false;
				return w;
			});
			const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: TEX.soft, color: c.tint.clone().multiplyScalar(1.4), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
			body.add(glow);
			c.parts.glow = glow;
			limb(c, [-0.14, 1.05, 0.02], [-0.36, 0.95, 0.15], 0.025, 'glove', -1);
			limb(c, [0.14, 1.05, 0.02], [0.36, 1.25, 0.12], 0.025, 'glove', 1);
			limb(c, [-0.06, 0.72, 0], [-0.1, 0.5, 0.05], 0.025, 'shoe', -1, true);
			limb(c, [0.06, 0.72, 0], [0.1, 0.5, 0.05], 0.025, 'shoe', 1, true);
			// a bun of hair
			mesh(GEO.sph, furMat(new THREE.Color(c.tint).offsetHSL(0.15, 0.2, -0.15).getStyle()), c.parts.float, 0, 0.55, -0.08, 0.1);
			c.top = 1.65;
		},
		flower(c) {
			const green = slickMat('#3a9a3a');
			c.limbMat = green;
			mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.1, 10), green, c.bouncer, 0, 0.55, 0);
			for (const sx of [-1, 1]) { const lf = mesh(GEO.sph, new THREE.MeshPhysicalMaterial({ color: '#3aa83a', roughness: 0.3, clearcoat: 1, bumpMap: TEX.leaf, bumpScale: 1 }), c.bouncer, sx * 0.2, 0.3, 0, 0.22, 0.04, 0.09); lf.rotation.z = sx * 0.5; }
			const bloom = new THREE.Group(); bloom.position.y = 1.15; c.bouncer.add(bloom);
			const petalMat = new THREE.MeshPhysicalMaterial({ color: c.tint, roughness: 0.4, sheen: 1, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide, emissive: c.tint, emissiveIntensity: 0.15 });
			c.parts.petals = [];
			for (let k = 0; k < 9; k++) {
				const a = k / 9 * Math.PI * 2;
				const p = new THREE.Group(); p.rotation.z = a; bloom.add(p);
				const m = mesh(GEO.sph, petalMat, p, 0, 0.3, -0.02, 0.13, 0.22, 0.03);
				c.parts.petals.push(p);
				m.userData.base = 1;
			}
			mesh(GEO.sph, skinMat('#ffe8a0'), bloom, 0, 0, 0, 0.22, 0.22, 0.12);
			c.parts.bloom = bloom;
			c.face = makeFace(bloom, 0.42, 0, 0.02, 0.1);
			limb(c, [-0.05, 0.75, 0], [-0.4, 0.95, 0.15], 0.03, 'glove', -1);
			limb(c, [0.05, 0.75, 0], [0.4, 0.95, 0.15], 0.03, 'glove', 1);
			c.top = 1.65;
		},
		bunny(c) {
			const fur = furMat(c.tint, '#ffffff');
			c.limbMat = fur;
			mesh(GEO.sph, fur, c.bouncer, 0, 0.36, 0, 0.3, 0.34, 0.28);
			mesh(GEO.sph, furMat('#fffaf4'), c.bouncer, 0, 0.32, 0.14, 0.2, 0.24, 0.16);
			const head = new THREE.Group(); head.position.y = 0.82; c.bouncer.add(head);
			mesh(GEO.sph, fur, head, 0, 0, 0, 0.25, 0.23, 0.23);
			mesh(GEO.sph, skinMat('#ff8aa8'), head, 0, -0.02, 0.23, 0.04);
			for (const sx of [-1, 1]) mesh(GEO.box, MAT.tooth, head, sx * 0.025, -0.13, 0.2, 0.04, 0.07, 0.02);
			c.face = makeFace(head, 0.42, 0, 0.04, 0.2);
			c.parts.head = head;
			// ears are noodles too
			c.limbMatSave = c.limbMat;
			limb(c, [-0.1, 1.0, 0], [-0.18, 1.55, -0.05], 0.06, null, -1);
			limb(c, [0.1, 1.0, 0], [0.22, 1.55, -0.05], 0.06, null, 1);
			c.limbs[0].ear = c.limbs[1].ear = true;
			limb(c, [-0.24, 0.5, 0.05], [-0.42, 0.3, 0.2], 0.035, 'glove', -1);
			limb(c, [0.24, 0.5, 0.05], [0.42, 0.32, 0.2], 0.035, 'glove', 1);
			limb(c, [-0.13, 0.1, 0.05], [-0.18, -0.06, 0.18], 0.045, 'shoe', -1, true);
			limb(c, [0.13, 0.1, 0.05], [0.18, -0.06, 0.18], 0.045, 'shoe', 1, true);
			// a cotton tail, and soft fur all over
			mesh(GEO.sph, furMat('#ffffff'), c.bouncer, 0, 0.28, -0.3, 0.11);
			fuzz(c.bouncer, [0, 0.36, 0], [0.3, 0.34, 0.28], c.tint, 300, 0.06);
			fuzz(c.parts.head, [0, 0, 0], [0.25, 0.23, 0.23], c.tint, 200, 0.05);
			c.top = 1.75;
		},
		troll(c) {
			const fur = furMat(c.tint);
			c.limbMat = skinMat(new THREE.Color(c.tint).offsetHSL(0, -0.1, 0.1).getStyle());
			const belly = mesh(GEO.sph, fur, c.bouncer, 0, 0.95, 0, 0.75, 0.8, 0.6);
			c.parts.belly = mesh(GEO.sph, skinMat('#c8b890'), c.bouncer, 0, 0.85, 0.3, 0.5, 0.55, 0.38);
			const head = new THREE.Group(); head.position.set(0, 1.85, 0.08); c.bouncer.add(head);
			mesh(GEO.sph, c.limbMat, head, 0, 0, 0, 0.42, 0.38, 0.38);
			mesh(GEO.sph, skinMat('#a87a6a'), head, 0, -0.04, 0.38, 0.16, 0.13, 0.12);
			for (const sx of [-1, 1]) {
				const tusk = mesh(GEO.cone, MAT.tooth, head, sx * 0.18, -0.18, 0.3, 0.04, 0.16, 0.04);
				tusk.rotation.z = sx * 0.3;
				const ear = mesh(GEO.cone, c.limbMat, head, sx * 0.42, 0.06, 0, 0.08, 0.3, 0.06);
				ear.rotation.z = -sx * 1.2;
			}
			mesh(GEO.sph, furMat('#3a2a1a'), head, 0, 0.3, -0.05, 0.3, 0.14, 0.28);
			c.face = makeFace(head, 0.7, 0, 0.06, 0.33);
			c.parts.head = head;
			limb(c, [-0.68, 1.2, 0.05], [-1.0, 0.6, 0.35], 0.09, 'glove', -1);
			limb(c, [0.68, 1.2, 0.05], [1.0, 0.65, 0.35], 0.09, 'glove', 1);
			limb(c, [-0.3, 0.3, 0.0], [-0.4, -0.05, 0.25], 0.1, 'shoe', -1, true);
			limb(c, [0.3, 0.3, 0.0], [0.4, -0.05, 0.25], 0.1, 'shoe', 1, true);
			// a tuft of hair, warts, and shaggy fur
			fuzz(c.parts.head, [0, 0.3, -0.05], [0.3, 0.14, 0.28], '#3a2a1a', 120, 0.16, { face: false, droop: -0.3, below: -0.2 });
			for (let k = 0; k < 4; k++) mesh(GEO.sphLo, skinMat('#8a9a6a'), c.parts.head, rr(-0.28, 0.28), rr(-0.15, 0.2), 0.33, 0.03);
			fuzz(c.bouncer, [0, 0.95, 0], [0.75, 0.8, 0.6], c.tint, 520, 0.12);
			c.top = 2.4;
		},
	};

	/* the forest */

	// one material per look, shared (so the baking below can merge everything wearing it)
	const MC = new Map();
	const shared = (key, make) => { if (!MC.has(key)) MC.set(key, make()); return MC.get(key); };

	// Bake a group's still scenery: every mesh under it (but not the creatures, the
	// fluttering flags, or nested units with their own bounce) merged into one mesh
	// per material, in the group's own space. Hundreds of draw calls a wall become a few dozen.
	function bake(unit) {
		unit.updateMatrixWorld(true);
		const inv = new THREE.Matrix4().copy(unit.matrixWorld).invert();
		const buckets = new Map(), gone = [], m4 = new THREE.Matrix4();
		const walk = (o) => {
			for (const ch of o.children) {
				if (ch.userData.tag === 'creatures' || ch.userData.flutter !== undefined || ch.userData.unit) continue;
				if (ch.isMesh && !ch.isInstancedMesh && !ch.material.isShaderMaterial && !Array.isArray(ch.material)) {
					const key = ch.material.uuid + '|' + ch.castShadow + '|' + ch.receiveShadow + '|' + ch.renderOrder;
					if (!buckets.has(key)) buckets.set(key, { mat: ch.material, cast: ch.castShadow, recv: ch.receiveShadow, order: ch.renderOrder, geos: [] });
					const geo = ch.geometry.index ? ch.geometry.toNonIndexed() : ch.geometry.clone();
					for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name);
					geo.clearGroups();
					geo.applyMatrix4(m4.multiplyMatrices(inv, ch.matrixWorld));
					buckets.get(key).geos.push(geo);
					gone.push(ch);
				}
				walk(ch);
			}
		};
		walk(unit);
		for (const ch of gone) if (ch.parent) ch.parent.remove(ch);
		for (const b of buckets.values()) {
			const merged = mergeGeometries(b.geos, false);
			for (const g of b.geos) g.dispose();
			if (!merged) continue;
			const m = new THREE.Mesh(merged, b.mat);
			m.castShadow = b.cast; m.receiveShadow = b.recv; m.renderOrder = b.order;
			unit.add(m);
		}
	}

	// a canopy blob: an icosphere pushed about by a little noise, in leaves
	function blobGeo(detail, lumpy, s) {
		const g = new THREE.IcosahedronGeometry(1, detail);
		const p = g.attributes.position;
		const v = new THREE.Vector3();
		for (let i = 0; i < p.count; i++) {
			v.fromBufferAttribute(p, i);
			const k = 1 + lumpy * (Math.sin(v.x * 3.1 + s) * Math.sin(v.y * 2.7 + s * 2) * Math.sin(v.z * 3.3 + s * 3));
			v.multiplyScalar(k);
			p.setXYZ(i, v.x, v.y, v.z);
		}
		g.computeVertexNormals();
		return g;
	}
	const CANOPY = [0, 1, 2].map((k) => blobGeo(3, 0.28, k * 1.7));
	const SHRUB = [0, 1].map((k) => blobGeo(2, 0.35, k * 2.3 + 0.5));
	const TRUNK = [0, 1, 2].map((k) => {
		const g = new THREE.CylinderGeometry(0.28, 0.55, 7, 14, 10);
		const p = g.attributes.position;
		for (let i = 0; i < p.count; i++) {
			const y = p.getY(i);
			p.setX(i, p.getX(i) + Math.sin(y * 0.5 + k) * 0.25 * (y + 3.5) / 7);
			p.setZ(i, p.getZ(i) + Math.cos(y * 0.4 + k * 2) * 0.18 * (y + 3.5) / 7);
		}
		g.computeVertexNormals();
		g.translate(0, 3.5, 0);
		return g;
	});
	const leafMats = ['#3f8a3a', '#2f7a4a', '#5a9a2a', '#7aa83a'].map((cl) => rimify(new THREE.MeshPhysicalMaterial({ color: cl, map: TEX.leaf, bumpMap: TEX.leaf, bumpScale: 3, roughness: 0.6, sheen: 1, sheenColor: new THREE.Color('#d8ff9a'), sheenRoughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4 }), 0.35));

	function tree(group, x, z, s) {
		const g = new THREE.Group();
		g.position.set(x, 0, z);
		g.rotation.y = rnd() * Math.PI * 2;
		g.scale.setScalar(s);
		const tr = new THREE.Mesh(TRUNK[Math.floor(rnd() * 3)], MAT.bark);
		tr.castShadow = true; tr.receiveShadow = true;
		g.add(tr);
		for (let k = 0; k < 4; k++) {
			const a = k / 4 * Math.PI * 2 + rnd();
			const root = mesh(GEO.cone, MAT.bark, g, Math.cos(a) * 0.45, 0.25, Math.sin(a) * 0.45, 0.22, 0.9, 0.22);
			root.rotation.z = Math.cos(a) * 1.1; root.rotation.x = -Math.sin(a) * 1.1;
		}
		const lm = leafMats[Math.floor(rnd() * leafMats.length)];
		for (let k = 0; k < 5; k++) {
			const a = rnd() * Math.PI * 2, r = rr(0, 1.4);
			const b = mesh(CANOPY[k % 3], lm, g, Math.cos(a) * r, rr(6.2, 8.2), Math.sin(a) * r, rr(1.4, 2.3), rr(1.1, 1.6), rr(1.4, 2.3));
			b.receiveShadow = true;
			g.updateMatrixWorld(true);
			const wp = b.getWorldPosition(new THREE.Vector3());
			canopySpots.push({ x: wp.x + group.position.x, y: wp.y, z: wp.z + group.position.z, s: b.scale.x * s });
		}
		const pool = mesh(GEO.shadow, MAT.shadow, group, x, 0.015, z, 5 * s, 5 * s);
		pool.rotation.x = -Math.PI / 2; pool.castShadow = false;
		g.userData.tag = 'trees';
		group.add(g);
		return g;
	}
	function shrub(group, x, z, s, cl) {
		const m = mesh(SHRUB[Math.floor(rnd() * 2)], leafMats[Math.floor(rnd() * 4)], group, x, s * 0.55, z, s, s * 0.75, s);
		m.receiveShadow = true;
		// a few berries or blossoms that glow
		for (let k = 0; k < 6; k++) {
			const a = rnd() * Math.PI * 2, e = rr(0.2, 1.2);
			mesh(GEO.sphLo, shared('berry' + cl, () => new THREE.MeshStandardMaterial({ color: cl, emissive: cl, emissiveIntensity: 1.6 })), group, x + Math.cos(a) * Math.sin(e) * s, s * 0.55 + Math.cos(e) * s * 0.75, z + Math.sin(a) * Math.sin(e) * s, 0.06);
		}
	}
	function giantMushroom(group, x, z, h, cl) {
		const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
		const stem = mesh(new THREE.CylinderGeometry(h * 0.07, h * 0.1, h, 16), MAT.stem, g, 0, h / 2, 0);
		stem.receiveShadow = true;
		const capMat = shared('cap' + cl, () => new THREE.MeshPhysicalMaterial({ color: cl, roughness: 0.35, clearcoat: 1, emissive: cl, emissiveIntensity: 0.35, bumpMap: TEX.skin, bumpScale: 2 }));
		mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), capMat, g, 0, h * 0.95, 0, h * 0.42, h * 0.26, h * 0.42);
		const gills = mesh(new THREE.CircleGeometry(h * 0.41, 32), shared('gill' + cl, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(cl).multiplyScalar(1.6), side: THREE.DoubleSide })), g, 0, h * 0.95, 0);
		gills.rotation.x = Math.PI / 2;
		for (let k = 0; k < 7; k++) {
			const a = rnd() * Math.PI * 2, e = rr(0.2, 1.1);
			mesh(GEO.sphLo, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.4) }), g, Math.cos(a) * Math.sin(e) * h * 0.42, h * 0.95 + Math.cos(e) * h * 0.26, Math.sin(a) * Math.sin(e) * h * 0.42, h * 0.035, h * 0.012, h * 0.035);
		}
		g.userData.bob = rnd() * 6;
		g.userData.unit = true;
		bake(g);
		return g;
	}

	// grass: one instanced patch per clearing, swaying in the shader
	const grassGeo = (function () {
		const g = new THREE.PlaneGeometry(0.06, 0.45, 1, 4);
		const p = g.attributes.position;
		for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.225; p.setY(i, y); p.setX(i, p.getX(i) * (1 - y / 0.5)); p.setZ(i, y * y * 0.4); }
		g.computeVertexNormals();
		return g;
	})();
	const swayU = { uTime: { value: 0 }, uBeat: { value: 0 } };
	function grassMat(cl) {
		const m = new THREE.MeshStandardMaterial({ color: cl, roughness: 0.6, side: THREE.DoubleSide });
		m.onBeforeCompile = (sh) => {
			sh.uniforms.uTime = swayU.uTime;
			sh.uniforms.uBeat = swayU.uBeat;
			sh.vertexShader = 'uniform float uTime; uniform float uBeat;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
				float ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.5;
				transformed.x += sin(uTime * 1.6 + ph) * 0.07 * position.y + uBeat * 0.05 * position.y;
				transformed.z += cos(uTime * 1.3 + ph) * 0.05 * position.y;`);
		};
		return m;
	}

	// sparkles: fireflies, dew and spores, twinkling, in their own shader
	function sparkles(group, cx, cz, nPts, cl, radius, h0, h1, size) {
		const g = new THREE.BufferGeometry();
		const pos = new Float32Array(nPts * 3), ph = new Float32Array(nPts), sz = new Float32Array(nPts);
		for (let k = 0; k < nPts; k++) {
			const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * radius;
			pos[k * 3] = cx + Math.cos(a) * r; pos[k * 3 + 1] = rr(h0, h1); pos[k * 3 + 2] = cz + Math.sin(a) * r;
			ph[k] = rnd(); sz[k] = size * rr(0.5, 1.4);
		}
		g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
		g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
		g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
		const m = new THREE.ShaderMaterial({
			uniforms: { uTime: sparkleU.uTime, uPx: sparkleU.uPx, uColor: { value: new THREE.Color(cl).multiplyScalar(2.2) } },
			transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
			vertexShader: `attribute float aPhase; attribute float aSize; uniform float uTime; uniform float uPx; varying float vA;
				void main(){ vec3 p = position; p.y += sin(uTime * 0.6 + aPhase * 6.28) * 0.3; p.x += sin(uTime * 0.37 + aPhase * 12.) * 0.25; p.z += cos(uTime * 0.41 + aPhase * 9.) * 0.25;
					vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
					float tw = pow(0.5 + 0.5 * sin(uTime * 2.6 + aPhase * 40.), 5.);
					vA = 0.2 + tw; gl_PointSize = aSize * uPx * (0.6 + tw) / -mv.z; }`,
			fragmentShader: `uniform vec3 uColor; varying float vA;
				void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q);
					float core = smoothstep(0.5, 0., d); core *= core;
					float cr = max(0., 1. - abs(q.x) * 16.) * max(0., 1. - abs(q.y) * 2.) + max(0., 1. - abs(q.y) * 16.) * max(0., 1. - abs(q.x) * 2.);
					gl_FragColor = vec4(uColor * (core + cr * 0.7) * vA, 1.); }`,
		});
		const pts = new THREE.Points(g, m);
		pts.userData.tag = 'sparkles';
		pts.frustumCulled = false;
		group.add(pts);
	}

	// bursts: confetti, spores, splashes, fairy dust when a trick goes off
	const BURST_N = 700;
	const burst = { pos: new Float32Array(BURST_N * 3), col: new Float32Array(BURST_N * 3), vel: [], life: new Float32Array(BURST_N), next: 0 };
	for (let k = 0; k < BURST_N; k++) burst.vel.push(new THREE.Vector3());
	const burstGeo = new THREE.BufferGeometry();
	burstGeo.setAttribute('position', new THREE.BufferAttribute(burst.pos, 3));
	burstGeo.setAttribute('color', new THREE.BufferAttribute(burst.col, 3));
	const burstPts = new THREE.Points(burstGeo, new THREE.PointsMaterial({ size: 0.09, map: TEX.soft, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
	burstPts.frustumCulled = false;
	scene.add(burstPts);
	function spray(at, cl, nPts, speed, up = 1.5) {
		const c = new THREE.Color(cl);
		for (let k = 0; k < nPts; k++) {
			const i = burst.next = (burst.next + 1) % BURST_N;
			burst.pos[i * 3] = at.x; burst.pos[i * 3 + 1] = at.y; burst.pos[i * 3 + 2] = at.z;
			burst.vel[i].set(rr(-1, 1), rr(0.2, 1) * up, rr(-1, 1)).normalize().multiplyScalar(speed * rr(0.4, 1));
			const hue = c.clone().offsetHSL(rr(-0.08, 0.08), 0, rr(-0.1, 0.2)).multiplyScalar(2);
			burst.col[i * 3] = hue.r; burst.col[i * 3 + 1] = hue.g; burst.col[i * 3 + 2] = hue.b;
			burst.life[i] = rr(0.8, 1.6);
		}
	}

	// god rays: soft shafts of light leaning through the canopy
	function rays(group, cx, cz, cl) {
		const m = new THREE.MeshBasicMaterial({ map: TEX.ray, color: new THREE.Color(cl).multiplyScalar(0.35), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
		for (let k = 0; k < 7; k++) {
			const a = rr(-Math.PI * 0.95, Math.PI * 0.05) - Math.PI / 2, r = rr(4, 9);
			const p = mesh(new THREE.PlaneGeometry(rr(0.8, 1.8), 12), m, group, cx + Math.cos(a) * r, 5, cz + Math.sin(a) * r);
			p.castShadow = false;
			p.rotation.set(0, -a, 0.35);
		}
	}

	// light shafts: open cones leaning from the sun, brightest where you look through them
	const shaftU = { uTime: sparkleU.uTime, uCol: { value: new THREE.Color() } };
	const shaftMat = new THREE.ShaderMaterial({
		uniforms: shaftU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
		vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }',
		fragmentShader: `uniform float uTime; uniform vec3 uCol; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
			void main(){
				float edge = pow(abs(dot(vN, vV)), 2.2);
				float along = smoothstep(0., 0.2, vUv.y) * smoothstep(1., 0.45, vUv.y);
				float flick = 0.7 + 0.3 * sin(uTime * 0.6 + vUv.x * 12.566) * sin(uTime * 0.37 + vUv.x * 6.283 + 1.3);
				gl_FragColor = vec4(uCol * edge * along * flick * 0.2, 1.);
			}`,
	});
	function shafts(group, cx, cz, ci) {
		const d = new THREE.Vector3(...SKY[ci].dir);
		d.set(d.x * 0.55, Math.max(d.y, 0.55), d.z * 0.55).normalize();
		const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
		for (let k = 0; k < 9; k++) {
			const a = -Math.PI / 2 + rr(-2.1, 2.1), r = rr(3.6, 11);
			const len = rr(13, 18);
			const m = new THREE.Mesh(new THREE.CylinderGeometry(rr(0.25, 0.6), rr(0.9, 1.9), len, 24, 1, true), shaftMat);
			m.quaternion.copy(q);
			m.position.set(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r).addScaledVector(d, len / 2 - 0.3);
			m.renderOrder = 2;
			m.userData.tag = 'shafts';
			group.add(m);
		}
		// dust drifting in the light
		sparkles(group, cx, cz - 3, 380, '#fff6e0', 9, 0.4, 6, 0.035);
	}
	// ground mist: soft, drifting layers, thin near you and thicker out among the trees
	const mistU = { uTime: sparkleU.uTime, uCol: { value: new THREE.Color() }, uA: { value: 0.4 } };
	const mistMat = new THREE.ShaderMaterial({
		uniforms: mistU, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
		vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
		fragmentShader: `uniform float uTime; uniform vec3 uCol; uniform float uA; varying vec3 vW;
			${NOISE}
			void main(){
				vec2 p = vW.xz * 0.11 + vec2(uTime * 0.03, uTime * 0.013) + vW.y * 2.7;
				float m = smoothstep(0.3, 0.8, fbm(p));
				float dd = distance(vW.xz, cameraPosition.xz);
				float a = m * uA * smoothstep(2.7, 6.5, dd) * (1. - smoothstep(22., 34., dd));
				gl_FragColor = vec4(uCol, a);
			}`,
	});
	function mist(group, cx, cz) {
		for (const [y, s] of [[0.18, 1], [0.7, 0.75]]) {
			const m = new THREE.Mesh(new THREE.PlaneGeometry(64, 64), mistMat);
			m.rotation.x = -Math.PI / 2;
			m.position.set(cx, y, cz);
			m.scale.setScalar(s);
			m.renderOrder = 3;
			m.userData.tag = 'mist';
			group.add(m);
		}
	}

	// leaf cards: clumps of painted leaves round each canopy, so the trees have a ragged, leafy edge
	TEX.cards = canvasTexture(256, 256, function (c, w) {
		c.clearRect(0, 0, w, w);
		for (let i = 0; i < 46; i++) {
			const a = Math.random() * Math.PI * 2, r = Math.random() * w * 0.36;
			const x = w / 2 + Math.cos(a) * r, y = w / 2 + Math.sin(a) * r, s = 14 + Math.random() * 18;
			c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2 + (Math.random() - 0.5));
			const g = Math.floor(110 + Math.random() * 100);
			c.fillStyle = `rgb(${Math.floor(g * 0.45)},${g},${Math.floor(g * 0.35)})`;
			c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(s * 0.55, 0, 0, s); c.quadraticCurveTo(-s * 0.55, 0, 0, -s); c.fill();
			c.strokeStyle = 'rgba(20,50,10,0.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -s); c.lineTo(0, s); c.stroke();
			c.restore();
		}
	});
	TEX.fern = canvasTexture(128, 512, function (c, w, h) {
		c.clearRect(0, 0, w, h);
		c.strokeStyle = '#2f6a1f'; c.lineWidth = 4; c.beginPath(); c.moveTo(w / 2, h); c.lineTo(w / 2, 0); c.stroke();
		for (let y = 20; y < h - 10; y += 14) {
			const s = (1 - y / h) * 0.2 + Math.sin(y / h * Math.PI) * 0.8;
			for (const sx of [-1, 1]) {
				c.fillStyle = `rgb(${60 + Math.random() * 30},${140 + Math.random() * 50},${40 + Math.random() * 20})`;
				c.beginPath(); c.ellipse(w / 2 + sx * s * 26, y, s * 26, 6, sx * 0.4, 0, Math.PI * 2); c.fill();
			}
		}
	});
	const cardMat = rimify(new THREE.MeshStandardMaterial({ map: TEX.cards, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.55 }), 0.5);
	const fernMat = rimify(new THREE.MeshStandardMaterial({ map: TEX.fern, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.5 }), 0.4);
	TEX.bigleaf = canvasTexture(256, 512, function (c, w, h) {
		c.clearRect(0, 0, w, h);
		const g = c.createLinearGradient(0, h, 0, 0);
		g.addColorStop(0, '#1f5a24'); g.addColorStop(0.6, '#3f9a3a'); g.addColorStop(1, '#7ac84a');
		c.fillStyle = g;
		c.beginPath(); c.moveTo(w / 2, h); c.bezierCurveTo(-w * 0.15, h * 0.55, w * 0.1, h * 0.05, w / 2, 0); c.bezierCurveTo(w * 0.9, h * 0.05, w * 1.15, h * 0.55, w / 2, h); c.fill();
		c.strokeStyle = 'rgba(200,255,160,0.55)'; c.lineWidth = 4;
		c.beginPath(); c.moveTo(w / 2, h); c.lineTo(w / 2, h * 0.06); c.stroke();
		c.lineWidth = 2;
		for (let y = h * 0.85; y > h * 0.12; y -= h * 0.08) for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(w / 2, y); c.quadraticCurveTo(w / 2 + sx * w * 0.2, y - h * 0.03, w / 2 + sx * w * 0.38, y - h * 0.1); c.stroke(); }
	});
	const bigLeafMat = rimify(new THREE.MeshStandardMaterial({ map: TEX.bigleaf, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.4 }), 0.5);
	const bigLeafGeo = (function () {
		const g = new THREE.PlaneGeometry(0.7, 1.1, 3, 6);
		const p = g.attributes.position;
		for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.55, x = p.getX(i); p.setY(i, y * 0.9); p.setZ(i, y * y * 0.4 - x * x * 0.5); }
		g.computeVertexNormals();
		return g;
	})();
	const fernGeo = (function () {
		const g = new THREE.PlaneGeometry(0.34, 1.1, 1, 8);
		const p = g.attributes.position;
		for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.55; p.setY(i, y * 0.8); p.setZ(i, y * y * 0.45); }
		g.computeVertexNormals();
		return g;
	})();
	let canopySpots = [];
	let plantOK = () => true;
	// a spot in the ring round a clearing: dense just behind the creatures, thinning out into the trees
	const ringR = (r0 = 3.7, span = 6) => r0 + Math.pow(rnd(), 1.5) * span;
	function vegetation(group, cx, cz, C) {
		const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3();
		// leaf cards round every canopy blob
		const NC = canopySpots.length * 9;
		const cards = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), cardMat, NC);
		let k = 0;
		for (const sp of canopySpots) for (let j = 0; j < 9; j++) {
			v.set(rr(-1, 1), rr(-0.9, 0.6), rr(-1, 1)).normalize();
			e.set(rnd() * 6, rnd() * 6, rnd() * 6); q.setFromEuler(e);
			const s = sp.s * rr(0.8, 1.4);
			m4.compose(new THREE.Vector3(sp.x + v.x * sp.s * 0.95, sp.y + v.y * sp.s * 0.7, sp.z + v.z * sp.s * 0.95), q, new THREE.Vector3(s, s, s));
			cards.setMatrixAt(k++, m4);
		}
		cards.userData.tag = 'cards';
		group.add(cards);
		// ferns, in clumps round the shrubs and trunks
		const NF = 170 * 7;
		const ferns = new THREE.InstancedMesh(fernGeo, fernMat, NF);
		k = 0;
		for (let c = 0; c < 170; c++) {
			let x, z, r, tries = 0;
			do { const a = rnd() * Math.PI * 2; r = ringR(3.5, 7); x = cx + Math.cos(a) * r; z = cz + Math.sin(a) * r; } while (!plantOK(x, z, 0.1) && ++tries < 12);
			if (tries >= 12) { x = cx; z = cz + 40; }   // (nowhere fit: tuck it away out of sight)
			for (let j = 0; j < 7; j++) {
				e.set(0, j / 7 * Math.PI * 2 + rnd(), 0); q.setFromEuler(e);
				const s = rr(0.8, 1.6) * (0.8 + (r - 3.5) * 0.06);
				m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s, s));
				ferns.setMatrixAt(k++, m4);
			}
		}
		ferns.receiveShadow = true;
		ferns.userData.tag = 'ferns';
		// big-leafed plants, clumped through the ring
		const NB = 120 * 5;
		const big = new THREE.InstancedMesh(bigLeafGeo, bigLeafMat, NB);
		k = 0;
		for (let c = 0; c < 120; c++) {
			let x, z, r, tries = 0;
			do { const a = rnd() * Math.PI * 2; r = ringR(3.8, 6); x = cx + Math.cos(a) * r; z = cz + Math.sin(a) * r; } while (!plantOK(x, z, 0.2) && ++tries < 12);
			if (tries >= 12) { x = cx; z = cz + 40; }
			const s0 = rr(0.8, 1.7);
			for (let j = 0; j < 5; j++) {
				e.set(rr(-0.25, 0.1), j / 5 * Math.PI * 2 + rnd(), 0, 'YXZ'); q.setFromEuler(e);
				const s = s0 * rr(0.75, 1.15);
				m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s, s));
				big.setMatrixAt(k++, m4);
			}
		}
		big.receiveShadow = true;
		big.userData.tag = 'ferns';
		group.add(big);
		group.add(ferns);
		// little glowing flowers scattered through the grass
		const NFl = 520;
		const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.7, 1.7) }), NFl);
		const tint = new THREE.Color();
		for (let j = 0; j < NFl; j++) {
			const a = rnd() * Math.PI * 2, r = rr(3, 12);
			m4.compose(new THREE.Vector3(cx + Math.cos(a) * r, rr(0.05, 0.3), cz + Math.sin(a) * r), q.identity(), new THREE.Vector3(1, rr(0.5, 0.8), 1));
			flowers.setMatrixAt(j, m4);
			flowers.setColorAt(j, tint.set(C.lights[j % 4]).lerp(new THREE.Color('#ffffff'), rnd() * 0.3));
		}
		flowers.userData.tag = 'flowers';
		group.add(flowers);
		// pebbles
		const NP = 140;
		const pebbles = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.1, 0), new THREE.MeshPhysicalMaterial({ color: '#8a8478', roughness: 0.55, clearcoat: 0.6, bumpMap: TEX.skin, bumpScale: 1 }), NP);
		for (let j = 0; j < NP; j++) {
			const a = rnd() * Math.PI * 2, r = rr(3, 11);
			e.set(rnd() * 3, rnd() * 3, rnd() * 3); q.setFromEuler(e);
			const s = rr(0.4, 1.6);
			m4.compose(new THREE.Vector3(cx + Math.cos(a) * r, 0.03, cz + Math.sin(a) * r), q, new THREE.Vector3(s, s * 0.6, s));
			pebbles.setMatrixAt(j, m4);
		}
		pebbles.receiveShadow = true;
		pebbles.userData.tag = 'pebbles';
		group.add(pebbles);
		// vines hanging from the canopies, a glowing bulb on the end of each
		const vineMat = rimify(new THREE.MeshPhysicalMaterial({ color: '#3a7a2a', roughness: 0.5, bumpMap: TEX.leaf, bumpScale: 2, sheen: 1, sheenColor: new THREE.Color('#c8ff8a') }), 0.5);
		const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.lights[2]).multiplyScalar(2.2) });
		group.userData.bulbMat = bulbMat;
		group.userData.bulbBase = bulbMat.color.clone();
		for (const sp of canopySpots) {
			if (rnd() < 0.55) continue;
			const top = new THREE.Vector3(sp.x + rr(-0.6, 0.6), sp.y - sp.s * 0.5, sp.z + rr(-0.6, 0.6));
			const len = rr(1.8, 4.2);
			const pts = [top, top.clone().add(new THREE.Vector3(rr(-0.3, 0.3), -len * 0.4, rr(-0.3, 0.3))), top.clone().add(new THREE.Vector3(rr(-0.4, 0.4), -len, rr(-0.4, 0.4)))];
			const vine = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.025, 5), vineMat);
			group.add(vine);
			const bulb = mesh(GEO.sphLo, bulbMat, group, pts[2].x, pts[2].y - 0.06, pts[2].z, 0.07);
			bulb.castShadow = false;
		}
	}

	// each clearing's own motif
	const MOTIF = {
		mushrooms(g, ci, cx, cz, C) {
			const cols = ['#ff4fa8', '#7affd8', '#ffd04a', '#a87aff', '#ff7a3a'];
			for (let k = 0; k < 9; k++) {
				const a = -Math.PI / 2 + rr(-2.1, 2.1), r = rr(6.5, 11);
				giantMushroom(g, cx + Math.cos(a) * r, cz + Math.sin(a) * r, rr(2.8, 6), cols[k % cols.length]);
			}
		},
		pond(g, ci, cx, cz, C) {
			for (let k = 0; k < 0; k++) {   // (the scattered pads moved into the pond itself: buildPond)
				const a = rr(0, Math.PI * 2), r = rr(3.5, 8.5);
				const pad = mesh(new THREE.CircleGeometry(rr(0.3, 0.6), 24, 0.3, Math.PI * 2 - 0.5), new THREE.MeshPhysicalMaterial({ color: '#2f8a3a', roughness: 0.3, clearcoat: 1, side: THREE.DoubleSide }), g, cx + Math.cos(a) * r, 0.03, cz - 2 + Math.sin(a) * r);
				pad.rotation.x = -Math.PI / 2; pad.rotation.z = rnd() * 6;
				if (rnd() < 0.4) mesh(GEO.sph, new THREE.MeshStandardMaterial({ color: '#ffd0f0', emissive: '#ff7ad8', emissiveIntensity: 1.2 }), g, pad.position.x, 0.12, pad.position.z, 0.12, 0.08, 0.12);
			}
			for (let k = 0; k < 40; k++) {
				const a = -Math.PI / 2 + rr(-2, 2), r = rr(5, 9);
				const reed = mesh(GEO.cyl, new THREE.MeshStandardMaterial({ color: '#4a7a2a', roughness: 0.7 }), g, cx + Math.cos(a) * r, 0.8, cz + Math.sin(a) * r, 0.025, rr(1.2, 2), 0.025);
				reed.rotation.z = rr(-0.15, 0.15);
				mesh(GEO.cyl, new THREE.MeshStandardMaterial({ color: '#5a3a1a', roughness: 0.8 }), g, reed.position.x, reed.scale.y * 0.5 + 0.8, reed.position.z, 0.05, 0.3, 0.05);
			}
			sparkles(g, cx, cz, 350, '#d8ff6a', 11, 0.3, 3.5, 0.12);
		},
		stage(g, ci, cx, cz, C) {
			const log = mesh(new THREE.CylinderGeometry(0.8, 0.8, 9, 24), MAT.bark, g, cx, 0.5, cz - 5.4);
			log.rotation.z = Math.PI / 2; log.receiveShadow = true;
			// bunting between the trees
			const cols = ['#ff4fa8', '#ffd23a', '#3ad0ff', '#7aff6a', '#ff7a3a'];
			for (let side = 0; side < 3; side++) {
				const a0 = -Math.PI / 2 + (side - 1) * 1.2;
				for (let k = 0; k < 10; k++) {
					const u = k / 9;
					const a = a0 + (u - 0.5) * 1.0, r = 6;
					const flag = mesh(new THREE.ConeGeometry(0.16, 0.36, 3), shared('flag' + cols[k % 5], () => new THREE.MeshStandardMaterial({ color: cols[k % 5], emissive: cols[k % 5], emissiveIntensity: 0.25, side: THREE.DoubleSide })), g, cx + Math.cos(a) * r, 3.4 - Math.sin(u * Math.PI) * 0.8, cz + Math.sin(a) * r);
					flag.rotation.x = Math.PI;
					flag.userData.flutter = rnd() * 6;
				}
			}
			for (let k = 0; k < 8; k++) {
				const a = -Math.PI / 2 + rr(-1.8, 1.8);
				const lamp = mesh(GEO.sph, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.6) }), g, cx + Math.cos(a) * 5.8, rr(2.6, 3.6), cz + Math.sin(a) * 5.8, 0.09);
				lamp.castShadow = false;
			}
		},
		ring(g, ci, cx, cz, C) {
			const cols = ['#ff7aff', '#7ad8ff', '#fff07a'];
			for (let k = 0; k < 16; k++) {
				const a = -Math.PI / 2 + (k / 15 - 0.5) * 3.6, r = 4.3;
				giantMushroom(g, cx + Math.cos(a) * r, cz + Math.sin(a) * r, rr(0.35, 0.6), cols[k % 3]);
			}
			sparkles(g, cx, cz, 500, '#ffd8ff', 12, 0.4, 5, 0.1);
		},
		bridge(g, ci, cx, cz, C) {
			const stone = new THREE.MeshStandardMaterial({ color: '#8a8a7a', roughness: 0.9, bumpMap: TEX.moss, bumpScale: 4 });
			const arch = mesh(new THREE.TorusGeometry(5, 0.8, 16, 40, Math.PI), stone, g, cx, 0, cz - 8.5, 1, 0.8, 1.4);
			arch.receiveShadow = true;
			for (let k = 0; k < 12; k++) { const u = k / 11; mesh(GEO.sph, leafMats[1], g, cx + Math.cos(u * Math.PI) * 5, Math.sin(u * Math.PI) * 4.2 + 0.5, cz - 8.5, rr(0.4, 0.8), 0.35, 0.6); }
			const stream = mesh(new THREE.PlaneGeometry(3.5, 30), new THREE.MeshPhysicalMaterial({ color: '#1a5a6a', roughness: 0.05, clearcoat: 1 }), g, cx, 0.012, cz - 14);
			stream.rotation.x = -Math.PI / 2; stream.castShadow = false;
			for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + rr(-2, 2); giantMushroom(g, cx + Math.cos(a) * 9, cz + Math.sin(a) * 9, rr(1.5, 3), ['#a8ff6a', '#ff8a4a'][k % 2]); }
			sparkles(g, cx, cz, 300, '#a8ffd8', 11, 0.3, 4, 0.1);
		},
	};

	function buildClearing(ci) {
		const C = CLEARINGS[ci];
		const g = new THREE.Group();
		const cx = 0, cz = -ci * SPACING;
		g.userData.c = C;
		scene.add(g);
		clearingGroups.push(g);
		seed = 1000 + ci * 77;
		// the floor: moss, and the path running through
		const ground = mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: new THREE.Color(C.ground).lerp(new THREE.Color('#ffffff'), 0.35), map: TEX.floor, bumpMap: TEX.moss, bumpScale: 3, roughness: 0.92 }), g, cx, 0, cz);
		ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.castShadow = false;
		// the path on to the next clearing: a ribbon along its winding line, its edges ragged
		if (ci < PATH_AMP.length) {
			const N = 160, Wd = 1.2, pos = [], uv = [], idx = [];
			for (let k = 0; k <= N; k++) {
				const t = k / N, z0 = cz - t * SPACING, x0 = cx + pathX(ci, t), sl = pathSlope(ci, t);
				const nx = 1 / Math.sqrt(1 + sl * sl), nz = sl / Math.sqrt(1 + sl * sl);
				for (const side of [-1, 1]) {
					const w = Wd * (1 + 0.12 * Math.sin(k * 1.7 + side) + 0.08 * Math.sin(k * 0.43 + side * 2));
					pos.push(x0 + side * w * nx, 0.006, z0 + side * w * nz);
					uv.push(side * 0.5 + 0.5, t * SPACING / 2.4);
				}
				if (k) { const a = (k - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
			}
			const geo = new THREE.BufferGeometry();
			geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
			geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
			geo.setIndex(idx);
			geo.computeVertexNormals();
			const path = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#8a6a4a', roughness: 1, bumpMap: TEX.moss, bumpScale: 2, side: THREE.DoubleSide }));
			path.receiveShadow = true;
			g.add(path);
		}
		canopySpots = [];
		// where the creatures will stand (they're built last): plants keep clear of them, the room and the path
		const spots = C.creatures.map((d) => {
			const D = R + d.out, lat = (d.along - 0.5) * 2 * D;
			return d.wall === 1 ? [cx + lat, cz - D] : d.wall === 0 ? [cx - D, cz - lat] : [cx + D, cz + lat];
		});
		plantOK = (x, z, pad = 0) => {
			if (Math.abs(x - cx) < R + 0.35 && Math.abs(z - cz) < R + 0.35) return false;
			if (C.pond && z < cz + 0.2 && z > cz - POND.back - 1.4 && Math.abs(x - cx) < POND.half + 0.5) return false;   // (the pond and its waterfall)
			if (pathDist(x - cx, z) < 1.7) return false;   // (the winding path, ahead and behind: the walk goes through)
			if (C.chimes && z < cz - 7 && z > cz - 10 && Math.abs(x - cx) < 4.6) return false;   // (under the arch: the chimes)
			if (C.xylo && z < cz - R + 0.2 && z > cz - R - 1.1 && Math.abs(x - cx) < R + 0.4) return false;   // (the logs)
			if (C.piano !== undefined && x < cx - 0.8 && x > cx - R - 4.6 && Math.abs(z - cz) < Math.min(0.72 * (cx - x), R) + 0.45) return false;   // (the piano's panels and crystals)   // (the stepping stones)
			return !spots.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 0.95 + pad);
		};
		// trees in rings, the nearest framing the corners between the walls
		for (const a of [-Math.PI * 0.75, -Math.PI * 0.25, Math.PI * 0.25]) tree(g, cx + Math.cos(a) * 6.2, cz + Math.sin(a) * 6.2, rr(0.9, 1.1));
		for (let k = 0; k < 22; k++) {
			const a = rnd() * Math.PI * 2, r = rr(9, 22);
			if (pathDist(cx + Math.cos(a) * r, cz + Math.sin(a) * r) < 2.4) continue;   // (keep the winding path ahead clear)
			tree(g, cx + Math.cos(a) * r, cz + Math.sin(a) * r, rr(0.8, 1.4));
		}
		for (let k = 0; k < 14; k++) {
			const a = rnd() * Math.PI * 2, r = rr(7.2, 10.5);
			const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
			if (plantOK(x, z, 1.5)) tree(g, x, z, rr(0.75, 1.15));
		}
		for (let k = 0; k < 75; k++) {
			const a = rnd() * Math.PI * 2, r = ringR(4.1, 5.5);
			const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
			if (!plantOK(x, z, 0.4)) continue;
			shrub(g, x, z, rr(0.5, 0.9) * (0.8 + (r - 4) * 0.12), C.lights[k % 4]);
		}
		// the canopy closing in overhead, round the tops of the walls
		for (let k = 0; k < 14; k++) {
			const a = -Math.PI / 2 + rr(-2.4, 2.4), r = rr(5.5, 10);
			const b = mesh(CANOPY[k % 3], leafMats[k % 4], g, cx + Math.cos(a) * r, rr(6.5, 9), cz + Math.sin(a) * r, rr(2, 3.2), rr(1, 1.5), rr(2, 3.2));
			b.receiveShadow = true;
			canopySpots.push({ x: b.position.x, y: b.position.y, z: b.position.z, s: b.scale.x });
		}
		// grass
		const NG = 4200;
		const grass = new THREE.InstancedMesh(grassGeo, grassMat(new THREE.Color(C.ground).offsetHSL(0, 0.1, 0.08)), NG);
		const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
		for (let k = 0; k < NG; k++) {
			let a, r, tries = 0;
			do { a = rnd() * Math.PI * 2; r = rr(2.8, 13); } while (!plantOK(cx + Math.cos(a) * r, cz + Math.sin(a) * r, -0.6) && ++tries < 8);
			e.set(rr(-0.2, 0.2), rnd() * Math.PI * 2, rr(-0.2, 0.2)); q.setFromEuler(e);
			const s = tries >= 8 ? 0.0001 : rr(0.6, 1.5);
			m4.compose(new THREE.Vector3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r), q, new THREE.Vector3(s, s, s));
			grass.setMatrixAt(k, m4);
		}
		grass.receiveShadow = true;
		grass.userData.tag = 'grass';
		g.add(grass);
		// glistening: dew and drifting spores everywhere
		sparkles(g, cx, cz, 260, '#ffffff', 10, 0.05, 0.5, 0.06);
		sparkles(g, cx, cz, 220, C.lights[1], 12, 1, 6, 0.09);
		vegetation(g, cx, cz, C);
		canopySpots = [];
		shafts(g, cx, cz, ci);
		mist(g, cx, cz);
		MOTIF[C.motif](g, ci, cx, cz, C);
		// (the festoon lights were here; removed at the user's request. buildFestoon still works if they come back)
		bake(g);
		// the devices, after the merge, so their moving parts stay their own
		if (C.grid) buildGrid(g, ci, cx, cz);
		if (C.piano !== undefined) buildPiano(g, ci, cx, cz);
		if (C.puffballs) buildPuffballs(g, ci, cx, cz, C.puffballs);
		if (C.web) buildWeb(g, ci, cx, cz, C.web);
		if (C.pond) buildPond(g, ci, cx, cz);
		if (C.xylo) buildXylo(g, ci, cx, cz);
		if (C.theremin) C.theremin[1].forEach((al, k) => buildTheremin(g, ci, cx, cz, [C.theremin[0], al], k));
		if (C.choir) buildChoir(g, ci, cx, cz);
		if (C.chimes) buildChimes(g, ci, cx, cz);
		// the creatures
		for (const def of C.creatures) {
			const c = frame(def, ci);
			BUILD[c.kind](c);
			wobbleCreature(c);
			c.root.position.x += cx; c.root.position.z += cz;
			c.root.lookAt(cx, 0, cz);
			if (c.kind === 'snail') c.root.rotateY(c.wall === 2 ? -1.0 : 1.0);   // (three-quarters on: its shell's spiral shows, and its face)
			c.root.userData.tag = 'creatures';
			g.add(c.root);
			c.ring.position.x = cx + c.hot.x; c.ring.position.z = cz + c.hot.y;
			// (a teardrop: its round end where you stand, its tail reaching to the creature's feet)
			const tdx = c.root.position.x - c.ring.position.x, tdz = c.root.position.z - c.ring.position.z, tL = Math.max(0.5, Math.hypot(tdx, tdz));   // (the tail reaches right to the middle of its footprint)
			c.ringFill.geometry = new THREE.ShapeGeometry(hotShape(0.24, (c.kind === 'troll' ? 0.62 : c.kind === 'owl' ? 0.42 : 0.34) * c.size, tL), 24);
			const edge = new THREE.Shape(teardrop(0.24, tL)); edge.holes.push(new THREE.Path(teardrop(0.19, tL - 0.1)));
			c.ringEdge.geometry = new THREE.ShapeGeometry(edge);
			c.ringEdge.visible = false;   // (no outline: just the glowing shape)
			c.ring.rotation.y = Math.atan2(-tdx, -tdz);
			g.add(c.ring);
			creatures.push(c);
		}
		return g;
	}
	// The festoon: 24 bulbs in swags round the three walls (8 a wall, left to right),
	// hung from posts at the corners. Each is a note of the clearing's melody: a
	// higher note hangs higher on a shorter cord, in a different colour.
	const FEST = { n: 24, per: 8, D: R + 0.12, top: 1.98, sag: 0.2, drop: [0.3, 0.1], reach: 0.3 };   // (the bulbs hang about 3/5 up the wall; a touch counts on them from 0.3 down)
	const festoons = [];
	const bulbGeo = new THREE.SphereGeometry(0.085, 16, 12).scale(1, 1.3, 1);
	// each clearing's own kind of light on the string
	const FEST_STYLE = ['toadstool', 'firefly', 'lantern', 'star', 'jar'];
	const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
	const LIGHT_GEO = {
		// a glowing mini toadstool: a cap on a little stalk
		toadstool: mergeGeometries([
			new THREE.SphereGeometry(0.11, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1).translate(0, 0.02, 0),
			new THREE.CylinderGeometry(0.03, 0.04, 0.1, 10).translate(0, -0.03, 0),
		]),
		// a firefly: a fat glowing tail (no wire: they hang in the air by themselves)
		firefly: new THREE.SphereGeometry(0.04, 12, 8).scale(1, 0.8, 1.25),
		// a ribbed paper lantern (eight panels)
		lantern: lathe([[0.03, -0.13], [0.07, -0.11], [0.1, -0.05], [0.105, 0], [0.1, 0.05], [0.07, 0.11], [0.03, 0.13]], 8),
		// a five-pointed star
		star: (function () {
			const sh = new THREE.Shape();
			for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 0.05 : 0.12; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (k) sh.lineTo(x, y); else sh.moveTo(x, y); }
			const g = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
			g.translate(0, 0, -0.015);
			return g;
		})(),
		// a glass glow-jar with a neck
		jar: lathe([[0, -0.1], [0.07, -0.1], [0.08, -0.08], [0.08, 0.05], [0.065, 0.08], [0.05, 0.09], [0.05, 0.11], [0, 0.11]], 16),
	};
	function buildFestoon(g, ci, cx, cz) {
		const C = CLEARINGS[ci];
		const style = FEST_STYLE[ci % FEST_STYLE.length];
		const f = { style, on: [], deg: [], pos: [], wall: [], col: [], flash: new Float32Array(FEST.n), head: new Float32Array(FEST.n) };
		// the melody: a wandering line in the clearing's key, a third of it lit to start
		let d = 7;
		for (let i = 0; i < FEST.n; i++) {
			d = clamp(d + Math.round(rr(-2.4, 2.4)), 4, 13);
			f.deg.push(d);
			f.on.push(i % 3 === 0 || rnd() < 0.12);
			f.col.push(style === 'firefly' ? new THREE.Color().setHSL(0.16 + (d - 4) / 9 * 0.12, 1, 0.55) : new THREE.Color().setHSL(((d - 4) / 9 * 0.82 + ci * 0.13) % 1, 1, 0.6));   // (fireflies glow their own warm yellow-greens)
		}
		const unit = new THREE.Group();
		unit.userData.unit = true;
		g.add(unit);
		const D = FEST.D;
		const wireMat = new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.5 });
		const capMat = new THREE.MeshStandardMaterial({ color: '#c8a050', roughness: 0.3, metalness: 0.9 });
		const point = (w, u, y) => {
			const lat = (u - 0.5) * 2 * D;
			return w === 1 ? new THREE.Vector3(cx + lat, y, cz - D) : w === 0 ? new THREE.Vector3(cx - D, y, cz - lat) : new THREE.Vector3(cx + D, y, cz + lat);
		};
		const wireY = (u) => FEST.top - FEST.sag * (1 - Math.pow(2 * u - 1, 2));
		for (let w = 0; w < 3; w++) {
			const pts = [];
			for (let k = 0; k <= 24; k++) pts.push(point(w, k / 24, wireY(k / 24)));
			if (style !== 'firefly') mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.008, 4), wireMat, unit).castShadow = false;
			for (let j = 0; j < FEST.per; j++) {
				const i = w * FEST.per + j, u = (j + 0.5) / FEST.per;
				const top = point(w, u, wireY(u));
				const drop = lerp(FEST.drop[0], FEST.drop[1], (f.deg[i] - 4) / 9);
				const pos = top.clone(); pos.y -= drop + 0.1;
				if (style !== 'firefly') {
					const cord = mesh(GEO.cyl, wireMat, unit, top.x, top.y - drop / 2, top.z, 0.005, drop, 0.005);
					cord.castShadow = false;
					if (style === 'jar' || style === 'lantern') mesh(GEO.cyl, capMat, unit, pos.x, pos.y + (style === 'jar' ? 0.115 : 0.135), pos.z, style === 'jar' ? 0.055 : 0.035, 0.03, style === 'jar' ? 0.055 : 0.035).castShadow = false;
				} else pos.add(new THREE.Vector3(rr(-0.12, 0.12), rr(-0.1, 0.1), rr(-0.12, 0.12)));   // (fireflies: loosely along where the string would be)
				f.pos[i] = pos; f.wall[i] = w;
			}
		}
		// posts at the corners to hang it from
		if (style !== 'firefly') for (const [sx, sz] of [[-1, 1], [-1, -1], [1, -1], [1, 1]]) {
			mesh(new THREE.CylinderGeometry(0.045, 0.06, FEST.top + 0.1, 8), MAT.bark, unit, cx + sx * D, (FEST.top + 0.1) / 2, cz + sz * D);
			mesh(GEO.sphLo, capMat, unit, cx + sx * D, FEST.top + 0.12, cz + sz * D, 0.06);
		}
		bake(unit);
		// the bulbs themselves: one instanced mesh, each its own colour (and glow) every frame
		const bulbs = new THREE.InstancedMesh(LIGHT_GEO[style] || bulbGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), FEST.n);
		const m4 = new THREE.Matrix4();
		for (let i = 0; i < FEST.n; i++) { m4.makeTranslation(f.pos[i].x, f.pos[i].y, f.pos[i].z); bulbs.setMatrixAt(i, m4); bulbs.setColorAt(i, f.col[i]); }
		bulbs.frustumCulled = false;
		unit.add(bulbs);
		f.bulbs = bulbs;
		festoons[ci] = f;
	}
	// The fungus wall (a clearing with grid: true): a low wall of mossy stone across
	// the front wall, grown over with shelf mushrooms in a grid, 8 steps across and 5
	// notes up (the top row highest). Touch one to light it; a shaft of light sweeps
	// across a column an eighth, and every lit mushroom in it knocks out its note.
	const GRID = { cols: 8, rows: 5, D: R + 0.25, x0: -1.85, x1: 1.85, y0: 0.24, y1: 1.46, deg: [9, 8, 7, 6, 5] };
	const grids = [];
	const shelfGeo = (function () {
		const shelf = new THREE.CylinderGeometry(0.16, 0.19, 0.055, 22, 1, false, -Math.PI / 2, Math.PI);
		const dome = new THREE.SphereGeometry(0.16, 22, 6, -Math.PI / 2, Math.PI, 0, Math.PI / 2).scale(1, 0.32, 1).translate(0, 0.026, 0);
		return mergeGeometries([shelf.toNonIndexed(), dome.toNonIndexed()]);
	})();
	const ROCKS = [0, 1, 2, 3, 4, 5].map((k) => {
		const geo = new THREE.IcosahedronGeometry(1, 4);
		const p = geo.attributes.position, v = new THREE.Vector3();
		for (let i = 0; i < p.count; i++) {
			v.fromBufferAttribute(p, i);
			const n = 1 + 0.18 * Math.sin(v.x * 3.1 + k) * Math.sin(v.y * 2.3 + k * 2) + 0.12 * Math.sin(v.z * 4.7 + k * 3) + 0.06 * Math.sin((v.x + v.y) * 9 + k);
			v.multiplyScalar(n);
			v.y *= 0.82;
			p.setXYZ(i, v.x, v.y, v.z);
		}
		geo.computeVertexNormals();
		return geo;
	});
	function buildGrid(g, ci, cx, cz) {
		const C = CLEARINGS[ci];
		const z = cz - GRID.D;
		const unit = new THREE.Group();
		unit.userData.unit = true;
		g.add(unit);
		// The wall: stones that tessellate perfectly, with no gaps. A jittered lattice
		// of corners (12 columns, 7 courses), every edge bent at a midpoint both of its
		// stones share, so each stone's outline is exactly its neighbours'. Each is
		// extruded with a rounded bevel (inset by the bevel, so neighbours meet), over a
		// dark mortar backing. The toggles ARE wall stones: the 8 x 5 cells in the
		// middle; the rest, round the edge, are plain (and some split in two).
		const stoneA = new THREE.MeshStandardMaterial({ color: '#8f877a', map: TEX.moss, bumpMap: TEX.moss, bumpScale: 6, roughness: 0.92 });
		const stoneB = new THREE.MeshStandardMaterial({ color: '#6f7a5e', map: TEX.moss, bumpMap: TEX.moss, bumpScale: 6, roughness: 0.95 });
		const PX = (GRID.x1 - GRID.x0) / (GRID.cols - 1), NI = GRID.cols + 4;
		const xs = Array.from({ length: NI + 1 }, (_, k) => GRID.x0 - PX / 2 + (k - 2) * PX);
		const ys = [0, 0.2, 0.48, 0.76, 1.04, 1.32, 1.6, 1.86];   // (a footing course, the 5 toggle courses, a capping course)
		const NJ = ys.length - 1;
		const V = [], HM = [], VM = [];
		for (let a = 0; a <= NI; a++) {
			V[a] = [];
			for (let b = 0; b <= NJ; b++) {
				const edgeX = a === 0 || a === NI, top = b === NJ;
				V[a][b] = new THREE.Vector2(xs[a] + (edgeX ? rr(-0.03, 0.03) : rr(-0.13, 0.13)), b === 0 ? 0 : top ? ys[b] + rr(-0.1, 0.12) : ys[b] + rr(-0.045, 0.045));
			}
		}
		const mid = (p1, p2, bend) => { const m = p1.clone().add(p2).multiplyScalar(0.5), d = p2.clone().sub(p1); return m.add(new THREE.Vector2(-d.y, d.x).normalize().multiplyScalar(bend)); };
		for (let a = 0; a < NI; a++) { HM[a] = []; for (let b = 0; b <= NJ; b++) HM[a][b] = mid(V[a][b], V[a + 1][b], b === 0 ? 0 : b === NJ ? rr(0.02, 0.07) : rr(-0.035, 0.035)); }
		for (let a = 0; a <= NI; a++) { VM[a] = []; for (let b = 0; b < NJ; b++) VM[a][b] = mid(V[a][b], V[a][b + 1], rr(-0.06, 0.06)); }
		const BEV = 0.022;
		function stone(poly, mat, depth) {
			const c = poly.reduce((acc, q) => acc.add(q), new THREE.Vector2()).multiplyScalar(1 / poly.length);
			const pts = poly.map((q) => { const d = q.clone().sub(c), l = d.length(); return c.clone().add(d.multiplyScalar(Math.max(0, l - BEV) / l)); });
			const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth, bevelEnabled: true, bevelThickness: 0.035, bevelSize: BEV, bevelSegments: 3, curveSegments: 1 });
			const m = mesh(geo, mat, unit, cx, 0, z - 0.32);
			m.receiveShadow = true;
			return { m, c, front: z - 0.32 + depth + 0.035 };
		}
		const cellPoly = (a, b) => [V[a][b], HM[a][b], V[a + 1][b], VM[a + 1][b], V[a + 1][b + 1], HM[a][b + 1], V[a][b + 1], VM[a][b]];
		const toggleCells = new Map();
		for (let a = 0; a < NI; a++) for (let b = 0; b < NJ; b++) {
			const c = a - 2, r = NJ - 1 - b;   // (toggle column, and row from the top)
			if (c >= 0 && c < GRID.cols && b >= 1 && b <= GRID.rows) { toggleCells.set((r - 1) * GRID.cols + c, cellPoly(a, b)); continue; }
			const mat = rnd() < 0.62 ? stoneA : stoneB, d = rr(0.19, 0.26);
			if (rnd() < 0.55) {   // (split in two, at the midpoints its neighbours already share)
				stone([V[a][b], HM[a][b], HM[a][b + 1], V[a][b + 1], VM[a][b]], mat, d);
				stone([HM[a][b], V[a + 1][b], VM[a + 1][b], V[a + 1][b + 1], HM[a][b + 1]], rnd() < 0.62 ? stoneA : stoneB, rr(0.19, 0.26));
			} else stone(cellPoly(a, b), mat, d);
		}
		// the mortar, dark, behind every joint
		const mortar = mesh(new THREE.PlaneGeometry(xs[NI] - xs[0] + 0.1, 2.0), new THREE.MeshStandardMaterial({ color: '#1e1a16', roughness: 1 }), unit, cx, 0.98, z - 0.2);
		mortar.castShadow = false;
		// overgrown: moss mounds spilling over the top
		for (let a = 0; a <= NI; a++) if (rnd() < 0.8) mesh(GEO.sph, leafMats[Math.floor(rnd() * 4)], unit, cx + V[a][NJ].x + rr(-0.15, 0.15), V[a][NJ].y + rr(0, 0.06), z - 0.2 + rr(-0.08, 0.12), rr(0.25, 0.45), rr(0.1, 0.2), rr(0.2, 0.3));
		// ivy: short tufts trailing over the capping all along, long strands down the ends
		for (let k = 0; k < 22; k++) {
			const end = k < 6, x0 = cx + (end ? (k % 2 ? 1 : -1) * rr(2.75, 3.6) : rr(-3.4, 3.4)), len = end ? rr(0.8, 1.6) : rr(0.15, 0.35);
			let px = x0, py = 1.86;
			for (let j2 = 0; j2 < len / 0.12; j2++) {
				px += rr(-0.03, 0.03); py -= 0.12;
				const lf = mesh(bigLeafGeo, bigLeafMat, unit, px + rr(-0.06, 0.06), py, z + rr(0, 0.04), rr(0.13, 0.2));
				lf.rotation.set(rr(-1.2, -0.6), rr(-0.8, 0.8), rr(-0.6, 0.6));
				lf.castShadow = false;
			}
		}
		// ferns at its foot, at the ends (clear of the stones you touch)
		for (let k = 0; k < 10; k++) {
			const x = cx + (k % 2 ? 1 : -1) * rr(2.8, 3.6);
			for (let j2 = 0; j2 < 5; j2++) {
				const fr = mesh(fernGeo, fernMat, unit, x, 0, z, rr(0.7, 1.1));
				fr.rotation.set(0, j2 / 5 * Math.PI * 2 + rnd(), 0, 'YXZ');
				fr.castShadow = false;
			}
		}
		bake(unit);
		// little glowing toadstools at its foot, at the ends
		for (let k = 0; k < 8; k++) giantMushroom(g, cx + (k % 2 ? 1 : -1) * rr(2.75, 3.5), z + rr(0.08, 0.3), rr(0.18, 0.36), C.lights[k % 4]);
		// the toggles: the middle stones of the wall, each its own mesh so it can glow and push out
		const n = GRID.cols * GRID.rows;
		const gd = { on: [], pos: [], rowCol: [], flash: new Float32Array(n), head: -1, beam: 0, stones: [] };
		for (let r = 0; r < GRID.rows; r++) {
			const rc = new THREE.Color().setHSL((0.95 - r * 0.15 + 1) % 1, 0.85, 0.58);
			for (let c = 0; c < GRID.cols; c++) {
				const i = r * GRID.cols + c;
				const mat = new THREE.MeshStandardMaterial({ color: '#a49c8c', map: TEX.moss, bumpMap: TEX.moss, bumpScale: 5, roughness: 0.6 });
				const st = stone(toggleCells.get(i), mat, rr(0.22, 0.26));
				st.m.castShadow = false;
				gd.stones[i] = { m: st.m, mat, z0: st.m.position.z };
				gd.pos[i] = new THREE.Vector3(cx + st.c.x, st.c.y, st.front);
				gd.rowCol[i] = rc;
				gd.on[i] = false;
			}
		}
		// a little tune to start: down the wall and back up
		[[0, 4], [1, 3], [2, 2], [3, 1], [4, 0], [5, 2], [6, 3], [7, 1]].forEach(([c, r]) => { gd.on[r * GRID.cols + c] = true; });
		// the shaft of light that plays it
		const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 2.2), new THREE.MeshBasicMaterial({ map: TEX.ray, color: new THREE.Color(C.lights[2]).multiplyScalar(1.4), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
		beam.position.set(cx, 0.85, z + 0.06);
		unit.add(beam);
		gd.beamMesh = beam;
		grids[ci] = gd;
	}
	// The stepping-stone piano (a clearing with piano: true): 18 flat stones round the
	// foot of the three walls, pale and dark like keys, 6 a wall. Whoever walks
	// along near a wall plays the stone in front of them the moment they step on
	// it: low on the left wall, rising across the front and up the right.
	const PIANO = { per: 12, from: 1.15 };   // (an avatar further out than this, on the fan, is on a panel)   // (12 stones, all along one wall)
	const pianos = [];
	function glowInstanced(geo, n, extra = {}) {
		const mat = new THREE.MeshStandardMaterial(Object.assign({ color: '#ffffff', map: TEX.moss, bumpMap: TEX.moss, bumpScale: 4, roughness: 0.55 }, extra));
		mat.onBeforeCompile = (sh) => {
			sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
				#ifdef USE_COLOR
				totalEmissiveRadiance += max(vColor.rgb - 1.0, 0.0) * 1.4;
				#endif`);
		};
		mat.customProgramCacheKey = () => 'instGlow';
		return new THREE.InstancedMesh(geo, mat, n);
	}
	// The crystal piano, on one wall: 12 long stone panels laid side by side,
	// running from under the bottom of the screen away into the distance, each ending
	// in a big coloured crystal growing out of the stone. Walk along the wall: the
	// panel under you sinks, and its crystal lights.
	const CRYSTAL_GEO = (function () {
		const prism = new THREE.CylinderGeometry(1, 1, 1, 6, 1).toNonIndexed();
		const tip = new THREE.ConeGeometry(1, 0.6, 6, 1).translate(0, 0.8, 0).toNonIndexed();
		const g = mergeGeometries([prism, tip]);
		g.computeVertexNormals();
		return g;
	})();
	function buildPiano(g, ci, cx, cz) {
		const n = PIANO.per, w = CLEARINGS[ci].piano;
		const pn = { wall: w, keys: [], pos: [], held: new Array(n).fill(-1), press: new Float32Array(n), flash: new Float32Array(n) };
		const lane = (lat, out, y = 0) => w === 1 ? new THREE.Vector3(cx + lat, y, cz - R - out) : w === 0 ? new THREE.Vector3(cx - R - out, y, cz - lat) : new THREE.Vector3(cx + R + out, y, cz + lat);
		// (each panel a wedge fanning out from the eye, so on the wall they're neat
		// upright strips filling the middle 2/3 of the screen, bottom to horizon)
		const IN = -1.65, OUT = 3.4, dIn = R + IN, dOut = R + OUT, SPAN = 2 / 3;
		const toWorld = new THREE.Matrix4();
		if (w === 0) toWorld.set(0, -1, 0, cx, 0, 0, 1, 0, -1, 0, 0, cz, 0, 0, 0, 1);
		else if (w === 2) toWorld.set(0, 1, 0, cx, 0, 0, 1, 0, 1, 0, 0, cz, 0, 0, 0, 1);
		else toWorld.set(1, 0, 0, cx, 0, 0, 1, 0, 0, -1, 0, cz, 0, 0, 0, 1);
		// The keys: irregular stones that tessellate perfectly. Every boundary between two
		// keys is one wobbly line, shared by both, sampled at the same depths; each key is
		// cut across into a few stones at some of those depths. (Near, the keys taper into
		// the middle 2/3 of the screen; far off they run parallel to the crystals.)
		const dJ = R / SPAN, NS = 10;
		const DS = Array.from({ length: NS + 1 }, (_, j) => dIn + (dOut - dIn) * j / NS);
		const edge = (b, d) => ((b / n - 0.5) * 2 * SPAN) * Math.min(d, dJ);
		const keyW = (d) => 2 * SPAN * Math.min(d, dJ) / n;
		const BL = [];   // BL[b][j]: boundary b at sample depth j
		for (let b = 0; b <= n; b++) BL[b] = DS.map((d, j) => new THREE.Vector2(edge(b, d) + (b > 0 && b < n ? rr(-0.36, 0.36) * keyW(d) : 0), d + (j > 0 && j < NS ? rr(-0.16, 0.16) : 0)));
		const keyStone = (poly, mat, parent) => {
			const c = poly.reduce((a2, q2) => a2.add(q2), new THREE.Vector2()).multiplyScalar(1 / poly.length);
			const pts = poly.map((q2) => { const d2 = q2.clone().sub(c), l = d2.length(); return c.clone().add(d2.multiplyScalar(Math.max(0, l - 0.02) / l)); });
			const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: rr(0.07, 0.1), bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 1 });
			geo.applyMatrix4(toWorld);
			const m2 = mesh(geo, mat, parent);
			m2.receiveShadow = true; m2.castShadow = false;
		};
		for (let k = 0; k < n; k++) {
			// (far off, the panels run parallel, as wide as the clearing; nearer than dJoin they
			// taper into the middle 2/3 of the screen. The two meet exactly at dJoin, for every edge.)
			const sL = ((k + 0.03) / n - 0.5) * 2 * SPAN, sR = ((k + 0.97) / n - 0.5) * 2 * SPAN, dJoin = R / SPAN;
			const LL = sL * dJoin, LR = sR * dJoin;
			const lat = (LL + LR) / 2;
			// the panel: a long tapering slab, pale and dark by turns, like keys
			const pmat = new THREE.MeshStandardMaterial({ color: k % 2 ? '#8a857a' : '#c9c2b2', map: TEX.moss, bumpMap: TEX.moss, bumpScale: 5, roughness: 0.75, side: THREE.DoubleSide });   // (light and dark stones by turns, gently)
			pmat.color.offsetHSL(0, 0, rr(-0.04, 0.04));
			const panel = new THREE.Group(); g.add(panel);
			// cut this key across into 3 or 4 stones, at sample depths of its own
			const cuts = [0];
			for (let j = 2; j < NS - 1; j++) if (rnd() < 0.5 && j - cuts[cuts.length - 1] >= 2) cuts.push(j);
			cuts.push(NS);
			for (let c2 = 0; c2 < cuts.length - 1; c2++) {
				const j0 = cuts[c2], j1 = cuts[c2 + 1], poly = [];
				for (let j = j0; j <= j1; j++) poly.push(BL[k][j]);
				for (let j = j1; j >= j0; j--) poly.push(BL[k + 1][j]);
				keyStone(poly, pmat, panel);
			}
			// its crystal, growing from the far end: a cluster of glassy prisms on a boulder
			const col = new THREE.Color().setHSL(k / n * 0.85, 0.9, 0.55);
			const cmat = new THREE.MeshPhysicalMaterial({ color: col, emissive: col, emissiveIntensity: 0.25, roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.88 });
			const foot = lane(lat, OUT - 0.25, 0);
			mesh(ROCKS[k % ROCKS.length], new THREE.MeshStandardMaterial({ color: '#7a7468', map: TEX.moss, bumpMap: TEX.moss, bumpScale: 5, roughness: 0.9 }), g, foot.x, 0.12, foot.z, 0.3, 0.2, 0.26);
			const big = rr(1.5, 2.3);
			const cl = new THREE.Group(); cl.position.copy(foot); g.add(cl);
			[[0, 0, big, 0.14], [0.13, 0.06, big * 0.62, 0.1], [-0.11, -0.08, big * 0.5, 0.09], [0.05, -0.14, big * 0.38, 0.07]].forEach(([dx, dz, h, r], j) => {
				const c = mesh(CRYSTAL_GEO, cmat, cl, dx, h / 2 + 0.1, dz, r, h, r);
				c.rotation.set(rr(-0.25, 0.25), rnd() * Math.PI, (j ? Math.sign(dx || 1) : 0) * rr(0.15, 0.4));
			});
			pn.keys.push({ panel, pmat, y0: 0, cmat, col, cl, big });
			pn.pos[k] = foot.clone().setY(big + 0.2);
		}
		labels.push({ ci, wall: w, at: lane(0, -0.4, 0), text: 'WALK ALONG THE STONES' });
		pianos[ci] = pn;
	}
	/* ---------- the other musical devices, one or two a clearing ---------- */

	const wallPoint = (cx, cz, w, along, out, y = 0) => {
		const D = R + out, lat = (along - 0.5) * 2 * D;
		return w === 1 ? new THREE.Vector3(cx + lat, y, cz - D) : w === 0 ? new THREE.Vector3(cx - D, y, cz - lat) : new THREE.Vector3(cx + D, y, cz + lat);
	};
	const spotOf = (w, along, sp = 0.12) => (w === 1 ? { px: along, pz: 1 - sp } : w === 0 ? { px: sp, pz: along } : { px: 1 - sp, pz: 1 - along });
	const near = (p, spot, r = STAND) => Math.hypot(p.px - spot.px, p.pz - spot.pz) < r;
	const labels = [];   // little hints, drawn on the walls: { ci, wall, at, text }

	// PUMPKIN BASS: plump ribbed pumpkins with little faces, a hotspot each; squat on one and it
	// squashes (eyes screwed shut, mouth an O) with a burst of seeds and plays its own bass
	// note on the beat, pumping to it, while you hold it; and springs back up, wobbling, when you stand
	const puffs = [];
	let _pumpkinGeo = null;
	function pumpkinGeo() {   // (a squat sphere, eight deep ribs, dimpled top and bottom; its base on the ground)
		if (_pumpkinGeo) return _pumpkinGeo;
		const g = new THREE.SphereGeometry(1, 64, 32), a = g.attributes.position;
		for (let i = 0; i < a.count; i++) {
			let x = a.getX(i), y = a.getY(i), z = a.getZ(i);
			const r = Math.hypot(x, z), th = Math.atan2(z, x);
			const rib = 0.9 + 0.1 * Math.pow(Math.abs(Math.cos(th * 4)), 0.5);   // (the lobes, and the grooves between)
			x *= rib; z *= rib;
			y = y * 0.78 - Math.sign(y) * 0.22 * Math.exp(-r * r / 0.06);   // (squat, pinched in at the stem and the base)
			a.setXYZ(i, x, y, z);
		}
		g.computeVertexNormals();
		g.translate(0, 0.78, 0);
		return (_pumpkinGeo = g);
	}
	function buildPuffballs(g, ci, cx, cz, defs) {
		const skin = rimify(new THREE.MeshPhysicalMaterial({ color: '#ff8414', roughness: 0.42, bumpMap: TEX.skin, bumpScale: 1.2, clearcoat: 0.6, clearcoatRoughness: 0.3, emissive: '#ff5a00', emissiveIntensity: 0.12 }));
		const stemM = new THREE.MeshStandardMaterial({ color: '#5a6a22', map: TEX.bark, bumpMap: TEX.bark, bumpScale: 2, roughness: 0.8 });
		const leafM = new THREE.MeshStandardMaterial({ color: '#4caa3a', roughness: 0.5, side: THREE.DoubleSide });
		puffs[ci] = defs.map(([w, along], k) => {
			const pos = wallPoint(cx, cz, w, along, 0.42, 0);
			const root = new THREE.Group(); root.position.copy(pos); g.add(root);
			root.lookAt(cx, 0, cz);   // (its face to the room)
			const sz = [0.46, 0.4, 0.5][k % 3];
			const body = new THREE.Group(); root.add(body);   // (the squash: scaled from the ground up)
			mesh(pumpkinGeo(), skin, body, 0, 0, 0, sz, sz * 0.82, sz);
			// a stubby curved stem, a leaf, and a curly tendril
			const stem = new THREE.Group(); stem.position.set(0, sz * 0.82 * 1.38, 0); body.add(stem);
			const st = mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.2, 8), stemM, stem, 0, 0.08, 0);
			st.rotation.z = 0.35; st.position.x = 0.03;
			const leaf = mesh(GEO.sph, leafM, stem, -0.1, 0.02, 0.04, 0.14, 0.012, 0.08);
			leaf.rotation.set(0.3, 0.6, -0.4);
			const curl = [];
			for (let t = 0; t <= 1; t += 0.05) curl.push(new THREE.Vector3(0.05 + Math.cos(t * 12) * 0.06 * (1 - t * 0.5), 0.04 + t * 0.12, Math.sin(t * 12) * 0.06 * (1 - t * 0.5)));
			mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curl), 40, 0.008, 5), leafM, stem);
			// its little face, on the front
			const face = makeFace(body, sz * 1.25, 0, sz * 0.82 * 0.8, sz * 1.01, { gap: 0.3 });
			// its hotspot: a pad where your avatar stands, its tail reaching under the pumpkin
			const spot = spotOf(w, along), av = avatarAt(spot.px, spot.pz);
			const hot = new THREE.Group(); hot.position.set(cx + av.x, 0.035, cz + av.z); g.add(hot);
			const tdx = pos.x - hot.position.x, tdz = pos.z - hot.position.z, tL = Math.max(0.5, Math.hypot(tdx, tdz));
			const hotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff9a30').multiplyScalar(1.2), transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
			const pad = new THREE.Mesh(new THREE.ShapeGeometry(hotShape(0.24, sz * 0.62, tL), 24), hotMat);
			pad.rotation.x = -Math.PI / 2; hot.add(pad);
			hot.rotation.y = Math.atan2(-tdx, -tdz);
			labels.push({ ci, wall: w, at: pos.clone().setY(0.1), text: 'SQUAT HERE' });
			// its own bass note: the root, the fifth, the fourth below
			return { root, body, stem, face, sz, pos, w, spot, hotMat, deg: [0, 3, -2][k % 3], sq: 0, v: 0, pressed: false, fresh: false, who: -1, stand: -1, glow: 0, voice: null, blinkT: rr(1, 4), ph: rnd() * 6 };
		});
	}

	// SPIDERWEB HARP: a dewy web whose spokes are strings; touch one to pluck it, drag across to strum
	const webs = [];
	const WEB = { rx: 2.25, ry: 1.25, y: 1.35, spokes: 13, rings: 9 };
	// A haphazard web, all straight strands: wonky spokes out from a hub, and rings
	// that are straight segments from spoke to spoke (so the circle is only ever
	// made of lines), unevenly spaced, a few broken, a few strays. Every strand is
	// one instance of a thin rod between two knots; a pluck ripples the knots near it.
	function buildWeb(g, ci, cx, cz, [w, along]) {
		const c = wallPoint(cx, cz, w, along, 0.3, WEB.y);
		const unit = new THREE.Group(); unit.position.copy(c); unit.lookAt(cx, WEB.y, cz); g.add(unit);
		const nodes = [], segs = [];
		const node = (x, y, spoke) => { nodes.push({ base: new THREE.Vector2(x, y), at: new THREE.Vector2(x, y), spoke }); return nodes.length - 1; };
		const hub = node(0, 0, -1);
		const angles = [];
		for (let k = 0; k < WEB.spokes; k++) angles.push((k + rr(-0.32, 0.32)) / WEB.spokes * Math.PI * 2 + 0.2);
		const grid = [];   // grid[k][r]: the knot where ring r crosses spoke k
		for (let k = 0; k < WEB.spokes; k++) {
			grid[k] = [];
			let prev = hub;
			for (let r = 0; r < WEB.rings; r++) {
				const rad = (0.12 + (r + rr(-0.3, 0.3)) / (WEB.rings - 1) * 0.88) * rr(0.94, 1.04);
				const a = angles[k] + rr(-0.03, 0.03);
				const id = node(Math.cos(a) * rad * WEB.rx, Math.sin(a) * rad * WEB.ry, k);
				segs.push([prev, id]); prev = id;
				grid[k][r] = id;
			}
		}
		for (let r = 0; r < WEB.rings; r++) for (let k = 0; k < WEB.spokes; k++) {
			if (rnd() < 0.07 && r > 0 && r < WEB.rings - 1) continue;   // (a broken strand)
			const k2 = (k + 1) % WEB.spokes;
			// (some rings step out a ring as they go, so it never quite closes)
			const r2 = r < WEB.rings - 1 && rnd() < 0.12 ? r + 1 : r;
			segs.push([grid[k][r], grid[k2][r2]]);
		}
		// strays: from the rim out to the trees, and a few loose cross-threads
		for (let k = 0; k < 7; k++) {
			const kk = Math.floor(rnd() * WEB.spokes), b = nodes[grid[kk][WEB.rings - 1]].base;
			segs.push([grid[kk][WEB.rings - 1], node(b.x * rr(1.25, 1.45), b.y * rr(1.25, 1.5), -1)]);
		}
		for (let k = 0; k < 5; k++) { const k1 = Math.floor(rnd() * WEB.spokes), r1 = 2 + Math.floor(rnd() * 5); segs.push([grid[k1][r1], grid[(k1 + 2) % WEB.spokes][r1 + 1]]); }
		const silk = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.5, 1.6), transparent: true, opacity: 0.9 });
		const rods = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 4, 1), silk, segs.length);
		rods.frustumCulled = false; unit.add(rods);
		// dew on a scatter of the knots
		const dewKnots = nodes.map((n, i) => i).filter((i) => i !== hub && rnd() < 0.45);
		const dew = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.4, 2.6) }), dewKnots.length);
		dew.frustumCulled = false; unit.add(dew);
		// a spider, of course, with a face, and legs that scuttle
		const spider = new THREE.Group(); spider.position.set(0, 0, 0.05); unit.add(spider);
		mesh(GEO.sph, furMat('#3a2a3a'), spider, 0, 0, 0, 0.13, 0.12, 0.1);
		makeFace(spider, 0.42, 0, 0.01, 0.1);
		const legs = [];
		for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
			const hip = new THREE.Group(); hip.position.set(sx * 0.1, 0.05 - k * 0.035, 0); hip.rotation.z = sx * (1.0 + k * 0.25); spider.add(hip);
			const leg = mesh(GEO.cyl, MAT.dark, hip, 0, 0.12, 0, 0.012, 0.24, 0.012);
			legs.push({ hip, base: hip.rotation.z, ph: k * 1.3 + (sx > 0 ? 0.6 : 0) });
		}
		// a ring of light where it's plucked
		const ring = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.11, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 2.2, 2.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
		ring.position.z = 0.02; unit.add(ring);
		labels.push({ ci, wall: w, at: c.clone().setY(0.15), text: 'STRUM THE WEB' });
		webs[ci] = { unit, nodes, segs, rods, dew, dewKnots, wall: w, center: c, spider, legs, ring, ringT: 0, plucks: [], last: -1, lastT: -9,
			sp: { x: 0, y: 0, tx: 0, ty: 0, wait: 2, rest: 0 } };
		layWeb(webs[ci]);
	}
	// set every strand between its two knots (as they are now)
	const _wa = new THREE.Vector3(), _wb = new THREE.Vector3(), _wq = new THREE.Quaternion(), _wm = new THREE.Matrix4(), _wy = new THREE.Vector3(0, 1, 0), _ws = new THREE.Vector3();
	function layWeb(wb) {
		wb.segs.forEach(([i, j], k) => {
			const a = wb.nodes[i].at, b = wb.nodes[j].at;
			_wa.set(b.x - a.x, b.y - a.y, 0);
			const len = _wa.length() || 1e-4;
			_wq.setFromUnitVectors(_wy, _wa.multiplyScalar(1 / len));
			_wm.compose(_wb.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0), _wq, _ws.set(0.0065, len, 0.0065));
			wb.rods.setMatrixAt(k, _wm);
		});
		wb.rods.instanceMatrix.needsUpdate = true;
		wb.dewKnots.forEach((i, k) => { const a = wb.nodes[i].at; _wm.compose(_wb.set(a.x, a.y, 0.008), _wq.identity(), _ws.set(0.02, 0.02, 0.02)); wb.dew.setMatrixAt(k, _wm); });
		wb.dew.instanceMatrix.needsUpdate = true;
	}

	// THE POND, in front of the front wall only: water from the room's middle out to a rock
	// face, a waterfall pouring into it. Walk through it and your avatar leaves a smooth,
	// spreading disturbance in the water (shaded right on the surface), and each ripple
	// rings out a shimmer, pitched by where you are across the pond.
	const POND = { half: 2.9, front: 0.15, back: 7.2, maxRip: 24 };
	const ponds = [];
	function buildPond(g, ci, cx, cz) {
		const unit = new THREE.Group(); g.add(unit);
		const W2 = POND.half * 2, D2 = POND.back - POND.front, zc = cz - (POND.front + POND.back) / 2;
		const rip = Array.from({ length: POND.maxRip }, () => new THREE.Vector4(0, 0, -99, 0));
		const U = { uNow: { value: 0 }, uRip: { value: rip }, uSky: { value: new THREE.Color('#9ae8e0') }, uDeep: { value: new THREE.Color('#06242c') }, uMoon: { value: new THREE.Vector3(-0.35, 0.32, -1).normalize() }, uT: sparkleU.uTime };
		const water = new THREE.Mesh(new THREE.PlaneGeometry(W2, D2, 1, 1), new THREE.ShaderMaterial({
			uniforms: U, transparent: true, depthWrite: false,
			vertexShader: 'varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
			fragmentShader: `uniform float uNow; uniform vec4 uRip[${POND.maxRip}]; uniform vec3 uSky; uniform vec3 uDeep; uniform vec3 uMoon; uniform float uT; varying vec3 vW; varying vec2 vUv;
				${NOISE}
				void main(){
					// the surface's slope: a gentle swell, the waterfall's churn, and every ripple's spreading ring
					vec2 sl = vec2(sin(vW.x * 1.7 + uT * 0.9 + vW.z * 0.6), cos(vW.z * 1.3 - uT * 0.7)) * 0.05;
					float churn = smoothstep(2.6, 0.0, length(vec2(vW.x - ${cx.toFixed(3)}, vW.z - ${(cz - POND.back + 0.3).toFixed(3)})));
					sl += (vec2(fbm(vW.xz * 3.0 + uT * vec2(0.4, 1.4)), fbm(vW.xz * 3.0 - uT * vec2(0.6, 1.1))) - 0.5) * 0.9 * churn;
					float glow = 0.0;
					for (int i = 0; i < ${POND.maxRip}; i++) {
						vec4 r = uRip[i];
						float age = uNow - r.z;
						if (age < 0.0 || age > 3.5) continue;
						vec2 d = vW.xz - r.xy; float dist = length(d) + 1e-4;
						float front = age * 0.85;
						float env = exp(-pow((dist - front) / (0.22 + age * 0.12), 2.0)) * exp(-age * 1.1) * r.w;
						float ph = (dist - front) * 16.0;
						sl += d / dist * cos(ph) * env * 0.9;
						glow += env * (0.5 + 0.5 * sin(ph));
					}
					vec3 n = normalize(vec3(-sl.x, 1.0, -sl.y));
					vec3 v = normalize(cameraPosition - vW);
					float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);
					vec3 c = mix(uDeep, uSky, 0.15 + fr * 0.85);
					vec3 h = normalize(uMoon + v);
					c += vec3(1.0, 0.98, 0.9) * pow(max(dot(n, h), 0.0), 140.0) * 2.5;   // (the moon's glint)
					c += uSky * glow * 0.35 + vec3(0.9, 1.0, 1.0) * churn * 0.12 * fbm(vW.xz * 6.0 + uT * vec2(0.2, 2.0));
					// (a soft, wobbly shore all round)
					vec2 e = min(vUv, 1.0 - vUv) * vec2(${W2.toFixed(3)}, ${D2.toFixed(3)});
					float shore = smoothstep(0.0, 0.5, min(e.x, e.y) + (fbm(vW.xz * 1.6) - 0.5) * 0.6);
					gl_FragColor = vec4(c, 0.92 * shore);
				}`,
		}));
		water.rotation.x = -Math.PI / 2;
		water.position.set(cx, 0.02, zc);
		water.renderOrder = -1;   // (under the hotspots)
		unit.add(water);
		// a dark bed under it, so it reads deep
		const bed = mesh(new THREE.PlaneGeometry(W2, D2), new THREE.MeshStandardMaterial({ color: '#0a1a1c', roughness: 1 }), unit, cx, 0.006, zc);
		bed.rotation.x = -Math.PI / 2; bed.castShadow = false;
		// stones round its edges
		const stone = new THREE.MeshStandardMaterial({ color: '#5a6a5a', map: TEX.moss, bumpMap: TEX.moss, bumpScale: 4, roughness: 0.85 });
		for (let k = 0; k < 26; k++) {
			const side = k % 2 ? 1 : -1, z = cz - POND.front - rr(0.2, D2 - 0.4);
			mesh(ROCKS[k % ROCKS.length], stone, unit, cx + side * (POND.half + rr(-0.05, 0.25)), 0.08, z, rr(0.18, 0.32), rr(0.1, 0.18), rr(0.18, 0.3));
		}
		// the rock face at the back, and the waterfall pouring off it
		const zb = cz - POND.back;
		for (let k = 0; k < 22; k++) {
			const x = cx + rr(-POND.half - 0.6, POND.half + 0.6), y = rr(0, 3.6) * (1 - Math.abs(x - cx) / (POND.half + 1.5) * 0.4);
			const r = mesh(ROCKS[k % ROCKS.length], stone, unit, x, y, zb - rr(0.2, 0.7), rr(0.6, 1.1), rr(0.45, 0.8), rr(0.5, 0.8));
			r.rotation.set(rr(-0.4, 0.4), rnd() * 6, rr(-0.4, 0.4));
		}
		const fallU = { uT: sparkleU.uTime };
		const fall = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.6, 1, 12), new THREE.ShaderMaterial({
			uniforms: fallU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
			vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; p.z += (1.0 - uv.y) * (1.0 - uv.y) * 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }',
			fragmentShader: `uniform float uT; varying vec2 vUv;
				${NOISE}
				void main(){
					float streak = fbm(vec2(vUv.x * 9.0, vUv.y * 2.0 + uT * 2.6)) * 0.7 + fbm(vec2(vUv.x * 22.0, vUv.y * 4.0 + uT * 3.4)) * 0.5;
					float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
					float a = smoothstep(0.35, 0.9, streak) * edge * (0.55 + 0.45 * smoothstep(0.0, 0.3, 1.0 - vUv.y));
					gl_FragColor = vec4(vec3(0.75, 0.95, 1.0) * 1.6 * a, a);
				}`,
		}));
		fall.position.set(cx, 1.8, zb + 0.15);
		unit.add(fall);
		sparkles(unit, cx, zb + 0.5, 160, '#e8ffff', 0.9, 0.05, 0.9, 0.08);   // (spray where it lands)
		// lily pads drifting on the water, a few with glowing buds
		const padMat = new THREE.MeshPhysicalMaterial({ color: '#3a9a3a', roughness: 0.25, clearcoat: 1, side: THREE.DoubleSide });
		const pads = [];
		for (let k = 0, tries = 0; k < 12 && tries < 200; tries++) {
			const x = cx + rr(-POND.half + 0.4, POND.half - 0.4), z = cz - POND.front - rr(0.6, D2 - 1.8);
			if (pads.some((pd) => Math.hypot(x - pd.x, z - pd.z) < 0.8)) continue;
			const pad = mesh(new THREE.CircleGeometry(rr(0.26, 0.4), 24, 0.3, Math.PI * 2 - 0.5), padMat, unit, x, 0.03, z);
			pad.rotation.x = -Math.PI / 2; pad.rotation.z = rnd() * 6; pad.castShadow = false;
			const budMat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.85 + k * 0.02, 0.8, 0.65) });
			const bud = mesh(GEO.sph, budMat, unit, x, 0.09, z, 0.07, 0.06, 0.07);
			pads.push({ pad, bud, budMat, base: budMat.color.clone(), x, z, bounce: 0, ph: rnd() * 6 });
			k++;
		}
		labels.push({ ci, wall: 1, at: new THREE.Vector3(cx, 0.05, cz - 3.2), text: 'WADE IN THE POND' });
		ponds[ci] = { pads, rip, U, next: 0, cx, cz };
	}

	// ACORN XYLOPHONE: wooden planks on a rickety frame by the front wall, set back past
	// where the avatars can go. Each player has an acorn (capped in their colour) bouncing
	// endlessly over it, landing on every beat, lined up left and right with them: land on
	// a plank and it plays and lights up; land between them and it just knocks the frame
	const xylos = [];
	const XY = { out: 0.85, y: 0.58, top: 0.74, hop: 1.1 };   // (planks R + out from the middle; acorns land at top, hop up to top + hop)
	function buildXylo(g, ci, cx, cz) {
		const N = 7, logs = [];
		const wood = new THREE.MeshStandardMaterial({ color: '#d8a868', map: TEX.bark, bumpMap: TEX.bark, bumpScale: 1.5, roughness: 0.55 });
		const U0 = 1 / 6, US = 2 / 3;   // (the middle two thirds of the front wall)
		for (let k = 0; k < N; k++) {
			const u = U0 + (k + 0.5) / N * US;
			const pos = wallPoint(cx, cz, 1, u, XY.out, XY.y + rr(-0.03, 0.03));   // (up off the ground, on a rickety frame)
			const len = lerp(0.85, 0.5, k / (N - 1));
			const mat = wood.clone();
			mat.color.offsetHSL(0, 0, (k % 2 ? -0.04 : 0.04));
			// (a flat wooden plank, the next almost touching it, longest for the lowest note)
			const pw = 2 * (R + XY.out) * US / N * 0.86;   // (a little narrower: turned, they'd overlap)
			// (wonky: every corner a little off, some ends cut on the slant, each laid a bit askew)
			const hw = pw / 2, hl = len / 2, j = () => rr(-0.045, 0.045);
			const outline = [[-hw + j(), -hl + j()], [hw + j(), -hl + j() + (rnd() < 0.5 ? rr(-0.08, 0.08) : 0)], [hw + rr(-0.02, 0.05), rr(-0.08, 0.08)], [hw + j(), hl + j()], [-hw + j(), hl + j() + rr(-0.06, 0.06)], [-hw + rr(-0.05, 0.02), rr(-0.08, 0.08)]];
			const pg = new THREE.ExtrudeGeometry(new THREE.Shape(outline.map(([a, b]) => new THREE.Vector2(a, b))), { depth: rr(0.18, 0.22), bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
			pg.rotateX(-Math.PI / 2);
			const log = mesh(pg, mat, g, pos.x, pos.y, pos.z);
			// (tipped up toward you like a lectern, and each turned partway to point at you)
			log.rotation.order = 'YXZ';
			log.rotation.set(0.45 + rr(-0.06, 0.06), 0.7 * Math.atan2(-(pos.x - cx), R + XY.out) + rr(-0.05, 0.05), rr(-0.07, 0.07));
			logs.push({ log, mat, pos, deg: k + 2, hit: 0, hw: pw / 2 });
		}
		// the rickety frame: two crooked rails on splayed legs
		const span = 2 * (R + 0.06) * US;
		for (const dz of [-0.24, 0.24]) {
			const ry = XY.y - 0.06 - dz * 0.48;   // (the back rail higher: the planks lean toward you)
			const rail = mesh(new THREE.BoxGeometry(span * 1.02, 0.05, 0.06), wood, g, cx, ry - 0.05, cz - R - XY.out + dz);
			rail.rotation.z = rr(-0.03, 0.03);
			for (const fx of [-0.5, -0.17, 0.17, 0.5]) {
				const leg = mesh(new THREE.CylinderGeometry(0.03, 0.04, ry, 6), wood, g, cx + fx * span + rr(-0.05, 0.05), ry / 2 - 0.03, cz - R - XY.out + dz * 1.15);
				leg.rotation.set(dz > 0 ? 0.12 : -0.12, 0, rr(-0.15, 0.15));
			}
		}
		// the branch they fall from, leafy
		const pts = [-1, -0.5, 0, 0.5, 1].map((t, k) => new THREE.Vector3(cx + t * 2.3, 4.5 + Math.sin(k * 1.7) * 0.12, cz - R - XY.out - 0.2));
		mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.07, 8), MAT.bark, g);
		for (let k = 0; k < 14; k++) mesh(CANOPY[k % 3], leafMats[k % 4], g, cx + rr(-2.1, 2.1), 4.6 + rr(0, 0.2), cz - R - XY.out - 0.15 + rr(-0.2, 0.2), rr(0.25, 0.4), rr(0.15, 0.22), rr(0.2, 0.3));
		const nut = new THREE.MeshPhysicalMaterial({ color: '#b8782e', roughness: 0.25, clearcoat: 1 });
		const conkers = [];
		for (let i = 0; i < 6; i++) {
			const m = new THREE.Group(); g.add(m);   // (an acorn: a glossy nut in a knobbly cup in your colour, with a stalk)
			const cupM = new THREE.MeshStandardMaterial({ color: colour(i), emissive: colour(i), emissiveIntensity: 0.35, map: TEX.moss, bumpMap: TEX.moss, bumpScale: 3, roughness: 0.8 });
			mesh(GEO.sph, nut, m, 0, -0.03, 0, 0.08, 0.11, 0.08);
			mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), cupM, m, 0, 0.03, 0, 0.09, 0.065, 0.09);
			mesh(GEO.cyl, cupM, m, 0, 0.11, 0, 0.012, 0.05, 0.012);
			m.visible = false;
			conkers.push({ m, x: cx });
		}
		labels.push({ ci, wall: 1, at: new THREE.Vector3(cx, 0.05, cz - R), text: 'LINE YOUR ACORN UP' });
		xylos[ci] = { logs, conkers, cx, cz, z: cz - R - XY.out };
	}
	// the plank under x, if an acorn landing there would hit one (between them, or past the ends: the frame)
	function plankAt(xy, x) {
		let best = null, bd = Infinity;
		for (const lg of xy.logs) { const d = Math.abs(x - lg.pos.x); if (d < bd) { bd = d; best = lg; } }
		return best && bd < best.hw * 0.85 ? best : null;
	}
	// MOONBEAM THEREMIN: a shaft of moonlight by a wall; stand in it and rise and dip to bend a ghostly note
	const theremins = [];
	const BEAM_TINT = [[1.8, 1.0, 1.6], [1.2, 1.3, 1.8], [1.0, 1.8, 1.5]];   // (low, middle, high)
	function buildTheremin(g, ci, cx, cz, [w, along], k = 1) {
		const sp0 = spotOf(w, along), av = avatarAt(sp0.px, sp0.pz);
		const pos = new THREE.Vector3(cx + av.x, 0, cz + av.z);   // (exactly where an avatar stands in it)
		const tint = BEAM_TINT[k % 3];
		const beamMat = new THREE.MeshBasicMaterial({ map: TEX.ray, color: new THREE.Color(...tint), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
		const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 9, 24, 1, true), beamMat);
		beam.position.set(pos.x, 4.5, pos.z); beam.renderOrder = 2;
		g.add(beam);
		const pool = mesh(GEO.shadow, new THREE.MeshBasicMaterial({ map: TEX.soft, color: new THREE.Color(...tint), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }), g, pos.x, 0.02, pos.z, 1.4, 1.4);
		pool.rotation.x = -Math.PI / 2; pool.castShadow = false;
		const orbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...tint).multiplyScalar(1.6) });
		const orb = mesh(GEO.sph, orbMat, g, pos.x, 1, pos.z, 0.09);
		orb.castShadow = false;
		if (k === 1) labels.push({ ci, wall: w, at: pos.clone().setY(0.05), text: 'STAND IN A MOONBEAM' });
		theremins.push({ ci, beamMat, orb, pos, w, spot: spotOf(w, along), deg: [0, 5, 10][k % 3], voice: null, who: -1, k: 0.5, glow: 0 });
	}

	// CHIMES under the arch: brass tubes on cords, hung from its underside, lowest on
	// the left, highest on the right. Touch one to strike it, swipe across to run them.
	const chimeSets = [];
	function buildChimes(g, ci, cx, cz) {
		const N = 11, zc = cz - 8.5 + 0.3, list = [];
		const brass = new THREE.MeshPhysicalMaterial({ color: '#e8c66a', metalness: 1, roughness: 0.18, clearcoat: 1, emissive: '#ffb030', emissiveIntensity: 0 });
		const cord = new THREE.MeshBasicMaterial({ color: '#3a2a1a' });
		for (let k = 0; k < N; k++) {
			const x = (k / (N - 1) - 0.5) * 7.2;
			const top = Math.sqrt(Math.max(0, 4.25 * 4.25 - x * x)) * 0.8 - 0.05;   // (the arch's underside, there)
			const len = lerp(1.25, 0.6, k / (N - 1)), drop = Math.max(0.1, top - 0.95 - len);   // (their feet near 0.95 m, in reach of a touch)
			const piv = new THREE.Group(); piv.position.set(cx + x, top, zc); g.add(piv);
			mesh(GEO.cyl, cord, piv, 0, -drop / 2, 0, 0.012, drop, 0.012).castShadow = false;
			const mat = brass.clone();
			const tube = mesh(new THREE.CylinderGeometry(0.1, 0.1, len, 16, 1, false), mat, piv, 0, -drop - len / 2, 0);
			mesh(GEO.cyl, mat, piv, 0, -drop, 0, 0.11, 0.03, 0.11);
			list.push({ piv, mat, x: cx + x, y: top - drop - len / 2, z: zc, len, deg: k, swing: 0, v: 0, glow: 0 });
		}
		labels.push({ ci, wall: 1, at: new THREE.Vector3(cx, 0.5, zc), text: 'SWIPE THE CHIMES' });
		chimeSets[ci] = { list, last: -1, lastT: -9 };
	}
	function chimeAt(at, wall, who, strum) {
		const cs = chimeSets[here];
		if (!cs || wall !== 1) return false;
		let best = -1, bd = strum ? 70 : 130;
		cs.list.forEach((ch, k) => {
			const top = proj(1, _v.set(ch.x, ch.y + ch.len / 2, ch.z)), bot = proj(1, _v.set(ch.x, ch.y - ch.len / 2, ch.z));
			const y = clamp(at.y, top.y, bot.y), d = Math.hypot(top.x - at.x, (y - at.y) * 0.5);
			if (d < bd) { bd = d; best = k; }
		});
		if (best < 0) return false;
		if (strum && (best === cs.last || rt - cs.lastT < 0.05)) return true;
		cs.last = best; cs.lastT = rt;
		const ch = cs.list[best];
		ch.v += (strum ? 2.2 : 1.6) * (at.x < proj(1, _v.set(ch.x, ch.y, ch.z)).x ? 1 : -1);
		ch.glow = 1;
		if (audioOn()) { const f = freqOf(CLEARINGS[here].root, 3 + ch.deg); SND.bell(clock() + 0.005, f, 0.32, 1); SND.bell(clock() + 0.005, f * 2.01, 0.08, 1); }
		spray(_v.set(ch.x, ch.y - ch.len / 2, ch.z).clone(), '#ffe8a0', 8, 1.1, 0.6);
		scores[who] += 1;
		tut.touched[who] = true;
		return true;
	}

	// BRIDGE CHOIR: stone faces on the bridge hum the chord; where everyone stands, left to right, picks it
	const choirs = [];
	const CHOIR = [{ name: 'MOODY', chord: [9, 12, 16] }, { name: 'HOPEFUL', chord: [5, 9, 12] }, { name: 'HOME', chord: [0, 4, 7] }, { name: 'BRIGHT', chord: [7, 11, 14] }];
	function buildChoir(g, ci, cx, cz) {
		const stoneMat = new THREE.MeshStandardMaterial({ color: '#9a9a8a', roughness: 0.9, bumpMap: TEX.moss, bumpScale: 4 });
		const faces = [];
		for (const a of [Math.PI * 0.22, Math.PI * 0.5, Math.PI * 0.78]) {
			const grp = new THREE.Group();
			grp.position.set(cx + Math.cos(a) * 5, Math.sin(a) * 4.0 + 0.1, cz - 8.5 + 1.15);
			g.add(grp);
			const disc = mesh(GEO.cyl, stoneMat, grp, 0, 0, 0, 0.7, 0.2, 0.7); disc.rotation.x = Math.PI / 2;
			const face = makeFace(grp, 1.6, 0, 0, 0.12);
			faces.push({ grp, face });
		}
		choirs[ci] = { faces, idx: 2, hum: 0 };
	}

	// A snail's shell: a tube coiled along a growing spiral in the y-z plane (its axis along x),
	// thick and fattening as it winds out. Built ring by ring, so its radius can grow.
	let _shellGeo = null;
	function spiralShellGeo() {
		if (_shellGeo) return _shellGeo;
		const TURNS = 2.5, OUT = 0.3, GROW = 2.7, SEG = 140, RAD = 18;
		const b = Math.log(GROW) / (2 * Math.PI), th1 = TURNS * 2 * Math.PI;
		const at = (th) => { const r = OUT * Math.exp(b * (th - th1)); return new THREE.Vector3(0, r * Math.sin(th), r * Math.cos(th)); };
		const pos = [], idx = [];
		const X = new THREE.Vector3(1, 0, 0);
		for (let i = 0; i <= SEG; i++) {
			const th = th1 * i / SEG, p = at(th), r = OUT * Math.exp(b * (th - th1));
			const T2 = at(th + 0.01).sub(at(th - 0.01)).normalize(), N = new THREE.Vector3().crossVectors(X, T2).normalize();
			const tr = r * 0.52 + 0.004;   // (a fat tube: each turn nearly touches the last)
			for (let j = 0; j <= RAD; j++) {
				const a = j / RAD * Math.PI * 2;
				const v = p.clone().addScaledVector(N, Math.cos(a) * tr).addScaledVector(X, Math.sin(a) * tr * 0.92);
				pos.push(v.x, v.y, v.z);
				if (i && j) { const A = (i - 1) * (RAD + 1) + j - 1, B = A + RAD + 1; idx.push(A, B, A + 1, A + 1, B, B + 1); }
			}
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		g.setIndex(idx);
		g.computeVertexNormals();
		_shellGeo = g;
		return g;
	}
	// A hotspot: a round pad where you stand (r1, at the origin), a neck narrowing away from
	// it, and a round footprint (r2) under the creature, L along +y.
	function hotShape(r1, r2, L) {
		const ph = 0.85, w = Math.min(r1, r2) * 0.35, sh = new THREE.Shape();
		sh.moveTo(r1 * Math.sin(ph), r1 * Math.cos(ph));
		sh.quadraticCurveTo(w, L / 2, r2 * Math.sin(ph), L - r2 * Math.cos(ph));
		sh.absarc(0, L, r2, -Math.PI / 2 + ph, Math.PI * 1.5 - ph, false);
		sh.quadraticCurveTo(-w, L / 2, -r1 * Math.sin(ph), r1 * Math.cos(ph));
		sh.absarc(0, 0, r1, Math.PI / 2 + ph, Math.PI * 2.5 - ph, false);
		return sh;
	}
	// a teardrop outline: a circle of radius r round the origin, a tail to a point L along +y
	function teardrop(r, L) {
		const b = Math.acos(Math.min(0.99, r / L)), pts = [new THREE.Vector2(0, L)];
		for (let k = 0; k <= 36; k++) { const a = Math.PI / 2 - b - k / 36 * (2 * Math.PI - 2 * b); pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
		return pts;
	}
	function showOnly(list) {
		clearingGroups.forEach((g, k) => { g.visible = list.includes(k); });
	}

	/* the players: fuzzy puffballs in their colours, with faces */

	function buildPuff(i) {
		const g = new THREE.Group();
		const fur = furMat(colour(i));
		fur.emissive = new THREE.Color(colour(i)); fur.emissiveIntensity = 0.35;
		mesh(GEO.sph, fur, g, 0, 0, 0, 0.17);
		const face = makeFace(g, 0.24, 0, 0.0, 0.15);
		const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: TEX.soft, color: new THREE.Color(colour(i)).multiplyScalar(1.5), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
		g.add(halo);
		g.userData = { face, halo };
		g.visible = false;
		scene.add(g);
		return g;
	}

	/* tricks, hops and ducks */

	function trick(c) {
		c.trickT = 1;
		const at = c.headAt();
		spray(at, '#' + c.tint.getHexString(), 70, 3.2, 2);
		spray(at, '#ffffff', 30, 2.4, 2);
		if (c.kind === 'troll') shake = 0.6;
		float(at, ['WAHOO!', 'YOWZA!', 'BOING!', 'HOO-HA!', 'ZOINKS!', 'WHEEE!'][c.index % 6], '#' + c.tint.clone().offsetHSL(0, 0, 0.15).getHexString());
	}
	function hopAll() {
		for (const c of creatures) if (c.clearing === here) c.hopT = 1;
		for (const c of creatures) if (c.clearing === here) spray(c.touchAt(), '#ffffff', 6, 1.5);
	}
	function duckAll() {
		for (const c of creatures) if (c.clearing === here) c.duckT = 1;
		shake = 0.35;
	}
	let shake = 0;
	function float(at, text, fill) { floaters.push({ at: at.clone(), text, fill, t: 0 }); }

	/* every frame: the forest catches up with the music */

	const PAL = CLEARINGS.map((c) => ({ top: new THREE.Color(c.sky[0]), bot: new THREE.Color(c.sky[1]), fog: new THREE.Color(c.fog), sun: new THREE.Color(c.sun), lights: c.lights.map((l) => new THREE.Color(l)) }));
	const tmpC = new THREE.Color();
	const _yAx = new THREE.Vector3(0, 1, 0);
	const _q0 = new THREE.Quaternion(), _e0 = new THREE.Euler(), _p0 = new THREE.Vector3();
	let rt = 0;
	let frameNo = 0;
	const perfFlags = {};
	function update3D(dt) {
		rt += dt;
		frameNo++;
		sparkleU.uTime.value = rt;
		wobT.value = rt;
		swayU.uTime.value = rt;
		const now = clock();
		// what was scheduled for now
		for (let k = visuals.length - 1; k >= 0; k--) if (visuals[k].time <= now) { visuals[k].fn(); visuals.splice(k, 1); }
		const beat = beatAt(now);
		const bf = ((beat % 1) + 1) % 1;
		const pulse = Math.exp(-bf * 7);
		swayU.uBeat.value = pulse;
		// where the walls are: in a clearing, or on the path between
		let k = 0, from = here, to = here;
		if (glide) { from = glide.from; to = glide.to; k = ease(glide.t); }
		const zA = -from * SPACING, zB = -to * SPACING;
		const z = lerp(zA, zB, k);
		const seg = Math.min(from, to), forward = Math.abs(to - from) === 1;
		const tk = to > from ? k : 1 - k;
		walls.rig.position.set(forward ? pathX(seg, tk) : 0, EYE + Math.abs(Math.sin(k * Math.PI * 6)) * 0.06, z);
		walls.rig.rotation.y = forward ? -Math.atan(pathSlope(seg, tk)) * (to > from ? 1 : -1) * 0.8 : 0;   // (turning into the bends)
		// (on the walk, the camera pulls back and up behind the avatars, so they're all on the front wall)
		const pull = glide ? Math.sin(Math.min(1, glide.t / 0.12, (1 - glide.t) / 0.12) * Math.PI / 2) : 0;
		walls.pull = pull;
		if (pull > 0) {
			_p0.set(0, 0, 1.6 * pull).applyAxisAngle(_yAx, walls.rig.rotation.y);
			walls.rig.position.add(_p0);
			walls.rig.position.y += 0.9 * pull;
		}
		walls.rig.rotation.order = 'YXZ';
		walls.rig.rotation.x = -0.16 * pull;   // (the whole rig tips down together, so the walls still meet)
		shake = Math.max(0, shake - dt);
		if (shake > 0) walls.rig.position.x += (Math.random() - 0.5) * shake * 0.12;
		const A = PAL[from], B = PAL[to];
		skyU.top.value.copy(A.top).lerp(B.top, k);
		skyU.bot.value.copy(A.bot).lerp(B.bot, k);
		const starA = [0, 1, 3].includes(from) ? 1 : 0, starB = [0, 1, 3].includes(to) ? 1 : 0;
		skyU.stars.value = lerp(starA, starB, k);
		const SA = SKY[from], SB = SKY[to];
		skyU.moon.value = lerp(SA.night, SB.night, k);
		skyU.sunDir.value.set(...SA.dir).lerp(_m.set(...SB.dir), k).normalize();
		skyU.glowC.value.set(SA.glow).lerp(tmpC.set(SB.glow), k);
		skyU.sunC.value.copy(A.sun).lerp(B.sun, k).multiplyScalar(lerp(SA.night ? 0.7 : 1.2, SB.night ? 0.7 : 1.2, k));
		// the sun ahead: a rim light from behind everything, the shafts, the mist
		rimL.color.copy(skyU.sunC.value);
		rimL.intensity = lerp(SA.night ? 1.6 : 3.2, SB.night ? 1.6 : 3.2, k);
		rimL.position.copy(walls.rig.position).addScaledVector(skyU.sunDir.value, 30);
		rimL.target.position.copy(walls.rig.position);
		rimU.uRim.value.copy(skyU.glowC.value).lerp(skyU.sunC.value, 0.4).multiplyScalar(0.55 + pulse * 0.25);
		shaftU.uCol.value.copy(skyU.sunC.value).multiplyScalar(lerp(SA.night ? 0.6 : 1, SB.night ? 0.6 : 1, k));
		mistU.uCol.value.copy(A.fog).lerp(B.fog, k).lerp(skyU.glowC.value, 0.35).multiplyScalar(1.25);
		mistU.uA.value = 0.32 + Math.sin(k * Math.PI) * 0.25;
		gradeU.uShadow.value.set(1, 1, 1).lerp(tmpC.copy(A.fog).lerp(B.fog, k), 0.3).multiplyScalar(1.05);
		gradeU.uHigh.value.set(1, 1, 1).lerp(tmpC.copy(A.sun).lerp(B.sun, k), 0.2);
		for (const g of clearingGroups) if (g.visible && g.userData.bulbMat) g.userData.bulbMat.color.copy(g.userData.bulbBase).multiplyScalar(0.7 + pulse * 0.6);
		sky.position.copy(walls.rig.position);
		scene.fog.color.copy(A.fog).lerp(B.fog, k);
		scene.fog.density = 0.028 + Math.sin(k * Math.PI) * 0.02;
		sun.color.copy(A.sun).lerp(B.sun, k);
		sun.position.set(walls.rig.position.x + 8, 16, z + 6);
		sun.target.position.set(walls.rig.position.x, 0, z - 3);
		hemi.color.copy(A.top).lerp(B.top, k).lerp(tmpC.set('#ffffff'), 0.5);
		glows.forEach((l, i) => {
			l.color.copy(A.lights[i]).lerp(B.lights[i], k);
			l.position.set(GLOW_AT[i][0], GLOW_AT[i][1], z + GLOW_AT[i][2]);
			l.intensity = 5 + pulse * 6;
		});

		// the scenery breathes and bounces too
		for (const g of clearingGroups) {
			if (!g.visible) continue;
			for (const m of g.children) {
				if (m.userData.bob !== undefined) { const s = 1 + pulse * 0.05; m.scale.set(1 + pulse * 0.03, s, 1 + pulse * 0.03); }
				if (m.userData.flutter !== undefined) m.rotation.z = Math.sin(rt * 5 + m.userData.flutter) * 0.25;
			}
		}

		// the creatures
		for (const c of creatures) {
			if (!clearingGroups[c.clearing].visible) continue;
			c.singT = Math.max(0, c.singT - dt * 4);
			c.trickT = Math.max(0, c.trickT - dt * 0.9);
			c.hopT = Math.max(0, c.hopT - dt * 2);
			c.duckT = Math.max(0, c.duckT - dt * 1.6);
			const myPulse = c.offbeat ? Math.exp(-((bf + 0.5) % 1) * 7) : pulse;
			const sq = myPulse * 0.09 + c.singT * 0.08;
			const duck = Math.sin(Math.min(1, (1 - c.duckT) * 1.2) * Math.PI) * (c.duckT > 0 ? 1 : 0);
			const base = c.size;
			c.bouncer.scale.set(base * (1 + sq * 0.6 + duck * 0.25), base * (1 - sq + c.singT * 0.12 - duck * 0.4), base * (1 + sq * 0.6 + duck * 0.25));
			c.bouncer.position.y = Math.sin((1 - c.hopT) * Math.PI) * (c.hopT > 0 ? 0.45 : 0) + myPulse * 0.04;
			c.bouncer.rotation.z = Math.sin(beat * Math.PI + c.phase) * 0.02;
			c.bouncer.rotation.y = Math.sin(beat * Math.PI * 0.5 + c.phase) * 0.12;
			// the ring at its feet lights when someone stands in front
			const lit = c.singer >= 0;
			c.ringEdge.material.opacity = lit ? 1 : 0.45 + myPulse * 0.2;
			c.ringFill.material.opacity = lit ? 0.9 : 0.42 + myPulse * 0.14;
			if (lit) { c.ringEdge.material.color.set(colour(c.singer)).multiplyScalar(2); c.ringFill.material.color.set(colour(c.singer)).multiplyScalar(1.4); }
			else { c.ringEdge.material.color.copy(c.tint).multiplyScalar(1.6); c.ringFill.material.color.copy(c.tint).multiplyScalar(1.2); }
			c.ring.scale.setScalar(1 + (lit ? 0.08 : 0) + myPulse * 0.05);
			// the face: blinks, a bigger mouth when it sings
			const f = c.face;
			if (f) {
				f.blink -= dt;
				if (f.blink < 0) f.blink = 2 + Math.random() * 4;
				const shut = f.blink < 0.12;
				const open = Math.max(c.singT, c.trickT * 0.8);
				for (const e of f.eyes) {
					e.eye.scale.y = shut ? 0.1 : 1 + c.trickT * 0.25;
					e.pupil.position.x = Math.sin(rt * 0.7 + c.phase) * 0.02 * f.s;
					e.brow.position.y = (0.36 + open * 0.06 + myPulse * 0.03) * f.s;
				}
				f.mouth.open.scale.y = (0.02 + open * 0.17) * f.s;
				f.mouth.tongue.visible = open > 0.2;
				f.mouth.teeth.forEach((m) => { m.visible = open > 0.2; m.position.y = (0.03 + open * 0.1) * f.s; });
				f.mouth.smile.visible = open < 0.2;
			}
			if (c.wob) {
				const W2 = c.wob;
				c.root.getWorldPosition(W2.base.value);
				_m.set(1, 0, 0).applyQuaternion(c.root.quaternion);   // (its own sideways, in the world)
				_m2.set(0, 0, 1).applyQuaternion(c.root.quaternion);   // (its forward: toward the walls)
				const sway = Math.sin(beat * Math.PI + c.phase) * 0.14 + (c.trickT > 0 ? Math.sin(rt * 14 + c.phase) * 0.35 * c.trickT : 0);
				const lean = c.singT * 0.16 - c.duckT * 0.05 + Math.sin(beat * Math.PI * 0.5 + c.phase * 2) * 0.05;
				const bk = c.bend || 1;
				W2.bend.value.set(0, 0, 0).addScaledVector(_m, sway * c.size * bk).addScaledVector(_m2, lean * c.size * bk);
				W2.bend.value.y = (myPulse * 0.06 + c.duckT * 0.15) * c.size;
				W2.jig.value = (0.03 + myPulse * 0.07 + c.singT * 0.14 + c.trickT * 0.22) * Math.sqrt(bk);
			}
			stepKind(c, dt, beat, myPulse);
			if (!perfFlags.nonoodles && ((c.index + frameNo) % 2 === 0 || c.trickT > 0)) noodles(c, beat, myPulse);   // (half the noodles each frame: twice the speed, no one can tell)
		}

		// the festoons
		const fm4 = new THREE.Matrix4(), fc = new THREE.Color(), fs = new THREE.Vector3();
		festoons.forEach((f, ci) => {
			if (!f || !clearingGroups[ci].visible) return;
			for (let i = 0; i < FEST.n; i++) {
				f.flash[i] = Math.max(0, f.flash[i] - dt * 3);
				f.head[i] = Math.max(0, f.head[i] - dt * 2.2);
				if (f.on[i]) fc.copy(f.col[i]).multiplyScalar(2.2 + f.flash[i] * 2.5 + pulse * 0.4);
				else fc.setRGB(0.045, 0.035, 0.03).lerp(f.col[i], 0.06);   // (unlit: a dark glass bulb)
				fc.r += f.head[i] * 0.5; fc.g += f.head[i] * 0.5; fc.b += f.head[i] * 0.5;
				f.bulbs.setColorAt(i, fc);
				const sc = (f.on[i] ? 1 + pulse * 0.08 : 0.8) + f.flash[i] * 0.45;
				_e0.set(0, 0, 0);
				_p0.copy(f.pos[i]);
				if (f.style === 'star') _e0.set(0, rt * 1.4 + i, Math.sin(rt * 2 + i) * 0.15);
				else if (f.style === 'lantern') _e0.set(0, i * 0.7 + rt * 0.3, Math.sin(rt * 1.3 + i) * 0.12);
				else if (f.style === 'toadstool' || f.style === 'jar') _e0.set(0, i, Math.sin(rt * 1.1 + i) * 0.1);
				else if (f.style === 'firefly') {
					_p0.x += Math.sin(rt * 1.3 + i * 1.7) * 0.1; _p0.y += Math.sin(rt * 2.1 + i) * 0.07; _p0.z += Math.cos(rt * 1.1 + i * 2.3) * 0.1;
					_e0.set(0, rt * 0.8 + i, 0);
				}
				_q0.setFromEuler(_e0);
				fm4.compose(_p0, _q0, fs.set(sc, sc, sc));
				f.bulbs.setMatrixAt(i, fm4);
			}
			f.bulbs.instanceColor.needsUpdate = true;
			f.bulbs.instanceMatrix.needsUpdate = true;
		});
		// the fungus walls
		grids.forEach((gw, ci) => {
			if (!gw || !clearingGroups[ci].visible) return;
			gw.beam = Math.max(0, gw.beam - dt * 2.2);
			if (gw.head >= 0) gw.beamMesh.position.x = gw.pos[gw.head].x;
			gw.beamMesh.material.opacity = 0.25 + gw.beam * 0.6;
			for (let i = 0; i < gw.pos.length; i++) {
				gw.flash[i] = Math.max(0, gw.flash[i] - dt * 3);
				const st = gw.stones[i], inBeam = i % GRID.cols === gw.head ? gw.beam : 0;
				if (gw.on[i]) {
					st.mat.color.copy(gw.rowCol[i]).lerp(tmpC.set('#ffffff'), 0.3);
					st.mat.emissive.copy(gw.rowCol[i]).multiplyScalar(0.9 + gw.flash[i] * 1.6 + pulse * 0.3);
				} else {
					st.mat.color.copy(gw.rowCol[i]).lerp(tmpC.set('#a49c8c'), 0.86);   // (unlit: plain stone)
					st.mat.emissive.copy(gw.rowCol[i]).multiplyScalar(inBeam * 0.3);
				}
				st.m.position.z = st.z0 + (gw.on[i] ? 0.035 + gw.flash[i] * 0.04 : 0);   // (a lit stone stands proud of the wall)
			}
		});
		// pumpkins: a spring, so they squish, overshoot and wobble; a tremble while held; faces to match
		for (const [ci, list] of puffs.entries()) if (list && clearingGroups[ci].visible) for (const pb of list) {
			// (its hotspot: glowing in your colour while you're on it, flaring on each note)
			pb.glow = Math.max(0, pb.glow - dt * 4);
			const on = ci === here && pb.stand >= 0;
			if (on) pb.hotMat.color.set(colour(pb.stand)).multiplyScalar(1.4 + pb.glow * 0.8); else pb.hotMat.color.set('#ff9a30').multiplyScalar(1.2);
			pb.hotMat.opacity = on ? 0.85 : 0.4 + pulse * 0.12;
			const want = pb.pressed ? 1 + Math.sin(rt * 7 + pb.ph) * 0.06 : 0;   // (held: it breathes, and pumps to its bass)
			pb.v += ((want - pb.sq) * 190 - pb.v * 7) * Math.min(dt, 0.05);
			pb.sq += pb.v * Math.min(dt, 0.05);
			const q = pb.sq, shake = pb.pressed ? Math.sin(rt * 38) * 0.012 : 0;
			pb.body.scale.set(1 + q * 0.32 + shake + pulse * 0.025, Math.max(0.3, 1 - q * 0.5 + pulse * 0.04), 1 + q * 0.32 - shake + pulse * 0.025);
			pb.body.rotation.z = pb.v * 0.012 + Math.sin(rt * 1.3 + pb.ph) * 0.02;
			pb.stem.rotation.z = -pb.v * 0.05;
			pb.stem.rotation.x = Math.sin(rt * 9 + pb.ph) * Math.min(0.3, Math.abs(pb.v) * 0.03);
			// its face: screwed shut and an O when squashed; wide-eyed as it bounces back; a blink now and then
			const f = pb.face, sqz = clamp(q, 0, 1), boing = clamp(-q * 3, 0, 1);
			pb.blinkT -= dt;
			const blink = pb.blinkT < 0.12 && pb.blinkT > 0 ? 0.1 : 1;
			if (pb.blinkT < 0) pb.blinkT = rr(2, 5);
			for (const e of f.eyes) {
				e.eye.scale.set(1 + sqz * 0.3 + boing * 0.3, Math.max(0.1, lerp(1, 0.12, sqz) * blink) * (1 + boing * 0.4), 1);
				e.brow.position.y = 0.36 * f.s + boing * 0.06 * f.s - sqz * 0.04 * f.s;
				e.brow.rotation.z = -e.sx * (0.28 - sqz * 0.7);
			}
			f.mouth.open.scale.set(0.19 * f.s * (1 - sqz * 0.4), 0.02 * f.s + (sqz * 0.16 + boing * 0.08) * f.s, 0.07 * f.s);
			f.mouth.smile.visible = sqz < 0.3 && boing < 0.3;
			for (const t of f.mouth.teeth) t.visible = sqz < 0.3;
			f.mouth.tongue.visible = sqz > 0.5;
		}
		// the web: each pluck sends a ripple out through the strands round it, and the spider runs to see
		for (const [ci, wb] of webs.entries()) if (wb && clearingGroups[ci].visible) {
			wb.plucks = wb.plucks.filter((pk) => rt - pk.t < 1.8);
			for (const nd of wb.nodes) {
				nd.at.copy(nd.base);
				for (const pk of wb.plucks) {
					const age = rt - pk.t, dx = nd.base.x - pk.x, dy = nd.base.y - pk.y, d = Math.hypot(dx, dy) || 1e-3;
					if (d > age * 3.2 + 0.15) continue;   // (the ripple hasn't reached it yet)
					const amp = 0.2 * Math.exp(-age * 1.8) * Math.exp(-d / 0.9) * Math.sin(age * 30 - d * 9);   // (a big, slow-dying shiver, fading with distance)
					nd.at.x += dx / d * amp * 0.6 + pk.px * amp; nd.at.y += dy / d * amp * 0.6 + pk.py * amp;
				}
			}
			// the spider: off to a pluck, then a wander, then home
			const S = wb.sp;
			const d = Math.hypot(S.tx - S.x, S.ty - S.y);
			if (d > 0.02) {
				const step = Math.min(d, dt * (S.rush ? 2.6 : 0.9));
				S.x += (S.tx - S.x) / d * step; S.y += (S.ty - S.y) / d * step;
				wb.spider.rotation.z = Math.atan2(S.ty - S.y, S.tx - S.x) - Math.PI / 2;
				for (const lg of wb.legs) lg.hip.rotation.z = lg.base + Math.sin(rt * 26 + lg.ph) * 0.35;
			} else {
				S.rush = false;
				S.wait -= dt;
				for (const lg of wb.legs) lg.hip.rotation.z = lg.base + Math.sin(rt * 3 + lg.ph) * 0.05;
				if (S.wait <= 0) {
					// (a wander to some knot, or home to the hub)
					const nd = rnd() < 0.35 ? wb.nodes[0] : wb.nodes[Math.floor(rnd() * wb.nodes.length)];
					if (Math.hypot(nd.base.x / WEB.rx, nd.base.y / WEB.ry) < 0.95) { S.tx = nd.base.x; S.ty = nd.base.y; }
					S.wait = rr(1.5, 4);
				}
			}
			wb.spider.position.set(S.x, S.y + pulse * 0.02, 0.05);
			layWeb(wb);
			wb.ringT = Math.max(0, wb.ringT - dt * 2);
			wb.ring.scale.setScalar(1 + (1 - wb.ringT) * 4);
			wb.ring.material.opacity = wb.ringT * 0.9;
		}
		// the pond: the pads ride the ripples
		for (const [ci, pd] of ponds.entries()) if (pd && clearingGroups[ci].visible) {
			for (const pad of pd.pads) {
				let lift = 0;
				for (const r of pd.rip) {
					const age = rt - r.z;
					if (age < 0 || age > 3.5) continue;
					const d = Math.hypot(pad.x - r.x, pad.z - r.y), front = age * 0.85;
					lift += Math.exp(-Math.pow((d - front) / (0.22 + age * 0.12), 2)) * Math.exp(-age * 1.1) * r.w;
				}
				pad.bounce = lerp(pad.bounce, Math.min(1, lift), 1 - Math.exp(-dt * 12));
				pad.pad.position.y = 0.03 + Math.sin(rt * 1.3 + pad.ph) * 0.006 + pad.bounce * 0.05;
				pad.bud.position.y = 0.09 + pad.bounce * 0.07;
				pad.budMat.color.copy(pad.base).multiplyScalar(1 + pad.bounce * 2.2);
			}
		}
		// the acorns bounce, a hop a beat, each following its player left and right; planks flash when hit
		for (const [ci, xy] of xylos.entries()) if (xy && clearingGroups[ci].visible) {
			const b = beatAt(clock()), f = b - Math.floor(b);
			xy.conkers.forEach((cn, i) => {
				const q = pl[i], show = ci === here && !glide && q && q.seen;
				cn.m.visible = !!show;
				if (!show) return;
				cn.x = lerp(cn.x, xy.cx + q.x * AV_K, 1 - Math.exp(-dt * 10));
				const y = XY.top + (plankAt(xy, cn.x) ? 0 : -0.06) + XY.hop * 4 * f * (1 - f);
				const sq = Math.max(0, 1 - Math.min(f, 1 - f) / 0.07);   // (squashed for a moment as it lands)
				cn.m.position.set(cn.x, y, xy.z);
				cn.m.scale.set(1 + sq * 0.25, 1 - sq * 0.3, 1 + sq * 0.25);
				cn.m.rotation.z = (f - 0.5) * 0.5;
			});
			for (const lg of xy.logs) {
				lg.hit = Math.max(0, lg.hit - dt * 3);
				lg.mat.emissive.set(lg.col || '#ffffff').multiplyScalar(lg.hit * 1.2);
				lg.log.position.y = lg.pos.y - lg.hit * 0.02;
			}
		}
		// the moonbeam brightens with someone in it; its orb rides the pitch
		for (const th of theremins) if (clearingGroups[th.ci].visible) {
			th.glow = lerp(th.glow, th.who >= 0 ? 1 : 0, 1 - Math.exp(-dt * 6));
			th.beamMat.opacity = 0.3 + th.glow * 0.45 + Math.sin(rt * 2) * 0.04;
			th.orb.position.y = 0.4 + th.k * 1.6;
			th.orb.scale.setScalar(0.09 * (1 + th.glow * 0.8));
			if (th.who >= 0 && Math.random() < 0.3) spray(th.orb.position, '#d8e8ff', 1, 0.4, 0.3);
		}
		// the chimes swing and ring down
		for (const [ci, cs] of chimeSets.entries()) if (cs && clearingGroups[ci].visible) for (const ch of cs.list) {
			ch.v += (-ch.swing * 14 - ch.v * 1.6) * dt; ch.swing += ch.v * dt;
			ch.piv.rotation.z = ch.swing * 0.35 + Math.sin(rt * 0.9 + ch.deg) * 0.015;
			ch.glow = Math.max(0, ch.glow - dt * 1.5);
			ch.mat.emissiveIntensity = 0.25 + ch.glow * 2.2 + pulse * 0.1;
		}
		// the bridge faces hum, mouths open on each bar
		for (const [ci, cho] of choirs.entries()) if (cho && clearingGroups[ci].visible) {
			cho.hum = Math.max(0.25, cho.hum - dt * 0.5);
			for (const fc2 of cho.faces) {
				const f2 = fc2.face;
				f2.mouth.open.scale.y = (0.02 + cho.hum * 0.12) * f2.s;
				f2.mouth.smile.visible = false;
				f2.mouth.tongue.visible = cho.hum > 0.4;
				fc2.grp.scale.setScalar(1 + pulse * 0.04);
			}
		}
		// the crystal pianos: the panel under you sinks, its crystal blazes
		pianos.forEach((pn, ci) => {
			if (!pn || !clearingGroups[ci].visible) return;
			pn.keys.forEach((ky, i) => {
				pn.flash[i] = Math.max(0, pn.flash[i] - dt * 2);
				const on = pn.held[i] >= 0;
				pn.press[i] = lerp(pn.press[i], on ? 1 : 0, 1 - Math.exp(-dt * 16));
				ky.panel.position.y = ky.y0 - pn.press[i] * 0.04;
				if (on) ky.pmat.emissive.set(colour(pn.held[i])).multiplyScalar(0.3); else ky.pmat.emissive.setRGB(0, 0, 0);
				ky.cmat.emissiveIntensity = 0.25 + pn.press[i] * 1.6 + pn.flash[i] * 2.5 + pulse * 0.1;
				ky.cl.scale.setScalar(1 + pn.flash[i] * 0.06);
			});
		});
		// the players' puffballs
		for (let i = 0; i < count; i++) {
			const q = pl[i], m = q.mesh;
			m.visible = q.seen && phase !== 'off';
			if (!m.visible) continue;
			// (on the path between clearings, everyone's range squeezes into a tight patch on the path just ahead)
			const sq = glide ? Math.sin(Math.min(1, glide.t / 0.12, (1 - glide.t) / 0.12) * Math.PI / 2) : 0;
			const ax = lerp(avCap(q.x), q.x * 0.28, sq), az = lerp(avCap(q.z), -1.5 + q.z * 0.2, sq);
			_p0.set(ax, 0, az - 1.6 * (walls.pull || 0)).applyAxisAngle(_yAx, walls.rig.rotation.y);
			m.position.set(walls.rig.position.x + _p0.x, 0.3 + pulse * 0.08 + (q.jumpT > 0.3 ? 0.25 : 0), walls.rig.position.z + _p0.z);
			if (walls.pull) m.position.y -= 0;
			m.lookAt(walls.rig.position.x, 0.3, walls.rig.position.z - 4);
			m.scale.setScalar(1 + pulse * 0.1);
			if (q.speed > RUN && Math.random() < 0.4) spray(m.position, colour(i), 2, 0.6, 1);
		}

		// bursts fall and fade
		for (let i = 0; i < BURST_N; i++) {
			if (burst.life[i] <= 0) continue;
			burst.life[i] -= dt;
			const v = burst.vel[i];
			v.y -= dt * 2.2;
			v.multiplyScalar(1 - dt * 0.8);
			burst.pos[i * 3] += v.x * dt; burst.pos[i * 3 + 1] += v.y * dt; burst.pos[i * 3 + 2] += v.z * dt;
			if (burst.life[i] <= 0) burst.pos[i * 3 + 1] = -99;
		}
		burstGeo.attributes.position.needsUpdate = true;
		burstGeo.attributes.color.needsUpdate = true;
	}

	// each kind's own business: its tricks, and what it does when it sings
	function stepKind(c, dt, beat, p) {
		const T = c.trickT, P = c.parts;
		const arc = Math.sin(Math.min(1, 1 - T) * Math.PI);
		if (c.kind === 'mushroom') {
			P.cap.position.y = 1.6 + (T > 0 ? arc * 1.1 : 0) + c.singT * 0.05;
			P.cap.rotation.y = T > 0 ? (1 - T) * Math.PI * 6 : Math.sin(beat * Math.PI) * 0.1;
			P.cap.rotation.z = Math.sin(beat * Math.PI + c.phase) * 0.08;
			if (T > 0.85 && Math.random() < 0.5) spray(c.headAt(), '#' + c.tint.getHexString(), 3, 1.5);
		}
		if (c.kind === 'frog') {
			const s = 1 + c.singT * 1.4;
			P.sac.scale.set(0.12 * s, 0.1 * s, 0.1 * s);
			P.tongue.scale.set(0.03, T > 0 ? arc * 1.6 + 0.001 : 0.001, 0.03);
			P.tongue.position.z = 0.32 + (T > 0 ? arc * 0.8 : 0);
		}
		if (c.kind === 'hedgehog') {
			c.bouncer.rotation.x = T > 0 ? (1 - T) * Math.PI * 4 : 0;
			P.drum.scale.y = 1 - c.singT * 0.15;
		}
		if (c.kind === 'snail') {
			P.shell.rotation.x = T > 0 ? (1 - T) * Math.PI * 8 : Math.sin(beat * Math.PI) * 0.1;   // (it rolls about its own axis)
			P.shellMat.emissiveIntensity = 0.1 + c.singT * 0.5 + T * 1.5;
		}
		if (c.kind === 'owl') {
			P.head.rotation.y = T > 0 ? (1 - T) * Math.PI * 4 : Math.sin(beat * Math.PI * 0.5 + c.phase) * 0.4;
			P.head.scale.setScalar(1 + c.singT * 0.12);
		}
		if (c.kind === 'gnome') {
			P.hat.position.y = 0.12 + (T > 0 ? arc * 1.6 : 0);
			P.hat.rotation.y = T > 0 ? (1 - T) * Math.PI * 8 : 0;
		}
		if (c.kind === 'fairy') {
			P.float.position.y = 0.9 + Math.sin(rt * 2 + c.phase) * 0.12 + (T > 0 ? arc * 0.8 : 0);
			P.wings.forEach((w, k) => { w.rotation.y = (k ? -1 : 1) * (0.3 + Math.sin(rt * 22 + c.phase) * 0.45); });
			P.glow.material.opacity = 0.35 + c.singT * 0.5 + T * 0.5;
			if (T > 0.3 && Math.random() < 0.6) spray(c.headAt(), '#fff4c8', 2, 1.2);
		}
		if (c.kind === 'flower') {
			const open = 1 + c.singT * 0.25 + (T > 0 ? arc * 0.7 : 0);
			P.petals.forEach((pp, k) => { pp.scale.setScalar(open); pp.rotation.x = Math.sin(rt * 3 + k) * 0.08; });
			P.bloom.rotation.z = T > 0 ? (1 - T) * Math.PI * 2 : Math.sin(beat * Math.PI * 0.5) * 0.15;
		}
		if (c.kind === 'bunny') {
			P.head.rotation.z = Math.sin(beat * Math.PI + c.phase) * 0.15;
		}
		if (c.kind === 'troll') {
			const b = 1 + c.singT * 0.12 + (T > 0 ? Math.abs(Math.sin((1 - T) * Math.PI * 8)) * 0.15 : 0);
			P.belly.scale.set(0.5 * b, 0.55 * b, 0.38 * b);
			P.head.rotation.z = Math.sin(beat * Math.PI * 0.5) * 0.12;
		}
	}

	// the noodles: rebuilt every frame from shoulder to glove, swinging to the beat
	const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Vector3(), _m2 = new THREE.Vector3();
	function noodles(c, beat, p) {
		const T = c.trickT, S = c.singT;
		for (const L of c.limbs) {
			_a.copy(L.from);
			_b.copy(L.rest);
			const sw = Math.sin(beat * Math.PI + c.phase + L.side);
			if (L.ear) {
				_b.y += S * 0.15 + (c.kind === 'bunny' && T > 0 ? Math.sin(Math.min(1, 1 - T) * Math.PI) * 0.9 : 0);
				_b.x += sw * 0.05;
			} else if (L.leg) {
				_b.z += Math.max(0, sw) * 0.1;
				_b.y += Math.max(0, -sw) * 0.04;
			} else if (L.end === 'eye') {
				_b.x += Math.sin(rt * 2 + L.side) * 0.05;
				_b.y += S * 0.12;
			} else {
				// arms: dance, wave when singing, flail when tricking
				_b.y += sw * 0.1 + S * 0.35 + (T > 0 ? Math.sin(rt * 18 + L.side) * 0.3 : 0);
				_b.x += L.side * (S * 0.12 + T * 0.15);
				_b.z += Math.cos(beat * Math.PI + L.side) * 0.06;
			}
			_m.lerpVectors(_a, _b, 0.35);
			_m2.lerpVectors(_a, _b, 0.7);
			const bend = (L.leg ? 0.08 : 0.12) * (1 + p * 0.5);
			_m.x += L.side * bend * 0.6; _m.y += bend * 0.5;
			_m2.x += L.side * bend * 0.3; _m2.y += bend * (L.leg ? 0.2 : -0.1) + Math.sin(rt * 3 + L.side) * 0.03;
			const curve = new THREE.CatmullRomCurve3([_a.clone(), _m.clone(), _m2.clone(), _b.clone()]);
			const old = L.m.geometry;
			L.m.geometry = new THREE.TubeGeometry(curve, 9, L.r, 5, false);
			old.dispose();
			if (!L.m.material || L.m.material === MAT.dark) L.m.material = c.limbMat || MAT.dark;
			if (L.tip) {
				L.tip.position.copy(_b);
				if (L.end === 'glove') L.tip.rotation.z = sw * 0.4;
				if (L.end === 'eye') L.tip.lookAt(walls.rig.position);   // (stalk eyes watch the walls)
			}
		}
	}

	/* ---------- drawing (every animation frame) ---------- */

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		update3D(show.paused ? 0 : dt);
		if (perfFlags.nopost) for (const v of walls.views(renderer.domElement.width, renderer.domElement.height)) { renderer.setViewport(v.x, v.y, v.width, v.height); renderer.setScissor(v.x, v.y, v.width, v.height); renderer.setScissorTest(true); renderer.render(scene, v.camera); }
		else post.render(walls.views(renderer.domElement.width, renderer.domElement.height));
		show.frame(ctx, dt, drawWorld);
	};

	const label = (ctx, str, x, y, size, fill, alpha = 1) => art.text(ctx, str, x, y, { size, weight: 800, font: FONT, fill, outline: INK, outlineWidth: Math.max(4, size * 0.16), alpha });
	function drawWorld(ctx) {
		const playing = phase === 'tutorial' || phase === 'play';
		for (let w = 0; w < 3; w++) {
			ctx.save();
			ctx.beginPath(); ctx.rect(w * W, 0, W, H); ctx.clip();
			for (const f of floaters) {
				const s = proj(w, f.at);
				if (!s.inside) continue;
				label(ctx, f.text, s.x, s.y - 30 - f.t * 70, 40, f.fill, clamp(2 - f.t * 1.6, 0, 1));
			}
			if (playing && !glide) {
				for (const c of creatures) {
					if (c.clearing !== here || c.wall !== w) continue;
					const s = proj(w, c.headAt());
					// music notes over a singer, and who's playing it
					if (c.singer >= 0) {
						const bob = Math.sin(rt * 6 + c.phase) * 6;
						label(ctx, '♪', s.x + 34, s.y - 20 - c.singT * 18 + bob, 46, colour(c.singer));
					}
					// a hint at the base of anything a player could touch right now
					if (c.singer >= 0 && c.trickT <= 0) {   // (only while someone's on its hotspot)
						const b = proj(w, c.touchAt());
						if (b.y > H * TOUCH_TOP) label(ctx, 'TOUCH!', b.x, b.y + 50 + Math.sin(rt * 5) * 5, 24, '#fff6a0', 0.9);
					}
				}
			}
			ctx.restore();
		}
		if (playing && !glide) {
			for (const lb of labels) {
				if (lb.ci !== here) continue;
				const sp = proj(lb.wall, lb.at);
				if (sp.inside) label(ctx, lb.text, sp.x, Math.min(H - 70, sp.y + 30) + Math.sin(rt * 3) * 4, 22, '#fff6a0', 0.85);
			}
			const cho = choirs[here];
			if (cho) { const sp = proj(1, _v.set(walls.rig.position.x, 4.3, walls.rig.position.z - 7.3)); label(ctx, '♪ ' + CHOIR[cho.idx].name + ' ♪', sp.x, sp.y, 40, '#fff6a0'); }
		}
		for (const r of ripples) art.circle(ctx, r.x, r.y, 20 + r.t * 150, { stroke: 'white', lineWidth: 6, alpha: 1 - r.t / 0.5 });
		if (glide) show.onWalls(ctx, (c) => label(c, 'DOWN THE PATH TO ' + CLEARINGS[glide.to].name + '...', W / 2, 120, 40, '#fff6a0', Math.min(1, glide.t * 4)));
	}

	function drawBanner(ctx) {
		if (!banner || banner.t > 3.6) return;
		const a = clamp((3.6 - banner.t) / 0.5, 0, 1);
		show.onWalls(ctx, function (c) {
			show.slam(c, banner.title, W / 2, 260, 96, banner.t, { font: 'Shrikhand', exact: true, fill: '#a8ff3e', alpha: a });
			if (banner.sub) show.slam(c, banner.sub, W / 2, 360, 46, banner.t - 0.4, { fill: 'white', alpha: a });
		});
	}

	// a puffball, flat, for the show's screens
	function drawPuff2D(ctx, n, x, y, size) {
		const r = size * 0.38, cy = y - r * 1.05;
		art.circle(ctx, x, y - 2, r * 0.9, { fill: 'rgba(0,0,0,0.25)' });
		for (let k = 0; k < 18; k++) {
			const a = k / 18 * Math.PI * 2;
			art.circle(ctx, x + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92, r * 0.22, { fill: colour(n) });
		}
		art.circle(ctx, x, cy, r, { fill: colour(n), stroke: INK, lineWidth: Math.max(3, size * 0.03) });
		for (const s of [-1, 1]) {
			ctx.save();
			const ex = x + s * r * 0.3, ey = cy - r * 0.1;
			ctx.fillStyle = INK;
			ctx.beginPath(); ctx.moveTo(ex, ey); ctx.ellipse(ex, ey, r * 0.13, r * 0.2, 0, -0.35, Math.PI * 2 - 1.05); ctx.closePath(); ctx.fill();
			ctx.fillStyle = 'white';
			ctx.beginPath(); ctx.arc(ex - r * 0.05, ey - r * 0.09, r * 0.035, 0, Math.PI * 2); ctx.fill();
			ctx.restore();
		}
		ctx.save();
		ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, size * 0.035); ctx.lineCap = 'round';
		ctx.beginPath(); ctx.arc(x, cy + r * 0.2, r * 0.38, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
		ctx.restore();
	}

	/* ---------- input ---------- */

	self.setPlayers = function (players) {
		latest = players;
	};

	/* ---------- debug: straight to a clearing ---------- */

	if (show.menu && show.menu.drow) {
		const $row = show.menu.drow('CLEARINGS');
		CLEARINGS.forEach(function (c, k) {
			show.menu.dbutton(String(k + 1), function () {
				if (!count) return;
				if (show.beat !== 'play') show.go('play');
				walkTo(k);
			}, '#a8ff3e').appendTo($row);
		});
	}

	self.state = () => Object.assign(show.state(), {
		scores: scores.slice(), phase, clearing: CLEARINGS[here].name, glide: !!glide, bpm,
		singing: creatures.filter((c) => c.singer >= 0).map((c) => c.kind), audio: audioOn(),
	});

	self.test = {
		// (for finding what's slow: hide a kind of thing, or switch a feature off)
		pluck(x, y) { return pluckAt({ x, y }, 2, 0); },
		perf() { return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, programs: renderer.info.programs.length, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }; },
		hide(tag, off = true) { scene.traverse((o) => { if (o.userData.tag === tag) o.visible = !off; }); },
		post(opts, noGrade) {
			post.dispose();
			post = createWallComposer(renderer, scene, Object.assign({ strength: 0.45, radius: 0.5, threshold: 1.0, cap: 2.4 }, opts));
			if (!noGrade) post.composer.insertPass(grade, post.composer.passes.length - 1);
			post.setSize();
		},
		res(k) { renderer.setSize(Math.round(WIDTH * k), Math.round(H * k), false); post.setSize(); },
		lights(off) { glows.forEach((l) => { l.visible = !off; }); },
		flag(name, on = true) { perfFlags[name] = on; if (name === 'noshadow') { sun.castShadow = !on; renderer.shadowMap.enabled = !on; } },
		skipTo(id) { show.go(id); },
		jump(id) { show.go(id); },
		clearing(k) { goTo(k, true); },
		walk(k) { walkTo(k); },
		bendAll(k) { for (const c of creatures) c.bend = k; },
		tap(x, y) { tap({ x, y }); },
		grid() { const gw = grids[here]; return gw && { on: gw.on.slice(), at: gw.pos.map((v) => { const q = proj(1, v); return [Math.round(q.x), Math.round(q.y)]; }) }; },
		webHits() { const wb = webs[here]; return wb && [rt - wb.lastT < 0.5 ? 100 : 0]; },
		spider() { const wb = webs[here]; return wb && [wb.sp.x, wb.sp.y]; },
		webAt(u, v) { const wb = webs[here]; const q = proj(wb.wall, wb.unit.localToWorld(new THREE.Vector3(u * WEB.rx, v * WEB.ry, 0))); return [Math.round(q.x), Math.round(q.y)]; },
		trick(k) { const list = creatures.filter((c) => c.clearing === here); if (list[k]) pending.push({ kind: 'trick', c: list[k] }); },
	};

	self.fini = function () {
		clearInterval(sequencer);
		for (const list of puffs) if (list) for (const pb of list) if (pb.voice) pb.voice.stop();
		for (const th of theremins) if (th && th.voice) th.voice.stop();
		stage.$el.off('.boogie-woods');
		stage.$el[0].removeEventListener('pointerdown', resume, true);
		unlisten();
		show.fini();
		post.dispose();
		envTex.dispose();
		renderer.dispose();
		renderer.forceContextLoss();
		if (ac && ac.state !== 'closed') ac.close().catch(() => {});
	};

	/* ---------- build it all ---------- */

	CLEARINGS.forEach((c, k) => buildClearing(k));
	goTo(0, true);

	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
