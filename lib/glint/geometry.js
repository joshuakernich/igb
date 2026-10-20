/*
 * Glint: geometry. Buffers of vertex attributes (position, normal, uv,
 * colour...) with an optional index, plus builders for the usual shapes:
 * box, sphere, cylinder, cone, capsule, torus, circle, ring, plane,
 * icosahedron, lathe and tube. Their axes and UVs follow the common
 * conventions: cylinders and cones stand along y (cones point up), circles
 * and planes face +z, a torus lies in the xy plane.
 */
import { Vector2, Vector3, Matrix4, Quaternion, Sphere, TAU } from './math.js';
import { EventDispatcher } from './core.js';

/* ---------- attributes ---------- */

export class BufferAttribute {
	constructor(array, itemSize, normalized = false) {
		this.array = array;
		this.itemSize = itemSize;
		this.normalized = normalized;
		this.version = 0;
		this.dynamic = false;
	}
	get isBufferAttribute() { return true; }
	get count() { return this.array.length / this.itemSize; }
	set needsUpdate(v) { if (v) this.version++; }
	setUsage(dynamic) { this.dynamic = !!dynamic; return this; }
	getX(i) { return this.array[i * this.itemSize]; }
	getY(i) { return this.array[i * this.itemSize + 1]; }
	getZ(i) { return this.array[i * this.itemSize + 2]; }
	getW(i) { return this.array[i * this.itemSize + 3]; }
	setX(i, v) { this.array[i * this.itemSize] = v; return this; }
	setY(i, v) { this.array[i * this.itemSize + 1] = v; return this; }
	setZ(i, v) { this.array[i * this.itemSize + 2] = v; return this; }
	setW(i, v) { this.array[i * this.itemSize + 3] = v; return this; }
	setXY(i, x, y) { const o = i * this.itemSize; this.array[o] = x; this.array[o + 1] = y; return this; }
	setXYZ(i, x, y, z) { const o = i * this.itemSize; this.array[o] = x; this.array[o + 1] = y; this.array[o + 2] = z; return this; }
	setXYZW(i, x, y, z, w) { const o = i * this.itemSize; this.array[o] = x; this.array[o + 1] = y; this.array[o + 2] = z; this.array[o + 3] = w; return this; }
	clone() { return new this.constructor(this.array.slice(), this.itemSize, this.normalized); }
}
export class Float32BufferAttribute extends BufferAttribute {
	constructor(a, itemSize, normalized) { super(a instanceof Float32Array ? a : new Float32Array(a), itemSize, normalized); }
}
export class Uint16BufferAttribute extends BufferAttribute {
	constructor(a, itemSize) { super(a instanceof Uint16Array ? a : new Uint16Array(a), itemSize); }
}
export class Uint32BufferAttribute extends BufferAttribute {
	constructor(a, itemSize) { super(a instanceof Uint32Array ? a : new Uint32Array(a), itemSize); }
}

/* ---------- BufferGeometry ---------- */

let geoId = 0;
const _m = new Matrix4(), _q = new Quaternion(), _v = new Vector3();

export class BufferGeometry extends EventDispatcher {
	constructor() {
		super();
		this.id = geoId++;
		this.type = 'BufferGeometry';
		this.parameters = {};   // builders record what they were made with
		this.attributes = {};
		this.index = null;
		this.groups = [];             // { start, count, materialIndex } for meshes with several materials
		this.drawRange = { start: 0, count: Infinity };
		this.boundingSphere = null;
		this.userData = {};
	}
	get isBufferGeometry() { return true; }
	setAttribute(name, a) { this.attributes[name] = a; if (name === 'position') this.boundingSphere = null; return this; }
	getAttribute(name) { return this.attributes[name]; }
	deleteAttribute(name) { delete this.attributes[name]; return this; }
	hasAttribute(name) { return name in this.attributes; }
	setIndex(i) {
		if (Array.isArray(i)) {
			let max = 0;
			for (const v of i) if (v > max) max = v;
			i = max > 65535 ? new Uint32BufferAttribute(i, 1) : new Uint16BufferAttribute(i, 1);
		}
		this.index = i;
		return this;
	}
	addGroup(start, count, materialIndex = 0) { this.groups.push({ start, count, materialIndex }); }
	clearGroups() { this.groups = []; }
	setDrawRange(start, count) { this.drawRange.start = start; this.drawRange.count = count; }

