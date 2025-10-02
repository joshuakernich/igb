



window.FollicleFrenzyGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const PLAYER_COUNT = 6;
	const GRIDSIZE = 15;

	const MAP = [
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
		    "  00000000000000000 ",
		    "  0000000000000000  ",
		    "    000000000000    ",
		    "       000000       "
		]

	let goal = [];

	for(var y in MAP){
		goal[y] = [];
		for(var x in MAP[y]){
			goal[y][x] = MAP[y][x];

			if(y>20 || (y>6 && x>17) || (y>6 && x<2)) goal[y][x] = ' ';
		}
	}

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-playroom.mp3',0.3,true);
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
					
					background: url(./proto/img/party/bg-village.png);
					background-size: 33.3% 100%;
					background-position: center;
					perspective: ${W*3}px;
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
				}

				follicleshaver{
					display: block;
					position: absolute;
					width: 50px;
					height: 180px;
					background: red;
					top: 0px;
					left: -25px;
					border-radius: 0px 0px 15px 15px;
					box-sizing: border-box;

					border-top: 10px groove white;
				}

				folliclerow{
					display: block;
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
					transition: all 1s;
				}

				folliclemeep.foreground{
					transform: scale(1) rotateX(30deg);
				}

				folliclebody{
					display: block;
					background: white;
					border-radius: 25%;
					position: absolute;
					width: 60%;
					height: 300px;
					top: 100%;	
					left: 20%;	
				}

				follicleface{
					display: inline-block;
					background: white;
					border-radius: 240px;
					position: relative;
				}

				folliclehair{
					width: 100%;
					height: 100%;
					display:block;
					position: relative;
				}

				folliclehair:after{
					content:"";
					width: 160%;
					height: 300%;
					background: gray;
					display:block;
					position: absolute;
					top: -20%;
					left: -30%;
					border-radius: 100% 100% 100% 0px;
					box-sizing: border-box;
				}

				folliclehair[dir='-1']{
					transform: rotate(30deg);
				}

				folliclehair[dir='1']{
					transform: rotate(-30deg);
				}

				folliclehair[dir='1']:after{
					border-radius: 100% 100% 0px 100%;
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

				folliclemeep[n='0'] folliclehair:after { background:red; }
				folliclemeep[n='1'] folliclehair:after { background:blue; }
				folliclemeep[n='2'] folliclehair:after { background:#33CD32; }
				folliclemeep[n='3'] folliclehair:after { background:#DD00FF; }
				folliclemeep[n='4'] folliclehair:after { background:#FF6600; }
				folliclemeep[n='5'] folliclehair:after { background:#FFBB00; }

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

	const FollicleGuide = function() {
		let self = this;
		self.$el = $('<follicleguide>');

		new FollicleFace(goal).$el.appendTo(self.$el);
	}

	let cntShaver = 0;

	const FollicleFace = function(MAP) {

		let self = this;
		self.pw = (GRIDSIZE * MAP[0].length)/W;
		self.$el = $('<follicleface>');

		let state = [];

		$('<follicleeye>').appendTo(self.$el);
		$('<follicleeye>').appendTo(self.$el);
		$('<folliclemouth>').appendTo(self.$el);

		for(var y=0; y<MAP.length; y++){
			let $row = $('<folliclerow>').appendTo(self.$el);
			state[y] = [];
			for(var x=0; x<MAP[y].length; x++){
				let $cell = $('<folliclecell>').appendTo($row);
				if(MAP[y][x]=='0') $('<folliclehair>').appendTo($cell).attr('dir',(x>=MAP[y].length/2)?1:-1).attr('x',x).attr('y',y).css({'z-index':10+y});

				state[y][x] = MAP[y][x];
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
					if(d<2.5){
						if(state[y][x] == '0'){
							state[y][x] = ' ';
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

		self.compareState = function(goal){


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

	const FollicleMeep = function(n){

		let self = this;
		self.score = 0;
		self.n = n;
		self.ax = 0.5;
		self.ay = 0.5;
		self.px = 0.5;
		self.py = 0.5;
		self.isEnabled = false;

		self.$el = $('<folliclemeep>').attr('n',n);

		$('<folliclebody>').appendTo(self.$el);
		let $score = $('<folliclescore>').appendTo(self.$el);

		let face = new FollicleFace(MAP);
		face.$el.appendTo(self.$el);

		let $hand = $(`
			<folliclehand>
				<follicleshaver></follicleshaver>
				<folliclefist></folliclefist>
			</folliclehand>
		`).appendTo(self.$el).hide();

		self.redraw = function(){

			self.$el.css({
				left: W*self.wall + self.ax*W + 'px',
				top: self.ay*H + 'px',
			});

			if(self.wall==1 && self.isEnabled){
				let ox = self.px - self.ax;
				let oy = self.py - self.ay;

				let r = ox>face.pw/2?-15:15;

				$hand.css({
					left: ox*W + 'px',
					top: oy*H + 'px',
					'z-index':20 + Math.floor(oy/GRIDSIZE),
					transform: 'rotate('+r+'deg)',
				});

				face.shaveAt(ox,oy);
			}
		}

		self.toForeground = function(b) {
			if(b){
				self.$el.addClass('foreground');
				$hand.show();
				self.setEnabled(true);
			} else {
				self.$el.removeClass('foreground');
				$hand.hide();
				self.setEnabled(false);
			}
		}

		self.evaluate = function(goal){
			self.amt = face.compareState(goal);

			$({amt:0}).animate({amt:self.amt},{duration:1000,step:function(a){
				$score.text(Math.floor(a)+'%');
			}});
		}

		self.setEnabled = function(b) {
			self.isEnabled = b;
			if(b) $hand.show();
			else $hand.hide();
		}
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<folliclegame>').appendTo(self.$el);

	let meeps = [];
	function initGame(count){

		audio.play('music');
		audio.play('shaver');

		for(let i=0; i<count; i++){
			meeps[i] = new FollicleMeep(i);
			meeps[i].ax = -0.2;
			meeps[i].wall = 0;
			meeps[i].$el.appendTo( $game );

			setTimeout(function(){
				meeps[i].ax = 0.5 + (meeps.length/2-i)*0.15 - 0.17;
				meeps[i].ay = 0.5 + i%2*0.05; 
			},200 + i*100);
		}

		setTimeout( initGuide, 2000);
		setTimeout( initNextRound, 2000);
	}

	const COUNT = 2;
	let iRound = -1;
	let rangeRound = 0;
	let guide;

	function initGuide(){
		guide = new FollicleGuide();
		guide.$el.appendTo($game).css({
			top: '-25%',
		}).animate({
			top:'30%'
		});
	}

	function initNextRound(){
		iRound++;
		rangeRound = Math.min( 2, meeps.length - iRound*COUNT );

		for(var i=0; i<rangeRound; i++){
			let n = iRound*COUNT+i;
			meeps[n].wall = 1;
			meeps[n].ax = 0.75 - 0.5*i - 0.1;
			meeps[n].ay = 0.3;
			meeps[n].toForeground(true);
		}

		setTimeout(function(){
			hud.initTimer(20,finiRound);
		},2000);
	}

	function finiRound(){

		hud.finiTimer();

		audio.play('sequence',true);

		for(var i=0; i<rangeRound; i++){
			let n = iRound*2+i;
			meeps[n].evaluate(goal);
			meeps[n].setEnabled(false);
		}

		setTimeout(function(){
			audio.play('correct',true);
		},1000);

		setTimeout(function(){
			for(var i=0; i<rangeRound; i++){
				let n = iRound*COUNT+i;
				meeps[n].wall = 2;
				meeps[n].ax = 0.5 + (meeps.length/2-n)*0.15 - 0.17;
				meeps[n].ay = 0.5 + n%2*0.05; 
				meeps[n].toForeground(false);
			}
		},3000);


		if( (iRound+1)*COUNT < meeps.length ) setTimeout(initNextRound,5000);
		else setTimeout(finiGame,5000);
	}

	function finiGame(){

		hud.initBanner('Finish');

		guide.$el.animate({top:'-25%'});

		for(let i=0; i<meeps.length; i++){
			meeps[i].wall = 1;
			meeps[i].ax = 0.5 + (meeps.length/2-i)*0.15 - 0.17;
			meeps[i].ay = 0.5 + i%2*0.05; 
		}

		setTimeout(function(){
			self.fini();
			let scores = getFinalScores();
			window.doPartyGameComplete(scores);
		},4000);
	}

	function getFinalScores(){
		let ranks = [];
		for(var a in meeps){
			ranks[a] = 0;
			for(var b in meeps){
				if(meeps[a].amt >= meeps[b].amt) ranks[a]++;
			}
		}
		let scores = [];
		for(var r in ranks) scores[r] = Math.floor( (10/ranks.length) * (ranks[r]) );

		return scores;
	}

	let hud = new PartyHUD();
	hud.$el.appendTo($game);
	hud.initPlayerCount(initGame);

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
		for(var m in meeps){
			meeps[m].redraw();

			/*meeps[m].$el.css({
				left: meeps[m].wall*W + meeps[m].x + 'px',
			})*/
		}

		audio.setVolume('shaver',cntShaver/FPS);
	}

	setInterval(step,1000/FPS);

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].px = p[m].px;
			meeps[m].py = (1-p[m].pz);
			//meeps[m].z = p[m].pz*W;
		}
	}

	self.fini = function(){
		audio.stop('music');
	}
}