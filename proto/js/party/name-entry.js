window.AvatarEntryPlayer = function(nPlayer,nSlot,human,callback){

	const SHIRTS = [
		{url:'./proto/img/party/avatar-shirt-skeleton.png'},
		{url:'./proto/img/party/avatar-shirt-overall.png'},
		{url:'./proto/img/party/avatar-shirt-bear.png'},
		{url:'./proto/img/party/avatar-shirt-stripes.png'},
		{url:'./proto/img/party/avatar-shirt-vest.png'},
		{url:'./proto/img/party/avatar-shirt-jocks.png', legs:'none'},
	]	

	const FEATURES = [
		{url:'./proto/img/party/avatar-accessory-skirt.png'},
		{url:'./proto/img/party/avatar-accessory-bowtie.png'},
		{url:'./proto/img/party/avatar-accessory-belt.png'},
		{url:'./proto/img/party/avatar-accessory-chain.png'},
		{url:'./proto/img/party/avatar-accessory-sash.png'},
		{url:'./proto/img/party/avatar-accessory-bust.png'},
	]

	let self = this;
	self.$el = $('<nameentryplayer>').attr('n',nPlayer);

	let $input = $('<nameentryinput class="complete">').appendTo(self.$el).text(human.name);

	let $meepContainer = $("<div>").appendTo(self.$el).css({
		top: '14vw',
		position: 'absolute',
		left: '50%',
		width: '100%',
	})

	let meep = new PartyMeep(nPlayer);
	meep.$el.appendTo($meepContainer);
	meep.setHeight(300);
	meep.$el.css({
		top: '300px',
		'transition':'top 1s, transform 1s',
	});

	setTimeout(function () {
		meep.$el.css({
			'top':'100px',
			'transform':'scale(0.3)',
		});
	},500)

	let $left = $('<avatarbuttonset>').appendTo(self.$el);
	let $right = $('<avatarbuttonset>').appendTo(self.$el);

	if(nSlot==0) $left.css({left:'5%'});
	if(nSlot==2) $right.css({right:'5%'});

	for(let s in SHIRTS){
		$('<avatarbutton>').appendTo($left).css({
			'background-image':`url(${SHIRTS[s].url})`,
			'background-color':`var(--n${nPlayer})`,
		}).click(function(){
			
			$left.find('avatarbutton').removeClass('selected');
			$(this).addClass('selected');

			meep.$body.css({
				'background-size':`100%`,
				'background-image':`url(${SHIRTS[s].url})`,
				'background-color':`var(--n${nPlayer})`,
			})

			if(SHIRTS[s].legs=='none'){
				meep.$legLeft.css({
					'border-color':`white`,
				})

				meep.$legRight.css({
					'border-color':`white`,
				})
			} else {
				meep.$legLeft.css({
					'border-color':`var(--n${nPlayer})`,
				})

				meep.$legRight.css({
					'border-color':`var(--n${nPlayer})`,
				})
			}
			
		})
		if(s==2) $('<br>').appendTo($left);
	}

	for(let f in FEATURES){
		let $btn = $('<avatarbutton>').appendTo($right).click(function(){

			$right.find('avatarbutton').removeClass('selected');
			$(this).addClass('selected');

			meep.$accessory.css({
				'background-image':`url(${FEATURES[f].url})`,
			})
		});
		
		$('<avatarfeature>').appendTo($btn).css({
			'background-image':`url(${FEATURES[f].url})`,
		});

		

		if(f==2) $('<br>').appendTo($right);
	}


	$('<nameentrybutton class="done">').appendTo( self.$el ).click(onComplete);

	function onComplete() {
		// body...
		let $letter = $(this);
		$letter.addClass('tapped');
		
		self.$el.css({'pointer-events':'none'}).delay(500).animate({
			opacity:0
		})

		setTimeout(function(){
			callback(self);
		},1000);

	}

	self.redraw = function() {

		let x = [human.z,human.x,-human.z][nSlot];
		meep.$el.css({
			left: 50 * x + '%'
		})
	}

	self.redraw();
}

