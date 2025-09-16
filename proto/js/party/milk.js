window.MilkSea = function(){
	let self = this;
	self.$el = $(`
		<milksea>
			<svg viewBox='0 0 100 100' preserveAspectRatio="none">
				<path fill='rgba(0,0,0,0.5)' stroke='none'></path>
				<path fill='white' stroke='none'></path>
			</svg>
		</milksea>
	`);

	let $path = self.$el.find('path');

	self.milk = 0;

	const SEG = 100;
	let n = 0;
	self.redraw = function(){

		let fill = self.milk/2000;
		let wibble = 0.05;
		n += wibble;
		let d = `M 0,100 L 0,${100-fill}`;
		for(var i=0; i<=SEG; i++){
			let amt = (i/SEG);
			d = d + ` L ${i/SEG*100},${100-fill + Math.sin(i+n)}`
		}
		d = d + ' L 100,100';
		$path.attr('d',d);
	}

	self.redraw();
}


window.MilkUdder = function(STAGE){
	const W = 700;
	const H = 200;
	const COUNT = 2;

	let self = this;
	self.$el = $('<milkudder>');

	let $legLeft = $('<milkleg>').appendTo(self.$el);
	let $legRight = $('<milkleg>').appendTo(self.$el);
	$('<milkbody>').appendTo(self.$el);

	self.teats = [];
	for(var i=0; i<COUNT; i++){
		self.teats[i] = new MilkTeat();
		self.teats[i].x = (-W/4) + (W/2)*(i/(COUNT-1));
		self.teats[i].$el.appendTo(self.$el).css('left',self.teats[i].x);
	}

	self.xAnchor = 0;
	self.xOffset = 0;

	let isAnimating = false;

	self.redraw = function(){

		/*if(!isAnimating){
			self.xOffset = -400 + Math.random() * 800;
			$(self).animate({x:self.xAnchor + self.xOffset},{
				duration:3500 + Math.random() * 1000,
				complete:function(){ isAnimating=false; },
			});
			isAnimating = true;
		}*/

		self.$el.css({left:self.x+'px'});
	}

	self.initEntry = function(){
		self.$el.css({
			top: '-1000px',
		}).animate({
			top: '0px',
		},{
			duration: 300,
			easing: 'linear'
		}).animate({
			top: '40px',
		},200).animate({
			top: '0px',
		},300);

		$legLeft.delay(300).animate({
			top:'-40px'
		},200).animate({
			top:'0px'
		},300);

		$legRight.delay(300).animate({
			top:'-40px'
		},200).animate({
			top:'0px'
		},300);
	}

	self.initExit = function(){
		self.$el.animate({
			top: '40px',
		},500).delay(500).animate({
			top: '0px',
		},100).animate({
			top: '-1000px',
			left: '+=100px',
		},300);

		$legLeft.animate({
			top:'-40px'
		},500).delay(500).animate({
			top:'0px'
		},100);

		$legRight.animate({
			top:'-40px'
		},500).delay(500).animate({
			top:'0px'
		},100);
	}
}

