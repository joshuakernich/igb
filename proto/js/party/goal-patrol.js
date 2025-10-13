window.GoalPatrolGame = function( playersMeta ){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const FLOOR = 100;
	const START = 300;
	const BALLR = 70;


	const SEQUENCE = [
		[
			0,6,2,3,7,
			8,4,9,1,5,
		],
		[
			7,1,6,2,4,
			3,9,5,8,0,
		],
		[
			3,0,8,4,6,
			5,7,2,9,1,
		],
		[
			5,3,9,0,7,
			1,8,6,4,2,
		],
		[
			9,3,7,6,2,
			1,5,0,8,4
		],
		[
			2,8,3,7,5,
			6,0,4,1,9
		],
		[
			6,9,1,5,3,
			4,2,7,0,8
		],
		[
			4,6,0,9,2,
			8,1,3,5,7
		]
	]

	let nSequence = 0;

	function generateQueue(seconds,cohort,ballsPerPlayer){

		let total = cohort.length * ballsPerPlayer;
		let timePerSpawn = (seconds - 3.5)/total;

		let nSequence = 0;

		let balls = [];
		let queue = [];
		let players = {};

		for(var c in cohort) players[cohort[c]] = {sequence:undefined, cnt:0};

		for(var b=0; b<total; b++){

			if(!queue.length){
				queue = cohort.concat();
				shuffleArray(queue);
			}
			
			let nMeep = queue.pop();
			
			let player = players[nMeep];

			if(player.cnt%10==0){
				player.sequence = SEQUENCE[nSequence%SEQUENCE.length];

				//if(nMeep==0) console.log('set',nMeep,'sequence',nSequence,player.sequence);
				nSequence++;
			}

			let nPos = player.sequence.indexOf( player.cnt );

			player.cnt++;

			let ball = {
				n:nMeep,
				time: timePerSpawn * b * 1000,
				ox: 0.3 + (nPos%5) * 0.1,
				tx: 0.2 + (nPos%5) * 0.15,
				ty: 0.4 + Math.floor(nPos/5) * 0.2,
				cx: -0.2 + Math.random() * 0.4,
				cy: -0.2 + Math.random() * 0.3,
			}

			//if(nMeep==0) console.log(nMeep,nPos,ball.tx,ball.ty);

			balls[b] = ball;
		}

		return balls;
	}

	const TUTORIALS = [
		undefined,
		undefined,
		generateQueue(30,[0,1],3),
		generateQueue(30,[0,1,2],2),
		generateQueue(30,[0,1,2,3],2),
		generateQueue(30,[0,1,2,3,4],1),
		generateQueue(30,[0,1,2,3,4,5],1),
	]

	const ROUNDS = [
		undefined,
		undefined,
		[
			[
				{cohort:[0,1], seconds:30, queue: generateQueue(30,[0,1],4) },
			],
			[
				{cohort:[0,1], seconds:30, queue: generateQueue(30,[0,1],7) },
			],
			[
				{cohort:[0,1], seconds:30, queue: generateQueue(30,[0,1],9) },
			],
		],
		[
			[
				{cohort:[0,1], seconds:30, queue: generateQueue(30,[0,1],5)},
				{cohort:[1,2], seconds:30, queue: generateQueue(30,[1,2],5)},
				{cohort:[0,2], seconds:30, queue: generateQueue(30,[0,2],5)},
			],
			[
				{cohort:[0,1], seconds:30, queue: generateQueue(30,[0,1],10)},
				{cohort:[1,2], seconds:30, queue: generateQueue(30,[1,2],10)},
				{cohort:[0,2], seconds:30, queue: generateQueue(30,[0,2],10)},
			]
			
		],
		[
			[
				{cohort:[0,1], seconds:30, queue: generateQueue(30,[0,1],5) },
				{cohort:[2,3], seconds:30, queue: generateQueue(30,[2,3],5) },
			],
			[
				{cohort:[0,1], seconds:30, queue: generateQueue(30,[0,1],10) },
				{cohort:[2,3], seconds:30, queue: generateQueue(30,[2,3],10) },
			],
		],
		[
			[
				{cohort:[0,1], seconds:30, queue: generateQueue(30,[0,1],8)},
				{cohort:[2,3], seconds:30, queue: generateQueue(30,[2,3],8)},
				{cohort:[4,0], seconds:30, queue: generateQueue(30,[4,0],8)},
				{cohort:[1,2], seconds:30, queue: generateQueue(30,[1,2],8)},
				{cohort:[3,4], seconds:30, queue: generateQueue(30,[3,4],8)},
			]
		],
		[
			[
				{cohort:[0,1], seconds:30, queue: generateQueue(30,[0,1],5) },
				{cohort:[2,3], seconds:30, queue: generateQueue(30,[2,3],5) },
				{cohort:[4,5], seconds:30, queue: generateQueue(30,[4,5],5) },
			],
			[
				{cohort:[0,1], seconds:30, queue: generateQueue(30,[0,1],10) },
				{cohort:[2,3], seconds:30, queue: generateQueue(30,[2,3],10) },
				{cohort:[4,5], seconds:30, queue: generateQueue(30,[4,5],10) },
			],
		],
	]

	let GoalMeep = function(n){
		let self = this;
		self.$el = $('<goalmeep>');

		self.score = 0;

		let $arms = $('<goalarms>').appendTo(self.$el);
		let $ball = $('<goalballball>').appendTo(self.$el).css({opacity:0}).attr('n',n);
		let $handLeft = $('<goalhand n='+n+'>').appendTo(self.$el);
		let $handRight = $('<goalhand n='+n+'>').appendTo(self.$el);
		

		let $score = $('<goalscore>').appendTo(self.$el);

		let px = self.px;
		let py = self.py;

		let meep = new PartyMeep(n);
		meep.$el.appendTo(self.$el);
		meep.$handLeft.hide();
		meep.$handRight.hide();

		meep.$el.find('partymeepeye').hide();
		meep.$el.find('partymeepmouth').hide();

		self.step = function(){

		}

		self.redraw = function(){
			self.$el.css({
				left: (1+self.px)*W+'px',
			})

			let h = (1-self.py)*H;

			let hMeep = Math.max( 300, h * 0.7 );

			meep.setHeight(hMeep)

			$handLeft.css({
				top: -h+'px',
			})

			$handRight.css({
				top: -h+'px',
			})

			$score.css({
				bottom: (h+70)+'px',
			})

			$ball.css({
				top:  -h+'px',
			})

			$arms.css({
				bottom: (hMeep-180) + 'px',
				height: (h-hMeep+180) + 'px',
			})
		}

		self.addScore = function(){
			self.score++;
			$score.text('+1').css({opacity:1}).delay(500).animate({opacity:0});
			
		}

		self.catch = function(n){
			$ball.attr('n',n).css({opacity:1}).delay(500).animate({opacity:0});
		}
	}

	let Ball = function(n){

		const GRAVITY = 1;

		let self = this;
		self.$el = $('<goalball>');

		let $shadow = $('<goalballshadow>').appendTo(self.$el);
		let $ball = $('<goalballball>').appendTo(self.$el).attr('n',n);

		self.n = n;

		//position
		self.px = 0.5;
		self.py = 0.5;

		//origin
		self.ox = 0.5;
		self.oy = 0.94;

		//target
		self.tx = 0.5;
		self.ty = 0.5;

		self.cx = 0.1;
		self.cy = -0.3;

		self.progress = 0;
		self.speed = 2; // seconds

		self.floor = H-BALLR;
		self.spin = 0;
		self.isKicked = false;

		let nProgress = 0;

		self.step = function(){
			
			if(self.isKicked) nProgress++;

			self.progress = nProgress/(FPS*self.speed);
			if(self.progress>1) self.progress = 1;

			self.px = self.ox + (self.tx-self.ox) * self.progress + Math.sin(Math.PI*self.progress) * self.cx;
			self.py = self.oy + (self.ty-self.oy) * self.progress + Math.sin(Math.PI*self.progress) * self.cy;
		}

		self.redraw = function(){

			let scale = 0.4 + self.progress * 0.6;

			self.spin = - self.progress * self.cx * 3000;

			self.$el.css({
				left: W * (1+self.px) + 'px',
			})

			$ball.css({
				top: -START + (self.progress)*START - H * (1-self.py) + 'px',
				'transform':'scale('+scale+') translate(-50%, -50%) rotate('+self.spin+'deg)',
			})

			$shadow.css({
				top: -START + (self.progress)*START + 'px',
				'transform':'scale('+scale+') translate(-50%, -50%)',
			})
		}
	}

	


	// match-up sequence for each player count
	const MATCHUPS = [
		undefined,
		undefined,
		['01'],
		['01','12','02'],
		['01','23'],
		['01','23','40','12','34'],
		['01','23','45'],
	]

	if( !HeadersGame.init ){
		HeadersGame.init = true;

		$("head").append(`
			<style>
				goalgame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: url(./proto/img/party/bg-stadium.jpg);
					background-size: 100%;
					background-position: bottom center;
					font-weight: bold;
					color: white;
				}

				goalball{
					display: block;
					position: absolute;
					top: ${H-FLOOR}px;
				}

				goalballshadow{
					display: block;
					position: absolute;
					width: ${BALLR*2}px;
					height: ${BALLR*2*0.25}px;
					background: black;
					transform: translate(-50%,-50%);
					border-radius: 100%;
					opacity: 0.5;
				}

				goalballball{
					display: block;
					position: absolute;
					width: ${BALLR*2}px;
					height: ${BALLR*2}px;
					background-image: url(./proto/img/party/actor-football.png);
					transform: translate(-50%,-50%);
					background-size: 100%;

				}

				goalballball:before{
					content:"";
					background: red;
					position: absolute;
					display: block; 
					inset: 0px;
					mix-blend-mode: color;
					border-radius: 100%;
				}

				goalballball:after{
					content:"";
					position: absolute;
					display: block; 
					inset: 0px;
					border-radius: 100%;
					box-sizing: border-box;
					border: 10px solid red;
				}

				goalballball[n='0']:before{ background: var(--n0); }
				goalballball[n='1']:before{ background: var(--n1); }
				goalballball[n='2']:before{ background: var(--n2); }
				goalballball[n='3']:before{ background: var(--n3); }
				goalballball[n='4']:before{ background: var(--n4); }
				goalballball[n='5']:before{ background: var(--n5); }

				goalballball[n='0']:after{ border-color: var(--n0); }
				goalballball[n='1']:after{ border-color: var(--n1); }
				goalballball[n='2']:after{ border-color: var(--n2); }
				goalballball[n='3']:after{ border-color: var(--n3); }
				goalballball[n='4']:after{ border-color: var(--n4); }
				goalballball[n='5']:after{ border-color: var(--n5); }

				goalmeep{
					display:block;
					position: absolute;
					top: ${H-FLOOR}px;
				}

				goalhand{
					display: block;
					position: absolute;
				}

				goalhand:before{
					content:"";
					display: block;
					position: absolute;
					width: 60px;
					height: 60px;
					background: white;
					border-radius: 20px 20px 10px 10px;
					left: -30px;
					top: -30px;
				}

				goalhand:after{
					content:"";
					display: block;
					position: absolute;
					width: 40px;
					height: 15px;
					background: red;
					top: 30px;
					left: -20px;
				}

				goalhand:first-of-type{
					transform: translateX(50px) rotate(-10deg);
				}

				goalhand:last-of-type{
					transform: translateX(-50px) rotate(10deg);
				}

				goalhand[n='0']:after{ background: var(--n0); }
				goalhand[n='1']:after{ background: var(--n1); }
				goalhand[n='2']:after{ background: var(--n2); }
				goalhand[n='3']:after{ background: var(--n3); }
				goalhand[n='4']:after{ background: var(--n4); }
				goalhand[n='5']:after{ background: var(--n5); }

				goalgoal{
					display: block;
					position: absolute;
					width: ${W*3}px;
					height: ${H-70}px;
					
					background: url(proto/img/goal-inside.png);
					background-size: 100%;
				}

				goalgoal:before{
					content:"";
					display: block;
					position: absolute;
					width: ${W}px;
					height: 20px;
					left: 0px;
					right: 0px;
					bottom: 0px;
					margin: auto;
					background: white;
					opacity: 0.2;
				}

				goalscore{
					display: block;
					position: absolute;
					line-height: 100px;
					font-size: 75px;
					left: -100px;
					right: -100px;
					text-align: center;
				}

				goalpulse{
					display: block;
					position: absolute;
					border: 15px solid white;
					border-radius: 100%;
					width: ${BALLR*2}px;
					height: ${BALLR*2}px;
					transform: translate(-50%,-50%);
				}

				goalpulse:after{
					content:"MISS";
					display: block;
					position: absolute;
					line-height: 100px;
					font-size: 50px;
					left: 50%;
					top: 50%;
					width: 200px;
					height: 100px;
					transform: translate(-50%,-50%);
					text-align: center;
				}

				goalpulse[n='0']{ border-color: var(--n0); color:var(--n0); }
				goalpulse[n='1']{ border-color: var(--n1); color:var(--n1); }
				goalpulse[n='2']{ border-color: var(--n2); color:var(--n2); }
				goalpulse[n='3']{ border-color: var(--n3); color:var(--n3); }
				goalpulse[n='4']{ border-color: var(--n4); color:var(--n4); }
				goalpulse[n='5']{ border-color: var(--n5); color:var(--n5); }

				goalarms{
					display: block;
					position: absolute;
					border: 20px solid white;
					width: ${BALLR*2.5}px;
					height: ${BALLR*2.5}px;
					box-sizing: border-box;
					border-radius: 80% 80% 100% 100%;
					left:  ${-BALLR*1.25}px;
					border-top: none;
				}

				goallayer{
					display: block;
					position: absolute;
					inset: 0px;
				}

			</style>`);
	}

	let self = this;
	let timeout = undefined;

	self.$el = $('<igb>');
	let $game = $('<goalgame>').appendTo(self.$el);
	let $blur = $('<blurlayer>').appendTo($game);
	let $balls = $('<goallayer>').appendTo($game);
	let $meeps = $('<goallayer>').appendTo($game);
	let $goal = $('<goalgoal>').appendTo($game);
	
	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-sport.mp3',0.3,true);
	audio.add('bounce','./proto/audio/party/sfx-bounce.mp3',1);
	audio.add('cheer','./proto/audio/party/sfx-cheer.mp3',0.4);
	audio.add('boo','./proto/audio/party/sfx-boo.mp3',0.4);
	audio.add('incorrect','./proto/audio/party/sfx-incorrect.mp3',0.3);

	let isTutorial = false;

	let hud = new PartyHUD();
	hud.$el.appendTo($game);

	let meeps = [];
	let countPlayer = 2;
	function initGame(COUNT){

		countPlayer = COUNT;

		for(var i=0; i<countPlayer; i++){
			meeps[i] = new GoalMeep(i);
			meeps[i].isActive = false;
			meeps[i].$el.appendTo($meeps).hide();
		}

		setTimeout( initTutorial, 1000 );
	}

	function initTutorial(){
		isTutorial = true;

		cohort = [];
		while(cohort.length<meeps.length) cohort.push(cohort.length);

		hud.initTutorial(
			'Goal Patrol',
			{x:1.25, y:0.45, msg:'Move left & right<br>to save your coloured balls',icon:'side-to-side'},
			{x:1.75, y:0.45, msg:'Squat up and down<br>to reach',icon:'up-down'},
		);

		for(var m in meeps){
			meeps[m].$el.show();
			meeps[m].isActive = true;
		}
		
		let queue = TUTORIALS[meeps.length];
		for(let i in queue){
			setTimeout(function(){
				initBall(queue[i]);
			},queue[i].time)
		}


		hud.initTimer(30,finiTutorial);
	}

	function finiTutorial(){


		isTutorial = false;

		$blur.hide();
		hud.finiTutorial();
		hud.finiTimer();

		for(var m in meeps){
			meeps[m].$el.hide();
			meeps[m].isActive = false;
			meeps[m].score = 0;
		}


		for(var b in balls){
			balls[b].$el.hide();
		}

		balls.length = 0;
		setTimeout(initPlay,1000);
	}

	function initPlay(){
		$blur.hide();
		hud.initPlayers(meeps);
		setTimeout(initNextCohort,2000);
	}	

	let iCohort = -1;
	let iRound = 0;
	let cohort;
	function initNextCohort(){
		iCohort++;
		
		if(!ROUNDS[meeps.length][iRound][iCohort]){
			iCohort = 0;
			iRound++;
		}

		if(!ROUNDS[meeps.length][iRound]){
			finiGame();
			return;
		}

		audio.play('music');
		
		let round = ROUNDS[meeps.length][iRound][iCohort];
		cohort = round.cohort;
		

		for(var c in cohort){
			meeps[cohort[c]].$el.show();
			meeps[cohort[c]].isActive = true;
		}

		let delay = 0;
		if(iCohort==0){
			setTimeout(function(){
				hud.initRound(iRound,ROUNDS[meeps.length].length);
			},2000);

			setTimeout(function(){
				hud.finiBanner();
			},4000);

			delay = 4000;
		}

		setTimeout(function(){
			hud.summonPlayers(cohort);
		},delay+2000);

		setTimeout(function(){
			hud.finiBanner();
		},delay+4000);

		setTimeout(function(){
			hud.initTimer(30,finiCohort);

			let queue = round.queue;
			for(let i in round.queue){
				setTimeout(function(){
					initBall(round.queue[i]);
				},round.queue[i].time)
			}

		},delay+6000);


		
		
	}

	function finiCohort(){

		hud.finiTimer();

		for(var m in meeps){
			meeps[m].$el.hide();
			meeps[m].isActive = false;
		}

		setTimeout(function(){
			initNextCohort();
		},2000);
	}

	let balls = [];
	let queue = [];
	function initBall(def){

	
		let ball = new Ball(def.n);
		ball.ox = def.ox;
		ball.tx = def.tx;
		ball.ty = def.ty;
		ball.cx = def.cx;
		ball.cy = def.cy;
		ball.redraw();
		ball.$el.prependTo($balls);
		balls.push(ball);

		ball.isKicked = false;

		setTimeout(function(){
			audio.play('bounce',true);
			ball.isKicked = true;
		},1000);

		
	}

	function finiGame() {

		audio.stop('music');

		let scores = [];
		for(var m in meeps) scores[m] = meeps[m].score;

		let rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores,rewards);
		
		setTimeout(function(){
			self.fini();
			window.doPartyGameComplete(scores);
		},5000)
	}

	if( playersMeta ) setTimeout( function(){ initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);


	function step(){

		for(var b in balls) balls[b].step();

		for(var m in meeps){
			if(!meeps[m].isActive) continue;
			meeps[m].step();
			for(var b in balls){

				if(balls[b].progress >= 1 && !balls[b].isClaimed){
					let dx = (balls[b].px - meeps[m].px)*W;
					let dy = (balls[b].py - meeps[m].py)*H;
					let d = Math.sqrt(dx*dx+dy*dy);
					
					if(d<BALLR*2){
						balls[b].isClaimed = true;

						meeps[m].catch(balls[b].n);
						if(!isTutorial) meeps[balls[b].n].addScore();

						let isCorrectMeep = (m==balls[b].n);

						audio.play(isCorrectMeep?'cheer':'boo',true);
					}
				}
			}
		}

		for(var m in meeps) meeps[m].redraw();
		for(var b=0; b<balls.length; b++){
			if(balls[b].progress >= 1){
				balls[b].$el.remove();
				if(!balls[b].isClaimed) makePulse(balls[b]);
				balls.splice(b,1);
				b--;

			} else {
				balls[b].redraw();
			}
		}

		hud.updatePlayers(meeps);
		
		resize();
	}

	function makePulse(ball){

		audio.play('incorrect',true);

		$('<goalpulse>').attr('n',ball.n).appendTo($game).css({
			left: (1+ball.px)*W+'px',
			top: (ball.py)*H-FLOOR+'px',
		}).animate({
			opacity:0,
			width: BALLR * 3,
			height: BALLR * 3,
		},{complete:function(){
			$(this).remove();
		}})
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	
	let interval = setInterval(step,1000/FPS);

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].px = p[m].px;
			meeps[m].py = p[m].py;
		}
	}

	self.fini = function(){
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	}
}