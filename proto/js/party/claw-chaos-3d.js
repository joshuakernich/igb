window.ClawChaos3DGame = function( playersMeta ){
	
	const W = 1600;
	const H = 1000;
	const PLATFORM = W;
	const FPS = 50;
	const CLAW = 200;
	const BALL = 300;
	const ITEM = 300;
	const COIN = 100;
	const ALTITUDE = 250;
	const ROUNDS = 2;

	let audio = new AudioPlayer();
	audio.add('music','./proto/audio/party/music-heist.mp3',0.3,true,true);
	audio.add('purse','./proto/audio/party/sfx-purse.mp3',0.3);
	audio.add('correct','./proto/audio/party/sfx-correct.mp3',0.3);
	audio.add('coin','./proto/audio/party/sfx-coin.mp3',0.3);
	audio.add('machine','./proto/audio/party/sfx-machine.mp3',0.3,true,true);
	audio.add('woosh','./proto/audio/party/sfx-woosh.mp3',0.1);

	function Claw3DBag(n,coins){
		let self = this;
		let h = 150 + Math.floor(coins/3) * (COIN * 0.4);
		let w = 100 + Math.min(coins,3) * (COIN * 0.7);

		w = 300;
		h = 300;
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

		let $fg = $('<claw3Dbagfg>').appendTo(self.$el);
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
		self.showContents = function () {
			$fg.css({opacity:0.6});
		}

		self.hideContents = function () {
			$fg.css({opacity:0.95});
		}
	}

	function Claw3DStack(n,coins){
		let self = this;

		self.$el = $(`<claw3Dstack>`).attr('n',n);

		for(var i=0; i<coins; i++){
			$('<claw3Dcoin>').appendTo(self.$el).css({
				'bottom':35 + i*20+'px',
				'background-position-y':-n*100+'%',
			});
		}
	}

	function Claw3DItem(n=0,coins=0){
		let self = this;
		self.$el = $('<claw3Ditem>');
		self.n = n;
		self.coins = coins;
		self.altitude = 1;

		self.r = Math.random() * Math.PI * 2;
		self.d = 0.15 + Math.random() * 0.2;

		//if(Math.random()>0.5) self.$el.css({'transform':'scaleX(-1)'})

		self.$shadow = $('<claw3Dshadow>').appendTo(self.$el).css({
			width: '160px',
			height: '120px',
			left: '50px',
		});

		let stack = new Claw3DStack(n,coins);
		stack.$el.appendTo(self.$el);
		
		/*let bag = new Claw3DBag(n,coins);
		bag.$el.appendTo(self.$el);*/

	
		self.yOffset = 0;

		self.redraw = function(){

			if(!self.meep){
				self.px = 0.5 + Math.cos(self.r) * self.d;
				self.py = 0.5 + Math.sin(self.r) * self.d;
			}

			self.$el.css({
				left:self.px * PLATFORM + 'px',
				top:self.py * PLATFORM + 'px',
			});

			stack.$el.css({
				transform: 'rotateX(-90deg) translateX(-50%) translateZ(30px) translateY('+(-ALTITUDE * self.altitude)+'px)',
			})

		}

		self.hideContents = function(){
			//bag.hideContents();
		}

		self.showContents = function () {
			//bag.showContents();
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

		let $score = $('<claw3Dscore>').appendTo(meep.$el);


		// hx & hy are home coordinates (i.e. disabled position)
		// ax & ay are avatar coordinates (i.e. live render)
		// px & py are real player coordinates

		self.hx = self.ax = self.ay = 0;
		self.hy = self.px = self.py = 0;

		self.score = 0;
		self.height = 350;
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

		self.initCarry = function(){
			meep.$handLeft.css({top:20});
			meep.$handRight.css({top:20});
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

		self.setHeight = function(h) {
			self.height = h;
			meep.setHeight(h);
		}

		self.addScore = function(score) {
			$score.text('+'+score).css({opacity:1}).delay(500).animate({opacity:0});
			self.score += score;
		}

		self.subtractScore = function(score) {
			$score.text('−'+score).css({opacity:1}).delay(500).animate({opacity:0});
			self.score -= score;
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
					background: url(./proto/img/party/bg-mountains-clouds.png);
					background-size: 100% 100%;
					
					perspective: ${W*3}px;
				}

				claw3Dplatform{
					display: block;
					position: absolute;
	
					width: ${PLATFORM}px;
					height: ${PLATFORM}px;


					transform: rotateX(60deg);
					transform-origin: bottom center;
					transform-style: preserve-3d;
					
					
					left: ${W*1.5 - PLATFORM/2}px;	
					bottom: 40px;

					background: url(./proto/img/party/texture-wood.png);
					

					border-radius: 100%;

					box-shadow: 0px 50px black;
				}

				claw3Dspinner{
					display: block;
					position: absolute;
					background: url(./proto/img/party/texture-wood.png);
					inset: 10%;
					border-radius: 100%;
					box-shadow: 0px 0px 10px black;
				}

				claw3Dcenter{
					display: block;
					position: absolute;
					background: url(./proto/img/party/texture-wood.png);
					inset: 35%;
					border-radius: 100%;
					box-shadow: 0px 0px 10px black;
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
					width: ${CLAW}px;
					height: ${CLAW}px;
					left: 0px;
					top: 0px;
					background: rgba(0,0,0,0.3);
					border-radius: 100%;
					transform: translate(-50%, -50%);
					box-sizing: border-box;
					border: 30px solid transparent;
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

				claw3Dplane:after{
					content:"";
					display: block;
					position: absolute;
					inset: 0px -50px 0px -50px;
					background: linear-gradient(to top, transparent, black, transparent, transparent, transparent);
					transform: translateZ(200px);
					filter: blur(20px);
					opacity: 0.2;
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

				claw3Dstack{
					display: block;
					position: absolute;
					bottom: 0px;
					left: 0px;
					height: 500px;
					width: 100px;

					transform: rotateX(-90deg) translateX(-50%) translateZ(30px);
					transform-style: preserve-3d;
					transform-origin: bottom center;
					
				}

				claw3Dclaw[n='0'] claw3Dshadow { border-color: var(--n0); }
				claw3Dclaw[n='1'] claw3Dshadow { border-color: var(--n1); }
				claw3Dclaw[n='2'] claw3Dshadow { border-color: var(--n2); }
				claw3Dclaw[n='3'] claw3Dshadow { border-color: var(--n3); }
				claw3Dclaw[n='4'] claw3Dshadow { border-color: var(--n4); }
				claw3Dclaw[n='5'] claw3Dshadow { border-color: var(--n5); }

				claw3Dbagfg{
					display: block;
					position: absolute;
					inset: 0px;
					border-radius: 100% 100% ${ITEM*0.7}px ${ITEM*0.7}px;
					background: url(./proto/img/party/texture-hessian.jpg);
					opacity: 0.95;
					box-shadow: inset -20px -20px 30px rgba(0,0,0,0.3);
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
					background: #555;
				}

				claw3Dbagtop{
					display: block;
					position: absolute;
					width: ${ITEM*0.4}px;
					height: ${ITEM*0.2}px;
					top:  ${-ITEM*0.2+30}px;
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
					background-image: url(./proto/img/party/sprite-coin.png);
					background-size: 900%;
					background-position-x: -100%;
					background-position-y: 100%;
					transform: rotate(90deg) translateX(50%);
				}

				claw3Dtube{
					position: absolute;
					display: block;
					top: 50%;
					left: 50%;
				}

				claw3Dtube:before{
					content:"";
					position: absolute;
					display: block;
					width: ${ITEM+100}px;
					height: ${ITEM}px;
					
					left: ${-ITEM/2}px;
					top: ${-ITEM/2+5}px;
					border-radius: 100%;
					box-sizing: border-box;
					background: black;
					opacity: 0.2;
				}


				claw3Dtube:after{
					content:"";
					position: absolute;
					display: block;
					width: ${ITEM}px;
					height: ${ITEM}px;
					border: 20px solid limegreen;
					left: ${-ITEM/2}px;
					top: ${-ITEM/2-50}px;
					border-radius: 100%;
					box-sizing: border-box;
					background: black;
					box-shadow: 0px 50px green;
				}

				claw3Dscore{
					display: block;
					position: absolute;
					left: -100px;
					right: -100px;
					bottom: 350px;
					font-size: 100px;
					line-height: 100px;
					color: white;
					text-align: center;
					text-shadow: 0px 0px 15px black;
				}
		`)
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<claw3Dgame>').appendTo(self.$el);

	let hud = new PartyHUD();
	hud.$el.appendTo($game);

	let $platform = $('<claw3Dplatform>').appendTo($game);
	let $spinner = $('<claw3Dspinner>').appendTo($platform);
	let $center = $('<claw3Dcenter>').appendTo($platform);

	let claw = new Claw3DClaw();
	claw.$el.appendTo($platform).hide();

	$('<claw3Dtube>').appendTo($platform);

	let items = [];
	let meeps = [];
	let turnOrder = [];
	function initGame(count){
		for(var i=0; i<count; i++){
			meeps[i] = new Claw3DMeep(i);
			meeps[i].$el.appendTo($platform);

			meeps[i].hx = meeps[i].ax = 0.5 + Math.cos(-i*0.2) * (0.45 * [-1,1][i%2]);
			meeps[i].hy = meeps[i].ay = 0.5 + Math.sin(-i*0.2) * 0.45;
			meeps[i].isActive = false;
			meeps[i].score = 0;

			turnOrder[i] = i;
		}

		window.shuffleArray(turnOrder);

		setTimeout( initNextClaw, 1000);
	}

	let iRound = -1;
	function initNextRound(){

		turnOrder.reverse();
		claw.$el.hide();

		iRound++;

		if(iRound>=ROUNDS){
			finiGame();
			return;
		}

		if(iRound==0){
			hud.initPlayers(meeps);

			for(let m=0; m<meeps.length; m++){

				let count = Math.floor(3 + Math.random()*20);

				while(count){
					let amt = count;
					if(count>3) amt = Math.min( 5, 3 + Math.floor( Math.random()* (count-3)));
					let item =  new Claw3DItem(m, amt );
					item.$el.appendTo($platform);
					items.push(item);

					count -= amt;

					item.altitude = 1;
					$(item).animate({altitude:0},200+Math.random()*200);
				}
				
			}
		}
		

		setTimeout(function(){
			hud.initRound(iRound,ROUNDS);
			audio.play('music',false,(iRound==ROUNDS-1)?1.5:1);
		},2000);

		setTimeout(function(){
			hud.finiBanner();
		},4000);

		setTimeout( function(){
			initClaw(0);
		}, 6000 );
	}

	if( playersMeta ) setTimeout( function(){ initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	let iClaw = -1;
	let r = 0;
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
			claw.grabbed.altitude = claw.altitude;
			claw.grabbed.px = claw.px;
			claw.grabbed.py = claw.py;
		}

		for(var m in meeps) meeps[m].step();
		for(var m in meeps) meeps[m].redraw();

		for(var i in items){
			if(items[i].meep){
				items[i].px = items[i].meep.ax;
				items[i].py = items[i].meep.ay;
				items[i].altitude = items[i].meep.altitude;
				items[i].yOffset = items[i].meep.height + 40;
			} else {

				items[i].r += 0.005;

				/*for(var j in items){
					if(i!=j && items[i].isActive && items[j].isActive){
						let dx = items[i].px - items[j].px;
						let dy = items[i].py - items[j].py;
						let d = Math.sqrt(dx*dx + dy*dy);

						if(d<0.05){
							let r = Math.atan2(dy,dx);
							items[i].px += Math.cos(r) * 0.01;
							items[i].py += Math.sin(r) * 0.01;
							items[j].px += Math.cos(r+Math.PI) * 0.01;
							items[j].py += Math.sin(r+Math.PI) * 0.01;
						}
					}
				}*/
			}
		

			items[i].redraw();
		}

		claw.redraw();

		hud.updatePlayers(meeps);

		r += 0.005;
		$spinner.css({
			transform: 'rotate('+r+'rad)',
		})

		resize();
	}

	let nPlayer = -1;
	function initNextClaw(){
		nPlayer++;
		nPlayer = nPlayer%meeps.length;

		if(nPlayer==0){
			initNextRound();
		} else {
			initClaw(nPlayer);
		}
	}

	function initClaw(n){

		n = turnOrder[n];

		claw.$el.show();
		//iClaw = n;

		meeps[n].isWalkingAround = false;

		audio.play('machine');

		$(claw).animate({
			px:meeps[n].ax,
			py:meeps[n].ay,
		},{
			complete:function(){audio.stop('machine')},
		}).delay(500).animate({
			altitude:0,
			open:1,
		},{
			duration:500,
			start:function(){audio.play('machine')},
			complete:function(){audio.stop('machine')},
		}).delay(200).animate({
			open:0,
		},{
			duration:300,
			start:function(){audio.play('machine')},
			complete:function(){
				meeps[n].initClaw();
				claw.meep = meeps[n];
				audio.stop('machine')
		}}).delay(500).animate({
			altitude:1,
		},{
			duration:500,
			start:function(){audio.play('machine')},
			complete:function(){audio.stop('machine')},
		}).animate({
			chase: 50,
		},100).animate({
			chase: 0,
		},{
			start:function(){
				claw.meep = meeps[n];
				claw.isTracking = true;
				claw.$el.attr('n',n);
				audio.play('machine');
			},
			complete:function(){audio.stop('machine')},
			duration: 1000,
		})

		setTimeout(function(){
			hud.summonPlayers([n]);
		},2000);

		setTimeout(function(){
			hud.finiBanner();
		},3500);

		setTimeout(function(){
			hud.initTimer(10,initGrab);
		},4500);

		//
	}

	function initGrab(){

		claw.isTracking = false;
		
		hud.finiTimer();

		$(claw).delay(200).animate({
			altitude:0,
		},{
			duration:500,
			start:function(){audio.play('machine')},
			complete:function(){audio.stop('machine')},
		}).delay(500).animate({
			altitude:1,
		},{
			duration:500,
			start:function(){audio.play('machine')},
			complete:function(){audio.stop('machine')},
		}).delay(500).animate({
			px:0.5,
			py:0.5,
		},{
			duration:500,
			start:function(){audio.play('machine')},
			complete:function(){audio.stop('machine')},
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
					items[i].isActive = false;
					items[i].meep = claw.meep;
				}
				
			}
		},700);

		setTimeout(function(){
			if(claw.grabbed){
				claw.grabbed.showContents();
				audio.play('correct',true);
			}
		},4000);
		setTimeout(initRelease,5000);
	}

	function initRelease(){
		let grabbed = claw.grabbed;
		claw.grabbed = undefined;
		$(grabbed).animate({altitude:0.1},{
			complete:function(){
			grabbed.$el.hide();
			claw.meep.addScore( grabbed.coins );
			audio.play('coin',true);
			if(grabbed.n > -1){
				meeps[grabbed.n].subtractScore(grabbed.coins);
			}

		}});
		setTimeout(initReset,2000);
	}

	function initReset(){
		$(claw).animate({
			px:claw.meep.hx,
			py:claw.meep.hy,
		},{
			start:function(){audio.play('machine')},
			complete:function(){audio.stop('machine')},
		}).animate({
			open:1
		},{
			start:function(){
				finiClaw();
				audio.play('machine');
			},
			complete:function(){audio.stop('machine')},
		}).delay(500).animate({
			open:0,
		},{
			start:function(){audio.play('machine')},
			complete:function(){audio.stop('machine')},
		})
	}

	function finiClaw() {
		let meepReset = claw.meep;
		claw.meep = undefined;
		claw.$el.attr('n',-1);

		$(meepReset).animate({altitude:0},{complete:function(){meepReset.initIdle()}});
		
		setTimeout(initNextClaw,2000);
	}

	function finiGame(){
		let scores = [];
		for(var m in meeps){
			meeps[m].$el.hide();
			scores[m] = meeps[m].score;
		}

		audio.stop('music');
		hud.showFinalScores(scores,scores);

		setTimeout(function() {
			self.fini();
			window.doPartyGameComplete(scores);
		},5000);
	}


	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	self.fini = function(){
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
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