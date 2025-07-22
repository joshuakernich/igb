window.PartyPlayerHUD = function(n,meep,type){
 
	let self = this;
	self.$el = $(`
		<partyplayerhud n=${n} type=${type}>
		<partyscore>${Math.floor(meep.score)}</partyscore>
			<partymeephead>
				<partymeephat></partymeephat>
				<partymeepeye></partymeepeye>
				<partymeepeye></partymeepeye><br>
				<partymeepmouth></partymeepmouth>
			</partymeephead>
			
		</partyplayerhud>`
	);

	self.redraw = function(){
		self.$el.find('partyscore').text(Math.floor(meep.score));
	}
}

window.PartyHUD = function( colour='#40B0ED', thicc=50 ){

	const COLOUR = 'gray';
	const THICC = 50;

	if(!PartyHUD.didInit){
		PartyHUD.didInit = true;

		$("head").append(`
			<style>

				@import url('https://fonts.googleapis.com/css2?family=Paytone+One&display=swap');

				partyhud{
					position: absolute;
					top: 0px;
					bottom: 0px;
					left: 0px;
					right: 0px;
					display: block;
					z-index: 100;
					text-align: center;

					pointer-events: none;
					
  					font-family: "Paytone One";
				}

				partyhudbaseline{
					display: block;
					bottom: 0px;
					position: absolute;
					left: 0px;
					right: 0px;
					text-align: center;

					bottom: -150px;
				}

				partyhudstream{
					display: inline-block;
					white-space: nowrap;
					box-shadow: 0px 0px 20px rgba(0,0,0,0.5);
					border-radius: 30px 30px 0px 0px;
					overflow: hidden;

					background: ${COLOUR};
					padding: 15px 5px 0px 5px;
				}

				partyhudframe{
					display: inline-block;
					width: 33.33%;
					height: 100%;
					position: relative;
					overflow: hidden;
				}

				partyhudborder:first-of-type{
					display: block;
					position: absolute;
					inset: 0px;
					box-sizing: border-box;
					border: ${THICC}px solid black;
					filter: blur(20px);
					opacity: 0.5;
				}

				partyhudborder:last-of-type{
					display: block;
					position: absolute;
					inset: 0px;
					box-sizing: border-box;
					border: ${THICC}px solid ${COLOUR};
				}

				partyhudbanner{
					background: ${COLOUR};
					position: absolute;
					left: 0px;
					right: 0px;
					
					top: 110%;
					box-shadow: 0px 2px 20px black;
					font-size: 80px;
					color: white;
					line-height: 80px;
					padding: 40px 0px 50px;
					text-shadow: 0px -3px black;
				}

				partyhudbanner spacer{
					height: 40px;
					display: block;
				}

				partyhudbanner p{
					margin: 0px;
					padding: 0px;
				}

				partyplayerhud{
					width: 160px;
					height: 90px;
					display: inline-block;
					box-sizing: border-box;
					position: relative;
					color: white;
					background: ${COLOUR};
					overflow: hidden;
					vertical-align: top;

					margin: 0px 10px;
				}

				partyhudtimer{
					width: 150px;
					height: 90px;
					
					color: #333;
					display: inline-block;
					font-size: 70px;
					line-height: 60px;
					
					vertical-align: top;
				}


				partyplayerhud partymeephead{
					position: absolute;
					top: 0px;
					left: auto;
					transform: scale(0.6);
				}

				partyplayerhud partyscore{
					display: block;
					position: absolute;
					color: white;
					right: 0px;
					left: 0px;
					top: 0px;
					
					font-weight: bold;
					
					
					padding: 0px;
					margin: 0px;
					text-align: center;
					
					box-sizing: border-box;
					font-size: 50px;
					line-height: 60px;
					background: red;
					border-radius: 20px;
				}

				partyplayerhud[type='before'] partyscore{ padding-left:50px; }
				partyplayerhud[type='before'] partymeephead{ left:-10px; }

				partyplayerhud[type='after'] partyscore{ padding-right:50px; }
				partyplayerhud[type='after'] partymeephead{ right:-10px; }

				partyhud button{
					font: inherit;
					font-size: 100px;
					background: rgba(0,0,0,0.1);
					background: rgba(255,255,255,0.2);
					border: none;
					padding: 20px 50px 40px;
					margin: 0px 10px;
					color: white;
					border-radius: 30px;
					box-shadow: 0px 5px rgba(0,0,0,0.4);
					text-shadow: 0px -3px black;

					pointer-events: auto;
				}

				partydebug{
					display: inline-block;
					position: absolute;
					top: 350px;
					right: 80px;
				}

				partydebug button{
					font-size: 30px;
					display: block;
					padding: 30px 30px 35px;
					margin-bottom: 20px;
				}

				hudsummonlist{
					display: inline-block;
					width: 10%;
					line-height: 80px;
				}

				hudsummonplayer{
					display: inline-block;
					position: relative;
					margin: 0px 20px;
				}

				hudsummonplayer partymeephead{
					position: relative;
					left: auto;
				}

				hudsummonlist h2{
					display: block;
					line-height: 50px;
					font-size: 50px;
					color: white;
					margin: 0px;
					padding: 0px;
					margin-top: 20px;
				}


			</style>
			`);
	}

	let self = this;
	self.$el = $('<partyhud>');

	let $banner = $(`<partyhudbanner style="background:${colour};">`).appendTo(self.$el);
	let $debugRight = $('<partydebug>').appendTo(self.$el);

	function setBanner(b){
		if(b) $banner.css({top:'100%'}).animate({top:'10%'}).animate({top:'15%'});
		else $banner.animate({top:'20%'}).animate({top:'-40%'});
	}

	self.initPlayerCount = function(callback){
		setBanner(true);
		$('<p>').text('How big is your squad?').appendTo($banner);
		$('<spacer>').appendTo($banner);
		for(var p=2; p<=6; p++) $('<button>').attr('count',p).appendTo($banner).text(p).click(function(){
			let count = parseInt( $(this).attr('count') );
			callback(count);
			setBanner(false);
		});
	}

	let interval;

	self.initTimer = function(seconds,callback){

		$baseline.animate({bottom:0});
		$timer.text(seconds);

		let timeStart = new Date().getTime();
		interval = setInterval(function(){
			let timeNow = new Date().getTime();
			let timeElapsed = timeNow-timeStart;
			let secondsRemaining = Math.ceil( seconds - (timeElapsed/1000) );
			$timer.text(secondsRemaining);
			if(secondsRemaining==0){
				self.clearTimer();
				callback();
			}
		},1000/50);
	}

	self.clearTimer = function(){
		clearInterval(interval);
	}

	self.initBanner = function(msg){
		setBanner(true);
		$banner.text(msg);
	}

	self.finiBanner = function(){
		setBanner(false);
	}

	self.addDebug = function(name,fn){
		$('<button>').text(name).appendTo($debugRight).click(function(){
			console.log('yo',fn);
			fn();
		});
	}

	for(var i=0; i<3; i++){
		$(`
		<partyhudframe>
			<partyhudborder style='border-width:${thicc}px'></partyhudborder>
			<partyhudborder style='border-color:${colour};border-width:${thicc}px'></partyhudborder>
		<partyhudframe>
		`).appendTo(self.$el);
	}

	let $baseline = $('<partyhudbaseline>').appendTo(self.$el);
	let $stream = $(`<partyhudstream style='background:${colour};'>`).appendTo($baseline);
	
	let huds = [];
	
	let type = 'before'

	let $left = $('<div style="display:inline-block;">').appendTo($stream);
	let $timer = $(`<partyhudtimer>60</partyhudtimer>`).appendTo($stream);
	let $right = $('<div style="display:inline-block;">').appendTo($stream);

	self.setPlayers = function(meeps){

		let iTimer = Math.floor(meeps.length/2);

		for(var i=0; i<meeps.length; i++){
			if(i==iTimer) type = 'after';
			let hud = new PartyPlayerHUD(i,meeps[i],type);
			hud.$el.appendTo((i<iTimer)?$left:$right);
			huds[i] = hud;
		}
	}

	self.summonPlayers = function( arrIn, arrOut ){
		setBanner(true);

		let $listIn = $('<hudsummonlist>');
		for(var a in arrIn) $(`
			<hudsummonplayer>
				<partymeephead n=${arrIn[a]}>
					<partymeephat></partymeephat>
					<partymeepeye></partymeepeye>
					<partymeepeye></partymeepeye><br>
					<partymeepmouth></partymeepmouth>
				</partymeephead>
			</hudsummonplayer>
		`).attr('n',a).appendTo($listIn);

		let $listOut = $('<hudsummonlist>');
		for(var a in arrOut) $(`
			<hudsummonplayer>
				<partymeephead n=${arrOut[a]}>
					<partymeephat></partymeephat>
					<partymeepeye></partymeepeye>
					<partymeepeye></partymeepeye><br>
					<partymeepmouth></partymeepmouth>
				</partymeephead>
			</hudsummonplayer>
		`).attr('n',a).appendTo($listOut);

		$('<h2>').text('STEP FORWARD').appendTo($listIn);

		$('<h2>').text('STEP BACK').appendTo($listOut);

		$banner.empty();
		$banner.append($listIn);
		$banner.append($listOut);
	}

	self.redraw = function(sec=0){
		$timer.text(sec);
		for(var h in huds) huds[h].redraw();
	}

	self.redraw();
}