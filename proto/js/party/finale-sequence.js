window.FinaleSequence = function( playersMeta ){

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
					background: linear-gradient(to top, black, transparent);
				}

				finaleplatform{
					display:block;
					width: ${W*0.5}px;
					height: ${W}px;
					left: ${W*1.25}px;
					background: #360676;
					position: absolute;
					transform: rotateX(80deg);
					transform-style: preserve-3d;

				}
			</style>
		`)
	}

	let self = this;

	let audio = new AudioPlayer();
	audio.add('intro','./proto/audio/party/speech-finale-intro.mp3');
	audio.add('last','./proto/audio/party/speech-finale-last.mp3');
	audio.add('second-to-last','./proto/audio/party/speech-finale-second-to-last.mp3');
	audio.add('middle','./proto/audio/party/speech-finale-middle.mp3');
	audio.add('third','./proto/audio/party/speech-finale-third.mp3');
	audio.add('second','./proto/audio/party/speech-finale-second.mp3');
	audio.add('winner','./proto/audio/party/speech-finale-first.mp3');

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
		altitude:size/2 + 250,
		rx:0,
		ry:0,
		rz:0,
		open: 0,
	}

	let cube = new BoxPartyCube(0,transform,undefined);
	cube.$el.appendTo($platform);
	cube.redraw();

	let meeps = [];

	let hud = new PartyHUD();
	hud.$el.appendTo($game);

	function initGame(count) {
		for(var i=0; i<count; i++){
			meeps[i] = new PartyMeep(i);
			meeps[i].$el.find('partymeepeye').hide();
			meeps[i].$el.find('partymeepmouth').hide();
			meeps[i].$el.appendTo($game).css({
				'bottom':'-350px',
				'filter':'blur(5px)',
				'transform':'scale(2)',
			})
		}

		doIntro();
	}

	function doIntro(){
		say('intro');
		setTimeout(doNextPlace,9000);
	}

	let nSequence = -1;
	let analyser;
	let dataArray;
	function doNextPlace(){
		nSequence++;

		let id = SEQUENCE[meeps.length][nSequence];

		say(id);
		
		let duration = audio.getDuration(id);
		
		if(SEQUENCE[meeps.length][nSequence+1]) setTimeout(doNextPlace,(duration+2)*1000);
	}

	function say(id){
		audio.play(id);
		analyser = audio.initAnalyser(id);
		const bufferLength = analyser.frequencyBinCount;
    	dataArray = new Uint8Array(bufferLength);
	}

	hud.initPlayerCount(initGame);

	function step(){

		if(analyser){
			analyser.getByteTimeDomainData(dataArray);

			let sum = 0;
	        for (let i = 0; i<dataArray; i++) {
	        	sum += dataArray[i]; //add current bar value (max 255)
	        }
	        console.log(sum);
	    }

		for(var m in meeps){
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