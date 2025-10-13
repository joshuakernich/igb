window.NameEntryPlayer = function(nPlayer,callback){

	const ALPHABET = 'qwertyuiop|asdfghjkl|zxcvbnm';

	let self = this;
	self.$el = $('<nameentryplayer>').attr('n',nPlayer);

	let $input = $('<nameentryinput>').appendTo(self.$el).text('Enter your name');
	
	self.nPlayer = nPlayer;
	self.text = '';
	function onLetter(){

		let $letter = $(this);

		let letter = $letter.attr('letter');

		self.text = self.text + letter;
		$input.text(self.text);


		$letter.addClass('tapped');
		setTimeout(function(){ $letter.removeClass('tapped'); });
	}

	function onBackspace(){
		self.text = self.text.substr(0,self.text.length-1);
		$input.text(self.text);

		let $letter = $(this);
		$letter.addClass('tapped');
		setTimeout(function(){ $letter.removeClass('tapped'); });
	}

	function onComplete() {
		// body...
		let $letter = $(this);
		$letter.addClass('tapped');
		self.$el.css({'pointer-events':'none'}).delay(1000).animate({opacity:0});
		meep.$el.delay(500).animate({top:500},{complete:function() {
			callback(self);
		}});
		//callback(text);
	}


	for(var i=0; i<ALPHABET.length; i++){
		if(ALPHABET[i]=='|') $('<br>').appendTo(self.$el);
		else $('<nameentrybutton>').appendTo( self.$el ).text(ALPHABET[i].toUpperCase()).attr('letter',ALPHABET[i].toUpperCase()).click(onLetter);
	}

	$('<nameentrybutton>').appendTo( self.$el ).text('←').click(onBackspace);
	$('<nameentrybutton class="done">').appendTo( self.$el ).click(onComplete);

	let $meepContainer = $("<div>").appendTo(self.$el).css({
		top: '14vw',
		position: 'absolute',
		left: '50%',
	})

	let meep = new PartyMeep(nPlayer);
	meep.$el.appendTo($meepContainer);
	meep.setHeight(300);
	meep.$el.css({
		top: '500px',
	}).delay(500).animate({
		top:'290px'
	},400).animate({
		top:'300px'
	},200);

	self.$el.css({
		opacity:0,
	}).animate({
		opacity:1,
	})
}

window.NameEntry = function( playersMeta, callback ){
	
	if(!NameEntry.didInit){
		NameEntry.didInit = true;

		$("head").append(`
			<style>
				.nameentry{
					display: block;
					color: white;
					line-height: 2.5vw;
					font-size: 1.5vw;
					text-align: center;
					font-weight: 700;
					
					background: transparent;
				}

				.nameentry igbside{
					
					box-sizing: border-box;
					
				}

				nameentryplayer{
					display:block;
					position:background;
					width: 100%;
					height: 100%;
					position:relative;
					padding: 0.5vw;
					box-sizing: border-box;
					background: transparent;
				}


				.nameentry igbside:first-of-type nameentryplayer{
					padding-left: 3.5vw;
				}

				.nameentry igbside:last-of-type nameentryplayer{
					padding-right: 3.5vw;
				}

				nameentrybutton{
					display: inline-block;
					width: 2.5vw;
					height: 2.5vw;
					background: rgba(255,255,255,0.1);
					margin: 0.4vw 0.1vw;
					
					font: inherit;
					font-weight: inherit;
					transition: all 1s;
					position: relative;
					vertical-align: middle;
				}

				nameentrybutton.done{
					font-size: 0.8vw;
					width: 3.5vw;
				}

				nameentrybutton.done:after{
					content: "DONE";

				}

				nameentrybutton.tapped{
					transition: none;
					background: white;
					color: #5F01FF;

				}

				nameentryinput{
					display: block;
					height: 2.5vw;
					background: rgba(255,255,255,0.1);
					width: 20vw;
					margin: 0.1vw auto 0.5vw;
					vertical-align: middle;
					position: relative;
				}

				nameentryplayer[n='0']{ background: linear-gradient(to top, var(--n0), transparent) }
				nameentryplayer[n='1']{ background: linear-gradient(to top, var(--n1), transparent) }
				nameentryplayer[n='2']{ background: linear-gradient(to top, var(--n2), transparent) }
				nameentryplayer[n='3']{ background: linear-gradient(to top, var(--n3), transparent) }
				nameentryplayer[n='4']{ background: linear-gradient(to top, var(--n4), transparent) }
				nameentryplayer[n='5']{ background: linear-gradient(to top, var(--n5), transparent) }

				
			</style>`);
	}

	
	

	let self = this;
	self.$el = $('<igb class="nameentry">');

	let $sides = [];
	for(var i=0; i<3; i++){
		$sides[i] = $('<igbside>').appendTo(self.$el);
	}



	

	let slots = [];
	let nPlayer = -1;

	function doNextEntry() {

		nPlayer++;
		let nSlot = 0;
		while(slots[nSlot]) nSlot++;
		slots[nSlot] = new NameEntryPlayer(nPlayer, onEntryComplete);
		slots[nSlot].$el.appendTo($sides[nSlot]);
	}

	function onEntryComplete( entry ){

		let nSlot = slots.indexOf(entry);
		slots[nSlot].$el.remove();
		slots[nSlot] = undefined;

		playersMeta[entry.nPlayer].name = entry.text;

		if(nPlayer<playersMeta.length-1){
			doNextEntry();
		} else {
			let isComplete = true;
			for(var s in slots) if(slots[s]) isComplete = false;
			if(isComplete) callback();
		}
	}

	if(!playersMeta) playersMeta = [{},{},{},{},{},{}];

	// make the middle side the last preference
	if( playersMeta.length==2) $sides[1].appendTo(self.$el);

	while(slots.length<Math.min(3,playersMeta.length)) doNextEntry();

	self.setPlayers = function(p){
		
	}
}