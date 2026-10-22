/*
 * Quill Relay (shown as SONIC CLASSIC: the manifest's name and title; the id,
 * folder and code stay quill-relay)
 *
 * A classic side-on speedster platformer, everyone at once, round the room.
 * The course is one continuous level on the three walls: the left wall's
 * stretch runs round the corner into the front wall's, then into the right
 * wall's, then (round the back of the room, out of sight) onto the left
 * wall again, lap after lap. Every player has their own glossy, spiky hero
 * in their colour. They start spread round the walls (player 1 on the left
 * wall, 2 on the front, 3 on the right, 4 on the left again...) and each
 * moves on to the next wall on their own.
 *
 * Body control, for each player on their hero's wall:
 *   - walk along the wall you're running (left to right as you face it) and
 *     the hero runs with you, with momentum: he speeds up, overshoots a
 *     touch, slows on the hills and speeds down them;
 *   - stand tall (or hop) to jump;
 *   - squat while he's moving to curl up and roll; squat while he's
 *     standing still to rev up a spin dash, then stand up to let it go;
 *   - jump or roll into robots to pop them (touching one otherwise spills
 *     your rings); jump the spikes; bounce off springs; jump or roll into
 *     item monitors for ten rings or a bubble shield; hit a loop fast enough
 *     and round it you go.
 *
 * Round the room: reach the checkpoint post at the right end of your wall and
 * it spins, your hero zips round the corner onto the next wall, and you walk
 * round to it and carry on ("PLAYER 2, GO!"), lap after lap until the clock
 * runs out. The right end of one wall is the left end of the next, so you
 * just keep walking (off the right wall, along the back to the left wall).
 * Rings, robots and monitors are shared (whoever gets there first) and come
 * back after a while. A stretch is rebuilt with fresh ground once nobody's
 * on it.
 *
 * Score: rings, plus SCORE.bot for every robot popped, per player.
 *
 * The three walls are three cameras in one rig in the middle of the room,
 * sharing one pitch and the same fixed 90 degree field of view, so the walls
 * are the sides of one box and the corners meet seamlessly.
 *
 * Input: each player's position along their hero's wall (left wall: pz;
 * front: px; right: 1 - pz; pz is 1 at the front wall), py for jumping and
 * ducking (0 high, 1 low), calibrated to their standing height each time
 * they start a wall. At a desk: Space jumps, hold the down arrow to duck,
 * for whichever player the mouse moves (keys 1-6).
 *
 * Showtime runs the show: the squad picker, the title drop, the clock, then
 * the relay ('play'), TIME!, scores, rank, and the end.
 * An ES module (manifest: module: true), drawn with three.js, with bloom and
 * tone mapping over all three walls (lib/three/walls.js).
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { createWallComposer } from '../../lib/three/walls.js';
import { createSky, SUN, HORIZON } from './sky.js';
import { buildSection } from './course.js';
import { buildHero, buildRing, buildPalm, buildHill, buildWaterfallCliff, earthTexture, grassTexture, fringeTexture, waterfallTexture, sparkleTexture, glossy } from './models.js';
import { createSound } from './sound.js';

IGB.register('quill-relay', function QuillRelayGame(stage, playersMeta) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;
	const TAU = Math.PI * 2;

	/* ---------- tuning ---------- */

	const ROUND = 180;                  // seconds on the show's clock
	const COURSE = {
		depth: 9,                         // metres from the middle of the room to the hero's running line (each wall's stretch is twice this long): further out is more zoomed out
		ground: -2.7,                     // the ground's base height, metres below the eye (keeps the ground about three quarters of the way down each wall)
		near: 8.4, far: 9.6,              // the track's top runs from this close to this far (metres from the middle of the room)
		ringSize: 0.2,                    // a ring's radius (metres)
		ringLift: 0.55,                   // how high the rings float over the ground
		slots: [[2.5, 6.6], [7, 11], [11.4, 15.5]],   // three stretches of a wall's track (a loop takes two)
		checkpoint: 16.2,                 // where the checkpoint post stands (metres along)
		post: 0.4,                        // and how far behind the running line
		hill: [0.35, 0.7], dip: [0.45, 0.8],   // metres high / deep (no dips are laid now)
		hillChance: 0.35,                 // the chance a wall's track has one low hill
		loop: { radius: 1.75, width: 1.2 },
		// a wall's track is flat ground and rings with at most ONE feature: these are its chances
		loopChance: 0.3,                  // a loop
		botChance: 0.15,                  // a single robot (a Gearhog)
		monitorChance: 0.2,               // an item monitor
		bots: { walk: 0.9, hover: 2.0 },  // the Gearhog's walking speed, the Buzzdrone's height
	};
	COURSE.span = COURSE.depth * 2;
	const CAM = { fov: 64, pitch: 0 };  // vertical degrees (90 across each 16:10 wall), and the rig's one shared tilt: NEVER per camera
	const MAP = {
		edge: 0.08,                       // the share of the wall at each end that's beyond the hero's reach
		from: 1.0, to: 17.0,              // metres along the stretch the player's reach maps to
		creep: 2.5,                       // metres a second the hero edges on while the runner stands at the right end
		start: 0.3,                       // how far along the wall the next runner must be to start (from the left)
		wait: 6,                          // seconds to wait for them before starting anyway
	};
	const RUN = { top: 14, accel: 18, brake: 36, gain: 3.2, slope: 10, air: 10 };   // m/s, m/s², per second (how keenly he chases his runner), slope pull, air control
	const ROLL = { friction: 1.8, slope: 16, stop: 1.2, from: 2.2 };   // rolling: slowing, slope pull, the speed it uncurls at, the speed you need to curl up
	const JUMP = { speed: 10.5, gravity: 26, bounce: 8 };   // m/s up, m/s², bounce off a popped robot
	const DASH = { charge: 0.3, min: 11, max: 19, full: 1.2 };   // seconds crouched before it revs, launch speeds, seconds to a full charge
	const BODY = { jump: 0.06, duck: 0.12, release: 0.07, calibrate: 1.2, adapt: 0.4 };   // py above standing to jump, below to duck (and to stand up again), seconds of calibration, how fast standing height adapts
	const LOOP = { min: 5.5, speed: 9 };   // m/s needed to go round a loop, and the least speed round it
	const SPRING = 13.5;                // m/s up off a spring
	const HURT = { knock: [5, 7], safe: 2, lose: 0.5, max: 16, linger: 3.5 };   // knocked back (m/s back, up), seconds safe, share of rings spilled, most spilled, seconds they linger
	const HANDOVER = { zip: 0.7, banner: 1.8, start: 1.5 };   // seconds round the corner, seconds of PLAYER N, GO! (and calibration), metres along the next stretch the hero starts
	const REBUILD = { after: 1.6, sink: 0.5, rise: 0.7 };     // a stretch left behind: seconds before it sinks, sinking, rising anew
	const SCORE = { ring: 1, bot: 5, monitor: 10 };          // points a ring, a robot; rings in a monitor
	const HERO = { scale: 0.5, turn: 0.4, lane: 0.35 };       // his size (1: about 2 m tall), how far he turns toward the room (radians), and how much nearer the room players 4-6 run
	const RESPAWN = { ring: 6, other: 12 };                   // seconds before a taken ring, or a popped robot or opened monitor, comes back

	const GROUND = COURSE.ground;
	const HALF = COURSE.span / 2;
	const YAW = [Math.PI / 2, 0, -Math.PI / 2];   // each wall's stretch turned to face its camera

	/* ---------- renderer, scene, cameras ---------- */

	const renderer = new THREE.WebGLRenderer({ antialias: false });   // (the composer multisamples)
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.05;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	$(renderer.domElement).css({ position: 'absolute', left: 0, top: 0, width: WIDTH + 'px', height: H + 'px' }).appendTo(stage.$bg);

	let k = 1;
	let postfx = null;   // bloom and tone mapping over all three walls (made once the scene is)
	function resize() {
		k = Math.min(IGB.scale * IGB.pixelRatio, 1);
		renderer.setPixelRatio(1);
		renderer.setSize(Math.round(WIDTH * k), Math.round(H * k), false);
		if (postfx) postfx.setSize();
	}
	// A wall's view: its camera into its third of the canvas (pixels, y up).
	function viewport(cam, x, y, w, h) {
		const x0 = Math.round(x * k);
		const x1 = Math.round((x + w) * k);
		const y0 = Math.round((H - y - h) * k);
		const y1 = Math.round((H - y) * k);
		return { camera: cam, x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
	}
	const unlisten = IGB.onResize(resize);
	resize();

	const scene = new THREE.Scene();
	scene.fog = new THREE.Fog(HORIZON, 45, 260);
	const world = createSky(renderer, scene, GROUND - 3);
	// Bloom: rings, the checkpoint orb, monitor screens, sparkles and the sun glow.
	postfx = createWallComposer(renderer, scene, { strength: 0.55, radius: 0.55, threshold: 0.9 });
	world.ocean.renderOrder = -5;
	world.ocean.material.depthWrite = false;

	scene.add(new THREE.HemisphereLight(0xdff2ff, 0x5a8a3a, 0.9));
	const sun = new THREE.DirectionalLight(0xfff2dc, 3.0);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 110 });
	sun.shadow.camera.updateProjectionMatrix();
	sun.shadow.bias = -0.0004;
	sun.shadow.normalBias = 0.03;
	sun.position.copy(SUN).multiplyScalar(45);
	sun.target.position.set(0, GROUND, 0);
	scene.add(sun, sun.target);

	// One rig in the middle of the room, three cameras in it: the left wall's
	// looking left, the front's ahead, the right's right. They share the rig's
	// one tilt and one field of view (90 degrees across), so they're the sides
	// of one box and the walls meet seamlessly.
	const rig = new THREE.Group();
	rig.rotation.x = -CAM.pitch * Math.PI / 180;
	scene.add(rig);
	const cams = YAW.map(function (yaw) {
		const cam = new THREE.PerspectiveCamera(CAM.fov, W / H, 0.1, 4000);
		cam.rotation.y = yaw;
		rig.add(cam);
		return cam;
	});
	const eye = new THREE.Vector3();

	/* ---------- materials ---------- */

	const aniso = renderer.capabilities.getMaxAnisotropy();
	const earthTex = earthTexture(aniso);
	const hillTex = earthTex.clone();
	hillTex.repeat.set(10, 2);
	const loopTex = earthTex.clone();
	loopTex.repeat.set(14, 1);
	const waterTex = waterfallTexture();
	const MATS = {
		grass: new THREE.MeshPhysicalMaterial({ map: grassTexture(aniso), roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
		earth: new THREE.MeshPhysicalMaterial({ map: earthTex, roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.1 }),
		fringe: new THREE.MeshStandardMaterial({ map: fringeTexture(), transparent: true, alphaTest: 0.5, roughness: 0.5 }),
		earthLoop: new THREE.MeshPhysicalMaterial({ map: loopTex, roughness: 0.4, clearcoat: 0.7, side: THREE.DoubleSide }),
		loopInner: glossy(0x4fd04a, { side: THREE.DoubleSide, roughness: 0.45 }),
		loopEdge: glossy(0xffffff),
	};
	for (const m of Object.values(MATS)) m.userData.shared = true;
	const BG = {
		hill: new THREE.MeshPhysicalMaterial({ map: hillTex, roughness: 0.5, clearcoat: 0.5 }),
		cliff: new THREE.MeshPhysicalMaterial({ map: earthTex, roughness: 0.5, clearcoat: 0.5 }),
		water: new THREE.MeshBasicMaterial({ map: waterTex, transparent: true, opacity: 0.92 }),
		top: glossy(0x4fd04a, { roughness: 0.5 }),
		plain: new THREE.MeshStandardMaterial({ color: 0x5ccf4c, roughness: 0.85 }),
	};

	/* ---------- the walls: background and the course ---------- */

	let seed = 1;
	const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
	seed = 1 + Math.floor(Math.random() * 1e6);

	// a wide grassy plain below the course, out to the sea (from just behind
	// the track's front edge, so nothing shows through behind its back edge)
	const plain = new THREE.Mesh(new THREE.RingGeometry(COURSE.depth, 95, 72, 1), BG.plain);
	plain.rotation.x = -Math.PI / 2;
	plain.position.y = GROUND - 1.2;
	plain.receiveShadow = true;
	scene.add(plain);

	const walls = YAW.map(function (yaw, w) {
		const g = new THREE.Group();
		g.rotation.y = yaw;
		scene.add(g);
		const at = (x, d) => new THREE.Vector3(x, GROUND - 1.2, -d);
		// palms just behind the course, toy hills and a waterfall cliff further off
		for (let i = 0; i < 4; i++) {
			const d = COURSE.far + 4 + rand() * 6;
			const p = buildPalm(6 + rand() * 4);
			p.position.copy(at(-d + 2 + rand() * (2 * d - 4), d));
			p.rotation.y = rand() * TAU;
			g.add(p);
		}
		for (let i = 0; i < 4; i++) {
			const d = COURSE.far + 18 + rand() * 30;
			const r = 5 + rand() * 8;
			const hill = buildHill(r, 4 + rand() * 9, BG.hill);
			hill.position.copy(at((rand() * 2 - 1) * d * 0.85, d));
			g.add(hill);
		}
		const d = COURSE.far + 14 + rand() * 8;
		const cliff = buildWaterfallCliff(6 + rand() * 3, 7 + rand() * 4, BG.cliff, BG.water, BG.top);
		cliff.position.copy(at((rand() * 1.2 - 0.6) * d, d));
		g.add(cliff);
		for (let i = 0; i < 2; i++) {
			const p = buildPalm(5 + rand() * 3);
			p.position.copy(cliff.position).add(new THREE.Vector3((i ? 1 : -1) * (5 + rand() * 2), 0, 2 + rand() * 2));
			g.add(p);
		}
		g.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
		return { group: g, section: null, spill: [], swap: null, cliff };
	});

	function newSection(w, gentle) {
		const sec = buildSection({ C: COURSE, mats: MATS, rand, gentle });
		walls[w].group.add(sec.group);
		return sec;
	}
	for (let w = 0; w < 3; w++) walls[w].section = newSection(w, true);   // (everyone starts at once: all three walls start gentle)

	// Where a point on wall w's stretch (u along, y above the base, d deep) is in the world.
	function worldOf(w, u, y, d = COURSE.depth, out = new THREE.Vector3()) {
		const x = u - HALF;
		const z = -d;
		const c = Math.cos(YAW[w]);
		const s = Math.sin(YAW[w]);
		return out.set(x * c + z * s, GROUND + y, -x * s + z * c);
	}

	/* ---------- the heroes: one a player, all running at once ---------- */

	// Each player has their own hero. They start spread round the walls
	// (player 1 on the left wall, 2 on the front, 3 on the right, 4 on the
	// left again...), and each goes on to the next wall on their own when
	// they reach their checkpoint. Heroes sharing a wall run on slightly
	// different lines, nearer the room, so they don't hide each other.
	function Hero(n) {
		const model = buildHero(PLAYER_COLORS[n % PLAYER_COLORS.length]);
		model.root.scale.setScalar(HERO.scale);
		const holder = new THREE.Group();
		holder.add(model.root);
		scene.add(holder);
		return {
			n, model, holder,
			depth: COURSE.depth - Math.floor(n / 3) * HERO.lane,
			state: 'idle',            // idle (before the run), banner (GO!), wait (for them to get to the left end), run, zip (round the corner), over
			t: 0, legs: 0, zip: null,
			wall: n % 3, u: HANDOVER.start, y: 0, v: 0, vy: 0,
			grounded: true, ball: false, charging: false, chargeT: 0, crouchT: 0, revAt: 0,
			hurt: false, sprung: false, safe: 0, shield: false,
			loop: null,                 // { l (its middle), r, a (radians round) }
			facing: 1, yaw: 0, turn: HERO.turn,
			lead: 0,                    // metres he's ahead of where his runner maps to (a dash or a roll carries him on)
		};
	}
	let heroes = [];

	/* ---------- players and their bodies ---------- */

	let count = 0;
	let latest = [];
	const colourOf = (n) => new THREE.Color(PLAYER_COLORS[n % PLAYER_COLORS.length]).getStyle();
	const tally = [];            // per player: { rings, bots }
	const body = [];             // per player: { py, stand, samples, up, duck }
	const scoreOf = (i) => tally[i].rings * SCORE.ring + tally[i].bots * SCORE.bot;
	const scores = () => tally.map((t, i) => scoreOf(i));

	// Where a player is along wall w, left (0) to right (1) as they face it.
	function alongFor(p, w) {
		if (!p) return 0;
		if (w === 0) return p.pz;            // the left wall: from the back of the room (0) to the front (1)
		if (w === 1) return p.px;            // the front wall: left to right
		return 1 - p.pz;                     // the right wall: from the front to the back
	}
	const alongOf = (h) => alongFor(latest[h.n], h.wall);
	const mapU = (f) => MAP.from + Math.max(0, Math.min(1, (f - MAP.edge) / (1 - 2 * MAP.edge))) * (MAP.to - MAP.from);

	function setUp(n) {
		count = n;
		for (const h of heroes) scene.remove(h.holder);
		heroes = [];
		for (let i = 0; i < n; i++) {
			tally[i] = { rings: 0, bots: 0 };
			body[i] = { py: 0.5, stand: 0.5, samples: [], up: false, duck: false, jumped: false };
			const h = Hero(i);
			heroes.push(h);
			placeHero(h, i % 3, HANDOVER.start);
		}
	}

	// The body: jumping and ducking against each runner's own standing height.
	const keys = { jump: false, duck: false, jumpEdge: false };
	function readBody(i, dt) {
		const b = body[i];
		const p = latest[i];
		if (p && p.py !== undefined) b.py = p.py;
		if (heroes[i] && heroes[i].state === 'banner') b.samples.push(b.py);
		const rise = b.stand - b.py;         // (py is 0 high, 1 low: standing taller is a smaller py)
		const wasUp = b.up;
		if (!b.up && rise > BODY.jump) b.up = true;
		else if (b.up && rise < BODY.jump * 0.5) b.up = false;
		if (!b.duck && -rise > BODY.duck) b.duck = true;
		else if (b.duck && -rise < BODY.release) b.duck = false;
		if (b.up && !wasUp) b.jumped = true;   // (held until the physics takes it)
		// standing height drifts with them while they're neither jumping nor ducking
		if (!b.up && !b.duck && Math.abs(rise) < BODY.jump * 0.8) b.stand += (b.py - b.stand) * Math.min(1, dt * BODY.adapt);
	}
	function calibrate(i) {
		const s = body[i].samples.slice().sort((a, b) => a - b);
		if (s.length) body[i].stand = s[Math.floor(s.length / 2)];
		body[i].samples = [];
		body[i].up = body[i].duck = false;
	}
	// (at a desk, the keys drive whichever player the mouse moves)
	const deskPlayer = () => (IGB.players && IGB.players.selected) || 0;

	/* ---------- effects ---------- */

	const sparkTex = sparkleTexture();
	const sparks = [];
	const pops = [];             // words over the course: { text, colour, wall, u, y, age }
	const flashes = [0, 1, 2].map(() => ({ v: 0, red: false }));   // a flash over one wall

	function sparkle(at, colour = 0xffffff, size = 1.2) {
		const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: new THREE.Color(colour).multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));   // (past white: it blooms)
		s.position.copy(at);
		s.scale.setScalar(size);
		scene.add(s);
		sparks.push({ sprite: s, age: 0, life: 0.4, size });
	}
	function pop(text, colour, wall, u, y) {
		pops.push({ text, colour, wall, u, y, age: 0 });
	}
	function flash(w, v, red) {
		flashes[w].v = Math.max(flashes[w].v, v);
		flashes[w].red = red;
	}

	/* ---------- the show ---------- */

	const sound = createSound();
	const show = new Showtime(stage, {
		id: 'quill-relay',
		seconds: ROUND,
		players: () => count,
		scores,
		music: false,
		theme: { accent: '#2f7cf0', accent2: '#ffd23a', gold: '#ffd23a', ink: '#0a1a3a', sky: ['#0b3f9a', '#3fa8ff'], glow: 'rgba(255,210,58,0.35)' },
		rivals: ['Ring Rush', 'The Spinballs', 'Checker Crew', 'Loop Troop', 'Palm Sprinters', 'Spring Kings',
			'Gold Rings', 'The Quills', 'Relay Rockets', 'Waterfall Gang'],
	});

	show.sequence([
		{ id: 'squad', length: Infinity },
		show.beats.titleDrop(),
		show.beats.clockIntro(),
		{
			id: 'play',
			length: Infinity,
			enter() { startRun(); },
			draw(ctx) { runOverlay(ctx); },
		},
		show.beats.timeUp({ enter() { endRun(); } }),
		show.beats.scores(),
		show.beats.rank(),
		{ id: 'done', length: Infinity, world: false, enter() { IGB.complete(scoresToRewards(scores())); } },
	]);
	const SCENE = ['squad', 'sting', 'title', 'clock', 'play', 'timeup'];   // the beats the course shows behind

	function initGame(n) {
		setUp(n);
		sound.resume();
		show.go('title');
	}

	/* ---------- the run ---------- */

	function startRun() {
		if (!count) setUp(playersMeta ? playersMeta.length : 3);
		for (const t of tally) { t.rings = 0; t.bots = 0; }
		for (const h of heroes) {
			h.legs = 0;
			placeHero(h, h.n % 3, HANDOVER.start);
			beginLeg(h);
		}
		sound.go();
		sound.music(true);
	}

	function endRun() {
		for (const h of heroes) h.state = 'over';
		sound.music(false);
	}

	function placeHero(h, w, u) {
		Object.assign(h, { wall: w, u, y: walls[w].section.height(u), v: 0, vy: 0, grounded: true, ball: false, charging: false, hurt: false, sprung: false, loop: null, facing: 1 });
	}

	// A new wall for one hero: GO!, and their standing height.
	function beginLeg(h) {
		h.state = 'banner';
		h.t = 0;
		h.lead = 0;
		body[h.n].samples = [];
		sparkle(worldOf(h.wall, h.u, 1, h.depth), new THREE.Color(colourOf(h.n)).getHex(), 3);
		show.fx('stepIn');
	}

	function goRun(h) {
		h.state = 'run';
		h.t = 0;
		body[h.n].jumped = false;
		h.lead = HANDOVER.start - mapU(alongOf(h));   // (starting from wherever they are: a step right is a step right)
		if (h.lead < 0 && alongOf(h) <= MAP.start) h.lead = 0;
	}

	// The checkpoint: its orb spins round in the hero's colour, and he zips
	// round the corner onto the next wall (his player walks round to it).
	function checkpoint(h) {
		const sec = walls[h.wall].section;
		sec.checkpoint.hit = true;
		sec.checkpoint.spin = 30;
		const orb = sec.checkpoint.mesh.userData.orb;
		orb.material.color.set(colourOf(h.n));
		orb.material.emissive.set(colourOf(h.n));
		sound.checkpoint();
		stage.timeout(() => sound.zip(), 250);
		pop('CHECKPOINT!', colourOf(h.n), h.wall, sec.checkpoint.u, 3.2);
		h.state = 'zip';
		h.t = 0;
		h.zip = { w: h.wall, u0: h.u, w1: (h.wall + 1) % 3 };
		h.ball = true;
		h.charging = false;
		h.loop = null;
		// (the stretch left behind sinks away and rises anew, once nobody's on it)
		if (!walls[h.zip.w].swap) walls[h.zip.w].swap = { t: -REBUILD.after, built: false };
	}

	function stepHero(h, dt) {
		h.t += dt;
		if (h.state === 'banner') {
			if (h.t >= HANDOVER.banner) {
				calibrate(h.n);
				if (alongOf(h) <= MAP.start) goRun(h);
				else { h.state = 'wait'; h.t = 0; }
			}
		} else if (h.state === 'wait') {
			if (alongOf(h) <= MAP.start || h.t >= MAP.wait) goRun(h);
		} else if (h.state === 'zip') {
			// round the corner: on along this stretch, then onto the next to where he'll start
			const z = h.zip;
			const d1 = COURSE.span - z.u0 + 0.6;
			const d2 = HANDOVER.start + 0.6;
			const s = Math.min(1, h.t / HANDOVER.zip) * (d1 + d2);
			if (s < d1) { h.wall = z.w; h.u = z.u0 + s; }
			else { h.wall = z.w1; h.u = s - d1 - 0.6; }
			h.y = walls[h.wall].section.height(Math.max(0, Math.min(COURSE.span, h.u)));
			h.v = (d1 + d2) / HANDOVER.zip;
			h.grounded = true;
			if (h.t >= HANDOVER.zip) {
				placeHero(h, z.w1, HANDOVER.start);
				h.legs++;
				beginLeg(h);
				sound.go();
			}
		}
	}

	/* ---------- a hero's physics ---------- */

	function hurt(h) {
		if (h.safe > 0) return;
		const r = h.n;
		h.safe = HURT.safe;
		if (h.shield) {
			h.shield = false;
			sound.hurt();
			pop('SHIELD!', '#9fe8ff', h.wall, h.u, h.y + 2.2);
		} else if (tally[r].rings > 0) {
			const lose = Math.min(HURT.max, Math.ceil(tally[r].rings * HURT.lose));
			tally[r].rings -= lose;
			spill(h, lose);
			sound.spill();
			pop('−' + lose, '#ff3d4a', h.wall, h.u, h.y + 2.2);
		} else {
			sound.hurt();
			pop('OUCH!', '#ff3d4a', h.wall, h.u, h.y + 2.2);
		}
		show.shake = Math.max(show.shake, 0.25);
		flash(h.wall, 0.5, true);
		h.v = -h.facing * HURT.knock[0];
		h.vy = HURT.knock[1];
		h.grounded = false;
		h.hurt = true;
		h.ball = false;
		h.charging = false;
		h.sprung = false;
		h.loop = null;
	}

	// Rings thrown out of a spill: they bounce, and anyone can grab them back.
	function spill(h, n) {
		const wall = walls[h.wall];
		for (let i = 0; i < n; i++) {
			const a = Math.PI * (0.15 + 0.7 * (i + 0.5) / n);
			const sp = 4 + (i % 3) * 1.5;
			const m = buildRing(COURSE.ringSize);
			wall.group.add(m);
			wall.spill.push({ mesh: m, u: h.u, y: h.y + 1, vu: Math.cos(a) * sp * (i % 2 ? 1 : -1), vy: Math.sin(a) * sp + 2, age: 0 });
		}
	}

	function collect(h, n = 1, at) {
		tally[h.n].rings += n;
		sound.ring((h.wall - 1) * 0.8);
		if (at) sparkle(at, 0xfff2a0, 1.1);
	}

	const tmp = new THREE.Vector3();
	function physics(h, dt) {
		const sec = walls[h.wall].section;
		const b = body[h.n];
		const live = h.state === 'run';
		const desk = h.n === deskPlayer();
		const duck = live && (b.duck || (desk && keys.duck));
		const jump = live && (b.jumped || (desk && keys.jumpEdge));
		if (live) b.jumped = false;
		if (live && desk) keys.jumpEdge = false;
		h.safe = Math.max(0, h.safe - dt);

		// where he's heading: his runner's place along the wall, plus his lead
		const along = alongOf(h);
		if (live && along >= 1 - MAP.edge - 0.03) h.lead = Math.min(COURSE.span, h.lead + MAP.creep * dt);
		const target = live ? mapU(along) + h.lead : h.u;
		const want = Math.max(-RUN.top, Math.min(RUN.top, (target - h.u) * RUN.gain));

		if (h.loop) {
			// round the loop: speed bleeds on the way up, comes back down
			const L = h.loop;
			h.v = Math.max(LOOP.speed * 0.75, h.v - 9.8 * Math.sin(L.a) * dt * 0.6);
			L.a += h.v / L.r * dt;
			if (L.a >= TAU) {
				h.loop = null;
				h.u = L.l + 0.02;
				h.y = sec.height(h.u);
				h.grounded = true;
				h.lead = Math.max(h.lead, h.u - mapU(along) + 0.6);
			} else {
				h.u = L.l + Math.sin(L.a) * L.r;
				h.y = L.r - Math.cos(L.a) * L.r;
			}
		} else if (h.grounded) {
			const slope = sec.slope(h.u);
			if (h.charging) {
				h.v *= Math.exp(-dt * 12);
				h.chargeT += dt;
				const level = Math.min(1, h.chargeT / DASH.full);
				if (h.chargeT >= h.revAt) { sound.rev(level); h.revAt += 0.22; }
				if (!duck) {
					// let it go
					h.charging = false;
					h.v = h.facing * (DASH.min + (DASH.max - DASH.min) * level);
					sound.dash();
					flash(h.wall, 0.15, false);
				}
			} else if (h.ball) {
				h.v -= Math.sign(h.v) * Math.min(Math.abs(h.v), ROLL.friction * dt);
				h.v -= ROLL.slope * slope / (1 + slope * slope) * dt;
				if (Math.abs(h.v) < ROLL.stop) h.ball = false;
				h.lead = Math.max(h.lead, h.u - mapU(along));
			} else {
				if (duck) {
					// crouched: slow to a stop; curl up if he's going; rev if he's still
					if (Math.abs(h.v) >= ROLL.from) { h.ball = true; sound.roll(); }
					else {
						h.v *= Math.exp(-dt * 10);
						h.crouchT += dt;
						if (h.crouchT >= DASH.charge) { h.charging = true; h.chargeT = 0; h.revAt = 0; h.ball = true; }
					}
				} else {
					h.crouchT = 0;
					const dv = want - h.v;
					const rate = Math.sign(dv) === Math.sign(h.v) || h.v === 0 ? RUN.accel : RUN.brake;
					h.v += Math.max(-rate * dt, Math.min(rate * dt, dv));
					h.v -= RUN.slope * slope / (1 + slope * slope) * dt;
				}
			}
			if (!duck) h.crouchT = 0;
			if (jump && !h.charging) {
				h.vy = JUMP.speed;
				h.grounded = false;
				h.ball = true;
				sound.jump();
			}
			const was = h.u;
			h.u += h.v * dt;
			// a loop: in fast enough at its foot, and round he goes
			for (const L of sec.loops) {
				if (h.grounded && h.v >= LOOP.min && was < L.u && h.u >= L.u) {
					h.loop = { l: L.u, r: L.r, a: 0 };
					h.u = L.u;
					h.v = Math.max(h.v, LOOP.speed);
				}
			}
			if (h.grounded && !h.loop) h.y = sec.height(h.u);
		} else {
			// in the air
			h.vy -= JUMP.gravity * dt;
			if (!h.hurt && live) h.v += Math.max(-RUN.air * dt, Math.min(RUN.air * dt, want - h.v));
			h.u += h.v * dt;
			h.y += h.vy * dt;
			const ground = sec.height(h.u);
			if (h.y <= ground && h.vy <= 0) {
				h.y = ground;
				h.vy = 0;
				h.grounded = true;
				h.hurt = false;
				h.sprung = false;
				h.ball = duck && Math.abs(h.v) >= ROLL.from;
			}
		}

		// the left end of the stretch is a wall; the right end is the checkpoint
		if (h.u < 0.4) { h.u = 0.4; h.v = Math.max(0, h.v); h.lead = Math.max(h.lead, 0.4 - mapU(along)); }
		if (h.state !== 'run' && h.u > COURSE.checkpoint - 0.2) { h.u = COURSE.checkpoint - 0.2; h.v = Math.min(0, h.v); }
		if (Math.abs(h.v) > 0.3 && !h.charging && !h.hurt) h.facing = Math.sign(h.v);
		else if (live && !h.charging && Math.abs(target - h.u) > 0.4 && h.grounded) h.facing = Math.sign(target - h.u);

		if (live && h.u >= COURSE.checkpoint) { checkpoint(h); return; }
		if (live) touch(h, sec);
	}

	// Did he touch anything? (Rings, robots and monitors are shared: whoever
	// gets there first; they come back after a while for the next one.)
	function touch(h, sec) {
		const ball = h.ball || h.loop;
		const cy = h.y + (h.ball ? 0.55 : 0.95) * HERO.scale;   // (his middle)
		for (const it of sec.items) {
			if (!it.alive) continue;
			const du = it.u - h.u;
			if (it.type === 'ring') {
				if (du * du + (it.y - cy) * (it.y - cy) < 0.5 * 0.5) {
					take(it, RESPAWN.ring);
					collect(h, 1, it.mesh.getWorldPosition(tmp));
				}
			} else if (it.type === 'spikes') {
				if (Math.abs(du) < it.half + 0.3 && h.y - it.y < 0.55 && !h.loop) hurt(h);
			} else if (it.type === 'spring') {
				if (Math.abs(du) < 0.55 && h.y - it.y < 0.6 && (h.grounded || h.vy <= 0) && !h.loop) {
					h.vy = SPRING;
					h.grounded = false;
					h.ball = false;
					h.charging = false;
					h.sprung = true;
					it.squash = 1;
					sound.spring();
				}
			} else if (it.type === 'monitor') {
				const over = Math.abs(du) < it.half + 0.25 && h.y - it.y < it.tall + 0.1;
				if (!over) continue;
				if (ball || (!h.grounded && h.vy < 0 && h.y - it.y > it.tall * 0.6)) {
					take(it, RESPAWN.other);
					const at = it.mesh.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.6, 0));
					sparkle(at, 0xffffff, 3);
					sound.monitor();
					if (!h.grounded) { h.vy = Math.max(h.vy, JUMP.bounce * 0.8); }
					if (it.kind === 'shield') {
						h.shield = true;
						pop('SHIELD!', '#9fe8ff', h.wall, it.u, it.y + 2);
					} else {
						for (let i = 0; i < SCORE.monitor; i++) stage.timeout(() => collect(h, 1), i * 60);
						pop('+' + SCORE.monitor, '#ffd23a', h.wall, it.u, it.y + 2);
					}
				} else if (h.grounded) {
					// solid: he bumps up against it
					h.u = it.u - Math.sign(du || 1) * (it.half + 0.25);
					h.v = 0;
				}
			} else if (it.type === 'gearhog' || it.type === 'drone') {
				const by = it.type === 'drone' ? it.y : it.y + 0.7;
				const dy = by - cy;
				if (du * du + dy * dy > 0.75 * 0.75) continue;
				if (ball || (!h.grounded && h.vy < 0 && cy > by)) {
					// popped
					take(it, RESPAWN.other);
					tally[h.n].bots++;
					sparkle(it.mesh.getWorldPosition(new THREE.Vector3()), 0xffffff, 3);
					sparkle(it.mesh.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.5, 0)), 0xffd23a, 2);
					sound.pop();
					show.shake = Math.max(show.shake, 0.15);
					pop('+' + SCORE.bot, colourOf(h.n), h.wall, it.u, by + 1.2);
					if (!h.grounded) h.vy = JUMP.bounce;
				} else hurt(h);
			}
		}
		// the spilled rings, once they've had a moment
		const wall = walls[h.wall];
		for (const s of wall.spill) {
			if (s.age < 0.6 || s.gone) continue;
			const du = s.u - h.u;
			const dy = s.y - cy;
			if (du * du + dy * dy < 0.45 * 0.45) {
				s.gone = true;
				collect(h, 1, s.mesh.getWorldPosition(tmp));
			}
		}
	}

	// Taken: gone for a while, then back (with a sparkle) for whoever's next.
	function take(it, seconds) {
		it.alive = false;
		it.mesh.visible = false;
		it.back = seconds;
	}

	/* ---------- every frame ---------- */

	let clock = 0;
	let acc = 0;
	const STEP = 1 / 120;

	function simulate(dt) {
		clock += dt;
		for (const f of flashes) f.v *= Math.exp(-dt * 5);

		if (count) for (let i = 0; i < count; i++) readBody(i, dt);
		for (const h of heroes) if (h.state !== 'idle' && h.state !== 'over') stepHero(h, dt);

		// the heroes, in small fixed steps
		acc += dt;
		let n = 0;
		while (acc >= STEP && n < 12) {
			acc -= STEP;
			n++;
			for (const h of heroes) if (h.state !== 'zip') physics(h, STEP);
		}
		if (n) keys.jumpEdge = false;
		if (n >= 12) acc = 0;

		for (const h of heroes) poseHero(h, dt);

		// the things on each stretch come alive
		for (let w = 0; w < 3; w++) {
			const wall = walls[w];
			const sec = wall.section;
			for (const it of sec.items) {
				if (!it.alive) {
					// taken: back after a while
					if (it.back !== undefined && (it.back -= dt) <= 0) {
						it.alive = true;
						it.mesh.visible = true;
						it.back = undefined;
						sparkle(it.mesh.getWorldPosition(new THREE.Vector3()), 0xffffff, 1.2);
					}
					continue;
				}
				if (it.type === 'ring') {
					it.spin += dt * 3;
					it.mesh.rotation.y = it.spin;
				} else if (it.type === 'gearhog') {
					it.u += it.dir * it.speed * dt;
					if (Math.abs(it.u - it.u0) > it.range) { it.u = it.u0 + Math.sign(it.u - it.u0) * it.range; it.dir = -it.dir; }
					it.y = sec.height(it.u);
					it.mesh.position.set(it.u - HALF, GROUND + it.y, -COURSE.depth);
					it.mesh.rotation.y = facingYaw(it.dir, 0.5);
					it.mesh.rotation.z = -sec.slope(it.u) * 0.5 * it.dir;
					it.mesh.userData.gear.rotation.y += dt * 6;
				} else if (it.type === 'drone') {
					it.phase += dt;
					const was = it.u;
					it.u = it.u0 + Math.sin(it.phase * 0.8) * it.range;
					it.y = it.y0 + Math.sin(it.phase * 2.3) * 0.25;
					it.mesh.position.set(it.u - HALF, GROUND + it.y, -COURSE.depth);
					it.mesh.rotation.y = facingYaw(it.u >= was ? 1 : -1, 0.5);
					it.mesh.userData.rotor.rotation.y += dt * 30;
				} else if (it.type === 'spring') {
					it.squash = Math.max(0, it.squash - dt * 4);
					const cap = it.mesh.userData.cap;
					cap.position.y = 0.5 + Math.sin(it.squash * Math.PI * 3) * it.squash * 0.25;
					it.mesh.userData.coil.scale.y = cap.position.y / 0.5;
				}
			}
			// the checkpoint post spins when it's hit
			const cp = sec.checkpoint;
			cp.spin *= Math.exp(-dt * 1.6);
			cp.mesh.userData.arm.rotation.z += cp.spin * dt;
			// spilled rings bounce, blink and go
			for (const s of wall.spill) {
				s.age += dt;
				s.vy -= JUMP.gravity * 0.7 * dt;
				s.u += s.vu * dt;
				s.y += s.vy * dt;
				if (s.u < 0.3 || s.u > COURSE.span - 0.3) { s.vu = -s.vu; s.u = Math.max(0.3, Math.min(COURSE.span - 0.3, s.u)); }
				const floor = sec.height(s.u) + COURSE.ringSize;
				if (s.y < floor) { s.y = floor; s.vy = Math.abs(s.vy) * 0.6; s.vu *= 0.8; }
				s.mesh.position.set(s.u - HALF, GROUND + s.y, -COURSE.depth + 0.2);
				s.mesh.rotation.y += dt * 8;
				s.mesh.visible = !s.gone && !(s.age > HURT.linger - 1 && Math.floor(s.age * 12) % 2);
			}
			for (const s of wall.spill.filter((s) => s.gone || s.age > HURT.linger)) {
				wall.group.remove(s.mesh);
				wall.spill.splice(wall.spill.indexOf(s), 1);
			}
			// a stretch left behind: once nobody's on it, it sinks and rises anew
			// (if someone arrives first, it stays as it is)
			if (wall.swap) {
				const sw = wall.swap;
				const busy = heroes.some((h) => h.wall === w || (h.state === 'zip' && h.zip.w1 === w));
				sw.t += dt;
				if (!sw.built && busy) {
					sec.group.position.y = 0;
					sw.t = Math.min(sw.t, 0);
				} else if (sw.t > 0 && !sw.built) {
					sec.group.position.y = -Math.pow(Math.min(1, sw.t / REBUILD.sink), 2) * 7;
					if (sw.t >= REBUILD.sink) {
						wall.group.remove(sec.group);
						sec.dispose();
						wall.section = newSection(w, false);
						wall.section.group.position.y = -7;
						sw.built = true;
						sw.t = 0;
					}
				} else if (sw.built) {
					const e = Math.min(1, sw.t / REBUILD.rise);
					wall.section.group.position.y = -7 * Math.pow(1 - e, 3);
					if (e >= 1) { wall.section.group.position.y = 0; wall.swap = null; }
				}
			}
		}
		waterTex.offset.y = (waterTex.offset.y + dt * 1.6) % 1;
		for (const w of walls) w.cliff.userData.spray.scale.x = 1 + Math.sin(clock * 9) * 0.08;

		// sparkles, words
		for (const s of sparks) {
			s.age += dt;
			const e = s.age / s.life;
			s.sprite.scale.setScalar(s.size * (0.6 + e * 1.2));
			s.sprite.material.opacity = 1 - e;
			s.sprite.material.rotation += dt * 4;
		}
		for (const s of sparks.filter((s) => s.age >= s.life)) {
			scene.remove(s.sprite);
			s.sprite.material.dispose();
			sparks.splice(sparks.indexOf(s), 1);
		}
		for (const p of pops) p.age += dt;
		for (let i = pops.length - 1; i >= 0; i--) if (pops[i].age > 1.1) pops.splice(i, 1);

		world.update(clock, eye);
		sound.tick();
	}

	// The yaw that turns a model (facing -z) to run along +x (dir 1) or -x,
	// turned a little toward the room.
	function facingYaw(dir, turn) {
		const fx = dir * Math.cos(turn);
		const fz = Math.sin(turn);
		return Math.atan2(-fx, -fz);
	}

	function poseHero(h, dt) {
		const m = h.model;
		h.holder.rotation.y = YAW[h.wall];
		m.root.position.set(h.u - HALF, GROUND + h.y, -h.depth);
		h.turn += ((h.loop ? 0 : HERO.turn) - h.turn) * Math.min(1, dt * 10);
		const goal = facingYaw(h.facing, h.turn);
		let d = goal - h.yaw;
		d = Math.atan2(Math.sin(d), Math.cos(d));
		h.yaw += d * Math.min(1, dt * 14);
		m.root.rotation.y = h.yaw;
		const sec = walls[h.wall].section;
		if (h.loop) m.lean.rotation.x = h.loop.a;
		else if (h.grounded && h.state !== 'zip') m.lean.rotation.x += (h.facing * Math.atan(sec.slope(h.u)) - m.lean.rotation.x) * Math.min(1, dt * 12);
		else m.lean.rotation.x *= Math.exp(-dt * 8);
		const pace = Math.min(1, Math.abs(h.v) / RUN.top);
		const b = body[h.n];
		const ducking = b && (b.duck || (h.n === deskPlayer() && keys.duck));
		let mode = 'run';
		let spin = 0;
		if (h.state === 'zip') { mode = 'ball'; spin = 50; }
		else if (h.charging) { mode = 'ball'; spin = 20 + Math.min(1, h.chargeT / DASH.full) * 40; }
		else if (h.hurt) mode = 'hurt';
		else if (h.sprung) mode = 'spring';
		else if (h.ball) { mode = 'ball'; spin = 14 + Math.abs(h.v) * 4; }
		else if (h.grounded && h.state === 'run' && ducking) mode = 'crouch';
		else if (h.state !== 'run' && h.state !== 'over') mode = 'idle';
		m.pose(dt, mode, pace, spin * (h.facing || 1), clock + h.n);
		m.bubble.visible = h.shield;
		if (h.shield) m.bubble.scale.setScalar(1 + Math.sin(clock * 6) * 0.04);
		// blinking while he's safe after a knock
		m.root.visible = !(h.safe > 0 && !h.hurt && Math.floor(clock * 16) % 2);
	}

	function render() {
		// (one shadow pass, then all three walls into one HDR frame, then bloom and tone mapping)
		postfx.render(cams.map((cam, w) => viewport(cam, w * W, 0, W, H)));
	}

	/* ---------- the 2D layer ---------- */

	// Where a world point shows on wall w (or null if it's off that wall).
	const pv = new THREE.Vector3();
	function onWall(v, w) {
		pv.copy(v).project(cams[w]);
		if (pv.z > 1 || Math.abs(pv.x) > 1.2 || Math.abs(pv.y) > 1.2) return null;
		return { x: w * W + (pv.x + 1) / 2 * W, y: (1 - pv.y) / 2 * H };
	}
	const FONT = 'Lexend';
	const label = (ctx, text, x, y, size, fill, extra = {}) => art.text(ctx, text, x, y, Object.assign({ size, font: FONT, weight: 500, fill, outline: '#0a1a3a', outlineWidth: Math.max(4, size * 0.12) }, extra));

	function overlay(ctx) {
		// words over the course
		for (const p of pops) {
			const at = onWall(worldOf(p.wall, p.u, p.y), p.wall);
			if (!at) continue;
			const e = p.age / 1.1;
			label(ctx, p.text, at.x, at.y - e * 80, 56 * (e < 0.15 ? e / 0.15 : 1), p.colour, { alpha: 1 - Math.max(0, e - 0.6) / 0.4 });
		}
		// a dash's white, a knock's red, over the wall it happened on
		flashes.forEach(function (f, w) {
			if (f.v > 0.02) art.rect(ctx, w * W, 0, W, H, { fill: f.red ? `rgba(255,50,70,${f.v * 0.3})` : `rgba(255,255,255,${f.v * 0.45})` });
		});
		// speed streaks behind anyone flying
		for (const h of heroes) {
			if (!(Math.abs(h.v) > RUN.top * 0.8 || h.state === 'zip')) continue;
			const at = onWall(h.model.root.getWorldPosition(tmp).add(pv.set(0, 0.5, 0)), h.wall);
			if (!at) continue;
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			ctx.lineCap = 'round';
			for (let i = 0; i < 5; i++) {
				const y = at.y - 50 + i * 22 + Math.sin(clock * 40 + i + h.n) * 4;
				const len = 90 + ((i * 53) % 60);
				const dir = -Math.sign(h.v || 1);
				ctx.strokeStyle = `rgba(255,255,255,${0.35 - i * 0.04})`;
				ctx.lineWidth = 5 - i * 0.5;
				ctx.beginPath();
				ctx.moveTo(at.x + dir * 40, y);
				ctx.lineTo(at.x + dir * (40 + len), y);
				ctx.stroke();
			}
			ctx.restore();
		}
	}

	// The run's words: each hero's tag, GO!, where to stand.
	function runOverlay(ctx) {
		if (!count) return;
		// each hero's tag, in their colour, with the lap they're on
		for (const h of heroes) {
			if (h.state === 'zip' || h.state === 'over') continue;
			const at = onWall(h.model.root.getWorldPosition(tmp).add(pv.set(0, 2.4 * HERO.scale, 0)), h.wall);
			if (at) label(ctx, 'P' + (h.n + 1), at.x, at.y - 20 + Math.sin(clock * 4 + h.n) * 5, 40, colourOf(h.n));
		}
		show.onWalls(ctx, function (c, w) {
			// (a line each for the heroes on this wall who are starting)
			const here = heroes.filter((h) => h.wall === w && (h.state === 'banner' || h.state === 'wait'));
			here.forEach(function (h, i) {
				const y = 260 + i * 130;
				const colour = colourOf(h.n);
				if (h.state === 'banner') {
					show.slam(c, `PLAYER ${h.n + 1}, GO!`, W / 2, y, here.length > 1 ? 100 : 140, h.t, { fill: colour, glow: colour });
				} else {
					const pulse = 1 + Math.sin(clock * 6 + h.n) * 0.05;
					c.save();
					c.translate(W / 2, y);
					c.scale(pulse, pulse);
					show.text(c, `PLAYER ${h.n + 1}: START AT THE LEFT ◀`, 0, 0, 64, { fill: colour });
					c.restore();
				}
			});
			// the moves, once, at the start
			const first = heroes.find((h) => h.wall === w && h.legs === 0 && (h.state === 'banner' || (h.state === 'run' && h.t < 3)));
			if (first) {
				const a = first.state === 'banner' ? Math.min(1, Math.max(0, (first.t - 0.5) * 3)) : Math.min(1, (3 - first.t) * 3);
				show.text(c, 'WALK RIGHT ▶   STAND TALL TO JUMP   SQUAT TO ROLL', W / 2, 160, 42, { fill: 'white', alpha: a });
			}
		});
	}

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		simulate(show.paused ? 0 : dt * show.timeScale);   // (still while paused; slowing to a stop with TIME!)
		if (SCENE.includes(show.beat)) render();         // (the results are on the show's own backdrop)
		show.frame(ctx, dt, overlay);
	};

	/* ---------- input ---------- */

	self.setPlayers = function (players) {
		latest = players;
	};

	// At a desk: Space jumps, hold the down arrow to duck.
	function onKey(e) {
		if (e.target && e.target.tagName === 'INPUT') return;
		const down = e.type === 'keydown';
		if (e.code === 'Space') {
			if (down && !keys.jump) keys.jumpEdge = true;
			keys.jump = down;
			e.preventDefault();
		}
		if (e.code === 'ArrowDown') { keys.duck = down; e.preventDefault(); }
	}
	document.addEventListener('keydown', onKey);
	document.addEventListener('keyup', onKey);

	// For tests and the console: where the game is up to.
	self.state = function () {
		return Object.assign(show.state(), {
			heroes: heroes.map((h) => ({ n: h.n, state: h.state, wall: h.wall, legs: h.legs, u: h.u, y: h.y, v: h.v, grounded: h.grounded, ball: h.ball, charging: h.charging, loop: !!h.loop, lead: h.lead })),
			body: body.map((b) => ({ py: b.py, stand: b.stand, up: b.up, duck: b.duck })),
			tally: tally.map((t) => Object.assign({}, t)),
			scores: scores(),
			plans: walls.map((w) => w.section.plan.map((p) => p.ground + '/' + p.thing)),
		});
	};

	self.test = {
		jump(id) {
			$('showtime-picker').remove();
			if (!count) setUp(playersMeta ? playersMeta.length : 3);
			show.go(id);
		},
		timeLeft(s) { show.setTimeLeft(s); },
	};

	self.fini = function () {
		document.removeEventListener('keydown', onKey);
		document.removeEventListener('keyup', onKey);
		sound.close();
		unlisten();
		show.fini();
		world.dispose();
		postfx.dispose();
		renderer.dispose();
		renderer.forceContextLoss();
	};

	/* ---------- go ---------- */

	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
