// Compare two screenshots.
//
//   node imgdiff.mjs a.png b.png [diff.png] [--threshold=32]
//
// Prints the share of pixels that differ by more than the threshold (0-255,
// summed over RGB / 3) and, if a third path is given, writes an image with
// the differences in magenta over a faded copy of a.png. Sizes must match.

import fs from 'node:fs';
import { browser } from './harness.mjs';

const args = process.argv.slice(2);
const files = args.filter((a) => !a.startsWith('--'));
const threshold = parseInt((args.find((a) => a.startsWith('--threshold=')) || '=32').split('=')[1], 10);
const [a, b, out] = files;
if (!a || !b) {
	console.error('usage: node imgdiff.mjs a.png b.png [diff.png] [--threshold=32]');
	process.exit(1);
}

const toData = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');

const br = await browser();
const page = await br.newPage();
const result = await page.evaluate(async ({ a, b, threshold }) => {
	const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
	const [ia, ib] = await Promise.all([load(a), load(b)]);
	const w = Math.min(ia.width, ib.width);
	const h = Math.min(ia.height, ib.height);
	const pixels = (img) => {
		const c = document.createElement('canvas');
		c.width = w; c.height = h;
		const ctx = c.getContext('2d');
		ctx.drawImage(img, 0, 0);
		return ctx.getImageData(0, 0, w, h);
	};
	const da = pixels(ia);
	const db = pixels(ib);
	const c = document.createElement('canvas');
	c.width = w; c.height = h;
	const ctx = c.getContext('2d');
	const out = ctx.createImageData(w, h);
	let diff = 0;
	for (let i = 0; i < da.data.length; i += 4) {
		const d = (Math.abs(da.data[i] - db.data[i]) + Math.abs(da.data[i + 1] - db.data[i + 1]) + Math.abs(da.data[i + 2] - db.data[i + 2])) / 3;
		if (d > threshold) {
			diff++;
			out.data[i] = 255; out.data[i + 1] = 0; out.data[i + 2] = 255; out.data[i + 3] = 255;
		} else {
			out.data[i] = da.data[i]; out.data[i + 1] = da.data[i + 1]; out.data[i + 2] = da.data[i + 2]; out.data[i + 3] = 60;
		}
	}
	ctx.putImageData(out, 0, 0);
	return {
		size: [w, h],
		sizesMatch: ia.width === ib.width && ia.height === ib.height,
		differing: diff,
		share: diff / (w * h),
		png: c.toDataURL('image/png'),
	};
}, { a: toData(a), b: toData(b), threshold });
await br.close();

if (out) fs.writeFileSync(out, Buffer.from(result.png.split(',')[1], 'base64'));
console.log(JSON.stringify({ size: result.size, sizesMatch: result.sizesMatch, differing: result.differing, percent: +(result.share * 100).toFixed(3) }));
