window.MazeGame = function(n){
	const W = 1600;
	const H = 1000;
	const FPS = 20;
	let PLAYER_COUNT = 6;
	let SCORE_MAX = 15;
	const GRIDSIZE = 400;

	const GRID = {W:W/GRIDSIZE};

	const MAPS = [
		[
			'0000',
			'0000',
			'0000',
			'0000',
			' 00 ',
			'0000',
			'0  0',
			'0000',
			' 0 0',
			' 0 0',
			'0000',
			'0 0 ',
			'0 0 ',
			'0000',
			' 0 0',
			'00 0',
			'0  0',
			'0000',
			'0  0',
			'0000',
			'0000',
			'0000',
			'0000',
		],
		[
			'0000',
			'0000',
			'0000',
			'0000',
			'0  0',
			'0000',
			' 00',
			'0000',
			'0  0',
			'0000',
			'  00',
			' 00 ',
			'00  ',
			' 00 ',
			'  00',
			' 00 ',
			'00  ',
			' 00 ',
			'  00',
			'0000',
			'0000',
			'0000',
			'0000',
		],
		[
			'0000',
			'0000',
			'0000',
			'0000',
			'0   ',
			'00  ',
			' 0 0',
			' 000',
			'   0',
			'0000',
			'0   ',
			'0   ',
			'000 ',
			'  00',
			' 000',
			' 0  ',
			' 0 0',
			' 000',
			'  0 ',
			'0000',
			'0000',
			'0000',
			'0000',
		],
		[
			'0000',
			'0000',
			'0000',
			'0000',
			'   0',
			'0000',
			'0   ',
			'0000',
			'   0',
			'0000',
			'0   ',
			'0000',
			'   0',
			'0000',
			'0   ',
			'0  0',
			'0000',
			'  0 ',
			'0000',
			'0000',
			'0000',
			'0000',
		],
		[
			'0000',
			'0000',
			'0000',
			'0000',
			'0   ',
			'0000',
			'   0',
			'0000',
			'0   ',
			'0  0',
			'0  0',
			'0000',
			'   0',
			'0  0',
			'0  0',
			'0000',
			'  0 ',
			'0000',
			'0000',
			'0000',
			'0000',
		],

	]

	const STRUCTURE = [
		undefined,
		undefined,
		[
			[{players:[0,1],map:MAPS[0]}],
			[{players:[0,1],map:MAPS[1]}],
		],
		[
			[{players:[0,1,2],map:MAPS[0]}],
			[{players:[0,1,2],map:MAPS[1]}],
		],
		[
			[{players:[0,1],map:MAPS[0]},{players:[2,3],map:MAPS[1]}],
			[{players:[0,1],map:MAPS[2]},{players:[2,3],map:MAPS[3]}],
		],
		[
			[{players:[0,1],map:MAPS[0]},{players:[2,3],map:MAPS[1]},{players:[4,0],map:MAPS[2]},{players:[1,2],map:MAPS[3]},{players:[3,4],map:MAPS[4]}],
		],
		[
			[{players:[0,1],map:MAPS[0]},{players:[2,3],map:MAPS[1]},{players:[4,5],map:MAPS[2]}]
		],
	]

	if(!MazeGame.didInit){
		MazeGame.didInit = true;

		$("head").append(`
			<style>
				mazegame{
					display: block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: url(./proto/img/party/bg-cosmos.gif);
					background-size: 100%;
					background-position: center;
					perspective: ${W}px;
				}

				mazegame:before{
					content: "";
					position: absolute;
					display: block;
					inset: 0px;
					background: linear-gradient(to top, #86C0D4, transparent);
					display: none;
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


				mazeplatform{
					display: block;
					width: ${W}px;
					
					position: absolute;
					left: 0px;
					right: 0px;
					bottom: 0px;
					margin: auto;
					transform-style:preserve-3d;
				}

				mazerow{
					display: block;
					height: ${GRIDSIZE}px;
					transform-style:preserve-3d;
				}

				mazeblock{
					width: ${GRIDSIZE}px;
					height: ${GRIDSIZE}px;
					background: rgba(150,105,50,1);
					display: inline-block;
					box-shadow: inset -10px -20px 0px rgba(0,0,0,0.1), inset 10px 20px 0px rgba(255,255,255,0.1);
					
					border-radius:30px;
					position: relative;

					transform-style:preserve-3d;
				}

				mazeblock:before{
					content:"";
					display: block;
					position: absolute;
					inset: 0px;
					background: radial-gradient( transparent, rgba(0,0,0,0.5) );
				}

				mazeblock:after{
					content:"";
					display: block;
					position: absolute;
					
					height: 80px;
					bottom: 0px;
					background: gray;
					transform: rotateX(90deg);
					transform-style:preserve-3d;
					transform-origin: bottom center;
					border-radius:30px 30px 0px 0px;
					left: 0px;
					right: 0px;
					background: radial-gradient( gray, black );
				}

				mazerow:nth-of-type(2n) mazeblock:nth-of-type(2n){
					background: rgba(155,115,60,1);
				}

				mazerow:nth-of-type(2n+1) mazeblock:nth-of-type(2n+1){
					background: rgba(155,115,60,1);
				}

				mazeblock[absent='true']{
					visibility: hidden;
				}
			</style>`);
	}

	
	let isGoTime = false;

	let self = this;
	self.$el = $('<igb>');

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-cosmic-frenzy.mp3',0.3,true);
	audio.add('fall','./proto/audio/party/sfx-fall.mp3',0.3);

	let $game = $('<mazegame>').appendTo(self.$el);
	let $world = $('<mazeworld>').appendTo($game);
	let $platform = $('<mazeplatform>').appendTo($world);

	let hud = new PartyHUD('#4C7B93');
	hud.$el.appendTo($game);

	let meeps = [];
	function initGame(count){
		
		PLAYER_COUNT = count;

		scoreMult = Math.floor( SCORE_MAX / count );

		for(var i=0; i<PLAYER_COUNT; i++){

			meeps[i] = new PartyMeep(i);
			meeps[i].dead = true;
			meeps[i].$el.appendTo($world).hide();
			meeps[i].$el.css({
				'transform-style':'preserve-3d',
				transform: 'rotateX(-60deg) scale(0.8)',
				
			});
		}

		hud.initPlayers(meeps);

		audio.play('music');


		initNextRound();
	}

	const palette = ['#37CCDA','#8DE968','#FEE955','#FEB850','#FD797B'];

	let yProgress = 0;
	let iCohort = -1;
	let iRound = 0;
	let round;
	function initNextRound(){

		iCohort++;

		if(!STRUCTURE[meeps.length][iRound][iCohort]){
			iCohort = 0;
			iRound++;
		}

		if(!STRUCTURE[meeps.length][iRound]){
			finiGame();
			return;
		}

		$platform.empty();
		round = STRUCTURE[meeps.length][iRound][iCohort];
		let n = -1;
		for(var y=0; y<round.map.length; y++){
			let $row = $('<mazerow>').prependTo($platform);
			for(var x=0; x<round.map[y].length; x++){

				n++;

				$('<mazeblock>')
				.css({'background-color':palette[n%palette.length]})
				.appendTo($row)
				.attr('absent',round.map[y][x]==' '?'true':'false');
			}
		}

		yProgress = round.map.length;
		$({p:yProgress}).animate({p:0},{duration:5000,step:function(a){
			yProgress = a;
		}});

		setTimeout(function(){
			for(var p in round.players){
				let m = round.players[p];
				meeps[m].$el.show();
				meeps[m].dead = false;

				meeps[m].$el.css({
					'transition':'',
					'transform':'rotateX(-60deg) scale(0.8) translateZ(0px)'
				})
			}
			if(iRound==0) hud.initRound(iRound,STRUCTURE[meeps.length].length);
		},6000);

		setTimeout(function(){
			hud.finiBanner();
		},8000);

		setTimeout(function(){
			hud.summonPlayers(round.players);
		},10000);

		setTimeout(function(){
			hud.finiBanner();
			isGoTime = true;
		},12000);
	}

	function finiRound(){

		for(var m in meeps) meeps[m].$el.hide();

		$({p:yProgress}).animate({p:-10},{duration:2000,step:function(a){
			yProgress = a;
		}});

		setTimeout(initNextRound,2500);
	}

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

			if(yProgress>(round.map.length-4)){
				yProgress = round.map.length;
				finiScroll();
			}
		}
		
		$platform.css({'bottom':-yProgress*GRIDSIZE+'px'});

		for(var m in meeps){

			if(meeps[m].dead) continue;

			meeps[m].$el.css({
				left:meeps[m].x + 'px',
				top:meeps[m].y + 'px'
			});

			meeps[m].score = Math.max( meeps[m].score, Math.floor(yProgress) );

			let gx = Math.floor(meeps[m].x/GRIDSIZE);
			let gy = Math.floor((W-meeps[m].y)/GRIDSIZE+yProgress);

			if(round.map[gy] && round.map[gy][gx]==' '){
				meeps[m].dead = true;
				
				countDead++;

				audio.play('fall',true);

				meeps[m].$el.css({
					'transition':'1s all',
					'transform':'translateZ(-1500px)'
				})
			}
		}

		let count = 0;
		for(var m in meeps) if(!meeps[m].dead) count++;

		if(count == 0 && isGoTime) finiScroll();

		hud.updatePlayers(meeps);
	}

	function finiScroll(){
		isGoTime = false;
		hud.initBanner('Finish!');

		setTimeout(function(){
			hud.finiBanner();
			finiRound();
		},3000);
	}

	function finiGame(){
		let scores = [];
		for(var m in meeps) scores[m] = meeps[m].score;

		hud.showFinalScores(scores,window.scoresToRewards(scores));

		setTimeout(function(){
			self.fini();
			window.doPartyGameComplete(scores);
		},5000);	
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