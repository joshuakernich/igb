window.MazeGame = function(n){
	const W = 1600;
	const H = 1000;
	const FPS = 20;
	let PLAYER_COUNT = 6;
	let SCORE_MAX = 15;
	const GRIDSIZE = 400;
	const TRACKLENGTH = 200;

	const GRID = {W:W/GRIDSIZE,H:TRACKLENGTH};

	if(!MazeGame.didInit){
		MazeGame.didInit = true;

		$("head").append(`
			<style>
				mazegame{
					display: block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: url(./proto/img/party/bg-mountains-clouds.png);
					background-size: 100%;
					perspective: ${W}px;
				}

				mazegame:before{
					content: "";
					position: absolute;
					display: block;
					inset: 0px;
					background: linear-gradient(to top, #86C0D4, transparent);
				}

				mazeworld{
					transform-origin: center bottom;
					
					width: ${W}px;
					height: ${W}px;
					position: absolute;
					left: 0px;
					right: 0px;
					bottom: 0px;
					margin: auto;
					transform: rotateX(60deg);
					z-index: 10;
					transform-style:preserve-3d;
				}

				mazeworld:after{
					content:"";
					border: 50px dashed yellow;
					display: block;
					position: absolute;
					left: 0px;
					right: 0px;
					top: 0px;
					bottom: 0px;
					display: none;
				}

				mazeplatform{
					display: block;
					width: ${W}px;
					height: ${TRACKLENGTH*GRIDSIZE}px;
					position: absolute;
					left: 0px;
					right: 0px;
					bottom: 0px;
					margin: auto;
				}

				mazerow{
					display: block;
					height: ${GRIDSIZE}px;
				}

				mazeblock{
					width: ${GRIDSIZE}px;
					height: ${GRIDSIZE}px;
					background: rgba(150,105,50,1);
					display: inline-block;
					border-bottom: 150px solid rgba(100,55,0,1);
				}

				mazeblock[absent='true']{
					visibility: hidden;
				}
			</style>`);
	}

	let yProgress = 0;
	let isGoTime = false;

	let self = this;
	self.$el = $('<igb>');

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-creeping.mp3',0.3,true);
	audio.add('fall','./proto/audio/party/sfx-fall.mp3',0.3);

	let $game = $('<mazegame>').appendTo(self.$el);
	let $world = $('<mazeworld>').appendTo($game);
	let $platform = $('<mazeplatform>').appendTo($world);

	let map = [];

	for(var y=0; y<GRID.H; y++){
		let $row = $('<mazerow>').prependTo($platform);
		map[y] = [];
		let iAbsent = Math.floor( Math.random() * GRID.W );
		if(y<10 || y>(TRACKLENGTH-5) || y%4==0 ) iAbsent = -1;

		for(var x=0; x<GRID.W; x++){
			$('<mazeblock>')
			.appendTo($row)
			.attr('absent',x==iAbsent?'true':'false');

			map[y][x] = (x!=iAbsent);
		}
	}

	let meeps = [];
	function initGame(count){
		
		PLAYER_COUNT = count;

		scoreMult = Math.floor( SCORE_MAX / count );

		for(var i=0; i<PLAYER_COUNT; i++){

			meeps[i] = new PartyMeep(i);
			meeps[i].$el.appendTo($world);
			meeps[i].setHeight(370);
			meeps[i].$el.css({

				top:'200px',
				left:(40+i*10)+'%',
				'transform-style':'preserve-3d',
				transform: 'rotateX(-60deg) scale(0.8)',
				
			});
		}

		audio.play('music');
		//isGoTime = true;

		setTimeout(function(){
			hud.initBanner('Ready?');
		},2000);

		setTimeout(function(){
			hud.finiBanner();
		},4000);

		setTimeout(function(){
			hud.initBanner('Go!');
			isGoTime = true;
		},6000);

		setTimeout(function(){
			hud.finiBanner();
		},8000);
	}
	
	let hud = new PartyHUD('#4C7B93');
	hud.$el.appendTo($game);

	hud.initPlayerCount(initGame);

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	let scoreMult = 1;
	let countDead = 0;
	let speed = 0.05;
	function step(){
		resize();
		
		if(isGoTime){
			speed += 0.0001;
			yProgress += speed;
		}
		
		$platform.css({'bottom':-yProgress*GRIDSIZE+'px'});

		for(var m in meeps){

			if(meeps[m].dead) continue;

			meeps[m].$el.css({
				left:meeps[m].x + 'px',
				top:meeps[m].y + 'px'
			})

			let gx = Math.floor(meeps[m].x/GRIDSIZE);
			let gy = Math.floor((W-meeps[m].y)/GRIDSIZE+yProgress);

			if(map[gy] && map[gy][gx]==false){
				meeps[m].dead = true;
				
				countDead++;
				
				meeps[m].score = countDead * scoreMult;

				//meeps[m].$el.remove();

				audio.play('fall',true);

				meeps[m].$el.css({
					'transition':'1s all',
					'transform':'translateZ(-1500px)'
				})
			}
		}

		let count = 0;
		for(var m in meeps) if(!meeps[m].dead) count++;

		if(count == 1 && isGoTime){

			for(var m in meeps) if(!meeps[m].dead) meeps[m].score = SCORE_MAX;

			isGoTime = false;
			clearInterval(interval);
			hud.initBanner('Winner!');
			setTimeout(function(){

				let scores = [];
				for(var m in meeps) scores[m] = meeps[m].score;

				self.fini();
				window.doPartyGameComplete(scores);
			},3000);
		}
	}

	let interval = setInterval(step,1000/FPS);

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].x = p[m].px*W;
			meeps[m].y = (1-p[m].pz)*W;
		}
	}

	self.fini = function(){
		audio.stop('music');
		clearInterval(interval);
	}
}