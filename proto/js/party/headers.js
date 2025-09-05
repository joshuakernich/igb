window.HeadersFootballGame = function(){

}

window.HeadersGame = function(){

	let Ball = function(RADIUS,W,H){

		const GRAVITY = 1;

		let self = this;
		self.$el = $('<headersball>');

		let $shadow = $('<headersballshadow>').appendTo(self.$el);
		let $ball = $('<headersballball>').appendTo(self.$el);

		self.px = W/2;
		self.py = H*0.4;
		self.sx = -10 + Math.random() * 20;
		self.sy = -20;

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

	const NET = 350;
	const COLLIDE = HEADR+BALLR;


	// match-up sequence for each player count
	const MATCHUPS = [
		undefined,
		undefined,
		['01'],
		['01','12','02'],
		['01','23'],
		['01','23','40','12','34'],
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
					top: ${H}px;
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
					display: none;
				}

				headersnet{
					display: block;
					position: absolute;
					bottom: 0px;
					left: 50%;
				}

				headersnet:before{
					content:"";
					width: 100px;
					height: 50px;
					background: black;
					border-radius: 100%;
					position: absolute;
					bottom: -15px;
					left: -30px;
					opacity: 0.5;
					display: block;
				}

				headersnet:after{
					content:"";
					width: 100px;
					height: ${NET+30}px;
					
					left: -50px;
					bottom: 0px;
					display: block;
					position: absolute;
					border-radius: 5px;

					background:url(proto/img/volleyball-net.png);
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

				headersfield{
					display: block;
					position: absolute;
					bottom: 100px;
					left: 0px;
					height: ${H}px;
					width: 100%;
				}

				headerstutorial{
					display: block;
					position: absolute;
					inset: 0px;
					backdrop-filter: blur(20px);
					background: rgba(150,150,150,0.2);
				}

			</style>`);
	}

	let self = this;
	let timeout = undefined;

	self.$el = $('<igb>');
	let $game = $('<headersgame>').appendTo(self.$el);
	let $tutoral = $('<headerstutorial>').appendTo($game);
	let $field = $('<headersfield>').appendTo($game);
	let $line = $('<headersline>').appendTo($game);
	let $net = $('<headersnet>').appendTo($field);

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-playroom.mp3',0.3,true);
	audio.add('bounce','./proto/audio/party/sfx-bounce.mp3',0.3);
	audio.add('cheer','./proto/audio/party/sfx-cheer.mp3',0.6);

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


			if(meepsActive[m].range){
				if(meepsActive[m].px < meepsActive[m].range.min) meepsActive[m].px = meepsActive[m].range.min;
				if(meepsActive[m].px > meepsActive[m].range.max) meepsActive[m].px = meepsActive[m].range.max;
			}

			//if(m==0 && meepsActive[m].px>(W/2-HEADR) ) meepsActive[m].px = W/2-HEADR;
			//if(m==1 && meepsActive[m].px<(W/2+HEADR) ) meepsActive[m].px = W/2+HEADR;

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
				audio.play('bounce',true);
			}

			// wall right
			if(ball.px > W-BALLR){
				ball.px = W-BALLR;
				ball.sx = -Math.abs(ball.sx);
				audio.play('bounce',true);
			}

			// net
			let dxNet = (ball.px) - (W/2);
			let isNearNet = Math.abs(dxNet) < BALLR;
			if(isNearNet && !ball.dead){

				let isHitting = ball.sy > 0 && ball.py > (H-NET-BALLR);

				if(isHitting){
					if(Math.abs(dxNet) < BALLR/2 ){
						ball.py = (H-NET-BALLR);
						ball.sy = -25;
						ball.sx = dxNet * 0.2;
					} else {
						let sidedness = dxNet>0?1:-1;
						ball.px = W/2 + sidedness * BALLR;
					}
					audio.play('bounce',true);
				}
			}

			//ground
			if(ball.py > H-BALLR){
				ball.py = H-BALLR;
				ball.sy = -Math.abs(ball.sy)/2;
				ball.sx *= 0.5;
				
				if(!ball.dead){
					audio.play('bounce',true);
					let nScore = (ball.px > W/2)?0:1;
					meepsActive[nScore].score++;
					meepsActive[nScore].$score.text(meepsActive[nScore].score).css({top:'7%',opacity:1}).delay(200).animate({top:'10%',opacity:0.2});
					audio.play('cheer',true);
					iTimeout = setTimeout(finiBall,1000);

					hud.updatePlayers(meeps);
				}
				ball.dead = true;
			} else if( !ball.dead ){
				for(var m in meepsActive){
					let dx = (ball.px - meepsActive[m].px);
					let dy = (ball.py - meepsActive[m].py);
					let d = Math.sqrt(dx*dx + dy*dy);

					if( d < COLLIDE ){
						audio.play('bounce',true);
						let r = Math.atan2(dy,dx);
						ball.px = meepsActive[m].px + Math.cos(r) * COLLIDE;
						ball.py = meepsActive[m].py + Math.sin(r) * COLLIDE;
						ball.sx = Math.cos(r) * 15;
						ball.sy = Math.sin(r) * 15 - 10;
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
		ball.$el.appendTo($field);
	}

	let iTimeout;
	function finiBall(){
		iTimeout = setTimeout( initBall, 1000 );
	}


	let meeps = [];
	let countPlayer = 2;
	function initGame(COUNT){

		audio.play('music');

		countPlayer = COUNT;

		for(var i=0; i<countPlayer; i++){
			meeps[i] = new PartyMeep(i);
			meeps[i].$score = $('<headersscore>').appendTo($game).text(0).hide();
			meeps[i].$el.appendTo($field);
			meeps[i].$el.css({
				'bottom':0+'px',
				'left':40+i*20+'%',
			});
		}

		initTutorial();

		//setTimeout( initNextMatchup, 1000 );
	}

	function initTutorial(){
		meepsActive = meeps;

		for(var m=0; m<meepsActive.length; m++){
			if(m<meepsActive.length/2) meepsActive[m].range = rangeLeft;
			else meepsActive[m].range = rangeRight;
		}

		hud.initTutorial(
			'Volley Heads',
			{x:1.25, y:0.45, msg:'Align yourself<br>to your side of the net',icon:'align'},
			{x:1.75, y:0.45, msg:'Move left & right<br>to head the ball over the net',icon:'side-to-side'},
			);

		hud.initTimer(10,finiTutorial);
	}

	function finiTutorial(){
		hud.finiTutorial();
		hud.finiTimer();
		$tutoral.hide();

		for(var m=0; m<meepsActive.length; m++) meepsActive[m].$el.hide();
		meepsActive = [];

		//initNextMatchup();

		setTimeout( function(){
			hud.initPlayers(meeps);
		},1000);

		setTimeout(initNextMatchup,3000);
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
	let rangeLeft = {min:0,max:W/2-HEADR*2};
	let rangeRight = {min:W/2+HEADR*2,max:W};
	function initNextMatchup(){

		for( var m in meepsActive ) meepsActive[m].$score.hide();

		iMatchup++;
		let matchup = MATCHUPS[countPlayer][iMatchup];
		let iLeft = parseInt(matchup[0]);
		let iRight = parseInt(matchup[1]);

		meepsActive[0] = meeps[iLeft];
		meepsActive[1] = meeps[iRight];

		meepsActive[0].range = rangeLeft;
		meepsActive[1].range = rangeRight;

		meepsActive[0].$score.show().attr('side','left');
		meepsActive[1].$score.show().attr('side','right');

		for( var m in meepsActive ) meepsActive[m].$el.show();

	
		initIntro();
	}

	function initIntro(){
		hud.summonPlayers(MATCHUPS[countPlayer][iMatchup]);
		setTimeout(hud.finiBanner,3000);
		hud.revealTimer(30);
		setTimeout(function(){
			hud.initBanner('Go!');
			hud.initTimer(30,finiMatchup);
		},4000);
		setTimeout(hud.finiBanner,6000);
		setTimeout(initBall,7000);
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
			meeps[m].py = Math.min( 0.75, (p[m].py+0.3)) * H;
			meeps[m].r =  {W:p[m].rW, X:p[m].rX, Y:p[m].rY, Z:p[m].rZ};
		}
	}

	self.fini = function(){
		audio.stop('music');
		clearInterval(interval);
		hud.fini();
	}
}