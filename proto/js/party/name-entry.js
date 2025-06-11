window.NameEntryPlayer = function(nPlayer){

	const ALPHABET = 'qwertyuiop|asdfghjkl|zxcvbnm';

	let self = this;
	self.$el = $('<nameentryplayer>').attr('n',nPlayer);

	let $input = $('<nameentryinput>').appendTo(self.$el).text('Enter your name');
	
	let text = '';
	function onLetter(){

		let $letter = $(this);

		let letter = $letter.attr('letter');

		text = text + letter;
		$input.text(text);


		$letter.addClass('tapped');
		setTimeout(function(){ $letter.removeClass('tapped'); });
	}

	function onBackspace(){
		text = text.substr(0,text.length-1);
		$input.text(text);

		let $letter = $(this);
		$letter.addClass('tapped');
		setTimeout(function(){ $letter.removeClass('tapped'); });
	}


	for(var i=0; i<ALPHABET.length; i++){
		if(ALPHABET[i]=='|') $('<br>').appendTo(self.$el);
		else $('<nameentrybutton>').appendTo( self.$el ).text(ALPHABET[i].toUpperCase()).attr('letter',ALPHABET[i].toUpperCase()).click(onLetter);
	}

	$('<nameentrybutton>').appendTo( self.$el ).text('←').click(onBackspace);

	let meep = new PartyMeep(nPlayer);
	meep.$el.appendTo(self.$el);
	meep.setHeight(300);
	meep.$el.css({
		left: '50%',
		top: 'calc( 14vw + 300px )',
	})
}

window.NameEntry = function(){
	
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
					background: #5F01FF;
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
				}

				nameentryplayer:before{
					content: "";
					display:block;
					position: absolute;
					top: 0px;
					left: 0px;
					right: 0px;
					bottom: 0px;
					background: linear-gradient( to bottom, transparent, #5F01FF );
					opacity: 0.5;
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

				nameentryplayer[n='0']{ background:red; }
				nameentryplayer[n='1']{ background:blue; }
				nameentryplayer[n='2']{ background:limegreen; }

				
			</style>`);
	}

	
	

	let self = this;
	self.$el = $('<igb class="nameentry">');

	let $sides = [];
	for(var i=0; i<3; i++){
		$sides[i] = $('<igbside>').appendTo(self.$el);

		new NameEntryPlayer(i).$el.appendTo($sides[i]);
	}

	
	


	self.setPlayers = function(p){
		
	}
}