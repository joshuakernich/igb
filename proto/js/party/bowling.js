window.BowlingGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const BALLS_PER_TURN = 2;
	const YSCALE = 1;

	let audio = new AudioContext();
	audio.add('tick','./proto/audio/party/sfx-select.mp3',0.3);
	audio.add('music','./proto/audio/party/music-sport.mp3',0.2,true);
	audio.add('roll','./proto/audio/party/sfx-bowling-ball.mp3',0.3,true);
	audio.add('pin','./proto/audio/party/sfx-pin.mp3',0.3);

	const TUTORIAL = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'  1      ',
		'         ',
		'    1    ',
		'         ',
		'      1  ',
		'         ',
		'    1    ',
		'         ',
		'  1      ',
		'         ',
		'    1    ',
		'         ',
		'      1  ',
		'         ',
		'    1    ',
		'         ',
		'  1      ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
	]

	const SINGLES = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		' 1     1 ',
		'         ',
		'1     1  ',
		'         ',
		' 1     1 ',
		'         ',
		'   1    1',
		'         ',
		'     1  1',
		'         ',
		'      1 1',
		'         ',
		'     1  1',
		'         ',
		'   1    1',
		'         ',
		' 1     1 ',
		'         ',
		'1     1  ',
		'         ',
		' 1     1 ',
		'         ',
		'  1     1',
		'         ',
		'         ',
		'         ',
		'         ',
	]

	const ROWS = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		' 1     1 ',
		' 1     1 ',
		' 1     1 ',
		' 1     1 ',
		'         ',
		'         ',
		'         ',
		'    1    ',
		'    1    ',
		'    1    ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'  1   1  ',
		'  1   1  ',
		'  1   1  ',
		'  1   1  ',
		'         ',
		'         ',
		'         ',
		'    1    ',
		'    1    ',
		'    1    ',
		'    1    ',
		'         ',
		'         ',
		'         ',
	]

	const BARRIERS = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		' 11   11 ',
		'         ',
		'         ',
		'         ',
		'     111 ',
		'         ',
		'         ',
		'         ',
		'   111   ',
		'         ',
		'         ',
		'         ',
		' 111     ',
		'         ',
		'         ',
		'         ',
		' 11   11 ',
		'         ',
		'         ',
		'         ',
		'   111   ',
		'         ',
		'         ',
		'         ',
		' 11   11 ',
		'         ',
		'         ',
		'         ',
	]

	const TRIANGLES = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'1 1   1 1',
		' 1     1 ',
		'         ',
		'         ',
		'         ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'1 1   1 1',
		' 1     1 ',
		'         ',
		'         ',
		'         ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'1 1   1 1',
		' 1     1 ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
	]

	const ZIGZAG = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'     1   ',
		'      1  ',
		' 1     1 ',
		' 1     1 ',
		' 1     1 ',
		'      1  ',
		'     1   ',
		'         ',
		'         ',
		'         ',
		'  1 1 1  ',
		'         ',
		'         ',
		'         ',
		'   1     ',
		'  1      ',
		' 1    1  ',
		' 1    1  ',
		' 1    1  ',
		'  1      ',
		'   1     ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
	]

	const STACKS = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'1 1 1    ',
		' 1 1     ',
		'  1      ',
		'         ',
		'         ',
		'         ',
		'         ',
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		'    1 1 1',
		'     1 1 ',
		'      1  ',
		'         ',
		'         ',
		'         ',
		'         ',
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
	]


	function logPinCount(pattern){
		let cnt = 0;
		for(var y in pattern){
			for(var x=0; x<pattern[y].length; x++) if(pattern[y][x]=='1') cnt++;
		}
		console.log(pattern.length,cnt);
	}	

	const ROUNDS = [
		undefined,
		undefined,
		[
			[SINGLES,ROWS],
			[BARRIERS,ZIGZAG],
			[TRIANGLES,STACKS],
		],
		[
			[ROWS,TRIANGLES,BARRIERS],
			[ZIGZAG,TRIANGLES,STACKS],
		],
		[
			[ROWS,ZIGZAG,TRIANGLES,STACKS],
		],
		[
			[ROWS,BARRIERS,ZIGZAG,TRIANGLES,STACKS],
		],
		[
			[SINGLES,ROWS,BARRIERS,ZIGZAG,TRIANGLES,STACKS]
		]
	]

	/*const PINS = [
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
	]*/



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
					height: ${W*3}px;
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

		self.initAppear = function(delay){

			self.$el.find('bowlingpinshadow').css({opacity:0});

			self.$el.find('bowlingpinbody').css({
				transform: `translateX(-50%) rotateX(-85deg) translateY(-300px)`,
				transition: 'all 0.2s',
				opacity:0,
			})

			setTimeout(function(){
				self.$el.find('bowlingpinbody').css({ 
					transform: `translateX(-50%) rotateX(-85deg) translateY(0px)`,
					opacity:1,
				});
				self.$el.find('bowlingpinshadow').css({opacity:1});
			},delay);

			setTimeout(function(){
				self.$el.find('bowlingpinbody').css({ transition: `none` });
			},delay + 500);
		}
	}

	const BowlingMeep = function(i){
		let self = this;
		self.$el = $('<bowlingmeep>').attr('n',i);

		let $shadow = $('<bowlingballshadow>').appendTo(self.$el);
		let $ball = $('<bowlingball>').appendTo(self.$el);
		let $inner = $('<bowlingballinner>').appendTo($ball);
		

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

			let $score = $('<bowlingscore>')
			.appendTo($ball)
			.text('+1')
			.css({opacity:1,bottom:300})
			.animate({bottom:500,opacity:0},{duration:400,complete:function(){
				$score.remove();
			}})
		}

		self.showScore = function(){
			//$score.text(self.score).stop(false,false).css({opacity:1});
		}
	}


	let self = this;
	self.$el = $('<igb>');

	let $game = $('<bowlinggame>').appendTo(self.$el);
	let $blur = $('<blurlayer>').appendTo($game);
	let $lane = $('<bowlinglane>').appendTo($game);
	let $scroll = $('<bowlinglanescroll>').appendTo($lane);
	let $hole = $('<bowlinghole>').appendTo($scroll);
	let $wall = $('<bowlingwall>').appendTo($scroll);

	let hud = new PartyHUD();
	hud.$el.appendTo($game);

	let meeps = [];
	let pins = [];
	
	function initGame(count){
		

		for(var i=0; i<count; i++){
			meeps[i] = new BowlingMeep(i);
			meeps[i].$el.appendTo($scroll).hide();
		}

		initTutorial();
	}

	hud.initPlayerCount(initGame);

	function initTutorial(){
		initPattern(TUTORIAL);

		anim.isActive = true;
		anim.sy = length-3;

		$(anim).delay(1000).animate({sy:0},4000);

		for(var m in meeps){
			meeps[m].$el.show();
			meeps[m].ay = 0;
			meeps[m].isActive = true;
		}

		setTimeout(function(){
			hud.initTutorial('Bowling Bonanza',
				{x:1.5, y:0.5, msg:'Move side to side<br>to knock down the pins', icon:'side-to-side'},
			)
		},5000);

		

		setTimeout(function(){
			anim.isActive = false;
			self.speed = 0.05;
			audio.play('roll');
		},10000)

		hud.initTimer(30,finiTutorial);
	}

	function finiTutorial(){

		anim.isActive = true;
		anim.sy = length-3;

		hud.finiTutorial();
		hud.finiTimer();
		$blur.hide();

		for(var p in pins) pins[p].$el.remove();
		pins.length = 0;

		for(var m in meeps){
			meeps[m].score = 0;
			meeps[m].$el.hide();
			meeps[m].isActive = false;
		}
		setTimeout(initPlay,1000);
	}

	function initPlay() {
		hud.initPlayers(meeps);
		initNextRound();
	}

	let pattern;
	let length = 3;
	let anim = {isActive:true,sy:length-3};
	function initNextRound(){
		nPlayer = -1;
		nRound++;

		if(!ROUNDS[meeps.length][nRound]){
			finiGame();
			return;
		}

		if(ROUNDS[meeps.length].length>1){
			setTimeout(function(){
				audio.play('music');
				hud.initRound( nRound, ROUNDS[meeps.length].length );
			},2000);

			setTimeout(function(){
				hud.finiBanner();
			},4000);

			setTimeout(function(){
				initNextPlayer();
			},6000);
		} else {
			initNextPlayer();
		}
	}

	function initPattern(patternNew){

		for(var p in pins) pins[p].$el.remove();
		pins.length = 0;

		pattern = patternNew;
		length = pattern.length*YSCALE;

		$scroll.height(length*W);

		for(var y=0; y<pattern.length; y++){
			for(var x=0; x<pattern[y].length; x++){
				if(pattern[y][x] == '1'){
					let pin = new BowlingPin(0.1 + x*(1/10),(pattern.length-y)*YSCALE);
					pin.$el.appendTo($scroll);
					pins.push(pin);

					if(y < 5) pin.initAppear(500 + y*100);
				}
			}
		}
	}

	function initNextPlayer(){

		for(var p in pins) pins[p].$el.remove();
		pins.length = 0;

		for(var m in meeps){
			meeps[m].$el.hide();
			meeps[m].isActive = false;
		}
		

		nPlayer++;
		nBall = -1;

		meeps[nPlayer].ay = 0;
		meeps[nPlayer].isActive = true;
		meeps[nPlayer].$el.show();

		initPattern(ROUNDS[meeps.length][nRound][nPlayer]);

		anim.isActive = true;
		anim.sy = length - 3;

		$(anim).delay(2000).animate({sy:0},{
			duration:2000,
			complete:function(){
				anim.isActive = false;
			}
		});

		setTimeout( function(){
			hud.summonPlayers([nPlayer]);
		},4000);

		setTimeout(function(){
			hud.finiBanner();
		},6000);

		setTimeout( initNextBall, 7000 );
	}

	let $pins = [];
	let nPlayer = -1;
	let nRound = -1;
	function initNextBall(){
		nBall++;
		meeps[nPlayer].ay = 0;
		meeps[nPlayer].$el.show();
		meeps[nPlayer].isActive = true;

		if(nBall>0){
			anim.isActive = true;
			anim.sy = length-3;
			$(anim).animate({sy:0});
		}

		hud.initRound(nBall,2,'Ball '+(nBall+1));

		setTimeout(function(){
			hud.finiBanner();
		},2000);

		setTimeout(function() {
			anim.isActive = false;
			hud.initTimer(5,initBallRoll);
		},3000);
	}

	function initBallRoll(){
		self.speed = 0.1;
		hud.finiTimer();
		audio.play('roll');
	}

	function finiBallRoll(){
		audio.stop('roll');

		if(nPlayer==-1) return;

		if(nBall<(BALLS_PER_TURN-1)) setTimeout( initNextBall, 2000 );
		else if( meeps[nPlayer+1] ) setTimeout( initNextPlayer, 2000 );
		else setTimeout( initNextRound, 2000 );
	}

	function initEndGame(){
		for(var m in meeps){
			meeps[m].ay = 0;
			meeps[m].$el.show();
			//meeps[m].showScore();
		}

		setTimeout(finiGame,2000);

	}

	function finiGame() {
		audio.stop('music');
		var scores = [];
		for(var m in meeps) scores[m] = meeps[m].score;

		var rewards = scoresToRewards(scores);
		hud.showFinalScores(scores,rewards);

		setTimeout(function(){
			self.fini();
			window.doPartyGameComplete(rewards);
		},5000);
	}

	self.speed = 0;
	self.step = function(){

		let sy = 0;

		for(var m in meeps){
			if(meeps[m].isActive){
				meeps[m].ay += self.speed;
				if(meeps[m].ay>length && self.speed){
					self.speed = 0;
					setTimeout(finiBallRoll);
				}
				sy = Math.min(meeps[m].ay, length-3);

				for(var p in pins){

					if(pins[p].isActive){
						let dx = pins[p].x - meeps[m].px;
						let dy = pins[p].y - (meeps[m].ay + meeps[m].py);
						let d = Math.sqrt(dx*dx+dy*dy);
						
						if(d<0.15){
							pins[p].initHit(dx);
							meeps[m].addScore();
						}
					}
				}
			}
		}


		for(var m in meeps) meeps[m].redraw();

		if(anim.isActive) sy = anim.sy;

		$scroll.css({
			'bottom':-sy * W + 'px',
		});

		hud.updatePlayers(meeps);

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