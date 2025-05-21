window.MazeGame = function(n){
	const W = 1600;
	const H = 1000;
	const FPS = 20;
	const PLAYERS = 6;

	if(!MazeGame.didInit){
		MazeGame.didInit = true;

		$("head").append(`
			<style>
				mazegame{
					display: block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: green;
					perspective: ${W}px;
				}

				mazeplatform{
					display: block;
					width: ${W}px;
					height: ${W*10}px;
					transform-origin: center bottom;
					background: gray;
					position: absolute;
					left: 0px;
					right: 0px;
					bottom: 0px;
					margin: auto;
					transform: rotateX(60deg);
				}
			</style>`);
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<mazegame>').appendTo(self.$el);
	let $platform = $('<mazeplatform>').appendTo($game);

	let meeps = [];
	for(var i=0; i<PLAYERS; i++){
		meeps[i] = new PartyMeep(i);
		meeps[i].$el.appendTo($game);
		meeps[i].$el.css({
			top:'70%',
			left:(40+i*10)+'%',
		});
	}

	let hud = new PartyHUD(meeps);
	hud.$el.appendTo($game);

	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	function step(){
		resize();
	}

	setInterval(step,1000/FPS);
}