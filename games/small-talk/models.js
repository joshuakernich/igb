/*
 * Small Talk: the 3D models: a hired function room and its party. Everything is built from three.js primitives and
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
import { person, drawFace, flame } from './people.js';

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

// A function room's walls: dusty-rose damask above a dado rail, varnished
// wood panelling below. One texture tile is 1 m wide and the full wall height.
export function wallpaperTex() {
	return canvasTexture('wallpaper', 512, 1024, function (c, w, h) {
		const r = rng(7);
		c.fillStyle = '#b98a86';
		c.fillRect(0, 0, w, h);
		// damask: a soft lozenge and fleur, in rows
		for (let y = 0; y < h * 0.7; y += 128) {
			for (let x = 0; x < w; x += 128) {
				const cx = x + ((y / 128) % 2 ? 64 : 0) + 32;
				const cy = y + 64;
				c.fillStyle = 'rgba(255,225,215,0.16)';
				c.beginPath();
				c.moveTo(cx, cy - 46); c.quadraticCurveTo(cx + 34, cy, cx, cy + 46); c.quadraticCurveTo(cx - 34, cy, cx, cy - 46);
				c.fill();
				c.fillStyle = 'rgba(120,70,70,0.14)';
				c.beginPath(); c.arc(cx, cy, 9, 0, Math.PI * 2); c.fill();
			}
		}
		speckle(c, w, h * 0.66, 5000, ['rgba(90,50,50,0.08)', 'rgba(255,235,225,0.08)'], r, 2);
		// the dado rail, and wood below it
		const dado = h * 0.66;
		const wood = c.createLinearGradient(0, dado, 0, h);
		wood.addColorStop(0, '#6e4a2e');
		wood.addColorStop(1, '#4e3220');
		c.fillStyle = wood;
		c.fillRect(0, dado, w, h - dado);
		for (let x = 0; x < w; x += 256) {
			c.strokeStyle = 'rgba(30,18,8,0.55)';
			c.lineWidth = 6;
			c.strokeRect(x + 30, dado + 50, 196, h - dado - 110);
			c.strokeStyle = 'rgba(255,220,180,0.12)';
			c.lineWidth = 3;
			c.strokeRect(x + 36, dado + 56, 184, h - dado - 122);
		}
		for (let i = 0; i < 40; i++) {
			c.fillStyle = `rgba(30,18,8,${0.05 + r() * 0.08})`;
			c.fillRect(0, dado + r() * (h - dado), w, 1 + r() * 2);
		}
		c.fillStyle = '#5a3a22';
		c.fillRect(0, dado - 10, w, 22);
		c.fillStyle = 'rgba(255,220,180,0.3)';
		c.fillRect(0, dado - 10, w, 4);
	}, true);
}

// Hotel function-room carpet: deep red with gold and teal swirls and
// diamonds, the kind nobody would choose. 2 m to a tile.
export function carpetTex() {
	return canvasTexture('carpet', 512, 512, function (c, w, h) {
		const r = rng(11);
		c.fillStyle = '#6e1e2a';
		c.fillRect(0, 0, w, h);
		const T = 128;
		for (let y = 0; y < h; y += T) {
			for (let x = 0; x < w; x += T) {
				const cx = x + T / 2, cy = y + T / 2;
				// a gold diamond with a teal heart
				c.strokeStyle = 'rgba(214,168,74,0.75)';
				c.lineWidth = 5;
				c.beginPath(); c.moveTo(cx, cy - 40); c.lineTo(cx + 40, cy); c.lineTo(cx, cy + 40); c.lineTo(cx - 40, cy); c.closePath(); c.stroke();
				c.fillStyle = 'rgba(40,110,108,0.85)';
				c.beginPath(); c.moveTo(cx, cy - 16); c.lineTo(cx + 16, cy); c.lineTo(cx, cy + 16); c.lineTo(cx - 16, cy); c.closePath(); c.fill();
				// swirls in the corners
				c.strokeStyle = 'rgba(214,168,74,0.45)';
				c.lineWidth = 4;
				for (const [sx, sy] of [[x, y], [x + T, y], [x, y + T], [x + T, y + T]]) {
					c.beginPath(); c.arc(sx, sy, 22, 0, Math.PI * 1.5); c.stroke();
					c.beginPath(); c.arc(sx, sy, 10, Math.PI, Math.PI * 2.4); c.stroke();
				}
			}
		}
		blobs(c, w, h, 14, '30,8,12', 0.2, 30, 110, r);
		speckle(c, w, h, 22000, ['rgba(20,5,8,0.25)', 'rgba(230,180,120,0.10)', 'rgba(90,30,40,0.25)'], r, 2);
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
				const v = 222 + Math.floor(r() * 12);
				c.fillStyle = `rgb(${v},${v - 4},${v - 14})`;
				c.fillRect(i * t, j * t, t, t);
			}
		}
		speckle(c, w, h, 7000, ['rgba(90,85,70,0.25)', 'rgba(120,110,95,0.2)'], r, 2);
		// (no water rings: a clean, dull ceiling)
		for (const [i, j] of []) {
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
		c.fillStyle = '#a8a49a';
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
function stainTex(seed, ceiling, scorch) {
	return canvasTexture(`stain${seed}${ceiling ? 'c' : ''}${scorch ? 's' : ''}`, 256, 256, function (c, w, h) {
		const r = rng(seed * 977 + 13);
		const rgb = scorch ? '12,8,6' : ceiling ? '120,85,25' : '58,44,14';
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
		g.addColorStop(0, 'rgba(20,4,6,0.75)');
		g.addColorStop(0.6, 'rgba(20,4,6,0.4)');
		g.addColorStop(1, 'rgba(20,4,6,0)');
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
	const skirting = lam(0x3e2716);
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
	const m = cached(`stainmat${p.seed}${ceiling}${!!p.scorch}`, () => new THREE.MeshBasicMaterial({ map: stainTex(p.seed, ceiling, !!p.scorch), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, opacity: p.scorch ? 1.6 : 1 }));
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

/* ---------- the party ---------- */

