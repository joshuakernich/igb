window.MinigameScoreSequence = function( ){

	const FPS = 50;
	const W = 1600;
	const H = 1000;
	let self = this;

	self.$el = $('<div>').css({
		width: W*3 + 'px',
		height: H + 'px',
		'transform-origin':'top left',
	});

	let hud = new PartyHUD();
	hud.$el.appendTo(self.$el);

	hud.initPlayerCount(function(){
		let scores = [5,10,15,20,25,30];
		let rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores,rewards);
	});

	setInterval(resize,1000/FPS);

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		self.$el.css('transform','scale('+scale+')');
	}
}