	applyMatrix4(m) {
		const p = this.attributes.position;
		if (p) { for (let i = 0; i < p.count; i++) { _v.fromArray(p.array, i * 3).applyMatrix4(m); p.setXYZ(i, _v.x, _v.y, _v.z); } p.needsUpdate = true; }
		const n = this.attributes.normal;
		if (n) {
			// (the inverse transpose, for normals under non-uniform scale)
			const nm = new Matrix4().copy(m).invert();
			const e = nm.elements;
			for (let i = 0; i < n.count; i++) {
				const x = n.getX(i), y = n.getY(i), z = n.getZ(i);
				_v.set(e[0] * x + e[1] * y + e[2] * z, e[4] * x + e[5] * y + e[6] * z, e[8] * x + e[9] * y + e[10] * z).normalize();
				n.setXYZ(i, _v.x, _v.y, _v.z);
			}
			n.needsUpdate = true;
		}
		this.boundingSphere = null;
		return this;
	}
	applyQuaternion(q) { return this.applyMatrix4(_m.makeRotationFromQuaternion(q)); }
	translate(x, y, z) { return this.applyMatrix4(_m.makeTranslation(x, y, z)); }
	scale(x, y, z) { return this.applyMatrix4(_m.makeScale(x, y, z)); }
	rotateX(a) { return this.applyQuaternion(_q.setFromAxisAngle(_v.set(1, 0, 0), a)); }
	rotateY(a) { return this.applyQuaternion(_q.setFromAxisAngle(_v.set(0, 1, 0), a)); }
	rotateZ(a) { return this.applyQuaternion(_q.setFromAxisAngle(_v.set(0, 0, 1), a)); }
	center() {
		this.computeBoundingBox();
		const b = this.boundingBox;
		return this.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -(b.min.z + b.max.z) / 2);
	}

	computeBoundingBox() {
		const p = this.attributes.position;
		const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity);
		for (let i = 0; i < p.count; i++) { _v.fromArray(p.array, i * 3); min.min(_v); max.max(_v); }
		this.boundingBox = { min, max };
		return this.boundingBox;
	}
	computeBoundingSphere() {
		const p = this.attributes.position;
		if (!p || p.count === 0) { this.boundingSphere = new Sphere(new Vector3(), 0); return this.boundingSphere; }
		const b = this.computeBoundingBox();
		const c = new Vector3().addVectors(b.min, b.max).multiplyScalar(0.5);
		let r2 = 0;
		for (let i = 0; i < p.count; i++) r2 = Math.max(r2, c.distanceToSquared(_v.fromArray(p.array, i * 3)));
		this.boundingSphere = new Sphere(c, Math.sqrt(r2));
		return this.boundingSphere;
	}

	// Smooth normals: each vertex gets the area-weighted average of its faces.
	computeVertexNormals() {
		const p = this.attributes.position;
		let n = this.attributes.normal;
		if (!n || n.count !== p.count) { n = new Float32BufferAttribute(new Float32Array(p.count * 3), 3); this.setAttribute('normal', n); }
		else n.array.fill(0);
		const a = new Vector3(), b = new Vector3(), c = new Vector3(), cb = new Vector3(), ab = new Vector3();
		const tri = (i0, i1, i2) => {
			a.fromArray(p.array, i0 * 3); b.fromArray(p.array, i1 * 3); c.fromArray(p.array, i2 * 3);
			cb.subVectors(c, b); ab.subVectors(a, b); cb.cross(ab);
			for (const i of [i0, i1, i2]) { n.array[i * 3] += cb.x; n.array[i * 3 + 1] += cb.y; n.array[i * 3 + 2] += cb.z; }
		};
		if (this.index) { const ix = this.index.array; for (let i = 0; i < ix.length; i += 3) tri(ix[i], ix[i + 1], ix[i + 2]); }
		else for (let i = 0; i < p.count; i += 3) tri(i, i + 1, i + 2);
		for (let i = 0; i < n.count; i++) {
			_v.fromArray(n.array, i * 3).normalize();
			n.setXYZ(i, _v.x, _v.y, _v.z);
		}
		n.needsUpdate = true;
		return this;
	}

	toNonIndexed() {
		if (!this.index) return this.clone();
		const g = new BufferGeometry();
		const ix = this.index.array;
		for (const [name, a] of Object.entries(this.attributes)) {
			const out = new a.array.constructor(ix.length * a.itemSize);
			for (let i = 0; i < ix.length; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.array[ix[i] * a.itemSize + k];
			g.setAttribute(name, new BufferAttribute(out, a.itemSize, a.normalized));
		}
		g.groups = this.groups.map((x) => ({ ...x }));
		return g;
	}
	clone() {
		const g = new BufferGeometry();
		for (const [name, a] of Object.entries(this.attributes)) g.setAttribute(name, a.clone());
		if (this.index) g.index = this.index.clone();
		g.groups = this.groups.map((x) => ({ ...x }));
		return g;
	}
	dispose() { this.dispatchEvent({ type: 'dispose' }); }
}

