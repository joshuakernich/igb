window.PumpMeepSingle = function(n){
	let self = this;

	self.score = 0;

	let audio = new AudioContext();
    audio.add('pump','./proto/audio/pump-balloon.mp3',0.3);
    audio.add('pop','./proto/audio/party/sfx-pop.mp3',0.3);

	self.py = self.pyWas = 0;
	self.fill = 0;
	self.$el = $('<pumpmeep>');

	let meep = new PartyMeep(n);
	meep.$el.appendTo(self.$el);

	meep.$handLeft.css({
		left:'-60px',
		top:'250px'
	});
	meep.$handRight.css({
		top:'250px',
		left:'60px',
	});

	let $string = $('<pumpstring>').appendTo(self.$el);

	let $pump = $(`
		<pump>
			<pumpbody></pumpbody>
		</pump>`).appendTo(self.$el).attr('n',n);

	let $handle = $('<pumphandle></pumphandle>').appendTo($pump);
	let $balloon = $('<pumpballoon></pumpballoon>').appendTo($pump);

	self.isPopped = false;
	self.isActive = false;

	self.step = function(){

		meep.setHeight(900-self.py*800);
		$handle.css({ 
			bottom:(610-self.py*800) + 'px' 
		})

		if(self.pyWas != 0){
			let dy = self.py - self.pyWas;
			if(self.isActive && dy>0 && !self.isPopped){
				self.fill += dy;
				self.score = Math.min( 100, self.fill * 10 );
				$balloon.css({
					width: 100 + self.fill*50 + 'px',
					height: 120 + self.fill*50 + 'px',
				})

				if(self.fill>10){
					self.isPopped = true;
					$balloon.hide();
					audio.play('pop');
				}

				audio.play('pump');
			}
		}

		self.pyWas = self.py;
	}
}

window.PumpPopGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 20;
	const PLAYERS = 6;

	if(!PumpPopGame.init){
		PumpPopGame.init = true;

		$("head").append(`
			<style>
				@import url('https://fonts.googleapis.com/css2?family=Playwrite+DK+Loopet:wght@100..400&display=swap');

				pumpgame{

					width: ${W*3}px;
					height: ${H}px;
					background: linear-gradient(black, purple);
					position: absolute;
					left: 0px;
					top: 0px;
					display: block;
					transform-origin: top left;

					background: url(./proto/img/party/bg-carnival.webp);
					background-size: 100%;
					background-position: center 90%;
				}

				pumpgame:before{
					content:"";
					position: absolute;
					display: block;
					left: 0px;
					top: 0px;
					right: 0px;
					bottom: 0px;
					background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7));
				}



				pumpmeep{
					position: absolute;
					display: block;
					width: 0px;
					height: 0px;
				}

				pump{
					position: absolute;
					display: block;
					width: 0px;
					height: 0px;
				}

				pumpbody{
					position: absolute;
					display: block;
					width: 150px;
					height: 100px;
					left: -75px;
					bottom: 0px;
					background: orange;
				}

				pumphandle{
					position: absolute;
					display: block;
					width: 150px;
					height: 30px;
					left: -75px;
					bottom: 200px;
					background: orange;
				}

				pumpballoon{
					width: 100px;
					height: 120px;
					position: absolute;
					bottom: 650px;
					transform: translateX(-50%);
					background: orange;
					border-radius: 100%;
					left: -120px;
					box-shadow: inset 0px -20px 50px rgba(0,0,0,0.5), inset 0px 10px 10px rgba(255,255,255,0.5);
				}

				pumpstring{
					width: 120px;
					height: 650px;
					position: absolute;
					bottom: 70px;	
					right: 0px;

					border-bottom: 15px solid #999;
					border-left: 15px solid #999;
					border-radius: 0px 0px 0px 50%;
					transform-origin: bottom center;
			
				}

				pump[n='0'] pumpbody, pump[n='0'] pumphandle, pump[n='0'] pumpballoon{ background:red; }
				pump[n='1'] pumpbody, pump[n='1'] pumphandle, pump[n='1'] pumpballoon{ background:blue; }
				pump[n='2'] pumpbody, pump[n='2'] pumphandle, pump[n='2'] pumpballoon{ background:limegreen; }
				pump[n='3'] pumpbody, pump[n='3'] pumphandle, pump[n='3'] pumpballoon{ background:#dd00ff; }
				pump[n='4'] pumpbody, pump[n='4'] pumphandle, pump[n='4'] pumpballoon{ background:#ff6600; }
				pump[n='5'] pumpbody, pump[n='5'] pumphandle, pump[n='5'] pumpballoon{ background:#ffbb00; }
			</style>`);
	}

	let audio = new AudioContext();
    audio.add('music','./proto/audio/party/music-cartoon.mp3',0.3,true);

	let self = this;
	self.$el = $('<pumpgame>');

	let isGameGo = false;

	let pumps = [];

	let hud = new PartyHUD();
	hud.$el.appendTo(self.$el);

	let isGameComplete = false;

	function step(){
		for(var p in pumps){
			pumps[p].step();
			if(pumps[p].isPopped && !isGameComplete) doGameComplete();
		}
		resize();
	}

	function doGameComplete(){

		hud.clearTimer();

		isGameComplete = true;
		clearInterval(interval);
		setTimeout( function(){

			let scores = [];
			for(var a in pumps){
				scores[a] = 0;
				for(var b in pumps){
					if(a!=b && pumps[a].score>pumps[b].score) scores[a] += 5;
				}
			}

			self.fini();
			window.doPartyGameComplete(scores);
		}, 1000 );
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		self.$el.css('transform','scale('+scale+')');
	}

	let interval = setInterval(step,1000/FPS);

	self.setPlayers = function(p){
		for(var m in pumps){
			pumps[m].py = p[m].py;
		}
	}

	hud.initPlayerCount(initGame);

	function initGame(count){
		
		for(var i=0; i<count; i++){
		
			let pump = new PumpMeepSingle(i);
			pump.$el.appendTo(self.$el);

			pump.$el.css({
				left: W/2 + Math.floor(i/2) * W - W/6 + (i%2)*W/3 + 'px',
				top: H*0.95 + 'px',
			})

			pumps[i] = pump;
		}

		setTimeout(function(){
			hud.initBanner('Ready...');
			audio.play('music');
		},1000);

		setTimeout(function(){
			hud.finiBanner();
		},2500);

		setTimeout(function(){
			
			for(var p in pumps) pumps[p].isActive = true;

			hud.initBanner('Go!');
			hud.initTimer(60,finiGame);
		},4000);

		setTimeout(function(){
			hud.finiBanner();
		},5500);
	}

	function finiGame(){
		doGameComplete();
	}

	self.fini = function(){
		audio.stop('music');
		hud.fini();
		clearInterval(interval);
	}
}