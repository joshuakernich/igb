window.PopcornGame = function(){
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

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-playroom.mp3',0.3,true);
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

					self.sy += GRAVITY;
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
			self.sy = -0.025 + Math.random() * 0.01;
			self.sx = -0.002 + Math.random() * 0.004;
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

		let $score = $('<popcornscore>').appendTo(self.$el).text(0);

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
				$score.text(self.score).stop(true,false).animate({opacity:1,bottom:450},100).animate({opacity:0.5,bottom:380},100);
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
					box-shadow: 0px 10px 0px white;
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
			</style>
		`)
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<popcorngame>').appendTo(self.$el);

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

		audio.play('music');
		

		//setInterval(spawnKernels,5000);

		initNextPlayer();

		intervalQueue = setInterval(doNextRound,timeQueue*1000);

		hud.initTimer(TIME,finiGame);

		doNextRound();
	}

	function doNextRound(){
		initNextPlayer();
		setTimeout(spawnKernels,timeQueue/5*1*1000);
		setTimeout(spawnKernels,timeQueue/5*2*1000);
		setTimeout(spawnKernels,timeQueue/5*3*1000);
	}

	let nPlayer = -1;
	function initNextPlayer(){
		nPlayer++;
		meeps[(nPlayer-2+meeps.length)%meeps.length].hide();
		meeps[nPlayer%meeps.length].show();

		if(nPlayer>=meeps.length) clearInterval(intervalQueue);
	}

	hud.initPlayerCount(initGame);

	function spawnKernel(wall,px,delay) {
		
		let kernel = new PopcornKernel();
		kernel.delay = delay;
		kernel.wall = wall;
		kernel.px = px;
		kernel.$el.appendTo($game);

		kernels.push(kernel);
	}

	function spawnKernels(){

		let wall = Math.floor( Math.random()*3 );
		let ax = 0.2 + Math.random() * 0.6;
	
		for(var i=0; i<5; i++){
			let px = ax - 0.025 + Math.random()*0.05;
			spawnKernel(wall,px,Math.floor(Math.random()*FPS));
		}
	}

	function step(){

		for(var f in fires){
			fires[f].step();
		}

		for(var k in kernels){
			kernels[k].step();
		}

		for(var m in meeps){
			meeps[m].step();

			if(meeps[m].isActive){

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

		for(var m in meeps){
			meeps[m].show(true);
			meeps[m].wall = 1;
			meeps[m].redraw();
		}

		clearInterval(interval);
		hud.initBanner('Finish!');
		
		setTimeout(function(){
			let scores = [];
			for(var m in meeps) scores[m] = meeps[m].score;
			window.doPartyGameComplete(scores);
			self.fini();
		},3000)

		
	}

	self.fini = function(){
		audio.stop('music');
		clearInterval(interval);
	}
}