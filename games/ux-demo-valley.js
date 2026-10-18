/*
 * UX Demo's backdrop: a sunny 3D valley across the three walls, behind the
 * show. The valley runs away from the front wall, green hills rising either
 * side (the side walls look across them) up to far blue mountains; a bright
 * sun hangs over it ahead, glowing, its rays slowly turning; soft clouds
 * drift across the sky; round bushes dot the slopes. Rendered with three.js
 * into its own canvas behind the stage's.
 *
 *   const valley = createValley(stage);
 *   valley.render(dt);    // every frame (dt 0 to hold it still)
 *   valley.dispose();     // when the game stops
 *   valley.scene          // to add things to (lit, shadowed)
 *   valley.ground(x, z)   // the ground's height there (metres; z negative: up the valley)
 *   valley.project(x, y, z)   // where a point shows: { wall, x, y, ppm } (world px; ppm: pixels a metre there) or null
 */
import * as THREE from '../lib/three/three.module.min.js';

export function createValley(stage) {
	const { W, H, WIDTH } = IGB;

	/* ---------- tuning ---------- */

	const FOV = 64;                                  // vertical degrees: 90 across each 16:10 wall, so the walls meet
	const EYE = { up: 3.6, pitch: 11, sway: 1.2 };   // metres above the valley floor; degrees the view tilts down; degrees it gently sways
	const SUN = new THREE.Vector3(-0.22, 0.2, -0.95).normalize();   // toward the sun: ahead, a little left, low enough to see
	const BUSHES = 420;                              // how many bushes
	const CLOUDS = 34;                               // how many clouds
	const DRIFT = 2.2;                               // metres a second the clouds drift
	const FOG = { colour: 0xbfdcf2, near: 260, far: 2300 };

	/* ---------- the renderer, behind the stage ---------- */

	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.08;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.shadowMap.autoUpdate = false;
	$(renderer.domElement).css({ position: 'absolute', left: 0, top: 0, width: WIDTH + 'px', height: H + 'px' }).appendTo(stage.$bg);
	let k = 1;
	function resize() {
		k = Math.min(IGB.scale * IGB.pixelRatio, 1);
		renderer.setPixelRatio(1);
		renderer.setSize(Math.round(WIDTH * k), Math.round(H * k), false);
		renderer.shadowMap.needsUpdate = true;
	}
	const unlisten = IGB.onResize(resize);
	resize();

	const scene = new THREE.Scene();
	scene.fog = new THREE.Fog(FOG.colour, FOG.near, FOG.far);

	/* ---------- the ground: a valley ---------- */

	// value noise, a few octaves
	const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
	function noise(x, y) {
		const xi = Math.floor(x), yi = Math.floor(y);
		const xf = x - xi, yf = y - yi;
		const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
		const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
		return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
	}
	const fbm = (x, y) => noise(x, y) * 0.55 + noise(x * 2.1, y * 2.1) * 0.28 + noise(x * 4.3, y * 4.3) * 0.17;
	const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
	// The ground's height at (x, z) (z negative: up the valley, ahead):
	// a wide, gently winding floor, hills rising either side, and mountains
	// far off.
	function ground(x, z) {
		const ahead = Math.max(0, -z);
		const wind = Math.sin(ahead * 0.004) * 40;                    // (the valley winds a little)
		const half = 120 + ahead * 0.1;                               // (and widens the further off it goes)
		const off = Math.abs(x - wind) / half;
		const sides = Math.pow(off, 2.2) * (16 + ahead * 0.02);
		const rolls = (fbm(x * 0.012 + 5, z * 0.012) - 0.5) * 22 + (fbm(x * 0.05, z * 0.05) - 0.5) * 4;
		const peaks = smooth(700, 1700, ahead) * (fbm(x * 0.004 + 9, z * 0.004) * 420 - 60);
		return sides + rolls + Math.max(0, peaks);
	}
	const floorY = ground(0, 0);

	const terrainGeo = new THREE.PlaneGeometry(2600, 2700, 260, 270);
	terrainGeo.rotateX(-Math.PI / 2);
	terrainGeo.translate(0, 0, -1150);   // (from a little behind the eye to far up the valley)
	const pos = terrainGeo.attributes.position;
	const colours = new Float32Array(pos.count * 3);
	const grass = [new THREE.Color(0x3f8a2a), new THREE.Color(0x6db33f), new THREE.Color(0x9ccc58)];
	const rock = new THREE.Color(0x8d9a8c);
	const snow = new THREE.Color(0xf4f8ff);
	const c = new THREE.Color();
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i), z = pos.getZ(i);
		const y = ground(x, z);
		pos.setY(i, y);
		// grass, patchy, lighter on the sunny slopes; rock, then snow, up the mountains
		const patch = fbm(x * 0.03 + 3, z * 0.03);
		c.copy(grass[0]).lerp(grass[1], smooth(0.25, 0.6, patch)).lerp(grass[2], smooth(0.62, 0.85, patch) * 0.7);
		const high = y - floorY;
		c.lerp(rock, smooth(150, 280, high));
		c.lerp(snow, smooth(300, 380, high));
		colours[i * 3] = c.r; colours[i * 3 + 1] = c.g; colours[i * 3 + 2] = c.b;
	}
	terrainGeo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
	terrainGeo.computeVertexNormals();
	const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
	terrain.receiveShadow = true;
	scene.add(terrain);

	/* ---------- light ---------- */

	scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x4f7a32, 0.95));
	const sun = new THREE.DirectionalLight(0xfff1d6, 3.1);
	sun.position.copy(SUN).multiplyScalar(400).add(new THREE.Vector3(0, floorY, -60));
	sun.target.position.set(0, floorY, -60);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	Object.assign(sun.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, near: 10, far: 900 });
	sun.shadow.camera.updateProjectionMatrix();
	sun.shadow.bias = -0.0005;
	sun.shadow.normalBias = 0.6;
	scene.add(sun, sun.target);

	/* ---------- the sky, the sun ---------- */

	const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), new THREE.ShaderMaterial({
		side: THREE.BackSide, depthWrite: false, fog: false,
		uniforms: { sunDir: { value: SUN } },
		vertexShader: /* glsl */`
			varying vec3 vDir;
			void main() {
				vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
				gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
			}`,
		fragmentShader: /* glsl */`
			uniform vec3 sunDir;
			varying vec3 vDir;
			void main() {
				vec3 d = normalize(vDir);
				float y = clamp(d.y, 0.0, 1.0);
				vec3 zenith = vec3(0.16, 0.42, 0.86);
				vec3 horizon = vec3(0.75, 0.87, 0.96);
				vec3 col = mix(horizon, zenith, pow(y, 0.55));
				float s = max(dot(d, sunDir), 0.0);
				col += vec3(1.0, 0.86, 0.6) * pow(s, 8.0) * 0.35;     // the warm sky round the sun
				col += vec3(1.0, 0.95, 0.82) * pow(s, 90.0) * 1.2;    // its glare
				col += vec3(1.0, 1.0, 0.95) * smoothstep(0.9994, 0.9997, s) * 6.0;   // the disc, far brighter than white
				gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
			}`,
	}));
	sky.renderOrder = -10;
	scene.add(sky);

	// The sun's shine, over the sky: a soft halo and slowly turning rays
	function glowTexture(rays) {
		const cv = document.createElement('canvas');
		cv.width = cv.height = 512;
		const g = cv.getContext('2d');
		const m = 256;
		if (rays) {
			for (let i = 0; i < 24; i++) {
				const a = i / 24 * Math.PI * 2;
				const w = i % 2 ? 0.035 : 0.06;
				const grad = g.createRadialGradient(m, m, 0, m, m, m);
				grad.addColorStop(0, 'rgba(255,248,220,0.5)');
				grad.addColorStop(1, 'rgba(255,240,200,0)');
				g.fillStyle = grad;
				g.beginPath();
				g.moveTo(m, m);
				g.arc(m, m, m * (i % 3 ? 0.8 : 1), a - w, a + w);
				g.closePath();
				g.fill();
			}
		} else {
			const grad = g.createRadialGradient(m, m, 0, m, m, m);
			grad.addColorStop(0, 'rgba(255,255,245,1)');
			grad.addColorStop(0.08, 'rgba(255,248,220,0.9)');
			grad.addColorStop(0.25, 'rgba(255,225,160,0.35)');
			grad.addColorStop(0.6, 'rgba(255,210,140,0.08)');
			grad.addColorStop(1, 'rgba(255,200,120,0)');
			g.fillStyle = grad;
			g.fillRect(0, 0, 512, 512);
		}
		const tex = new THREE.CanvasTexture(cv);
		tex.colorSpace = THREE.SRGBColorSpace;
		return tex;
	}
	const shine = (tex, size) => {
		const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false, toneMapped: false, transparent: true }));
		sp.scale.set(size, size, 1);
		sp.renderOrder = -5;
		scene.add(sp);
		return sp;
	};
	const halo = shine(glowTexture(false), 1300);
	const rays = shine(glowTexture(true), 1900);

	/* ---------- clouds ---------- */

	function cloudTexture(seed) {
		const cv = document.createElement('canvas');
		cv.width = 512;
		cv.height = 256;
		const g = cv.getContext('2d');
		let r = seed;
		const rand = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
		for (let i = 0; i < 26; i++) {
			const x = 90 + rand() * 330, y = 120 + (rand() - 0.5) * 70 - Math.sin((x - 90) / 330 * Math.PI) * 40;
			const rr = 40 + rand() * 60;
			const grad = g.createRadialGradient(x, y - rr * 0.2, 0, x, y, rr);
			grad.addColorStop(0, 'rgba(255,255,255,0.95)');
			grad.addColorStop(0.6, 'rgba(250,252,255,0.7)');
			grad.addColorStop(1, 'rgba(225,235,248,0)');
			g.fillStyle = grad;
			g.beginPath();
			g.arc(x, y, rr, 0, Math.PI * 2);
			g.fill();
		}
		// a soft grey underside
		const shade = g.createLinearGradient(0, 120, 0, 230);
		shade.addColorStop(0, 'rgba(160,175,200,0)');
		shade.addColorStop(1, 'rgba(160,175,200,0.35)');
		g.globalCompositeOperation = 'source-atop';
		g.fillStyle = shade;
		g.fillRect(0, 0, 512, 256);
		const tex = new THREE.CanvasTexture(cv);
		tex.colorSpace = THREE.SRGBColorSpace;
		return tex;
	}
	const cloudTex = [1, 7, 23, 51].map(cloudTexture);
	const clouds = [];
	for (let i = 0; i < CLOUDS; i++) {
		const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex[i % cloudTex.length], transparent: true, depthWrite: false, fog: true }));
		const size = 160 + hash(i, 3) * 260;
		sp.scale.set(size, size / 2, 1);
		const a = hash(i, 1) * Math.PI * 1.3 - Math.PI * 1.15;   // (ahead and round both sides, not behind)
		const d = 500 + hash(i, 2) * 1300;
		sp.position.set(Math.cos(a) * d, floorY + 160 + hash(i, 4) * 260, Math.sin(a) * d);
		sp.renderOrder = -4;
		scene.add(sp);
		clouds.push(sp);
	}

	/* ---------- bushes ---------- */

	// Each bush a cluster of round, leafy balls, rested on the ground.
	const blob = new THREE.IcosahedronGeometry(1, 2);
	const bp = blob.attributes.position;
	for (let i = 0; i < bp.count; i++) {   // (lumpy, not perfect spheres)
		const v = new THREE.Vector3(bp.getX(i), bp.getY(i), bp.getZ(i));
		v.multiplyScalar(1 + (hash(v.x * 7, v.y * 5 + v.z * 3) - 0.5) * 0.18);
		bp.setXYZ(i, v.x, v.y, v.z);
	}
	blob.computeVertexNormals();
	const balls = [];
	for (let b = 0; b < BUSHES; b++) {
		// scattered over the slopes and the floor, mostly not too far off
		const z = 40 - Math.pow(hash(b, 11), 1.3) * 760;
		const x = (hash(b, 12) - 0.5) * (160 + Math.max(0, -z) * 0.7);
		if (Math.hypot(x, z) < 45) continue;   // (none crowding the eye)
		const y = ground(x, z);
		const size = 0.7 + hash(b, 13) * 1.1;
		const n = 3 + Math.floor(hash(b, 14) * 5);
		for (let i = 0; i < n; i++) {
			const a = i / n * Math.PI * 2 + hash(b, i) * 2;
			const r = size * (0.2 + hash(i, b) * 0.6);
			const s = size * (0.55 + hash(b + i, 9) * 0.45);
			balls.push({ x: x + Math.cos(a) * r, y: y + s * 0.75 + hash(i, b + 5) * size * 0.4, z: z + Math.sin(a) * r, s, tone: hash(b, 15) });
		}
	}
	const bushMesh = new THREE.InstancedMesh(blob, new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 }), balls.length);
	const m4 = new THREE.Matrix4();
	const leaf = [new THREE.Color(0x2e6b22), new THREE.Color(0x4f9a2f), new THREE.Color(0x77b93e)];
	balls.forEach(function (ball, i) {
		m4.makeScale(ball.s, ball.s * 0.88, ball.s).setPosition(ball.x, ball.y, ball.z);
		bushMesh.setMatrixAt(i, m4);
		c.copy(leaf[0]).lerp(leaf[1], ball.tone).lerp(leaf[2], hash(i, 21) * 0.4);
		bushMesh.setColorAt(i, c);
	});
	bushMesh.castShadow = true;
	bushMesh.receiveShadow = true;
	scene.add(bushMesh);

	/* ---------- the eye: three cameras, the sides of one box ---------- */

	const rig = new THREE.Group();
	rig.position.set(0, floorY + EYE.up, 0);
	scene.add(rig);
	const cams = [Math.PI / 2, 0, -Math.PI / 2].map(function (yaw) {
		const cam = new THREE.PerspectiveCamera(FOV, W / H, 0.5, 6000);
		cam.rotation.order = 'YXZ';
		cam.rotation.y = yaw;
		rig.add(cam);
		return cam;
	});
	for (const cam of cams) cam.rotation.x = -EYE.pitch * Math.PI / 180;   // (all three look a touch down, onto the valley floor)

	function viewport(x, w) {
		const x0 = Math.round(x * k), x1 = Math.round((x + w) * k);
		renderer.setViewport(x0, 0, x1 - x0, Math.round(H * k));
		renderer.setScissor(x0, 0, x1 - x0, Math.round(H * k));
	}

	let t = 0;
	renderer.shadowMap.needsUpdate = true;
	function render(dt) {
		t += dt;
		renderer.shadowMap.needsUpdate = true;   // (things move: falling cubes)
		// a gentle sway, the clouds drifting, the rays turning
		rig.rotation.y = Math.sin(t * 0.07) * EYE.sway * Math.PI / 180;
		for (const cl of clouds) {
			cl.position.x += DRIFT * dt;
			if (cl.position.x > 1800) cl.position.x -= 3600;
		}
		const sunAt = SUN.clone().multiplyScalar(3600).add(rig.position);
		halo.position.copy(sunAt);
		rays.position.copy(sunAt);
		rays.material.rotation = t * 0.03;
		rays.material.opacity = 0.75 + 0.15 * Math.sin(t * 0.6);
		sky.position.copy(rig.position);
		renderer.setScissorTest(true);
		cams.forEach(function (cam, w) {
			viewport(w * W, W);
			renderer.render(scene, cam);
		});
	}

	function dispose() {
		unlisten();
		scene.traverse(function (o) {
			if (o.geometry) o.geometry.dispose();
			if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
		});
		renderer.dispose();
		renderer.forceContextLoss();
		$(renderer.domElement).remove();
	}

	// Where a point in the valley shows on the walls (whichever wall's view
	// it's in), and how many pixels a metre is there.
	const pv = new THREE.Vector3();
	function project(x, y, z) {
		rig.updateMatrixWorld(true);
		for (const w of [1, 0, 2]) {
			const cam = cams[w];
			pv.set(x, y, z).project(cam);
			if (pv.z > 1 || pv.z < -1 || Math.abs(pv.x) > 1 || Math.abs(pv.y) > 1.2) continue;
			const sx = w * W + (pv.x + 1) / 2 * W, sy = (1 - pv.y) / 2 * H;
			pv.set(x, y + 1, z).project(cam);
			const ppm = Math.abs((1 - pv.y) / 2 * H - sy);
			return { wall: w, x: sx, y: sy, ppm };
		}
		return null;
	}

	return { render, dispose, scene, ground, project };
}
