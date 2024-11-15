Box3D = function(w,l,h,color){

	$("head").append(`
		<style>
			box3D{
				display:block;
				transform-style: preserve-3d;
				
			}

			box3Dside{
				display:block;
				position:absolute;
				box-sizing:border-box;
				transform-style: preserve-3d;
				text-align:center;

				border-radius: 25%;
			}	

			box3Dside.box3D-back{
				transform-origin: bottom center;
				transform:rotateX(-90deg);
				bottom: 100%;
			}

			box3Dside.box3D-front{
				transform-origin: bottom center;
				transform:rotateX(-90deg);
				bottom: 0px;
			}

			box3Dside.box3D-left{
				transform-origin: bottom left;
				transform:rotateX(-90deg) rotateY(-90deg);
				bottom: 100%;
				left: 0px;
			}

			box3Dside.box3D-right{
				transform-origin: bottom right;
				transform:rotateX(-90deg) rotateY(90deg);
				bottom: 100%;
				right: 0px;
			}

		</style>
	`);

	let self = this;

	self.$el = $(`
		<box3D style='width:${w}px;height:${l}px;'>
			<box3Dside class='box3D-bottom' style='background-color:${color};width:${w}px;height:${l}px;'></box3Dside>
			<box3Dside class='box3D-back' style='background-color:${color};width:${w}px;height:${h}px;'></box3Dside> 
			<box3Dside class='box3D-left' style='background-color:${color};width:${l}px;height:${h}px;'></box3Dside>
			<box3Dside class='box3D-right' style='background-color:${color};width:${l}px;height:${h}px;'></box3Dside>
			<box3Dside class='box3D-front' style='background-color:${color};width:${w}px;height:${h}px;'></box3Dside> 
			<box3Dside class='box3D-top' style='background-color:${color};transform:translateZ(${h}px);width:${w}px;height:${l}px;'></box3Dside>
		</box3D>
		`)
}