const CLOTH = 0xf1ece0;
const glassMat = () => cached('glass', () => new THREE.MeshLambertMaterial({ color: 0xd8eef0, transparent: true, opacity: 0.58 }));

// A round table in a long white cloth, set for dinner nobody is eating.
export function roundTable(p) {
	const g = new THREE.Group();
	const r = rng(p.seed || 1);
	const cloth = lam(CLOTH);
	part(g, C(0.8, 0.84, 0.74, 28), cloth, 0, 0.37, 0);
	part(g, C(0.82, 0.82, 0.02, 28), cloth, 0, 0.75, 0);
	shadow(g, 2.1, 2.1, 0.55);
	if (p.bare) return g;
	// a centrepiece: a little vase of flowers and a candle
	part(g, C(0.05, 0.07, 0.18, 10), lam(0xbfd6d2), 0, 0.85, 0);
	const flower = [lam(p.flowers || 0xd04a6a), lam(0xf2d24a), lam(0xffffff)];
	for (let i = 0; i < 6; i++) {
		const a = i * 1.05;
		const m = part(g, S(), flower[i % 3], Math.sin(a) * 0.06, 0.98 + r() * 0.05, Math.cos(a) * 0.06);
		m.scale.setScalar(0.035);
	}
	// places: a plate and a glass each
	const places = p.places || 6;
	for (let i = 0; i < places; i++) {
		const a = i / places * Math.PI * 2;
		part(g, C(0.11, 0.1, 0.012, 16), lam(0xfdfdfb), Math.sin(a) * 0.58, 0.766, Math.cos(a) * 0.58);
		const glass = part(g, C(0.03, 0.025, 0.12, 8), glassMat(), Math.sin(a + 0.35) * 0.62, 0.82, Math.cos(a + 0.35) * 0.62);
		if (p.messy && i % 2) { glass.rotation.z = Math.PI / 2; glass.position.y = 0.79; }
	}
	if (p.messy) {
		// spilt wine
		const spill = part(g, cached('spill', () => new THREE.CircleGeometry(0.2, 12)), lam(0x7a1a2a), 0.2, 0.762, 0.25, -Math.PI / 2);
		spill.scale.set(1, 0.6, 1);
	}
	return g;
}

// A banquet chair in a white cover with a coloured sash, facing +z.
export function banquetChair(p) {
	const g = new THREE.Group();
	const cover = lam(0xf4f0e8);
	part(g, B(0.46, 0.46, 0.46), cover, 0, 0.23, 0.02);
	part(g, B(0.46, 0.56, 0.07), cover, 0, 0.74, -0.2);
	part(g, B(0.47, 0.1, 0.075), lam(p.color || 0xc23a5a), 0, 0.66, -0.2);
	part(g, B(0.08, 0.2, 0.08), lam(p.color || 0xc23a5a), 0, 0.56, -0.25);
	shadow(g, 0.7, 0.7, 0.5);
	return g;
}

