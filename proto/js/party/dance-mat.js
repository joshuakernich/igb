window.DanceMatGame = function( playersMeta ){
	
	const W = 1600;
	const H = 1000;
	const BALLR = 20;
	const GRIDSIZE = 120;
	const RINGR = 200;
	const GRAVITY = 0.002;
	const DRUMS = 4;
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

	let DanceMeep = function(n,ax){
		let self = this;
		self.$el = $('<dancemeep>');

		self.n = n;
		self.score = 0;
		self.ax = ax;
		self.px = 0;
		self.ox = 0;

		let $score = $('<dancescore>').appendTo(self.$el).text(0);

		let $ring = $('<dancering>').appendTo(self.$el);



		let meep = new PartyMeep(n);
		meep.setHeight(250);
		meep.$eyes.hide();
		meep.$mouth.hide();
		meep.$el.appendTo(self.$el);
		meep.$el.css({
			top:0,
		})

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

			let x = self.wall==1?self.px:self.pz;
			let z = self.wall==1?(1-self.pz):self.px;

			if(self.wall==2){
				x = 1-x;
				z = 1-z;
			}

			self.$el.css({
				left: W*self.wall + x * W + 'px',
				top: z * H + 'px',
			})
		}

		self.doCorrect = function(b){
			if(b) self.score ++;
			$score.text(b?'+1':'Oops!').css({opacity:0.5}).delay(100).animate({opacity:0});
		}
		
	}

	let DanceBall = function(map,hotspot,meep){

		let self = this;
		let nDrum = map.nDrum;
		self.$el = $(`<danceball n=${nDrum}>`);

		let audio = new AudioPlayer();
		audio.add('correct','./proto/audio/party/sfx-correct.mp3',0.2);
		audio.add('fail','./proto/audio/party/sfx-knock.mp3',0.5);

		
		let $pad = $('<dancepad>').appendTo(self.$el).attr('n',meep.n)
		let $arrow = $('<dancearrow>').appendTo(self.$el).attr('n',meep.n).attr('dir',nDrum);
		let $ball = $('<dancearrow>').appendTo(self.$el).attr('n',meep.n).attr('dir',nDrum);

		let bHit = false;

		self.ax = hotspot.x;
		self.ay = hotspot.y;

		self.px = hotspot.x;
		self.py = 0;

		self.sx = 0;
		self.sy = 0;

		self.step = function(beat){
			let pos = (beat - map.beat);

			if(pos>-4 && pos<0) meep.wall = hotspot.wall;

			if(!bHit) self.py = (pos/map.lerp);

			if(self.py>0 && !bHit){
				bHit = true;

				let nSelect = (meep.ox>0)?0:1;

				self.sy = -0.03;
				self.sx = nSelect?0.003:-0.003;
				
				let bCorrect = (nDrum == nSelect);
				bCorrect = true;
				audio.play(bCorrect?'correct':'fail',true);
				meep.doCorrect(bCorrect);
			}

			if(bHit){
				self.sy += GRAVITY;
				self.px += self.sx;
				self.py += self.sy;

				self.$el.remove();
			}
		}

		self.update = function(){

			if(bHit) return;

			self.$el.css({
				left: hotspot.wall*W + W*hotspot.x + 'px',
				top: H*self.ay + 'px',
			});

			$ball.css({
				top: (self.py*H - BALLR) + 'px',
			});

			$arrow.css({
				opacity: Math.min( 1, 1+self.py ),
			});

			$pad.css({
				opacity: 4+self.py,
			})
		}
	}

	if( !DanceMatGame.init ){
		DanceMatGame.init = true;

		$("head").append(`
			<style>
				@import url('https://fonts.googleapis.com/css2?family=Paytone+One&display=swap');

				dancegame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					
					
					font-family: "Paytone One";
					color: white;
				}

				dancebg{
					display: inline-block;
					width: ${W}px;
					height: ${H}px;
					background: url(./proto/img/bg-kpop-stage.png);
					background-size: 160% 130%;
					background-position: top center;
				}

				dancegame:before{
					content:"";
					display:block;
					position: absolute;
					inset: 0px;
					
				}

				dancescore{
					display: block;
					position: absolute;
					bottom: ${RINGR/2}px;
					width: ${W}px;
					left: ${-W/2}px;
					font-size: 100px;
					text-align: center;
					opacity: 0;
				}

				danceball{
					display: block;
					position: absolute;
					top: 0px;
					top: ${H*BOUNCE}px;
				}

				dancearrow{
					display: block;
					position: absolute;
					width: ${GRIDSIZE}px;
					height: ${GRIDSIZE}px;
					background: red;
					transform-origin: center;
					transform: translate(-50%,-50%);
					border-radius: 100%;
					line-height: ${GRIDSIZE}px;
					font-weight: bold;
					font-size: ${GRIDSIZE*0.8}px;
					color: white;
					text-align: center;
				}

				dancepad{
					display: block;
					position: absolute;
					width: ${GRIDSIZE*0.8}px;
					height: ${GRIDSIZE*0.8}px;
					border: 10px solid red;

					transform: translate(-50%,-50%) scaleY(0.8);
					transform-origin: center;
					border-radius: 100%;

					text-align: center;
					box-sizing: border-box;
				}

				dancepad[n='0']{ border-color:red; }
				dancepad[n='1']{ border-color:blue; }
				dancepad[n='2']{ border-color:limegreen; }
				dancepad[n='3']{ border-color:pink; }

				dancearrow[n='0']{ background:red; }
				dancearrow[n='1']{ background:blue; }
				dancearrow[n='2']{ background:limegreen; }
				dancearrow[n='3']{ background:pink; }

				dancearrow[dir='0']{	transform: translate(${-GRIDSIZE*0.5}px,${-GRIDSIZE*1.5}px) scaleY(0.8);	}
				dancearrow[dir='1']{	transform: translate(${GRIDSIZE*0.5}px,${-GRIDSIZE*0.5}px) scaleY(0.8);		}
				dancearrow[dir='2']{	transform: translate(${-GRIDSIZE*0.5}px,${GRIDSIZE*0.5}px) scaleY(0.8);		}
				dancearrow[dir='3']{	transform: translate(${-GRIDSIZE*1.5}px,${-GRIDSIZE*0.5}px) scaleY(0.8);	}

				dancearrow[dir='0']:after{	content:"↑";	}
				dancearrow[dir='1']:after{	content:"→";	}
				dancearrow[dir='2']:after{	content:"↓";	}
				dancearrow[dir='3']:after{	content:"←";	}

				danceshadow{
					display: block;
					position: absolute;
					width: ${BALLR*2}px;
					height: ${BALLR*2*0.25}px;
					background: black;
					transform: translate(-50%,-50%);
					border-radius: 100%;
					opacity: 0.5;
				}

				dancesphere{
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

				danceball[n='0'] dancesphere{ background:#333; }
				danceball[n='1'] dancesphere{ background:#eee; }

				

				dancemeep{
					display:block;
					position: absolute;
					top: ${H*BOUNCE}px;
				}

				dancering{
					box-sizing: border-box;
					display: block;
					position: absolute;
					top: ${RINGR}px;
					left: 0px;
				}

				dancering:before{
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

				dancegametutorial{
					display: block;
					position: absolute;
					inset: 0px;
				}

			</style>`);
	}

	let self = this;
	let timeout = undefined;

	self.$el = $('<igb>');
	let $game = $('<dancegame>').appendTo(self.$el);
	for(var i=0; i<3; i++ ) $('<dancebg>').appendTo($game);
	
	let $tutorial = $('<dancegametutorial>').appendTo($game);

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
			meeps[m].ax = 0.3 + (1/(round.players.length-1) * p) * 0.4;
			meeps[m].$el.css({
				opacity:1,
				transform: 'scale(0.6)',
			});
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

		let hotspots = [
			{wall:0,x:0.3,y:0.7},
			{wall:0,x:0.5,y:0.5},
			{wall:0,x:0.7,y:0.7},
			{wall:1,x:0.3,y:0.5},
			{wall:1,x:0.5,y:0.7},
			{wall:1,x:0.7,y:0.5},
			{wall:2,x:0.3,y:0.5},
			{wall:2,x:0.5,y:0.7},
			{wall:2,x:0.7,y:0.5},
		]

		let sequence = [
			[3,4,5],
			[1,2,0],
			[6,7,8],
			[0,3,6],
		]


		for(var b=0; b<round.song.beats.length; b++){

			let m = round.players[b%round.players.length];


			let nSequence = Math.floor( (b/round.song.beats.length) * sequence.length );

			let hotspot = hotspots[sequence[nSequence][m]];


			balls[b] = new DanceBall(
				round.song.beats[b],
				hotspot,
				meeps[m],
			);

			//balls[b].$el.css({left:'50%'});
			balls[b].$el.appendTo($game);
			balls[b].step(0);
			balls[b].update();
		}

		for(var m in meeps) meeps[m].$el.appendTo($game);

		hud.initTimer(round.song.seconds,finiRound);
	}

	function finiRound(){
		//ball.$el.remove();
		iTimeout = setTimeout( initRound, 1000 );
	}

	let meeps = [];
	function initGame(COUNT=3){

		for(var i=0; i<COUNT; i++){
			meeps[i] = new DanceMeep(i);
			meeps[i].$el.appendTo($game);
			/*meeps[i].$el.css({
				'top':'110%',
			})*/
		}

		initNextRound();
	}

	let isTutorial = false;
	

	function initPlay(){
		hud.initPlayers(meeps);

		setTimeout(initNextRound,1000);
	}

	function finiRound() {

		hud.finiTimer();
		
		for(var p=0; p<round.players.length; p++){
			let m = round.players[p];
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



		let scores = [];
		for(var m in meeps) scores[m] = meeps[m].score;

		let rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores,rewards);

		setTimeout(function(){
			window.doPartyGameComplete(rewards);
			self.fini();
		},3000);
	}

	//if( playersMeta ) setTimeout( function(){ initGame(playersMeta.length); });
	//else hud.initPlayerCount(initGame);

	hud.initPlayerCount(initGame);

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
			meeps[m].pz = p[m].pz;
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