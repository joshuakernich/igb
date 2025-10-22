window.FinalFrenzyOldGame = function(){
	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const LOWERPY = 0.5;
	const UPPERPY = 0;
	const BOMB = 70;

	const THICC = 50;
	const BORDER = 10;
	const COIN = 70;
	const ANIMAL = 250;

	let audio = new AudioPlayer();
	audio.add('music','./proto/audio/party/music-cosmic-frenzy.mp3',0.3,true);
	audio.add('reload','./proto/audio/sfx-reload.mp3',0.1);
	audio.add('throw','./proto/audio/sfx-throw.mp3',0.1);
	audio.add('boom','./proto/audio/riddler-boom.mp3',0.1);
	audio.add('explode','./proto/audio/riddler-explosion.mp3',0.1);
	audio.add('coin','./proto/audio/party/sfx-coin.mp3',0.2);
	audio.add('thud','./proto/audio/party/sfx-thud-small.mp3',0.3);

	const FrenzyItem = function(x,y,type='coin',n){
		let self = this;
		let nWall = 1;
		let skin = undefined;

		self.$el = $('<frenzyitem>');

		if(type=='coin') skin = new FrenzyCoin(n);
		if(type=='bomb') skin = new FrenzyBomb();
		if(type=='animal') skin = new FrenzyAnimal();

		if(skin) skin.$el.appendTo(self.$el);

		self.size = skin.size;

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

			if(skin.redraw) skin.redraw();
		}

		self.collect = function(){
			self.isCollected = true;
			return skin.collect();
		}
	}

	const FrenzyExplosion = function(size,color){

		let self = this;
		self.$el = $('<frenzyexplosioncontainer>');

		$('<frenzyexplosion>').appendTo(self.$el).css({
			width: size +'px',
			height: size +'px',
			background: color,
		}).animate({
			width: (size * 1.5) + 'px',
			height: (size * 1.5) + 'px',
		},200).delay(200).animate({
			width: '0px',
			height: '0px',
			opacity: 0,
		},1000);

		for(var i=0; i<6; i++){
			let sizeSmoke = 20 + Math.random() * 20;
			let r = Math.random() * Math.PI*2;
			$('<frenzysmoke>').appendTo(self.$el).css({
				width: sizeSmoke + 'px',
				height: sizeSmoke + 'px',
				left: Math.cos(r) * size/2 * Math.random(),
				top: Math.sin(r) * size/2 * Math.random(),
			}).animate({
				left: Math.cos(r) * (size*1.5)/2,
				top: Math.sin(r) * (size*1.5)/2,
				width: (sizeSmoke*2) + 'px',
				height: (sizeSmoke*2) + 'px',
			},200 + Math.random()*100).animate({
				left: Math.cos(r) * (size*2)/2,
				top: Math.sin(r) * (size*2)/2,
				width: (sizeSmoke) + 'px',
				height: (sizeSmoke) + 'px',
				opacity: 0,
			},1000)
		}
	}

	const FrenzyCoin = function(n){
		let self = this;
		self.$el = $(`<frenzycoin n=${n}>`);
		self.size = COIN;

		self.collect = function (argument) {
			self.$el.hide();
			audio.play('coin',true);

			return 1;
		}
	}

	const FrenzyAnimal = function(){
		let self = this;
		self.size = ANIMAL;
		self.$el = $('<frenzyanimal>');

		let $skin = $('<frenzyanimalskin>').appendTo(self.$el);

		let iAnimal = Math.floor(Math.random()*7);
		$skin.css({
			'background-position-x':-iAnimal*100+'%',
		});

		self.collect = function (argument) {
			audio.play('thud',true);
			self.$el.css({ animation: 'none' });
			$skin.hide();
			new FrenzyExplosion(100,'gray').$el.appendTo(self.$el);

			return -2;
		}
	}

	const FrenzyBomb = function(){
		let self = this;
		self.$el = $('<frenzybomb>');
		self.size = BOMB;
		let r = 0;
		let $wick = $('<frenzywick>').appendTo(self.$el);

		self.isExploded = false;

		self.step = function(){
			if(!self.isExploded) self.py += 0.01;
		}

		self.redraw = function(){
			r++;
			self.$el.css({
				'transform':'rotate('+r+'deg)',
			})
		}

		self.collect = function(){
			audio.play('explode',true);
			self.isExploded = true;
			$wick.hide();
			self.$el.addClass('exploded');
			new FrenzyExplosion(250,'red').$el.appendTo(self.$el);

			return -5;
		}
	}

	const FrenzyMeep = function(n){
		let self = this;
		self.$el = $('<frenzymeepcontainer>');

		let history = [];

		let $svg = $(`
		<svg width=${W} height=${H}>
		<svg>`).appendTo(self.$el);

		for(var p in palette){
			$('<path>').appendTo($svg).attr('fill',palette[p]);
		}

		$svg.html( $svg.html() );

		let $meep = $('<frenzymeep>').appendTo(self.$el);

		let $score = $('<frenzyscore>').appendTo($meep).text('');

		let wasPX = 0;
		let r = 0;

		self.px = 0;
		self.py = 0.5;
		self.ay = LOWERPY;
		self.wall = 0;
		self.y = 0;
		self.ox = 0;
		self.wallx = 0;
		self.my = 1;
		self.score = 0;

		self.countdownBomb = undefined;

		let meep = new PartyMeep(n);
		meep.$shadow.hide();
		meep.$el.appendTo($meep);
		meep.$el.css({
			bottom: '-150px',
			left: '0px',
			scale: '0.7',
		})

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
			//if(self.wall==0) self.wallx = self.pz;
			//if(self.wall==2) self.wallx = 1-self.pz;
		}

		self.redraw = function(){
			self.y = 1-self.pz;//self.ay+(self.py*self.my);
			$meep.css({
				top: self.y * H + 'px',
				left: self.wall*W + self.wallx * W + 'px',
			})

			let dx = self.wallx - wasPX;
			if(self.ox != 0) dx = self.ox * 0.3;
			let rNew = dx*20;

			r = (r*5 + rNew)/6;

			$meep.css({
				transform: 'rotate('+r+'rad)',
			})

			wasPX = self.wallx;

			if(self.wall==1){
				history.unshift({x:self.px + self.ox, y:self.y});
				
				if(history.length>FPS/2){
					history.length = FPS/2;

					for(var i=0; i<palette.length; i++){
						let d = '';

						for(var h=0; h<history.length; h++){

							let wStripe = 5 + h*1;
							let xOffset = (palette.length-1)/2*wStripe;

							let x = ( history[0].x + history[h].x )/2;

							d = d + (h==0?' M':' L')+(x*W+wStripe*i-xOffset)+' '+(history[h].y+h*0.04)*H;
						}

						for(var h=history.length-1; h>=0; h--){

							let wStripe = 5 + h*1;
							let xOffset = (palette.length-1)/2*wStripe;

							let x = ( history[0].x + history[h].x )/2;

							d = d + ' L'+(x*W+wStripe*(i+1)-xOffset)+' '+(history[h].y+h*0.04)*H;
						}

						$svg.find('path').eq(i).attr('d',d);
					}
				}
			} else {
				$svg.find('path').attr('d','');
			}
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

		self.scoreChange = function(change){
			self.score += change;
			$score.text(self.score).stop(false,false).css({opacity:1}).delay(200).animate({opacity:0});
		}

		self.showScore = function(){
			$score.stop(false,false).css({opacity:1});
		}
	}

	if( !FinalFrenzyOldGame.init ){
		FinalFrenzyOldGame.init = true;

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
					perspective: ${W*3}px;
				}

				frenzystream{
					display:block;
					position: absolute;
					inset: 0px;
					transform: rotateX(60deg) scaleY(1.6);
					transform-origin: top center;
					transform-style: preserve-3d;

					top: 60px;

				}

				frenzymeepcontainer{
					display: block;
					position: absolute;
					inset: 0px;
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
					
					left: 0px;
					top: 0px;
				}

				frenzybomb:after{
					content: "";
					display: block;
					position: absolute;
					width: 20px;
					height: 10px;
					left: -10px;
					bottom: ${BOMB/2}px;
					background: #222;

					box-shadow: inset 0px 2px 5px white;
					box-sizing: border-box;
					border: 1px solid white;
					border-right: none;
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

					background: #222;

					box-shadow: inset 0px -5px 10px black, inset 0px 2px 5px white;
					box-sizing: border-box;
					border: 1px solid white;

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

				frenzycoin[n='0']:after{ background:var(--n0); }
				frenzycoin[n='1']:after{ background:var(--n1); }
				frenzycoin[n='2']:after{ background:var(--n2); }
				frenzycoin[n='3']:after{ background:var(--n3); }
				frenzycoin[n='4']:after{ background:var(--n4); }
				frenzycoin[n='5']:after{ background:var(--n5); }


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
					animation: rotate;
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

				frenzyexplosioncontainer{
					display: block;
					position: absolute;
				}

				frenzyexplosion{
					display: block;
					position: absolute;
					overflow: visible;
					transform: translate(-50%, -50%);
					border-radius: 100%;
					opacity: 0.8;
				}


				@keyframes spin{
					0%{
						transform: rotate(0deg);
					}

					100%{
						transform: rotate(360deg);
					}
				}

				frenzyitem{
					position: absolute;
					display: block;
					transform: rotateX(-30deg)
				}

				frenzyanimal{
					position: absolute;
					display: block;
					
			
					animation: rotate;
					animation-iteration-count: infinite;
					animation-duration: 2s;
					animation-timing-function: linear;

					width: 0px;
					height: 0px;

				}


				frenzyanimalskin{
					position: absolute;
					display: block;
					width: ${ANIMAL}px;
					height: ${ANIMAL}px;
					top: ${-ANIMAL/2}px;
					left: ${-ANIMAL/2}px;
					background: url(./proto/img/party/actor-farm-items.png);
					background-size: 1200%;	
					transform-origin: center;
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
					background: white;
					border-radius: 100%;
					box-sizing: border-box;
					left: ${-COIN/2-3}px;
					top: ${-COIN/2}px;

					animation: spin;
					animation-iteration-count: infinite;
					animation-duration: 1s;

					animation-timing-function: linear;

					box-shadow: inset 0px 0px 5px white;

					border: 1px solid white;

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
					border: 1px solid white;
				}

				frenzyscore{
					display: block;
					position: absolute;
					bottom: 150px;
					left: -100px;
					right: -100px;
					color: white;
					font-size: 100px;
					line-height: 100px;
					text-align: center;
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

	const palette = ['#37CCDA','#8DE968','#FEE955','#FEB850','#FD797B'];

	let $game = $('<finalfrenzygame>').appendTo(self.$el);

	let $stream = $('<frenzystream>').appendTo($game);
	let $stars = $('<frenzystars>').appendTo($stream);

	let hud = new PartyHUD('#37CCDA');
	hud.$el.appendTo($game);

	let meeps = [];
	let items = [];
	let isLive = false;

	function initGame(count){
		for(var i=0; i<count; i++){
			meeps[i] = new FrenzyMeep(i);
			meeps[i].$el.appendTo($stream);
			meeps[i].wall = 0;
			meeps[i].setFlyer(false);
		}

		audio.play('music');
		
		setTimeout(initStart,2000);
	}

	function initStart(){
		isLive = true;
		initNextPlayer();
		initNextPlayer();
		hud.initTimer(20,initPlayerSwap);
	}

	let nPlayer = -1;
	function initNextPlayer(){
		nPlayer++;
		initFlyer(nPlayer%meeps.length);
	}

	function initPlayerSwap(){
		initNextPlayer();
		finiFlyer((nPlayer-2+meeps.length)%meeps.length);
		
		if(nPlayer<meeps.length) hud.initTimer(20,initPlayerSwap);
		else hud.initTimer(20,finiGame);
	}

	function finiGame() {

		while(items.length) items.pop().$el.remove();
		isLive = false;

		hud.finiTimer();
		hud.initBanner('Finish');
		for(var m in meeps){
			meeps[m].setFlyer(true);
			meeps[m].showScore();
			$(meeps[m]).animate({wall:1});
		}

		setTimeout(function(){
			let scores = [];
			for(var m in meeps) scores[m] = meeps[m].score;
			window.doPartyGameComplete(scores);
			self.fini();
		},4000);
	}

	function initFlyer(n){
		meeps[n].setFlyer(true);
		$(meeps[n]).animate({wall:1});
	}

	function finiFlyer(n){
		meeps[n].setFlyer(false);
		$(meeps[n]).animate({wall:2});
	}

	let bombs = [];
	function spawnBomb(n,x,y){
		let bomb = new FrenzyBomb(n,x,y);
		bomb.$el.appendTo($stream);
		bombs.push(bomb);
	}

	function spawnItem(x,y,type,n){
		let item = new FrenzyItem(x,y,type,n);
		item.$el.appendTo($stream);
		items.push(item);
	}

	hud.initPlayerCount(initGame);

	const ITEMS = ['animal','bomb','coin','coin','coin'];

	let nStep = 0;
	let queue = []
	function step(){
		nStep++;
		$game.css({
			'background-position-y':nStep*2+'px',
		})

		$stars.css({
			'background-position-y':nStep*10+'px',
		})

		if(isLive && nStep%FPS==0){
			if(!queue.length) for(var i in ITEMS){
				queue[i] = ITEMS[i];
				shuffleArray(queue);
			}
			spawnItem(0.2 + Math.random()*0.6,0,queue.pop());
		}

		for(var i in items) items[i].step();

		for(var m in meeps){
			meeps[m].step();
		}

		for(var m in meeps){
			if(meeps[m].wall==1){
				for(var i in items){
					let dx = items[i].px*W - meeps[m].px*W;
					let dy = items[i].py*H - meeps[m].y*H;
					let d = Math.sqrt(dx*dx+dy*dy);
					if(d<items[i].size && !items[i].isCollected){
						let coinChange = items[i].collect();

						meeps[m].scoreChange(coinChange);

						for(var c=0; c<(-coinChange); c++){
			
							let r = Math.random() * Math.PI;

							spawnItem(
								items[i].px + Math.cos(r)*0.1,
								items[i].py + Math.sin(r)*0.1 + Math.random() * 0.05,
								'coin',
								m
							)
						}
					}
				}
			}
		}

		for(var m in meeps) meeps[m].redraw();
		for(var i in items) items[i].redraw();

		resize();
	}

	self.fini = function(){
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
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