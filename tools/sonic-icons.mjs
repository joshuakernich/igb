// The Sonic games' menu icons: each one its key character (or characters),
// rendered from the shared models, framed against a solid colour, saved as
// assets/icons/<name>.png (256 x 256, drawn at 512 and halved).
//
//   node sonic-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, openPage, PROJECT } from './harness.mjs';

// name: what's in it, its pose, the background, and the view (degrees round from the front, up)
const ICONS = [
	{ name: 'sonic-dash', chars: [{ kind: 'sonic', mode: 'run', pace: 1 }], bg: '#ffc93a', yaw: -40, pitch: 8 },
	{ name: 'sonic-classic', chars: [{ kind: 'sonic', mode: 'spring' }], bg: '#ff5a4a', yaw: -25, pitch: 6 },
	{ name: 'sonic-tails', chars: [{ kind: 'tails', mode: 'idle' }], bg: '#4fb3ff', yaw: -35, pitch: 6 },
	{ name: 'sonic-robot', chars: [{ kind: 'robot' }], bg: '#1fae9b', yaw: -35, pitch: 6 },
	{ name: 'knuckles-quest', chars: [{ kind: 'knuckles', mode: 'idle' }], bg: '#2fbf5f', yaw: -30, pitch: 6 },
	{ name: 'sonic-characters', chars: [{ kind: 'knuckles', mode: 'idle', x: -0.75, z: 0.25 }, { kind: 'tails', mode: 'idle', x: 0.75, z: 0.25 }, { kind: 'sonic', mode: 'idle', x: 0, z: -0.15 }], bg: '#8a5cff', yaw: -12, pitch: 6 },
];

const server = await serve(PROJECT);
const b = await browser();
const { page, problems } = await openPage(b, { width: 600, height: 600 });
await page.goto(`${server.url}/index.html`);

for (const icon of ICONS) {
	const url = await page.evaluate(async (icon) => {
		const THREE = await import('/lib/three/three.module.min.js');
		const { buildSpeedster } = await import('/shared/speedster3d.js');
		const { buildRobot } = await import('/games/iron-stride/models.js');
		const { environmentFromShader } = await import('/lib/three/walls.js');
		const S = 512;
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = S;
		const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
		r.toneMapping = THREE.ACESFilmicToneMapping;
		r.outputColorSpace = THREE.SRGBColorSpace;
		const scene = new THREE.Scene();
		const bg = new THREE.Color(icon.bg);
		scene.background = bg;
		// a soft studio, tinted a little by the background
		scene.environment = environmentFromShader(r, `vec3 envColor(vec3 d){ return mix(vec3(0.25,0.27,0.32), vec3(0.85,0.9,1.0), smoothstep(-0.3, 0.8, d.y)) + vec3(1.2) * smoothstep(0.85, 0.97, d.y); }`);
		scene.add(new THREE.HemisphereLight(0xffffff, bg.clone().multiplyScalar(0.6), 0.9));
		const key = new THREE.DirectionalLight(0xffffff, 2.6);
		key.position.set(-2, 3, -3);
		scene.add(key);
		const rim = new THREE.DirectionalLight(0xffffff, 1.4);
		rim.position.set(2.5, 2, 3);
		scene.add(rim);

		const group = new THREE.Group();
		scene.add(group);
		for (const c of icon.chars) {
			let root;
			if (c.kind === 'robot') {
				const m = buildRobot();
				m.walk(0.6, 0.6 + Math.PI, 0.5, 0.5, 1);
				root = m.root;
			} else {
				const colour = c.kind === 'knuckles' ? 0xc4141e : c.kind === 'tails' ? 0xf08a12 : 0x2f6cf0;
				const m = buildSpeedster(colour, { knuckles: c.kind === 'knuckles', tails: c.kind === 'tails' });
				// (a few steps in, so a run's mid-stride)
				for (let i = 0; i < 8; i++) m.animate(0.04, c.mode, c.pace || 0, 30, 1 + i * 0.04);
				root = m.root;
			}
			root.position.set(c.x || 0, 0, c.z || 0);
			group.add(root);
		}
		// the view: round from the front (the models face -z), framed on the whole group
		group.updateMatrixWorld(true);
		const box = new THREE.Box3().setFromObject(group);
		const centre = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
		const yaw = icon.yaw * Math.PI / 180, pitch = icon.pitch * Math.PI / 180;
		const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
		const fov = 30;
		const cam = new THREE.PerspectiveCamera(fov, 1, 0.05, 100);
		const reach = Math.max(size.x, size.y, size.z) * 0.62;   // (how much of the frame it fills)
		cam.position.copy(centre).addScaledVector(dir, reach / Math.tan(fov * Math.PI / 360));
		cam.lookAt(centre);
		r.render(scene, cam);
		// halved, for smooth edges
		const out = document.createElement('canvas');
		out.width = out.height = 256;
		const g = out.getContext('2d');
		g.imageSmoothingQuality = 'high';
		g.drawImage(canvas, 0, 0, 256, 256);
		r.dispose();
		return out.toDataURL('image/png');
	}, icon);
	const file = path.join(PROJECT, 'assets/icons', icon.name + '.png');
	fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
	console.log('wrote', path.relative(PROJECT, file));
}
if (problems.length) console.log('problems:', problems.slice(0, 5));
await b.close();
server.close();
