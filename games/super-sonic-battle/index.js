/*
 * Super Sonic Battle
 *
 * Sonic stands near the edge of a big round field on a clifftop, Robotnik's
 * battle machine floating in the middle of it: a great red egg of a robot,
 * Robotnik in his Egg Mobile on top. The eye is just behind Sonic, always
 * trained on the machine; the three walls are one view (the front wall at
 * the machine, the side walls out across the field either side).
 *
 * One player at a time is Sonic (their colour on the tag over him). Stand in
 * the middle of the room. Step left or right and Sonic lines up with you:
 * in the middle quarter of the room he just steps across; further out he
 * jogs, then runs, flat out well short of the wall (his legs a whirling
 * blur, smashing straight through badniks), and the eye swings round the other way with him, so he runs a
 * great circle round the machine, the eye still on it. Step forward and he's
 * a little further from the eye (nearer the machine); back, a little nearer.
 *
 * On foot, gather the seven Chaos Emeralds scattered round the field
 * (columns of light show where), dodging the machine's missiles (a red ring
 * where each will land), its shockwaves (rolling out across the ground: run
 * for a gap), the badniks rolling round the field and the Buzz Bombers
 * that fly in, hover in view and dive at him. Any robot can be tapped (on
 * whichever wall it's on, by anyone) to smash it: points to the tapper, and
 * a few rings out of it. Rings lie in arcs round the field (and the sky):
 * they're his shield. Get hit and they scatter (grab them back quick); hit
 * with none, an emerald's knocked loose, flying off somewhere else.
 *
 * With all seven: the transformation. The emeralds whirl round him as he
 * floats up, a vortex of light, they flow into him, he lands, a flash of
 * light and fire: Super Sonic. Up into the sky he goes, strafing as before,
 * the machine throwing everything at him: fans of energy orbs aimed where
 * he's heading, homing missiles, shockwaves at his height, Buzz Bombers (a
 * hit scatters his rings, or with none leaves him reeling). Targets light
 * up on the machine; tap one (on
 * whichever wall it's on, anyone can) and he hurtles at it, straight through
 * the machine and out the other side, the eye following him through and
 * round to look back. Two or three hits (so the twelve come out right for
 * the squad) and the emeralds spill out of him, back across the field; he
 * drops back to the ground, and the next player takes over as Sonic (PLAYER
 * 2, YOU'RE SONIC!). Each round's harder: more missiles, shockwaves,
 * badniks; the targets come and go faster and further round the machine.
 *
 * Once everyone has been Sonic and the machine's been hit twelve times: the
 * finale. It shudders, bursting with explosions, and blows apart (Robotnik's
 * Egg Mobile fleeing in a trail of smoke); Super Sonic turns to us and
 * strikes a pose, everything freezes, and the logo crashes down (a stand-in
 * for the Sonic at Immersive Gamebox lockup) with a braam and an electric
 * guitar.
 *
 * Scores: emeralds, rings and badniks run down to whoever's Sonic; smashed
 * robots and hits to whoever tapped them (whoever's standing nearest the
 * spot the tap lands on).
 *
 * The show is Showtime's: the squad picker, the title drop, the clock, the
 * visor check, a tutorial (step, run, grab an emerald, tap a robot), the battle's intro,
 * the play (the transformations, dives and finale are part of it), then
 * scores, rank, team, leaderboard, replay, rating and the end (TIME UP!
 * first, if the clock runs out before the machine's beaten).
 *
 * Drawn with three.js, with gentle bloom and ACES tone mapping over all
 * three walls (lib/three/walls.js), three cameras on one rig.
 * Input: px (left and right) and pz (forward and back) for whoever's
 * Sonic, and wall taps (clicks on the stage).
 * An ES module (manifest: module: true).
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { createWallComposer, createWallRig, SkyDome } from '../../lib/three/walls.js';
import { buildSpeedster } from '../../shared/speedster3d.js';
import { buildArena, buildBoss, buildTarget, buildEmerald, buildBadnik, buildBuzzer, buildRing, buildMissile, buildWarning, buildShockwave, buildVortex,
	EMERALD_COLOURS, glowTexture, fireTexture, smokeTexture, swirlTexture, sparkleTexture, legBlurTexture } from './models.js';
import { createSound } from './sound.js';

IGB.register('super-sonic-battle', function SuperSonicBattleGame(stage, playersMeta) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;
	const TAU = Math.PI * 2;

	/* ---------- tuning ---------- */

	const GAME_SECONDS = 600;
	const FOV = 64;                                         // vertical: 90 across each 16:10 wall, so the walls meet
	const FIELD = 78;                                       // the field's radius (metres)
	const CAM = { r: 41, up: 2.4, look: 7, skyUp: 9.5, skyLook: 10.5 };   // the eye: metres from the middle, high on foot, and the height it aims at in the middle; the same as Super Sonic
	const AHEAD = { near: 6, far: 10 };                     // metres from the eye to Sonic: the controller at the back of the room, at the front
	const SPAN = 6.5;                                       // metres either side of the middle of the view he goes, the controller at the room's edge
	const STEP_ZONE = 0.125;                                // half the room's middle quarter: in it, he just steps across; out of it, he runs
	const FULL = 0.34;                                      // how far out from the middle of the room he's flat out (0.5 is the wall: flat out well short of it)
	const RUN = { top: 22, accel: 4, glide: 10, depth: 4 }; // metres a second round the circle, flat out; how quickly he gets up to speed, lines up across, and moves forward and back (per second)
	const LEGS = 1.8;                                       // how much faster than the model's own stride his legs go
	const BLUR = [0.4, 0.85];                               // the pace his legs start to blur into a whirling wheel, and are all blur
	const SMASH = 0.9;                                      // how far to flat out (0 the edge of the middle quarter, 1 flat out) he smashes straight through badniks
	const SKY = 7;                                          // Super Sonic's height
	const BOSS = { y: 10.5, turn: 1.4, spin: 0.14, spinUp: 0.05 };   // the machine's height; how fast it turns to face Sonic on foot (radians a second); its slow turning as Super Sonic, and how much faster each round
	const TOTAL_HITS = 12;                                  // hits to beat the machine (and everyone must have been Sonic)
	const HITS = { min: 2, max: 3 };                        // hits a round, worked out so the twelve come out right for the squad
	const EMERALDS = 7;
	const BAND = { lo: 31.5, hi: 34.5 };                    // how far from the middle the emeralds lie (where he can reach)
	const REACH = { emerald: 1.8, badnik: 1.2, blast: 2.6, wave: 0.8, target: 2.4, ring: 1.4 };   // metres that count as touching
	const HURT = { tumble: 0.8, safe: 2.2, knock: 6, bare: 1.6 };   // seconds tumbling, and safe after; how hard he's knocked across; how much longer he tumbles as Super Sonic with no rings to lose
	const ATTACK = { gap: 4.8, gapDown: 0.6, gapMin: 2.0, flight: 1.7, apex: 12, waveSpeed: 10, waveUp: 1.5, waveGap: 0.95, waveGaps: [4, 3], charge: 1.1 };   // seconds between attacks (and how much less each round, and the least); a missile's flight and how high it arcs; a shockwave's speed (and how much faster each round), its gaps (each one's width, radians; how many: in the first two rounds, and after), and the charge before it
	const SUPER = {                                         // the machine's attacks on Super Sonic: seconds between them (less each round, and the least);
		gap: 3.0, gapDown: 0.35, gapMin: 1.3,
		orb: { n: [3, 7], spread: 0.085, speed: 26, speedUp: 3, charge: 0.7, again: 0.5, reach: 1.25 },   // a fan of energy orbs (how many, from more each round to the most), radians apart, metres a second (faster each round), the eyes' charge before, the gap before a second fan, how near hits
		homing: { speed: 16, speedUp: 1.5, turn: 1.6, home: 3.2, life: 6, reach: 1.4 },   // homing missiles: metres a second, how fast they turn (radians a second), how long they home, live, and how near hits
	};
	const BADNIKS = { speed: 6, most: 6, tap: 1.6 };        // metres a second; the most at once (two, and one more each round); how near a tap must pass to hit one
	const BUZZ = { most: [1, 6], scale: 0.6, speed: 10, dive: 19, diveFor: 1.6, hover: [1.6, 3.2], aim: 0.8, reach: 1.4, tap: 2.0, across: 9, ahead: [11, 19], up: [1.2, 3.5] };   // Buzz Bombers: how many at once (from one on foot, one more each round and as Super Sonic, to the most); their size; metres a second flying in and diving; seconds diving, hovering, and flashing their stinger first; how near hits him, and how near a tap must pass; where they hover (metres across the view, ahead of the eye, above him)
	const RINGS = { keep: 36, arc: [5, 8], gap: 2.4, up: 0.7, spill: 16, life: 3.2, grab: 0.4, drop: 4 };   // rings out at once; how many to an arc, metres apart, how high; how many scatter when he's hit, how long they last, how soon he can grab them back; how many a smashed minion drops
	const TARGET = { life: 6, lifeDown: 0.8, lifeMin: 2.6, gap: 0.9, first: 1.0 };   // seconds a target stays lit (less each round), the pause between, and before the first
	const POINTS = { emerald: 10, badnik: 5, hit: 50, minion: 10, ring: 1 };
	const TF = { face: 0.6, rise: [0.3, 1.6], spin: [0.5, 3.0], merge: [3.0, 4.0], drop: [4.0, 4.35], land: 4.35, sky: [4.9, 6.4], length: 6.6 };   // the transformation's beats (seconds)
	const DIVE = { wind: 0.3, hit: 0.85, through: 1.35, turn: 2.7, slow: 0.35, slowBy: 0.25, past: 16 };   // the dive's beats; the slow motion at the hit (how long, how slow); metres past the target he comes out
	const SPILL = { burst: 0.25, fall: [0.6, 1.6], length: 2.3, flight: 1.6 };   // the emeralds bursting out of him
	const HAND = { min: 2.8, max: 6, zone: 0.16 };          // the hand-over: at least this long, at most; how near the middle of the room counts
	const FIN = { pops: 3.2, swing: [4.4, 6.4], freeze: 7.2, logo: 7.8, guitar: 8.1, length: 15 };   // the finale's beats: the machine bursting, blowing apart, the eye swinging round to Super Sonic, the freeze, the logo, the guitar, the end

	/* ---------- renderer, scene, cameras ---------- */

	const renderer = new THREE.WebGLRenderer({ antialias: false });   // (the composer multisamples)
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.05;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	$(renderer.domElement).css({ position: 'absolute', left: 0, top: 0, width: WIDTH + 'px', height: H + 'px' }).appendTo(stage.$bg);

	let k = 1;
	let postfx = null;
	function resize() {
		k = Math.min(IGB.scale * IGB.pixelRatio, 1);
		renderer.setPixelRatio(1);
		renderer.setSize(Math.round(WIDTH * k), Math.round(H * k), false);
		if (postfx) postfx.setSize();
	}
	const unlisten = IGB.onResize(resize);
	resize();

	const scene = new THREE.Scene();
	const HORIZON = new THREE.Color(0xbfe4ff);
	scene.fog = new THREE.Fog(HORIZON, 120, 900);

	// a bright blue sky, the sun high on one side; the same GLSL lights the scene
	const SUN = new THREE.Vector3(0.45, 0.62, 0.64).normalize();
	const sky = new SkyDome(/* glsl */`
		uniform vec3 sunDir;
		vec3 skyColor(vec3 d) {
			float y = d.y;
			vec3 zenith = vec3(0.16, 0.42, 0.95);
			vec3 horizon = vec3(0.78, 0.90, 1.0);
			vec3 col = y > 0.0 ? mix(horizon, zenith, pow(smoothstep(0.0, 0.8, y), 0.7)) : mix(horizon, vec3(0.15, 0.45, 0.75), clamp(-y * 4.0, 0.0, 1.0));
			float s = max(dot(d, sunDir), 0.0);
			col += vec3(1.0, 0.9, 0.7) * pow(s, 8.0) * 0.35;
			return pow(col, vec3(2.2));
		}
		#define SKY_EXTRA
		vec3 skyExtra(vec3 d) { return vec3(1.0, 0.95, 0.85) * smoothstep(0.9990, 0.9995, dot(d, sunDir)) * 10.0; }
	`, { sunDir: { value: SUN } }, 1200);
	scene.add(sky);
	scene.environment = sky.environment(renderer);

	scene.add(new THREE.HemisphereLight(0xd8ecff, 0x4a7a3a, 0.8));
	const sun = new THREE.DirectionalLight(0xfff2dc, 2.8);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 260 });
	sun.shadow.camera.updateProjectionMatrix();
	sun.shadow.bias = -0.0005;
	sun.shadow.normalBias = 0.04;
	sun.position.copy(SUN).multiplyScalar(120);
	scene.add(sun, sun.target);

	postfx = createWallComposer(renderer, scene, { strength: 0.3, radius: 0.45, threshold: 1.0, cap: 2.0 });   // (gentle: a glow, not a haze)

	const walls = createWallRig({ fov: FOV, aspect: W / H, near: 0.1, far: 2500 });
	scene.add(walls.rig);
	const cams = walls.cameras;   // left, front, right

	/* ---------- the world ---------- */

	const TEX = { glow: glowTexture(), fire: fireTexture(), smoke: smokeTexture(), swirl: swirlTexture(), sparkle: sparkleTexture() };
	scene.add(buildArena(FIELD, renderer.capabilities.getMaxAnisotropy()));

	const boss = buildBoss();
	boss.root.position.set(0, BOSS.y, 0);
	scene.add(boss.root);

	// Sonic, and Super Sonic (the one shown at a time), riding one group
	const hero = new THREE.Group();
	scene.add(hero);
	const sonicM = buildSpeedster(0x2f6cf0);
	const superM = buildSpeedster(0xffc21a, { kind: 'super' });
	hero.add(sonicM.root, superM.root);
	superM.root.visible = false;
	// the blur of his legs flat out: a whirling wheel either side of him at
	// his hips, side on (one over each leg, so it hides them from either side)
	const legBlurMat = new THREE.MeshBasicMaterial({ map: legBlurTexture(), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
	const legBlur = new THREE.Group();
	legBlur.position.set(0, 0.32, -0.02);
	for (const side of [-1, 1]) {
		const disc = new THREE.Mesh(new THREE.CircleGeometry(0.47, 40), legBlurMat);
		disc.rotation.y = Math.PI / 2;
		disc.position.x = side * 0.25;
		disc.renderOrder = 2;
		legBlur.add(disc);
	}
	sonicM.lean.add(legBlur);
	const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(0xffd040).multiplyScalar(1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
	aura.position.y = 0.6;
	aura.visible = false;
	hero.add(aura);
	const auraLight = new THREE.PointLight(0xffc84a, 0, 14, 1.6);
	auraLight.position.y = 0.8;
	hero.add(auraLight);
	// a ring of the controller's colour round his feet
	const tagRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
	tagRing.rotation.x = -Math.PI / 2;
	tagRing.position.y = 0.05;
	hero.add(tagRing);
	const vortex = buildVortex(TEX.swirl);
	vortex.visible = false;
	scene.add(vortex);

	const emeralds = EMERALD_COLOURS.slice(0, EMERALDS).map(function (colour, i) {
		const mesh = buildEmerald(colour, TEX.glow);
		scene.add(mesh);
		return { i, colour, mesh, state: 'field', pos: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, flight: 1, spin: Math.random() * TAU };
	});
	let held = [];   // the emeralds he has, in the order he got them

	/* ---------- the show ---------- */

	const SONIC_FONT = 'Nise Sega Sonic';
	const sound = createSound();
	let count = 0;
	let scores = [];
	let latest = [];
	const show = new Showtime(stage, {
		id: 'super-sonic-battle',
		font: SONIC_FONT,
		seconds: GAME_SECONDS,
		players: () => count,
		scores: () => scores,
		music: false,
		theme: { accent: '#ffb81a', accent2: '#3cd6ff', gold: '#ffe14a', ink: '#0a1a3a', sky: ['#04163a', '#0b4f8a'], glow: 'rgba(255,200,60,0.35)' },
		rivals: ['Chaos Crew', 'Emerald Hunters', 'Egg Smashers', 'Super Squad', 'Golden Rings', 'Blue Blurs',
			'Death Egg Busters', 'Hedgehog Heroes', 'The Spindashers', 'Sky Sanctuary'],
	});

	// the state of play
	let phase = 'wait';     // wait (the opening screens), ground (on foot), transform, super, dive, spill, handover, finale, over
	let phaseT = 0;
	let clock = 0;
	let t = 0;               // seconds into the tutorial and play (for the replay)
	let level = 0;           // the round (0 the first): harder each one
	let hits = 0;            // the machine's been hit this many times
	let roundHits = 0;       // ... this round
	let roundNeed = 3;       // hits this round before the emeralds spill
	let ctrl = 0;            // who's Sonic
	let turns = [];          // how many turns each has had as Sonic
	let armed = false;       // the machine attacking (in the play, on foot)
	let shake = 0;
	let flash = 0;
	let redFlash = 0;
	let slowmo = 0;          // the dive's slow motion, left
	let letterbox = 0;       // the cinematic bars (0..1)
	let frozen = false;      // the finale's freeze-frame
	let superCount = 0;      // how many times he's gone super
	let waves = 0;           // shockwaves so far (the first ones say what to do)

	/* ---------- Sonic ---------- */

	const v3 = () => new THREE.Vector3();
	const so = {
		theta: 0,             // the eye's angle round the middle (sin, cos: x, z)
		v: 0,                 // speed round the circle (metres a second, + to the right)
		lat: 0,               // across the view, metres (+ right)
		ahead: 8,             // metres ahead of the eye
		y: 0,
		pos: v3(), was: v3(), vel: v3(),
		yaw: 0, out: 0,
		hurt: 0, safe: 0, knock: 0,
	};
	const UP = new THREE.Vector3(0, 1, 0);

	// The eye's ground spot at angle a, the way it faces (to the middle), and its right.
	const eyeAt = (a, out) => out.set(Math.sin(a) * CAM.r, 0, Math.cos(a) * CAM.r);
	const fwdAt = (a, out) => out.set(-Math.sin(a), 0, -Math.cos(a));
	const rightAt = (a, out) => out.set(Math.cos(a), 0, -Math.sin(a));
	// Where Sonic is for an eye at angle a, lat across and ahead in front, y up.
	const P1 = v3(), P2 = v3();
	function placeFor(a, lat, ahead, y, out) {
		eyeAt(a, out).addScaledVector(fwdAt(a, P1), ahead).addScaledVector(rightAt(a, P2), lat);
		out.y = y;
		return out;
	}

	// The controller's place in the room (the middle if they're not seen).
	function ctrlAt() {
		const p = latest[ctrl];
		return { px: p && p.px !== undefined ? Math.max(0, Math.min(1, p.px)) : 0.5, pz: p && p.pz !== undefined ? Math.max(0, Math.min(1, p.pz)) : 0.5, seen: !!(p && p.px !== undefined) };
	}

	const angleTo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
	const yawTo = (dx, dz) => Math.atan2(-dx, -dz);   // (the models face -z)
	const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
	const between = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
	const rand = (a, b) => a + Math.random() * (b - a);

	// On foot or in the sky: following the controller (lined up across, round
	// the circle when they're out of the middle quarter, forward and back).
	function steer(dt, canMove) {
		const c = ctrlAt();
		const dx = canMove ? c.px - 0.5 : 0;
		so.out = Math.min(1, Math.max(0, Math.abs(dx) - STEP_ZONE) / (FULL - STEP_ZONE));
		const want = Math.sign(dx) * RUN.top * (0.35 * so.out + 0.65 * so.out * so.out);
		so.v += (want - so.v) * Math.min(1, dt * RUN.accel);
		if (so.hurt > 0) so.v *= Math.exp(-dt * 5);
		const r = Math.max(10, Math.hypot(CAM.r - so.ahead, so.lat));
		so.theta += so.v / r * dt;
		const lat = dx * 2 * SPAN;
		if (so.hurt <= 0) so.lat += (lat - so.lat) * Math.min(1, dt * RUN.glide);
		so.lat += so.knock * dt;
		so.knock *= Math.exp(-dt * 4);
		so.lat = Math.max(-SPAN - 2, Math.min(SPAN + 2, so.lat));
		if (canMove) so.ahead += (AHEAD.near + (AHEAD.far - AHEAD.near) * c.pz - so.ahead) * Math.min(1, dt * RUN.depth);
	}

	// Where he is, which way he faces, and how he moves.
	function poseHero(dt, opts = {}) {
		so.was.copy(so.pos);
		placeFor(so.theta, so.lat, so.ahead, so.y, so.pos);
		hero.position.copy(so.pos);
		if (dt > 0) so.vel.subVectors(so.pos, so.was).divideScalar(dt);
		const speed = Math.hypot(so.vel.x, so.vel.z);
		const m = superM.root.visible ? superM : sonicM;
		let want = opts.yaw;
		if (want === undefined) want = speed > 1.4 ? yawTo(so.vel.x, so.vel.z) : yawTo(-so.pos.x, -so.pos.z);
		so.yaw += angleTo(so.yaw, want) * Math.min(1, dt * 10);
		hero.rotation.y = so.yaw;
		if (opts.mode) {
			m.animate(dt, opts.mode, opts.pace || 0, opts.spin || 30, clock);
			return;
		}
		m.lean.rotation.set(0, 0, 0);
		m.lean.position.y = 0;
		legBlurMat.opacity = 0;
		if (so.hurt > 0) {
			const kk = 1 - Math.min(1, so.hurt / HURT.tumble);
			m.animate(dt, 'hurt', 0, 0, clock);
			m.lean.rotation.x = kk * TAU;
			m.lean.position.y = Math.sin(Math.PI * kk) * 1.3;
			return;
		}
		if (superM.root.visible) {
			// in the sky: laid flat, flying, when he's going; upright, hovering, when not
			const fly = Math.min(1, speed / 8);
			m.lean.rotation.x = -1.25 * fly;
			m.lean.rotation.z = so.v / RUN.top * 0.5;
			m.animate(dt, fly > 0.3 ? 'glide' : 'idle', 0, 0, clock);
			return;
		}
		const pace = Math.min(1, speed / RUN.top);
		m.lean.rotation.z = so.v / RUN.top * 0.3;   // (into the curve)
		m.animate(dt * LEGS, 'run', speed < 0.6 ? 0 : 0.12 + pace * 0.88, 30, clock);
		// flat out, his legs a whirling blur
		legBlurMat.opacity = 0.95 * ease(between(pace, BLUR[0], BLUR[1]));
		for (const disc of legBlur.children) disc.rotation.z -= dt * (20 + pace * 40);
	}
	const flatOut = () => phase === 'ground' && so.hurt <= 0 && so.out >= SMASH && Math.abs(so.v) > RUN.top * 0.6;

	function setSuper(on) {
		superM.root.visible = on;
		sonicM.root.visible = !on;
		aura.visible = on;
		auraLight.intensity = on ? 40 : 0;
	}

	/* ---------- effects ---------- */

	const fx = [];       // sprites: { sprite, age, life, size, grow, vel, drag, fade }
	const debris = [];   // { obj, vel, spin, age, life }
	const pops = [];     // words: { text, colour, at, age, size }
	const marks = [];    // tap marks on the walls: { x, y, colour, age }

	function sprite(tex, at, colour, size, life, o = {}) {
		const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(colour).multiplyScalar(o.bright || 1), transparent: true, depthWrite: false, blending: o.normal ? THREE.NormalBlending : THREE.AdditiveBlending, opacity: o.opacity || 1 }));
		s.position.copy(at);
		s.scale.setScalar(size);
		s.material.rotation = Math.random() * TAU;
		scene.add(s);
		fx.push({ sprite: s, age: 0, life, size, grow: o.grow === undefined ? 1.5 : o.grow, vel: o.vel ? o.vel.clone() : null, drag: o.drag || 0, rise: o.rise || 0, spin: o.spin || 0, fadeIn: o.fadeIn || 0, opacity: o.opacity || 1 });
		return s;
	}
	const sparkle = (at, colour = 0xffffff, size = 2.2) => sprite(TEX.sparkle, at, colour, size, 0.45, { bright: 2.2, spin: 4 });
	const fireball = (at, size, life = 0.8, vel) => sprite(TEX.fire, at, 0xffffff, size, life, { bright: 1.6, grow: 1.8, vel, drag: 2, spin: 1 });
	const puff = (at, size, life = 1.6, vel) => sprite(TEX.smoke, at, 0x6a6a72, size, life, { normal: true, opacity: 0.7, grow: 2.2, vel, drag: 1, rise: 1.5, spin: 0.5 });

	// A blast: fire, smoke and sparks at a spot.
	function blast(at, size = 3) {
		fireball(at, size, 0.7);
		for (let i = 0; i < 4; i++) fireball(tmp.copy(at).add(v3().set(rand(-1, 1), rand(-0.5, 1), rand(-1, 1)).multiplyScalar(size * 0.4)), size * rand(0.5, 0.8), rand(0.5, 0.9), v3().set(rand(-4, 4), rand(1, 6), rand(-4, 4)));
		for (let i = 0; i < 3; i++) puff(tmp.copy(at).add(v3().set(rand(-1, 1), rand(0, 1), rand(-1, 1)).multiplyScalar(size * 0.4)), size * 0.9, rand(1.2, 2), v3().set(rand(-1.5, 1.5), rand(1, 3), rand(-1.5, 1.5)));
		sparkle(at, 0xffe0a0, size * 1.4);
	}

	function pop(text, colour, at, size = 70) { pops.push({ text, colour, at: at.clone(), age: 0, size }); }

	/* ---------- the emeralds ---------- */

	// A spot on the field he can reach: at angle a (round the middle), in the band.
	function fieldSpot(a, out) {
		const r = rand(BAND.lo, BAND.hi);
		return out.set(Math.sin(a) * r, 1.1, Math.cos(a) * r);
	}
	const sonicAngle = () => Math.atan2(so.pos.x, so.pos.z);

	// All seven back out on the field, spread round it (none right where he is).
	function scatterEmeralds() {
		held = [];
		const base = sonicAngle() + 0.5;
		const order = emeralds.map((e) => e.i).sort(() => Math.random() - 0.5);
		order.forEach(function (n, j) {
			const e = emeralds[n];
			e.state = 'field';
			fieldSpot(base + (j + 0.5) / EMERALDS * (TAU - 1) + rand(-0.2, 0.2), e.pos);
			e.mesh.position.copy(e.pos);
			e.mesh.visible = true;
			e.mesh.userData.beam.visible = true;
		});
	}

	// Flying from somewhere to a new spot on the field (knocked loose, spilled).
	function flyEmerald(e, from, a, flight) {
		e.state = 'flying';
		e.from.copy(from);
		fieldSpot(a, e.to);
		e.t = 0;
		e.flight = flight;
		e.mesh.visible = true;
		e.mesh.userData.beam.visible = false;
	}

	function stepEmeralds(dt) {
		for (const e of emeralds) {
			e.spin += dt * 2.4;
			const ud = e.mesh.userData;
			ud.gem.rotation.y = e.spin;
			ud.halo.material.opacity = 0.7 + Math.sin(clock * 4 + e.i) * 0.25;
			if (e.state === 'field') {
				e.mesh.position.set(e.pos.x, e.pos.y + Math.sin(clock * 2 + e.i) * 0.2, e.pos.z);
				if (phase === 'ground' && so.hurt <= 0 && so.y < 2 && Math.hypot(e.pos.x - so.pos.x, e.pos.z - so.pos.z) < REACH.emerald) take(e);
			} else if (e.state === 'flying') {
				e.t += dt;
				const kk = Math.min(1, e.t / e.flight);
				e.mesh.position.lerpVectors(e.from, e.to, kk);
				e.mesh.position.y += Math.sin(Math.PI * kk) * 9;
				ud.gem.rotation.x += dt * 9;
				if (kk >= 1) {
					e.state = 'field';
					e.pos.copy(e.to);
					ud.gem.rotation.x = 0;
					ud.beam.visible = true;
					sparkle(e.pos, e.colour, 2.4);
				}
			}
		}
	}

	function take(e) {
		e.state = 'held';
		e.mesh.visible = false;
		held.push(e.i);
		sparkle(e.pos, e.colour, 3.2);
		sound.emerald(held.length - 1, Math.max(-1, Math.min(1, so.lat / SPAN)));
		if (show.beat === 'play') score(ctrl, POINTS.emerald);
		pop(held.length + ' / ' + EMERALDS, '#' + new THREE.Color(e.colour).getHexString(), so.pos, 70);
	}

	function score(n, pts) {
		if (n === undefined || n < 0 || n >= count) return;
		scores[n] += pts;
	}

	/* ---------- the machine's attacks, and its minions ---------- */

	const missiles = [];    // falling on him, on foot: { mesh, warn, from, to, t, flight }
	const homers = [];      // homing in on Super Sonic: { mesh, pos, dir, age }
	const orbs = [];        // energy orbs at Super Sonic: { sprite, pos, vel, age }
	const shockwaves = [];  // { mesh, r, speed, gaps, charge, y }
	const badniks = [];     // rolling round the field: { mesh, theta, r, dir, run, dead }
	const buzzers = [];     // Buzz Bombers: { m, glow, state, t, pos, station, vel, dead }
	let attackIn = 3;
	let volley = null;      // energy orbs coming: { n, at, left } (the machine's eyes charging till then)
	let killed = 0;         // minions tapped to bits (for the tutorial)

	const gapFor = () => (phase === 'super' ? Math.max(SUPER.gapMin, SUPER.gap - level * SUPER.gapDown) : Math.max(ATTACK.gapMin, ATTACK.gap - level * ATTACK.gapDown));
	const planeY = () => (phase === 'super' || phase === 'dive' ? SKY : 0);   // the height he's at: the ground, or the sky
	const centre = (out) => out.set(so.pos.x, so.pos.y + 0.6, so.pos.z);     // his middle
	const canHurt = () => (phase === 'ground' || phase === 'super') && so.hurt <= 0 && so.safe <= 0;
	const sideOf = (p) => (v3().subVectors(p, so.pos).dot(rightAt(so.theta, P1)) > 0 ? -1 : 1);   // which way something knocks him (away from it)
	const panOf = () => Math.max(-1, Math.min(1, so.lat / SPAN));

	function launchMissiles(n) {
		const lead = so.vel.clone().setY(0).multiplyScalar(ATTACK.flight * 0.8);
		for (let i = 0; i < n; i++) {
			const sh = boss.shoulders[i % 2];
			const from = boss.body.localToWorld(sh.muzzle.clone());
			const to = so.pos.clone().setY(0).add(lead);
			if (i > 0) to.add(v3().set(rand(-1, 1), 0, rand(-1, 1)).normalize().multiplyScalar(rand(2.5, 5)));
			const mesh = buildMissile(TEX.fire);
			mesh.position.copy(from);
			scene.add(mesh);
			const warn = buildWarning();
			warn.position.set(to.x, 0.06, to.z);
			warn.scale.setScalar(REACH.blast);
			scene.add(warn);
			missiles.push({ mesh, warn, from, to, t: -i * 0.18, flight: ATTACK.flight + i * 0.1 });
		}
		sound.launch();
		sound.warn();
	}

	// A shockwave rolling out from the machine at height y (the ground, or
	// Super Sonic's sky), gaps spread round it to run for (none right where he is).
	function startShockwave(y) {
		const n = level < 2 ? ATTACK.waveGaps[0] : ATTACK.waveGaps[1];
		const base = sonicAngle() + (Math.random() < 0.5 ? -1 : 1) * rand(0.45, TAU / n - 0.45);
		const gaps = [];
		for (let i = 0; i < n; i++) gaps.push(base + i * TAU / n + rand(-0.15, 0.15));
		const mesh = buildShockwave(gaps, ATTACK.waveGap, y > 0 ? 2 : 1.4);
		mesh.position.y = y > 0 ? y - 0.4 : 0;
		mesh.scale.set(5, 1, 5);
		mesh.visible = false;
		scene.add(mesh);
		shockwaves.push({ mesh, r: 5, speed: ATTACK.waveSpeed + level * ATTACK.waveUp, gaps, charge: ATTACK.charge, y });
		sound.charge();
		waves++;
	}

	// A fan of energy orbs from the machine's eyes, aimed where he's heading.
	function fireOrbs(n) {
		sound.zap();
		const from = boss.eyes[Math.floor(Math.random() * 2)].getWorldPosition(v3());
		const aim = centre(v3());
		aim.addScaledVector(so.vel, aim.distanceTo(from) / SUPER.orb.speed * 0.9);
		const dir = aim.sub(from).normalize();
		const speed = SUPER.orb.speed + level * SUPER.orb.speedUp;
		for (let i = 0; i < n; i++) {
			const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(0xff3aa0).multiplyScalar(2.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
			s.scale.setScalar(2.4);
			s.position.copy(from);
			scene.add(s);
			orbs.push({ sprite: s, pos: from.clone(), vel: dir.clone().applyAxisAngle(UP, (i - (n - 1) / 2) * SUPER.orb.spread).multiplyScalar(speed), age: 0 });
		}
	}

	// Missiles homing in on Super Sonic for a while (outrun them, or turn hard).
	function launchHomers(n) {
		for (let i = 0; i < n; i++) {
			const sh = boss.shoulders[i % 2];
			const pos = boss.body.localToWorld(sh.muzzle.clone());
			const mesh = buildMissile(TEX.fire);
			mesh.scale.setScalar(1.5);
			mesh.position.copy(pos);
			mesh.visible = false;
			scene.add(mesh);
			const dir = v3().set(sh.s * 0.6, 1, 0).applyAxisAngle(UP, bossYaw).normalize();
			homers.push({ mesh, pos, dir, age: -i * 0.35 });
		}
		sound.launch();
		sound.warn();
	}

	function spawnBadnik() {
		const dir = Math.random() < 0.5 ? -1 : 1;
		const theta = sonicAngle() - dir * rand(0.9, 1.5);   // (ahead of him one way, rolling his way)
		const mesh = buildBadnik();
		scene.add(mesh);
		badniks.push({ mesh, theta, r: rand(BAND.lo - 0.5, BAND.hi + 0.5), dir, run: 0, dead: false });
	}

	// A Buzz Bomber, flying in from high over the field to hover in view.
	function newStation(b) {
		b.station = { lat: rand(-BUZZ.across, BUZZ.across), ahead: rand(BUZZ.ahead[0], BUZZ.ahead[1]), up: rand(BUZZ.up[0], BUZZ.up[1]) };
	}
	const stationAt = (b, out) => placeFor(so.theta, b.station.lat, b.station.ahead, planeY() + b.station.up, out);
	function spawnBuzzer() {
		const m = buildBuzzer();
		m.root.scale.setScalar(BUZZ.scale);
		const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(0xff2a3a).multiplyScalar(2.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
		glow.scale.setScalar(4);
		glow.visible = false;
		m.root.add(glow);
		const b = { m, glow, state: 'come', t: 0, pos: v3(), vel: v3(), dead: false, seed: Math.random() * 10 };
		newStation(b);
		placeFor(so.theta, b.station.lat * 3, b.station.ahead + 25, planeY() + b.station.up + 16, b.pos);
		m.root.position.copy(b.pos);
		scene.add(m.root);
		buzzers.push(b);
		return b;
	}
	const faceTo = (obj, d) => { obj.rotation.y = Math.atan2(d.x, d.z); };   // (the Buzz Bombers face +z)

	// The Buzz Bombers: in to their spot in view, hovering, then (in the play)
	// a flash of the stinger and a dive straight at him.
	function stepBuzzers(dt, attacking) {
		const me = centre(v3());
		for (const b of buzzers) {
			if (b.dead) continue;
			b.t += dt;
			const r = b.m.root;
			if (b.state === 'dive') {
				b.pos.addScaledVector(b.vel, dt);
				b.pos.y = Math.max(0.6, b.pos.y);
				faceTo(r, b.vel);
				if (canHurt() && b.pos.distanceTo(me) < BUZZ.reach) hurt(sideOf(b.pos));
				if (b.t > BUZZ.diveFor) { b.state = 'come'; b.t = 0; newStation(b); }
			} else {
				const d = stationAt(b, v3()).sub(b.pos);
				const len = d.length();
				const speed = b.state === 'come' ? BUZZ.speed : BUZZ.speed * 0.5;
				if (len > 0.01) b.pos.addScaledVector(d, Math.min(1, speed * dt / len));
				if (b.state === 'come' && len < 0.8) { b.state = 'hover'; b.t = 0; b.hover = rand(BUZZ.hover[0], BUZZ.hover[1]) * Math.max(0.5, 1 - level * 0.12); }
				else if (b.state === 'hover' && b.t > b.hover && attacking) { b.state = 'aim'; b.t = 0; sound.warn(); }
				else if (b.state === 'aim' && b.t > BUZZ.aim) {
					b.state = 'dive';
					b.t = 0;
					b.vel.copy(me).addScaledVector(so.vel, 0.25).sub(b.pos).normalize().multiplyScalar(BUZZ.dive);
				}
				faceTo(r, b.state === 'come' && len > 3 ? d : v3().subVectors(me, b.pos));
			}
			b.glow.visible = b.state === 'aim' && Math.floor(b.t * 14) % 2 === 0;
			r.position.copy(b.pos);
			b.m.animate(clock + b.seed);
		}
		for (const b of buzzers.filter((b) => b.dead)) {
			scene.remove(b.m.root);
			buzzers.splice(buzzers.indexOf(b), 1);
		}
	}

	function attack(dt) {
		attackIn -= dt;
		if (volley) {
			volley.at -= dt;
			if (volley.at <= 0) {
				fireOrbs(volley.n);
				volley.left--;
				volley.at = SUPER.orb.again;
				if (volley.left <= 0) volley = null;
			}
		}
		if (attackIn <= 0) {
			attackIn = gapFor() * rand(0.85, 1.15);
			const r = Math.random();
			if (phase === 'super') {
				if (r < 0.45) { volley = { n: Math.min(SUPER.orb.n[0] + level, SUPER.orb.n[1]), at: SUPER.orb.charge, left: level >= 2 ? 2 : 1 }; sound.charge(); }
				else if (r < 0.8 || level < 1 || shockwaves.length) launchHomers(Math.min(1 + Math.floor(level / 2), 3));
				else startShockwave(SKY);
			} else if (level >= 1 && r < 0.35 && !shockwaves.length) startShockwave(0);
			else launchMissiles(Math.min(1 + level, 4));
			if (Math.random() < 0.25) sound.laugh();
		}
		// the minions: badniks on foot, Buzz Bombers both ways (more each round)
		const ground = phase === 'ground';
		const mostBadniks = ground ? Math.min(BADNIKS.most, 2 + level) : 0;
		if (badniks.filter((b) => !b.dead).length < mostBadniks && Math.random() < dt * 0.6) spawnBadnik();
		const mostBuzzers = Math.min(BUZZ.most[1], BUZZ.most[0] + level + (ground ? 0 : 1));
		if (buzzers.filter((b) => !b.dead).length < mostBuzzers && Math.random() < dt * 0.5) spawnBuzzer();
	}

	function stepAttacks(dt) {
		const me = centre(v3());
		for (const m of missiles) {
			m.t += dt;
			const kk = Math.max(0, Math.min(1, m.t / m.flight));
			const p = v3().lerpVectors(m.from, m.to, kk);
			p.y += Math.sin(Math.PI * kk) * ATTACK.apex;
			const ahead = v3().lerpVectors(m.from, m.to, Math.min(1, kk + 0.02));
			ahead.y += Math.sin(Math.PI * Math.min(1, kk + 0.02)) * ATTACK.apex;
			m.mesh.position.copy(p);
			if (ahead.distanceToSquared(p) > 1e-6) m.mesh.lookAt(ahead);
			m.mesh.visible = m.t > 0;
			m.warn.material.opacity = 0.5 + 0.5 * Math.sin(clock * 18);
			m.warn.scale.setScalar(REACH.blast * (1.4 - 0.4 * kk));
			if (kk >= 1) {
				m.done = true;
				blast(m.to.clone().setY(0.8), 3.4);
				sound.blast(false, panOf());
				shake = Math.max(shake, 0.25);
				if (so.y < 1.5 && Math.hypot(m.to.x - so.pos.x, m.to.z - so.pos.z) < REACH.blast) hurt(sideOf(m.to));
			}
		}
		for (const m of missiles.filter((m) => m.done)) {
			scene.remove(m.mesh, m.warn);
			missiles.splice(missiles.indexOf(m), 1);
		}

		for (const h of homers) {
			h.age += dt;
			if (h.age < 0) continue;
			h.mesh.visible = true;
			if (h.age < SUPER.homing.home) {
				const want = v3().subVectors(me, h.pos).normalize();
				const off = h.dir.angleTo(want);
				if (off > 1e-4) h.dir.lerp(want, Math.min(1, SUPER.homing.turn * dt / off)).normalize();
			}
			h.pos.addScaledVector(h.dir, (SUPER.homing.speed + level * SUPER.homing.speedUp) * dt);
			h.mesh.position.copy(h.pos);
			h.mesh.lookAt(v3().copy(h.pos).add(h.dir));
			if (Math.random() < dt * 20) puff(h.pos, 1.2, 0.8);
			const hit = canHurt() && h.pos.distanceTo(me) < SUPER.homing.reach;
			if (hit || h.pos.y < 0.3 || h.age > SUPER.homing.life) {
				h.done = true;
				blast(h.pos, 3);
				sound.blast(false, panOf());
				if (hit) hurt(sideOf(h.pos));
			}
		}
		for (const h of homers.filter((h) => h.done)) {
			scene.remove(h.mesh);
			homers.splice(homers.indexOf(h), 1);
		}

		for (const o of orbs) {
			o.age += dt;
			o.pos.addScaledVector(o.vel, dt);
			o.sprite.position.copy(o.pos);
			o.sprite.material.rotation += dt * 6;
			o.sprite.scale.setScalar(2.4 + Math.sin(clock * 30 + o.age * 9) * 0.3);
			if (canHurt() && o.pos.distanceTo(me) < SUPER.orb.reach) { o.done = true; sparkle(o.pos, 0xff60c0, 3); hurt(sideOf(o.pos)); }
			if (o.age > 4 || o.pos.y < 0) o.done = true;
		}
		for (const o of orbs.filter((o) => o.done)) {
			scene.remove(o.sprite);
			o.sprite.material.dispose();
			orbs.splice(orbs.indexOf(o), 1);
		}

		for (const w of shockwaves) {
			if (w.charge > 0) {
				w.charge -= dt;
				if (w.charge <= 0) { w.mesh.visible = true; sound.wave(); shake = Math.max(shake, 0.4); }
				continue;
			}
			const was = w.r;
			w.r += w.speed * dt;
			w.mesh.scale.set(w.r, 1 + Math.sin(clock * 30) * 0.08, w.r);
			w.mesh.userData.mat.opacity = Math.min(1, (FIELD - w.r) / 10);
			const rs = Math.hypot(so.pos.x, so.pos.z);
			const passed = (was - rs) * (w.r - rs) <= 0 || Math.abs(w.r - rs) < REACH.wave;
			if (passed && Math.abs(so.y - w.y) < 1.6 && !w.gaps.some((g) => Math.abs(angleTo(g, sonicAngle())) < ATTACK.waveGap / 2 - 0.4 / rs)) hurt(so.v >= 0 ? -1 : 1);
			if (w.r > FIELD) w.done = true;
		}
		for (const w of shockwaves.filter((w) => w.done)) {
			scene.remove(w.mesh);
			shockwaves.splice(shockwaves.indexOf(w), 1);
		}

		for (const b of badniks) {
			if (b.dead) continue;
			const step = BADNIKS.speed * dt;
			b.theta += b.dir * step / b.r;
			b.run += step;
			b.mesh.position.set(Math.sin(b.theta) * b.r, 0, Math.cos(b.theta) * b.r);
			b.mesh.rotation.y = yawTo(Math.cos(b.theta) * b.dir, -Math.sin(b.theta) * b.dir);
			b.mesh.userData.wheel.rotation.x -= step / 0.2;
			b.mesh.position.y = Math.abs(Math.sin(b.run * 3)) * 0.06;
			if (b.run > b.r * TAU * 0.7) b.dead = true;
			if (phase === 'ground' && so.y < 1.5 && Math.hypot(b.mesh.position.x - so.pos.x, b.mesh.position.z - so.pos.z) < REACH.badnik) {
				if (flatOut()) {
					b.dead = true;
					blast(b.mesh.position.clone().setY(0.6), 1.6);
					sound.pop();
					score(ctrl, POINTS.badnik);
					pop('+' + POINTS.badnik, '#ffe14a', b.mesh.position, 60);
				} else hurt(sideOf(b.mesh.position));
			}
		}
		for (const b of badniks.filter((b) => b.dead)) {
			scene.remove(b.mesh);
			badniks.splice(badniks.indexOf(b), 1);
		}
	}

	// Everything the machine has thrown and sent, gone in a puff (for the cinematics).
	function clearAttacks() {
		for (const m of missiles) { if (m.t > 0) puff(m.mesh.position, 2, 1); scene.remove(m.mesh, m.warn); }
		missiles.length = 0;
		for (const h of homers) { if (h.age > 0) puff(h.pos, 2, 1); scene.remove(h.mesh); }
		homers.length = 0;
		for (const o of orbs) { scene.remove(o.sprite); o.sprite.material.dispose(); }
		orbs.length = 0;
		volley = null;
		for (const w of shockwaves) scene.remove(w.mesh);
		shockwaves.length = 0;
		for (const b of badniks) { puff(b.mesh.position.clone().setY(0.6), 1.6, 1); scene.remove(b.mesh); }
		badniks.length = 0;
		for (const b of buzzers) { puff(b.pos, 2, 1); scene.remove(b.m.root); }
		buzzers.length = 0;
	}

	// A minion tapped to bits: a blast, points to the tapper, rings out of it.
	function killMinion(b, by) {
		b.dead = true;
		const at = b.m ? b.pos.clone() : b.mesh.position.clone().setY(0.6);
		blast(at, 2.6);
		sound.kill(panOf());
		killed++;
		if (show.beat === 'play') score(by, POINTS.minion);
		pop('+' + POINTS.minion, PLAYER_COLORS[by] || '#ffe14a', at, 64);
		dropRings(at, RINGS.drop);
	}

	// Hit: tumble; his rings scatter (or, with none, an emerald's knocked loose
	// on foot; as Super Sonic, he's knocked about all the longer).
	function hurt(side) {
		if (!canHurt()) return;
		so.hurt = HURT.tumble;
		so.safe = HURT.safe;
		so.knock = side * HURT.knock;
		sound.hurt();
		shake = Math.max(shake, 0.5);
		redFlash = 0.6;
		if (ringCount > 0) {
			pop('-' + ringCount, '#ffe14a', so.pos, 80);
			scatterRings();
		} else if (phase === 'ground' && held.length) {
			const e = emeralds[held.pop()];
			flyEmerald(e, so.pos.clone().setY(1.2), sonicAngle() + (Math.random() < 0.5 ? -1 : 1) * rand(1.0, 2.4), 1.3);
			pop('OUCH!', '#ff3d4a', so.pos, 80);
		} else {
			pop('OUCH!', '#ff3d4a', so.pos, 80);
			if (phase === 'super') so.hurt = HURT.tumble * HURT.bare;
		}
	}

	/* ---------- the rings ---------- */

	const rings = [];      // { mesh, pos, spin, loose: { vel, age, sky } | null, fly: { from, t, dur } | null }
	let ringCount = 0;     // the rings he has (his shield: a hit scatters them, not an emerald)

	function addRing(pos) {
		const mesh = buildRing();
		mesh.position.copy(pos);
		scene.add(mesh);
		const r = { mesh, pos: pos.clone(), spin: Math.random() * TAU, loose: null, fly: null };
		rings.push(r);
		return r;
	}

	// An arc of rings round the circle from angle a, weaving in or out a little, at height y.
	function layArc(a, y) {
		const n = Math.floor(rand(RINGS.arc[0], RINGS.arc[1] + 1));
		const r0 = rand(BAND.lo, BAND.hi), r1 = rand(BAND.lo, BAND.hi);
		const dir = Math.random() < 0.5 ? -1 : 1;
		for (let i = 0; i < n; i++) {
			const r = r0 + (r1 - r0) * (n > 1 ? i / (n - 1) : 0);
			const b = a + dir * i * RINGS.gap / r;
			addRing(v3().set(Math.sin(b) * r, y + RINGS.up, Math.cos(b) * r));
		}
	}

	// Keep the field (or the sky) stocked with rings.
	function topUpRings() {
		if (rings.filter((r) => !r.loose && !r.fly).length >= RINGS.keep) return;
		layArc(sonicAngle() + (Math.random() < 0.5 ? -1 : 1) * rand(0.7, 2.6), planeY());
	}
	function clearRings() {
		for (const r of rings) scene.remove(r.mesh);
		rings.length = 0;
	}

	// His rings flying off when he's hit (to grab back, if he's quick).
	function scatterRings() {
		const n = Math.min(ringCount, RINGS.spill);
		const sky = planeY() > 0;
		const at = centre(v3());
		for (let i = 0; i < n; i++) {
			const a = i / n * TAU + rand(-0.2, 0.2);
			const r = addRing(at);
			r.loose = { vel: v3().set(Math.cos(a) * rand(5, 9), sky ? rand(-1.5, 1.5) : rand(6, 10), Math.sin(a) * rand(5, 9)), age: 0, sky };
		}
		ringCount = 0;
		sound.ringLoss();
	}

	// Rings out of a smashed minion, flying to spots on his way round (at his height).
	function dropRings(from, n) {
		const a0 = Math.atan2(from.x, from.z);
		const rad = rand(BAND.lo, BAND.hi);
		for (let i = 0; i < n; i++) {
			const r = addRing(from);
			const a = a0 + (i - (n - 1) / 2) * RINGS.gap / rad;
			r.pos.set(Math.sin(a) * rad, planeY() + RINGS.up, Math.cos(a) * rad);
			r.fly = { from: from.clone(), t: 0, dur: rand(0.7, 1.0) };
		}
	}

	function stepRings(dt) {
		const me = centre(v3());
		const grabbing = (phase === 'ground' || phase === 'super') && so.hurt <= 0;
		for (const r of rings) {
			r.spin += dt * 3.5;
			r.mesh.rotation.y = r.spin;
			if (r.fly) {
				r.fly.t += dt;
				const kk = Math.min(1, r.fly.t / r.fly.dur);
				r.mesh.position.lerpVectors(r.fly.from, r.pos, kk);
				r.mesh.position.y += Math.sin(Math.PI * kk) * 3;
				if (kk >= 1) r.fly = null;
				continue;
			}
			if (r.loose) {
				const L = r.loose;
				L.age += dt;
				if (!L.sky) {
					L.vel.y -= 20 * dt;
					if (r.mesh.position.y < RINGS.up && L.vel.y < 0) { L.vel.y *= -0.55; L.vel.x *= 0.8; L.vel.z *= 0.8; }
				} else L.vel.multiplyScalar(Math.exp(-dt * 1.5));
				r.mesh.position.addScaledVector(L.vel, dt);
				r.mesh.visible = L.age < RINGS.life - 1 || Math.floor(L.age * 12) % 2 === 0;
				if (L.age > RINGS.life) r.gone = true;
				if (L.age < RINGS.grab) continue;
			} else r.mesh.position.copy(r.pos);
			if (!r.gone && grabbing && r.mesh.position.distanceTo(me) < REACH.ring) {
				r.gone = true;
				ringCount++;
				if (show.beat === 'play') score(ctrl, POINTS.ring);
				sound.ring(panOf());
				sparkle(r.mesh.position, 0xfff2a0, 1.4);
			}
		}
		for (const r of rings.filter((r) => r.gone)) {
			scene.remove(r.mesh);
			rings.splice(rings.indexOf(r), 1);
		}
		if ((phase === 'ground' || phase === 'super') && RING_BEATS.includes(show.beat)) topUpRings();
	}

	/* ---------- the targets (as Super Sonic) ---------- */

	const targets = [];     // { mesh, spot, age, life }
	let targetIn = TARGET.first;
	const lifeFor = () => Math.max(TARGET.lifeMin, TARGET.life - level * TARGET.lifeDown);

	function stepTargets(dt) {
		if (phase === 'super') {
			targetIn -= dt;
			const most = level >= 2 ? 2 : 1;
			if (targetIn <= 0 && targets.length < most) {
				const side = Math.min(2, level);
				const free = boss.spots.filter((s) => s.side <= side && !targets.some((tg) => tg.spot === s));
				const spot = free[Math.floor(Math.random() * free.length)];
				if (spot) {
					const mesh = buildTarget();
					mesh.position.copy(spot.at).addScaledVector(spot.normal, 0.6);
					mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), spot.normal);
					boss.body.add(mesh);
					targets.push({ mesh, spot, age: 0, life: lifeFor() });
					show.fx('glint', 0.7);
				}
				targetIn = TARGET.gap;
			}
		}
		for (const tg of targets) {
			tg.age += dt;
			const ud = tg.mesh.userData;
			const born = Math.min(1, tg.age / 0.3);
			const left = tg.life - tg.age;
			const blink = left < 1.2 ? (Math.floor(tg.age * 10) % 2 ? 0.3 : 1) : 1;
			ud.ring.scale.setScalar((0.4 + 0.6 * born) * (1 + Math.sin(clock * 8) * 0.08));
			ud.ring.rotation.z += dt * 1.5;
			ud.ring.material.opacity = blink;
			ud.core.scale.setScalar(born * (1 + Math.sin(clock * 12) * 0.15));
			if (left <= 0 && phase === 'super') tg.gone = true;
		}
		for (const tg of targets.filter((tg) => tg.gone)) dropTarget(tg);
	}
	function dropTarget(tg) {
		tg.mesh.parent && tg.mesh.parent.remove(tg.mesh);
		targets.splice(targets.indexOf(tg), 1);
	}
	function clearTargets() { for (const tg of targets.slice()) dropTarget(tg); }

	/* ---------- the flow ---------- */

	function setPhase(p) {
		phase = p;
		phaseT = 0;
	}

	function initGame(n) {
		count = n;
		scores = new Array(n).fill(0);
		turns = new Array(n).fill(0);
		ctrl = 0;
		show.go('title');
	}

	// Who's Sonic next: whoever's had fewest turns (after the one who just went).
	function nextCtrl() {
		let best = ctrl, bestTurns = Infinity;
		for (let j = 1; j <= count; j++) {
			const n = (ctrl + j) % count;
			if (turns[n] < bestTurns) { best = n; bestTurns = turns[n]; }
		}
		return best;
	}
	const everyoneWent = () => turns.every((n) => n > 0);

	// How many hits this round (so the twelve come out right, everyone a turn).
	function hitsForRound() {
		const left = TOTAL_HITS - hits;
		const others = turns.filter((n, i) => n === 0 && i !== ctrl).length;
		if (left <= 0) return HITS.min;
		return Math.max(HITS.min, Math.min(HITS.max, Math.ceil(left / (others + 1))));
	}

	function startGround() {
		setPhase('ground');
		attackIn = 2.5;
		sound.music('foot');
	}

	function startTransform() {
		setPhase('transform');
		clearAttacks();
		clearRings();
		so.v = 0;
		sound.music(false);
		sound.rise(3.6);
		roundNeed = hitsForRound();
		roundHits = 0;
		// (the emeralds, from wherever, into a ring round him)
		for (const e of emeralds) { e.state = 'orbit'; e.mesh.visible = false; e.mesh.userData.beam.visible = false; }
		vortex.visible = true;
		vortex.material.opacity = 0;
	}

	function stepTransform(dt) {
		const tt = phaseT;
		// he turns to us, rises, the emeralds whirling round him; they flow
		// into him; he drops, lands in a blaze: Super Sonic, up into the sky
		const facing = yawTo(-fwdAt(so.theta, P1).x, -fwdAt(so.theta, P1).z);
		if (tt < TF.drop[0]) so.y = 2.2 * ease(between(tt, TF.rise[0], TF.rise[1]));
		else if (tt < TF.land) so.y = 2.2 * (1 - Math.pow(between(tt, TF.drop[0], TF.drop[1]), 2));
		else so.y = SKY * ease(between(tt, TF.sky[0], TF.sky[1]));
		so.y += tt < TF.drop[0] ? Math.sin(clock * 3) * 0.08 * between(tt, TF.rise[0], TF.rise[1]) : 0;
		const lookBack = tt > TF.sky[0];
		const mode = tt < TF.drop[0] ? 'spring' : tt < TF.land ? 'fall' : lookBack ? undefined : 'spring';
		poseHero(dt, { yaw: lookBack ? undefined : facing, mode });

		const spinK = between(tt, TF.spin[0], TF.spin[1]);
		const turn = clock * (1.5 + spinK * 8);
		for (const e of emeralds) {
			const mAt = TF.merge[0] + e.i / EMERALDS * (TF.merge[1] - TF.merge[0]);
			if (e.state === 'orbit') {
				const inK = 1 - between(tt, mAt - 0.35, mAt);
				const r = (1.2 + 1.4 * ease(between(tt, 0.3, 1.2))) * inK;
				const a = turn + e.i / EMERALDS * TAU;
				e.mesh.visible = tt > 0.3;
				e.mesh.scale.setScalar(1.0 * Math.min(1, (tt - 0.3) * 3) * (0.5 + 0.5 * inK));
				e.mesh.position.set(so.pos.x + Math.sin(a) * r, so.y + 0.9 + Math.sin(a * 2 + clock) * 0.3 * inK + (1 - inK) * 0.2, so.pos.z + Math.cos(a) * r);
				if (tt >= mAt) {
					e.state = 'merged';
					e.mesh.visible = false;
					sound.merge(e.i);
					sparkle(e.mesh.position, e.colour, 3);
					flash = Math.max(flash, 0.25);
				}
			}
		}
		// the vortex
		const vk = between(tt, 0.9, 1.6) * (1 - between(tt, TF.merge[1] - 0.2, TF.drop[1]));
		vortex.visible = vk > 0;
		vortex.position.set(so.pos.x, 3.5 + so.y * 0.5, so.pos.z);
		vortex.rotation.y += dt * (3 + spinK * 6);
		vortex.material.opacity = vk * 0.85;
		TEX.swirl.offset.y -= dt * 1.6;
		if (phaseT - dt < TF.land && phaseT >= TF.land) ignite();
		if (tt >= TF.length) {
			for (const e of emeralds) { e.mesh.scale.setScalar(1.25); e.state = 'held'; }
			vortex.visible = false;
			setPhase('super');
			superCount++;
			targetIn = TARGET.first;
			sound.music('super');
		}
	}

	// Landing in a blaze of light and fire: Super Sonic.
	function ignite() {
		setSuper(true);
		flash = 1;
		shake = 0.9;
		sound.ignite();
		const at = so.pos.clone().setY(0.3);
		for (let i = 0; i < 18; i++) {
			const a = i / 18 * TAU;
			fireball(at.clone().add(v3().set(Math.sin(a), 0, Math.cos(a)).multiplyScalar(0.6)), rand(2, 3), rand(0.7, 1.1), v3().set(Math.sin(a) * 14, rand(1, 4), Math.cos(a) * 14));
		}
		for (let i = 0; i < 8; i++) fireball(at.clone().add(v3().set(rand(-0.4, 0.4), i * 0.8, rand(-0.4, 0.4))), rand(2.5, 3.5), rand(0.6, 1), v3().set(0, 10 + i * 2, 0));
		for (let i = 0; i < 6; i++) sparkle(at.clone().add(v3().set(rand(-2, 2), rand(0, 3), rand(-2, 2))), 0xffe080, 3.5);
	}

	// A tap on a lit target: Super Sonic hurtles at it.
	const dive = { from: v3(), at: v3(), dir: v3(), past: v3(), to: v3(), theta: 0, by: 0, done: false };
	function startDive(tg, by) {
		setPhase('dive');
		dive.from.copy(so.pos);
		tg.mesh.getWorldPosition(dive.at);
		dive.dir.subVectors(dive.at, dive.from).normalize();
		dive.past.copy(dive.at).addScaledVector(dive.dir, DIVE.past);
		dive.past.y = Math.max(dive.past.y, 4);
		dive.theta = Math.atan2(dive.past.x, dive.past.z);
		dive.by = by;
		dive.hit = false;
		dive.tg = tg;
		dropTarget(tg);
		sound.dive();
		show.fx('whoosh', 0.6);
	}

	function stepDive(dt) {
		const tt = phaseT;
		const D = DIVE;
		so.yaw = yawTo(dive.dir.x, dive.dir.z);
		if (tt < D.wind) {
			so.pos.copy(dive.from).addScaledVector(dive.dir, -1.2 * ease(tt / D.wind));
		} else if (tt < D.hit) {
			const kk = (tt - D.wind) / (D.hit - D.wind);
			so.pos.lerpVectors(dive.from, dive.at, kk * kk);
			if (Math.random() < 0.6) sparkle(so.pos, 0xffd040, 1.6);
		} else if (tt < D.through) {
			if (!dive.hit) impact();
			so.pos.lerpVectors(dive.at, dive.past, (tt - D.hit) / (D.through - D.hit));
			if (Math.random() < 0.6) sparkle(so.pos, 0xffd040, 1.6);
		} else {
			// out the far side, round, back to his place over there, looking back
			placeFor(dive.theta, so.lat, so.ahead, SKY, dive.to);
			so.pos.lerpVectors(dive.past, dive.to, ease((tt - D.through) / (D.turn - D.through)));
		}
		hero.position.copy(so.pos);
		const m = superM;
		m.lean.rotation.set(0, 0, 0);
		if (tt < D.through + 0.3) {
			hero.rotation.y = so.yaw;
			m.animate(dt, 'ball', 1, 40, clock);
		} else {
			const back = yawTo(-dive.to.x, -dive.to.z);
			so.yaw += angleTo(so.yaw, back) * Math.min(1, dt * 6);
			hero.rotation.y = so.yaw;
			m.animate(dt, 'idle', 0, 0, clock);
		}
		if (tt >= D.turn) {
			so.theta = dive.theta;
			so.y = SKY;
			so.v = 0;
			placeFor(so.theta, so.lat, so.ahead, so.y, so.pos);
			so.was.copy(so.pos);
			if (hits >= TOTAL_HITS && everyoneWent()) startFinale();
			else if (roundHits >= roundNeed) startSpill();
			else { setPhase('super'); targetIn = TARGET.gap; }
		}
	}

	function impact() {
		dive.hit = true;
		hits++;
		roundHits++;
		score(dive.by, POINTS.hit);
		slowmo = DIVE.slow;
		flash = 0.8;
		shake = 1;
		sound.clang();
		sound.blast(true);
		boss.hurtT = 0.6;
		blast(dive.at, 6);
		for (let i = 0; i < 5; i++) blast(dive.at.clone().add(v3().set(rand(-3, 3), rand(-3, 3), rand(-3, 3))), rand(3, 5));
		pop('HIT!', '#' + new THREE.Color(PLAYER_COLORS[dive.by] || '#ffd23a').getHexString(), dive.at, 120);
		bossKick = 1;
	}

	// The emeralds burst out of him, back across the field; he drops to the ground.
	function startSpill() {
		setPhase('spill');
		clearTargets();
		clearAttacks();
		clearRings();
		sound.music(false);
		sound.spill();
		flash = 0.9;
		shake = 0.6;
	}

	function stepSpill(dt) {
		const tt = phaseT;
		if (phaseT - dt < SPILL.burst && tt >= SPILL.burst) {
			setSuper(false);
			const base = sonicAngle();
			emeralds.forEach(function (e, j) {
				flyEmerald(e, so.pos.clone(), base + 0.6 + (j + rand(0.2, 0.8)) / EMERALDS * (TAU - 1.2), SPILL.flight + rand(-0.2, 0.2));
				e.mesh.scale.setScalar(1.25);
			});
			held = [];
			for (let i = 0; i < 10; i++) sparkle(so.pos.clone().add(v3().set(rand(-1.5, 1.5), rand(-1, 1.5), rand(-1.5, 1.5))), 0xffffff, 3);
			pop('THE EMERALDS!', '#ffffff', so.pos, 90);
		}
		so.y = SKY * (1 - Math.pow(between(tt, SPILL.fall[0], SPILL.fall[1]), 2));
		const falling = tt > SPILL.burst && tt < SPILL.fall[1];
		poseHero(dt, falling ? { mode: 'fall' } : tt < SPILL.burst ? { mode: 'hurt' } : {});
		if (tt >= SPILL.length) {
			so.y = 0;
			level++;
			const next = nextCtrl();
			if (count > 1 || next !== ctrl) startHandover(next);
			else { turns[ctrl]++; startGround(); }
		}
	}

	// The next player takes over as Sonic.
	function startHandover(n) {
		ctrl = n;
		turns[ctrl]++;
		ringCount = 0;
		setPhase('handover');
		sound.handover();
		show.fx('wordSlam', 0.7);
	}

	function stepHandover(dt) {
		poseHero(dt, { mode: 'idle' });
		const c = ctrlAt();
		const middle = c.seen && Math.abs(c.px - 0.5) < HAND.zone && Math.abs(c.pz - 0.5) < HAND.zone + 0.1;
		if ((phaseT > HAND.min && (middle || !c.seen)) || phaseT > HAND.max) {
			startGround();
			sound.laugh();
		}
	}

	/* ---------- the finale ---------- */

	let bossKick = 0;
	let pod = null;         // { obj, vel } the Egg Mobile, fleeing
	let blownUp = false;
	let logoAt = -1;

	function startFinale() {
		show.go('finale');
	}

	function enterFinale() {
		setPhase('finale');
		clearTargets();
		clearAttacks();
		sound.music(false);
		blownUp = false;
		logoAt = -1;
		frozen = false;
		finWas = 0;
	}

	let finWas = 0;   // (the finale's time last frame: its cues fire through the freeze-frame too)
	function stepFinale(dt) {
		const tt = phaseT;
		const was = finWas;
		finWas = tt;
		const cue = (at) => was < at && tt >= at;
		// the machine bursting, more and more
		if (tt < FIN.pops) {
			const rate = 4 + tt * 6;
			if (Math.random() < dt * rate) {
				const s = boss.spots[Math.floor(Math.random() * boss.spots.length)];
				const at = boss.body.localToWorld(s.at.clone()).add(v3().set(rand(-2, 2), rand(-2, 2), rand(-2, 2)));
				blast(at, rand(2.5, 4.5));
				sound.blast(false);
				shake = Math.max(shake, 0.3);
			}
			boss.body.position.x = (Math.random() - 0.5) * 0.4 * tt;
			boss.body.position.z = (Math.random() - 0.5) * 0.4 * tt;
		}
		if (!blownUp && tt >= FIN.pops) blowUp();
		// Super Sonic turns to us and strikes a pose; the eye swings round to his front
		const swing = between(tt, FIN.swing[0], FIN.swing[1]);
		so.y = SKY + swing * 1.5;
		if (tt < FIN.swing[0]) poseHero(dt, {});
		else {
			const facing = yawTo(-fwdAt(so.theta, P1).x, -fwdAt(so.theta, P1).z);
			poseHero(dt, { yaw: facing, mode: swing > 0.5 ? 'pose' : 'idle' });
		}
		if (pod) {
			pod.vel.y += dt * 2;
			pod.obj.position.addScaledVector(pod.vel, dt);
			pod.obj.rotation.z = Math.sin(clock * 9) * 0.3;
			if (Math.random() < dt * 30) puff(pod.obj.position.clone().add(v3().set(0, -0.8, 0)), 2.2, 1.6);
		}
		if (tt >= FIN.freeze && !frozen) {
			frozen = true;
			flash = 0.9;
			show.fx('boom', 0.7);
		}
		if (tt >= FIN.logo && logoAt < 0) {
			logoAt = tt;
			sound.braam();
		}
		if (cue(FIN.logo + 0.35)) {
			shake = 1;
			show.shake = 0.6;
			show.confetti(140);
		}
		if (cue(FIN.guitar)) sound.guitar();
	}

	// The machine blows apart; Robotnik flees in his Egg Mobile.
	function blowUp() {
		blownUp = true;
		flash = 1;
		shake = 1.2;
		show.shake = 0.8;
		sound.boom();
		const centre = boss.root.position.clone();
		for (let i = 0; i < 16; i++) fireball(centre.clone().add(v3().set(rand(-4, 4), rand(-4, 4), rand(-4, 4))), rand(9, 16), rand(1.2, 2.2), v3().set(rand(-6, 6), rand(-2, 8), rand(-6, 6)));
		for (let i = 0; i < 14; i++) puff(centre.clone().add(v3().set(rand(-6, 6), rand(-4, 6), rand(-6, 6))), rand(8, 14), rand(3, 5), v3().set(rand(-3, 3), rand(1, 4), rand(-3, 3)));
		for (let i = 0; i < 12; i++) sparkle(centre.clone().add(v3().set(rand(-8, 8), rand(-8, 8), rand(-8, 8))), 0xfff0c0, rand(5, 9));
		// the Egg Mobile out of its seat, off and away
		scene.attach(boss.pod);
		pod = { obj: boss.pod, vel: v3().copy(fwdAt(so.theta, P1)).multiplyScalar(14).setY(10) };
		// every other piece flung apart
		boss.body.updateMatrixWorld(true);
		for (const part of boss.body.children.slice()) {
			scene.attach(part);
			const out = part.getWorldPosition(v3()).sub(centre);
			if (out.lengthSq() < 0.01) out.set(rand(-1, 1), rand(0, 1), rand(-1, 1));
			out.normalize().multiplyScalar(rand(10, 26)).add(v3().set(0, rand(4, 12), 0));
			debris.push({ obj: part, vel: out, spin: v3().set(rand(-3, 3), rand(-3, 3), rand(-3, 3)), age: 0, life: rand(2.5, 4) });
		}
	}

	/* ---------- the beats ---------- */

	const RING_BEATS = ['controls', 'intro', 'play'];   // (the beats the rings are laid out through)
	const SCENE_BEATS = ['squad', 'title', 'clock', 'visors', 'controls', 'intro', 'play', 'finale', 'timeup'];

	// the tutorial: whoever's Sonic first, a step at a time (the machine holds its fire)
	const reach = { min: 0.5, max: 0.5, ran: 0 };
	const TUTORIAL = [
		{ caption: 'SONIC: STEP LEFT AND RIGHT', min: 2, max: 10, did: () => reach.max - reach.min >= 0.25 },
		{ caption: 'STEP OUT WIDE TO RUN ROUND ROBOTNIK', min: 2, max: 12, did: () => reach.ran >= 2.2 },
		{ caption: 'GRAB A CHAOS EMERALD', min: 1, max: 14, did: () => held.length >= 1 },
		{ caption: 'EVERYONE: TAP A ROBOT TO DESTROY IT', min: 1, max: 14, did: () => killed >= 1 },
	];

	show.sequence([
		{ id: 'squad', length: Infinity },
		show.beats.titleDrop(),
		show.beats.clockIntro(),
		show.beats.visors(),
		show.beats.tutorial({
			steps: TUTORIAL,
			enterStep(i) {
				const c = ctrlAt();
				Object.assign(reach, { min: c.px, max: c.px, ran: 0 });
				if (i === 3) { killed = 0; for (let n = buzzers.length; n < 3; n++) spawnBuzzer(); }   // (some to tap: they only hover, till the play)
			},
			enter() {
				turns[ctrl] = Math.max(1, turns[ctrl]);
				setPhase('ground');
				armed = false;
				sound.resume();
				sound.music('foot');
			},
			update(dt) {
				t += dt;
				show.record(t, latest.slice(0, count));
				const c = ctrlAt();
				reach.min = Math.min(reach.min, c.px);
				reach.max = Math.max(reach.max, c.px);
				reach.ran += Math.abs(so.v) * dt / (CAM.r - so.ahead);
			},
			draw(ctx) {
				if (count < 1) return;
				show.onWalls(ctx, (c) => art.text(c, 'PLAYER ' + (ctrl + 1) + ', YOU\'RE SONIC!', W / 2, 360, { size: 52, font: SONIC_FONT, fill: PLAYER_COLORS[ctrl], outline: '#0a1a3a', outlineWidth: 8 }));
			},
		}),
		// Robotnik's challenge: the machine glares, he laughs
		{
			id: 'intro',
			length: 6,
			enter() {
				if (phase !== 'ground') setPhase('ground');
				armed = false;
				show.fx('villainReveal');
				sound.laugh();
				bossAnger = 1;
			},
			update(dt, bt) {
				show.blackout = 0.4 * Math.min(1, bt * 2) * (1 - between(bt, 5.2, 6));
				if (show.cue(1.6)) show.fx('stomp');
				if (show.cue(2.8)) show.fx('beat');
			},
			draw(ctx, bt) {
				show.onWalls(ctx, function (c) {
					show.slam(c, 'COLLECT THE 7 CHAOS EMERALDS!', W / 2, 250, 88, bt - 0.3, { fill: '#2fe86a', glow: '#2fe86a' });
					if (bt > 1.6) show.text(c, 'DODGE HIS ATTACKS · GRAB RINGS TO STAY SAFE', W / 2, 370, 50, { fill: 'white', alpha: Math.min(1, (bt - 1.6) * 3) });
					if (bt > 2.6) show.text(c, 'EVERYONE: TAP HIS ROBOTS TO SMASH THEM', W / 2, 450, 50, { fill: '#ff8a5a', alpha: Math.min(1, (bt - 2.6) * 3) });
					if (bt > 3.6) show.text(c, 'THEN GO SUPER AND SMASH HIS MACHINE!', W / 2, 530, 50, { fill: '#ffd23a', alpha: Math.min(1, (bt - 3.6) * 3) });
				});
			},
		},
		{
			id: 'play',
			length: Infinity,
			enter() {
				armed = true;
				turns[ctrl] = Math.max(1, turns[ctrl]);
				if (phase !== 'ground') startGround();
				so.hurt = 0;
				so.safe = 0;
				scores = scores.map(() => 0);   // (the tutorial's emeralds and rings don't count)
				scatterEmeralds();
				ringCount = 0;
				attackIn = 2.5;
				sound.music('foot');
			},
			update(dt) {
				t += dt;
				show.record(t, latest.slice(0, count));
			},
		},
		// the machine blows up; Super Sonic's pose; the logo (then straight to the scores)
		{
			id: 'finale',
			length: Infinity,
			holdClock: true,
			enter() { enterFinale(); },
			exit() { frozen = false; },
			update(dt, bt) { if (bt >= FIN.length) show.go('scores'); },
		},
		show.beats.timeUp({
			enter() {
				setPhase('over');
				armed = false;
				clearTargets();
				sound.music(false);
			},
		}),
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

	/* ---------- every frame ---------- */

	let bossYaw = 0;
	let bossAnger = 0;
	const eye = v3();
	const eyeQ = new THREE.Quaternion();
	const tmp = v3();
	const mtx = new THREE.Matrix4();
	const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();

	// A look from eye to target, as a rotation.
	function lookQ(from, to, out) {
		mtx.lookAt(from, to, UP);
		return out.setFromRotationMatrix(mtx);
	}

	// The usual eye: behind him at angle a, trained on the machine (sky: 0 on foot, 1 as Super Sonic).
	function orbitPose(a, skyK, outEye, outQ, back = 0) {
		eyeAt(a, outEye).multiplyScalar((CAM.r + back) / CAM.r);
		outEye.y = CAM.up + (CAM.skyUp - CAM.up) * skyK;
		const look = tmp.set(0, CAM.look + (CAM.skyLook - CAM.look) * skyK, 0);
		lookQ(outEye, look, outQ);
	}

	function simulate(dt) {
		clock += dt;
		phaseT += dt;
		shake *= Math.exp(-dt * 5);
		flash *= Math.exp(-dt * 3);
		redFlash *= Math.exp(-dt * 4);
		bossKick *= Math.exp(-dt * 3);
		bossAnger *= Math.exp(-dt * 0.6);
		so.hurt = Math.max(0, so.hurt - dt);
		so.safe = Math.max(0, so.safe - dt);

		const playing = show.beat === 'controls' || show.beat === 'intro' || show.beat === 'play';
		if (phase === 'wait') {
			so.theta += dt * 0.04;
			poseHero(dt, { mode: 'idle' });
		} else if (phase === 'ground') {
			steer(dt, playing);
			so.y = 0;
			poseHero(dt);
			if (armed && show.beat === 'play') attack(dt);
			if (show.beat === 'play' && held.length >= EMERALDS) startTransform();
		} else if (phase === 'transform') {
			stepTransform(dt);
		} else if (phase === 'super') {
			steer(dt, playing);
			so.y = SKY + Math.sin(clock * 2.2) * 0.25;
			poseHero(dt);
			if (armed && show.beat === 'play') attack(dt);
		} else if (phase === 'dive') {
			stepDive(dt);
		} else if (phase === 'spill') {
			stepSpill(dt);
		} else if (phase === 'handover') {
			stepHandover(dt);
		} else if (phase === 'finale') {
			stepFinale(dt);
		} else if (phase === 'over') {
			poseHero(dt, so.y > 0.5 ? {} : { mode: 'idle' });
		}
		// Sonic blinks while he's safe after a hit
		hero.visible = !(phase === 'ground' && so.safe > 0 && so.hurt <= 0 && Math.floor(clock * 16) % 2);
		const tagColour = PLAYER_COLORS[ctrl] || '#ffffff';
		tagRing.material.color.set(tagColour);
		tagRing.visible = phase === 'ground' || phase === 'handover';
		aura.scale.setScalar(3.2 + Math.sin(clock * 14) * 0.3 + Math.random() * 0.2);
		aura.material.opacity = 0.55 + Math.random() * 0.15;
		if (superM.root.visible && Math.random() < dt * 20) sparkle(hero.position.clone().add(v3().set(rand(-0.7, 0.7), rand(0, 1.4), rand(-0.7, 0.7))), 0xffe070, 0.8);

		stepEmeralds(dt);
		stepAttacks(dt);
		stepBuzzers(dt, armed && show.beat === 'play' && (phase === 'ground' || phase === 'super'));
		stepRings(dt);
		stepTargets(dt);

		// the machine: facing Sonic on foot, turning slowly by itself as Super Sonic
		if (phase === 'super') bossYaw += dt * (BOSS.spin + level * BOSS.spinUp);
		else if (phase !== 'dive' && phase !== 'finale') {
			const want = yawTo(so.pos.x, so.pos.z);
			bossYaw += Math.max(-BOSS.turn * dt, Math.min(BOSS.turn * dt, angleTo(bossYaw, want)));
		}
		boss.root.rotation.y = bossYaw;
		boss.root.rotation.x = -bossKick * 0.25;
		boss.hurtT = Math.max(0, (boss.hurtT || 0) - dt);
		if (!blownUp) boss.animate(dt, clock, { anger: Math.max(bossAnger, phase === 'super' || phase === 'dive' ? 0.6 : 0), charge: volley || shockwaves.some((w) => w.charge > 0) ? 1 : 0, hurt: boss.hurtT / 0.6 });

		// sprites, debris, words, marks
		for (const f of fx) {
			f.age += dt;
			const kk = f.age / f.life;
			f.sprite.scale.setScalar(f.size * (0.6 + kk * f.grow));
			f.sprite.material.opacity = f.opacity * (1 - kk) * (f.fadeIn ? Math.min(1, f.age / f.fadeIn) : 1);
			f.sprite.material.rotation += dt * f.spin;
			if (f.vel) {
				f.sprite.position.addScaledVector(f.vel, dt);
				f.vel.multiplyScalar(Math.exp(-dt * f.drag));
				f.vel.y += f.rise * dt;
			}
		}
		for (const f of fx.filter((f) => f.age >= f.life)) {
			scene.remove(f.sprite);
			f.sprite.material.dispose();
			fx.splice(fx.indexOf(f), 1);
		}
		for (const d of debris) {
			d.age += dt;
			d.vel.y -= 18 * dt;
			d.obj.position.addScaledVector(d.vel, dt);
			d.obj.rotation.x += d.spin.x * dt;
			d.obj.rotation.y += d.spin.y * dt;
			d.obj.rotation.z += d.spin.z * dt;
			if (d.obj.position.y < 0.5 && d.vel.y < 0) { d.vel.y *= -0.3; d.vel.x *= 0.6; d.vel.z *= 0.6; }
			if (Math.random() < dt * 6) puff(d.obj.position, 2.5, 1.4);
			if (d.age > d.life - 0.8) d.obj.scale.multiplyScalar(Math.exp(-dt * 4));
		}
		for (const d of debris.filter((d) => d.age >= d.life)) {
			scene.remove(d.obj);
			debris.splice(debris.indexOf(d), 1);
		}
		for (const p of pops) p.age += dt;
		for (let i = pops.length - 1; i >= 0; i--) if (pops[i].age > 1.2) pops.splice(i, 1);
		for (const m of marks) m.age += dt;
		for (let i = marks.length - 1; i >= 0; i--) if (marks[i].age > 0.6) marks.splice(i, 1);

		// the eye
		aim(dt);

		// the sun's shadows round Sonic
		sun.target.position.set(so.pos.x * 0.6, 0, so.pos.z * 0.6);
		sun.position.copy(sun.target.position).addScaledVector(SUN, 120);
		sky.follow(eye);
		sound.wind(phase === 'dive' ? 1 : Math.min(1, Math.abs(so.v) / RUN.top) * (phase === 'ground' || phase === 'super' ? 1 : 0.3));
		sound.tick();
	}

	// Where the eye is: behind him, trained on the machine; closing in on him
	// as he transforms; chasing him through a dive; round to his front for
	// the finale.
	const chaseEye = v3(), chaseQ = new THREE.Quaternion(), baseEye = v3();
	function aim(dt) {
		const skyK = phase === 'super' || phase === 'dive' || phase === 'finale' ? 1
			: phase === 'transform' ? ease(between(phaseT, TF.sky[0], TF.sky[1]))
				: phase === 'spill' ? 1 - ease(between(phaseT, SPILL.fall[0], SPILL.fall[1] + 0.3)) : 0;
		orbitPose(so.theta, skyK, baseEye, qa);
		eye.copy(baseEye);
		eyeQ.copy(qa);
		letterbox += ((phase === 'transform' || phase === 'finale' ? 1 : 0) - letterbox) * Math.min(1, dt * 3);

		if (phase === 'transform') {
			// in close, in front of him, the machine looming behind
			const inK = ease(between(phaseT, 0, TF.face + 0.4)) * (1 - ease(between(phaseT, TF.sky[0], TF.sky[1])));
			const f = fwdAt(so.theta, P1), r = rightAt(so.theta, P2);
			chaseEye.copy(so.pos).addScaledVector(f, -4.4).addScaledVector(r, 1.4);
			chaseEye.y = so.pos.y + 1.0;
			lookQ(chaseEye, tmp.copy(so.pos).setY(so.pos.y + 1.1).addScaledVector(f, 1), chaseQ);
			eye.lerpVectors(baseEye, chaseEye, inK);
			eyeQ.slerpQuaternions(qa, chaseQ, inK);
		} else if (phase === 'dive') {
			const tt = phaseT;
			const D = DIVE;
			// chasing him (swooping up over the machine as he goes through it)
			const dir = tt < D.through ? dive.dir : tmp.subVectors(dive.to, dive.past).normalize();
			const over = Math.sin(Math.PI * between(tt, D.hit - 0.15, D.through + 0.1)) * 9;
			chaseEye.copy(so.pos).addScaledVector(dive.dir, -7).add(v3().set(0, 2.2 + over, 0));
			lookQ(chaseEye, v3().copy(so.pos).addScaledVector(dir, 10), chaseQ);
			if (tt < D.wind + 0.15) {
				const kk = ease(tt / (D.wind + 0.15));
				eye.lerpVectors(baseEye, chaseEye, kk);
				eyeQ.slerpQuaternions(qa, chaseQ, kk);
			} else if (tt < D.through) {
				eye.copy(chaseEye);
				eyeQ.copy(chaseQ);
			} else {
				// round past him to his new place, looking back at the machine
				const kk = ease((tt - D.through) / (D.turn - D.through));
				orbitPose(dive.theta, 1, baseEye, qb);
				const side = rightAt(dive.theta, P2);
				eye.lerpVectors(chaseEye, baseEye, kk).addScaledVector(side, Math.sin(Math.PI * kk) * 7);
				eye.y += Math.sin(Math.PI * kk) * 3;
				eyeQ.slerpQuaternions(chaseQ, qb, kk);
			}
		} else if (phase === 'finale') {
			// pulled back to watch it blow; then round to his front, looking up at him
			orbitPose(so.theta, 1, baseEye, qa, 10 * ease(between(phaseT, 0, 2)) * (1 - between(phaseT, FIN.swing[0], FIN.swing[1])));
			const f = fwdAt(so.theta, P1), r = rightAt(so.theta, P2);
			chaseEye.copy(so.pos).addScaledVector(f, -5.2).addScaledVector(r, -1.8);
			chaseEye.y = so.pos.y - 1.4;
			lookQ(chaseEye, tmp.copy(so.pos).setY(so.pos.y + 0.9), chaseQ);
			const kk = ease(between(phaseT, FIN.swing[0], FIN.swing[1]));
			eye.lerpVectors(baseEye, chaseEye, kk);
			eyeQ.slerpQuaternions(qa, chaseQ, kk);
		}
		walls.rig.position.copy(eye);
		walls.rig.quaternion.copy(eyeQ);
		const sh = shake * (frozen ? 0.3 : 1);
		if (sh > 0.01) walls.rig.position.add(tmp.set((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, 0).applyQuaternion(eyeQ));
	}

	function render() {
		postfx.render(walls.views(renderer.domElement.width, renderer.domElement.height));
	}

	/* ---------- taps ---------- */

	const raycaster = new THREE.Raycaster();
	const ndc = new THREE.Vector2();

	// The player standing nearest a point on the walls (taps carry no player).
	function nearest(at) {
		const wall = Math.floor(at.x / W);
		const f = (at.x - wall * W) / W;
		const p = wall === 0 ? { px: 0, pz: f } : wall === 1 ? { px: f, pz: 1 } : { px: 1, pz: 1 - f };
		let best = 0, bestD = Infinity;
		for (let i = 0; i < count; i++) {
			const q = latest[i];
			if (!q || q.px === undefined) continue;
			const d = Math.hypot(q.px - p.px, q.pz - p.pz);
			if (d < bestD) { bestD = d; best = i; }
		}
		return best;
	}

	// A tap: on a minion, it's smashed; on a lit target (as Super Sonic, not
	// reeling from a hit), he dives at it. Whatever the tap passes nearest first.
	function tap(at) {
		if (show.paused || (show.beat !== 'play' && show.beat !== 'controls')) return;
		const wall = Math.floor(at.x / W);
		if (wall < 0 || wall > 2) return;
		const by = nearest(at);
		marks.push({ x: at.x, y: at.y, colour: PLAYER_COLORS[by], age: 0 });
		if (phase !== 'ground' && phase !== 'super') return;
		ndc.set((at.x - wall * W) / W * 2 - 1, 1 - at.y / H * 2);
		raycaster.setFromCamera(ndc, cams[wall]);
		const o = raycaster.ray.origin, d = raycaster.ray.direction;
		let best = null, bestAlong = Infinity;
		const consider = function (p, reach, what) {
			const v = v3().subVectors(p, o);
			const along = v.dot(d);
			if (along < 1 || along > bestAlong) return;
			if (v.addScaledVector(d, -along).length() < reach) { best = what; bestAlong = along; }
		};
		for (const b of buzzers) if (!b.dead) consider(b.pos, BUZZ.tap, b);
		for (const b of badniks) if (!b.dead) consider(v3().copy(b.mesh.position).setY(0.5), BADNIKS.tap, b);
		if (phase === 'super' && show.beat === 'play' && so.hurt <= 0) {
			for (const tg of targets) {
				if (tg.age < 0.15) continue;
				const p = tg.mesh.getWorldPosition(v3());
				const n = tg.spot.normal.clone().transformDirection(boss.body.matrixWorld);
				if (n.dot(v3().subVectors(o, p)) < 0) continue;   // (round the far side: out of sight)
				consider(p, REACH.target, tg);
			}
		}
		if (!best) show.fx('tap', 0.3);
		else if (targets.includes(best)) startDive(best, by);
		else killMinion(best, by);
	}

	stage.$el.on('click', function (e) {
		if (e.target && e.target.closest && e.target.closest('button')) return;
		tap(IGB.toWorld(e));
	});

	/* ---------- the 2D layer ---------- */

	const pv = v3();
	function onAnyWall(v) {
		for (const w of [1, 0, 2]) {
			pv.copy(v).project(cams[w]);
			if (pv.z < 1 && Math.abs(pv.x) <= 1 && Math.abs(pv.y) <= 1) return { x: w * W + (pv.x + 1) / 2 * W, y: (1 - pv.y) / 2 * H, wall: w };
		}
		return null;
	}

	// A little cut gem, for the row of emeralds.
	function gem(c, x, y, r, colour, lit) {
		c.save();
		c.translate(x, y);
		c.beginPath();
		c.moveTo(-r * 0.55, -r * 0.55);
		c.lineTo(r * 0.55, -r * 0.55);
		c.lineTo(r, -r * 0.1);
		c.lineTo(0, r);
		c.lineTo(-r, -r * 0.1);
		c.closePath();
		c.fillStyle = lit ? colour : 'rgba(10,20,50,0.55)';
		if (lit) { c.shadowColor = colour; c.shadowBlur = 18; }
		c.fill();
		c.shadowBlur = 0;
		c.lineWidth = 4;
		c.strokeStyle = lit ? 'white' : 'rgba(255,255,255,0.35)';
		c.stroke();
		if (lit) {
			c.fillStyle = 'rgba(255,255,255,0.55)';
			c.beginPath();
			c.moveTo(-r * 0.4, -r * 0.45);
			c.lineTo(r * 0.1, -r * 0.45);
			c.lineTo(-r * 0.2, r * 0.05);
			c.closePath();
			c.fill();
		}
		c.restore();
	}

	// The stand-in for the Sonic at Immersive Gamebox logo: a gold ring behind
	// a glossy blue SONIC, gold-edged, and AT IMMERSIVE GAMEBOX in gold under it.
	function logo(c, x, y, s, alpha) {
		c.save();
		c.globalAlpha = alpha;
		c.translate(x, y);
		c.scale(s, s);
		c.lineJoin = 'round';
		// the ring
		const rg = c.createLinearGradient(0, -280, 0, 240);
		rg.addColorStop(0, '#fff2a0');
		rg.addColorStop(0.35, '#ffc21a');
		rg.addColorStop(0.7, '#d88a00');
		rg.addColorStop(1, '#ffd84a');
		c.shadowColor = 'rgba(255,190,40,0.8)';
		c.shadowBlur = 40;
		c.lineWidth = 50;
		c.strokeStyle = rg;
		c.beginPath();
		c.ellipse(0, -20, 215, 235, 0, 0, TAU);
		c.stroke();
		c.shadowBlur = 0;
		c.lineWidth = 10;
		c.strokeStyle = 'rgba(255,255,230,0.75)';
		c.beginPath();
		c.ellipse(-6, -30, 208, 228, 0, Math.PI * 1.05, Math.PI * 1.75);
		c.stroke();
		// SONIC
		c.font = `290px "${SONIC_FONT}", "Knewave", sans-serif`;
		c.textAlign = 'center';
		c.textBaseline = 'middle';
		c.lineWidth = 56;
		c.strokeStyle = '#06143c';
		c.strokeText('SONIC', 0, -40);
		const gg = c.createLinearGradient(0, -160, 0, 80);
		gg.addColorStop(0, '#fff6b0');
		gg.addColorStop(0.5, '#ffc21a');
		gg.addColorStop(1, '#c07800');
		c.lineWidth = 36;
		c.strokeStyle = gg;
		c.strokeText('SONIC', 0, -40);
		c.lineWidth = 10;
		c.strokeStyle = '#0a2a8a';
		c.strokeText('SONIC', 0, -40);
		const bg = c.createLinearGradient(0, -150, 0, 70);
		bg.addColorStop(0, '#8fd0ff');
		bg.addColorStop(0.45, '#2a6cf0');
		bg.addColorStop(1, '#0b2a9a');
		c.fillStyle = bg;
		c.fillText('SONIC', 0, -40);
		const shine = c.createLinearGradient(0, -150, 0, -30);
		shine.addColorStop(0, 'rgba(255,255,255,0.65)');
		shine.addColorStop(1, 'rgba(255,255,255,0)');
		c.fillStyle = shine;
		c.fillText('SONIC', 0, -40);
		// AT IMMERSIVE GAMEBOX
		c.font = `86px "${SONIC_FONT}", "Knewave", sans-serif`;
		c.lineWidth = 22;
		c.strokeStyle = '#06143c';
		c.strokeText('at IMMERSIVE GAMEBOX', 0, 150);
		const sg = c.createLinearGradient(0, 115, 0, 185);
		sg.addColorStop(0, '#fff6b0');
		sg.addColorStop(0.5, '#ffd23a');
		sg.addColorStop(1, '#e09000');
		c.fillStyle = sg;
		c.fillText('at IMMERSIVE GAMEBOX', 0, 150);
		c.restore();
	}

	const SHOW_HUD = ['controls', 'intro', 'play', 'finale'];
	function overlay(ctx, dt) {
		// a flash: white, or red for a hit
		if (flash > 0.01) art.rect(ctx, 0, 0, WIDTH, H, { fill: `rgba(255,250,235,${Math.min(1, flash) * 0.75})` });
		if (redFlash > 0.01) {
			for (let w = 0; w < 3; w++) {
				const g = ctx.createRadialGradient(w * W + W / 2, H / 2, H * 0.3, w * W + W / 2, H / 2, W * 0.75);
				g.addColorStop(0, 'rgba(255,40,60,0)');
				g.addColorStop(1, `rgba(255,40,60,${redFlash})`);
				ctx.fillStyle = g;
				ctx.fillRect(w * W, 0, W, H);
			}
		}
		// the cinematic bars
		if (letterbox > 0.01) {
			const bar = letterbox * 90;
			art.rect(ctx, 0, 0, WIDTH, bar, { fill: '#000' });
			art.rect(ctx, 0, H - bar, WIDTH, bar, { fill: '#000' });
		}
		// words over things
		for (const p of pops) {
			const at = onAnyWall(tmp.copy(p.at).add(v3().set(0, 2.2, 0)));
			if (!at) continue;
			const kk = p.age / 1.2;
			art.text(ctx, p.text, at.x, at.y - kk * 90, { size: p.size * (kk < 0.15 ? kk / 0.15 : 1), font: SONIC_FONT, fill: p.colour, outline: '#0a1a3a', outlineWidth: 8, alpha: 1 - Math.max(0, kk - 0.6) / 0.4 });
		}
		// taps
		for (const m of marks) {
			const kk = m.age / 0.6;
			ctx.save();
			ctx.globalAlpha = 1 - kk;
			ctx.strokeStyle = m.colour;
			ctx.lineWidth = 8;
			ctx.beginPath();
			ctx.arc(m.x, m.y, 20 + kk * 60, 0, TAU);
			ctx.stroke();
			ctx.restore();
		}

		if (!SHOW_HUD.includes(show.beat) || count < 1) return;
		const colour = PLAYER_COLORS[ctrl];

		// his tag: whose Sonic he is
		if (phase === 'ground' || phase === 'super' || phase === 'handover') {
			const at = onAnyWall(tmp.copy(so.pos).add(v3().set(0, 2.3, 0)));
			if (at) art.text(ctx, 'P' + (ctrl + 1), at.x, at.y, { size: 46, font: SONIC_FONT, fill: colour, outline: '#0a1a3a', outlineWidth: 7 });
		}

		if (phase !== 'finale') {
			// the emeralds he has (top left of the front wall)
			for (let i = 0; i < EMERALDS; i++) {
				const e = emeralds[i];
				const lit = superM.root.visible || held.includes(i) || e.state === 'merged';
				gem(ctx, W + 70 + i * 56, 72, 22, '#' + new THREE.Color(e.colour).getHexString(), lit);
			}
			// his rings
			ctx.save();
			ctx.lineWidth = 9;
			ctx.strokeStyle = '#ffd23a';
			ctx.shadowColor = 'rgba(255,200,40,0.8)';
			ctx.shadowBlur = 12;
			ctx.beginPath();
			ctx.ellipse(W + 70, 136, 20, 22, 0, 0, TAU);
			ctx.stroke();
			ctx.restore();
			const ringFlash = phase === 'ground' || phase === 'super' ? (ringCount === 0 && Math.floor(clock * 3) % 2 ? '#ff3d3d' : '#ffe14a') : '#ffe14a';
			art.text(ctx, String(ringCount), W + 106, 138, { size: 50, font: SONIC_FONT, fill: ringFlash, outline: '#0a1a3a', outlineWidth: 7, align: 'left' });
			// the machine's strength (top right of the front wall)
			const left = Math.max(0, TOTAL_HITS - hits);
			const x0 = 2 * W - 70 - TOTAL_HITS * 30;
			art.text(ctx, 'ROBOTNIK', 2 * W - 70, 44, { size: 30, font: SONIC_FONT, fill: '#ff5a4a', outline: '#0a1a3a', outlineWidth: 5, align: 'right' });
			for (let i = 0; i < TOTAL_HITS; i++) {
				art.roundRect(ctx, x0 + i * 30, 70, 24, 26, 5, { fill: i < left ? '#ff3d3d' : 'rgba(10,20,50,0.55)', stroke: 'rgba(255,255,255,0.6)', lineWidth: 2 });
			}
		}

		// what to do, as it comes up
		const say = (text, fill, y = 255, size = 66, age = phaseT) => show.onWalls(ctx, (c) => show.slam(c, text, W / 2, y, size, age, { fill }));
		if (show.beat === 'play') {
			if (phase === 'super' && superCount === 1 && hits === roundHits && roundHits === 0) say('TAP THE TARGETS ON ROBOTNIK\'S MACHINE!', '#ffd23a');
			if (phase === 'ground' && shockwaves.length && waves <= 2) show.onWalls(ctx, (c) => show.text(c, 'SHOCKWAVE! RUN FOR A GAP!', W / 2, 255, 60, { fill: '#c78aff' }));
			if (phase === 'ground' && held.length === EMERALDS - 1 && Math.floor(clock * 2) % 2) show.onWalls(ctx, (c) => show.text(c, 'ONE MORE EMERALD!', W / 2, 255, 56, { fill: '#2fe86a' }));
		}
		if (phase === 'transform' && phaseT > TF.land) say('SUPER SONIC!', '#ffd23a', 230, 130, phaseT - TF.land);
		if (phase === 'handover') {
			show.onWalls(ctx, function (c) {
				show.slam(c, 'PLAYER ' + (ctrl + 1), W / 2, 260, 130, phaseT, { fill: colour, glow: colour });
				if (phaseT > 0.5) show.text(c, 'YOU\'RE SONIC!', W / 2, 390, 70, { fill: 'white', alpha: Math.min(1, (phaseT - 0.5) * 3) });
				if (phaseT > 1.0) show.text(c, 'STAND IN THE MIDDLE OF THE ROOM', W / 2, 470, 44, { fill: '#ffd23a', alpha: Math.min(1, (phaseT - 1) * 3) });
			});
		}
		if (phase === 'finale' && logoAt >= 0) {
			const lt = phaseT - logoAt;
			// dropping in from above, landing with a thump, settling
			const fall = Math.min(1, lt / 0.35);
			const y = -300 + (470 + 300) * fall * fall;
			const squash = lt > 0.35 ? 1 + Math.sin(Math.min(1, (lt - 0.35) / 0.5) * Math.PI * 3) * 0.06 * (1 - Math.min(1, (lt - 0.35) / 0.5)) : 1;
			ctx.save();
			const dim = Math.min(0.35, lt * 0.6);
			art.rect(ctx, 0, 0, WIDTH, H, { fill: `rgba(0,0,20,${dim})` });
			ctx.restore();
			show.onWalls(ctx, (c) => logo(c, W / 2, y, 0.95 * squash, Math.min(1, lt * 5)));
		}
	}

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		let step = show.paused ? 0 : dt * show.timeScale;
		if (slowmo > 0) { slowmo -= dt; step *= DIVE.slowBy; }
		if (frozen) {
			// (the freeze-frame: only the finale's own clock runs on)
			phaseT += step;
			shake *= Math.exp(-step * 5);
			flash *= Math.exp(-step * 3);
			stepFinale(0);
			aim(0);
		} else simulate(step);
		if (SCENE_BEATS.includes(show.beat)) render();
		show.frame(ctx, dt, (c) => overlay(c, dt));
	};

	/* ---------- input ---------- */

	self.setPlayers = function (p) {
		latest = p;
	};

	// For tests and the console: where the game is up to.
	self.state = function () {
		return Object.assign(show.state(), {
			phase, phaseT, level, hits, roundHits, roundNeed, ctrl, turns: turns.slice(),
			held: held.slice(), scores: scores.slice(), rings: ringCount, ringsOut: rings.length, buzzers: buzzers.length, orbs: orbs.length, homers: homers.length,
			sonic: { theta: so.theta, lat: so.lat, ahead: so.ahead, y: so.y, v: so.v },
			targets: targets.length, missiles: missiles.length, badniks: badniks.length, shockwaves: shockwaves.length,
			timeLeft: show.timeLeft(),
		});
	};

	self.test = {
		// jump to any beat (past the squad, a squad is needed: three, unless one's been given)
		jump(id) {
			$('showtime-picker').remove();
			if (!count) initGame(playersMeta ? playersMeta.length : 3);
			show.go(id);
		},
		emeralds() { for (const e of emeralds) if (e.state === 'field') take(e); },   // (all seven: the transformation)
		hit() { const tg = targets[0]; if (tg) startDive(tg, ctrl); },
		timeLeft(s) { show.setTimeLeft(s); },
	};

	self.fini = function () {
		sound.close();
		unlisten();
		show.fini();
		if (sky.env) sky.env.dispose();
		postfx.dispose();
		renderer.dispose();
		renderer.forceContextLoss();
	};

	/* ---------- go ---------- */

	placeFor(so.theta, so.lat, so.ahead, 0, so.pos);
	scatterEmeralds();

	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
