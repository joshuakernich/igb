window.MelodyMatchGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const KEYS = 4;
	const KEYW = 0.06;
	const BPM = 90;
	const BPS = BPM / 60;
	const BPB = 3;

	let audio = new AudioContext();
	audio.add('correct','./proto/audio/party/sfx-correct.mp3',0.3);
	audio.add('notes','./proto/audio/party/sfx-glockenspiel.mp3',0.3);
	audio.add('music','./proto/audio/party/music-ambient.mp3',0.3);

	const LEVEL = [
		[0,1,2,1,3],
		[2,0,1,3,1],
		[1,1,3,0,2],
		[3,0,3,1,2],
	]

	const MATCHUPS = [
		undefined,
		undefined,
		[[0,1],[0,1],[0,1]],
		[[0,1],[1,2],[0,2]],
		[[0,1],[2,3],[0,2],[1,3]],
		[[0,1],[2,3],[4]],
		[[0,1],[2,3],[4,5]],
	]

	const MelodyMap = function(map){
		let self = this;
		self.$el = $('<melodymap>').css({
			width: 100 + (map.length-1)*50 + 'px',
			height: 100 + (KEYS-1)*50 + 'px',
		})

		let $notes = [];

		for(var k=0; k<KEYS; k++){
			$('<melodyline>').appendTo(self.$el).css({
				left: '20px',
				right: '20px',
				top: 50 + (KEYS-k-1)*50 + 'px',
			})
		}

		for(var m=0; m<map.length; m++){
			$notes[m] = $('<melodynote>').appendTo(self.$el).attr('n',map[m]);
			$notes[m].css({
				left: 50 + (m * 50) + 'px',
				top: 50 + (KEYS-map[m]-1)*50 + 'px',
			});
		}

		let iBounceWas = -1;
		self.step = function(beat){

			if(beat<map.length){
				let bounce = (beat);
				let iBounce = Math.floor(bounce);
				let nNote = map[iBounce];

				if(iBounce > iBounceWas){
					audio.playAtTime('notes',nNote*2*4);

					$notes[iBounce].animate({
						width: '70px',
						height: '70px',
					},100).animate({
						width: '40px',
						height:'40px',
					})
				}

				iBounceWas = iBounce;
			} else{
				audio.stop('notes');
			}
		}
	}

	const MelodyMeep = function(n){

		let audio = new AudioContext();
		audio.add('notes','./proto/audio/party/sfx-glockenspiel.mp3',0.3);

		let self = this;
		self.$el = $('<melodymeep>');

		self.ax = 0;
		self.px = 0;

		self.score = 0;

		let $keys = [];

		let $arms = $('<melodyarms>').appendTo(self.$el);

		let meep = new PartyMeep(n);
		meep.$el.appendTo(self.$el);
		meep.$handLeft.hide();
		meep.$handRight.hide();

		let $score = $('<melodyscore>').appendTo(self.$el);

		let $board = $('<melodyboard>').appendTo(self.$el);

		for(var i=0; i<KEYS; i++){
			$keys[i] = $('<melodykey>').appendTo($board).attr('n',i);
		}

		let $ball = $('<melodyball>').appendTo(self.$el);
		$ball.css({
			left: '0px',
			bottom: '0px',
		});

		let iBounceWas = 0;

		self.step = function(beat){

			let dx = Math.min( KEYW*KEYS/2-KEYW/2, Math.max( -KEYW*KEYS/2+KEYW/2, self.px - self.ax ));
			
			$board.css({
				left:dx*W+'px',
				transform: 'translate(-50%) rotate('+dx*30+'deg)',
			});

			
			meep.$el.css({
				'transform':'rotate('+(dx*120)+'deg)',
			})
			$arms.css({
				left:(dx*0.4)*W+'px',
				'transform':'rotate('+(dx*100)+'deg)',
			});

			let bounce = (beat/BPB);
			let bp = bounce%1;
			$ball.css({
				bottom: 380 + Math.sin(bp*Math.PI) * 500,
			});

			if(bounce<0.5 || bounce > (self.melody.length+0.5)){
				audio.stop('notes');
				$ball.css({
					bottom: 380 + Math.sin(0.5*Math.PI) * 500,
				});
			} else {
				let iBounce = Math.floor(bounce);

				if(iBounce > iBounceWas){
					let nNote = 2-Math.ceil(dx/KEYW);
					audio.playAtTime('notes',nNote*2*4);
					$keys[nNote].animate({
						'top':'20px',
					},100).animate({
						'top':'0px',
					},100);

					if(nNote == self.melody[iBounce-1]) self.score++;

					$score.text(self.score);
				}
				iBounceWas = iBounce;
			}
		}

		self.initMelody = function(melody) {
			self.melody = melody;
		}
	}

	if( !MelodyMatchGame.init ){
		MelodyMatchGame.init = true;

		$("head").append(`
			<style>
				melodymatchgame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: gray;
					background-position: bottom 120px center;
					perspective: ${W*3}px;
					background: url(./proto/img/party/bg-village.png);
					background-size: 33.3% 100%;
				}

				melodymatchgame:before{
					content:"";
					display:block;
					position: absolute;
					inset: 0px;
					background: linear-gradient(to bottom, #326C76, transparent);
				}

				melodymeep{
					display: block;
					position: absolute;
					bottom: -100px;
				}

				melodyboard{
					display: inline-block;
					white-space: nowrap;
					position: absolute;
					left: 0px;
					bottom: 350px;
					transform: translate(-50%);
					z-index: 2;
					border-bottom: 20px solid white;
				}

				melodykey{
					display: inline-block;
					position: relative;
					width: ${KEYW*W}px;
					height: 50px;
					background: red;
					border-bottom: 20px solid rgba(0,0,0,0.5);
					border-radius: 10px;
					box-shadow: inset 0px -5px 5px rgba(0,0,0,0.5);

				}

				melodymap{
					display: block;
					position: absolute;
					left: 50%;
					top: 35%;
					background: white;
					transform: translate(-50%, -50%) rotate(-5deg);
					background: #F7F7D9;
					border: 10px solid white;
					box-shadow: 0px 5px 20px rgba(0,0,0,0.5);
				}

				melodynote{
					display: block;
					position: absolute;
					width: 40px;
					height: 40px;
					background: red;
					border-radius: 100%;
					transform: translate(-50%, -50%);
					border: 5px solid white;
					box-shadow: 0px 1px 3px black;
				}

				melodyline{
					background: black;
					height: 2px;
					display: block;
					position: absolute;
					transform: translateY(-50%);
					opacity: 0.3;
				}

				melodyball{
					display: block;
					position: absolute;
					width: 50px;
					height: 50px;
					background: white;
					transform: translateX(-50%);
					border-radius: 100%;
					z-index: 4;
				}

				melodyscore{
					display: block;
					position: absolute;
					bottom: 650px;
					left: -100px;
					width: 200px;
					color: white;
					text-align: center;
					font-size: 150px;
					opacity: 0.3;
				}

				melodyscore.final{
					opacity: 1;
					bottom: 400px;
				}

				melodykey[n='0'], melodynote[n='0']{ background: var(--n0); }
				melodykey[n='1'], melodynote[n='1']{ background: var(--n1); }
				melodykey[n='2'], melodynote[n='2']{ background: var(--n2); }
				melodykey[n='3'], melodynote[n='3']{ background: var(--n3); }
				melodykey[n='4'], melodynote[n='4']{ background: var(--n4); }

				melodyarms{
					display: block;
					position: absolute;
					bottom: 180px;
					left: 0px;
					width: 0px;
					height: 0px;
				}

				melodyarms:before{
					content: "";
					display: block;
					position: absolute;
					left: -110px;
					bottom: 0px;
					width: 220px;
					height: 200px;
					
					border-radius: 0px 0px 100% 100%;
					border: 20px solid white;
					box-sizing: border-box;
					transform-origin: bottom center;
					border-top: none;
				}

			</style>
		`)
	}

	let countMeep = undefined;
	let self = this;
	self.$el = $('<igb>');

	let $game = $('<melodymatchgame>').appendTo(self.$el);

	let hud = new PartyHUD();
	hud.$el.appendTo($game);

	let meeps = [];
	let meepsLive = [];

	function initGame(count){
		countMeep = count;
		for(var i=0; i<count; i++){
			meeps[i] = new MelodyMeep(i);
			meeps[i].$el.appendTo($game).css({
				bottom: -H+'px',
			})
		}

		initNextRound();
	}


	let isRoundLive = false;
	let nLevel = -1;
	let map;
	let level = undefined;
	function initNextRound(){
		nLevel++;
		level = LEVEL[nLevel];

		map = new MelodyMap(level);
		map.$el.appendTo($game).css({
			'top':'-100px',
		}).animate({
			'top':'25%',
		})

		meepsLive.length = 0;

		let matchup = MATCHUPS[countMeep][nLevel];
		let spacing = (1/(matchup.length-1));
		if(spacing==Infinity) spacing = 0;



		for(var m in matchup){
			let n = matchup[m];
			meeps[n].initMelody(level);
			meeps[n].ax = 0.25 + spacing * m * 0.5;
			meeps[n].$el.appendTo($game).css({
				left: W + meeps[n].ax*W + 'px',
			}).animate({
				bottom: '-100px',
			})

			meepsLive[m] = meeps[n];
		}

		audio.play('music',true);
		isRoundLive = true;


	}

	function finiRound(){
		audio.stop('music');
		audio.play('correct',true);
		map.$el.appendTo($game).animate({
			'top':'-100px',
		});

		for(var m in meepsLive) meepsLive[m].$el.animate({bottom:-H+'px'});

		if( MATCHUPS[countMeep][nLevel+1] ) setTimeout(initNextRound,1000);
		else {
			setTimeout(finiGame,2000);
		}
	}

	function finiGame(){
		let scores = [];
		for(var m in meeps){
			let meep = new PartyMeep(m);
			meep.$el.appendTo($game);
			meep.$el.css({
				'bottom':-W+'px',
				'left':W + (0.2 + 1/(countMeep-1) * m * 0.6)*W + 'px',
			}).delay(m*100).animate({
				'bottom':'0px',
			}).animate({
				'bottom':'-50px',
			});

			$('<melodyscore>').appendTo(meep.$el).text(meeps[m].score).addClass('final');

			scores[m] = meeps[m].score;
		}

		hud.initBanner('Finish');

		setTimeout(function(){
			window.doPartyGameComplete(scores);
		},3000)
	}

	hud.initPlayerCount(initGame);

	self.step = function(){
	
		if(isRoundLive){
			let timeCurrent = audio.getTime('music');
			let beat = (timeCurrent) * BPS;
			for(var m=0; m<meepsLive.length; m++) meepsLive[m].step(beat + m  + 0.1 - 6);

			map.step(beat + 0.1 - 1);

			if(beat>(level.length+3) * BPB){
				isRoundLive = false;
				finiRound();
			}
		}
		
		resize();
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	let interval = setInterval(self.step,1000/FPS);

	self.fini = function(){
		audio.stop('music');
		clearInterval(interval);
	}

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].px = (p[m].px);
			meeps[m].py = (1-p[m].pz);
		}
	}
}