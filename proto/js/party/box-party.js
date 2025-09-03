

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
                       
        </partycube3D>
        `)

   

    self.reskin = function(color,surfaces){
    	self.$el.html(`
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
            `)
    	self.$el.find('partycube3Dsurface').css({'border-color':color});
    }

    self.reskin(color,surfaces);

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

BoxPartyCube = function(nCube,transform,game){

	let self = this;

	self.game = game;
	self.transform = transform;
	self.transformCache = {};
	for(var t in self.transform) self.transformCache[t] = self.transform[t];
	self.$el = $('<boxpartycube>');
	self.openX = 0;
	self.openY = 0;

	let shadow = $('<boxpartyshadow>').appendTo(self.$el).css({
		width: transform.w + 'px',
		height: transform.d + 'px',
	})

	let palette = ['#37CCDA','#8DE968','#FEE955','#FEB850','#FD797B'];

	let color = palette[nCube%palette.length];

	let box = new PartyCube3D(transform,'white',[
		color,
		color,
		color,
		color,
		color,
		color,
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
			<boxeye></boxeye>
			<boxmouth></boxmouth>

		</boxface>
		`).appendTo(box.$el.find('.partycube3D-front partycube3Dsurface'));

	

	self.redraw = function(){

		self.$el.css({
			transform:`
			translateX(${transform.x}px) 
			translateY(${-transform.y}px) 
			translateZ(1px) 
			rotateX(${transform.rx}deg)
			rotateY(${transform.ry}deg)
			rotateZ(${transform.rz}deg)`
		});

		self.$el.find('boxmouth').css({
			top: 100 - 100*self.openY + '%',
			left: 50 - 50*self.openX + '%',
			right: 50 - 50*self.openX + '%',
		})

		self.$el.find('boxeye').eq(0).css({
			top: 40 - self.openY/2 * 40 + '%',
			left: 20 - self.openX * 20 + '%',
		})

		self.$el.find('boxeye').eq(1).css({
			top: 40 - self.openY/2 * 40 + '%',
			right: 20 - self.openX * 20 + '%',
		})

		box.redraw(); 
	}

	self.showGameSkin = function(showFace=false){
		box.reskin(game.color,[
			game.bg,
			game.bg,
			game.bg,
			game.bg,
			game.color,
			game.color,
		])
		$face.appendTo(box.$el.find('.partycube3D-front partycube3Dsurface'));
		$('<boxheader>').appendTo(box.$el.find('.partycube3D-front partycube3Dsurface')).text(game.name);

		if(!showFace) $face.find('boxeye').hide();
	}

	let audio = new AudioContext();
    audio.add('reveal','./proto/audio/riddler-perfect.mp3',1);
    audio.add('rumble','./proto/audio/party/sfx-rumble.mp3',1,true);

	self.revealGame = function( ){

		audio.play('rumble',true);
		$(self.transform).animate({
			altitude: self.transform.altitude + 150,
			w: 100,
			h: 100, 
			d: 100,
			rz: 540,
		},2500 + Math.random()*500).animate({
			w: self.transform.w,
			h: self.transform.h,
			d: self.transform.d,
			rz: 720 + self.transform.rz,
		},{
			duration: 500,
			start:function(){
				audio.stop('rumble');
				audio.play('reveal',true);
				self.showGameSkin();

			},complete:function(){
				self.transform.rz = self.transformCache.rz;
			}
		})

		
	}
}

