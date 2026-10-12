/*
 * Minigame Score
 *
 * A tiny demo of the HUD's final-score podium: pick the squad size and the
 * podium plays out straight away with fixed scores (5, 10, 20, 20, 35, 30,
 * cut to the squad size), coin rewards and all. There is no game and no art,
 * only the HUD over the stage's plain background, and it never completes.
 *
 * Input: none.
 */
IGB.register('minigame-score', function MinigameScoreGame(stage) {

	const self = this;

	const hud = new HUD();
	hud.$el.appendTo(stage.$ui);

	const scores = [5, 10, 20, 20, 35, 30];

	// The original never used the Box Party player list: it always asks for
	// the squad size.
	hud.initPlayerCount(function (count) {

		scores.length = count;

		const meeps = [];
		for (const s in scores) {
			meeps[s] = { score: scores[s] };
		}

		hud.initPlayers(meeps);

		const rewards = window.scoresToRewards(scores);

		stage.timeout(function () {
			hud.showFinalScores(scores, rewards);
		});
	});

	self.fini = function () {
		hud.fini();
	};
});
