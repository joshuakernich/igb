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
				top:${-WCAR/2*GRID}px;
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
				content:".";
				display:inline-block;
				margin-right: 25px;
			}

			drivingcar box3Dside.box3D-front:after{
				content:".";
				line-height:${HCAR*0.7*GRID}px;
				display:inline-block;
				margin-left: 25px;
			}

			drivinglayer{
				
				position:absolute;
				width:0px;
				height:0px;
				transform-style: preserve-3d;
			}

			drivinglayer:after{
				content:"";
				display:block;
				position:absolute;
				width:${GRID*3}px;
				height:${GRID*1.1}px;
				background-image: url(./proto/img/bat-road.png);
				background-size: 100%;
				transform-style: preserve-3d;
				left: ${-GRID*3/2}px;
				bottom: 0px;
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


	$layers = [];

	let cars = [
		{progress:10,lane:-1,speed:0.5},
		{progress:20,lane:1,speed:0.5},
		{progress:30,lane:-1,speed:0.5},
		{progress:40,lane:0,speed:0.5},
	]

	for(var c in cars){
		let $c = $(`<drivingcar>`).appendTo($plane);
		let $i = $(`<drivingcarinner>`).appendTo($c);
		new Box3D(WCAR*GRID,LCAR*GRID,HCAR*GRID,'black').$el.appendTo($i);

		cars[c].$el = $c;
	}


	let players = [{px:0}];
	let iTick = 0;
	let speed = 4/FPS;
	let steer = FPS*0.2;
	let xCenter = 0;

	let iyTrack = -1;

	let curve = [{x:0,y:0,r:0}];

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


	for(var l=0; l<15; l++) $layers[l] = $('<drivinglayer>').appendTo($plane);
	
	

	let car = {x:0,y:0,r:0};

	let iRender = 0;

	function tick(){
		let w = $(document).innerWidth()/3;
		$game.css('transform','scale('+(w/W)+')');

		let txRelative = (players[0].px/100*2-1);


		car.x += Math.sin(car.r*Math.PI/180)*speed;
		car.y += Math.cos(car.r*Math.PI/180)*speed;


		if(iRender<curve.length){
			let dx = curve[iRender].x - car.x;
			let dy = curve[iRender].y - car.y;
			let d = Math.sqrt(dx*dx+dy*dy);

			if(d<12){
				iRender++;
				let n = iRender%$layers.length;
				$layers[n].css({
					'bottom':curve[iRender].y*GRID+'px',
					'left':curve[iRender].x*GRID+'px',
					'transform':'rotate('+curve[iRender].r*180/Math.PI+'deg) skew('+-curve[iRender].skew*180/Math.PI+'deg)',
				});
			}
		}

		let r = txRelative*45;
		car.r += r*0.02;

		$car.css({
			left: car.x*GRID +'px',
			bottom: car.y*GRID + 'px',
			'transform':'rotateZ('+(car.r+r)+'deg)',
		})




		let cx = Math.sin(car.r*Math.PI/180)*0.25;
		let cy = Math.cos(car.r*Math.PI/180)*0.25;
		
	    $camera.css('transform',"rotateY(" + car.r + "deg)");
	   	$plane.css('bottom',-(car.y-cy)*GRID+'px');
	   	$plane.css('left',-(car.x-cx)*GRID+'px');

	   	for(var c in cars){
	   		cars[c].progress += speed*cars[c].speed;

	   		let iSeg = Math.floor( cars[c].progress );
	   		let iNext = iSeg+1;
	   		let leftover = cars[c].progress%1;
	   	
	   		let r = curve[iSeg].r;
	   		let x1 = curve[iSeg].x + Math.sin(Math.PI/2)*cars[c].lane; 
	   		let y1 = curve[iSeg].y + Math.cos(Math.PI/2)*cars[c].lane; 
	   		let x2 = curve[iNext].x + Math.sin(Math.PI/2)*cars[c].lane; 
	   		let y2 = curve[iNext].y + Math.cos(Math.PI/2)*cars[c].lane; 


	   		let x = x1 + (x2-x1)*leftover;
	   		let y = y1 + (y2-y1)*leftover;
	   		

	   		cars[c].$el.css({
	   			'left':x*GRID+'px',
	   			'bottom':y*GRID+'px',
	   			'transform':'rotate('+(r*180/Math.PI)+'deg)',
	   		})
	   	}
		
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

	$game.on('mousemove',function(e){

		players[0].px = e.offsetX/W*100;
	});
}