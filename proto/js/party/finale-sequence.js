window.FinaleSequence = function( playersMeta ){

	const FinaleExplosion = function(size,color){

		let self = this;
		self.$el = $('<finaleexplosioncontainer>');

		$('<finaleexplosion>').appendTo(self.$el).css({
			width: size +'px',
			height: size +'px',
			background: color,
		}).animate({
			width: (size * 1.5) + 'px',
			height: (size * 1.5) + 'px',
		},200).delay(200).animate({
			width: '0px',
			height: '0px',
			opacity: 0,
		},1000);

		for(var i=0; i<6; i++){
			let sizeSmoke = 20 + Math.random() * 20;
			let r = Math.random() * Math.PI*2;
			$('<finalesmoke>').appendTo(self.$el).css({
				width: sizeSmoke + 'px',
				height: sizeSmoke + 'px',
				left: Math.cos(r) * size/2 * Math.random(),
				top: Math.sin(r) * size/2 * Math.random(),
			}).animate({
				left: Math.cos(r) * (size*1.5)/2,
				top: Math.sin(r) * (size*1.5)/2,
				width: (sizeSmoke*2) + 'px',
				height: (sizeSmoke*2) + 'px',
			},200 + Math.random()*100).animate({
				left: Math.cos(r) * (size*2)/2,
				top: Math.sin(r) * (size*2)/2,
				width: (sizeSmoke) + 'px',
				height: (sizeSmoke) + 'px',
				opacity: 0,
			},1000)
		}
	}

	const W = 1600;
	const H = 1000;
	const FPS = 50;

	new BoxPartyGame();

	if( !FinaleSequence.init ){
		FinaleSequence.init = true;

		$("head").append(`
			<style>
				finalesequence{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background-size: 100%;
					background-position: bottom center;
					color: white;
					background: black;
					perspective: ${W*3}px;

					background: url(./proto/img/party/bg-cosmos.jpg);
	                background-size: 100%;
	                background-position: center;
				}

				finalesequence:before{
					content:"";
					display:block;
					position: absolute;
					inset: 0px;
					background: linear-gradient(to top, blue, transparent, transparent);
				}

				finaleplatform{
					display:block;
					width: ${W*0.5}px;
					height: ${W}px;
					left: ${W*1.25}px;
					background: #360676;
					position: absolute;
					transform: rotateX(90deg);
					transform-style: preserve-3d;
					transform-origin: bottom center;
					bottom: 0px;
				}

				finalemouth{
					display:block;
					position: absolute;
					background: white;
					width: 70px;
					height: 20px;
					top: 50px;
					left: 0px;
					border-radius: 0px 0px 100% 100%;
					transform: translate(-50%,-10%);
					box-shadow: 0px 0px 50px black;
				}

				finalevortex{
					display:block;
					position: absolute;
					inset: 0px;
					background: url(./proto/img/party/bg-vortex.gif);
					background-size: cover;
					background-position: center;
				}

				finalesmoke{
					display: block;
					position: absolute;
					background: white;
					border-radius: 100%;
					transform: translate(-50%, -50%);
				}

				finaleexplosioncontainer{
					display: block;
					position: absolute;
				}

				finaleexplosion{
					display: block;
					position: absolute;
					overflow: visible;
					transform: translate(-50%, -50%);
					border-radius: 100%;
					opacity: 0.9;
				}

			</style>
		`)
	}

	let self = this;

	let audio = new AudioPlayer();
	audio.add('intro','./proto/audio/party/speech-finale-intro.mp3',0.5);
	audio.add('last','./proto/audio/party/speech-finale-last.mp3',0.5);
	audio.add('second-to-last','./proto/audio/party/speech-finale-second-to-last.mp3',0.5);
	audio.add('middle','./proto/audio/party/speech-finale-middle.mp3',0.5);
	audio.add('third','./proto/audio/party/speech-finale-third.mp3',0.5);
	audio.add('second','./proto/audio/party/speech-finale-second.mp3',0.5);
	audio.add('winner','./proto/audio/party/speech-finale-first.mp3',0.5);
	audio.add('reward','./proto/audio/party/speech-finale-reward.mp3',0.5);
	audio.add('outro','./proto/audio/party/music-outro.mp3',0.3);
	audio.add('music','./proto/audio/party/music-awards.mp3',0.25);
	audio.add('reveal','./proto/audio/party/music-reveal.mp3',0.5);
	audio.add('explode','./proto/audio/party/sfx-explode.mp3',0.4);
	audio.add('woosh','./proto/audio/party/sfx-woosh.mp3',0.1);
	audio.add('fall','./proto/audio/party/sfx-fall.mp3',0.3);

	const SEQUENCE = [
		undefined,
		undefined,
		['second','winner'],
		['last','second','winner'],
		['last','second-to-last','second','winner'],
		['last','second-to-last','middle','second','winner'],
		['last','second-to-last','middle','third','second','winner'],
	]

	self.$el = $('<igb>');
	let $game = $('<finalesequence>').appendTo(self.$el);
	let $platform = $('<finaleplatform>').appendTo($game);

	let size = W * 0.3;
	let transform = {
		w:size,h:size,d:size,
		x:W*0.25,
		y:-W/2,
		altitude:size/2 + 450,
		rx:0,
		ry:0,
		rz:0,
		open: 0,
	}

	let cube = new BoxPartyCube(0,transform,undefined);
	cube.$el.appendTo($platform);
	cube.$el.find('partycube3Dsurface').css({
		'background': 'url(./proto/img/party/bg-cosmic-cube.jpeg)',
	    'background-size': 'cover',
	    'background-position': 'center',
	    'border':'10px solid white',
	})
	cube.redraw();
	cube.$el.find('boxpartyshadow').hide();

	let $face = cube.$el.find('.partycube3D-front');

	let $mouth = $('<finalemouth>').appendTo($face);

	let meeps = [];

	let hud = new PartyHUD();
	hud.$el.appendTo($game);

	let tally;
	let names = ['Dave','Noah','Josh','Sean','Paul','Jack'];
	shuffleArray(names);

	function initGame(count) {
		for(var i=0; i<count; i++){
			meeps[i] = new PartyMeep(i);
			meeps[i].$el.find('partymeepeye').hide();
			meeps[i].$el.find('partymeepmouth').hide();
			meeps[i].$shadow.hide();
			meeps[i].$el.appendTo($game).css({
				'bottom':'-320px',
				'filter':'blur(5px)',
				'transform':'scale(2)',
			})

			meeps[i].name = names[i];
			meeps[i].score = (count-i)*10;
		}

		tally = new PartyTally(meeps);
		tally.$el.appendTo($game);
		
		nSequence = meeps.length;

		audio.play('music');
		setTimeout( doIntro, 2000);
	}

	function doIntro(){
		say('intro');
		setTimeout(doNextPlace,9000);
		//doNextPlace();
	}

	let isTalking = false;
	let nSequence = -1;
	let analyser;
	let dataArray;
	function doNextPlace(){
		nSequence--;

		audio.play('woosh',true);

		$(cube.transform).animate({x:[0,W*0.5][nSequence%2],rz:[-30,30][nSequence%2],ry:[10,-10][nSequence%2]},500);

		let id = SEQUENCE[meeps.length][meeps.length-nSequence-1];

		say(id);
		
		let duration = audio.getDuration(id);
		
		setTimeout(function(){
			showMeep();
		},(duration-2)*1000);
		
		if(SEQUENCE[meeps.length][nSequence-1]){
			setTimeout(hideMeep,(duration+1)*1000);
			setTimeout(doNextPlace,(duration+2)*1000);
		} else {
			setTimeout(doUltimateReward,(duration+2)*1000);
		}
	}

	function doUltimateReward(){
		tally.hideRow(nSequence);

		say('reward');
		let duration = audio.getDuration('reward');
		setTimeout(doWubWub,(duration+1)*1000);
	}

	function doWubWub(){

		setTimeout(function(){
			audio.play('reveal');
		},2000);
		
		
		setTimeout(function(){
			audio.stop('music');
		},3000);

		$(cube.transform).animate({x:W*0.25,y:W*2,rz:720,ry:0},4000);

		$('<finalevortex>').insertBefore(meeps[nSequence].$el).css({
			opacity:0,
		}).animate({
			opacity:1,
		},4000);

		meeps[nSequence].$el.css({
			bottom: '250px',
			left: 1.5*W+'px',
			transform: 'scale(1.5)',
		});

		

		setTimeout(function(){
			cube.$el.hide();
			doReveal();
		},7000);
	}

	function doReveal(){

		meeps[nSequence].$el.hide();

		let size = W * 0.3;
		let transform = {
			w:size,h:size,d:size,
			x:W*0.25,
			y:-W/2,
			altitude:size/2 + 270,
			rx:0,
			ry:0,
			rz:0,
			open: 0,
		}

		let cube = new BoxPartyCube(0,transform,undefined);
		cube.$el.appendTo($platform);
		cube.$el.find('partycube3Dsurface').css({
			'background': 'url(./proto/img/party/bg-cosmos-rainbow.webp)',
		    'background-size': 'cover',
		    'background-position': 'center',
		    'border':'10px solid white',
		})
		cube.redraw();
		cube.$el.find('boxeye').css({
			'width': '10%',
			'height': '20%',
			'border-radius':'100%',
			'transform':'none',
		})

		let $face = cube.$el.find('.partycube3D-front');
		let $mouth = $('<finalemouth>').appendTo($face);

		cube.$el.find('boxpartyshadow').hide();

		$platform.appendTo($game).css({
			background: 'none',
		})

		new FinaleExplosion(size,'white').$el.appendTo($game).css({
			top: '50%',
			left: '50%',
		})

		audio.play('explode');

		$(cube.transform).delay(3000).animate({
			altitude: 2000,
			rz:360,
		},{
			duration:1000,
			step:cube.redraw,
			start:function(){
				audio.play('woosh');
			}
		})

	}

	function showMeep() {

		tally.showRow(nSequence);

		meeps[nSequence].$el.css({
			'transition': 'all 1s',
		})

		audio.play('woosh',true);

		meeps[nSequence].$el.find('partymeepeye').show();
		meeps[nSequence].$el.find('partymeepmouth').show();

		meeps[nSequence].isAnimating = true;
		meeps[nSequence].toFlyer();
		setTimeout(function(){
			meeps[nSequence].$el.css({
				filter:'none',
				bottom: '450px',
				left: [1.7,1.3][nSequence%2]*W+'px',
				transform: 'scale(1)'
			});
		})
		


	}

	function hideMeep() {

		tally.hideRow(nSequence);

		audio.play('fall',true);

		meeps[nSequence].$el.css({
			bottom: '-500px',
			left: [W*2,W][nSequence%2]+'px',
			transform: 'rotate('+([120,-120][nSequence%2])+'deg)'
		});
	}

	function say(id){
		isTalking = true;
		audio.play(id);

		setTimeout(function(){
			isTalking = false;
		},audio.getDuration(id)*1000);

		flapMouth();
	}

	function flapMouth() {
		if(!isTalking) return;
		$mouth.delay(100+Math.random()*100).animate({width:50,height:30 + Math.random()*50},100).animate({width:70,height:20},{duration:100, complete:flapMouth});
	}

	hud.initPlayerCount(initGame);

	function step(){

		
		cube.redraw();

		for(var m in meeps){
			if(meeps[m].isAnimating) continue;
			meeps[m].$el.css({
				left: (1.5+meeps[m].x*0.25) * W,
			})
		}


		resize();
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
			meeps[m].x = p[m].x;
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