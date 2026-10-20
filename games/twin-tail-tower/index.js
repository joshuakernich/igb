/*
 * Twin Tail Tower
 *
 * Doodle Jump, in 3D, round the whole room. Everyone is a glossy little
 * two-tailed fox kit in their own colour, and every fox bounces by itself,
 * every time it lands on a platform: players only steer. The platforms float
 * in a ring round the room, so the three walls together show a wide arc of
 * the tower (the front wall straight ahead, the side walls round either
 * side), and the climb goes up from a tropical island, through the clouds,
 * into a blazing sunset, out into the stars and on into space.
 *
 *   - Step left and right in the room and your fox goes round the ring to
 *     match: standing by the left wall puts it on the left wall, and so on.
 *   - The platforms: plain ones (in the look of each height: grass, cloud,
 *     candy, dusk, metal), blue ones that slide side to side, and crumbly
 *     brown ones that break after one bounce.
 *   - A spring on a platform throws you sky high; a tail rotor (two little
 *     tails crossed on a gold hub) swings your own tails up over your head
 *     and spins them like helicopter blades, flying you straight up.
 *   - Robots hover between the platforms: land on one from above to bop it
 *     (+3 rings and a bounce); bump into one any other way and you drop your
 *     rings and tumble.
 *   - The higher you go, the further apart and fewer the platforms.
 *   - The view climbs with the highest fox and never comes back down. Drop
 *     below the bottom of the view (falling, lagging behind, or knocked off
 *     by a robot) and you drop some rings, then a bubble floats you back up
 *     into the view and pops you back into the climb. Nobody's ever out.
 *
 * The score: each player's rings. The height the tower reached (metres) is
 * the team's: it's added to the team total as a bonus in the show's team beat.
 *
 * The show is Showtime's standard running order: the squad picker, the
 * title drop, the clock intro, the visor check (the foxes hopping on the
 * beach), the tutorial (steer, bounce up, grab rings), the hazards' entrance
 * (WATCH OUT!: crumbly platforms, robots, springs and rotors), the climb
 * itself until the clock runs out, TIME!, scores, rank, team, leaderboard,
 * replay, rating and the end (IGB.complete there).
 *
 * Drawn with Glint, the gamebox's own engine (lib/glint: physically based,
 * HDR, bloom, filmic tone mapping). Three cameras on one rig at the middle
 * of the room, one per wall (G.createWallRig), all level (one shared pitch:
 * none) with the same fixed 90-degree field of view across (64 down), so the
 * walls meet seamlessly.
 *
 * Input: px (left to right across the room: round the ring, left wall to
 * right wall). pz isn't used for steering (only for the replay).
 * An ES module (manifest: module: true).
 */
import * as G from '../../lib/glint/glint.js';
import { createSky } from './sky.js';
import { buildFox, buildPlatform, buildSpring, buildRotor, buildRobot, buildRing, buildBubble, buildIsland, buildMarker, sparkleTexture } from './models.js';
import { createSound } from './sound.js';

