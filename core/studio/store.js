/*
 * Where the Studio reads and writes the project.
 *
 * Connected (the artist picks their igb-proto folder once; the browser
 * remembers it and asks again with one click next time): Save and Import
 * write real files into assets/<game>/, so they go into git like any other
 * change. Not connected: everything is read over http, and Save downloads
 * the scene's JSON instead.
 *
 * Models are always stored as one .glb each (whatever came in: .gltf with its
 * .bin and textures, .fbx, .obj), plus <file>.glb.js, the same bytes as a
 * module, for hosts that won't serve .glb (the claude.ai artifact).
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { GLTFLoader } from '../../lib/three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from '../../lib/three/addons/exporters/GLTFExporter.js';

const DB = 'igb-studio', KEY = 'project-folder';

function idb(mode, fn) {
	return new Promise((resolve, reject) => {
		const open = indexedDB.open(DB, 1);
		open.onupgradeneeded = () => open.result.createObjectStore('kv');
		open.onerror = () => reject(open.error);
		open.onsuccess = () => {
			const tx = open.result.transaction('kv', mode);
			const req = fn(tx.objectStore('kv'));
			tx.oncomplete = () => resolve(req && req.result);
			tx.onerror = () => reject(tx.error);
		};
	});
}

export const store = {
	root: null,        // a FileSystemDirectoryHandle on the project, once connected
	saved: null,       // a remembered handle still waiting for permission
	urls: new Map(),   // project path → blob: URL, for files read from the folder or imported this session
	supported: 'showDirectoryPicker' in window,

	async restore() {
		if (!this.supported) return false;
		try {
			const h = await idb('readonly', (s) => s.get(KEY));
			if (!h) return false;
			if (await h.queryPermission({ mode: 'readwrite' }) === 'granted') { this.root = h; return true; }
			this.saved = h;
		} catch (e) { /* no remembered folder */ }
		return false;
	},
	// (needs a click)
	async connect() {
		if (this.saved) {
			try {
				if (await this.saved.requestPermission({ mode: 'readwrite' }) === 'granted') { this.root = this.saved; this.saved = null; return true; }
			} catch (e) { /* pick again */ }
		}
		const h = await window.showDirectoryPicker({ id: 'igb-proto', mode: 'readwrite' });
		try { await (await h.getDirectoryHandle('games')).getFileHandle('manifest.js'); } catch (e) {
			throw new Error('That folder has no games/manifest.js: pick the igb-proto folder itself.');
		}
		this.root = h;
		this.saved = null;
		await idb('readwrite', (s) => s.put(h, KEY));
		return true;
	},
	get connected() { return !!this.root; },
	get name() { return this.root ? this.root.name : (this.saved ? this.saved.name : ''); },

	async dir(path, create = false) {
		let d = this.root;
		for (const part of path.split('/').filter(Boolean)) d = await d.getDirectoryHandle(part, { create });
		return d;
	},
	async list(path) {
		if (this.root) {
			const out = [];
			try {
				const d = await this.dir(path);
				for await (const [name, h] of d.entries()) if (!name.startsWith('.')) out.push({ name, dir: h.kind === 'directory' });
			} catch (e) { return []; }
			return out.sort((a, b) => a.name.localeCompare(b.name));
		}
		return null;   // (can't list over plain http)
	},
	async readFile(path) {
		const parts = path.split('/');
		const name = parts.pop();
		const d = await this.dir(parts.join('/'));
		return (await d.getFileHandle(name)).getFile();
	},
	async readText(path) {
		if (this.root) { try { return await (await this.readFile(path)).text(); } catch (e) { /* fall back to http */ } }
		const r = await fetch(path, { cache: 'no-store' });
		if (!r.ok) throw new Error(path + ': ' + r.status);
		return r.text();
	},
	async write(path, data) {
		if (!this.root) throw new Error('Not connected to the project folder');
		const parts = path.split('/');
		const name = parts.pop();
		const d = await this.dir(parts.join('/'), true);
		const w = await (await d.getFileHandle(name, { create: true })).createWritable();
		await w.write(data);
		await w.close();
		if (this.urls.has(path)) { URL.revokeObjectURL(this.urls.get(path)); this.urls.delete(path); }
	},
	async exists(path) {
		if (this.root) { try { await this.readFile(path); return true; } catch (e) { return false; } }
		try { return (await fetch(path, { method: 'HEAD', cache: 'no-store' })).ok; } catch (e) { return false; }
	},
	// make sure a project file has a URL the loaders can use (the folder's copy when connected)
	async ensureUrl(path) {
		if (!path || /^(blob:|data:|https?:)/.test(path) || this.urls.has(path)) return;
		if (!this.root) return;
		try { this.urls.set(path, URL.createObjectURL(await this.readFile(path))); } catch (e) { /* use http */ }
	},
	resolve(path) {
		return store.urls.get(path) || (/^(blob:|data:|https?:)/.test(path) ? path : new URL(path, document.baseURI).href);
	},
};

