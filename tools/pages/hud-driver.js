// Same sequence for both HUDs. window.mountHUD(colour) returns a HUD mounted in a 4800x1000 world.
window.runHUD = function (state) {
	const hud = window.mountHUD('#FDC972');
	const meeps = [{ score: 12 }, { score: 7 }, { score: 30 }, { score: 0 }];
	if (state === 'count') hud.initPlayerCount(() => {});
	if (state === 'round') { hud.initPlayers(meeps); hud.revealTimer(30); hud.initRound(1, 3); }
	if (state === 'summon') { hud.initPlayers(meeps); hud.summonPlayers([0, 2]); }
	if (state === 'flash') { hud.flashMessage(1.5, 0.5, 'GO!', 200, 5000); hud.flashMessage(0.5, 0.3, '10 seconds left', 50, 5000); }
	if (state === 'swap') { hud.initPlayers(meeps); hud.swapPlayers(0, 1); }
	if (state === 'tutorial') hud.initTutorial('Coconut Climbers', { x: 1.25, y: 0.45, msg: 'Align yourself<br>with your avatar', icon: 'align' }, { x: 1.5, y: 0.6, msg: 'Squat up and down<br>to climb', icon: 'up-down' });
	if (state === 'banner') { hud.initPlayers(meeps); hud.initBanner('Nice one!'); }
	if (state === 'final') { hud.initPlayers(meeps); hud.showFinalScores([12, 7, 30, 0], [6, 4, 10, 2]); }
	if (state === 'tally') { const players = [{ score: 12, name: 'ALICE' }, { score: 7, name: 'BOB' }, { score: 30, name: 'CAZ' }]; const T = window.Tally || window.PartyTally; const t = new T(players); t.$el.appendTo(window.worldEl); t.showRows(); setTimeout(() => t.showResults([10, 6, 2]), 1200); }
};
