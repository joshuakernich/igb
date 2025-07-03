window.HeadersGame = function(){

	let Ball = function(RADIUS,W,H){

		const GRAVITY = 1;

		let self = this;
		self.$el = $('<headersball>');

		let $shadow = $('<headersballshadow>').appendTo(self.$el);
		let $ball = $('<headersballball>').appendTo(self.$el);

		self.px = W/2;
		self.py = H*0.25;
		self.sx = -15 + Math.random() * 30;
		self.sy = -25;

		self.step = function(){
			self.sy += GRAVITY;
			self.py += self.sy;
			self.px += self.sx;
		}

		self.update = function(){

			self.$el.css({
				left: W + self.px + 'px',
			})

			$ball.css({
				top: -H + self.py + 'px',
			})
		}
	}

	const W = 1600;
	const H = 1000;
	const BALLR = 60;
	const HEADR = 50;
	const FEET = 900;
	const COLLIDE = HEADR+BALLR;

	if( !HeadersGame.init ){
		HeadersGame.init = true;

		$("head").append(`
			<style>
				@import url('https://fonts.googleapis.com/css2?family=Paytone+One&display=swap');

				headersgame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: url(./proto/img/party/bg-stadium.jpg);
					background-size: 100%;
					background-position: bottom center;

					font-family: "Paytone One";
					color: white;
				}

				headersball{
					display: block;
					position: absolute;
					top: ${FEET}px;
				}

				headersballshadow{
					display: block;
					position: absolute;
					width: ${BALLR*2}px;
					height: ${BALLR*2*0.25}px;
					background: black;
					transform: translate(-50%,-50%);
					border-radius: 100%;
					opacity: 0.5;
				}

				headersballball{
					display: block;
					position: absolute;
					width: ${BALLR*2}px;
					height: ${BALLR*2}px;
					background: white;
					transform: translate(-50%,-50%);
					border-radius: 100%;
				}

				headersline{
					width: 40px;
					height: 400px;
					display: block;
					position: absolute;
					left: 50%;
					transform: translateX(-50%);
					background: linear-gradient(to top, white, transparent);
					bottom: 0px;
				}

				headersscore{
					display: block;
					position: absolute;
					top: 10%;
					width: ${W/2}px;
					left: ${W}px;
					font-size: 150px;
					text-align: center;
					opacity: 0.2;
				}

				headersscore:last-of-type{
					left: ${W*1.5}px;
				}

			</style>`);
	}

	let self = this;
	let timeout = undefined;

	self.$el = $('<igb>');
	let $game = $('<headersgame>').appendTo(self.$el);
	let $line = $('<headersline>').appendTo($game);
	let hud = new PartyHUD();
	hud.$el.appendTo($game);

	function step(){

		for(var m=0; m<meeps.length; m++){
			meeps[m].setHeight((H-meeps[m].py)+HEADR);

			if(m==0 && meeps[m].px>(W/2-HEADR) ) meeps[m].px = W/2-HEADR;
			if(m==1 && meeps[m].px<(W/2+HEADR) ) meeps[m].px = W/2+HEADR;

			meeps[m].$el.css({
				left:W + meeps[m].px + 'px',
			})
		}

		if(ball){
			ball.step();

			// wall left
			if(ball.px<BALLR){
				ball.px = BALLR;
				ball.sx = Math.abs(ball.sx);
			}

			// wall right
			if(ball.px > W-BALLR){
				ball.px = W-BALLR;
				ball.sx = -Math.abs(ball.sx);
			}

			//ground
			if(ball.py > H-BALLR){
				ball.py = H-BALLR;
				ball.sy = -Math.abs(ball.sy)/2;
				ball.sx *= 0.5;
				if(!ball.dead){
					let nScore = (ball.px > W/2)?0:1;
					meeps[nScore].score++;
					meeps[nScore].$score.text(meeps[nScore].score);
					iTimeout = setTimeout(finiRound,1000);
				}
				ball.dead = true;
			} else if( !ball.dead ){
				for(var m in meeps){
					let dx = (ball.px - meeps[m].px);
					let dy = (ball.py - meeps[m].py);
					let d = Math.sqrt(dx*dx + dy*dy);

					if( d < COLLIDE ){

						let r = Math.atan2(dy,dx);

						ball.px = meeps[m].px + Math.cos(r) * COLLIDE;
						ball.py = meeps[m].py + Math.sin(r) * COLLIDE;

						ball.sx = Math.cos(r) * 20;
						ball.sy = Math.sin(r) * 20 - 10;
					}
				}
			}

			ball.update();
		}
		

		resize();
	}

	let ball;
	function initRound(){
		if(ball) ball.$el.remove();
		ball = new Ball(BALLR,W,H);
		ball.$el.appendTo($game);
	}

	function finiRound(){
		//ball.$el.remove();
		iTimeout = setTimeout( initRound, 1000 );
	}

	let meeps = [];
	function initGame(){
		for(var i=0; i<2; i++){
			meeps[i] = new PartyMeep(i);
			meeps[i].$score = $('<headersscore>').appendTo($game).text(0);
			meeps[i].$el.appendTo($game);
			meeps[i].$el.css({
				'top':FEET+'px',
				'left':40+i*20+'%',
			});
		}

		
		
	}

	function finiGame() {
		clearTimeout(iTimeout);
		ball.dead = true;
		hud.initBanner('Finish!');
		setTimeout(function(){
			let scores = [];
			for(var m in meeps) scores[m] = meeps[m].score;
			window.doPartyGameComplete(scores);
		})
	}

	function initIntro(){
		initGame();
		hud.initBanner('Ready!');
		setTimeout(hud.finiBanner,2000);
		setTimeout(function(){
			hud.initBanner('Go!');
			hud.initTimer(30,finiGame);
			
		},3000);
		setTimeout(hud.finiBanner,4000);
		setTimeout(initRound,5000);
	}

	initIntro();

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	const FPS = 50;
	let interval = setInterval(step,1000/FPS);

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].px = p[m].px * W;
			meeps[m].py = p[m].py * H;
			meeps[m].r =  {W:p[m].rW, X:p[m].rX, Y:p[m].rY, Z:p[m].rZ};
		}
	}
}