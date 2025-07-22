window.FinalFrenzyGame = function(){
	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const LOWERPY = 0.5;
	const UPPERPY = 0;
	const BOMB = 60;
	const EXPLOSION = 250;
	const THICC = 50;
	const BORDER = 10;
	const COIN = 70;
	const CLAWCOLOUR = '#b24ab2';

	const FrenzyClaw = function(nWall,x,y){
		let self = this;
		self.$el = $('<frenzyclaw>');

		
		
		let $claw = $('<frenzyclawclaw>').appendTo(self.$el);
		let $arm = $('<frenzyclawarm>').appendTo(self.$el);
		let $btn = $('<frenzyclawbutton>').appendTo(self.$el).click(onClaw);
		
		if(nWall==2) self.$el.css('transform','scaleX(-1)');

		self.pxClaw = 0;
		self.x = x;
		self.y = y;
		self.extension = 0.1;
		self.dir = (nWall==2)?-1:1;
		self.hasHit = false;

		function onClaw(){
			$claw.addClass('open');
			$(self)
			.animate({extension:1})
			.delay(200)
			.animate({extension:1},{
				start:function(){
					$claw.removeClass('open');
				}}).animate({extension:0.1},{
					duration: 500,
					complete:function(){
						self.hasHit = false;
					}
				});
		}

		self.step = function(){
			self.pxClaw = (nWall-1) + self.x + (self.extension * self.dir);
			
		}

		self.redraw = function(){
			self.$el.css({
				left: nWall*W + x*W + 'px',
				top: y*H + 'px',
			});

			$claw.css({
				left: self.extension * W + 'px',
			});

			$arm.css({
				width: self.extension * W + 'px',
			});

			if(self.meep){
				self.y = self.meep.y;
				self.$el.css({
					left: self.meep.wall*W + self.meep.wallx*W + 'px',
					top: self.meep.py*H + 'px',
				})
			}

		}

		self.bindToMeep = function(meep){
			meep.wall = nWall;
			self.meep = meep;
		}

		self.clamp = function(){
			self.hasHit = true;
			$claw.removeClass('open');
			/*$(self).stop(true,false).animate({extension:0.1},{
					duration: 500,
					complete:function(){
						self.hasHit = false;
					}
				});*/
		}
		
	}

	const FrenzyCoin = function(x,y){
		let self = this;
		let nWall = 1;

		self.$el = $('<frenzycoin>');

		self.px = x;
		self.py = y;

		self.step = function(){
			self.py += 0.01;
		}

		self.redraw = function(){
			self.$el.css({
				left: nWall*W + self.px*W + 'px',
				top: self.py*H + 'px',
			})
		}
	}

	const FrenzyBomb = function(n,x,y){
		let self = this;
		self.$el = $('<frenzybomb n='+n+'>');

		let $wick = $('<frenzywick>').appendTo(self.$el);

		self.px = x;
		self.py = y;

		self.isExploded = false;

		self.step = function(){
			if(!self.isExploded) self.py += 0.01;
		}

		self.redraw = function(){
			self.$el.css({
				left:W + self.px * W + 'px',
				top:self.py * H + 'px',
				'transform':'rotate('+self.py*10+'rad)',
			})
		}

		self.explode = function(){
			self.isExploded = true;
			$wick.hide();
			self.$el.addClass('exploded');
			$('<frenzyexplosion>').appendTo(self.$el).animate({
				width: (EXPLOSION * 1.5) + 'px',
				height: (EXPLOSION * 1.5) + 'px',
			},200).delay(200).animate({
				width: '0px',
				height: '0px',
				opacity: 0,
			},1000);

			for(var i=0; i<6; i++){
				let size = 20 + Math.random() * 20;
				let r = Math.random() * Math.PI*2;
				$('<frenzysmoke>').appendTo(self.$el).css({
					width: size + 'px',
					height: size + 'px',
					left: Math.cos(r) * EXPLOSION/2 * Math.random(),
					top: Math.sin(r) * EXPLOSION/2 * Math.random(),
				}).animate({
					left: Math.cos(r) * (EXPLOSION*1.5)/2,
					top: Math.sin(r) * (EXPLOSION*1.5)/2,
					width: (size*2) + 'px',
					height: (size*2) + 'px',
				},200 + Math.random()*100).animate({
					left: Math.cos(r) * (EXPLOSION*2)/2,
					top: Math.sin(r) * (EXPLOSION*2)/2,
					width: (size) + 'px',
					height: (size) + 'px',
					opacity: 0,
				},1000)
			}
		}
	}

	const FrenzyMeep = function(n){
		let self = this;
		self.$el = $('<frenzymeep>');

		let wasPX = 0;
		let r = 0;

		self.px = 0;
		self.py = 0.5;
		self.ay = LOWERPY;
		self.wall = 1;
		self.y = 0;
		self.ox = 0;
		self.wallx = 0;
		self.my = 1;

		self.countdownBomb = undefined;

		let meep = new PartyMeep(n);
		meep.$shadow.hide();
		meep.$el.appendTo(self.$el);
		meep.$el.css({
			bottom: '-150px',
			left: '0px',
			scale: '0.7',
		})

		let $bomb = $('<frenzybomb n='+n+'>').appendTo(self.$el).hide();
		let $wick = $('<frenzywick>').appendTo($bomb);

		self.doHit = function(dir){
			$(self).animate({ox:dir*0.15},300).animate({ox:0},1000);
		}

		self.step = function(){
			if(self.countdownBomb != undefined){
				self.countdownBomb--;

				if(self.countdownBomb<=0){
					$bomb.hide();
					self.spawnBomb = true;
					self.countdownBomb = undefined;
					meep.$handLeft.animate({top:'200px'},200);
				}
			}

			self.wallx = self.px;
			if(self.wall==0) self.wallx = self.pz;
			if(self.wall==2) self.wallx = 1-self.pz;
		}

		self.redraw = function(){
			self.y = self.ay+(self.py*self.my);
			self.$el.css({
				top: self.y * H + 'px',
				left: self.wall*W + self.wallx * W + self.ox*W + 'px',
			})

			let dx = self.wallx - wasPX;
			if(self.ox != 0) dx = self.ox * 0.3;
			let rNew = dx*20;

			r = (r*5 + rNew)/6;

			self.$el.css({
				transform: 'rotate('+r+'rad)',
			})

			wasPX = self.wallx;
		}

		self.setFlyer = function(b){
			if(b) meep.toFlyer();
			else meep.toSkydiver();

			self.my = 0.5;
			self.ay = b?LOWERPY:UPPERPY;
		}

		self.armBomber = function(){
			$bomb.show();
			self.countdownBomb = FPS*1.5;

			$bomb.css({top:'-20px'}).animate({top:'-100px'},250).animate({top:'-60px'},150);
			meep.$handLeft.css({top:'150px'}).animate({top:'90px'},250);
		}

		self.bindToClaw = function(){
			self.ay = UPPERPY-0.11;
			self.my = 1;
		}
	}

	if( !FinalFrenzyGame.init ){
		FinalFrenzyGame.init = true;

		$("head").append(`
			<style>
				finalfrenzygame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background-image: url(./proto/img/party/bg-cosmos-tile.avif);
					background-size: 33.3%;
					background-position: center bottom;
					background-position-y: 0px;
				}

				frenzystars{
					position: absolute;
					display: block;
					inset: 0px;
					background-image: url(./proto/img/party/tile-stars.png);
					background-size: 15%;
					opacity: 0.2;
				}

				frenzymeep:before{
					content:"";
					width: 100px;
					height: 10px;
					left: -50px;
					top: -5px;
					background: red;
					display: block;
					position: absolute;

					display: none;
				}

				frenzymeep{
					display: block;
					position: absolute;
				}

				finalfrenzygame svg{
					position: absolute;
					top: 0px;
					left: 33.3%;
				}

				frenzybomb{
					display: block;
					position: absolute;
					
					left: -80px;
					top: -60px;
				}

				frenzybomb:after{
					content: "";
					display: block;
					position: absolute;
					width: 20px;
					height: 10px;
					left: -10px;
					bottom: ${BOMB/2}px;
					background: red;

					box-shadow: inset 0px 2px 5px white;
				}

				frenzybomb:before{
					content: "";
					display: block;
					position: absolute;

					width: ${BOMB}px;
					height: ${BOMB}px;
					left: ${-BOMB/2}px;
					top: ${-BOMB/2}px;
					border-radius: 100%;

					background: red;

					box-shadow: inset 0px -5px 10px black, inset 0px 2px 5px white;

				}

				frenzybomb.exploded:before,
				frenzybomb.exploded:after{
					display: none;
				}

				frenzybomb[n='0'] frenzyexplosion:after,frenzybomb[n='0']:before,frenzybomb[n='0']:after{ background: var(--n0); }
				frenzybomb[n='1'] frenzyexplosion:after,frenzybomb[n='1']:before,frenzybomb[n='1']:after{ background: var(--n1); }
				frenzybomb[n='2'] frenzyexplosion:after,frenzybomb[n='2']:before,frenzybomb[n='2']:after{ background: var(--n2); }
				frenzybomb[n='3'] frenzyexplosion:after,frenzybomb[n='3']:before,frenzybomb[n='3']:after{ background: var(--n3); }
				frenzybomb[n='4'] frenzyexplosion:after,frenzybomb[n='4']:before,frenzybomb[n='4']:after{ background: var(--n4); }
				frenzybomb[n='5'] frenzyexplosion:after,frenzybomb[n='5']:before,frenzybomb[n='5']:after{ background: var(--n5); }


				frenzywick{
					display: block;
					position: absolute;
					bottom: ${BOMB}px;
					left: 0px;
				}

				frenzywick:after{
					content: "";
					display: block;
					position: absolute;
					background: yellow;
					width: 16px;
					height: 16px;
					left: -8px;
					top: -8px;
					transform: rotate(45deg);
					animation: spin;
					animation-timing-function: linear;
					animation-iteration-count: infinite;
					animation-duration: 0.5s;
				}

				frenzysmoke{
					display: block;
					position: absolute;
					background: white;
					border-radius: 100%;
					transform: translate(-50%, -50%);
				}

				frenzyexplosion{
					display: block;
					position: absolute;

					width: ${EXPLOSION}px;
					height: ${EXPLOSION}px;

					overflow: visible;
					transform: translate(-50%, -50%);
				}

				frenzyexplosion:after{
					content:"";
					display: block;
					position: absolute;
					width: 100%;
					height: 100%;
					
					background: red;
					border-radius: 100%;
					opacity: 0.8;
				}

				frenzyclaw{
					display: block;
					position: absolute;
				}

				frenzyclawclaw{
					display: block;
					position: absolute;
				}

				frenzyclawclaw:before{
					content: "";
					width: 200px;
					height: 100px;
					border-top: ${THICC}px solid ${CLAWCOLOUR};
					border-left: ${THICC}px solid ${CLAWCOLOUR};
					border-right: ${THICC}px solid ${CLAWCOLOUR};
					display: block;
					position: absolute;
					bottom: 0px;
					left: 0px;
					box-sizing: border-box;
					border-radius: 100px 100px 0px 0px;
					transform-origin: bottom left; 
					transition: 0.2s all;
					transform: rotate(-1deg);
				}

				frenzyclawclaw:after{
					content: "";
					width: 200px;
					height: 100px;
					border-bottom: ${THICC}px solid ${CLAWCOLOUR};
					border-left: ${THICC}px solid ${CLAWCOLOUR};
					border-right: ${THICC}px solid ${CLAWCOLOUR};
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
					box-sizing: border-box;
					border-radius: 0px 0px 100px 100px;
					transform-origin: top left;
					transition: 0.2s all;
					transform: rotate(1deg);
				}

				frenzyclawclaw.open:before{
					transform: rotate(-45deg);
				}

				frenzyclawclaw.open:after{
					transform: rotate(45deg);
				}

				frenzyclawbutton{
					display: block;
					position: absolute;
					width: 200px;
					height: 200px;
					background: ${CLAWCOLOUR};
					left: -100px;
					top: -100px;
					box-sizing: border-box;
					border-radius: 50px;
					box-shadow: 0px 2px 20px black;
				}

				frenzyclawbutton:after{
					content: "";
					display: block;
					position: absolute;
					inset: ${THICC/2}px;
					border-radius: ${THICC/2}px;
					background: white;
					opacity: 0.3;
					border-bottom: 5px solid black;
				}

				frenzyclawarm{
					position: absolute;
					left: 0px;
					top: ${-THICC/2}px;
					background: ${CLAWCOLOUR};
					width: 100px;
					height: ${THICC}px;
					box-sizing: border-box;
				}

				frenzyclawarm:after{
					content:"";
					width: ${THICC*1.5}px;
					height: ${THICC}px;
					border-radius: 20px;
					background: white;
					right: ${-THICC*1.2}px;
					top: 0px;
					display: block;
					position: absolute;
					background: ${CLAWCOLOUR};
					box-sizing: border-box;
					box-shadow: 0px 2px 20px black;
				}

				@keyframes spin{
					0%{
						transform: rotate(0deg);
					}

					100%{
						transform: rotate(360deg);
					}
				}

				frenzycoin{
					position: absolute;
					display: block;

					animation: rotate;
					animation-iteration-count: infinite;
					animation-duration: 2s;

					animation-timing-function: linear;
				}

				frenzycoin:before{
					content:"";
					position: absolute;
					display: block;
					width: ${COIN}px;
					height: ${COIN}px;
					background: #B149B2;
					border-radius: 100%;
					box-sizing: border-box;
					left: ${-COIN/2-3}px;
					top: ${-COIN/2}px;

					animation: spin;
					animation-iteration-count: infinite;
					animation-duration: 1s;

					animation-timing-function: linear;

					box-shadow: inset 0px 0px 5px white;

				}

				frenzycoin:after{
					content:"";
					position: absolute;
					display: block;
					width: ${COIN}px;
					height: ${COIN}px;
					background: purple;
					border-radius: 100%;
					box-sizing: border-box;
					left: ${-COIN/2+3}px;
					top: ${-COIN/2}px;

					animation: spin;
					animation-iteration-count: infinite;
					animation-duration: 1s;

					animation-timing-function: linear;

					box-shadow: inset 0px 0px 5px white;
				}

				@keyframes rotate{
					0%{
						transform: rotate(0deg);
					}

					100%{
						transform: rotate(360deg);
					}
				}

				@keyframes spin{
					0%{
						transform: scaleX(-1);
					}

					100%{
						transform: scaleX(1);
					}
				}

			</style>
		`)
	}

	let self = this;
	self.$el = $('<igb>');

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-cosmic-frenzy.mp3',0.3,true);
	audio.add('reload','./proto/audio/sfx-reload.mp3',0.1);
	audio.add('throw','./proto/audio/sfx-throw.mp3',0.1);
	audio.add('boom','./proto/audio/riddler-boom.mp3',0.1);
	audio.add('explode','./proto/audio/riddler-explosion.mp3',0.1);
	audio.add('coin','./proto/audio/party/sfx-coin.mp3',0.2);

	const palette = ['#37CCDA','#8DE968','#FEE955','#FEB850','#FD797B'];

	let $game = $('<finalfrenzygame>').appendTo(self.$el);
	let $stars = $('<frenzystars>').appendTo($game);

	let $svg = $(`
		<svg width=${W} height=${H}>
		<svg>`).appendTo($game);

	for(var p in palette){
		$('<path>').appendTo($svg).attr('fill',palette[p]);
	}

	$svg.html( $svg.html() );

	let hud = new PartyHUD('purple');
	hud.$el.appendTo($game);

	let history = [];
	let meeps = [];
	let claws = [];
	let coins = [];
	let nFlyer = undefined;
	function initGame(count){
		for(var i=0; i<count; i++){
			meeps[i] = new FrenzyMeep(i);
			meeps[i].$el.appendTo($game);
			meeps[i].wall = 0;
			meeps[i].setFlyer(false);
		}

		for(var i=0; i<2; i++){
			let claw = new FrenzyClaw(i*2,0.5,0.5);
			claw.$el.appendTo($game);
			claw.redraw();
			claws[i] = claw;
		}

		audio.play('music');
		initFlyer(0);
		//initAttacher(1);
		initClawOperator(1,0);
		initClawOperator(2,1);
	}

	function initClawOperator(n,nClaw){
		//meeps[n].setClaw(nClaw);

		meeps[n].bindToClaw(claws[nClaw]);
		claws[nClaw].bindToMeep(meeps[n]);
	}

	function initFlyer(n){
		nFlyer = n;
		meeps[nFlyer].setFlyer(true);
		meeps[nFlyer].wall = 1;
	}

	function initAttacher(n){
		nAttacker = n;
		meeps[nAttacker].wall = 1;
		//meeps[nAttacker].armBomber();

		setInterval(function(){
			audio.play('reload',true);
			meeps[nAttacker].armBomber();
		}, 4000);
	}

	let bombs = [];
	function spawnBomb(n,x,y){
		let bomb = new FrenzyBomb(n,x,y);
		bomb.$el.appendTo($game);
		bombs.push(bomb);
	}

	function spawnCoin(x,y){
		let coin = new FrenzyCoin(x,y);
		coin.$el.appendTo($game);
		coins.push(coin);
	}

	hud.initPlayerCount(initGame);

	let nStep = 0;
	function step(){
		nStep++;
		$game.css({
			'background-position-y':nStep*2+'px',
		})

		$stars.css({
			'background-position-y':nStep*10+'px',
		})

		if(nFlyer != undefined && nStep%FPS==0){
			spawnCoin(0.2 + Math.random()*0.6,0);
		}

		for(var c in claws) claws[c].step();
		for(var c in coins) coins[c].step();

		for(var m in meeps){
			meeps[m].step();
			if(meeps[m].spawnBomb){
				audio.play('throw',true);
				spawnBomb(m,meeps[m].px-0.05,meeps[m].y);
				meeps[m].spawnBomb = false;
			}
		}

		for(var c in coins){
			let dx = coins[c].px*W - meeps[nFlyer].px*W;
			let dy = coins[c].py*H - meeps[nFlyer].y*H;
			let d = Math.sqrt(dx*dx+dy*dy);
			if(d<COIN && !coins[c].collected){
				coins[c].collected = true;
				coins[c].$el.hide();
				audio.play('coin',true);
			}
		}

		for(var c in claws){
			let dx = (claws[c].pxClaw - meeps[nFlyer].px)*W;
			let dy = (claws[c].y - meeps[nFlyer].y)*H;
			let d = Math.sqrt(dx*dx+dy*dy);



			if(d<150 && !claws[c].hasHit){
				claws[c].clamp();
				//claws[c].hasHit = true;
				meeps[nFlyer].doHit(claws[c].dir);
				audio.play('explode',true);
			}
		}

		for(var b in bombs){
			bombs[b].step();
			
			if(nFlyer != undefined && !bombs[b].isExploded){
				let dx = meeps[nFlyer].px*W - bombs[b].px*W;
				let dy = Math.abs( meeps[nFlyer].y*H - bombs[b].py*H );
				let d = Math.sqrt(dx*dx+dy*dy);
				if(d<200 && dy<150){
					audio.play('boom',true);
					audio.play('explode',true);
					bombs[b].explode();
					meeps[nFlyer].doHit(dx>0?1:-1);
				}
			}
			
		}

		for(var m in meeps) meeps[m].redraw();
		for(var b in bombs) bombs[b].redraw();
		for(var c in claws) claws[c].redraw();
		for(var c in coins) coins[c].redraw();

		if(nFlyer != undefined) history.unshift({x:meeps[nFlyer].px + meeps[nFlyer].ox, y:meeps[nFlyer].y});

		if(history.length>FPS) history.length = FPS;

		for(var i=0; i<palette.length; i++){
			let d = '';

			for(var h=0; h<history.length; h++){

				let wStripe = 5 + h*1;
				let xOffset = (palette.length-1)/2*wStripe;

				let x = ( history[0].x + history[h].x )/2;

				d = d + (h==0?' M':' L')+(x*W+wStripe*i-xOffset)+' '+(history[h].y+h*0.02)*H;
			}

			for(var h=history.length-1; h>=0; h--){

				let wStripe = 5 + h*1;
				let xOffset = (palette.length-1)/2*wStripe;

				let x = ( history[0].x + history[h].x )/2;

				d = d + ' L'+(x*W+wStripe*(i+1)-xOffset)+' '+(history[h].y+h*0.02)*H;
			}

			$svg.find('path').eq(i).attr('d',d);
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
			meeps[m].py = p[m].py;
			
			meeps[m].r =  {W:p[m].rW, X:p[m].rX, Y:p[m].rY, Z:p[m].rZ};
		}
	}

	let interval = setInterval(step,1000/FPS);
}