window.CardboardCutoutGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const BOX = 400;

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-playroom.mp3',0.3,true);

	if( !CardboardCutoutGame.init ){
		CardboardCutoutGame.init = true;

		$("head").append(`
			<style>
				cutoutgame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background-image: url(./proto/img/party/bg-box-factory.png);
					background-size: 100%;
					background-position: bottom center;

					perspective: ${W}px;
				}

				cutoutgame:before{
					content: "";
					position: absolute;
					display: block;
					inset: 0px;
					background: linear-gradient(to top, #2963A2, transparent);
				}

				cutoutbox{
					display:block;
					position: absolute;
					width: ${BOX}px;
					height: ${BOX}px;
					background: url(./proto/img/party/texture-cardboard.avif);
					background-size: cover;
					transform: translate(-50%,-50%) rotateX(20deg);
					transform-style: preserve-3d;
				}

				cutoutbox path{
					stroke: black;
					stroke-width: 10;
					fill: none;
				}

				cutoutwall:nth-of-type(1){
					display:block;
					position: absolute;
					width: ${BOX}px;
					height: ${BOX/2}px;
					background: url(./proto/img/party/texture-cardboard.avif);
					background-size: cover;
					transform: rotateX(-90deg);
					transform-style: preserve-3d;
					transform-origin: top center;
					top: 100%;
					left: 0px;
				}

				cutoutwall:nth-of-type(2){
					display:block;
					position: absolute;
					width: ${BOX}px;
					height: ${BOX/2}px;
					background: url(./proto/img/party/texture-cardboard.avif);
					background-size: cover;
					transform: rotateZ(90deg) rotateX(-90deg);
					transform-style: preserve-3d;
					transform-origin: left top;
					top: 0px;
					left: 0px;
				}

				cutoutwall:nth-of-type(3){
					display:block;
					position: absolute;
					width: ${BOX/2}px;
					height: ${BOX}px;
					background: url(./proto/img/party/texture-cardboard.avif);
					background-size: cover;
					transform: rotateY(-90deg);
					transform-style: preserve-3d;
					transform-origin: right top;
					top: 0px;
					right: 0px;

				}

				cutoutwall:after{
					content:"";
					display: block;	
					position: absolute;
					inset: 0px;
					background: black;
					opacity: 0.2;
				}
			</style>
		`)
	}

	const SHAPES = {
	  triangle: [
	    { x: 0, y: 1 },
	    { x: -0.866, y: -0.5 },
	    { x: 0.866, y: -0.5 }
	  ],
	  square: [
	    { x: -1, y: 1 },
	    { x: 1, y: 1 },
	    { x: 1, y: -1 },
	    { x: -1, y: -1 }
	  ],
	  pentagon: [
	    { x: 0, y: 1 },
	    { x: 0.951, y: 0.309 },
	    { x: 0.588, y: -0.809 },
	    { x: -0.588, y: -0.809 },
	    { x: -0.951, y: 0.309 }
	  ],
	  hexagon: [
	    { x: 0.866, y: 0.5 },
	    { x: 0, y: 1 },
	    { x: -0.866, y: 0.5 },
	    { x: -0.866, y: -0.5 },
	    { x: 0, y: -1 },
	    { x: 0.866, y: -0.5 }
	  ],
	  circle: Array.from({ length: 32 }, (_, i) => {
	    const angle = (Math.PI * 2 * i) / 32;
	    return {
	      x: Math.cos(angle),
	      y: Math.sin(angle)
	    };
	  }),
	  star: [
	    { x: 0, y: 1 },
	    { x: 0.2245, y: 0.309 },
	    { x: 0.951, y: 0.309 },
	    { x: 0.363, y: -0.118 },
	    { x: 0.588, y: -0.809 },
	    { x: 0, y: -0.382 },
	    { x: -0.588, y: -0.809 },
	    { x: -0.363, y: -0.118 },
	    { x: -0.951, y: 0.309 },
	    { x: -0.2245, y: 0.309 }
	  ]
	};

	const SCALING = 0.9;

	const MeepBox = function(n,x,y){

		let self = this;

		let pattern = SHAPES['star'];
		let d = '';
		for(var p in pattern) d = d + (p==0?' M':' L')+(pattern[p].x*SCALING)+','+(pattern[p].y*SCALING);

		d = d + 'Z';

		self.$el = $(`
			<cutoutbox>
				<svg viewBox='-1 -1 2 2'>
					<path stroke-dasharray="20 20" vector-effect='non-scaling-stroke' d='${d}'></path>
				</svg>
				<cutoutwall></cutoutwall>
				<cutoutwall></cutoutwall>
				<cutoutwall></cutoutwall>
			</cutoutbox>
			`).css({
			left: W + x*W + 'px',
			top: y*H + 'px',
		});

		let $path = self.$el.find('path');
		//$path.attr('d',d);

	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<cutoutgame>').appendTo(self.$el);

	let hud = new PartyHUD('#C09363');
	hud.$el.appendTo($game);

	hud.initPlayerCount(initGame);

	let boxes = [];

	function initGame(){
		initBox();
		initBox();
	}

	function initBox(){

		let nBox = 0;
		if( boxes[0] ) nBox = 1;

		let box = new MeepBox(0,(nBox==0?0.3:0.7),0.5);
		box.$el.appendTo($game);
		boxes[nBox] = box;

	}

	self.step = function(){
		resize();
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	self.fini = function(){
		audio.stop('music');
		clearInterval(interval);
	}

	setInterval(self.step,1000/FPS);
}