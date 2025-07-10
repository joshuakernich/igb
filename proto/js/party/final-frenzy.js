window.FinalFrenzyGame = function(){
	const W = 1600;
	const H = 1000;
	const FPS = 50;

	if( !FinalFrenzyGame.init ){
		FinalFrenzyGame.init = true;

		$("head").append(`
			<style>
				finalfrenzygame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background-image: url(./proto/img/party/bg-camping.png);
					background-size: 33.3% 150%;
					background-position: bottom center;
				}
			</style>
		`)
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<finalfrenzygame>');
	
	let meeps = [];
	function step(){
		resize();
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].px = p[m].px;
			meeps[m].pz = p[m].pz;
			//meeps[m].py = p[m].py;
			if( p[m].wall != undefined ){
				meeps[m].wall = p[m].wall;
				p[m].wall = undefined;
			} 
			meeps[m].r =  {W:p[m].rW, X:p[m].rX, Y:p[m].rY, Z:p[m].rZ};
		}
	}

	let interval = setInterval(step,1000/FPS);
}