/* ---------- importing ---------- */

const MODEL = /\.(glb|gltf|fbx|obj)$/i, TEXTURE = /\.(png|jpe?g|webp)$/i;
export const isModel = (n) => MODEL.test(n);
export const isTexture = (n) => TEXTURE.test(n);
const slug = (s) => s.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'model';

export function base64(bytes) {
	let s = '';
	for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
	return btoa(s);
}
export function glbModule(path, bytes) {
	return '// ' + path + ' as base64, for hosts that won\'t serve .glb (written by IGB Studio)\nexport default \'' + base64(bytes) + '\';\n';
}

/*
 * files: File[] dropped or picked. Returns [{ path, kind: 'model'|'texture', note }].
 * project: the game id (files go to assets/<project>/models or /textures).
 * log(msg, level) reports progress.
 */
export async function importFiles(files, project, log) {
	const byName = new Map(files.map((f) => [f.name.toLowerCase(), f]));
	const blobUrls = new Map();
	const urlOf = (f) => { if (!blobUrls.has(f)) blobUrls.set(f, URL.createObjectURL(f)); return blobUrls.get(f); };
	// sidecar files (a .gltf's .bin and textures, an .fbx's textures) found by name
	const manager = new THREE.LoadingManager();
	manager.setURLModifier((url) => {
		if (/^(blob:|data:)/.test(url) && ![...blobUrls.values()].includes(url)) return url;
		const name = decodeURIComponent(url.split(/[\\/]/).pop().split('?')[0]).toLowerCase();
		const f = byName.get(name);
		return f ? urlOf(f) : url;
	});
	const out = [];
	const save = async (path, data) => {
		if (store.connected) await store.write(path, data);
		const blob = data instanceof Blob ? data : new Blob([data]);
		store.urls.set(path, URL.createObjectURL(blob));
	};

	for (const f of files) {
		const ext = f.name.split('.').pop().toLowerCase();
		try {
			if (TEXTURE.test(f.name)) {
				const path = `assets/${project}/textures/${slug(f.name)}.${ext === 'jpeg' ? 'jpg' : ext}`;
				await save(path, f);
				out.push({ path, kind: 'texture' });
				log('Imported texture ' + path, 'ok');
				continue;
			}
			if (!MODEL.test(f.name)) continue;
			const path = `assets/${project}/models/${slug(f.name)}.glb`;
			let bytes, note = '';
			if (ext === 'glb') {
				bytes = new Uint8Array(await f.arrayBuffer());
			} else {
				log('Converting ' + f.name + ' to .glb…');
				let root, animations = [];
				if (ext === 'gltf') {
					const g = await new GLTFLoader(manager).loadAsync(urlOf(f));
					root = g.scene; animations = g.animations;
				} else if (ext === 'fbx') {
					const { FBXLoader } = await import('../../lib/three/addons/loaders/FBXLoader.js');
					root = await new FBXLoader(manager).loadAsync(urlOf(f));
					animations = root.animations || [];
				} else if (ext === 'obj') {
					const { OBJLoader } = await import('../../lib/three/addons/loaders/OBJLoader.js');
					root = await new OBJLoader(manager).loadAsync(urlOf(f));
				}
				// FBX files are usually in centimetres: bring anything enormous down to metres
				const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
				const tall = Math.max(size.x, size.y, size.z);
				if (tall > 40) {
					const wrap = new THREE.Group();
					wrap.name = root.name || slug(f.name);
					wrap.add(root);
					root.scale.multiplyScalar(0.01);
					root = wrap;
					note = 'scaled ×0.01 (it was ' + tall.toFixed(0) + ' units across: centimetres)';
				}
				const glb = await new GLTFExporter().parseAsync(root, { binary: true, animations, onlyVisible: false });
				bytes = new Uint8Array(glb);
			}
			await save(path, bytes);
			if (store.connected && bytes.length < 12e6) await store.write(path + '.js', glbModule(path, bytes));
			// keep the original beside it, for re-importing later
			if (store.connected && ext !== 'glb') await store.write(`assets/${project}/models/source/${f.name}`, f);
			out.push({ path, kind: 'model', note });
			log('Imported model ' + path + (note ? ' — ' + note : ''), 'ok');
		} catch (e) {
			log('Could not import ' + f.name + ': ' + (e.message || e), 'error');
			console.error(e);
		}
	}
	for (const u of blobUrls.values()) setTimeout(() => URL.revokeObjectURL(u), 10000);
	return out;
}
