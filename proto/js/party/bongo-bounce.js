window.BongoBounceGame = function( playersMeta ){
	
	const W = 1600;
	const H = 1000;
	const BALLR = 20;
	const RINGR = 200;
	const GRAVITY = 0.002;
	const DRUMS = 2;
	const RADRANGE = Math.PI * 0.6;
	const DRUMW = 150;
	const BOUNCE = 0.7;


	const SONGS = [
		{
			track:'./proto/audio/party/music-beats-90.mp3',
			bpm:90,
			offset:0,
			seconds:50,
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
		},{
			track:'./proto/audio/party/music-beats-120.mp3',
			bpm:120,
			offset:0,
			seconds:73,
			map:[
				{ from:2, to:14, every:4 },
				{ from:15, to:18, every:1 },
				{ from:22, to:26, every:1 },
				{ from:30, to:32, every:1 },
				{ from:36, to:64, every:1 },
				{ from:68, to:72, every:1 },
				{ from:76, to:80, every:1 },
				{ from:84, to:100, every:4 },
				{ from:101, to:124, every:1 },
				{ from:127, to:132, every:1 },
				{ from:135, to:140, every:1 },
			]
		},{
			track:'./proto/audio/party/music-beats-90-short.mp3',
			bpm:90,
			offset:0,
			seconds:42,
			map:[
			    { from:2, to:4, every:2 },
			    { from:8, to:16, every:2 },
			    { from:22, to:32, every:2 },
			    { from:34, to:46, every:1 },
			    { from:50, to:52, every:2 },
			    { from:56, to:56, every:1 }
			]
		},{
			track:'./proto/audio/party/music-beats-120-short.mp3',
			bpm:120,
			offset:0,
			seconds:42,
			map:[
				{ from:2, to:14, every:4 },
				{ from:15, to:18, every:1 },
				{ from:22, to:26, every:1 },
				{ from:30, to:32, every:1 },
				{ from:36, to:64, every:1 },
				{ from:68, to:72, every:1 },
				{ from:76, to:80, every:1 },
			]
		}
	]

	for(var s in SONGS){
		SONGS[s].bps = SONGS[s].bpm / 60;
 
		SONGS[s].beats = [];
		for(var m in SONGS[s].map){
			for(var i=SONGS[s].map[m].from; i<=SONGS[s].map[m].to; i+=SONGS[s].map[m].every){
				SONGS[s].beats.push({beat:i, lerp:2, nDrum:Math.floor( Math.random()*DRUMS )});
			}
		}
	}

	const STRUCTURE = [
		undefined,
		undefined,
		[
			[{players:[0,1], song:SONGS[0]}],
			[{players:[0,1], song:SONGS[1]}],
		],
		[
			[{players:[0,1,2], song:SONGS[0]}],
			[{players:[0,1,2], song:SONGS[1]}],
		],
		[
			[{players:[0,1], song:SONGS[2]},{players:[2,3], song:SONGS[2]}],
			[{players:[0,1], song:SONGS[3]},{players:[2,3], song:SONGS[3]}],
		],
		[
			[{players:[0,1,2], song:SONGS[2]},{players:[3,4], song:SONGS[2]}],
			[{players:[0,1,2], song:SONGS[3]},{players:[3,4], song:SONGS[3]}],
		],
		[
			[{players:[0,1,2], song:SONGS[2]},{players:[3,4,5], song:SONGS[2]}],
			[{players:[0,1,2], song:SONGS[3]},{players:[3,4,5], song:SONGS[3]}],
		],
	]

	let DrumMeep = function(n,ax){
		let self = this;
		self.$el = $('<drummeep>');

		self.score = 0;
		self.ax = ax;
		self.px = 0;
		self.ox = 0;

		let $score = $('<drumscore>').appendTo(self.$el).text(0);

		let $ring = $('<drumring>').appendTo(self.$el);

		let $arms =  $('<drumarms>').appendTo($ring);


		let meep = new PartyMeep(n);
		meep.setHeight(350);
		meep.$handLeft.hide();
		meep.$handRight.hide();
		meep.$el.appendTo(self.$el);
		meep.$el.css({
			top:400,
		})

		let $drums = [];
		for(var i=0; i<DRUMS; i++){

			let r = RADRANGE/DRUMS * (i-((DRUMS-1)/2)) - (Math.PI/2);

			$drums[i] = $('<drumdrum>').appendTo($ring).css({
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

			for(var d=0; d<$drums.length; d++){
				let r = RADRANGE/DRUMS * (d-((DRUMS-1)/2)) - (Math.PI/2);

				let p = 1-(self.ox + 1)/2;
				let pDrum = d * 1/($drums.length-1);
				let pDist = pDrum-p;


				$drums[d].css({
					transform: 'rotate('+(r - pDist*0.8)+'rad)'
				})
			}

			self.$el.css({
				left: W + self.ax * W + 'px',
			})
		}

		self.doCorrect = function(b){
			if(b) self.score ++;
			$score.text(b?'+1':'Oops!').css({opacity:0.5}).delay(100).animate({opacity:0});
		}
		
	}

	let DrumBall = function(map,meep){

		let self = this;
		let nDrum = map.nDrum;
		self.$el = $(`<drumball n=${nDrum}>`);

		let audio = new AudioPlayer();
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

	if( !BongoBounceGame.init ){
		BongoBounceGame.init = true;

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
					background: linear-gradient(to bottom, #be8445, transparent);
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

				drumarms{
					display: block;
					position: absolute;
					width: ${RINGR}px;
					height: ${RINGR}px;
					left: ${-RINGR/2}px;
					bottom: -30px;
					
					border-radius: 0px 0px 100% 100%;
					border: 20px solid white;
					border-top: none;
					box-sizing: border-box;
				}

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

				drumgametutorial{
					display: block;
					position: absolute;
					inset: 0px;
				}

			</style>`);
	}

	let self = this;
	let timeout = undefined;

	self.$el = $('<igb>');
	let $game = $('<drumgame>').appendTo(self.$el);
	let $blur = $('<blurlayer>').appendTo($game);
	let $tutorial = $('<drumgametutorial>').appendTo($game);

	let hud = new PartyHUD();
	hud.$el.appendTo($game);

	let audio = new AudioPlayer();

	function step(){

		for(var m in meeps) meeps[m].update();

		let beat = 0;

		if(round){
			let timeCurrent = audio.getTime( round.song.track );
			beat = (timeCurrent-round.song.offset) * round.song.bps;
		} else if( isTutorial ){
			let time = new Date().getTime();
			let timeElapsed = time - timeStartTutorial;
			beat = timeElapsed/1000;
		}
			
		for(var b in balls) balls[b].step(beat);
		for(var b in balls) balls[b].update();
		
		hud.updatePlayers(meeps);

		resize();
	}

	let nCohort = -1;
	let nRound = -1;
	let round;

	function initNextRound(){

		let isNewRound = false;
		nCohort++;

		if( !STRUCTURE[meeps.length][nRound] || !STRUCTURE[meeps.length][nRound][nCohort] ){
			nCohort = 0;
			nRound++;
			isNewRound = true;
		}

		round = STRUCTURE[meeps.length][nRound][nCohort];

		audio.add(
			round.song.track,
			round.song.track,
			1);

		for(var p=0; p<round.players.length; p++){
			let m = round.players[p];
			meeps[m].ax = 0.22 + (1/(round.players.length-1) * p) * 0.56;
			meeps[m].$el.css({
				opacity:1,
				transform: 'scale(1)',
				top:'110%',
			}).animate({top:'65%'}).animate({top:'70%'});
		}

		setTimeout(function(){
			hud.summonPlayers(round.players);
		},1000);
		
		
		setTimeout(function(argument) {
			hud.finiBanner();
		},3000);

		if(isNewRound){
			setTimeout(function(argument) {
				hud.initRound(nRound,STRUCTURE[meeps.length].length);
				hud.revealTimer(round.song.seconds);
			},4000);

			setTimeout(function(argument) {
				hud.finiBanner();
			},6000);

			setTimeout(function(argument) {
				initRound();
			},7000);
		} else {
			setTimeout(function(argument) {
				hud.revealTimer(round.song.seconds);
			},3000);
			setTimeout(initRound, 4000);
		}
	}

	let balls = [];
	function initRound(){
		audio.play(round.song.track);

		for(var b in round.song.beats){

			let m =  round.players[b%round.players.length];

			balls[b] = new DrumBall(
				round.song.beats[b],
				meeps[m]
			);

			//balls[b].$el.css({left:'50%'});
			balls[b].$el.appendTo($game);
			balls[b].step(0);
			balls[b].update();
		}

		hud.initTimer(round.song.seconds,finiRound);
	}

	function finiRound(){
		//ball.$el.remove();
		iTimeout = setTimeout( initRound, 1000 );
	}

	let meeps = [];
	function initGame(COUNT=3){

		for(var i=0; i<COUNT; i++){
			meeps[i] = new DrumMeep(i);
			meeps[i].$el.appendTo($game);
			meeps[i].$el.css({
				'top':'110%',
			})
		}

		initTutorial();
	}

	let isTutorial = false;
	function initTutorial(){

		isTutorial = true;
		timeStartTutorial = new Date().getTime();

		hud.initTutorial(
			'Bongo Bounce',
			{x:1.22, y:0.5, msg:'Align yourself<br>with your Avatar', icon:'align'},
			{x:1.7, y:0.5, msg:'Move side-to-side to bounce<br>the black and white balls', icon:'side-to-side'},
		);

		for(var m=0; m<meeps.length; m++){
			meeps[m].ax = 0.22 + (1/(meeps.length-1) * m) * 0.56;
			meeps[m].$el.css({'transform':'scale(0.5)', top:'70%'});
		}

		for(var i=0; i<20; i++){
			balls[i] = new DrumBall(
				{beat:10+i, lerp:2, nDrum:Math.floor( Math.random()*DRUMS )},
				meeps[i%meeps.length]
			);

			balls[i].$el.appendTo($game);
			balls[i].step(0);
			balls[i].update();
		}
		

			//balls[b].$el.css({left:'50%'});
			
			

		hud.initTimer(30,finiTutorial);
	}

	function finiTutorial() {

		$blur.hide();

		isTutorial = false;
		hud.finiTimer();
		hud.finiTutorial();

		$tutorial.animate({opacity:0});

		for(var m in meeps ){
			meeps[m].$el.animate({opacity:0});
			meeps[m].score = 0;
		}

		setTimeout(initPlay,2000);
	}

	function initPlay(){
		hud.initPlayers(meeps);

		setTimeout(initNextRound,1000);
	}

	function finiRound() {

		hud.finiTimer();
		
		for(var p=0; p<round.players.length; p++){
			let m = round.players[p];
			meeps[m].$el.animate({top:'65%'}).animate({top:'110%'});
		}

		setTimeout(function(){
			hud.finiBanner();
		},2000);

		if( STRUCTURE[meeps.length][nRound][nCohort+1] || STRUCTURE[meeps.length][nRound+1] ){
			hud.initBanner('Nice one!');
			setTimeout(initNextRound,3000);
		} else {
			hud.initBanner('Finish!');
			setTimeout(initFinalScores,2000);
		}
	}

	function initFinalScores(){

		$tutorial.animate({opacity:1});

		let scores = [];
		for(var m in meeps) scores[m] = meeps[m].score;

		let rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores,rewards);

		setTimeout(function(){
			window.doPartyGameComplete(rewards);
			self.fini();
		},3000);
	}

	if( playersMeta ) setTimeout( function(){ initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

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

	self.fini = function(){
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	}
}