// The buffet: a long clothed table of platters nobody's touched.
export function buffet(p) {
	const g = new THREE.Group();
	const cloth = lam(CLOTH);
	part(g, B(2.4, 0.76, 0.8), cloth, 0, 0.38, 0);
	part(g, B(2.42, 0.25, 0.82), lam(p.skirt || 0x3a5a8a), 0, 0.63, 0);
	const r = rng(p.seed || 4);
	const foods = [0xd8a050, 0xe8d8b0, 0x7aa04a, 0xc0503a, 0xf0e6c8, 0x9a6a3a];
	for (let i = 0; i < (p.empty ? 0 : 5); i++) {
		const x = -0.96 + i * 0.48;
		part(g, C(0.2, 0.18, 0.02, 18), lam(0xe8e8ea), x, 0.77, 0);
		const food = lam(foods[Math.floor(r() * foods.length)]);
		for (let k = 0; k < 7; k++) {
			const m = part(g, S(), food, x + (r() - 0.5) * 0.24, 0.8, (r() - 0.5) * 0.24);
			m.scale.set(0.035, 0.022, 0.035);
		}
	}
	shadow(g, 3, 1.2, 0.55);
	return g;
}

// The drinks table: a punch bowl and rows of glasses. p.punch: its colour;
// p.glow: lit from inside, with something floating in it.
export function drinks(p) {
	const g = new THREE.Group();
	part(g, B(1.6, 0.76, 0.7), lam(CLOTH), 0, 0.38, 0);
	const glass = glassMat();
	for (let i = 0; i < 12; i++) part(g, C(0.03, 0.025, 0.11, 8), glass, 0.25 + (i % 4) * 0.12, 0.82, -0.18 + Math.floor(i / 4) * 0.13);
	// the bowl
	part(g, C(0.26, 0.12, 0.2, 24), glass, -0.35, 0.86, 0);
	const punch = p.glow
		? new THREE.MeshBasicMaterial({ color: p.punch || 0x6aff4a })
		: lam(p.punch || 0xc8304a);
	part(g, C(0.24, 0.24, 0.01, 24), punch, -0.35, 0.93, 0);
	if (p.glow) {
		// an eyeball, bobbing
		const eye = part(g, S(), lam(0xffffff), -0.32, 0.95, 0.04);
		eye.scale.setScalar(0.06);
		const iris = part(g, S(), basic(0x2a6ab0), -0.32, 0.97, 0.095);
		iris.scale.set(0.028, 0.028, 0.012);
		const glow = new THREE.Mesh(P(1.2, 1.2), new THREE.MeshBasicMaterial({ map: glowTex(), color: p.punch || 0x6aff4a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
		glow.position.set(-0.35, 1.1, 0.1);
		glow.userData.noOcclude = true;
		g.add(glow);
	}
	shadow(g, 2, 1.1, 0.55);
	return g;
}

// The cake, on its own little table: two tiers and candles. p.someone: the
// cake's suddenly enormous, and someone has burst out of the top of it.
export function cake(p) {
	const g = new THREE.Group();
	const icing = lam(0xfbf3f0), pink = lam(0xf29ab8);
	if (p.someone) {
		part(g, C(0.55, 0.58, 0.6, 28), icing, 0, 0.3, 0);
		part(g, C(0.42, 0.45, 0.5, 28), pink, 0, 0.85, 0);
		part(g, C(0.44, 0.44, 0.05, 28), icing, 0, 1.1, 0);
		for (let i = 0; i < 14; i++) {
			const a = i / 14 * Math.PI * 2;
			const m = part(g, S(), icing, Math.sin(a) * 0.56, 0.6, Math.cos(a) * 0.56);
			m.scale.setScalar(0.06);
		}
		const who = person(Object.assign({}, p.someone, { act: 'wave' }));
		who.position.y = -0.42;
		who.children.forEach((ch) => { if (ch.isMesh && ch.geometry.type === 'PlaneGeometry') ch.visible = false; });
		g.add(who);
		shadow(g, 1.5, 1.5, 0.6);
		return g;
	}
	part(g, C(0.4, 0.42, 0.74, 24), lam(p.wrecked ? 0x2a2420 : CLOTH), 0, 0.37, 0);
	if (p.wrecked) {
		// a black lump, still smoking
		const lump = part(g, S(), lam(0x1a1412), 0, 0.82, 0);
		lump.scale.set(0.2, 0.09, 0.17);
		shadow(g, 1, 1, 0.5);
		return g;
	}
	part(g, C(0.22, 0.22, 0.14, 24), icing, 0, 0.81, 0);
	part(g, C(0.15, 0.15, 0.12, 24), pink, 0, 0.94, 0);
	if (p.fire) {
		const f = flame(0.9, 2);
		f.position.y = 1.0;
		g.add(f);
	}
	for (let i = 0; i < 6; i++) {
		const a = i / 6 * Math.PI * 2;
		part(g, C(0.006, 0.006, 0.07, 5), lam(0x6aa0e8), Math.sin(a) * 0.09, 1.03, Math.cos(a) * 0.09);
		const fl = part(g, S(), basic(0xffd060), Math.sin(a) * 0.09, 1.075, Math.cos(a) * 0.09);
		fl.scale.set(0.008, 0.016, 0.008);
	}
	shadow(g, 1, 1, 0.5);
	return g;
}

// The banner across the front wall (origin on the wall), each letter its
// own party colour.
const BANNER_COLOURS = ['#e8445a', '#f29a2e', '#e8c22e', '#3aa86a', '#3a8ad8', '#8a5ad0'];
function bannerTex(text, burnt) {
	return canvasTexture(`banner-${text}${burnt ? '-burnt' : ''}`, 2048, 256, function (c, w, h) {
		c.fillStyle = '#fbf6ea';
		c.fillRect(0, 0, w, h);
		c.fillStyle = 'rgba(0,0,0,0.06)';
		for (let x = 0; x < w; x += 6) c.fillRect(x, 0, 2, h);
		const size = Math.min(170, 3600 / Math.max(10, text.length));
		c.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
		c.textAlign = 'left';
		c.textBaseline = 'middle';
		const total = [...text].reduce((a, ch) => a + c.measureText(ch).width, 0);
		let x = (w - total) / 2;
		[...text].forEach(function (ch, i) {
			c.save();
			c.translate(x + c.measureText(ch).width / 2, h / 2 + 8);
			c.rotate((i % 2 ? 1 : -1) * 0.05);
			c.fillStyle = BANNER_COLOURS[i % BANNER_COLOURS.length];
			c.strokeStyle = '#2a1a1a';
			c.lineWidth = 8;
			c.textAlign = 'center';
			c.strokeText(ch, 0, 0);
			c.fillText(ch, 0, 0);
			c.restore();
			x += c.measureText(ch).width;
		});
		if (burnt) {
			// charred from the left, holes burnt through
			const r = rng(17);
			const g = c.createLinearGradient(0, 0, w, 0);
			g.addColorStop(0, 'rgba(20,10,5,1)');
			g.addColorStop(0.35, 'rgba(40,20,8,0.85)');
			g.addColorStop(0.6, 'rgba(90,50,20,0.3)');
			g.addColorStop(1, 'rgba(90,50,20,0.1)');
			c.fillStyle = g;
			c.fillRect(0, 0, w, h);
			c.globalCompositeOperation = 'destination-out';
			for (let i = 0; i < 26; i++) {
				c.beginPath();
				c.arc(r() * w * 0.7, r() * h, 20 + r() * 70, 0, Math.PI * 2);
				c.fill();
			}
			c.globalCompositeOperation = 'source-over';
		}
	});
}
export function banner(p) {
	const g = new THREE.Group();
	const w = 5.2;
	const key = `banner-${p.text}${p.burnt ? '-burnt' : ''}`;
	part(g, P(w, w / 8), cached(`TL${key}`, () => new THREE.MeshLambertMaterial({ map: bannerTex(p.text, p.burnt), transparent: true, alphaTest: 0.1, side: THREE.DoubleSide })), 0, 0, 0.03);
	if (p.burning) for (const x of [-1.6, -0.4, 1.1]) {
		const f = flame(0.8, x * 5);
		f.position.set(x, -0.1, 0.12);
		g.add(f);
	}
	if (p.burnt) {
		g.rotation.z = -0.18;
		return g;
	}
	// bunting along the bottom
	for (let i = 0; i < 18; i++) {
		const m = new THREE.Mesh(cached('flag', () => {
			const s = new THREE.Shape();
			s.moveTo(-0.1, 0); s.lineTo(0.1, 0); s.lineTo(0, -0.18); s.closePath();
			return new THREE.ShapeGeometry(s);
		}), lam(parseInt(BANNER_COLOURS[i % 6].slice(1), 16)));
		m.position.set(-w / 2 + 0.15 + i * (w - 0.3) / 17, -w / 16 - 0.01 - Math.sin(i / 17 * Math.PI) * 0.08, 0.035);
		g.add(m);
	}
	return g;
}

// A face as a texture, for things that shouldn't have one.
function faceTex(expr) {
	return canvasTexture(`face${expr}`, 256, 256, function (c, w) {
		drawFace(c, expr, w / 2, w / 2, w, {});
	});
}

// A bunch of helium balloons on strings, tied to a little weight. p.face:
// which balloon has grown a face (and p.expr which face).
export function balloons(p) {
	const g = new THREE.Group();
	const r = rng(p.seed || 2);
	const colours = p.colors || [0xe8445a, 0xf2c22e, 0x3a8ad8];
	part(g, B(0.1, 0.08, 0.1), lam(0x9a9aa0), 0, 0.04, 0);
	const string = lam(0xdddddd);
	colours.forEach(function (col, i) {
		const a = i / colours.length * Math.PI * 2 + r();
		const x = Math.sin(a) * 0.2, z = Math.cos(a) * 0.2, y = 1.6 + r() * 0.45;
		const len = Math.hypot(x, y - 0.08, z);
		const s = part(g, C(0.003, 0.003, len, 3), string, x / 2, (y + 0.08) / 2, z / 2);
		s.lookAt(new THREE.Vector3(x, y, z));
		s.rotateX(Math.PI / 2);
		const mat = cached(`balloon${col}`, () => new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.2 }));
		const b = part(g, S(), mat, x, y + 0.17, z);
		b.scale.set(0.15, 0.18, 0.15);
		part(g, C(0.0, 0.025, 0.04, 6), mat, x, y, z);
		if (p.face === i) {
			const f = new THREE.Mesh(P(0.27, 0.27), new THREE.MeshBasicMaterial({ map: faceTex(p.expr || 0), transparent: true, depthWrite: false }));
			f.position.set(x, y + 0.18, z + 0.151);
			f.userData.noOcclude = true;
			g.add(f);
		}
	});
	return g;
}

// The guest of honour's photo on an easel. p.expr: the face in it.
function portraitTex(expr) {
	return canvasTexture(`portrait${expr}`, 256, 320, function (c, w, h) {
		const g = c.createLinearGradient(0, 0, 0, h);
		g.addColorStop(0, '#8ab0c8'); g.addColorStop(1, '#4a6a8a');
		c.fillStyle = g; c.fillRect(0, 0, w, h);
		// jacket, shirt and tie
		c.fillStyle = '#2c3038'; c.beginPath(); c.ellipse(w / 2, h + 20, 120, 110, 0, 0, Math.PI * 2); c.fill();
		c.fillStyle = '#f2f2ee'; c.beginPath(); c.moveTo(w / 2 - 34, h - 85); c.lineTo(w / 2 + 34, h - 85); c.lineTo(w / 2, h); c.fill();
		c.fillStyle = '#a82a2a'; c.fillRect(w / 2 - 9, h - 82, 18, 82);
		// the head: bald, a ring of grey, glasses
		c.fillStyle = '#e8b896'; c.beginPath(); c.ellipse(w / 2, 140, 78, 96, 0, 0, Math.PI * 2); c.fill();
		c.fillStyle = '#9a9a98';
		for (const s of [-1, 1]) { c.beginPath(); c.ellipse(w / 2 + s * 70, 130, 16, 40, 0, 0, Math.PI * 2); c.fill(); }
		drawFace(c, expr, w / 2, 150, 150, {});
		c.strokeStyle = '#111'; c.lineWidth = 4;
		for (const s of [-1, 1]) { c.beginPath(); c.arc(w / 2 + s * 28.5, 139, 20, 0, Math.PI * 2); c.stroke(); }
		c.beginPath(); c.moveTo(w / 2 - 9, 137); c.lineTo(w / 2 + 9, 137); c.stroke();
	});
}
export function portrait(p) {
	const g = new THREE.Group();
	const wood = lam(0x6a4a2a);
	part(g, B(0.04, 1.7, 0.04), wood, -0.32, 0.83, 0.05, -0.12, 0, 0.08);
	part(g, B(0.04, 1.7, 0.04), wood, 0.32, 0.83, 0.05, -0.12, 0, -0.08);
	part(g, B(0.04, 1.6, 0.04), wood, 0, 0.78, -0.25, 0.25, 0, 0);
	part(g, B(0.75, 0.04, 0.1), wood, 0, 0.98, 0.12);
	const frame = new THREE.Group();
	frame.position.set(0, 1.42, 0.1);
	frame.rotation.x = -0.1;
	part(frame, B(0.66, 0.8, 0.04), lam(0xb08a3a), 0, 0, 0);
	part(frame, P(0.56, 0.7), texLam(`portrait${p.expr || 0}`, portraitTex(p.expr || 0)), 0, 0, 0.021);
	g.add(frame);
	shadow(g, 0.8, 0.8, 0.5);
	return g;
}

// The lectern for the speeches, with its microphone.
export function lectern() {
	const g = new THREE.Group();
	const wood = lam(0x5a3a22);
	part(g, B(0.5, 1.05, 0.4), wood, 0, 0.525, 0);
	part(g, B(0.58, 0.04, 0.5), wood, 0, 1.08, 0.02, 0.25, 0, 0);
	part(g, C(0.006, 0.006, 0.3, 5), lam(0x222222), 0.15, 1.22, 0.12, 0.5, 0, 0);
	part(g, S(), lam(0x333333), 0.15, 1.36, 0.2).scale.setScalar(0.025);
	shadow(g, 0.7, 0.6, 0.5);
	return g;
}

/* ---------- the night going on ---------- */

// A stepladder, against the front wall (for hanging the banner).
export function ladder() {
	const g = new THREE.Group();
	const al = lam(0xb8bcc2);
	for (const s of [-1, 1]) part(g, B(0.04, 1.9, 0.04), al, s * 0.24, 0.93, 0.18, -0.18, 0, 0);
	for (const s of [-1, 1]) part(g, B(0.04, 1.85, 0.04), al, s * 0.24, 0.9, -0.17, 0.18, 0, 0);
	for (let i = 0; i < 5; i++) part(g, B(0.5, 0.03, 0.1), al, 0, 0.3 + i * 0.32, 0.17 - i * 0.055);
	shadow(g, 0.8, 0.8, 0.5);
	return g;
}

// A mirror ball, turning, scattering spots of light.
export function discoBall() {
	const g = new THREE.Group();
	part(g, C(0.005, 0.005, 0.3, 4), lam(0x333333), 0, -0.15, 0);
	const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 1), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.15, flatShading: true, emissive: 0x333333 }));
	ball.position.y = -0.55;
	ball.onBeforeRender = () => { ball.rotation.y = performance.now() / 1500; };
	g.add(ball);
	return g;
}

