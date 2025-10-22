window.FinalFrenzyGame = function( playersMeta ){
	const W = 1600;
	const H = 1000;
	const FPS = 20;
	let PLAYER_COUNT = 6;
	let SCORE_MAX = 15;
	const GRIDSIZE = 400;
	const COIN = 150;

	const GRID = {W:W/GRIDSIZE};


	const START_BLOCKS = [[
		'0000',
		'0000',
		'0000',
		'0000',
	]]

	const CHECKPOINT_BLOCKS = [[
		'3333',
		'3333',
		'3333',
		'3333',
	]]

	const FINISH_BLOCKS = [[
		'2222',
		'2222',
		'2222',
		'2222',
	]]

	// 8 coins for each
	const COIN_BLOCKS = [
		[
			'1010',
			'0101',
			'1010',
			'0101',
		],
		[
			'1001',
			'0110',
			'0110',
			'1001',
		],
		[
			'0110',
			'1001',
			'1001',
			'0110',
		],
		[
			'1000',
			'0100',
			'0010',
			'0001',
			'0001',
			'0010',
			'0100',
			'1000',
		],
		[
			'0011',
			'0110',
			'0110',
			'1100',
		],
	]

	const MAZE_BLOCKS = [
		[
			'0000',
			'0  0',
			'1  1',
			'0  0',
		],
		[
			'0000',
			'0 0 ',
			'1001',
			' 0 0',
		],
		[
			'0000',
			'0  0',
			'1001',
			' 00 ',
		],
		[
			'0000',
			'0   ',
			'1001',
			'   0',
		],
		[
			'0000',
			'0   ',
			'0011',
			'0   ',
		],
		[
			'0000',
			'   0',
			'1100',
			'   0',
		],
		[
			'0000',
			'0  0',
			'0000',
			'11 0',
			'   0',
		],
		[
			'0000',
			'0  0',
			'0000',
			'0 11',
			'0   ',
		],
	]

	const DEATH_BLOCKS = [
		[
			'0000',
			'1  1',
			'0  0',
			'0**0',
		],
		[
			'0000',
			'0**0',
			'0110',
			'*00*',
		],
		[
			'0000',
			'*00*',
			'1001',
			'0**0',
		],
		[
			'0000',
			'10**',
			'0000',
			'**01',
			'0000',
			'10**',
		],
		[
			'0000',
			'0  0',
			'1  1',
			'0**0',
			'0000',
			'*00*',
		],
		[
			'0000',
			'0  0',
			'1  1',
			'0000',
			'*00*',
			'1001',
			'0**0',
		],
	]


	const SETS = {
		'start':START_BLOCKS,
		'checkpoint':CHECKPOINT_BLOCKS,
		'finish':FINISH_BLOCKS,
		'coin':COIN_BLOCKS,
		'maze':MAZE_BLOCKS,
		'death':DEATH_BLOCKS,
	}

	let queues = {};

	function makeLevel( patterns ){
		let arr = [];
		for(var p in patterns){
			let chunk = patterns[p].concat();
			chunk.reverse();
			arr = arr.concat(chunk);
		}
		return arr;
	}


	function generateLevelMap( reps ){
		
		let arr = [];

		arr = arr.concat( getType('start'));

		for(var r=0; r<reps; r++){
			arr = arr.concat( getType('coin'));
			arr = arr.concat( getType('maze'));
			arr = arr.concat( getType('coin'));
			arr = arr.concat( getType('death'));

			if(r<reps-1) arr = arr.concat( getType('checkpoint'));
			else arr = arr.concat( getType('finish'));
		}

		return arr;
	}

	function getType( type ){

		if(!queues[type] || !queues[type].length){
			queues[type] = SETS[type].concat();
			shuffleArray(queues[type]);
		}

		let arr = queues[type].pop().reverse();
		console.log('getType',type,arr);
		return arr;
	}


	const TUTORIAL = generateLevelMap(1);
	

	// reverse the maps so they render as displayed above
	//for(var m in MAPS) MAPS[m].reverse();
	//TUTORIAL.reverse();

	const SLOW = 0.05;
	const MED = 0.06;
	const FAST = 0.07;

	const STRUCTURE = [
		undefined,
		undefined,
		[
			[{speed:SLOW,players:[0,1],map:generateLevelMap(2)}],
			[{speed:MED,players:[0,1],map:generateLevelMap(3)}],
			[{speed:FAST,players:[0,1],map:generateLevelMap(4)}],
		],
		[
			[{speed:SLOW,players:[0,1,2],map:generateLevelMap(2)}],
			[{speed:MED,players:[0,1,2],map:generateLevelMap(3)}],
			[{speed:FAST,players:[0,1,2],map:generateLevelMap(4)}],
		],
		[
			[{speed:SLOW,players:[0,1],map:generateLevelMap(2)},{speed:SLOW,players:[2,3],map:generateLevelMap(2)}],
			[{speed:MED,players:[0,1],map:generateLevelMap(3)},{speed:MED,players:[2,3],map:generateLevelMap(3)}],
			[{speed:FAST,players:[0,1],map:generateLevelMap(4)},{speed:FAST,players:[2,3],map:generateLevelMap(4)}],
		],
		[
			[{speed:SLOW,players:[0,1,2],map:generateLevelMap(2)},{speed:SLOW,players:[3,4],map:generateLevelMap(2)}],
			[{speed:MED,players:[0,2,4],map:generateLevelMap(3)},{speed:MED,players:[1,3],map:generateLevelMap(3)}],
			[{speed:FAST,players:[1,3,4],map:generateLevelMap(4)},{speed:FAST,players:[0,2],map:generateLevelMap(4)}],
		],
		[
			[{speed:SLOW,players:[0,1,2],map:generateLevelMap(2)},{speed:SLOW,players:[3,4,5],map:generateLevelMap(2)}],
			[{speed:SLOW,players:[0,1,2],map:generateLevelMap(3)},{speed:SLOW,players:[3,4,5],map:generateLevelMap(3)}],
			[{speed:FAST,players:[0,1,2],map:generateLevelMap(4)},{speed:FAST,players:[3,4,5],map:generateLevelMap(4)}],
		],
	]

	if(!FinalFrenzyGame.didInit){
		FinalFrenzyGame.didInit = true;

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
					display: none;
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
					display: none;
				}

				mazeblock[absent='true']{
					background: none !important;
					box-shadow: none;
				}

				mazeblock[absent='true']:before, mazeblock[absent='true']:after{
					display: none;
				}

				mazeblock[n='0']{ background: var(--n0); }
				mazeblock[n='1']{ background: var(--n1); }
				mazeblock[n='2']{ background: var(--n2); }
				mazeblock[n='3']{ background: var(--n3); }
				mazeblock[n='4']{ background: var(--n4); }
				mazeblock[n='5']{ background: var(--n5); }

				mazeblockcontent{
					display: block;
					position: absolute;
					bottom: 25%;
					left: 0px;
					right: 0px;
					transform: rotateX(-90deg);
					transform-origin: bottom center;
				}

				mazeshadow{
					display:block;
					position: absolute;
					bottom: 0px;
					left: 0px;
					right: 0px;
					top: 0px;
					margin: auto;
					width: 200px;
					height: 200px;
					background: black;
					border-radius: 100%;
				}

				mazeprojectile{
					display:block;
					position: absolute;
					bottom: 0px;
					left: 0px;
					right: 0px;
					margin: 0px auto;
					width: 200px;
					height: 200px;
					background: white;
					border-radius: 100%;
					background-size: 100%;
					background-image: url(./proto/img/volleyball.png);
				}

				mazeprojectile[type='0']{
					background: url(./proto/img/football.png);
				}

				mazesmoke{
					display: block;
					position: absolute;
					background: white;
					border-radius: 100%;
					transform: translate(-50%, -50%);
				}

				mazeexplosioncontainer{
					display: block;
					position: absolute;
				}

				mazeexplosion{
					display: block;
					position: absolute;
					overflow: visible;
					transform: translate(-50%, -50%);
					border-radius: 100%;
					opacity: 0.9;
				}

				mazecoin{
					position: absolute;
					display: block;
					transform-style: preserve-3d;

					top: 50%;
					left: 50%;
				}

				mazecoinbody{
					position: absolute;
					display: block;
					width: ${COIN}px;
					height: ${COIN}px;
					left: -${COIN/2}px;
					bottom: 0px;
					
					background: url(./proto/img/party/sprite-coin.png);
					
					background-size: 900%;
					background-position-y: 100%;
					transform: rotateX(-90deg);
					transform-origin: bottom center;

					animation: coinspin;
					animation-iteration-count: infinite;
					animation-duration: 1s;
					animation-timing-function: steps(9);
				}

				@keyframes coinspin{
					0%{
						background-position-x: 0%;
					}

					100%{
						background-position-x: -900%;
					}
				}

			</style>`);
	}

	const MazeExplosion = function(size,color){

		let self = this;
		self.$el = $('<mazeexplosioncontainer>');

		$('<mazeexplosion>').appendTo(self.$el).css({
			width: size +'px',
			height: size +'px',
			background: color,
		}).animate({
			width: (size * 1.5) + 'px',
			height: (size * 1.5) + 'px',
		},200).delay(200).animate({
			width: '0px',
			height: '0px',
			opacity: 0,
		},1000);

		for(var i=0; i<6; i++){
			let sizeSmoke = 20 + Math.random() * 20;
			let r = Math.random() * Math.PI*2;
			$('<mazesmoke>').appendTo(self.$el).css({
				width: sizeSmoke + 'px',
				height: sizeSmoke + 'px',
				left: Math.cos(r) * size/2 * Math.random(),
				top: Math.sin(r) * size/2 * Math.random(),
			}).animate({
				left: Math.cos(r) * (size*1.5)/2,
				top: Math.sin(r) * (size*1.5)/2,
				width: (sizeSmoke*2) + 'px',
				height: (sizeSmoke*2) + 'px',
			},200 + Math.random()*100).animate({
				left: Math.cos(r) * (size*2)/2,
				top: Math.sin(r) * (size*2)/2,
				width: (sizeSmoke) + 'px',
				height: (sizeSmoke) + 'px',
				opacity: 0,
			},1000)
		}
	}

	
	let isGoTime = false;

	let self = this;
	self.$el = $('<igb>');

	let audio = new AudioPlayer();
	audio.add('music','./proto/audio/party/music-cosmic-frenzy.mp3',0.2,true);
	audio.add('fall','./proto/audio/party/sfx-fall.mp3',0.3);
	audio.add('blip','./proto/audio/party/sfx-select.mp3',0.1);
	audio.add('explode','./proto/audio/party/sfx-explode.mp3',0.3);
	audio.add('coin','./proto/audio/party/sfx-coin.mp3',0.3);
	audio.add('spawn','./proto/audio/party/sfx-sequence.mp3',0.3);

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

		initTutorial();
	}



	const palette = ['#37CCDA','#8DE968','#FEE955','#FEB850','#FD797B'];
	const grays = ['#555','#ddd','#555','#ddd','#ddd','#555','#ddd','#555'];
	const oranges = ['#FEE955','#FEB850','#FEE955','#FEB850','#FEB850','#FEE955','#FEB850','#FEE955'];


	let yProgress = 0;
	let iCohort = -1;
	let iRound = 0;
	let round;
	let blocks = [];
	let coins = [];

	function initTutorial(){
		hud.initTutorial('Final Frenzy',
			{x:1.2, y:0.45, msg:'Move around the box<br>to collect coins', icon:'around'},
			{x:1.8, y:0.45, msg:"Don't fall off!", icon:undefined},
		);

		round = {map:TUTORIAL,speed:0.03};
		initMaze(round.map);

		setTimeout(function(){
			for(var m in meeps){
				meeps[m].$el.show();
				meeps[m].dead = false;
			}
			isGoTime = true;
		},2000);

		hud.initTimer(30,finiTutorial);
	}

	function finiTutorial(){
		isGoTime = false;

		hud.finiTimer();
		hud.finiTutorial();

		for(var m in meeps){
			meeps[m].$el.hide();
			meeps[m].dead = true;
			meeps[m].score = 0;
		}

		$platform.empty();

		initPlay();
	}

	function initPlay() {
		hud.initPlayers(meeps);
		setTimeout(initNextRound,1000);
	}


	function initMaze(map){
		let n = -1;
		for(var y=0; y<map.length; y++){
			let $row = $('<mazerow>').prependTo($platform);
			for(var x=0; x<map[y].length; x++){

				n++;

				let colours = palette;
				if( map[y][x]=='2') colours = grays;
				if( map[y][x]=='3') colours = grays;

				let $block = $('<mazeblock>')
				.css({'background-color':colours[n%colours.length]})
				.appendTo($row)
				.attr('absent',map[y][x]==' '?'true':'false')
				.attr('x',x)
				.attr('y',y);

				let $content = $('<mazeblockcontent>')
				.appendTo($block);

				if(map[y][x]=='1'){

					let $shadow = $(`<mazeshadow>`).appendTo($block).css({opacity:0.3,width:COIN,height:COIN});

					let $coin = $(`
					<mazecoin>
						<mazecoinbody>
						</mazecoinbody>
					</mazecoin>
					`).appendTo($block);

					coins.push({
						x:x + 0.5,
						y:y + 0.5,
						$el:$coin,
						$shadow:$shadow,
					});
				}

				blocks[n] = {
					x:x,
					y:y,
					$el:$block,
					$content:$content,
					type:map[y][x]
				};
			}
		}
	}

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
		blocks.length = 0;

		round = STRUCTURE[meeps.length][iRound][iCohort];


		initMaze(round.map);

		yProgress = round.map.length;
		$({p:yProgress}).animate({p:0},{duration:5000,step:function(a){
			yProgress = a;
		}});

		setTimeout(function(){
			if(iCohort==0){
				hud.initRound(iRound,STRUCTURE[meeps.length].length);
				audio.play('music',false,(iRound==STRUCTURE[meeps.length].length-1)?1.25:1);
			}
		},1000);

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
			hud.finiBanner();
		},6000);

		setTimeout(function(){
			hud.summonPlayers(round.players);
		},8000);

		setTimeout(function(){
			hud.finiBanner();
		},10000);

		setTimeout(function(){
			isGoTime = true;
		},11000);
	}

	function finiRound(){

		for(var m in meeps){
			meeps[m].$el.hide();
			meeps[m].dead = true;
		}

		$({p:yProgress}).animate({p:-10},{duration:2000,step:function(a){
			yProgress = a;
		}});

		setTimeout(initNextRound,2500);
	}

	if( playersMeta ) setTimeout( function(){ initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	let scoreMult = 1;
	let countDead = 0;

	function step(){
		resize();

		for(let b in blocks){
			let isVisible = (blocks[b].y > (yProgress-1) && blocks[b].y < (yProgress+11));
			blocks[b].$el.css('visibility', isVisible?'visible':'hidden');
		}
		
		if(isGoTime){
		
			yProgress += round.speed;

			if(yProgress>(round.map.length-4)){
				yProgress = round.map.length-4;
				finiScroll();
			}

			let cntCheckpoint = 0;
			for(let b in blocks){

				if(blocks[b].type == '3' && blocks[b].y < (yProgress+4) && blocks[b].y > yProgress) cntCheckpoint++;

				if(blocks[b].y<(yProgress+4) && blocks[b].type=='*' && !blocks[b].isActive){
					blocks[b].isActive = true;
					//

					let $shadow = $('<mazeshadow>').appendTo(blocks[b].$el).css({
						width:'0px', height: '0px', opacity: 0.1,
						left: '200px',
					}).animate({
						width:'200px', height: '200px', opacity: 0.7,
						left:'0px',
					},1000)

					$('<mazeprojectile>').appendTo(blocks[b].$content)
					.css({
						left: '200px',
						bottom: '1000px',
					}).animate({
						bottom: '0px',
						left:'0px',
					},{
						easing: 'linear',
						duration: 1000,
						complete:function(){

							$shadow.hide();
							$(this).hide();

							blocks[b].isDead = true;
							blocks[b].$el.attr('absent','true');

							new MazeExplosion(GRIDSIZE/2,'white').$el.appendTo(blocks[b].$content).css({
								left: '50%', bottom: '100px',
							})

							audio.play('explode',true);
						}
					})
				}
			}

			if(cntCheckpoint == 16){
				for(var p in round.players){
					let m = round.players[p];
					if(meeps[m].dead){
						meeps[m].$el.show();
						meeps[m].dead = false;
						meeps[m].$el.css({
							'transition':'',
							'transform':'rotateX(-60deg) scale(0.8) translateZ(0px)'
						});
						audio.play('spawn',true);
					}
					
				}
			}
		}
		
		$platform.css({'bottom':-yProgress*GRIDSIZE+'px'});

		for(var m in meeps){

			if(meeps[m].dead) continue;

			meeps[m].$el.css({
				left:meeps[m].x + 'px',
				top:meeps[m].y + 'px'
			});

			let gx = meeps[m].x/GRIDSIZE;
			let gy = (W-meeps[m].y)/GRIDSIZE+yProgress;

			for(var c in coins){

				if(coins[c].isCollected) continue;

				let dx = coins[c].x - gx;
				let dy = coins[c].y - gy;
				let d = Math.sqrt(dx*dx + dy*dy);

				if(d<0.5){
					coins[c].$el.hide();
					coins[c].$shadow.hide();
					coins[c].isCollected = true;
					meeps[m].score++;
					audio.play('coin',true);
				}
			}

			gx = Math.floor(gx);
			gy = Math.floor(gy);

			let block;
			for(var b in blocks) if(blocks[b].x == gx && blocks[b].y == gy) block = blocks[b];


			if(!round.map[gy] || !round.map[gy][gx] || round.map[gy][gx]==' ' || block.isDead ){
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

		if(count == 0 && isGoTime) yProgress += 0.1;

		hud.updatePlayers(meeps);
	}

	function reviseScores(){
		for(var m in meeps ) meeps[m].score = self.$el.find(`mazeblock[n='${m}']`).length;
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

		audio.stop('music');
		hud.showFinalScores(scores,scores);

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
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	}
}