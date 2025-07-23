window.CookieCutterGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 20;
	const GRIDSIZE = 400;
	const TRACKLENGTH = 200;
	const SCORE_MAX = 15;

	const GRID = {W:W/GRIDSIZE,H:TRACKLENGTH};

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
					bottom: 100px;
					margin: auto;
					transform: rotateX(70deg);
					z-index: 10;
					transform-style:preserve-3d;
					border-radius: 400px;

					

					background: #EEB067;
					box-shadow: 0px 100px 0px #773E0F;

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
					border-bottom: 15px solid black;
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



			</style>`);
	}

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-creeping.mp3',0.3,true);
	audio.add('squish','./proto/audio/party/sfx-squish.mp3',0.3);

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<cookiegame>').appendTo(self.$el);
	let $world = $('<cookieworld>').appendTo($game);
	let $center = $('<cookiecenter>').appendTo($world);
	

	let meeps = [];
	function initGame(PLAYER_COUNT){

		scoreMult = Math.floor( SCORE_MAX / PLAYER_COUNT );

		for(var i=0; i<PLAYER_COUNT; i++){

			meeps[i] = new PartyMeep(i);

			meeps[i].setHeight(350);
			meeps[i].$el.appendTo($center);
			meeps[i].$el.css({
				'transform-style':'preserve-3d',
				transform: 'rotateX(-60deg) scale(0.8)',
			});
		}

		audio.play('music');
		//

		setTimeout(function(){
			hud.initBanner('Ready...');
		},2000);

		setTimeout(function(){
			hud.finiBanner();
		},4000);

		setTimeout(function(){
			hud.initBanner('Go!');
		},6000);

		setTimeout(function(){
			hud.finiBanner();
			doUnstamp();
		},8000);
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
			meeps[m].$el.css({
				left: meeps[m].x + 'px',
				top: meeps[m].y + 'px',
			})
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

		setTimeout(doStamp,Math.max(500, 1500 - nStamp*100));
	}

	function doStamp() {
		$stamper.css({
			'transform':'translateZ(0px)',
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
			let isLeft = meeps[m].x < 0;
			let isTop = meeps[m].y < 0;

			let isMiddle = ( Math.abs( meeps[m].x ) < 75 ) || ( Math.abs( meeps[m].y ) < 75 );
			let isEdge = ( Math.abs( meeps[m].x ) > (W/2-75) ) || ( Math.abs( meeps[m].y ) > (W/2-75) );

			let iQuadrant = 0;
			if( !isLeft && isTop ) iQuadrant = 1;
			if( isLeft && !isTop ) iQuadrant = 2;
			if( !isLeft && !isTop ) iQuadrant = 3;

			if(!meeps[m].dead && (isMiddle || isEdge || stamp[iQuadrant]==0)){
				meeps[m].$el.hide();
				meeps[m].dead = true;
				audio.play('squish',true);

				countSquish++;
				meeps[m].score = countSquish * scoreMult;
			}
		}

		let countAlive = 0;
		for(var m in meeps) if(!meeps[m].dead) countAlive++;

		if(countAlive<=1){

			for(var m in meeps) if(!meeps[m].dead) meeps[m].score = SCORE_MAX;

			clearTimeout(timer);
			$stamper.stop(false);
			hud.initBanner(countAlive==1?'Winner!':'Finish!');

			setTimeout(function(){
				let scores = [];
				for(var m in meeps) scores[m] = meeps[m].score;

				self.fini();
				window.doPartyGameComplete(scores);
			},3000)
		}
	}

	function doUnstamp() {
		$stamper.css({
			'transform':'translateZ('+H+'px)',
		})

		$shadow.css({
			'opacity':'0',
		})

		setTimeout(doNewStamp,1000);
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