// A fire, burning on whatever it's on.
export function fire(p) {
	const g = new THREE.Group();
	const f = flame(p.size || 0.8, p.seed || 1);
	g.add(f);
	const glow = new THREE.Mesh(P(1, 1), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xff7a2a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5, fog: false }));
	glow.rotation.x = -Math.PI / 2;
	glow.position.y = 0.02;
	glow.scale.setScalar((p.size || 0.8) * 2.5);
	glow.userData.noOcclude = true;
	g.add(glow);
	return g;
}

// Smoke, gathering under the ceiling.
const smokeTex = () => canvasTexture('smoke', 128, 128, function (c, w, h) {
	const r = rng(23);
	for (let i = 0; i < 9; i++) {
		const x = w * (0.3 + r() * 0.4), y = h * (0.3 + r() * 0.4), rad = w * (0.18 + r() * 0.2);
		const g = c.createRadialGradient(x, y, 0, x, y, rad);
		g.addColorStop(0, 'rgba(255,255,255,0.5)');
		g.addColorStop(1, 'rgba(255,255,255,0)');
		c.fillStyle = g;
		c.fillRect(0, 0, w, h);
	}
});
export function smoke(p) {
	const g = new THREE.Group();
	const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex(), color: p.dark ? 0x2a2624 : 0x5a5450, transparent: true, opacity: 0.55, depthWrite: false }));
	const size = p.size || 2.5;
	sp.scale.set(size * 1.6, size * 0.7, 1);
	sp.userData.noOcclude = true;
	sp.onBeforeRender = () => { sp.position.x = Math.sin(performance.now() / 4000 + (p.seed || 0)) * 0.4; };
	g.add(sp);
	return g;
}

