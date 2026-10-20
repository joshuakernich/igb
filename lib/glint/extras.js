/*
 * Glint: extras for gamebox games.
 *
 *   createWallRig()     three cameras on one rig, one per wall, sharing one
 *                       orientation and one fixed field of view so the walls
 *                       meet seamlessly. Tilt or move the rig, never one camera.
 *   toScreen()          where a world point shows in a view (for 2D overlays).
 *   SkyDome             a sky from a GLSL function of direction; the same
 *                       function lights the scene (environment()).
 *   roomEnvironment()   a soft-boxed studio room, for lighting indoor scenes.
 */
import { Vector3, Color, DEG } from './math.js';
import { Group, Scene, Mesh, PerspectiveCamera, BackSide } from './core.js';
import { SphereGeometry, BoxGeometry } from './geometry.js';
import { ShaderMaterial, BasicMaterial, StandardMaterial } from './materials.js';

/* ---------- the wall rig ---------- */

// fov is vertical: 64° on a 16:10 wall is 90° across, so three walls at
// yaw +90 (left), 0 (front), -90 (right) make the sides of one box.
export function createWallRig({ fov = 64, aspect = 1.6, near = 0.1, far = 2000, yaws = [90, 0, -90] } = {}) {
	const rig = new Group();
	const cameras = yaws.map((yaw) => {
		const c = new PerspectiveCamera(fov, aspect, near, far);
		c.rotation.y = yaw * DEG;
		rig.add(c);
		return c;
	});
	return {
		rig,
		cameras,
		// The views for renderer.render: wall i fills the i-th third of a canvas
		// width x height pixels.
		views(width, height) {
			const n = cameras.length;
			return cameras.map((camera, i) => {
				const x0 = Math.round(i * width / n), x1 = Math.round((i + 1) * width / n);
				return { camera, x: x0, y: 0, width: x1 - x0, height };
			});
		},
	};
}

// Where a world point lands in a view of size w x h whose top-left is at
// (x, y), in the same units (y down). null if it's behind the camera;
// .inside says whether it's within the view.
const _p = new Vector3();
export function toScreen(v, camera, x = 0, y = 0, w = 1, h = 1) {
	camera.updateWorldMatrix(true, false);
	_p.copy(v).project(camera);
	const behind = _p.z > 1 || _p.z < -1;
	if (behind) return null;
	return {
		x: x + (_p.x + 1) / 2 * w,
		y: y + (1 - _p.y) / 2 * h,
		depth: _p.z,
		inside: Math.abs(_p.x) <= 1 && Math.abs(_p.y) <= 1,
		ndc: { x: _p.x, y: _p.y },
	};
}

/* ---------- a sky ---------- */

// glsl declares any uniforms it needs and defines vec3 skyColor(vec3 dir)
// (linear HDR). Optionally it also defines vec3 skyExtra(vec3 dir) and sets
// #define SKY_EXTRA, for things seen in the sky itself but not reflected (a
// sun's blazing disc, stars). uniforms: { name: { value } }, shared by the
// dome and every environment made from it, so changing a value and calling
// environment() again relights the scene to match.
export class SkyDome extends Mesh {
	constructor(glsl, uniforms = {}, radius = 1000) {
		const material = new ShaderMaterial({
			uniforms,
			side: BackSide,
			depthWrite: false,
			vertexShader: `
				varying vec3 vDir;
				void main() {
					vec4 w = modelMatrix * vec4(position, 1.0);
					vDir = w.xyz - cameraPosition;
					gl_Position = projectionMatrix * viewMatrix * w;
					gl_Position.z = gl_Position.w * 0.99999;
				}
			`,
			fragmentShader: `
				varying vec3 vDir;
				${glsl}
				void main() {
					vec3 d = normalize(vDir);
					vec3 col = skyColor(d);
					#ifdef SKY_EXTRA
					col += skyExtra(d);
					#endif
					gl_FragColor = vec4(col, 1.0);
				}
			`,
		});
		super(new SphereGeometry(radius, 48, 24), material);
		this.glsl = glsl;
		this.uniforms = uniforms;
		this.renderOrder = -1000;
		this.frustumCulled = false;
		this.env = null;
	}
	// Keep it round the eye.
	follow(eye) { this.position.copy(eye); }
	// (Re)make the environment that lights the scene from this sky.
	environment(renderer, size = 128) {
		this.env = renderer.environmentFromShader(this.glsl + '\nvec3 envColor(vec3 d) { return skyColor(d); }\n', { size, uniforms: this.uniforms, into: this.env });
		return this.env;
	}
}

/* ---------- a studio room ---------- */

// A big soft room with glowing panels: neutral, flattering light for
// glossy things indoors. renderer.environmentFromScene(roomEnvironment()).
export function roomEnvironment({ intensity = 1, warm = 0xfff3e0, cool = 0xe0ecff } = {}) {
	const scene = new Scene();
	const wall = new StandardMaterial({ color: 0x7a7a7a, roughness: 1, side: BackSide });
	const room = new Mesh(new BoxGeometry(30, 16, 30), wall);
	room.position.y = 6;
	scene.add(room);
	const panel = (color, k, w, h, d, x, y, z) => {
		const m = new Mesh(new BoxGeometry(w, h, d), new BasicMaterial({ color: new Color(color).multiplyScalar(k * intensity) }));
		m.position.set(x, y, z);
		scene.add(m);
	};
	panel(0xffffff, 18, 10, 0.2, 10, 0, 13.8, 0);          // the big overhead softbox
	panel(warm, 10, 0.2, 6, 10, -14.8, 6, 0);               // warm key to one side
	panel(cool, 7, 0.2, 6, 10, 14.8, 6, 0);                 // cool fill to the other
	panel(0xffffff, 6, 10, 5, 0.2, 0, 6, -14.8);            // a strip behind
	// a few dark blocks to give reflections some shape
	const block = new StandardMaterial({ color: 0x202020, roughness: 0.8 });
	for (const [x, z, s] of [[-6, 6, 3], [7, -5, 4], [3, 8, 2.5]]) {
		const b = new Mesh(new BoxGeometry(s, s * 1.5, s), block);
		b.position.set(x, s * 0.75 - 2, z);
		scene.add(b);
	}
	return scene;
}
