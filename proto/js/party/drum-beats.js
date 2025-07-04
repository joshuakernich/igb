window.DrumBeatsGame = function(){
	
	const W = 1600;
	const H = 1000;
	const BALLR = 20;
	const RINGR = 200;
	const GRAVITY = 0.002;
	const DRUMS = 2;
	const RADRANGE = Math.PI * 0.6;
	const DRUMW = 150;
	const BOUNCE = 0.7;

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

	let DrumMeep = function(n,ax){
		let self = this;
		self.$el = $('<drummeep>').css({
			left: W + ax * W + 'px',
		})

		self.score = 0;
		self.ax = ax;
		self.px = 0;
		self.ox = 0;

		let $score = $('<drumscore>').appendTo(self.$el).text(0);

		let $ring = $('<drumring>').appendTo(self.$el);

		let $armRight = $('<drumarm>').appendTo($ring).css({
			transform: 'rotate('+(-Math.PI/2 + RADRANGE/2 - 0.1)+'rad)'
		})

		let $armLeft = $('<drumarm>').appendTo($ring).css({
			transform: 'rotate('+(-Math.PI/2 - RADRANGE/2 + 0.1)+'rad)'
		})

		let meep = new PartyMeep(n);
		meep.setHeight(350);
		meep.$handLeft.hide();
		meep.$handRight.hide();
		meep.$el.appendTo(self.$el);
		meep.$el.css({
			top:400,
		})

		for(var i=0; i<DRUMS; i++){

			let r = RADRANGE/DRUMS * (i-((DRUMS-1)/2)) - (Math.PI/2);

			$('<drumdrum>').appendTo($ring).css({
				transform:'rotate('+r+'rad)',
				left: Math.cos(r) * RINGR + 'px',
				top: Math.sin(r) * RINGR + 'px',
			}).attr('color',i==0?'black':'white');
		}

		self.update = function(){
			self.ox = ( self.px - self.ax ) * 12;

			if(self.ox<-1) self.ox = -1;
			if(self.ox>1) self.ox = 1;

			$ring.css({
				transform:'rotate('+self.ox*(RADRANGE/4)+'rad)',
			})

			meep.$head.css({
				'left':-50 + self.ox*20+'px',
				'top':'20px',
				transform:'rotate('+self.ox*(RADRANGE/8)+'rad)',
			})
		}

		self.doCorrect = function(b){
			if(b) self.score ++;
			$score.text(b?'+'+self.score:'Oops!').css({opacity:0.5}).delay(100).animate({opacity:0});
		}
		
	}

	let DrumBall = function(map,nDrum,meep){

		let self = this;
		self.$el = $(`<drumball n=${nDrum}>`);

		let audio = new AudioContext();
		audio.add('correct','./proto/audio/party/sfx-drum-big.mp3',0.5);
		audio.add('fail','./proto/audio/party/sfx-knock.mp3',0.5);

		let $shadow = $('<drumshadow>').appendTo(self.$el);
		let $ball = $('<drumsphere>').appendTo(self.$el);

		let bHit = false;

		self.px = meep.ax;
		self.py = 0;

		self.sx = 0;
		self.sy = 0;

		self.step = function(beat){
			let pos = (beat - map.beat);

			if(!bHit) self.py = (pos/map.lerp);

			if(self.py>0 && !bHit){
				bHit = true;

				let nSelect = (meep.ox>0)?0:1;

				self.sy = -0.03;
				self.sx = nSelect?0.003:-0.003;
				$shadow.hide();

				let bCorrect = (nDrum == nSelect);
				audio.play(bCorrect?'correct':'fail',true);

				meep.doCorrect(bCorrect);
			}

			if(bHit){
				self.sy += GRAVITY;
				self.px += self.sx;
				self.py += self.sy;
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

				drumgame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: url(./proto/img/party/bg-village.png);
					background-size: 33.3% 100%;
					background-position: bottom center;
					font-family: "Paytone One";
					color: white;
				}

				drumgame:before{
					content:"";
					display:block;
					position: absolute;
					inset: 0px;
					background: linear-gradient(to bottom, #276F7A, transparent);
				}

				drumscore{
					display: block;
					position: absolute;
					bottom: ${RINGR/2}px;
					width: ${W}px;
					left: ${-W/2}px;
					font-size: 100px;
					text-align: center;
					opacity: 0;
				}

				drumball{
					display: block;
					position: absolute;
					top: 0px;
					top: ${H*BOUNCE}px;
				}

				drumshadow{
					display: block;
					position: absolute;
					width: ${BALLR*2}px;
					height: ${BALLR*2*0.25}px;
					background: black;
					transform: translate(-50%,-50%);
					border-radius: 100%;
					opacity: 0.5;
				}

				drumsphere{
					display: block;
					position: absolute;
					width: ${BALLR*2}px;
					height: ${BALLR*2}px;
					background: white;
					transform: translate(-50%,-50%);
					border-radius: 100%;
					top: ${-BALLR}px;
					left: 0px;

					box-shadow: inset 0px -2px 5px black, inset 0px 2px 0px rgba(255,255,255,0.7);
				}

				drumball[n='0'] drumsphere{ background:#333; }
				drumball[n='1'] drumsphere{ background:#eee; }

				drumarm{
					display: block;
					position: absolute;
				}

				drumarm:before{
					content:"";
					display: block;
					position: absolute;
					width: ${RINGR-DRUMW/2}px;
					height: ${RINGR/2}px;
					top: ${-RINGR/4}px;
					left: 0px;
					box-sizing: border-box;
					border-bottom: 20px solid white;
					border-radius: 100%;
				}

				drumarm:last-of-type:before{
					border-top: 20px solid white;
					border-bottom: none;
				}

				drumarm:after{
					content:"";
					display: block;
					position: absolute;
					width: 30px;
					height: 30px;
					background: white;
					border-radius: 100%;
					left: ${RINGR-DRUMW/2}px;
					top: -15px;
				}

				drumdrum{
					display: block;
					position: absolute;
				}

				drumdrum:after{
					content:"";
					width: 30px;
					height: ${DRUMW}px;
					position: absolute;
					background: white;
					left: -10px;
					top:  ${-DRUMW/2}px;
					display: block;
					border-radius: 100%;
					box-shadow: -5px 0px #999;
					box-shadow: inset 0px 0px 5px black, -10px 0px rgba(0,0,0,0.3);
					box-sizing: border-box;
				}

				drumdrum:before{
					content: "";
					display: block;
					position: absolute;
					width:  ${DRUMW/2}px;
					height:  ${DRUMW}px;
					top: ${-DRUMW/2}px;
					left: ${-DRUMW/2}px;
					background: #eee;
					box-sizing: border-box;
					
					border-radius: 100%  20px 20px 100%;
					box-shadow: inset 0px 0px 10px black;

				}

				drumdrum[color='black']:before{
					background: #333;
				}

				drumdrum[color='black']:after{
					background: #333;
				}

				drummeep{
					display:block;
					position: absolute;
					top: ${H*BOUNCE}px;
				}

				drumring{
					box-sizing: border-box;
					display: block;
					position: absolute;
					top: ${RINGR}px;
					left: 0px;
				}

				drumring:before{
					content:"";
					width: ${RINGR*2}px;
					height: ${RINGR*2}px;
					position: absolute;
					background: red;
					left: -${RINGR}px;
					top: -${RINGR}px;
					border-radius: 100%;
					display: none;
				}

			</style>`);
	}

	let self = this;
	let timeout = undefined;

	self.$el = $('<igb>');
	let $game = $('<drumgame>').appendTo(self.$el);

	let hud = new PartyHUD();
	hud.$el.appendTo($game);

	let audio = new AudioContext()
	audio.add('track',SONG.track,1);

	function step(){

		for(var m in meeps) meeps[m].update();

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
			balls[b] = new DrumBall(beats[b],b%DRUMS,meeps[b%meeps.length]);
			balls[b].$el.css({left:'50%'});
			balls[b].$el.appendTo($game);
			balls[b].step(0);
			balls[b].update();
		}



		hud.initTimer(50,finiGame);
	}

	function finiRound(){
		//ball.$el.remove();
		iTimeout = setTimeout( initRound, 1000 );
	}

	let meeps = [];
	function initGame(COUNT=3){
		for(var i=0; i<COUNT; i++){
			meeps[i] = new DrumMeep(i,1/(COUNT+1) * (i+1));
			meeps[i].$el.appendTo($game);
			meeps[i].$el.css({
				'top':'70%',
			});
		}
	}

	function finiGame() {
		hud.initBanner('Finish!');
		setTimeout(function(){
			let scores = [];
			for(var m in meeps) scores[m] = meeps[m].score;
			window.doPartyGameComplete(scores);
		},2000);
	}

	function initIntro(COUNT){
		initGame(COUNT);
		setTimeout(function(){
			hud.initBanner('Ready!');
		},2000);
		setTimeout(hud.finiBanner,4000);
		setTimeout(initRound,6000);
	}

	hud.initPlayerCount(initIntro);

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