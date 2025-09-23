window.ClawChaos3DGame = function(countInit){
	
	const W = 1600;
	const H = 1000;
	const PLATFORM = 1400;
	const FPS = 50;
	const CLAW = 200;
	const ALTITUDE = 400;

	function Claw3DMeep(n){
		let self = this;
		self.$el = $('<claw3Dmeep>');

		let meep = new PartyMeep(n);
		meep.$el.appendTo(self.$el).css({
			'transform-style':'preserve-3d',
			'transform-origin':'bottom center',
			'transform':'rotateX(-90deg)',
		})

		self.ax = self.ay = 0;
		self.px = self.py = 0;
		self.altitude = 0;

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

				claw3Dclaw, claw3Dmeep{
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
					left: ${-CLAW}px;
					top: ${-CLAW}px;
					background: black;
					opacity: 0.3;
					border-radius: 100%;
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

	let meeps = [];
	function initGame(count){
		for(var i=0; i<count; i++){
			meeps[i] = new Claw3DMeep(i);
			meeps[i].$el.appendTo($platform);

			meeps[i].ax = Math.random();
			meeps[i].ay = Math.random();
			meeps[i].isActive = false;
			
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

		//for(var m in meeps) meeps[m].step();
		for(var m in meeps) meeps[m].redraw();

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
			for(var m in meeps){
				if(meeps[m] != claw.meep){
					let dx = meeps[m].ax - claw.meep.ax;
					let dy = meeps[m].ay - claw.meep.ay;
					let d = Math.sqrt(dx*dx+dy*dy);
					if(d<0.1){
						claw.grabbed = meeps[m];
						claw.grabbed.initGrabbed();
					}
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
			px:0.5,
			py:0.5,
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