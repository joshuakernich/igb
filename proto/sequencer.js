window.Sequencer = function(){

	let synths = [];
	

	const pitchLibrary = ['D3','E3','G3','A3','C4','D4','E4','G4','A4'];
	const timePerBeat = 0.5;

	const self = this;
	self.$el = $('<igb>');

	let isOn = false;
	let iTick = undefined;

	self.turnOnOff = function(b){
		isOn = b;
		clearInterval(iTick);
		iTick = setInterval(tick,timePerBeat*1000);
	}


	let map = [];
	for(var i=0; i<3; i++){

		map[i] = [];

		let synth = new Tone.Synth().toDestination();
		synth.envelope.attack = 0.1;
		synth.envelope.release = 1;
		synths[i] = synth;

		let $side = $('<igbside>').appendTo(self.$el);
		let $t = $('<table>').appendTo($side);

		for(var r = 0; r < 5; r++){
			map[i][r] = [];
			let $r = $('<tr>').appendTo($t);
			for(var c = 0; c < 8; c++){
				map[i][c] = undefined;
				$('<td>').appendTo($r).attr('c',c).attr('r',r);
			}
		}
	}
	
	
	let nBeat = -1;
	let cBeat;
	function tick(){
		if(!isOn) return;
		nBeat++;
		cBeat = nBeat%8;
		self.$el.find('td').removeClass('highlight');
		self.$el.find('td:nth-of-type('+(1+cBeat)+')').addClass('highlight');

		for(var i=0; i<map.length; i++){
			let pitch = pitchLibrary[8-map[i][nBeat%8]];

			if(pitch) synths[i].triggerAttackRelease(pitch, 0.5);
		}
		
	}

	self.$el.find('td').click(function(){

		let r = $(this).attr('r');
		let c = $(this).attr('c');
		let b = $(this).hasClass('selected');
		let $tbl = $(this).closest('table');
		let i = $('table').index($tbl);

		$tbl.find('td[c='+c+']').removeClass('selected');
		if(!b) $(this).addClass('selected');

		map[i][c] = b?undefined:r;
	})


	self.turnOnOff(true);
	
}