// One geometry from several (they need the same attributes). Groups are
// made per source when useGroups is set, so each can keep its own material.
export function mergeGeometries(list, useGroups = false) {
	const out = new BufferGeometry();
	const names = Object.keys(list[0].attributes);
	const parts = list.map((g) => (g.index ? g : g));
	let vCount = 0, iCount = 0;
	for (const g of parts) { vCount += g.attributes.position.count; iCount += g.index ? g.index.count : g.attributes.position.count; }
	for (const name of names) {
		const a0 = list[0].attributes[name];
		const arr = new Float32Array(vCount * a0.itemSize);
		let o = 0;
		for (const g of parts) { const a = g.attributes[name]; if (!a) throw new Error('mergeGeometries: missing ' + name); arr.set(a.array, o); o += a.array.length; }
		out.setAttribute(name, new BufferAttribute(arr, a0.itemSize, a0.normalized));
	}
	const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
	let base = 0, io = 0;
	parts.forEach((g, gi) => {
		const n = g.index ? g.index.count : g.attributes.position.count;
		const start = io;
		if (g.index) for (let i = 0; i < n; i++) idx[io++] = g.index.array[i] + base;
		else for (let i = 0; i < n; i++) idx[io++] = i + base;
		if (useGroups) out.addGroup(start, n, gi);
		base += g.attributes.position.count;
	});
	out.setIndex(new BufferAttribute(idx, 1));
	return out;
}

/* ---------- builders ---------- */

function build(pos, nor, uv, idx) {
	const g = new BufferGeometry();
	g.setAttribute('position', new Float32BufferAttribute(pos, 3));
	if (nor) g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
	if (uv) g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
	if (idx) g.setIndex(idx);
	return g;
}

export class BoxGeometry extends BufferGeometry {
	constructor(width = 1, height = 1, depth = 1, ws = 1, hs = 1, ds = 1) {
		super();
		const pos = [], nor = [], uv = [], idx = [];
		let start = 0;
		// one face: axes u, v along it, w out of it
		const face = (u, v, w, udir, vdir, wdir, fw, fh, fd, gx, gy, mat) => {
			const base = pos.length / 3;
			for (let iy = 0; iy <= gy; iy++) {
				const y = iy * fh / gy - fh / 2;
				for (let ix = 0; ix <= gx; ix++) {
					const x = ix * fw / gx - fw / 2;
					const p = [0, 0, 0], n = [0, 0, 0];
					p[u] = x * udir; p[v] = y * vdir; p[w] = fd / 2;
					n[w] = fd > 0 ? 1 : -1;
					pos.push(...p); nor.push(...n);
					uv.push(ix / gx, 1 - iy / gy);
				}
			}
			for (let iy = 0; iy < gy; iy++) for (let ix = 0; ix < gx; ix++) {
				const a = base + ix + (gx + 1) * iy, b = base + ix + (gx + 1) * (iy + 1), c = base + ix + 1 + (gx + 1) * (iy + 1), d = base + ix + 1 + (gx + 1) * iy;
				idx.push(a, b, d, b, c, d);
			}
			const count = gx * gy * 6;
			this.addGroup(start, count, mat);
			start += count;
		};
		// +x, -x, +y, -y, +z, -z (material indices 0..5)
		face(2, 1, 0, -1, -1, 1, depth, height, width, ds, hs, 0);
		face(2, 1, 0, 1, -1, 1, depth, height, -width, ds, hs, 1);
		face(0, 2, 1, 1, 1, 1, width, depth, height, ws, ds, 2);
		face(0, 2, 1, 1, -1, 1, width, depth, -height, ws, ds, 3);
		face(0, 1, 2, 1, -1, 1, width, height, depth, ws, hs, 4);
		face(0, 1, 2, -1, -1, 1, width, height, -depth, ws, hs, 5);
		this.setAttribute('position', new Float32BufferAttribute(pos, 3));
		this.setAttribute('normal', new Float32BufferAttribute(nor, 3));
		this.setAttribute('uv', new Float32BufferAttribute(uv, 2));
		this.setIndex(idx);
		this.type = 'BoxGeometry';
		this.parameters = { width, height, depth, widthSegments: ws, heightSegments: hs, depthSegments: ds };
	}
}

