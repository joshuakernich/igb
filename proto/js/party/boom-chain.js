window.BoomChainGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const BALL = 100;
	const ASPLODE = 500;

	let audio = new AudioPlayer();
	audio.add('music','./proto/audio/party/music-playroom.mp3',0.3,true);

	if( !BoomChainGame.init ){
		BoomChainGame.init = true;

		$("head").append(`
			<style>
				boomchaingame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: url(./proto/img/party/bg-village.png);
					background-size: 33.3% 180%;
					background-position: bottom center;
					perspective: ${W*3}px;
				}

				boomstage{
					position: absolute;
					display: block;
					inset: 0px;
					bottom: 100px;
					background: rgba(0,0,0,0.2);
					transform-origin: bottom center;
					transform: rotateX(50deg);
					transform-style: preserve-3d;
					box-shadow: inset 0px 30px rgba(0,0,0,0.5), inset -20px 0px rgba(0,0,0,0.5), inset 20px 0px rgba(0,0,0,0.5);
				}

				boomballcontainer{
					position: absolute;
					display: block;
					transform-style: preserve-3d;
				}

				boomshadow{
					position: absolute;
					display: block;
					width: ${BALL}px;
					height: ${BALL}px;
					border-radius: 100%;
					bottom: ${-BALL/2}px;
					left: ${-BALL/2}px;
					background: black;
					opacity: 0.3;
				}

				boomball{
					position: absolute;
					display: block;
					transform: rotateX(-48deg);
					transform-origin: bottom center;
					transform-style: preserve-3d;
				}

				boomballinner{
					position: absolute;
					display: block;
					bottom: 0px;
					border-radius: 100%;
					left: ${-BALL/2}px;
					width: ${BALL}px;
					height: ${BALL}px;
					box-shadow: inset -5px -10px 20px black;
					background: white;
					overflow: hidden;
				}

				boomballinner:after{
					content:"";
					position: absolute;
					display: block;
					inset: -20px;
					border-radius: 100%;
					border: 20px solid rgba(0,0,0,0.2);
					top: 20%;
				}

				boomlayer{
					display: block;	
					position: absolute;
					background: radial-gradient(transparent, red);

					transform: translate(-50%, -50%);
					border-radius: 100%;
					transform-style: preserve-3d;

					pointer-events: none;
				}

				boomlayer:first-of-type{
					box-sizing: border-box;
					border: 20px solid red;
				}

				boomscores{
					position: absolute;
					display: block;
					text-align: center;
					inset: 0px;
					line-height: ${H}px;
					opacity: 0.2;
				}

				boomscore{
					display: inline-block;
					width: ${W/7}px;
					color: white;
					font-size: 150px;
				}

				boomscore.active{
					font-size: ${H}px;
				}
		</style>`)
	}

	const BoomBall = function(){
		let self = this;
		self.$el = $('<boomballcontainer>');

		let $shadow = $('<boomshadow>').appendTo(self.$el);
		let $ball = $('<boomball>').appendTo(self.$el);
		let $inner = $('<boomballinner>').appendTo($ball);

		self.asploded = false;
		self.px = 1.5;
		self.py = 0.5;

		self.r = Math.random() * Math.PI * 2;
		self.speed = 0.001;
		self.sx = Math.cos(self.r)*self.speed;
		self.sy = Math.sin(self.r)*self.speed;

		self.step = function() {
			self.px += self.sx;
			self.py += self.sy;
		}

		self.redraw = function(){
			self.$el.css({
				left:self.px * W + 'px',
				top:self.py * H + 'px',
			})

			$inner.css({		
				transform: 'rotate('+(self.px*W*2)+'deg)',
			})
		}

		const LAYERS = 1;
		const BOOM = 200;
		self.boom = function(doSpreadCallback){

			self.asploded = true;
			self.sx = 0;
			self.sy = 0;

			self.$el.empty().off();

			for(var i=0; i<LAYERS; i++){
				let $boom = $('<boomlayer>').appendTo(self.$el);
				let y =  Math.sin(i/LAYERS * Math.PI/2);
				let size = Math.sin(Math.PI/2 + i/LAYERS * Math.PI/2);
				$boom.css({
					width: 0,
					height: 0,
					'transform':'translate(-50%, -50%) translateZ('+y*ASPLODE/2+'px)',
				}).animate({
					width: size*ASPLODE + 'px',
					height: size*ASPLODE + 'px',
				},{
					duration:200,
					complete:function(){doSpreadCallback(self)},
				}).delay(200).animate({
					opacity: 0,
				})
			}
		}
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<boomchaingame>').appendTo(self.$el);
	let $stage = $('<boomstage>').appendTo($game);
	let $scoreContainer = $('<boomscores>').appendTo($stage);
	let scores = [];
	let $scores = [];
	

	let hud = new PartyHUD('#F49B29');
	hud.$el.appendTo($game);

	let countPlayers = 6;

	const VOLUME = 50;

	let balls = [];
	function initGame(count) {
		countPlayers = count;
		
		for(var i=0; i<count; i++){
			scores[i] = 0;
			$scores[i] = $('<boomscore>').appendTo($scoreContainer).text(VOLUME).hide();
		}

		initNextPlayer();
	}

	let nPlayer = -1;
	function initNextPlayer(){
		nPlayer++;

		$stage.empty();
		for(var s in $scores) $scores[s].hide().removeClass('active');

		$scores[nPlayer].show().addClass('active').text("0");
		$scoreContainer.appendTo($stage);

		for(var i=0; i<VOLUME; i++){
			balls[i] = new BoomBall();
			balls[i].px = 0.1 + Math.random() * 2.8;
			balls[i].py =  0.1 + Math.random() * 0.8;
			balls[i].$el.appendTo($stage);
			balls[i].$el.click(onBall).attr('n',i);
		}

		hud.initBanner('Tap one ball');
	}

	let timeout;
	function onBall(){
		hud.finiBanner();
		let n = parseInt( $(this).attr('n') );
		for(var b in balls) balls[b].$el.off();
		initBoom(n);
	}

	function doSpread(from){

		for(var b in balls){
			if(balls[b] != from && !balls[b].asploded){
				let dx = (from.px - balls[b].px)*W;
				let dy = (from.py - balls[b].py)*H;
				let d = Math.sqrt(dx*dx+dy*dy);

				if(d < (ASPLODE/2 + BALL/2)) initBoom(b);
			}
		}
	}

	function initBoom(b){
		balls[b].boom(doSpread);
		scores[nPlayer]++;
		$scores[nPlayer].text(scores[nPlayer]);

		clearTimeout(timeout);
		timeout = setTimeout(finiBoom,2000);
	}

	function finiBoom(){
		hud.initBanner('Nice!');

		setTimeout(function(){
			hud.finiBanner();
		},2000);

		setTimeout(function(){
			initNextPlayer();
		},4000);
	}

	initGame(6);

	self.step = function(){
		
		for(var b in balls) balls[b].step(); 

		for(var a in balls){

			if(balls[a].px > 2.96) balls[a].sx = -Math.abs(balls[a].sx);
			if(balls[a].px < 0.04) balls[a].sx = Math.abs(balls[a].sx);
			if(balls[a].py > 0.85) balls[a].sy = -Math.abs(balls[a].sy);
			if(balls[a].py < 0.15) balls[a].sy = Math.abs(balls[a].sy);

			for(var b in balls){

				if(b != a && !balls[a].asploded && !balls[b].asploded){
					let dx = (balls[a].px - balls[b].px)*W;
					let dy = (balls[a].py - balls[b].py)*H;
					let d = Math.sqrt(dx*dx+dy*dy);

					if(d<BALL){
						let r = Math.atan2(dy,dx);
						let cx = (balls[a].px + balls[b].px)/2;
						let cy = (balls[a].py + balls[b].py)/2;

						//balls[a].px = cx + Math.cos(r) * (BALL/W)/2;
						//balls[a].py = cy + Math.sin(r) * (BALL/W)/2;

						balls[a].sx = Math.cos(r) * balls[a].speed;
						balls[a].sy = Math.sin(r) * balls[a].speed;

						//balls[b].px = cx + Math.cos(r+Math.PI) * (BALL/W)/2;
						//balls[b].py = cy + Math.sin(r+Math.PI) * (BALL/W)/2;

						balls[b].sx = Math.cos(r+Math.PI) * balls[b].speed;
						balls[b].sy = Math.sin(r+Math.PI) * balls[b].speed;


					}
				}
			}
		}
  


		for(var b in balls) balls[b].redraw();

		resize();
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	let interval = setInterval(self.step,1000/FPS);

	self.fini = function(){
		audio.stop('music');
		clearInterval(interval);
	}

	self.setPlayers = function(p){
		self.players = p;
		self.players.length = countPlayers;
	}
}