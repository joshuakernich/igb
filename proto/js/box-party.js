BoxPartyGame = function(){

	const W = 16;
	const H = 10;
	const GRID = 50;

	$("head").append(`
        <style>
        	boxpartygame{
        		display: block;
        		width: ${W*GRID*3}px;
        		height: ${H*GRID}px;
        		background: #557733;
        		transform-origin: top left;
        	}

        	partytrack{
        		display: block;
        		position: absolute;
        		left: 50%;
        		top: 50%;
        	}

        	partystop{
        		display: block;
        		width: 30px;
        		height: 15px;
        		border-radius: 100%;
        		background: blue;
        		border: 2px solid white;
        		box-shadow: 0px 2px black;
        		transform: translate(-50%);
        		position: absolute;
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

	for(var i=0; i<STOPS; i++){

		let p = i/STOPS;

		let t = Math.PI*2 * p;

		// this formula creates the bean-shaped layout for the stops
		let r = SPAN + PINCH * Math.cos( ARMS*t );

		let x = Math.cos( t ) * r;
		let y = Math.sin( t ) * r;

		console.log(x,y);

		let $stop = $('<partystop>').appendTo($track)
		.css({
			left: x * GRID,
			top: y * GRID,
		})
	}

	setInterval(function(){
		let w = $(document).innerWidth();
		let scale = w/(W*GRID*3);
		$game.css('transform','scale('+scale+')');
	},50)
}