export class PlaneGeometry extends BufferGeometry {
	constructor(width = 1, height = 1, ws = 1, hs = 1) {
		super();
		const pos = [], nor = [], uv = [], idx = [];
		for (let iy = 0; iy <= hs; iy++) {
			const y = height / 2 - iy * height / hs;
			for (let ix = 0; ix <= ws; ix++) {
				pos.push(ix * width / ws - width / 2, y, 0);
				nor.push(0, 0, 1);
				uv.push(ix / ws, 1 - iy / hs);
			}
		}
		for (let iy = 0; iy < hs; iy++) for (let ix = 0; ix < ws; ix++) {
			const a = ix + (ws + 1) * iy, b = ix + (ws + 1) * (iy + 1), c = ix + 1 + (ws + 1) * (iy + 1), d = ix + 1 + (ws + 1) * iy;
			idx.push(a, b, d, b, c, d);
		}
		Object.assign(this, build(pos, nor, uv, idx), { id: this.id });
		this.type = 'PlaneGeometry';
		this.parameters = { width, height, widthSegments: ws, heightSegments: hs };
	}
}

export class CircleGeometry extends BufferGeometry {
	constructor(radius = 1, segments = 32, thetaStart = 0, thetaLength = TAU) {
		super();
		const pos = [0, 0, 0], nor = [0, 0, 1], uv = [0.5, 0.5], idx = [];
		for (let i = 0; i <= segments; i++) {
			const a = thetaStart + i / segments * thetaLength;
			const x = Math.cos(a), y = Math.sin(a);
			pos.push(radius * x, radius * y, 0);
			nor.push(0, 0, 1);
			uv.push((x + 1) / 2, (y + 1) / 2);
		}
		for (let i = 1; i <= segments; i++) idx.push(i, i + 1, 0);
		Object.assign(this, build(pos, nor, uv, idx), { id: this.id });
		this.type = 'CircleGeometry';
		this.parameters = { radius, segments, thetaStart, thetaLength };
	}
}

export class RingGeometry extends BufferGeometry {
	constructor(inner = 0.5, outer = 1, segments = 32, thetaStart = 0, thetaLength = TAU) {
		super();
		const pos = [], nor = [], uv = [], idx = [];
		for (let j = 0; j <= 1; j++) {
			const r = j ? outer : inner;
			for (let i = 0; i <= segments; i++) {
				const a = thetaStart + i / segments * thetaLength;
				const x = r * Math.cos(a), y = r * Math.sin(a);
				pos.push(x, y, 0);
				nor.push(0, 0, 1);
				uv.push((x / outer + 1) / 2, (y / outer + 1) / 2);
			}
		}
		for (let i = 0; i < segments; i++) {
			const a = i, b = i + segments + 1, c = i + segments + 2, d = i + 1;
			idx.push(a, b, d, b, c, d);
		}
		Object.assign(this, build(pos, nor, uv, idx), { id: this.id });
		this.type = 'RingGeometry';
		this.parameters = { innerRadius: inner, outerRadius: outer, thetaSegments: segments, thetaStart, thetaLength };
	}
}

