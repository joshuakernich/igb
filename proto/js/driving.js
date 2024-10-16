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
				border: 5px solid black;
		
			}



			box3Dside:nth-of-type(2){
				transform-origin: left center;
				transform:rotateY(-90deg);
			}

			box3Dside:nth-of-type(3){
				transform-origin: right center;
				right:0px;
				transform:rotateY(90deg);
			}

			box3Dside:nth-of-type(4){
				transform-origin: top center;
				transform:rotateX(90deg);
			}

			box3Dside:nth-of-type(5){
				bottom:0px;
				transform-origin: bottom center;
				transform:rotateX(-90deg);
			}

		</style>
	`);

	let self = this;
	self.$el = $(`
		<box3D style='width:${w}px;height:${l}px;'>
			<box3Dside style='background:${color};width:${w}px;height:${l}px;'></box3Dside>
			<box3Dside style='background:${color};width:${h}px;height:${l}px;'></box3Dside> 
			<box3Dside style='background:${color};width:${h}px;height:${l}px;'></box3Dside>
			<box3Dside style='background:${color};width:${w}px;height:${h}px;'></box3Dside>
			<box3Dside style='background:${color};width:${w}px;height:${h}px;'></box3Dside>
			<box3Dside style='background:${color};transform:translateZ(${h}px);width:${w}px;height:${l}px;'></box3Dside>
		</box3D>
		`)
}

DrivingGame = function(){

	const FPS = 50;
	const W = 400;
	const H = 250;
	const WCAR = 100;
	const LCAR = 150;
	const HCAR = 50;
	const FLOAT = 5;
	const GRID = W;

	$("head").append(`
		<style>
			drivinggame{
				display:block;
				width:${W}px;
				height:${H}px;
				
				box-sizing:border-box;
				transform-origin:top left;
				perspective:${W}px;
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
			}

			drivingplane{
				display:block;
				transform-origin:bottom center;
				position:absolute;
				bottom:0px;
				left:0px;
				width:0px;
					
				transform-style: preserve-3d;
				z-index:1;
			}

			drivingcar{
				display:block;
				transform-style: preserve-3d;
				width:${WCAR}px;
				height:${LCAR}px;
				background:black;
				position:absolute;
				left:0px;
				bottom:50px;
				transform: translateX(-50%);
			}

			drivingcar box3D{
				transform: translateY(-10px);
			}

			drivinglayer{
				display:block;
				
				position:relative;
				white-space:nowrap;
				transform-origin: bottom center;
				width:${GRID*5}px;
				left:${-GRID*2.5}px;
				transform-style: preserve-3d;
				
			}

			drivinggrid{
				display:inline-block;
				background: black;
				width:${GRID}px;
				height:${GRID}px;
				box-sizing: border-box;
				transform-style: preserve-3d;
				transform: translateZ(1px);
			}

			drivinggrid[type='H']{
				background:#333;
			}

		</style>
	`);


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
	new Box3D(WCAR,LCAR,HCAR,'red').$el.appendTo($car);

	

	const TRACK = [
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		' HHH ',
		' HHH ',
		' H H ',
		' H H ',
		' H H ',
		' H H ',
		' H H ',
		' H H ',
		' H H ',
		' HHH ',
		' HHH ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		' HHH ',
		' HHH ',
		' H H ',
		' H H ',
		' H H ',
		' H H ',
		' H H ',
		' H H ',
		' H H ',
		' HHH ',
		' HHH ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
		'  H  ',
	]

	let cars = [
		{x:0.25,y:5},	
		{x:-0.25,y:10},	
		{x:0.25,y:15},	
		{x:-0.25,y:20},	
		{x:0.25,y:25},	
		{x:-0.25,y:30},	
		{x:0.25,y:35},	
		{x:-0.25,y:40},	
	]

	
	for(var t in TRACK){
		let $layer = $('<drivinglayer>').appendTo($plane);
		for(var g=0; g<TRACK[t].length; g++){
			let $g = $('<drivinggrid>').appendTo($layer).attr('type',TRACK[t][g]);

			if(TRACK[t][g]==' '){
				new Box3D(GRID-100,GRID-100,GRID,'#333').$el.appendTo($g).css({
					left:'50px',
					top:'50px',
				})
			}
		}
	}

	for(var c in cars){
		let $c = $(`<drivingcar>`).appendTo($plane).css({left:cars[c].x*GRID+'px',bottom:cars[c].y*GRID+'px'});
		new Box3D(WCAR,LCAR,HCAR,'#999').$el.appendTo($c);
	}


	let players = [{px:0}];
	let iTick = 0;
	let speed = GRID/20;
	let steer = 5;
	let xCenter = 0;
	function tick(){
		let w = $(document).innerWidth()/3;
		$game.css('transform','scale('+(w/W)+')');

		iTick++;
		//$car.css('transform',`rotateZ(${iTick}deg)`);
		
		//let ox
		let prog = speed*iTick;

		let txRelative = (players[0].px/100-0.5);
		let txActual = xCenter + txRelative;


		xCenter = (xCenter*19 + txActual)/20;

		$car.css({
			left:txActual*GRID+'px',
			bottom: (prog+50) + 'px',
		})

		$plane.css({
			left:-xCenter*GRID+'px',
			bottom:-prog+'px',
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