window.CuppingBallsGame = function () {
	
	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const BALL = 200;
	const CUP = 250;


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
					line-height: 200px;
					font-size: 200px;
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

		self.px = 0.4 + i * 0.3;
		self.py = 0.8;
		self.altitude = 0;

		self.redraw = function(){

			self.$el.css({
				left: self.px * W + 'px',
				top: self.py * H + 'px'
			});

			self.$el.find('cuppingcup').css({
				'bottom':self.altitude*H + 'px',
			});

			self.$el.find('cuppingcupshadow').css({
				'opacity':(1-self.altitude),
			})
		}
	}

	const CuppingMeep = function(i){
		let self = this;
		self.$el = $('<cuppingmeep>').attr('n',i);

		let $shadow = $('<cuppingballshadow>').appendTo(self.$el);
		let $ball = $('<cuppingball>').appendTo(self.$el);
		let $inner = $('<cuppingballinner>').appendTo($ball);
		let $score = $('<cuppingscore>').appendTo($ball).text('');

		self.px = 0.4 + i * 0.3;
		self.py = 0.8;
		
		self.score = 0;

		self.redraw = function(){

			self.$el.css({
				left: self.px * W + 'px',
				top: self.py * H + 'px'
			})

			$inner.css({
				'transform':'rotate('+self.px*180+'deg)',
			})
		}

		self.addScore = function(){
			self.score++;
			$score.text(self.score).stop(false,false).css({opacity:1}).delay(200).animate({opacity:0});
		}

		self.showScore = function(){
			$score.text(self.score).stop(false,false).css({opacity:1});
		}
	}

	let pos = [];
	for(var i=0; i<6; i++){
		pos[i] = Math.floor(i/2) + 0.333 + 0.333*(i%2);
	}

	function initGame(count){
		for(var i=0; i<count; i++){
			meeps[i] = new CuppingMeep(i);
			meeps[i].px = pos[i];
			meeps[i].$el.appendTo($game);

			cups[i] = new CuppingCup(i);
			cups[i].px = pos[i];
			cups[i].altitude = 1;
			cups[i].$el.appendTo($game);

			$(cups[i]).delay(i*100).animate({altitude:0});
		}
	}

	initGame(6);

	self.step = function(){

		for(var m in meeps) meeps[m].redraw();
		for(var c in cups) cups[c].redraw();

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
			//meeps[m].px = (p[m].px);
			//meeps[m].py = (1-p[m].pz);
		}
	}

	let interval = setInterval(self.step,1000/FPS);
}