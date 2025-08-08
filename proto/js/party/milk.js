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
	self.$el = $('<milkudder>').css({
		'width':W,
		'height':H,
	});

	self.teats = [];
	for(var i=0; i<COUNT; i++){
		self.teats[i] = new MilkTeat();
		self.teats[i].x = (-W/4) + (W/2)*(i/(COUNT-1));
		self.teats[i].$el.appendTo(self.$el).css('left',self.teats[i].x);
	}

	self.xAnchor = 0;
	self.xOffset = 0;

	let isAnimating = false;

	self.step = function(){

		if(!isAnimating){
			self.xOffset = -400 + Math.random() * 800;
			$(self).animate({x:self.xAnchor + self.xOffset},{
				duration:3500 + Math.random() * 1000,
				complete:function(){ isAnimating=false; },
			});
			isAnimating = true;
		}

		self.$el.css({left:self.x+'px'});
	}
}

window.MilkTeat = function(){

	const SEG = 20;


	let self = this;
	self.ox = 10;
	self.tug = 0;
	self.$el = $('<milkteat>');

	self.milking = 0;
	self.capacity = Math.random()*100;
	self.throbbing = 0;
	

	let $stream = $('<milkstream>').appendTo(self.$el);
	let $milk = $('<milk>').appendTo($stream);
	

	let $svg = $(`<svg preserveAspectRatio="none" viewBox='-50 0 100 110'>
		<linearGradient id="nipfull" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="pink"/>
			<stop offset="100%" stop-color="red"/>
		</linearGradient>
		<linearGradient id="niphalf" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="pink"/>
			<stop offset="100%" stop-color="#ff5555"/>
		</linearGradient>
		<linearGradient id="nipempty" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="pink"/>
			<stop offset="100%" stop-color="pink"/>
		</linearGradient>
		<path fill='transparent' stroke='url(#nipfull)' stroke-width='20' stroke-linecap='round'></path>
	</svg>`).appendTo(self.$el);
	let $path = $svg.find('path');

	let $alert = $('<milkalert>').appendTo(self.$el);

	let len = 100;

	let n = Math.floor( Math.random()*SEG );

	let audio = new AudioContext();
	audio.add('squirt','./proto/audio/milk-squirt.mp3',1,true);
	audio.add('pour','./proto/audio/milk-pour.mp3',0,true);

	let tugWas = 0;
	let tugging = 0;
	self.redraw = function(bGrowing){
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
		let swelling = self.capacity/100;
		$path.attr('stroke-width',12 + swelling*10-self.tug*0.01);

		let level = swelling > 0.7 ? 'full' : ( swelling < 0.4 ? 'empty' : 'half' );

		$path.attr('stroke',`url(#nip${level})`);
		$svg.css({height:500 + self.tug+'px'});

		$stream.css({
			top:420 + self.tug+'px',
			left:px*8,
			transform:'rotate('+(-px*1.5)+'deg)',
		})

		let tugDelta = Math.max(0,self.tug - tugWas); 
		tugWas = self.tug;

		if(!self.isHeldBy){
			self.tug *= 0.95;
			self.ox *= 0.95;
			tugDelta = 0;
		}

		if(tugging <= 0 && tugDelta > 0){
			audio.play('squirt',true);
			audio.play('pour',true);
		} else if( self.purging ){
			audio.play('squirt',true);
			audio.play('pour',true);
		}

		if(tugDelta>0){
			tugging += tugDelta;
		} else {
			tugging -= 5;
		}

		if(tugging<0) tugging = 0;
		if(tugging>100) tugging = 100;

		if(!self.purging && self.throbbing > 0) self.purging = true;
	
		if(self.purging) tugging = 100;

		self.capacity -= tugging/100;

		if(self.purging && self.capacity<=0) self.purging = false;

		if(self.capacity<0) self.capacity = 0;
		if(self.capacity<10) tugging = 0;


		let volume = tugging/100/3;
		if(volume>1) volume = 1;
		if(volume<0) volume = 0;

		audio.setVolume('squirt',volume);
		audio.setVolume('pour',volume);
		
		let size = (tugging>0)?(30+tugging*2):0;
		$milk.css({
			'border-left-width': size+'px',
			'border-right-width': size+'px',
			'left': -size+'px',
		})

		self.milking = tugging;

		if(self.capacity<100 && bGrowing) self.capacity += 0.1;

		if(self.capacity>=100) self.throbbing ++;
		else self.throbbing = 0;


		$alert.attr('active',self.capacity>90?'true':'false');
	}

	self.redraw();
}

