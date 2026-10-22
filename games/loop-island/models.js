/*
 * Loop Island: the models. The runners (a spiky little speedster in each
 * player's colour, glossy as a toy), gold rings, spiked barriers and mines,
 * boost pads, the road's textures, and the islands with their palms.
 */
import * as THREE from '../../lib/three/three.module.min.js';

const TAU = Math.PI * 2;

function canvas(w, h, paint) {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	paint(c.getContext('2d'), w, h);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

/* ---------- materials ---------- */

export function glossy(color, extra = {}) {
	return new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.2 }, extra));
}
export const chrome = () => new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08 });
export const gold = () => new THREE.MeshStandardMaterial({ color: 0xffc23a, metalness: 1, roughness: 0.14, emissive: 0x9a5a00, emissiveIntensity: 1.1 });   // (a warm inner glow; its glints bloom)

/* ---------- the road ---------- */

// The road's top: a glossy blue deck, white edge lines, dashed lane lines
// and chevrons pointing the way, 16 m to a repeat.
export function roadTexture(anisotropy) {
	const t = canvas(512, 1024, function (g, w, h) {
		const grad = g.createLinearGradient(0, 0, w, 0);
		grad.addColorStop(0, '#1f5fd6');
		grad.addColorStop(0.5, '#2f7cf0');
		grad.addColorStop(1, '#1f5fd6');
		g.fillStyle = grad;
		g.fillRect(0, 0, w, h);
		// fine brushed lines
		g.globalAlpha = 0.08;
		for (let i = 0; i < 160; i++) {
			g.fillStyle = i % 2 ? '#ffffff' : '#0a2a6a';
			g.fillRect(Math.random() * w, 0, 1 + Math.random() * 2, h);
		}
		g.globalAlpha = 1;
		// edge lines
		g.fillStyle = '#ffffff';
		g.fillRect(10, 0, 14, h);
		g.fillRect(w - 24, 0, 14, h);
		g.fillStyle = '#ffd23a';
		g.fillRect(30, 0, 6, h);
		g.fillRect(w - 36, 0, 6, h);
		// dashed lane lines, a third and two thirds across
		g.fillStyle = 'rgba(255,255,255,0.9)';
		for (const x of [w / 3, w * 2 / 3]) for (let y = 0; y < h; y += 256) g.fillRect(x - 5, y, 10, 150);
		// chevrons up the middle of each lane
		g.fillStyle = 'rgba(255,255,255,0.16)';
		for (const cx of [w / 6, w / 2, w * 5 / 6]) {
			for (let y = 64; y < h; y += 512) {
				g.beginPath();
				g.moveTo(cx - 50, y + 90);
				g.lineTo(cx, y);
				g.lineTo(cx + 50, y + 90);
				g.lineTo(cx + 50, y + 130);
				g.lineTo(cx, y + 40);
				g.lineTo(cx - 50, y + 130);
				g.fill();
			}
		}
	});
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.anisotropy = anisotropy;
	return t;
}

// The road's sides and underside: a bold orange and cream check.
export function checkTexture(anisotropy) {
	const t = canvas(128, 128, function (g) {
		for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
			g.fillStyle = (x + y) % 2 ? '#ff8a1c' : '#ffd36b';
			g.fillRect(x * 64, y * 64, 64, 64);
		}
	});
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.anisotropy = anisotropy;
	return t;
}

// A boost pad: bright chevrons, scrolled along by the game.
export function boostTexture() {
	const t = canvas(128, 256, function (g, w, h) {
		g.fillStyle = 'rgba(20,10,60,0.55)';
		g.fillRect(0, 0, w, h);
		for (let y = 0; y < h; y += 64) {
			g.fillStyle = y % 128 ? '#ffe14a' : '#ff6a2b';
			g.beginPath();
			g.moveTo(10, y + 56);
			g.lineTo(w / 2, y + 10);
			g.lineTo(w - 10, y + 56);
			g.lineTo(w - 10, y + 36);
			g.lineTo(w / 2, y - 10);
			g.lineTo(10, y + 36);
			g.fill();
		}
		g.strokeStyle = '#ffffff';
		g.lineWidth = 6;
		g.strokeRect(3, 3, w - 6, h - 6);
	});
	t.wrapT = THREE.RepeatWrapping;
	return t;
}

/* ---------- a runner ---------- */

