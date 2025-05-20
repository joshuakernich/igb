window.MilkPlayerHUD = function(n,meep,type){

	let self = this;
	self.$el = $(`
		<milkplayerhud n=${n} type=${type}>
		<milkscore>0</milkscore>
			<milkmeephead>
				<milkmeephat></milkmeephat>
				<milkmeepeye></milkmeepeye>
				<milkmeepeye></milkmeepeye>
			</milkmeephead>
			
		</milkplayerhud>`
	);

	self.redraw = function(){
		self.$el.find('milkscore').text(Math.floor(meep.score));
	}

}

window.MilkHUD = function(meeps){
	let self = this;
	self.$el = $('<milkhud>');

	for(var i=0; i<3; i++) $('<milkhudframe>').appendTo(self.$el);

	let $baseline = $('<milkhudbaseline>').appendTo(self.$el);
	let $stream = $('<milkhudstream>').appendTo($baseline);
	let $timer;
	let huds = [];
	let iTimer = Math.floor(meeps.length/2);
	let type = 'before'
	for(var i=0; i<meeps.length; i++){

		if(i==iTimer){
			$timer = $(`
				<milkhudtimer>60</milkhudtimer>
			`).appendTo($stream);
			type = 'after'
		}

		let hud = new MilkPlayerHUD(i,meeps[i],type);
		hud.$el.appendTo($stream);
		huds[i] = hud;

		
	}


	self.redraw = function(sec){
		 $timer.text(sec);
		for(var h in huds) huds[h].redraw();
	}
}

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

window.MilkMeep = function(n){
	let self = this;
	self.score = 0;
	self.$el = $(`
		<milkmeep n=${n}>
			<milkmeephead>
				<milkmeephat></milkmeephat>
				<milkmeepeye></milkmeepeye>
				<milkmeepeye></milkmeepeye>
			</milkmeephead>
			<milkmeepbody></milkmeepbody>
			<milkmeeplegs></milkmeeplegs>
		</milkmeep>
	`);

	self.$handLeft = $('<milkmeephand>').appendTo(self.$el);
	self.$handRight = $('<milkmeephand>').appendTo(self.$el);
}


