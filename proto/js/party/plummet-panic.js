window.PlummetPanicGame = function() {
	
	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const MAXCOIN = 15;


	const LEVEL = {
		SEG:8,
		W:W*0.7,
		H:H*0.18,
		COUNT:30,
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

				plummettower{
					display: inline-block;
					margin-top: ${LEVEL.H*2}px;
					position: relative;
					border-top: none;
				}


				plummetseg{
					display: inline-block;
					width: ${LEVEL.W/LEVEL.SEG}px;
					height: 50px;
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

			</style>
		`)
	}

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-creeping.mp3',0.3,true);
	audio.add('crush','./proto/audio/party/sfx-crush.mp3',0.3);

	

	const PlummetLevel = function(nLevel,isFloor){

		let self = this;
		self.$el = $('<plummetlevel>');
		self.iLevel = nLevel;
		self.isPummeled = false;

		let map = [];
		let $segs = [];
		let isGappy = false;

		let nGapA = Math.floor( Math.random() * (LEVEL.SEG-2) );
		let nGapB = nGapA + 1 + Math.floor( Math.random() * (LEVEL.SEG-nGapA-1) );

		if(isFloor) nGapA = nGapB = -1;

		for(var i=0; i<LEVEL.SEG; i++){

			let $seg = $('<plummetseg>').appendTo(self.$el);
			$segs[i] = $seg;
			map[i] = (i==nGapA || i==nGapB)?false:true;
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

	const PlummetTower = function(){
		let self = this;
		self.$el = $('<plummettower>');

		let $logo = $('<plummetlogo>').appendTo(self.$el);

		let levels = [];
		let iPummel = -1;

		for(var i=0; i<LEVEL.COUNT; i++){
			let level = new PlummetLevel(i,i==LEVEL.COUNT-1);
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
			transform: 'scale(0.35)',
		})

		meep.$shadow.hide();

		self.sy = 0;
		self.px = 0;
		self.altitude = LEVEL.H;
		self.iSeg = 0;

		self.isLive = true;
		self.diedAtLevel = -1;
		self.pxRigged = 0;

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

			self.iSeg = Math.floor( x/0.7*LEVEL.SEG );

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

		self.redraw();
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<plummetpanicgame>').appendTo(self.$el);

	let tower = new PlummetTower();
	tower.$el.appendTo($game);

	let $foot = $('<plummetfoot>').appendTo($game);

	let hud = new PartyHUD('#7399C5');
	hud.$el.appendTo($game);

	hud.initPlayerCount(initGame);

	let meeps = [];
	let scrollSpeed = 0;
	let scroll = 0;
	let isGoTime = false;

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

		audio.play('music');

		for(var m=0; m<count; m++){
			meeps[m] = new PlummetMeep(m);
			tower.add(meeps[m],-1);
		}

		setTimeout( initIntro, 2000 );
	}

	function initIntro() {
		for(let m in meeps){
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

	let iStomp = -1;
	function stomp(){
		scrollSpeed = 0;
		iStomp++;
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
		.delay(Math.max(500,1000-iStomp*50))
		.animate({
			top: -500,
		},{
			duration: 500,
			start:function(){
				if(iStomp==0) initReady();
				else initScroll();
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
		scrollSpeed = Math.min( LEVEL.H/10, 1 + iStomp*0.2 );
	}

	let scrollDiff = 0;

	self.step = function(){
		resize();

		if(scrollSpeed){
			scroll += scrollSpeed;
			let iScroll = Math.floor( scroll/LEVEL.H );
			if(iScroll>=LEVEL.COUNT){
				initFinale('Finish!');
				
			} else if(iScroll>iStomp){
				stomp();
			}
		}

		let scrollTarget = Math.min( scroll, LEVEL.H*(LEVEL.COUNT-3));
		scrollDiff = scroll - scrollTarget;

		tower.$el.css({
			top: -scrollTarget + 'px',
		})

		for(var m in meeps) meeps[m].step();
		for(var m in meeps){
			// test for plummet
			if( meeps[m].diedAtLevel==-1 && meeps[m].altitude == 0 && meeps[m].level ){

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
			let countAlive = 0;
			for(var m in meeps) if(meeps[m].diedAtLevel==-1) countAlive++;

			if(countAlive==1){
				initFinale('Winner!');
			} else if(countAlive==0){
				initFinale('Finish!');
			}
		}
	}

	function initFinale(message){
		isGoTime = false;
		scrollSpeed = 0;
		hud.initBanner(message);

		setTimeout(function(){

			let map = [];
			for(var m in meeps){
				map[m] = { n:parseInt(m), progress:meeps[m].diedAtLevel==-1?LEVEL.COUNT:meeps[m].diedAtLevel };
			}

			map.sort(function(a,b){
				return b.progress-a.progress;
			});

			let pos = 0;
			for(var m=0; m<map.length; m++){
				if(m>0 && map[m].progress < map[m-1].progress) pos++;
				map[m].pos = pos;
			}

			let scores = [];
			for(var i=0; i<map.length; i++){
				scores[map[i].n] = MAXCOIN - Math.ceil(map[i].pos/map.length*MAXCOIN);
			}

			self.fini();
			window.doPartyGameComplete(scores);
		},2000);
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
		clearInterval(interval);
	}

	self.setPlayers = function(p){

		for(var m in meeps){
			meeps[m].px = p[m].px;
		}
	}
}