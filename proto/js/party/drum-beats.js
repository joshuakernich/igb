window.DrumBeatsGame = function(){
	
	const W = 1600;
	const H = 1000;
	const BALLR = 60;
	const GRAVITY = 1;

	const SONG = {
		track:'./proto/audio/party/music-beats.mp3',
		bpm:90,
		offset:0,
		map:[
			{ from:2, to:8, every:2 },
			{ from:12, to:14, every:1 },
			{ from:18, to:20, every:1 },
			{ from:24, to:32, every:2 },

			{ from:38, to:48, every:2 },
			{ from:50, to:62, every:1 },
			{ from:66, to:68, every:2 },
			{ from:72, to:72, every:1 },
		]
	}

	let bps = SONG.bpm / 60;

	let beats = [];
	for(var m in SONG.map){
		for(var i=SONG.map[m].from; i<=SONG.map[m].to; i+=SONG.map[m].every){
			beats.push({beat:i, lerp:2});
		}
	}

	console.log(beats);

	let BeatBall = function(map){

		let self = this;
		self.$el = $('<drumbeatsball>');

		let $shadow = $('<drumbeatsshadow>').appendTo(self.$el);
		let $ball = $('<drumbeatssphere>').appendTo(self.$el);

		self.px = 0.5;
		self.py = 0;

		self.step = function(beat){
			let pos = (beat - map.beat);
			self.py = (pos/map.lerp);
			self.px = 0.5-self.py;
			if(self.py>0){
				self.py = -self.py;
			}
		}

		self.update = function(){

			self.$el.css({
				left: W + W*self.px + 'px',
			});

			$ball.css({
				top: (self.py*H - BALLR) + 'px',
			});

			$shadow.css({
				opacity: Math.min( 1, 1+self.py ),
			});
		}
	}

	if( !DrumBeatsGame.init ){
		DrumBeatsGame.init = true;

		$("head").append(`
			<style>
				@import url('https://fonts.googleapis.com/css2?family=Paytone+One&display=swap');

				drumbeatsgame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: url(./proto/img/party/bg-stadium.jpg);
					background-size: 100%;
					background-position: bottom center;
					font-family: "Paytone One";
					color: white;
				}

				drumbeatsball{
					display: block;
					position: absolute;
					top: 0px;
				}

				drumbeatsshadow{
					display: block;
					position: absolute;
					width: ${BALLR*2}px;
					height: ${BALLR*2*0.25}px;
					background: black;
					transform: translate(-50%,-50%);
					border-radius: 100%;
					opacity: 0.5;
				}

				drumbeatssphere{
					display: block;
					position: absolute;
					width: ${BALLR*2}px;
					height: ${BALLR*2}px;
					background: white;
					transform: translate(-50%,-50%);
					border-radius: 100%;
					top: ${-BALLR}px;
					left: 0px;
				}

				headersline{
					width: 40px;
					height: 400px;
					display: block;
					position: absolute;
					left: 50%;
					transform: translateX(-50%);
					background: linear-gradient(to top, white, transparent);
					bottom: 0px;
				}

				headersscore{
					display: block;
					position: absolute;
					top: 10%;
					width: ${W/2}px;
					left: ${W}px;
					font-size: 150px;
					text-align: center;
					opacity: 0.2;
				}

				headersscore:last-of-type{
					left: ${W*1.5}px;
				}

			</style>`);
	}

	let self = this;
	let timeout = undefined;

	self.$el = $('<igb>');
	let $game = $('<drumbeatsgame>').appendTo(self.$el);

	let hud = new PartyHUD();
	hud.$el.appendTo($game);

	let audio = new AudioContext()
	audio.add('track',SONG.track,1);

	function step(){
		let timeCurrent = audio.getTime('track');
		let beat = (timeCurrent-SONG.offset) * bps;
		for(var b in balls) balls[b].step(beat);
		for(var b in balls) balls[b].update();
		resize();
	}

	let balls = [];
	function initRound(){
		audio.play('track');

		for(var b in beats){
			balls[b] = new BeatBall(beats[b]);
			balls[b].$el.css({left:'50%',top:'80%'});
			balls[b].$el.appendTo($game);
			//balls[b].update();
		}
	}

	function finiRound(){
		//ball.$el.remove();
		iTimeout = setTimeout( initRound, 1000 );
	}

	let meeps = [];
	function initGame(COUNT=3){
		for(var i=0; i<COUNT; i++){
			meeps[i] = new PartyMeep(i);
			meeps[i].$score = $('<beatscore>').appendTo($game).text(0);
			meeps[i].$el.appendTo($game);
			meeps[i].$el.css({
				'top':'80%',
				'left':W + (W*i/COUNT)+'%',
			});
		}
	}

	function finiGame() {
		clearTimeout(iTimeout);
		hud.initBanner('Finish!');
		setTimeout(function(){
			let scores = [];
			for(var m in meeps) scores[m] = meeps[m].score;
			window.doPartyGameComplete(scores);
		})
	}

	function initIntro(){
		initGame();
		hud.initBanner('Ready!');
		setTimeout(hud.finiBanner,2000);
		setTimeout(initRound,5000);
	}

	initIntro();

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	const FPS = 50;
	let interval = setInterval(step,1000/FPS);

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].px = p[m].px;
			meeps[m].py = p[m].py;
			meeps[m].r =  {W:p[m].rW, X:p[m].rX, Y:p[m].rY, Z:p[m].rZ};
		}
	}
}