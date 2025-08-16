window.BoomChainGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const BALL = 100;

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-playroom.mp3',0.3,true);

	if( !BoomChainGame.init ){
		BoomChainGame.init = true;

		$("head").append(`
			<style>
				boomchaingame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: url(./proto/img/party/bg-village.png);
					background-size: 33.3% 180%;
					background-position: bottom center;
					perspective: ${W*3}px;
				}

				boomstage{
					position: absolute;
					display: block;
					inset: 0px;
					bottom: 100px;
					background: #0F677B;
					transform-origin: bottom center;
					transform: rotateX(50deg);
					transform-style: preserve-3d;

					box-shadow: inset 0px 30px rgba(0,0,0,0.5), inset -20px 0px rgba(0,0,0,0.5), inset 20px 0px rgba(0,0,0,0.5);
				}

				boomballcontainer{
					position: absolute;
					display: block;
					transform-style: preserve-3d;
				}

				boomballcontainer:before{
					content:"";
					position: absolute;
					display: block;
					width: ${BALL}px;
					height: ${BALL}px;
					border-radius: 100%;
					bottom: ${-BALL/2}px;
					left: ${-BALL/2}px;
					background: black;
					opacity: 0.3;
				}

				boomball{
					position: absolute;
					display: block;
					transform: rotateX(-48deg);
					transform-origin: bottom center;
					transform-style: preserve-3d;
				}

				boomballinner{
					position: absolute;
					display: block;
					bottom: 0px;
					border-radius: 100%;
					left: ${-BALL/2}px;
					width: ${BALL}px;
					height: ${BALL}px;
					box-shadow: inset -5px -10px 20px black;
					background: white;
					overflow: hidden;
				}

				boomballinner:after{
					content:"";
					position: absolute;
					display: block;
					inset: -20px;
					border-radius: 100%;
					border: 20px solid rgba(0,0,0,0.2);
					top: 20%;
				}
		</style>`)
	}

	const BoomBall = function(){
		let self = this;
		self.$el = $('<boomballcontainer>');

		let $ball = $('<boomball>').appendTo(self.$el);
		let $inner = $('<boomballinner>').appendTo($ball);

		self.px = 1.5;
		self.py = 0.5;

		self.r = Math.random() * Math.PI * 2;
		self.speed = 0.001;
		self.sx = Math.cos(self.r)*self.speed;
		self.sy = Math.sin(self.r)*self.speed;

		self.step = function() {
			self.px += self.sx;
			self.py += self.sy;
		}

		self.redraw = function(){
			self.$el.css({
				left:self.px * W + 'px',
				top:self.py * H + 'px',
			})

			$inner.css({		
				transform: 'rotate('+self.px*W+'deg)',
			})
		}
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<boomchaingame>').appendTo(self.$el);
	let $stage = $('<boomstage>').appendTo($game);

	let hud = new PartyHUD('#F49B29');
	hud.$el.appendTo($game);

	let countPlayers = 6;

	const VOLUME = 50;

	let balls = [];
	function initGame(count) {
		countPlayers = count;
		for(var i=0; i<VOLUME; i++){
			balls[i] = new BoomBall();
			balls[i].px = 0.1 + Math.random() * 2.8;
			balls[i].py =  0.1 + Math.random() * 0.8;
			balls[i].$el.appendTo($stage);
		}

		balls[0].px = 1.4;
		balls[1].px = 1.6;
		balls[0].py = 0.48
		balls[1].py = 0.52;

		balls[0].sx = balls[0].speed;
		balls[1].sx = -balls[1].speed;
		balls[0].sy = balls[1].sy = 0;
	}

	initGame(6);

	self.step = function(){
		
		for(var b in balls) balls[b].step(); 

		for(var a in balls){

			if(balls[a].px > 2.96) balls[a].sx = -Math.abs(balls[a].sx);
			if(balls[a].px < 0.04) balls[a].sx = Math.abs(balls[a].sx);
			if(balls[a].py > 0.85) balls[a].sy = -Math.abs(balls[a].sy);
			if(balls[a].py < 0.15) balls[a].sy = Math.abs(balls[a].sy);

			for(var b in balls){

				if(b != a){
					let dx = (balls[a].px - balls[b].px)*W;
					let dy = (balls[a].py - balls[b].py)*H;
					let d = Math.sqrt(dx*dx+dy*dy);

					if(d<BALL){
						let r = Math.atan2(dy,dx);
						let cx = (balls[a].px + balls[b].px)/2;
						let cy = (balls[a].py + balls[b].py)/2;

						//balls[a].px = cx + Math.cos(r) * (BALL/W)/2;
						//balls[a].py = cy + Math.sin(r) * (BALL/W)/2;

						balls[a].sx = Math.cos(r) * balls[a].speed;
						balls[a].sy = Math.sin(r) * balls[a].speed;

						//balls[b].px = cx + Math.cos(r+Math.PI) * (BALL/W)/2;
						//balls[b].py = cy + Math.sin(r+Math.PI) * (BALL/W)/2;

						balls[b].sx = Math.cos(r+Math.PI) * balls[b].speed;
						balls[b].sy = Math.sin(r+Math.PI) * balls[b].speed;


					}
				}
			}
		}
  


		for(var b in balls) balls[b].redraw();

		resize();
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	let interval = setInterval(self.step,1000/FPS);

	self.fini = function(){
		audio.stop('music');
		clearInterval(interval);
	}

	self.setPlayers = function(p){
		self.players = p;
		self.players.length = countPlayers;
	}
}