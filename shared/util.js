/*
 * Small helpers shared by every game.
 */

// Player colours, in player order. The same colours are CSS custom
// properties (--player-0 .. --player-5) in core/stage.css.
window.PLAYER_COLORS = ['red', 'blue', 'limegreen', '#dd00ff', '#ff6600', '#ffbb00'];

// Shuffle an array in place.
window.shuffleArray = function (array) {
	let i = array.length;
	while (i !== 0) {
		const j = Math.floor(Math.random() * i);
		i--;
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
};

// Turn a game's scores into Box Party coin rewards by finishing position.
// Higher scores finish higher; tied scores share the lower position's reward.
window.scoresToRewards = function (scores) {

	const REWARDS = [
		undefined,
		[10],
		[10, 7],
		[10, 6, 2],
		[10, 8, 6, 4],
		[10, 8, 6, 4, 2],
		[10, 8, 6, 4, 2, 1],
	];

	const standings = scores.map(function (a) {
		let standing = scores.length;
		for (const b of scores) if (a >= b) standing--;
		return standing;
	});

	return standings.map((s) => REWARDS[scores.length][s]);
};

// CSS's timing curves as jQuery easings, so a CSS transition can be ported
// as $(obj).animate(props, { duration, easing: 'ease' }).
(function () {
	function cubicBezier(x1, y1, x2, y2) {
		const bx = (t) => 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
		const by = (t) => 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
		return function (x) {
			let lo = 0;
			let hi = 1;
			for (let i = 0; i < 30; i++) {
				const mid = (lo + hi) / 2;
				if (bx(mid) < x) lo = mid; else hi = mid;
			}
			return by((lo + hi) / 2);
		};
	}
	if (window.jQuery) {
		$.easing.ease = cubicBezier(0.25, 0.1, 0.25, 1);
		$.easing['ease-in'] = cubicBezier(0.42, 0, 1, 1);
		$.easing['ease-out'] = cubicBezier(0, 0, 0.58, 1);
		$.easing['ease-in-out'] = cubicBezier(0.42, 0, 0.58, 1);
	}
	window.cubicBezier = cubicBezier;
})();

window.clamp = function (v, min, max) {
	return Math.max(min, Math.min(max, v));
};

window.lerp = function (a, b, t) {
	return a + (b - a) * t;
};
