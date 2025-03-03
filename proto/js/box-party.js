BoxPartyGame = function(){

	const W = 16;
	const H = 10;
	const GRID = 50;
	const NODE = 30;

	$("head").append(`
        <style>
        	boxpartygame{
        		display: block;
        		width: ${W*GRID*3}px;
        		height: ${H*GRID}px;
        		transform-origin: top left;
        		background-image: url(./proto/img/party/bg.png);
        		background-size: 100%;
        	}

        	partytrack{
        		display: block;
        		position: absolute;
        		left: 50%;
        		top: 65%;
        	}

        	partystop{
        		display: block;
        		width: ${NODE}px;
        		height: ${NODE/2}px;
        		border-radius: 100%;
        		background: blue;
        		border: 2px solid white;
        		box-shadow: 0px 2px black;
        		transform: translate(-50%);
        		position: absolute;
        	}

        	partyplayer{
        		width: 0px;
        		height: 0px;
        		position: absolute;
        		display: block;
        	}

        	partyplayer:after{
        		content: " ";
        		display: block;
        		width: ${NODE}px;
        		height ${NODE*3}px;
        		background: white;
        		border-radius: 100% 100% 0px 0px;
        		position:absolute;
        		left: ${-NODE/2}px;
        		bottom: 0px;

        	}

        	partycube{
        		display: block;
        		position: absolute;
        		top: 0px;
        		left: 0px;
        	}

        	partycube:before{
        		content: " ";
        		display: block;
        		width: 50px;
        		height: 20px;
        		left: -25px;
        		bottom: -10px;
        		background: black;
        		position: absolute;
        		border-radius: 100%;
        		box-shadow: 0px 0px 5px black;
        		opacity: 0.9;
        	}

        	partycube:after{
        		content: " ";
        		display: block;
        		width: 70px;
        		height: 70px;
        		background: url(./proto/img/party/box.png);
        		background-size: contain;
        		background-position: center;
        		background-repeat: no-repeat;
        		left: -35px;
        		bottom: 20px;
        		position: absolute;
        		animation: bobble 0.5s infinite;
        	}

        	@keyframes bobble{
        		0%{
        			bottom: 20px;
        		}

        		50%{
        			bottom: 25px;
        		}

        		100%{
        			bottom: 20px;
        		}
        	}
        <style`);

	let self = this;
	self.$el = $('<igb>');
	let $game = $('<boxpartygame>').appendTo(self.$el);

	let $track = $('<partytrack>').appendTo($game);

	const STOPS = 20;
	const ARMS = 5;
	const PINCH = 1;
	const SPAN = 3;

	let nodes = [];

	for(var i=0; i<STOPS; i++){

		let p = i/STOPS;

		let t = Math.PI*2 * p;

		// this formula creates the bean-shaped layout for the stops
		let r = SPAN + PINCH * Math.cos( ARMS*t );

		let x = Math.cos( t ) * r;
		let y = Math.sin( t ) * r;

		let $stop = $('<partystop>').appendTo($track)
		.css({
			left: x * GRID,
			top: y*0.6 * GRID,
		})

		nodes[i] = {x:x,y:y,$el:stop};
	}

	const PLAYERS = 2;
	let players = [];
	for(var i=0; i<PLAYERS; i++){
		players[i] = {n:i,nStop:0,score:0,$el:$('<partyplayer>').appendTo($track)};
	}

	let cube = $('<partycube>').appendTo($track);


	setInterval(function(){
		let w = $(document).innerWidth();
		let scale = w/(W*GRID*3);
		$game.css('transform','scale('+scale+')');
	},50)
}