window.MilkTeat = function(){

	const SEG = 20;
	const MAX_TUG = 3;


	let self = this;
	self.ox = 10;
	self.tug = 0;
	self.$el = $('<milkteat>');

	self.milking = 0;
	self.countTug = Math.ceil( Math.random() * MAX_TUG );
	self.capacity = self.countTug/MAX_TUG;
	self.throbbing = 0;

	self.flow = 0;
	

	let $stream = $('<milkstream>').appendTo(self.$el);
	let $milk = $('<milk>').appendTo($stream);
	

	let $svg = $(`<svg preserveAspectRatio="none" viewBox='-50 0 100 110'>
		<linearGradient id="nipfull" x1="0%" y1="50%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="pink"/>
			<stop offset="100%" stop-color="red"/>
		</linearGradient>
		<linearGradient id="niphalf" x1="0%" y1="50%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="pink"/>
			<stop offset="100%" stop-color="#ff5555"/>
		</linearGradient>
		<linearGradient id="nipempty" x1="0%" y1="50%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="pink"/>
			<stop offset="100%" stop-color="pink"/>
		</linearGradient>
		<path fill='transparent' stroke='url(#nipfull)' stroke-width='20' stroke-linecap='round'></path>
	</svg>`).appendTo(self.$el);
	let $path = $svg.find('path');

	let $alert = $('<milkalert>').appendTo(self.$el);

	let $drops = [];
	for(var i=0; i<self.countTug; i++){
		$drops[i] = $('<milkdrop>').appendTo(self.$el);
	}

	let len = 100;

	let n = Math.floor( Math.random()*SEG );

	let audio = new AudioContext();
	audio.add('squirt','./proto/audio/milk-squirt.mp3',0.3,false);
	audio.add('pour','./proto/audio/milk-pour.mp3',0.3,false);

	let tugDelta = 0;
	let tugWas = 0;
	let tugging = 0;

	let isUntugged = true;

	self.step = function(){
		tugDelta = Math.max(0,self.tug - tugWas); 
		
		if(!self.isHeldBy){
			self.tug *= 0.95;
			self.ox *= 0.95;
			tugDelta = 0;
		} else if(self.tug < tugWas){
			isUntugged = true;
		}

		if(tugDelta>0){
			tugging += tugDelta;
		} else {
			tugging -= 5;
		}

		if(tugging<0) tugging = 0;
		if(tugging>15 && self.countTug && isUntugged && tugDelta>0 && !self.markedForRemoval){
			//self.isActive = false;
			//coolDown = 25;
			//tugging = 100;
			self.countTug--;
			isUntugged = false;

			self.isHeldBy.score++;
			self.isHeldBy.$score.stop(false,false).css({opacity:1}).delay(200).animate({opacity:0});

			$drops[self.countTug].hide();

			audio.play('squirt',true);
			audio.play('pour',true);

			$(self).stop(false,false).animate({flow:1},200).animate({flow:0},500);
		}

		self.milking = tugging;

		tugWas = self.tug;

	}

	self.redraw = function(){
		let wibble = 0.05;
		n += wibble;

		let d = 'M 0,0 '
		let px;
		for(var i=0; i<SEG; i++){
			let amt = (i/SEG);
			px = (Math.sin(i/2 + n)*2*amt +self.ox*amt);
			d = d + ' L '+px+','+amt*100+' ';
		}
		$path.attr('d',d);
		
		let thicc = self.countTug/MAX_TUG;
		$path.attr('stroke-width',12 + thicc*10-self.tug*0.01);

		let level = thicc > 0.7 ? 'full' : ( thicc < 0.4 ? 'empty' : 'half' );
		$path.attr('stroke',`url(#nip${level})`);
		$svg.css({height:500 + self.tug+'px'});

		$stream.css({
			top:420 + self.tug+'px',
			left:px*8,
			transform:'rotate('+(-px*1.5)+'deg)',
		})

		let size = self.flow * 300;

		$milk.css({
			'border-left-width': size+'px',
			'border-right-width': size+'px',
			'left': -size+'px',
		})

		audio.setVolume('squirt',self.flow * 0.3);
		audio.setVolume('pour',self.flow * 0.3);

		//$alert.attr('active',self.countTug>0?'true':'false');
	}

	self.fini = function() {
		// body...
		$(self).stop(false,false);
		self.flow = 0;
		self.redraw();

		audio.stop('squirt');
		audio.stop('pour');
	}

	self.redraw();
}

