// Draws the menu icons for the current prototypes, flat in the games' own
// style, and saves them as 256 x 256 PNGs in assets/icons/.
//
//   node make-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { browser, PROJECT } from './harness.mjs';

const b = await browser();
const page = await b.newPage();
await page.setContent('<html><body></body></html>');

const icons = await page.evaluate(() => {
	const S = 256;
	const out = {};
	function make(name, draw) {
		const c = document.createElement('canvas');
		c.width = c.height = S;
		const ctx = c.getContext('2d');
		draw(ctx);
		out[name] = c.toDataURL('image/png');
	}
	const poly = (ctx, pts, fill) => {
		ctx.beginPath();
		ctx.moveTo(pts[0][0], pts[0][1]);
		for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
		ctx.closePath();
		ctx.fillStyle = fill;
		ctx.fill();
	};
	const circle = (ctx, x, y, r, fill) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); };
	const ellipse = (ctx, x, y, rx, ry, fill) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); };
	const rrect = (ctx, x, y, w, h, r, fill) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); };
	const grad = (ctx, y0, y1, a, b) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };

	// Red Light Green Light: the doll on the sand, under a sky, her eyes on you.
	make('red-light-green-light', function (ctx) {
		ctx.fillStyle = grad(ctx, 0, 150, '#7cc8f0', '#bfe6f7');
		ctx.fillRect(0, 0, S, 150);
		ctx.fillStyle = grad(ctx, 150, S, '#e8c896', '#cfa46c');
		ctx.fillRect(0, 150, S, S - 150);
		ctx.fillStyle = 'rgba(0,0,0,0.12)';
		ctx.fillRect(0, 196, S, 4);                     // the finish line's shadow
		ctx.fillStyle = '#d7262e';
		ctx.fillRect(0, 192, S, 6);                     // the red line
		ellipse(ctx, 128, 232, 50, 10, 'rgba(0,0,0,0.25)');
		// legs, dress, top
		rrect(ctx, 108, 196, 12, 34, 4, '#f6efe4');
		rrect(ctx, 136, 196, 12, 34, 4, '#f6efe4');
		poly(ctx, [[86, 200], [170, 200], [150, 112], [106, 112]], '#ff7a1a');
		rrect(ctx, 104, 100, 48, 28, 10, '#ffd23f');
		circle(ctx, 98, 108, 13, '#ffd23f');
		circle(ctx, 158, 108, 13, '#ffd23f');
		// head, bob and buns
		circle(ctx, 128, 70, 36, '#1a1410');
		circle(ctx, 90, 58, 15, '#1a1410');
		circle(ctx, 166, 58, 15, '#1a1410');
		ellipse(ctx, 128, 80, 27, 25, '#ffe2cc');
		rrect(ctx, 98, 40, 60, 22, 10, '#1a1410');      // fringe
		for (const ex of [117, 139]) {                  // little empty ring eyes
			circle(ctx, ex, 80, 5, '#111');
			circle(ctx, ex, 80, 2.6, '#ffe2cc');
		}
		circle(ctx, 110, 90, 5, 'rgba(255,90,110,0.35)');
		circle(ctx, 146, 90, 5, 'rgba(255,90,110,0.35)');
		ellipse(ctx, 128, 94, 5, 2.5, '#e0405a');
		// red light
		circle(ctx, 222, 34, 18, '#ff3640');
		circle(ctx, 222, 34, 26, 'rgba(255,54,64,0.25)');
	});

	// Mingle: three numbered doors and the number called.
	make('mingle', function (ctx) {
		ctx.fillStyle = grad(ctx, 0, S, '#f6c9df', '#c7a6ef');
		ctx.fillRect(0, 0, S, S);
		const doors = [['#9fe0c9', '01'], ['#f7d774', '02'], ['#9fd0f5', '03']];
		doors.forEach(function ([colour, n], i) {
			const x = 22 + i * 76;
			rrect(ctx, x - 6, 66, 72, 118, 6, 'white');
			rrect(ctx, x, 72, 60, 112, 4, colour);
			circle(ctx, x + 30, 100, 15, 'white');
			ctx.fillStyle = '#2a1f3d';
			ctx.font = 'bold 15px sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(n, x + 30, 101);
			circle(ctx, x + 30, 56, 6, i === 1 ? '#e0283c' : '#3ddc84');
		});
		// the carousel's edge along the bottom
		ctx.save();
		ctx.beginPath();
		ctx.ellipse(128, 262, 160, 66, 0, 0, Math.PI * 2);
		ctx.clip();
		for (let i = 0; i < 16; i++) {
			ctx.beginPath();
			ctx.moveTo(128, 262);
			ctx.arc(128, 262, 170, (i / 16) * Math.PI * 2, ((i + 1) / 16) * Math.PI * 2);
			ctx.closePath();
			ctx.fillStyle = ['#f4a7c3', '#9fe0c9', '#f7d774', '#b9a5ee'][i % 4];
			ctx.fill();
		}
		ctx.restore();
		// the number called
		circle(ctx, 128, 30, 26, 'white');
		circle(ctx, 128, 30, 22, '#e5287a');
		ctx.fillStyle = 'white';
		ctx.font = 'bold 30px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('3', 128, 32);
	});

	// Roll Call: meeps lined up on their colour pads under the stars.
	make('roll-call', function (ctx) {
		ctx.fillStyle = grad(ctx, 0, S, '#2a1060', '#5a2a9a');
		ctx.fillRect(0, 0, S, S);
		for (let i = 0; i < 40; i++) circle(ctx, (i * 97) % S, (i * 53) % 150, 1 + (i % 3) * 0.6, 'rgba(255,255,255,0.7)');
		ctx.fillStyle = '#4a1f8a';
		ctx.beginPath();
		ctx.moveTo(0, 190);
		ctx.lineTo(70, 150);
		ctx.lineTo(140, 178);
		ctx.lineTo(210, 140);
		ctx.lineTo(S, 170);
		ctx.lineTo(S, S);
		ctx.lineTo(0, S);
		ctx.fill();
		const colours = ['#ff2a2a', '#2a5cff', '#32cd32'];
		colours.forEach(function (c, i) {
			const x = 58 + i * 70;
			ellipse(ctx, x, 214, 30, 9, c);
			rrect(ctx, x - 4, 168, 8, 44, 4, 'white');              // legs and body, meep-thin
			rrect(ctx, x - 22, 92, 44, 80, 22, 'white');           // the head
			rrect(ctx, x - 22, 104, 44, 10, 3, c);                 // headband
			circle(ctx, x - 8, 136, 4, '#222');
			circle(ctx, x + 8, 136, 4, '#222');
			ctx.beginPath();
			ctx.arc(x, 146, 7, 0.15 * Math.PI, 0.85 * Math.PI);
			ctx.strokeStyle = '#222';
			ctx.lineWidth = 3;
			ctx.stroke();
		});
		rrect(ctx, 96, 18, 64, 44, 12, 'white');
		ctx.fillStyle = '#5a2a9a';
		ctx.font = 'bold 34px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('?', 128, 41);
		poly(ctx, [[120, 60], [136, 60], [128, 72]], 'white');
	});

	// Backrooms: yellow wallpaper, a buzzing panel, a dark doorway.
	make('backrooms', function (ctx) {
		ctx.fillStyle = '#c9b25a';
		ctx.fillRect(0, 0, S, S);
		for (let x = 0; x < S; x += 16) { ctx.fillStyle = x % 32 ? 'rgba(255,240,170,0.18)' : 'rgba(120,100,30,0.12)'; ctx.fillRect(x, 50, 8, 150); }
		ctx.fillStyle = '#e3d7a8';
		ctx.fillRect(0, 0, S, 50);                                  // the drop ceiling
		ctx.strokeStyle = 'rgba(120,110,70,0.5)';
		ctx.lineWidth = 2;
		for (let x = 0; x < S; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 50); ctx.stroke(); }
		ctx.beginPath(); ctx.moveTo(0, 25); ctx.lineTo(S, 25); ctx.stroke();
		const glow = ctx.createRadialGradient(128, 20, 10, 128, 20, 140);
		glow.addColorStop(0, 'rgba(255,255,230,0.75)');
		glow.addColorStop(1, 'rgba(255,255,230,0)');
		ctx.fillStyle = glow;
		ctx.fillRect(0, 0, S, S);
		rrect(ctx, 86, 8, 84, 30, 3, '#fffde8');                   // the fluorescent panel
		ctx.fillStyle = grad(ctx, 200, S, '#8a7240', '#6a5530');
		ctx.fillRect(0, 200, S, S - 200);                           // damp carpet
		ellipse(ctx, 190, 230, 30, 8, 'rgba(60,45,20,0.35)');
		// the doorway into the dark
		ctx.fillStyle = '#b39c4a';
		ctx.fillRect(98, 88, 60, 112);
		ctx.fillStyle = grad(ctx, 94, 200, '#141008', '#2a2210');
		ctx.fillRect(104, 94, 48, 106);
		// REC
		circle(ctx, 24, 66, 7, '#ff2a2a');
		ctx.fillStyle = 'white';
		ctx.font = 'bold 15px monospace';
		ctx.textBaseline = 'middle';
		ctx.fillText('REC', 36, 67);
		// scanlines
		for (let y = 0; y < S; y += 4) { ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, y, S, 2); }
	});

	// Gwi-Ma Showdown: his burning grin over the rooftop.
	make('gwi-ma-showdown', function (ctx) {
		ctx.fillStyle = grad(ctx, 0, S, '#07031a', '#2a0d4a');
		ctx.fillRect(0, 0, S, S);
		const body = [[40, 440], [62, 398], [30, 330], [18, 250], [42, 182], [28, 100], [55, 26], [82, 118], [102, 58], [114, 150], [142, 86], [162, 168],
			[200, 136], [226, 228], [262, 210], [290, 236], [318, 220], [346, 250], [378, 236], [413, 262], [448, 236], [480, 250], [508, 220],
			[536, 236], [564, 210], [600, 228], [626, 136], [664, 168], [684, 86], [712, 150], [724, 58], [744, 118], [771, 26], [798, 100],
			[784, 182], [808, 250], [796, 330], [764, 398], [786, 440]];
		const horn = [[296, 18], [338, 58], [388, 196], [366, 214], [334, 122], [306, 70]];
		const eye = [[278, 150], [356, 160], [348, 198], [316, 212], [288, 188]];
		const mouth = [[160, 266], [200, 292], [214, 276], [242, 304], [262, 284], [292, 314], [312, 292], [342, 324], [362, 302], [392, 334], [413, 372],
			[434, 334], [464, 302], [484, 324], [514, 292], [534, 314], [564, 284], [584, 304], [612, 276], [626, 292], [666, 266],
			[628, 330], [596, 342], [566, 372], [534, 360], [504, 398], [472, 382], [442, 424], [413, 402], [384, 424], [354, 382],
			[322, 398], [292, 360], [260, 372], [230, 342], [198, 330]];
		const mirror = (pts) => pts.map(([x, y]) => [826 - x, y]);
		ctx.save();
		ctx.translate(128, 196);
		ctx.scale(0.29, 0.29);
		ctx.translate(-413, -440);
		const halo = ctx.createRadialGradient(413, 300, 60, 413, 300, 560);
		halo.addColorStop(0, 'rgba(255,150,60,0.6)');
		halo.addColorStop(0.45, 'rgba(255,60,140,0.35)');
		halo.addColorStop(1, 'rgba(255,60,140,0)');
		ctx.fillStyle = halo;
		ctx.fillRect(-160, -270, 1150, 1140);
		const flame = ctx.createLinearGradient(0, 0, 826, 0);
		flame.addColorStop(0, '#5a1fd6');
		flame.addColorStop(0.35, '#c42aa8');
		flame.addColorStop(0.5, '#ff3d7a');
		flame.addColorStop(0.65, '#c42aa8');
		flame.addColorStop(1, '#5a1fd6');
		ctx.shadowColor = '#ff6a2b';
		ctx.shadowBlur = 30;
		poly(ctx, body, flame);
		ctx.shadowBlur = 0;
		for (const pts of [horn, mirror(horn), eye, mirror(eye)]) {
			const g = ctx.createLinearGradient(0, 20, 0, 214);
			g.addColorStop(0, '#7a2af0');
			g.addColorStop(1, '#ff5a3a');
			poly(ctx, pts, g);
		}
		const m = ctx.createLinearGradient(0, 266, 0, 424);
		m.addColorStop(0, '#ff5fd0');
		m.addColorStop(0.5, '#ffc2f0');
		m.addColorStop(1, '#ff4fc4');
		poly(ctx, mouth, m);
		ctx.restore();
		// the floor, a ball and a hunter's sword
		ctx.fillStyle = '#3a1660';
		ctx.fillRect(0, 200, S, S - 200);
		ctx.fillStyle = '#ff4fd8';
		ctx.fillRect(0, 199, S, 3);
		circle(ctx, 160, 222, 9, 'white');
		circle(ctx, 160, 222, 13, 'rgba(255,255,255,0.25)');
		rrect(ctx, 70, 236, 70, 8, 4, 'rgba(255,255,255,0.85)');
	});

	return out;
});

const dir = path.join(PROJECT, 'assets/icons');
for (const [name, url] of Object.entries(icons)) {
	fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
	console.log('wrote assets/icons/' + name + '.png');
}
await b.close();
