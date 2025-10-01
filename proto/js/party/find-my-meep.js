window.FindMyMeepGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;

	if( !FindMyMeepGame.init ){
		FindMyMeepGame.init = true;

		$("head").append(`
			<style>
				findgame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: url(./proto/img/party/bg-village.png);
					background-size: 33.3% 100%;
				}

				findmeeps{
					display: block;
					position: absolute;
					inset: 0px;
					z-index: 1;
				}

				findcurtain{
					display: block;
					position: absolute;
					inset: 0px;
					pointer-events: none;
					z-index: 2;
				}

				findcurtain:before{
					content:"";
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
					width: 50%;
					height: 100%;
					background: url(./proto/img/party/texture-curtain.avif);
					background-size: 100% 100%;
					z-index: 1;
					transition: width 1s;
				}

				findcurtain:after{
					content:"";
					display: block;
					position: absolute;
					top: 0px;
					right: 0px;
					width: 50%;
					height: 100%;
					background: url(./proto/img/party/texture-curtain.avif);
					background-size: 100% 100%;
					z-index: 1;
					transition: width 1s;
				}

				findcurtain.open:before, findcurtain.open:after{
					width: 5%;
					transition: width 1s;
				}

				findmeep{
					position: absolute;
					display: block;
				}
			</style>`);
	}

	function FindMeep(n) {
		
		let self = this;
		self.n = n;
		self.x = 0;
		self.y = 0;

		self.dir = undefined;

		self.sx = 0;
		self.sy = 0;

		self.$el = $('<findmeep>');
		if(n==-1) self.$el.css({'pointer-events':'none'});
		self.range = {};

		let meep = new PartyMeep(n);
		meep.$el.appendTo(self.$el);

		self.initCelebration = function(){
			self.finiShuffle();
			$(self).stop(true,false);
			meep.$handLeft.animate({top:'40%'},200);
			meep.$handRight.animate({top:'40%'},200);
		}

		self.initNextMove = function(){
			self.isMoving = true;

			let xTarget = self.range.xMin + Math.random() * (self.range.xMax - self.range.xMin);
			let yTarget = self.range.yMin + Math.random() * (self.range.yMax - self.range.yMin);

			let dx = self.x - xTarget;
			let dy = self.y - yTarget;
			let dist = Math.sqrt(dx*dx+dy*dy);

			$(self).delay(500).animate({
				x:xTarget,
				y:yTarget,
			},{
				duration: dist * 5 * (1/self.speed),
				start:function(){
					self.initShuffle();
				},
				complete:function(){
					self.finiShuffle();
					self.isMoving = false;
				}
			});
		}

		self.finiShuffle = function () {
			meep.$el.stop(true,false);
			meep.$shadow.stop(true,false);
		}

		self.initShuffle = function () {
			meep.$el.animate({
				top: -10
			},{
				duration: 100,
			}).animate({
				top:0,
			},{
				duration: 100,
				complete:self.initShuffle,
			})

			meep.$shadow.animate({
				top: -10
			},{
				duration: 100,
			}).animate({
				top:-20,
			},{
				duration: 100,
			})
		}

		self.step = function(){

			if(self.speed && !self.isMoving){
				self.initNextMove();
			}

			/*if(self.speed && self.dir == undefined){
				self.dir = Math.random() * Math.PI * 2;
				self.sx = Math.cos(self.dir) * self.speed;
				self.sy = Math.sin(self.dir) * self.speed;
			}

			if(self.speed){

				self.x += self.sx;
				self.y += self.sy;

				if( self.x < self.range.xMin ) self.sx = Math.abs(self.sx);
				if( self.x > self.range.xMax ) self.sx = -Math.abs(self.sx);
				if( self.y < self.range.yMin ) self.sy = Math.abs(self.sy);
				if( self.y > self.range.yMax ) self.sy = -Math.abs(self.sy);
			}*/
		}

		self.redraw = function(){
			self.$el.css({
				'left':self.x + 'px',
				'top':self.y + 'px',
				'z-index':Math.floor(self.y),
			})
		}
	}

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-creeping.mp3',0.3,true);
	audio.add('correct','./proto/audio/party/sfx-correct.mp3',0.3);
	audio.add('complete','./proto/audio/party/sfx-correct-echo.mp3',0.3);
	audio.add('curtain','./proto/audio/party/sfx-curtain.mp3',0.3);

	let self = this;
	self.$el = $('<igb>');
	let $game = $('<findgame>').appendTo(self.$el);
	let $meeps = $('<findmeeps>').appendTo($game);
	let $curtain = $('<findcurtain>').appendTo($game);

	let hud = new PartyHUD();
	hud.$el.appendTo($game);
	//hud.initBanner('Find your Meep');

	self.players = [];
	self.scores = [];

	function step(){

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

	const ROUNDS = [
		{count:6},
		{count:12},
		{count:24},
		{count:6, speed:0.5},
		{count:12, speed:0.5},
		{count:24, speed:1},
	]
	let nRound = -1;

	let meeps = [];
	let cntCorrect = 0;

	const CENTER = [0.55, 1.5, 2.45];

	function populateLevel(){

		cntCorrect = 0;
		meeps.length = 0;

		let COUNT = ROUNDS[nRound].count;

		let order = [];
		while(order.length<self.playerCount) order.push(order.length);
		while(order.length<COUNT) order.push(-1);

		shuffleArray(order);

		let countPerWall = Math.floor(COUNT/3);

		let spacing = Math.min( (W*0.8)/countPerWall, 200 );

		for(var i=0; i<COUNT; i++){

			let nWall = Math.floor(i/countPerWall);
			let nMeep = (i%countPerWall);

			let meep = new FindMeep(order[i]);
			meep.wall = nWall;
			
			meep.$el.appendTo($meeps);
			meep.$el.attr('i',i);
			meep.x = CENTER[nWall]*W + (-(countPerWall-1)/2 + nMeep)*spacing;
			meep.y = H - 150 - i%2 * 80;
			meep.speed = ROUNDS[nRound].speed;
			
			meep.range = { 
				xMin:(CENTER[nWall]-0.35)*W,
				xMax:(CENTER[nWall]+0.35)*W,
				yMin:H - 150 - 80,
				yMax:H - 150,
			}

			meep.$el.click(onMeep);

			meeps[i] = meep;
		}
	}

	function onMeep(){

		let i = parseInt( $(this).attr('i') );
		let n = meeps[i].n;

		if(n == -1){

		} else {

			audio.play('correct',true);

			meeps[i].initCelebration();

			let nPlayer = -1;
			let nWall = meeps[i].wall
			let min = 1;
			for(var p=0; p<self.playerCount; p++){
				if( self.players[p].walls[nWall].dist < min ){
					min = self.players[p].walls[nWall].dist;
					nPlayer = p;
				}
			}

			self.scores[nPlayer]++;

			cntCorrect++;
			if(cntCorrect==self.playerCount){
				audio.play('complete',true);
				setTimeout( finiRound, 1000 );
			}
		}
	}

	function finiRound(){

		audio.play('curtain');
		$curtain.removeClass('open');

		setTimeout(function () {
			for(var m in meeps) meeps[m].$el.remove();
		},1000)

	
		if( ROUNDS[nRound+1] ) setTimeout( initRound, 2000 );
		else setTimeout( finiGame, 2000 );
	}

	function initRound(){
		nRound++;

		hud.initRound(nRound,ROUNDS.length);

		setTimeout(hud.finiBanner,2000);
		setTimeout(function(){
			populateLevel();
			hud.flashMessage(1.5,0.5,'Find your Meep',100,2000);
		},2500);

		setTimeout(function(){
			audio.play('curtain');
			$curtain.addClass('open');
		},5000);
	}

	function finiGame() {
		hud.initBanner('Finish!');
		setTimeout(function(){
			self.fini();
			window.doPartyGameComplete(self.scores);
		},2000);
	}

	function initGame(playerCount){
		audio.play('music');

		while(self.scores.length<playerCount) self.scores.push(0);

		self.playerCount = playerCount;
		setTimeout(initRound,1000);
	}

	hud.initPlayerCount(initGame);

	
	let interval = setInterval(step,1000/FPS);

	self.setPlayers = function(p){
		self.players = p;
	}

	self.fini = function(){
		clearInterval(interval);
		audio.stop('music');
	}
}
