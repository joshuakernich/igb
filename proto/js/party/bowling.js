window.BowlingGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const COIN = 80;
	const L = 25;

	let audio = new AudioContext();
	audio.add('tick','./proto/audio/party/sfx-select.mp3',0.3);
	audio.add('music','./proto/audio/party/music-sport.mp3',0.2,true);
	audio.add('roll','./proto/audio/party/sfx-bowling-ball.mp3',0.3,true);
	audio.add('pin','./proto/audio/party/sfx-pin.mp3',0.3);



	const PINS = [
		{y:L-0.5,x:0.3},
		{y:L-0.5,x:0.5},
		{y:L-0.5,x:0.7},
		{y:L-0.7,x:0.4},
		{y:L-0.7,x:0.6},
		{y:L-0.9,x:0.5},

		{y:2,x:0.7},
		{y:3,x:0.8},
		{y:4,x:0.85},
		{y:5,x:0.8},
		{y:6,x:0.7},

		{y:2,x:0.3},
		{y:3,x:0.2},
		{y:4,x:0.15},
		{y:5,x:0.2},
		{y:6,x:0.3},

		{y:7,x:0.6},
		{y:7,x:0.4},
		{y:8,x:0.55},
		{y:8,x:0.45},

		{y:10,x:0.3},
		{y:11,x:0.2},
		{y:12,x:0.15},
		{y:13,x:0.2},
		{y:14,x:0.3},

		{y:10,x:0.7},
		{y:11,x:0.8},
		{y:12,x:0.85},
		{y:13,x:0.8},
		{y:14,x:0.7},
	]



	if( !BowlingGame.init ){
		BowlingGame.init = true;

		$("head").append(`
			<style>
				bowlinggame{
					display: block;
					position: absolute;
					left: 0px;
					top: 0px;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: url(./proto/img/party/bg-village.png);
					background-size: 33.3% 180%;
					background-position: bottom center;
					perspective: ${W*3}px;
				}

				bowlinglane{
					display: block;
					position: absolute;
					
					bottom: 0px;
					left: ${W}px;
					
					transform: rotateX(85deg);
					transform-style: preserve-3d;
				}

				bowlinglanescroll{
					display: block;
					position: absolute;
					bottom: 0px;
					left: 0px;
					width: ${W}px;
					height: ${W*L}px;
					background: #056479;
					transform-origin: bottom center;
					transform-style: preserve-3d;
				}

				bowlinghole{
					display: block;
					position: absolute;
					width: ${W}px;
					height: ${H}px;
					top: ${-H+500}px;
					
					transform-style: preserve-3d;
					border: 150px solid #047A96;
					border-bottom: none;

					transform-origin: bottom center;
					transform: rotateX(-85deg);
					box-sizing: border-box;
					border-radius: ${W/4}px ${W/4}px 0px 0px;
				}

				bowlingwall{
					display: block;
					position: absolute;
					width: ${W}px;
					height: ${H}px;
					top: ${-H}px;
					
					transform-style: preserve-3d;
					background: radial-gradient(rgb(16, 57, 82), black);

					transform-origin: bottom center;
					transform: rotateX(-85deg);
					border-radius: ${W/4}px ${W/4}px 0px 0px;
				}

				bowlingpin{
					display: block;
					position: absolute;
					
					transform-style: preserve-3d;
				}

				bowlingpinbody{
					display: block;
					position: absolute;
					transform-origin: bottom center;
					transform: translateX(-50%) rotateX(-85deg);
					transform-style: preserve-3d;
					background: white;
					width: 100px;
					height: 200px;
					background: white;
					border-radius: 50%;
					background: linear-gradient(to bottom right, white, white, #777);
				}

				bowlingpinbody:after{
					content:"";
					display: block;
					position: absolute;
					width: 60px;
					height: 70px;
					bottom: 230px;
					left: 20px;
					background: white;
					border-radius: 100%;
					background: linear-gradient(to bottom right, white, white, #777);
				}

				bowlingpinbody:before{
					content:"";
					display: block;
					position: absolute;
					width: 40px;
					height: 60px;
					bottom: 180px;
					left: 30px;
					background: linear-gradient(to right, red, #555);
					border-radius: 0px 0px 20px 20px;
				}

				bowlingpinshadow{
					display: block;
					position: absolute;
					width: 150px;
					height: 300px;
					left: -30px;
					border-radius: 50%;
					background: linear-gradient(to right, rgba(0,0,0,0.5), transparent);

				}

				bowlingmeep{
					display: block;
					position: absolute;
					transform-origin: bottom center;
					transform-style: preserve-3d;
				}

				bowlingballshadow{
					display: block;
					position: absolute;
					width: 300px;
					height: 300px;
					background: black;
					border-radius: 100%;
					position: absolute;
					left: -100px;
					bottom: -150px;
					background: linear-gradient(to right, rgba(0,0,0,0.5), transparent);
				}

				bowlingball{
					display: block;
					position: absolute;
					transform-origin: bottom center;
					transform: rotateX(-85deg);	
					width: 0px;
					height: 0px;
					transform-style: preserve-3d;
				}

				bowlingballinner{
					display: block;
					position: absolute;
					width: 300px;
					height: 300px;
					background: white;
					border-radius: 100%;
					position: absolute;
					left: -150px;
					bottom: 0px;
					overflow: hidden;
					background: linear-gradient(to bottom right, white, white, #777);
				}

				bowlingballinner:before{
					content:". .";
					position: absolute;
					inset: 0px;
					line-height: 200px;
					text-align: center;
					font-size: 150px;
					font-weight: bold;
					font-family: serif;
					transform: scaleY(1.5);
					opacity: 0.5;
				}

				bowlingballinner:after{
					content:"";
					display: block;
					position: absolute;
					width: 200%;
					height: 100%;
					
					left: -50%;
					right: -50%;
					top: 15%;
					border-radius: 100%;
					border-top: 40px solid red;
				}

				bowlingmeep[n='0'] bowlingballinner:after { border-color:var(--n0); }
				bowlingmeep[n='1'] bowlingballinner:after { border-color:var(--n1); }
				bowlingmeep[n='2'] bowlingballinner:after { border-color:var(--n2); }
				bowlingmeep[n='3'] bowlingballinner:after { border-color:var(--n3); }
				bowlingmeep[n='4'] bowlingballinner:after { border-color:var(--n4); }
				bowlingmeep[n='5'] bowlingballinner:after { border-color:var(--n5); }

				bowlingscore{
					display: block;
					position: absolute;
					bottom: 400px;
					left: -200px;
					right: -200px;
					line-height: 200px;
					font-size: 200px;
					color: white;
					text-align: center;
				}
			<style>
		`)
	}

	const BowlingPin = function(x,y){
		let self = this;
		self.$el = $(`<bowlingpin>
				<bowlingpinshadow></bowlingpinshadow>
				<bowlingpinbody></bowlingpinbody>
			</bowlingpin>`)

		self.isActive = true;
		self.x = x;
		self.y = y;

		self.$el.css({
			left: x * W,
			bottom: y * W,
		});

		self.initHit = function(dx){
			audio.play('pin',true);

			let r = dx>0?45:-45;

			self.isActive = false;
			self.$el.find('bowlingpinbody').css({
				transform: `translateX(-50%) rotateX(-85deg) rotateZ(${r}deg) translateY(-100px)`,
			}).animate({
				opacity: 0,
			})

			self.$el.delay(500).animate({opacity:0});
		}
	}

	const BowlingMeep = function(i){
		let self = this;
		self.$el = $('<bowlingmeep>').attr('n',i);

		let $shadow = $('<bowlingballshadow>').appendTo(self.$el);
		let $ball = $('<bowlingball>').appendTo(self.$el);
		let $inner = $('<bowlingballinner>').appendTo($ball);
		let $score = $('<bowlingscore>').appendTo($ball).text('');

		self.px = 0;
		self.py = 0;
		self.ay = 0;
		self.score = 0;

		self.redraw = function(){

			self.$el.css({
				left: self.px * W + 'px',
				bottom: (self.ay + self.py) * W + 'px'
			})

			$inner.css({
				'transform':'rotate('+self.px*180+'deg)',
			})
		}

		self.addScore = function(){
			self.score++;
			$score.text(self.score).stop(false,false).css({opacity:1}).delay(200).animate({opacity:0});
		}

		self.showScore = function(){
			$score.text(self.score).stop(false,false).css({opacity:1});
		}
	}


	let self = this;
	self.$el = $('<igb>');

	let $game = $('<bowlinggame>').appendTo(self.$el);
	let $lane = $('<bowlinglane>').appendTo($game);
	let $scroll = $('<bowlinglanescroll>').appendTo($lane);
	let $hole = $('<bowlinghole>').appendTo($scroll);
	let $wall = $('<bowlingwall>').appendTo($scroll);

	let hud = new PartyHUD();
	hud.$el.appendTo($game);

	let meeps = [];
	let pins = [];
	
	function initGame(count){
		audio.play('music');

		for(var i=0; i<count; i++){
			meeps[i] = new BowlingMeep(i);
			meeps[i].$el.appendTo($scroll).hide();
		}

		initNextPlayer();
	}

	hud.initPlayerCount(initGame);

	function initNextPlayer(){
		nPlayer++;
		nRound = -1;

		meeps[nPlayer].ay = 0;
		meeps[nPlayer].$el.show();

		for(var p in pins) pins[p].$el.remove();
		pins.length = 0;

		for(var p=0; p<PINS.length; p++){
			pins[p] = new BowlingPin(PINS[p].x,PINS[p].y);
			pins[p].$el.appendTo($scroll);
		}

		setTimeout( function(){
			//hud.initBanner('Step Forward Player '+(nPlayer+1));

			let inMeep = [];
			let outMeep = [];
			for(var m in meeps){
				if(m==nPlayer) inMeep.push(m);
				else outMeep.push(m);
			}
			hud.summonPlayers(inMeep,outMeep);
		},1500);

		setTimeout(function(){
			hud.finiBanner();
		},4000)

		setTimeout( initRound, 6000 );
	}

	let $pins = [];
	let nPlayer = -1;
	let nRound = -1;
	function initRound(){
		nRound++;
		meeps[nPlayer].ay = 0;
		meeps[nPlayer].$el.show();

		hud.initRound('Ball '+(nRound+1),nRound,2);

		setTimeout(function(){
			hud.finiBanner();
		},2000);

		setTimeout(function() {
			hud.initTimer(5,initBowl);
		},3000);
	}

	function finiBowl(){
		audio.stop('roll');
		if(nRound<1) setTimeout( initRound, 2000 );
		else if( meeps[nPlayer+1] ) setTimeout( initNextPlayer, 2000 );
		else setTimeout( initEndGame, 2000 );
	}

	function initEndGame(){
		for(var m in meeps){
			meeps[m].ay = 0;
			meeps[m].$el.show();
			meeps[m].showScore();
		}

		setTimeout(finiGame,2000);

	}

	function finiGame() {
		self.fini();
		var scores = [];
		for(var m in meeps) scores[m] = meeps[m].score;
		window.doPartyGameComplete(scores);
	}

	function initBowl(){
		self.speed = 0.1;
		hud.finiTimer();
		audio.play('roll');
	}

	self.speed = 0;
	self.step = function(){

		let sy = 0;

		if( meeps[nPlayer] ){
			meeps[nPlayer].ay += self.speed;
			if(meeps[nPlayer].ay>L && self.speed){
				self.speed = 0;
				setTimeout(finiBowl);
			}
			sy = Math.min(meeps[nPlayer].ay, L-3);

			for(var p in pins){

				if(pins[p].isActive){
					let dx = pins[p].x - meeps[nPlayer].px;
					let dy = pins[p].y - (meeps[nPlayer].ay + meeps[nPlayer].py);
					let d = Math.sqrt(dx*dx+dy*dy);
					
					if(d<0.15){
						pins[p].initHit(dx);
						meeps[nPlayer].addScore();
					}
				}
			}
		}

		for(var m in meeps) meeps[m].redraw();

		$scroll.css({
			'bottom':-sy * W + 'px',
		});

		resize();
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	self.fini = function(){
		audio.stop('music');
		clearInterval(interval);
	}

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].px = (p[m].px);
			meeps[m].py = (p[m].pz);
		}
	}

	let interval = setInterval(self.step,1000/FPS);

}