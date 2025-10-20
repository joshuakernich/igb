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

					box-sizing: border-box;
				}

				partytallytable{
					display: inline-block;
					color: gray;
					font-size: 40px;
					position: relative;
				}

				partytallyrow{
					display: block;
					background: rgba(255,255,255,0.9);
					
					width: 560px;
					height: 80px;
					text-align: left;
					position: absolute;
					
					box-shadow: 0px 2px 20px black;

					left: -800px;
					opacity: 0;
					line-height: 80px;
					font-weight: bold;
					

					position: absolute;
				}

				partytallycontent{
					display: block;
					position: absolute;
					inset: 0px;
					overflow: hidden;
				}

				partytallypos{
					display: inline-block;
					width: 100px;
					font: inherit;
					margin-left: 20px;
					vertical-align:middle;
				}

				partytallyname{
					display: inline-block;
					width: 250px;
					font: inherit;
					margin-left: 70px;
					overflow: hidden;
					vertical-align:middle;

				}

				partytallyscore{
					display: inline-block;
					width: 100px;
					right: 20px;
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

					margin-left: 0px;
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
					top: 10px;

					transform: scale(0.7);
					transform-origin: top left;
					
				}

				partytallyresultmask{
					overflow: hidden;
					position: absolute;
					display: block;
					
					
					left: 100%;
					width: 140px;
					top: 0px;
					bottom: 0px;
				}

				partytallyresult{
					position: relative;
					background: #9B62E8; 
					color: white;
					height: 80px;
					display: inline-block;
					box-sizing: border-box;
					
					border: 5px solid white;

					line-height: 70px;
					width: 120px;
					left: -120px;
					text-align: center;
				}
			</style>
		`)
	}

	let audio = new AudioPlayer();
	audio.add('woosh','./proto/audio/party/sfx-woosh.mp3',0.1);
	audio.add('coin','./proto/audio/party/sfx-coin.mp3',0.3);

	let self = this;
	self.$el = $(`<partytallymodal>`);
	let $table = $(`<partytallytable>`).appendTo(self.$el);

	self.rerank = function(){
		for(var p in players){
			players[p].rank = 0;
			for(var p2 in players){
				if( players[p2].score > players[p].score ) players[p].rank ++;
			}
		}
	}

	let rows = [];
	for(var i=0; i<players.length; i++){
		rows[i] = new PartyTallyRow(i,players[i]);
		rows[i].$el.appendTo($table);
		rows[i].$el.css({
			left: 0,
			top: 100 * i,
		})
	}

	self.showRow = function (r) {
		audio.play('woosh',true);
		rows[r].$el.animate({left:0, opacity:1});
	}

	self.hideRow = function (r) {
		audio.play('woosh',true);
		rows[r].$el.animate({left:-800, opacity:0.5});
	}

	self.redraw = function(){
		for(var r in rows) rows[r].redraw();
	}

	self.hideRows = function(){
		for(var r in rows) rows[r].$el.delay(r*100).animate({left:-800, opacity:0.5},{start:function(){audio.play('woosh',true);}});
	}

	self.showRows = function(){
		for(var r in rows) rows[r].$el.delay(r*100).animate({left:0, opacity:1},{start:function(){audio.play('woosh',true);}});
	}

	self.showResults = function(results){
		for(var r in rows){
			rows[r].showResult(results[r],r*100);
		}
	}

	self.resolveResults = function(){

		for(var r in rows) rows[r].resolveResult(r*100);

		setTimeout(function(){
			self.showRank(true);
		}, r*100 + 500);
	}

	self.showRank = function(doAnim=false){

		self.rerank();


		let nPos = -1;
		for(var n=0; n<6; n++){
			for(var p in players){
				if(players[p].rank == n){
					nPos++;
					rows[p].nPosWas = rows[p].nPos;
					rows[p].nPos = nPos;
					rows[p].$el.css({top:nPos*100});
					rows[p].redraw();
				}
			}
		}

		if(doAnim){
			for(var r in rows){
				

				let dir = 0;
				if(rows[r].nPos > rows[r].nPosWas) dir = 1;
				if(rows[r].nPos < rows[r].nPosWas) dir = -1;

				rows[r].$el.css({top:rows[r].nPosWas*100}).animate({left:dir*100}).animate({top:rows[r].nPos*100}).animate({left:0});
			}
		}
 	}

 	self.showRank();
}

window.PartyTallyRow = function(n,player){

	const RANKS = ['1st','2nd','3rd','4th','5th','6th'];

	let audio = new AudioPlayer();
	audio.add('woosh','./proto/audio/party/sfx-woosh.mp3',0.05);
	audio.add('coin','./proto/audio/party/sfx-coin.mp3',0.3);

	let self = this;
	self.$el = $(`
		<partytallyrow n=${n}>
			<partytallycontent>
				<partytallypos>${RANKS[player.rank]}</partytallypos>
				
				<partymeephead n=${n}>
					<partymeephat></partymeephat>
					<partymeepeye></partymeepeye>
					<partymeepeye></partymeepeye><br>
					<partymeepmouth></partymeepmouth>
				</partymeephead>
				<partytallyname>${player.name}</partytallyname>
				<partytallycoin></partytallycoin>
				<partytallyscore>${player.score}</partytallyscore>
			</partytallycontent>
			<partytallyresultmask>
				<partytallyresult>+10</partytallyresult>
			</partytallyresultmask>
		</partytallyrow>`
	);

	self.redraw = function(){
		self.$el.find('partytallyscore').text(Math.floor(player.score));
		self.$el.find('partytallypos').text(RANKS[player.rank]);
	}

	self.showResult = function(result,delay=0){
		if(isNaN(result)) result = 0;

		self.$el.find('partytallyresult')
		.text(result>=0?'+ '+result:'- '+(-result))
		.show()
		.css({left:-120})
		.delay(delay)
		.animate({left:20},{start:function(){audio.play('woosh',true);}});
	}

	self.resolveResult = function(delay=0){
		self.$el.find('partytallyresult').delay(delay).animate({left:-200},{
			start:function(){audio.play('coin',true)},
		});
		setTimeout( self.redraw, delay );
	}
}