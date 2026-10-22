/*
 * Loop Island: the track. One long ribbon laid out a metre at a time as the
 * pack runs along it, from a string of pieces picked at random: straights,
 * banked turns, hills, loop-the-loops, corkscrews and helixes. Each piece
 * sets the heading, pitch and roll along its length, easing in and out so
 * the joins are smooth, and the ribbon's frame at every metre is kept.
 *
 *   const track = createTrack();
 *   track.ensure(s);                 // lay it at least this far
 *   track.at(s, x, y, out)           // a point: s along, x across, y up
 *   track.frame(s, pos, quat)        // the frame there
 *   track.samples[i]                 // { pos, quat, right, up, fwd, kind }
 */
import * as THREE from '../../lib/three/three.module.min.js';

export const STEP = 1;               // metres between samples
export const HALF = 4.4;             // the road's half width
export const LANES = [-2.75, 0, 2.75];

const TAU = Math.PI * 2;
const smooth = (t) => t * t * (3 - 2 * t);
const bump = (t) => Math.pow(Math.sin(Math.PI * t), 2);     // 0 → 1 → 0, flat at both ends
const ease = (t) => t - Math.sin(TAU * t) / TAU;            // 0 → 1, flat at both ends

const ALT = { start: 28, lo: 22, hi: 48 };

export function createTrack() {

	const samples = [];
	let yaw0 = 0;               // the heading the current piece started from
	let seg = null;
	let segAt = 0;              // metres into the current piece
	let made = 0;               // pieces laid so far
	let lastKind = '';
	const pos = new THREE.Vector3(0, ALT.start, 0);
	const euler = new THREE.Euler(0, 0, 0, 'YXZ');
	const flat = new THREE.Vector3();

	const rand = (a, b) => a + Math.random() * (b - a);
	const pick = (list) => list[Math.floor(Math.random() * list.length)];

	// Turn back toward the way the track set off, so it never coils round on itself.
	const turnDir = () => (yaw0 > 0.7 ? -1 : yaw0 < -0.7 ? 1 : Math.random() < 0.5 ? -1 : 1);

	function nextPiece() {
		made++;
		const alt = pos.y;
		const yaw = yaw0;
		// the first stretch is straight and level (the start line, and room to get going)
		if (made === 1) return { kind: 'straight', len: 260 };
		// a straight between the big pieces
		const big = ['loop', 'corkscrew', 'helix'];
		if (big.includes(lastKind) || Math.random() < 0.25) return { kind: 'straight', len: rand(70, 140) };

		const options = ['turn', 'turn', 'hill', 'waves', 'loop', 'corkscrew', 'helix', 'turn'];
		let kind = pick(options);
		if (kind === lastKind && kind !== 'turn') kind = 'turn';
		// out of the height band? head back into it first
		if (alt < ALT.lo + 4 || alt > ALT.hi - 6) kind = 'hill';

		if (kind === 'turn') {
			const dir = turnDir();
			const angle = rand(0.8, 2.0);
			const len = angle * rand(55, 80);
			return { kind, len, yaw: (t) => yaw + dir * angle * smooth(t), roll: (t) => dir * 0.55 * bump(t) };
		}
		if (kind === 'hill') {
			const len = rand(140, 220);
			const target = alt < ALT.lo + 4 ? rand(32, 40) : alt > ALT.hi - 6 ? rand(26, 32) : rand(ALT.lo + 4, ALT.hi - 8);
			const amp = Math.max(-0.4, Math.min(0.4, Math.asin(Math.max(-0.9, Math.min(0.9, (target - alt) / (0.5 * len))))));
			return { kind, len, pitch: (t) => amp * bump(t) };
		}
		if (kind === 'waves') {
			const len = rand(160, 240);
			const amp = rand(0.16, 0.26);
			return { kind, len, pitch: (t) => amp * Math.sin(TAU * 2 * t) * bump(t) * 1.4 };
		}
		if (kind === 'loop') {
			const r = rand(15, 19);
			const shift = (Math.random() < 0.5 ? -1 : 1) * 11;   // sideways, so the way out clears the way in
			return { kind, len: TAU * r * 1.25, pitch: (t) => TAU * ease(t), side: (t) => shift * smooth(t) };
		}
		if (kind === 'corkscrew') {
			const dir = Math.random() < 0.5 ? -1 : 1;
			const turns = Math.random() < 0.3 ? 2 : 1;
			const len = rand(120, 160) * turns;
			const bend = (Math.random() < 0.5 ? -1 : 1) * rand(0, 0.6);
			return { kind, len, roll: (t) => dir * TAU * turns * ease(t), yaw: (t) => yaw + bend * smooth(t) };
		}
		// a helix: once right round, banked hard and climbing (or dropping) a storey
		const dir = turnDir();
		const r = rand(34, 44);
		const climb = alt > (ALT.lo + ALT.hi) / 2 ? -1 : 1;
		const len = TAU * r;
		return { kind: 'helix', len, yaw: (t) => yaw + dir * TAU * smooth(t), roll: (t) => dir * 0.75 * bump(t), pitch: (t) => climb * 0.16 * bump(t) };
	}

	// One more metre.
	function lay() {
		if (!seg || segAt >= seg.len) {
			if (seg) {
				yaw0 = seg.yaw ? seg.yaw(1) : yaw0;
				lastKind = seg.kind;
			}
			seg = nextPiece();
			segAt = 0;
		}
		const t0 = segAt / seg.len;
		segAt = Math.min(seg.len, segAt + STEP);
		const t = segAt / seg.len;
		const yaw = seg.yaw ? seg.yaw(t) : yaw0;
		euler.set(seg.pitch ? seg.pitch(t) : 0, yaw, seg.roll ? seg.roll(t) : 0, 'YXZ');
		const quat = new THREE.Quaternion().setFromEuler(euler);
		const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
		const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
		const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
		pos.addScaledVector(fwd, STEP);
		if (seg.side) {
			flat.set(Math.cos(yaw), 0, -Math.sin(yaw));   // across, level, whatever the pitch and roll
			pos.addScaledVector(flat, seg.side(t) - seg.side(t0));
		}
		samples.push({ pos: pos.clone(), quat, fwd, right, up, kind: seg.kind });
	}

	// the first sample, at the start
	samples.push({
		pos: pos.clone(), quat: new THREE.Quaternion(), kind: 'straight',
		fwd: new THREE.Vector3(0, 0, -1), right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0),
	});

	const track = { samples };

	track.ensure = function (s) {
		while ((samples.length - 1) * STEP < s) lay();
	};

	const qa = new THREE.Quaternion();
	track.frame = function (s, outPos, outQuat) {
		track.ensure(s + STEP * 2);
		const f = Math.max(0, s / STEP);
		const i = Math.floor(f);
		const k = f - i;
		const a = samples[i];
		const b = samples[i + 1];
		if (outPos) outPos.lerpVectors(a.pos, b.pos, k);
		if (outQuat) outQuat.slerpQuaternions(a.quat, b.quat, k);
		return outQuat;
	};

	const fp = new THREE.Vector3();
	track.at = function (s, x, y, out) {
		track.frame(s, fp, qa);
		out.set(x, y, 0).applyQuaternion(qa).add(fp);
		return out;
	};

	track.kindAt = function (s) {
		track.ensure(s + STEP);
		return samples[Math.max(0, Math.floor(s / STEP))].kind;
	};

	return track;
}

