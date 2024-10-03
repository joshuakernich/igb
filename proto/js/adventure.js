AdventureMaze = function(puzzle){

	if(!AdventureMaze.didInit){
		AdventureMaze.didInit = true;

		$("head").append(`
			<style>
				.adventuremaze{
					width:10vw;
					height:10vw;
		
					position:absolute;
					
					left:-5vw;
					top:-5vw;
					background:rgba(0,0,0,0.5);
					backdrop-filter: blur(0.3vw);
				}

				.adventuremaze td{
					border: 0.3vw solid transparent;
				}

				.adventuremaze td[type="+"]{
					background:white;
				}

				.adventuremaze td[type="0"]{
					background:red;
					border-color: white;
				}

				.adventuremaze td[shaded="0"]{
					background:red;
					border-color: transparent;
				}
			</style>
		`);
	}

	let self = this;
	self.$el = $('<table class="adventuremaze">');

	self.w = puzzle[0].length;
	self.h = puzzle.length;

	self.callback = function(){
		console.log("FINISHED!");
	}

	let cells = [];
	for(var r=0; r<puzzle.length; r++){
		cells[r] = [];
		let $tr = $('<tr>').appendTo(self.$el);
		for(var c=0; c<puzzle[r].length; c++){
			cells[r][c] = { n:-1, $el:$('<td>').appendTo($tr).attr('type',puzzle[r][c]) };
		}
	}

	let chains = [];

	self.setPlayerCursor = function (nPlayer,xGrid,yGrid) {
		xGrid /= (10/self.w);
		yGrid /= (10/self.h);

		let x = Math.floor(xGrid+self.w/2);
		let y = Math.floor(yGrid+self.h/2);

		if( !chains[nPlayer] ) chains[nPlayer] = [];

		let type = puzzle[y]?puzzle[y][x]:undefined;

		if(!chains[nPlayer].length && type==nPlayer){
			//it begins
			chains[nPlayer].push({x:x,y:y});
			cells[y][x].n = nPlayer;
			repaint();
		} else if(chains[nPlayer].length){

			let tip = chains[nPlayer][chains[nPlayer].length-1];
			let prev = chains[nPlayer][chains[nPlayer].length-2];

			let dx = Math.abs( tip.x - x );
			let dy = Math.abs( tip.y - y );
			let d = dx+dy;

			if(d==1 && type=='+' && cells[y][x].n==-1){
				//add to the chain
				chains[nPlayer].push({x:x,y:y});
				cells[y][x].n = nPlayer;
				repaint();
			} else if(prev && x == prev.x && y == prev.y){
				//backtrack chain
				let dump = chains[nPlayer].pop();
				cells[dump.y][dump.x].n = -1;
				repaint();
			}
			
		} 
	}

	function repaint(){
		let isComplete = true;
		for(var r=0; r<puzzle.length; r++){
			for(var c=0; c<puzzle[r].length; c++){
				if(puzzle[r][c]=='+' && cells[r][c].n == -1) isComplete = false;
				cells[r][c].$el.attr('shaded',cells[r][c].n);
			}
		}

		if(isComplete) self.callback();
	}
}

