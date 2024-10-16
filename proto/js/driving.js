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
				background:rgba(0,0,0,0.6);
				position:absolute;
				left:0px;
				bottom:50px;
				transform: translateX(-50%) translateZ(2px);
				box-shadow: 0px 0px 10px black;
			}

			drivingcar box3D{
				transform: translateZ(10px);
				font-size:70px;
				color:red;

				line-height:${HCAR*0.7}px;
				text-shadow: 0px 0px 20px red;
			}

			drivingcar box3Dside:nth-of-type(5):before{
				content:".";
				display:inline-block;
				margin-right: 25px;
				
			}

			drivingcar box3Dside:nth-of-type(5):after{
				content:".";
				line-height:${HCAR*0.7}px;
				display:inline-block;
				margin-left: 25px;
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

			drivingfog{
				width:${GRID*5}px;
				height:${H*4}px;
				transform-origin: top center;
				position:absolute;
				transform: rotateX(90deg);
				background:radial-gradient(circle at bottom center,rgba(0,0,0,0.5),rgba(0,0,0,0.1),transparent);
				top:0px;
				left:0px;	

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
				background:#222;
			}

		</style>
	`);

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
		{x:1,y:25},	
		{x:-1,y:25},	
		{x:0.25,y:35},	
		{x:-0.25,y:40},	
		{x:1,y:45},	
		{x:-1,y:45},	
		{x:0,y:55},	
		{x:0.3,y:60},	
		{x:-0.3,y:60},	
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
	new Box3D(WCAR,LCAR,HCAR,PURPLE).$el.appendTo($car);


	$layers = [];
	
	for(var t in TRACK){
		let $layer = $('<drivinglayer>').appendTo($plane);
		for(var g=0; g<TRACK[t].length; g++){
			let $g = $('<drivinggrid>').appendTo($layer).attr('type',TRACK[t][g]);

			if(TRACK[t][g]==' '){
				new Box3D(GRID-100,GRID-100,GRID*(0.5+Math.random()*3),PURPLE).$el.appendTo($g).css({
					transform:'translate(50px,50px)',
				})
			}
		}

		let $fog = $('<drivingfog>').appendTo($layer);

		$layers[t] = $layer;
	}

	for(var c in cars){
		let $c = $(`<drivingcar>`).appendTo($plane).css({left:cars[c].x*GRID+'px',bottom:cars[c].y*GRID+'px'});
		new Box3D(WCAR,LCAR,HCAR,'black').$el.appendTo($c);
	}


	let players = [{px:0}];
	let iTick = 0;
	let speed = 1/20;
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
			bottom: (prog+0.1)*GRID + 'px',
		})

		$plane.css({
			left:-xCenter*GRID+'px',
			bottom:-prog*GRID+'px',
		})

		//console.log('prog',prog);

		
		let maxRender = $layers.length - Math.floor(prog);

		let minRender = $layers.length - Math.floor(prog) - 10;


		
		for(var r=0; r<$layers.length; r++){

			if(r<minRender || r>maxRender) $layers[r].css('opacity','0');
			else $layers[r].css('opacity','1');


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