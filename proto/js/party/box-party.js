

/*
    w width
    l depth
    h height
    color css wall color
    walls array toggling walls
*/
PartyCube3D = function(transform,color,surfaces){

    // back right front left bottom top
    if(!surfaces) surfaces = ['black','black','black','black','black','black']
   

    if( !PartyCube3D.isStyled) $("head").append(`
        <style>
            partycube3D{
                display:block;
                transform-style: preserve-3d;
                width: 0px;
                height: 0px;
            }

            partycube3Dside{
                display:block;
                position:absolute;
                top: 0px;
                left: 0px;
                width: 0px;
                height: 0px;

                box-sizing:border-box;
                transform-style: preserve-3d;
                text-align:center;
                transform-origin: center;

            }  

            partycube3Dsurface{
                display:block;
                position:absolute;
                transform: translate(-50%,-50%);
                border-radius: 20px;
            }

        </style>
    `);

    PartyCube3D.isStyled = true;

    let self = this;

    self.$el = $(`
        <partycube3D>
            ${ surfaces[0]?`
                <partycube3Dside class='partycube3D-back' style='transform:translateZ(${-transform.d/2}px)'>
                    <partycube3Dsurface style='background:${surfaces[0]};width:${transform.w}px;height:${transform.h}px;'></partycube3Dsurface>
                </partycube3Dside>`:'' } 

            ${ surfaces[1]?`
                <partycube3Dside class='partycube3D-right' style='transform:translateX(${transform.w/2}px) rotateY(90deg)'>
                    <partycube3Dsurface style='background:${surfaces[1]};width:${transform.d}px;height:${transform.h}px;'></partycube3Dsurface>
                </partycube3Dside>`:'' } 

            ${ surfaces[2]?`
                <partycube3Dside class='partycube3D-front' style='transform:translateZ(${transform.d/2}px)'>
                    <partycube3Dsurface style='background:${surfaces[2]};width:${transform.w}px;height:${transform.h}px;'></partycube3Dsurface>
                </partycube3Dside>`:'' } 

            ${ surfaces[3]?`
                <partycube3Dside class='partycube3D-left' style='transform:translateX(${-transform.w/2}px) rotateY(90deg)'>
                    <partycube3Dsurface style='background:${surfaces[3]};width:${transform.d}px;height:${transform.h}px;'></partycube3Dsurface>
                </partycube3Dside>`:'' } 

            ${ surfaces[4]?`<partycube3Dside class='partycube3D-bottom' style='transform:translateY(${transform.h/2}px) rotateX(90deg);'>
                <partycube3Dsurface style='background:${surfaces[4]};width:${transform.w}px;height:${transform.d}px;'></partycube3Dsurface>
            </partycube3Dside>`:'' }
        
            ${ surfaces[5]?`<partycube3Dside class='partycube3D-top' style='transform:translateY(${-transform.h/2}px) rotateX(90deg);'>
                <partycube3Dsurface style='background:${surfaces[5]};width:${transform.w}px;height:${transform.d}px;'></partycube3Dsurface>
            </partycube3Dside>`:''}            
        </partycube3D>
        `)

    self.$el.find('partycube3Dsurface').css({'border-color':color});


    self.redraw = function(){

    	self.$el.css({
			'transform':'translateZ('+transform.altitude+'px) rotateX('+(-90)+'deg)'
		});

    	// back
		self.$el.find('.partycube3D-back').css({
			'transform':`translateZ(${-transform.d/2}px)`
		})

		// front
		self.$el.find('.partycube3D-front').css({
			'transform':`translateZ(${transform.d/2}px)`
		})

		//bottom
    	self.$el.find('.partycube3D-bottom').css({
    		transform:`translateY(${transform.h/2}px) rotateX(90deg)`
    	});

    	//top
    	self.$el.find('.partycube3D-top').css({
    		transform:`translateY(${-transform.h/2}px) rotateX(90deg)`
    	});

    	//left
    	self.$el.find('.partycube3D-left').css({
    		transform:`translateX(${-transform.w/2}px) rotateY(90deg)`
    	});

    	//right
    	self.$el.find('.partycube3D-right').css({
    		transform:`translateX(${transform.w/2}px) rotateY(90deg)`
    	});

    	// front back
    	self.$el.find('.partycube3D-front partycube3Dsurface, .partycube3D-back partycube3Dsurface').css({
			width:`${transform.w}px`,
			height:`${transform.h}px`,
		})

    	// top bottom
    	self.$el.find('.partycube3D-top partycube3Dsurface, .partycube3D-bottom partycube3Dsurface').css({
    		width:`${transform.w}px`,
    		height:`${transform.d}px`
    	});

    	// left right
    	self.$el.find('.partycube3D-left partycube3Dsurface, .partycube3D-right partycube3Dsurface').css({
    		width:`${transform.d}px`,
    		height:`${transform.h}px`
    	});
    }
}

