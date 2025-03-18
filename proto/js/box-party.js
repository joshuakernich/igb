BoxPartySpinner = function( player, fnComplete ){
	const FPS = 50;

	
	let pxWas = player.px;
	let interval = undefined;
	let tracking = true;
	let r = 0;
	let dx = 0;
	let nValue = 0;

	let self = this;
	self.$el = $('<partymodal>');
	let $center = $('<partycenter>').appendTo(self.$el);
	let $spinner = $('<partyspinner>').appendTo($center);
	let $wheel = $('<partywheel>').appendTo($spinner);
	let $marker = $('<partywheelmarker>').appendTo($center);
	let $arrow = $('<partyspinnerarrow>').appendTo($center);

	const SEGS = 9;
	const WSEG =  ( 300 * Math.PI ) / SEGS;
	const RADIUS = 100;
	
	for(var i=0; i<SEGS; i++){

		let r = (i/SEGS*Math.PI*2);
		
		let $seg = $('<partyseg>').appendTo($wheel).css({
			transform: 'rotate('+(r+ Math.PI/2)+'rad)',
			left: Math.cos(r) * RADIUS,
			top: Math.sin(r) * RADIUS,
		})

		let $num = $('<partysegnumber>').appendTo($seg).text((i+1));
	}

	function step(){

		if(tracking){
			r = 50-player.px;
			dx = pxWas - player.px;
			pxWas = player.px;
			if(Math.abs(dx)>10) tracking = false;
		} else {
			r += dx;
			dx *= 0.98;

			if(Math.round(dx)==0){
				dx = 0;
				clearInterval(interval);

				setTimeout(function(){
					fnComplete(nValue + 1);
				},500)
			}
		}

		//console.log(r + 360 * 10);
		let rInt = (r + 360 * 100)%360;
		let perSeg = 360/SEGS;
		nValue = ( SEGS - Math.round(rInt/perSeg) )%SEGS;
		
		$('partyseg').each(function(i){
			$(this).attr('active',i==nValue);
		});
		$spinner.css('transform',`rotate(${-90+r}deg)`);
		$arrow.css('left',-r/100*(8*50)+'px');
	}

	interval = setInterval(step,1000/FPS);
}

