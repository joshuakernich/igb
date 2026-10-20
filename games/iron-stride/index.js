/*
 * Iron Stride
 *
 * Everyone's inside the Strider: a chunky red-and-black combat walker with
 * an arm cannon. The three walls are its cockpit windows (front, left and
 * right), looking out over rolling green hills overrun by Doctor Klank's
 * Klankbots: Beetle Bots that roll in and ram, Buzz Drones that circle and
 * zap, and Crab Tanks that lob mortar shells. Walk the Strider together,
 * tap the windows to fire missiles, and smash as many as you can before the
 * clock runs out. Hits dent the hull; if it gives out, the Strider goes
 * offline for a few seconds (no walking, no missiles) while it reboots.
 *
 * Controls (tank steering, one driver a leg):
 *   - Player 1 drives the LEFT leg and player 2 the RIGHT leg, always; no
 *     one else ever does. Everyone else (players 3+) taps to shoot. On the
 *     front window a strip of chevrons laid back in perspective against
 *     each edge fills in its driver's colour with their throttle, a
 *     triangle beside it showing where they stand; a little wireframe Strider in the bottom middle walks each
 *     leg at that leg's own speed.
 *   - A driver's throttle comes from how far forward they stand (pz:
 *     1 at the front wall, 0 at the back): a dead zone across the middle
 *     of the room, full ahead toward the front wall, full astern toward the
 *     back (DRIVE below).
 *   - Both legs ahead: straight on. One ahead and one astern: turn on the
 *     spot. Uneven: a curve.
 *   - Tap a window: a missile flies from the cockpit along the line through
 *     that spot (homing a little on a Klankbot near that line) and blows up
 *     on whatever it meets. Taps carry no player, so a tap belongs to the
 *     player standing nearest the tapped spot, and so do its points.
 *
 * The show is Showtime's standard running order: the squad picker, the
 * title drop (the Strider seen from outside), the clock intro, the visor
 * check, boarding (the eye flies into the cockpit: SYSTEMS ONLINE), the
 * tutorial (walk, turn, fire at practice drones), Doctor Klank's
 * transmission, the battle in waves until the clock runs out, TIME!,
 * scores, rank, team, leaderboard, replay, rating and the end.
 *
 * Input: pz (players 1 and 2: their legs' throttles); wall taps (clicks on
 * the stage: the desk simulator's "click a wall to touch it").
 * Drawn with Glint (lib/glint), the in-house engine the Sonic-family games
 * share. An ES module (manifest: module: true).
 */
import * as G from '../../lib/glint/glint.js';
import { createWorld, heightAt, SUN, HORIZON, ARENA } from './world.js';
import { buildRobot, buildBeetle, buildBuzzer, buildCrab, buildTarget, buildMissile, buildBolt, buildShell, glowTexture, fireTexture, smokeTexture, glossy } from './models.js';
import { paintFrame, chevronBar, wireStrider, radar, hullDial, readout, klank, FRAME, MONO } from './cockpit.js';
import { createSound } from './sound.js';