BoxPartyCube = function(transform,game){

	let self = this;
	self.game = game;
	self.transform = transform;
	self.$el = $('<boxpartycube>');

	let shadow = $('<boxpartyshadow>').appendTo(self.$el).css({
		width: transform.w + 'px',
		height: transform.d + 'px',
	})

	//let z = h + Math.random()*h*2;
	//let rx = -10 + Math.random()*20;

	let box = new PartyCube3D(transform,game.color,[
		game.bg,
		game.bg,
		game.bg,
		game.bg,
		game.color,
		game.color,
	]);
	box.$el.appendTo(self.$el);
	
	box.$el.css({
		'top':'0px',
		'left':'0px',
		'transform':'rotateX('+(-90)+'deg)'
	});
	box.$el.appendTo(self.$el);

	let $face = $(`
		<boxface>
			<boxeye></boxeye>
			<boxeye></boxeye><br>
			<boxmouth></boxmouth>
		</boxface>
		`).appendTo(box.$el.find('.partycube3D-front partycube3Dsurface'));

	self.redraw = function(){

		self.$el.css({
			transform:`
			translateX(${transform.x}px) 
			translateY(${-transform.y}px) 
			translateZ(1px) 
			rotateY(${transform.ry}deg)
			rotateZ(${transform.rz}deg)`
		});

		box.redraw(); 
	}
}

