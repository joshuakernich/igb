
window.PartyMeep = function(n){

	const W = 100;
	const H = 500;

	if(!PartyMeep.didInit){
		PartyMeep.didInit = true;

		$("head").append(`
			<style>
				body{
					--red: red;
					--blue: blue;
					--green: limegreen;
					--pink: #dd00ff;
					--orange: #ff6600;
					--yellow: #ffbb00;

					--n0: var(--red);
					--n1: var(--blue);
					--n2: var(--green);
					--n3: var(--pink);
					--n4: var(--orange);
					--n5: var(--yellow);
				}

				partymeep{
					display:block;
					position: absolute;	
				}

				partymeepshadow{
					display:block;
					position:absolute;
					width: ${W*1.5}px;
					height: ${W/3}px;
					bottom: ${-W/6}px;
					left: ${-W/2*1.5}px;
					background: black;
					border-radius: 50%;
					opacity: 0.5;
				}

				partymeepavatar{
					display:block;
					position:absolute;
					bottom: 0px;
					width: ${W}px;
					height: ${H}px;

				}

				partymeephand{
					display:block;
					width: ${W*0.5}px;
					height: ${W*0.5}px;
					transform: translate(-50%, -50%);
					background: white;
					border-radius: ${W*0.25}px;
					top: 60%;
					position: absolute;
					left: ${-W*0.7}px;
					z-index: 1;
				}

				partymeephand:last-of-type{
					left: ${W*0.7}px;
				}

				partymeephead{
					display: block;
					height: 150px;
					background: white;
					border-radius: ${W/2}px;
					text-align: center;
					position: relative;
					left: ${-W/2}px;
					padding-top: 30px;
					width: 100px;
					box-sizing: border-box;
					line-height: 0px;
				}

				partymeephat{
					display: block;
					background: red;
					height: 20px;
					border-radius: 5px;
				}

				partymeepbody{
					display: block;
					height: 100px;
					background: white;
					margin: 0px 15px;
					border-radius: ${W/4}px;
					left: ${-W/2}px;
					position: relative;
				}

				partymeeplegs{
					display:block;
					margin: 0px 25px;
					box-sizing: border-box;
					border-left: 15px solid white;
					border-right: 15px solid white;
					height: calc( 100% - 250px );
					left: ${-W/2}px;
					position: relative;
				}

				partymeepeye{
					display: inline-block;
					width: 12px;
					height: 20px;
					border-radius: 6px;
					background: gray;
					margin:25px 15px 0px;
				}

				partymeepmouth{
					display: inline-block;
					width: 20px;
					height: 10px;
					border-radius: 0px 0px 50% 50%;
					background: gray;
					margin-top: 5px;
				}

				partymeephead[n='1'] partymeephat{ background: blue; }
				partymeep[n='1'] partymeephat{ background: blue; }
				partymeep[n='1'] partymeephat:after{ background: blue; }
				partyplayerhud[n='1'] partyscore{ background: blue; }
				partyplayerhud[n='1'] partymeephat{ background: blue; }


				partymeephead[n='2'] partymeephat{ background: limegreen; }
				partymeep[n='2'] partymeephat{ background: limegreen; }
				partymeep[n='2'] partymeephat:after{ background: limegreen; }
				partyplayerhud[n='2'] partyscore{ background: limegreen; }
				partyplayerhud[n='2'] partymeephat{ background: limegreen; }

				partymeephead[n='3'] partymeephat{ background: #dd00ff; }
				partymeep[n='3'] partymeephat{ background: #dd00ff; }
				partymeep[n='3'] partymeephat:after{ background: #dd00ff; }
				partyplayerhud[n='3'] partyscore{ background: #dd00ff; }
				partyplayerhud[n='3'] partymeephat{ background: #dd00ff; }

				partymeephead[n='4'] partymeephat{ background: #ff6600; }
				partymeep[n='4'] partymeephat{ background: #ff6600; }
				partymeep[n='4'] partymeephat:after{ background: #ff6600; }
				partyplayerhud[n='4'] partyscore{ background: #ff6600; }
				partyplayerhud[n='4'] partymeephat{ background: #ff6600; }

				partymeephead[n='5'] partymeephat{ background: #ffbb00; }
				partymeep[n='5'] partymeephat{ background: #ffbb00; }
				partymeep[n='5'] partymeephat:after{ background: #ffbb00; }
				partyplayerhud[n='5'] partyscore{ background: #ffbb00; }
				partyplayerhud[n='5'] partymeephat{ background: #ffbb00; }
			</style>`);
	}

	let self = this;
	self.score = 0;
	self.$el = $(`
		<partymeep n=${n}>
			<partymeepshadow></partymeepshadow>
			<partymeepavatar>
				<partymeephead>
					<partymeephat></partymeephat>
					<partymeepeye></partymeepeye>
					<partymeepeye></partymeepeye><br>
					<partymeepmouth></partymeepmouth>
				</partymeephead>
				<partymeepbody></partymeepbody>
				<partymeeplegs></partymeeplegs>
				<partymeephand></partymeephand>
				<partymeephand></partymeephand>
			</partymeepavatar>
		</partymeep>
	`);

	self.$handLeft = self.$el.find('partymeephand').first();
	self.$handRight = self.$el.find('partymeephand').last();

	self.setHeight = function(h){

		self.$el.find('partymeepavatar').height(h);
	}

}

