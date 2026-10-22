/*
 * Sonic Characters
 *
 * A sandbox for iterating on the Sonic games' character models: each one on
 * a pedestal round the room, lit like a studio shot (with the games' bloom
 * and tone mapping), turning slowly, its name and what it's doing under it.
 *
 *   from the left wall round to the right: a Crab Tank, Doctor Robotnik, Metal
 *   Sonic, Super Sonic, Shadow, the speedster (Sonic Dash, Sonic Classic),
 *   Knuckles (Knuckles Quest), Tails (Sonic Tails), Amy Rose, Rouge, a Beetle
 *   Bot, a Buzz Drone, Sonic Tails' hovering robot, the Strider (Sonic Robot)
 *
 * They stand spread round the room on pedestals. Tap one and it glides to the
 * front, big; tap it again to step it through its animations (run, ball,
 * climb, glide...); tap anywhere else to send it back (or, with no one at the
 * front, to stop or start the turntables).
 * The models come straight from the games' own files, so what you see here
 * is what they use. An ES module (manifest: module: true).
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { createWallComposer, createWallRig, toScreen, environmentFromShader } from '../../lib/three/walls.js';
import { buildSpeedster } from '../../shared/speedster3d.js';
import { buildRobotnik } from '../../shared/robotnik3d.js';
import { buildClimber } from '../knuckles-quest/models.js';
import { buildFox, buildRobot as buildHoverBot } from '../twin-tail-tower/models.js';
import { buildRobot as buildStrider, buildBeetle, buildBuzzer, buildCrab } from '../iron-stride/models.js';

IGB.register('sonic-characters', function SonicCharacters(stage) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;
	const TAU = Math.PI * 2;
	const DEG = Math.PI / 180;

	/* ---------- renderer, scene, cameras ---------- */

	const renderer = new THREE.WebGLRenderer({ antialias: false });
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
	scene.background = new THREE.Color(0x1a1f2e);

	// a soft studio: a bright overhead, a warm key, a cool rim, a dim floor
	const STUDIO = /* glsl */`
		vec3 envColor(vec3 d) {
			vec3 c = mix(vec3(0.06, 0.07, 0.10), vec3(0.22, 0.24, 0.30), smoothstep(-0.2, 0.6, d.y));
			c += vec3(1.6) * smoothstep(0.82, 0.95, d.y);                                   // the overhead softbox
			c += vec3(1.4, 1.15, 0.9) * smoothstep(0.75, 0.92, dot(d, normalize(vec3(-0.7, 0.35, -0.6))));   // warm key
			c += vec3(0.7, 0.85, 1.3) * smoothstep(0.8, 0.95, dot(d, normalize(vec3(0.8, 0.25, 0.5))));      // cool rim
			return c;
		}
	`;
	const env = environmentFromShader(renderer, STUDIO);
	scene.environment = env;

	scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2430, 0.6));
	const key = new THREE.DirectionalLight(0xfff0dc, 2.6);
	key.position.set(-6, 10, 4);
	key.castShadow = true;
	key.shadow.mapSize.set(2048, 2048);
	Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
	key.shadow.camera.updateProjectionMatrix();
	key.shadow.bias = -0.0004;
	key.shadow.normalBias = 0.03;
	scene.add(key, key.target);

	postfx = createWallComposer(renderer, scene, { strength: 0.45, radius: 0.5, threshold: 0.95 });

	const walls = createWallRig({ fov: 64, aspect: W / H, near: 0.05, far: 200 });
	walls.rig.position.set(0, 1.35, 0);
	walls.rig.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -6 * DEG);
	scene.add(walls.rig);
	const cams = walls.cameras;

	// the floor: a big soft disc
	const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.MeshStandardMaterial({ color: 0x2a3042, roughness: 0.6, metalness: 0.1 }));
	floor.rotation.x = -Math.PI / 2;
	floor.receiveShadow = true;
	scene.add(floor);

	/* ---------- the characters ---------- */

	// each: where it stands (angle round from the front, + to the right; how
	// far), its scale, its modes, and how to step it
	const pedestalMat = new THREE.MeshPhysicalMaterial({ color: 0x3a4258, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.2 });
	const rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5ad1ff).multiplyScalar(2.2) });

	function speedster() {
		const s = buildSpeedster(0x2f6cf0);
		return {
			name: 'SPEEDSTER', from: 'Sonic Dash · Sonic Classic', root: s.root, height: 1.6,
			modes: ['idle', 'jog', 'run', 'flat out', 'ball', 'crouch', 'spring', 'hurt'],
			step(dt, t, mode) {
				const pace = { jog: 0.35, run: 0.7, 'flat out': 1 }[mode];
				if (pace) s.animate(dt, 'run', pace, 0, t);
				else s.animate(dt, mode, 0, 30, t);
			},
		};
	}
	// the rest of the family, from the same build (shared/speedster3d.js: kind)
	function family(name, colour, kind) {
		const s = buildSpeedster(colour, { kind });
		return {
			name, from: 'the speedster build', root: s.root, height: 1.6,
			modes: ['idle', 'jog', 'run', 'flat out', 'ball', 'crouch', 'spring', 'hurt'],
			step(dt, t, mode) {
				const pace = { jog: 0.35, run: 0.7, 'flat out': 1 }[mode];
				if (pace) s.animate(dt, 'run', pace, 0, t);
				else s.animate(dt, mode, 0, 30, t);
			},
		};
	}
	function robotnik() {
		const r = buildRobotnik();
		return {
			name: 'DR ROBOTNIK', from: 'shared/robotnik3d.js', root: r.root, height: 2.0,
			modes: ['idle', 'run'],
			step(dt, t, mode) { r.animate(dt, mode, mode === 'run' ? 0.7 : 0, 0, t); },
		};
	}
	function climber() {
		const c = buildClimber();
		return {
			name: 'KNUCKLES', from: 'Knuckles Quest', root: c.root, height: 1.6,
			modes: ['idle', 'run', 'climb', 'glide', 'jump', 'fall'],
			step(dt, t, mode) { c.animate(dt, mode, mode === 'climb' ? 1 : mode === 'run' ? 0.8 : 0, t); },
		};
	}
	function fox() {
		const f = buildFox(0xf08a12);
		const st = { vy: 0, v0: 9, rotor: false, hurt: false, squash: 0, lean: 0, idle: true };
		let y = 0;
		return {
			name: 'TAILS', from: 'Sonic Tails', root: f.root, height: 1.6,
			modes: ['idle', 'bounce', 'rotor', 'hurt'],
			step(dt, t, mode) {
				st.idle = mode === 'idle';
				st.rotor = mode === 'rotor';
				st.hurt = mode === 'hurt';
				if (mode === 'bounce') {
					st.vy -= 22 * dt;
					y += st.vy * dt;
					if (y <= 0) { y = 0; st.vy = st.v0; st.squash = 1; }
				} else if (mode === 'rotor') {
					y += (1.2 + Math.sin(t * 2) * 0.15 - y) * Math.min(1, dt * 3);
					st.vy = 0;
				} else { y *= Math.exp(-dt * 6); st.vy = 0; }
				st.squash *= Math.exp(-dt * 10);
				f.root.userData.lift = y * 0.35;
				f.pose(dt, st);
			},
		};
	}
	function strider() {
		const r = buildStrider();
		let pl = 0, pr = Math.PI;
		return {
			name: 'STRIDER', from: 'Sonic Robot', root: r.root, height: 9.2, scale: 0.24,
			modes: ['idle', 'walk', 'turn'],
			step(dt, t, mode) {
				if (mode === 'walk') { pl += dt * 2.6; pr += dt * 2.6; r.walk(pl, pr, 1, 1, t); }
				else if (mode === 'turn') { pl += dt * 2.6; pr -= dt * 2.6; r.walk(pl, pr, 0.8, 0.8, t); }
				else r.walk(pl, pr, 0, 0, t);
			},
		};
	}
	function bot(build, name, from, scale, height, moving) {
		const b = build();
		return {
			name, from, root: b.root, height, scale,
			modes: ['idle', moving],
			step(dt, t, mode) { b.animate(t, dt, mode === 'idle' ? 0 : 3); },
		};
	}
	function hoverBot() {
		const g = buildHoverBot();
		return {
			name: 'HOVER BOT', from: 'Sonic Tails', root: g, height: 1.3, base: 0.9,
			modes: ['hover'],
			step(dt, t) { g.userData.lift = Math.sin(t * 2.4) * 0.12; },
		};
	}

	// everyone, evenly spread round the three walls from the back of the left
	// one to the back of the right, at R metres out (the robots' scale and
	// lift as before; the Strider, being huge, further out)
	const R = 6.6;
	const PLACES = [
		{ make: () => bot(buildCrab, 'CRAB TANK', 'Sonic Robot', 0.42, 1.8, 'scuttling') },
		{ make: robotnik },
		{ make: () => family('METAL SONIC', 0x2a3f9a, 'metal') },
		{ make: () => family('SUPER SONIC', 0xffc21a, 'super') },
		{ make: () => family('SHADOW', 0x1c1c24, 'shadow') },
		{ make: speedster },
		{ make: climber },
		{ make: fox },
		{ make: () => family('AMY ROSE', 0xff7eb6, 'amy') },
		{ make: () => family('ROUGE', 0xf4f2f6, 'rouge') },
		{ make: () => bot(buildBeetle, 'BEETLE BOT', 'Sonic Robot', 0.55, 2.3, 'rolling') },
		{ make: () => bot(buildBuzzer, 'BUZZ DRONE', 'Sonic Robot', 0.55, 1.8, 'buzzing'), base: 1.1 },
		{ make: hoverBot },
		{ make: strider, r: R + 2 },
	];
	PLACES.forEach((p, i) => { p.a = -128 + i * 256 / (PLACES.length - 1); p.r = p.r || R; });

	// the spot at the front where a tapped character comes, big, and a glowing ring on the floor there
	const SHOW = new THREE.Vector3(0, 0, -2.9), BIG = 2.2;
	const showRing = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5ad1ff).multiplyScalar(2.2), transparent: true, opacity: 0 }));
	showRing.rotation.x = Math.PI / 2;
	showRing.position.copy(SHOW).setY(0.02);
	scene.add(showRing);

	const chars = PLACES.map(function (p, i) {
		const c = p.make();
		c.mode = 0;
		c.spin = 0;
		const x = p.r * Math.sin(p.a * DEG), z = -p.r * Math.cos(p.a * DEG);
		c.at = new THREE.Vector3(x, 0, z);
		c.face = Math.atan2(x, z);   // (toward the middle of the room)
		// the pedestal
		const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.25, 0.3, 48), pedestalMat);
		ped.position.set(x, 0.15, z);
		ped.receiveShadow = ped.castShadow = true;
		scene.add(ped);
		const rim = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.025, 8, 64), rimMat);
		rim.rotation.x = Math.PI / 2;
		rim.position.set(x, 0.3, z);
		scene.add(rim);
		// the model on it
		const holder = new THREE.Group();
		holder.position.set(x, 0.3 + (p.base || c.base || 0), z);
		holder.scale.setScalar(c.scale || 1);
		holder.add(c.root);
		scene.add(holder);
		c.holder = holder;
		// (where it lives, and how big; brought forward, it goes to SHOW, about BIG metres tall)
		c.home = holder.position.clone();
		c.homeScale = c.scale || 1;
		c.bigScale = BIG / c.height;
		c.f = 0;
		c.showSpin = 0;
		c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
		return c;
	});

	let spinning = true;
	let clock = 0;
	let featured = null;   // the one brought to the front (tapped), or null
	const tmp = new THREE.Vector3();

	/* ---------- taps ---------- */

	function screenOf(c, wall) {
		tmp.copy(c.holder.position).setY(c.holder.position.y + c.height * c.holder.scale.x * 0.5);
		return toScreen(tmp, cams[wall], wall * W, 0, W, H);
	}

	function tap(at) {
		const wall = Math.floor(at.x / W);
		if (wall < 0 || wall > 2) return;
		let best = null, bestD = 260;
		for (const c of chars) {
			const p = screenOf(c, wall);
			if (!p || !p.inside) continue;
			const d = Math.hypot(p.x - at.x, p.y - at.y);
			if (d < bestD) { bestD = d; best = c; }
		}
		// a character: bring it to the front (if it's already there, step it through what it can do)
		if (best && best === featured) best.mode = (best.mode + 1) % best.modes.length;
		else if (best) featured = best;
		// nothing: send the one at the front home, or (with no one there) stop or start the turntables
		else if (featured) featured = null;
		else spinning = !spinning;
	}
	stage.$el.on('click', function (e) {
		if (e.target && e.target.closest && e.target.closest('button')) return;
		tap(IGB.toWorld(e));
	});

	/* ---------- every frame ---------- */

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		clock += dt;

		for (const c of chars) {
			// to the front and back home: an eased glide, hopping up a little on the way
			c.f += ((c === featured ? 1 : 0) - c.f) * Math.min(1, dt * 3.5);
			const e = c.f * c.f * (3 - 2 * c.f);
			c.holder.position.lerpVectors(c.home, SHOW, e);
			c.holder.position.y += Math.sin(Math.PI * e) * 0.6;
			c.holder.scale.setScalar(c.homeScale + (c.bigScale - c.homeScale) * e);
			if (spinning) c.spin += dt * 0.35;
			// (at the front it turns slowly round on its own, turntables on or off, starting face on)
			if (c === featured) c.showSpin += dt * 0.3;
			else if (c.f < 0.02) c.showSpin = 0;
			// (facing the middle of the room from wherever it is)
			const face = Math.atan2(c.holder.position.x, c.holder.position.z);
			c.root.rotation.y = face + c.spin * (1 - e) + c.showSpin;
			c.step(dt, clock, c.modes[c.mode]);
			c.root.position.y = c.root.userData.lift || 0;
		}
		showRing.material.opacity = Math.max(...chars.map((c) => c.f));
		postfx.render(walls.views(renderer.domElement.width, renderer.domElement.height));

		// labels
		ctx.clearRect(0, 0, WIDTH, H);
		art.text(ctx, 'SONIC CHARACTERS', W * 1.5, 70, { size: 72, font: 'Knewave', fill: '#ffe14a', outline: '#1a0b2e', outlineWidth: 8 });
		art.text(ctx, featured ? 'TAP IT AGAIN TO CHANGE WHAT IT\'S DOING  ·  TAP ANYWHERE ELSE TO SEND IT BACK' : 'TAP A CHARACTER TO BRING IT TO THE FRONT  ·  TAP ANYWHERE ELSE TO ' + (spinning ? 'STOP' : 'START') + ' THE TURNTABLES', W * 1.5, 940, { size: 30, font: 'Paytone One', weight: 400, fill: 'rgba(255,255,255,0.8)' });
		for (const c of chars) {
			for (let w = 0; w < 3; w++) {
				tmp.copy(c.holder.position).setY(0.05);
				const p = toScreen(tmp, cams[w], w * W, 0, W, H);
				if (!p || !p.inside) continue;
				art.text(ctx, c.name, p.x, p.y + 40, { size: 40, font: 'Paytone One', weight: 400, fill: 'white', outline: 'rgba(0,0,0,0.5)', outlineWidth: 5 });
				art.text(ctx, c.from, p.x, p.y + 80, { size: 24, font: 'Paytone One', weight: 400, fill: 'rgba(255,255,255,0.65)' });
				art.roundRect(ctx, p.x - 90, p.y + 100, 180, 44, 22, { fill: 'rgba(90,209,255,0.25)', stroke: '#5ad1ff', lineWidth: 3 });
				art.text(ctx, c.modes[c.mode].toUpperCase(), p.x, p.y + 123, { size: 26, font: 'Paytone One', weight: 400, fill: '#bfefff' });
			}
		}
	};

	self.state = () => ({ spinning, modes: chars.map((c) => c.name + ': ' + c.modes[c.mode]) });
	self.test = { tap(x, y) { tap({ x, y }); } };

	self.fini = function () {
		unlisten();
		postfx.dispose();
		env.dispose();
		renderer.dispose();
		renderer.forceContextLoss();
	};
});
