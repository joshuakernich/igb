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

	// match-up sequence for each player count
	const MATCHUPS = [
		undefined,
		undefined,
		['01'],
		['01','12','02'],
		['01','23'],
		['01','23','41','12','34'],
		['01','23','45'],
	]

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

				headersscore[side='right']{
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
			meeps[m].$el.css({
				left:meeps[m].px + 'px',
			})
		}

		for(var m=0; m<meepsActive.length; m++){
			meepsActive[m].setHeight((H-meepsActive[m].py)+HEADR);

			if(m==0 && meepsActive[m].px>(W/2-HEADR) ) meepsActive[m].px = W/2-HEADR;
			if(m==1 && meepsActive[m].px<(W/2+HEADR) ) meepsActive[m].px = W/2+HEADR;

			meepsActive[m].$el.css({
				left:W + meepsActive[m].px + 'px',
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
					meepsActive[nScore].score++;
					meepsActive[nScore].$score.text(meepsActive[nScore].score);
					iTimeout = setTimeout(finiBall,1000);
				}
				ball.dead = true;
			} else if( !ball.dead ){
				for(var m in meepsActive){
					let dx = (ball.px - meepsActive[m].px);
					let dy = (ball.py - meepsActive[m].py);
					let d = Math.sqrt(dx*dx + dy*dy);

					if( d < COLLIDE ){

						let r = Math.atan2(dy,dx);

						ball.px = meepsActive[m].px + Math.cos(r) * COLLIDE;
						ball.py = meepsActive[m].py + Math.sin(r) * COLLIDE;

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
	function initBall(){
		if(ball) ball.$el.remove();
		ball = new Ball(BALLR,W,H);
		ball.$el.appendTo($game);
	}

	let iTimeout;
	function finiBall(){
		iTimeout = setTimeout( initBall, 1000 );
	}


	let meeps = [];
	let countPlayer = 2;
	function initGame(COUNT){

		countPlayer = COUNT;

		for(var i=0; i<countPlayer; i++){
			meeps[i] = new PartyMeep(i);
			meeps[i].$score = $('<headersscore>').appendTo($game).text(0).hide();
			meeps[i].$el.appendTo($game);
			meeps[i].$el.css({
				'top':FEET+'px',
				'left':40+i*20+'%',
			});
		}

		setTimeout( initNextMatchup, 1000 );
	}

	function finiMatchup(){
		clearTimeout(iTimeout);
		ball.dead = true;
		hud.initBanner('Finish!');

		setTimeout( hud.finiBanner, 2000 );
		setTimeout( MATCHUPS[countPlayer][iMatchup+1]?initNextMatchup:finiGame, 4000 );

	}

	function finiGame() {
		
		setTimeout(function(){
			let scores = [];
			for(var m in meeps) scores[m] = meeps[m].score;
			window.doPartyGameComplete(scores);
		})
	}

	let meepsActive = [];
	let iMatchup = -1;
	function initNextMatchup(){

		for( var m in meepsActive ) meepsActive[m].$score.hide();

		iMatchup++;
		let matchup = MATCHUPS[countPlayer][iMatchup];
		let iLeft = parseInt(matchup[0]);
		let iRight = parseInt(matchup[1]);

		meepsActive[0] = meeps[iLeft];
		meepsActive[1] = meeps[iRight];

		meepsActive[0].$score.show().attr('side','left');
		meepsActive[1].$score.show().attr('side','right');

		initIntro();
	}

	function initIntro(){
		hud.initBanner('Ready!');
		setTimeout(hud.finiBanner,2000);
		setTimeout(function(){
			hud.initBanner('Go!');
			hud.initTimer(30,finiMatchup);
		},3000);
		setTimeout(hud.finiBanner,4000);
		setTimeout(initBall,5000);
	}

	hud.initPlayerCount(initGame);

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