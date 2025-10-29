window.MelodyMatchGame = function( playersMeta ){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const KEYS = 4;
	const KEYW = 0.06;
	const BPM = 120;
	const BPS = BPM / 60;
	const BPB = 3;

	let audio = new AudioPlayer();
	audio.add('correct','./proto/audio/party/sfx-correct.mp3',0.3);
	audio.add('incorrect','./proto/audio/party/sfx-incorrect.mp3',0.2);
	audio.add('notes','./proto/audio/party/sfx-glockenspiel.mp3',0.3);
	audio.add('music','./proto/audio/party/music-ambient.mp3',0.3,true);
	audio.add('woosh','./proto/audio/party/sfx-woosh.mp3',0.2);

	const MELODIES = [
		[0,1,2],
		[2,0,1,3],
		[1,1,3,0,2],
		[3,0,3,1,2],
	]

	const ROUNDS = [
		undefined,
		undefined,
		[{melody:MELODIES[0]},{melody:MELODIES[1]},{melody:MELODIES[2]}],
		[{melody:MELODIES[0]},{melody:MELODIES[1]},{melody:MELODIES[2]}],
		[{melody:MELODIES[1]},{melody:MELODIES[2]}],
		[{melody:MELODIES[1]},{melody:MELODIES[2]}],
		[{melody:MELODIES[1]},{melody:MELODIES[2]}],
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

		let audioNotes = new AudioPlayer();
		audioNotes.add('notes','./proto/audio/party/sfx-glockenspiel.mp3',0.3);

		let self = this;
		self.$el = $('<melodymeep>');

		self.n = n;
		self.tally = 0;
		self.score = 0;
		self.ax = 0;
		self.px = 0;
		self.isComplete = false;
		self.isFirst = false;

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

		
		let iBounceWas = undefined;
		let iBounceStart = undefined;
		let iProgress = 0;
	
		self.step = function(beat){

			let bounce = (beat/BPB);
			let phase = bounce%1;
			let iBounce = Math.floor(bounce);

			if(iBounceWas == undefined) iBounceStart = iBounceWas = Math.ceil(bounce) + (self.isFirst?melody.length-0.5:0.5);

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

			

			if( (iProgress + phase) > (self.melody.length + 0.5) ) self.isComplete = true;

			if( bounce < iBounceWas || self.isComplete ){
				audioNotes.stop('notes');
				phase = 0.5;
			} else {
				if(iBounce > iBounceWas){

					let nNote = 2-Math.ceil(dx/KEYW);
					
					$keys[nNote].animate({
						'top':'20px',
					},100).animate({
						'top':'0px',
					},100);

					let str = '';
					while(str.length<iProgress) str += '✓';

					if(self.melody=='freeplay'){
						audioNotes.playAtTime('notes',nNote*2*4);
					} else {
						if(nNote == self.melody[iProgress]){
							//yay, progress!
							audioNotes.playAtTime('notes',nNote*2*4);
							iProgress++;
							$score.text(str+'✓').css({opacity:0.4});

							//if( iProgress < self.melody.length ) $score.delay(200).animate({opacity:0});
						}
						else{
							iProgress = 0;
							$score.text(str+'✗').css({opacity:0.4}).delay(200).animate({opacity:0});
							audio.play('incorrect',true);
						}
					}

					
				}
				iBounceWas = iBounce;

				self.score = self.tally + bounce - iBounceStart;
				//$score.text(self.score);
			}

			$ball.css({
				bottom: 400 + Math.sin(phase*Math.PI) * 500,
			});
		}

		self.initMelody = function(melody,isFirst) {
			self.melody = melody;
			self.isFirst = isFirst;
			self.isComplete = false;

			self.tally = self.score;

			iProgress = 0;
			$score.text('');
			iBounceWas = iBounceStart = undefined;
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
					background: linear-gradient( to top, gray, transparent );
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
					margin-bottom:10px;

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
					bottom: 500px;
					left: -200px;
					width: 400px;
					color: white;
					text-align: center;
					font-size: 100px;
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
	let $blur = $('<blurlayer>').appendTo($game);

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

		

		//initNextRound();
		initTutorial();
	}

	let timeStart;
	let isRoundLive = false;
	let iRound = -1;
	let iPlayer = -1;
	let map;
	let melody;
	let slots = [];

	function initTutorial(){
		for(var m=0; m<meeps.length; m++){
			meepsLive[m] = meeps[m];
			meepsLive[m].initMelody('freeplay');
			meepsLive[m].ax = 0.15 + 0.7/(meeps.length-1) * m;
			meepsLive[m].$el.css({
				'bottom':[0,-20][m%2]+'px',
				'left': W + meepsLive[m].ax*W + 'px',
				'transform':'scale(0.5)',
			})
		}

		hud.initTutorial(
			'Melody Match',
			{x:1.15, y:0.45, msg:'Align yourself<br>to your avatar',icon:'align'},
			{x:1.7, y:0.45, msg:'Move left & right<br>to play the target melody',icon:'side-to-side'},
		);

		isRoundLive = true;
		timeStart = new Date().getTime();

		hud.initTimer(30,finiTutorial);
	}

	function finiTutorial(){

		$blur.hide();
		isRoundLive = false;

		for(var m in meeps){
			meeps[m].$el.hide();
			meeps[m].tally = meeps[m].score = 0;
		}

		hud.finiTimer();
		hud.finiTutorial();

		setTimeout(function(){
			hud.initPlayers(meeps);
		},1000);

		setTimeout(initNextRound,2000);
	}

	function initNextRound(){
		iRound++;
		iPlayer = -1;

		meepsLive.length = 0;

		melody = ROUNDS[countMeep][iRound].melody;

		map = new MelodyMap(melody);
		map.$el.appendTo($game).css({
			'top':'-100px',
		}).animate({
			'top':'30%',
		})

		initNextPlayer();
		initNextPlayer();

		setTimeout(function(){
			hud.initRound( iRound, ROUNDS[countMeep].length );
		},2000);

		setTimeout(function(){
			hud.finiBanner();
		},4000);

		setTimeout(function(){
			let cohort = [];
			for(var m in meepsLive) cohort[m] = meepsLive[m].n;
			hud.summonPlayers(cohort);
		},6000);

		setTimeout(function(){
			hud.finiBanner();
		},8000);

		setTimeout( initPlay, 10000 );
	}

	function initPlay(){
		audio.play('music',true);
		isRoundLive = true;
		timeStart = new Date().getTime();
	}
	
	function initNextPlayer(){
		audio.play('woosh',true);
		iPlayer++;

		let nSlot = 0;
		while(meepsLive[nSlot]) nSlot++;

		if(meeps[iPlayer]){
			meepsLive[nSlot] = meeps[iPlayer];
			meepsLive[nSlot].initMelody(melody,iPlayer<2);
			meepsLive[nSlot].ax = 0.25 + nSlot * 0.5;
			meepsLive[nSlot].$el.appendTo($game).show().css({
				left: W + meepsLive[nSlot].ax*W + 'px',
				'transform':'',
			}).animate({
				bottom: '-100px',
			});
		} else {
			let isRoundComplete = true;
			for(var m in meeps) if(!meeps[m].isComplete) isRoundComplete = false;
			if(isRoundComplete) finiRound();
		}
	}

	function finiRound(){

		isRoundLive = false;

		audio.stop('music');
		audio.play('woosh',true);
		map.$el.appendTo($game).animate({
			'top':'-100px',
		});

		for(var m in meeps){
			meeps[m].isComplete = false;
			meeps[m].$el.animate({bottom:-H+'px'});
		}

		if( ROUNDS[countMeep][iRound+1] ) setTimeout(initNextRound,1000);
		else {
			setTimeout(finiGame,2000);
		}
	}

	function finiGame(){
		let scores = [];
		for(var m in meeps){
			scores[m] = -meeps[m].score;
		}
		/*for(var m in meeps){
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

		hud.initBanner('Finish');*/

		hud.showFinalScores(scores,window.scoresToRewards(scores));

		setTimeout(function(){
			window.doPartyGameComplete(scores);
		},5000)
	}

	if( playersMeta ) setTimeout( function(){ initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	self.step = function(){
	
		if(isRoundLive){
			//let timeCurrent = audio.getTime('music');
			let timeCurrent = new Date().getTime();
			let timeElapsed = (timeCurrent - timeStart)/1000;
			let beat = timeElapsed * BPS;
			for(var m=0; m<meepsLive.length; m++){

				if(!meepsLive[m]) continue;

				meepsLive[m].step(beat + m);

				if( meepsLive[m].isComplete ){
					meepsLive[m].$el.delay(1000).animate({bottom:-H+'px'});
					meepsLive[m] = undefined;
					setTimeout( initNextPlayer, 2000 );
					setTimeout( function(){
						audio.play('woosh',true);
					}, 1000 );
				}
			}

			if(map) map.step(beat);

			/*if(beat>(level.length+3) * BPB){
				isRoundLive = false;
				finiRound();
			}*/


			hud.updatePlayers(meeps);
		} else {
			for(var m in meepsLive) if(meepsLive[m]) meepsLive[m].step(0);
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
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	}

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].px = (p[m].px);
			meeps[m].py = (1-p[m].pz);
		}
	}
}