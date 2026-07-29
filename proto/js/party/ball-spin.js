window.BallSpinGame = function( playersMeta ){

	const W = 1600;
	const H = 1000;
	const FPS = 50;

	const BALL = 300;
	const GRAVITY = 0.001;
	

	if( !BallSpinGame.init ){
		BallSpinGame.init = true;

		$("head").append(`
			<style>
				ballspingame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: gray;
					background-position: bottom 120px center;
					perspective: ${W*3}px;
					background: url(./proto/img/bball-neon.png);
					background-size: 100%;
					background-position: center 30%;
				}

				ballspinplayer{
					display:block;
					position:absolute;
					left: 50%;
					bottom: ${H*0.5}px;

				}

				ballspinarm{
					display:block;
					height: ${H*0.7}px;
					width: ${H*0.3}px;
					
					background-image: url('./proto/img/bball-arm.png');
					background-size:170%;
					background-position-x: center;
					background-position-y: ${-H*0.11}px;
					position: absolute;
					top: 0px;
					left: ${-H*0.3/2}px;
				}

				ballspinwrist{
					display: block;
					position: absolute;
					left: 90px;
					top: 260px;
					width: 100px;
					height: 60px;
					background: red;
					transform: rotate(-5deg);
					border-radius:5px 5px 10px 10px;
					border: 2px solid #222;
					box-shadow: inset 1px 3px 5px rgba(255,255,255,0.5), 0px 2px 10px rgba(0,0,0,0.6); 
				}

				ballspinball{
					display:block;
					position: absolute;
				}

				ballspinball:before{
					content:"";
					display:block;
					width: ${BALL}px;
					height: ${BALL}px;
					background: url(./proto/img/bball-pattern.jpeg);
					background-size: 140%;
					background-position-x: 0%;
					position: absolute;
					left: ${-BALL/2}px;
					bottom: 0px;
					border-radius: 50%;

					animation: bgscroll;
					animation-iteration-count: infinite;
					animation-duration: 0.75s;
					animation-timing-function: linear;

					border: 10px solid red;
				}

				ballspinplayer[n="1"] ballspinwrist { background:blue; }
				ballspinball[n="1"]:before{ border: 10px solid blue; }

				

				@keyframes bgscroll{
					0%{
						background-position-x: 0%;
					}

					100%{
						background-position-x: -350%;
					}
				}

			</style>
		`)
	}

	
	let self = this;
	self.$el = $('<igb>');

	let players = [];

	let $game = $('<ballspingame>').appendTo(self.$el);
	
	const BallSpinPlayer = function(n){
		let self = this;
		self.$el = $('<ballspinplayer>').attr('n',n);
		let $arm = $('<ballspinarm>').appendTo(self.$el);
		$('<ballspinwrist>').appendTo($arm);

		self.py = 0.5;

		self.ball = new BallSpinBall(n); 
		self.ball.$el.appendTo(self.$el);

		self.redraw = function(){
			self.$el.css({
				left: (1+self.px)*W+'px',
				top: self.py*H + 'px',
			})


			let dx = self.ball.px - self.px;
			if(self.ball.py > self.py && self.ball.py < self.py + 0.05 && Math.abs(dx) < 0.07){
				self.ball.sy = 0;
				self.ball.sx = dx * 0.01 * self.ball.speed;
				self.ball.py = self.py + Math.abs(dx)*0.5;
				self.ball.speed += 0.025;
			}

			self.ball.redraw();
		}
	}

	const BallSpinBall = function(n){
		let self = this;
		self.$el = $('<ballspinball>').attr('n',n);

		self.px = 0.5;
		self.py = 0;
		self.sy = 0;
		self.sx = 0;
		self.speed = 1;

		self.redraw = function(){

			self.px += self.sx;

			self.sy += GRAVITY;
			self.py += self.sy;

			self.$el.css({
				left: (1+self.px)*W+'px',
				top: (self.py)*H+'px',
			})

			if(self.py > 1.2){
				self.py = 0;
				self.sx = 0;
				self.sy = 0;
				self.speed = 1;
				self.px = 0.1 + Math.random() * 0.8;
			}
		}
	}

	function initGame(count){

		for(var n=0; n<count; n++){
			players[n] = new BallSpinPlayer(n);
			players[n].$el.appendTo($game);
			players[n].ball.$el.appendTo($game);
		}
		
	}


	initGame(2);

	

	self.step = function(){
		
		for(var n in players){
			players[n].redraw();
		}


		resize();
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	let interval = setInterval(self.step,1000/FPS);

	self.setPlayers = function(p){
		for(var n in players){
			players[n].px = (p[n].px);
			//players[n].py = (1-p[n].pz);
		}
	}
}