BoxPartyScene3D = function(queue, callbackEnterBox, callbackExitBox){
    
	let audio = new AudioContext();
    audio.add('rumble','./proto/audio/party/sfx-rumble.mp3',1);
    audio.add('reverse','./proto/audio/fight-reverse.mp3',1);


    const W = 1600;
    const H = 1000;
    const TRACK = W*10;
    if( !BoxPartyScene3D.isStyled) $("head").append(`
        <style>
            partyScene3D{
                display:block;
                width: ${W*3}px;
                height: ${H}px;
                transform-origin: top left;
                overflow: hidden;
                perspective: ${W}px;
                position: absolute;
                left: 0px;
                top: 0px;
               
            }

            partyWorld3D{
                display:block;
                left: 50%;
                bottom: 0px;
                transform-origin: bottom center;
                transform: rotateX(90deg);
				width: ${W}px;
				
				position: absolute;

				transform-style:preserve-3d;
            }

            partyPlane3D{
            	display: block;
            	transform-style:preserve-3d;
            	bottom: 0px;
            	width: 0px;
            	left: 0px;
            	position: absolute;
            }

            partyPlane3D:before{
            	content: "";
            	background: linear-gradient( to top, rgba(255,255,255,0.2), transparent );
            	width: ${W/4}px;
        	 	position: absolute;
        	 	left: -${W/8}px;
        	 	height: ${TRACK}px;
                bottom: 0px;
                display: block;

				transform-style:preserve-3d;
            }
           
           partyScene3D partycube3DSurface:after{
            	content: "";
            	display: block;
            	position: absolute;
            	top: 0px;
            	left: 0px;
            	right: 0px;
            	bottom: 0px;
            	background: url(./proto/img/party/bg-cosmic-swirl.gif);
            	background-size: cover;
            	mix-blend-mode: overlay;
            	opacity: 0.2;
            	
            }
            
            partyScene3D partycube3DSurface{
            	border: 10px solid #ffdd00;
            	box-sizing: border-box;
            }

            boxpartyshadow{
            	display: block;
            	width: 150px;
            	height: 150px;
            	background: black;
            	position: absolute;
            	top: 0px;
            	left: 0px;
            	transform: translate(-50%, -50%);
            	opacity: 0.5;
            }

            boxpartycube{
            	display: block;
				transform-style:preserve-3d;
				position: absolute;
				width: 0px;
				left: 0px;
            }

            boxface{
            	display: block;
            	position: absolute;
            	left: 0px;
            	right: 0px;
            	bottom: 0px;
            	top: 0px;
            }

            boxeye{
            	display: inline-block;
            	width: 15%;
            	height: 10%;
            	margin: 40% 15% 10%;
            	background: white;
            	border-radius: 0px 0px 100% 100%;
            	box-shadow: 0px 0px 40px 5px black;

            }

            boxeye:first-of-type{
            	transform: rotate(15deg);
            }

            boxeye:last-of-type{
            	transform: rotate(-15deg);
            }

            boxmouth{
            	display: inline-block;
            	width: 20%;
            	height: 10%;
            	background: white;
            	display: none;
            	border-radius: 0px 0px 100% 100%;
            }
        </style>
    `);

    BoxPartyScene3D.isStyled = true;
   
	
	let isInBox = false;

    let self = this;
    self.$el = $(`
        <partyScene3D>
        </partyScene3D>`
    );

    let $world = $('<partyWorld3D>').appendTo(self.$el);
    let $plane = $('<partyPlane3D>').appendTo($world);

    let boxes = [];
    for(var i=0; i<queue.length; i++){

		for(var n=0; n<queue[i].length; n++){

			let transform = {
				w:W/6,h:W/6,d:W/6,
				x:-W/4 + n*W/2,
				y:W/2 + i*(W),
				altitude:H/4 + Math.random()*H/2,
				rx:0,
				ry:0,
				rz:-25 + n*50,
			}

    		let box = new BoxPartyCube(transform,queue[i][n]);
   			box.$el.appendTo($plane);
   			
   			box.$el.click(doBox);
   			box.isSpinning = true;

   			let nBox = boxes.push(box)-1;
   			box.$el.attr('n',nBox);
   		}
    }

    let meeps = [];
    for(var i=0; i<6; i++){
    	let meep = new PartyMeep(i);
    	meep.setHeight(350);
    	meep.$el.appendTo($plane);
    	meep.$el.css({
    		'transform':'rotateX(-90deg) scale(0.5)',
    	});

    	meeps[i] = meep;
    }

    let nSelect = undefined;
    let nStep = 0;
    function step(){
    	nStep++;
    	for(var b in boxes ){

    		if( boxes[b].isSpinning ){
    			// bob up and down here
    			
    			
    		} else {
    			
    		}

    		
    		boxes[b].redraw();
    		
    	}
    }

    setInterval(step,1000/20);

    function doBox(){

    	if(nSelect != undefined) return;

    	nSelect = $(this).attr('n');
    	boxes[nSelect].isSpinning = false;

    	$(boxes[nSelect].transform).animate({
    		rx:0,
    		ry:0,
    		rz:0,
    		x:0,
    		y:iLevel*W - W/2,
    		altitude:H/2,
    		w:W,
    		h:H,
    		d:W,
    	},{
    		duration:3000,
    		complete:function(){
    			audio.stop('rumble');
    			audio.play('reverse');
    			callbackEnterBox(boxes[nSelect].game.game);
    		}
    	})

    	boxes[nSelect].$el.find('.partycube3D-front partycube3Dsurface').animate({
    		opacity:0
    	},3000);
    	
    	audio.play('rumble');
    }

    let iLevel = 0;

	self.doMoveForward = function(){
		iLevel++;
		$plane.animate({bottom:-iLevel*(W)+'px'},1500);
	}

	self.doCompleteBox = function(){

		$(boxes[nSelect].transform).animate({
    		rx:0,
    		ry:0,
    		rz:0,
    		x:0,
    		y:iLevel*W,
    		altitude:H/2,
    		w:0,
    		h:0,
    		d:0,
    	},{
    		duration:1500,
    		complete:function(){
    			boxes[nSelect].$el.remove();
    			nSelect = undefined;
    			setTimeout(callbackExitBox,500);
    		}
    	})
	}

	self.setPlayers = function(p){

		for(var m in meeps ){
			meeps[m].$el.css({
				'bottom':`${ H/4 + iLevel*W + p[m].z*H/8 }px`,
				'left':`${ p[m].x*W/8 }px`,
			});
		}
	}
	
	//setInterval(doMoveForward,1000);
}