Adventure = function(){

	if(!Adventure.didInit){

		Adventure.didInit = true;

		let css = {
			'adventuregame':{
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'right':'0px',
				'top':'0px',
				'bottom':'0px',
				'background-image':'url(./proto/img/bg-forest.jpg)',
				'background-size':'28%',

				'font-family': "Chakra Petch",
				'font-weight': 'bold',
			},

			'adventureplatform':{
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'right':'0px',
				
				'bottom':'0px',
				'height':'3vw',
				'background-image':'url(./proto/img/platform-grass.png)',
				'background-size':'15%',
			},

			'adventurepuzzle':{
				'display':'block',
				'position':'absolute',
				'left':'50%',
				'top':'50%',
				'width':'0px',
			},

			'adventureanchor':{
				'display':'block',
				'position':'absolute',
				'left':'50%',
				'bottom':'0px',
				'width':'0px',
			},

			'adventurearena':{
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'bottom':'0.8vw',
				'width':'0px',
			},

			'adventureplayer':{
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'bottom':'0px',
				'width':'3vw',
				'height':'3vw',
				'background':'black',
				'transform':'translateX(-50%)',
				'text-align':'center',
				'color':'red',
				
				
				'animation':'throb 0.4s infinite'
			},

			'adventureplayer:before':{
				'content':'". ."',
				'display':'block',
				'animation':'blink 3s infinite',
				'font-size':'2vw',
				'line-height':'2vw',
				'height':'3.5vw',
				
			},

			'adventurecursor':{
				'display':'block',
				'position':'absolute',
				'left':'0px',
				
				'width':'2vw',
				'height':'2vw',
				'transform':'translate(-50%,50%)',
				
				'box-sizing':'border-box',
				'border':'0.2vw solid red',
				'border-radius':'1vw',
				'z-index':'1',
				'pointer-events':'none',
			},

			'adventurebarrier':{
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'bottom':'0px',
				'width':'3vw',
				'height':'5vw',
				'background':'black',
				'transform':'translateX(-50%)',
				'text-align':'center',
				'color':'white',
				
			},

			'adventurebarrier .adventuremaze':{
				'width':'3vw',
				'height':'3vw',
				'top':'0vw',
				'left':'0vw',
				'border':'none',
				'box-sizing':'border-box',

			},

			'adventurebarrier .adventuremaze td':{
				'border':'none',
			},
		}

		$("head").append('<style>'+Css.of(css)+'</style>');

		$("head").append(`
			<style>
				@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap');

				@keyframes throb{
					0%{height: 3vw;}
					50%{height: 3.2vw;}
					100%{height: 3vw;}
				}

				@keyframes blink{
					0%{transform:scale(1,1);}
					90%{transform:scale(1,1);}
					92%{transform:scale(1.2,0.4);}
					98%{transform:scale(1.2,0.4);}
					100%{transform:scale(1,1);}
				}
			</style>
		`);
	}

	const PLAYERCOUNT = 1;
	const PUZZLES = [
		[
			'   ',
			'0++',
			'   ',
		],
		[
			' 0 ',
			' + ',
			' + ',
		],
		[
			'0++',
			'+ +',
			'+++',
		],
		[
			'+++  ',
			'+ +  ',
			'+ +++',
			'+++ +',
			'0++++',
		]

	]

	let self = this;
	self.$el = $('<igb class="adventurewrapper">');
	let $game = $('<adventuregame>').appendTo(self.$el);
	let $puzzle = $('<adventurepuzzle>').appendTo(self.$el);

	let $anchor = $('<adventureanchor>').appendTo($game);
	let $arena = $('<adventurearena>').appendTo($anchor);
	let $platform = $('<adventureplatform>').appendTo($game);

	let puzzle;

	$(`
		<audio autoplay controls loop>
			<source src="./proto/audio/scenery-125577.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0].volume = 0.5;


	let players = [];
	for(var i=0; i<PLAYERCOUNT; i++){
		let player = {x:0,y:0,tx:0,ty:0};
		player.$cursor = $('<adventurecursor>').appendTo($anchor);
		player.$el = $('<adventureplayer>').appendTo($arena);
		players[i] = player;
	}

	const W2 = 33.3/2;
	const H2 = (33.3/16*10)/2;

	let actors = [
		{x:2,puzzle:new AdventureMaze(PUZZLES[0])},
		{x:4,puzzle:new AdventureMaze(PUZZLES[1])},
		{x:6,puzzle:new AdventureMaze(PUZZLES[2])},
		{x:8,puzzle:new AdventureMaze(PUZZLES[3])},
	];
	for(var a in actors){
		actors[a].$el = $('<adventurebarrier>').appendTo($arena).css({left:actors[a].x*W2+'vw'});
		actors[a].puzzle.$el.clone().appendTo(actors[a].$el);
	}


	function onPuzzleComplete(){
		puzzle.$el.remove();
		puzzle.$actor.remove();
		puzzle = undefined;
	}

	self.setPlayers = function(p){
		for(var i in players){
			players[i].tx = p[i].X;
			players[i].ty = p[i].Z;
			players[i].$cursor.css({left:players[i].tx*W2+'vw',bottom:H2+players[i].ty*H2+'vw'});

			if(puzzle) puzzle.setPlayerCursor(i,players[i].tx*W2,-players[i].ty*H2);
		}
	}

	let ox = 0;
	let walk = 0.01;
	let tolerance = 0.02;
	function tick(){

		if(puzzle) return;

		let ax = 0;
		for(var i in players){
			let px = players[i].x - ox;
			if(px<(players[i].tx+tolerance)) players[i].x += walk;
			if(px>(players[i].tx-tolerance)) players[i].x -= walk;
			players[i].$el.css({left:players[i].x*W2+'vw'});
			ax += players[i].x;

			//collide with actors
			for(var a in actors){
				
				if(!actors[a].activated){
					let dx = Math.abs( actors[a].x - players[i].x );
					if(dx<0.2){
						actors[a].activated = true;
						puzzle = actors[a].puzzle;
						puzzle.$actor = actors[a].$el;
						puzzle.$el.appendTo($puzzle);
						puzzle.callback = onPuzzleComplete;

					}
				} 
			}
		}

		let oxNew = ax/players.length;
		let dx = oxNew - ox;
		if(dx>0.3) ox += walk;
		if(dx<-0.3) ox -= walk;

		$arena.css({left:-ox*W2+'vw'});
		$platform.css({'background-position-x':-ox*W2+'vw'});
		$game.css({'background-position-x':-ox*W2*0.2+'vw'});
	}

	setInterval(tick,1000/50);

	const WSPAN = 6;

	self.$el.on('mousemove',function(e){

		let w = $(document).innerWidth();
		let h = $(document).innerHeight();
		let hSelf = w/3/16*10;
		let oy = h/2-hSelf/2;

		let px = (e.pageX/w*WSPAN-WSPAN/2);
		let py = 1 - (e.pageY-oy)/(hSelf/2);

		if(px>1) px = 1;
		if(px<-1) px = -1;

		self.setPlayers([{X:px,Z:py}]);
	});
}