export class SphereGeometry extends BufferGeometry {
	constructor(radius = 1, ws = 32, hs = 16, phiStart = 0, phiLength = TAU, thetaStart = 0, thetaLength = Math.PI) {
		super();
		const pos = [], nor = [], uv = [], idx = [], grid = [];
		const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI);
		for (let iy = 0; iy <= hs; iy++) {
			const row = [];
			const v = iy / hs;
			let uOff = 0;
			if (iy === 0 && thetaStart === 0) uOff = 0.5 / ws;
			else if (iy === hs && thetaEnd === Math.PI) uOff = -0.5 / ws;
			for (let ix = 0; ix <= ws; ix++) {
				const u = ix / ws;
				const phi = phiStart + u * phiLength, theta = thetaStart + v * thetaLength;
				const x = -Math.cos(phi) * Math.sin(theta), y = Math.cos(theta), z = Math.sin(phi) * Math.sin(theta);
				pos.push(radius * x, radius * y, radius * z);
				nor.push(x, y, z);
				uv.push(u + uOff, 1 - v);
				row.push(pos.length / 3 - 1);
			}
			grid.push(row);
		}
		for (let iy = 0; iy < hs; iy++) for (let ix = 0; ix < ws; ix++) {
			const a = grid[iy][ix + 1], b = grid[iy][ix], c = grid[iy + 1][ix], d = grid[iy + 1][ix + 1];
			if (iy !== 0 || thetaStart > 0) idx.push(a, b, d);
			if (iy !== hs - 1 || thetaEnd < Math.PI) idx.push(b, c, d);
		}
		Object.assign(this, build(pos, nor, uv, idx), { id: this.id });
		this.type = 'SphereGeometry';
		this.parameters = { radius, widthSegments: ws, heightSegments: hs, phiStart, phiLength, thetaStart, thetaLength };
	}
}

export class CylinderGeometry extends BufferGeometry {
	constructor(radiusTop = 1, radiusBottom = 1, height = 1, radialSegments = 32, heightSegments = 1, openEnded = false, thetaStart = 0, thetaLength = TAU) {
		super();
		const pos = [], nor = [], uv = [], idx = [];
		const half = height / 2;
		const slope = (radiusBottom - radiusTop) / height;
		const rows = [];
		for (let y = 0; y <= heightSegments; y++) {
			const row = [];
			const v = y / heightSegments;
			const r = v * (radiusBottom - radiusTop) + radiusTop;
			for (let x = 0; x <= radialSegments; x++) {
				const u = x / radialSegments;
				const theta = u * thetaLength + thetaStart;
				const s = Math.sin(theta), c = Math.cos(theta);
				pos.push(r * s, -v * height + half, r * c);
				const n = new Vector3(s, slope, c).normalize();
				nor.push(n.x, n.y, n.z);
				uv.push(u, 1 - v);
				row.push(pos.length / 3 - 1);
			}
			rows.push(row);
		}
		for (let x = 0; x < radialSegments; x++) for (let y = 0; y < heightSegments; y++) {
			const a = rows[y][x], b = rows[y + 1][x], c = rows[y + 1][x + 1], d = rows[y][x + 1];
			if (radiusTop > 0 || y !== 0) idx.push(a, b, d);
			if (radiusBottom > 0 || y !== heightSegments - 1) idx.push(b, c, d);
		}
		this.groups.push({ start: 0, count: idx.length, materialIndex: 0 });
		const cap = (top) => {
			const r = top ? radiusTop : radiusBottom;
			if (r <= 0) return;
			const sign = top ? 1 : -1;
			const start = idx.length;
			const centre = pos.length / 3;
			for (let x = 1; x <= radialSegments; x++) { pos.push(0, half * sign, 0); nor.push(0, sign, 0); uv.push(0.5, 0.5); }
			const ring = pos.length / 3;
			for (let x = 0; x <= radialSegments; x++) {
				const theta = x / radialSegments * thetaLength + thetaStart;
				const s = Math.sin(theta), c = Math.cos(theta);
				pos.push(r * s, half * sign, r * c);
				nor.push(0, sign, 0);
				uv.push(c * 0.5 + 0.5, s * 0.5 * sign + 0.5);
			}
			for (let x = 0; x < radialSegments; x++) {
				const cI = centre + x, i = ring + x;
				if (top) idx.push(i, i + 1, cI); else idx.push(i + 1, i, cI);
			}
			this.groups.push({ start, count: idx.length - start, materialIndex: top ? 1 : 2 });
		};
		if (!openEnded) { cap(true); cap(false); }
		const g = build(pos, nor, uv, idx);
		this.attributes = g.attributes;
		this.index = g.index;
		this.type = 'CylinderGeometry';
		this.parameters = { radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength };
	}
}

