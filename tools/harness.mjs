// Shared pieces for the headless tools: a static file server and a browser.
//
// The browser is the system Google Chrome driven by playwright-core, so no
// browser download is needed.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

export const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.svg': 'image/svg+xml',
	'.mp3': 'audio/mpeg',
	'.wav': 'audio/wav',
	'.ogg': 'audio/ogg',
	'.mp4': 'video/mp4',
	'.webm': 'video/webm',
	'.ttf': 'font/ttf',
	'.otf': 'font/otf',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
};

// Serve `root` on a free port. Resolves to { url, close }.
export function serve(root) {
	const server = http.createServer((req, res) => {
		const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
		let file = path.join(root, rel);
		if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
		if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
		fs.stat(file, (err, stat) => {
			if (err) { res.writeHead(404).end('not found'); return; }
			const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
			const range = req.headers.range;
			if (range) {
				// Audio and video elements ask for byte ranges.
				const [a, b] = range.replace('bytes=', '').split('-');
				const start = parseInt(a, 10) || 0;
				const end = b ? parseInt(b, 10) : stat.size - 1;
				res.writeHead(206, {
					'Content-Type': type,
					'Content-Range': `bytes ${start}-${end}/${stat.size}`,
					'Accept-Ranges': 'bytes',
					'Content-Length': end - start + 1,
				});
				fs.createReadStream(file, { start, end }).pipe(res);
			} else {
				res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
				fs.createReadStream(file).pipe(res);
			}
		});
	});
	return new Promise((resolve) => {
		server.listen(0, '127.0.0.1', () => {
			const { port } = server.address();
			resolve({ url: `http://127.0.0.1:${port}`, close: () => server.close() });
		});
	});
}

export async function browser() {
	return chromium.launch({
		channel: 'chrome',
		headless: true,
		args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
	});
}

// Open a page that records every problem worth reporting.
export async function openPage(b, { width = 1920, height = 400 } = {}) {
	const page = await b.newPage({ viewport: { width, height } });
	const problems = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') problems.push({ kind: 'console', text: msg.text() });
	});
	page.on('pageerror', (err) => problems.push({ kind: 'exception', text: String(err && err.stack || err) }));
	page.on('requestfailed', (req) => {
		const failure = req.failure();
		const text = failure ? failure.errorText : '';
		// Media elements abort their own range requests routinely.
		if (/ERR_ABORTED/.test(text) && /\.(mp3|wav|ogg|mp4|webm)$/i.test(req.url())) return;
		problems.push({ kind: 'request', text: `${text} ${req.url()}` });
	});
	page.on('response', (res) => {
		if (res.status() >= 400) problems.push({ kind: 'http', text: `${res.status()} ${res.url()}` });
	});
	return { page, problems };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