// A glossy, spiky little speedster in the player's colour: big head, swept
// back quills, wide eyes, white gloves, chunky trainers. Running, its legs
// whirl into a blur; boosting, it curls up into a spinning spiked ball.
export function buildRunner(colour) {
	const root = new THREE.Group();     // placed on the track
	const lean = new THREE.Group();     // leans and tumbles
	root.add(lean);

	const skin = glossy(colour);
	const tan = glossy(0xf6d2a2, { clearcoat: 0.6 });
	const white = glossy(0xffffff, { clearcoat: 0.8 });
	const black = glossy(0x101018, { roughness: 0.2 });
	const strap = glossy(0xffc23a, { metalness: 0.5, roughness: 0.25 });

	const body = new THREE.Group();
	body.position.y = 0.95;
	lean.add(body);

	const torso = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), skin);
	torso.scale.set(1, 1.1, 0.95);
	body.add(torso);
	const belly = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), tan);
	belly.position.set(0, -0.02, -0.14);
	belly.scale.set(0.9, 1.05, 0.6);
	body.add(belly);

	// the head
	const head = new THREE.Group();
	head.position.set(0, 0.62, -0.04);
	body.add(head);
	const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 20), skin);
	head.add(skull);
	// the quills: cones raked back and down
	const quill = new THREE.ConeGeometry(0.17, 0.75, 12);
	quill.translate(0, 0.375, 0);
	const quills = [[0, 0.22, 1.9, 0], [0.24, 0.08, 1.95, -0.5], [-0.24, 0.08, 1.95, 0.5], [0.16, -0.16, 2.2, -0.4], [-0.16, -0.16, 2.2, 0.4], [0, -0.05, 2.1, 0]];
	for (const [x, y, rx, rz] of quills) {
		const q = new THREE.Mesh(quill, skin);
		q.position.set(x, y, 0.18);
		q.rotation.set(rx, 0, rz);
		head.add(q);
	}
	// the muzzle, the nose, the ears
	const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), tan);
	muzzle.position.set(0, -0.14, -0.33);
	muzzle.scale.set(1.2, 0.8, 0.9);
	head.add(muzzle);
	const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), black);
	nose.position.set(0, -0.06, -0.52);
	head.add(nose);
	for (const side of [-1, 1]) {
		const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 10), skin);
		ear.position.set(side * 0.25, 0.36, 0.05);
		ear.rotation.z = -side * 0.35;
		head.add(ear);
		// the eyes: big white ovals, dark pupils looking ahead
		const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), white);
		eye.position.set(side * 0.13, 0.08, -0.33);
		eye.scale.set(0.8, 1.25, 0.6);
		head.add(eye);
		const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), black);
		pupil.position.set(side * 0.11, 0.07, -0.41);
		head.add(pupil);
	}

	// arms swept back, white gloves
	const arms = [];
	for (const side of [-1, 1]) {
		const shoulder = new THREE.Group();
		shoulder.position.set(side * 0.3, 0.18, 0);
		body.add(shoulder);
		const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.42, 8), tan);
		arm.position.y = -0.21;
		shoulder.add(arm);
		const glove = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), white);
		glove.position.y = -0.45;
		shoulder.add(glove);
		shoulder.rotation.set(-1.1, 0, side * 0.35);
		arms.push(shoulder);
	}

	// legs and trainers
	const legs = [];
	for (const side of [-1, 1]) {
		const hip = new THREE.Group();
		hip.position.set(side * 0.14, -0.28, 0);
		body.add(hip);
		const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 8), skin);
		leg.position.y = -0.21;
		hip.add(leg);
		const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.2, 6, 12), white);
		shoe.rotation.x = Math.PI / 2;
		shoe.position.set(0, -0.46, -0.08);
		hip.add(shoe);
		const band = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.03, 8, 16), strap);
		band.position.set(0, -0.46, -0.06);
		hip.add(band);
		legs.push(hip);
	}

	// the leg blur: a whirl of colour where the legs would be
	const whirlTex = canvas(128, 128, function (g, w, h) {
		g.translate(w / 2, h / 2);
		for (let i = 0; i < 3; i++) {
			g.rotate(TAU / 3);
			const grad = g.createLinearGradient(-60, 0, 60, 0);
			grad.addColorStop(0, 'rgba(255,255,255,0)');
			grad.addColorStop(1, 'rgba(255,255,255,0.9)');
			g.strokeStyle = grad;
			g.lineWidth = 16;
			g.beginPath();
			g.arc(0, 0, 44, 0, Math.PI * 0.9);
			g.stroke();
		}
	});
	const whirlMat = new THREE.MeshBasicMaterial({ map: whirlTex, color: colour, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0 });
	const whirl = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), whirlMat);
	whirl.rotation.y = Math.PI / 2;
	whirl.position.set(0, 0.42, 0);
	lean.add(whirl);

	// the ball: curled up and spinning
	const ball = new THREE.Group();
	ball.position.y = 0.62;
	ball.visible = false;
	lean.add(ball);
	const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 20), skin);
	ball.add(core);
	const spike = new THREE.ConeGeometry(0.14, 0.42, 10);
	spike.translate(0, 0.62, 0);
	for (let i = 0; i < 14; i++) {
		const sp = new THREE.Mesh(spike, skin);
		const a = i / 14 * TAU;
		sp.rotation.set(a, 0, (i % 2 ? 0.35 : -0.35));
		ball.add(sp);
	}
	const swirlMat = new THREE.MeshBasicMaterial({ map: whirlTex, color: new THREE.Color(1.8, 1.8, 1.8), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.8, blending: THREE.AdditiveBlending });
	const swirl = new THREE.Mesh(new THREE.CircleGeometry(0.95, 32), swirlMat);
	swirl.rotation.y = Math.PI / 2;
	ball.add(swirl);

	root.traverse((o) => { if (o.isMesh && o !== whirl && o !== swirl) o.castShadow = true; });

	let cycle = 0;
	// Pose for this frame: dt, how fast (0-1), curled up or not.
	function pose(dt, pace, curled) {
		cycle += dt * (6 + pace * 30);
		body.visible = !curled;
		ball.visible = curled;
		whirl.visible = !curled;
		if (curled) {
			ball.rotation.x -= dt * 40;
			return;
		}
		const stride = Math.max(0.15, 1 - pace);   // (at full tilt the legs are just a blur)
		legs[0].rotation.x = Math.sin(cycle) * 1.1 * stride;
		legs[1].rotation.x = -Math.sin(cycle) * 1.1 * stride;
		whirlMat.opacity = Math.min(0.85, pace * 1.1);
		whirl.rotation.x = -cycle;
		body.rotation.x = -0.32 * pace - 0.05;   // lean into it
		body.position.y = 0.95 + Math.abs(Math.sin(cycle)) * 0.06 * stride;
		for (let i = 0; i < 2; i++) arms[i].rotation.x = pace > 0.35 ? -1.25 + Math.sin(cycle * 2 + i) * 0.05 : Math.sin(cycle + i * Math.PI) * 0.9;
		head.rotation.x = 0.25 * pace;
	}

	// Standing at the start, raring to go: bouncing on the spot.
	function idle(time) {
		body.visible = true;
		ball.visible = false;
		whirl.visible = false;
		body.rotation.x = -0.12;
		body.position.y = 0.95 + Math.abs(Math.sin(time * 5)) * 0.05;
		legs[0].rotation.x = 0.1;
		legs[1].rotation.x = -0.1;
		arms[0].rotation.x = -0.4 + Math.sin(time * 5) * 0.1;
		arms[1].rotation.x = -0.4 - Math.sin(time * 5) * 0.1;
		head.rotation.x = 0;
	}

	return { root, lean, pose, idle };
}

