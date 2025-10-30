window.PopcornGame = function( playersMeta ){
	const W = 1600;
	const H = 1000;
	const FPS = 50;

	const FIRE = 300;
	const PANPX = 0.1;
	const PAN = W*PANPX;
	const KERNEL = 20;
	const POPPED = 40;
	const FLOOR = 120;

	const GRAVITY = 0.02/FPS;
	const FPPOP = FPS*2;

	const TIME = 120;



	const PATTERN = [
		{time:3,wall:0,ax:0.8},
		{time:6,wall:0,ax:0.8},
		{time:3,wall:0,ax:0.8},
	]

	const ROUNDS = [
		undefined,
		undefined,
		[{time:60,cohorts:[[0,1]],timeSpawn:3},{time:60,cohorts:[[0,1]],timeSpawn:2}],
		[{time:45,cohorts:[[0,1],[1,2],[0,2]],timeSpawn:3},{time:45,cohorts:[[0,1],[1,2],[0,2]],timeSpawn:2}],
		[{time:45,cohorts:[[0,1],[2,3]],timeSpawn:3},{time:45,cohorts:[[0,1],[2,3]],timeSpawn:2}],
		[{time:45,cohorts:[[0,1],[2,3],[4,0],[1,2],[3,4]],timeSpawn:2.5}],
		[{time:45,cohorts:[[0,1],[2,3],[4,5]],timeSpawn:3},{time:45,cohorts:[[0,1],[2,3],[4,5]],timeSpawn:2}],
	]

	let audio = new AudioPlayer();
	audio.add('music','./proto/audio/party/music-run.mp3',0.3,true);
    audio.add('notify-a','./proto/audio/party/sfx-notify-a.mp3',0.15);
    audio.add('notify-b','./proto/audio/party/sfx-notify-b.mp3',0.1);
    audio.add('notify-c','./proto/audio/party/sfx-notify-c.mp3',0.1);
    audio.add('pop','./proto/audio/party/sfx-popcorn.mp3',0.5);
    audio.add('kernel','./proto/audio/party/sfx-kernel.mp3',0.3);
    audio.add('score','./proto/audio/party/sfx-pickup.mp3',0.1);

	const PopcornKernel = function(){
		let self = this;
		self.$el = $('<popcornkernel>');
		self.px = 0.5;
		self.py = 0;
		self.sy = 0;
		self.sx = -0.0005*Math.random()*0.001;
		self.wall = 0;
		self.r = 0;
		self.delay = 0;
		self.offsetY = -10 + Math.random() * 20;
		self.inPan = false;
		self.isDead = false;
		self.isPopped = false;
		self.heat = 0;
		self.bounce = 0;

		let $sprite = $('<popcornkernelsprite>').appendTo(self.$el);

		let nStep = 0;
		self.step = function(){

			if(self.inPan){
				//handled by the meep
			} else {
				self.delay--;

				if(self.delay<=0){

					self.sy += GRAVITY/2;
					self.px += self.sx;
					self.py += self.sy;

					self.r += self.sx;

					if(self.py>1){
						self.py = 1;
						self.sy = -Math.abs(self.sy) * 0.2;
						self.sx = self.sx * 0.5;

						self.bounce++;
						if(self.bounce>5) self.isDead = true;
					}
				}
			}
		}

		self.pop = function(){
			self.isPopped = true;
			self.inPan = false;
			self.sy = -0.015 + Math.random() * 0.01;
			self.sx = -0.001 + Math.random() * 0.002;
			$sprite.addClass('popped').css({
				'background':'',
			})

			audio.play('pop',true);
		}

		self.redraw = function(){

			let px = self.px;
			self.$el.css({
				left: self.wall*W + px * W + 'px',
				bottom: self.offsetY + FLOOR + H - self.py*H + 'px',
				transform: 'rotate('+(self.r*100)+'rad)',
			});

			if(!self.isPopped){
				let hot = self.heat/FPPOP;
				$sprite.css({
					'background':`linear-gradient(to bottom, white, rgb(${255},${255*(1-hot)},${0}))`
				})
			}
		}
	}

	const PopcornFire = function(){
		let self = this;
		self.$el = $('<popcornfire>');
		self.px = 0.5;
		self.wall = 0;

		$('<popcornshadow>').appendTo(self.$el);
		let $sprite = $('<popcornsprite>').appendTo(self.$el);

		let nStep = 0;
		self.step = function(){

			nStep++;

			let px = self.px;
			self.$el.css({
				left: self.wall*W + px * W + 'px',
			})

			let nFireStep = Math.floor(nStep/5);

			let nx = nFireStep;

			$sprite.css({
				'background-position-x':-nx*FIRE + 'px',
			})
		}
	}

	const PopcornMeep = function(n){
		let self = this;
		self.$el = $('<popcornmeep>');

		self.px = 0;
		self.py = 0.9;
		self.wall = 0;
		self.kernels = [];
		self.score = 0;

		let meep = new PartyMeep(n);
		meep.$el.appendTo(self.$el);
		meep.$el.css({
			bottom: '0px',
		})

		meep.$handLeft.css({top:'190px'});
		meep.$handRight.css({top:'190px'});

		let $pan = $('<popcornpan>').appendTo(self.$el);

		let $score = $('<popcornscore>').appendTo(self.$el).text('+1').css({opacity:0})

		self.step = function(){

			if(self.wall==0) self.px = self.pz;
			if(self.wall==2) self.px = 1-self.pz;

			let px = self.px;
			self.$el.css({
				left: self.wall*W + px * W + 'px',
			})

			meep.$el.css({
				left: 120 + 'px',
			})

			$pan.css({
				bottom: H - self.py * H + 'px',
			})

			for(var k in self.kernels){
				self.kernels[k].wall = self.wall;
				self.kernels[k].px = self.px + self.kernels[k].panx;
				self.kernels[k].py = self.py;
			}
		}

		self.add = function(kernel){

			kernel.inPan = true;
			self.kernels.push(kernel);
			kernel.panx = -PANPX*0.4 + Math.random()*PANPX*0.8;

			if(kernel.isPopped){
				self.score++;
				$score.stop(true,false).animate({opacity:1,bottom:450},100).animate({opacity:0,bottom:380},300);
				audio.play('score',true);
			} else {
				audio.play('kernel',true);
			}
		}

		self.stepHeat = function(){
			for(var k=0; k<self.kernels.length; k++){
				
				self.kernels[k].heat ++;
				if( self.kernels[k].heat > FPPOP && !self.kernels[k].isPopped ){
					self.kernels[k].pop();
					self.kernels.splice(k,1);
					k--;
				}
			}
		}

		self.hide = function( instant=false ){

			if(instant){
				self.$el.hide();
				self.isActive = false;
				for(var k in self.kernels) self.kernels[k].$el.hide();
			} else {
				self.$el
				.stop(true,false)
				.animate({ opacity:0.7 },100)
				.animate({ opacity:1 },100)
				.animate({ opacity:0.7 },100)
				.animate({ opacity:1 },100)
				.animate({ opacity:0.7 },100)
				.animate({ opacity:1 },100)
				.animate({ opacity:0 },{
					duration:500,
					complete:function(){
						self.$el.hide();
						self.isActive = false;
						for(var k in self.kernels) self.kernels[k].$el.hide();
					}
				});
			}
		}

		self.show = function( instant=false ){
			//self.isActive = true;
			self.$el.show();
			for(var k in self.kernels) self.kernels[k].$el.show();

			if(instant){
				self.isActive = true;
			} else {
				self.$el
				.stop(true,false)
				.css({ opacity:0 })
				.animate({ opacity:0.5 },100)
				.animate({ opacity:0.2 },100)
				.animate({ opacity:0.5 },100)
				.animate({ opacity:0.2 },100)
				.animate({ opacity:0.5 },100)
				.animate({ opacity:0.2 },100)
				.animate({ opacity:1 },{
					duration:500,
					complete:function(){
						self.isActive = true;
					}
				});
			}

			
		}
	}

	if( !PopcornGame.init ){
		PopcornGame.init = true;

		$("head").append(`
			<style>
				popcorngame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background-image: url(./proto/img/party/bg-camping.png);
					background-size: 33.3% 150%;
					background-position: bottom center;
				}

				popcornmeep{
					display: block;
					position: absolute;
					left: 50%;
					bottom: ${FLOOR}px;
				}

				popcornmeep partymeep{
					transition: all 0.5s;
				}

				popcornfire{
					display: block;
					position: absolute;
					left: 50%;
					bottom: ${FLOOR-20}px;
				}

				popcornsprite{
					display: block;
					position: absolute;
					background-image: url(./proto/img/party/sprite-fire.png);
					width: ${FIRE}px;
					height: ${FIRE}px;
					background-size: 1200%;
					left: ${-FIRE/2}px;
					bottom: ${-FIRE/12}px;
				}

				popcornshadow{
					display: block;
					position: absolute;
					width: ${FIRE/2}px;
					height: ${FIRE/2/4}px;
					left: ${-FIRE/4}px;
					bottom: ${-FIRE/2/8}px;
					background: black;
					border-radius: 100%;
					opacity: 0.5;
				}

				popcornpan{
					display: block;
					position: absolute;
					bottom: 100px;
					left: 0px;
					z-index: 1;
				}

				popcornpan:before{
					content: "";
					width: 20px;
					height: 80px;
					background: #999;
					position: absolute;
					transform-origin: bottom center;
					transform: rotate(30deg);
					left: 50%;
					bottom: 50%;
					border-radius: 10px;
				}

				popcornpan:after{
					content: "";
					display: block;
					position: absolute;
					width: ${PAN}px;
					height: ${PAN/3}px;
					background: #999;
					
					border-radius: 100%;
					border: 5px solid white;
					box-sizing: border-box;
					box-shadow: 0px 20px 0px white;
					left: ${-PAN/2}px;
					top: ${-PAN/3/2}px;
				}

			
				popcornkernel{
					display: block;
					position: absolute;
					bottom: ${FLOOR}px;
					z-index: 2;
				}

				popcornkernelsprite{
					display: block;
					position: absolute;
					width: ${KERNEL}px;
					height: ${KERNEL}px;
					border-radius: 100% 0px ${KERNEL/2}px  ${KERNEL/2}px;
					background: yellow;
					left: ${-KERNEL/2}px;
					top: ${-KERNEL/2}px;
					background: linear-gradient(to bottom, white, orange);
				}

				popcornkernelsprite.popped{
					width: ${POPPED}px;
					height: ${POPPED}px;
					left: ${-POPPED/2}px;
					top: ${-POPPED/2}px;
					background: white;
					border-radius: ${POPPED/2}px ${POPPED/2}px ${POPPED/2}px 0px;
					background: radial-gradient( white, white, gray);
				}

				popcornscore{
					display: block;
					position: absolute;

					bottom: ${380}px;
					width: ${400}px;
					left: ${-200 + 125}px;
					font-size: ${100}px;
					text-align: center;
					opacity: 0.5;
					color: white;
					text-align: center;
					
				}

				popocornwarning{
					display: block;
					position: absolute;
					top: 100px;
					transform: translateX(-50%);
					width: 100px;
					height: 100px;
					background: url(./proto/img/party/icon-warning.png);
					background-size: 100%;
				}

				popcornwall{
					display: inline-block;
					width: 33.3%;
					height: 100%;
					position: relative;

					opacity: 0.5;
					
				}

				popcornwall:after{
					content:"";
					display: block;
					position: absolute;
					inset: 50px;
					box-sizing: border-box;
					border: 15px solid white;
					background-color: rgba(255,255,255,0.3);
					background-image: url(./proto/img/party/icon-hand.png);
					background-size: 300px;
					background-position: left center;
					animation: popcornscroll;
					animation-iteration-count: infinite;
					animation-duration: 5s;
					animation-timing-function: linear;
					background-repeat: rep

				}

				popcornwall[occupied='true']{
					opacity: 0;
				}

				@keyframes popcornscroll{
					0%{
						background-position-x: 0px;
						background-position-y: 0px;
					}

					100%{
						background-position-x: 300px;
						background-position-y: 300px;
					}
				}

			</style>
		`)
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<popcorngame>').appendTo(self.$el);

	let $walls = [];
	for(var i=0; i<3; i++){
		$walls[i] = $('<popcornwall>').appendTo($game);
	}

	$game.click(function(e){

		let p = e.pageX/$(document).innerWidth();
		let wall = Math.floor(p*3);
		let meepSwap;
		let min = 1;

		for(var m in meeps){
			if( meeps[m].isActive && meeps[m].walls && meeps[m].walls[wall].dist < min ){
				min = meeps[m].walls[wall].dist;
				meepSwap = meeps[m];
			}
		}
		if(meepSwap) meepSwap.wall = Math.floor(e.offsetX/W);
	});

	let hud = new PartyHUD('#C48264');
	hud.$el.appendTo($game);

	let timeQueue = undefined;
	let intervalQueue = undefined;

	let meeps = [];
	let fires = [];
	let kernels = [];
	function initGame(count){

		timeQueue = TIME/count;

		for(var i=0; i<count; i++){
			meeps[i] = new PopcornMeep(i);
			meeps[i].$el.appendTo($game);
			meeps[i].hide(true);
		}

		for(var i=0; i<3; i++){
			fires[i] = new PopcornFire();
			fires[i].wall = i;
			fires[i].$el.appendTo($game);
		}


		initTutorial();
	}

	let intervalSpawn = undefined;
	let nCohort = -1;
	let nRound = 0;

	function initTutorial(){
		hud.initTutorial('Popcorn Panhandlers',
			{x:1.2,y:0.55,msg:'Move side to side<br> to catch the kernels', icon:'side-to-side'},
			{x:1.5,y:0.45,msg:'Align yourself with a fire<br>to make popcorn', icon:'align'},
			{x:0.75, y:0.5, msg:'Touch any wall<br>to switch walls', icon:'touch'},
		)

		for(var m in meeps){
			meeps[m].$el.show();
			meeps[m].isActive = true;
		}

		intervalSpawn = setInterval(spawnKernels,5000);

		hud.initTimer(30,finiTutorial);
	}

	function finiTutorial(){
		for(var m in meeps){
			meeps[m].$el.hide();
			meeps[m].isActive = false;
		}

		for(var k in kernels){
			kernels[k].$el.hide();
		}

		kernels.length = 0;

		clearInterval(intervalSpawn);

		hud.finiTimer();
		hud.finiTutorial();
		setTimeout(initPlay,1000);
	}

	function initPlay(){
		hud.initPlayers(meeps);
		setTimeout(initNextCohort,2000);
	}

	function initNextCohort(){
		
		nCohort++;
		if(!ROUNDS[meeps.length][nRound].cohorts[nCohort]){
			nCohort = 0;
			nRound++;
		}

		if(!ROUNDS[meeps.length][nRound]){
			finiGame();
			return
		}

		let delay = 0;
		if(nCohort==0){
			audio.play('music');
			hud.initRound(nRound,ROUNDS[meeps.length].length);

			setTimeout(function(){
				hud.finiBanner();
			},delay += 2000);
		}



		let round = ROUNDS[meeps.length][nRound];
		let cohort = round.cohorts[nCohort];

		for(var c in cohort){
			let m = cohort[c];
			meeps[m].$el.show();
			meeps[m].wall = 1;
			meeps[m].isActive = true;
		}

		setTimeout(function(){
			hud.revealTimer(round.time);
			hud.summonPlayers(cohort);
		},delay += 2000);

		setTimeout(function(){
			hud.finiBanner();
		},delay += 2000);

		setTimeout(function(){
			intervalSpawn = setInterval(spawnKernels,round.timeSpawn*1000);
			hud.initTimer(round.time,finiRound);
		},delay += 2000);

		
		
	}

	function finiRound(){

		hud.finiTimer();

		for(var m in meeps){
			meeps[m].$el.hide();
			meeps[m].isActive = false;
		}

		for(var k in kernels){
			kernels[k].$el.hide();
		}

		kernels.length = 0;

		clearInterval(intervalSpawn);

		setTimeout(initNextCohort,2000);
	}

	

	if( playersMeta ) setTimeout( function(){ initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	function spawnKernel(wall,px,delay) {
		
		let kernel = new PopcornKernel();
		kernel.delay = delay;
		kernel.wall = wall;
		kernel.px = px;
		kernel.$el.appendTo($game);

		kernels.push(kernel);
	}

	let audios = ['notify-a','notify-b','notify-c'];
	let queue = [];
	function spawnKernels(){

		if(!queue.length){
			queue = [0,1,2];
			shuffleArray(queue);
		}

		let wall = queue.pop();
		let ax = 0.2 + Math.random() * 0.6;

		audio.play(audios[wall],true);

		let $warning = $('<popocornwarning>').appendTo($game).css({
			left: (wall+ax)*W+'px',
		})
		
		setTimeout(function(){
			for(var i=0; i<5; i++){
				let px = ax - 0.025 + Math.random()*0.05;
				spawnKernel(wall,px,Math.floor(Math.random()*FPS));
			}
		},500);

		setTimeout(function(){
			$warning.hide();
		},1000);
	
		
	}

	function step(){

		for(var f in fires){
			fires[f].step();
		}

		for(var k in kernels){
			kernels[k].step();
		}

		for(var w in $walls) $walls[w].attr('occupied','false');

		for(var m in meeps){
			meeps[m].step();

			if(meeps[m].isActive){

				 $walls[meeps[m].wall].attr('occupied','true');

				for(var k in kernels){
					if(!kernels[k].inPan && kernels[k].wall == meeps[m].wall && kernels[k].sy>0){
						let dx = Math.abs( kernels[k].px - meeps[m].px );
						let dy = Math.abs( kernels[k].py - meeps[m].py );
						if(dy<0.05 && dx<PANPX/2) meeps[m].add( kernels[k] );
					}
				}

				for(var f in fires){
					if(fires[f].wall == meeps[m].wall){
						let dx = Math.abs( fires[f].px - meeps[m].px );
						if(dx<PANPX/2){
							meeps[m].stepHeat();
						}
					}
					
				}
			}
		}

		for(var k=0; k<kernels.length; k++){
			if(kernels[k].isDead){
				kernels[k].$el.remove();
				kernels.splice(k,1);
				k--;
			} else {
				kernels[k].redraw();
			}

		}

		hud.updatePlayers(meeps);
		resize();
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].px = p[m].px;
			meeps[m].pz = p[m].pz;
			meeps[m].walls = p[m].walls;

			//meeps[m].py = p[m].py;
			if( p[m].wall != undefined ){
				meeps[m].wall = p[m].wall;
				p[m].wall = undefined;
			} 
			meeps[m].r =  {W:p[m].rW, X:p[m].rX, Y:p[m].rY, Z:p[m].rZ};
		}
	}

	let interval = setInterval(step,1000/FPS);

	function finiGame(){

		audio.stop('music');
		let scores = [];
		for(var m in meeps) scores[m] = meeps[m].score;

		let rewards = window.scoresToRewards(scores);

		hud.showFinalScores(scores,rewards)
		
		setTimeout(function(){
			self.fini();
			window.doPartyGameComplete(scores);
		},5000)

		
	}

	self.fini = function(){
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	}
}