window.NameEntryPlayer = function(nPlayer, nSlot, human, callback){

	const ALPHABET = 'qwertyuiop|asdfghjkl|zxcvbnm';

	let self = this;
	self.$el = $('<nameentryplayer>').attr('n',nPlayer);
	let $input = $('<nameentryinput>').appendTo(self.$el).text('Enter your name');
	
	self.nPlayer = nPlayer;
	self.text = '';
	function onLetter(){

		let $letter = $(this);

		let letter = $letter.attr('letter');

		if(self.text.length<14) self.text = self.text + letter;
		else $input.animate({left:'-0.5vw'},50).animate({left:'0.5vw'},50).animate({left:'-0.5vw'},50).animate({left:'0.5vw'},50).animate({left:0},50);

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

		$input.addClass('complete');
		
		self.$el.css({'pointer-events':'none'});

		setTimeout(function(){
			callback(self);
		},500);
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
		width: '100%',
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

	self.redraw = function() {

		let x = [human.z,human.x,-human.z][nSlot];
		meep.$el.css({
			left: 50 * x + '%'
		})
	}
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

				avatarbuttonset{
					display: block;
					width: 50%;
					position: absolute;
					
					top: 50%;
					line-height: 0px;
					text-align: center;
					transform: translateY(-50%);

				}

				avatarbuttonset:first-of-type{
					left: 0px;
				}

				avatarbuttonset:last-of-type{
					right: 0px;
				}	

				avatarbutton{
					display: inline-block;
					width: 3vw;
					height: 3vw;
					margin: 0.5vw;
					background: white;
					border-radius: 25%;
					background-size: 100%;
					position: relative;
				}

				avatarbutton.selected{
					outline: 0.2vw solid black;
				}


				avatarfeature{
					position: absolute;
					display: block;
					inset: -50%;
					background-size: 100%;
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
					width: 6vw;
					border-radius: 1.25vw;

					bottom: 3.5vw;
					right: 2vw;
					position: absolute;
		
				}

				nameentrybutton.done:before{
					content: "DONE";
				}

				nameentrybutton.done:after{
					content: "";
					width: 0.4vw;
					height: 0.7vw;
					border-right: 0.2vw solid white;
					border-bottom: 0.2vw solid white;
					display: inline-block;
					box-sizing: border-box;
					transform: rotate(45deg) translateY(-0.1vw);
					margin-left: 0.5vw;
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

				nameentryinput.complete{
					background: none;
				}

				nameentryplayer[n='0']{ background: linear-gradient(to bottom, var(--n0), transparent) }
				nameentryplayer[n='1']{ background: linear-gradient(to bottom, var(--n1), transparent) }
				nameentryplayer[n='2']{ background: linear-gradient(to bottom, var(--n2), transparent) }
				nameentryplayer[n='3']{ background: linear-gradient(to bottom, var(--n3), transparent) }
				nameentryplayer[n='4']{ background: linear-gradient(to bottom, var(--n4), transparent) }
				nameentryplayer[n='5']{ background: linear-gradient(to bottom, var(--n5), transparent) }

				
			</style>`);
	}

	
	

	let self = this;
	self.$el = $('<igb class="nameentry">');

	let $sides = [];
	for(var i=0; i<3; i++){
		$sides[i] = $('<igbside>').appendTo(self.$el);
	}



	
	let humans = [{},{},{},{},{},{}];
	let slots = [];
	let nPlayer = -1;

	function doNextEntry() {

		nPlayer++;
		let nSlot = 0;
		while(slots[nSlot]) nSlot++;

		// Don't use the middle slot for 2 players
		if( playersMeta.length==2 && nSlot==1 ) nSlot = 2;

		slots[nSlot] = new NameEntryPlayer(nPlayer, nSlot, humans[nPlayer], onNameEntryComplete);
		slots[nSlot].$el.appendTo($sides[nSlot]);
	}

	function onNameEntryComplete( entry ){
		let nSlot = slots.indexOf(entry);
		slots[nSlot].$el.remove();

		humans[entry.nPlayer].name = playersMeta[entry.nPlayer].name = entry.text;

		slots[nSlot] = new AvatarEntryPlayer(entry.nPlayer, nSlot, humans[entry.nPlayer], onAvatarEntryComplete);
		slots[nSlot].$el.appendTo($sides[nSlot]);
	}

	function onAvatarEntryComplete( entry ){

		let nSlot = slots.indexOf(entry);
		slots[nSlot].$el.remove();
		slots[nSlot] = undefined;

		if(nPlayer<playersMeta.length-1){
			doNextEntry();
		} else {
			let isComplete = true;
			for(var s in slots) if(slots[s]) isComplete = false;
			if(isComplete){
				clearInterval(interval);
				callback();
			}
		}
	}

	let interval = setInterval(function(){
		for(var s in slots) slots[s].redraw();
 	})

	if(!playersMeta) playersMeta = [{},{},{},{},{},{}];



	while(slots.length<Math.min(3,playersMeta.length)) doNextEntry();

	self.setPlayers = function(p){
		for(var h in humans){
			humans[h].z = p[h].z;
			humans[h].x = p[h].x;
		}
	}
}