/* ---------- things on the track ---------- */

// (geometry shared between many meshes is marked, so the game never disposes it)
const shared = (g) => { g.userData.shared = true; return g; };

const RING_GEO = shared(new THREE.TorusGeometry(0.55, 0.11, 14, 36));
let ringMat = null;
export function buildRing() {
	ringMat = ringMat || gold();
	const m = new THREE.Mesh(RING_GEO, ringMat);
	m.castShadow = true;
	return m;
}

// A spiked barrier across one lane: a red and white striped bar on two
// chrome posts, a row of steel spikes along the top, a warning light.
let barrierParts = null;
export function buildBarrier() {
	if (!barrierParts) {
		const stripes = canvas(256, 32, function (g, w, h) {
			for (let x = -h; x < w; x += 32) {
				g.fillStyle = (x / 32) % 2 ? '#ffffff' : '#ff2d4a';
				g.beginPath();
				g.moveTo(x, h);
				g.lineTo(x + 32, h);
				g.lineTo(x + 32 + h, 0);
				g.lineTo(x + h, 0);
				g.fill();
			}
		});
		stripes.wrapS = THREE.RepeatWrapping;
		barrierParts = {
			bar: shared(new THREE.BoxGeometry(2.3, 0.55, 0.3)),
			post: shared(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 10)),
			spike: shared(new THREE.ConeGeometry(0.1, 0.38, 8)),
			lamp: shared(new THREE.SphereGeometry(0.13, 12, 8)),
			barMat: glossy(0xffffff, { map: stripes }),
			chrome: chrome(),
			lampMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3030).multiplyScalar(4) }),   // (past white: it blooms)
		};
	}
	const p = barrierParts;
	const g = new THREE.Group();
	const bar = new THREE.Mesh(p.bar, p.barMat);
	bar.position.y = 0.75;
	g.add(bar);
	for (const side of [-1, 1]) {
		const post = new THREE.Mesh(p.post, p.chrome);
		post.position.set(side * 1.05, 0.6, 0);
		g.add(post);
	}
	for (let i = 0; i < 7; i++) {
		const s = new THREE.Mesh(p.spike, p.chrome);
		s.position.set(-0.96 + i * 0.32, 1.2, 0);
		g.add(s);
	}
	const lamp = new THREE.Mesh(p.lamp, p.lampMat);
	lamp.position.set(0, 1.5, 0);
	g.add(lamp);
	g.userData.lamp = lamp;
	g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
	return g;
}