window.MilkGame = function(){

	const SECONDS = 30;
	const W = 1600;
	const H = 1000;
	const UDDER = 700;
	const TEAT = 500;
	const MEEP = 100;

	const FPS = 50;
	const GRAB = W/20;  //can grab a teat within 10% of screen width
	const PLAYERCOUNT = 6;

	if(!MilkGame.didInit){
		MilkGame.didInit = true;

		$("head").append(`
			<style>
			

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

				milkmeephand{
					display:block;
					width: ${MEEP*0.5}px;
					height: ${MEEP*0.7}px;
					transform: translate(-50%, -50%);
					background: white;
					border-radius: ${MEEP/8}px;
					top: 40%;
					position: absolute;
					left: ${-MEEP*0.25}px;
					z-index: 1;
				}

				milkmeephand:last-of-type{
					left: ${MEEP}px;
				}

				milkmeephead{
					display: block;
					height: 120px;
					background: white;
					border-radius: ${MEEP/2}px;
					text-align: center;
					position: relative;
					left: ${-MEEP/2}px;
					padding-top: 30px;
					width: 100px;
				}

				milkmeephat{
					display: block;
					background: red;
					height: 20px;
					border-radius: 5px;
					
				}

				

				milkmeepbody{
					display: block;
					height: 150px;
					background: white;
					margin: 0px 15px;
					border-radius: ${MEEP/4}px;
					left: ${-MEEP/2}px;
					position: relative;
				}

				milkmeeplegs{
					display:block;
					margin: 0px 25px;
					box-sizing: border-box;
					border-left: 15px solid white;
					border-right: 15px solid white;
					height: calc( 100% - 270px );
					left: ${-MEEP/2}px;
					position: relative;
				}

				milkmeepeye{
					display: inline-block;
					width: ${MEEP/6}px;
					height: ${MEEP/6}px;
					border-radius: 100%;
					background: gray;
					margin:15px 5px;
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
					background: linear-gradient( to top, #30A6DC, transparent );
					opacity: 0.5;
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

				milkudder:before{
					content: "";
					display: block;
					position: absolute;
					bottom: -50px;
					width: 100%;
					height: 200%;
					left: -50%;
					background: pink;
					border-radius: 0px 0px 100% 100%;
				}

				milkteat{
					position: absolute;
					top: 90%;
					left: 0px;
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

				milkscoreboard{
					display: block;
					position: absolute;
					left: 50%;
					top: 50%;
					transform: translate(-50%, -50%);
					background: rgba(255,255,255,0.5);
					padding: 1vw;
					border: 0.3vw solid white;
					border-radius: 1vw;
					line-height: 1.5vw;
					font-size: 1vw;
					color: #333;
					backdrop-filter: blur(5px);
				}

				milkmeepscoreboard{
					display: block;
					white-space: nowrap;
				}

				milkscorename{
					display: inline-block;
					width: 5vw;
					text-align: left;
					text-transform:uppercase;
				}

				milkscorescore{
					display: inline-block;
					width: 5vw;
					text-align: right;
					position: relative;
				}

				milkmeep[n='1'] milkmeephat{ background: blue; }
				milkmeep[n='1'] milkmeephat:after{ background: blue; }
				milkplayerhud[n='1'] milkscore{ background: blue; }
				milkplayerhud[n='1'] milkmeephat{ background: blue; }

				milkmeep[n='2'] milkmeephat{ background: limegreen; }
				milkmeep[n='2'] milkmeephat:after{ background: limegreen; }
				milkplayerhud[n='2'] milkscore{ background: limegreen; }
				milkplayerhud[n='2'] milkmeephat{ background: limegreen; }

				milkmeep[n='3'] milkmeephat{ background: #dd00ff; }
				milkmeep[n='3'] milkmeephat:after{ background: #dd00ff; }
				milkplayerhud[n='3'] milkscore{ background: #dd00ff; }
				milkplayerhud[n='3'] milkmeephat{ background: #dd00ff; }

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
	let sea = new MilkSea();

	//let $header = $('<milkheader>').appendTo(self.$el).text('Milkers');
	const COLORS = ['red','blue','green','purple','orange','yellow'];

	let meeps = [];
	

	let hud = new PartyHUD();
	hud.$el.appendTo($game);
	hud.initPlayerCount(initGame);

	let udders = [];
	for(var i=0; i<3; i++){
		udders[i] = new MilkUdder();
		udders[i].x = udders[i].xAnchor = W*(i+.5);
		udders[i].$el.appendTo($game).css({left:udders[i].x });
	}

	sea.$el.appendTo($game);

	//$('<h1>TAP A WALL<br>TO MILK OVER YONDER</h1>').appendTo($game);

	let isMilkingLive = false;
	let scale = 1;
	let nStep = 0;
	function step(){
		resize();

		nStep++;

		for(var m in meeps ){

			if(meeps[m].wall == 0) meeps[m].x = W*meeps[m].fz;
			if(meeps[m].wall == 1) meeps[m].x = W + W*meeps[m].fx;
			if(meeps[m].wall == 2) meeps[m].x = W*3 - W*meeps[m].fz;

			meeps[m].setHeight((1-meeps[m].fy)*H);
			
			meeps[m].$el.css({
				left:meeps[m].x,
				//height:(1-meeps[m].fy)*H,
			});

			//meeps[m].anim = [{h:(1-meeps[m].fy)*H, wBody:100, wHead:150, hHead:200, wLeg:15, wArm:0, hBody:150}];

			let dir = 1;
			let minx = GRAB;
			let teatGrab = undefined;

			for(var u in udders){
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

		for(var u in udders){
			for(var t in udders[u].teats){
				udders[u].teats[t].redraw(isMilkingLive);
				
				if(udders[u].teats[t].isHeldBy){
					sea.milk += udders[u].teats[t].milking;
					udders[u].teats[t].isHeldBy.score += udders[u].teats[t].milking/1000;
					udders[u].teats[t].isHeldBy = undefined;
				}

				udders[u].step();

				//udders[u].$el.css({'top':'-'+H+'px'})
				//udders[u].$el.css({'left':Math.cos(nStep*0.01)*W});
			}	
		}


		sea.redraw();
	}

	function initGame(PLAYERCOUNT){
		audio.play('music');

		for(var i=0; i<PLAYERCOUNT; i++){
			meeps[i] = new PartyMeep(i,COLORS[i]);
			meeps[i].$shadow.hide();
			meeps[i].$el.appendTo($game).css({bottom:'50px'});
			meeps[i].fx = meeps[i].fy = meeps[i].fz = 0.5;
			meeps[i].wall = 1;
		}

		hud.initTimer(60,finiGame);
		isMilkingLive = true;
		//setTimeout(summonNextPlayer,1000);
	}

	let nPlayer = 0;
	function summonNextPlayer(){
		//hud.addPlayer(nPlayer);
	}

	function finiGame() {
		doOutro();
	}

	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}



	let isComplete = false;
	function doOutro(){
		isMilkingLive = false;
		isComplete = true;
		for(var u in udders) udders[u].$el.animate({'top':'-'+H+'px'});
		
		setTimeout(doOutroComplete,1000);
	}

	function doOutroComplete(){
		self.fini();
		window.doPartyGameComplete();
	}

	let bMusic = false;
	function initMusic(){
		bMusic = true;
		audio.play('music');
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

		if(!bMusic) initMusic();
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
}