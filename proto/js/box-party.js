BoxPartyScene3D = function(doInBox){
    
	let audio = new AudioContext();
    audio.add('rumble','./proto/audio/party/sfx-rumble.mp3',1);
    audio.add('reverse','./proto/audio/fight-reverse.mp3',1);


    const W = 1600*3;
    const H = 1000;

    if( !BoxPartyScene3D.isStyled) $("head").append(`
        <style>
            partyScene3D{
                display:block;
                width: ${W}px;
                height: ${H}px;

                transform-origin: top left;
                overflow: hidden;
            }

            partyWorld3D{
                display:block;
                position: absolute;
                left: ${W/2}px;
                top: ${H/2}px;
                perspective-origin: center;
                perspective: ${W}px;
            }

            partyScene3D room3dSurface{
            	box-shadow: inset 0px 0px 25px #ffdd00;
            }

            partyScene3D room3d[n='1'] room3dSurface{
            	box-shadow: inset 0px 0px 25px hotpink;
            }

             partyScene3D room3d[n='2'] room3dSurface{
            	box-shadow: inset 0px 0px 25px cyan;
            }

            partyWorldOverlay{
            	background: white;
            	position: absolute;
            	top: 0px; 
            	left: 0px;
            	right: 0px;
            	bottom: 0px;
            	display: block;
            	opacity: 0;
            	pointer-events: none;
            }

            partyWorldOverlay igbside{
            	background: rgba(0,0,0,0.1);
            	box-shadow: inset 0px 0px 250px hotpink;
            }

            partyWorldOverlay:after{
            	content: "";
            	position: absolute;
            	top: 0px; 
            	left: 0px;
            	right: 0px;
            	bottom: 0px;
            	display: block;
            	background: url(./proto/img/party/in-cube-bubbles.gif);
            	background-size: 33.3%;
            	background-position: center;
            	mix-blend-mode: overlay;
            	opacity: 0.2;
            }

            partyWorldOverlay[n='0']{	background: #ffc43a;	}
            partyWorldOverlay[n='0'] igbside{ box-shadow: inset 0px 0px 250px #ffc43a; }
            partyWorldOverlay[n='1']{	background: #F672AF;	}
            partyWorldOverlay[n='1'] igbside{ box-shadow: inset 0px 0px 250px #F672AF; }
            partyWorldOverlay[n='2']{	background: #09B2F3;	}
            partyWorldOverlay[n='2'] igbside{ box-shadow: inset 0px 0px 250px #09B2F3; }

        </style>
    `);

    BoxPartyScene3D.isStyled = true;
   
	const ZMAX = 4500;
	const ZFADE = 4300;
	let isInBox = false;

    let self = this;
    self.$el = $(`
        <partyScene3D>
        </partyScene3D>`
    );

    let $world = $('<partyWorld3D>').appendTo(self.$el);
    let $overlay = $('<partyWorldOverlay>').appendTo(self.$el);

    for(var w=0; w<3; w++) $('<igbside>').appendTo($overlay);

    let boxes = [];
    for(var i=0; i<3; i++){
    		let box = new Room3D(150,150,150,'rgba(0,0,0,0.5)');
    		box.x = Math.cos( 0.5 + i/3*Math.PI*2 ) * 250;
    		box.y = 0 + Math.sin( 0.5 + (i/3)*Math.PI*2 ) * 150;
    		box.z = -i*1500;
   			box.$el.appendTo($world);
   			box.$el.attr('n',i);
   			box.$el.click(doBox);
   			box.isSpinning = true;
   			box.ry = box.rz = 0;
   			boxes[i] = box;
    }

    let n = 0;
    function step(){
    	n++;
    	for(var b in boxes ){

    		if( boxes[b].isSpinning ){
    			let dir = b%2?1:-1;
    			boxes[b].ry = n*dir;
    			boxes[b].rz = n*0.5;
    		} else {
    			boxes[b].ry *= 0.9;
    			boxes[b].rz *= 0.9;
    			boxes[b].x *= 0.9;
    			boxes[b].y *= 0.9;
    			boxes[b].z += 100;

    			if(boxes[b].z>ZFADE){
    				let amt = (boxes[b].z - ZFADE)/(ZMAX-ZFADE);
    				$overlay.css('opacity',amt);
    			}	

    			if(boxes[b].z>ZMAX && !isInBox){
    				isInBox = true;
    				boxes[b].z = ZMAX;
    				audio.stop('rumble');
    				audio.play('reverse');
    				doInBox();
    			}
    		}

    		boxes[b].$el.css({
    			transform:'translateX('+boxes[b].x+'px) translateY('+boxes[b].y+'px) translateZ('+boxes[b].z+'px) rotateY('+boxes[b].ry+'deg) rotateZ('+boxes[b].rz+'deg)'
    		});
    	}
    }

    setInterval(step,1000/20);

    function doBox(){
    	let n = $(this).attr('n');
    	boxes[n].isSpinning = false;
    	boxes[n].$el.appendTo($world);
    	$overlay.attr('n',n);
    	audio.play('rumble');
    }
}

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
	const GRID = 100;
	let scale = 1;

	$("head").append(`
        <style>
        	boxpartygame{
        		display: block;
        		width: ${W*GRID*3}px;
        		height: ${H*GRID}px;
        		transform-origin: top left;
        		background-image: url(./proto/img/party/box-party-landscape.png);
        		background-size: 100%;
        		background-position: 80% 0%;
        	}

        	boxpartyminigame{
        		display: block;
        		width: ${W*GRID*3}px;
        		height: ${H*GRID}px;
        		top: 0px;
        		left: 0px;
        		position: absolute;
        		pointer-events: none;
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

 	let audio = new AudioContext();
    audio.add('music','./proto/audio/party/music-ethereal.mp3',0.5,true,true);
   // audio.add('music','./proto/audio/party/sfx-rumble.mp3',1);

	let self = this;
	self.$el = $('<igb>');
	let $game = $('<boxpartygame>').appendTo(self.$el);
	let $minigame = $('<boxpartyminigame>').appendTo(self.$el);
	let $track = $('<partytrack>')//.appendTo($game);

	let scene = new BoxPartyScene3D(doLaunchGame);
	scene.$el.appendTo($game);

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
		//setTimeout(initSpinner,500);
	}

	//setTimeout(initSpinner,500);
	

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

	function doLaunchGame(){
		let p = MilkGame;
		let liveModule = new p();
		liveModule.$el.appendTo($minigame);
		audio.stop('music');
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

    $(document).click(function(){
    	audio.play('music');
    	$(document).off();
    })
}