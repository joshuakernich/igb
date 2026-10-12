/*
 * Tug of War: the 3D models. A dark warehouse hall with two raised steel
 * platforms facing each other across a drop, the rope between them, and a
 * side-on deck for each team's own wall. The contestants, guards and splats
 * come from Red Light Green Light. Units are metres, y is up, the rope runs
 * along x.
 */
import * as THREE from '../../lib/three/three.module.min.js';
export { buildContestant, buildGuard, buildSplat, PINK } from '../../shared/squid-game/models.js';

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8, metalness: 0 }, opts));
const flat = (color, opts = {}) => new THREE.MeshBasicMaterial(Object.assign({ color }, opts));

function mesh(geometry, material, shadows = true) {
	const m = new THREE.Mesh(geometry, material);
	m.castShadow = shadows;
	m.receiveShadow = shadows;
	return m;
}

function canvasTexture(w, h, paint) {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	paint(c.getContext('2d'), w, h);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 4;
	return t;
}

// Speckled concrete.
function concrete(base, size = 512) {
	return canvasTexture(size, size, (ctx, w, h) => {
		ctx.fillStyle = base;
		ctx.fillRect(0, 0, w, h);
		for (let i = 0; i < 6000; i++) {
			ctx.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${0.05 + Math.random() * 0.12})` : `rgba(255,255,255,${0.02 + Math.random() * 0.05})`;
			const s = 1 + Math.random() * 3;
			ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
		}
		ctx.strokeStyle = 'rgba(0,0,0,0.35)';
		ctx.lineWidth = 3;
		ctx.strokeRect(0, 0, w, h);
	});
}

// Riveted steel plate.
function steel(base) {
	const tex = canvasTexture(256, 256, (ctx, w, h) => {
		ctx.fillStyle = base;
		ctx.fillRect(0, 0, w, h);
		const g = ctx.createLinearGradient(0, 0, 0, h);
		g.addColorStop(0, 'rgba(255,255,255,0.06)');
		g.addColorStop(1, 'rgba(0,0,0,0.2)');
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, w, h);
		ctx.strokeStyle = 'rgba(0,0,0,0.5)';
		ctx.lineWidth = 4;
		ctx.strokeRect(2, 2, w - 4, h - 4);
		ctx.fillStyle = 'rgba(255,255,255,0.18)';
		for (const x of [14, w - 14]) for (let y = 14; y < h; y += 40) {
			ctx.beginPath();
			ctx.arc(x, y, 4, 0, Math.PI * 2);
			ctx.fill();
		}
	});
	tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
	return tex;
}

// Yellow and black hazard stripes.
function hazard() {
	const tex = canvasTexture(256, 64, (ctx, w, h) => {
		ctx.fillStyle = '#f2c230';
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = '#15151a';
		for (let x = -h; x < w + h; x += 64) {
			ctx.beginPath();
			ctx.moveTo(x, h);
			ctx.lineTo(x + 32, h);
			ctx.lineTo(x + 32 + h, 0);
			ctx.lineTo(x + h, 0);
			ctx.closePath();
			ctx.fill();
		}
	});
	tex.wrapS = THREE.RepeatWrapping;
	return tex;
}

// The far wall of the warehouse: dark panels, girders and a row of high
// windows with a cold blue night behind them.
function hallWallTexture() {
	const tex = canvasTexture(1024, 512, (ctx, w, h) => {
		ctx.fillStyle = '#1b1a22';
		ctx.fillRect(0, 0, w, h);
		ctx.strokeStyle = 'rgba(0,0,0,0.5)';
		ctx.lineWidth = 4;
		for (let x = 0; x < w; x += 64) {
			ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
		}
		ctx.fillStyle = 'rgba(255,255,255,0.03)';
		for (let x = 0; x < w; x += 64) ctx.fillRect(x + 4, 0, 8, h);
		// windows
		for (let x = 40; x < w; x += 256) {
			ctx.fillStyle = '#0d0d12';
			ctx.fillRect(x - 6, 34, 188, 120);
			for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
				const g = ctx.createLinearGradient(0, 40, 0, 150);
				g.addColorStop(0, '#2c4a78');
				g.addColorStop(1, '#14223d');
				ctx.fillStyle = g;
				ctx.fillRect(x + i * 60, 40 + j * 56, 52, 50);
			}
		}
		// a girder
		ctx.fillStyle = '#2a2833';
		ctx.fillRect(0, 186, w, 26);
		ctx.strokeStyle = '#34313f';
		ctx.lineWidth = 6;
		for (let x = 0; x < w; x += 52) {
			ctx.beginPath(); ctx.moveTo(x, 186); ctx.lineTo(x + 26, 212); ctx.lineTo(x + 52, 186); ctx.stroke();
		}
		// grime toward the floor
		const g = ctx.createLinearGradient(0, h * 0.5, 0, h);
		g.addColorStop(0, 'rgba(0,0,0,0)');
		g.addColorStop(1, 'rgba(0,0,0,0.55)');
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, w, h);
	});
	tex.wrapS = THREE.RepeatWrapping;
	return tex;
}

// A rope's twisted strands, as diagonal stripes; scroll it with offset.x.
function ropeTexture() {
	const tex = canvasTexture(128, 32, (ctx, w, h) => {
		ctx.fillStyle = '#c9a46a';
		ctx.fillRect(0, 0, w, h);
		ctx.strokeStyle = '#8a6a3c';
		ctx.lineWidth = 9;
		for (let x = -h; x < w + h; x += 21) {
			ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + h, 0); ctx.stroke();
		}
		ctx.strokeStyle = 'rgba(255,240,200,0.35)';
		ctx.lineWidth = 3;
		for (let x = -h + 6; x < w + h; x += 21) {
			ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + h, 0); ctx.stroke();
		}
	});
	tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
	return tex;
}

// The thick rope, `length` long along x, and a red ribbon tied at its middle.
export function buildRope(length, radius = 0.075) {
	const group = new THREE.Group();
	const tex = ropeTexture();
	tex.repeat.set(length / 0.45, 1);
	const rope = mesh(new THREE.CylinderGeometry(radius, radius, length, 14, 1, true), mat(0xffffff, { map: tex, roughness: 0.95 }));
	rope.rotation.z = Math.PI / 2;
	group.add(rope);
	const ribbon = new THREE.Group();
	const knot = mesh(new THREE.CylinderGeometry(radius * 1.5, radius * 1.5, 0.22, 14), mat(0xe0283c, { roughness: 0.6 }));
	knot.rotation.z = Math.PI / 2;
	ribbon.add(knot);
	for (const s of [-1, 1]) {
		const tail = mesh(new THREE.BoxGeometry(0.12, 0.6, 0.02), mat(0xe0283c, { roughness: 0.6 }));
		tail.position.set(s * 0.07, -0.32, 0);
		tail.rotation.z = s * 0.25;
		ribbon.add(tail);
	}
	group.add(ribbon);
	return { group, tex, ribbon };
}

// A beam of light from a lamp high up, as a faint additive cone.
function beam(top, bottom, radius, colour = 0xfff3d6, opacity = 0.09) {
	const h = top.y - bottom.y;
	const cone = new THREE.Mesh(
		new THREE.CylinderGeometry(0.15, radius, h, 32, 1, true),
		new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
	);
	cone.position.set((top.x + bottom.x) / 2, (top.y + bottom.y) / 2, (top.z + bottom.z) / 2);
	const lamp = mesh(new THREE.CylinderGeometry(0.22, 0.35, 0.3, 16), mat(0x2a2a30, { metalness: 0.6, roughness: 0.4 }), false);
	lamp.position.copy(top);
	const bulb = mesh(new THREE.CircleGeometry(0.3, 16), flat(0xfff6dc), false);
	bulb.rotation.x = Math.PI / 2;
	bulb.position.set(top.x, top.y - 0.16, top.z);
	const g = new THREE.Group();
	g.add(cone, lamp, bulb);
	return g;
}

// A spotlight that casts shadows, from `from` onto `to`.
function spot(from, to, intensity, shadows) {
	const s = new THREE.SpotLight(0xfff0dc, intensity, 40, 0.5, 0.45, 2);
	s.position.copy(from);
	s.target.position.copy(to);
	if (shadows) {
		s.castShadow = true;
		s.shadow.mapSize.set(1024, 1024);
		s.shadow.bias = -0.0008;
	}
	return [s, s.target];
}

/* ---------- the main hall: the front wall's view ---------- */

// Two platforms `drop` high either side of a gap 2 * `gap` wide, running out
// past +-`reach`. The hall floor (the bottom of the drop) is at y = -drop and
// the platforms' tops at y = 0. `mark`: the white lines the ribbon must reach.
export function buildHall({ gap, drop, reach, mark, depth }) {
	const group = new THREE.Group();
	const D = depth;

	const floorTex = concrete('#26252c');
	floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
	floorTex.repeat.set(8, 4);
	const floor = mesh(new THREE.PlaneGeometry(reach * 2 + 20, 20), mat(0xffffff, { map: floorTex, roughness: 0.95 }), false);
	floor.rotation.x = -Math.PI / 2;
	floor.position.y = -drop;
	floor.receiveShadow = true;
	group.add(floor);

	const wallTex = hallWallTexture();
	wallTex.repeat.set(3, 1);
	const wall = mesh(new THREE.PlaneGeometry(reach * 2 + 20, 12), mat(0xffffff, { map: wallTex, roughness: 1 }), false);
	wall.position.set(0, -drop + 6, -5.5);
	wall.receiveShadow = true;
	group.add(wall);

	// the platforms: steel towers with a hazard edge facing the gap
	const sideTex = steel('#3a3944');
	const topTex = steel('#4a4752');
	const hz = hazard();
	for (const s of [-1, 1]) {
		const w = reach + 3 - gap;
		const sideMat = mat(0xffffff, { map: sideTex.clone(), metalness: 0.4, roughness: 0.6 });
		sideMat.map.repeat.set(w / 1.2, drop / 1.2);
		sideMat.map.needsUpdate = true;
		const topMat = mat(0xffffff, { map: topTex.clone(), metalness: 0.3, roughness: 0.7 });
		topMat.map.repeat.set(w / 1.2, D / 1.2);
		topMat.map.needsUpdate = true;
		const tower = mesh(new THREE.BoxGeometry(w, drop, D), [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
		tower.position.set(s * (gap + w / 2), -drop / 2, 0);
		group.add(tower);

		// the hazard strip along the edge, on top and down the face
		const stripTex = hz.clone();
		stripTex.repeat.set(D / 0.6, 1);
		stripTex.needsUpdate = true;
		const strip = mesh(new THREE.PlaneGeometry(D, 0.32), flat(0xffffff, { map: stripTex }), false);
		strip.rotation.x = -Math.PI / 2;
		strip.rotation.z = Math.PI / 2;
		strip.position.set(s * (gap + 0.16), 0.006, 0);
		group.add(strip);
		const faceTex = hz.clone();
		faceTex.repeat.set(w / 0.6, 1);
		faceTex.needsUpdate = true;
		const lip = mesh(new THREE.PlaneGeometry(w, 0.22), flat(0xffffff, { map: faceTex }), false);
		lip.position.set(s * (gap + w / 2), -0.11, D / 2 + 0.005);
		group.add(lip);

		// the line the ribbon has to reach
		const line = mesh(new THREE.PlaneGeometry(0.12, D), flat(0xf4f4f4), false);
		line.rotation.x = -Math.PI / 2;
		line.position.set(s * mark, 0.008, 0);
		group.add(line);

		// a railing along the back of each platform
		const railMat = mat(0x55525e, { metalness: 0.6, roughness: 0.4 });
		const rail = mesh(new THREE.BoxGeometry(w, 0.06, 0.06), railMat, false);
		rail.position.set(s * (gap + w / 2), 1.05, -D / 2 + 0.1);
		group.add(rail);
		for (let x = gap + 0.4; x < reach + 3; x += 1.4) {
			const post = mesh(new THREE.BoxGeometry(0.06, 1.05, 0.06), railMat, false);
			post.position.set(s * x, 0.52, -D / 2 + 0.1);
			group.add(post);
		}

		// overhead lamps over each platform
		group.add(beam(new THREE.Vector3(s * (gap + 2.4), 7, 0.4), new THREE.Vector3(s * (gap + 2.4), 0, 0.4), 2.1));
		const [light, target] = spot(new THREE.Vector3(s * (gap + 2.4), 7, 2), new THREE.Vector3(s * (gap + 2.4), 0, 0), 260, true);
		group.add(light, target);
	}

	// the catwalk behind the gap, where the guards stand
	const walkMat = mat(0x2e2c36, { metalness: 0.5, roughness: 0.5 });
	const walk = mesh(new THREE.BoxGeometry(gap * 2 + 1.6, 0.14, 1.0), walkMat);
	walk.position.set(0, -0.07, -D / 2 - 0.6);
	group.add(walk);
	const walkRail = mesh(new THREE.BoxGeometry(gap * 2 + 1.6, 0.05, 0.05), mat(0x6a6676, { metalness: 0.6 }), false);
	walkRail.position.set(0, 1.0, -D / 2 - 0.15);
	group.add(walkRail);

	// the centre marker: a plumb line over the middle of the gap
	const plumb = mesh(new THREE.CylinderGeometry(0.02, 0.02, 4.5, 6), flat(0xdedede), false);
	plumb.position.set(0, 4.2, -0.3);
	group.add(plumb);
	const tip = mesh(new THREE.ConeGeometry(0.22, 0.44, 3), flat(0xe0283c), false);
	tip.rotation.x = Math.PI;
	tip.position.set(0, 1.85, -0.3);
	group.add(tip);

	// a red glow down in the drop
	const glow = new THREE.PointLight(0xff3040, 30, 8, 1.6);
	glow.position.set(0, -drop + 1, 0.5);
	group.add(glow);

	return { group };
}

/* ---------- a team's deck: the side walls' view ---------- */

// The deck seen side on, with its edge (and the drop) toward x = dir * edge.
// The rope runs along x off the edge.
export function buildDeck({ dir, edge, drop, depth }) {
	const group = new THREE.Group();
	const far = 14;

	const floorTex = concrete('#1d1c22');
	floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
	floorTex.repeat.set(8, 4);
	const floor = mesh(new THREE.PlaneGeometry(60, 20), mat(0xffffff, { map: floorTex }), false);
	floor.rotation.x = -Math.PI / 2;
	floor.position.y = -drop;
	group.add(floor);

	const wallTex = hallWallTexture();
	wallTex.repeat.set(2, 1);
	const wall = mesh(new THREE.PlaneGeometry(60, 14), mat(0xffffff, { map: wallTex, roughness: 1 }), false);
	wall.position.set(0, -drop + 7, -4.5);
	group.add(wall);

	const len = far + edge;
	const topTex = steel('#4a4752');
	topTex.repeat.set(len / 1.2, depth / 1.2);
	const sideTex = steel('#3a3944');
	sideTex.repeat.set(len / 1.2, drop / 1.2);
	const sideMat = mat(0xffffff, { map: sideTex, metalness: 0.4, roughness: 0.6 });
	const deck = mesh(new THREE.BoxGeometry(len, drop, depth), [sideMat, sideMat, mat(0xffffff, { map: topTex, metalness: 0.3, roughness: 0.7 }), sideMat, sideMat, sideMat]);
	deck.position.set(dir * (edge - len / 2), -drop / 2, 0);
	group.add(deck);

	const hz = hazard();
	const strip = mesh(new THREE.PlaneGeometry(depth, 0.32), flat(0xffffff, { map: (() => { const t = hz.clone(); t.repeat.set(depth / 0.6, 1); t.needsUpdate = true; return t; })() }), false);
	strip.rotation.x = -Math.PI / 2;
	strip.rotation.z = Math.PI / 2;
	strip.position.set(dir * (edge - 0.16), 0.006, 0);
	group.add(strip);
	const lipTex = hz.clone();
	lipTex.repeat.set(len / 0.6, 1);
	lipTex.needsUpdate = true;
	const lip = mesh(new THREE.PlaneGeometry(len, 0.22), flat(0xffffff, { map: lipTex }), false);
	lip.position.set(dir * (edge - len / 2), -0.11, depth / 2 + 0.005);
	group.add(lip);

	for (const x of [-3.2, 1.4]) {
		const lx = dir * x;
		group.add(beam(new THREE.Vector3(lx, 8, -0.2), new THREE.Vector3(lx, 0, -0.2), 2.3));
		const [light, target] = spot(new THREE.Vector3(lx, 8, 2.2), new THREE.Vector3(lx, 0, 0), 300, x > 0);
		group.add(light, target);
	}

	return { group };
}

/* ---------- lights common to both ---------- */

export function addAmbience(scene) {
	scene.add(new THREE.HemisphereLight(0x8b8fb8, 0x18151c, 0.9));
	const fill = new THREE.DirectionalLight(0xb8c4ff, 0.5);
	fill.position.set(-3, 6, 8);
	scene.add(fill);
}
