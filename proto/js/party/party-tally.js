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
					top: -80px;

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