window.PartyTally = function(players){

	if(!PartyTally.didInit){

		PartyTally.didInit = true;

		$("head").append(`
			<style>
				partytallymodal{
					display:block;
					text-align: left;
					position: absolute;
					top: 0px;
					left: 1600px;
					width: 1600px;
					height: 1000px;
					padding: 100px;
					pointer-events: none;
					overflow: hidden;
				}

				partytallytable{
					display: inline-block;
					color: gray;
					font-size: 40px;
				}

				partytallyrow{
					display: block;
					background: white;
					padding: 10px 15px;
					width: 330px;
					text-align: left;
					position: relative;
					margin: 20px;
					box-shadow: 0px 2px 20px black;
				}

				partytallypos{
					display: inline-block;
					width: 100px;
					font: inherit;
					margin-right: 100px;
					vertical-align:middle;
				}

				partytallyscore{
					display: inline-block;
					width: 100px;
					font: inherit;
					color: #9B62E8;
					vertical-align:middle;
				}

				partytallycoin{
					width: 30px;
					height: 40px;
					background: #9B62E8;
					display: inline-block;
					border-radius: 100%;
					border-right: 5px solid rgba(0,0,0,0.2);
					box-sizing: border-box;
					position: relative;
					vertical-align: middle;
					transform: rotate(20deg);
					box-shadow: inset -2px 0px rgba(255,255,255,0.5);
				}

				partytallycoin:before{
					content:"";
					position: absolute;
					top: 0px;
					left: -1px;
					right: 2px;
					bottom: 0px;
					margin: 5px;
					border: 1px solid rgba(255,255,255,0.5);
					border-radius: 100%;
				}

				partytallycoin:after{
					content:"";
					position: absolute;
					top: 0px;
					left: 0px;
					right: 0px;
					bottom: 0px;
					margin: 5px;
					border: 2px solid rgba(0,0,0,0.5);
					border-radius: 100%;
				}

				partytallyrow partymeephead{
					display: inline-block;
					position: absolute;
					left: 100px;
					top: -40px;

					transform: scale(0.5);
					box-shadow: 0px 2px 10px black;
				}

				partytallyresultmask{
					overflow: hidden;
					position: absolute;
					padding-left: 20px;
					top: 0px;
					bottom: 0px;
					width: 200px;
				}

				partytallyresult{
					position: relative;
					background: #9B62E8; 
					color: white;
					height: 100%;
					display: inline-block;
					box-sizing: border-box;
					padding: 5px 20px;
					border: 5px solid white;

					left: -150px;
				}
			</style>
		`)
	}

	let self = this;
	self.$el = $(`<partytallymodal>`);
	let $table = $(`<partytallytable>`).appendTo(self.$el);

	let rows = [];
	for(var i=0; i<players.length; i++){
		rows[i] = new PartyTallyRow(i,players[i]);
		rows[i].$el.appendTo($table);
	}

	self.redraw = function(){
		for(var r in rows) rows[r].redraw();
	}

	self.hideRows = function(){
		for(var r in rows) rows[r].$el.delay(r*100).animate({left:-500});
	}

	self.showRows = function(){
		for(var r in rows) rows[r].$el.delay(r*100).animate({left:0});
	}

	self.showResults = function(results){
		for(var r in rows){
			rows[r].showResult(results[r],r*100);
		}
	}

	self.resolveResults = function(){
		for(var r in rows) rows[r].resolveResult(r*100);
	}
}

