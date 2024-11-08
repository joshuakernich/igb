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

				border-radius: 20px;
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
	const GRID = W;
	const WCAR = 0.3;
	const LCAR = 0.5;
	const HCAR = 0.1;
	const FLOAT = 5;
	const WROAD = 3;
	
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
				background-size: 100%;
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
				
				animation: frame7;
				animation-duration: 0.5s;
				animation-fill-mode: forwards;
				animation-timing-function: steps(7);
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

			@keyframes frame7{
				0%{
					background-position-x: 0%;
				}

				100%{
					background-position-x: -700%;
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

	
	let $thruster = $('<drivingthruster>').appendTo( $car.find('.box3D-front'));
	let $sparkLeft = $('<drivingspark>').appendTo( $car.find('.box3D-left'));
	let $sparkRight = $('<drivingspark>').appendTo( $car.find('.box3D-right'));
	let $sparkBack = $('<drivingspark>').appendTo( $car.find('.box3D-back'));

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

	sfx.music.volume = 0.5;
	sfx.boost.volume = 0.5;
	sfx.hit.volume = 0.5;
	sfx.scrape.volume = 0;
	sfx.screech.volume = 0;


	$layers = [];

	let cars = [
	]

	let boosts = [
	]

	for(var i=0; i<20; i++){
		boosts[i] = { progress:10+i*20, lane:[0,1,-1][Math.floor(Math.random()*2)]};
		cars[i] = { progress:5+i*15, lane:[0,1,-1][Math.floor(Math.random()*2)], speed:0.5};
	}

	cars.push( { isTarget:true, progress:16, lane:-1, speed:0.95} );
	cars.push( { isTarget:true, progress:26, lane:0, speed:0.95} );
	cars.push( { isTarget:true, progress:36, lane:1, speed:0.95} );

	for(var c in cars){
		let $c = $(`<drivingcar>`).appendTo($plane);
		let $i = $(`<drivingcarinner>`).appendTo($c);
		new Box3D(WCAR*GRID,WCAR*GRID,HCAR*2*GRID,cars[c].isTarget?'white':'black').$el.appendTo($i);

		if( cars[c].isTarget ) $('<drivingmarker>').appendTo( $c );

		cars[c].$el = $c;
	}

	let players = [{px:0}];
	let iTick = 0;
	let speed = 6;
	let steer = 0.2;
	let xCenter = 0;
	let iyTrack = -1;

	const BOOST = 1.5;

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

	while(curve.length<1000){
		addStraight(5+Math.floor(Math.random()*5));
		addSlide(10+Math.floor(Math.random()*5),(Math.random()>0.5?1:-1));

		if(curve[curve.length-1].r > 90) addSlide(10,-1);
		if(curve[curve.length-1].r < -90) addSlide(10,1);
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

	let car = {x:0,y:0,r:0};

	let iProgress = 0;
	let iRender = 0;
	let boosting = 0;
	let bogging = 0;

	function dist(a,b){
		return Math.hypot(b.x-a.x,b.y-a.y);
	}

	let was = new Date().getTime();
	function tick(){

		let now = new Date().getTime();
		let elapsed = (now-was)/1000;
		was = now;

		//elapsed = 0;

		let w = $(document).innerWidth()/3;
		$game.css('transform','scale('+(w/W)+')');

		let txRelative = (players[0].px/100*2-1);

		

		boosting --;
		bogging --;

		let modifier = (bogging > 0)?0.4:(boosting > 0?BOOST:1);

		sfx.screech.volume = Math.abs(txRelative) * (modifier>1?0.2:0.1);

		//modifier = 0;

		car.x += Math.sin(car.r*Math.PI/180)*speed*modifier*elapsed;
		car.y += Math.cos(car.r*Math.PI/180)*speed*modifier*elapsed;

		sfx.idle.volume = (bogging > 0)?0.2:0.3;


		if( dist(car,curve[iProgress]) > dist(car,curve[iProgress+1])) iProgress++;

		
		let d = dist(car,curve[iProgress]);
		let rOffset = Math.atan2(car.x-curve[iProgress].x,car.y-curve[iProgress].y);
		let rRelative = rOffset +-curve[iProgress].r;


		let lane = Math.sin(rRelative)*d;
		let max = (WROAD/2-WCAR/2);

		let r = txRelative*45;
		

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

		
		
		car.r += r*0.02;

		$car.css({
			left: car.x*GRID +'px',
			bottom: car.y*GRID + 'px',
			'transform':'rotateZ('+(car.r+r)+'deg)',
		})

		$sparkBack.css('opacity',bogging>FPS/4?1:0);
		$sparkLeft.css('opacity',tooFarLeft?1:0);
		$sparkRight.css('opacity',tooFarRight?1:0);

		if(tooFarLeft||tooFarRight) sfx.scrape.volume = 0.5;


		if(sfx.scrape.volume>0.1) sfx.scrape.volume -= 0.05;
		else sfx.scrape.volume = 0;


		let cx = Math.sin(car.r*Math.PI/180)*0.25;
		let cy = Math.cos(car.r*Math.PI/180)*0.25;
		
		$thruster.attr('boosting',boosting>0);
	    $camera.css('transform',"rotateY(" + car.r + "deg)");
	   	$plane.css('bottom',-(car.y-cy)*GRID+'px');
	   	$plane.css('left',-(car.x-cx)*GRID+'px');

	   	for(var c in cars){
	   		cars[c].progress += speed*cars[c].speed*elapsed;
	   		cars[c].p = getPosition(cars[c].progress,cars[c].lane);
	   		
	   		cars[c].$el.css({
	   			'left':cars[c].p.x*GRID+'px',
	   			'bottom':cars[c].p.y*GRID+'px',
	   			'transform':'rotate('+(cars[c].p.r*180/Math.PI)+'deg)',
	   		})
	   	}

	   	for(var b in boosts) if(dist(boosts[b].p,car)<0.5) boosting = FPS;
		for(var c in cars) if(dist(cars[c].p,car)<0.3) bogging = FPS/2;
		
		if(boosting == FPS) sfx.boost.play();
		if(bogging == FPS/2) sfx.hit.play();
	}

	self.setPlayers = function(p){
		players = p;
		players.length = 1;
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
	});

	$(document).click(function() {
		sfx.music.play();
		sfx.idle.play();
		sfx.scrape.play();
		sfx.screech.play();
	})
}