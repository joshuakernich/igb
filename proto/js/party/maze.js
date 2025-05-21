window.MazeGame = function(n){
	const W = 1600;
	const H = 1000;
	const FPS = 20;
	const PLAYER_COUNT = 6;
	const GRIDSIZE = 400;
	const TRACKLENGTH = 200;

	const GRID = {W:W/GRIDSIZE,H:TRACKLENGTH};

	if(!MazeGame.didInit){
		MazeGame.didInit = true;

		$("head").append(`
			<style>
				mazegame{
					display: block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: url(./proto/img/party/bg-mountains.jpg);
					background-size: 100%;
					background-position: center -250px;
					perspective: ${W}px;

				}

				mazeworld{
					transform-origin: center bottom;
					
					width: ${W}px;
					height: ${W}px;
					position: absolute;
					left: 0px;
					right: 0px;
					bottom: 0px;
					margin: auto;
					transform: rotateX(60deg);
					z-index: 10;
					transform-style:preserve-3d;
				}

				mazeworld:after{
					content:"";
					border: 50px dashed yellow;
					display: block;
					position: absolute;
					left: 0px;
					right: 0px;
					top: 0px;
					bottom: 0px;
					display: none;
				}

				mazeplatform{
					display: block;
					width: ${W}px;
					height: ${TRACKLENGTH*GRIDSIZE}px;
					position: absolute;
					left: 0px;
					right: 0px;
					bottom: 0px;
					margin: auto;
				}

				mazerow{
					display: block;
					height: ${GRIDSIZE}px;
				}

				mazeblock{
					width: ${GRIDSIZE}px;
					height: ${GRIDSIZE}px;
					background: rgba(150,105,50,1);
					display: inline-block;
					border-bottom: 150px solid rgba(100,55,0,1);
				}

				mazeblock[absent='true']{
					visibility: hidden;
				}
			</style>`);
	}

	let yProgress = 0;

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<mazegame>').appendTo(self.$el);
	let $world = $('<mazeworld>').appendTo($game);
	let $platform = $('<mazeplatform>').appendTo($world);

	let map = [];

	for(var y=0; y<GRID.H; y++){
		let $row = $('<mazerow>').prependTo($platform);
		map[y] = [];
		let iAbsent = Math.floor( Math.random() * GRID.W );
		if(y<10 || y>(TRACKLENGTH-5) || y%4==0 ) iAbsent = -1;

		for(var x=0; x<GRID.W; x++){
			$('<mazeblock>')
			.appendTo($row)
			.attr('absent',x==iAbsent?'true':'false');

			map[y][x] = (x!=iAbsent);
		}
	}

	let meeps = [];
	for(var i=0; i<PLAYER_COUNT; i++){

		meeps[i] = new PartyMeep(i);
		meeps[i].$el.appendTo($world);
		meeps[i].setHeight(370);
		meeps[i].$el.css({

			top:'200px',
			left:(40+i*10)+'%',
			'transform-style':'preserve-3d',
			transform: 'rotateX(-60deg) scale(0.8)',
			
		});
	}

	let hud = new PartyHUD(meeps);
	hud.$el.appendTo($game);

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	let speed = 0.05;
	function step(){
		resize();
		speed += 0.0001;
		yProgress += speed;
		$platform.css({'bottom':-yProgress*GRIDSIZE+'px'});

		for(var m in meeps){

			if(meeps[m].dead) continue;

			meeps[m].$el.css({
				left:meeps[m].x + 'px',
				top:meeps[m].y + 'px'
			})

			let gx = Math.floor(meeps[m].x/GRIDSIZE);
			let gy = Math.floor((W-meeps[m].y)/GRIDSIZE+yProgress);

			if(map[gy] && map[gy][gx]==false){
				meeps[m].dead = true;
				meeps[m].$el.remove();
			}
		}
	}

	setInterval(step,1000/FPS);

	$(document).on('mousemove',function(e){
		
		let o = $game.offset();
		let x = (e.pageX - o.left)/scale;
		let y = (e.pageY - o.top)/scale;

		x = (x%W)/W;
		y = (y/H);
		
		meeps[0].x = W*x;
		meeps[0].y = W*y;
	})

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].x = p[m].px/100*W;
			meeps[m].y = (1-p[m].pz/100)*W;
		}
	}
}