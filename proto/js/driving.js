Box3D = function(w,l,h){

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
				background:rgba(255,0,0,0.5);
				box-shadow: inset 0px 0px 50px white;
				transform-style: preserve-3d;
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
			<box3Dside style='width:${w}px;height:${l}px;'></box3Dside>
			<box3Dside style='width:${h}px;height:${l}px;'></box3Dside> 
			<box3Dside style='width:${h}px;height:${l}px;'></box3Dside>
			<box3Dside style='width:${w}px;height:${h}px;'></box3Dside>
			<box3Dside style='width:${w}px;height:${h}px;'></box3Dside>
			<box3Dside style='transform:translateZ(${h}px);width:${w}px;height:${l}px;'></box3Dside>
		</box3D>
		`)
}

DrivingGame = function(){

	const FPS = 50;
	const W = 1600;
	const H = 1000;
	const WCAR = 300;
	const LCAR = 600;
	const HCAR = 150;

	$("head").append(`
		<style>
			drivinggame{
				display:block;
				width:${W}px;
				height:${H}px;
				background: black;
				box-sizing:border-box;
				transform-origin:top left;
				perspective:${W}px;
			}

			drivingworld{
				display:block;
				width:${W}px;
				height:${H}px;
				
				box-sizing:border-box;
				
				transform-origin:bottom center;
				position:absolute;
				bottom:0px;
				left:0px;
				right:0px;
				
				transform:rotateX(90deg);
				transform-style: preserve-3d;
				z-index:1;
			}

			drivingplane{
				display:block;
				width:${W}px;
				height:${W*100}px;
				
				box-sizing:border-box;
				
				transform-origin:bottom center;
				position:absolute;
				bottom:0px;
				left:0px;
				right:0px;
				margin:auto;
				transform-style: preserve-3d;
				background: #333;
				background-size:100%;
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
	new Box3D(WCAR,LCAR,HCAR).$el.appendTo($car).css('transform','translateZ(40px)');

	let cars = [
		{x:25,y:10},	
		{x:75,y:20},	
		{x:25,y:30},	
		{x:75,y:40},	
	]

	for(var c in cars){
		let $c = $(`<drivingcar>`).appendTo($plane).css({left:cars[c].x+'%',bottom:cars[c].y*1000+'px'});
		new Box3D(WCAR,LCAR,HCAR).$el.appendTo($c).css('transform','translateZ(40px)');
	}


	let players = [{px:0}];
	let iTick = 0;
	let speed = 70;
	let steer = 5;
	let ox = 0;
	function tick(){
		let w = $(document).innerWidth()/3;
		$game.css('transform','scale('+(w/W)+')');

		iTick++;
		//$car.css('transform',`rotateZ(${iTick}deg)`);
		
		let prog = speed*iTick;

		if(players[0].px<40) ox--;
		if(players[0].px>60) ox++;

		$car.css({
			left:players[0].px+'%',
			bottom: (prog+50) + 'px',
		})

		$plane.css({
			left:-ox*steer+'px',
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
}