window.MilkUdder = function(){
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
		}

		if(tugDelta>0){
			tugging += tugDelta;
		} else {
			tugging -= 5;
		}

		if(tugging<0) tugging = 0;
		if(tugging>100) tugging = 100;

		self.capacity -= tugging/100;

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

		if(self.capacity<100 && bGrowing) self.capacity += 0.05;

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



	if(!MilkGame.didInit){
		MilkGame.didInit = true;

		$("head").append(`
			<style>
				@import url('https://fonts.googleapis.com/css2?family=Playwrite+DK+Loopet:wght@100..400&display=swap');

				milkheader{
					 font-family: "Playwrite DK Loopet", cursive;
					  font-optical-sizing: auto;
					  font-weight: 900;
					  font-style: normal;
					  color: white;
					  position: absolute;
					  left: 50%;
					  top: 30%;
					  
					  transform: translate(-50%, -50%);
					  font-size: 5vw;
					  text-shadow: 0px 5px 1px rgba(0,0,0,0.2);
				}

				milkhud{
					position: absolute;
					top: 0px;
					bottom: 0px;
					left: 0px;
					right: 0px;
					display: block;
					z-index: 100;
					text-align: center;
				}

				milkhudbaseline{
					display: block;
					bottom: 0px;
					position: absolute;
					left: 0px;
					right: 0px;
					text-align: center;
				}

				milkhudstream{
					display: inline-block;
					white-space: nowrap;
					box-shadow: 0px 0px 20px rgba(0,0,0,0.5);
					border-radius: 30px 30px 0px 0px;
					overflow: hidden;
				}

				milkhudframe{
					display: inline-block;
					width: 33.33%;
					height: 100%;
					position: relative;
					overflow: hidden;
				}

				milkhudframe:before{
					content: "";
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
					right: 0px;
					bottom: 0px;
					box-sizing: border-box;
					border: 50px solid black;
					filter: blur(20px);
					opacity: 0.5;
				}

				milkhudframe:after{
					content: "";
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
					right: 0px;
					bottom: 0px;
					box-sizing: border-box;
					border: 50px solid #40B0ED;
				}

				milkplayerhud{
					width: 200px;
					height: 100px;
					
					display: inline-block;
					
					box-sizing: border-box;
					position: relative;
					color: white;
					
					background: #40B0ED;
					border: 20px solid #40B0ED;
					
				}

				

				milkplayerhud milkscore{
					display: block;
					position: absolute;
					color: white;
					right: 0px;
					left: 0px;
					top: 0px;
					
					font-weight: bold;
					
					
					padding: 0px;
					margin: 0px;
					text-align: center;
					
					box-sizing: border-box;
					font-size: 50px;
					line-height: 60px;
					background: red;
					border-radius: 20px;
				}

				milkhudtimer{
					width: 150px;
					height: 100px;
					background: #40B0ED;
					color: #333;
					display: inline-block;
					
					font-size: 70px;
					line-height: 100px;
					box-shadow: 0px 0px 20px rgba(0,0,0,0.2);
					vertical-align: top;
				}


				milkplayerhud milkmeephead{
					position: absolute;
					top: 0px;
					left: auto;
					
					transform: scale(0.6);

				}

				milkplayerhud[type='before'] milkscore{ padding-left:50px; }
				milkplayerhud[type='before'] milkmeephead{ left:-10px; }

				milkplayerhud[type='after'] milkscore{ padding-right:50px; }
				milkplayerhud[type='after'] milkmeephead{ right:-10px; }

				

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
					background-image: url(./proto/img/party/bg-farm.webp);
					background-size: 33.3%;
					background-position: center 100px;
					background-repeat: repeat-x;

					
				}

				milkbg:after{
					content:"";
					position: absolute;
					top: 0px;
					left: 0px;
					bottom: 0px;
					right: 0px;
					background-color: #30A6DC;
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
	audio.add('music','./proto/audio/milk-music.mp3',0.3,true,true);

	const FPS = 50;
	const GRAB = W/20;  //can grab a teat within 10% of screen width
	const PLAYERCOUNT = 4;

	let self = this;
	self.$el = $('<igb>').css('background','none');

	let $game = $('<milkgame>').appendTo(self.$el);
	let $bg = $('<milkbg>').appendTo($game);
	let sea = new MilkSea();

	let $header = $('<milkheader>').appendTo(self.$el).text('Milkers');
	const COLORS = ['red','blue','green','purple','orange','yellow'];

	let meeps = [];
	for(var i=0; i<PLAYERCOUNT; i++){
		meeps[i] = new MilkMeep(i,COLORS[i]);
		meeps[i].$el.appendTo($game).css({bottom:'0px'});
		meeps[i].fx = meeps[i].fy = meeps[i].fz = 0.5;
		meeps[i].wall = 1;
	}

	let hud = new MilkHUD(meeps);
	hud.$el.appendTo($game)

	let udders = [];
	for(var i=0; i<3; i++){
		udders[i] = new MilkUdder();
		udders[i].x = W*(i+.5);
		udders[i].$el.appendTo($game).css({left:udders[i].x });
	}

	sea.$el.appendTo($game);

	//$('<h1>TAP A WALL<br>TO MILK OVER YONDER</h1>').appendTo($game);

	let isMilkingLive = false;
	let scale = 1;
	function step(){
		resize();

		for(var m in meeps ){

			if(meeps[m].wall == 0) meeps[m].x = W*meeps[m].fz;
			if(meeps[m].wall == 1) meeps[m].x = W + W*meeps[m].fx;
			if(meeps[m].wall == 2) meeps[m].x = W*3 - W*meeps[m].fz;

			
			meeps[m].$el.css({
				left:meeps[m].x,
				height:(1-meeps[m].fy)*H,
			});

			//meeps[m].anim = [{h:(1-meeps[m].fy)*H, wBody:100, wHead:150, hHead:200, wLeg:15, wArm:0, hBody:150}];

			let dir = 1;
			let minx = GRAB;
			let teatGrab = undefined;

			for(var u in udders){
				for(var t in udders[u].teats){
					let teat = udders[u].teats[t];
					

					let dx = (udders[u].x + teat.x) - meeps[m].x;

					if(Math.abs(dx)<minx && isMilkingLive){
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
				meeps[m].$handLeft.css({left:teatGrab.ox, top:'35%'});
				meeps[m].$handRight.css({left:teatGrab.ox + dir*90, top:'30%'});
				teatGrab.tug = (meeps[m].fy - meeps[m].teatGrabAtY) * H/2;
				teatGrab.isHeldBy = meeps[m];

				

			} else {
				//let go
				meeps[m].teatGrabAtY = undefined;
				meeps[m].$handLeft.css({left:-90, top:'60%'});
				meeps[m].$handRight.css({left:90, top:'60%'});
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
			}	
		}

		

		let timeNow = new Date().getTime();
		let timeElapsed = timeNow-timeStart;
		if(timeStart==0) timeElapsed = 0;
		let sec = SECONDS - Math.floor(timeElapsed/1000);

		if(sec<=0){
			sec = 0;
			if(!isComplete) doOutro();
		}

		hud.redraw(sec);
		sea.redraw();
	}

	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	function doIntro(){
		resize();
		for(var u in udders) udders[u].$el.css({'top':'-'+H+'px'}).delay(5000+i*100).animate({'top':'0px'},1000).animate({'top':'-20px'}).animate({'top':'0px'},1000);
		$header.delay(4000).animate({top:'52%'}).animate({top:'-20%'});
		//hud.$el.css({bottom:'-200px'}).delay(5000).animate({bottom:'0px'});

		
		setInterval(step,1000/FPS);
		setTimeout( begin, 6000 );

	}


	let isComplete = false;
	function doOutro(){
		isMilkingLive = false;
		isComplete = true;
		$header.text('Time Up!').animate({top:'30%'}).delay(2500).animate({top:'-30%'});

		let $score = $('<milkscoreboard>').appendTo(self.$el).css({top:'120%'}).delay(3000).animate({top:'50%'});

		for(var m in meeps){
			meeps[m].betterThanX = 0;
			for(var n in meeps){
				if(meeps[m].score > meeps[n].score) meeps[m].betterThanX ++;
			}
		}

		for(var m in meeps){
			let $scoreline = $(`<milkmeepscoreboard>
					<milkscorename style='color:${COLORS[m]}'>${COLORS[m]} PLAYER</milkscorename>
					<milkscorescore>${Math.floor(meeps[m].score)}</milkscorescore>
					<milkscorescore>+ ${(meeps[m].betterThanX+1)*10}</milkscorescore>
				</milkmeepscoreboard>`).appendTo($score);

			$scoreline.find('milkscorescore:last-of-type').css({opacity:0,left:-20}).delay(4000 + m*300).animate({opacity:1,left:10},300).animate({opacity:1,left:0},200);
		}
	}

	let timeStart = 0;
	function begin(){
		timeStart = new Date().getTime();
		isMilkingLive = true;
	}

	doIntro();
	

	$(document).on('mousemove',function(e){
		let o = $game.offset();
		let x = (e.pageX - o.left)/scale/W;
		let y = (e.pageY - o.top)/scale/H;
		
		if(x<1) meeps[0].fz = x;
		else if(x>2) meeps[0].fz = (1-x%1);
		else meeps[0].fx = x%1;

		meeps[0].fy = y;
	})

	$(document).on('click',function(e){
		let o = $game.offset();
		let x = (e.pageX - o.left)/scale/W;
		let wall = Math.floor(x);
		meeps[0].wall = wall;

		audio.play('music');
	});

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].fx = p[m].px/100;
			meeps[m].fz = p[m].pz/100;
			meeps[m].fy = p[m].py/100;
		}
	}
}