/*
 * Knuckles Quest
 *
 * Knuckles explores a lost temple, a maze of overgrown stone halls under one
 * carved ceiling, hunting for the three emerald fragments hidden in it (their
 * slots pulse as he nears one). Seen from just behind him, the three walls
 * are one view.
 *
 * Tap anywhere on any wall and he heads for that spot: near enough, he runs
 * there (or climbs, or hops); further off he leaps and glides. Tap through a
 * doorway and he heads for the middle of it. Hit a wall on the way, or tap a
 * wall itself, and he grabs on and climbs (the walls reach the ceiling: never
 * over them); tap above a block and he climbs up onto it. If he's getting no
 * nearer he gives up and stops where he is. The fragments sit on
 * tall plinths in the rooms furthest from the start; rings are everywhere.
 * Find all three and the quest is done (or the clock runs out).
 *
 * Whoever's standing nearest the spot a tap lands on owns that tap (taps
 * carry no player): the rings and fragments he grabs on the way are theirs.
 *
 * The show is Showtime's: the squad picker, the title drop, the clock, the
 * visor check, a tutorial (run, climb, glide), the quest's intro, the play,
 * then TIME! (or the quest done), scores, rank, team, leaderboard, replay,
 * rating and the end.
 *
 * Drawn with three.js, with bloom and ACES tone mapping over all three
 * walls (lib/three/walls.js). Three cameras on one rig, sharing one tilt
 * and one fixed 90-degree field of view across, so the walls meet.
 * Input: wall taps (clicks on the stage), and px/pz for the replay and for
 * who owns a tap. An ES module (manifest: module: true).
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { createWallComposer, createWallRig, SkyDome } from '../../lib/three/walls.js';
import { buildMaze, raycastBoxes, GRID, CELL, WALL, DOOR } from './maze.js';
import { buildClimber, buildRing, buildFragment, buildMarker, buildBrazier, glowTexture, fireTexture, sparkleTexture } from './models.js';

IGB.register('knuckles-quest', function KnucklesQuestGame(stage, playersMeta) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;
	const TAU = Math.PI * 2;

	/* ---------- tuning ---------- */

	const GAME_SECONDS = 600;
	const FOV = 64;                                        // vertical: 90 across each 16:10 wall, so the walls meet
	const CAM = { close: 2.2, back: 6.5, up: 1.1, pitch: 9, turn: 2.2, look: 1.3, below: 0.7 };   // metres behind him in a doorway (squared up to it) and otherwise, and above him, degrees down, how fast it swings round behind him, how high on him it aims, how far under the wall tops it stays (so you never see over them)
	const BODY = { r: 0.4, h: 1.7, step: 0.45 };           // his radius, height, and the ledge he just steps up
	const RUN = 8.5;                                       // metres a second, running
	const RUN_RANGE = 14;                                  // how far off a spot on the same level can be for him to just run there
	const CLIMB = 3.4;                                     // metres a second, climbing
	const GRAVITY = 24;
	const JUMP = { across: 7.5, max: 6.5, min: 1.6 };      // speed across while rising; the highest and lowest leaps
	const GLIDE = { speed: 10.5, sink: 2.2 };              // speed across and fall, gliding
	const MANTLE = 0.35;                                   // seconds to haul himself up over an edge
	const TRIES = 2;                                       // leaps at one spot before he gives up on it
	const STALL = { time: 1.0, gain: 0.5, max: 6 };        // he gives up (and stops where he is) if he's got no nearer by this much in this long, or after this long at all
	const REACH = { ring: 1.2, fragment: 1.7 };            // how near counts as grabbing
	const POINTS = { ring: 1, fragment: 25 };
	const DOOR_STEP = { e: [1, 0], w: [-1, 0], s: [0, 1], n: [0, -1] };   // (which way each doorway of a room leads)
	const SENSE = 45;                                      // metres off a missing fragment's slot starts to pulse (faster and brighter nearer)

	/* ---------- renderer, scene, cameras ---------- */

	const renderer = new THREE.WebGLRenderer({ antialias: false });   // (the composer multisamples)
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.0;
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
	const HORIZON = new THREE.Color(0x12241e);   // (a lost temple: a green-black murk in the distance)
	scene.fog = new THREE.Fog(HORIZON, 28, 120);

	// a sunset sky; the same GLSL lights the scene
	const SUN = new THREE.Vector3(0.55, 0.22, -0.8).normalize();
	const sky = new SkyDome(/* glsl */`
		uniform vec3 sunDir;
		vec3 skyColor(vec3 d) {
			float y = d.y;
			vec3 zenith = vec3(0.16, 0.20, 0.52);
			vec3 mid = vec3(0.62, 0.42, 0.62);
			vec3 horizon = vec3(1.0, 0.66, 0.40);
			vec3 col = y > 0.0 ? mix(mix(horizon, mid, smoothstep(0.0, 0.25, y)), zenith, smoothstep(0.2, 0.9, y)) : mix(horizon, vec3(0.30, 0.22, 0.30), clamp(-y * 3.0, 0.0, 1.0));
			float s = max(dot(d, sunDir), 0.0);
			col += vec3(1.0, 0.62, 0.30) * pow(s, 5.0) * 0.45;
			col += vec3(1.0, 0.85, 0.6) * pow(s, 60.0) * 0.8;
			return pow(col, vec3(2.2));
		}
		#define SKY_EXTRA
		vec3 skyExtra(vec3 d) { return vec3(1.0, 0.85, 0.6) * smoothstep(0.9990, 0.9995, dot(d, sunDir)) * 12.0; }
	`, { sunDir: { value: SUN } }, 900);
	scene.add(sky);
	scene.environment = sky.environment(renderer);

	scene.add(new THREE.HemisphereLight(0x9cd8c0, 0x2a2a1c, 0.9));   // (under the ceiling: a cool jade gloom, the braziers and the shafts of light doing the rest)
	const sun = new THREE.DirectionalLight(0xffe2a8, 1.3);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 220 });
	sun.shadow.camera.updateProjectionMatrix();
	sun.shadow.bias = -0.0005;
	sun.shadow.normalBias = 0.04;
	scene.add(sun, sun.target);

	postfx = createWallComposer(renderer, scene, { strength: 0.55, radius: 0.55, threshold: 0.9 });

	const walls = createWallRig({ fov: FOV, aspect: W / H, near: 0.1, far: 1200 });
	scene.add(walls.rig);
	const cams = walls.cameras;   // left, front, right
	const PITCH = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -CAM.pitch * Math.PI / 180);

	/* ---------- the maze and what's in it ---------- */

	const maze = buildMaze(scene, { aniso: renderer.capabilities.getMaxAnisotropy() });
	const TEX = { glow: glowTexture(), fire: fireTexture(), sparkle: sparkleTexture() };

	const rings = maze.rings.map((p) => {
		const m = buildRing();
		m.position.copy(p);
		m.rotation.y = Math.random() * TAU;
		scene.add(m);
		return { pos: p, mesh: m, taken: false };
	});

	const fragments = maze.fragments.map((f, i) => {
		const g = buildFragment();
		g.position.copy(f.pos);
		scene.add(g);
		const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(0x2dff7a).multiplyScalar(2.5), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
		glow.scale.setScalar(3.2);
		g.add(glow);
		const light = new THREE.PointLight(0x40ff80, 18, 16, 2);
		light.position.copy(f.pos);
		scene.add(light);
		return { pos: f.pos, room: f.room, mesh: g, light, glow, taken: false, n: i };
	});

	const braziers = maze.braziers.map((p) => {
		const b = buildBrazier(TEX.fire);
		const room = maze.roomAt(p.x, p.z);
		b.position.copy(p);
		b.rotation.y = Math.atan2(p.x - room.cx, p.z - room.cz);   // (its bracket toward the wall)
		scene.add(b);
		return b;
	});

	/* ---------- the climber ---------- */

	const model = buildClimber();
	scene.add(model.root);
	const kn = {
		pos: maze.start.clone(),
		vel: new THREE.Vector3(),
		state: 'ground',            // ground, air, climb, mantle
		glide: false,
		face: null,                 // climbing: { box, n }
		mantle: null,               // { from, to, t }
		yaw: 0,                     // 0 faces -z
		goal: null,                 // { point, normal, box, kind: 'top' | 'face', by, tries }
		lastBy: 0,
		climbPace: 0,
		runPace: 0,
		glideT: 0,
	};
	let camYaw = 0;
	let camClose = 0;           // 0..1: how far the eye's come in close behind him (in a doorway)
	const markerMesh = buildMarker();
	markerMesh.visible = false;
	scene.add(markerMesh);
	let markerAge = 0;

	// (for the tutorial)
	const did = { ran: false, climbed: false, glided: false };

	/* ---------- the show ---------- */

	let count = 0;
	let scores = [];
	let latest = [];
	let clock = 0;
	let t = 0;
	let found = 0;
	let doneAt = -1;            // when the third fragment was found (clock)
	const marks = [];           // where taps landed on the walls: { x, y, colour, age }
	const pops = [];            // words over things: { text, colour, at, age, size }
	const sparks = [];          // { sprite, age, life, size }
	const live = () => show.beat === 'controls' || show.beat === 'intro' || show.beat === 'play';

	const show = new Showtime(stage, {
		id: 'knuckles-quest',
		seconds: GAME_SECONDS,
		players: () => count,
		scores: () => scores,
		music: false,
		theme: { accent: '#d8262e', accent2: '#2dff7a', gold: '#ffd23a', ink: '#1a0a0a', sky: ['#1a0a1e', '#6a2a3a'], glow: 'rgba(45,255,122,0.35)' },
	});

	const TUTORIAL = [
		{ caption: 'TAP THE GROUND: HE RUNS THERE', min: 2, max: 14, did: () => did.ran },
		{ caption: 'TAP A WALL: HE CLIMBS IT', min: 2, max: 14, did: () => did.climbed },
		{ caption: 'TAP SOMEWHERE FAR: HE LEAPS AND GLIDES', min: 2, max: 14, did: () => did.glided },
	];

	show.sequence([
		{ id: 'squad', length: Infinity },
		show.beats.titleDrop(),
		show.beats.clockIntro(),
		show.beats.visors(),
		show.beats.tutorial({ steps: TUTORIAL }),
		{
			id: 'intro',
			length: 4,
			enter() {
				scores = scores.map(() => 0);   // (the tutorial's rings don't count)
				show.fx('villainReveal');
			},
			draw(ctx, bt) {
				show.onWalls(ctx, function (c, n) {
					show.slam(c, 'FIND THE 3 EMERALD FRAGMENTS!', W / 2, 260, 92, bt - 0.2, { fill: '#2dff7a' });
					if (n !== 1 && bt > 1.2) show.text(c, 'THEY\'RE HIDDEN IN THE MAZE, UP HIGH', W / 2, 380, 44, { fill: 'white', alpha: Math.min(1, (bt - 1.2) * 3) });
				});
			},
		},
		{
			id: 'play',
			length: Infinity,
			update(dt) {
				t += dt;
				show.record(t, latest.slice(0, count));
				if (doneAt >= 0 && clock - doneAt > 3.2) show.go('timeup');
			},
			draw(ctx) {
				if (doneAt < 0) return;
				show.onWalls(ctx, (c) => show.slam(c, 'QUEST COMPLETE!', W / 2, 330, 130, clock - doneAt, { fill: '#2dff7a' }));
			},
		},
		show.beats.timeUp(),
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

	function initGame(n) {
		count = n;
		scores = new Array(n).fill(0);
		show.go('title');
	}

	/* ---------- the boxes ---------- */

	const boxes = maze.boxes;
	const inFoot = (b, x, z, pad) => x > b.min.x - pad && x < b.max.x + pad && z > b.min.z - pad && z < b.max.z + pad;

	// The highest top under (x, z) at or below y (within a small step).
	function supportAt(x, z, y, pad = BODY.r * 0.5) {
		let best = null;
		for (const b of boxes) {
			if (b.max.y > y + 0.06 || !inFoot(b, x, z, pad)) continue;
			if (!best || b.max.y > best.max.y) best = b;
		}
		return best;
	}

	// Would his body stand clear at (x, y, z)?
	function blockedAt(x, y, z) {
		for (const b of boxes) {
			if (b.kind === 'floor') continue;
			if (inFoot(b, x, z, BODY.r) && y < b.max.y - 0.02 && y + BODY.h > b.min.y) return b;
		}
		return null;
	}

	// Can he run straight from a to b (same level) without meeting anything taller than a step?
	function clearRun(a, b) {
		const n = Math.ceil(a.distanceTo(b) / 0.5);
		for (let i = 1; i <= n; i++) {
			const x = a.x + (b.x - a.x) * i / n, z = a.z + (b.z - a.z) * i / n;
			if (blockedAt(x, a.y + BODY.step, z)) return false;
			const s = supportAt(x, z, a.y + BODY.step);
			if (!s || a.y - s.max.y > 0.6) return false;   // (a drop on the way)
		}
		return true;
	}

	// Push him out of any box he's moved into; returns the face he hit
	// side-on ({ box, n }) or null. Also lands him (ground) or bumps his head.
	const prev = new THREE.Vector3();
	function collide(p, vel) {
		let hitFace = null;
		for (const b of boxes) {
			if (b.kind === 'floor') continue;
			if (!inFoot(b, p.x, p.z, BODY.r) || p.y >= b.max.y - 0.001 || p.y + BODY.h <= b.min.y) continue;
			// from above: land on it (if he's over it enough to stand; on its very edge he slides off)
			const above = prev.y >= b.max.y - 0.05 && vel.y <= 0;
			if (above && inFoot(b, p.x, p.z, BODY.r * 0.5)) { p.y = b.max.y; vel.y = 0; continue; }
			// from below: bump his head
			if (prev.y + BODY.h <= b.min.y + 0.05 && vel.y > 0) { p.y = b.min.y - BODY.h; vel.y = 0; continue; }
			// side-on: out along the shallower way
			const dxMin = p.x - (b.min.x - BODY.r), dxMax = (b.max.x + BODY.r) - p.x;
			const dzMin = p.z - (b.min.z - BODY.r), dzMax = (b.max.z + BODY.r) - p.z;
			const m = Math.min(dxMin, dxMax, dzMin, dzMax);
			const n = new THREE.Vector3();
			if (m === dxMin) { p.x = b.min.x - BODY.r; n.set(-1, 0, 0); }
			else if (m === dxMax) { p.x = b.max.x + BODY.r; n.set(1, 0, 0); }
			else if (m === dzMin) { p.z = b.min.z - BODY.r; n.set(0, 0, -1); }
			else { p.z = b.max.z + BODY.r; n.set(0, 0, 1); }
			if (above) continue;   // (off the edge: pushed clear, no face to grab)
			if (!hitFace || b.max.y > hitFace.box.max.y) hitFace = { box: b, n };
		}
		if (p.y < 0) { p.y = 0; if (vel.y < 0) vel.y = 0; }
		return hitFace;
	}

	/* ---------- moving him ---------- */

	const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

	function faceYaw(dx, dz) {
		if (dx * dx + dz * dz > 1e-6) kn.yaw = Math.atan2(-dx, -dz);
	}

	// leap toward the goal, high enough for how far up it is
	function leap(extra = 0) {
		const g = kn.goal;
		const dy = g ? g.point.y - kn.pos.y : 0;
		const h = Math.max(JUMP.min, Math.min(JUMP.max, dy + 1.4 + extra));
		kn.vel.y = Math.sqrt(2 * GRAVITY * h);
		if (g) {
			tmp.set(g.point.x - kn.pos.x, 0, g.point.z - kn.pos.z);
			const d = tmp.length();
			tmp.normalize().multiplyScalar(Math.min(JUMP.across, d * 2));
			kn.vel.x = tmp.x;
			kn.vel.z = tmp.z;
			g.tries++;
			if (g.tries > TRIES) kn.goal = null;
		}
		kn.state = 'air';
		kn.glide = false;
		kn.face = null;
		show.fx('whoosh', 0.35, 1.3);
	}

	// (does it reach the ceiling? nothing can stand on top of it)
	const topless = (b) => b.max.y > WALL.ceil - BODY.h;

	function startClimb(face) {
		kn.state = 'climb';
		kn.face = face;
		kn.vel.set(0, 0, 0);
		kn.glide = false;
		faceYaw(-face.n.x, -face.n.z);
		did.climbed = true;
		show.fx('climb', 0.4);
	}

	function land() {
		if (kn.vel.y < -12) show.fx('stomp', 0.3, 1.4);
		kn.state = 'ground';
		kn.glide = false;
		kn.vel.set(0, 0, 0);
	}

	// a doorway he's standing in (within a couple of metres of its middle), as the way
	// to look through it (along the camera's way): { yaw } or null
	function doorNear(p) {
		for (const r of maze.rooms.flat()) for (const w of Object.keys(r.open)) {
			const [dx, dz] = DOOR_STEP[w];
			const x = r.cx + dx * CELL / 2, z = r.cz + dz * CELL / 2, y = r.raised[w] ? DOOR.high : 0;
			if (Math.hypot(p.x - x, p.z - z) > 2.2 || Math.abs(p.y - y) > 1) continue;
			// (through it, whichever way the eye's already facing)
			const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
			const tx = dx ? (fx >= 0 ? 1 : -1) : 0, tz = dz ? (fz >= 0 ? 1 : -1) : 0;
			return { yaw: Math.atan2(-tx, -tz) };
		}
		return null;
	}

	function reached() {
		if (kn.goal && kn.goal.kind === 'top') did.ran = true;
		// in a doorway: face through it, and the eye squares up close behind him (till the next tap)
		const door = kn.goal && kn.goal.kind === 'top' ? doorNear(kn.pos) : null;
		if (door) { kn.atDoor = door; kn.yaw = door.yaw; }
		kn.goal = null;
		markerAge = Math.max(markerAge, 1.6);
	}

	function stepGround(dt) {
		const p = kn.pos, g = kn.goal;
		kn.runPace += ((g ? 1 : 0) - kn.runPace) * Math.min(1, dt * 6);
		// still standing on something?
		const s = supportAt(p.x, p.z, p.y);
		if (!s || p.y - s.max.y > 0.05) { kn.state = 'air'; kn.vel.y = 0; kn.glide = false; return; }
		p.y = s.max.y;
		if (!g) return;
		const dx = g.point.x - p.x, dz = g.point.z - p.z;
		const dist = Math.hypot(dx, dz);
		const dy = g.point.y - p.y;
		let run = false;
		if (g.kind === 'top') {
			if (dist < 0.3 && Math.abs(dy) < 0.6) { reached(); return; }
			if (Math.abs(dy) <= 0.6 && dist < RUN_RANGE && clearRun(p, tmp2.set(g.point.x, p.y, g.point.z))) run = true;
			else if (dy < -0.6 && dist < 5) run = true;   // (just step off the edge)
		} else {
			// a spot on a wall: run to its foot if it's near and low enough, else leap at it
			if (dy < 3 && dist < RUN_RANGE && clearRun(p, tmp2.set(g.point.x + g.normal.x * BODY.r * 1.5, p.y, g.point.z + g.normal.z * BODY.r * 1.5))) run = true;
		}
		if (!run) { leap(); return; }
		// run toward it
		const step = Math.min(dist, RUN * dt);
		faceYaw(dx, dz);
		prev.copy(p);
		p.x += dx / dist * step;
		p.z += dz / dist * step;
		// a step up?
		const up = blockedAt(p.x, p.y, p.z);
		if (up && up.max.y - p.y <= BODY.step && !blockedAt(p.x, up.max.y, p.z)) { p.y = up.max.y; return; }
		const hit = collide(p, kn.vel);
		if (hit) {
			const toGoalBox = g.box === hit.box;
			const height = hit.box.max.y - p.y;
			if (toGoalBox || height > JUMP.max - 0.5) startClimb(hit);   // (too tall to leap: climb it)
			else leap(height - Math.max(0, g.point.y - p.y) + 0.6);
		}
	}

	function stepAir(dt) {
		const p = kn.pos, v = kn.vel, g = kn.goal;
		v.y -= GRAVITY * dt;
		let across = JUMP.across;
		if (g) {
			const dx = g.point.x - p.x, dz = g.point.z - p.z;
			const dist = Math.hypot(dx, dz);
			// falling with the goal still away: glide
			kn.glide = v.y < 0 && dist > 0.8;
			if (kn.glide) {
				v.y = Math.max(v.y, -GLIDE.sink);
				across = GLIDE.speed;
				kn.glideT += dt;
				if (kn.glideT > 0.6) did.glided = true;
			}
			if (dist > 0.4) {
				const want = Math.min(across, dist * 3);
				v.x += (dx / dist * want - v.x) * Math.min(1, dt * 4);
				v.z += (dz / dist * want - v.z) * Math.min(1, dt * 4);
				faceYaw(v.x, v.z);
			} else { v.x *= Math.exp(-dt * 8); v.z *= Math.exp(-dt * 8); }
		} else {
			kn.glide = false;
			v.x *= Math.exp(-dt * 1.5);
			v.z *= Math.exp(-dt * 1.5);
		}
		if (!kn.glide) kn.glideT = 0;
		prev.copy(p);
		p.addScaledVector(v, dt);
		const hit = collide(p, v);
		// landed on a top (or the floor)?
		const s = supportAt(p.x, p.z, p.y);
		if (v.y <= 0 && s && p.y - s.max.y <= 0.02) {
			p.y = s.max.y;
			land();
			if (g && g.kind === 'top' && Math.hypot(g.point.x - p.x, g.point.z - p.z) < 0.8 && Math.abs(g.point.y - p.y) < 0.6) reached();
			return;
		}
		if (hit) {
			// nearly at its top: vault onto it; otherwise grab on
			if (hit.box.max.y - p.y < 0.8 && !topless(hit.box)) { kn.state = 'mantle'; kn.mantle = { from: p.clone(), to: tmp.set(p.x - hit.n.x * (BODY.r + 0.3), hit.box.max.y, p.z - hit.n.z * (BODY.r + 0.3)).clone(), t: 0 }; return; }
			startClimb(hit);
		}
	}

	function stepClimb(dt) {
		const p = kn.pos, f = kn.face, g = kn.goal, b = f.box;
		// stay flat against the face
		if (f.n.x) p.x = f.n.x > 0 ? b.max.x + BODY.r : b.min.x - BODY.r;
		else p.z = f.n.z > 0 ? b.max.z + BODY.r : b.min.z - BODY.r;
		const along = f.n.x ? 'z' : 'x';
		let wantUp = 0, wantAlong = 0, hold = true;
		if (g) {
			const sameFace = g.kind === 'face' && g.box === b && g.normal.equals(f.n);
			const overThis = g.point.y >= b.max.y - 0.3 && (g.box === b || inFoot(b, g.point.x, g.point.z, 0.6));
			// (a goal on the far side of this wall: over it, not off it)
			const beyond = (g.point.x - p.x) * -f.n.x + (g.point.z - p.z) * -f.n.z > (b.max.x - b.min.x) * Math.abs(f.n.x) + (b.max.z - b.min.z) * Math.abs(f.n.z);
			if (sameFace) {
				// climb across the face to the spot (his middle at it)
				const ty = g.point.y - BODY.h * 0.55;
				wantUp = ty - p.y;
				wantAlong = g.point[along] - p[along];
				if (Math.abs(wantUp) < 0.3 && Math.abs(wantAlong) < 0.3) { reached(); wantUp = wantAlong = 0; }
				hold = false;
			} else if (overThis || beyond || (g.point.y > p.y + 0.5 && inFoot(b, g.point.x, g.point.z, 3))) {
				wantUp = 99;   // up and over
				hold = false;
			} else if (g.point.y < p.y - 0.5 && Math.hypot(g.point.x - p.x, g.point.z - p.z) < 3) {
				wantUp = -99;  // down to the ground near the foot of it
				hold = false;
			} else {
				// somewhere else: kick off the wall toward it
				p.x += f.n.x * 0.1;
				p.z += f.n.z * 0.1;
				leap(0.6);
				kn.vel.x += f.n.x * 3;
				kn.vel.z += f.n.z * 3;
				return;
			}
		}
		if (hold) { kn.climbPace *= Math.exp(-dt * 10); return; }
		const mag = Math.hypot(wantUp, wantAlong);
		const step = Math.min(mag, CLIMB * dt);
		const du = wantUp / (mag || 1) * step, da = wantAlong / (mag || 1) * step;
		p.y += du;
		p[along] = Math.max(b.min[along] + 0.1, Math.min(b.max[along] - 0.1, p[along] + da));
		kn.climbPace = (du + Math.abs(da) * 0.6) / Math.max(dt, 1e-4) / CLIMB;
		// at the top of something that reaches the ceiling (a wall, a pillar): no way over, so he stops there
		if (topless(b) && p.y + BODY.h * 0.8 >= b.max.y - 0.3 && du > 0) {
			p.y = b.max.y - 0.3 - BODY.h * 0.8;
			kn.goal = null;
			kn.climbPace = 0;
			return;
		}
		// at the top: haul up over it
		if (p.y + BODY.h * 0.8 >= b.max.y && du > 0) {
			kn.state = 'mantle';
			kn.mantle = { from: p.clone(), to: new THREE.Vector3(p.x - f.n.x * (BODY.r + 0.5), b.max.y, p.z - f.n.z * (BODY.r + 0.5)), t: 0 };
			show.fx('climb', 0.3, 1.3);
			return;
		}
		// at the bottom: back on his feet
		const s = supportAt(p.x + f.n.x * 0.05, p.z + f.n.z * 0.05, p.y);
		if (du < 0 && s && p.y <= s.max.y + 0.02) { p.y = s.max.y; kn.state = 'ground'; kn.face = null; }
	}

	function stepMantle(dt) {
		const m = kn.mantle;
		m.t += dt / MANTLE;
		const e = Math.min(1, m.t);
		// up first, then over
		kn.pos.set(m.from.x + (m.to.x - m.from.x) * Math.max(0, e * 2 - 1), m.from.y + (m.to.y - m.from.y) * Math.min(1, e * 1.6), m.from.z + (m.to.z - m.from.z) * Math.max(0, e * 2 - 1));
		if (e >= 1) { kn.pos.copy(m.to); kn.state = 'ground'; kn.face = null; kn.mantle = null; }
	}

	// not getting any nearer (or taking too long)? drop the goal and stop wherever he's
	// got to: standing, hanging on the wall, or dropping straight down
	function giveUp(dt) {
		const g = kn.goal;
		if (!g || kn.state === 'mantle') return;
		const d = kn.pos.distanceTo(g.point);
		g.age = (g.age || 0) + dt;
		if (g.best === undefined || d < g.best - STALL.gain) { g.best = d; g.since = 0; }
		else g.since += dt;
		if (g.since > STALL.time || g.age > STALL.max) {
			kn.goal = null;
			kn.vel.x *= 0.2;
			kn.vel.z *= 0.2;
			markerAge = Math.max(markerAge, 1.6);
		}
	}

	function simulate(dt) {
		clock += dt;
		maze.update(clock);
		if (show.paused) return;
		if (live()) {
			giveUp(dt);
			if (kn.state === 'ground') stepGround(dt);
			else if (kn.state === 'air') stepAir(dt);
			else if (kn.state === 'climb') stepClimb(dt);
			else if (kn.state === 'mantle') stepMantle(dt);
		}
		// fell off the island's edge somehow? back to the start
		if (kn.pos.y < -20) { kn.pos.copy(maze.start); kn.vel.set(0, 0, 0); kn.state = 'ground'; }

		// rooms seen (for the map)
		const room = maze.roomAt(kn.pos.x, kn.pos.z);
		if (room) room.seen = true;

		// grab things
		const mid = tmp.copy(kn.pos).add(tmp2.set(0, 0.9, 0));
		for (const r of rings) {
			if (r.taken || r.pos.distanceTo(mid) > REACH.ring) continue;
			r.taken = true;
			r.mesh.visible = false;
			if (show.beat === 'play' || show.beat === 'controls') scores[kn.lastBy] = (scores[kn.lastBy] || 0) + POINTS.ring;
			sparkle(r.pos, 0xfff2a0, 1.8);
			pop('+1', PLAYER_COLORS[kn.lastBy], r.pos, 56);
			show.fx('coin', 0.35, 1 + Math.random() * 0.2);
		}
		for (const f of fragments) {
			if (f.taken || f.pos.distanceTo(mid) > REACH.fragment) continue;
			if (show.beat !== 'play') continue;   // (they're the quest: only in play)
			f.taken = true;
			f.takenAt = clock;
			found++;
			scores[kn.lastBy] = (scores[kn.lastBy] || 0) + POINTS.fragment;
			for (let i = 0; i < 8; i++) sparkle(f.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2)), 0x6aff9a, 2.5);
			pop('FRAGMENT ' + found + '/3!', '#2dff7a', f.pos, 80);
			show.fx('fanfare', 0.5);
			show.flash = 0.4;
			show.confetti(found === 3 ? 160 : 50);
			if (found === 3) { doneAt = clock; show.fx('roundClear', 0.6); }
		}

		// things alive
		for (const r of rings) if (!r.taken) r.mesh.rotation.y += dt * 2.6;
		for (const f of fragments) {
			if (f.taken) {
				const a = clock - f.takenAt;
				f.mesh.position.y = f.pos.y + a * 4;
				f.mesh.scale.setScalar(Math.max(0, 1 - a * 0.8));
				f.light.intensity = Math.max(0, 18 * (1 - a));
				f.mesh.visible = a < 1.3;
				continue;
			}
			f.mesh.rotation.y += dt * 1.4;
			f.mesh.position.y = f.pos.y + Math.sin(clock * 2 + f.n) * 0.18;
			f.glow.material.opacity = 0.7 + Math.sin(clock * 3 + f.n) * 0.25;
			f.light.intensity = 16 + Math.sin(clock * 3 + f.n) * 4;
		}
		for (const b of braziers) b.userData.flames.forEach((s, i) => { s.scale.y = (1.2 - i * 0.3) * (1 + Math.sin(clock * 13 + i * 2 + b.position.x) * 0.12); s.material.rotation = Math.sin(clock * 7 + i) * 0.1; });
		for (const s of sparks) { s.age += dt; const q = s.age / s.life; s.sprite.scale.setScalar(s.size * (0.6 + q)); s.sprite.material.opacity = 1 - q; s.sprite.position.y += dt * 1.2; }
		for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].age >= sparks[i].life) { scene.remove(sparks[i].sprite); sparks[i].sprite.material.dispose(); sparks.splice(i, 1); }
		for (const p of pops) p.age += dt;
		for (let i = pops.length - 1; i >= 0; i--) if (pops[i].age > 1.2) pops.splice(i, 1);
		for (const m of marks) m.age += dt;
		for (let i = marks.length - 1; i >= 0; i--) if (marks[i].age > 0.8) marks.splice(i, 1);

		// the marker: fades once he's there
		if (markerMesh.visible) {
			markerAge += dt;
			if (!kn.goal) markerAge = Math.max(markerAge, 1.4);
			const fade = markerAge < 1.4 ? 1 : Math.max(0, 1 - (markerAge - 1.4) / 0.4);
			markerMesh.material.opacity = fade * (0.75 + Math.sin(clock * 10) * 0.25);
			markerMesh.scale.setScalar(1 + Math.sin(clock * 6) * 0.08);
			if (fade <= 0) markerMesh.visible = false;
		}

		// the model
		const m = model;
		m.root.position.copy(kn.pos);
		m.root.rotation.y = kn.yaw;
		const mode = kn.state === 'climb' ? 'climb' : kn.state === 'mantle' ? 'climb' : kn.state === 'air' ? (kn.glide ? 'glide' : kn.vel.y > 0 ? 'jump' : 'fall') : (kn.goal ? 'run' : 'idle');
		m.animate(dt, mode, mode === 'climb' ? (kn.state === 'mantle' ? 1.5 : kn.climbPace) : kn.runPace, clock);

		// the eye: behind him, swinging round to face the way he's going
		const moving = kn.state === 'ground' && kn.goal || kn.state === 'air';
		if (moving) {
			let d = kn.yaw - camYaw;
			d = Math.atan2(Math.sin(d), Math.cos(d));
			camYaw += d * Math.min(1, dt * CAM.turn);
		} else if (kn.atDoor) {
			// in a doorway: square up to it
			let d = kn.atDoor.yaw - camYaw;
			d = Math.atan2(Math.sin(d), Math.cos(d));
			camYaw += d * Math.min(1, dt * 4);
		} else if (!live()) camYaw += dt * 0.12;   // (slowly round, before the quest starts)
		camClose += ((kn.atDoor ? 1 : 0) - camClose) * Math.min(1, dt * 3);
		const head = tmp.copy(kn.pos).add(tmp2.set(0, CAM.look, 0));
		const back = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
		const want = head.clone().addScaledVector(back, CAM.back + (CAM.close - CAM.back) * camClose).add(tmp2.set(0, CAM.up * (1 - camClose * 0.6), 0));
		// (kept under the wall tops, unless he's up on top of one himself)
		want.y = Math.min(want.y, Math.max(WALL.h - CAM.below, kn.pos.y + 1.0), WALL.ceil - 1.2);   // (and always under the ceiling's beams)
		// (pulled in if a wall's in the way)
		const dir = want.clone().sub(head);
		const len = dir.length();
		dir.normalize();
		const hit = raycastBoxes(boxes, head, dir, len);
		const eye = hit ? head.clone().addScaledVector(dir, Math.max(1.2, hit.t - 0.6)) : want;
		walls.rig.position.lerp(eye, Math.min(1, dt * 8));
		walls.rig.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), camYaw).multiply(PITCH);

		// the sun and its shadows round him
		sun.target.position.copy(kn.pos);
		sun.position.copy(kn.pos).addScaledVector(SUN, 120);
		sky.follow(walls.rig.position);
	}

	function sparkle(at, colour = 0xffffff, size = 2) {
		const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sparkle, color: new THREE.Color(colour).multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
		s.position.copy(at);
		s.scale.setScalar(size);
		scene.add(s);
		sparks.push({ sprite: s, age: 0, life: 0.5, size });
	}
	function pop(text, colour, at, size = 60) { pops.push({ text, colour, at: at.clone(), age: 0, size }); }

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

	function tap(at) {
		if (show.paused || !live()) return;
		const wall = Math.floor(at.x / W);
		if (wall < 0 || wall > 2) return;
		const by = nearest(at);
		ndc.set((at.x - wall * W) / W * 2 - 1, 1 - at.y / H * 2);
		raycaster.setFromCamera(ndc, cams[wall]);
		const o = raycaster.ray.origin, d = raycaster.ray.direction;
		marks.push({ x: at.x, y: at.y, colour: PLAYER_COLORS[by], age: 0 });

		let goal = null;
		// a fragment or ring near the line? go for it (to whatever it sits over)
		const wantThing = (p, slack) => {
			const v = tmp.copy(p).sub(o);
			const tt = v.dot(d);
			return tt > 1 && v.addScaledVector(d, -tt).length() < slack ? tt : Infinity;
		};
		let bestT = Infinity, thing = null;
		for (const f of fragments) if (!f.taken) { const tt = wantThing(f.pos, 1.6); if (tt < bestT) { bestT = tt; thing = f.pos; } }
		const hit = raycastBoxes(boxes, o, d, 400);
		if (thing && (!hit || bestT < hit.t + 1)) {
			const s = supportAt(thing.x, thing.z, thing.y);
			goal = { point: new THREE.Vector3(thing.x, s ? s.max.y : 0, thing.z), normal: new THREE.Vector3(0, 1, 0), box: s, kind: 'top' };
		} else if (hit && hit.box.kind !== 'ceiling') {
			if (hit.normal.y < -0.5) return;   // (the underside of a lintel: nowhere to go)
			if (hit.normal.y > 0.5) goal = { point: hit.point, normal: hit.normal, box: hit.box, kind: 'top' };
			else if (hit.box.max.y - hit.point.y < 0.9 && hit.box.kind === 'block') {
				// (just under its top edge, whose top the low eye can't see: up onto it)
				const b = hit.box;
				const pt = hit.point.clone().addScaledVector(hit.normal, -0.7);
				pt.x = Math.max(b.min.x + 0.2, Math.min(b.max.x - 0.2, pt.x));
				pt.z = Math.max(b.min.z + 0.2, Math.min(b.max.z - 0.2, pt.z));
				pt.y = b.max.y;
				goal = { point: pt, normal: new THREE.Vector3(0, 1, 0), box: b, kind: 'top' };
			} else {
				const b = hit.box;
				const pt = hit.point.clone();
				pt.y = Math.max(b.min.y + BODY.h * 0.6, Math.min(b.max.y - 0.2, pt.y));
				goal = { point: pt, normal: hit.normal, box: b, kind: 'face' };
			}
		} else {
			// up at the ceiling (over a wall, through a raised doorway): the ground under the tap, a room or so off
			const flat = Math.hypot(d.x, d.z);
			if (flat < 0.2) return;
			const q = o.clone().addScaledVector(d, 18 / flat);
			const { lo, hi } = maze.bounds;
			q.x = Math.max(lo + 1, Math.min(hi - 1, q.x));
			q.z = Math.max(lo + 1, Math.min(hi - 1, q.z));
			const s = supportAt(q.x, q.z, q.y);
			goal = { point: new THREE.Vector3(q.x, s ? s.max.y : 0, q.z), normal: new THREE.Vector3(0, 1, 0), box: s, kind: 'top' };
		}
		if (!goal) return;
		// somewhere through a doorway (in another room): to the middle of the doorway out of this one, that way
		const here = maze.roomAt(kn.pos.x, kn.pos.z), there = maze.roomAt(goal.point.x, goal.point.z);
		if (here && there && here !== there) {
			const di = there.i - here.i, dj = there.j - here.j;
			const ways = Math.abs(di) >= Math.abs(dj) ? [di > 0 ? 'e' : 'w', dj > 0 ? 's' : 'n'] : [dj > 0 ? 's' : 'n', di > 0 ? 'e' : 'w'];
			const way = ways.find((w, k) => here.open[w] && (k === 0 || (k === 1 && (w === 'e' || w === 'w' ? di : dj) !== 0)));
			if (way) {
				const [dx, dz] = DOOR_STEP[way];
				const door = new THREE.Vector3(here.cx + dx * CELL / 2, here.raised[way] ? DOOR.high : 0, here.cz + dz * CELL / 2);
				if (Math.hypot(door.x - kn.pos.x, door.z - kn.pos.z) > 1.5) goal = { point: door, normal: new THREE.Vector3(0, 1, 0), box: supportAt(door.x, door.z, door.y + 0.1), kind: 'top' };
			}
		}
		goal.by = by;
		goal.tries = 0;
		kn.atDoor = null;
		kn.goal = goal;
		kn.lastBy = by;
		// the marker on the spot
		markerMesh.position.copy(goal.point).addScaledVector(goal.normal, 0.04);
		markerMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), goal.normal);
		markerMesh.material.color.set(PLAYER_COLORS[by]).multiplyScalar(2.2);
		markerMesh.visible = true;
		markerAge = 0;
		show.fx('tap', 0.3);
	}

	stage.$el.on('click', function (e) {
		if (e.target && e.target.closest && e.target.closest('button')) return;
		tap(IGB.toWorld(e));
	});

	/* ---------- drawing ---------- */

	const SCENE_BEATS = ['squad', 'title', 'clock', 'visors', 'controls', 'intro', 'play', 'timeup'];
	function render() {
		postfx.render(walls.views(renderer.domElement.width, renderer.domElement.height));
	}

	const pv = new THREE.Vector3();
	function onAnyWall(v) {
		for (const w of [1, 0, 2]) {
			pv.copy(v).project(cams[w]);
			if (pv.z < 1 && Math.abs(pv.x) <= 1 && Math.abs(pv.y) <= 1) return { x: w * W + (pv.x + 1) / 2 * W, y: (1 - pv.y) / 2 * H };
		}
		return null;
	}

	// a gem shape, for the fragment slots
	function gem(ctx, x, y, s, fill, stroke) {
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(x, y - s);
		ctx.lineTo(x + s * 0.62, y - s * 0.2);
		ctx.lineTo(x, y + s);
		ctx.lineTo(x - s * 0.62, y - s * 0.2);
		ctx.closePath();
		ctx.fillStyle = fill;
		ctx.fill();
		ctx.lineWidth = 5;
		ctx.strokeStyle = stroke;
		ctx.stroke();
		ctx.restore();
	}

	// the map: rooms he's been in, their doorways, him, the fragments found
	function minimap(ctx, x0, y0, size) {
		const cell = size / GRID;
		art.roundRect(ctx, x0 - 14, y0 - 14, size + 28, size + 28, 18, { fill: 'rgba(20,10,20,0.7)', stroke: 'rgba(255,255,255,0.6)', lineWidth: 3 });
		for (const col of maze.rooms) for (const r of col) {
			const x = x0 + r.i * cell, y = y0 + r.j * cell;
			if (!r.seen) { ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8); continue; }
			ctx.fillStyle = 'rgba(232,200,150,0.85)';
			ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
			ctx.fillStyle = 'rgba(232,200,150,0.85)';
			if (r.open.e) ctx.fillRect(x + cell - 6, y + cell / 2 - 6, 12, 12);
			if (r.open.s) ctx.fillRect(x + cell / 2 - 6, y + cell - 6, 12, 12);
			const f = fragments.find((q) => q.room === r);
			if (f && f.taken) gem(ctx, x + cell / 2, y + cell / 2, cell * 0.22, '#2dff7a', '#0a3a1a');
		}
		// him: a red arrow, the way he faces
		const half = (GRID - 1) / 2;
		const px = x0 + (kn.pos.x / CELL + half + 0.5) * cell, py = y0 + (kn.pos.z / CELL + half + 0.5) * cell;
		ctx.save();
		ctx.translate(px, py);
		ctx.rotate(-kn.yaw);
		ctx.beginPath();
		ctx.moveTo(0, -14); ctx.lineTo(10, 10); ctx.lineTo(0, 4); ctx.lineTo(-10, 10);
		ctx.closePath();
		ctx.fillStyle = '#ff3b3b';
		ctx.fill();
		ctx.lineWidth = 3;
		ctx.strokeStyle = 'white';
		ctx.stroke();
		ctx.restore();
	}

	function overlay(ctx) {
		// taps
		for (const m of marks) {
			const q = m.age / 0.8;
			ctx.save();
			ctx.globalAlpha = 1 - q;
			ctx.strokeStyle = m.colour;
			ctx.lineWidth = 8;
			ctx.beginPath();
			ctx.arc(m.x, m.y, 20 + q * 70, 0, TAU);
			ctx.stroke();
			ctx.restore();
		}
		// words over things
		for (const p of pops) {
			const at = onAnyWall(pv.copy(p.at).add(tmp2.set(0, 1, 0)));
			if (!at) continue;
			const q = p.age / 1.2;
			art.text(ctx, p.text, at.x, at.y - q * 80, { size: p.size * (q < 0.12 ? q / 0.12 : 1), font: 'Knewave', fill: p.colour, outline: '#1a0b2e', outlineWidth: 7, alpha: 1 - Math.max(0, q - 0.6) / 0.4 });
		}
		if (!live() && show.beat !== 'timeup') return;
		// the fragments found, and the map
		const fx0 = W + 120, fy0 = 120;
		art.roundRect(ctx, fx0 - 70, fy0 - 60, 300, 120, 30, { fill: 'rgba(20,10,20,0.7)', stroke: 'rgba(255,255,255,0.6)', lineWidth: 3 });
		fragments.forEach((f, i) => {
			if (f.taken) { gem(ctx, fx0 + i * 80, fy0, 40, '#2dff7a', '#0a3a1a'); return; }
			// a missing one pulses green, faster and brighter the nearer he is to it
			const near = Math.max(0, Math.min(1, 1 - kn.pos.distanceTo(f.pos) / SENSE));
			const beat = near > 0 ? Math.pow(0.5 + 0.5 * Math.sin(clock * TAU * (0.8 + near * 4)), 2) * near : 0;
			gem(ctx, fx0 + i * 80, fy0, 40 * (1 + 0.18 * beat), `rgba(45,255,122,${0.12 + 0.6 * beat})`, `rgba(${Math.round(255 - 210 * beat)},255,${Math.round(255 - 133 * beat)},${0.5 + 0.5 * beat})`);
		});
		minimap(ctx, 2 * W - 290, 70, 220);
	}

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		simulate(dt);
		if (SCENE_BEATS.includes(show.beat)) render();
		show.frame(ctx, dt, overlay);
	};

	/* ---------- input ---------- */

	self.setPlayers = function (players) {
		latest = players.map((p) => p && { px: p.px, pz: p.pz });
	};

	self.state = function () {
		return Object.assign(show.state(), {
			kn: { pos: kn.pos.toArray(), state: kn.state, glide: kn.glide, goal: kn.goal && { kind: kn.goal.kind, point: kn.goal.point.toArray() } },
			found, scores: scores.slice(), did: Object.assign({}, did),
		});
	};

	self.test = {
		// jump to any beat (past the squad, a squad is needed: three, unless one's been given)
		jump(id) {
			$('showtime-picker').remove();
			if (!count) initGame(playersMeta ? playersMeta.length : 3);
			show.go(id);
		},
		tap(x, y) { tap({ x, y }); },
		// where a world point shows on the walls (or null), for tapping it
		at(x, y, z) { return onAnyWall(new THREE.Vector3(x, y, z)); },
		// what a tap there would hit
		ray(x, y) {
			const wall = Math.floor(x / W);
			raycaster.setFromCamera(ndc.set((x - wall * W) / W * 2 - 1, 1 - y / H * 2), cams[wall]);
			const h = raycastBoxes(boxes, raycaster.ray.origin, raycaster.ray.direction, 400);
			return h && { point: h.point.toArray(), normal: h.normal.toArray(), kind: h.box.kind, top: h.box.max.y, eye: raycaster.ray.origin.toArray() };
		},
		maze,
		timeLeft(s) { show.setTimeLeft(s); },
		// for checking: drop him next to a fragment
		near(i = 0) { const f = fragments[i]; kn.pos.set(f.pos.x + 4, 0, f.pos.z); kn.state = 'ground'; },
		// drop him anywhere, facing yaw (0 = -z)
		place(x, z, yaw = 0) { kn.pos.set(x, 0, z); kn.state = 'ground'; kn.goal = null; kn.face = null; kn.yaw = camYaw = yaw; },
	};

	self.fini = function () {
		unlisten();
		show.fini();
		postfx.dispose();
		maze.dispose();
		if (sky.env) sky.env.dispose();
		renderer.dispose();
		renderer.forceContextLoss();
	};

	/* ---------- go ---------- */

	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