window.MilkGame = function(){

	const ROUNDS = [
		undefined,
		undefined,
		[{time:30,cohorts:[[0,1]],countUdder:1},{time:60,cohorts:[[0,1]],countUdder:2}],
		[{time:30,cohorts:[[0,1],[1,2],[0,2]],countUdder:1},{time:45,cohorts:[[0,1],[1,2],[0,2]],countUdder:2}],
		[{time:30,cohorts:[[0,1],[2,3]],countUdder:1},{time:30,cohorts:[[0,1],[2,3]],countUdder:2}],
		[{time:30,cohorts:[[0,1],[2,3],[4,0],[1,2],[3,4]],countUdder:2}],
		[{time:30,cohorts:[[0,1],[2,3],[4,5]],countUdder:1},{time:30,cohorts:[[0,1],[2,3],[4,5]],countUdder:2}],
	]

	const SECONDS = 30;
	const W = 1600;
	const H = 1000;
	const UDDER = 700;
	const TEAT = 500;
	const MEEP = 100;
	const DROP = 50;

	const FPS = 50;
	const GRAB = W/20;  //can grab a teat within 10% of screen width
	const PLAYERCOUNT = 6;

	if(!MilkGame.didInit){
		MilkGame.didInit = true;

		$("head").append(`
			<style>

				milkdrop{
					position: absolute;
					display: block;
					width: 0px;
					height: 0px;
					z-index: 1;
					top: 0px;
					left: 0px;

					transform: scale(0.6, 0.8);
				}

				milkdrop:before{
					content:"";
					width: ${DROP}px;
					height: ${DROP}px;
					border-radius: 100%;
					left: ${-DROP/2}px;
					top: ${-DROP/2}px;
					position: absolute;
					display: block;
					background: white;
					box-shadow: 0px 2px 0px black;				
				}

				milkdrop:after{
					content:"";
					width: ${DROP*0.6}px;
					height: ${DROP*0.6}px;
					left: ${-DROP*0.3}px;
					top: ${-DROP*0.55}px;
					transform: rotate(45deg);
					background: white;
					position: absolute;
					display: block;	
				}

				milkdrop:nth-of-type(1){
					top: 50px;
					z-index: 4;
				}

				milkdrop:nth-of-type(2){
					top: 110px;
					z-index: 3;
				}

				milkdrop:nth-of-type(3){
					top: 170px;
					z-index: 2;
				}
			

				milkmeep{
					display:block;
					width: ${MEEP}px;
					height: ${H/2}px;
					position: absolute;	
				}

				milkstream{
					position: absolute;
					display: block;
					width: 0px;
					height: 200px;
					 background: white;
					 top: 0px;
					 left: 0px;
				}

			

				milk{
					display: block;
				 	width: 0; 
					  height: 0; 
					  border-left: 20px solid transparent;
					  border-right: 20px solid transparent;
					  border-bottom: ${H}px solid white;
					  position: absolute;
					  left: -20px;
					  top: 0px;
				}



				milkleg{
					background: #333;
					position: absolute;
					top: 0px;
					height: ${H-40}px;
					width: 100px;
					transform: translateX(-50%);
					background: linear-gradient(to bottom, #333, #666);
				}

				milkleg:before{
					content:"";
					display: block;
					position: absolute;
					top: 0px;
					left: -20px;
					right: -20px;
					height: 50%;
					background: linear-gradient( to bottom, #333, #4B4B4B);
					border-radius: 0px 0px 100% 100%;
					transform: rotate(5deg);

				}

				milkleg:after{
					content:"";
					display: block;
					position: absolute;
					bottom: 0px;
					left: -10px;
					right: -60px;
					height: 80px;
					background:  linear-gradient(to top, #111, #666);
					border-radius: 100% 100% 20px 50px;
				}

				milkleg:first-of-type{
					left: ${-UDDER/2 - 120}px;
				}

				milkleg:last-of-type{
					left: ${UDDER/2 + 120}px;
					transform: translateX(-50%) scaleX(-1);
				}

				milkgame{
					display: block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;

				}

				milkgame h1{
					position: absolute;
					top: 0px;
					left: 0px;
					right: 0px;
					color: black;
					font-size: 30px;
					text-align: center;
				}

				milkbg{
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
					bottom: 0px;
					right: 0px;
					background-color: #30A6DC;
					background: url(./proto/img/party/bg-farm.png);
					background-size: 100%;

					
				}

				milkbg:after{
					content:"";
					position: absolute;
					top: 0px;
					left: 0px;
					bottom: 0px;
					right: 0px;
					background: linear-gradient( to top, #236F95, transparent );
					opacity: 0.8;
				}

				milksea{
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
					bottom: 0px;
					right: 0px;
				}

				milksea svg{
					width: 100%;
					height: 100%;
				}

				milkudder{
					display: block;
					position: absolute;
					top: 0px;
				}

				milkudder:after{
					content: "";
					display: block;
					position: absolute;
					top: 100px;
					width: 500px;
					height: 250px;
					left: -250px;
					background: pink;
					border-radius: 50% 50% 100% 100%;

					background:  linear-gradient(to top, pink, pink, #666);
				}

				milkbody{
					position: absolute;
					top: 0px;
					left: -400px;
					width: 800px;
					height: 200px;
					background: #333;
					border-radius: 0px 0px 100% 100%;
				}

				milkteat{
					position: absolute;
					top: 250px;
					left: 0px;
					z-index: 1;
				}

				milkteat svg{
					position: absolute;
					left: ${-TEAT/2}px;
					width: ${TEAT}px;
					height: ${TEAT}px;
				}

				milkalert{
					
					width: 0px;
					height: 0px;
					position: absolute;
					top: -50px;
					left: 0px;
					
					z-index: 1;
					visibility: hidden;
				}

				milkalert[active='true']{
					visibility:visible;
					animation: wobble 0.2s infinite;
				}

				milkalert:before{
					content:"!";
					color: white;
					position: absolute;
					left: -50px;
					top: -50px;
					width: 100px;
					height: 100px;
					display: block;
					background: url(./proto/img/party/icon-alert.webp);
					background-size: 100%;
				}

				milkscore{
					position: absolute;
					display: block;
					bottom: 400px;
					line-height: 100px;
					font-size: 80px;
					color: white;
					left: -100px;
					right: -100px;
					text-align: center;
					opacity: 0;
					z-index: 10;
				}

				milkcowlayer{
					display: block;
					position: absolute;
					inset: 0px;
				}

				@keyframes wobble{
					0%{
						transform: rotate(-7deg);
					}

					50%{
						transform: rotate(7deg);
					}

					100%{
						transform: rotate(-7deg);
					}
				}
			</style>
		`);
	}

	let audio = new AudioContext();
	audio.add('music','./proto/audio/milk-music.mp3',0.3,true);

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<milkgame>').appendTo(self.$el);
	let $bg = $('<milkbg>').appendTo($game);
	let $blur = $('<blurlayer>').appendTo($game);
	let $cows = $('<milkcowlayer>').appendTo($game);
	let sea = new MilkSea();

	//let $header = $('<milkheader>').appendTo(self.$el).text('Milkers');
	const COLORS = ['red','blue','green','purple','orange','yellow'];

	let meeps = [];
	let timeout;
	

	let hud = new PartyHUD();
	hud.$el.appendTo($game);
	

	let udders = [];
	/*for(var i=0; i<3; i++){
		udders[i] = new MilkUdder();
		udders[i].x = udders[i].xAnchor = W*(i+.5);
		udders[i].$el.appendTo($game).css({left:udders[i].x });
	}*/

	sea.$el.appendTo($game);

	//$('<h1>TAP A WALL<br>TO MILK OVER YONDER</h1>').appendTo($game);

	let isMilkingLive = false;
	let scale = 1;
	let nStep = 0;
	function step(){
		resize();

		nStep++;

		for(var m in meeps ){

			if(!meeps[m].isActive) continue;

			if(meeps[m].wall == 0) meeps[m].x = W*meeps[m].fz;
			if(meeps[m].wall == 1) meeps[m].x = W + W*meeps[m].fx;
			if(meeps[m].wall == 2) meeps[m].x = W*3 - W*meeps[m].fz;

			let h = (1-meeps[m].fy)*H;

			meeps[m].setHeight(h);
			meeps[m].$score.css({bottom:h+50});
			
			meeps[m].$el.css({
				left:meeps[m].x,
				//height:(1-meeps[m].fy)*H,
			});

			//meeps[m].anim = [{h:(1-meeps[m].fy)*H, wBody:100, wHead:150, hHead:200, wLeg:15, wArm:0, hBody:150}];

			let dir = 1;
			let minx = GRAB;
			let teatGrab = undefined;

			for(var u in udders){

				if(!udders[u]) continue;

				for(var t in udders[u].teats){
					let teat = udders[u].teats[t];
					
					let dx = (udders[u].x + teat.x) - meeps[m].x;

					if(Math.abs(dx)<minx && isMilkingLive && !teat.isHeldBy){
						dir = dx>0?1:-1;
						minx = Math.abs(dx);
						teatGrab = teat;
					}
				}
			}

			if(teatGrab){
				//grab on
				if(meeps[m].teatGrabAtY == undefined) meeps[m].teatGrabAtY = meeps[m].fy;
				teatGrab.ox = (GRAB-minx)*dir*0.1;
				meeps[m].$handLeft.css({left:teatGrab.ox, top:'30%'});
				meeps[m].$handRight.css({left:teatGrab.ox + dir*90, top:'25%'});
				teatGrab.tug = (meeps[m].fy - meeps[m].teatGrabAtY) * H/2;
				teatGrab.isHeldBy = meeps[m];

				

			} else {
				//let go
				meeps[m].teatGrabAtY = undefined;
				meeps[m].$handLeft.css({left:-90, top:'300px'});
				meeps[m].$handRight.css({left:90, top:'300px'});
			}

		}

		for(let u in udders){

			if(!udders[u]) continue;

			let isComplete = true;

			for(var t in udders[u].teats){
				
				udders[u].teats[t].step(isMilkingLive);
				
				if(udders[u].teats[t].isHeldBy){
					//sea.milk += udders[u].teats[t].milking;
					//udders[u].teats[t].isHeldBy.score += udders[u].teats[t].milking/1000;
					udders[u].teats[t].isHeldBy = undefined;
				}

				udders[u].teats[t].redraw(isMilkingLive);

				if(udders[u].teats[t].countTug) isComplete = false;

				//udders[u].$el.css({'top':'-'+H+'px'})
				//udders[u].$el.css({'left':Math.cos(nStep*0.01)*W});
			}

			udders[u].redraw();	

			if(isComplete && !udders[u].markedForRemoval){
				udders[u].markedForRemoval = true;
				
				setTimeout(function(){
					udders[u].initExit();
					for(let t in udders[u].teats)  udders[u].teats[t].fini();
					udders[u] = undefined;
				},1000);

				timeout = setTimeout(spawnUdder,3000);
			}
		}


		hud.updatePlayers(meeps);
		sea.redraw();
	}

	let iPlayer = -1;
	function initGame(PLAYERCOUNT){
		

		for(var i=0; i<PLAYERCOUNT; i++){
			meeps[i] = new PartyMeep(i,COLORS[i]);
			meeps[i].$shadow.hide();
			meeps[i].$el.appendTo($game).css({bottom:'50px'}).hide();
			meeps[i].fx = meeps[i].fy = meeps[i].fz = 0.5;
			meeps[i].wall = 1;
			meeps[i].isActive = false;
			meeps[i].score = 0;
			meeps[i].$score = $('<milkscore>').appendTo(meeps[i].$el).text('+1');
		}

		setTimeout(initTutorial,1000);
	}

	const PLAYER_TIME = 15000;
	

	function initTutorial(){

		hud.initTutorial(
			'Milkers',
			{x:1.38, y:0.5, msg:'Align your avatar<br>with a teat', icon:'align'},
			{x:1.75, y:0.5, msg:'Squat up and down<br>to milk', icon:'up-down'},
			{x:0.75, y:0.5, msg:'Touch any wall<br>to switch walls', icon:'touch'},
		);

		for(var i=0; i<3; i++){
			udders[i] = new MilkUdder();
			udders[i].x = W*(i+ 0.5);
			udders[i].$el.appendTo($cows).css({left:udders[i].x });
			udders[i].initEntry();
		}

		for(var m in meeps){
			meeps[m].$el.show();
			meeps[m].isActive = true;
		}

		isMilkingLive = true;

		hud.initTimer(30,finiTutorial);
	}

	function finiTutorial(){

		$blur.hide();

		hud.finiTimer();
		hud.finiTutorial();

		isMilkingLive = false;

		for(var u in udders){
			if(udders[u]) udders[u].$el.remove();
			udders[u] = undefined;
		}

		for(var m in meeps){
			meeps[m].score = 0;
			meeps[m].$el.hide();
			meeps[m].isActive = false;
		}

		setTimeout(function(){
			hud.initPlayers(meeps);
		},2000);

		setTimeout(initNextCohort,3000);
	}

	let iRound = 0;
	let iCohort = -1;

	function initNextCohort(){

		iCohort++;
		if(!ROUNDS[meeps.length][iRound].cohorts[iCohort]){
			iCohort = 0;
			iRound++;
		}
		

		if(!ROUNDS[meeps.length][iRound]){
			finiGame();
		} else {

			let delay = 1000;

			if(iCohort == 0){
				hud.initRound(iRound,ROUNDS[meeps.length].length);
				audio.play('music',true, ((iRound == ROUNDS[meeps.length].length-1)?2:1));
				setTimeout(hud.finiBanner,delay+=2000);
			}
		

			setTimeout(function(){

				let cohort = ROUNDS[meeps.length][iRound].cohorts[iCohort];

				for(var c in cohort){
					let m = cohort[c];
					meeps[m].wall = 1;
					meeps[m].$el.show();
					meeps[m].isActive = true;
				}

				hud.summonPlayers(cohort);
			},delay+=2000);

			setTimeout(function(){
				hud.finiBanner();
			},delay+=2000);

			setTimeout(function(){
				isMilkingLive = true;
				hud.initTimer(ROUNDS[meeps.length][iRound].time,finiCohort)
				for(var i=0; i<ROUNDS[meeps.length][iRound].countUdder; i++){
					setTimeout(spawnUdder,1000 + 3000 * i);
				}
			},delay+=2000);
		}

		
	}	

	function finiCohort(){

		hud.finiTimer();

		for(var u in udders){
			if(udders[u]) udders[u].initExit();
			udders[u] = undefined;
		}

		for(var m in meeps){
			meeps[m].$el.hide();
			meeps[m].isActive = false;
		}

		setTimeout(initNextCohort,2000);
	}


	function spawnUdder(){
		let nWall = 1;
		if(udders[nWall]){
			nWall = Math.random()>0.5?0:2;
			if(udders[nWall]) nWall = nWall==0?2:0;
		}
		udders[nWall] = new MilkUdder();
		udders[nWall].x = W*(nWall+ 0.4 + Math.random() * 0.2);
		udders[nWall].$el.appendTo($cows).css({left:udders[nWall].x });
		udders[nWall].initEntry();
	}

	function finiGame() {

		let scores = [];
		for(var m in meeps) scores[m] = meeps[m].score;
		hud.showFinalScores(scores,window.scoresToRewards(scores));

		setTimeout(function(){
			self.fini();
			window.doPartyGameComplete();
		},5000);
		
	}

	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	$game.on('click',function(e){
		let o = $game.offset();
		let x = (e.pageX - o.left)/scale/W;
		let wall = Math.floor(x);

		let min = 1;
		let nMeep = 0;
		for(var m in meeps){
			if(meeps[m].walls && meeps[m].walls[wall].dist < min){
				min = meeps[m].walls[wall].dist;
				nMeep = m;
			}
		}

		meeps[nMeep].wall = wall;
	});

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].fx = p[m].px;
			meeps[m].fz = p[m].pz;
			meeps[m].fy = Math.min(0.75, p[m].py + 0.2);
			if( p[m].wallChange ){
				meeps[m].wallChange = p[m].wallChange;
				p[m].wallChange = undefined;
			}
			meeps[m].walls = p[m].walls;
		}
	}

	let interval;
	self.init = function(){
		interval = setInterval(step,1000/FPS);
	}
	
	self.fini = function(){
		hud.fini();
		clearInterval(interval);
		audio.stop('music');
	}
	
	self.init();
	hud.initPlayerCount(initGame);
}