export class ConeGeometry extends CylinderGeometry {
	constructor(radius = 1, height = 1, radialSegments = 32, heightSegments = 1, openEnded = false, thetaStart = 0, thetaLength = TAU) {
		super(0, radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength);
		this.type = 'ConeGeometry';
		this.parameters = { radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength };
	}
}

// A surface of revolution about y, from profile points (x is the radius).
// Normals come from the profile itself, so the seam stays smooth.
export class LatheGeometry extends BufferGeometry {
	constructor(points = [new Vector2(0, -0.5), new Vector2(0.5, 0), new Vector2(0, 0.5)], segments = 12, phiStart = 0, phiLength = TAU) {
		super();
		const pos = [], nor = [], uv = [], idx = [];
		const n = points.length;
		// profile normals: averaged from the segments either side
		const pn = [];
		for (let j = 0; j < n; j++) {
			const a = points[Math.max(0, j - 1)], b = points[Math.min(n - 1, j + 1)];
			let dx = b.x - a.x, dy = b.y - a.y;
			const l = Math.hypot(dx, dy) || 1;
			pn.push([dy / l, -dx / l]);
		}
		// along the profile, v by distance
		const lens = [0];
		for (let j = 1; j < n; j++) lens.push(lens[j - 1] + Math.hypot(points[j].x - points[j - 1].x, points[j].y - points[j - 1].y));
		const total = lens[n - 1] || 1;
		for (let i = 0; i <= segments; i++) {
			const phi = phiStart + i / segments * phiLength;
			const s = Math.sin(phi), c = Math.cos(phi);
			for (let j = 0; j < n; j++) {
				pos.push(points[j].x * s, points[j].y, points[j].x * c);
				nor.push(pn[j][0] * s, pn[j][1], pn[j][0] * c);
				uv.push(i / segments, lens[j] / total);
			}
		}
		for (let i = 0; i < segments; i++) for (let j = 0; j < n - 1; j++) {
			const a = i * n + j, b = a + n, c = a + n + 1, d = a + 1;
			idx.push(a, b, d, c, d, b);
		}
		Object.assign(this, build(pos, nor, uv, idx), { id: this.id });
		this.type = 'LatheGeometry';
		this.parameters = { points, segments, phiStart, phiLength };
	}
}

// A pill along y: a cylinder of length `length` with hemispheres on the ends.
export class CapsuleGeometry extends LatheGeometry {
	constructor(radius = 1, length = 1, capSegments = 4, radialSegments = 8) {
		const pts = [];
		for (let i = 0; i <= capSegments; i++) {
			const a = -Math.PI / 2 + i / capSegments * Math.PI / 2;
			pts.push(new Vector2(Math.cos(a) * radius, Math.sin(a) * radius - length / 2));
		}
		for (let i = 0; i <= capSegments; i++) {
			const a = i / capSegments * Math.PI / 2;
			pts.push(new Vector2(Math.cos(a) * radius, Math.sin(a) * radius + length / 2));
		}
		pts[0].x = 0;
		pts[pts.length - 1].x = 0;
		super(pts, radialSegments);
		this.type = 'CapsuleGeometry';
		this.parameters = { radius, length, capSegments, radialSegments };
	}
}

export class TorusGeometry extends BufferGeometry {
	constructor(radius = 1, tube = 0.4, radialSegments = 12, tubularSegments = 48, arc = TAU) {
		super();
		const pos = [], nor = [], uv = [], idx = [];
		for (let j = 0; j <= radialSegments; j++) for (let i = 0; i <= tubularSegments; i++) {
			const u = i / tubularSegments * arc, v = j / radialSegments * TAU;
			const cx = radius * Math.cos(u), cy = radius * Math.sin(u);
			const x = (radius + tube * Math.cos(v)) * Math.cos(u), y = (radius + tube * Math.cos(v)) * Math.sin(u), z = tube * Math.sin(v);
			pos.push(x, y, z);
			const n = new Vector3(x - cx, y - cy, z).normalize();
			nor.push(n.x, n.y, n.z);
			uv.push(i / tubularSegments, j / radialSegments);
		}
		for (let j = 1; j <= radialSegments; j++) for (let i = 1; i <= tubularSegments; i++) {
			const a = (tubularSegments + 1) * j + i - 1, b = (tubularSegments + 1) * (j - 1) + i - 1, c = (tubularSegments + 1) * (j - 1) + i, d = (tubularSegments + 1) * j + i;
			idx.push(a, b, d, b, c, d);
		}
		Object.assign(this, build(pos, nor, uv, idx), { id: this.id });
		this.type = 'TorusGeometry';
		this.parameters = { radius, tube, radialSegments, tubularSegments, arc };
	}
}

