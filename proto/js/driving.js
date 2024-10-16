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

			drivingtrack{
				display:block;
				width:${W}px;
				height:${W*20}px;
				background: #333;
				box-sizing:border-box;
				border-left:50px solid red;
				border-right:50px solid red;
				transform-origin:bottom center;
				position:absolute;
				bottom:0px;
				left:0px;
				right:0px;
				margin:auto;
				transform:rotateX(90deg);
				transform-style: preserve-3d;
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
	let $track = $('<drivingtrack>').appendTo($game);
	let $car = $(`<drivingcar>`).appendTo($track);

	new Box3D(WCAR,LCAR,HCAR).$el.appendTo($car).css('transform','translateZ(40px)');

	let nodes = [

	]

	let players = [{px:0}];
	let iTick = 0;
	function tick(){
		let w = $(document).innerWidth()/3;
		$game.css('transform','scale('+(w/W)+')');

		iTick++;
		//$car.css('transform',`rotateZ(${iTick}deg)`);
		
		$car.css({
			left:players[0].px+'%',
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