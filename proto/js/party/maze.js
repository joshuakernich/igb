window.MazeGame = function(n){
	const W = 1600;
	const H = 1000;
	const FPS = 20;
	let PLAYER_COUNT = 6;
	let SCORE_MAX = 15;
	const GRIDSIZE = 400;
	const COIN = 150;

	const GRID = {W:W/GRIDSIZE};

	const MAPS = [
		[
			'0000',
			'0000',
			'0000',
			'0000',
			'**10',
			'0000',
			'1***',
			'0000',
			'0*01',
			'00*0',
			'1000',
			'0*01',
			'*000',
			'01*0',
			'00*0',
			'0010',
			'0**0',
			'0000',
			'01*0',
			'0*00',
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
			' *0 ',
			'0000',
			'0  0',
			'00*0',
			' 0 0',
			' 0 *',
			'0000',
			'0 0 ',
			'* 0 ',
			'0000',
			'0*00',
			'00*0',
			'0000',
			' 0 0',
			'00 0',
			'0  0',
			'00*0',
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
			' *0',
			'000*',
			'**00',
			'0000',
			'0  0',
			'000*',
			'0*00',
			'  00',
			'000 ',
			'0*  ',
			'0000',
			'  *0',
			'0000',
			'0*  ',
			'000 ',
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
			'0  0',
			'0*00',
			'000*',
			'0*00',
			'   0',
			'0*00',
			'0000',
			'0**0',
			'0000',
			'0   ',
			'0   ',
			'0*0 ',
			'000 ',
			'  00',
			' 0*0',
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
			'00*0',
			'0*00',
			'0000',
			'   0',
			'0*00',
			'0000',
			'00*0',
			'0   ',
			'0000',
			'   0',
			'0*00',
			'00*0',
			'0000',
			'0   ',
			'0  0',
			'00*0',
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
			'0*00',
			'00*0',
			'0000',
			'   0',
			'0000',
			'0*00',
			'0   ',
			'0  *',
			'0  0',
			'00*0',
			'0*00',
			'0000',
			'   0',
			'0*00',
			'0  0',
			'00*0',
			'0000',
			'  0 ',
			'0000',
			'0000',
			'0000',
			'0000',
		],

	]

	// reverse the maps so they render as displayed above
	for(var m in MAPS) MAPS[m].reverse();

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
			[{players:[0,1,2],map:MAPS[0]},{players:[3,4],map:MAPS[1]}],
			[{players:[0,2,4],map:MAPS[2]},{players:[1,3],map:MAPS[3]}],
			[{players:[1,3,4],map:MAPS[4]},{players:[0,2],map:MAPS[5]}],
		],
		[
			[{players:[0,1,2],map:MAPS[0]},{players:[3,4,5],map:MAPS[1]}],
			[{players:[0,1,2],map:MAPS[2]},{players:[3,4,5],map:MAPS[3]}],
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
					background: purple;
					border-radius: 100%;
					left: -${COIN/2}px;
					bottom: 0px;
					transform: rotateX(-90deg);
					transform-style: preserve-3d;
					transform-origin: bottom center;
					border-left: 10px solid white;
					box-sizing: border-box;
				}

				mazecoinbody:after{
					content:"";
					position: absolute;
					display: block;
					top: 0px;
					left: 0px;
					right: 0px;
					bottom: 0px;
					margin: 20px;
					box-sizing: border-box;
					border: 5px solid black;
					border-radius: 100%;
					box-shadow: 4px 0px white;
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

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-cosmic-frenzy.mp3',0.2,true);
	audio.add('fall','./proto/audio/party/sfx-fall.mp3',0.3);
	audio.add('blip','./proto/audio/party/sfx-select.mp3',0.1);
	audio.add('explode','./proto/audio/party/sfx-explode.mp3',0.3);

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
	let blocks = [];
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


		let n = -1;
		for(var y=0; y<round.map.length; y++){
			let $row = $('<mazerow>').prependTo($platform);
			for(var x=0; x<round.map[y].length; x++){

				n++;

				let $block = $('<mazeblock>')
				.css({'background-color':palette[n%palette.length]})
				.appendTo($row)
				.attr('absent',round.map[y][x]==' '?'true':'false')
				.attr('x',x)
				.attr('y',y);

				let $content = $('<mazeblockcontent>')
				.appendTo($block);

				if(round.map[y][x]=='1'){

					let $shadow = $(`<mazeshadow>`).appendTo($block).css({opacity:0.5});

					let $coin = $(`
					<mazecoin>
						<mazecoinbody>
						</mazecoinbody>
					</mazecoin>
					`).appendTo($block);
				}

				blocks[n] = {
					x:x,
					y:y,
					$el:$block,
					$content:$content,
					type:round.map[y][x]
				};
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
			if(iCohort==0) hud.initRound(iRound,STRUCTURE[meeps.length].length);
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
				yProgress = round.map.length-4;
				finiScroll();
			}

			for(let b in blocks){
				if(blocks[b].y<(yProgress+4) && blocks[b].type=='*' && !blocks[b].isActive){
					blocks[b].isActive = true;
					//blocks[b].$el.css('visibility','hidden');

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
		}
		
		$platform.css({'bottom':-yProgress*GRIDSIZE+'px'});

		for(var m in meeps){

			if(meeps[m].dead) continue;

			meeps[m].$el.css({
				left:meeps[m].x + 'px',
				top:meeps[m].y + 'px'
			});

			//meeps[m].score = Math.max( meeps[m].score, Math.floor(yProgress) );

			let gx = Math.floor(meeps[m].x/GRIDSIZE);
			let gy = Math.floor((W-meeps[m].y)/GRIDSIZE+yProgress);

			let block;
			for(var b in blocks) if(blocks[b].x == gx && blocks[b].y == gy) block = blocks[b];

			/*if(	meeps[m].gx != gx || meeps[m].gy != gy ){
				meeps[m].gx = gx;
				meeps[m].gy = gy;
				let $cell = self.$el.find(`mazeblock[x='${gx}'][y='${gy}']`);
				let nWas = $cell.attr('n');

				if(nWas != m){
					$cell.attr('n',m).css({'background':''});
					audio.play('blip',true);
					reviseScores();
				}
			} */
			
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

		if(count == 0 && isGoTime) finiScroll();

		hud.updatePlayers(meeps);
	}

	function reviseScores(){
		for(var m in meeps ) meeps[m].score = self.$el.find(`mazeblock[n='${m}']`).length;
	}

	function finiScroll(){
		isGoTime = false;
		hud.initBanner('Finish!');

		for(var m in meeps){
			meeps[m].$el.hide();
			meeps[m].dead = true;
		}

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