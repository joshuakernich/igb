window.FinalFrenzyGame = function(){
	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const FLOORPY = 0.1;

	const FrenzyMeep = function(n){
		let self = this;
		self.$el = $('<frenzymeep>');

		self.px = 0;
		self.py = 1;
		self.wall = 1;

		let meep = new PartyMeep(n);
		meep.$shadow.hide();
		meep.$el.appendTo(self.$el);
		meep.$el.css({
			bottom: '0px',
			left: '0px',
		})

		self.redraw = function(){
			self.$el.css({
				bottom: FLOORPY * H + 'px',
				left: self.wall*W + self.px * W + 'px',
			})
		}
	}

	if( !FinalFrenzyGame.init ){
		FinalFrenzyGame.init = true;

		$("head").append(`
			<style>
				finalfrenzygame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background-image: url(./proto/img/party/bg-cosmos-tile.avif);
					background-size: 33.3%;
					background-position: center bottom;
					background-position-y: 0px;
				}

				frenzymeep{
					display: block;
					position: absolute;
				}
			</style>
		`)
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<finalfrenzygame>').appendTo(self.$el);

	let hud = new PartyHUD('purple');
	hud.$el.appendTo($game);

	let meeps = [];
	function initGame(count){
		for(var i=0; i<count; i++){
			meeps[i] = new FrenzyMeep(i);
			meeps[i].$el.appendTo($game);
			meeps[i].wall = 0;
		}
	}

	hud.initPlayerCount(initGame);

	let nStep = 0;
	function step(){
		nStep++;
		$game.css({
			'background-position-y':nStep*5+'px',
		})

		for(var m in meeps) meeps[m].redraw();
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