// Party litter: cups, a bottle, a paper plate, streamers.
export function litter(p) {
	const g = new THREE.Group();
	const r = rng(p.seed || 3);
	for (let i = 0; i < 4; i++) {
		const cup = part(g, C(0.04, 0.03, 0.11, 8), lam([0xd8302a, 0xf2f2ee, 0x3a8ad8][i % 3]), (r() - 0.5) * 0.7, 0.04, (r() - 0.5) * 0.7, 0, r() * 6, Math.PI / 2);
		cup.userData.noOcclude = true;
	}
	part(g, C(0.035, 0.04, 0.3, 8), new THREE.MeshLambertMaterial({ color: 0x2a5a2a, transparent: true, opacity: 0.8 }), 0.1, 0.04, -0.1, 0, r() * 6, Math.PI / 2);
	part(g, C(0.11, 0.1, 0.01, 12), lam(0xfdfdfb), -0.2, 0.006, 0.15).rotation.z = 0.04;
	return g;
}

// Rubble after the fire: charred chunks and a broken chair leg or two.
export function rubble(p) {
	const g = new THREE.Group();
	const r = rng(p.seed || 4);
	const char = lam(0x1e1a18), wood = lam(0x3a2a1e);
	for (let i = 0; i < 6; i++) {
		const m = part(g, S(), char, (r() - 0.5) * 0.9, 0.04, (r() - 0.5) * 0.9, r(), r(), r());
		m.scale.set(0.08 + r() * 0.1, 0.05 + r() * 0.06, 0.08 + r() * 0.1);
	}
	for (let i = 0; i < 2; i++) part(g, B(0.05, 0.05, 0.5), wood, (r() - 0.5) * 0.6, 0.03, (r() - 0.5) * 0.6, 0, r() * 6, 0);
	return g;
}

