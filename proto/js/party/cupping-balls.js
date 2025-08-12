window.CuppingBallsGame = function () {
	
	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const BALL = 200;
	const CUP = 250;

	const POS = [
		0.35,0.75,
		1.3,1.7,
		2.25,2.65
	];

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-sport.mp3',0.2,true);

	if( !CuppingBallsGame.init ){
		CuppingBallsGame.init = true;

		$("head").append(`
			<style>
				cuppingballsgame{
					display: block;
					position: absolute;
					left: 0px;
					top: 0px;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: url(./proto/img/party/bg-village.png);
					background-size: 33.3% 180%;
					background-position: bottom center;
				}

				cuppingmeep{
					display: block;
					position: absolute;
					transform-origin: bottom center;
				}

				cuppingballshadow{
					display: block;
					position: absolute;
					width: ${BALL}px;
					height: ${BALL/6}px;
					background: black;
					border-radius: 100%;
					position: absolute;
					left: -${BALL/3}px;
					bottom: -${BALL/12}px;
					background: linear-gradient(to right, rgba(0,0,0,0.5), transparent);
				}

				cuppingball{
					display: block;
					position: absolute;
					transform-origin: bottom center;
					width: 0px;
					height: 0px;
				}

				cuppingballinner{
					display: block;
					position: absolute;
					width: ${BALL}px;
					height: ${BALL}px;
					background: white;
					border-radius: 100%;
					position: absolute;
					left: -${BALL/2}px;
					bottom: 0px;
					overflow: hidden;
					background: linear-gradient(to bottom right, white, white, #777);
				}

				cuppingballinner:before{
					content:". .";
					position: absolute;
					inset: 0px;
					line-height: ${BALL*0.7}px;
					text-align: center;
					font-size: ${BALL*0.7}px;
					font-weight: bold;
					font-family: serif;
					transform: scaleY(1.5);
					opacity: 0.5;
				}

				cuppingballinner:after{
					content:"";
					display: block;
					position: absolute;
					width: 200%;
					height: 100%;
					
					left: -50%;
					right: -50%;
					top: 15%;
					border-radius: 100%;
					border-top: 40px solid red;
				}

				cuppingmeep[n='0'] cuppingballinner:after { border-color:var(--n0); }
				cuppingmeep[n='1'] cuppingballinner:after { border-color:var(--n1); }
				cuppingmeep[n='2'] cuppingballinner:after { border-color:var(--n2); }
				cuppingmeep[n='3'] cuppingballinner:after { border-color:var(--n3); }
				cuppingmeep[n='4'] cuppingballinner:after { border-color:var(--n4); }
				cuppingmeep[n='5'] cuppingballinner:after { border-color:var(--n5); }

				cuppingscore{
					display: block;
					position: absolute;
					bottom: ${BALL}px;
					left: -200px;
					right: -200px;
					line-height: 150px;
					font-size: 100px;
					color: white;
					text-align: center;
				}

				cuppingcup{
					display: block;
					position: absolute;
				}

				cuppingcuplower{
					content:"";
					display: block;
					position: absolute;
					width: ${CUP}px;
					height: ${CUP}px;
					background: cyan;
					border-radius: ${CUP/3}px;
					left: ${-CUP/2}px;
					bottom: 0px;
					border-bottom: 20px solid white;
					box-sizing: border-box;

					background: linear-gradient(to right, cyan, #126378);
					box-shadow: inset -10px -4px 20px rgba(0,0,0,0.2);
				}

				cuppingcupupper:after{
					content:"";
					width: 100%;
					top: 0px;
					left: 0px;
					right: 0px;	
					border-radius: 100%;
					background: #00EBEE;
					position: absolute;
					height: ${CUP/3}px;
					border-bottom: 10px solid rgba(0,0,0,0.2);

				}

				cuppingcupupper{
					
					display: block;
					position: absolute;
					width: ${CUP*0.88}px;
					height: ${CUP}px;
					background: cyan;
					
					left: ${-CUP*0.44}px;
					bottom: ${CUP/2}px;

					border-radius: ${CUP/3}px;
					box-sizing: border-box;

					background: linear-gradient(to right, cyan, #126378);
					box-shadow: inset -10px -4px 20px rgba(0,0,0,0.2);
				}

				cuppingcupcontainer{
					display: block;
					position: absolute;
				}

				cuppingcupshadow{
					display: block;
					position: absolute;
					width: ${CUP*1.5}px;
					height: ${CUP/3}px;
					background: black;
					left: ${-CUP/2}px;
					bottom: -10px;
					border-radius: ${CUP}px;
					background: linear-gradient(to right, rgba(0,0,0,0.5),transparent);
				}
			<style>
		`)
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<cuppingballsgame>').appendTo(self.$el);

	let hud = new PartyHUD();
	hud.$el.appendTo($game);

	let meeps = [];
	let cups = [];

	const CuppingCup = function(i){
		let self = this;
		self.$el = $(`
			<cuppingcupcontainer>
				<cuppingcupshadow></cuppingcupshadow>
				<cuppingcup>
					<cuppingcuplower></cuppingcuplower>
					<cuppingcupupper></cuppingcupupper>
				</cuppingcup>
			</cuppingcupcontainer>
		`);

		self.px = 0;
		self.py = 0;
		self.altitude = 0;
		self.iPos = -1;

		self.redraw = function(){

			self.$el.css({
				left: self.px * W + 'px',
				top: self.py * H + 'px',
			});

			self.$el.find('cuppingcup').css({
				'bottom':self.altitude*H + 'px',
				'transform':'rotate('+(-self.altitude * 90)+'deg)',
			});

			self.$el.find('cuppingcupshadow').css({
				'opacity':0,
			})
		}

		
	}

	const CuppingMeep = function(i){
		let self = this;
		self.$el = $('<cuppingmeep>').attr('n',i);

		let $shadow = $('<cuppingballshadow>').appendTo(self.$el);
		let $ball = $('<cuppingball>').appendTo(self.$el);
		let $inner = $('<cuppingballinner>').appendTo($ball);
		let $score = $('<cuppingscore>').appendTo(self.$el).text('');

		let cup = new CuppingCup(i);
		cup.$el.appendTo(self.$el);
		cup.altitude = 1;


		self.px = 0;
		self.py = 0.8;
		self.score = 0;

		self.redraw = function(){

			self.$el.css({
				left: self.px * W + 'px',
				top: self.py * H + 'px',
				'z-index':Math.round(self.py * 20),
			});

			$inner.css({
				'transform':'rotate('+self.px*540+'deg)',
			});

			cup.redraw();
		}

		self.addScore = function(){
			self.score++;
			$score.text(self.score).stop(false,false).css({opacity:1}).delay(200).animate({opacity:0});
		}

		self.showScore = function(){
			$score.text(self.score).stop(false,false).css({opacity:1});
		}

		self.toCupped = function(){
			$score.hide();
			$(cup).animate({altitude:0});
		}

		self.toUncupped = function(){
			$(cup).animate({altitude:0.4});
		}

		self.addPoint = function() {
			self.score++;
			$score.text(self.score);
			$score.show();
		}

		self.toPos = function(iPos,dirForward,duration=500) {
			self.iPos = iPos;
			let pxTarget = POS[iPos];

			$(self).animate({
				px:(pxTarget + self.px)/2,
				py:0.8 + dirForward*0.05,
			},{duration:duration/2,easing:'linear'}).animate({
				px:pxTarget,
				py:0.8,
			},{duration:duration/2,easing:'linear'});
		}
	}

	const ROUNDS = [
		[
			[0,1],[2,3],[4,5],
		],
		[
			[0,1],[1,2],[2,3],[3,4],[4,5],
		],
		[
			[0,1],[4,5],[1,2],[3,4],[2,3],
		],
		[
			[2,3],[3,4],[1,2],[0,1],[1,2],[5,4],[4,3]
		],
	]

	let iRound = -1;

	function initGame(count){
		for(let i=0; i<count; i++){
			meeps[i] = new CuppingMeep(i);
			meeps[i].iPos = i;
			meeps[i].px = -0.1;
			meeps[i].$el.appendTo($game);
			meeps[i].$el.data('i',i).click(onMeep);

			$(meeps[i])
			.delay((count-i)*500)
			.animate(
				{
					px:POS[i]
				},{
					duration:500 + i*1000,
					complete:meeps[i].toCupped
				}
			);
		}

		setTimeout(function(){
			for(var m in meeps) meeps[m].toUncupped();
		},count*1000 + 1000);

		setTimeout(initNextRound,count*1000 + 2500);
	}

	initGame(6);

	function onMeep() {
		let iSelect = $(this).data('i');
		let iWall = Math.floor( meeps[iSelect].px );

		let min = 1;
		let iMin = -1;
		for(var m in meeps){

			if( !meeps[m].hasSelected && meeps[m].walls[iWall].dist < min ){
				min = meeps[m].walls[iWall];
				iMin = m;
			}
		}


		if(iMin>-1){
			meeps[iMin].hasSelected = true;
			meeps[iSelect].hasSelected = true;
			meeps[iSelect].toUncupped();
			meeps[iSelect].addPoint();

			let hasAllSelected = true;
			for(var m in meeps) if( !meeps[m].hasSelected ) hasAllSelected = false;
			if(hasAllSelected){
				hud.finiBanner();
				for(var m in meeps) meeps[m].toUncupped();
				setTimeout(finiRound, 2000);
			}
		}
	}

	function doSwap(aPos,bPos){

		let a = 0;
		let b = 0;

		for(var m=0; m<meeps.length; m++) if(meeps[m].iPos==aPos) a = m;
		for(var m=0; m<meeps.length; m++) if(meeps[m].iPos==bPos) b = m;

		let ia = meeps[a].iPos;
		let ib = meeps[b].iPos;

		meeps[a].toPos(ib,-1);
		meeps[b].toPos(ia,1);
	}

	function initNextRound(){

		iRound++;

		hud.initRound('Round '+(iRound+1),iRound,ROUNDS.length);

		setTimeout(function(){
			hud.finiBanner();
			for(var m in meeps) meeps[m].toCupped();
		},2000);


		if(iRound==0){
			setTimeout(function(){
				hud.initBanner('Watch Carefully');
			},3000);

			setTimeout(function(){
				hud.finiBanner();
			},5000);
		}
		

		setTimeout(function(){
			initMix();
		},(iRound==0)?6000:3000);
	}

	function finiRound(){

		if( ROUNDS[iRound+1]){
			setTimeout(initNextRound,2000);
		} else {
			setTimeout(finiGame,2000);
		}
	}

	function finiGame(){
		hud.initBanner('Finish');
		setTimeout(function () {
			let scores = [];
			for(var m in meeps) scores[m] = meeps[m].score;
			window.doPartyGameComplete(scores);
		},2000)
	}

	function initMix() {

		var round = ROUNDS[iRound];

		for(let r=0; r<round.length; r++){
			setTimeout( function(){
				doSwap(round[r][0],round[r][1])
			}, r*1000 );
		}

		setTimeout( function(){
			hud.initBanner('Find your meep');
			for(var m in meeps) meeps[m].hasSelected = false;
		}, round.length*1000 );
	}

	self.step = function(){

		for(var m in meeps) meeps[m].redraw();
		//for(var c in cups) cups[c].redraw();

		resize();
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	self.fini = function(){
		audio.stop('music');
		clearInterval(interval);
	}

	self.setPlayers = function(p){

		for(var m in meeps){
			meeps[m].walls = p[m].walls;
			//meeps[m].px = (p[m].px);
			//meeps[m].py = (1-p[m].pz);
		}
	}

	let interval = setInterval(self.step,1000/FPS);
}