// A spiked mine hovering over a lane, glowing red at the heart.
let mineParts = null;
export function buildMine() {
	if (!mineParts) {
		mineParts = {
			core: shared(new THREE.IcosahedronGeometry(0.55, 1)),
			spike: shared(new THREE.ConeGeometry(0.12, 0.5, 8).translate(0, 0.7, 0)),
			glow: shared(new THREE.SphereGeometry(0.3, 12, 8)),
			coreMat: new THREE.MeshStandardMaterial({ color: 0x2a2a34, metalness: 0.9, roughness: 0.25 }),
			chrome: chrome(),
			glowMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a2a).multiplyScalar(4) }),
		};
	}
	const p = mineParts;
	const g = new THREE.Group();
	const spin = new THREE.Group();
	spin.position.y = 1.0;
	g.add(spin);
	spin.add(new THREE.Mesh(p.core, p.coreMat));
	const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [1, 1, 1], [-1, 1, -1], [1, -1, -1], [-1, -1, 1]];
	for (const d of dirs) {
		const s = new THREE.Mesh(p.spike, p.chrome);
		s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...d).normalize());
		spin.add(s);
	}
	const glow = new THREE.Mesh(p.glow, p.glowMat);
	glow.scale.setScalar(1.25);
	spin.add(glow);
	g.userData.spin = spin;
	g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
	return g;
}

// A boost pad lying flat in a lane.
export function buildPad(tex) {
	const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
	m.rotation.x = -Math.PI / 2;
	m.position.y = 0.03;
	const g = new THREE.Group();
	g.add(m);
	return g;
}

// A sparkle, for rings snatched up.
export function sparkleTexture() {
	return canvas(64, 64, function (g, w, h) {
		const grad = g.createRadialGradient(32, 32, 0, 32, 32, 30);
		grad.addColorStop(0, 'rgba(255,255,255,1)');
		grad.addColorStop(0.25, 'rgba(255,240,170,0.8)');
		grad.addColorStop(1, 'rgba(255,200,60,0)');
		g.fillStyle = grad;
		g.fillRect(0, 0, w, h);
		g.fillStyle = 'white';
		g.beginPath();
		g.moveTo(32, 0); g.lineTo(35, 29); g.lineTo(64, 32); g.lineTo(35, 35);
		g.lineTo(32, 64); g.lineTo(29, 35); g.lineTo(0, 32); g.lineTo(29, 29);
		g.fill();
	});
}

/* ---------- islands ---------- */

// A palm: a curving trunk and a crown of drooping fronds.
const frondGeo = (function () {
	const g = new THREE.PlaneGeometry(1.4, 6.5, 2, 10);
	g.translate(0, 3.25, 0);
	const p = g.attributes.position;
	for (let i = 0; i < p.count; i++) {
		const y = p.getY(i);
		const x = p.getX(i);
		const t = y / 6.5;
		p.setX(i, x * Math.sin(Math.PI * Math.min(1, t * 1.15)) * 1.2);
		p.setZ(i, -Math.pow(t, 2) * 3.2);     // droops
		p.setY(i, y * 0.85);
	}
	g.computeVertexNormals();
	return shared(g);
})();

