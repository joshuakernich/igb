window.RouletteRunnerGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const WHEEL = W*0.8;
	const BALL = 70;
	const PLATFORM = W*0.27;
	const COLORS = ['#ff1111','green','#222'];
	const SEGS = [0,2,0,2,0,2,0,2,1];


	let audio = new AudioContext();
	audio.add('blip','./proto/audio/party/sfx-select.mp3',0.3);
	audio.add('correct','./proto/audio/party/sfx-correct.mp3',0.3);
	audio.add('music','./proto/audio/party/music-creeping.mp3',0.3,true);

	if( !RouletteRunnerGame.init ){
		RouletteRunnerGame.init = true;

		$("head").append(`
			<style>
				rouletterunnergame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: gray;
					
					perspective: ${W*3}px;
					background: url(./proto/img/party/bg-village.png);
					background-position: bottom center;
					background-size: 33.3% 220%;
				}

				roulettelandscape{
					display:block;
					position: absolute;
					width: ${W*0.9}px;
					height: ${W*1.5}px;
					transform: rotateX(70deg);
					transform-origin: bottom center;
					transform-style: preserve-3d;
					background: blue;
					left: ${W*1.05}px;
					bottom: 120px;
					border-radius: 50px;
					background: url(./proto/img/party/texture-wood.png);
					box-shadow: 0px 100px #38231d;
				}

				roulettewheel{
					display:block;
					position: absolute;
					width: ${WHEEL}px;
					height: ${WHEEL}px;
					inset: 0px;
					bottom: ${H}px;
					margin: auto;
					background: #ddd;
					border-radius: 100%;
					
					white-space: normal;
					line-height: 0px;
					
					border: 40px solid #ddd;
					box-shadow: 0px 100px #222;
					transform-style: preserve-3d;
				}

				roulettewheelinner{
					display: block;
					position: absolute;
					inset: 0px;

				}

				roulettewheel:after{
					content:"";
					display: block;
					position: absolute;
					inset: 0px;
					border-radius: 100%;
					box-shadow: inset 0px 30px #222;
				}

				roulettesegment{
					display:inline-block;
					width: ${WHEEL/2}px;
					height: ${WHEEL/2}px;
					background: #dd2222;
					box-sizing: border-box;
					border: 10px solid white;
				}

				roulettesegment:nth-of-type(2), roulettesegment:nth-of-type(3){ background:#222; }

				roulettewheel svg{
					border-radius: 100%;
				}

				rouletteball{
					display:block;
					position: absolute;
					transform-style: preserve-3d;
				}

				rouletteballball{
					display:block;
					position: absolute;
					width: ${BALL}px;
					height: ${BALL}px;
					background: white;
					border-radius: 100%;
					transform: translate(-50%,0%) rotateX(-90deg);
					transform-origin: bottom center;
					transform-style: preserve-3d;
				}

				rouletteballshadow{
					display:block;
					position: absolute;
					top: 70%;
					left: 70%;
					width: ${BALL}px;
					height: ${BALL}px;
					background: black;
					transform: translate(-50%,-50%);
					border-radius: 100%;
					opacity: 0.5;
				}

				roulettespirebase{
					display:block;
					position: absolute;
					width: 150px;
					height: 150px;
					background: #ddd;
					border-radius: 100%;
					top: 50%;
					left: 50%;
					transform: translate(-50%,-50%);
					box-shadow: 0px 20px black;
				}

				roulettespire{
					display:block;
					position: absolute;
					width: 50px;
					height: 200px;
					border-radius: 25px;
					transform: translate(-50%,-80%) rotateX(-90deg);
					transform-origin: bottom center;
					background: linear-gradient(to right, white, white, gray);
					top: 50%;
					left: 50%;
				}

				rouletteplatforms{
					position: absolute;
					display: inline-block;
					bottom: 100px;
					left: 0px;
					right: 0px;
					width: ${PLATFORM*COLORS.length}px;
					height: ${PLATFORM}px;
					text-align: center;
					box-shadow: 0px -40px black;
					margin: auto;
					
					transform-style: preserve-3d;
				}

				rouletteplatform{
					display: inline-block;
					width: ${PLATFORM}px;
					height: ${PLATFORM}px;
					background: red;
				}

				roulettewheelanchor{
					position: absolute;
					display: block;
					top: 50%;
					left: 50%;
					transform-style: preserve-3d;
				}
			<style>
		`);
	}

	const GRAVITY = 1;
	const RouletteBall = function(rStart,rDir,speed){
		let self = this;
		self.$el = $('<rouletteball>');

		let $shadow = $('<rouletteballshadow>').appendTo(self.$el);
		let $ball = $('<rouletteballball>').appendTo(self.$el);

		self.altitude = H;
		self.sFall = 0;

		self.x = Math.cos(rStart)*WHEEL/2;
		self.y = Math.sin(rStart)*WHEEL/2;
		self.sx = Math.cos(rDir)*speed;
		self.sy = Math.sin(rDir)*speed;

		self.$el.css({
			top: '60%',
			left: '70%',
		})

		self.step = function() {
			self.sFall += GRAVITY;
			self.altitude -= self.sFall;

			self.x += self.sx;
			self.y += self.sy;

			if(self.altitude<0){
				self.altitude = 0;
				self.sFall = -Math.abs(self.sFall) * 0.8;
				self.sx *= 0.7;
				self.sy *= 0.7;
			}

			$ball.css({
				'bottom':self.altitude+'px',
			});

			self.$el.css({
				'left':self.x +'px',
				'top':self.y +'px',
			})
		}
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<rouletterunnergame>').appendTo(self.$el);
	let $landscape =  $('<roulettelandscape>').appendTo($game);
	let $wheel = $(`<roulettewheel>`).appendTo($landscape);
	let $inner = $(`<roulettewheelinner>`).appendTo($wheel);
	let $anchor = $(`<roulettewheelanchor>`).appendTo($wheel);
	let $platforms = $(`<rouletteplatforms>`).appendTo($landscape);
	let $svg = $(`<svg width=${WHEEL} height=${WHEEL} viewBox='-0.5 -0.5 1 1'></svg>`).appendTo($inner);
	$('<roulettespirebase>').appendTo($wheel);
	$('<roulettespire>').appendTo($wheel);

	
	let int = Math.PI*2/SEGS.length;

	for(var i=0; i<SEGS.length; i++){
		let d = `M0,0 L${Math.cos(int*i)},${Math.sin(int*i)} L${Math.cos(int*(i+1))},${Math.sin(int*(i+1))} Z`
		$(`<path vector-effect='non-scaling-stroke' fill='${COLORS[SEGS[i]]}' d='${d}'>`).appendTo($svg);
	}

	$svg.html($svg.html());

	for(var i=0; i<COLORS.length; i++){
		$('<rouletteplatform>').appendTo($platforms).css({
			background:COLORS[i],
		})
	}
	
	let meeps = [];

	let hud = new PartyHUD();
	hud.$el.appendTo($game);

	let balls = [];
	function spawnBall(){
		let rStart = Math.random() * Math.PI * 2;
		let rVector = rStart + Math.PI + (Math.random()>0.5?0.3:-0.3);
		let ball = new RouletteBall(rStart,rVector,3 + Math.random()*3);
		ball.$el.appendTo($anchor);
		balls.push(ball);
	}

	let rSpinSpeed = 0;
	let rSpin = 0;
	let isSpinComplete = false;

	function initGame(count){
		for(var i=0; i<count; i++){
			meeps[i] = new PartyMeep(i);
			meeps[i].$el.appendTo($platforms);
			meeps[i].$el.css({
				'left':i*20+'%',
				'top':'50%',
				//'transform-origin':'bottom center',
				'transform':'rotateX(-90deg) scale(0.8)'
			})
		}

		initRound();
	}

	initGame(6);

	function initRound(){
		for(var b in balls) balls[b].$el.remove();
		balls.length = 0;
		rSpinSpeed = 0.1;
		isSpinComplete = false;
		isSpinFreeze = false;

		spawnBall();
	}

	self.step = function(){
		rSpinSpeed *= 0.99;
		//rSpinSpeed = 0;
		
		rSpin += rSpinSpeed;
		$inner.css({
			'transform':'rotate('+rSpin+'rad)',
		});

		for(var b in balls) balls[b].step();

		if(!isSpinFreeze){
			for(var m in meeps){
				meeps[m].x = meeps[m].px;
				meeps[m].y = meeps[m].py;
				meeps[m].$el.css({ 
					left:meeps[m].x*100 + '%',
					top:meeps[m].y*100 + '%',
				});
			}
		}

		if(!isSpinFreeze && rSpinSpeed < 0.01){
			hud.initBanner('Freeze');
			isSpinFreeze = true;
		}

		if(rSpinSpeed < 0.005 && !isSpinComplete){
			hud.finiBanner();
			rSpinSpeed = 0;
			isSpinComplete = true;
			for(var b in balls){
				let r = Math.atan2(balls[b].y,balls[b].x);

				let rActual = (r-rSpin)%(Math.PI*2);
				let p = (rActual)/(Math.PI*2);
				let iSeg = Math.floor( p*SEGS.length );
				
				let color = $svg.find('path').eq(iSeg).attr('fill');

				let cntFlash = 12;
				let interval = setInterval(function(){
					cntFlash--;
					$svg.find('path').eq(iSeg).attr('fill',[color,'yellow'][cntFlash%2]);
					if(!cntFlash){
						clearInterval(interval);
						setTimeout(initRound,1000);
					}
				},200);
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

	let interval = setInterval(self.step,1000/FPS);

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
}