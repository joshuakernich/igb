window.ClawChaosGame = function(){
	
	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const COIN = 80;

	if( !ClawChaosGame.init ){
		ClawChaosGame.init = true;

		$("head").append(`
			<style>
				clawchaosgame{
					display: block;
					position: absolute;
					left: 0px;
					top: 0px;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: url(./proto/img/party/bg-village.png);
					background-size: 33.3% 100%;
				}

				clawmeep{
					position: absolute;
					display: block;
				}

				clawcoinpile{
					position: absolute;
					display: block;
					bottom: 50px;
					left: 0px;
					transform: rotate(5deg);
				}

				clawcoin{
					position: absolute;
					display: block;
					width: ${COIN}px;
					height: ${COIN/2}px;
					left: ${0}px;
					background: gold;
					box-shadow: inset 0px -10px rgba(0,0,0,0.5);
					border-radius: 100%;
				}

				clawmeep[n='0'] clawcoin { background: var(--n0); }
				clawmeep[n='1'] clawcoin { background: var(--n1); }
				clawmeep[n='2'] clawcoin { background: var(--n2); }
				clawmeep[n='3'] clawcoin { background: var(--n3); }
				clawmeep[n='4'] clawcoin { background: var(--n4); }
				clawmeep[n='5'] clawcoin { background: var(--n5); }

				clawstring{
					position: absolute;
					display: block;
					width: 20px;
					height: ${H}px;
					background: #ddd;
					left: -10px;
					bottom: 260px;
				}

				clawstring:after{
					content: "";
					display: block;
					position: absolute;
					bottom: 0px;
					width: 80px;
					height: 50px;
					left: -30px;
					border-radius: 50px 50px 0px 0px;
					background: #ddd;
					box-shadow: 0px 2px 5px black;
				}

		`)
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<clawchaosgame>').appendTo(self.$el);

	let hud = new PartyHUD();
	hud.$el.appendTo($game);

	const ClawMeep = function(i){
		let self = this;
		self.$el = $('<clawmeep>').attr('n',i);

		self.px = 0;
		self.py = 0;
		self.x = (0.2 + 0.1*i) * W;
		self.y = H*0.9;
		self.coins = 5 + Math.floor( Math.random() * 10 );
		self.speed = 20/self.coins * (Math.round( Math.random() ) * 2 - 1);
		self.mode = 'runner';

		
		


		let meep = new PartyMeep(i);
		meep.$head.css({
			'left':'-45px',
			'transform':'rotate(-10deg)',
		});
		meep.$el.appendTo(self.$el).css({
			'transform':'scale(0.8)',
		});
		meep.$handLeft.css({
			'left':'10px',
			'top':'280px',
		});
		meep.$handRight.css({
			'left':'105px',
			'top':'230px',
		})

		let $string = $('<clawstring>').appendTo(self.$el).hide();

		let $pile = $('<clawcoinpile>').appendTo(self.$el);
		for(var i=0; i<self.coins; i++){
			$('<clawcoin>').appendTo($pile).css({
				bottom:11*i+'px',
			})
		}

		self.step = function(){

			if(self.mode=='runner'){
				self.x += self.speed;
				if(self.x>(W-100)) self.speed = -self.speed;
				if(self.x<(100)) self.speed = -self.speed;
			}
			
			if(self.mode=='claw'){
				self.x = self.px * W;
			}



			//self.x = self.px * W;
			//self.y = self.py * H;
		}

		self.redraw = function(){

			self.$el.css({
				left: W + self.x + 'px',
				top: self.y + 'px',
				'transform':`scale(0.8)`,
			})

			if(self.mode=='runner'){
				self.$el.css({
					'transform':`scaleX(${0.8*(self.speed>0?1:-1)}) scaleY(0.8) rotate(${Math.cos(self.x*0.2)*3}deg)`,
				})
			}
		}

		self.toClawMode = function(){
			
			//self.y = H * 0.5;
			self.mode = 'claw';
			
			$string.show().css({
				'bottom':H+'px',
			}).animate({
				'bottom':'260px',
			},{
				complete:function(){
					$pile.hide();
					meep.toSkydiver();
					meep.$shadow.hide();
				}
			});

			$(self).delay(500).animate({
				y:H*0.5
			},)
		}
	}

	let meeps = [];
	function initGame(count){
		for(var i=0; i<count; i++){
			meeps[i] = new ClawMeep(i);
			meeps[i].$el.appendTo($game);
		}

		initNextClaw();
	}


	let nPlayerClaw = -1;
	function initNextClaw(){
		nPlayerClaw++;
		meeps[nPlayerClaw].toClawMode();
	}

	initGame(6);

	self.step = function(){

		for(var m in meeps) meeps[m].step();
		for(var m in meeps) meeps[m].redraw();

		resize();
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