// Prepare the platform for publishing as a claude.ai artifact.
//
//   node build-artifact.mjs
//
// Writes tools/out/artifact/page.html: index.html without its doctype,
// <html>, <head> and <body> wrappers (the artifact host adds its own), and
// tools/out/artifact/batches.json: every file the page needs, split into
// publish batches that stay under the host's 64 MB / 255 files per publish.
// Publish page.html with root = the project folder, then each batch as
// `files` to the same artifact.

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT } from './harness.mjs';

const OUT = path.join(PROJECT, 'tools/out/artifact');
fs.mkdirSync(OUT, { recursive: true });

// The page: head contents, then body contents.
const html = fs.readFileSync(path.join(PROJECT, 'index.html'), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/i)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/i)[1];
const page = head.replace(/^\s*<meta[^>]*>\s*$/gim, '').trim() + '\n\n' + body.trim() + '\n';
fs.writeFileSync(path.join(OUT, 'page.html'), page);

// Every file under these folders, biggest first so batches pack well.
const FOLDERS = ['core', 'shared', 'games', 'lib', 'assets'];
const files = [];
for (const folder of FOLDERS) {
	(function walk(dir) {
		for (const name of fs.readdirSync(path.join(PROJECT, dir))) {
			if (name.startsWith('.')) continue;
			const rel = path.join(dir, name);
			const stat = fs.statSync(path.join(PROJECT, rel));
			if (stat.isDirectory()) walk(rel);
			else files.push({ path: rel, size: stat.size });
		}
	})(folder);
}
files.sort((a, b) => b.size - a.size);

const MAX_BYTES = 60 * 1024 * 1024;
const MAX_FILES = 250;
const batches = [];
for (const f of files) {
	let batch = batches.find((b) => b.bytes + f.size <= MAX_BYTES && b.files.length < MAX_FILES);
	if (!batch) { batch = { bytes: 0, files: [] }; batches.push(batch); }
	batch.files.push(f.path);
	batch.bytes += f.size;
}
fs.writeFileSync(path.join(OUT, 'batches.json'), JSON.stringify(batches.map((b) => b.files), null, 1));

const total = files.reduce((s, f) => s + f.size, 0);
console.log(`page.html written; ${files.length} files, ${(total / 1e6).toFixed(1)} MB in ${batches.length} batches:`);
for (const b of batches) console.log(`  ${b.files.length} files, ${(b.bytes / 1e6).toFixed(1)} MB`);