IGB.register('twin-tail-tower', function TwinTailTowerGame(stage, playersMeta) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;
	const TAU = Math.PI * 2;
	const DEG = Math.PI / 180;

	/* ---------- tuning ---------- */

	const GAME_SECONDS = 600;                       // the show's clock (the intros and tutorial come out of it too)
	const RADIUS = 12;                              // metres from the middle of the room out to the ring of platforms
	const ARC = 125;                                // degrees round from straight ahead that px reaches, either side (the side walls' middles are at 90)
	const SPREAD = 128;                             // degrees either side that platforms are laid
	const FOX = { scale: 1.3, middle: 0.85 };       // the fox's size (about 1.7 m tall), and the height of its middle (what touches things)
	const GRAVITY = 26;                             // metres a second, a second
	const HOP = { jump: 4.6, spring: 15, stomp: 5.6, beach: 1.1, pop: 4.6 };   // bounce heights (metres): a platform, a spring, a robot bopped, the little hops on the beach before the climb, and out of a bubble
	const ROTOR = { seconds: 2.6, speed: 18 };      // a tail rotor: how long it flies you, and how fast (metres a second)
	const STEER = { glide: 10, max: 34 };           // how quickly a fox follows its player round (per second), and its top speed (metres a second)
	const CAM = { start: 4.5, lead: 0.2, rise: 7 }; // the eye's height at the start; how far above the highest fox it sits; how quickly it catches up (per second)
	const FOV = 64;                                 // vertical, degrees: 90 across each 16:10 wall, so the walls meet
	const HARD_AT = 900;                            // metres up at which the climb is as hard as it gets
	const GAP = { first: 2.2, min: 1.7, max: 3.9, wobble: 0.3 };   // metres between rows of platforms: the first, at the bottom, at the hardest, and a little randomness
	const COUNT = { start: 6, end: 2, perPlayer: 0.35 };           // platforms a row, at the bottom and at the hardest, and more for each player
	const PLAT = { start: 3.2, end: 2.3 };          // a platform's width (metres), at the bottom and at the hardest
	const MIX = {                                   // what turns up, and from how high (metres)
		moving: { from: 20, most: 0.3 },            //   sliding platforms: from this high, up to this share of them at the hardest
		crumble: { from: 35, most: 0.24 },          //   crumbly ones (never every platform in a row)
		spring: { from: 8, chance: 0.07 },          //   a spring on a platform
		rotor: { from: 30, chance: 0.025 },         //   a tail rotor over a platform
		ringsOver: 0.3,                             //   a column of rings over a platform
		ringLine: 0.14,                             //   a row of rings between the rows of platforms
		robot: { from: 50, start: 0.04, most: 0.14 },   // robots (once the hazards' entrance is over), a chance a row
	};
	const STOMP_RINGS = 3;                          // rings for bopping a robot
	const FALL = { lose: 0.3, rise: 1.5, hold: 0.35, safe: 1.6 };   // a fall: the share of your rings dropped; seconds the bubble takes to float up, holds, and seconds safe after
	const REACH = { ring: 0.95, robot: 1.15, rotor: 1.1, spring: 0.75, foot: 0.3 };   // metres that count as touching (a fox's feet: past a platform's end)
	const ZONES = { clouds: 150, sunset: 400, night: 700, space: 1000 };   // heights (metres) where the sky changes
	const ZONE_NAMES = { clouds: 'INTO THE CLOUDS', sunset: 'SUNSET HEIGHTS', night: 'STARLIGHT', space: 'OUTER SPACE!' };
	const MARK_EVERY = 100;                         // metres between the height markers round the tower
	const AHEAD = 30;                               // metres of tower built above the eye
	const BEHIND = 26;                              // and kept below it
	const WARN = { title: 0.4, a: 1.3, b: 2.3, c: 3.3, length: 6.6 };   // the hazards' entrance: WATCH OUT!, then its three lines, and the end
	const FONT = 'Paytone One';                     // the game's own words (pops, the height)

	const vFor = (h) => Math.sqrt(2 * GRAVITY * h);
	const V_JUMP = vFor(HOP.jump);

	/* ---------- renderer, scene, cameras ---------- */

	// Glint: physically based, HDR, bloom, ACES filmic tone mapping, soft shadows.
	const renderer = new G.Renderer();
	renderer.toneMappingExposure = 1.05;
	Object.assign(renderer.bloom, { strength: 0.45, radius: 0.65, threshold: 1.2 });
	Object.assign(renderer.grade, { saturation: 1.08, contrast: 1.04, vignette: 0.12 });
	renderer.shadowsEnabled = true;
	$(renderer.domElement).css({ position: 'absolute', left: 0, top: 0, width: WIDTH + 'px', height: H + 'px' }).appendTo(stage.$bg);

	function resize() {
		const k = Math.min(IGB.scale * IGB.pixelRatio, 1);
		renderer.setPixelRatio(1);
		renderer.setSize(Math.round(WIDTH * k), Math.round(H * k), false);
	}
	const unlisten = IGB.onResize(resize);
	resize();

	const scene = new G.Scene();
	scene.fog = new G.Fog(0xa9d6f6, 120, 1400);
	const world = createSky(renderer, scene, ZONES);

	const hemi = new G.HemisphereLight(0xcfe9ff, 0x2a7a8a, 0.8);
	scene.add(hemi);
	const sun = new G.DirectionalLight(0xfff0d8, 3.2);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 140 });
	sun.shadow.camera.updateProjectionMatrix();
	sun.shadow.bias = -0.0004;
	sun.shadow.normalBias = 0.03;
	sun.shadow.radius = 2;
	scene.add(sun, sun.target);

	// One eye in the middle of the room, climbing the tower: the front camera
	// straight ahead, the side cameras square to it. All three on one rig,
	// level, with the same fixed field of view (90 degrees across), so they're
	// the sides of one box and the walls meet seamlessly. Never tilt or zoom
	// one alone.
	const walls = G.createWallRig({ fov: FOV, aspect: W / H, near: 0.1, far: 6000 });   // left, front, right
	const rig = walls.rig;
	scene.add(rig);
	const cams = walls.cameras;

	// How far up and down a wall shows, from eye level, at an angle round the
	// ring (0 straight ahead): the most at a wall's middle, less toward its
	// corners (where the ring comes closer to that wall's camera).
	const TAN = Math.tan(FOV / 2 * DEG);
	function halfView(theta) {
		const q = Math.PI / 2;
		return RADIUS * Math.cos(theta - Math.round(theta / q) * q) * TAN;
	}

	// Things on the ring: s is metres round it (0 straight ahead, + to the
	// right), turned to face the middle of the room.
	function put(obj, s, y, r = RADIUS) {
		const th = s / RADIUS;
		obj.position.set(Math.sin(th) * r, y, -Math.cos(th) * r);
		obj.rotation.y = -th;
	}
	const sFor = (px) => (px * 2 - 1) * ARC * DEG * RADIUS;
	const S_MAX = SPREAD * DEG * RADIUS;
	const pan = (s) => Math.sin(s / RADIUS) * 0.85;

	const island = buildIsland(RADIUS);
	scene.add(island);

	/* ---------- the tower: platforms, rings, robots, markers ---------- */

	const rand = (a, b) => a + Math.random() * (b - a);
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const lerp = (a, b, t) => a + (b - a) * t;
	const v3 = () => new G.Vector3();
	const hard = (y) => clamp(y / HARD_AT, 0, 1);

	let platforms = [];   // { s, s0, y, w, type, look, mesh, alive, move: { amp, speed, ph }, item, fall }
	let rings = [];       // { s, y, mesh, taken, spin }
	let robots = [];      // { s, s0, y, y0, amp, speed, ph, mesh, alive, dead }
	let markers = [];     // { y, mesh }
	let rowY = GAP.first;
	let nextMark = MARK_EVERY;
	let robotsOn = false;

	function zoneAt(y) {
		return y >= ZONES.space ? 'space' : y >= ZONES.night ? 'night' : y >= ZONES.sunset ? 'sunset' : y >= ZONES.clouds ? 'clouds' : 'island';
	}
	const LOOK = { island: 'grass', clouds: 'cloud', sunset: 'candy', night: 'dusk', space: 'metal' };

	function addRing(s, y) {
		const mesh = buildRing();
		put(mesh, s, y);
		scene.add(mesh);
		rings.push({ s, y, mesh, taken: false, spin: Math.random() * TAU });
	}

	function addPlatform(s, y, w, type) {
		const look = type === 'normal' ? LOOK[zoneAt(y)] : type;
		const mesh = buildPlatform(look, w);
		put(mesh, s, y);
		scene.add(mesh);
		const p = { s, s0: s, y, w, type, look, mesh, alive: true, item: null, fall: null };
		if (type === 'moving') p.move = { amp: rand(1.6, 3.6) + hard(y) * 2, speed: rand(0.8, 1.4) + hard(y) * 0.6, ph: Math.random() * TAU };
		platforms.push(p);
		return p;
	}

	function addItem(p, type) {
		const mesh = type === 'spring' ? buildSpring() : buildRotor();
		const off = type === 'spring' ? rand(-p.w / 2 + 0.5, p.w / 2 - 0.5) : 0;
		p.item = { type, off, mesh, taken: false, boing: 0 };
		scene.add(mesh);
	}

	// One row of platforms at height y, and whatever comes with it.
	function layRow(y, gap) {
		const d = hard(y);
		const players = Math.max(1, foxes.length || 3);
		const n = Math.max(1, Math.round(lerp(COUNT.start, COUNT.end, d) + players * COUNT.perPlayer + rand(-0.5, 0.5)));
		const w = lerp(PLAT.start, PLAT.end, d);
		const taken = [];
		const free = (s, room) => Math.abs(s) <= S_MAX && taken.every((t) => Math.abs(s - t) > room);
		const share = (m) => (y < m.from ? 0 : m.most * clamp((y - m.from) / (HARD_AT - m.from), 0.15, 1));
		for (let i = 0; i < n; i++) {
			let s = null;
			for (let tries = 0; tries < 14 && s === null; tries++) {
				const c = rand(-S_MAX + w / 2, S_MAX - w / 2);
				if (free(c, w + 1.4)) s = c;
			}
			if (s === null) continue;
			taken.push(s);
			const r = Math.random();
			let type = 'normal';
			if (r < share(MIX.moving)) type = 'moving';
			else if (i > 0 && r < share(MIX.moving) + share(MIX.crumble)) type = 'crumble';   // (the row's first is always solid)
			const p = addPlatform(s, y + rand(-0.25, 0.25) * gap, w, type);
			if (type === 'crumble') continue;
			const q = Math.random();
			if (y > MIX.spring.from && q < MIX.spring.chance) addItem(p, 'spring');
			else if (y > MIX.rotor.from && q < MIX.spring.chance + MIX.rotor.chance) addItem(p, 'rotor');
			else if (type === 'normal' && Math.random() < MIX.ringsOver) for (let j = 0; j < 3; j++) addRing(s, p.y + 1.3 + j * 1.0);
		}
		// a row of rings between this row and the next
		if (Math.random() < MIX.ringLine) {
			const s = rand(-S_MAX + 3, S_MAX - 3);
			for (let j = -2; j <= 2; j++) addRing(s + j * 1.1, y + gap * 0.55 + Math.cos(j * 0.6) * 0.5);
		}
		// a robot
		if (robotsOn && y > MIX.robot.from && Math.random() < lerp(MIX.robot.start, MIX.robot.most, d)) {
			let s = rand(-S_MAX + 2, S_MAX - 2);
			for (let tries = 0; tries < 8 && !free(s, 2.4); tries++) s = rand(-S_MAX + 2, S_MAX - 2);
			const mesh = buildRobot();
			const ry = y + gap * 0.5 + 0.4;
			put(mesh, s, ry);
			scene.add(mesh);
			robots.push({ s, s0: s, y: ry, y0: ry, amp: rand(0.8, 2.2), speed: rand(0.6, 1.2), ph: Math.random() * TAU, mesh, alive: true, dead: null });
		}
	}

	function addMarker(m) {
		const mesh = buildMarker(m, RADIUS + 2.5, FONT);
		mesh.position.y = m;
		scene.add(mesh);
		markers.push({ y: m, mesh });
	}

	// Keep the tower built from just below the eye to well above it.
	function keepBuilt() {
		while (rowY < camY + AHEAD) {
			const d = hard(rowY);
			const gap = Math.min(HOP.jump - 0.6, lerp(GAP.min, GAP.max, Math.pow(d, 0.8)) + rand(-GAP.wobble, GAP.wobble));
			layRow(rowY, gap);
			rowY += gap;
		}
		while (nextMark < camY + AHEAD) { addMarker(nextMark); nextMark += MARK_EVERY; }
		const floor = camY - BEHIND;
		const keep = (o) => o.y > floor || (drop(o), false);
		platforms = platforms.filter(keep);
		rings = rings.filter(keep);
		robots = robots.filter(keep);
		markers = markers.filter(keep);
	}
	function drop(o) {
		scene.remove(o.mesh);
		if (o.item) scene.remove(o.item.mesh);
		if (o.mesh.userData.tex) o.mesh.userData.tex.dispose();   // (a marker's lettering)
	}

	// Clear the tower, and start it again from height y (the bottom, normally).
	function rebuild(y = 0) {
		for (const list of [platforms, rings, robots, markers]) for (const o of list) drop(o);
		platforms = [];
		rings = [];
		robots = [];
		markers = [];
		rowY = Math.max(GAP.first, y - 10);
		nextMark = Math.max(1, Math.ceil(rowY / MARK_EVERY)) * MARK_EVERY;
		keepBuilt();
	}

	/* ---------- foxes ---------- */

	let foxes = [];

	function Fox(n) {
		const colour = PLAYER_COLORS[n];
		const model = buildFox(colour);
		model.root.scale.setScalar(FOX.scale);
		scene.add(model.root);
		const bubble = buildBubble();
		bubble.visible = false;
		scene.add(bubble);
		return {
			n, colour, model, bubble,
			px: 0.5, pz: 0.5, seen: false,
			s: 0, vs: 0, y: 0, yWas: 0, vy: 0,
			state: 'air',            // air (bouncing), rotor (flying), hurt (knocked off), bubble (floating back up)
			t: 0,                    // seconds in this state
			rings: 0, best: 0, safe: 0, squash: 0, turn: 0,
			pitch: 0.9 + n * 0.07,   // (each fox's boing a little different)
			reach: { min: 0.5, max: 0.5 },
		};
	}

	function setUp(count) {
		sound.resume();
		for (const f of foxes) scene.remove(f.model.root, f.bubble);
		foxes = [];
		for (let i = 0; i < count; i++) {
			const f = Fox(i);
			f.px = (i + 0.5) / count;
			f.s = sFor(f.px);
			f.y = Math.random() * 0.5;
			foxes.push(f);
		}
		rebuild();
	}

	/* ---------- effects ---------- */

	const sparkTex = sparkleTexture();
	const sparks = [];       // { sprite, age, life, size }
	const flung = [];        // rings thrown out: { mesh, vel, age }
	const pops = [];         // words: { text, colour, at, age, size }
	let shake = 0;
	let flashRed = 0;

	function sparkle(at, colour = 0xffffff, size = 2) {
		const s = new G.Sprite(new G.SpriteMaterial({ map: sparkTex, color: colour, transparent: true, depthWrite: false, blending: G.AdditiveBlending, toneMapped: false }));
		s.position.copy(at);
		s.scale.setScalar(size);
		scene.add(s);
		sparks.push({ sprite: s, age: 0, life: 0.4, size });
	}
	function pop(text, colour, at, size = 70) {
		pops.push({ text, colour, at: at.clone(), age: 0, size });
	}
	const foxMiddle = (f) => { const p = v3(); put({ position: p, rotation: {} }, f.s, f.y + FOX.middle); return p; };

	function fling(f, n) {
		const at = foxMiddle(f);
		const out = v3().copy(at).setY(0).normalize().multiplyScalar(-1);   // (toward the middle of the room)
		for (let i = 0; i < Math.min(n, 12); i++) {
			const mesh = buildRing();
			mesh.position.copy(at);
			const a = i / Math.min(n, 12) * TAU;
			const side = v3().set(-out.z, 0, out.x);
			const vel = v3().addScaledVector(side, Math.cos(a) * 6).addScaledVector(out, 2).setY(7 + Math.sin(a) * 3);
			scene.add(mesh);
			flung.push({ mesh, vel, age: 0 });
		}
	}

	/* ---------- the flow ---------- */

	const sound = createSound();
	const show = new Showtime(stage, {
		id: 'twin-tail-tower',
		seconds: GAME_SECONDS,
		players: () => foxes.length,
		scores: () => foxes.map((f) => f.rings),
		bonus: () => Math.round(topHeight),
		bonusLabel: 'METRES CLIMBED',
		music: false,
		theme: { accent: '#ff8a1c', accent2: '#ffd23f', gold: '#ffe14a', ink: '#1a1030', sky: ['#1b3a8a', '#5fb8ff'], glow: 'rgba(255,170,60,0.35)' },
		rivals: ['Sky Hoppers', 'Cloud Bouncers', 'Twin Tails', 'Spring Kings', 'The Rotors', 'Star Climbers',
			'Sunset Squad', 'Bubble Gang', 'Up Up Away', 'Pogo Foxes'],
	});

	let phase = 'beach';     // beach (little hops while the show opens), climb, finish (TIME! and after)
	let clock = 0;
	let camY = CAM.start;
	let topHeight = 0;       // the highest any fox has been
	let zoneNow = 'island';
	let zoneShow = null;     // { text, age }: a new height's name, over the walls
	let playT = 0;

	function initGame(count) {
		setUp(count);
		show.go('title');
	}

	function climb() {
		if (phase === 'climb') return;
		phase = 'climb';
		sound.music(true);
	}

	function finish() {
		if (phase === 'finish') return;
		phase = 'finish';
		sound.finish();
		sound.music(false);
		sound.rotor(0);
	}

	/* ---------- the tutorial ---------- */

	const everyone = (fn) => foxes.length > 0 && foxes.filter((f) => f.seen).every(fn);
	const TUTORIAL = [
		{ caption: 'STEP LEFT AND RIGHT TO STEER', min: 2, max: 10, did: () => everyone((f) => f.reach.max - f.reach.min >= 0.3) },
		{ caption: 'BOUNCE UP THE PLATFORMS', min: 2, max: 14, did: () => everyone((f) => f.best >= 14) },
		{ caption: 'GRAB THE GOLD RINGS', min: 2, max: 12, did: () => everyone((f) => f.rings >= 3) },
	];

	/* ---------- the beats ---------- */

	const SCENE = ['squad', 'title', 'clock', 'visors', 'controls', 'warn', 'play', 'timeup'];   // the beats the tower shows behind

	show.sequence([
		{ id: 'squad', length: Infinity },
		show.beats.titleDrop(),
		show.beats.clockIntro(),
		show.beats.visors(),
		// the tutorial: off the beach and up, a step at a time
		show.beats.tutorial({
			steps: TUTORIAL,
			enterStep() { for (const f of foxes) f.reach = { min: f.px, max: f.px }; },
			enter() { climb(); sound.go(); },
			update() {
				for (const f of foxes) {
					f.reach.min = Math.min(f.reach.min, f.px);
					f.reach.max = Math.max(f.reach.max, f.px);
				}
			},
		}),
		// the hazards' entrance: WATCH OUT! and what's coming, the climb going on
		// underneath (the robots turn up from now on)
		{
			id: 'warn',
			length: WARN.length,
			enter() { climb(); robotsOn = true; show.fx('villainReveal'); for (const f of foxes) f.rings = 0; },   // (the practice's rings don't count)
			update(dt, bt) {
				show.blackout = 0.4 * Math.min(1, bt * 2);
				if (show.cue(WARN.title)) { show.fx('stomp'); show.shake = 0.5; }
				for (const at of [WARN.a, WARN.b, WARN.c]) if (show.cue(at)) show.fx('beat');
			},
			draw(ctx, bt) {
				show.onWalls(ctx, function (c) {
					show.slam(c, 'WATCH OUT!', W / 2, 230, 120, bt - WARN.title, { fill: '#ff3d4a' });
					if (bt > WARN.a) show.text(c, 'CRUMBLY PLATFORMS BREAK AFTER ONE BOUNCE', W / 2, 360, 52, { fill: 'white', alpha: Math.min(1, (bt - WARN.a) * 3) });
					if (bt > WARN.b) show.text(c, 'BOP ROBOTS FROM ABOVE · BUMP ONE AND YOU DROP RINGS', W / 2, 440, 52, { fill: 'white', alpha: Math.min(1, (bt - WARN.b) * 3) });
					if (bt > WARN.c) show.text(c, 'SPRINGS AND TAIL ROTORS LAUNCH YOU SKY HIGH!', W / 2, 520, 52, { fill: '#ffd23f', alpha: Math.min(1, (bt - WARN.c) * 3) });
				});
			},
		},
		// the climb, until the clock's out
		{
			id: 'play',
			length: Infinity,
			enter() {
				climb();
				robotsOn = true;
				playT = 0;
				sound.go();
				for (const f of foxes) f.rings = 0;
			},
			update(dt) {
				playT += dt;
				show.record(playT, foxes.map((f) => (f.seen ? { px: f.px, pz: f.pz } : null)));
			},
			draw(ctx, bt) {
				if (bt < 1.4) show.onWalls(ctx, (c) => show.slam(c, 'CLIMB!', W / 2, 300, 140, bt, { fill: '#3cdc7a', alpha: 1 - clamp((bt - 1) / 0.4, 0, 1) }));
			},
		},
		show.beats.timeUp({
			enter() { finish(); },
		}),
		show.beats.scores(),
		show.beats.rank(),
		show.beats.team(),
		show.beats.board(),
		show.beats.replay(),
		show.beats.rate(),
		show.beats.end({
			enter() { IGB.complete(scoresToRewards(foxes.map((f) => f.rings))); },
		}),
	]);

	/* ---------- every frame ---------- */

	const eye = v3();
	const tmp = v3();

	function simulate(dt) {
		clock += dt;
		const playing = show.beat === 'play';
		const counts = playing;                         // (only the climb proper costs rings)
		const touchy = phase === 'climb';

		for (const f of foxes) stepFox(f, dt, counts, touchy);

		// the eye climbs with the highest fox, and never comes back down
		if (phase === 'climb') {
			let top = -Infinity;
			for (const f of foxes) if (f.state === 'air' || f.state === 'rotor') top = Math.max(top, f.y + CAM.lead);
			if (top > camY) camY += (top - camY) * Math.min(1, dt * CAM.rise);
		}
		for (const f of foxes) { f.best = Math.max(f.best, f.y); topHeight = Math.max(topHeight, f.y); }

		// a new height
		const z = zoneAt(camY);
		if (z !== zoneNow) {
			zoneNow = z;
			if (ZONE_NAMES[z] && (show.beat === 'play' || show.beat === 'controls')) {
				zoneShow = { text: ZONE_NAMES[z], age: 0 };
				sound.zone();
			}
		}
		if (zoneShow && (zoneShow.age += dt) > 2.6) zoneShow = null;

		// the tower comes alive
		for (const p of platforms) {
			if (p.fall) {
				p.fall.age += dt;
				p.fall.v -= GRAVITY * 0.7 * dt;
				p.y += p.fall.v * dt;
				put(p.mesh, p.s, p.y);
				p.mesh.rotateZ(p.fall.spin * p.fall.age);
				p.mesh.scale.setScalar(Math.max(0.01, 1 - p.fall.age * 0.8));
				p.mesh.visible = p.fall.age < 1.2;
				continue;
			}
			if (p.move) {
				p.s = clamp(p.s0 + p.move.amp * Math.sin(clock * p.move.speed + p.move.ph), -S_MAX, S_MAX);
				put(p.mesh, p.s, p.y);
			}
			if (p.item && !p.item.taken) {
				const it = p.item;
				if (it.type === 'spring') {
					put(it.mesh, p.s + it.off, p.y);
					it.boing = Math.max(0, it.boing - dt * 3);
					it.mesh.userData.coil.scale.y = 1 + Math.sin(it.boing * 14) * it.boing * 0.9;
				} else {
					put(it.mesh, p.s, p.y + 1.1 + Math.sin(clock * 2.5 + p.s) * 0.12);
					it.mesh.userData.spin.rotation.y += dt * 9;
					it.mesh.userData.ring.rotation.z += dt;
				}
			}
		}
		for (const r of rings) {
			if (r.taken) continue;
			r.spin += dt * 3;
			r.mesh.userData.spin.rotation.y = r.spin;
		}
		for (const r of robots) {
			const u = r.mesh.userData;
			if (r.dead) {
				r.dead.age += dt;
				r.dead.v -= GRAVITY * dt;
				r.y += r.dead.v * dt;
				put(r.mesh, r.s, r.y);
				u.body.rotation.z += dt * 10;
				r.mesh.visible = r.dead.age < 1.6;
				continue;
			}
			r.s = clamp(r.s0 + r.amp * Math.sin(clock * r.speed + r.ph), -S_MAX, S_MAX);
			r.y = r.y0 + Math.sin(clock * 2.2 + r.ph) * 0.25;
			put(r.mesh, r.s, r.y);
			u.rotor.rotation.y += dt * 25;
			u.flame.scale.y = 0.8 + Math.random() * 0.4;
			u.body.rotation.z = Math.cos(clock * r.speed + r.ph) * 0.15;
		}

		// sparkles, flung rings, words
		for (const s of sparks) {
			s.age += dt;
			const q = s.age / s.life;
			s.sprite.scale.setScalar(s.size * (0.6 + q * 1.2));
			s.sprite.material.opacity = 1 - q;
			s.sprite.material.rotation += dt * 4;
		}
		for (const s of sparks.filter((s) => s.age >= s.life)) {
			scene.remove(s.sprite);
			s.sprite.material.dispose();
			sparks.splice(sparks.indexOf(s), 1);
		}
		for (const f of flung) {
			f.age += dt;
			f.vel.y -= GRAVITY * 0.6 * dt;
			f.mesh.position.addScaledVector(f.vel, dt);
			f.mesh.rotation.y += dt * 8;
			if (f.age > 1) f.mesh.scale.multiplyScalar(Math.exp(-dt * 6));
		}
		for (const f of flung.filter((f) => f.age > 1.6)) {
			scene.remove(f.mesh);
			flung.splice(flung.indexOf(f), 1);
		}
		for (const p of pops) p.age += dt;
		for (let i = pops.length - 1; i >= 0; i--) if (pops[i].age > 1.1) pops.splice(i, 1);
		shake *= Math.exp(-dt * 6);
		flashRed *= Math.exp(-dt * 4);

		// the eye
		eye.set(0, camY, 0);
		rig.position.copy(eye);
		if (shake > 0.01) rig.position.add(tmp.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake));
		keepBuilt();

		// the sky for this height, and the light from it
		world.update(clock, eye, camY);
		const L = world.light;
		sun.color.copy(L.sun);
		sun.intensity = L.sunI;
		sun.target.position.set(0, camY - 1, 0);
		sun.position.copy(sun.target.position).addScaledVector(L.dir, 60);
		hemi.color.copy(L.hemiSky);
		hemi.groundColor.copy(L.hemiGround);
		hemi.intensity = L.hemiI;
		scene.fog.color.copy(L.fog);

		sound.rotor(phase === 'climb' && foxes.some((f) => f.state === 'rotor') ? 1 : 0);
		sound.tick();
	}

	function stepFox(f, dt, counts, touchy) {
		f.t += dt;
		f.safe = Math.max(0, f.safe - dt);
		f.squash *= Math.exp(-dt * 9);

		// steering: round the ring after its player
		const sWas = f.s;
		if (f.state !== 'hurt') {
			const most = STEER.max * dt;
			f.s += clamp((sFor(f.px) - f.s) * Math.min(1, dt * STEER.glide), -most, most);
		}
		f.vs = dt > 0 ? (f.s - sWas) / dt : 0;
		f.yWas = f.y;

		if (f.state === 'bubble') {
			// floating up from below the view, then popping
			const th = f.s / RADIUS;
			const from = camY - halfView(th) - 2;
			const to = camY - halfView(th) * 0.4;
			const q = clamp(f.t / FALL.rise, 0, 1);
			f.y = lerp(from, to, 1 - Math.pow(1 - q, 3)) + Math.sin(f.t * 5) * 0.12;
			if (f.t >= FALL.rise + FALL.hold) {
				f.state = 'air';
				f.t = 0;
				f.vy = vFor(HOP.pop);
				f.safe = FALL.safe;
				f.squash = 0.6;
				sound.pop(pan(f.s));
				sparkle(foxMiddle(f), 0xffffff, 4);
			}
		} else {
			if (f.state === 'rotor') {
				f.vy = ROTOR.speed;
				if (f.t >= ROTOR.seconds) { f.state = 'air'; f.t = 0; }
			} else f.vy -= GRAVITY * dt;
			f.y += f.vy * dt;
			if (f.vy < 0) land(f, touchy);
			if (touchy && (f.state === 'air' || f.state === 'rotor')) touch(f, counts);
			// out of the bottom of the view: a fall
			if (phase === 'climb' && f.y < camY - halfView(f.s / RADIUS) - 1.2) fall(f, counts);
		}

		// on the ring
		const m = f.model;
		put(m.root, f.s, f.y);
		f.turn += (clamp(f.vs * 0.07, -1.3, 1.3) - f.turn) * Math.min(1, dt * 8);
		m.yaw.rotation.y = f.turn;
		m.pose(dt, { vy: f.vy, v0: V_JUMP, rotor: f.state === 'rotor', hurt: f.state === 'hurt', squash: f.squash, lean: -clamp(f.vs * 0.012, -0.35, 0.35) });
		m.root.visible = !(f.safe > 0 && f.state === 'air' && Math.floor(clock * 14) % 2);
		f.bubble.visible = f.state === 'bubble';
		if (f.bubble.visible) {
			put(f.bubble, f.s, f.y + FOX.middle);
			const wob = Math.sin(f.t * 7) * 0.05;
			f.bubble.scale.set(1 + wob, 1 - wob, 1 + wob);
		}
	}

	// Coming down: onto the beach, or a platform (not when knocked off).
	function land(f, touchy) {
		if (f.y <= 0) {
			f.y = 0;
			if (f.state === 'hurt') { f.state = 'air'; f.t = 0; f.safe = FALL.safe; }
			bounce(f, phase === 'climb' ? HOP.jump : HOP.beach);
			return;
		}
		if (f.state !== 'air' || !touchy) return;
		let best = null;
		for (const p of platforms) {
			if (!p.alive || p.y > f.yWas + 0.001 || p.y < f.y) continue;
			if (Math.abs(f.s - p.s) > p.w / 2 + REACH.foot) continue;
			if (!best || p.y > best.y) best = p;
		}
		if (!best) return;
		f.y = best.y;
		const it = best.item;
		if (it && it.type === 'spring' && Math.abs(f.s - (best.s + it.off)) < REACH.spring) {
			f.vy = vFor(HOP.spring);
			f.squash = 1;
			it.boing = 1;
			sound.spring(pan(f.s));
			pop('BOING!', f.colour, foxMiddle(f), 80);
			return;
		}
		bounce(f, HOP.jump);
		if (best.type === 'crumble') {
			best.alive = false;
			best.fall = { v: 0, age: 0, spin: (Math.random() - 0.5) * 0.08 };
			sound.crumble(pan(best.s));
			const at = foxMiddle(f).setY(best.y);
			for (let i = 0; i < 3; i++) sparkle(tmp.copy(at).add(v3().set(rand(-1, 1), rand(-0.3, 0.3), rand(-1, 1))), 0xe0a868, 1.6);
		}
	}

	function bounce(f, height) {
		f.vy = vFor(height);
		f.squash = 1;
		if (phase === 'climb' || height > HOP.beach) sound.boing(pan(f.s), f.pitch);
	}

	// Touching rings, rotors and robots.
	function touch(f, counts) {
		const fy = f.y + FOX.middle;
		const near = (s, y, r) => (s - f.s) ** 2 + (y - fy) ** 2 < r * r;
		for (const r of rings) {
			if (r.taken || !near(r.s, r.y, REACH.ring)) continue;
			r.taken = true;
			r.mesh.visible = false;
			f.rings++;
			sparkle(r.mesh.position, 0xfff2a0);
			sound.ring(pan(r.s));
		}
		for (const p of platforms) {
			const it = p.item;
			if (!it || it.taken || it.type !== 'rotor' || !p.alive || !near(p.s, it.mesh.position.y, REACH.rotor)) continue;
			it.taken = true;
			it.mesh.visible = false;
			f.state = 'rotor';
			f.t = 0;
			sound.whirr(pan(f.s));
			sparkle(it.mesh.position, 0xffe56a, 3);
			pop('TAIL SPIN!', f.colour, foxMiddle(f), 80);
		}
		for (const r of robots) {
			if (r.dead || !near(r.s, r.y, REACH.robot)) continue;
			if (f.state === 'rotor' || (f.vy < 0 && fy - r.y > 0.3)) {
				// bopped from above (or knocked flying by the rotor)
				r.dead = { v: 4, age: 0 };
				r.alive = false;
				if (f.state !== 'rotor') { f.vy = vFor(HOP.stomp); f.squash = 1; }
				f.rings += STOMP_RINGS;
				sound.stomp(pan(r.s));
				sparkle(r.mesh.position, 0xffffff, 4);
				pop('+' + STOMP_RINGS, '#ffe14a', r.mesh.position, 80);
				shake = Math.max(shake, 0.15);
			} else if (f.safe <= 0) hurt(f, counts);
		}
	}

	function loseRings(f, counts) {
		const lose = counts ? Math.ceil(f.rings * FALL.lose) : 0;
		f.rings -= lose;
		return lose;
	}

	// Bumped by a robot: rings fly, and the fox tumbles away down through the platforms.
	function hurt(f, counts) {
		const lose = loseRings(f, counts);
		fling(f, lose);
		f.state = 'hurt';
		f.t = 0;
		f.vy = 6;
		sound.hit(pan(f.s));
		shake = Math.max(shake, 0.35);
		flashRed = Math.max(flashRed, 0.45);
		pop(lose ? '−' + lose : 'OUCH!', '#ff3d4a', foxMiddle(f), 90);
	}

	// Out of the bottom of the view: rings dropped, and a bubble on its way.
	function fall(f, counts) {
		const wasHurt = f.state === 'hurt';
		const lose = loseRings(f, counts);
		f.state = 'bubble';
		f.t = 0;
		f.vy = 0;
		if (!wasHurt) sound.fall(pan(f.s));
		stage.timeout(() => sound.bubble(pan(f.s)), 250);
		const at = v3();
		put({ position: at, rotation: {} }, f.s, camY - halfView(f.s / RADIUS) * 0.6);
		if (lose) pop('−' + lose, '#ff3d4a', at, 90);
	}

	function render() {
		// (one shadow pass, then all three walls into one HDR frame, then bloom and tone mapping)
		renderer.render(scene, walls.views(renderer.width, renderer.height));
	}

	/* ---------- the 2D layer: words, the height ---------- */

	function onWall(v, wall) {
		const p = G.toScreen(v, cams[wall], wall * W, 0, W, H);
		if (!p || Math.abs(p.ndc.x) > 1 || Math.abs(p.ndc.y) > 1.3) return null;
		return p;
	}
	function onAnyWall(v) {
		for (const w of [1, 0, 2]) {
			const p = onWall(v, w);
			if (p) return p;
		}
		return null;
	}

	function overlay(ctx) {
		if (flashRed > 0.01) {
			for (let w = 0; w < 3; w++) {
				const g = ctx.createRadialGradient(W * (w + 0.5), H / 2, H * 0.3, W * (w + 0.5), H / 2, W * 0.75);
				g.addColorStop(0, 'rgba(255,40,60,0)');
				g.addColorStop(1, `rgba(255,40,60,${flashRed * 0.6})`);
				ctx.fillStyle = g;
				ctx.fillRect(W * w, 0, W, H);
			}
		}

		// words over the foxes
		for (const p of pops) {
			const at = onAnyWall(tmp.copy(p.at).add(v3().set(0, 1.4, 0)));
			if (!at) continue;
			const q = p.age / 1.1;
			art.text(ctx, p.text, at.x, at.y - q * 90, { size: p.size * (q < 0.15 ? q / 0.15 : 1), font: FONT, fill: p.colour, outline: '#1a1030', outlineWidth: 7, alpha: 1 - Math.max(0, q - 0.6) / 0.4 });
		}

		if (!['controls', 'warn', 'play', 'timeup'].includes(show.beat)) return;

		// the height, top right of the front wall
		art.text(ctx, Math.floor(topHeight) + ' M', 2 * W - 70, 84, { size: 76, font: FONT, fill: '#ffffff', outline: '#1a1030', outlineWidth: 8, align: 'right' });
		art.text(ctx, 'HEIGHT', 2 * W - 70, 128, { size: 30, font: FONT, fill: '#ffd23f', outline: '#1a1030', outlineWidth: 5, align: 'right' });

		// a new height's name
		if (zoneShow) {
			const a = 1 - clamp((zoneShow.age - 2.1) / 0.5, 0, 1);
			show.onWalls(ctx, (c) => show.slam(c, zoneShow.text, W / 2, 420, 110, zoneShow.age, { fill: '#ffd23f', alpha: a }));
		}
	}

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		simulate(show.paused ? 0 : dt * show.timeScale);   // (still while paused; slowing to a stop with TIME!)
		if (SCENE.includes(show.beat)) render();   // (the results are on the show's own backdrop)
		show.frame(ctx, dt, overlay);
	};

	/* ---------- input ---------- */

	self.setPlayers = function (p) {
		foxes.forEach(function (f, i) {
			if (p[i] && p[i].px !== undefined) { f.px = clamp(p[i].px, 0, 1); f.seen = true; }
			if (p[i] && p[i].pz !== undefined) f.pz = clamp(p[i].pz, 0, 1);   // (1 at the front wall, 0 at the back: only for the replay)
		});
	};

	// For tests and the console: where the game is up to.
	self.state = function () {
		return Object.assign(show.state(), {
			phase, camY, topHeight, zone: zoneNow,
			foxes: foxes.map((f) => ({ n: f.n, s: f.s, y: f.y, state: f.state, rings: f.rings })),
			platforms: platforms.length, rings: rings.filter((r) => !r.taken).length, robots: robots.filter((r) => !r.dead).length,
		});
	};

	self.test = {
		// jump to any beat (past the squad, a squad is needed: three, unless one's been given)
		jump(id) {
			$('showtime-picker').remove();
			if (!foxes.length) setUp(playersMeta ? playersMeta.length : 3);
			show.go(id);
		},
		timeLeft(s) { show.setTimeLeft(s); },
		height(m) { camY = m; for (const f of foxes) { f.y = m; f.vy = V_JUMP; } rebuild(m); },   // (straight up to a height)
	};

	self.fini = function () {
		sound.close();
		unlisten();
		show.fini();
		world.dispose();
		sparkTex.dispose();
		renderer.dispose();
		renderer.forceContextLoss();
	};

	/* ---------- go ---------- */

	keepBuilt();   // (the bottom of the tower, behind the squad picker)
	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