window.PartyTallyRow = function(n,player){
	let self = this;
	self.$el = $(`
		<partytallyrow n=${n}>
			<partytallypos>1st</partytallypos>
			<partymeephead n=${n}>
				<partymeephat></partymeephat>
				<partymeepeye></partymeepeye>
				<partymeepeye></partymeepeye><br>
				<partymeepmouth></partymeepmouth>
			</partymeephead>
			<partytallycoin></partytallycoin>
			<partytallyscore>${player.score}</partytallyscore>
			<partytallyresultmask>
				<partytallyresult>+10</partytallyresult>
			</partytallyresultmask>
		</partytallyrow>`
	);

	self.redraw = function(){
		self.$el.find('partytallyscore').text(Math.floor(player.score));
	}

	self.showResult = function(result,delay=0){
		self.$el.find('partytallyresult')
		.text(result>=0?'+ '+result:'- '+(-result))
		.show()
		.css({left:-200})
		.delay(delay)
		.animate({left:0});
	}

	self.resolveResult = function(delay=0){
		self.$el.find('partytallyresult').delay(delay).animate({left:-200});
		setTimeout( self.redraw, delay );
	}
}

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

window.PartyHUD = function(meeps){

	if(!PartyHUD.didInit){
		PartyHUD.didInit = true;

		$("head").append(`
			<style>
				partyhud{
					position: absolute;
					top: 0px;
					bottom: 0px;
					left: 0px;
					right: 0px;
					display: block;
					z-index: 100;
					text-align: center;
					
				}

				partyhudbaseline{
					display: block;
					bottom: 0px;
					position: absolute;
					left: 0px;
					right: 0px;
					text-align: center;
				}

				partyhudstream{
					display: inline-block;
					white-space: nowrap;
					box-shadow: 0px 0px 20px rgba(0,0,0,0.5);
					border-radius: 30px 30px 0px 0px;
					overflow: hidden;

					background: #40B0ED;
					padding: 15px 5px 0px 5px;

				}

				partyhudframe{
					display: inline-block;
					width: 33.33%;
					height: 100%;
					position: relative;
					overflow: hidden;
				}

				partyhudframe:before{
					content: "";
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
					right: 0px;
					bottom: 0px;
					box-sizing: border-box;
					border: 50px solid black;
					filter: blur(20px);
					opacity: 0.5;
				}

				partyhudframe:after{
					content: "";
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
					right: 0px;
					bottom: 0px;
					box-sizing: border-box;
					border: 50px solid #40B0ED;
				}

				partyplayerhud{
					width: 160px;
					height: 90px;
					display: inline-block;
					box-sizing: border-box;
					position: relative;
					color: white;
					background: #40B0ED;
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
			</style>
			`);
	}

	let self = this;
	self.$el = $('<partyhud>');

	for(var i=0; i<3; i++) $('<partyhudframe>').appendTo(self.$el);

	let $baseline = $('<partyhudbaseline>').appendTo(self.$el);
	let $stream = $('<partyhudstream>').appendTo($baseline);
	let $timer;
	let huds = [];
	let iTimer = Math.floor(meeps.length/2);
	let type = 'before'
	for(var i=0; i<meeps.length; i++){

		if(i==iTimer){
			$timer = $(`
				<partyhudtimer>60</partyhudtimer>
			`).appendTo($stream);
			type = 'after'
		}

		let hud = new PartyPlayerHUD(i,meeps[i],type);
		hud.$el.appendTo($stream);
		huds[i] = hud;
	}

	self.redraw = function(sec){
		 $timer.text(sec);
		for(var h in huds) huds[h].redraw();
	}

	self.redraw();
}