BoxPartyGame = function(){

	const W = 16;
	const H = 10;
	const GRID = 50;
	let scale = 1;

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
        		width: 20px;
        		height: 12px;
        		border-radius: 100%;
        		background: orange;
        		border: 2px solid white;
        		box-shadow: 0px 2px black;
        		transform: translate(-50%, -50%);
        		position: absolute;
        	}

        	partyplayer{
        		top: 0px;
        		left: 0px;
        		position: absolute;
        		display: block;
        	}

        	partyplayerbody{
        		content: " ";
        		display: block;
        		width: 16px;
        		height: 20px;
        		background: white;
        		border-radius: 12px;
        		position:absolute;
        		left: -8px;
        		bottom: 0px;
        		box-shadow: 0px 2px 1px rgba(0,0,0,0.2);
        	}

        	partyplayerhead{
        		
        		display: block;
        		width: 20px;
        		height: 25px;
        		background: white;
        		border-radius: 10px;
        		position:absolute;
        		left: -10px;
        		bottom: 15px;
        		box-shadow: 0px 2px 1px rgba(0,0,0,0.2);
        		animation: idlehead 0.8s infinite;
        		text-align: center;
        		line-height: 25px;
        		font-weight: bold;
        		font-size: 20px;
        		font-family: serif;

        	}

        	partyplayerhead:before{
        		content: "..";
        	}

        	partyplayerhead:after{
        		content: " ";
        		display: block;
        		
        		height: 50%;
        		border-bottom: 4px solid red;
        		position: absolute;
        		top: 0px;
        		left: 0px;
        		right: 0px;
        		border-radius: 2px;
        		box-sizing: border-box;
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
        		width: 40px;
        		height: 20px;
        		left: -20px;
        		bottom: -10px;
        		background: black;
        		position: absolute;
        		border-radius: 100%;
        		box-shadow: 0px 0px 5px black;
        		opacity: 0.8;
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

        	partymodal{
        		display: block;
        		position: absolute;
        		top: 0px;
        		left: 0px;
        		right: 0px;
        		bottom: 0px;
        		backdrop-filter: blur(10px);
        	}

        	partycenter{
        		display: block;
        		position: absolute;
        		top: 0px;
        		left: 0px;
        		right: 0px;
        		bottom: 0px;
        		margin: auto;
        		width: 0px;
        		height: 0px;
        	
        	}

        	partyspinner{
        		display: block;
        		position: absolute;
        		top: 0px;
        		left: 0px;
        		width: 0px;
        		height: 0px;
        	
        	}

        	partywheel{
        		width:0px;
        		height:0px;
        		margin: auto;
        		top: 0px;
        		left:0px;
        		right:0px;
        		bottom:0px;
        		position: absolute;
        		display: block;
        	}

        	partywheel:before{
        		content:"";
        		width: 300px;
        		height: 300px;
        		background: white;
        		position: absolute;
        		transform: translate(-50%, -50%);
        		border-radius: 100%;
        	}

        	partywheel:after{
        		content:"";
        		width: 100px;
        		height: 100px;
        		background: #ccc;
        		position: absolute;
        		transform: translate(-50%, -50%);
        		border-radius: 100%;
        	}

        	partyseg{
        		position: absolute;
        		display: block;
        		width: 0px;
        		height: 0px;
        		transform-origin: center;
        	}



        	partysegnumber{
        		
        		width: 60px;
        		height: 60px;
        		border-radius: 100%;
        		background: #ccc;
        		display: block;
        		transform: translate(-50%, -50%);
        		color: white;
        		line-height: 60px;
        		text-align: center;
        		font-size: 30px;
        	}

        	partyseg[active='true'] partysegnumber{
        		background:orange;
        	}

        	partywheelmarker{
        		position: absolute;
        		top: -300px;
        		bottom: 0px;
        		left: 0px;
        		right: 0px;

        		margin: auto;
        		width: 10px;
        		height: 30px;
        		display: block;
        		background: orange;

        	}

        	partyspinnerarrow{
        		display block;
        		bottom: 50px;
        		width: 50px;
        		height: 50px;
        		border-radius: 100%;
        		background: red;
        		transform: translate(-50%, -50%);
        		left: 0px;
        		top: 200px;
        		position: absolute;
        	}

        	@keyframes idlehead{
        		0%{
        			transform: translate(-1px);
        		}

        		50%{
        			transform: translate(1px);
        		}

        		100%{
        			transform: translate(-1px);
        		}
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
		players[i] = {n:i,nStop:i,score:0,$el:$(`
			<partyplayer>
				<partyplayerbody></partyplayerbody>
				<partyplayerhead></partyplayerhead>
			<partyplayer>
		`).appendTo($track)};

		players[i].$el.css({ left:nodes[i].x * GRID, top:nodes[i].y * 0.6 * GRID });
	}

	let cube = $('<partycube>').appendTo($track);
	let spinner;

	function initSpinner(){
		spinner = new BoxPartySpinner( players[0], onSpinnerComplete );
		spinner.$el.appendTo($game);
	}

	function onSpinnerComplete( value ){
		spinner.$el.remove();
		setTimeout(initSpinner,500);
	}

	setTimeout(initSpinner,500);
	

	setInterval(function(){
		let w = $(document).innerWidth();
		scale = w/(W*GRID*3);
		$game.css('transform','scale('+scale+')');
	},50)

	self.setPlayers = function(p){
		for( let n in players ){
			players[n].px = p[n].px;
			players[n].py = p[n].py;
			players[n].pz = p[n].pz;
		}
	}

	$(document).on('mousemove',function(e){

        let oy = $game.offset().top;
        let x = (e.pageX/scale)/(W*GRID);
        let y = (e.pageY-oy)/scale/(H*GRID);

        if( x < 1 ){
            //left wall
            players[0].px = (y)*100;
            players[0].pz = (x)*100;
        } else if( x > 2 ){
            //right wall
            players[0].px = (1 - y)*100;
            players[0].pz = (3 - x)*100;
        }
        else{
            //front wall
            players[0].px = (x - 1)*100;
            players[0].pz = (1 - y)*100;
        }

        players[1].px = players[0].px + 10;
        players[1].pz = players[0].pz;

        players[0].proximity = [0.9,0.9,0.9];
    })
}