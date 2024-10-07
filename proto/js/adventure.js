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

		
		if(!chains[nPlayer].length && type==''+nPlayer){
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

AdventurePop = function(x,y,w,h){
	let self = this;
	let particles = 5;
	let rMin = Math.min(w/4,h/4);
	let rMax = Math.min(w/3,h/3);

	self.$el = $('<adventurepop>');
	for(var i=0; i<particles; i++){

		let pr = rMin + Math.random()*(rMax-rMin);
		let cx = x + w/2;
		let cy = y + h/2;
		let ox = Math.random() * (w/2-pr) * ((Math.random()>0.5)?1:-1);
		let oy = Math.random() * (h/2-pr) * ((Math.random()>0.5)?1:-1);

		let $p = $('<adventureparticle>')
		.appendTo(self.$el)
		.css({
			left:(cx+ox)+'vw',
			top:(cy+oy)+'vw',
			width:(pr*2)+'vw',
			height:(pr*2)+'vw',
		})
		
		.animate({
			left:(cx + ox*2)+'vw',
			top:(cy + oy*2-5-Math.random()*5)+'vw',
			width:'0vw',
			height:'0vw',
		},200+Math.random()*1000);
	}

	setTimeout(self.$el.remove,1500);
}

Adventure = function(){

	if(!Adventure.didInit){

		Adventure.didInit = true;

		let css = {
			'adventurepop':{
				'display':'block',
				'position':'absolute',
			},

			'adventureparticle':{
				'display':'block',
				'position':'absolute',
				'background':'black',
				'transform':'translate(-50%,-50%)',
			},

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
				'width':'15vw',
				'bottom':'-10vw',
				'height':'10vw',
				'background':'black',
			},

			'adventureplatform:after':{
				'content':'""',
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'right':'0px',
				'top':'-2.2vw',
				'height':'3vw',
				'background-image':'url(./proto/img/platform-grass.png)',
				'background-size':'15vw',
				'background-position':'top left',
			},

			'adventurepit':{
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'width':'15vw',
				'height':'10vw',
				'top':'0vw',
				'bottom':'0vw',
				
			},

			'adventurepit:after':{
				'content':'""',
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'right':'0px',
				'bottom':'0px',
				'height':'3vw',
				'background-image':'url(./proto/img/platform-spikes.png)',
				'background-size':'15vw',
				'background-position':'top left',
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

			'adventuremonster':{
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'bottom':'0px',
				'width':'3vw',
				'height':'10vw',
				'background':'black',
				'transform':'translateX(-50%)',
				'text-align':'center',
				'color':'white',
			},

			'adventuremonster:after':{
				'content':'". ."',
				'display':'block',
				'animation':'blink 3s infinite',
				'font-size':'2vw',
				'line-height':'2vw',
				'height':'3.5vw',
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

			'adventurecursor[nPlayer="1"]':{
				'border-color':'blue',
			},

			'adventurecursor.trigger':{
				'border-style':'dashed',
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

			'adventurebanner':{
				'position':'absolute',
				'display':'block',
				'transform':'translateX(-50%)',
				'bottom':'8vw',
				'font-size':'1.5vw',
				'line-height':'1.5vw',
				'color':'white',
			},

			'adventuregame h span:first-of-type':{ 'padding-left':'0.5vw' },
			'adventuregame h span:last-of-type':{ 'padding-right':'0.5vw' },

			'adventuregame [nPlayer="0"]':{ 'color':'red', },
			'adventuregame [nPlayer="1"]':{ 'color':'blue', },

			'adventureaudio':{
				
				'position':'absolute',
				'left':'0px',
				'bottom':'0px',
				'margin':'3vw',
				
				'border-radius':'1vw',
				'text-align':'center',
				'color':'white',
				'line-height':'2vw',
				'font-size':'1.5vw',
			},

			'adventureaudio:after':{
				'content':'"▶"',

			},

			'adventureaudio.playing:after':{
				'content':'"⏸︎"'
			},

			'adventuredeath':{
				'display':'block',
				'position':'absolute',
				'top':'0px',
				'left':'0px',
				'right':'0px',
				'bottom':'0px',
				'background':"url(./proto/img/anim-red.gif)",
				'background-size':'33.3%',
				
				'text-align':'center',
				
			},

			

			'adventuredeath:after':{
				'content':'". ."',
				'display':'block',
				'color':'white',
				'text-shadow':'0px 0px 2vw white',
				'font-size':'13vw',
				'line-height':'10vw',
				'background':'black',
				'position':'absolute',
				'left':'39vw',
				'right':'39vw',
				'top':'5vw',
				'bottom':'0vw',
				'box-shadow':'0px 0px 2vw 1vw red',
				
			},

			'.adventurewrapper:after':{
				'content':'""',
				'display':'block',
				'position':'absolute',
				'box-sizing':'border-box',
				'border-left':'0.1vw dashed black',
				'border-right':'0.1vw dashed black',
				'left':'33.3vw',
				'right':'33.3vw',
				'top':'0px',
				'bottom':'0px',
			}
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
	let $death = $('<adventuredeath>').appendTo(self.$el).hide();
	

	let $anchor = $('<adventureanchor>').appendTo($game);
	let $arena = $('<adventurearena>').appendTo($anchor);
	

	let $h = $('<h>').appendTo($game).text('');
	let paused = false;
	let dead = false;
	let tracking = true;
	

	

	

	let sfx = {};
	sfx.$music = $(`<audio autoplay loop>
			<source src="./proto/audio/scenery-125577.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el);

	sfx.$musicDark = $(`<audio autoplay loop>
			<source src="./proto/audio/scary-forest-90162.mp3" type="audio/mpeg">
		</audio>`).appendTo(sfx.$music);

	sfx.$jumpScare = $(`<audio>
			<source src="./proto/audio/jump-scare.mp3" type="audio/mpeg">
		</audio>`).appendTo(sfx.$music);

	let $btnAudio = $('<adventureaudio>').appendTo(self.$el).click(function(){
		sfx.$music[0].play();
		sfx.$musicDark[0].play();
	})

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

	let monster = {x:-2.8,active:false};
	let $monster = $('<adventuremonster>').appendTo($arena);

	for(var i=0; i<players.length; i++){
		players[i].$cursor = $('<adventurecursor>').appendTo($anchor).attr('nPlayer',i);
		players[i].$el = $('<adventureplayer>').appendTo($arena);
	}

	const W2 = 33.3/2;
	const H2 = (33.3/16*10)/2;
	const PIT = 1.2;

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
			text:"Immersive Gamebox Presents...",
		},
		{
			x:8,
			puzzle:puzzles[2],
			queue:[
				{do:doPuzzle,with:[puzzles[2]]},
				{do:doSay,with:["That felt like a parable on collaboration!",0]},
				{do:doSay,with:["WTF is a parable?",1]},
			],
		},
		{
			x:10,
			text:"An Original Cooperative Adventure...",
		},
		{
			x:12,
			puzzle:puzzles[3],
			queue:[
				{do:doPuzzle,with:[puzzles[3]]},
				{do:doMonsterActivate},
				{do:doSay,with:["I'm tired of puzzles.",1]},
				{do:doSay,with:["But dude... life itself is a puzzle!",0]},
				{do:doSay,with:["Exactly.",1]},
				
			],
		},
		{
			x:14,
			text:"THE FOLLOWER",
			style:{
				'color':'black',
				'bottom':'0vw',
				'font-size':'5vw',
				'line-height':'3.5vw',
			}

		},
		{
			x:16,
			isPit:true,
			queue:[
				{do:doPit,with:[0]},
			]
		},
		
		{
			x:17,
		},
		{
			x:20,
		},
		
	];

	//players[0].x = 14;
	let ox = players[0].x;

	let xMin = -3;
	let xMax = -3;
	for(var a in actors){

		if(actors[a].puzzle){
			actors[a].$el = $('<adventurebarrier>').appendTo($arena).css({left:actors[a].x*W2+'vw'});
			actors[a].puzzle.$el.clone().appendTo(actors[a].$el);
		}

		if(actors[a].text){
			actors[a].$el = $('<adventurebanner>').appendTo($arena).css({left:actors[a].x*W2+'vw'}).text(actors[a].text);
			if(actors[a].style) actors[a].$el.css(actors[a].style);
		}

		xMax = Math.max( actors[a].x, xMax );

		if(actors[a].isPit){
			$('<adventureplatform>').appendTo($arena).css({left:xMin*W2+'vw',width:(xMax-xMin)*W2+'vw'});
			
			let $pit = $('<adventurepit>').appendTo($arena).css({left:xMax*W2+'vw',width:PIT*W2+'vw'});
			xMin = xMax + PIT;
			xMax = xMin;
		}
	}

	if(xMax > xMin) $('<adventureplatform>').appendTo($arena).css({left:xMin*W2+'vw',width:(xMax-xMin)*W2+'vw'});

	let actorLive;
	let puzzleLive;
	let actorTrigger;

	function doActor(actor){
		if(actor.queue && actor.queue.length){
			paused = true;
			actorLive = actor;
			actorLive.activated = true;
			doActorStep();
		}
	}

	function doActorStep(){
		let action = actorLive.queue.shift();
		if(action) action.do.apply(null,action.with);
		else{
			tracking = true;
			paused = false;
			if(actorLive.$el){
				new AdventurePop(-1.5,-5,3,5).$el.css({left:actorLive.x*W2+'vw',bottom:'0px'}).appendTo($arena);
				actorLive.$el.remove();
			}
			actorLive = undefined;
		}
	}

	function doPit(){
		paused = true;
		tracking = false;
		$arena.animate({'bottom':'10vw'},2000);
		$({ax:ox}).animate({ax:actorLive.x+PIT/2}, {
		    duration: 2000,
		    step: function(e) { 
		       ox = e;
		    },
		    complete: doPitGame,
		});
	}

	function doPitGame(){
		doTrigger(-PIT/2,0);
	}

	function doTrigger(x,y){

		for(var i in players){
			if(players[i].active){
				players[i].trigger = {x:x,y:y+0.03*i};
				players[i].trigger.$el = $('<adventurecursor class="trigger">')
				.appendTo($anchor)
				.attr('nPlayer',i)
				.css({left:players[i].trigger.x*W2+'vw',bottom:H2+players[i].trigger.y*H2+'vw'});
			}
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

	function doMonsterActivate(){
		monster.active = true;
		doActorStep();
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

		let didUntrigger = false;

		for(var i=0; i<players.length; i++){
			players[i].tx = p[i].X;
			players[i].ty = p[i].Z;
			
			if(players[i].active){
				players[i].$cursor.css({left:players[i].tx*W2+'vw',bottom:H2+players[i].ty*H2+'vw'});

				if(puzzleLive) puzzleLive.setPlayerCursor(i,players[i].tx*W2,-players[i].ty*H2);
			
				if(players[i].trigger){
					let dx = players[i].tx - players[i].trigger.x;
					let dy = players[i].ty - players[i].trigger.y;
					let d = Math.sqrt(dx*dx+dy*dy);

					if(d<0.1){

						if( players[i].oneToOneTracking ){
							players[i].trigger.$el.remove();
							players[i].trigger = undefined;
							players[i].oneToOneTracking = false;
							players[i].x = actorLive.x + PIT + 0.1;
							players[i].y = 0;
							didUntrigger = true;

						} else {
							players[i].trigger.x += PIT;
							players[i].trigger.$el.css({left:players[i].trigger.x*W2+'vw'});
							players[i].oneToOneTracking = true;
						}
					}
				}
			}
		}


		if(didUntrigger){
			let hasTrigger = false;
			for(var i=0; i<players.length; i++) if( players[i].trigger ) hasTrigger = true;
			if(!hasTrigger) doActorStep();
		}
	}

	
	let walk = 0.01;
	let tolerance = 0.04;

	function tick(){


		
		let didWalkBackwards = false;
		let cntActivePlayer = 0;
		let ax = 0;
		let minx = 999999;
		for(var i in players){
			
			if(players[i].active){
				
				ax += players[i].x;
				minx = Math.min(players[i].x,minx);
				cntActivePlayer++;

				if(!paused){

					let px = players[i].x - ox;
					if(px<(players[i].tx-tolerance)) players[i].x += walk;
					if(px>(players[i].tx+tolerance)){
						players[i].x -= walk;
						didWalkBackwards = true;
					}

					//collide with actors
					for(var a in actors){
						
						if(!actors[a].activated){
							let dx = Math.abs( actors[a].x - players[i].x );
							if(dx<0.2) doActor(actors[a]);
						} 
					}
				} else if( players[i].oneToOneTracking ){
					players[i].x = ox + players[i].tx;
					players[i].y = players[i].ty+0.1;
				}
				
			}

			players[i].$el.css({
				left:players[i].x*W2+'vw', 
				bottom:players[i].y*H2+'vw'});
		}

		if(tracking){
			let oxNew = ax/cntActivePlayer;
			let dx = oxNew - ox;
			if(dx>0.2) ox += walk;
			if(dx<-0.2) ox -= walk;
		}

		
		if(monster.x<(ox-3.1)) monster.x = ox-3.1;
		if(monster.active) monster.x += walk/4;
		


		let dxMonster = minx - monster.x;
		let volume = 1-dxMonster/2;
		sfx.$music[0].volume = Math.max(0, Math.min(0.5,0.5-0.5*volume));
		sfx.$musicDark[0].volume = Math.max(0, Math.min(1,volume));

		if(dxMonster<0.15 && !dead) doDeath();
			

		$arena.css({left:-ox*W2+'vw'});
		//$platform.css({'background-position-x':-ox*W2+'vw'});
		$game.css({'background-position-x':-ox*W2*0.2+'vw'});
		$monster.css({'left':monster.x*W2+'vw'});
	}

	function doDeath(){
		dead = true;
		$death.show();
		paused = true;
		sfx.$jumpScare[0].volume = 0.5;
		sfx.$jumpScare[0].play();
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