/*
 * Geometry swept along the track: profile pieces [x0, y0, x1, y1, u0, u1],
 * each a strip of its own (so its edges stay crisp), across samples i0..i1.
 * v runs along the track, one unit every vLen metres.
 */
export function sweep(samples, i0, i1, pieces, vLen) {
	const pos = [];
	const nor = [];
	const uv = [];
	const idx = [];
	const p = new THREE.Vector3();
	const n = new THREE.Vector3();
	for (const [x0, y0, x1, y1, u0, u1] of pieces) {
		const base = pos.length / 3;
		const dx = x1 - x0;
		const dy = y1 - y0;
		const len = Math.hypot(dx, dy) || 1;
		const nx = -dy / len;
		const ny = dx / len;
		for (let i = i0; i <= i1; i++) {
			const s = samples[i];
			const v = i * STEP / vLen;
			for (const [x, y, u] of [[x0, y0, u0], [x1, y1, u1]]) {
				p.copy(s.pos).addScaledVector(s.right, x).addScaledVector(s.up, y);
				n.copy(s.right).multiplyScalar(nx).addScaledVector(s.up, ny);
				pos.push(p.x, p.y, p.z);
				nor.push(n.x, n.y, n.z);
				uv.push(u, v);
			}
		}
		for (let i = 0; i < i1 - i0; i++) {
			const a = base + i * 2;
			idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeBoundingSphere();
	return g;
}
