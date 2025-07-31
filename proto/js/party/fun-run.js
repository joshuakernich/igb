window.FunRunGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-playroom.mp3',0.3,true);

	if( !FunRunGame.init ){
		FunRunGame.init = true;

		$("head").append(`
			<style>
				funrungame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: gray;
					background-position: bottom 120px center;
					perspective: ${W*3}px;
				}

				funrunworld{
					position: absolute;
					display: block;
					left: 50%;
					bottom: 0px;
					transform-style: preserve-3d;
					transform: rotateX(-2deg);
					transition: all 1s;
				}

				funrunfloor{
					position: absolute;
					display: block;
					width: ${W}px;
					height: ${W}px;
					left: ${-W/2}px;
					bottom: ${0}px;
					background: #999;
					box-sizing: border-box;
					transform: rotateX(90deg);
					transform-style: preserve-3d;
					transform-origin: bottom center;

					background: radial-gradient(#999, #aaa);
				}

				funrunwall{
					position: absolute;
					display: block;
					width: ${W*0.7}px;
					height: ${H}px;
					left: ${-W*0.7/2}px;
					bottom: ${0}px;

					box-sizing: border-box;
					transform: translateZ(${-W}px);
					transform-style: preserve-3d;
					transform-origin: bottom center;

					border-radius: 100px 100px 0px 0px;

					

					background: #875333;
					box-shadow: inset 0px 5px 10px orange;
				}

				funrunscreen{
					position: absolute;
					display: block;
					inset: 50px 50px 250px 50px;
					background: black;
					border-radius: 50px;
					background: url(./proto/img/party/bg-cityscape.png);
					background-size: 300% 95%;
					overflow: hidden;

					box-shadow: inset 0px 0px 40px rgba(0,0,0,0.5);
				}

				funrunscreen:before{
					content: "";
					position: absolute;
					inset:0px;
					background: url(./proto/img/party/actor-screen.gif);
					background-size: 100% 100%;
					display: none;
				}

				funrundial{
					position: absolute;
					display: block;
					width: 150px;
					height: 150px;
					right: 50px;
					bottom: 50px;
					background: gray;
					border-radius: 100%;
					box-shadow: 0px -5px 20px black;
				}

				funrunspeaker{
					position: absolute;
					display: block;
					width: 350px;
					height: 150px;
					left: 50px;
					bottom: 50px;
					background: gray;
					border-radius: 25px;
					background:repeating-linear-gradient(
						    gray,
						  black 20px,
						  gray 20px,
						  black 25px
						  );
				}


			</style>
		`);
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<funrungame>').appendTo(self.$el);
	let $world = $('<funrunworld>').appendTo($game);

	let $floor = $('<funrunfloor>').appendTo($world);
	let $wall = $('<funrunwall>').appendTo($world);
	let $screen = $('<funrunscreen>').appendTo($wall);
	let $dial = $('<funrundial>').appendTo($wall);
	let $speaker = $('<funrunspeaker>').appendTo($wall);

	let hud = new PartyHUD();
	hud.$el.appendTo($game);

	let meeps = [];
	function initGame(count){
		for(var i=0; i<count; i++){
			meeps[i] = new PartyMeep(i);
			meeps[i].$el.appendTo($floor);
			meeps[i].$el.css({
				'transform':'rotateX(-90deg)',
			})
		}
	}

	initGame(6);

	function toWall(){
		$world.css({
			transform: 'rotateX(-2deg) scale(1) translateY(-0px)',
		})
	}

	function toFloor(){
		$world.css({
			transform: 'rotateX(-30deg) scale(0.85) translateY(-150px)',
		})
	}

	toWall();

	self.step = function(){
	
		for(var m in meeps){
			meeps[m].$el.css({
				left: meeps[m].px + 'px',
				top: meeps[m].py + 'px',
			})
		}

		resize();
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	let interval = setInterval(self.step,1000/FPS);

	self.fini = function(){
		audio.stop('music');
		clearInterval(interval);
	}

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].px = (p[m].px) * W;
			meeps[m].py = (1-p[m].pz) * W;
		}
	}
}