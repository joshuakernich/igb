BoxPartyCube = function(w,h,d){

	let self = this;
	self.$el = $('<boxpartycube>');

	let shadow = $('<boxpartyshadow>').appendTo(self.$el).css({
		width: w + 'px',
		height: d + 'px',
	})

	let z = h + Math.random()*h*2;
	let rx = -10 + Math.random()*20;

	let box = new Room3D(w,h,d,'rgba(0,0,0,0.5)');
	box.$el.appendTo(self.$el);
	box.$el.css({
		'top':'0px',
		'left':'0px',
		'transform':'translateZ('+z+'px) rotateX('+rx+'deg)'
	});
	box.$el.appendTo(self.$el);
}

BoxPartyScene3D = function(doInBox){
    
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

            partyWorld3D:before{
            	content: "";
            	background: purple;
            	width: ${W}px;
        	 	position: absolute;
        	 	left: -${W/2}px;
        	 	height: ${TRACK}px;
                bottom: 0px;
                display: block;

				transform-style:preserve-3d;
            }

            
            partyScene3D room3dSurface{
            	border: 10px solid #ffdd00;
            	box-sizing: border-box;
            }

            partyScene3D room3d[n='1'] room3dSurface{
            	border-color: hotpink;
            }

             partyScene3D room3d[n='2'] room3dSurface{
            	border-color: cyan;
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

    let boxes = [];
    for(var i=0; i<50; i++){
    		let box = new BoxPartyCube(W/6,W/6,W/6);
    		box.x = -W/4 + i%2*W/2;
    		box.y = W/4 + i*W;
    		box.z = 0;
    		box.ry = 0;
    		box.rz = -25 + i%2*50;
   			box.$el.appendTo($world);
   			box.$el.attr('n',i);
   			box.$el.click(doBox);
   			box.isSpinning = true;

   			boxes[i] = box;
    }

    let n = 0;
    function step(){
    	n++;
    	for(var b in boxes ){

    		if( boxes[b].isSpinning ){
    			let dir = b%2?1:-1;
    		
    			//boxes[b].ry = n*dir;
    			//boxes[b].rz = n*0.5;
    		} else {
    			boxes[b].ry *= 0.9;
    			boxes[b].rz *= 0.9;
    			boxes[b].x *= 0.9;
    			boxes[b].y *= 0.9;
    		
    			if(boxes[b].y < W*0.01 && !isInBox){
    				isInBox = true;

    				audio.stop('rumble');
    				audio.play('reverse');
    				doInBox();
    			}
    		}

    		boxes[b].$el.css({
    			transform:'translateX('+boxes[b].x+'px) translateY('+(-boxes[b].y)+'px) translateZ('+boxes[b].z+'px) rotateY('+boxes[b].ry+'deg) rotateZ('+boxes[b].rz+'deg)'
    		});
    	}
    }

    setInterval(step,1000/20);

    function doBox(){
    	let n = $(this).attr('n');
    	boxes[n].isSpinning = false;
    	//boxes[n].$el.appendTo($world);
    	
    	audio.play('rumble');
    }
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
        		background: linear-gradient( to bottom, black, blue );
        		background-size: 100%;
        		background-position: 80% 0%;
        	}
        <style`);

 	let audio = new AudioContext();
    audio.add('music','./proto/audio/party/music-ethereal.mp3',0.5,true,true);
   // audio.add('music','./proto/audio/party/sfx-rumble.mp3',1);

	let self = this;
	self.$el = $('<igb>');
	let $game = $('<boxpartygame>').appendTo(self.$el);
	let $minigame = $('<boxpartyminigame>').appendTo(self.$el);

	let scene = new BoxPartyScene3D(doLaunchGame);
	scene.$el.appendTo($game);

	setInterval(function(){
		let w = $(document).innerWidth();
		scale = w/(W*GRID*3);
		$game.css('transform','scale('+scale+')');
	},50)

	function doLaunchGame(){
		let p = MilkGame;
		let liveModule = new p();
		liveModule.$el.appendTo($minigame);
		audio.stop('music');
	}

    $(document).click(function(){
    	audio.play('music');
    	$(document).off();
    })
}