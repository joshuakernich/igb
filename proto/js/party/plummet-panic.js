window.PlummetPanicGame = function(playersMeta) {
	
	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const MAXCOIN = 15;
	const COIN = 60;

	const PLAYERS_PER_ROUND = 3;
	const STOMPS_PER_SWAP = 5;

	/*const PATTERN = [
			'_ ______',
			'______ _',
			'___ ____',
			'_ _____ ',
			'_____ __',
			' _______',
			'______ _',
			'___ ____',
			' _____ _',
			'____ ___',
			'_ ____ _',
			'____ ___',
			' _______',
			'_______ ',
			'__ _____',
			' ______ ',
			'__ _ ___',
			'______ _',
			'___ ____',
			'_ ______',
			'___ ____',
			'_____ __',
			'___ ____',
			' ______ ',
			'_____ __',
			'_ ______',
			'____ ___',
			'_ ____ _',
			'___ ____',
			'_______ ',
	]*/

	const PATTERN = [
			'_ 1___1_',
			'1___1_ _',
			'___ 1__1',
			'_ 1__1_ ',
			'1____ 1_',
			' ___1__1',
			'__1_1_ _',
			'___ 1__1',
			' 1__1_ _',
			'__1_ 1__',
			'_ 1__1 _',
			'1___ __1',
			' 1_____1',
			'1_____1 ',
			'__ 1___1',
			' 1____1 ',
			'_1 _ 1__',
			'1____1 _',
			'___ 1__1',
			'_ 1____1',
			'1_1 ____',
			'1___1 __',
			'___ 1__1',
			' 1____1 ',
			'____1 _1',
			'_ 1____1',
			'1__1 ___',
			'_ 1__1 _',
			'1__ ___1',
			'1_____1 ',
	]


	const STRUCTURE = [
		undefined,
		undefined,
		[
			{players:[0,1],levels:10,timeMax:1.5,timeMin:1},
			{players:[0,1],levels:20,timeMax:1.2,timeMin:0.7},
			{players:[0,1],levels:30,timeMax:1,timeMin:0.5},
		],
		[
			{players:[0,1,2],levels:10,timeMax:1.5,timeMin:1},
			{players:[0,1,2],levels:20,timeMax:1.2,timeMin:0.7},
			{players:[0,1,2],levels:30,timeMax:1,timeMin:0.5},
		],
		[
			{players:[0,1,2,3],levels:10,timeMax:1.5,timeMin:1},
			{players:[0,1,2,3],levels:30,timeMax:1.2,timeMin:0.5},
		],
		[
			{players:[0,1,2],levels:10,timeMax:1.2,timeMin:0.5},
			{players:[3,4,0],levels:10,timeMax:1.2,timeMin:0.5},
			{players:[1,2,3],levels:10,timeMax:1.2,timeMin:0.5},
			{players:[4,0,1],levels:10,timeMax:1.2,timeMin:0.5},
			{players:[2,3,4],levels:10,timeMax:1.2,timeMin:0.5},
		],
		[ 
			{players:[0,1,2],levels:10,timeMax:1.2,timeMin:0.7},
			{players:[3,4,5],levels:10,timeMax:1.2,timeMin:0.7},
			{players:[0,2,4],levels:20,timeMax:1,timeMin:0.5},
			{players:[1,3,5],levels:20,timeMax:1,timeMin:0.5},
		],
	]

	const LEVEL = {
		SEG:8,
		W:W*0.7,
		H:H*0.18,
	};

	if( !PlummetPanicGame.init ){
		PlummetPanicGame.init = true;

		$("head").append(`
			<style>
				plummetpanicgame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background-image: url(./proto/img/party/bg-cityscape.png);
					background-size: 100%;
					background-position: bottom center;
					text-align: center;
					position: relative;
					overflow: hidden;
				}

				plummetpanicgame:before{
					content:"";
					display: block;
					position: absolute;
					inset: 0px;
					background: linear-gradient(to top, #63666A, transparent);
				}


				plummetlevel{
					display:block;
					width: ${LEVEL.W}px;
					height: ${LEVEL.H}px;
					position: relative;

					background: #A8793B;
					border-left: 50px solid #CB9247;
					border-right: 50px solid #CB9247;
				}

				plummetlevel.checkpoint:before{
					content:"";
					display: block;
					position: absolute;
					inset: 0px;
					opacity: 0.1;
					background: url(./proto/img/party/texture-flag.jpg);
					background-size: 33%;
				}

				plummetlevel:last-of-type:before{
					content:"";
					display:block;
					position:absolute;
					right: 100px;
					width: 100px;
					bottom: 0px;
					height: ${LEVEL.H*0.6}px;
					background: rgba(0,0,0,0.3);
					border: 10px solid #CB9247;
					box-shadow: inset 0px 0px 5px black, 0px 0px 5px black;
					border-bottom: none;
				}

				plummettower{
					display: inline-block;
					margin-top: ${LEVEL.H*2}px;
					position: relative;
					border-top: none;
				}


				plummetseg{
					display: inline-block;
					width: ${LEVEL.W/LEVEL.SEG}px;
					height: 30px;
					background: #CB9247;
					box-shadow: 0px 2px 5px black;
					position: relative;
					top: ${LEVEL.H}px;
					z-index:1;
				}

				plummetlogo{
					display:block;
					width: ${LEVEL.W+100}px;
					height: ${LEVEL.H*3}px;

					position: absolute;
					top: ${-LEVEL.H*3-50}px;
					left: 0px;
					
					border-bottom: 50px solid #CB9247;
					z-index: 1;
					overflow: hidden;
				}

				plummetlogo:before{
					content:"TOWER CO";
					display: block;
					font-size:  150px;
					line-height: 100px;
					color: #C99047;
					position: absolute;
					bottom: 0px;
					left: 50px;
					text-shadow: -10px 0px #A8793A, 0px 0px 20px black;
				}

				plummetlogo:after{
					content:"";
					display: block;
					width: ${LEVEL.W/LEVEL.SEG}px;
					height: ${LEVEL.W/LEVEL.SEG}px;
					position: absolute;
					right: 100px;
					bottom: 0px;
					background: #CA9147;
					border-radius: 0px 100px 0px 0px;
					border-left: 50px solid #A8793A;
					box-shadow: 0px 0px 20px black;
				}

				plummetmeep{
					display: block;
					position: absolute;
				}

				plummetfoot{
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
					right: 0px;
					height: ${LEVEL.H*2+30}px;
					top: ${-500}px;
				}

				plummetfoot:after{
					content: "";
					display: block;
					position: absolute;
					bottom: 0px;
					left: 0px;
					right: 0px;
					height: ${H}px;
					background: url(./proto/img/party/actor-foot.png);
					background-size: 20%;
					background-position: bottom center;
					background-repeat: no-repeat;
				}

				plummetfloor{
					display: block;
					width: ${W*3}px;
					height: ${LEVEL.H}px;
					background: #705C59;
					position: absolute;
					bottom: ${-LEVEL.H}px;
					left: 50%;
					transform: translateX(-50%);
					z-index: 2;
					border-top: 2px solid #DFBD69;
				}

				plummetscore{
					display: block;
					position: absolute;
					left: -100px;
					right: -100px;
					bottom: 115px;
					line-height: 60px;
					font-size: 60px;
					color: white;
					z-index: 1;
				}

				plummetcoin{
					display: block;
					position: absolute;
					width: ${COIN}px;
					height: ${COIN}px;

					transform: translateX(-50%);

					border-radius: 100%;
					box-sizing: border-box;
					background: var(--pink);
					border: 4px solid white;
					line-height: ${COIN-8}px;
					font-size: ${COIN/2}px;
					color: white;

					/*background-image: url(./proto/img/party/sprite-coin.png);
					background-size: 900%;
					background-position-x: -100%;
					background-position-y: 100%;
					animation: plummetcoinspin;
					animation-duration: 1s;
					animation-iteration-count: infinite;
					animation-timing-function: steps(9);*/
				}

				plummetcoin:after{
					content:"+1";
				}

				@keyframes plummetcoinspin{
					0%{
						background-position-x: 0%;
					}

					100%{
						background-position-x: -900%;
					}
				}

			</style>
		`)
	}

	let audio = new AudioPlayer();
	audio.add('music','./proto/audio/party/music-run.mp3',0.3,true);
	audio.add('crush','./proto/audio/party/sfx-crush.mp3',0.3);
	audio.add('checkpoint','./proto/audio/party/sfx-sequence.mp3',0.3);
	audio.add('coin','./proto/audio/party/sfx-coin.mp3',0.3);

	const PlummetLevel = function(nLevel,isFloor){

		let self = this;
		self.$el = $('<plummetlevel>');
		self.iLevel = nLevel;
		self.isPummeled = false;

		self.coins = [];

		if(nLevel%5==0 && nLevel!=0) self.$el.addClass('checkpoint');

		let map = [];
		let $segs = [];
		
		let isGappy = false;

		let nGapA = PATTERN[nLevel].indexOf(' ');
		let nGapB = PATTERN[nLevel].lastIndexOf(' ');

		//let nGapA = Math.floor( Math.random() * (LEVEL.SEG-2) );
		//let nGapB = nGapA + 1 + Math.floor( Math.random() * (LEVEL.SEG-nGapA-1) );

		if(isFloor) nGapA = nGapB = -1;
		/*if(Math.random()>0.5){
			if(Math.random()>0.5) nGapB = -1;
			else nGapA = -1;
		}*/

		for(var i=0; i<LEVEL.SEG; i++){

			let $seg = $('<plummetseg>').appendTo(self.$el);
			$segs[i] = $seg;
			map[i] = (i==nGapA || i==nGapB)?false:true;

			if(PATTERN[nLevel][i]=='1'){
				let $coin = $('<plummetcoin>').appendTo(self.$el).css({
					'left': (i+0.5)*(LEVEL.W/LEVEL.SEG) + 'px',
					'bottom':'20px',
					'animation-delay':-Math.random() + 's',
				})

				self.coins.push({$el:$coin,x:(i+0.5),level:nLevel});
			}
		}

		self.add = function(meep){
			meep.$el.appendTo( self.$el );
			meep.fall();
			meep.level = self;
		}

		self.revealGaps = function(){
			isGappy = true;
			for(let m in map){
				if(!map[m]){

					let left = -100 + Math.random() * 200;

					$segs[m].css({ 
						transform: 'rotate('+(-45+Math.random()*90)+'deg)'
					}).animate({
						top: -20-Math.random()*20,
						left: left/2,
					},300).animate({
						top: 600,
						left: left,
					},{
						duration:500,
						complete:function(){
							$segs[m].css({opacity:0})
						}
					});
				}
			}
		}

		self.pummel = function(){
			self.$el.css('opacity',0);
			self.isPummeled = true;
		}

		self.isSegSolid = function(iSeg){
			if(!isGappy) return true;
			return map[iSeg];
		}
	}

	const PlummetTower = function( countLevel ){
		let self = this;
		self.$el = $('<plummettower>');

		let $logo = $('<plummetlogo>').appendTo(self.$el);

		let levels = self.levels = [];
		let iPummel = -1;

		for(var i=0; i<countLevel; i++){
			let level = new PlummetLevel(i,i==countLevel-1);
			level.$el.appendTo(self.$el);
			levels[i] = level;
		}

		let $floor = $('<plummetfloor>').appendTo(self.$el);

		self.add = function(meep,nLevel){
			if(nLevel==-1) meep.$el.appendTo($logo);
			else levels[nLevel].add(meep);
		}

		self.pummel = function(){
			if(iPummel<0){
				$logo.hide();
			}
			else{
				levels[iPummel].pummel();
			}

			for(var i=iPummel+1; i<iPummel+3; i++) if(levels[i]) levels[i].revealGaps();
			iPummel++;
		}
	}

	const PlummetMeep = function(n){
		let self = this;
		self.$el = $('<plummetmeep>');

		let meep = new PartyMeep(n);
		meep.$el.appendTo(self.$el);
		meep.$el.css({
			left: '0px',
			bottom: '0px',
			transform: 'scale(0.32)',
		})

		


		meep.$shadow.hide();

		self.sy = 0;
		self.px = 0;
		self.altitude = LEVEL.H;
		self.iSeg = 0;

		self.isLive = false;
		self.diedAtLevel = -1;
		self.pxRigged = 0;

		self.score = 0;

		self.step = function () {
			if( self.altitude>0 ){
				self.sy += 0.3;
				self.altitude -= self.sy;
			} else{
				self.altitude = 0;
			}

			if(self.level && self.level.isPummeled) self.diedAtLevel = self.level.iLevel;
		}

		self.redraw = function(){
		
			if(self.diedAtLevel>-1) return;

			let x = self.isLive?self.px:self.pxRigged;

			x = Math.max( 0.2, Math.min( 0.8, x )) - 0.15;

			self.x = x/0.7*LEVEL.SEG;

			self.iSeg = Math.floor( self.x );

			self.$el.css({
				left: x * W + 'px',
				bottom: self.altitude+'px',
			})
		}

		self.fall = function(){
			self.altitude = LEVEL.H;
			self.sy = 10;
			self.redraw();
		}

		self.doScoreUp = function(){
			self.score++;
			
			meep.doScore();
		}

		self.showScore = function(b){
			
		}

		self.redraw();
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<plummetpanicgame>').appendTo(self.$el);
	let $blur = $('<blurlayer>').appendTo($game);

	let tower;

	let $foot = $('<plummetfoot>').appendTo($game);

	let hud = new PartyHUD('#7399C5');
	hud.$el.appendTo($game);
	
	if( playersMeta ) setTimeout( function(){ initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	let meeps = [];
	
	let timePerLevel = 0;
	let scroll = 0;
	let isGoTime = false;
	let iStomp = -1;

	function screenshake(){

		$game.animate({
			left:-20 + Math.random()*40,
			top:-20 + Math.random()*40,
		},100).animate({
			left:-20 + Math.random()*40,
			top:-20 + Math.random()*40,
		},100).animate({
			left:-20 + Math.random()*40,
			top:-20 + Math.random()*40,
		},100).animate({
			left:0,
			top:0,
		},100)
	}

	function initGame(count){


		for(var m=0; m<count; m++){
			meeps[m] = new PlummetMeep(m);
		}

		initTutorial();
	}


	function initTutorial() {
		hud.initTutorial("Plummet Panic",
			{x:1.5, y:0.7, msg:"Move left and right<br>and fall through the gaps", icon:"side-to-side"},
		)

		round = {levels:10};
		tower = new PlummetTower(round.levels);
		tower.$el.appendTo($game);

		for(var m in meeps){
			meeps[m].isLive = true;
			tower.add(meeps[m], 0);
		}

		isGoTime = true;

		for(var l in tower.levels) tower.levels[l].revealGaps();

		hud.initTimer(20,finiTutorial);
	}

	function finiTutorial(){
		
		hud.finiTimer();
		hud.finiTutorial();
		isGoTime = false;

		for(var m in meeps){
			meeps[m].isLive = false;
			meeps[m].score = 0;
		}

		tower.$el.remove();

		

		initPlay();
	}

	function initPlay(){
		$blur.hide();
		hud.initPlayers(meeps);
		setTimeout(initNextRound,1000);
	}

	let iRound = -1;
	let round;
	let isRoundComplete = false;
	function initNextRound(){

		audio.play('music');

		if(tower) tower.$el.remove();

		isRoundComplete = false;

		scroll = 0;
		iStomp = -1;

		iRound++;

		round = STRUCTURE[meeps.length][iRound];
		tower = new PlummetTower(round.levels);
		

		for(var p in round.players){
			let m = round.players[p];
			meeps[m].isLive = true;
			meeps[m].diedAtLevel = -1;
			meeps[m].altitude = 0;
			meeps[m].level = undefined;
			meeps[m].showScore(false);
			tower.add(meeps[m], -1);
		}

		tower.$el.appendTo($game).css({
			top: '100%',
		}).animate({
			top: '0px',
		})

		setTimeout(function(){
			hud.initRound(iRound, STRUCTURE[meeps.length].length );
		},1000);

		setTimeout(function(){
			hud.finiBanner();
		},3000);

		setTimeout(function(){
			hud.summonPlayers(round.players);
		},5000);

		setTimeout(function(){
			hud.finiBanner();
		},7000);

		setTimeout(function(){
			isGoTime = true;
			initIntro();
		},9000);
	}

	function initIntro() {
		for(var p in STRUCTURE[meeps.length][iRound].players){

			let m = STRUCTURE[meeps.length][iRound].players[p];

			meeps[m].isLive = false;
			meeps[m].pxRigged = meeps[m].px;
			
			let dx = Math.abs(meeps[m].pxRigged - 0.8);

			$(meeps[m]).animate({
				pxRigged:0.75,
			},{
				duration:dx * 3000,
				easing:'linear',
				complete:function(){
					tower.add(meeps[m],0);
				}
			}).animate({
				pxRigged: meeps[m].px,
			},{
				duration: dx * 3000,
				easing: 'linear',
				complete:function(){
					meeps[m].isLive = true;
				}
			})
		}

		setTimeout(stomp,5000);
	}

	
	function stomp(){
		timePerLevel = 0;
		iStomp++;

		let timePause = round.timeMax - (round.timeMax-round.timeMin) * (iStomp/round.levels);

		$foot.animate({
			top: scrollDiff
		},{
			duration: 200,
			easing: 'linear',
			complete:function(){
				audio.play('crush');
				tower.pummel();
				screenshake();
			}
		})
		.delay( timePause*1000/2 )
		.animate({
			top: -500,
		},{
			duration: 500,
			start:function(){
				initScroll();
			},
		})
	}

	function initReady(){
		hud.initBanner('Ready...');

		setTimeout(function(){
			hud.finiBanner();
		},1500);

		setTimeout(function(){
			hud.initBanner('Go!');
		},3000);

		setTimeout(function(){
			isGoTime = true;
			hud.finiBanner();
			initScroll();
		},4500);
	}

	function initScroll(){
		//if(!isRoundComplete) scrollSpeed = Math.min( LEVEL.H/10, 1 + iStomp*0.2 );
		if(!isRoundComplete) timePerLevel = round.timeMax - (round.timeMax-round.timeMin) * (iStomp/round.levels);

		
		if(iScroll%5==3){
			let iCheckpointLevel = iScroll+2;
			if(iCheckpointLevel < (round.levels-1)){
				for(var m in meeps ){
					if(meeps[m].isLive && meeps[m].diedAtLevel > -1){
						audio.play('checkpoint',true);
						meeps[m].diedAtLevel = -1;
						tower.add(meeps[m],iCheckpointLevel);

					}
				}
			}
		}


	}

	let scrollDiff = 0;
	let iScroll = 0;

	self.step = function(){
		resize();

		if(!tower) return;

		if(!isRoundComplete && timePerLevel){
			scroll += LEVEL.H * (1/timePerLevel/FPS);
			iScroll = Math.floor( scroll/LEVEL.H );
			if(iScroll>=round.levels){
				initFinale('Finish!');	
			} else if(iScroll>iStomp){
				console.log('trigger stomp',iScroll,iStomp);
				stomp();
			}
		}

		let scrollTarget = Math.min( scroll, LEVEL.H*(round.levels-3));
		scrollDiff = scroll - scrollTarget;

		tower.$el.css({
			top: -scrollTarget + 'px',
		})

		for(var m in meeps) meeps[m].step();
		for(var m in meeps){
			// test for plummet

			if(meeps[m].isLive && meeps[m].diedAtLevel==-1 && meeps[m].level != undefined && meeps[m].altitude < 0.1){

				let coins = meeps[m].level.coins;

				for(var c in coins){
					let dx = coins[c].x - meeps[m].x;
					
					if(!coins[c].isCollected && Math.abs(dx)<0.3){
						coins[c].$el.hide();
						coins[c].isCollected = true;
						audio.play('coin',true);
						meeps[m].doScoreUp();
					}
				}
			}

			if( meeps[m].isLive && meeps[m].diedAtLevel==-1 && meeps[m].altitude == 0 && meeps[m].level ){

				let isSegSolid = meeps[m].level.isSegSolid( meeps[m].iSeg );
				if(!isSegSolid){
					let iLevel = meeps[m].level.iLevel; 
					tower.add(meeps[m], iLevel+1);
					
				} else {
					meeps[m].sy = 0;
				}
			}
		}
		for(var m in meeps) meeps[m].redraw();

		if(isGoTime){

			hud.updatePlayers(meeps);

			let countAlive = 0;
			for(var m in meeps) if(meeps[m].diedAtLevel==-1) countAlive++;

			if(countAlive==0){
				initFinale('Finish!');
			}
		}

	}

	function initFinale(message){
		isGoTime = false;
		isRoundComplete = true;
		timePerLevel = 0;
		hud.initBanner(message);

		for(var p in STRUCTURE[meeps.length][iRound].players){
			let m = STRUCTURE[meeps.length][iRound].players[p];
			meeps[m].showScore(true);
		}

		if(STRUCTURE[meeps.length][iRound+1]){
			setTimeout( hud.finiBanner, 2000 );
			setTimeout( initNextRound, 4000 );
		} else {
			setTimeout( doFinalScores, 2000 );
		}
	}


	function doFinalScores(){

		let scores = [];
		let map = [];
		for(var m in meeps){
			map[m] = { 
				n:parseInt(m), 
				score:meeps[m].score,
			};
			scores[m] = meeps[m].score;
		}

		map.sort(function(a,b){
			return b.score-a.score;
		});

		let pos = 0;
		for(var m=0; m<map.length; m++){
			if(m>0 && map[m].score < map[m-1].score) pos++;
			map[m].pos = pos;
		}

		
		tower.$el.hide();
		
		let rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores,rewards);


		setTimeout(function () {
			self.fini();
			window.doPartyGameComplete(rewards);
		},3000)
		
		
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	let interval = setInterval(self.step,1000/FPS);

	self.fini = function(){
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	}

	self.setPlayers = function(p){

		for(var m in meeps){
			meeps[m].px = p[m].px;
		}
	}
}