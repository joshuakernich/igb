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
	const ROUNDS = [{speed:0.25},{speed:0.5}] // represents radians per second

	let audio = new AudioPlayer();
	audio.add('music','./proto/audio/party/music-heist.mp3',0.3,true,true);
	audio.add('purse','./proto/audio/party/sfx-purse.mp3',0.3);
	audio.add('correct','./proto/audio/party/sfx-correct.mp3',0.3);
	audio.add('incorrect','./proto/audio/party/sfx-incorrect.mp3',0.3);
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
		self.$coins = [];

		for(var i=0; i<coins; i++){
			self.$coins[i] = $('<claw3Dcoin>').appendTo(self.$el).css({
				'bottom':35 + i*20+'px',
				'background-position-y':-n*100+'%',
			});
		}
	}

	function Claw3DItem(n,coins){
		let self = this;
		self.$el = $('<claw3Ditem>');
		self.n = n;
		self.coins = coins;

		self.altitude = 1;
		self.isFloor = true;

		self.r = 0;
		self.d = 0;

		self.$shadow = $('<claw3Dshadow>').appendTo(self.$el).css({
			width: '160px',
			height: '120px',
			left: '50px',
		});

		self.stack = new Claw3DStack(n,coins);
		self.stack.$el.appendTo(self.$el);

		self.redraw = function(){

			if(self.isFloor){
				self.px = 0.5 + Math.cos(self.r) * self.d;
				self.py = 0.5 + Math.sin(self.r) * self.d;
			}

			self.$el.css({
				left:self.px * PLATFORM + 'px',
				top:self.py * PLATFORM + 'px',
			});

			self.stack.$el.css({
				transform: 'rotateX(-90deg) translateX(-50%) translateZ(30px) translateY('+(-ALTITUDE * self.altitude)+'px)',
			})

		}
	}


	function Claw3DClaw(n){
		let self = this;
		self.$el = $('<claw3Dclaw>').attr('n',n);

		let $shadow = $('<claw3Dshadow>').appendTo(self.$el);
		let $plane = $('<claw3Dplane>').appendTo(self.$el);
		let $shade = $('<claw3Dshade>').appendTo($plane);
		let $clamps = $('<claw3Dclamps>').appendTo($plane);
		let $clampLeft = $('<claw3Dclamp>').appendTo($clamps);
		let $clampRight = $('<claw3Dclamp>').appendTo($clamps);
		let face = new PartyMeepHead(n);
		face.$el.appendTo($clamps).css({
			left: '50%',
			transform: 'translate(-50%, -50%)'
		})

		self.altitude = 1;
		self.open = 0;
		self.score = 0;
		self.x = 0;
		self.y = 0;

		self.yRange = 0.1;

		self.redraw = function(){

			if(self.isActive){
				self.x = self.px;
				self.y = self.py * self.yRange;
			}

			self.$el.css({
				left:self.x * PLATFORM + 'px',
				top:self.y * PLATFORM + 'px',
			});

			$clamps.css({
				bottom: `${ALTITUDE * self.altitude}px`,
			});

			let deg = 12 + self.open * 28;

			$clampLeft.css({
				'transform':`rotate(${deg}deg)`
			});

			$clampRight.css({
				'transform':`scaleX(-1) rotate(${deg}deg)`
			})

			let o = self.yRange - 0.1;
			$shadow.css('opacity',o);
			$shade.css('opacity',o);
		}

		self.addScore = function(score) {
			let $score = $('<claw3Dscore>').appendTo($plane);
			$score.text('+'+score).css({opacity:1, bottom:200+ self.altitude*ALTITUDE+'px'}).animate({opacity:0,bottom:self.altitude*ALTITUDE+400+'px'},500);
			self.score += score;
		}

		self.subtractScore = function(score) {
			let $score = $('<claw3Dscore>').appendTo($plane);
			$score.text('−'+score).css({opacity:1, bottom:200+self.altitude*ALTITUDE+'px'}).animate({opacity:0,bottom:self.altitude*ALTITUDE+400+'px'},500);
			self.score -= score;
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
					transition: transform 1s;
				}

				claw3Dspinner{
					display: block;
					position: absolute;
					background: url(./proto/img/party/texture-wood.png);
					inset: 3%;
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

				claw3Dshade{
					
					display: block;
					position: absolute;
					inset: 0px;
					background: linear-gradient(to top, rgba(0,0,0,0.5), transparent, transparent);
					
					transform: translateZ(${CLAW/4}px);
					filter: blur(10px);

					border-radius: 0px 0px ${CLAW/2}px ${CLAW/2}px;
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
					width: 30px;
					height: 1000px;
					background: #333;
					bottom: ${CLAW}px;
					left: ${CLAW/2 - 15}px;
					margin: auto;
				}


				claw3Dclamp{
					display: block;
					position: absolute;
					width: ${CLAW/2}px;
					height: ${CLAW*0.8}px;
					box-sizing: border-box;
					border: 10px solid white;
					border-top-width: 60px;
					border-radius: 100% 0px 0px 100%;
					top: 0px;
					left: 0px;
					border-right: none;
					transform-origin:top right;
				}

				claw3Dclamp:after{
					content:"";
					width: 30px;
					height: 30px;
					background: white;
					border-radius: 10px;
					position: absolute;
					bottom: -20px;
					right: 0px;
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
					bottom: 0px;
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

	//let claw = new Claw3DClaw();
	//claw.$el.appendTo($platform).hide();

	$('<claw3Dtube>').appendTo($platform);

	let items = [];
	let claws = [];
	let turnOrder = [];
	function initGame(count){
		for(var i=0; i<count; i++){

			claws[i] = new Claw3DClaw(i);
			claws[i].isActive = true;
			claws[i].$el.appendTo($platform);

			turnOrder[i] = i;
		}

		window.shuffleArray(turnOrder);

		setTimeout( initPlay, 1000);
	}

	let slots = [];

	let circles = [
		{r:0.2,cnt:10},
		{r:0.3,cnt:15},
		{r:0.4,cnt:25}
	];

	for(var c=0; c<circles.length; c++){
		for(var i=0; i<circles[c].cnt; i++){
			slots.push({
				r:(1/circles[c].cnt*i+c/circles.length)*Math.PI*2,
				d:circles[c].r,
			})
		}	
	}

	function initTutorial(){
		initCoins();

		for(var c in claws){
			$(claws[c]).animate({yRange:1});
		}

		$platform.css({
			'transform':'rotateX(70deg)',
		})

		hud.initTutorial('Claw Chaos',
			{x:1.5, y:0.45, msg:'Move around the box<br>to position the claw', icon:'around'},
		);

		hud.initTimer(30,finiTutorial);
	}

	function finiTutorial(){

		hud.finiTimer();
		hud.finiTutorial();

		for(var c in claws){
			$(claws[c]).animate({yRange:0.1});
		}

		for(var i in items) items[i].$el.remove();
		items.length = 0;

		setTimeout(initPlay,2000);
	}

	function initPlay(){

		$platform.css({
			'transform':'rotateX(80deg)',
		})

		hud.initPlayers(claws);
		initCoins();
		setTimeout(initNextClaw, 1000);
	}

	function initCoins(){

		for(let c in claws){

			let count = Math.floor(10 + Math.random()*40);

			while(count){
				let amt = count;
				if(count>3) amt = Math.min( 10, count/3, 3 + Math.floor( Math.random()* (count-3)));
				let item =  new Claw3DItem(c, amt);
				item.$el.appendTo($platform);
				item.redraw();
				items.push(item);

				count -= amt;

				item.altitude = 1;
				$(item).animate({altitude:0},200+Math.random()*200);
			}
			
		}

		shuffleArray(slots);
		for(var i in items){
			items[i].r = slots[i].r;
			items[i].d = slots[i].d;
		}
	}

	let iRound = -1;
	function initNextRound(){

		turnOrder.reverse();
		for(var c in claws){
			$(claws[c]).animate({yRange:0.1});
		}

		iRound++;

		if(iRound>=ROUNDS.length){
			finiGame();
			return;
		}

		setTimeout(function(){
			hud.initRound(iRound,ROUNDS.length);
			audio.play('music',false,(iRound==ROUNDS.length-1)?1.5:1);
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

		for(var c in claws){

			let claw = claws[c];

			if(claw.grabbed){
				claw.grabbed.altitude = claw.altitude;
				claw.grabbed.px = claw.x;
				claw.grabbed.py = claw.y;
			}

			claw.redraw();
		}

		for(var i in items){
			if(items[i].isFloor && ROUNDS[iRound]) items[i].r += (ROUNDS[iRound].speed)/FPS;
			items[i].redraw();
		}

		hud.updatePlayers(claws);

		r += 0.005;
		$spinner.css({
			transform: 'rotate('+r+'rad)',
		})

		resize();
	}

	let nPlayer = -1;
	function initNextClaw(){
		nPlayer++;
		nPlayer = nPlayer%claws.length;

		if(nPlayer==0){
			initNextRound();
		} else {
			initClaw(nPlayer);
		}
	}

	let n = undefined;
	function initClaw(nth){

		n = turnOrder[nth];

		for(var c in claws){
			if(c==n){
				$(claws[c]).animate({yRange:1});
			} else {
				$(claws[c]).animate({yRange:0.1});
			}
		}

		$platform.css({
			'transform':'rotateX(60deg)',
		})

		setTimeout(function(){
			hud.summonPlayers([n]);
		},1000);

		setTimeout(function(){
			hud.finiBanner();
		},3000);

		setTimeout(function(){
			hud.initTimer(10,initGrab);

			$(claws[n]).animate({
				open:1,
			},{
				start:function(){audio.play('machine')},
				complete:function(){audio.stop('machine')},
			})
		},4000);
	}

	function initGrab(){

		claws[n].isActive = false;
		
		hud.finiTimer();

		$(claws[n]).delay(200).animate({
			altitude:0,
			open:0,
		},{
			duration:500,
			start:function(){audio.play('machine')},
			complete:function(){audio.stop('machine')},
		}).animate({
			altitude:1,
		},{
			duration:500,
			start:function(){audio.play('machine')},
			complete:function(){audio.stop('machine')},
		}).delay(500).animate({
			x:0.5,
			y:0.5,
		},{
			duration:500,
			start:function(){audio.play('machine')},
			complete:function(){audio.stop('machine')},
		})

		setTimeout(function(){

			let min = 0.1;
			let grabbing = undefined;
			for(var i in items){
			
				let dx = items[i].px - claws[n].x;
				let dy = items[i].py - claws[n].y;
				let d = Math.sqrt(dx*dx+dy*dy);
				if(d<min){
					min = d;
					grabbing = items[i];
				}
			}

			if(grabbing){
				claws[n].grabbed = grabbing;
				grabbing.isFloor = false;
				grabbing.claw = claws[n];
				audio.play('purse',true);
			}
		},700);

		setTimeout(function(){
			$platform.css({
				'transform':'rotateX(80deg)',
			})
		},2000);

		
		setTimeout(initRelease,4000);
	}

	function initRelease(){
		let grabbed = claws[n].grabbed;

		claws[n].grabbed = undefined;
		$(claws[n]).animate({
			open:1
		},200).delay(1000).animate({
			open:0,
		})

		if(grabbed){
			grabbed.claw = undefined;

			for(let c in grabbed.stack.$coins ){
				let $coin = grabbed.stack.$coins[c];
				let bottom = parseInt( $coin.css('bottom') );
				$coin.animate({
					bottom:-ALTITUDE-100,
					left: -100 + Math.random() * 200,
				},{
					duration:200 + bottom * 10,
					complete:function(){
						$coin.hide();
						claws[n].addScore(1);
						audio.play('coin',true);
						if(grabbed.n > -1) claws[grabbed.n].subtractScore(1);
					}
				})
			}
			setTimeout(initReset,4000);
		} else {
			audio.play('incorrect',true);
			setTimeout(initReset,2000);
		}
	}

	function initReset(){

		claws[n].isActive = true;
		$(claws[n]).animate({yRange:0.1});

		finiClaw();
	}

	function finiClaw() {
		
		/*for(var c in claws){
			claws[c].isActive = false;
		}*/
		
		setTimeout(initNextClaw,2000);
	}

	function finiGame(){
		let scores = [];
		for(var c in claws){
			claws[c].$el.hide();
			scores[c] = claws[c].score;
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
		for(var c in claws){
			claws[c].px = (p[c].px);
			claws[c].py = (1-p[c].pz);
		}
	}

	let interval = setInterval(self.step,1000/FPS);
}