let palmMats = null;
export function buildPalm(height) {
	palmMats = palmMats || {
		trunk: new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.9 }),
		frond: new THREE.MeshStandardMaterial({ color: 0x2fa84a, roughness: 0.6, side: THREE.DoubleSide }),
		frond2: new THREE.MeshStandardMaterial({ color: 0x55c94a, roughness: 0.6, side: THREE.DoubleSide }),
		nut: new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: 0.7 }),
	};
	const g = new THREE.Group();
	const bend = (Math.random() - 0.5) * 0.5 * height;
	const pts = [0, 0.33, 0.66, 1].map((t) => new THREE.Vector3(bend * t * t, height * t, bend * 0.3 * t * t));
	const curve = new THREE.CatmullRomCurve3(pts);
	const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, height * 0.035, 7), palmMats.trunk);
	g.add(trunk);
	const top = pts[3];
	const n = 8 + Math.floor(Math.random() * 3);
	for (let i = 0; i < n; i++) {
		const f = new THREE.Mesh(frondGeo, i % 2 ? palmMats.frond : palmMats.frond2);
		f.position.copy(top);
		f.rotation.order = 'YXZ';
		f.rotation.y = i / n * TAU + Math.random() * 0.3;
		f.rotation.x = -0.9 - Math.random() * 0.4;
		f.scale.setScalar(height / 11);
		g.add(f);
	}
	for (let i = 0; i < 3; i++) {
		const c = new THREE.Mesh(new THREE.SphereGeometry(height * 0.03, 8, 6), palmMats.nut);
		c.position.copy(top).add(new THREE.Vector3(Math.cos(i * 2.1) * 0.4, -0.4, Math.sin(i * 2.1) * 0.4));
		g.add(c);
	}
	g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
	return g;
}

// A lagoon of pale turquoise round an island, fading into the sea.
let lagoonTex = null;
function lagoonTexture() {
	return lagoonTex || (lagoonTex = canvas(256, 256, function (g, w) {
		const grad = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
		grad.addColorStop(0, 'rgba(120,240,225,1)');
		grad.addColorStop(0.55, 'rgba(70,215,215,0.85)');
		grad.addColorStop(0.8, 'rgba(30,170,200,0.35)');
		grad.addColorStop(1, 'rgba(20,140,190,0)');
		g.fillStyle = grad;
		g.fillRect(0, 0, w, w);
	}));
}

let islandMat = null;
// An island of radius r and peak h: a sandy shore, a green hill, palms, rocks.
export function buildIsland(r, h, palms = true) {
	islandMat = islandMat || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true });
	const g = new THREE.Group();

	const lagoon = new THREE.Mesh(new THREE.CircleGeometry(r * 1.7, 40), new THREE.MeshBasicMaterial({ map: lagoonTexture(), transparent: true, depthWrite: false, opacity: 0.9 }));
	lagoon.rotation.x = -Math.PI / 2;
	lagoon.position.y = 0.25;
	lagoon.renderOrder = 1;
	g.add(lagoon);

	// the land: a lathed profile, roughed up all round
	const prof = [[0, h], [0.25, h * 0.92], [0.5, h * 0.62], [0.72, h * 0.3], [0.84, 1.6], [0.93, 0.9], [1.0, 0.2], [1.08, -2]];
	const pts = prof.map(([x, y]) => new THREE.Vector2(x * r, y));
	const geo = new THREE.LatheGeometry(pts, 36);
	const pos = geo.attributes.position;
	const seeds = [Math.random() * TAU, Math.random() * TAU, Math.random() * TAU];
	const wobble = (a) => 1 + 0.16 * Math.sin(a * 2 + seeds[0]) + 0.08 * Math.sin(a * 5 + seeds[1]) + 0.05 * Math.sin(a * 9 + seeds[2]);
	const colors = [];
	const sand = new THREE.Color(0xf4e2a8);
	const wet = new THREE.Color(0xd8c48a);
	const grass = new THREE.Color(0x46b44c);
	const deep = new THREE.Color(0x2a8a3e);
	const rock = new THREE.Color(0x8c8a80);
	const c = new THREE.Color();
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const z = pos.getZ(i);
		const y = pos.getY(i);
		const a = Math.atan2(z, x);
		const wob = wobble(a);
		pos.setX(i, x * wob);
		pos.setZ(i, z * wob);
		pos.setY(i, y + (y > 2 ? (Math.random() - 0.5) * h * 0.08 : 0));
		if (y < 0.6) c.copy(wet);
		else if (y < 2.0) c.copy(sand);
		else if (y > h * 0.85 && h > 30) c.copy(rock);
		else c.copy(grass).lerp(deep, Math.random() * 0.5);
		colors.push(c.r, c.g, c.b);
	}
	geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
	geo.computeVertexNormals();
	const land = new THREE.Mesh(geo, islandMat);
	land.receiveShadow = true;
	g.add(land);

	if (palms) {
		const count = 2 + Math.floor(Math.random() * Math.min(7, r / 5));
		for (let i = 0; i < count; i++) {
			const a = Math.random() * TAU;
			const d = (0.8 + Math.random() * 0.08) * r * wobble(a);   // on the sandy shelf above the beach
			const p = buildPalm(7 + Math.random() * 5);
			p.position.set(Math.cos(a) * d, 1.0, Math.sin(a) * d);
			p.rotation.y = Math.random() * TAU;
			g.add(p);
		}
	}
	return g;
}
