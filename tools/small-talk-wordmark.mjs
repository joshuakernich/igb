// Small Talk's wordmark for slides: SMALL TALK in the VCR OSD lettering, the
// colours slipping apart like a tape's, on transparent. Saves
// tools/out/small-talk-wordmark.png (1000 x 220).
//
//   node small-talk-wordmark.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, PROJECT } from './harness.mjs';

const srv = await serve(PROJECT);
const b = await browser();
const page = await b.newPage();
await page.goto(`${srv.url}/blank`);
const url = await page.evaluate(async (base) => {
	const face = new FontFace('VCRFONT', `url(${base}/assets/riddler/VCR_OSD_MONO_1.001.ttf)`);
	await face.load();
	document.fonts.add(face);
	const c = document.createElement('canvas');
	c.width = 1000; c.height = 220;
	const x = c.getContext('2d');
	x.font = '150px VCRFONT';
	x.textAlign = 'center';
	x.textBaseline = 'middle';
	const draw = (dx, fill) => {
		// SMALL in cream, TALK in gold
		const a = 'SMALL ', bW = x.measureText('SMALL TALK').width, aW = x.measureText(a).width;
		const left = 500 - bW / 2 + dx;
		x.textAlign = 'left';
		x.fillStyle = fill || '#f6f1dc';
		x.fillText('SMALL', left, 114);
		x.fillStyle = fill || '#ffd166';
		x.fillText('TALK', left + aW, 114);
	};
	x.shadowColor = 'rgba(255,58,208,0.9)';
	x.shadowBlur = 30;
	draw(0, 'rgba(255,58,208,0.35)');
	x.shadowBlur = 0;
	x.globalCompositeOperation = 'lighter';
	draw(-7, 'rgba(255,40,90,0.8)');
	draw(7, 'rgba(40,220,255,0.8)');
	x.globalCompositeOperation = 'source-over';
	x.lineWidth = 8;
	x.strokeStyle = '#120610';
	x.lineJoin = 'round';
	const bW = x.measureText('SMALL TALK').width;
	x.strokeText('SMALL TALK', 500 - bW / 2, 114);
	draw(0);
	return c.toDataURL('image/png');
}, srv.url);
const out = path.join(PROJECT, 'tools/out/small-talk-wordmark.png');
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
await b.close();
srv.close();
console.log(out);
