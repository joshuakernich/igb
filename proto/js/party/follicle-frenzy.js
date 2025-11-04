window.FollicleFrenzyGame = function( playersMeta ){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const PLAYER_COUNT = 6;
	const GRIDSIZE = 15;
	const ROUND_TIME = 20;

	const UNTOUCHED = [
		    "      00000000      ",
		    "    000000000000    ",
		    "  0000000000000000  ",
		    "  0000000000000000  ",
		    " 00     000000   00 ",
		    "00       000      00",
		    "00        00      00",
		    "00          0     00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00   0000000000   00",
		    "00 00000000000000 00",
		    "0000            0000",
		    "000              000",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00       00       00",
		    " 00     0000     00 ",
		    " 000000000000000000 ",
		    "  0000000000000000  ",
		    "    000000000000    ",
		    "       000000       "
		]

	const BALD_BEARD = [
		    "      XXXXXXXX      ",
		    "    XXXXXXXXXXXX    ",
		    "  XXXXXXXXXXXXXXXX  ",
		    "  XXXXXXXXXXXXXXXX  ",
		    " XX     XXXXXX   XX ",
		    "XX       XXX      XX",
		    "XX        XX      XX",
		    "XX          X     XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX   0000000000   XX",
		    "XX 00000000000000 XX",
		    "X000            000X",
		    "000              000",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00       00       00",
		    " 00     0000     00 ",
		    " 000000000000000000 ",
		    "  0000000000000000  ",
		    "    000000000000    ",
		    "       000000       "
		]

	const CLEAN_SHAVEN = [
	    "      00000000      ",
	    "    000000000000    ",
	    "  0000000000000000  ",
	    "  0000000000000000  ",
	    " 00     000000   00 ",
	    "00       000      00",
	    "00        00      00",
	    "00          0     00",
	    "00                00",
	    "00                00",
	    "00                00",
	    "00                00",
	    "00                00",
	    "00                00",
	    "00                00",
	    "00                00",
	    "00   XXXXXXXXXX   00",
	    "00 XXXXXXXXXXXXXX 00",
	    "0XXX            XXX0",
	    "XXX              XXX",
	    "XX                XX",
	    "XX                XX",
	    "XX                XX",
	    "XX                XX",
	    "XX       XX       XX",
	    " XX     XXXX     XX ",
	    " XXXXXXXXXXXXXXXXXX ",
	    "  XXXXXXXXXXXXXXXX  ",
	    "    XXXXXXXXXXXX    ",
	    "       XXXXXX       "
	]

	const HANDLEBAR = [
		    "      00000000      ",
		    "    000000000000    ",
		    "  0000000000000000  ",
		    "  0000000000000000  ",
		    " 00     000000   00 ",
		    "00       000      00",
		    "XX        00      XX",
		    "XX          0     XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX   0000000000   XX",
		    "XX 00000000000000 XX",
		    "X000            000X",
		    "000              000",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00       XX       00",
		    " XX     XXXX     XX ",
		    " XXXXXXXXXXXXXXXXXX ",
		    "  XXXXXXXXXXXXXXXX  ",
		    "    XXXXXXXXXXXX    ",
		    "       XXXXXX       "
		]

	const MONK = [
	    "      XXXXXXXX      ",
	    "    XXXXXXXXXXXX    ",
	    "  XXXXXXXXXXXXXXXX  ",
	    "  XXXXXXXXXXXXXXXX  ",
	    " XX     XXXXXX   XX ",
	    "XX       XXX      XX",
	    "00        XX      00",
	    "00          X     00",
	    "00                00",
	    "00                00",
	    "00                00",
	    "00                00",
	    "00                00",
	    "00                00",
	    "00                00",
	    "00                00",
	    "00   XXXXXXXXXX   00",
	    "00 XXXXXXXXXXXXXX 00",
	    "0XXX            XXX0",
	    "XXX              XXX",
	    "XX                XX",
	    "XX                XX",
	    "XX                XX",
	    "XX                XX",
	    "XX       00       XX",
	    " 00     0000     00 ",
	    " 000000000000000000 ",
	    "  0000000000000000  ",
	    "    000000000000    ",
	    "       000000       "
	]

	const STRIPE = [
		    "      0XXXXXX0      ",
		    "    000XXXXXX000    ",
		    "  00000XXXXXX00000  ",
		    "  00000XXXXXX00000  ",
		    " 00     XXXXXX   00 ",
		    "00       XXX      00",
		    "00        XX      00",
		    "00          X     00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00   00XXXXXX00   00",
		    "00 0000XXXXXX0000 00",
		    "0000            0000",
		    "000              000",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00       XX       00",
		    " 00     XXXX     00 ",
		    " 000000XXXXXX000000 ",
		    "  00000XXXXXX00000  ",
		    "    000XXXXXX000    ",
		    "       XXXXXX       "
		]

	const STRIPE_INVERSE = [
		    "      X000000X      ",
		    "    XXX000000XXX    ",
		    "  XXXXX000000XXXXX  ",
		    "  XXXXX000000XXXXX  ",
		    " XX     000000   XX ",
		    "XX       000      XX",
		    "XX        00      XX",
		    "XX          0     XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX   XX000000XX   XX",
		    "XX XXXX000000XXXX XX",
		    "XXXX            XXXX",
		    "XXX              XXX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX                XX",
		    "XX       00       XX",
		    " XX     0000     XX ",
		    " XXXXXX000000XXXXXX ",
		    "  XXXXX000000XXXXX  ",
		    "    XXX000000XXX    ",
		    "       000000       "
		]

	const PATTERNS = [
		BALD_BEARD,
		HANDLEBAR,
		STRIPE,
		CLEAN_SHAVEN,
		MONK,
		STRIPE_INVERSE,
	]

	const ROUNDS = [
		undefined,
		undefined,
		[
			[[0,1]],
			[[0,1]],
			[[0,1]],
		],
		[
			[[0,1],[1,2],[0,2]],
			[[0,1],[1,2],[0,2]],
		],
		[
			[[0,1],[2,3]],
			[[0,1],[2,3]],
		],
		[
			[[0,1],[2,3],[4,0],[1,2],[3,4]],
		],
		[
			[[0,1],[2,3],[4,5]],
			[[0,1],[2,3],[4,5]],
		],
	]



	let audio = new AudioPlayer();
	audio.add('music','./proto/audio/party/music-creative.mp3',0.3,true);
	audio.add('shaver','./proto/audio/party/sfx-shaver.mp3',0,true);
	audio.add('sequence','./proto/audio/party/sfx-sequence.mp3',0.3);
	audio.add('correct','./proto/audio/party/sfx-correct.mp3',0.3);

	if(!FollicleFrenzyGame.didInit){
		FollicleFrenzyGame.didInit = true;

		$("head").append(`
			<style>
				folliclegame{
					display: block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					
					background-image: url(./proto/img/party/bg-box-factory.png);
					background-size: 100% 100%;
					background-position: center;
					perspective: ${W}px;
				}

				folliclegame:before{
					content: "";
					display: block;
					position: absolute;
					inset: 0px;
					background: linear-gradient( to top, #7443ba, transparent );
				}

				folliclearm{
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;	
					border-top: 30px solid white;
					border-right: 30px solid white;
					box-sizing: border-box;
					border-top-right-radius: 100%;
					transform-origin: top left;
				}



				folliclehand{
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
					width: 0px;
					height: 0px;
					transform: rotateX(-90deg);
					transform-style: preserve-3d;
					
				}

				folliclefist{
					display: block;
					position: absolute;
					top: 50px;
					left: -50px;	
					width: 100px;
					height: 100px;
					background: white;
					border-radius: 40px;
					display: none;
				}

				follicleshaver{
					display: block;
					position: absolute;
					width: 30px;
					height: 180px;
					background: red;
					bottom: 0px;
					left: -15px;
					border-radius: 15px 15px 0px 0px;
					box-sizing: border-box;
					transform-style: preserve-3d;
					border-right: 5px solid black;
					
				}

				follicleshaver:before{
					content: "";
					display: block;
					position: absolute;
					inset: 0px;
					transform-origin: bottom right;
					background: linear-gradient(to top, black, transparent);
					opacity: 0.5;
					transform-style: preserve-3d;
					transform: rotateX(90deg) rotateZ(20deg);
				}

				follicleshaver:after{
					content:"";
					display: block;
					position: absolute;
					left: -10px;
					right: -10px;
					bottom: 0px;
					height: 20px;
					background:white;
					box-sizing: border-box;
					border: 5px solid black;
					border-radius: 100% 100% 0px 0px;
				}

				folliclerow{
					display: block;
					line-height:0px;
				}

				folliclecell{
					display: inline-block;
					width: ${GRIDSIZE}px;
					height: ${GRIDSIZE}px;
				}

				folliclewall{
					width: 33.333%;
					display: inline-block;
					width: ${W}px;
					height: ${H}px;
					text-align: center;
					position: relative;
				}

				folliclemeep{
					display: block;
					position: absolute;
					transform: scale(0.7) rotateX(0deg);
					transform-origin: top center;
					transition: transform 1s;
					transform-style: preserve-3d;
				}

				folliclemeep.foreground follicleface{
					transform: rotateX(45deg)
				}

				folliclemeep.foreground{
					transform: scale(1);
				}

				folliclemeep.foreground folliclebody, folliclemeep.foreground folliclelegs{
					transform: translateY(-50px);
				}



				folliclebody{
					display: block;
					background: white;
					border-radius: 35%;
					position: absolute;
					width: 60%;
					height: 25%;
					top: 100%;	
					left: 20%;	
					transition: transform 0.5s;
				}

				folliclelegs{
					display: block;
					position: absolute;
					width: 50%;
					height: 300px;
					top: 120%;	
					left: 25%;	
					height: 100%;
					box-sizing: border-box;
					border-left: 30px solid white;
					border-right: 30px solid white;
					transition: transform 0.5s;
				}

				follicleface{
					display: inline-block;
					background: white;
					border-radius: 240px;
					position: relative;
					transition: transform 0.5s;
					transform-style: preserve-3d;
				}

				folliclehair{
					width: 102%;
					height: 102%;
					display:block;
					position: relative;
				}

				folliclehair:before{
					content:"";
					background: gray;
					display:block;
					position: absolute;
					inset: -20%;
					border-radius: 100%;
				}

				folliclehair:after{
					content:"";
					
					display:block;
					position: absolute;
					top: 0px;
					left: 0px;
					width: 25px;
					height: 25px;

					
				
					border-radius: 100%;
					border-top-width: 10px;
					border-right-width: 10px;
					border-color: black;
				}

				

				folliclemouth{
					width: 70px;
					height: 40px;
					background:#687078;
					position: absolute;
					left: 50%;
					bottom: 26%;
					display: block;
					border-radius: 0px 0px 100% 100%;
					transform: translateX(-50%);
				}


				follicleeye{
					width: 30px;
					height: 55px;
					background:#687078;
					position: absolute;
					left: 28%;
					top: 38%;
					display: block;
					border-radius: 100%;
				}

				follicleeye:last-of-type{
					left: auto;
					right: 28%;
				}

				folliclemeep[n='0'] folliclehair:before { background:red; }
				folliclemeep[n='1'] folliclehair:before { background:blue; }
				folliclemeep[n='2'] folliclehair:before { background:#33CD32; }
				folliclemeep[n='3'] folliclehair:before { background:#DD00FF; }
				folliclemeep[n='4'] folliclehair:before { background:#FF6600; }
				folliclemeep[n='5'] folliclehair:before { background:#FFBB00; }

				folliclemeep[n='0'] follicleshaver { background:red; }
				folliclemeep[n='1'] follicleshaver { background:blue; }
				folliclemeep[n='2'] follicleshaver { background:#33CD32; }
				folliclemeep[n='3'] follicleshaver { background:#DD00FF; }
				folliclemeep[n='4'] follicleshaver { background:#FF6600; }
				folliclemeep[n='5'] follicleshaver { background:#FFBB00; }

				follicleguide{
					width: 300px;
					height: 300px;
					position: absolute;
					top: 30%;
					left: 50%;
					transform: translate(-50%, -50%) rotate(-5deg);
					background: white;
					box-shadow: 0px 5px 20px black;
					background: #ddd;

					border: 20px solid white;
				}

				follicleguide follicleface{
					left: 50%;
					top: 50%;
					transform: translate(-50%, -50%) scale(0.5);

				}

				folliclescore{
					display: block;
					position: absolute;
					top: -200px;
					font-size: 100px;
					line-height: 200px;
					color: white;
					text-align: center;
					left: -50px;
					right: -50px;
					text-shadow: 0px 0px 50px #00050C;
				}
			</style>`);
	}

	const FollicleGuide = function(MAP) {
		let self = this;
		self.$el = $('<follicleguide>');

		new FollicleFace(MAP).$el.appendTo(self.$el);
	}

	const FollicleFace = function(MAP,isUnshaved=false) {

		let self = this;
		self.pw = (GRIDSIZE * MAP[0].length)/W;
		self.$el = $('<follicleface>');

		let state = [];
		let goal = [];

		$('<follicleeye>').appendTo(self.$el);
		$('<follicleeye>').appendTo(self.$el);
		$('<folliclemouth>').appendTo(self.$el);

		for(var y=0; y<MAP.length; y++){
			let $row = $('<folliclerow>').appendTo(self.$el);
			state[y] = [];
			goal[y] = [];
			for(var x=0; x<MAP[y].length; x++){
				let $cell = $('<folliclecell>').appendTo($row);

				state[y][x] = goal[y][x] = (MAP[y][x] == '0');

				if(isUnshaved) state[y][x] = (MAP[y][x] != ' ');
				
				if( state[y][x] ){
					$('<folliclehair>').appendTo($cell).attr('dir',(x>=MAP[y].length/2)?1:-1).attr('x',x).attr('y',y).css({
						transform: `translate(${-2+Math.random()*4}px,${-2+Math.random()*4}px)`
					})
				}
			}
		}

		self.shaveAt = function(ox,oy){
			let gx = (ox*W)/GRIDSIZE;
			let gy = (oy*H)/GRIDSIZE - 3;

			for(var y=0; y<MAP.length; y++){
				for(var x=0; x<MAP[y].length; x++){
					let dx = Math.abs(gx-x);
					let dy = Math.abs(gy-y);
					let d = Math.sqrt(dx*dx + dy*dy);
					if(d < 2.5){
						if(state[y][x]){
							state[y][x] = false;
							let rx = - 100 + Math.random()*200;
							let $hair = self.$el.find('folliclehair[x='+x+'][y='+y+']');
							$hair.addClass('dead');
							$hair.animate({ top:-50, left:rx*0.1 },200).animate({top:1000,left:rx },1000);
							cntShaver = FPS/2;
						}
					}
				}
			}
		}

		self.evaluate = function(){

			let cntCorrect = 0;
			let cntIncorrect = 0;

			for(var y in goal){
				for(var x in goal[y]){
					if(goal[y][x] != MAP[y][x] || state[y][x] != MAP[y][x]){
						//state is (or should be) different
						if(goal[y][x] == state[y][x]) cntCorrect++;
						else cntIncorrect++;
					}
				}
			}

			return Math.max( 0, 100 - cntIncorrect );

			return Math.floor( cntCorrect/(cntCorrect+cntIncorrect) * 100 );

		}
	}

	const FollicleMeep = function(n,MAP){

		let self = this;
		self.score = 0;
		self.n = n;
		self.ax = 0.5;
		self.ay = 0.5;
		self.oy = 0;
		self.isEnabled = false;

		self.$el = $('<folliclemeep>').attr('n',n);

		let $body = $('<folliclebody>').appendTo(self.$el);
		let $legs = $('<folliclelegs>').appendTo(self.$el);
		let $score = $('<folliclescore>').appendTo(self.$el);

		let face = new FollicleFace(MAP,true);
		face.$el.appendTo(self.$el);

		let $hand = $(`
			<folliclehand>
				<follicleshaver></follicleshaver>
				<folliclefist></folliclefist>
			</folliclehand>
		`).appendTo(face.$el).hide();

		self.redraw = function(){

			self.$el.css({
				left: W*self.wall + self.ax*W + 'px',
				top: (self.ay+self.oy)*H + 'px',
			});

			if(self.wall==1 && self.isEnabled){
				let ox = self.player.px - self.ax;
				let oy = self.player.py - self.ay;

				let r = ox>face.pw/2?-15:15;

				// resist moving too far from face
				if(ox > 0.24) ox = 0.24 + (ox-0.24) * 0.3;
				if(ox < -0.08) ox = -0.08 + (ox+0.08) * 0.3;

				$hand.css({
					left: ox*W + 'px',
					top: oy*H + 'px',
					//'z-index':20 + Math.floor(oy/GRIDSIZE),
					//transform: 'rotate('+r+'deg)',
				});

				face.shaveAt(ox,oy);
			}
		}


		self.toForeground = function(b) {
			if(b){
				self.$el.addClass('foreground');
				self.setEnabled(true);
				self.finiHop();
			} else {
				self.$el.removeClass('foreground');
				self.setEnabled(false);
			}
		}

		self.setScale = function(scale) {
			self.$el.css({
				transform: 'scale('+scale+')'
			});
		}

		self.evaluate = function(){
			self.amt = face.evaluate();

			$({amt:0}).animate({amt:self.amt},{duration:1000,step:function(a){
				$score.text(Math.floor(a)+'%');
				self.player.score = self.player.tally + Math.floor(a);
			}});
		}

		self.setEnabled = function(b) {
			self.isEnabled = b;
			if(b) $hand.show();
			else $hand.hide();
		}

		self.bindPlayer = function (player) {
			self.player = player;
		}

		self.finiHop = function(){
			$body.stop(true,false).animate({top:'100%'});
			face.$el.stop(true,false).animate({top:'0px'});
		}

		self.initHop = function(){

			$body.animate({
				top: '105%',
			},100).animate({
				top: '100%',
			},100);

			face.$el.animate({
				top: '50px',
			},100).animate({
				top: '0px',
			},{
				duration:100,
				complete:function(){
					self.initHop();
				},
			})
		}
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<folliclegame>').appendTo(self.$el);
	let $blur = $('<blurlayer>').appendTo($game);

	let players = [];
	function initGame(count){

		
		audio.play('shaver');

		for(let i=0; i<count; i++){
			players[i] = {score:0, tally:0};
		}

		setTimeout(initPlay,1000);
	}


	let meeps = [];
	let guide;
	let nPattern = -1;
	let iCohort = -1;
	let iRound = 0;
	let cntShaver = 0;

	function initTutorial(){

		hud.initTutorial('Stubble Trouble',
		{ x:1.25, y:0.45, msg:'Align yourself<br>with your Avatar', icon:'align'},
		{ x:1.75, y:0.45, msg:'Move around<br>to shave your face', icon:'around'},
		)


		for(var p in players){
			meeps[p] = new FollicleMeep(p, UNTOUCHED);
			meeps[p].bindPlayer(players[p]);
			meeps[p].wall = 1;
			meeps[p].ax = 0.08 + 0.65 * (1/(players.length-1))*p;
			meeps[p].ay = 0.3;
			meeps[p].oy = 0.3;

			meeps[p].$el.appendTo($game);
			
			meeps[p].redraw();
			meeps[p].setEnabled(true);
			meeps[p].setScale(0.5);
		}

		hud.initTimer(20,finiTutorial);
	}

	function finiTutorial(){
		$blur.hide();
		hud.finiTutorial();
		hud.finiTimer();

		for(var m in meeps){
			meeps[m].score = 0;
			meeps[m].$el.remove();
		}

		meeps.length = 0;
		setTimeout(initPlay,1000);
	}

	function initPlay(){
		hud.initPlayers(players);
		setTimeout( initNextCohort, 1000 );
	}

	function initNextCohort(){
		iCohort++;
		nPattern++;
		
		if(!ROUNDS[players.length][iRound][iCohort]){
			iCohort = 0;
			iRound++;
		}

		if(!ROUNDS[players.length][iRound]){
			finiGame();
			return;
		}

		audio.play('music');

		for(var p in players) players[p].tally = players[p].score;

		let cohort = ROUNDS[players.length][iRound][iCohort];

		let delay = 0;

		if(iCohort==0){

			delay = 3000;
			setTimeout(function(){
				hud.initRound(iRound,ROUNDS[players.length].length);
			},0);

			setTimeout(function(){
				hud.finiBanner();
			},2000);
		}

		guide = new FollicleGuide(PATTERNS[nPattern]);
		guide.$el.appendTo($game).css({
			top: '-25%',
		}).delay(delay).animate({
			top:'30%'
		});

		for(let c in cohort){
			meeps[c] = new FollicleMeep(cohort[c],PATTERNS[nPattern]);
			meeps[c].bindPlayer(players[cohort[c]]);
			meeps[c].wall = 1;
			meeps[c].ax = 0.75 - 0.5*c - 0.1 - 2;
			meeps[c].ay = 0.3;
			meeps[c].$el.appendTo($game);
			meeps[c].redraw();
			setTimeout( meeps[c].initHop, c * 50 );

			$(meeps[c]).delay(delay).animate({
				ax:0.7 - 0.4*c - 0.1,
			},2000);
		}

		setTimeout(function(){
			hud.summonPlayers(cohort);
		},delay+500);

		setTimeout(function(){
			hud.finiBanner();
			for(var m in meeps) meeps[m].finiHop();
		},delay+2500);

		setTimeout(function(){
			hud.initTimer(ROUND_TIME,finiRound);
			for(var m in meeps) meeps[m].toForeground(true);
		},delay+3500);
	}

	function finiRound(){

		hud.finiTimer();

		

		audio.play('sequence',true);

		for(var m in meeps){
			meeps[m].evaluate();
			meeps[m].setEnabled(false);
		}

		setTimeout(function(){
			audio.play('correct',true);
		},1000);

		setTimeout(function(){

			guide.$el.appendTo($game).css({
				top: '30%',
			}).animate({
				top:'-25%'
			},{
				complete:guide.$el.remove
			});

			for(var m in meeps){
				meeps[m].toForeground(false);
				setTimeout( meeps[m].initHop, m * 50 );

				$(meeps[m]).animate({
					ax:0.75 - 0.5*m - 0.1 + 2,
				},2000);
			}

		},3000);


		setTimeout(initNextCohort,5000);
		
	}

	function finiGame(){

		audio.stop('music');
		let scores = [];

		for(var p in players) scores[p] = players[p].score;

		let rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores,rewards);

		setTimeout(function(){
			self.fini();
			window.doPartyGameComplete(rewards);
		},5000);
	}


	let hud = new PartyHUD();
	hud.$el.appendTo($game);
	
	if( playersMeta ) setTimeout( function(){ initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	let speed = 0.05;

	function step(){
		resize();
		cntShaver--;
		if(cntShaver<0) cntShaver = 0;

		for(var m in meeps) meeps[m].redraw();

		audio.setVolume('shaver',cntShaver/FPS);

		hud.updatePlayers(players);
	}

	setInterval(step,1000/FPS);

	self.setPlayers = function(p){
		for(var m in players){
			players[m].px = p[m].px;
			players[m].py = (1-p[m].pz);
			//meeps[m].z = p[m].pz*W;
		}
	}

	self.fini = function(){
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	}
}