// The radio on its side table: a cream 1970s transistor set with a
// speaker grille, a lit dial and its aerial up.
const grilleTex = () => canvasTexture('grille', 128, 128, function (c, w, h) {
	c.fillStyle = '#5a4a3a';
	c.fillRect(0, 0, w, h);
	c.fillStyle = '#2a2018';
	for (let y = 6; y < h; y += 12) for (let x = 6; x < w; x += 12) { c.beginPath(); c.arc(x, y, 3.5, 0, Math.PI * 2); c.fill(); }
});
export function radio() {
	const g = new THREE.Group();
	const wood = lam(0x6a4a2a);
	part(g, C(0.3, 0.3, 0.03, 20), wood, 0, 0.7, 0);
	part(g, C(0.03, 0.04, 0.7, 8), wood, 0, 0.35, 0);
	part(g, C(0.2, 0.22, 0.03, 16), wood, 0, 0.015, 0);
	const set = new THREE.Group();
	set.position.y = 0.715;
	part(set, B(0.34, 0.2, 0.11), lam(0xe8dcc0), 0, 0.1, 0);
	part(set, P(0.17, 0.14), texLam('grille', grilleTex()), -0.07, 0.1, 0.056);
	part(set, P(0.1, 0.05), basic(0xffb84a), 0.1, 0.13, 0.056);
	part(set, C(0.022, 0.022, 0.02, 12), lam(0x3a3a3a), 0.1, 0.06, 0.06, Math.PI / 2);
	part(set, C(0.004, 0.004, 0.5, 4), lam(0xc8c8c8), 0.13, 0.42, -0.02, 0, 0, -0.35);
	part(set, B(0.24, 0.02, 0.02), lam(0x3a3a3a), 0, 0.215, 0);
	g.add(set);
	shadow(g, 0.7, 0.7, 0.5);
	return g;
}

// Everything by type, for the floor builder.
export const BUILDERS = {
	desk, chair, crt, keyboard, mug, papers, phone, partition, cabinet, cooler, plant, printer,
	pillar, bin, boxes, coatStand, wetSign, door, clock, poster, vent, exitSign, extinguisher,
	light: panel, hole, stain, figure, person,
	roundTable, banquetChair, buffet, drinks, cake, banner, balloons, portrait, lectern,
	ladder, discoBall, fire, smoke, litter, rubble, radio,
};
