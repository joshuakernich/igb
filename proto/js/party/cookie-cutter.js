window.CookieCutterGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 20;
	const GRIDSIZE = 400;
	const TRACKLENGTH = 200;
	const SCORE_MAX = 15;

	const GRID = {W:W/GRIDSIZE,H:TRACKLENGTH};


	const STRUCTURE = [
		undefined,
		undefined,
		[
			{players:[0,1],levels:5},
			{players:[0,1],levels:10}
		],
		[
			{players:[0,1,2],levels:5},
			{players:[0,1,2],levels:10}
		],
		[
			{players:[0,1,2,3],levels:5},
			{players:[0,1,2,3],levels:10}
		],
		[
			{players:[0,1,2],levels:10},
			{players:[3,4,0],levels:10},
			{players:[1,2,3],levels:10},
			{players:[4,0,1],levels:10},
			{players:[2,3,4],levels:10},
		],
		[
			{players:[0,1,2],levels:5},
			{players:[3,4,5],levels:5},
			{players:[0,2,4],levels:10},
			{players:[1,3,5],levels:10},
		],

	]

	if(!MazeGame.didInit){
		MazeGame.didInit = true;

		$("head").append(`
			<style>
				cookiegame{
					display: block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: linear-gradient( to bottom, orange, rgba(100,80,40,1));
					
					perspective: ${W}px;

					background: url(./proto/img/party/bg-bakery.png);
					background-size: 100%;

				}

				cookiegame:after{
					content:"";
					display: block;
					position: absolute;
					inset: 0px;
					background: linear-gradient( to top, #A3956E, transparent );
				}

				cookieworld{
					transform-origin: center bottom;
					width: ${W}px;
					height: ${W}px;
					position: absolute;
					left: 0px;
					right: 0px;
					bottom: 110px;
					margin: auto;
					transform: rotateX(70deg);
					z-index: 10;
					transform-style:preserve-3d;
					border-radius: 400px;

		
					background: url(./proto/img/party/texture-wood.png);
					box-shadow: 0px 50px 0px #422a23;

				}

				cookiecenter{
					display: block;
					position: absolute;
					top: 50%;
					left: 50%;
					transform-style:preserve-3d;
				}

				cookiestamper{
					transform-origin: center bottom;
					width: ${W}px;
					height: ${W}px;
					position: absolute;
					left: ${-W/2}px;
					top: ${-W/2}px;
					
					transform: translateZ(${H}px);
					transform-style:preserve-3d;
					border-radius: 400px;
					display: block;
					white-space: normal;
					overflow: hidden;
					border-radius: 400px;
					transition: all 0.5s;
					border-bottom: 50px solid black;
					box-shadow: inset 0px 0px 100px white;
				}

				cookiecorner{
					display:inline-block;
					width: 50%;
					height: 50%;
					position: relative;
					overflow: hidden;
				}

				cookieshape{
					width: ${W/3}px;
					height: ${W/3}px;
					display: block;
					position: absolute;
					left: 0px;
					right: 0px;
					bottom: 0px;
					top: 0px;
					margin: auto;
					
					border-radius: 100%;
					outline: 500px solid #bbb;
					border-top: 25px solid black;


				}

				cookiestamperbar{
					width: 200px;
					height: ${H}px;

					transform-origin: center bottom;
					transform: translate(-50%) rotateX(-70deg);
					transform-style:preserve-3d;
					display: block;
					position: absolute;
					left: 50%;
					bottom: 50%;
					background: rgba(100,55,0,1);
					border-radius: 0px 0px 35px 35px;
				}

				cookieshadow{
					transform-origin: center bottom;
					width: ${W}px;
					height: ${W}px;
					position: absolute;
					left: ${-W/2}px;
					top: ${-W/2}px;
					
					transform-style:preserve-3d;
					border-radius: 400px;
					
					opacity: 0;

					white-space: normal;
					overflow: hidden;
					transition: all 0.5s;
				}

				cookieshadow cookieshape{
					outline-color: black;
					border: none;
				}

				cookiemeep{
					display: block;
					position: absolute;
					transform-style:preserve-3d;
					transform: rotateX(-90deg);
				}

				cookiescore{
					display: block;
					position: absolute;
					bottom: 300px;
					line-height: 100px;
					font-size: 75px;
					color: white;
					left: -50px;
					right: -50px;
					text-align: center;
					text-shadow: 5px 0px 5px #333, 0px 5px 5px #333, 0 -5px 5px #333, -5px 0px 5px #333;
				}

			</style>`);
	}

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-creeping.mp3',0.3,true);
	audio.add('squish','./proto/audio/party/sfx-squish.mp3',0.3);

	const CookieMeep = function(n){
		let self = this;
		self.$el = $('<cookiemeep>');

		self.score = 0;

		let meep = new PartyMeep(n);
		meep.$el.appendTo(self.$el);
		meep.$el.css({
			'transform':'scale(0.8)',
		});

		let $score = $('<cookiescore>').appendTo(self.$el);

		self.addScore = function(score){
			self.score += score;
			$score.text(self.score)
			.stop(false,false)
			.css({
				opacity:1,
				bottom: 250,
			}).animate({
				bottom: 350,
			},200).animate({
				bottom: 300,
			},200).delay(700).animate({
				opacity:0
			})
		}
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<cookiegame>').appendTo(self.$el);
	let $world = $('<cookieworld>').appendTo($game);
	let $center = $('<cookiecenter>').appendTo($world);
	
	let iRound = -1;
	let meeps = [];
	function initGame(PLAYER_COUNT){

		
		scoreMult = Math.floor( SCORE_MAX / PLAYER_COUNT );

		for(var i=0; i<PLAYER_COUNT; i++){

			meeps[i] = new CookieMeep(i);
			meeps[i].isActive = false;
			meeps[i].$el.appendTo($center).hide();
			
		}

		audio.play('music');

		initNextRound();
	}

	function getNonPlayers(players){
		let arr = [];
		for(var m=0; m<meeps.length; m++) if(players.indexOf(m)==-1) arr.push(m);
		return arr;
	}

	function initNextRound(){

		iRound++;

		for(var m in meeps) meeps[m].isActive = false;

		for(var p in STRUCTURE[meeps.length][iRound].players){

			let m = STRUCTURE[meeps.length][iRound].players[p];

			meeps[m].$el.show();
			meeps[m].isActive = true;
			meeps[m].isDead = false;
		}

		setTimeout(function(){
			hud.initRound(iRound, STRUCTURE[meeps.length].length);
		},2000);

		setTimeout(function(){
			hud.finiBanner();
		},4000);

		setTimeout(function(){
			hud.summonPlayers(STRUCTURE[meeps.length][iRound].players,getNonPlayers(STRUCTURE[meeps.length][iRound].players));
		},6000);

		setTimeout(function(){
			hud.finiBanner();
		},8000);

		setTimeout(function(){
			hud.initBanner('Dodge the Cookie Cutter!');
		},10000);

		setTimeout(function(){
			hud.finiBanner();
			doUnstamp();
		},12000);
	}
	

	let $shadow = $('<cookieshadow>').appendTo($center);
	let $stamper = $('<cookiestamper>').appendTo($center);
	$('<cookiestamperbar>').appendTo($stamper);

	for(var i=0; i<4; i++){
		let $corner =  $('<cookiecorner>').appendTo($stamper);
		let $shape = $('<cookieshape n='+i+'>').appendTo($corner);

		let $cornerShadow =  $('<cookiecorner>').appendTo($shadow);
		let $shapeShadow = $('<cookieshape n='+i+'>').appendTo($cornerShadow);
	}

	let hud = new PartyHUD('#71A4A2');
	hud.$el.appendTo($game);

	hud.initPlayerCount(initGame);

	let timer;
	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	let speed = 0.05;
	function step(){
		resize();

		for(var m in meeps){
			if(meeps[m].isActive){
				meeps[m].$el.css({
					left: meeps[m].x + 'px',
					top: meeps[m].y + 'px',
				})
			}
		}
	}

	const MAX = W/2-150;
	const STAMPS = [
		[1,1,1,1],
		[1,0,1,1],
		[1,0,0,1],
		[0,0,1,0],
		[0,1,0,0],
		[0,1,1,0],
		[0,0,0,1],
		[1,0,0,0],
		[0,1,0,0],
		[0,0,1,0],
	]

	let nStamp = -1;

	function doNewStamp(){
		nStamp++;
		let stamp = STAMPS[nStamp%STAMPS.length];

		for(var i=0; i<stamp.length; i++){
			let shape = stamp[i];
			self.$el.find(`cookieshape[n=${i}]`).css({ width:MAX*shape, height:MAX*shape });
		}

		doStampReveal();
	}

	function doStampReveal(){
		$stamper.css({
			'transform':'translateZ(600px)',
		})

		$shadow.css({
			'opacity':'0.5',
		})

		let time = 1500 - nStamp*100;
		if(nStamp == 0) time = 2000; // always take 2 seconds for the first stamp

		setTimeout(doStamp,Math.max(500, time));
	}

	function doStamp() {
		$stamper.css({
			'transform':'translateZ(30px)',
		})

		$shadow.css({
			'opacity':'1',
		})

		setTimeout(doCrush,150);
		timer = setTimeout(doUnstamp,1500);
	}

	let countSquish = 0;

	function doCrush(){
		let stamp = STAMPS[nStamp%STAMPS.length];
		for(var m in meeps){
			if(meeps[m].isActive){
				let isLeft = meeps[m].x < 0;
				let isTop = meeps[m].y < 0;

				let isMiddle = ( Math.abs( meeps[m].x ) < 75 ) || ( Math.abs( meeps[m].y ) < 75 );
				let isEdge = ( Math.abs( meeps[m].x ) > (W/2-75) ) || ( Math.abs( meeps[m].y ) > (W/2-75) );

				let iQuadrant = 0;
				if( !isLeft && isTop ) iQuadrant = 1;
				if( isLeft && !isTop ) iQuadrant = 2;
				if( !isLeft && !isTop ) iQuadrant = 3;

				if(!meeps[m].isDead && (isMiddle || isEdge || stamp[iQuadrant]==0)){
					meeps[m].$el.hide();
					meeps[m].isDead = true;
					audio.play('squish',true);

					countSquish++;
					
				} else {
					meeps[m].addScore( 1 );
				}
			}
		}

		let countAlive = 0;
		for(var m in meeps) if(!meeps[m].isDead && meeps[m].isActive) countAlive++;

		if(countAlive<=1){

			for(var m in meeps) if(!meeps[m].isDead && meeps[m].isActive) meeps[m].addScore( STAMPS.length-nStamp-1 );

			clearTimeout(timer);
			setTimeout( function(){ doUnstamp(false) }, 1000 );
			$stamper.stop(false);
			hud.initBanner(countAlive==1?'Winner!':'Finish!');

			setTimeout( hud.finiBanner, 3000 );

			if(STRUCTURE[meeps.length][iRound+1]){
				setTimeout( initNextRound, 3500 );
			} else {
				setTimeout( finiGame, 3500 );
			}
		}
	}

	function finiGame(){
		let scores = [];
		for(var m in meeps){
			meeps[m].isActive = false;
			meeps[m].$el.hide();
			scores[m] = meeps[m].score;
		}

		let rewards = scoresToRewards(scores);
		hud.showFinalScores(scores,rewards);

		setTimeout(function(){
			self.fini();	
			window.doPartyGameComplete(rewards);
		},3000);
	}

	function doUnstamp( doNextStamp=true ) {
		$stamper.css({
			'transform':'translateZ('+H+'px)',
		})

		$shadow.css({
			'opacity':'0',
		})

		if( doNextStamp ) setTimeout(doNewStamp,1000);
	}

	let interval = setInterval(step,1000/FPS);

	self.setPlayers = function(p){
		for(var m in meeps){

			meeps[m].x = p[m].x*(W/2);
			meeps[m].y = -p[m].z*(W/2);
		
		}
	}

	self.fini = function(){
		clearInterval(interval);
		audio.stop('music');
	}
}