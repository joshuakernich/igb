window.PopcornGame = function(){
	const W = 1600;
	const H = 1000;
	const FPS = 50;

	const PopcornMeep = function(n){
		let self = this;
		self.$el = $('<popcornmeep>');

		let meep = new PartyMeep(n);
		meep.$el.appendTo(self.$el);

		self.step = function(){

		}
	}

	if( !PopcornGame.init ){
		PopcornGame.init = true;

		$("head").append(`
			<style>
				popcorngame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background-image: url(./proto/img/party/bg-camping.png);
					background-size: 33.3% 150%;
					background-position: bottom center;
				}

				popcornmeep{
					display: block;
					position: absolute;
					left: 50%;
					bottom: 0px;
				}
			</style>
		`)
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<popcorngame>').appendTo(self.$el);

	let hud = new PartyHUD('#C48264');
	hud.$el.appendTo($game);

	let meeps = [];
	function initGame(count){
		for(var i=0; i<count; i++){
			meeps[i] = new PopcornMeep(i);
			meeps[i].$el.appendTo($game);
		}
	}

	function step(){

		for(var m in meeps){
			meeps[m].step();
		}

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
			meeps[m].py = p[m].py;
			meeps[m].r =  {W:p[m].rW, X:p[m].rX, Y:p[m].rY, Z:p[m].rZ};
		}
	}

	let interval = setInterval(step,1000/FPS);
}