/*
 * Backrooms: the 3D models. Everything is built from three.js primitives and
 * textures painted on canvases at load, so the game needs no asset files.
 * Units are metres, y is up, and every model faces +z (toward the viewer)
 * with its origin on the floor (or on the wall, for things hung on a wall).
 *
 * Geometry, materials and textures are cached and shared, so the floor
 * upstairs and its near-copy downstairs cost little more than one, and the
 * same props always come out looking exactly the same: anything random in a
 * model is drawn from a seeded generator.
 */
import * as THREE from '../../lib/three/three.module.min.js';

export const CEIL = 2.7;     // floor to ceiling tiles
export const TILE = 0.6;     // one ceiling tile

/* ---------- small helpers ---------- */

// A seeded random generator (mulberry32), so layouts and props repeat.
export function rng(seed) {
	let a = seed >>> 0;
	return function () {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const cache = new Map();
function cached(key, make) {
	if (!cache.has(key)) cache.set(key, make());
	return cache.get(key);
}

const B = (w, h, d) => cached(`B${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
const C = (rt, rb, h, s = 14) => cached(`C${rt}|${rb}|${h}|${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
const P = (w, h) => cached(`P${w}|${h}`, () => new THREE.PlaneGeometry(w, h));
const S = () => cached('S', () => new THREE.IcosahedronGeometry(1, 1));

// A plane whose texture repeats every `tile` metres (u) and `tileV` (v).
function tiledPlane(w, h, tile, tileV = tile) {
	return cached(`T${w}|${h}|${tile}|${tileV}`, function () {
		const g = new THREE.PlaneGeometry(w, h);
		const uv = g.attributes.uv;
		for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * h / tileV);
		return g;
	});
}

export const lam = (color) => cached(`L${color}`, () => new THREE.MeshLambertMaterial({ color }));
const basic = (color) => cached(`M${color}`, () => new THREE.MeshBasicMaterial({ color }));
function texLam(key, tex, opts) {
	return cached(`TL${key}`, () => new THREE.MeshLambertMaterial(Object.assign({ map: tex }, opts)));
}
function texBasic(key, tex, opts) {
	return cached(`TB${key}`, () => new THREE.MeshBasicMaterial(Object.assign({ map: tex }, opts)));
}

function canvasTexture(key, w, h, paint, repeat = false) {
	return cached(`X${key}`, function () {
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		paint(c.getContext('2d'), w, h);
		const t = new THREE.CanvasTexture(c);
		t.colorSpace = THREE.SRGBColorSpace;
		t.anisotropy = 8;
		if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
		return t;
	});
}

function part(g, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
	const m = new THREE.Mesh(geometry, material);
	m.position.set(x, y, z);
	m.rotation.set(rx, ry, rz);
	g.add(m);
	return m;
}

// Speckle a canvas with tiny dots of the given colours.
function speckle(c, w, h, n, colours, r, size = 2) {
	for (let i = 0; i < n; i++) {
		c.fillStyle = colours[Math.floor(r() * colours.length)];
		const s = size * (0.5 + r());
		c.fillRect(r() * w, r() * h, s, s);
	}
}

// Soft blobs, for damp patches and grime.
function blobs(c, w, h, n, rgb, alpha, rmin, rmax, r) {
	for (let i = 0; i < n; i++) {
		const x = r() * w;
		const y = r() * h;
		const rad = rmin + r() * (rmax - rmin);
		const g = c.createRadialGradient(x, y, 0, x, y, rad);
		g.addColorStop(0, `rgba(${rgb},${alpha * (0.4 + r() * 0.6)})`);
		g.addColorStop(1, `rgba(${rgb},0)`);
		c.fillStyle = g;
		c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
		// wrap round the edges, so the texture tiles without a seam
		for (const [dx, dy] of [[w, 0], [-w, 0], [0, h], [0, -h]]) {
			c.save();
			c.translate(dx, dy);
			c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
			c.restore();
		}
	}
}

/* ---------- textures ---------- */

// Yellowed wallpaper: broad pale stripes with a faint chevron and diamond
// motif, grime collecting at the skirting and old water stains from above.
// One texture tile is 1 m wide and the full wall height.
export function wallpaperTex() {
	return canvasTexture('wallpaper', 512, 1024, function (c, w, h) {
		const r = rng(7);
		c.fillStyle = '#cdb75c';
		c.fillRect(0, 0, w, h);
		for (let x = 0; x < w; x += 128) {
			c.fillStyle = 'rgba(255,238,160,0.22)';
			c.fillRect(x, 0, 64, h);
			c.fillStyle = 'rgba(110,90,30,0.16)';
			c.fillRect(x + 63, 0, 2, h);
			c.fillRect(x + 127, 0, 2, h);
		}
		c.lineWidth = 3;
		for (let y = -40; y < h + 80; y += 76) {
			for (let x = 0; x < w; x += 128) {
				// chevrons in the pale stripe
				c.strokeStyle = 'rgba(150,122,44,0.30)';
				c.beginPath();
				c.moveTo(x + 14, y + 50); c.lineTo(x + 32, y + 30); c.lineTo(x + 50, y + 50);
				c.stroke();
				// a small diamond and dots in the darker one
				const cx = x + 96;
				const cy = y + 38 + 38;
				c.strokeStyle = 'rgba(130,104,36,0.26)';
				c.beginPath();
				c.moveTo(cx, cy - 16); c.lineTo(cx + 11, cy); c.lineTo(cx, cy + 16); c.lineTo(cx - 11, cy); c.closePath();
				c.stroke();
				c.fillStyle = 'rgba(130,104,36,0.3)';
				c.fillRect(cx - 2, cy - 30, 4, 4);
			}
		}
		speckle(c, w, h, 9000, ['rgba(90,70,20,0.10)', 'rgba(255,245,190,0.10)', 'rgba(70,55,15,0.07)'], r, 2);
		blobs(c, w, h, 12, '110,88,30', 0.16, 30, 120, r);
		// grime along the bottom and yellowing toward the top
		let g = c.createLinearGradient(0, h * 0.8, 0, h);
		g.addColorStop(0, 'rgba(70,52,15,0)');
		g.addColorStop(1, 'rgba(70,52,15,0.45)');
		c.fillStyle = g;
		c.fillRect(0, h * 0.8, w, h * 0.2);
		g = c.createLinearGradient(0, 0, 0, h * 0.22);
		g.addColorStop(0, 'rgba(100,78,20,0.35)');
		g.addColorStop(1, 'rgba(100,78,20,0)');
		c.fillStyle = g;
		c.fillRect(0, 0, w, h * 0.22);
		// drips from the ceiling
		for (let i = 0; i < 5; i++) {
			const x = r() * w;
			const len = 120 + r() * 380;
			g = c.createLinearGradient(0, 0, 0, len);
			g.addColorStop(0, 'rgba(95,72,20,0.30)');
			g.addColorStop(1, 'rgba(95,72,20,0)');
			c.fillStyle = g;
			c.fillRect(x, 0, 3 + r() * 6, len);
		}
	}, true);
}

// Damp beige carpet, 2 m to a tile.
export function carpetTex() {
	return canvasTexture('carpet', 512, 512, function (c, w, h) {
		const r = rng(11);
		c.fillStyle = '#a8955a';
		c.fillRect(0, 0, w, h);
		blobs(c, w, h, 30, '80,64,25', 0.22, 40, 140, r);
		blobs(c, w, h, 20, '200,180,110', 0.12, 30, 110, r);
		speckle(c, w, h, 26000, ['rgba(70,55,20,0.22)', 'rgba(210,190,120,0.18)', 'rgba(120,100,50,0.2)'], r, 2);
	}, true);
}

// Drop ceiling: 4 x 4 tiles to a texture, each with fissured speckle, some
// with old brown water rings, in a grey-gold grid of T-bars.
export function ceilingTex() {
	return canvasTexture('ceiling', 512, 512, function (c, w, h) {
		const r = rng(5);
		const t = w / 4;
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				const v = 205 + Math.floor(r() * 16);
				c.fillStyle = `rgb(${v},${v - 8},${v - 52})`;
				c.fillRect(i * t, j * t, t, t);
			}
		}
		speckle(c, w, h, 7000, ['rgba(90,80,40,0.35)', 'rgba(120,105,60,0.25)'], r, 2);
		// water rings
		for (const [i, j] of [[1, 2], [3, 0]]) {
			const x = i * t + t * (0.3 + r() * 0.4);
			const y = j * t + t * (0.3 + r() * 0.4);
			const rad = t * (0.25 + r() * 0.2);
			const g = c.createRadialGradient(x, y, rad * 0.4, x, y, rad);
			g.addColorStop(0, 'rgba(150,115,40,0.12)');
			g.addColorStop(0.85, 'rgba(120,85,25,0.35)');
			g.addColorStop(1, 'rgba(120,85,25,0)');
			c.fillStyle = g;
			c.beginPath();
			c.arc(x, y, rad, 0, Math.PI * 2);
			c.fill();
		}
		c.fillStyle = '#8f8458';
		for (let i = 0; i <= 4; i++) {
			c.fillRect(i * t - 3, 0, 6, h);
			c.fillRect(0, i * t - 3, w, 6);
		}
		c.fillStyle = 'rgba(255,250,220,0.35)';
		for (let i = 0; i <= 4; i++) {
			c.fillRect(i * t - 3, 0, 2, h);
			c.fillRect(0, i * t - 3, w, 2);
		}
	}, true);
}

// Bare concrete, for the slab between floors.
function concreteTex() {
	return canvasTexture('concrete', 256, 256, function (c, w, h) {
		const r = rng(3);
		c.fillStyle = '#2c2a25';
		c.fillRect(0, 0, w, h);
		blobs(c, w, h, 14, '0,0,0', 0.4, 20, 60, r);
		speckle(c, w, h, 5000, ['rgba(255,250,220,0.06)', 'rgba(0,0,0,0.3)'], r, 2);
	}, true);
}

// Fabric for cubicle partitions: light and slightly woven, tinted by colour.
function fabricTex() {
	return canvasTexture('fabric', 128, 128, function (c, w, h) {
		const r = rng(9);
		c.fillStyle = '#d8d8d8';
		c.fillRect(0, 0, w, h);
		for (let y = 0; y < h; y += 2) {
			c.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`;
			c.fillRect(0, y, w, 1);
		}
		speckle(c, w, h, 1500, ['rgba(0,0,0,0.12)', 'rgba(255,255,255,0.15)'], r, 1.5);
	}, true);
}

// A damp stain: overlapping blotches with a darker tide mark at the edge.
function stainTex(seed, ceiling) {
	return canvasTexture(`stain${seed}${ceiling ? 'c' : ''}`, 256, 256, function (c, w, h) {
		const r = rng(seed * 977 + 13);
		const rgb = ceiling ? '120,85,25' : '58,44,14';
		for (let i = 0; i < 6; i++) {
			const x = w / 2 + (r() - 0.5) * w * 0.35;
			const y = h / 2 + (r() - 0.5) * h * 0.35;
			const rad = w * (0.16 + r() * 0.16);
			const g = c.createRadialGradient(x, y, 0, x, y, rad);
			g.addColorStop(0, `rgba(${rgb},0.30)`);
			g.addColorStop(0.75, `rgba(${rgb},0.42)`);
			g.addColorStop(0.92, `rgba(${rgb},0.6)`);
			g.addColorStop(1, `rgba(${rgb},0)`);
			c.fillStyle = g;
			c.beginPath();
			c.arc(x, y, rad, 0, Math.PI * 2);
			c.fill();
		}
	});
}

// The soft shadow under a piece of furniture.
function shadowTex() {
	return canvasTexture('shadow', 128, 128, function (c, w, h) {
		const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
		g.addColorStop(0, 'rgba(30,22,5,0.75)');
		g.addColorStop(0.6, 'rgba(30,22,5,0.4)');
		g.addColorStop(1, 'rgba(30,22,5,0)');
		c.fillStyle = g;
		c.fillRect(0, 0, w, h);
	});
}

// The halo round a fluorescent panel.
function glowTex() {
	return canvasTexture('glow', 128, 128, function (c, w, h) {
		const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
		g.addColorStop(0, 'rgba(255,250,215,0.7)');
		g.addColorStop(0.45, 'rgba(255,245,190,0.22)');
		g.addColorStop(1, 'rgba(255,245,190,0)');
		c.fillStyle = g;
		c.fillRect(0, 0, w, h);
	});
}

// The lit face of a panel: two tubes glowing through a ribbed diffuser.
function panelTex() {
	return canvasTexture('panel', 64, 128, function (c, w, h) {
		c.fillStyle = '#f2ecd0';
		c.fillRect(0, 0, w, h);
		const g = c.createLinearGradient(0, 0, w, 0);
		g.addColorStop(0, 'rgba(255,255,255,0)');
		g.addColorStop(0.3, 'rgba(255,255,255,1)');
		g.addColorStop(0.42, 'rgba(255,255,255,0.6)');
		g.addColorStop(0.58, 'rgba(255,255,255,0.6)');
		g.addColorStop(0.7, 'rgba(255,255,255,1)');
		g.addColorStop(1, 'rgba(255,255,255,0)');
		c.fillStyle = g;
		c.fillRect(0, 0, w, h);
		c.fillStyle = 'rgba(160,150,110,0.25)';
		for (let y = 0; y < h; y += 6) c.fillRect(0, y, w, 1);
		c.strokeStyle = '#b7ad84';
		c.lineWidth = 4;
		c.strokeRect(0, 0, w, h);
	});
}

function screenTex(on) {
	return canvasTexture(`screen${on}`, 128, 100, function (c, w, h) {
		if (on) {
			c.fillStyle = '#062012';
			c.fillRect(0, 0, w, h);
			const g = c.createRadialGradient(w / 2, h / 2, 5, w / 2, h / 2, w * 0.7);
			g.addColorStop(0, 'rgba(90,255,150,0.35)');
			g.addColorStop(1, 'rgba(90,255,150,0)');
			c.fillStyle = g;
			c.fillRect(0, 0, w, h);
			c.fillStyle = '#7dffae';
			c.font = 'bold 13px monospace';
			['C:\\>DIR', 'NO FILES', 'C:\\>EXIT', 'BAD COMMAND', 'C:\\>_'].forEach((l, i) => c.fillText(l, 8, 18 + i * 17));
		} else {
			const g = c.createLinearGradient(0, 0, w, h);
			g.addColorStop(0, '#2c312b');
			g.addColorStop(0.45, '#1a1d19');
			g.addColorStop(1, '#262a25');
			c.fillStyle = g;
			c.fillRect(0, 0, w, h);
			c.fillStyle = 'rgba(255,255,230,0.07)';
			c.beginPath();
			c.moveTo(10, 0); c.lineTo(50, 0); c.lineTo(20, h); c.lineTo(0, h); c.closePath();
			c.fill();
		}
	});
}

function clockTex() {
	return canvasTexture('clock', 256, 256, function (c, w, h) {
		c.fillStyle = '#efe9d4';
		c.beginPath();
		c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
		c.fill();
		c.fillStyle = '#222';
		c.textAlign = 'center';
		c.textBaseline = 'middle';
		c.font = 'bold 30px sans-serif';
		for (let i = 0; i < 60; i++) {
			const a = i / 60 * Math.PI * 2;
			const long = i % 5 === 0;
			c.save();
			c.translate(w / 2, h / 2);
			c.rotate(a);
			c.fillRect(-(long ? 3 : 1), -w / 2 + 8, long ? 6 : 2, long ? 18 : 8);
			c.restore();
			if (long) {
				const n = i / 5 || 12;
				c.fillText(String(n), w / 2 + Math.sin(a) * 88, h / 2 - Math.cos(a) * 88);
			}
		}
	});
}

function exitTex() {
	return canvasTexture('exit', 128, 64, function (c, w, h) {
		c.fillStyle = '#0d1f12';
		c.fillRect(0, 0, w, h);
		c.fillStyle = '#56ff8a';
		c.font = 'bold 44px sans-serif';
		c.textAlign = 'center';
		c.textBaseline = 'middle';
		c.fillText('EXIT', w / 2, h / 2 + 2);
	});
}

function ventTex() {
	return canvasTexture('vent', 128, 64, function (c, w, h) {
		c.fillStyle = '#8c8a7c';
		c.fillRect(0, 0, w, h);
		for (let y = 6; y < h - 4; y += 7) {
			c.fillStyle = '#1a1914';
			c.fillRect(6, y, w - 12, 4);
			c.fillStyle = '#b8b4a0';
			c.fillRect(6, y + 4, w - 12, 1);
		}
	});
}

function wetSignTex() {
	return canvasTexture('wetsign', 128, 192, function (c, w, h) {
		c.fillStyle = '#e7c320';
		c.fillRect(0, 0, w, h);
		c.fillStyle = '#1b1b1b';
		c.textAlign = 'center';
		c.font = 'bold 22px sans-serif';
		c.fillText('CAUTION', w / 2, 34);
		c.beginPath();
		c.moveTo(w / 2, 56); c.lineTo(w / 2 + 34, 116); c.lineTo(w / 2 - 34, 116); c.closePath();
		c.fill();
		c.fillStyle = '#e7c320';
		c.font = 'bold 40px sans-serif';
		c.fillText('!', w / 2, 110);
		c.fillStyle = '#1b1b1b';
		c.font = 'bold 20px sans-serif';
		c.fillText('WET', w / 2, 146);
		c.fillText('FLOOR', w / 2, 170);
	});
}

/* ---------- posters and notices ---------- */

// Poster variants. Families share a layout, so a later level can swap a
// poster for its quieter sibling (the same picture with one thing changed).
export const POSTERS = {
	'sunset': { family: 'sunset', w: 0.75, h: 1.0 },
	'sunset-green': { family: 'sunset', w: 0.75, h: 1.0 },
	'peak': { family: 'peak', w: 0.75, h: 1.0 },
	'peak-two': { family: 'peak', w: 0.75, h: 1.0 },
	'light': { family: 'light', w: 0.75, h: 1.0 },
	'light-dark': { family: 'light', w: 0.75, h: 1.0 },
	'tree': { family: 'tree', w: 0.75, h: 1.0 },
	'tree-bare': { family: 'tree', w: 0.75, h: 1.0 },
	'map': { family: 'map', w: 0.6, h: 0.8 },
	'map-moved': { family: 'map', w: 0.6, h: 0.8 },
	'notice': { family: 'notice', w: 0.5, h: 0.7 },
	'notice-red': { family: 'notice', w: 0.5, h: 0.7 },
	'board': { family: 'board', w: 1.5, h: 0.9 },
	'board-wiped': { family: 'board', w: 1.5, h: 0.9 },
};

function posterTex(variant) {
	const v = POSTERS[variant];
	const pw = 256;
	const ph = Math.round(pw * v.h / v.w);
	return canvasTexture(`poster-${variant}`, pw, ph, function (c, w, h) {
		const caption = (text, colour = '#f4ecd0') => {
			c.fillStyle = '#16120a';
			c.fillRect(0, h * 0.8, w, h * 0.2);
			c.fillStyle = colour;
			c.font = `bold ${Math.round(w * 0.12)}px serif`;
			c.textAlign = 'center';
			c.textBaseline = 'middle';
			c.fillText(text, w / 2, h * 0.9);
		};
		let g;
		switch (v.family) {
		case 'sunset': {
			g = c.createLinearGradient(0, 0, 0, h * 0.8);
			if (variant === 'sunset') { g.addColorStop(0, '#2e2a6b'); g.addColorStop(0.6, '#e8743a'); g.addColorStop(1, '#f5c26b'); }
			else { g.addColorStop(0, '#173d2c'); g.addColorStop(0.6, '#5fb36a'); g.addColorStop(1, '#d6e78a'); }
			c.fillStyle = g;
			c.fillRect(0, 0, w, h * 0.8);
			c.fillStyle = '#ffe3a0';
			c.beginPath(); c.arc(w * 0.5, h * 0.55, w * 0.16, 0, Math.PI * 2); c.fill();
			c.fillStyle = '#3a1f3f';
			c.beginPath(); c.moveTo(0, h * 0.8); c.lineTo(0, h * 0.62); c.quadraticCurveTo(w * 0.3, h * 0.5, w * 0.6, h * 0.66); c.quadraticCurveTo(w * 0.85, h * 0.58, w, h * 0.64); c.lineTo(w, h * 0.8); c.fill();
			caption('PERSEVERE');
			break;
		}
		case 'peak': {
			c.fillStyle = '#6fa3c7';
			c.fillRect(0, 0, w, h * 0.8);
			const peak = (x, top, base, col) => {
				c.fillStyle = col;
				c.beginPath(); c.moveTo(x - base, h * 0.8); c.lineTo(x, top); c.lineTo(x + base, h * 0.8); c.fill();
				c.fillStyle = '#f4f4f0';
				c.beginPath(); c.moveTo(x, top); c.lineTo(x - base * 0.28, top + (h * 0.8 - top) * 0.28); c.lineTo(x + base * 0.28, top + (h * 0.8 - top) * 0.28); c.fill();
			};
			if (variant === 'peak-two') peak(w * 0.25, h * 0.38, w * 0.3, '#46566a');
			peak(w * 0.6, h * 0.18, w * 0.5, '#33414f');
			caption('ASPIRE');
			break;
		}
		case 'light': {
			c.fillStyle = variant === 'light' ? '#1f3554' : '#0b0f18';
			c.fillRect(0, 0, w, h * 0.8);
			c.fillStyle = '#16304a';
			c.fillRect(0, h * 0.62, w, h * 0.18);
			if (variant === 'light') {
				c.fillStyle = 'rgba(255,240,170,0.35)';
				c.beginPath(); c.moveTo(w * 0.52, h * 0.24); c.lineTo(0, h * 0.1); c.lineTo(0, h * 0.34); c.fill();
			}
			c.fillStyle = '#e9e4d8';
			c.fillRect(w * 0.45, h * 0.28, w * 0.12, h * 0.36);
			c.fillStyle = '#c0392b';
			for (let i = 0; i < 3; i++) c.fillRect(w * 0.45, h * (0.32 + i * 0.1), w * 0.12, h * 0.04);
			c.fillStyle = variant === 'light' ? '#ffe9a0' : '#3a3a3a';
			c.fillRect(w * 0.46, h * 0.22, w * 0.1, h * 0.06);
			caption('GUIDANCE');
			break;
		}
		case 'tree': {
			c.fillStyle = '#d9cfa8';
			c.fillRect(0, 0, w, h * 0.8);
			c.fillStyle = '#5a4630';
			c.fillRect(w * 0.47, h * 0.42, w * 0.06, h * 0.38);
			if (variant === 'tree') {
				c.fillStyle = '#4f7a3a';
				for (const [x, y, rad] of [[0.5, 0.3, 0.22], [0.34, 0.4, 0.14], [0.66, 0.4, 0.14]]) {
					c.beginPath(); c.arc(w * x, h * y, w * rad, 0, Math.PI * 2); c.fill();
				}
			} else {
				c.strokeStyle = '#5a4630';
				c.lineWidth = 5;
				for (const [x, y] of [[0.3, 0.2], [0.7, 0.22], [0.5, 0.12], [0.36, 0.34], [0.64, 0.32]]) {
					c.beginPath(); c.moveTo(w * 0.5, h * 0.45); c.lineTo(w * x, h * y); c.stroke();
				}
			}
			caption('GROWTH', '#e9dfb8');
			break;
		}
		case 'map': {
			c.fillStyle = '#efe8d2';
			c.fillRect(0, 0, w, h);
			c.strokeStyle = '#3b3b3b';
			c.lineWidth = 3;
			c.strokeRect(w * 0.1, h * 0.18, w * 0.8, h * 0.62);
			for (let i = 1; i < 4; i++) {
				c.beginPath(); c.moveTo(w * (0.1 + 0.2 * i), h * 0.18); c.lineTo(w * (0.1 + 0.2 * i), h * (0.4 + 0.1 * i)); c.stroke();
				c.beginPath(); c.moveTo(w * 0.1, h * (0.18 + 0.15 * i)); c.lineTo(w * (0.3 + 0.12 * i), h * (0.18 + 0.15 * i)); c.stroke();
			}
			c.fillStyle = '#d12b1f';
			const [dx, dy] = variant === 'map' ? [0.3, 0.6] : [0.72, 0.3];
			c.beginPath(); c.arc(w * dx, h * dy, w * 0.06, 0, Math.PI * 2); c.fill();
			c.fillStyle = '#222';
			c.font = `bold ${Math.round(w * 0.1)}px sans-serif`;
			c.textAlign = 'center';
			c.fillText('YOU ARE HERE', w / 2, h * 0.11);
			break;
		}
		case 'notice': {
			c.fillStyle = '#f2eedf';
			c.fillRect(0, 0, w, h);
			c.fillStyle = variant === 'notice' ? '#222' : '#b3241b';
			c.font = `bold ${Math.round(w * 0.16)}px sans-serif`;
			c.textAlign = 'center';
			c.fillText('NOTICE', w / 2, h * 0.16);
			c.fillStyle = '#555';
			for (let i = 0; i < 7; i++) c.fillRect(w * 0.12, h * (0.28 + i * 0.08), w * (0.5 + ((i * 37) % 30) / 100), h * 0.025);
			break;
		}
		case 'board': {
			c.fillStyle = '#f1f0ea';
			c.fillRect(0, 0, w, h);
			c.strokeStyle = 'rgba(40,60,140,0.6)';
			c.lineWidth = 3;
			if (variant === 'board') {
				c.beginPath(); c.moveTo(w * 0.1, h * 0.7); c.lineTo(w * 0.3, h * 0.45); c.lineTo(w * 0.5, h * 0.55); c.lineTo(w * 0.75, h * 0.25); c.stroke();
				c.fillStyle = 'rgba(40,60,140,0.7)';
				c.font = `bold ${Math.round(h * 0.13)}px sans-serif`;
				c.fillText('Q3 ???', w * 0.08, h * 0.2);
			}
			c.strokeStyle = 'rgba(160,30,30,0.5)';
			c.strokeRect(w * 0.7, h * 0.6, w * 0.2, h * 0.25);
			c.strokeStyle = 'rgba(120,120,120,0.25)';
			c.lineWidth = 12;
			c.beginPath(); c.moveTo(w * 0.15, h * 0.85); c.lineTo(w * 0.55, h * 0.8); c.stroke();
			break;
		}
		}
	});
}

/* ---------- shared bits ---------- */

function shadow(g, w, d, opacity = 0.7) {
	const m = new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, opacity });
	const s = part(g, P(1, 1), m, 0, 0.006, 0, -Math.PI / 2);
	s.scale.set(w, d, 1);
	s.userData.noOcclude = true;
	return s;
}

// The materials the game animates: lit panels share one so the whole floor
// can dim and stutter together, dead ones share another.
export const panelMats = {
	on: new THREE.MeshBasicMaterial({ map: null, color: 0xfff7d8 }),
	glow: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }),
	off: new THREE.MeshLambertMaterial({ color: 0x77725e }),
};
let panelMatsReady = false;
function readyPanelMats() {
	if (panelMatsReady) return;
	panelMatsReady = true;
	panelMats.on.map = panelTex();
	panelMats.glow.map = glowTex();
	panelMats.off.map = panelTex();
}

/* ---------- the shell: carpet, ceiling, walls, corridors, slab ---------- */

const YAW = [Math.PI / 2, 0, -Math.PI / 2];

// A point `u` across and `d` out from the centre, as seen facing wall `wall`.
export function wallPoint(wall, u, d) {
	const y = YAW[wall];
	return { x: u * Math.cos(y) - d * Math.sin(y), z: -u * Math.sin(y) - d * Math.cos(y) };
}
export const wallYaw = (wall) => YAW[wall];

// spec: { R, openings: [[{ u, w }], ...] per wall, depth (corridor length) }
export function buildShell(spec) {
	readyPanelMats();
	const g = new THREE.Group();
	const { R } = spec;
	const paper = texLam('wallpaper', wallpaperTex());
	const carpet = texLam('carpet', carpetTex());
	const ceiling = texLam('ceiling', ceilingTex(), { emissive: 0x6a6040, emissiveIntensity: 1 });
	const skirting = lam(0x5e4a2c);
	const OPEN_H = 2.2;
	const L = spec.depth || 26;

	const at = (obj, wall, u, d, y, a = 0) => {
		const p = wallPoint(wall, u, d);
		obj.position.set(p.x, y, p.z);
		obj.rotation.y = YAW[wall] + a;
		g.add(obj);
		return obj;
	};

	// carpet and ceiling over the room; the grid lines up with whole tiles
	part(g, tiledPlane(2 * R, 2 * R, 2), carpet, 0, 0, 0, -Math.PI / 2);
	part(g, tiledPlane(2 * R, 2 * R, TILE * 4), ceiling, 0, CEIL, 0, Math.PI / 2);

	// a wall facing the room, from u0 to u1, at distance d, y0..y1 high
	function wallPiece(wall, u0, u1, d, y0 = 0, y1 = CEIL, a = 0) {
		const len = u1 - u0;
		if (len <= 0.01) return;
		const m = new THREE.Mesh(tiledPlane(len, y1 - y0, 1, CEIL), paper);
		at(m, wall, (u0 + u1) / 2, d, (y0 + y1) / 2, a);
		if (y0 === 0) {
			const s = new THREE.Mesh(B(len, 0.1, 0.02), skirting);
			at(s, wall, (u0 + u1) / 2, d - 0.01, 0.05, a);
		}
	}

	for (let wall = 0; wall < 4; wall++) {
		// the back wall (wall 3) is behind the players; no camera sees it, but
		// it closes the room for the lights
		if (wall === 3) {
			const m = new THREE.Mesh(tiledPlane(2 * R, CEIL, 1, CEIL), paper);
			m.position.set(0, CEIL / 2, R);
			m.rotation.y = Math.PI;
			g.add(m);
			continue;
		}
		const openings = (spec.openings[wall] || []).slice().sort((a, b) => a.u - b.u);
		let u = -R;
		for (const o of openings) {
			wallPiece(wall, u, o.u - o.w / 2, R);
			wallPiece(wall, o.u - o.w / 2, o.u + o.w / 2, R, OPEN_H, CEIL);
			u = o.u + o.w / 2;
			corridor(wall, o);
		}
		wallPiece(wall, u, R, R);
	}

	// A corridor out through an opening, fading into the haze.
	function corridor(wall, o) {
		const mid = R + L / 2;
		const fl = new THREE.Mesh(tiledPlane(o.w, L, 2), carpet);
		at(fl, wall, o.u, mid, 0).rotation.x = -Math.PI / 2;
		fl.rotation.order = 'YXZ';
		const cl = new THREE.Mesh(tiledPlane(o.w, L, TILE * 4), ceiling);
		at(cl, wall, o.u, mid, OPEN_H);
		cl.rotation.order = 'YXZ';
		cl.rotation.x = Math.PI / 2;
		// side walls face inward
		const left = new THREE.Mesh(tiledPlane(L, OPEN_H, 1, CEIL), paper);
		at(left, wall, o.u - o.w / 2, mid, OPEN_H / 2, Math.PI / 2);
		const right = new THREE.Mesh(tiledPlane(L, OPEN_H, 1, CEIL), paper);
		at(right, wall, o.u + o.w / 2, mid, OPEN_H / 2, -Math.PI / 2);
		const end = new THREE.Mesh(tiledPlane(o.w, OPEN_H, 1, CEIL), paper);
		at(end, wall, o.u, R + L, OPEN_H / 2);
		// tubes down the middle, every few metres
		for (let d = R + 1.6; d < R + L; d += 3) {
			const p = new THREE.Mesh(P(0.5, 1.1), panelMats.on);
			at(p, wall, o.u, d, OPEN_H - 0.01);
			p.rotation.order = 'YXZ';
			p.rotation.x = Math.PI / 2;
		}
	}

	// The slab and plenum under this floor: dark, unlit concrete with ducts,
	// which the camera sinks through on its way down.
	const concrete = texBasic('concrete', concreteTex(), { side: THREE.DoubleSide, fog: false });
	const slab = part(g, B(2 * R, 1.14, 2 * R), concrete, 0, -0.6, 0);
	slab.userData.noOcclude = true;
	const duct = new THREE.MeshBasicMaterial({ color: 0x4a4a46, fog: false });
	const pipe = new THREE.MeshBasicMaterial({ color: 0x5d3b22, fog: false });
	for (let i = -2; i <= 2; i++) {
		part(g, B(0.5, 0.3, 2 * R - 0.2), duct, i * 2.7 + 0.8, -0.85, 0).userData.noOcclude = true;
		part(g, C(0.04, 0.04, 2 * R - 0.2, 6), pipe, -R + 0.1, -0.5 + i * 0.05, i * 2.5, 0, 0, Math.PI / 2).userData.noOcclude = true;
	}
	return g;
}

/* ---------- props ---------- */

export function desk(p) {
	const g = new THREE.Group();
	const top = lam(p.color || 0x8c7752);
	const side = lam(0x6b5a3b);
	part(g, B(1.4, 0.04, 0.72), top, 0, 0.73, 0);
	part(g, B(0.04, 0.71, 0.68), side, -0.66, 0.355, 0);
	part(g, B(0.42, 0.71, 0.68), side, 0.47, 0.355, 0);
	part(g, B(0.4, 0.008, 0.6), lam(0x4d402a), 0.47, 0.5, 0.341, Math.PI / 2);
	part(g, B(0.4, 0.008, 0.6), lam(0x4d402a), 0.47, 0.25, 0.341, Math.PI / 2);
	part(g, B(1.26, 0.4, 0.03), side, 0, 0.5, -0.32);
	shadow(g, 1.8, 1.1, 0.6);
	return g;
}

export function chair(p) {
	const g = new THREE.Group();
	const fabric = lam(p.color);
	const dark = lam(0x26262a);
	for (let i = 0; i < 5; i++) {
		const leg = new THREE.Group();
		leg.rotation.y = i * Math.PI * 2 / 5;
		part(leg, B(0.05, 0.04, 0.3), dark, 0, 0.06, 0.15);
		part(leg, B(0.05, 0.05, 0.05), dark, 0, 0.025, 0.29);
		g.add(leg);
	}
	part(g, C(0.03, 0.03, 0.34), dark, 0, 0.25, 0);
	part(g, B(0.5, 0.09, 0.48), fabric, 0, 0.46, 0.02);
	part(g, B(0.46, 0.56, 0.08), fabric, 0, 0.86, -0.24, -0.1);
	part(g, B(0.06, 0.2, 0.04), dark, 0, 0.58, -0.24);
	for (const s of [-1, 1]) {
		part(g, B(0.05, 0.03, 0.3), dark, s * 0.28, 0.67, 0);
		part(g, B(0.03, 0.18, 0.03), dark, s * 0.28, 0.57, -0.06);
	}
	shadow(g, 0.9, 0.9, 0.65);
	return g;
}

export function crt(p) {
	const g = new THREE.Group();
	const beige = lam(0xcdc39d);
	part(g, B(0.42, 0.36, 0.34), beige, 0, 0.24, 0);
	part(g, B(0.3, 0.26, 0.22), beige, 0, 0.22, -0.26);
	part(g, B(0.22, 0.05, 0.22), beige, 0, 0.025, -0.06);
	const screen = p.on ? texBasic('screen-on', screenTex(true)) : texLam('screen-off', screenTex(false));
	part(g, P(0.33, 0.26), screen, 0, 0.25, 0.172);
	part(g, B(0.025, 0.025, 0.01), p.on ? basic(0x5cff88) : lam(0x2a3a2a), 0.17, 0.09, 0.172);
	if (p.on) {
		// a faint green spill on the desk
		const spill = new THREE.Mesh(P(0.7, 0.5), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0x6dff9c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.4 }));
		spill.rotation.x = -Math.PI / 2;
		spill.position.set(0, 0.004, 0.32);
		spill.userData.noOcclude = true;
		g.add(spill);
	}
	return g;
}

export function keyboard() {
	const g = new THREE.Group();
	part(g, B(0.44, 0.025, 0.15), lam(0xc7bd98), 0, 0.012, 0, 0.08);
	return g;
}

export function mug(p) {
	const g = new THREE.Group();
	part(g, C(0.045, 0.04, 0.1), lam(p.color), 0, 0.05, 0);
	part(g, B(0.02, 0.05, 0.04), lam(p.color), 0.055, 0.05, 0);
	return g;
}

export function papers(p) {
	const g = new THREE.Group();
	const r = rng(p.seed || 1);
	for (let i = 0; i < 4; i++) part(g, B(0.22, 0.012, 0.3), lam(i % 2 ? 0xe9e4cf : 0xd9d2b6), (r() - 0.5) * 0.04, 0.006 + i * 0.013, (r() - 0.5) * 0.04, 0, (r() - 0.5) * 0.4);
	return g;
}

export function phone() {
	const g = new THREE.Group();
	part(g, B(0.2, 0.06, 0.18), lam(0x2c2b28), 0, 0.03, 0, 0.1);
	part(g, B(0.2, 0.04, 0.05), lam(0x2c2b28), 0, 0.08, -0.04);
	return g;
}

export function partition(p) {
	const g = new THREE.Group();
	const mat = cached(`fabric${p.color}`, () => new THREE.MeshLambertMaterial({ color: p.color, map: fabricTex() }));
	part(g, B(p.w, p.h, 0.06), mat, 0, p.h / 2, 0);
	part(g, B(p.w + 0.02, 0.03, 0.08), lam(0x8d877a), 0, p.h + 0.015, 0);
	part(g, B(0.04, p.h, 0.08), lam(0x8d877a), -p.w / 2, p.h / 2, 0);
	part(g, B(0.04, p.h, 0.08), lam(0x8d877a), p.w / 2, p.h / 2, 0);
	return g;
}

export function cabinet(p) {
	const g = new THREE.Group();
	const h = p.tall ? 1.32 : 1.0;
	const n = p.tall ? 4 : 3;
	const body = lam(p.color);
	part(g, B(0.46, h, 0.6), body, 0, h / 2, 0);
	const line = lam(0x3a362c);
	for (let i = 0; i < n; i++) {
		const y = (h - 0.04) * (i + 0.5) / n + 0.02;
		part(g, B(0.42, 0.01, 0.01), line, 0, (h - 0.04) * i / n + 0.02, 0.301);
		part(g, B(0.14, 0.025, 0.03), lam(0x9a968c), 0, y + 0.06, 0.31);
		part(g, B(0.08, 0.04, 0.005), lam(0xeeeadc), 0, y + 0.13, 0.302);
	}
	shadow(g, 0.8, 0.95, 0.6);
	return g;
}

export function cooler() {
	const g = new THREE.Group();
	part(g, B(0.32, 0.95, 0.32), lam(0xdcd8c6), 0, 0.475, 0);
	part(g, B(0.2, 0.02, 0.06), lam(0x6a685e), 0, 0.62, 0.17);
	part(g, B(0.03, 0.05, 0.03), lam(0x2f5fc0), -0.05, 0.72, 0.17);
	part(g, B(0.03, 0.05, 0.03), lam(0xc0352f), 0.05, 0.72, 0.17);
	const water = cached('water', () => new THREE.MeshLambertMaterial({ color: 0x77b7d9, transparent: true, opacity: 0.8 }));
	part(g, C(0.14, 0.14, 0.38, 18), water, 0, 1.17, 0);
	part(g, C(0.05, 0.14, 0.08, 18), water, 0, 0.99, 0);
	shadow(g, 0.6, 0.6, 0.6);
	return g;
}

export function plant(p) {
	const g = new THREE.Group();
	const r = rng(p.seed || 3);
	part(g, C(0.2, 0.15, 0.36, 16), lam(p.pot || 0x9a5a3a), 0, 0.18, 0);
	part(g, C(0.18, 0.18, 0.02, 16), lam(0x2e2416), 0, 0.35, 0);
	const leaf = [lam(0x4b6b2e), lam(0x5f7f36), lam(0x3c5626)];
	const stems = 5 + Math.floor(r() * 3);
	for (let i = 0; i < stems; i++) {
		const a = i / stems * Math.PI * 2 + r();
		const h = 0.7 + r() * 0.7;
		const lean = 0.12 + r() * 0.15;
		part(g, C(0.012, 0.012, h, 5), lam(0x4e5a2a), Math.sin(a) * lean / 2, 0.35 + h / 2, Math.cos(a) * lean / 2, Math.cos(a) * lean, 0, -Math.sin(a) * lean);
		for (let k = 0; k < 3; k++) {
			const t = 0.45 + k * 0.25;
			const m = part(g, S(), leaf[(i + k) % 3], Math.sin(a) * lean * t * 1.3, 0.35 + h * t, Math.cos(a) * lean * t * 1.3, r() * 0.8, a + r(), 0.5);
			m.scale.set(0.05, 0.022, 0.14);
		}
	}
	shadow(g, 0.7, 0.7, 0.55);
	return g;
}

export function printer() {
	const g = new THREE.Group();
	part(g, B(0.62, 0.62, 0.5), lam(0x55534c), 0, 0.31, 0);
	part(g, B(0.56, 0.3, 0.46), lam(0xbdb9ac), 0, 0.77, 0);
	part(g, B(0.4, 0.02, 0.22), lam(0x8f8b80), 0, 0.93, -0.08, 0.25);
	part(g, B(0.3, 0.02, 0.24), lam(0xf0ece0), 0, 0.94, -0.08, 0.25);
	part(g, B(0.42, 0.06, 0.18), lam(0x8f8b80), 0, 0.65, 0.27);
	part(g, B(0.1, 0.05, 0.005), basic(0x7fcf8a), 0.18, 0.86, 0.231);
	part(g, B(0.28, 0.01, 0.2), lam(0xf0ece0), 0, 0.69, 0.3);
	shadow(g, 0.95, 0.85, 0.6);
	return g;
}

export function pillar() {
	const g = new THREE.Group();
	const paper = texLam('wallpaper', wallpaperTex());
	for (let i = 0; i < 4; i++) {
		const face = new THREE.Group();
		face.rotation.y = i * Math.PI / 2;
		part(face, tiledPlane(0.7, CEIL, 1, CEIL), paper, 0, CEIL / 2, 0.35);
		part(face, B(0.72, 0.1, 0.02), lam(0x5e4a2c), 0, 0.05, 0.36);
		g.add(face);
	}
	shadow(g, 1.3, 1.3, 0.5);
	return g;
}

export function bin() {
	const g = new THREE.Group();
	part(g, C(0.15, 0.12, 0.36, 14), lam(0x3c3a36), 0, 0.18, 0);
	part(g, C(0.155, 0.155, 0.02, 14), lam(0x2a2926), 0, 0.36, 0);
	part(g, B(0.1, 0.04, 0.1), lam(0xe8e2c8), 0.03, 0.37, 0.02, 0.3, 0.4);
	shadow(g, 0.5, 0.5, 0.5);
	return g;
}

export function boxes(p) {
	const g = new THREE.Group();
	const r = rng(p.seed || 5);
	const card = lam(0xa98656);
	const tape = lam(0xc9b38a);
	let y = 0;
	for (let i = 0; i < (p.n || 2); i++) {
		const w = 0.5 - i * 0.06;
		const h = 0.36 - i * 0.04;
		const box = new THREE.Group();
		box.position.set((r() - 0.5) * 0.08, y, (r() - 0.5) * 0.08);
		box.rotation.y = (r() - 0.5) * 0.5;
		part(box, B(w, h, w * 0.8), card, 0, h / 2, 0);
		part(box, B(0.08, 0.005, w * 0.8 + 0.01), tape, 0, h + 0.002, 0);
		g.add(box);
		y += h;
	}
	shadow(g, 0.8, 0.8, 0.6);
	return g;
}

export function coatStand(p) {
	const g = new THREE.Group();
	const wood = lam(0x4a3522);
	part(g, C(0.22, 0.25, 0.04, 16), wood, 0, 0.02, 0);
	part(g, C(0.02, 0.025, 1.8, 8), wood, 0, 0.92, 0);
	for (let i = 0; i < 4; i++) part(g, B(0.02, 0.02, 0.16), wood, Math.sin(i * Math.PI / 2) * 0.07, 1.75, Math.cos(i * Math.PI / 2) * 0.07, -0.5, i * Math.PI / 2, 0);
	if (p.coat) {
		// a coat left hanging, shoulders and all
		const coat = lam(p.coat);
		part(g, B(0.42, 0.85, 0.16), coat, 0, 1.28, 0.1, 0.06);
		part(g, B(0.44, 0.1, 0.18), coat, 0, 1.68, 0.09);
	}
	shadow(g, 0.6, 0.6, 0.5);
	return g;
}

export function wetSign() {
	const g = new THREE.Group();
	const face = texLam('wetsign', wetSignTex(), { side: THREE.DoubleSide });
	part(g, P(0.3, 0.6), face, 0, 0.3, 0.09, -0.3);
	part(g, P(0.3, 0.6), face, 0, 0.3, -0.09, 0.3, Math.PI);
	shadow(g, 0.5, 0.5, 0.5);
	return g;
}

/* ---------- things on the walls (origin on the wall surface) ---------- */

export function door(p) {
	const g = new THREE.Group();
	const frame = lam(0x6a5434);
	part(g, B(0.08, 2.15, 0.06), frame, -0.5, 1.075, 0.03);
	part(g, B(0.08, 2.15, 0.06), frame, 0.5, 1.075, 0.03);
	part(g, B(1.08, 0.08, 0.06), frame, 0, 2.11, 0.03);
	// the doorway behind: nothing but dark
	part(g, P(0.92, 2.07), basic(0x070604), 0, 1.035, 0.006);
	const hinge = new THREE.Group();
	hinge.position.set(-0.46, 0, 0.03);
	hinge.rotation.y = p.open ? -1.25 : 0;
	part(hinge, B(0.92, 2.06, 0.045), lam(p.color || 0x9d8457), 0.46, 1.04, 0);
	part(hinge, B(0.04, 0.04, 0.07), lam(0xb8ad86), 0.82, 1.0, 0.03);
	part(hinge, B(0.18, 0.24, 0.005), lam(0xd8cfaa), 0.46, 1.55, 0.024);
	g.add(hinge);
	return g;
}

export function clock(p) {
	const g = new THREE.Group();
	const R = 0.3;
	part(g, C(R + 0.02, R + 0.02, 0.05, 32), lam(0x2c2a26), 0, 0, 0.025, Math.PI / 2);
	const face = new THREE.Mesh(cached('clockface', () => new THREE.CircleGeometry(R, 32)), texLam('clock', clockTex()));
	face.position.z = 0.052;
	g.add(face);
	const hand = (len, w, a, colour) => {
		const pivot = new THREE.Group();
		pivot.position.z = 0.058;
		pivot.rotation.z = -a;
		part(pivot, B(w, len, 0.008), lam(colour), 0, len / 2 - 0.02, 0);
		g.add(pivot);
	};
	const m = p.m || 0;
	hand(R * 0.55, 0.03, ((p.h % 12) + m / 60) / 12 * Math.PI * 2, 0x1a1a1a);
	hand(R * 0.85, 0.02, m / 60 * Math.PI * 2, 0x1a1a1a);
	part(g, C(0.02, 0.02, 0.01, 10), lam(0xa02020), 0, 0, 0.064, Math.PI / 2);
	return g;
}

export function poster(p) {
	const g = new THREE.Group();
	const v = POSTERS[p.variant];
	part(g, B(v.w + 0.05, v.h + 0.05, 0.02), lam(v.family === 'board' ? 0x9c9a92 : 0x2a2620), 0, 0, 0.01);
	part(g, P(v.w, v.h), texLam(`poster-${p.variant}`, posterTex(p.variant)), 0, 0, 0.022);
	return g;
}

export function vent() {
	const g = new THREE.Group();
	part(g, B(0.62, 0.32, 0.02), lam(0x9a9686), 0, 0, 0.01);
	part(g, P(0.56, 0.26), texLam('vent', ventTex()), 0, 0, 0.022);
	return g;
}

export function exitSign() {
	const g = new THREE.Group();
	part(g, B(0.42, 0.2, 0.08), lam(0xd9d4c2), 0, 0, 0.04);
	part(g, P(0.38, 0.16), texBasic('exit', exitTex()), 0, 0, 0.081);
	const glow = new THREE.Mesh(P(1.0, 0.6), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0x3dff7a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35 }));
	glow.position.z = 0.012;
	glow.userData.noOcclude = true;
	g.add(glow);
	return g;
}

export function extinguisher() {
	const g = new THREE.Group();
	part(g, C(0.08, 0.08, 0.46, 14), lam(0xb3261e), 0, 0.23 + 0.1, 0.1);
	part(g, C(0.03, 0.03, 0.06, 8), lam(0x222222), 0, 0.59, 0.1);
	part(g, B(0.1, 0.03, 0.03), lam(0x222222), 0.04, 0.63, 0.1);
	part(g, B(0.2, 0.2, 0.01), lam(0xd23b2e), 0, 1.2, 0.006);
	return g;
}

/* ---------- the ceiling ---------- */

// A fluorescent panel in the ceiling, lit, dead or flickering. A flickering
// one gets its own material, which the game animates (userData.flicker).
export function panel(p) {
	readyPanelMats();
	const g = new THREE.Group();
	part(g, B(0.66, 0.03, 1.26), lam(0xcfc9b0), 0, -0.01, 0);
	let face = panelMats.on;
	if (p.state === 'off') face = panelMats.off;
	if (p.state === 'flicker') {
		face = panelMats.on.clone();
		g.userData.flicker = { face, seed: p.seed || 1 };
	}
	part(g, P(0.6, 1.2), face, 0, -0.027, 0, Math.PI / 2);
	if (p.state !== 'off') {
		const glowMat = p.state === 'flicker' ? panelMats.glow.clone() : panelMats.glow;
		const glow = part(g, P(1.5, 2.2), glowMat, 0, -0.029, 0, Math.PI / 2);
		glow.userData.noOcclude = true;
		if (g.userData.flicker) g.userData.flicker.glow = glowMat;
	}
	return g;
}

// A ceiling tile missing: a black hole into the plenum, a wire hanging out.
export function hole(p) {
	const g = new THREE.Group();
	part(g, P(TILE - 0.02, TILE - 0.02), basic(0x050403), 0, -0.006, 0, Math.PI / 2);
	const r = rng(p.seed || 1);
	part(g, B(0.012, 0.35, 0.012), lam(0x222222), (r() - 0.5) * 0.3, -0.18, (r() - 0.5) * 0.3, 0.2, 0, 0.15);
	return g;
}

export function stain(p) {
	const g = new THREE.Group();
	const ceiling = !!p.ceiling;
	const m = cached(`stainmat${p.seed}${ceiling}`, () => new THREE.MeshBasicMaterial({ map: stainTex(p.seed, ceiling), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
	const s = part(g, P(1, 1), m, 0, ceiling ? -0.004 : 0.004, 0, ceiling ? Math.PI / 2 : -Math.PI / 2);
	s.scale.set(p.size, p.size * (p.aspect || 0.8), 1);
	s.userData.noOcclude = true;
	return g;
}

// A tall, thin shape standing at the end of a corridor. It doesn't move.
export function figure() {
	const g = new THREE.Group();
	const dark = new THREE.MeshBasicMaterial({ color: 0x17140c, fog: false, transparent: true, opacity: 0.85 });
	part(g, C(0.12, 0.08, 1.1, 8), dark, 0, 1.55, 0);
	part(g, C(0.06, 0.04, 1.05, 6), dark, -0.09, 0.52, 0);
	part(g, C(0.06, 0.04, 1.05, 6), dark, 0.09, 0.52, 0);
	const head = part(g, S(), dark, 0, 2.28, 0);
	head.scale.set(0.11, 0.15, 0.11);
	part(g, C(0.03, 0.025, 1.25, 6), dark, -0.17, 1.45, 0, 0, 0, -0.08);
	part(g, C(0.03, 0.025, 1.25, 6), dark, 0.17, 1.45, 0, 0, 0, 0.08);
	return g;
}

// Everything by type, for the floor builder.
export const BUILDERS = {
	desk, chair, crt, keyboard, mug, papers, phone, partition, cabinet, cooler, plant, printer,
	pillar, bin, boxes, coatStand, wetSign, door, clock, poster, vent, exitSign, extinguisher,
	light: panel, hole, stain, figure,
};
