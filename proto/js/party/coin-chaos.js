window.CoinChaosGame = function(){

	let CoinPile = function(volume){
		let self = this;
		self.$el = $('<coinchaospile>');

		self.x = self.y = 0;

		self.redraw = function(){
			self.$el.css({
				left: self.x * scale,
				top: self.y * scale,
			})
		}
	}

	let Coin = function(n,scale){
		let self = this;
		self.$el = $('<coinchaoscoin>');

		self.x = self.y = 0;

		self.redraw = function(){
			self.$el.css({
				left: self.x * scale,
				top: self.y * scale,
			})
		}
	}

	let Meep = function(n,scale){
		let self = this;
		self.$el = $('<coinchaosmeep>');

		self.x = self.y = 0;

		let meep = new PartyMeep(n);
		meep.setHeight(350);
		meep.$el.appendTo(self.$el);

		self.redraw = function(){
			self.$el.css({
				left: self.x * scale,
				top: self.y * scale,
			})
		}
	}


	const W = 1600;
	const H = 1000;

	if(!CoinChaosGame.init){
		CoinChaosGame.init = true;

		$("head").append(`
			<style>
				coinchaosgame{
					display:block;
					width: ${W}px;
					height: ${H}px;
					background: black;
					position: absolute;
					transform-origin: top left;
					left: 33.3%;
					perspective: ${W}px;
				}

				coinchaosplatform{
					width: ${W}px;
					height: ${W}px;
					background: gray;
					transform-origin: bottom center;
					border-radius: 100px;
					transform: rotateX(60deg);
					display: block;
					position: absolute;
					bottom: 0px;
					left: 0px;
					transform-style: preserve-3d;
				}

				coinchaoscenter{
					position: absolute;
					top: 50%;
					left: 50%;
					display: block;
					transform-style: preserve-3d;
				}

				coinchaosmeep{
					transform: rotateX(-60deg);
					position: absolute;
					display: block;
					top: 50%;
					left: 50%;
					transform-style: preserve-3d;
				}
			</style>`);
	}

	let self = this;
	self.$el = $('<igb>')
	let $game = $('<coinchaosgame>').appendTo(self.$el);
	let $platform = $('<coinchaosplatform>').appendTo($game);
	let $center = $('<coinchaoscenter>').appendTo($platform);

	function step(){
		for(var m in meeps) meeps[m].redraw();
		resize();
	}

	function resize(){
		let w = $(document).innerWidth();
		scale = (w/3)/W;
		$game.css('transform','scale('+scale+')');
	}

	let meeps = [];
	for(var i=0; i<6; i++){
		meeps[i] = new Meep(i,W/2);
		meeps[i].$el.appendTo($center);
	}

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].x = p[m].x;
			meeps[m].y = -p[m].z;
		
		}
	}

	const FPS = 20;
	setInterval(step,1000/FPS);
}