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

				border: 1px solid white;
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

	const FPS = 30;
	const W = 400;
	const H = 250;
	const GRID = W;
	const WCAR = 0.25;
	const LCAR = 0.35;
	const HCAR = 0.1;
	const FLOAT = 5;
	
	const PURPLE = '#230B39';

	$("head").append(`
		<style>
			drivinggame{
				display:block;
				width:${W}px;
				height:${H}px;
				box-sizing:border-box;
				transform-origin:top left;
				perspective:${W}px;
				background: black;
			}

			drivinggame:before{
				content:"";
				width:1px;
				height:100%;
				background:red;
				position:absolute;
				left:0px;
				top:0px;
				display:block;
				z-index: 100;
			}

			drivinggame:after{
				content:"";
				width:1px;
				height:100%;
				background:red;
				position:absolute;
				right:0px;
				top:0px;
				display:block;
				z-index: 100;
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
				background: red;

				
				
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
				display:block;
				position:absolute;
				width:${GRID*3}px;
				height:${GRID}px;
				
				background-image: url(./proto/img/bat-road.png);
				background-size: 100%;
				transform-style: preserve-3d;
			
				left: 0px;
			}


		</style>
	`);

	

	let cars = [
		{x:2.25,y:5},	
		{x:2.75,y:10},	
		{x:2.25,y:15},	
		{x:2.75,y:20},	
		{x:2.75,y:25},	
	]

	let self = this;
	let intTick;

	self.$el = $('<igb>');

	let $left = $('<igbside>').appendTo(self.$el);
	let $front = $('<igbside>').appendTo(self.$el);
	let $right = $('<igbside>').appendTo(self.$el);

	let $game = $('<drivinggame>').appendTo($front);
	let $world = $('<drivingworld>').appendTo($game);
	let $plane = $('<drivingplane>').appendTo($world);

	let $car = $(`<drivingcar>`).appendTo($plane);
	let $i = $(`<drivingcarinner>`).appendTo($car);
	new Box3D(WCAR*GRID,LCAR*GRID,HCAR*GRID,PURPLE).$el.appendTo($i);


	$layers = [];
	
	for(var i=0; i<20; i++){
		let $layer = $('<drivinglayer>').appendTo($plane);

		$layers[i] = $layer;
	}

	/*for(var t in TRACK){
		
		for(var g=0; g<TRACK[t].length; g++){
			let $g = $('<drivinggrid>').appendTo($layer).attr('type',TRACK[t][g]);

			if(TRACK[t][g]==' '){
				new Box3D(GRID-100,GRID-100,GRID*(0.5+Math.random()*3),PURPLE).$el.appendTo($g).css({
					transform:'translate(50px,50px)',
				})
			}
		}

		let $fog = $('<drivingfog>').appendTo($layer);

		
	}*/



	for(var c in cars){
		let $c = $(`<drivingcar>`).appendTo($plane).css({left:cars[c].x*GRID+'px',bottom:cars[c].y*GRID+'px'});
		let $i = $(`<drivingcarinner>`).appendTo($c);
		new Box3D(WCAR*GRID,LCAR*GRID,HCAR*GRID,'black').$el.appendTo($i);
	}


	let players = [{px:0}];
	let iTick = 0;
	let speed = 2.5/FPS;
	let steer = FPS*0.2;
	let xCenter = 2.5;

	let iyTrack = -1;

	let curve = [{x:0,r:0}];

	function addStraight(count) {
		let xAnchor = curve[curve.length-1].x;
		while(count){
			count--;
			curve.push({x:xAnchor,r:0});
		}
	}

	function addSlide(count,dir) {
		let xAnchor = curve[curve.length-1].x;

		while(count){
			count--;
			xAnchor += 0.4*dir;
			curve.push({x:xAnchor,r:dir*0.4});
		}
	}

	while(curve.length<200){
		addStraight(5+Math.floor(Math.random()*5));
		addSlide(5+Math.floor(Math.random()*5),(Math.random()>0.5?1:-1));
	}
	
	

	function tick(){
		let w = $(document).innerWidth()/3;
		$game.css('transform','scale('+(w/W)+')');

		iTick++;
		
		let prog = speed*iTick;

		let txRelative = (players[0].px/100-0.5);
		let txActual = xCenter + txRelative;

		let xLeft = txActual - WCAR/2;
		let xRight = txActual + WCAR/2;

		let ixLeft = Math.floor(xLeft);
		let ixRight = Math.floor(xRight);
		let iyProgress = Math.floor(prog)-1;


		while(iyTrack<(iyProgress+$layers.length)){

			iyTrack++;
			let n = iyTrack%$layers.length;
			$layers[n].css({
				'bottom':(iyTrack*GRID)+'px',
				'left':curve[iyTrack].x*GRID+'px',
				'transform':'rotate('+curve[iyTrack].r*55+'deg)',
			});
		}

		xCenter = (xCenter*(steer-1) + txActual)/steer;

		let r = txRelative*90;

		$car.css({
			left:txActual*GRID +'px',
			bottom: (prog+0.1)*GRID + 'px',
			'transform':'rotateZ('+r+'deg)',
		})

		$plane.css({
			left:-xCenter*GRID+'px',
			bottom:-prog*GRID+'px',
		})


		
		
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