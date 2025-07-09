window.PopcornGame = function(){
	const W = 1600;
	const H = 1000;
	const FPS = 50;

	const FIRE = 300;
	const PANPX = 0.1;
	const PAN = W*PANPX;


	const PopcornFire = function(){
		let self = this;
		self.$el = $('<popcornfire>');
		self.px = 0.5;
		self.wall = 0;

		$('<popcornshadow>').appendTo(self.$el);
		let $sprite = $('<popcornsprite>').appendTo(self.$el);

		let nStep = 0;
		self.step = function(){

			nStep++;

			let px = self.px;
			self.$el.css({
				left: self.wall*W + px * W + 'px',
			})

			let nFireStep = Math.floor(nStep/5);

			let nx = nFireStep;

			$sprite.css({
				'background-position-x':-nx*FIRE + 'px',
			})
		}
	}

	const PopcornMeep = function(n){
		let self = this;
		self.$el = $('<popcornmeep>');

		self.px = 0;
		self.wall = 0;

		let meep = new PartyMeep(n);
		meep.$el.appendTo(self.$el);
		meep.$el.css({
			bottom: '0px',
		})

		meep.$handLeft.css({top:'190px'});
		meep.$handRight.css({top:'190px'});

		let $pan = $('<popcornpan>').appendTo(self.$el);

		self.step = function(){
			let px = self.px;
			self.$el.css({
				left: self.wall*W + px * W + 'px',
			})

			meep.$el.css({
				left: 120 + 'px',
			})
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
					bottom: 120px;
				}

				popcornmeep partymeep{
					transition: all 0.5s;
				}

				popcornfire{
					display: block;
					position: absolute;
					left: 50%;
					bottom: 100px;
				}

				popcornsprite{
					display: block;
					position: absolute;
					background-image: url(./proto/img/party/sprite-fire.png);
					width: ${FIRE}px;
					height: ${FIRE}px;
					background-size: 1200%;
					left: ${-FIRE/2}px;
					bottom: ${-FIRE/12}px;
				}

				popcornshadow{
					display: block;
					position: absolute;
					width: ${FIRE/2}px;
					height: ${FIRE/2/4}px;
					left: ${-FIRE/4}px;
					bottom: ${-FIRE/2/8}px;
					background: black;
					border-radius: 100%;
					opacity: 0.5;
				}

				popcornpan{
					display: block;
					position: absolute;
					bottom: 100px;
					left: 0px;
					z-index: 1;
				}

				popcornpan:before{
					content: "";
					width: 20px;
					height: 80px;
					background: #999;
					position: absolute;
					transform-origin: bottom center;
					transform: rotate(30deg);
					left: 50%;
					bottom: 50%;
					border-radius: 10px;
				}

				popcornpan:after{
					content: "";
					display: block;
					position: absolute;
					width: ${PAN}px;
					height: ${PAN/3}px;
					background: #999;
					
					border-radius: 100%;
					border: 5px solid white;
					box-sizing: border-box;
					box-shadow: 0px 10px 0px white;
					left: ${-PAN/2}px;
					top: ${-PAN/3/2}px;
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
	let fires = [];
	function initGame(count){
		for(var i=0; i<count; i++){
			meeps[i] = new PopcornMeep(i);
			meeps[i].$el.appendTo($game);
		}

		for(var i=0; i<3; i++){
			fires[i] = new PopcornFire();
			fires[i].wall = i;
			fires[i].$el.appendTo($game);
		}
	}

	

	initGame(2);

	function step(){

		for(var f in fires){
			fires[f].step();
		}

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
			meeps[m].wall = p[m].wall;
			meeps[m].r =  {W:p[m].rW, X:p[m].rX, Y:p[m].rY, Z:p[m].rZ};
		}
	}

	let interval = setInterval(step,1000/FPS);
}