IGB.register('iron-stride', function IronStrideGame(stage, playersMeta) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;
	const TAU = Math.PI * 2;

	/* ---------- tuning ---------- */

	const GAME_SECONDS = 600;          // the show's clock (the intros and tutorial come out of it; the battle runs till it's out)
	const DRIVE = {
		dead: 0.1,                     // pz this far either side of the room's middle (0.5) is standing still
		full: 0.36,                    // and this far is full throttle (pz 0.86+ full ahead, 0.14- full astern)
		ahead: 11,                     // metres a second, a leg at full ahead
		astern: 6,                     // and at full astern
		track: 15,                     // metres between the legs, in effect: smaller turns faster
		accel: 2.2,                    // how quickly a leg gets up to its throttle (per second)
	};
	const EYE = 8.6;                   // metres: the cockpit's height above the ground
	const PITCH = 6;                   // degrees the cockpit looks down (all three windows alike)
	const FOV = 64;                    // vertical, degrees: 90 across each 16:10 wall, so the walls meet
	const STRIDE = 3.4;                // metres a step
	const MISSILE = { speed: 60, top: 150, accel: 280, turn: 7, life: 4, blast: 5.5, lock: 2.4, gap: 0.2, max: 30 };   // m/s at launch and flat out, m/s², homing (per second), seconds, blast radius, how near the tapped line a Klankbot is locked onto, seconds between one player's missiles, most in the air
	const KINDS = {
		beetle: { pts: 100, hp: 1, speed: 7.5 },
		buzzer: { pts: 150, hp: 1, speed: 11 },
		crab: { pts: 250, hp: 2, speed: 3.6 },
		target: { pts: 0, hp: 1, speed: 0 },
	};
	const HULL = { bolt: 8, shell: 15, ram: 12, regen: 5, wait: 4, reboot: 3.5, after: 60 };   // damage per hit; regen a second after `wait` seconds unhit; seconds offline; hull after a reboot
	const SHOTS = { bolt: 34, shell: 2.3, gravity: 18, range: 90, buzz: [3.5, 6.5], crab: [4.5, 7.5] };   // bolt m/s, a shell's flight time, gravity, range they fire from, seconds between shots
	const SWARM = { start: 6, perWave: 3, max: 24, gap: 0.6, near: 90, far: 160, arc: 120, wave: 75 };   // Klankbots about at once (first wave, more each wave, most), seconds between arrivals, how far off they arrive and how far round from ahead (degrees), seconds a wave
	const BOARD = { fly: 2.4, dark: [1.8, 2.3], light: [2.5, 3.2], online: 2.6, length: 4.2 };   // boarding: the fly-in, the dark, SYSTEMS ONLINE, the end
	const CALL = { on: 0.3, name: 1.2, line: 2.8, list: 4.0, length: 7.5 };   // Doctor Klank's transmission
	const PRACTICE = 5;                // practice drones in the tutorial
	const CHEVRONS = { mid: 500 };     // where the throttle bars' zero sits on the front window (ahead above it, astern below)

	/* ---------- renderer, scene, cameras ---------- */

	const renderer = new G.Renderer({ antialias: true });
	renderer.toneMappingExposure = 1.0;
	renderer.shadowsEnabled = true;
	Object.assign(renderer.bloom, { strength: 0.45, radius: 0.6, threshold: 1.0, knee: 0.6, enabled: true });
	Object.assign(renderer.grade, { saturation: 1.08, contrast: 1.04, vignette: 0.12, lift: 0 });
	$(renderer.domElement).css({ position: 'absolute', left: 0, top: 0, width: WIDTH + 'px', height: H + 'px' }).appendTo(stage.$bg);

	let k = 1;
	function resize() {
		k = Math.min(IGB.scale * IGB.pixelRatio, 1);
		renderer.setPixelRatio(1);
		renderer.setSize(Math.round(WIDTH * k), Math.round(H * k), false);
	}
	const unlisten = IGB.onResize(resize);
	resize();

	const scene = new G.Scene();
	scene.fog = new G.Fog(HORIZON, 220, 1500);
	const world = createWorld(renderer, scene);

	scene.add(new G.HemisphereLight(0xd8efff, 0x4a7a3a, 0.8));
	const sun = new G.DirectionalLight(0xfff2dc, 3.0);
	sun.castShadow = true;
	sun.shadow.mapSize.set(4096, 4096);
	Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 320 });
	sun.shadow.camera.updateProjectionMatrix();
	sun.shadow.bias = -0.0005;
	sun.shadow.normalBias = 0.05;
	scene.add(sun, sun.target);
	const boomLight = new G.PointLight(0xffa040, 0, 90, 2);
	scene.add(boomLight);

	// One eye: the front camera out of the front window, the side cameras
	// square to it, all on one rig. They share one tilt (the rig's) and one
	// field of view (90 degrees across), so they're the sides of one box and
	// the windows meet seamlessly. Never tilt or zoom one alone.
	const walls = G.createWallRig({ fov: FOV, aspect: W / H, near: 0.1, far: 4000 });
	const rig = walls.rig;
	scene.add(rig);
	const cams = walls.cameras;   // left, front, right

	/* ---------- the Strider ---------- */

	const strider = buildRobot();
	strider.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
	scene.add(strider.root);

	const bot = {
		pos: new G.Vector3(0, heightAt(0, 0), 0),
		heading: 0,             // radians; forward is (-sin, -cos): -Z at the start, toward the factory
		vL: 0, vR: 0, v: 0, turn: 0,
		phase: 0, phaseL: 0, phaseR: Math.PI,   /* (the legs a half-stride apart) */ amountL: 0, amountR: 0, steps: 0, eyeY: heightAt(0, 0) + EYE,
		odo: 0, turned: 0,      // metres walked ahead and radians turned (for the tutorial)
		hull: 100, lastHit: -99, offline: 0,
		tL: 0, tR: 0,           // the legs' throttles (-1..1)
	};
	const fwdOf = (h, out = new G.Vector3()) => out.set(-Math.sin(h), 0, -Math.cos(h));
	const rightOf = (h, out = new G.Vector3()) => out.set(Math.cos(h), 0, -Math.sin(h));

	/* ---------- players, throttles ---------- */

	let count = 0;
	let scores = [];
	let latest = [];               // the tracker's last word
	const seen = [];
	const lastShot = [];

	// A player's throttle from how far forward they stand.
	function throttleOf(pz) {
		const d = pz - 0.5;
		const a = Math.abs(d);
		if (a < DRIVE.dead) return 0;
		return Math.sign(d) * Math.min(1, (a - DRIVE.dead) / (DRIVE.full - DRIVE.dead));
	}

	// The legs' drivers: player 1 the left, player 2 the right (and no one
	// else, ever). A leg whose driver isn't tracked stands still.
	const DRIVERS = { left: 0, right: 1 };
	function throttleFor(i) {
		const p = latest[i];
		if (i >= count || !p || p.pz === undefined || !seen[i]) return 0;
		return throttleOf(p.pz);
	}
	function legThrottles() {
		return { tL: throttleFor(DRIVERS.left), tR: throttleFor(DRIVERS.right) };
	}

	/* ---------- effects: particles, debris, words ---------- */

	const TEX = { glow: glowTexture(), fire: fireTexture(), smoke: smokeTexture() };
	const parts = [];
	const freeParts = { add: [], normal: [] };

	function particle(tex, at, o = {}) {
		const pool = o.additive ? freeParts.add : freeParts.normal;
		let s = pool.pop();
		if (!s) {
			s = new G.Sprite(new G.SpriteMaterial({ transparent: true, depthWrite: false, toneMapped: !o.additive, blending: o.additive ? G.AdditiveBlending : G.NormalBlending }));
			s.userData.additive = !!o.additive;
		}
		s.material.map = tex;
		s.material.color.set(o.colour === undefined ? 0xffffff : o.colour);
		s.material.rotation = Math.random() * TAU;
		s.position.copy(at);
		s.visible = true;
		scene.add(s);
		parts.push({ s, age: 0, life: o.life || 0.6, size: o.size || [1, 3], vel: o.vel ? o.vel.clone() : new G.Vector3(), grav: o.gravity || 0, drag: o.drag || 0, alpha: o.alpha === undefined ? 1 : o.alpha, spin: (Math.random() - 0.5) * (o.spin || 1) });
	}

	const DEBRIS_GEO = new G.BoxGeometry(0.6, 0.6, 0.6);
	const DEBRIS_MAT = { beetle: glossy(0x1fa4c9), buzzer: glossy(0xffcf1f), crab: glossy(0xff6a2b), target: glossy(0xff3b30), dark: glossy(0x1b1b20) };
	const debris = [];

	function chunks(at, kind, n) {
		for (let i = 0; i < n; i++) {
			const m = new G.Mesh(DEBRIS_GEO, i % 3 ? DEBRIS_MAT[kind] : DEBRIS_MAT.dark);
			m.position.copy(at);
			m.scale.setScalar(0.5 + Math.random() * 1.2);
			m.castShadow = true;
			scene.add(m);
			const a = Math.random() * TAU;
			debris.push({ m, vel: new G.Vector3(Math.cos(a) * (6 + Math.random() * 10), 8 + Math.random() * 14, Math.sin(a) * (6 + Math.random() * 10)), spin: new G.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10), age: 0 });
		}
	}

	const pops = [];       // words floating up from a point in the world: { text, colour, at, age, size }
	function pop(text, colour, at, size = 64) { pops.push({ text, colour, at: at.clone(), age: 0, size }); }

	const flash = { red: 0, white: 0 };
	let shake = 0;
	const cracks = [];     // on the glass: { x, y, lines, age }
	const marks = [];      // where a tap landed: { x, y, colour, age }

	function crack(x, y) {
		const lines = [];
		const n = 6 + Math.floor(Math.random() * 4);
		for (let i = 0; i < n; i++) {
			const a = i / n * TAU + Math.random() * 0.5;
			const pts = [[x, y]];
			let px = x, py = y, aa = a;
			const segs = 3 + Math.floor(Math.random() * 3);
			for (let j = 0; j < segs; j++) {
				aa += (Math.random() - 0.5) * 0.6;
				const len = 25 + Math.random() * 50;
				px += Math.cos(aa) * len;
				py += Math.sin(aa) * len;
				pts.push([px, py]);
			}
			lines.push(pts);
		}
		const ring = [];
		const rr = 30 + Math.random() * 20;
		for (let i = 0; i <= n; i++) ring.push([x + Math.cos(i / n * TAU) * rr * (0.8 + Math.random() * 0.4), y + Math.sin(i / n * TAU) * rr * (0.8 + Math.random() * 0.4)]);
		lines.push(ring);
		cracks.push({ x, y, lines, age: 0 });
		if (cracks.length > 8) cracks.shift();
	}

	/* ---------- Klankbots ---------- */

	const BUILD = { beetle: buildBeetle, buzzer: buildBuzzer, crab: buildCrab, target: buildTarget };
	const COLOUR = { beetle: '#3ad1ff', buzzer: '#ffd23f', crab: '#ff7a3d', target: '#ff3b30' };
	let bots = [];
	let shots = [];        // theirs: { kind, mesh, glow, pos, vel, age }
	let missiles = [];     // ours: { mesh, glow, pos, vel, speed, target, aim, age, by, puff }
	let practiceKills = 0;
	let smashed = 0;

	const centreOf = (b, out = new G.Vector3()) => out.copy(b.pos).setY(b.pos.y + b.model.centre);

	function spawn(kind, o = {}) {
		const model = BUILD[kind]();
		model.root.traverse((m) => { if (m.isMesh) m.castShadow = true; });
		let x = 0, z = 0;
		for (let tries = 0; tries < 12; tries++) {
			const arc = (o.arc || SWARM.arc) * Math.PI / 180;
			const a = bot.heading + (Math.random() * 2 - 1) * arc;
			const d = (o.near || SWARM.near) + Math.random() * ((o.far || SWARM.far) - (o.near || SWARM.near));
			x = bot.pos.x - Math.sin(a) * d;
			z = bot.pos.z - Math.cos(a) * d;
			if (Math.hypot(x, z) < ARENA - 10) break;
			const k = (ARENA - 12) / Math.hypot(x, z);   // (past the edge: pulled in)
			x *= k;
			z *= k;
		}
		const ground = heightAt(x, z);
		const flying = kind === 'buzzer' || kind === 'target';
		const alt = kind === 'buzzer' ? 9 + Math.random() * 8 : kind === 'target' ? 6 + Math.random() * 6 : 0;
		const b = {
			kind, model, hp: KINDS[kind].hp,
			pos: new G.Vector3(x, ground + alt, z),
			alt, flying, t: Math.random() * 10, speed: 0,
			fire: (kind === 'buzzer' ? SHOTS.buzz : SHOTS.crab)[0] + Math.random() * 3,
			orbit: Math.random() < 0.5 ? 1 : -1, ring: 28 + Math.random() * 20, stand: 42 + Math.random() * 18,
			hurt: 0, practice: kind === 'target', arrive: 0,
		};
		model.root.position.copy(b.pos);
		scene.add(model.root);
		bots.push(b);
		return b;
	}

	function disposeMesh(root) {
		root.traverse((m) => {
			if (m.geometry) m.geometry.dispose();
			if (m.material) [].concat(m.material).forEach((x) => x.dispose());
		});
	}

	function removeBot(b) {
		b.dead = true;
		scene.remove(b.model.root);
		disposeMesh(b.model.root);
	}

	function mixFor(wave) {
		const w = { beetle: 5, buzzer: 2 + wave, crab: wave >= 2 ? wave : 0 };
		const total = w.beetle + w.buzzer + w.crab;
		let r = Math.random() * total;
		for (const kind of ['beetle', 'buzzer', 'crab']) { if ((r -= w[kind]) < 0) return kind; }
		return 'beetle';
	}

	/* ---------- missiles ---------- */

	const raycaster = new G.Raycaster();
	const ndc = new G.Vector2();

	// The player standing nearest a point on the walls (taps carry no player).
	function nearest(at) {
		const wall = Math.floor(at.x / W);
		const f = (at.x - wall * W) / W;
		// (that point in the room: pz is 1 at the front wall; along the left
		// wall pz = f, along the right 1 - f)
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

	function panOf(at) {
		const wall = Math.floor(at.x / W);
		return wall === 0 ? -0.8 : wall === 2 ? 0.8 : ((at.x - W) / W - 0.5) * 0.8;
	}

	const tmp = new G.Vector3(), tmp2 = new G.Vector3(), tmp3 = new G.Vector3();

	function tap(at) {
		if (show.paused || mode !== 'cockpit') return;
		const wall = Math.floor(at.x / W);
		if (wall < 0 || wall > 2) return;
		if (!(show.beat === 'controls' || show.beat === 'play')) return;
		if (bot.offline > 0) { sound.denied(); return; }
		const by = nearest(at);
		if (clock - (lastShot[by] || -9) < MISSILE.gap || missiles.length >= MISSILE.max) return;
		lastShot[by] = clock;

		ndc.set((at.x - wall * W) / W * 2 - 1, 1 - at.y / H * 2);
		raycaster.setFromCamera(ndc, cams[wall]);
		const ray = raycaster.ray;

		// a Klankbot near that line? (the nearest one along it)
		let target = null, best = Infinity;
		for (const b of bots) {
			if (b.dead) continue;
			const c = centreOf(b, tmp);
			const v = tmp2.copy(c).sub(ray.origin);
			const t = v.dot(ray.direction);
			if (t < 3) continue;
			const perp = v.addScaledVector(ray.direction, -t).length();
			if (perp < b.model.radius + MISSILE.lock + t * 0.012 && t < best) { best = t; target = b; }
		}
		// otherwise where the line meets the ground (or far off)
		const aim = new G.Vector3();
		if (target) centreOf(target, aim);
		else {
			let hit = null;
			for (let s = 2; s < 600; s += 3) {
				tmp.copy(ray.origin).addScaledVector(ray.direction, s);
				if (tmp.y < heightAt(tmp.x, tmp.z)) {
					let lo = s - 3, hi = s;
					for (let i = 0; i < 8; i++) {
						const mid = (lo + hi) / 2;
						tmp.copy(ray.origin).addScaledVector(ray.direction, mid);
						if (tmp.y < heightAt(tmp.x, tmp.z)) hi = mid; else lo = mid;
					}
					hit = tmp.copy(ray.origin).addScaledVector(ray.direction, hi);
					break;
				}
			}
			aim.copy(hit || tmp.copy(ray.origin).addScaledVector(ray.direction, 600));
		}

		const start = new G.Vector3().copy(ray.origin).addScaledVector(ray.direction, 2).add(tmp.set(0, -1.5, 0));
		const mesh = buildMissile();
		mesh.position.copy(start);
		scene.add(mesh);
		const glow = new G.Sprite(new G.SpriteMaterial({ map: TEX.glow, color: 0xffb040, blending: G.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }));
		glow.scale.setScalar(2.2);
		glow.position.set(0, 0, -0.9);
		mesh.add(glow);
		const dir = tmp2.copy(aim).sub(start).normalize();
		missiles.push({ mesh, glow, pos: start, vel: dir.clone().multiplyScalar(MISSILE.speed), speed: MISSILE.speed, target, aim, age: 0, by, puff: 0 });

		marks.push({ x: at.x, y: at.y, colour: PLAYER_COLORS[by], age: 0, locked: !!target });
		if (target) { target.lockedBy = by; target.lockAge = 0; sound.lock(panOf(at)); }
		sound.launch(panOf(at));
		shotsFired++;
	}
	let shotsFired = 0;

	stage.$el.on('click', function (e) {
		if (e.target && e.target.closest && e.target.closest('button')) return;
		tap(IGB.toWorld(e));
	});

	// A blast: fire, smoke, light, sound; it hurts every Klankbot (and
	// knocks down every shot) in reach.
	function explode(at, by, big = 1) {
		particle(TEX.fire, at, { additive: true, life: 0.35, size: [3 * big, 12 * big] });
		for (let i = 0; i < 5; i++) {
			const off = tmp3.set(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).multiplyScalar(4 * big);
			particle(TEX.fire, tmp.copy(at).add(off), { additive: true, life: 0.4 + Math.random() * 0.4, size: [2 * big, 7 * big], vel: off.clone().multiplyScalar(2) });
		}
		for (let i = 0; i < 6; i++) {
			const v = new G.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 4, (Math.random() - 0.5) * 6);
			particle(TEX.smoke, at, { colour: 0x55504c, life: 1.6 + Math.random(), size: [3 * big, 11 * big], vel: v, drag: 1.2, alpha: 0.75 });
		}
		boomLight.position.copy(at).y += 2;
		boomLight.intensity = 9000 * big;
		const d = at.distanceTo(rig.position);
		const rel = tmp2.copy(at).sub(bot.pos);
		const side = rel.dot(rightOf(bot.heading, tmp3)) / Math.max(1, rel.length());
		sound.boom(Math.max(0, 1 - d / 160), side);
		shake = Math.max(shake, Math.max(0, 0.7 - d / 70) * big);
		if (d < 18) flash.white = Math.max(flash.white, 0.4 * (1 - d / 18));

		if (by === null) return;
		for (const b of bots) {
			if (b.dead) continue;
			if (centreOf(b, tmp).distanceTo(at) < MISSILE.blast + b.model.radius) hurt(b, by);
		}
		for (const s of shots) {
			if (s.dead || s.pos.distanceTo(at) > MISSILE.blast + 1) continue;
			s.dead = true;
			if (show.beat === 'play') { scores[by] += 25; pop('+25', PLAYER_COLORS[by], s.pos, 48); }
			particle(TEX.glow, s.pos, { additive: true, colour: 0xff7ab0, life: 0.3, size: [2, 5] });
		}
	}

	function hurt(b, by) {
		b.hp--;
		b.hurt = 0.25;
		if (b.hp > 0) {
			particle(TEX.glow, centreOf(b, tmp), { additive: true, life: 0.25, size: [2, 6] });
			return;
		}
		const at = centreOf(b, new G.Vector3());
		removeBot(b);
		chunks(at, b.kind, b.kind === 'crab' ? 12 : 8);
		particle(TEX.fire, at, { additive: true, life: 0.5, size: [4, 14] });
		if (b.practice) {
			practiceKills++;
			pop('NICE!', PLAYER_COLORS[by], at, 60);
		} else if (show.beat === 'play') {
			const pts = KINDS[b.kind].pts;
			scores[by] += pts;
			smashed++;
			pop('+' + pts, PLAYER_COLORS[by], at, 72);
		}
	}

	/* ---------- damage ---------- */

	function damage(amount, from) {
		if (show.beat !== 'play' || bot.offline > 0) return;
		bot.hull = Math.max(0, bot.hull - amount);
		bot.lastHit = clock;
		shake = Math.max(shake, 0.8);
		flash.red = Math.max(flash.red, 0.6);
		sound.clang();
		// a crack where it hit the glass (or on the side window, from behind)
		const p = from && onAnyWall(from);
		if (p) crack(p.x, Math.min(p.y, H - FRAME.bottom - 40));
		else {
			const rel = tmp.copy(from || bot.pos).sub(bot.pos);
			const right = rel.dot(rightOf(bot.heading, tmp2)) > 0;
			crack(right ? 2 * W + W * (0.55 + Math.random() * 0.35) : W * (0.1 + Math.random() * 0.35), 200 + Math.random() * 500);
		}
		if (bot.hull <= 0) {
			bot.offline = HULL.reboot;
			sound.powerDown();
			sound.alarm();
		} else if (bot.hull < 30) sound.alarm();
	}

	/* ---------- the flow ---------- */

	const sound = createSound();
	const show = new Showtime(stage, {
		id: 'iron-stride',
		seconds: GAME_SECONDS,
		players: () => count,
		scores: () => scores,
		music: false,
		theme: { accent: '#e23a2e', accent2: '#ffb02e', gold: '#ffd23f', ink: '#140a0a', sky: ['#160606', '#5a1410'], glow: 'rgba(226,58,46,0.35)' },
		rivals: ['Bolt Busters', 'The Rivet Riders', 'Scrap Smashers', 'Gear Grinders', 'Tin Can Kickers', 'Steel Stompers',
			'Klank Crushers', 'The Big Red', 'Servo Squad', 'Iron Giants'],
	});

	let mode = 'outside';     // outside (the Strider from out there), cockpit (in it)
	let clock = 0;
	let runT = 0;
	let wave = 0;
	let waveAt = -99;         // when the current wave was announced (clock)
	let nextSpawn = 0;
	let boardT = -1;          // seconds into boarding (-1: not boarding)
	let callT = -1;           // seconds into Doctor Klank's call

	function setUp(n) {
		sound.resume();
		count = n;
		scores = new Array(n).fill(0);
	}

	function initGame(n) {
		setUp(n);
		show.go('title');
	}

	function clearBots(practiceOnly) {
		for (const b of bots) if (!b.dead && (!practiceOnly || b.practice)) removeBot(b);
		bots = bots.filter((b) => !b.dead);
	}

	function startWave(n) {
		wave = n;
		waveAt = clock;
		sound.wave();
		show.shake = 0.3;
		for (let i = 0; i < 2 + n; i++) spawn(mixFor(n));
	}

	/* ---------- the tutorial ---------- */

	const tut = { odo: 0, turned: 0, kills: 0 };
	const TUTORIAL = [
		{ caption: 'STEP FORWARD TOGETHER TO WALK', sub: 'FOLLOW YOUR ARROW: YOU DRIVE THAT LEG · EVERYONE ELSE, GET READY TO SHOOT', min: 2, max: 14, did: () => bot.odo - tut.odo >= 10 },
		{ caption: 'ONE FORWARD, ONE BACK: TURN!', sub: 'STEP BACK TOWARD THE BACK WALL TO RUN YOUR LEG BACKWARDS', min: 2, max: 14, did: () => bot.turned - tut.turned >= 1.4 },
		{ caption: 'TAP THE WINDOWS TO FIRE MISSILES', sub: 'TAP ON A PRACTICE DRONE TO BLAST IT', min: 2, max: 20, did: () => practiceKills - tut.kills >= 3 },
	];

	/* ---------- the beats ---------- */

	const SCENE = ['squad', 'title', 'clock', 'visors', 'boarding', 'controls', 'invasion', 'play', 'timeup'];   // the beats the world shows behind

	show.sequence([
		{ id: 'squad', length: Infinity },
		show.beats.titleDrop(),
		show.beats.clockIntro(),
		show.beats.visors(),
		// boarding: the eye swoops into the cockpit, the lights go, SYSTEMS ONLINE
		{
			id: 'boarding',
			length: BOARD.length,
			enter() { boardT = 0; mode = 'outside'; show.fx('clockFly'); },
			update(dt, bt) {
				boardT = bt;
				if (bt < BOARD.dark[0]) show.blackout = 0;
				else if (bt < BOARD.dark[1]) show.blackout = (bt - BOARD.dark[0]) / (BOARD.dark[1] - BOARD.dark[0]);
				else if (bt < BOARD.light[0]) { show.blackout = 1; if (mode !== 'cockpit') { mode = 'cockpit'; sound.powerUp(); } }
				else show.blackout = Math.max(0, 1 - (bt - BOARD.light[0]) / (BOARD.light[1] - BOARD.light[0]));
				if (show.cue(BOARD.online)) { show.fx('wordSlam'); show.shake = 0.4; }
			},
			draw(ctx, bt) {
				if (bt < BOARD.online) return;
				show.onWalls(ctx, (c) => show.slam(c, 'SYSTEMS ONLINE', W / 2, 420, 110, bt - BOARD.online, { fill: '#3cdc7a' }));
			},
		},
		show.beats.tutorial({
			steps: TUTORIAL,
			y: 250,
			enter() { boardT = -1; mode = 'cockpit'; show.blackout = 0; },
			enterStep(i) {
				tut.odo = bot.odo;
				tut.turned = bot.turned;
				tut.kills = practiceKills;
				if (i === 2) for (let n = 0; n < PRACTICE; n++) spawn('target', { near: 32, far: 55, arc: 50 });
			},
			update() {
				// (more practice drones, if they're running out)
				if (bots.filter((b) => !b.dead && b.practice).length < 2 && show.tutorialStep().i === 2) spawn('target', { near: 32, far: 55, arc: 50 });
			},
			draw(ctx) {
				const st = TUTORIAL[show.tutorialStep().i];
				if (!st) return;
				show.onWalls(ctx, (c) => show.text(c, st.sub, W / 2, 345, 40, { fill: 'white' }));
			},
		}),
		// Doctor Klank calls the cockpit; his Klankbots roll in over the hills
		{
			id: 'invasion',
			length: CALL.length,
			enter() {
				mode = 'cockpit';
				callT = 0;
				clearBots(true);
				show.fx('villainReveal');
				sound.music(true);
				for (let i = 0; i < SWARM.start; i++) spawn(mixFor(1), { arc: 70 });
			},
			update(dt, bt) {
				callT = bt;
				show.blackout = 0.4 * Math.min(1, bt * 2);
				if (show.cue(CALL.name)) { show.fx('stomp'); show.shake = 0.5; }
				if (show.cue(CALL.line)) show.fx('beat');
				if (show.cue(CALL.list)) show.fx('beat');
			},
			draw(ctx, bt) {
				show.onWalls(ctx, function (c, n) {
					if (bt > CALL.name) show.slam(c, 'DOCTOR KLANK ATTACKS!', W / 2, 150, 96, bt - CALL.name, { fill: '#ff3b30' });
					if (n !== 1 && bt > CALL.line) show.text(c, 'BLAST HIS KLANKBOTS BEFORE THEY BLAST YOU!', W / 2, 330, 48, { fill: 'white', alpha: Math.min(1, (bt - CALL.line) * 3) });
					if (n !== 1 && bt > CALL.list) show.text(c, 'BEETLE BOTS 100 · BUZZ DRONES 150 · CRAB TANKS 250', W / 2, 420, 40, { fill: '#ffd23f', alpha: Math.min(1, (bt - CALL.list) * 3) });
				});
				if (bt > CALL.on) {
					const k = Math.min(1, (bt - CALL.on) / 0.3);
					ctx.save();
					ctx.globalAlpha = k;
					klank(ctx, W * 1.5, 565, 480 * (0.6 + 0.4 * k), clock, bt > CALL.name && bt < CALL.length - 1);
					ctx.restore();
					if (Math.floor(clock * 3) % 2 === 0) show.text(ctx, 'INCOMING TRANSMISSION', W * 1.5, 262, 34, { fill: '#3cdc7a' });
				}
			},
		},
		// the battle: waves of Klankbots until the clock runs out
		{
			id: 'play',
			length: Infinity,
			enter() {
				mode = 'cockpit';
				callT = -1;
				clearBots(true);
				runT = 0;
				for (let i = 0; i < count; i++) scores[i] = 0;
				smashed = 0;
				bot.hull = 100;
				bot.offline = 0;
				sound.music(true);
				startWave(1);
			},
			update(dt) {
				runT += dt;
				if (runT >= wave * SWARM.wave) startWave(wave + 1);
				// keep them coming
				const want = Math.min(SWARM.max, SWARM.start + (wave - 1) * SWARM.perWave);
				const alive = bots.filter((b) => !b.dead).length;
				nextSpawn -= dt;
				if (alive < want && nextSpawn <= 0) { spawn(mixFor(wave)); nextSpawn = SWARM.gap; }
				show.record(runT, latest.slice(0, count).map((p, i) => (p && seen[i] ? { px: p.px, pz: p.pz } : null)));
			},
			draw(ctx) {
				const age = clock - waveAt;
				if (age < 2.2) show.onWalls(ctx, (c) => show.slam(c, 'WAVE ' + wave, W / 2, 300, 130, age, { fill: '#ffd23f', alpha: Math.min(1, (2.2 - age) * 3) }));
			},
		},
		show.beats.timeUp({
			enter() { sound.music(false); },
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

	const eye = new G.Vector3();
	const eyeQ = new G.Quaternion();
	const fromPos = new G.Vector3();
	const fromQ = new G.Quaternion();
	const lookM = new G.Matrix4();
	const UP = new G.Vector3(0, 1, 0);
	const euler = new G.Euler(0, 0, 0, 'YXZ');
	let boardFrom = false;

	// Where the outside eye is: circling slowly, looking up at the Strider.
	function outsidePose(pos, q) {
		const a = clock * 0.07 + 0.35;
		pos.set(bot.pos.x - Math.sin(bot.heading + a) * 18, bot.pos.y + 4.2, bot.pos.z - Math.cos(bot.heading + a) * 18);
		pos.y = Math.max(pos.y, heightAt(pos.x, pos.z) + 2);
		lookM.lookAt(pos, tmp.set(bot.pos.x, bot.pos.y + 6.4, bot.pos.z), UP);
		q.setFromRotationMatrix(lookM);
	}

	function cockpitPose(pos, q) {
		const moving = Math.min(1, (Math.abs(bot.v) + Math.abs(bot.turn) * 5) / 6);
		const bob = -Math.abs(Math.sin(bot.phase)) * 0.22 * moving;
		pos.copy(bot.pos).addScaledVector(fwdOf(bot.heading, tmp), 0.6);
		pos.y = bot.eyeY + bob;
		euler.set(-PITCH * Math.PI / 180, bot.heading, Math.sin(bot.phase) * 0.012 * moving);
		q.setFromEuler(euler);
	}

	function simulate(dt) {
		clock += dt;
		shake *= Math.exp(-dt * 6);
		flash.red *= Math.exp(-dt * 3);
		flash.white *= Math.exp(-dt * 5);
		boomLight.intensity *= Math.exp(-dt * 9);

		// the legs
		const driving = mode === 'cockpit' && (show.beat === 'controls' || show.beat === 'invasion' || show.beat === 'play') && bot.offline <= 0;
		const th = legThrottles();
		bot.tL = driving ? th.tL : 0;
		bot.tR = driving ? th.tR : 0;
		const target = (t) => (t >= 0 ? t * DRIVE.ahead : t * DRIVE.astern);
		const ease = Math.min(1, dt * DRIVE.accel);
		bot.vL += (target(bot.tL) - bot.vL) * ease;
		bot.vR += (target(bot.tR) - bot.vR) * ease;
		bot.v = (bot.vL + bot.vR) / 2;
		bot.turn = (bot.vR - bot.vL) / DRIVE.track;   // (left leg faster: turn right)
		bot.heading += bot.turn * dt;
		bot.pos.addScaledVector(fwdOf(bot.heading, tmp), bot.v * dt);
		const r = Math.hypot(bot.pos.x, bot.pos.z);
		if (r > ARENA) { bot.pos.x *= ARENA / r; bot.pos.z *= ARENA / r; }
		bot.pos.y = heightAt(bot.pos.x, bot.pos.z);
		bot.eyeY += (bot.pos.y + EYE - bot.eyeY) * Math.min(1, dt * 6);
		if (bot.v > 0) bot.odo += bot.v * dt;
		bot.turned += Math.abs(bot.turn) * dt;

		// footsteps
		const gait = Math.abs(bot.v) + Math.abs(bot.turn) * 5;
		bot.phase += dt * gait / STRIDE * Math.PI;
		const step = Math.floor(bot.phase / Math.PI);
		if (step !== bot.steps) {
			bot.steps = step;
			if (gait > 0.6) {
				sound.stomp(mode === 'cockpit' ? 1 : 0.5);
				if (mode === 'cockpit') shake = Math.max(shake, 0.12);
			}
		}

		// each leg's own stride (for the wireframe and the Strider outside):
		// forward or backward at that leg's own speed
		bot.phaseL += dt * bot.vL / STRIDE * Math.PI;
		bot.phaseR += dt * bot.vR / STRIDE * Math.PI;
		bot.amountL += (Math.min(1, Math.abs(bot.vL) / 4) - bot.amountL) * Math.min(1, dt * 5);
		bot.amountR += (Math.min(1, Math.abs(bot.vR) / 4) - bot.amountR) * Math.min(1, dt * 5);

		// the hull and the reboot
		if (bot.offline > 0) {
			bot.offline -= dt;
			if (bot.offline <= 0) { bot.offline = 0; bot.hull = HULL.after; sound.powerUp(); }
		} else if (clock - bot.lastHit > HULL.wait) bot.hull = Math.min(100, bot.hull + HULL.regen * dt);

		// the Strider seen from outside
		strider.root.position.copy(bot.pos);
		strider.root.rotation.y = bot.heading + Math.PI;
		strider.walk(bot.phaseL, bot.phaseR, bot.amountL, bot.amountR, clock);

		// the eye
		if (mode === 'outside' && boardT < 0) {
			outsidePose(eye, eyeQ);
			boardFrom = false;
		} else if (mode === 'outside' || (boardT >= 0 && boardT < BOARD.dark[1])) {
			if (!boardFrom) { outsidePose(fromPos, fromQ); boardFrom = true; }
			const kk = Math.min(1, boardT / BOARD.fly);
			const e = kk * kk * (3 - 2 * kk);
			cockpitPose(eye, eyeQ);
			eye.lerpVectors(fromPos, eye, e);
			eyeQ.slerpQuaternions(fromQ, eyeQ, e);
		} else cockpitPose(eye, eyeQ);
		strider.root.visible = mode === 'outside';
		rig.position.copy(eye);
		rig.quaternion.copy(eyeQ);
		if (shake > 0.01) rig.position.add(tmp.set((Math.random() - 0.5) * shake * 0.5, (Math.random() - 0.5) * shake * 0.5, 0).applyQuaternion(eyeQ));

		updateBots(dt);
		updateShots(dt);
		updateMissiles(dt);
		updateEffects(dt);

		// the sun, and its shadows round the Strider
		sun.target.position.copy(bot.pos);
		sun.position.copy(bot.pos).addScaledVector(SUN, 150);
		world.update(clock, eye, dt);
		sound.servo(driving ? Math.min(1, (Math.abs(bot.vL) + Math.abs(bot.vR)) / (2 * DRIVE.ahead)) : 0, mode === 'cockpit' && SCENE.includes(show.beat));
		sound.tick();
	}

	function updateBots(dt) {
		const attacking = show.beat === 'play';
		const pace = attacking ? 1 : 0.45;
		const eyeAt = rig.position;
		for (const b of bots) {
			if (b.dead) continue;
			b.t += dt;
			b.hurt = Math.max(0, b.hurt - dt);
			const dx = bot.pos.x - b.pos.x, dz = bot.pos.z - b.pos.z;
			const dist = Math.hypot(dx, dz) || 1;
			const ux = dx / dist, uz = dz / dist;
			let vx = 0, vz = 0;
			let face = Math.atan2(ux, uz);
			const spd = KINDS[b.kind].speed * pace;
			if (b.kind === 'beetle') {
				const wob = Math.sin(b.t * 1.3 + b.orbit * 2) * 0.5;
				const a = Math.atan2(ux, uz) + wob;
				vx = Math.sin(a) * spd;
				vz = Math.cos(a) * spd;
				face = a;
				if (dist < 5.5) {   // ram!
					explode(centreOf(b, tmp3).clone(), null, 0.8);
					chunks(centreOf(b, tmp3), 'beetle', 6);
					removeBot(b);
					damage(HULL.ram, centreOf(b, tmp3).clone());
					continue;
				}
			} else if (b.kind === 'buzzer') {
				if (dist > b.ring) { vx = ux * spd; vz = uz * spd; } else {
					const pull = (dist - b.ring) * 0.3;
					vx = (-uz * b.orbit) * spd * 0.8 + ux * pull;
					vz = (ux * b.orbit) * spd * 0.8 + uz * pull;
				}
				const ground = heightAt(b.pos.x, b.pos.z);
				b.pos.y += (ground + b.alt + Math.sin(b.t * 1.7) * 1.5 - b.pos.y) * Math.min(1, dt * 2);
				if (attacking && dist < SHOTS.range) {
					b.fire -= dt;
					if (b.fire <= 0) { b.fire = SHOTS.buzz[0] + Math.random() * (SHOTS.buzz[1] - SHOTS.buzz[0]); fireBolt(b, eyeAt); }
				}
			} else if (b.kind === 'crab') {
				if (dist > b.stand) { vx = ux * spd; vz = uz * spd; } else { vx = -uz * b.orbit * 1.4; vz = ux * b.orbit * 1.4; }
				if (attacking && dist < SHOTS.range) {
					b.fire -= dt;
					if (b.fire <= 0) { b.fire = SHOTS.crab[0] + Math.random() * (SHOTS.crab[1] - SHOTS.crab[0]); fireShell(b); }
				}
			} else if (b.kind === 'target') {
				b.pos.y += Math.sin(b.t * 1.5) * dt * 0.8;
			}
			b.pos.x += vx * dt;
			b.pos.z += vz * dt;
			if (!b.flying) b.pos.y = heightAt(b.pos.x, b.pos.z);
			b.speed = Math.hypot(vx, vz);
			const root = b.model.root;
			root.position.copy(b.pos);
			// (turn smoothly toward where it's going)
			let da = face - root.rotation.y;
			da = Math.atan2(Math.sin(da), Math.cos(da));
			root.rotation.y += da * Math.min(1, dt * 5);
			if (b.kind === 'buzzer') root.rotation.x = 0.15;
			b.model.animate(b.t, dt, b.speed);
			const flick = b.hurt > 0 && Math.floor(b.t * 30) % 2 === 0;
			root.scale.setScalar(flick ? 1.12 : 1);
		}
		// (no piling up on each other)
		for (let i = 0; i < bots.length; i++) {
			const a = bots[i];
			if (a.dead) continue;
			for (let j = i + 1; j < bots.length; j++) {
				const b = bots[j];
				if (b.dead || a.flying !== b.flying) continue;
				const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
				const d = Math.hypot(dx, dz);
				const min = a.model.radius + b.model.radius;
				if (d > 0.01 && d < min) {
					const push = (min - d) / 2 / d;
					a.pos.x -= dx * push; a.pos.z -= dz * push;
					b.pos.x += dx * push; b.pos.z += dz * push;
				}
			}
		}
		bots = bots.filter((b) => !b.dead);
	}

	function addShot(kind, from, vel) {
		const mesh = kind === 'bolt' ? buildBolt() : buildShell();
		mesh.position.copy(from);
		scene.add(mesh);
		const glow = new G.Sprite(new G.SpriteMaterial({ map: TEX.glow, color: kind === 'bolt' ? 0xff4a9a : 0xff8a1a, blending: G.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }));
		glow.scale.setScalar(kind === 'bolt' ? 3 : 3.5);
		mesh.add(glow);
		shots.push({ kind, mesh, glow, pos: from.clone(), vel, age: 0 });
	}

	function fireBolt(b, at) {
		const from = b.pos.clone().add(tmp.set(0, -0.8, 0));
		const lead = tmp2.copy(at).addScaledVector(fwdOf(bot.heading, tmp3), bot.v * 0.6);
		const vel = lead.sub(from).normalize().multiplyScalar(SHOTS.bolt);
		addShot('bolt', from, vel);
		sound.zap(panToward(from));
	}

	function fireShell(b) {
		const from = b.pos.clone().add(tmp.set(0, b.model.centre + 1.5, 0));
		const T = SHOTS.shell;
		const to = tmp2.copy(bot.pos).addScaledVector(fwdOf(bot.heading, tmp3), bot.v * T * 0.7).setY(bot.pos.y + EYE * 0.6);
		const vel = to.sub(from).divideScalar(T);
		vel.y += 0.5 * SHOTS.gravity * T;
		addShot('shell', from, vel);
		sound.thunk(panToward(from));
	}

	function panToward(p) {
		const rel = tmp3.copy(p).sub(bot.pos);
		return rel.dot(rightOf(bot.heading, new G.Vector3())) / Math.max(1, rel.length());
	}

	function updateShots(dt) {
		const eyeAt = rig.position;
		for (const s of shots) {
			if (s.dead) continue;
			s.age += dt;
			if (s.kind === 'shell') s.vel.y -= SHOTS.gravity * dt;
			s.pos.addScaledVector(s.vel, dt);
			s.mesh.position.copy(s.pos);
			s.glow.material.rotation += dt * 6;
			// into the Strider?
			const dxz = Math.hypot(s.pos.x - bot.pos.x, s.pos.z - bot.pos.z);
			const hitBody = dxz < 3.2 && s.pos.y > bot.pos.y && s.pos.y < bot.pos.y + EYE + 1.5;
			if (s.pos.distanceTo(eyeAt) < 3.2 || hitBody) {
				s.dead = true;
				particle(TEX.fire, s.pos, { additive: true, life: 0.3, size: [2, 6] });
				damage(s.kind === 'bolt' ? HULL.bolt : HULL.shell, s.pos.clone());
				continue;
			}
			if (s.pos.y < heightAt(s.pos.x, s.pos.z)) {
				s.dead = true;
				if (s.kind === 'shell') explode(s.pos.clone(), null, 0.6);
				else particle(TEX.glow, s.pos, { additive: true, colour: 0xff7ab0, life: 0.3, size: [1, 4] });
				continue;
			}
			if (s.age > 5) s.dead = true;
		}
		for (const s of shots) if (s.dead) { scene.remove(s.mesh); disposeMesh(s.mesh); }
		shots = shots.filter((s) => !s.dead);
	}

	const seg = new G.Line3();
	function updateMissiles(dt) {
		for (const m of missiles) {
			if (m.dead) continue;
			m.age += dt;
			m.speed = Math.min(MISSILE.top, m.speed + MISSILE.accel * dt);
			if (m.target && !m.target.dead) centreOf(m.target, m.aim);
			const want = tmp.copy(m.aim).sub(m.pos).normalize();
			const dir = tmp2.copy(m.vel).normalize().lerp(want, Math.min(1, dt * MISSILE.turn)).normalize();
			m.vel.copy(dir).multiplyScalar(m.speed);
			const from = m.pos.clone();
			m.pos.addScaledVector(m.vel, dt);
			seg.set(from, m.pos);
			// into a Klankbot?
			let hit = null;
			for (const b of bots) {
				if (b.dead) continue;
				const c = centreOf(b, tmp3);
				if (seg.closestPointToPoint(c, true, new G.Vector3()).distanceTo(c) < b.model.radius * 0.85 + 0.3) { hit = b; break; }
			}
			let at = null;
			if (hit) at = seg.closestPointToPoint(centreOf(hit, tmp3), true, new G.Vector3());
			else if (m.pos.y < heightAt(m.pos.x, m.pos.z)) at = m.pos.clone().setY(heightAt(m.pos.x, m.pos.z) + 0.3);
			else if ((!m.target || m.target.dead) && m.pos.distanceTo(m.aim) < m.speed * dt * 1.2) at = m.aim.clone();
			else if (m.age > MISSILE.life) at = m.pos.clone();
			if (at) {
				m.dead = true;
				explode(at, m.by, 1);
				continue;
			}
			m.mesh.position.copy(m.pos);
			m.mesh.lookAt(tmp.copy(m.pos).add(m.vel));
			m.puff -= dt;
			if (m.puff <= 0) {
				m.puff = 0.025;
				particle(TEX.smoke, m.pos, { colour: 0xdedad4, life: 0.9, size: [0.8, 3.2], alpha: 0.55, drag: 2 });
			}
		}
		for (const m of missiles) if (m.dead) { scene.remove(m.mesh); disposeMesh(m.mesh); }
		missiles = missiles.filter((m) => !m.dead);
	}

	function updateEffects(dt) {
		for (const p of parts) {
			p.age += dt;
			const kk = p.age / p.life;
			p.vel.y -= p.grav * dt;
			if (p.drag) p.vel.multiplyScalar(Math.exp(-p.drag * dt));
			p.s.position.addScaledVector(p.vel, dt);
			p.s.scale.setScalar(p.size[0] + (p.size[1] - p.size[0]) * Math.sqrt(Math.min(1, kk)));
			p.s.material.opacity = p.alpha * (1 - kk) * (kk < 0.1 ? kk / 0.1 : 1);
			p.s.material.rotation += p.spin * dt;
		}
		for (let i = parts.length - 1; i >= 0; i--) {
			const p = parts[i];
			if (p.age < p.life) continue;
			scene.remove(p.s);
			(p.s.userData.additive ? freeParts.add : freeParts.normal).push(p.s);
			parts.splice(i, 1);
		}
		for (const d of debris) {
			d.age += dt;
			d.vel.y -= 22 * dt;
			d.m.position.addScaledVector(d.vel, dt);
			const g = heightAt(d.m.position.x, d.m.position.z);
			if (d.m.position.y < g) { d.m.position.y = g; d.vel.multiplyScalar(0.4); d.vel.y = Math.abs(d.vel.y) * 0.5; }
			d.m.rotation.x += d.spin.x * dt;
			d.m.rotation.y += d.spin.y * dt;
			if (d.age > 2.5) d.m.scale.multiplyScalar(Math.exp(-dt * 4));
		}
		for (let i = debris.length - 1; i >= 0; i--) if (debris[i].age > 3.5) { scene.remove(debris[i].m); debris.splice(i, 1); }
		for (const p of pops) p.age += dt;
		for (let i = pops.length - 1; i >= 0; i--) if (pops[i].age > 1.2) pops.splice(i, 1);
		for (const c of cracks) c.age += dt;
		for (let i = cracks.length - 1; i >= 0; i--) if (cracks[i].age > 6) cracks.splice(i, 1);
		for (const m of marks) m.age += dt;
		for (let i = marks.length - 1; i >= 0; i--) if (marks[i].age > 0.6) marks.splice(i, 1);
	}

	function render() {
		renderer.render(scene, walls.views(renderer.width, renderer.height));   // (all three walls in one call)
	}

	/* ---------- the 2D layer: the cockpit ---------- */

	const pv = new G.Vector3();
	function onWall(v, wall) {
		pv.copy(v).project(cams[wall]);
		if (pv.z > 1 || Math.abs(pv.x) > 1.3 || Math.abs(pv.y) > 1.3) return null;
		return { x: wall * W + (pv.x + 1) / 2 * W, y: (1 - pv.y) / 2 * H, in: Math.abs(pv.x) <= 1 && Math.abs(pv.y) <= 1 };
	}
	function onAnyWall(v) {
		for (const w of [1, 0, 2]) {
			const p = onWall(v, w);
			if (p && p.in) return p;
		}
		return null;
	}

	let frameArt = null;
	const noise = (function () {
		const c = document.createElement('canvas');
		c.width = 320;
		c.height = 200;
		const g = c.getContext('2d');
		const img = g.createImageData(320, 200);
		for (let i = 0; i < img.data.length; i += 4) {
			const v = Math.random() * 255;
			img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
			img.data[i + 3] = 255;
		}
		g.putImageData(img, 0, 0);
		return c;
	})();

	function bracket(ctx, x, y, r, colour, spin) {
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(spin);
		ctx.strokeStyle = colour;
		ctx.lineWidth = 6;
		ctx.shadowColor = 'rgba(0,0,0,0.6)';
		ctx.shadowBlur = 6;
		for (let i = 0; i < 4; i++) {
			ctx.rotate(Math.PI / 2);
			ctx.beginPath();
			ctx.moveTo(r, r - 18);
			ctx.lineTo(r, r);
			ctx.lineTo(r - 18, r);
			ctx.stroke();
		}
		ctx.restore();
	}

	function overlay(ctx) {
		if (mode !== 'cockpit') return;
		if (!frameArt) frameArt = paintFrame(W, H);
		const inPlay = show.beat === 'play';

		// on the glass: where taps landed, what's locked on, the words
		for (const m of marks) {
			const kk = m.age / 0.6;
			art.circle(ctx, m.x, m.y, 20 + kk * 60, { stroke: m.colour, lineWidth: 6 * (1 - kk), alpha: 1 - kk });
		}
		for (const m of missiles) {
			if (!m.target || m.target.dead) continue;
			const p = onAnyWall(centreOf(m.target, tmp));
			if (!p) continue;
			const d = rig.position.distanceTo(m.target.pos);
			bracket(ctx, p.x, p.y, Math.max(24, 900 / Math.max(8, d) * m.target.model.radius), PLAYER_COLORS[m.by], clock * 3);
		}
		for (const p of pops) {
			const at = onAnyWall(tmp.copy(p.at).add(tmp2.set(0, 2.5, 0)));
			if (!at) continue;
			const kk = p.age / 1.2;
			art.text(ctx, p.text, at.x, at.y - kk * 90, { size: p.size * (kk < 0.12 ? kk / 0.12 : 1), font: 'Lexend', fill: p.colour, outline: '#140a0a', outlineWidth: 7, alpha: 1 - Math.max(0, kk - 0.6) / 0.4 });
		}

		// cracks in the glass
		ctx.save();
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		for (const c of cracks) {
			const a = Math.min(1, (6 - c.age) / 2);
			for (const [col, w] of [['rgba(0,0,0,0.45)', 5], ['rgba(235,245,255,0.85)', 2]]) {
				ctx.strokeStyle = col;
				ctx.lineWidth = w;
				ctx.globalAlpha = a;
				for (const line of c.lines) {
					ctx.beginPath();
					line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
					ctx.stroke();
				}
			}
		}
		ctx.restore();

		// threats behind: red chevrons at the back edges of the side windows
		if (inPlay) {
			const f = fwdOf(bot.heading, tmp2), rt = rightOf(bot.heading, tmp3);
			let backL = 0, backR = 0;
			for (const b of bots) {
				const d = tmp.copy(b.pos).sub(bot.pos);
				const dist = d.length();
				if (dist > 60) continue;
				const ang = Math.atan2(d.dot(rt), d.dot(f));
				if (Math.abs(ang) < Math.PI * 0.75) continue;
				if (ang < 0) backL++; else backR++;
			}
			const pulse = 0.5 + 0.5 * Math.sin(clock * 10);
			const chevrons = (x, dir) => {
				for (let i = 0; i < 3; i++) {
					const cx = x + dir * i * 34;
					ctx.fillStyle = `rgba(255,59,48,${0.4 + 0.6 * pulse})`;
					ctx.beginPath();
					ctx.moveTo(cx, H / 2 - 50);
					ctx.lineTo(cx + dir * -34, H / 2);
					ctx.lineTo(cx, H / 2 + 50);
					ctx.lineTo(cx + dir * 14, H / 2 + 50);
					ctx.lineTo(cx + dir * -20, H / 2);
					ctx.lineTo(cx + dir * 14, H / 2 - 50);
					ctx.fill();
				}
			};
			if (backL) chevrons(150, 1);
			if (backR) chevrons(3 * W - 150, -1);
		}

		// offline: static on every window
		if (bot.offline > 0) {
			ctx.save();
			ctx.globalAlpha = 0.55;
			for (let w = 0; w < 3; w++) ctx.drawImage(noise, Math.random() * 60, Math.random() * 40, 260, 160, w * W, 0, W, H);
			ctx.restore();
			art.rect(ctx, 0, 0, WIDTH, H, { fill: 'rgba(20,0,0,0.35)' });
		}

		// flashes
		if (flash.white > 0.01) art.rect(ctx, 0, 0, WIDTH, H, { fill: `rgba(255,240,220,${flash.white * 0.5})` });
		const low = inPlay && bot.hull < 30 && bot.offline <= 0 ? 0.25 + 0.2 * Math.sin(clock * 8) : 0;
		const red = Math.max(flash.red, low);
		if (red > 0.01) {
			for (let w = 0; w < 3; w++) {
				const g = ctx.createRadialGradient(w * W + W / 2, H / 2, H * 0.3, w * W + W / 2, H / 2, W * 0.7);
				g.addColorStop(0, 'rgba(255,30,20,0)');
				g.addColorStop(1, `rgba(255,30,20,${red})`);
				ctx.fillStyle = g;
				ctx.fillRect(w * W, 0, W, H);
			}
		}

		// the frame itself
		ctx.drawImage(frameArt, 0, 0);

		// the instruments
		// each leg's driver: an arrow in their colour pointing out to their
		// side, and a bar of chevrons filling in their colour with their throttle
		const drv = (i) => (i < count && seen[i] ? PLAYER_COLORS[i] : '#6a6f7a');
		const posOf = (i) => (i < count && seen[i] && latest[i] && latest[i].pz !== undefined ? (latest[i].pz - 0.5) / DRIVE.full : null);   // (where they stand: -1 back .. 1 front)
		chevronBar(ctx, W + FRAME.sides[1][0], CHEVRONS.mid, bot.tL, posOf(DRIVERS.left), drv(DRIVERS.left), 1);
		chevronBar(ctx, 2 * W - FRAME.sides[1][1], CHEVRONS.mid, bot.tR, posOf(DRIVERS.right), drv(DRIVERS.right), -1);
		// the little wireframe Strider, its legs keeping step with the real ones
		wireStrider(ctx, W * 1.5, 895, 15, [
			{ phase: bot.phaseL, amount: bot.amountL, colour: drv(DRIVERS.left) },
			{ phase: bot.phaseR, amount: bot.amountR, colour: drv(DRIVERS.right) },
		], clock);

		const RANGE = 160;
		const f = fwdOf(bot.heading, tmp2), rt = rightOf(bot.heading, tmp3);
		const blips = [];
		for (const b of bots) {
			const d = tmp.copy(b.pos).sub(bot.pos);
			let x = d.dot(rt) / RANGE, y = -d.dot(f) / RANGE;
			const len = Math.hypot(x, y);
			if (len > 0.95) { x *= 0.95 / len; y *= 0.95 / len; }
			blips.push({ x, y, colour: COLOUR[b.kind], size: b.kind === 'crab' ? 8 : 6 });
		}
		for (const s of shots) {
			const d = tmp.copy(s.pos).sub(bot.pos);
			const x = d.dot(rt) / RANGE, y = -d.dot(f) / RANGE;
			if (Math.hypot(x, y) < 0.95) blips.push({ x, y, colour: '#ffffff', size: 3 });
		}
		radar(ctx, W + 190, 850, 95, blips, clock * 2.2);
		hullDial(ctx, 2 * W - 190, 850, 95, bot.hull / 100, bot.hull < 30);

		if (inPlay || show.beat === 'timeup') {
			readout(ctx, 110, 150, 'SMASHED', String(smashed).padStart(3, '0'), 'left');
			readout(ctx, 3 * W - 110, 150, 'WAVE', String(wave), 'right', '#ffd23f');
		}

		if (bot.offline > 0) {
			show.onWalls(ctx, function (c) {
				show.text(c, 'SYSTEM REBOOT', W / 2, 430, 110, { fill: '#ff3b30', alpha: 0.6 + 0.4 * Math.sin(clock * 12) });
				const kk = 1 - bot.offline / HULL.reboot;
				art.roundRect(c, W / 2 - 300, 520, 600, 30, 15, { fill: 'rgba(0,0,0,0.6)' });
				art.roundRect(c, W / 2 - 296, 524, 592 * kk, 22, 11, { fill: '#3cdc7a' });
			});
		}
	}

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		simulate(show.paused ? 0 : dt * show.timeScale);   // (still while paused; slowing to a stop with TIME!)
		if (SCENE.includes(show.beat)) render();             // (the results are on the show's own backdrop)
		show.frame(ctx, dt, overlay);
	};

	/* ---------- input ---------- */

	self.setPlayers = function (p) {
		latest = p;
		for (let i = 0; i < count; i++) {
			if (p[i] && p[i].px !== undefined) seen[i] = true;   // (pz: 1 at the front wall, 0 at the back)
		}
	};

	// For tests and the console: where the game is up to.
	self.state = function () {
		return Object.assign(show.state(), {
			mode, wave, runT, scores: scores.slice(), smashed, shotsFired,
			bot: { x: bot.pos.x, z: bot.pos.z, heading: bot.heading, tL: bot.tL, tR: bot.tR, v: bot.v, hull: bot.hull, offline: bot.offline },
			bots: bots.map((b) => ({ kind: b.kind, x: b.pos.x, y: b.pos.y, z: b.pos.z, hp: b.hp })),
			missiles: missiles.length, shots: shots.length,
			timeLeft: show.timeLeft(),
		});
	};

	self.test = {
		jump(id) {
			$('showtime-picker').remove();
			if (!count) setUp(playersMeta ? playersMeta.length : 2);
			show.go(id);
		},
		timeLeft(s) { show.setTimeLeft(s); },
		tap(x, y) { tap({ x, y }); },
	};

	self.fini = function () {
		sound.close();
		unlisten();
		show.fini();
		world.dispose();
		for (const t of Object.values(TEX)) t.dispose();
		renderer.dispose();
		renderer.forceContextLoss();
	};

	/* ---------- go ---------- */

	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