// A tube along a curve (anything with getPoint(t)), framed by parallel transport.
export class TubeGeometry extends BufferGeometry {
	constructor(curve, tubularSegments = 64, radius = 1, radialSegments = 8, closed = false) {
		super();
		const pos = [], nor = [], uv = [], idx = [];
		const P = [], T = [];
		for (let i = 0; i <= tubularSegments; i++) {
			const t = i / tubularSegments;
			P.push(curve.getPoint(t, new Vector3()));
			T.push(curve.getTangent ? curve.getTangent(t, new Vector3()) : null);
		}
		for (let i = 0; i <= tubularSegments; i++) if (!T[i]) T[i] = new Vector3().subVectors(P[Math.min(tubularSegments, i + 1)], P[Math.max(0, i - 1)]).normalize();
		// a first normal square to the first tangent, then carried along
		const t0 = T[0];
		let nrm = Math.abs(t0.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
		nrm = new Vector3().crossVectors(t0, nrm).cross(t0).normalize();
		const N = [nrm.clone()], B = [new Vector3().crossVectors(t0, nrm).normalize()];
		const q = new Quaternion();
		for (let i = 1; i <= tubularSegments; i++) {
			q.setFromUnitVectors(T[i - 1], T[i]);
			const n = N[i - 1].clone().applyQuaternion(q).normalize();
			N.push(n);
			B.push(new Vector3().crossVectors(T[i], n).normalize());
		}
		for (let i = 0; i <= tubularSegments; i++) for (let j = 0; j <= radialSegments; j++) {
			const v = j / radialSegments * TAU;
			const s = Math.sin(v), c = -Math.cos(v);
			const n = new Vector3().copy(N[i]).multiplyScalar(c).addScaledVector(B[i], s).normalize();
			pos.push(P[i].x + radius * n.x, P[i].y + radius * n.y, P[i].z + radius * n.z);
			nor.push(n.x, n.y, n.z);
			uv.push(i / tubularSegments, j / radialSegments);
		}
		for (let j = 1; j <= tubularSegments; j++) for (let i = 1; i <= radialSegments; i++) {
			const a = (radialSegments + 1) * (j - 1) + (i - 1), b = (radialSegments + 1) * j + (i - 1), c = (radialSegments + 1) * j + i, d = (radialSegments + 1) * (j - 1) + i;
			idx.push(a, b, d, b, c, d);
		}
		Object.assign(this, build(pos, nor, uv, idx), { id: this.id });
		this.type = 'TubeGeometry';
		this.parameters = { path: curve, tubularSegments, radius, radialSegments, closed };
	}
}

// A polyhedron from unit vertices and triangles, pushed out onto a sphere
// of radius r. detail 0 keeps the flat faces; more detail rounds it off.
export class PolyhedronGeometry extends BufferGeometry {
	constructor(vertices = [], indices = [], radius = 1, detail = 0) {
		super();
		const V = [];
		for (let i = 0; i < vertices.length; i += 3) V.push(new Vector3(vertices[i], vertices[i + 1], vertices[i + 2]).normalize());
		const pos = [];
		const n = detail + 1;
		for (let f = 0; f < indices.length; f += 3) {
			const a = V[indices[f]], b = V[indices[f + 1]], c = V[indices[f + 2]];
			// split the face into n*n little triangles; with detail, push them out onto the sphere
			const at = (i, j) => {
				const p = new Vector3().copy(a).multiplyScalar((n - i - j) / n).addScaledVector(b, i / n).addScaledVector(c, j / n);
				return detail > 0 ? p.normalize() : p;
			};
			for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) {
				for (const p of [at(i, j), at(i + 1, j), at(i, j + 1)]) pos.push(p.x * radius, p.y * radius, p.z * radius);
				if (i + j < n - 1) for (const p of [at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]) pos.push(p.x * radius, p.y * radius, p.z * radius);
			}
		}
		this.setAttribute('position', new Float32BufferAttribute(pos, 3));
		if (detail === 0) this.computeVertexNormals();   // (unindexed: flat faces)
		else {
			const nor = new Float32Array(pos.length);
			for (let i = 0; i < pos.length; i += 3) { _v.set(pos[i], pos[i + 1], pos[i + 2]).normalize(); nor[i] = _v.x; nor[i + 1] = _v.y; nor[i + 2] = _v.z; }
			this.setAttribute('normal', new Float32BufferAttribute(nor, 3));
		}
		const uv = new Float32Array(pos.length / 3 * 2);
		for (let i = 0; i < pos.length / 3; i++) {
			_v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).normalize();
			uv[i * 2] = Math.atan2(_v.z, -_v.x) / TAU + 0.5;
			uv[i * 2 + 1] = Math.asin(Math.max(-1, Math.min(1, _v.y))) / Math.PI + 0.5;
		}
		this.setAttribute('uv', new Float32BufferAttribute(uv, 2));
		this.type = 'PolyhedronGeometry';
		this.parameters = { vertices, indices, radius, detail };
	}
}

