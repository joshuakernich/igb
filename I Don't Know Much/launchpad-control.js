

var firstTime = true;
var voted = false;

var selection = [];
var launchpad;
var map = {};
var red = 15;
var orange = 63;
var green = 60;
var yellow = 62;
var gray = 29;
var off = 12;

var buttons = [
	[16*4+0,16*5+0,16*6+0]
]

var buttonsForMenu = [
	16*4+3,16*4+4,16*4+5,
	16*5+3,16*5+4,16*5+5,
	16*6+4
]

var buttons = [
	[16*4+0,16*5+0,16*6+0],
	[16*4+3,16*5+3,16*6+3],
	[16*4+6,16*5+6,16*6+6]
]
var colors = [orange,orange,orange];

console.log('here');

navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
function onMIDIFailure(midiAccess) {

}

function onMIDISuccess(midiAccess) {
	for (var output of midiAccess.outputs.values()){
		if(output.name == "Launchpad Mini"){
			launchpad = output;
			for(var b=0; b<buttons.length; b++){
				for(var i=0; i<buttons[b].length; i++){
					//output.send([144,buttons[b][i],colors[i]]);
					map[buttons[b][i]] = {nPlayer:b,nChoice:i,buttons:buttons[b]};
				}
			}
		}
	}

    for (var input of midiAccess.inputs.values()){
		if(input.name == "Launchpad Mini"){
			input.onmidimessage = onLaunchpadMessage;
		}
    }

    
}

function voteFor(n){

	voted = true;
	setTimeout(function(){
		if(firstTime){
			firstTime = false;
			$('.intro button').trigger('click');

		} else {

			$('.question button').eq(n).trigger('click');
		}
		
		hideButtons();
	},1500);
}

function checkAllVoted(){
	var votes = [0,0,0];

	if(selection[0] > -1 && selection[1] > -1 && selection[2] > -1){

		votes[selection[0]]++;
		votes[selection[1]]++;
		votes[selection[2]]++;


  	for(var i=0; i < votes.length; i++){

  		if(votes[i]>0) $('<div class="count">').appendTo($('.question button').eq(i)).html(votes[i]);

  		if(votes[i]>1) voteFor(i);
  	}

  	if(!voted) voteFor(Math.floor(Math.random()*3));
  }
}

function activateButtons(){
	voted = false;
	selection = [-1,-1,-1];
	for(var b=0; b<buttons.length; b++){
		for(var i=0; i<buttons[b].length; i++){
			if(launchpad) launchpad.send([144,buttons[b][i],colors[i]]);
		}
	}
}

function activateButtonsForMenu(){

	for(var b=0; b<buttonsForMenu.length; b++){
		if(launchpad) launchpad.send([144,buttons[b],green]);
	}
}

function activateButtonsForStart(){
	for(var b=0; b<buttons.length; b++){
		if(launchpad) launchpad.send([144,buttons[b][0],red]);
	}
}

function hideButtons(){
	for(var b=0; b<buttons.length; b++){
		for(var i=0; i<buttons[b].length; i++){
			if(launchpad) launchpad.send([144,buttons[b][i],off]);
		}
	}
}

function onLaunchpadMessage(midiMessage) {

	if(midiMessage.data[0] == 144){
	  var nButton = midiMessage.data[1];

	  if(map[nButton] && selection[map[nButton].nPlayer]<0){
			selection[map[nButton].nPlayer] = map[nButton].nChoice;
			for(var i in map[nButton].buttons){
				launchpad.send([144,map[nButton].buttons[i],gray]);
			}
			launchpad.send([144,nButton,orange]);

			castVoteFromLaunchpad(map[nButton].nPlayer,map[nButton].nChoice)

			//checkAllVoted();
		}
	}
}
	