DrivingGame = function(){

	const FPS = 40;
	const W = 400;
	const H = 250;
	const GRID = 350;
	const WCAR = 0.4;
	const LCAR = 0.5;
	const HCAR = 0.15;
	
	const WROAD = 4;
	const SIGHT = 5;
	const STRAFE = 3;
	const SPEED = 6;
	const MISSILESPEED = 18;
	const BOOST = 1.5;

	const STEER = 35;
	const VISUAL = 50;

	const BOOSTTIME = FPS*1;
	const MISSILETIME = FPS*2;
	
	const PURPLE = '#230B39';

	$("head").append(`
		<style>
			.drivingbg{
				background-image: url(./proto/img/bat-skyline.png);
				background-size: 33.3%;
			}

			drivinggame{
				display:block;
				width:${W}px;
				height:${H}px;
				box-sizing:border-box;
				transform-origin:top left;

				
			}

			drivinggame:before{
				content:"";
				display:block;
				position: absolute;
				top:0px;
				left: 0px;
				bottom: 0px;
				border-left: 1px solid red;
				z-index: 100;
			}

			drivinggame:after{
				content:"";
				display:block;
				position: absolute;
				top:0px;
				right: 0px;
				bottom: 0px;
				border-right: 1px solid red;
				z-index: 100;
			}

			drivingviewport{
				display:block;
				position: absolute;
				top:0px;
				left: 0px;
				perspective:${W}px;
				width:${W}px;
				height:${H}px;

			}

			drivingcamera{
				display:block;
				position: absolute;
				width:${W}px;
				height:${H}px;
				transform-style: preserve-3d;
			}

		
			drivingworld{
				display:block;
				box-sizing:border-box;
				transform-origin:bottom center;
				position:absolute;
				bottom:0px;
				left:50%;
				transform:rotateX(90deg);
				transform-style: preserve-3d;
				z-index:1;
				pointer-events:none;

				width: 0px;
				height: 0px;
			}

			drivingplane{
				display:block;
				transform-origin:bottom center;
				position:absolute;
				bottom:0px;
				left:0px;
				transform-style: preserve-3d;

				background: blue;

				width: 0px;
				height: 0px;
			}

			drivingcar{
				display:block;
				position:absolute;
				left:0px;
				
				width: 0px;
				height: 0px;
				transform-style: preserve-3d;
			}

			drivingcarinner{
				display:block;
				position:absolute;
				left:${-WCAR/2*GRID}px;
				top:${-LCAR/2*GRID}px;
				width:${WCAR*GRID}px;
				height:${LCAR*GRID}px;
				transform: translateZ(5px);
				transform-style: preserve-3d;
				background: black;

				
				
			}

			drivingcar box3D{
				transform: translateZ(10px);
				font-size:70px;
				color:red;
				line-height:${HCAR*0.7*GRID}px;
			}

			drivingcar box3Dside.box3D-front:before{
				content:"";
				display:block;
				position: absolute;

				bottom: 2px;
				left: 2px;
				right: 2px;
				box-sizing: border-box;
				height: 30%;
				border-left: 15px solid red;
				border-right: 15px solid red;
				border-radius: 5px;
			}

			drivingcar box3Dside.box3D-front:after{
				content:"";
				display:block;
				position: absolute;
				top: 2px;
				left: 0px;
				right: 0px;
				box-sizing: border-box;
				width: 30%;
				height: 5px;
				background: red;
				margin: auto;
				border-radius: 100%;
			}

			drivinglayer{
				
				position:absolute;
				width:0px;
				height:0px;
				transform-style: preserve-3d;
				transform-origin: center;
			}

			drivinglayer:after{
				content:"";
				display:block;
				position:absolute;
				width:${GRID*WROAD}px;
				height:${GRID*1.1}px;
				background-image: url(./proto/img/bat-road.png);
				background-size: 75%;
				background-position: center;
				transform-style: preserve-3d;
				left: ${-GRID*WROAD/2}px;
				bottom: 0px;
			}

			drivingboost{
				display:block;
				position:absolute;
				width: 0px;
				height: 0px;



			}

			drivingboost:after{
				content:"";
				display:block;
				width: ${GRID}px;
				height: ${GRID}px;
				position: absolute;
				left: ${-GRID/2}px;
				top: ${-GRID/2}px;
				background: url(./proto/img/bat-boost.png);
				background-position: center;
				background-size: 50%;
				background-repeat: no-repeat;
			}

			drivingthruster{
				width: ${HCAR*0.7*GRID}px;
				height: ${HCAR*0.7*GRID}px;
				position: absolute;
				display: block;
				background: red;
				
				left: 0px;
				right: 0px;
				bottom: 0px;
				margin: auto;
				border-radius: 100%;
				
				border: 5px solid #222;
				box-sizing: border-box;
			}

			drivingthruster[boosting='true']{
				background: yellow;
				border-color: red;
				box-shadow: 0px 0px 10px red;
			}

			drivingspark{
				position: absolute;
				width: 150%;
				height: 250%;
				background: url(./proto/img/explode-white.png);
				background-size: 700%;
				bottom: 0px;
				left: -25%;
				
				animation: frame6;
				animation-duration: 0.5s;
				animation-fill-mode: forwards;
				animation-timing-function: steps(6);
				background-position-x: 0%;

				animation-iteration-count: infinite;

			}

			drivingmarker{
				display: block;
				position: absolute;
				width: ${WCAR*GRID}px;
				height: ${(WCAR*2)*GRID}px;
				background-image: url(./proto/img/bat-arrow.png);
				background-repeat: no-repeat;
				background-size: 80%;
				left: ${-WCAR/2*GRID}px;
				bottom: 0px;
				transform-style: preserve-3d;
				transform-origin: bottom center;
				transform: rotateX(-90deg);

				

			}

			drivingaim{
				display: block;
				position: absolute;
				
				height: ${SIGHT*GRID}px;
				
				position: absolute;
				bottom: 0px;
				left: 0px;
				transform-origin: bottom center;
				
				transform-style: preserve-3d;
			}

			drivingaim:before{
				content:"";
				display: block;
				position: absolute;
				background: rgba(0,0,255,0.5);
				width: ${WCAR/4*GRID}px;
				height: ${SIGHT*GRID}px;
				
				bottom: 0px;
				left: ${-WCAR/8*GRID}px;

				transform: translateZ(${HCAR*GRID}px); 
				transform-style: preserve-3d;

				background: linear-gradient(to bottom, blue, transparent);

				opacity:0;

			}

			drivingaim:after{
				content:"";
				display: block;
				position: absolute;
				width: ${HCAR*2*GRID}px;
				height: ${HCAR*2*GRID}px;
				transform-style: preserve-3d;
				top: ${-HCAR*GRID}px;
				left: ${-HCAR*GRID}px;
				
				transform-style: preserve-3d;
				transform: rotateX(-90deg); 
				
				
				box-sizing: border-box;
				transform-origin: bottom center;

				background: url(./proto/img/bat-reticule-square.png);
				background-size: 100%;

			}

			drivingmissile{
				display: block;
				position: absolute;
				bottom: 0px;
				left: 0px;
				transform-style: preserve-3d;
			}

			

			drivingmissile:before{
				content:"";
				display: block;
				position: absolute;
				width: ${WCAR/4*GRID}px;
				height: ${WCAR/2*GRID}px;
				background: white;
				bottom: 0px;
				left: ${-WCAR/8*GRID}px;
				transform-style: preserve-3d;
				transform: translateZ(${(HCAR+WCAR/8)*GRID}px);
				border-radius: 100% 100% 0px 0px;

				display:none;
			}

			drivingmissile:after{
				content:"";
				display: block;
				position: absolute;
				width: ${WCAR/2*GRID}px;
				height: ${WCAR/2*GRID}px;
				
				bottom: 0px;
				left: ${-WCAR/4*GRID}px;
				transform-style: preserve-3d;
				transform: translateZ(${(HCAR)*GRID}px) rotateX(-90deg);
				
				box-sizing: border-box;
				

				background-image: url(./proto/img/bat-emp.gif);
				background-size: 100%;
			}

			drivingboom{
				position: absolute;
				width: ${GRID}px;
				height: ${GRID/2}px;
				background: url(./proto/img/explode-white.png);
				background-size: 700%;
				bottom: 0px;
				left: ${-GRID/2}px;
				
				animation: frame6;
				animation-duration: 0.5s;
				animation-fill-mode: forwards;
				animation-timing-function: steps(6);
				background-position-x: 0%;

				transform: rotateX(-90deg);
				transform-origin: bottom center;

			}

			drivingwheel, drivinghud{
				position: absolute;
				display: block;
				width: ${W*0.8}px;
				height: ${W*0.8}px;
				left: ${W*0.1}px;
				top: ${H-30}px;
				background: url(./proto/img/bat-steering-wheel.png);
				background-size: 100%;

			}

			drivingwheel{
				opacity: 0.5;
			}

			drivinghud{
				background: none;
			}

			drivingarrow{
				position: absolute;
				display: block;
				width: 100%;
				height: 100%;
				background: url(./proto/img/bat-steering-arrow.png);
				background-size: 100%;
			}

			drivingbtn{
				position: absolute;
				left: 0px;
				right: 0px;
				bottom: 0px;
				top: 0px;
				width: 5vw;
				height: 5vw;
				border: 0.1vw solid white;
				box-sizing: border-box;
				margin: auto;
				z-index: 100;

				background-image: url(./proto/img/bat-emp.gif);
				background-size: 60%;
				background-position: center;
				background-repeat: no-repeat;
			}

			drivingbtn:before{
				content:"TAP TO FIRE EMP";
				position: absolute;
				top: -1vw;
				font-size: 0.5vw;
				line-height: 1vw;
				text-align: center;
				color: white;
				left: 0px;
				right: 0px;
			}

			@keyframes frame6{
				0%{
					background-position-x: 0%;
				}

				100%{
					background-position-x: -600%;
				}
			}

		</style>
	`);

	

	

	let self = this;
	let intTick;

	self.$el = $('<igb class="drivingbg">');

	let $left = $('<igbside>').appendTo(self.$el);
	let $front = $('<igbside>').appendTo(self.$el);
	let $right = $('<igbside>').appendTo(self.$el);

	let $game = $('<drivinggame>').appendTo($front);

	let $viewport = $('<drivingviewport>').appendTo($game);
	let $camera = $('<drivingcamera>').appendTo($viewport);

	let $world = $('<drivingworld>').appendTo($camera);
	let $plane = $('<drivingplane>').appendTo($world);
	

	let $car = $(`<drivingcar>`).appendTo($plane);
	let $i = $(`<drivingcarinner>`).appendTo($car);
	new Box3D(WCAR*GRID,LCAR*GRID,HCAR*GRID,'black').$el.appendTo($i);

	
	$car.find('.box3D-left').css('background','#222');
	$car.find('.box3D-right').css('background','#222');

	let $thruster = $('<drivingthruster>').appendTo( $car.find('.box3D-front'));
	let $sparkLeft = $('<drivingspark>').appendTo( $car.find('.box3D-left'));
	let $sparkRight = $('<drivingspark>').appendTo( $car.find('.box3D-right'));
	let $sparkBack = $('<drivingspark>').appendTo( $car.find('.box3D-back'));
	let $aim = $('<drivingaim>').appendTo( $car );
	let $missile = $('<drivingmissile>').appendTo($plane);

	let $steeringWheel = $('<drivingwheel>');//.appendTo($game);

	$('<drivingbtn>').appendTo($left);
	$('<drivingbtn>').appendTo($right);


	let $hud = $('<drivinghud>').appendTo($game);
	let $arrows = [];
	for(var i=0; i<5; i++){
		//$arrows[i] = $('<drivingarrow>').appendTo($hud).css('transform','rotate('+i*5+'deg)')
		$arrows[i] = $('<drivingarrow>').appendTo($hud).css('left',i*15+'px')
	}

	let sfx = {};

	sfx.music = $(`<audio autoplay loop>
			<source src="./proto/audio/powerful-victory-trailer-103656.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0];

	sfx.idle = $(`<audio autoplay loop>
			<source src="./proto/audio/car-idle.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0];

	sfx.boost = $(`<audio>
			<source src="./proto/audio/car-boost.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0];

	sfx.hit = $(`<audio>
			<source src="./proto/audio/car-hit.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0];

	sfx.scrape = $(`<audio autoplay loop>
			<source src="./proto/audio/car-scrape.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0];

	sfx.screech = $(`<audio autoplay loop>
			<source src="./proto/audio/car-screech.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0];

	sfx.missile = $(`<audio>
			<source src="./proto/audio/car-missile.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0];

	sfx.explode = $(`<audio>
			<source src="./proto/audio/car-explode.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0];

	sfx.music.volume = 0.3;
	sfx.boost.volume = 0.3;
	sfx.hit.volume = 0.3;
	sfx.scrape.volume = 0;
	sfx.screech.volume = 0;


	$layers = [];

	let cars = [
	]

	let boosts = [
	]

	for(var i=0; i<20; i++){
		
		cars[i] = { progress:40+i*15, lane:[0,1,-1][Math.floor(Math.random()*2)], speed:0.5};
	}

	cars.push( { isTarget:true, progress:26, lane:-1, speed:0.95} );
	cars.push( { isTarget:true, progress:36, lane:0, speed:0.95} );
	cars.push( { isTarget:true, progress:46, lane:1, speed:0.95} );


	for(var c in cars){
		let $c = $(`<drivingcar>`).appendTo($plane);
		let $i = $(`<drivingcarinner>`).appendTo($c);
		new Box3D(WCAR*GRID,WCAR*GRID,HCAR*2*GRID,cars[c].isTarget?'white':'black').$el.appendTo($i);

		if( cars[c].isTarget ) $('<drivingmarker>').appendTo( $c );

		cars[c].$el = $c;
	}

	

	let players = [{px:0},{px:0}];
	let iTick = 0;
	let xCenter = 0;
	let iyTrack = -1;

	let curve = [{x:0,y:0,r:0}];

	function getPosition(progress,lane){

		let iSeg = Math.floor( progress );
   		let iNext = iSeg+1;
   		let leftover = progress%1;
   		
   		let x1 = curve[iSeg].x + Math.sin(curve[iSeg].r + Math.PI/2)*lane; 
   		let y1 = curve[iSeg].y + Math.cos(curve[iSeg].r + Math.PI/2)*lane; 

   		if(leftover==0){
   			return {
				x:x1,
				y:y1,
				r:curve[iSeg].r,
			}
   		}

   		let x2 = curve[iNext].x + Math.sin(curve[iNext].r + Math.PI/2)*lane; 
   		let y2 = curve[iNext].y + Math.cos(curve[iNext].r + Math.PI/2)*lane; 

   		let x = x1 + (x2-x1)*leftover;
	   	let y = y1 + (y2-y1)*leftover;

		return {
			x:x,
			y:y,
			r:curve[iSeg].r,
		}
	}

	function add(deg){
		let r = curve[curve.length-1].r;
		let x = curve[curve.length-1].x + Math.sin(r + deg);
		let y = curve[curve.length-1].y + Math.cos(r + deg);

		curve[curve.length-1].skew = deg;

		curve.push({x:x,y:y,r:r+deg,skew:0});
	}

	function addStraight(count) {
		let n = 0;
		while(count--) add(0);
	}

	function addSlide(count,dir) {
		while(count--) add(0.05*dir);
	}

	function shuffle(array) {
	  let currentIndex = array.length;

	  // While there remain elements to shuffle...
	  while (currentIndex != 0) {

	    // Pick a remaining element...
	    let randomIndex = Math.floor(Math.random() * currentIndex);
	    currentIndex--;

	    // And swap it with the current element.
	    [array[currentIndex], array[randomIndex]] = [
	      array[randomIndex], array[currentIndex]];
	  }

	  return array;
	}

	while(curve.length<1000){

		let lanes = shuffle([-1,0,1]);

		boosts.push({ progress:curve.length+10, lane:lanes.pop() });
		boosts.push({ progress:curve.length+25, lane:lanes.pop() });
		boosts.push({ progress:curve.length+40, lane:lanes.pop() });

		addStraight(50);

		addSlide(20,(Math.random()>0.5?1:-1));
	}


	for(var l=0; l<10; l++) $layers[l] = $('<drivinglayer>').appendTo($plane);
	
	for(var b in boosts){

		boosts[b].p = getPosition(boosts[b].progress,boosts[b].lane);

		boosts[b].$el = $(`<drivingboost>`).appendTo($plane).css({
			left:boosts[b].p.x*GRID+'px',
			bottom:boosts[b].p.y*GRID+'px',
			transform:'rotate('+boosts[b].p.r*180/Math.PI+'deg)',
		})
	}

	let car = {x:0,y:1,r:0};

	let iProgress = 0;
	let iRender = 0;
	let boosting = 0;
	let bogging = 0;
	let missile = {};

	

	function dist(a,b){
		return Math.hypot(b.x-a.x,b.y-a.y);
	}

	let was = new Date().getTime();
	function tick(){

		let now = new Date().getTime();
		let elapsed = (now-was)/1000;
		was = now;

		

		let w = $(document).innerWidth()/3;
		$game.css('transform','scale('+(w/W)+')');

		let txRelative = (players[0].px/100*2-1);

		//elapsed = 0;

		boosting --;
		bogging --;

		let modifier = (bogging > 0)?0.4:(boosting > 0?BOOST:1);

		sfx.screech.volume = Math.abs(txRelative) * (modifier>1?0.2:0.1);

		let forward = {
			x:Math.sin(car.r*Math.PI/180)*SPEED*modifier*elapsed,
			y:Math.cos(car.r*Math.PI/180)*SPEED*modifier*elapsed
		}

		let oxStrafe = txRelative*STRAFE;



		let strafe = {
			x:Math.sin(car.r*Math.PI/180+90)*oxStrafe*modifier*elapsed,
			y:Math.cos(car.r*Math.PI/180+90)*oxStrafe*modifier*elapsed
		}
		
		car.x += forward.x + strafe.x;
		car.y += forward.y + strafe.y;

		sfx.idle.volume = (bogging > 0)?0.2:0.3;

		if( dist(car,curve[iProgress]) > dist(car,curve[iProgress+1])) iProgress++;

		
		let d = dist(car,curve[iProgress]);
		let rOffset = Math.atan2(car.x-curve[iProgress].x,car.y-curve[iProgress].y);
		let rRelative = rOffset +-curve[iProgress].r;


		let lane = Math.sin(rRelative)*d;
		let max = (WROAD/2-WCAR/2);

		let r = STEER*txRelative;
		let rVisual = VISUAL*txRelative;

		let rAmt = Math.abs(txRelative);
		$hud.css('transform','scaleX('+(txRelative>0?1:-1)+')')
		for(var a=0; a<$arrows.length; a++) $arrows[a].css('opacity',(rAmt > (a+1)/($arrows.length+2))?1:0);
		

		let tooFarLeft = (lane<-max);
		let tooFarRight = (lane>max);

		if(tooFarLeft || tooFarRight){
			
			//car.r = curve[iProgress].r;
			car.x = curve[iProgress].x + Math.sin(rOffset)*max;
			car.y = curve[iProgress].y + Math.cos(rOffset)*max;

			if(tooFarLeft && r<0 ) r = 0;
			if(tooFarRight && r>0 ) r = 0;
		}



		while(iRender < (iProgress + $layers.length-2)){
			iRender++;
			let n = iRender%$layers.length;
			$layers[n].css({
				'bottom':curve[iRender].y*GRID+'px',
				'left':curve[iRender].x*GRID+'px',
				'transform':'rotate('+curve[iRender].r*180/Math.PI+'deg) skew('+-curve[iRender].skew*180/Math.PI+'deg)',
			});
		}

		
		
		car.r += elapsed*r;

		$car.css({
			left: car.x*GRID +'px',
			bottom: car.y*GRID + 'px',
			'transform':'rotateZ('+(car.r + rVisual)+'deg)',
		})

		$sparkBack.css('opacity',bogging>FPS/4?1:0);
		$sparkLeft.css('opacity',tooFarLeft?1:0);
		$sparkRight.css('opacity',tooFarRight?1:0);

		if(tooFarLeft||tooFarRight) sfx.scrape.volume = 0.5;


		if(sfx.scrape.volume>0.1) sfx.scrape.volume -= 0.05;
		else sfx.scrape.volume = 0;


		let cameraDistance = 0.5;
		let cx = Math.sin(car.r*Math.PI/180)*cameraDistance;
		let cy = Math.cos(car.r*Math.PI/180)*cameraDistance;
		
		let pxTracking = txRelative*W/3;

		$thruster.attr('boosting',boosting>0);
	    $camera.css('transform',"rotateY(" + car.r + "deg)");
	    $camera.css('left',pxTracking+'px');
	   	$plane.css('bottom',-(car.y-cy)*GRID+'px');
	   	$plane.css('left',-(car.x-cx)*GRID+'px');
	  	

	   	for(var c in cars){
	   		cars[c].progress += SPEED*cars[c].speed*elapsed;
	   		cars[c].p = getPosition(cars[c].progress,cars[c].lane);
	   		
	   		cars[c].$el.css({
	   			'left':cars[c].p.x*GRID+'px',
	   			'bottom':cars[c].p.y*GRID+'px',
	   			'transform':'rotate('+((cars[c].p.r)*180/Math.PI)+'deg)',
	   		})
	   	}

	   	for(var b in boosts) if(dist(boosts[b].p,car)<0.5) boosting = BOOSTTIME;
		for(var c in cars){

			let d = dist(cars[c].p,car);

			if(d<WCAR) bogging = FPS/2;
		}
		
		if(boosting == FPS) sfx.boost.play();
		if(bogging == FPS/2) sfx.hit.play();


		if(missile.flying > 0 && missile.flying < MISSILETIME ){
			
			missile.x += Math.sin(missile.r*Math.PI/180)*MISSILESPEED*elapsed;
			missile.y += Math.cos(missile.r*Math.PI/180)*MISSILESPEED*elapsed;

			for(var c=0; c<cars.length; c++){
				if(dist(missile,cars[c].p)<0.3){
					missile.flying = 0;
					goBoom(cars[c]);
					cars.splice(c,1);
					c--;
				}
			}

		} else{
			missile.x = car.x;
			missile.y = car.y;
			missile.r = car.r + r;
		}

		missile.flying--;


		$aim.css('transform',"rotateZ(" + (-r*0.5)  + "deg)");
		$missile.css({
			opacity: (missile.flying>0)?1:0,
			left: missile.x*GRID+'px',
			bottom: missile.y*GRID+'px',
			transform: "rotateZ("+missile.r+"deg)",
		})

		$steeringWheel.css('transform','rotate('+r+'deg)');
	}

	self.setPlayers = function(p){
		players = p;
		players.length = 2;
	}

	self.turnOnOff = function(b){
		clearInterval(intTick);
		if(b) intTick = setInterval(tick,1000/FPS);
	}

	self.turnOnOff(true);

	$(document).on('mousemove',function(e){

		let w = $(document).innerWidth()/3;
		let x = (e.pageX - w)/w*100;
		if(x>100) x = 100;
		if(x<0) x = 0;

		players[0].px = x;
		players[1].px = x;
	});

	$(document).click(function() {
		sfx.music.play();
		sfx.idle.play();
		sfx.scrape.play();
		sfx.screech.play();

		missile.flying = MISSILETIME;
		sfx.missile.play();
		sfx.missile.currentTime = 0;
	})

	function goBoom(car){

		let x = 0;
		let y = 0;
		let boom = {progress:0};

		car.$el.empty();
		$('<drivingboom>').appendTo(car.$el);

		sfx.explode.play();

		
	}
}