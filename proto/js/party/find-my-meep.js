window.FindMyMeepGame = function( playersMeta ){

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

				findcurtain.ajar:before, findcurtain.ajar:after{
					width: 36%;
					transition: width 1s;
				}

				findmeep{
					position: absolute;
					display: block;
				}

				findscore{
					display: block;
					position: absolute;
					bottom: 350px;
					font-size: 70px;
					line-height: 140px;
					color: white;
					left: -100px;
					right: -100px;
					text-align: center;
				}

				finditem{
					display: block;
					position: absolute;
					background: url(./proto/img/party/actor-animals.png);
					background-size: 600%;	
					width: 300px;
					height: 300px;
					bottom: 50px;
					left: -250px;
				}

				findobstacle{
					display: block;
					position: absolute;
					width: ${W/4}px;
					height: ${H}px;
					background-size: 100%;
					background-position: bottom center;
					background-repeat: no-repeat;
					background-image: url(./proto/img/party/actor-tree.png);
					transform: translate(-50%, -100%);
					pointer-events: none;
				}	

				findobstacle.boulder{
					background-image: url(./proto/img/party/actor-boulder.png);
				}	

			</style>`);
	}

	function FindObstacle(n,x,y){
		let self = this;
		self.$el = $('<findobstacle>');

		if(n==1) self.$el.addClass('boulder');

		self.$el.css({
			'left':x + 'px',
			'top':y + 'px',
			'z-index':Math.floor(y),
		});
	}

	function FindMeep(n) {
		
		let self = this;
		self.n = n;
		self.x = 0;
		self.y = 0;

		self.dir = undefined;

		self.sx = 0;
		self.sy = 0;
		self.sequence = [];

		self.$el = $('<findmeep>');

		let $score = $('<findscore>').appendTo(self.$el);

		if(n==-1) self.$el.css({'pointer-events':'none'});
		self.range = {};

		let ducking = {h:350};

		let meep = new PartyMeep(n);
		meep.$el.appendTo(self.$el);

		self.$el.click(function(){
			if(self.callback) self.callback(self);
		});

		self.initCelebration = function(){
			self.finiShuffle();
			$(self).stop(true,false);
			meep.$handLeft.animate({top:'40%'},200);
			meep.$handRight.animate({top:'40%'},200);

			self.$el.css({
				'pointer-events':'none',
			})

			self.setDucking(false);
		}

		self.reset = function(){
			self.isMoving = false;
			meep.$handLeft.animate({top:'60%'},200);
			meep.$handRight.animate({top:'60%'},200);

			self.$el.css({
				'pointer-events':'auto',
			})
		}

		self.initNextMove = function(){
			self.isMoving = true;

			let xTarget = self.range.xMin + Math.random() * (self.range.xMax - self.range.xMin);
			let yTarget = self.range.yMin + Math.random() * (self.range.yMax - self.range.yMin);


			let dx = self.x - xTarget;
			let dy = self.y - yTarget;
			let dist = Math.sqrt(dx*dx+dy*dy);

			$(self).delay(self.isDucking?1000:500).animate({
				x:xTarget,
				y:yTarget,
			},{
				duration: dist * 5 * (1/self.speed),
				start:function(){
					self.initShuffle();
					if(self.isDucking) self.setDucking(false);
				},
				complete:function(){
					self.finiShuffle();
					self.isMoving = false;
					if(self.isDucking) self.setDucking(true);
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
		}

		self.redraw = function(){
			self.$el.css({
				'left':self.x + 'px',
				'top':self.y + 'px',
				'z-index':Math.floor(self.y),
			});

			meep.setHeight(ducking.h);
		}

		self.setScore = function(score) {
			$score.text('+'+score).css({bottom:300}).animate({bottom:350},200);
		}

		self.setDucking = function(b){
			$(ducking).animate({h:b?250:350});
		}


		self.addCarryItem = function(nItem){
			meep.$handLeft.css({left:'-120px',top:'50%'});
			meep.$handRight.css({left:'-30px',top:'65%'});

			let item = $('<finditem>').css({
				'background-position-x':-nItem*100+'%',
			})
			item.appendTo(self.$el);
		}
	}

	let audio = new AudioPlayer();
	audio.add('music','./proto/audio/party/music-run.mp3',0.3,true);
	audio.add('correct','./proto/audio/party/sfx-correct.mp3',0.3);
	audio.add('complete','./proto/audio/party/sfx-correct-echo.mp3',0.3);
	audio.add('curtain','./proto/audio/party/sfx-curtain.mp3',0.3);
	audio.add('yay','./proto/audio/party/sfx-yay.mp3',0.5);

	let self = this;
	self.$el = $('<igb>');
	let $game = $('<findgame>').appendTo(self.$el);
	let $blur = $('<blurlayer>').appendTo($game);
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
		{count:9, speed:1, isDucking:true, boulders:2},
		{count:24, speed:1, isDucking:true, trees:2, boulders:1},
		{count:24, speed:1, isDucking:true, trees:2, boulders:3},
	]
	let nRound = -1;
	nRound = 5;

	let meeps = [];
	let cntCorrect = 0;

	const CENTER = [0.55, 1.5, 2.45];

	function populateLevel(){

		$meeps.empty();

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

			let o = [0.1,1,1.9][nWall];

			let meep = new FindMeep(order[i]);
			meep.wall = nWall;
			//meep.addCarryItem(i);
			
			meep.$el.appendTo($meeps);
			
			//meep.x = CENTER[nWall]*W + (-(countPerWall-1)/2 + nMeep)*spacing;
			meep.x = (o+(1/(countPerWall+1))*(nMeep+1))*W;
			//meep.y = H - 150 - i%2 * 80;
			meep.y = H - 155;
			meep.speed = ROUNDS[nRound].speed;
			meep.isDucking = ROUNDS[nRound].isDucking;
			
			meep.range = { 
				xMin:(CENTER[nWall]-0.35)*W,
				xMax:(CENTER[nWall]+0.35)*W,
				yMin:H - 150 - 80,
				yMax:H - 150,
			}

			meeps[i] = meep;

			meep.callback = onMeep;
		}

		let treePerWall = ROUNDS[nRound].trees;
		let boulderPerWall = ROUNDS[nRound].boulders;

		for(var w=0; w<3; w++){
			let o = [0.1,1,1.9][w];
			for(var t=0; t<treePerWall; t++){
				new FindObstacle(
					0,
					(o+(1/(treePerWall+1))*(t+1))*W,
					H-150-40).$el.appendTo($meeps);
			}

			for(var b=0; b<boulderPerWall; b++){
				new FindObstacle(
					1,
					(o+(1/(boulderPerWall+1))*(b+1))*W,
					H-140).$el.appendTo($meeps);
			}
		}

		
	}

	function onMeep(meep){

		let i = meeps.indexOf(meep);
		let n = meeps[i].n;

		if(n == -1){

		} else {

			audio.play('correct',true);

			let score = self.playerCount - cntCorrect;

			meeps[i].initCelebration();
			meeps[i].setScore(score);

			self.scores[n].score += score;

			cntCorrect++;
			if(cntCorrect==self.playerCount){
				audio.play('complete',true);
				setTimeout( finiRound, 1000 );
			}

			hud.updatePlayers(self.scores);
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

		audio.stop('music');
		let scores = [];
		for(var s in self.scores) scores[s] = self.scores[s].score;

		let rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores,rewards);
		
		setTimeout(function(){
			self.fini();
			window.doPartyGameComplete(scores);
		},5000);
	}

	function initGame(playerCount){
		

		while(self.scores.length<playerCount) self.scores.push({score:0});

		self.playerCount = playerCount;
		setTimeout(initPlay,1000);
	}

	function initTutorial(){

		hud.initTutorial('Find My Meep',
			{
				x:1.5, y:0.45, msg: 'Find and tap on your player<br>when the curtain draws', icon:'touch'
			});

		for(var i=0; i<6; i++){
			let n = i<self.playerCount?i:-1;
			let meep = new FindMeep(n);
			meep.wall = 1;
			meep.x = (1.2 + Math.random() * 0.6)*W;
			meep.y = H-150 - Math.random() * 80;
			meep.range = { 
				xMin:(CENTER[1]-0.35)*W,
				xMax:(CENTER[1]+0.35)*W,
				yMin:H - 100 - 80,
				yMax:H - 100,
			}

			meep.speed = 0.5;
			meeps[i] = meep;
			meep.$el.appendTo($meeps);

			meep.callback = onTutorialMeep;
		}

		$curtain.addClass('ajar');
		audio.play('curtain',true);

		hud.initTimer(30,finiTutorial);
	}

	function finiTutorial(){
		
		hud.finiTimer();
		hud.finiTutorial();
		$curtain.removeClass('ajar');
		audio.play('curtain',true);

		setTimeout(function(){
			$blur.hide();
			$meeps.empty();
			meeps.length = 0;
		},1000);

		setTimeout(initPlay,2000);
	}

	function onTutorialMeep(meep){
		audio.play('yay',true);
		meep.initCelebration();
		setTimeout(meep.reset,1000);
	}

	function initPlay(){
		audio.play('music');
		hud.initPlayers(self.scores);
		initRound();
	}

	if( playersMeta ) setTimeout( function(){ initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	
	let interval = setInterval(step,1000/FPS);

	self.setPlayers = function(p){
		self.players = p;
	}

	self.fini = function(){
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	}
}
