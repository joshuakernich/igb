AdventureMaze = function(puzzle,sfx){

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

				.adventuremaze td[type="1"]{
					background:blue;
					border-color: white;
				}

				.adventuremaze td[shaded="1"]{
					background:blue;
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

	let nPaint = 0;
	function repaint(){
		nPaint++;
		sfx.$pops[nPaint%sfx.$pops.length][0].play();
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

			'adventureplayer:nth-of-type(2)':{
				'color':'blue',
				'border-radius':'1.5vw',
				'animation-delay':'-1s',
			},

			'adventureplayer:nth-of-type(2):before':{
				'animation-delay':'-1s',
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

			'adventurecursor:nth-of-type(2)':{
				'border-color':'blue',
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

			'adventuregame h':{
				'position':'absolute',
				'display':'span',
				'left':'33.3vw',
				'right':'33.3vw',
				'margin':'auto',

				'line-height':'2vw',
				'font-size':'1.2vw',
				'bottom':'7vw',
				'color':'red',
				'text-align':'center',
			},

			'adventuregame h span':{
				'background':'black',
			},

			'adventuregame h span:first-of-type':{ 'padding-left':'0.5vw' },
			'adventuregame h span:last-of-type':{ 'padding-right':'0.5vw' },

			'adventuregame [nPlayer="0"]':{ 'color':'red', },
			'adventuregame [nPlayer="1"]':{ 'color':'blue', },
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

	
	const PUZZLEMAPS = [
		[
			'   ',
			'0++',
			'   ',
		],
		[
			' 1 ',
			' + ',
			' + ',
		],
		[
			'0++',
			'+ +',
			'++1',
		],
		[
			'+++  ',
			'+ +  ',
			'+ 1++',
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

	let $h = $('<h>').appendTo($game).text('');
	let paused = false;

	

	$(`
		<audio autoplay controls loop>
			<source src="./proto/audio/scenery-125577.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0].volume = 0.5;

	let sfx = {};

	sfx.$pops = [];
	sfx.$pops[0] = $(`<audio>
			<source src="./proto/audio/sfx-tinypop.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el);
	sfx.$pops[1] = $(`<audio>
			<source src="./proto/audio/sfx-tinypop-2.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el);
	sfx.$pops[2] = $(`<audio>
			<source src="./proto/audio/sfx-tinypop-3.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el);

	let puzzles = [];
	for(var i=0; i<PUZZLEMAPS.length; i++) puzzles[i] = new AdventureMaze(PUZZLEMAPS[i],sfx);

	let players = [
		{x:0,y:0,tx:0,ty:0,active:true},
		{x:3,y:0,tx:0,ty:0,active:false},
	];

	for(var i=0; i<players.length; i++){
		players[i].$cursor = $('<adventurecursor>').appendTo($anchor);
		players[i].$el = $('<adventureplayer>').appendTo($arena);
	}

	const W2 = 33.3/2;
	const H2 = (33.3/16*10)/2;

	let actors = [
		{
			x:2,
			puzzle:puzzles[0],
			queue:[
				{do:doSay,with:["What's this contraption?"]},
				{do:doPuzzle,with:[puzzles[0]]},
				{do:doSay,with:["Easy peasy."]},
			]
		},
		{
			x:3,
			queue:[
				{do:doSay,with:["Oh! Hello, friend."]},
				{do:doPlayerActivate,with:[1]},
				{do:doSay,with:["Hi, Red. I'm Blue!",1]},
			]
		},
		{	
			x:4,
			puzzle:puzzles[1],
			queue:[
				{do:doSay,with:["Looks like a job for Blue.",1]},
				{do:doPuzzle,with:[puzzles[1]]},
				{do:doSay,with:["Marvellous!",1]},
			],
		},
		{
			x:6,
			puzzle:puzzles[2],
			queue:[
				{do:doPuzzle,with:[puzzles[2]]},
				{do:doSay,with:["That felt like a parable on collaboration!",0]},
				{do:doSay,with:["WTF is a parable?",1]},
				{do:doSay,with:["You, my friend, are a parable.",0]},
				{do:doSay,with:["...?",1]},
			],
		},
		{
			x:8,
			puzzle:puzzles[3],
			queue:[
				{do:doPuzzle,with:[puzzles[3]]},
				{do:doSay,with:["I'm tired of puzzles.",1]},
				{do:doSay,with:["But dude... life itself is a puzzle!",0]},
				{do:doSay,with:["Exactly.",1]},
			],
		},
	];
	for(var a in actors){
		
		if(actors[a].puzzle){
			actors[a].$el = $('<adventurebarrier>').appendTo($arena).css({left:actors[a].x*W2+'vw'});
			actors[a].puzzle.$el.clone().appendTo(actors[a].$el);
		}
	}

	let actorLive;
	let puzzleLive;

	function doActor(actor){
		paused = true;
		actorLive = actor;
		actorLive.activated = true;
		doActorStep();
	}

	function doActorStep(){
		let action = actorLive.queue.shift();
		if(action) action.do.apply(null,action.with);
		else{
			paused = false;
			actorLive.$el.remove();
			actorLive = undefined;
		}
	}

	function doSay(bit,nPlayer){

		$h.attr('nPlayer',nPlayer);

		let len = 0;
		let intSay = setInterval(function(){
			sfx.$pops[len%3][0].play();
			$('<span>'+bit[len]+'</span>').appendTo($h);
			len++;
			if(len>=bit.length){
				clearInterval(intSay);
				setTimeout(finishSay,1500);
			}
		},70)
		//setTimeout(finishSay,1500);
	}

	function finishSay(){
		$h.text('');
		sfx.$pops[0][0].play();
		doActorStep();
	}

	function doPuzzle(puzzle){
		sfx.$pops[1][0].play();
		puzzleLive = puzzle;
		puzzleLive.$el.appendTo($puzzle);
		puzzleLive.callback = onPuzzleComplete;
	}

	function doPlayerActivate(n){
		players[n].active = true;
		doActorStep();
	}

	function onPuzzleComplete(){
		let puzzleDying = puzzleLive;
		puzzleLive = undefined;

		setTimeout(function(){
			sfx.$pops[0][0].play();
			puzzleDying.$el.remove();
			doActorStep();
		},500);
	}

	self.setPlayers = function(p){
		for(var i in players){
			players[i].tx = p[i].X;
			players[i].ty = p[i].Z;
			
			if(players[i].active) players[i].$cursor.css({left:players[i].tx*W2+'vw',bottom:H2+players[i].ty*H2+'vw'});

			if(puzzleLive) puzzleLive.setPlayerCursor(i,players[i].tx*W2,-players[i].ty*H2);
		}
	}

	let ox = 0;
	let walk = 0.01;
	let tolerance = 0.02;

	function tick(){

		if(paused) return;

		let cntActivePlayer = 0;
		let ax = 0;
		for(var i in players){
			
			if(players[i].active){
				let px = players[i].x - ox;
				if(px<(players[i].tx+tolerance)) players[i].x += walk;
				if(px>(players[i].tx-tolerance)) players[i].x -= walk;
				ax += players[i].x;

				cntActivePlayer++;

				//collide with actors
				for(var a in actors){
					
					if(!actors[a].activated){
						let dx = Math.abs( actors[a].x - players[i].x );
						if(dx<0.2) doActor(actors[a]);
					} 
				}
			}

			players[i].$el.css({left:players[i].x*W2+'vw'});
		}

		let oxNew = ax/cntActivePlayer;
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

		self.setPlayers([{X:px,Z:py},{X:px-0.2,Z:py-0.2}]);
	});
}