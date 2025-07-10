window.FinalFrenzyGame = function(){
	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const LOWERPY = 0.5;
	const UPPERPY = 0;
	const BOMB = 60;

	const FrenzyBomb = function(n,x,y){
		let self = this;
		self.$el = $('<frenzybomb n='+n+'>');

		let $wick = $('<frenzywick>').appendTo(self.$el);

		self.px = x;
		self.py = y;

		self.step = function(){
			self.py += 0.01;
		}

		self.redraw = function(){
			self.$el.css({
				left:W + self.px * W + 'px',
				top:self.py * H + 'px',
				'transform':'rotate('+self.py*10+'rad)',
			})
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
		}

		self.redraw = function(){
			self.y = self.ay+(self.py*0.5);
			self.$el.css({
				top: self.y * H + 'px',
				left: self.wall*W + self.px * W + 'px',
			})


			let dx = self.px - wasPX;
			let rNew = dx*20;

			r = (r*5 + rNew)/6;

			self.$el.css({
				transform: 'rotate('+r+'rad)',
			})

			wasPX = self.px;
		}

		self.setFlyer = function(b){
			if(b) meep.toFlyer();
			else meep.toSkydiver();

			self.ay = b?LOWERPY:UPPERPY;
		}

		self.armBomber = function(){
			$bomb.show();
			self.countdownBomb = FPS*1.5;

			$bomb.css({top:'-20px'}).animate({top:'-100px'},250).animate({top:'-60px'},150);
			meep.$handLeft.css({top:'150px'}).animate({top:'90px'},250);
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

				frenzybomb[n='0']:before,frenzybomb[n='0']:after{ background: var(--n0); }
				frenzybomb[n='1']:before,frenzybomb[n='1']:after{ background: var(--n1); }
				frenzybomb[n='2']:before,frenzybomb[n='2']:after{ background: var(--n2); }
				frenzybomb[n='3']:before,frenzybomb[n='3']:after{ background: var(--n3); }
				frenzybomb[n='4']:before,frenzybomb[n='4']:after{ background: var(--n4); }
				frenzybomb[n='5']:before,frenzybomb[n='5']:after{ background: var(--n5); }


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

				@keyframes spin{
					0%{
						transform: rotate(0deg);
					}

					100%{
						transform: rotate(360deg);
					}
				}

			</style>
		`)
	}

	let self = this;
	self.$el = $('<igb>');

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-cosmic-frenzy.mp3',1,true);

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
	let nFlyer = undefined;
	function initGame(count){
		for(var i=0; i<count; i++){
			meeps[i] = new FrenzyMeep(i);
			meeps[i].$el.appendTo($game);
			meeps[i].wall = 0;
			meeps[i].setFlyer(false);
		}

		audio.play('music');
		initFlyer(0);
		initAttacher(1);
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

		setInterval(meeps[nAttacker].armBomber, 4000);
	}

	let bombs = [];
	function spawnBomb(n,x,y){
		let bomb = new FrenzyBomb(n,x,y);
		bomb.$el.appendTo($game);
		bombs.push(bomb);
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

		for(var m in meeps){
			meeps[m].step();
			if(meeps[m].spawnBomb){
				spawnBomb(m,meeps[m].px-0.05,meeps[m].y);
				meeps[m].spawnBomb = false;
			}
		}

		for(var b in bombs) bombs[b].step();

		

		for(var m in meeps) meeps[m].redraw();
		for(var b in bombs) bombs[b].redraw();

		if(nFlyer != undefined) history.unshift({x:meeps[nFlyer].px, y:meeps[nFlyer].y});

		if(history.length>FPS) history.length = FPS;

		for(var i=0; i<palette.length; i++){
			let d = '';

			for(var h=0; h<history.length; h++){

				let wStripe = 5 + h*1;
				let xOffset = (palette.length-1)/2*wStripe;

				d = d + (h==0?' M':' L')+(history[h].x*W+wStripe*i-xOffset)+' '+(history[h].y+h*0.02)*H;
			}

			for(var h=history.length-1; h>=0; h--){

				let wStripe = 5 + h*1;
				let xOffset = (palette.length-1)/2*wStripe;

				d = d + ' L'+(history[h].x*W+wStripe*(i+1)-xOffset)+' '+(history[h].y+h*0.02)*H;
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