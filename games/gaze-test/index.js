/*
 * Gaze Test: where everyone's looking, from their hats' rotation
 * (IGB.players: rot, look, gaze).
 *
 * A filled circle in each player's colour sits where IGB.players says they're
 * looking: the hat's +Z axis, in a room 0.625 as tall as it is wide. Around
 * it, small labelled rings show where they'd be looking under the other
 * assumptions we might have got wrong, so the right one can be read off the
 * walls in the gamebox:
 *
 *   -Z  +X  -X  +Y  -Y   a different axis of the hat pointing forward
 *   MIRROR               left and right swapped (the other handedness)
 *   FLIP                 up and down swapped
 *   CUBE                 +Z, but the room as tall as it is wide
 *
 * The wand, if there is one: a diamond where the tracker itself says it's
 * pointing (WAND), and a ring where its +Z axis would point by our maths
 * (WAND +Z): if they agree, our maths is right.
 *
 * Along the bottom of each wall, everyone's numbers: position, rotation and
 * look. No show, no players to pick: it just runs. An ES module (manifest: module: true).
 */
IGB.register('gaze-test', function GazeTest(stage) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;
	const TAU = Math.PI * 2;
	const P = IGB.players;

	// the other assumptions: a forward axis (in the hat's own axes), what to
	// do to the look after (mirror x, flip y), and the room's height
	const OTHERS = [
		{ label: '-Z', axis: { x: 0, y: 0, z: -1 } },
		{ label: '+X', axis: { x: 1, y: 0, z: 0 } },
		{ label: '-X', axis: { x: -1, y: 0, z: 0 } },
		{ label: '+Y', axis: { x: 0, y: 1, z: 0 } },
		{ label: '-Y', axis: { x: 0, y: -1, z: 0 } },
		{ label: 'MIRROR', axis: { x: 0, y: 0, z: 1 }, mirror: true },
		{ label: 'FLIP', axis: { x: 0, y: 0, z: 1 }, flip: true },
		{ label: 'CUBE', axis: { x: 0, y: 0, z: 1 }, room: { x: 1, y: 1, z: 1 } },
	];

	function lookFor(rot, o) {
		const f = P.rotate(rot, o.axis), l = Math.hypot(f.x, f.y, f.z) || 1;
		return { x: (o.mirror ? -f.x : f.x) / l, y: (o.flip ? -f.y : f.y) / l, z: f.z / l };
	}

	const fmt = (v) => (v === undefined || v === null || isNaN(v) ? '—' : (v >= 0 ? ' ' : '') + v.toFixed(2));

	function ring(ctx, x, y, r, colour, label, dashed) {
		ctx.save();
		ctx.lineWidth = 4;
		ctx.strokeStyle = colour;
		if (dashed) ctx.setLineDash([8, 6]);
		ctx.beginPath();
		ctx.arc(x, y, r, 0, TAU);
		ctx.stroke();
		ctx.restore();
		art.text(ctx, label, x, y - r - 16, { size: 22, font: 'Share Tech Mono', weight: 400, fill: colour, outline: 'rgba(0,0,0,0.7)', outlineWidth: 4 });
	}

	self.draw = function (ctx) {
		// the walls: dark, a grid, their names
		ctx.fillStyle = '#0d1118';
		ctx.fillRect(0, 0, WIDTH, H);
		ctx.strokeStyle = 'rgba(255,255,255,0.07)';
		ctx.lineWidth = 2;
		for (let x = 0; x <= WIDTH; x += W / 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
		for (let y = 0; y <= H; y += H / 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }
		['LEFT', 'FRONT', 'RIGHT'].forEach((name, w) => {
			ctx.strokeStyle = 'rgba(255,255,255,0.25)';
			ctx.beginPath(); ctx.moveTo(w * W, 0); ctx.lineTo(w * W, H); ctx.stroke();
			art.text(ctx, name, w * W + W / 2, 60, { size: 48, font: 'Share Tech Mono', weight: 400, fill: 'rgba(255,255,255,0.35)' });
		});
		art.text(ctx, 'GAZE TEST', W * 1.5, 130, { size: 30, font: 'Share Tech Mono', weight: 400, fill: 'rgba(255,255,255,0.5)' });
		art.text(ctx, 'FILLED: WHERE WE THINK YOU LOOK (+Z)  ·  RINGS: OTHER GUESSES', W * 1.5, 170, { size: 22, font: 'Share Tech Mono', weight: 400, fill: 'rgba(255,255,255,0.4)' });

		const players = P.list.filter((p) => p && p.X !== undefined);
		const lines = [];
		players.forEach((p, i) => {
			const colour = PLAYER_COLORS[i % PLAYER_COLORS.length];
			lines.push({ colour, text: `P${i + 1}  pos ${fmt(p.X)} ${fmt(p.Y)} ${fmt(p.Z)}  rot ${p.rot ? [p.rot.w, p.rot.x, p.rot.y, p.rot.z].map(fmt).join(' ') : 'none'}  look ${p.look ? [p.look.x, p.look.y, p.look.z].map(fmt).join(' ') : '—'}  ${p.gaze ? ['L', 'F', 'R'][p.gaze.wall] + ' ' + fmt(p.gaze.x) + ' ' + fmt(p.gaze.y) : 'no wall'}` });
			if (!p.rot) return;
			// the other guesses first, under the main one
			for (const o of OTHERS) {
				const g = P.wallHit(p.X, p.Y, p.Z, lookFor(p.rot, o), o.room);
				if (g) ring(ctx, g.at.x, g.at.y, 26, colour, o.label, true);
			}
			if (p.gaze) {
				ctx.save();
				ctx.fillStyle = colour;
				ctx.shadowColor = colour;
				ctx.shadowBlur = 24;
				ctx.beginPath();
				ctx.arc(p.gaze.at.x, p.gaze.at.y, 44, 0, TAU);
				ctx.fill();
				ctx.restore();
				art.text(ctx, 'P' + (i + 1), p.gaze.at.x, p.gaze.at.y, { size: 34, font: 'Share Tech Mono', weight: 400, fill: 'white' });
			}
		});

		// the wand: where the tracker says it points, and where our maths says
		const wand = P.wand;
		if (wand && (wand.rot || wand.point)) {
			const pt = wand.point;
			lines.push({ colour: '#fff', text: `WAND pos ${fmt(wand.X)} ${fmt(wand.Y)} ${fmt(wand.Z)}  rot ${wand.rot ? [wand.rot.w, wand.rot.x, wand.rot.y, wand.rot.z].map(fmt).join(' ') : 'none'}  tracker says ${pt ? ['L', 'F', 'R'][pt.wall] + ' ' + fmt(pt.x) + ' ' + fmt(pt.y) + ' ' + pt.button : 'no wall'}` });
			if (pt && pt.wall >= 0) {
				// (drawn as if its x, y run -1..1 across the wall, up positive)
				const x = (pt.wall + (pt.x + 1) / 2) * W, y = (1 - (pt.y + 1) / 2) * H;
				ctx.save();
				ctx.translate(x, y);
				ctx.rotate(Math.PI / 4);
				ctx.fillStyle = 'rgba(255,255,255,0.9)';
				ctx.fillRect(-22, -22, 44, 44);
				ctx.restore();
				art.text(ctx, 'WAND', x, y - 50, { size: 24, font: 'Share Tech Mono', weight: 400, fill: '#fff', outline: 'rgba(0,0,0,0.7)', outlineWidth: 4 });
			}
			if (wand.rot) {
				const g = P.wallHit(wand.X, wand.Y, wand.Z, lookFor(wand.rot, { axis: { x: 0, y: 0, z: 1 } }));
				if (g) ring(ctx, g.at.x, g.at.y, 32, '#fff', 'WAND +Z', true);
			}
		}

		// everyone's numbers, along the bottom of every wall
		for (let w = 0; w < 3; w++) {
			lines.forEach((l, k) => {
				ctx.save();
				ctx.font = '20px "Share Tech Mono", monospace';
				ctx.fillStyle = l.colour;
				ctx.textAlign = 'left';
				ctx.fillText(l.text, w * W + 30, H - 40 - (lines.length - 1 - k) * 28);
				ctx.restore();
			});
			if (!lines.length) art.text(ctx, 'NO ONE TRACKED YET', w * W + W / 2, H - 60, { size: 26, font: 'Share Tech Mono', weight: 400, fill: 'rgba(255,255,255,0.4)' });
		}
	};

	self.fini = function () {};
});
