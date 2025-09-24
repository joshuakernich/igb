window.ClawChaos3DGame = function(countInit){
	
	const W = 1600;
	const H = 1000;
	const PLATFORM = 1400;
	const FPS = 50;
	const CLAW = 200;
	const BALL = 300;
	const ITEM = 300;
	const COIN = 100;
	const ALTITUDE = 400;

	function Claw3DBag(n,coins){
		let self = this;
		let h = 150 + Math.floor(coins/3) * (COIN * 0.4);
		let w = 100 + Math.min(coins,3) * (COIN * 0.7);
		self.$el = $(`<claw3Dbag>`).attr('n',n).css({
			height: h + 'px',
			width: w + 'px',
		})

		for(var i=0; i<coins; i++){
			$('<claw3Dcoin>').appendTo(self.$el).css({
				left: 30 + i%3 * (COIN*0.7) + 'px',
				bottom: -40 + Math.floor(i/3) * COIN*0.4 + 'px',
				'background-position-y':-n*100+'%',
			})
		}

		$('<claw3Dbagfg>').appendTo(self.$el);
		$('<claw3Dbagtie>').appendTo(self.$el);
		$('<claw3Dbagtop>').appendTo(self.$el);

		if(n>-1){
			let head = new PartyMeepHead(n);
			//head.$el.appendTo(self.$el);
			head.$el.css({
				left: '40px',
				top: '85px',
				transform: 'rotate(15deg) scale(1.1)',
				'box-shadow':'none',
				'mix-blend-mode':'overlay',
			})
		}
	}

	function Claw3DItem(n=0,coins=0){
		let self = this;
		self.$el = $('<claw3Ditem>');

		if(Math.random()>0.5) self.$el.css({'transform':'scaleX(-1)'})

		let $shadow = $('<claw3Dshadow>').appendTo(self.$el).css({
			width: ITEM,
			height: ITEM,
		})
		
		let bag = new Claw3DBag(n,coins);
		bag.$el.appendTo(self.$el);

		self.altitude = 0;

		

		self.redraw = function(){
			self.$el.css({
				left:self.px * PLATFORM + 'px',
				top:self.py * PLATFORM + 'px',
			});

			bag.$el.css({
				transform: `rotateX(-90deg) translateY(${-ALTITUDE * self.altitude}px)`,
			})
		}
	}

	function Claw3DMeep(n){
		let self = this;
		self.$el = $('<claw3Dmeep>');

		let meep = new PartyMeep(n);
		meep.$el.appendTo(self.$el).css({
			'transform-style':'preserve-3d',
			'transform-origin':'bottom center',
			'transform':'rotateX(-90deg)',
		})


		// hx & hy are home coordinates (i.e. disabled position)
		// ax & ay are avatar coordinates (i.e. live render)
		// px & py are real player coordinates

		self.hx = self.ax = self.ay = 0;
		self.hy = self.px = self.py = 0;

		self.altitude = 0;
		self.isWalkingAround = true;

		let trajectory =  Math.random() * Math.PI*2;
		self.dx = Math.cos(trajectory);
		self.dy = Math.sin(trajectory);
		self.speed = 0.003;
	
		self.step = function(){
			return;
			if(self.isWalkingAround){
				self.ax += self.dx * self.speed;
				self.ay += self.dy * self.speed;
				if(self.ax > 0.9) self.dx = -Math.abs(self.dx);
				if(self.ay > 0.9) self.dy = -Math.abs(self.dy);
				if(self.ax < 0.1) self.dx = Math.abs(self.dx);
				if(self.ay < 0.1) self.dy = Math.abs(self.dy);
			}
		}

		self.redraw = function(){
			self.$el.css({
				left:self.isActive?self.px:self.ax * PLATFORM + 'px',
				top:self.isActive?self.py:self.ay * PLATFORM + 'px',
			})

			meep.$el.css({
				'transform':`rotateX(-90deg) translateY(${-ALTITUDE*self.altitude}px)`,
			})
		}

		self.initIdle = function(){
			self.isWalkingAround = true;
			meep.$shadow.show();
			meep.toIdle();
		}

		self.initClaw = function(){
			meep.$shadow.hide();
			meep.toSkydiver();
		}

		self.initGrab = function(){
			meep.$handLeft.animate({left:20});
			meep.$handRight.animate({left:-20});
		}

		self.initGrabbed = function(){
			self.isWalkingAround = false;
			meep.$shadow.hide();
			meep.toRagdoll();
		}
	}

	function Claw3DClaw(){
		let self = this;
		self.$el = $('<claw3Dclaw>');

		let $shadow = $('<claw3Dshadow>').appendTo(self.$el);
		let $plane = $('<claw3Dplane>').appendTo(self.$el);
		let $clamps = $('<claw3Dclamps>').appendTo($plane);
		let $clampLeft = $('<claw3Dclamp>').appendTo($clamps);
		let $clampRight = $('<claw3Dclamp>').appendTo($clamps);

		self.altitude = 1;
		self.open = 0;

		self.redraw = function(){
			self.$el.css({
				left:self.px * PLATFORM + 'px',
				top:self.py * PLATFORM + 'px',
			});

			$clamps.css({
				bottom: `${250 + ALTITUDE * self.altitude}px`,
			});

			let deg = 12 + self.open * 28;

			$clampLeft.css({
				'transform':`rotate(${deg}deg)`
			});

			$clampRight.css({
				'transform':`scaleX(-1) rotate(${deg}deg)`
			})
		}
	}

	if( !ClawChaos3DGame.init ){
		ClawChaos3DGame.init = true;

		$("head").append(`
			<style>
				claw3Dgame{
					display: block;
					position: absolute;
					left: 0px;
					top: 0px;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: url(./proto/img/party/bg-village.png);
					background-size: 33.3% 150%;
					background-position: 0% 75%;
					perspective: ${W}px;
				}

				claw3Dplatform{
					display: block;
					position: absolute;
	
					width: ${PLATFORM}px;
					height: ${PLATFORM}px;

					transform: rotateX(80deg);
					transform-origin: bottom center;
					transform-style: preserve-3d;
					
					
					left: ${W*1.5 - PLATFORM/2}px;	
					bottom: 100px;

					background: rgba(0,0,0,0.2);
					border-radius: 100px;
				}

				claw3Dclaw, claw3Dmeep, claw3Ditem{
					display: block;
					position: absolute;
					left: 25%;
					top: 25%;
					transform-style: preserve-3d;
				}

				claw3Dshadow{
					display: block;
					position: absolute;
					width: ${CLAW*2}px;
					height: ${CLAW*2}px;
					left: 0px;
					top: 0px;
					background: black;
					opacity: 0.3;
					border-radius: 100%;
					transform: translate(-50%, -50%);
				}

				claw3Dplane{
					display: block;
					position: absolute;
					width: ${CLAW}px;
					height: ${CLAW*5}px;
					
					transform: rotateX(-90deg);
					transform-style: preserve-3d;
					transform-origin: bottom center;
					left: ${-CLAW/2}px;
					bottom: 0px;
				}

				claw3Dclamps{
					display: block;
					position: absolute;
					bottom: 0px;
					left: 0px;
					width: ${CLAW}px;
					height: ${CLAW}px;
				}

				claw3Dclamps:before{
					content:"";
					display: block;
					position: absolute;
					width: 40px;
					height: 1000px;
					background: #999;
					bottom: ${CLAW}px;
					left: ${CLAW/2 - 20}px;
					margin: auto;
				}

				claw3Dclamps:after{
					content:"";
					display: block;
					position: absolute;
					width: ${CLAW/2}px;
					height: ${CLAW/3}px;
					left: 0px;
					right: 0px;
					top: -5px;
					margin: auto;
					background: white;
					border-radius: ${CLAW/4}px;
				}	

				claw3Dclamp{
					display: block;
					position: absolute;
					width: ${CLAW/2}px;
					height: ${CLAW}px;
					box-sizing: border-box;
					border: 40px solid white;
					border-top-width: 60px;
					border-radius: 100% 0px 0px 100%;
					top: 0px;
					left: 0px;
					border-right: none;
					transform-origin:top right;
				}

				claw3Dclamp:last-of-type{
					transform: scaleX(-1);
				}

				claw3Dball{
					display: block;
					position: absolute;
					width: ${BALL}px;
					height: ${BALL}px;
					border-radius: 100%;
					background: rgba(255,255,255,0.5);
					left: ${-BALL/2}px;
					bottom: 0px;
					transform: rotateX(-90deg);
					transform-style: preserve-3d;
					transform-origin: bottom center;
					overflow: hidden;
				}

				claw3Dball:before{
					content:"";
					display: block;
					position: absolute;
					width: ${BALL}px;
					height: ${BALL*0.8}px;
					top: 0px;
					left: 0px;
					background: red;
					border-radius: 100%;
					opacity: 0.2;
					box-sizing: border-box;
				}

				claw3Dball:after{
					content:"";
					display: block;
					position: absolute;
					width: ${BALL}px;
					height: ${BALL*0.8}px;
					top: 0px;
					left: 0px;
					border-radius: 100%;

					box-sizing: border-box;
					border-bottom: 10px solid red;
				}

				claw3Dbag{
					display: block;
					position: absolute;
					width: ${ITEM}px;
					height: ${ITEM}px;
					background: #222;
					left: ${-ITEM/2}px;
					bottom: 0px;
					transform: rotateX(-90deg);
					transform-style: preserve-3d;
					transform-origin: bottom center;
					box-shadow: inset -10px -10px 25px black;
					border-radius: 100% 100% ${ITEM*0.7}px ${ITEM*0.7}px;
				}

				claw3Dbag[n='0'] claw3Dbagtie { background: var(--n0); }
				claw3Dbag[n='1'] claw3Dbagtie { background: var(--n1); }
				claw3Dbag[n='2'] claw3Dbagtie { background: var(--n2); }
				claw3Dbag[n='3'] claw3Dbagtie { background: var(--n3); }
				claw3Dbag[n='4'] claw3Dbagtie { background: var(--n4); }
				claw3Dbag[n='5'] claw3Dbagtie { background: var(--n5); }

				claw3Dbagfg{
					display: block;
					position: absolute;
					inset: 0px;
					border-radius: 100% 100% ${ITEM*0.7}px ${ITEM*0.7}px;
					background: url(./proto/img/party/texture-hessian-fg.png);
					opacity: 0.8;
				}

				claw3Dbagtie{
					display: block;
					position: absolute;
					width: ${ITEM/3}px;
					height: ${ITEM*0.2}px;
					top: -10px;
					left: 50%;
					background: red;
					border-radius: 100%;
					transform: rotate(20deg);
					box-shadow: inset -10px -10px 15px rgba(0,0,0,0.2);
				}

				claw3Dbagtop{
					display: block;
					position: absolute;
					width: ${ITEM/2}px;
					height: ${ITEM*0.25}px;
					top:  ${-ITEM/3+40}px;
					left: 48%;
					background: #ffe7a8;
					border-radius:  ${ITEM/4}px  ${ITEM/4}px 100% 100%;
					transform: rotate(20deg);
					background: url(./proto/img/party/texture-hessian-fg.png);
					box-shadow: inset -10px -10px 15px rgba(0,0,0,0.2);
				}

				claw3Dbagtop:after{
					content:"";
					position: absolute;
					display: block;
					inset: 10px 15px 30px 15px;
					background: black;
					opacity: 0.5;
					border-radius: 100%;
				}

				claw3Dcoin{
					display: block;
					position: absolute;
					width: ${COIN}px;
					height: ${COIN}px;
					background: url(./proto/img/party/sprite-coin.png);
					background-size: 900%;
					background-position-x: -100%;
					background-position-y: 100%;
					transform: rotate(90deg) translateX(-50%);
				}
		`)
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<claw3Dgame>').appendTo(self.$el);

	let hud = new PartyHUD();
	hud.$el.appendTo($game);

	let $platform = $('<claw3Dplatform>').appendTo($game);

	let claw = new Claw3DClaw();
	claw.$el.appendTo($platform);

	let items = [];
	let meeps = [];
	function initGame(count){
		for(var i=0; i<count; i++){
			meeps[i] = new Claw3DMeep(i);
			meeps[i].$el.appendTo($platform);

			meeps[i].hx = meeps[i].ax = -0.1;
			meeps[i].hy = meeps[i].ay = 0.2 + 0.1 * i;
			meeps[i].isActive = false;

			items[i] = new Claw3DItem(i,5 + Math.floor( Math.random() * 10));
			items[i].px = Math.random();
			items[i].py = Math.random();
			items[i].$el.appendTo($platform);
			
		}

		initNextClaw();
	}

	hud.initPlayerCount(initGame);

	let iClaw = -1;
	self.step = function(){

		if(claw.meep && claw.isTracking){
			claw.px = ( claw.px * claw.chase + claw.meep.px ) / (claw.chase+1);
			claw.py = ( claw.py * claw.chase + claw.meep.py ) / (claw.chase+1);
		}

		if(claw.meep){
			claw.meep.ax = claw.px;
			claw.meep.ay = claw.py;
			claw.meep.altitude = claw.altitude;
		}

		if(claw.grabbed){
			claw.grabbed.altitude = claw.altitude-0.1;
			claw.grabbed.ax = claw.px;
			claw.grabbed.ay = claw.py;
		}

		for(var m in meeps) meeps[m].step();
		for(var m in meeps) meeps[m].redraw();
		for(var i in items) items[i].redraw();

		claw.redraw();

		resize();
	}

	let nPlayer = -1;
	function initNextClaw(){
		nPlayer++;
		initClaw(nPlayer);
	}

	function initClaw(n){
		//iClaw = n;

		meeps[n].isWalkingAround = false;

		$(claw).animate({
			px:meeps[n].ax,
			py:meeps[n].ay,
		}).delay(500).animate({
			altitude:0,
			open:1,
		},500).delay(200).animate({
			open:0,
		},{duration:300,complete:function(){
			meeps[n].initClaw();
			claw.meep = meeps[n];
		}}).delay(500).animate({
			altitude:1,
		},500).animate({
			chase: 50,
		},100).animate({
			chase: 0,
		},{
			start:function(){
				claw.meep = meeps[n];
				claw.isTracking = true;
			},
			duration: 1000,
		})

		hud.initTimer(10,initGrab);
	}

	function initGrab(){

		claw.isTracking = false;
		

		hud.finiTimer();

		$(claw).delay(200).animate({
			altitude:0.1,
		}).delay(500).animate({
			altitude:1,
		})

		setTimeout(function(){
			claw.meep.initGrab();
		},500)

		setTimeout(function(){
			for(var i in items){
			
				let dx = items[i].px - claw.meep.ax;
				let dy = items[i].py - claw.meep.ay;
				let d = Math.sqrt(dx*dx+dy*dy);
				if(d<0.1){
					claw.grabbed = items[i];
					//claw.grabbed.initGrabbed();
				}
				
			}
		},700);

		setTimeout(initRelease,3000);
	}

	function initRelease(){
		let meepGrabbed = claw.grabbed;
		claw.grabbed = undefined;
		$(meepGrabbed).animate({altitude:0},{complete:function(){meepGrabbed.initIdle()}});
		setTimeout(initReset,2000);
	}

	function initReset(){
		$(claw).animate({
			px:claw.meep.hx,
			py:claw.meep.hy,
		}).animate({
			open:1
		},{
			start:finiClaw
		}).delay(500).animate({
			open:0,
		})
	}

	function finiClaw() {
		let meepReset = claw.meep;
		claw.meep = undefined;

		$(meepReset).animate({altitude:0},{complete:function(){meepReset.initIdle()}});
		
		setTimeout(initNextClaw,2000);
	}


	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	self.fini = function(){
		audio.stop('music');
		clearInterval(interval);
	}

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].px = (p[m].px);
			meeps[m].py = (1-p[m].pz);
		}
	}

	let interval = setInterval(self.step,1000/FPS);
}