// A geodesic ball. detail 0 is a faceted icosahedron; more detail rounds it.
export class IcosahedronGeometry extends PolyhedronGeometry {
	constructor(radius = 1, detail = 0) {
		const t = (1 + Math.sqrt(5)) / 2;
		super([-1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0, 0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1],
			[0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1], radius, detail);
		this.type = 'IcosahedronGeometry';
		this.parameters = { radius, detail };
	}
}

export class DodecahedronGeometry extends PolyhedronGeometry {
	constructor(radius = 1, detail = 0) {
		const t = (1 + Math.sqrt(5)) / 2, r = 1 / t;
		super([
			-1, -1, -1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, -1, -1, 1, -1, 1, 1, 1, -1, 1, 1, 1,
			0, -r, -t, 0, -r, t, 0, r, -t, 0, r, t, -r, -t, 0, -r, t, 0, r, -t, 0, r, t, 0, -t, 0, -r, t, 0, -r, -t, 0, r, t, 0, r,
		], [
			3, 11, 7, 3, 7, 15, 3, 15, 13, 7, 19, 17, 7, 17, 6, 7, 6, 15, 17, 4, 8, 17, 8, 10, 17, 10, 6, 8, 0, 16, 8, 16, 2, 8, 2, 10,
			0, 12, 1, 0, 1, 18, 0, 18, 16, 6, 10, 2, 6, 2, 13, 6, 13, 15, 2, 16, 18, 2, 18, 3, 2, 3, 13, 18, 1, 9, 18, 9, 11, 18, 11, 3,
			4, 14, 12, 4, 12, 0, 4, 0, 8, 11, 9, 5, 11, 5, 19, 11, 19, 7, 19, 5, 14, 19, 14, 4, 19, 4, 17, 1, 12, 14, 1, 14, 5, 1, 5, 9,
		], radius, detail);
		this.type = 'DodecahedronGeometry';
		this.parameters = { radius, detail };
	}
}

export class OctahedronGeometry extends PolyhedronGeometry {
	constructor(radius = 1, detail = 0) {
		super([1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1], [0, 2, 4, 0, 4, 3, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 3, 1, 3, 4, 1, 4, 2], radius, detail);
		this.type = 'OctahedronGeometry';
		this.parameters = { radius, detail };
	}
}

export class TetrahedronGeometry extends PolyhedronGeometry {
	constructor(radius = 1, detail = 0) {
		super([1, 1, 1, -1, -1, 1, -1, 1, -1, 1, -1, -1], [2, 1, 0, 0, 3, 2, 1, 3, 0, 2, 3, 1], radius, detail);
		this.type = 'TetrahedronGeometry';
		this.parameters = { radius, detail };
	}
}

// A fresh geometry from flat arrays: geometryFrom({ position, normal, uv, color }, index).
export function geometryFrom(attrs, index) {
	const g = new BufferGeometry();
	const sizes = { position: 3, normal: 3, uv: 2, color: 3, color4: 4 };
	for (const [name, a] of Object.entries(attrs)) {
		const size = sizes[name] || 3;
		g.setAttribute(name === 'color4' ? 'color' : name, new Float32BufferAttribute(a, name === 'color4' ? 4 : size));
	}
	if (index) g.setIndex(index);
	if (!attrs.normal) g.computeVertexNormals();
	return g;
}
