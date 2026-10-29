// Draws Small Talk's menu icon with the game's own face drawing (people.js):
// a guest staring out under the bunting, a balloon with a face beside them.
// Saves assets/icons/small-talk.png (256 x 256).
//
//   node small-talk-icon.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, PROJECT } from './harness.mjs';

const srv = await serve(PROJECT);
const b = await browser();
const page = await b.newPage();
await page.goto(`${srv.url}/blank`);   // (a 404, but on the server's origin, so the module can load)
const url = await page.evaluate(async (base) => {
	const { drawFace, EXPR } = await import(base + '/games/small-talk/people.js');
	const S = 256;
	const c = document.createElement('canvas');
	c.width = c.height = S;
	const x = c.getContext('2d');
	// the function room after dark
	const g = x.createLinearGradient(0, 0, 0, S);
	g.addColorStop(0, '#3a1426'); g.addColorStop(1, '#12060c');
	x.fillStyle = g; x.fillRect(0, 0, S, S);
	// bunting
	const cols = ['#e8445a', '#f29a2e', '#e8c22e', '#3aa86a', '#3a8ad8', '#8a5ad0'];
	x.strokeStyle = 'rgba(255,240,220,0.6)'; x.lineWidth = 2;
	x.beginPath(); x.moveTo(0, 16); x.quadraticCurveTo(S / 2, 52, S, 16); x.stroke();
	for (let i = 0; i < 9; i++) {
		const u = (i + 0.5) / 9, px = u * S, py = 16 + 36 * u * (1 - u) * 2;
		x.fillStyle = cols[i % 6];
		x.beginPath(); x.moveTo(px - 11, py); x.lineTo(px + 11, py); x.lineTo(px, py + 22); x.fill();
	}
	// a balloon with a face, on its string
	x.strokeStyle = '#ddd'; x.lineWidth = 2;
	x.beginPath(); x.moveTo(206, 128); x.quadraticCurveTo(196, 190, 210, 256); x.stroke();
	x.fillStyle = '#ff6fa8';
	x.beginPath(); x.ellipse(206, 92, 36, 42, 0.12, 0, Math.PI * 2); x.fill();
	x.beginPath(); x.moveTo(200, 132); x.lineTo(212, 132); x.lineTo(206, 124); x.fill();
	drawFace(x, EXPR.beam, 206, 92, 66, { ink: '#2a0a18' });
	// the guest: shoulders in a jacket and tie, a head, a stare
	x.fillStyle = '#2c3038';
	x.beginPath(); x.ellipse(100, 286, 96, 88, 0, 0, Math.PI * 2); x.fill();
	x.fillStyle = '#f2f2ee';
	x.beginPath(); x.moveTo(78, 200); x.lineTo(122, 200); x.lineTo(100, 256); x.fill();
	x.fillStyle = '#a82a2a'; x.fillRect(94, 204, 12, 52);
	x.fillStyle = '#e8b896';
	x.beginPath(); x.ellipse(100, 128, 62, 74, 0, 0, Math.PI * 2); x.fill();
	x.fillStyle = '#3a2a1e';
	x.beginPath(); x.ellipse(100, 74, 60, 30, 0, Math.PI, Math.PI * 2); x.fill();
	x.fillRect(40, 70, 120, 14);
	drawFace(x, EXPR.stare, 100, 136, 118, { ink: '#1a0a10' });
	return c.toDataURL('image/png');
}, srv.url);
fs.writeFileSync(path.join(PROJECT, 'assets/icons/small-talk.png'), Buffer.from(url.split(',')[1], 'base64'));
await b.close();
srv.close();
console.log('assets/icons/small-talk.png');
