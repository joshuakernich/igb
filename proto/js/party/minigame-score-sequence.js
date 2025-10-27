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


	let scores = [5,10,20,20,35,30];

	hud.initPlayerCount(function(count){

		scores.length = count;

		
		let meeps = [];
		for(var s in scores){
			meeps[s] = {score:scores[s]};
		}

		hud.initPlayers(meeps);

		let rewards = window.scoresToRewards(scores);

		setTimeout(function(){
			hud.showFinalScores(scores,rewards);
		})
		
	});

	setInterval(resize,1000/FPS);

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		self.$el.css('transform','scale('+scale+')');
	}
}