BoxPartyScene3D = function(queue, callbackShowOverlay, callbackEnterBox, callbackExitBox){
    
	let audio = new AudioContext();
    audio.add('rumble','./proto/audio/party/sfx-rumble.mp3',1);
    audio.add('reverse','./proto/audio/fight-reverse.mp3',1);

    const W = 1600;
    const H = 1000;
    const PERSTOP = W*2;
    const TRACK = PERSTOP*queue.length;
    const BOXSIZE = W/6;

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

    			background: url(./proto/img/party/bg-cosmos.jpg);
                background-size: 100%;
                background-position: center;
            }

    		partyScene3D:before{
        		content:"";
        		box-sizing: border-box;
        		position: absolute;
        		inset: 0px;
        		background: linear-gradient( to bottom, black, transparent, blue, blue );
        	}

    		boxpartymountains{
        		content:"";
        		box-sizing: border-box;
        		position: absolute;
        		inset: 0px;
        		background: url(./proto/img/party/bg-mountains.png);
        		background-size: 100%;
                background-position: center;
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
				display: none;
            }
           
           partyScene3D partycube3DSurface:after{
            	content: "";
            	display: block;
            	position: absolute;
        		inset: 0px;
            	background: url(./proto/img/party/bg-cosmic-swirl.gif);
            	background-size: cover;
            	mix-blend-mode: overlay;
            	opacity: 0.2;
            	display: none;
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
				pointer-events: auto;
            }

            boxheader{
            	position: absolute;
            	left: -50px;
            	right: -50px;
            	bottom: 110%;
            	font-size: 50px;
            	color: white;
            	
            }

            boxface{
            	display: block;
            	position: absolute;
        		inset: 0px;
            }

            boxeye{
            	display: block;
            	width: 15%;
            	height: 10%;
            	
            	background: white;
            	border-radius: 0px 0px 100% 100%;
            	box-shadow: 0px 0px 40px 5px black;

            	position: absolute;
            	top: 15%;
            }

            boxeye:first-of-type{
            	transform: rotate(15deg);
            	left: 15%;
            }

            boxeye:last-of-type{
            	transform: rotate(-15deg);
            	right: 15%;
            }

            boxmouth{
            	display: block;
            	background: white;
            	position: absolute;
            	left: 45%;
            	right: 45%;
            	top: 100%;
            	bottom: 0px;
            	box-shadow: 0px 0px 40px 10px white;
            }

            partyPlane3D svg{
            
            	position: absolute;
            	bottom: 0px;
            	transform-origin: bottom center;
            	opacity: 0.2;
            	
            }

            partyPlane3D path{
            	
            }

    		boxpartypop{
    			display: block;
				position: absolute;
    			
    		}

    		boxpartysmoke{
    			display: block;
				position: absolute;
				background: white;
				border-radius: 100%;
				transform: translate(-50%, -50%);
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

    $('<boxpartymountains>').appendTo(self.$el);

    let $world = $('<partyWorld3D>').appendTo(self.$el);
    let $plane = $('<partyPlane3D>').appendTo($world);
    let $trackSVG = $(`
    	<svg vector-effect="non-scaling-stroke" preserveAspectRatio=none width=${W*4/queue.length}px height=${PERSTOP}px viewBox='${-W*2} 0 ${W*4} ${TRACK}'>
    		<path stroke-linejoin="round" vector-effect="non-scaling-stroke" stroke='white' stroke-width=${W/30} fill='none' d='M${-W/2},0 L${W/2},${TRACK}'/>
    	</svg>`).appendTo($plane).css({
    		'transform':'translate(-50%) scale('+queue.length+')'
    	})

    let stops = [];
    let boxes = [];
    let nCube = 0;
    let d = '';
    for(var i=0; i<queue.length; i++){
    	let spacingX = W/4;
    	let spacingRZ = 50/(queue[i].length-1);
    	let size = BOXSIZE;

    	if(queue[i].length==1) spacingRZ = 0;

    	let xOffset = (W/4 + Math.random()*W/4) * (i%2?1:-1);
    	let yOffset = W*2 + i*PERSTOP;
    	if(i==0){
    		xOffset = 0;
    		d = d + ' M'+xOffset + ',' + (TRACK);
    	}

    	d = d + ' L'+xOffset + ',' + (TRACK-yOffset+W/2);
    	d = d + ' L'+xOffset + ',' + (TRACK-yOffset-W/2);

    	stops[i] = {x:xOffset,y:yOffset};

		for(var n=0; n<queue[i].length; n++){

			let transform = {
				w:size,h:size,d:size,
				x:xOffset - (spacingX * (queue[i].length-1)/2) + spacingX * n,
				y:yOffset + (n%2)*spacingX,
				altitude:size/2 + 50 + Math.random() * H/12,
				rx:0,
				ry:0,
				rz:-25 + n*spacingRZ,
				open: 0,
			}

			if(i==queue.length-1){
	    		transform.x = xOffset;
	    		transform.w = transform.h = transform.d = W/2;
	    		transform.altitude = W/2;
	    		transform.rz = 10;
	    	}

    		let box = new BoxPartyCube(nCube++,transform,queue[i][n]);
   			box.$el.appendTo($plane);
   			box.iLevel = i;
   			box.nBox = n;
   			
   			box.$el.click(doBox);
   			box.isSpinning = true;

   			let nBox = boxes.push(box)-1;
   			box.$el.attr('n',nBox);
   		}
    }

   	boxes[boxes.length-1].showGameSkin(true);

    for(var i=0; i<5; i++){
    	let transform = {
			w:BOXSIZE,h:BOXSIZE,d:BOXSIZE,
			x: (W + Math.random() * W) * (i%2?-1:1),
			y: (i+3) * W*2,
			altitude: H/6 + Math.random() * H/2,
			rx:0,
			ry:0,
			rz:(i%2?-1:1) * 30,
			open: 0,
		}

		let box = new BoxPartyCube(nCube++,transform,undefined);
   		box.$el.appendTo($plane);	
   		box.redraw();
    }

    $trackSVG.find('path').attr('d',d);

    let meeps = [];
    self.initMeeps = function(count){
    	for(var i=0; i<count; i++){
	    	let meep = new PartyMeep(i);
	    	meep.setHeight(350);
	    	meep.$el.appendTo($plane);
	    	meep.$el.css({
	    		'transform':'rotateX(-90deg) scale(0.5)',
	    	});

	    	meeps[i] = meep;
	    }
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
    		//$trackSVG.html( $trackSVG.html() );
    		
    	}
    }

    setInterval(step,1000/30);

    function doBox(){

    	if(nSelect != undefined) return;

    	let nTry = $(this).attr('n');

    	if(boxes[nTry].iLevel > iLevel) return;

    	nSelect = nTry;
    	boxes[nSelect].isSpinning = false;

    	$(boxes[nSelect]).animate({
    		openX: 0.1,
    		openY: 0.4,
    	},500).animate({
    		openX:1,
    		openY:1,
    	},2500)

    	$(boxes[nSelect].transform).delay(500).animate({
    		rx:0,
    		ry:0,
    		rz:0,
    		x:stops[iLevel].x,
    		y:stops[iLevel].y,
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

    	setTimeout(callbackShowOverlay,2000);

    	/*boxes[nSelect].$el.find('.partycube3D-front partycube3Dsurface').animate({
    		opacity:0
    	},3000);*/
    	
    	audio.play('rumble');
    }

    let iLevel = -1;

	/*self.doMoveForward = function(){
		iLevel++;

		let stop = stops[iLevel];

		audio.play('rumble',true);
		$plane.animate({
			left: -stop.x + 'px',
			bottom:-stop.y+W/2+'px',
		},{
			duration:1500,
			complete:function(){
				audio.stop('rumble');
			}
		});

		// arrange previous boxes
		for(var b in boxes){
			if(iLevel > boxes[b].iLevel){
				$(boxes[b].transform).animate({
					x: (boxes[b].nBox == 0?-W:W),
					y:  (boxes[b].iLevel+1) * (W*2) + W/4 - ((boxes[b].nBox>1)?W/3:0),
				},1500);
			}
		}
	}*/

	self.doFlyover = function(){

		audio.play('rumble',true);

		let stopEnd = stops[stops.length-1];
		let stopStart = stops[0];

		$plane.css({
			left: -stopEnd.x + 'px',
			bottom:-stopEnd.y+W+'px',
		}).animate({
			left: -stopStart.x + 'px',
			bottom:-stopStart.y+W+'px',
		},{
			duration:10000,
			complete:function(){
				audio.stop('rumble');
			}
		});
	}

	self.doNextLocation = function(){
		iLevel++;
		self.anchorPlayer.x = stops[iLevel].x;
		self.anchorPlayer.y = stops[iLevel].y - W * 0.2;
	}

	self.doWalkForward = function(){
		iLevel++;
		let stop = stops[iLevel];
		$(self.anchorPlayer).animate({
			x:stop.x,
			y:stop.y - W * 0.2,
		},2000);
	}

	self.doActivateStop = function(){
		$plane.css({
			'transition':'all 1s',
			'transform':'translateZ('+0+'px)',
		});

		setTimeout(function(){
			$plane.css({
				'transform':'translateZ('+H/4+'px)',
				left:-stops[iLevel].x+'px',
				bottom:-stops[iLevel].y+'px',
			})
		},50);

		setTimeout(function(){
			$plane.css({
			'transition':'none',
		});
		},1200)

		setTimeout(function(){
			for(var b in boxes) if(boxes[b].iLevel == iLevel) boxes[b].revealGame();
		},1200)
	}

	self.doDeactivateStop = function(){
		$plane.css({
			'transition':'all 1s',
		});

		setTimeout(function(){
			$plane.css({
				'transform':'translateZ('+0+'px)',
				left:-stops[iLevel].x+'px',
				bottom:-stops[iLevel].y+W+'px',
			})
		},50);

		setTimeout(function(){
			$plane.css({
			'transition':'none',
		});
		},1200)
	}

	//setInterval(self.doMoveForward,3000);

	self.doCompleteBox = function(){

		boxes[nSelect].isComplete = true;

		boxes[nSelect].transformCache.w = 0;
		boxes[nSelect].transformCache.h = 0;
		boxes[nSelect].transformCache.d = 0;

		$(boxes[nSelect].transform).animate(boxes[nSelect].transformCache,{
    		duration:1500,
    		complete:function(){
    			boxes[nSelect].$el.remove();
    			nSelect = undefined;
    			pop();
    			setTimeout(callbackExitBox,500);
    		}
    	})
	}

	const EXPLOSION = 200;
	function pop(){
		let $pop = $('<boxpartypop>')
		for(var i=0; i<6; i++){
			let size = 20 + Math.random() * 20;
			let r = Math.random() * Math.PI*2;
			$('<boxpartysmoke>').appendTo($pop).css({
				width: size + 'px',
				height: size + 'px',
				left: Math.cos(r) * EXPLOSION/2 * Math.random(),
				top: Math.sin(r) * EXPLOSION/2 * Math.random(),
			}).animate({
				left: Math.cos(r) * (EXPLOSION*1.5)/2,
				top: Math.sin(r) * (EXPLOSION*1.5)/2,
				width: (size*2) + 'px',
				height: (size*2) + 'px',
			},200 + Math.random()*100).animate({
				left: Math.cos(r) * (EXPLOSION*2)/2,
				top: Math.sin(r) * (EXPLOSION*2)/2,
				width: (size) + 'px',
				height: (size) + 'px',
				opacity: 0,
			},1000)
		}
	}

	self.anchorPlayer = {x:0,y:W};

	self.setPlayers = function(p){

		for(var m in meeps ){
			meeps[m].$el.css({
				'left':`${ self.anchorPlayer.x + p[m].x*W/8 }px`,
				'bottom':`${ self.anchorPlayer.y + p[m].z*W/8 }px`,
			});
		}
	}

	self.getLevelComplete = function(){
		let isLevelComplete = true;
		for(let b in boxes){
			if(boxes[b].iLevel == iLevel && !boxes[b].isComplete) isLevelComplete = false;
		}
		return isLevelComplete;
	}
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
			bg:'url(./proto/img/party/icon-follicle.png) center / cover'
		},
		'Headers':{
			game:window.HeadersGame,
			color:'white',
			bg:'url(./proto/img/party/icon-headers-lite.png) center / cover'
		},
		'Death Maze':{
			game:window.MazeGame,
			color:'white',
			bg:'url(./proto/img/party/icon-maze.png) center / cover'
		},
		'Pump Pop':{
			game:window.PumpPopGame,
			color:'white',
			bg:'url(./proto/img/party/icon-pump.png) center / cover'
		},
		'Coin Chaos':{
			game:window.CoinChaosGame,
			color:'white',
			bg:'url(./proto/img/party/icon-coin-chaos.png) center / cover'
		},
		'Spot The Meep':{
			game:window.SpotTheMeepGame,
			color:'white',
			bg:'url(./proto/img/party/icon-spot.png) center / cover'
		},
		'Drum Beats':{
			game:window.DrumBeatsGame,
			color:'white',
			bg:'url(./proto/img/party/icon-drum.png) center / cover',
		},
		'Final Frenzy':{
			game:window.FinalFrenzyGame,
			color:'white',
			bg:'url(./proto/img/party/bg-cosmos.jpg) center / cover',
		},
		
	}

	for(var g in GAMES) GAMES[g].name = g;

	const QUEUE = [
		[ GAMES['Spot The Meep'], GAMES['Drum Beats'] ],
		[ GAMES['Headers'], GAMES['Pump Pop'] ],
		[ GAMES['Milkers']/*, GAMES['Follicle Frenzy']*/  ],
		[ GAMES['Coin Chaos'] ],
		[ GAMES['Death Maze'], GAMES['Cookie Cutter'] ],
		[ GAMES['Final Frenzy'] ],
	]

	let scale = 1;

	$("head").append(`
        <style>
        	@import url('https://fonts.googleapis.com/css2?family=Paytone+One&display=swap');

        	boxpartygame{
        		display: block;
        		width: ${W*GRID*3}px;
        		height: ${H*GRID}px;
        		transform-origin: top left;
        		
                position: relative;
                font-family: "Paytone One";
				pointer-events: none;
        	}

        	boxpartyoverlay{
        		position: absolute;
        		inset: 0px;
        		background: white;
        		display: block;
        		opacity: 0;
        		pointer-events: none;
        	}

			boxpartyminigame{
				display: block;
				position: absolute;
				inset: 0px;
			}



        <style`);

 	let audio = new AudioContext();
    audio.add('music','./proto/audio/party/music-adventure.mp3',0.5,true,true);
   // audio.add('music','./proto/audio/party/sfx-rumble.mp3',1);

	let self = this;
	self.$el = $('<igb>');

	let $minigame = $('<boxpartyminigame>').appendTo(self.$el);

	let $game = $('<boxpartygame>').appendTo(self.$el);
	
	
	let scene = new BoxPartyScene3D(QUEUE, doShowOverlay, doLaunchGame, doExitGame);
	scene.$el.appendTo($game);

	
	let $overlay = $('<boxpartyoverlay>').appendTo(self.$el);

	let players = [];

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

	function doShowOverlay(){
		$overlay.animate({opacity:1},1000);
	}

	function doLaunchGame(game){
		let p = game;
		liveModule = new p();
		liveModule.$el.appendTo($minigame);
		audio.stop('music');
		scene.$el.hide();

		window.doPartyGameComplete = doCompleteGame;

		$overlay.css({opacity:1}).animate({opacity:0});
	}

	let resultsPending;
	function doCompleteGame(results){
		
		if(liveModule.fini) liveModule.fini();

		resultsPending = results;
		scene.$el.show();
		liveModule.$el.remove();
		audio.play('music');
		scene.doCompleteBox();

		liveModule = undefined;
		window.doPartyGameComplete = undefined;
	}

	function doExitGame(){
		doShowTally();
		setTimeout(doPendingResults,2000);
		setTimeout(doResolveResults,4000);
		setTimeout(doHideTally,6000);

		let isLevelComplete = scene.getLevelComplete();
	
		isLevelComplete = true;

		if(isLevelComplete){
			setTimeout(scene.doDeactivateStop,8000);
			setTimeout(scene.doWalkForward,10000);
			setTimeout(scene.doActivateStop,12000);
		}
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

	let tally;
	function initGame(count){
		audio.play('music');

		for(var i=0; i<count; i++) players[i] = {score:0};

		tally = new PartyTally(players);
		tally.$el.appendTo($game);

		scene.initMeeps(count);

		scene.doFlyover();
		setTimeout(doShowTally,10000);
		setTimeout(doHideTally,13000);
		setTimeout(scene.doWalkForward,14000);
		setTimeout(scene.doActivateStop,16000);
	}

	function doSkipLocation() {
		scene.doNextLocation();
		scene.doActivateStop();
	}

	function doSkipMinigame() {
		if(liveModule) doCompleteGame([]);
	}

    let hud = new PartyHUD('#7538D4',0);
	hud.$el.find('partyhudframe').hide();
    hud.$el.appendTo($game);
    hud.initPlayerCount(initGame);

    hud.addDebug('SKIP LOCATION',doSkipLocation);
    hud.addDebug('SKIP MINIGAME',doSkipMinigame);

    self.setPlayers = function(p){
    	scene.setPlayers(p);
    	if(liveModule) liveModule.setPlayers(p);
	}
}