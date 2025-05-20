
window.PartyMeep = function(n){

	const W = 100;
	const H = 500;

	if(!PartyMeep.didInit){
		PartyMeep.didInit = true;

		$("head").append(`
			<style>
				partymeep{
					display:block;
					position: absolute;	
				}

				partymeepshadow{
					display:block;
					position:absolute;
					width: ${W}px;
					height: ${W/4}px;
					bottom: ${-W/8}px;
					left: ${-W/2}px;
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
					top: 300px;
					position: absolute;
					left: ${-W}px;
					z-index: 1;
				}

				partymeephand:last-of-type{
					left: ${W}px;
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
				}

				partymeephat{
					display: block;
					background: red;
					height: 20px;
					border-radius: 5px;
				}

				partymeepbody{
					display: block;
					height: 150px;
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
					height: calc( 100% - 300px );
					left: ${-W/2}px;
					position: relative;
				}

				partymeepeye{
					display: inline-block;
					width: ${W/6}px;
					height: ${W/6}px;
					border-radius: 100%;
					background: gray;
					margin:15px 5px;
				}

				partymeep[n='1'] partymeephat{ background: blue; }
				partymeep[n='1'] partymeephat:after{ background: blue; }
				partyplayerhud[n='1'] partyscore{ background: blue; }
				partyplayerhud[n='1'] partymeephat{ background: blue; }

				partymeep[n='2'] partymeephat{ background: limegreen; }
				partymeep[n='2'] partymeephat:after{ background: limegreen; }
				partyplayerhud[n='2'] partyscore{ background: limegreen; }
				partyplayerhud[n='2'] partymeephat{ background: limegreen; }

				partymeep[n='3'] partymeephat{ background: #dd00ff; }
				partymeep[n='3'] partymeephat:after{ background: #dd00ff; }
				partyplayerhud[n='3'] partyscore{ background: #dd00ff; }
				partyplayerhud[n='3'] partymeephat{ background: #dd00ff; }
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
					<partymeepeye></partymeepeye>
					<partymeepmouth></partymeepmouth>
				</partymeephead>
				<partymeepbody></partymeepbody>
				<partymeeplegs></partymeeplegs>
				<partymeephand></partymeephand>
				<partymeephand></partymeephand>
			</partymeepavatar>
		</partymeep>
	`);

}

window.PartyPlayerHUD = function(n,meep,type){

	let self = this;
	self.$el = $(`
		<partyplayerhud n=${n} type=${type}>
		<partyplayerscore>0</partyplayerscore>
			<partymeephead>
				<partymeephat></partymeephat>
				<partymeepeye></partymeepeye>
				<partymeepeye></partymeepeye>
				<partymeepmouth></partymeepmouth>
			</partymeephead>
			
		</partyplayerhud>`
	);

	self.redraw = function(){
		self.$el.find('partyplayerscore').text(Math.floor(meep.score));
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
					width: 200px;
					height: 100px;
					display: inline-block;
					box-sizing: border-box;
					position: relative;
					color: white;
					background: #40B0ED;
					border: 20px solid #40B0ED;
				}

				partyplayerhud milkscore{
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

				partyhudtimer{
					width: 150px;
					height: 100px;
					background: #40B0ED;
					color: #333;
					display: inline-block;
					font-size: 70px;
					line-height: 100px;
					box-shadow: 0px 0px 20px rgba(0,0,0,0.2);
					vertical-align: top;
				}


				partyplayerhud partymeephead{
					position: absolute;
					top: 0px;
					left: auto;
					transform: scale(0.6);
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

		let hud = new MilkPlayerHUD(i,meeps[i],type);
		hud.$el.appendTo($stream);
		huds[i] = hud;
	}

	self.redraw = function(sec){
		 $timer.text(sec);
		for(var h in huds) huds[h].redraw();
	}
}