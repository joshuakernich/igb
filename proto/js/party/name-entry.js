window.NameEntry = function(n){
	
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
				}

				.nameentry igbside{
					padding: 1vw 3vw;
					box-sizing: border-box;
					border: 1px solid red;
				}

				.nameentry h1{
					font-size: inherit;
					margin: 0px;
					padding: 0px;
					font: inherit;
					font-weight: inherit;
				}

				nameentrybutton{
					display: inline-block;
					width: 2.5vw;
					height: 2.5vw;
					background: rgba(255,255,255,0.1);
					margin: 0.2vw;
					
					font: inherit;
					font-weight: inherit;
					
					
				}

				nameentryinput{
					display: block;
					height: 2.5vw;
					background: rgba(255,255,255,0.1);
					width: 20vw;
					margin: 0.1vw auto 0.5vw;
					vertical-align: middle;
				}

				
			</style>`);
	}

	const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	

	let self = this;
	self.$el = $('<igb class="nameentry">');

	let $sides = [];
	for(var i=0; i<3; i++){
		$sides[i] = $('<igbside>').appendTo(self.$el);
	}

	$('<h1>').appendTo($sides[1]).text('Enter your name');
	let $input = $('<nameentryinput>').appendTo($sides[1]);
	

	let text = '';
	function onLetter(){
		let letter = $(this).attr('letter');
		text = text + letter;
		$input.text(text);
	}

	function onBackspace(){
		text = text.substr(0,text.length-1);
		$input.text(text);
	}


	for(var i=0; i<ALPHABET.length; i++){
		$('<nameentrybutton>').appendTo( $sides[1] ).text(ALPHABET[i]).attr('letter',ALPHABET[i]).click(onLetter);

	}

	$('<nameentrybutton>').appendTo( $sides[1] ).text('←').click(onBackspace);


	self.setPlayers = function(p){
		
	}
}