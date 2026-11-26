/*
 * Sonic Characters
 *
 * A sandbox for iterating on the Sonic games' character models: each one on
 * a pedestal round the room, lit like a studio shot (with the games' bloom
 * and tone mapping), turning slowly, its name and what it's doing under it.
 *
 * The room itself is a Studio scene, assets/sonic-characters/scenes/main.json
 * (open it with studio.html?game=sonic-characters): the pedestals and who's
 * on them, the lights, the floor, the rendering and the wall cameras are all
 * edited there, and show here live while the Studio is open. This code only
 * adds what they do:
 *
 *   - every object tagged 'character' (a code-built character, PREFABS in
 *     lib/three/igb-scene.js) turns on its pedestal, facing the middle
 *   - tap one and it glides to the Show Spot marker, big; tap it again to step
 *     it through its animations (run, ball, climb, glide...); tap anywhere else
 *     to send it back (or, with no one at the front, to stop or start the
 *     turntables). The Show Ring lights while someone's at the front.
 *
 * The models come straight from the games' own files, so what you see here
 * is what they use. An ES module (manifest: module: true).
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { createWallComposer, createWallRig, toScreen } from '../../lib/three/walls.js';
import { loadScene, PREFABS } from '../../lib/three/igb-scene.js';

const SCENE = 'assets/sonic-characters/scenes/main.json';

IGB.register('sonic-characters', function SonicCharacters(stage) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;

	/* ---------- renderer and walls (the scene sets how they look) ---------- */

	const renderer = new THREE.WebGLRenderer({ antialias: false });
	$(renderer.domElement).css({ position: 'absolute', left: 0, top: 0, width: WIDTH + 'px', height: H + 'px' }).appendTo(stage.$bg);

	let post = null;
	function resize() {
		const k = Math.min(IGB.scale * IGB.pixelRatio, IGB.maxK);
		renderer.setPixelRatio(1);
		renderer.setSize(Math.round(WIDTH * k), Math.round(H * k), false);
		if (post) post.setSize();
	}
	const unlisten = IGB.onResize(resize);
	resize();

	const scene = new THREE.Scene();
	post = createWallComposer(renderer, scene, { strength: 0.45, radius: 0.5, threshold: 0.95 });
	const walls = createWallRig({ fov: 64, aspect: W / H, near: 0.05, far: 200 });
	scene.add(walls.rig);
	const cams = walls.cameras;

	/* ---------- the scene ---------- */

	const BIG = 2.2;   // how tall (metres) a character stands at the front
	let s = null, failed = '', gone = false;
	let chars = [];
	let show = new THREE.Vector3(0, 0, -2.9);
	let ringMat = null;
	let featured = null;   // the one brought to the front (tapped), or null

	loadScene(SCENE, { renderer, live: true }).then((loaded) => {
		if (gone) { loaded.dispose(); return; }
		s = loaded;
		scene.add(s.root);
		setup();
		s.onReload(setup);   // (the Studio changed it: everything is new, find it all again)
	}).catch((e) => { failed = String(e.message || e); console.error(e); });

	function setup() {
		s.applyRender(scene, post);
		s.applyRig(walls);
		show = s.marker('Show Spot') || new THREE.Vector3(0, 0, -2.9);
		const ring = s.find('Show Ring');
		ringMat = null;
		if (ring) ring.traverse((o) => { if (o.isMesh) { ringMat = o.material; ringMat.transparent = true; ringMat.opacity = 0; } });
		const was = featured && featured.name;
		featured = null;
		chars = s.findAll('character').map((holder) => {
			const n = holder.userData.igb;
			const kind = n.prefab ? n.prefab.kind : '';
			const P = PREFABS[kind] || { modes: ['idle'], height: 1.6, game: '' };
			// (off its pedestal and into the scene, where it stood, so it can glide to the front)
			s.root.attach(holder);
			const variant = kind === 'speedster' && n.prefab.params && n.prefab.params.kind && n.prefab.params.kind !== 'sonic';
			const c = {
				holder, name: n.name || P.label || kind,
				from: variant ? 'the speedster build' : P.game,
				modes: P.modes,
				mode: Math.max(0, P.modes.indexOf(n.prefab && n.prefab.mode)),
				height: P.height || 1.6,
				home: holder.position.clone(),
				homeScale: holder.scale.x,
				bigScale: BIG / (P.height || 1.6),
				f: 0, spin: 0, showSpin: 0,
			};
			if (c.name === was) featured = c;
			return c;
		});
	}

	let spinning = true;
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
		if (best && best === featured) {
			best.mode = (best.mode + 1) % best.modes.length;
			s.setMode(best.holder, best.modes[best.mode]);
		} else if (best) featured = best;
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

		if (s) {
			s.update(dt);
			for (const c of chars) {
				// to the front and back home: an eased glide, hopping up a little on the way
				c.f += ((c === featured ? 1 : 0) - c.f) * Math.min(1, dt * 3.5);
				const e = c.f * c.f * (3 - 2 * c.f);
				c.holder.position.lerpVectors(c.home, show, e);
				c.holder.position.y += Math.sin(Math.PI * e) * 0.6;
				c.holder.scale.setScalar(c.homeScale + (c.bigScale - c.homeScale) * e);
				if (spinning) c.spin += dt * 0.35;
				// (at the front it turns slowly round on its own, turntables on or off, starting face on)
				if (c === featured) c.showSpin += dt * 0.3;
				else if (c.f < 0.02) c.showSpin = 0;
				// (facing the middle of the room from wherever it is)
				const face = Math.atan2(c.holder.position.x, c.holder.position.z);
				c.holder.rotation.set(0, face + c.spin * (1 - e) + c.showSpin, 0);
			}
			if (ringMat) ringMat.opacity = chars.length ? Math.max(...chars.map((c) => c.f)) : 0;
		}
		post.render(walls.views(renderer.domElement.width, renderer.domElement.height));

		// labels
		ctx.clearRect(0, 0, WIDTH, H);
		art.text(ctx, 'SONIC CHARACTERS', W * 1.5, 70, { size: 72, font: 'Knewave', fill: '#ffe14a', outline: '#1a0b2e', outlineWidth: 8 });
		if (failed) { art.text(ctx, 'COULD NOT LOAD THE SCENE: ' + failed, W * 1.5, H / 2, { size: 34, font: 'Paytone One', weight: 400, fill: '#ff6b6b' }); return; }
		if (!s) { art.text(ctx, 'LOADING…', W * 1.5, H / 2, { size: 40, font: 'Paytone One', weight: 400, fill: 'white' }); return; }
		art.text(ctx, featured ? 'TAP IT AGAIN TO CHANGE WHAT IT\'S DOING  ·  TAP ANYWHERE ELSE TO SEND IT BACK' : 'TAP A CHARACTER TO BRING IT TO THE FRONT  ·  TAP ANYWHERE ELSE TO ' + (spinning ? 'STOP' : 'START') + ' THE TURNTABLES', W * 1.5, 940, { size: 30, font: 'Paytone One', weight: 400, fill: 'rgba(255,255,255,0.8)' });
		for (const c of chars) {
			for (let w = 0; w < 3; w++) {
				tmp.copy(c.holder.position).setY(0.05);
				const p = toScreen(tmp, cams[w], w * W, 0, W, H);
				if (!p || !p.inside) continue;
				art.text(ctx, c.name, p.x, p.y + 40, { size: 40, font: 'Paytone One', weight: 400, fill: 'white', outline: 'rgba(0,0,0,0.5)', outlineWidth: 5 });
				if (c.from) art.text(ctx, c.from, p.x, p.y + 80, { size: 24, font: 'Paytone One', weight: 400, fill: 'rgba(255,255,255,0.65)' });
				art.roundRect(ctx, p.x - 90, p.y + 100, 180, 44, 22, { fill: 'rgba(90,209,255,0.25)', stroke: '#5ad1ff', lineWidth: 3 });
				art.text(ctx, c.modes[c.mode].toUpperCase(), p.x, p.y + 123, { size: 26, font: 'Paytone One', weight: 400, fill: '#bfefff' });
			}
		}
	};

	self.state = () => ({ loaded: !!s, failed, spinning, modes: chars.map((c) => c.name + ': ' + c.modes[c.mode]) });
	self.test = { tap(x, y) { tap({ x, y }); } };

	self.fini = function () {
		gone = true;
		unlisten();
		if (s) s.dispose();
		post.dispose();
		renderer.dispose();
		renderer.forceContextLoss();
	};
});