BoxPartyGame = function(){

	const W = 16;
	const H = 10;
	const GRID = 100;

	const GAMES = {
		'Milkers':{
			game:window.MilkGame,
			color:'#40B0ED',
			bg:'url(./proto/img/icon-milk.png) center / cover'},
		'Cookie Cutter':{
			game:window.CookieCutterGame,
			color:'orange',
			bg:'url(./proto/img/party/icon-cookie-cutter.jpg) center / cover'
		},
		'Follicle Frenzy':{
			game:window.FollicleFrenzyGame,
			color:'brown',
			bg:'url(./proto/img/party/bg-barber.jpg) center / cover'
		},
		'Headers':{
			game:window.HeadersGame,
			color:'white',
			bg:'url(./proto/img/party/bg-stadium.jpg) center / cover'
		},
		'Death Maze':{
			game:window.MazeGame,
			color:'white',
			bg:'url(./proto/img/party/bg-mountains.jpg) center / cover'
		},
		'Pump Pop':{
			game:window.PumpPopGame,
			color:'white',
			bg:'url(./proto/img/party/bg-mountains.jpg) center / cover'
		},
	}

	const QUEUE = [
		[ GAMES['Milkers'], GAMES['Pump Pop'] ],
		[ GAMES['Follicle Frenzy'], GAMES['Cookie Cutter'] ],
		[ GAMES['Death Maze'], GAMES['Headers'] ],
	]

	let scale = 1;

	$("head").append(`
        <style>
        	boxpartygame{
        		display: block;
        		width: ${W*GRID*3}px;
        		height: ${H*GRID}px;
        		transform-origin: top left;
        		background: url(./proto/img/party/bg-cosmos.jpg);
                background-size: 100%;
                background-position: center;
                position: relative;
        	}

        	boxpartygame:before{
        		content:"";
        		box-sizing: border-box;
        		position: absolute;
        		top: 0px;
        		left: 0px;
        		right: 0px;
        		bottom: 0px;
        		background: linear-gradient( to bottom, black, transparent, blue, blue );
        	}

        	boxpartymountains{
        		content:"";
        		box-sizing: border-box;
        		position: absolute;
        		top: 0px;
        		left: 0px;
        		right: 0px;
        		bottom: 0px;
        		background: url(./proto/img/party/bg-mountains.png);
        		background-size: 100%;
                background-position: center;
        	}

        	boxpartygame:after{
        		content:"";
        		width: ${W*GRID}px;
        		height: ${H*GRID}px;
        		border-left: 10px dashed black;
        		border-right: 10px dashed black;
        		box-sizing: border-box;
        		position: absolute;
        		top: 0px;
        		left: ${W*GRID}px;
        		pointer-events: none;
        	}
        <style`);

 	let audio = new AudioContext();
    audio.add('music','./proto/audio/party/music-ethereal.mp3',0.5,true,true);
   // audio.add('music','./proto/audio/party/sfx-rumble.mp3',1);

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<boxpartygame>').appendTo(self.$el);
	$('<boxpartymountains>').appendTo($game);
	
	let $minigame = $('<boxpartyminigame>').appendTo(self.$el);

	let scene = new BoxPartyScene3D(QUEUE, doLaunchGame, doExitGame);
	scene.$el.appendTo($game);

	let players = [];
	for(var i=0; i<6; i++) players[i] = {score:0};

	let tally = new PartyTally(players);
	tally.$el.appendTo($game);

	function step(){
		resize();
	}

	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*GRID*3);
		$game.css('transform','scale('+scale+')');
	}

	const FPS = 20;
	setInterval(step,1000/FPS);

	let liveModule = undefined;

	function doLaunchGame(game){
		let p = game;
		liveModule = new p();
		liveModule.$el.appendTo($minigame);
		audio.stop('music');
		scene.$el.hide();

		window.doPartyGameComplete = doCompleteGame;
	}

	let resultsPending;
	function doCompleteGame(results){
		resultsPending = results;
		scene.$el.show();
		liveModule.$el.remove();
		audio.play('music');
		scene.doCompleteBox();
	}

	function doExitGame(){
		doShowTally();
		setTimeout(doPendingResults,2000);
		setTimeout(doResolveResults,4000);
		setTimeout(doHideTally,6000);
		setTimeout(scene.doMoveForward,8000);
	}

	function doPendingResults(){
		tally.showResults(resultsPending);
	}

	function doResolveResults(){
		for(var r in resultsPending) players[r].score += resultsPending[r];
		resultsPending = undefined;
		tally.resolveResults();
	}

	function doShowTally(){
		tally.showRows();
	}

	function doHideTally(){
		tally.hideRows();
	}

	setTimeout(doHideTally,2000);

	function init() {
		audio.play('music');
		$(document).off('click',init);
	}

	audio.play('music');
    $(document).click(init);

    self.setPlayers = function(p){
    	scene.setPlayers(p);
    	if(liveModule) liveModule.setPlayers(p);
	}
}