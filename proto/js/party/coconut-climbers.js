window.CoconutClimbersGame = function(playersMeta){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const DISTANCE = 5;
	const TREE = H*DISTANCE + H/2;
	const THICC = 70;
	const COCONUT = 100;

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-calypso.mp3',0.2,true);
	audio.add('correct','./proto/audio/party/sfx-correct.mp3',0.3);
	audio.add('coconut','./proto/audio/party/sfx-coconut.mp3',0.3);
	
	let CoconutPlayer = function(n,ax,distance,volumeCoconut,speedCoconut){

		const MIN = 0.4;
		const MULT = 12; // essentially saying I only need 1/6th of the room width
		const HMEEP = 350;
		const PHMEEP = HMEEP/H;

		let self = this;
		self.$el = $('<coconutplayer>');

		self.countSlipping = 0;
		self.ax = ax;
		self.px = ax;
		self.ay = 0;
		self.py = undefined;
		self.pyWas = undefined;
		self.ticksComplete = undefined;
		self.tally = 0;
		self.score = 0;
		self.isActive = self.isComplete = false;
		self.distance = distance;

		let ticksElapsed = 0;
		let queueSide = [];

		let meep = new PartyMeep(n);
		meep.$el.appendTo(self.$el);
		meep.$shadow.hide();
		meep.$el.css({
			bottom:'150px',
		});

		meep.$handLeft.appendTo(self.$el).css({top:'auto',left:-THICC/2+'px'});
		meep.$handRight.appendTo(self.$el).css({top:'auto',left:THICC/2+'px'});

		let $tree = $('<coconuttree>').appendTo(self.$el).css({
			height: H*distance + H/2
		})

		$('<coconut>').appendTo($tree).css({ top:'60px', left:130 + 'px' });
		$('<coconut>').appendTo($tree).css({ top:'80px', left:60 + 'px' });
		$('<coconut>').appendTo($tree).css({ top:'100px', left:-100 + 'px' });

		for(var i=0; i<5; i++){
			let $frond = $('<coconutfrond>').appendTo($tree).css({
				transform:'rotate('+(-180+(i*40))+'deg)',
			})
		}

		let coconuts = [];

		for(var i=0; i<volumeCoconut; i++){
			if(!queueSide.length){
				queueSide = [-1,1];
				shuffleArray(queueSide);
			} 

			let iSide = queueSide.pop();
			coconuts[i] = {
				iSide: iSide,
				ay:1.5 + (distance-0.5) / volumeCoconut * i,
				$el:$('<coconut>').appendTo(self.$el).css({ left:iSide*120 + 'px' }),
				countFalling: 0,
			}
		}

		self.step = function(isGameLive){

			if(!isGameLive || !self.isActive) self.py = self.pyWas = 0.7;

			ticksElapsed++;

			for(var c in coconuts){
				if(!coconuts[c].hasHit){

					if((self.ay+1.5) > coconuts[c].ay) coconuts[c].countFalling++;

					coconuts[c].py = coconuts[c].ay - self.ay - (coconuts[c].countFalling / FPS) * speedCoconut;

					coconuts[c].$el.css({
						bottom: coconuts[c].py * H + 'px',
					});
				}
			}

			let ox = (self.px - self.ax) * MULT;
			ox = Math.max( -1, Math.min(1, ox));

			let dir = ox > 0?1:-1;
			if(Math.abs(ox)<MIN) ox = MIN * dir;

			meep.$el.css({
				left: ox*10 + 'px',
				transform: 'rotate('+ox*15+'deg)',
			})

			let $handLead = (dir>0)?meep.$handLeft:meep.$handRight;
			let $handFollow = (dir>0)?meep.$handRight:meep.$handLeft;
			
			$handLead.css({
				bottom: (1-self.py) * H + 'px',
			})

			$handFollow.css({
				bottom: (1-self.py) * H - 100 + 'px',
			})

			let oy = 0;
			if(self.countSlipping <= 0 && self.pyWas != undefined){
				self.dy = self.py - self.pyWas;
				if(self.dy>0) self.ay += self.dy;

				if(self.ay > distance){
					self.ticksComplete = ticksElapsed;
					self.ay = distance;
					self.isActive = false;
					self.isComplete = true;
					audio.play('correct',true);
				}

				oy = (self.py * 2)-1;
			} else if(self.countSlipping>0){
				self.countSlipping--;
				self.ay -= 0.005;
				if(self.ay<0) self.ay = 0;
			}

			let my = 0.1+oy*0.1;
			meep.$el.css({
				bottom: (my*H) + 'px',
			})

			$tree.css({
				bottom: -self.ay * H + 'px',
			})

			for(var c in coconuts){

				if(!coconuts[c].hasHit && self.ticksComplete == undefined){
					let dy = coconuts[c].py - (my + PHMEEP);
					if(dy<0 && dy>-0.2 && coconuts[c].iSide == dir){

						audio.play('coconut',true);

						coconuts[c].hasHit = true;
						self.countSlipping = FPS/2;

						coconuts[c].$el.css({
							transform: 'rotate('+coconuts[c].iSide*60+'deg)',
						}).animate({
							left: coconuts[c].iSide * 200,
							bottom: coconuts[c].py * H + 100 + 'px',
						},{
							duration: 200,
							easing: 'linear',
						}).animate({
							left: coconuts[c].iSide * 300,
							bottom: -100,
						},{
							duration: 500,
						})
					}
				}
			}

			self.pyWas = self.py;
		}


	}

	if( !CoconutClimbersGame.init ){
		CoconutClimbersGame.init = true;

		$("head").append(`
			<style>
				coconutclimbersgame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background-image: url(./proto/img/party/bg-beach.avif);
					background-size: 33.3% 100%;
					background-position: bottom center;
				}

				coconutclimbersgame:before{
					content:"";
					display:block;
					width: 100%:
					height: 100%;
					position: absolute;
					inset: 0px;
					margin: auto;
					box-sizing: border-box;
					background: linear-gradient(to top, #28A9E1, transparent);
				}

				coconut{
					display: block;
					position: absolute;
				}

				coconut:after{
					content: "";
					display: block;
					position: absolute;
					left: ${-COCONUT/2}px;
					bottom: ${-COCONUT/2}px;
					width: ${COCONUT}px;
					height: ${COCONUT}px;
					background: #D59563;
					border-radius: 100% 0px ${COCONUT}px ${COCONUT}px;
					box-shadow: inset 0px 0px 30px #a86939, 0px 10px 20px rgba(0,0,0,0.5);
					transform: rotate(-45deg);

				}

				coconutplayer{
					display: block;
					position: absolute;
					bottom: 0px;
				}

				coconuttree{
					display: block;
					position: absolute;
					bottom: 0px;
					height: ${TREE}px;
					width: 0px;
				}

				coconuttree:before{
					content: "";
					display: block;
					position: absolute;
					height: 100%;
					width: ${THICC}px;
					left: ${-THICC/2}px;
					bottom: 0px;
					background: repeating-linear-gradient(
					  #a86939, #D59563 300px
					);
					box-shadow: 2px 0px 20px black;
				}

				coconutfrond{
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
					z-index: 1;
				}

				coconutfrond:after{
					content:"";
					display: block;
					position: absolute;
					width: 350px;
					height: 100px;
					background: linear-gradient( to right, green, green, #69C159 );
					left: -50px;
					top: -50px;
					border-radius: 50px 100% 0px 50px;
				}

			<style>
		`)
	}

	// distance = 1 means 1 x screen height
	// speedCoconus is how many seconds per screen height
	// volumeCoconut is how many coconuts per player
	const ROUNDS = [
		{distance:1.5,speedCoconut:0.5,volumeCoconut:2},
		{distance:2.5,speedCoconut:0.5,volumeCoconut:4},
		{distance:3.5,speedCoconut:0.5,volumeCoconut:10},
	]

	const STRUCTURE = [
		undefined,
		undefined,
		[ROUNDS[0],ROUNDS[1],ROUNDS[2]],
		[ROUNDS[0],ROUNDS[1],ROUNDS[2]],
		[ROUNDS[0],ROUNDS[2]],
		[ROUNDS[0],ROUNDS[2]],
		[ROUNDS[0],ROUNDS[2]],
	]

	const TIME_PER_PLAYER = [
		undefined,
		undefined,
		60,
		60,
		45,
		45,
		45,
	]

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<coconutclimbersgame>').appendTo(self.$el);
	let $blur = $('<blurlayer>').appendTo($game);

	let meeps = [];
	let countMeeps = undefined;
	function initGame(count){
		countMeeps = count;
		
		initTutorial();
	}

	function initTutorial(){

		isGameLive = true;
		
		for(var i=0; i<countMeeps; i++){
			let ax = (i+1) * 1/(countMeeps+1);
			meeps[i] = new CoconutPlayer(i,ax,1.5,2,0.5);
			meeps[i].isActive = true;
			meeps[i].$el.css({
				'left':W + ax * W + 'px',
				'transform':'scale(0.5)',
			}).appendTo($game);
		}

		hud.initTutorial('Coconut Climbers',
			{x:1 + meeps[0].ax, y:0.45, msg:"Align yourself<br>with your avatar",icon:"align"},
			{x:1.5, y:0.6, msg:"Squat up and down<br>to climb",icon:"up-down"},
			{x:1.8, y:0.45, msg:"Move left and right<br>to dodge coconuts",icon:"side-to-side"},
		);

		hud.initTimer(30,finiTutorial);
	}

	function finiTutorial(){
		$blur.hide();

		isGameLive = false;
		hud.finiTimer();
		hud.finiTutorial();

		for(var m in meeps){
			meeps[m].$el.remove();
			meeps[m].score = 0;
		}

		setTimeout(initNextRound);
	}

	const SLOTS = 3;
	let iRound = -1;
	let isGameLive = false;
	let timeStartRound = 0;
	function initNextRound(){

		isGameLive = false;

		iRound++;
		if(!STRUCTURE[meeps.length][iRound]){
			finiGame();
			return;
		}

		console.log(meeps.length,STRUCTURE[meeps.length]);
		
		for(var i=0; i<countMeeps; i++){
			let tally = meeps[i]?meeps[i].score:0;
			meeps[i] = new CoconutPlayer(i,0,
				STRUCTURE[meeps.length][iRound].distance,
				STRUCTURE[meeps.length][iRound].volumeCoconut,
				STRUCTURE[meeps.length][iRound].speedCoconut);
			meeps[i].tally = meeps[i].score = tally;
			meeps[i].$el.appendTo($game).hide().css({
				'transform':'scale(0.8)',
			})
		}

		hud.updatePlayers(meeps,1);

		iPlayer = -1;
		initNextPlayer();
		initNextPlayer();
		initNextPlayer();

		setTimeout(function(){
			hud.initRound(iRound,STRUCTURE[meeps.length].length);
			if(iRound==0){
				hud.updatePlayers(meeps,1);
				hud.initPlayers(meeps,1);
			}
		},2000);

		setTimeout(function(){
			hud.finiBanner();
		},4000);

		setTimeout(function(){
			let summon = [0,1,2];
			if(meeps.length < summon.length) summon.length = meeps.length;
			hud.summonPlayers(summon);
		},6000);

		setTimeout(function(){
			hud.finiBanner();
		},8000);

		setTimeout(function(){
			isGameLive = true;
			timeStartRound = new Date().getTime();
			for(var m in meeps) if(meeps[m].isActive) meeps[m].timeStart = timeStartRound;
			audio.play('music',false,(iRound==STRUCTURE[meeps.length].length-1)?1.5:1);
		},10000);
	}

	let iPlayer = -1;
	let slots = [];
	function initNextPlayer(){
		iPlayer ++;

		if(meeps[iPlayer]){
			let nPlayer = iPlayer;

			let nSlot = 0;
			while(slots[nSlot]) nSlot++;

			slots[nSlot] = meeps[nPlayer];
			let ax = (nSlot+1) * 1/(SLOTS+1);

			meeps[nPlayer].ax = ax;
			meeps[nPlayer].isActive = false;
			meeps[nPlayer].$el.css({left:W + ax * W + 'px'}).show().css({
				bottom: -(meeps[nPlayer].distance+0.5) * H
			}).animate({
				bottom: 0,
			},{
				duration:1000 + Math.random()*500, 
				complete:function(){
				meeps[nPlayer].isActive = true;
				meeps[nPlayer].timeStart = new Date().getTime();
			}});
		} else {
			let isRoundComplete = true;
			for(var m in meeps) if(!meeps[m].isRemoved) isRoundComplete = false;
			if(isRoundComplete) initNextRound();
		}
	}

	let hud = new PartyHUD('#FDC972');
	hud.$el.appendTo($game);

	if( playersMeta ) setTimeout( function(){ initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	let queue = [];
	let nStep = 0;



	function step(){
		nStep++;

		let timeNow = new Date().getTime();
		//let timeElapsed = (timeNow-timeStartRound)/1000;

		for(let m in meeps){
			meeps[m].step(isGameLive);
			if(isGameLive && meeps[m].isActive){

				let timeElapsed = (timeNow - meeps[m].timeStart)/1000;
				let timeElapsedWas = meeps[m].timeElapsed;
				
				if(timeElapsed>=(TIME_PER_PLAYER[meeps.length]-10) && timeElapsedWas<(TIME_PER_PLAYER[meeps.length]-10)){
					hud.flashMessage(1+meeps[m].ax,0.3,'10 seconds left',50);
				}

				for(var i=1; i<=5; i++){
					if(timeElapsed>=(TIME_PER_PLAYER[meeps.length]-i) && timeElapsedWas<(TIME_PER_PLAYER[meeps.length]-i)){
						hud.flashMessage(1+meeps[m].ax,0.3,i,150);
					}
				}

				if(timeElapsed>=(TIME_PER_PLAYER[meeps.length]) && timeElapsedWas<(TIME_PER_PLAYER[meeps.length])){
					hud.flashMessage(1+meeps[m].ax,0.3,'Time Up!',50);

					meeps[m].isActive = false;
					meeps[m].isComplete = true;
				}

				timeElapsed = Math.min(TIME_PER_PLAYER[meeps.length],timeElapsed);
				meeps[m].timeElapsed = timeElapsed;
				meeps[m].score = meeps[m].tally + timeElapsed;
			}

			if(meeps[m].isComplete){
				for(let s in slots){
					if(slots[s] == meeps[m]){
						slots[s] = undefined;
						meeps[m].$el.delay(500).animate({bottom:-meeps[m].distance*H},{complete:function(){
							meeps[m].isRemoved = true;
							meeps[m].$el.remove();
							initNextPlayer();
						}});

					}
				}
			}
		}

		hud.updatePlayers(meeps,1);

		resize();
	}

	function finiGame(){
		let scores = [];
		for(var m in meeps) scores[m] = -meeps[m].score;

		let rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores,rewards);

		setTimeout(function () {
			clearInterval(interval);
			audio.stop('music');
			window.doPartyGameComplete(rewards);
		},5000)
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].px = p[m].px;
			meeps[m].py = Math.min( 0.75, p[m].py + 0.3);
			meeps[m].r =  {W:p[m].rW, X:p[m].rX, Y:p[m].rY, Z:p[m].rZ};
		}
	}

	let interval = setInterval(step,1000/FPS);

	self.fini = function(){
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	}
}