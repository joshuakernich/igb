


BatarangGoon = function(level,x,...path){
	let self = this;
	self.level = level;
	self.x = x;
	self.plantBombAt = undefined;

	let xFloat = x*100;
	let isClimbing = false;

	let speed = 2;

	self.$el = $('<bataranggoon>');

	let iPath = 0;
	self.step = function(){
		
		if(isClimbing) return;

		if(self.x==path[iPath]){
			iPath++;
			if(path[iPath]=='U'){

				// climb up
				isClimbing = true;
				self.$el.animate({'bottom':'250px'},{easing:'linear',duration:1000,complete:function(){
					self.level--;
					iPath++;
					isClimbing = false;
					
				}})

			} else if(path[iPath]=='D'){

				// climb down
				isClimbing = true;
				self.$el.animate({'bottom':'-250px'},{easing:'linear',duration:1000,complete:function(){
					self.level++;
					iPath++;
					isClimbing = false;
				}})
				
			} else if(path[iPath]=='B'){
				self.plantBombAt = self.x;
				iPath++;
			} else if(path[iPath]=='E'){
				self.dead = true;
			} 
		} else {
			dir = self.x<path[iPath]?1:-1
			xFloat += speed*dir;
			self.x = xFloat/100;

			//snap to finish
			if(dir==1 && self.x>path[iPath] || dir==-1 && self.x<path[iPath]) self.x = path[iPath];
			
		}
	}

	self.redraw = function(){
		self.$el.css('left',self.x*BatarangGame.GRID+'px');
	}
}

Batarang = function(level, wall, x){

	const FPS = 50;
	const SECONDS = 1;

	let self = this;
	self.level = level;
	self.wall = wall;
	self.x = 0;
	self.dist = FPS*SECONDS;

	self.$el = $(`
		<batarang>
			<bataranginner>
				<batarangspinner></batarangspinner>
			</bataranginner>
		</batarang>`);

	self.redraw = function(){
		self.$el.css('left',self.x*BatarangGame.GRID+'px');
		self.$el.css('transform','scale('+(1+self.dist/100*5)+') translateY('+self.dist*2+'px)');
	}
}




BatarangGame = function(){
	
	let W = 1600;
	let H = 1000;
	let GPW = 8; //GRIDS PER WALL
	BatarangGame.GRID = W/GPW;
	let LEVEL = 250;

	if(!BatarangGame.didInit){

		BatarangGame.didInit = true;

		let css = {

			'bataranggame':{
				display:'block',
				position:'absolute',
				'top':'0px',
				'left':'0px',
				width:W*3+'px',
				height:H+'px',
				'transform-origin':'top left',
				'perspective':W+'px',
				
				'text-align':'center',
				'border-top':'100px solid #222',
				'border-bottom':'150px solid #666',
				'box-sizing':'border-box',
			},

			'bataranggame h1':{
				'position':'absolute',
				'left':'0px',
				'right':'0px',
				'top':'-100px',
				'line-height':H+'px',
				'font-size':'150px',
				'color':'white',
				'padding':'0px',
				'margin':'0px',
				'pointer-events':'none',
			},

			'bataranglevel':{
				display:'block',
				'height':LEVEL+'px',
				
				
				'background':'#555',
				'position':'relative',
				'box-shadow':'inset 0px 10px 0px black',
			},

			'bataranggrid':{
				display:'inline-block',
				'width':BatarangGame.GRID+'px',
				'height':'100%',
				
				
				
				'position':'relative',
				
			},

			'bataranggrid[type=W]':{
				'background':'#999',
				'z-index':'1',
			},

			'batarangladder:after':{
				'content':'""',
				'display':'block',
				'position':'absolute',
				
				'width':'50px',
			
				'height':LEVEL+'px',
				'left':'-25px',
				'bottom':'0px',
				'margin':'auto',
				
				'border-left':'10px solid black',
				'border-right':'10px solid black',
				'box-sizing':'border-box',
			},

			'batarangbomb:after':{
				'content':'""',
				'display':'block',
				'position':'absolute',
				
				'width':'80px',
				'height':'80px',
				'left':'-40px',
				'bottom':'0px',
				'margin':'auto',
				
				'border-radius':'100%',
				'background':'#222',
			},

			'batarangbomb.explode:after':{
				'width':'200px',
				'height':'200px',
				'left':'-100px',
				'bottom':'-75px',
				'background':'red',
			},

			'batarangbomb.exploded:after':{
				'content':'""',
				'display':'block',
				'position':'absolute',
				
				'width':'150px',
				'height':'150px',
				'left':'-75px',
				'bottom':'0px',
				'margin':'auto',
				
				'border-radius':'100% 100% 0px 0px',
				'background':'black',
			},



			'batarangzone':{
				'width':(W-300)+'px',
				'display':'inline-block',
				'height':(LEVEL-100)+'px',
				'top':'50px',
				'border':'5px dashed white',
				'box-sizing':'border-box',
				'position':'absolute',
			},

			'bataranggoon, batarangladder, batarangbomb':{
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'bottom':'0px',
			},

			'bataranggoon:after':{
				'content':'""',
				'display':'block',
				'position':'absolute',
				'left':'-30px',
				'width':'60px',
				'bottom':'0px',
				'height':'150px',
				'background':'orange',
				'border-radius':"30px 30px 0px 0px",
			},

			'batarang':{
				'display':'block',
				'position':'absolute',
				'left':'50%',
				'top':'50%',
				'width':'0px',
				'height':'0px',
				'z-index':'1',
			},

			'bataranginner':{
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'top':'0px',
				'width':'0px',
				'height':'0px',
				'transform':'scaleY(0.5)',
			},

			'batarangspinner':{
				'display':'block',
				'position':'absolute',
				'left':'-50px',
				'top':'-20px',
				'width':'100px',
				'height':'40px',
				'background':'black',
				'border-radius':"100% 100% 0px 0px",
				'animation':'spin',
				'animation-duration':'0.5s',
				'animation-iteration-count':'infinite',
				'animation-timing-function':'linear',
			},

			'batarangpulse':{
				'display':'block',
				'position':'absolute',
				'top':'50%',
				'width':'100px',
				'height':'100px',
				'transform':'translate(-50%,-50%)',
				'box-sizing':'border-box',
				'border':'10px solid red',
				'border-radius':'100%',
			}

		}

		$("head").append('<style>'+Css.of(css)+'</style>');
	}

	let self = this;
	let wWas = 0;
	let fps = 50;
	let interval;
	let goons = [];
	let $ls = [];
	
	let xSideToSide = 0;
	let xFrontToBack = 0;
	let batarang;

	let LADDERS = [[],[5,14,20],[3,13,18]];
	let EXIT = [10,12,11];
	let PAUSE = 100000;
	let BETWEEN = 10000;
	let SEQUENCE = 1500;

	let isGameActive = true;


	let iQueue = 0;
	/*iQueue = 16;
	iQueue = 31;
	iQueue = 47;
	iQueue = 62;
	iQueue = 85;*/

	

	

	let queue = [
		'ROUND', // ROUND 1
		1000,
		new BatarangGoon(0,GPW*2,EXIT[0],'B',EXIT[0]+1.5,EXIT[0],'E'), // BOMBER 1
		PAUSE,
		'GO',
		1000,
		new BatarangGoon(1,GPW,LADDERS[1][1],'U',EXIT[0],'E'),
		BETWEEN,
		new BatarangGoon(2,GPW*2,LADDERS[2][1],'U',LADDERS[1][0],'U',EXIT[0],'E'),
		BETWEEN,
		new BatarangGoon(2,0,LADDERS[2][1],'U',LADDERS[1][1],'U',EXIT[0],'E'),
		BETWEEN,
		new BatarangGoon(1,GPW*3,LADDERS[1][2],'U',EXIT[0],'E'),
		BETWEEN,
		new BatarangGoon(2,0,LADDERS[2][0],'U',LADDERS[1][0],'U',EXIT[0],'E'),
		PAUSE,
		'ROUND', // ROUND 2
		2000,
		'GO',
		1000,
		new BatarangGoon(1,GPW,LADDERS[1][1],'U',EXIT[0],'E'),
		BETWEEN,
		new BatarangGoon(1,GPW*3,LADDERS[1][2],'U',EXIT[0],'E'),
		new BatarangGoon(2,GPW*3,LADDERS[2][1],'U',LADDERS[1][1],'U',EXIT[0],'E'),
		BETWEEN,
		new BatarangGoon(1,0,LADDERS[1][0],'U',EXIT[0],'E'),
		new BatarangGoon(2,0,LADDERS[2][0],'U',LADDERS[1][0],'U',EXIT[0],'E'),
		BETWEEN,
		new BatarangGoon(2,GPW,LADDERS[2][1],'U',LADDERS[1][1],'U',EXIT[0],'E'),
		new BatarangGoon(2,GPW*2,LADDERS[2][1],'U',LADDERS[1][1],'U',EXIT[0],'E'),
		PAUSE,
		'ROUND', // ROUND 3
		2000,
		'GO',
		1000,
		new BatarangGoon(0,GPW*3,EXIT[0],'E'),
		new BatarangGoon(1,GPW*3,LADDERS[1][2],'U',EXIT[0],'E'),
		new BatarangGoon(2,GPW*3,LADDERS[2][2],'U',LADDERS[1][2],'U',EXIT[0],'E'),
		BETWEEN+5000,
		new BatarangGoon(0,0,EXIT[0],'E'),
		new BatarangGoon(1,0,LADDERS[1][0],'U',EXIT[0],'E'),
		new BatarangGoon(2,0,LADDERS[2][0],'U',LADDERS[1][0],'U',EXIT[0],'E'),
		BETWEEN+5000,
		new BatarangGoon(0,GPW*2,EXIT[0],'E'),
		new BatarangGoon(1,GPW,LADDERS[1][1],'U',EXIT[0],'E'),
		new BatarangGoon(2,GPW*2,LADDERS[2][1],'U',LADDERS[1][1],'U',EXIT[0],'E'),
		PAUSE,
		'ROUND', // ROUND 4
		1000,
		new BatarangGoon(1,GPW*2,EXIT[1],'B',EXIT[1]+1.5,EXIT[1],'E'), // BOMBER 2
		PAUSE,
		'GO',
		1000,
		new BatarangGoon(1,0,EXIT[1],'E'),
		new BatarangGoon(1,GPW*3,EXIT[1],'E'),
		BETWEEN,
		new BatarangGoon(0,0,EXIT[0],'E'),
		new BatarangGoon(0,GPW*3,EXIT[0],'E'),
		BETWEEN,
		new BatarangGoon(2,0,LADDERS[2][0],'U',EXIT[1],'E'),
		new BatarangGoon(2,GPW*3,LADDERS[2][2],'U',LADDERS[1][1],'U',EXIT[0],'E'),
		PAUSE,
		'ROUND', // ROUND 5
		2000,
		'GO', 
		1000,
		new BatarangGoon(2,GPW*3,LADDERS[2][2],'U',LADDERS[1][1],'U',EXIT[0],'E'),
		SEQUENCE,
		new BatarangGoon(2,GPW*3,LADDERS[2][1],'U',EXIT[1],'E'),
		SEQUENCE,
		new BatarangGoon(2,GPW*3,LADDERS[2][2],'U',EXIT[1],'E'),
		BETWEEN+5000,
		new BatarangGoon(2,0,LADDERS[2][0],'U',LADDERS[1][0],'U',EXIT[0],'E'),
		SEQUENCE,
		new BatarangGoon(2,0,LADDERS[2][0],'U',EXIT[1],'E'),
		SEQUENCE,
		new BatarangGoon(2,0,LADDERS[2][1],'U',LADDERS[1][1],'U',EXIT[0],'E'),
		BETWEEN+5000,
		new BatarangGoon(0,GPW*3,LADDERS[1][2],'D',EXIT[1],'E'),
		SEQUENCE,
		new BatarangGoon(0,GPW*3,EXIT[0],'E'),
		SEQUENCE,
		new BatarangGoon(0,GPW*3,LADDERS[1][2],'D',LADDERS[2][2],'D',LADDERS[2][1],'U',EXIT[1],'E'),
		SEQUENCE,
		new BatarangGoon(0,0,LADDERS[1][0],'D',EXIT[1],'E'),
		SEQUENCE,
		new BatarangGoon(0,0,EXIT[0],'E'),
		SEQUENCE,
		new BatarangGoon(0,0,LADDERS[1][0],'D',EXIT[1],'E'),
		PAUSE,
		'ROUND', // ROUND 6
		1000,
		new BatarangGoon(2,GPW*2,EXIT[2],'B',EXIT[2]+1.5,EXIT[2],'E'), // BOMBER 3
		PAUSE,
		'GO',
		1000,
		new BatarangGoon(2,GPW*3,EXIT[2],'E'),
		SEQUENCE,
		new BatarangGoon(2,GPW*3,EXIT[2],'E'),
		SEQUENCE,
		new BatarangGoon(2,0,EXIT[2],'E'),
		SEQUENCE,
		new BatarangGoon(2,0,EXIT[2],'E'),
		SEQUENCE,
		new BatarangGoon(1,GPW*3,EXIT[1],'E'),
		SEQUENCE,
		new BatarangGoon(1,GPW*3,EXIT[1],'E'),
		SEQUENCE,
		new BatarangGoon(1,0,EXIT[1],'E'),
		SEQUENCE,
		new BatarangGoon(1,0,EXIT[1],'E'),
		SEQUENCE,
		new BatarangGoon(0,GPW*3,EXIT[0],'E'),
		SEQUENCE,
		new BatarangGoon(0,GPW*3,EXIT[0],'E'),
		SEQUENCE,
		new BatarangGoon(0,0,EXIT[0],'E'),
		SEQUENCE,
		new BatarangGoon(0,0,EXIT[0],'E'),
		PAUSE,
		'ROUND', // ROUND 7
		2000,
		'GO', 
		1000,
		new BatarangGoon(2,GPW*3,EXIT[2],'E'),
		SEQUENCE,
		new BatarangGoon(2,0,EXIT[2],'E'),
		SEQUENCE,
		new BatarangGoon(1,GPW*3,EXIT[1],'E'),
		SEQUENCE,
		new BatarangGoon(1,0,EXIT[1],'E'),
		SEQUENCE,
		new BatarangGoon(0,GPW*3,EXIT[0],'E'),
		SEQUENCE,
		new BatarangGoon(0,0,EXIT[0],'E'),
		SEQUENCE,
		new BatarangGoon(2,GPW*3,EXIT[2],'E'),
		SEQUENCE,
		new BatarangGoon(2,0,EXIT[2],'E'),
		SEQUENCE,
		new BatarangGoon(1,GPW*3,EXIT[1],'E'),
		SEQUENCE,
		new BatarangGoon(1,0,EXIT[1],'E'),
		SEQUENCE,
		new BatarangGoon(0,GPW*3,EXIT[0],'E'),
		SEQUENCE,
		new BatarangGoon(0,0,EXIT[0],'E'),
		PAUSE,
	]

	let skipToRound = 1;
	while(skipToRound){
		if(queue[iQueue]=='ROUND'){
			skipToRound--;
		} 
		iQueue++;
	}
	iQueue--;



	self.$el = $('<igb>');

	let map = [
		'W------WW------WW------W',
		'W------WW------WW------W',
		'W------WW------WW------W',
	]

	let $game = $('<bataranggame>').appendTo(self.$el);

	for(var i=0; i<map.length; i++){
		let $l = $('<bataranglevel>').appendTo($game);
		$ls[i] = $l;
		for(var g=0; g<30; g++){
			$('<bataranggrid>')
			.appendTo($l)
			.attr('level',i)
			.attr('g',g)
			.attr('type',map[i][g])
			.click(spawnBatarang);
		}

		
		for(var l in LADDERS[i]) $('<batarangladder>').appendTo($ls[i]).css('left',LADDERS[i][l]*BatarangGame.GRID+'px');
		
	
	}

	let $h = $('<h1>').appendTo($game);

	function getXFor(wall){
		if(wall==0) return GPW - xFrontToBack;
		if(wall==1)	return GPW + xSideToSide;
		if(wall==2) return GPW*2 + xFrontToBack;
	}

	function spawnBatarang(e){
		if(!isGameActive) return;
		let level = $(this).attr('level');
		let wall = Math.floor( $(this).attr('g')/GPW );
		
		batarang = new Batarang(level,wall,getXFor(wall));
		batarang.redraw();
		batarang.$el.appendTo($ls[batarang.level]);
	}


	
	let intervalQueue;
	function doNextQueue(){

		clearInterval(intervalQueue);
		let g = queue[iQueue];
		if(!g) return;

		console.log('spawnGoon',g);
		iQueue++;

		if(g=='ROUND'){
			$h.text('GET READY...');
			isGameActive = false;
			doNextQueue();
		} else if(g=='GO'){
			$h.text('GO!');
			isGameActive = true;
			setTimeout(function(){$h.text('')},1000);
			doNextQueue();
		} else if(isNaN(g)){
			//spawn the goon
			g.redraw();
			g.$el.appendTo($ls[g.level]);
			goons.push(g);
			doNextQueue();
		} else{
			intervalQueue = setTimeout(doNextQueue,g);
		}
	}

	doNextQueue();

	function tick(){

		let wScreen = self.$el.width();
		if(wScreen != wWas){
			scale = wScreen/(W*3);
			$game.css('transform','scale('+scale+')');
			wWas = wScreen;
		}

		let didGoonDie = false;
		for(var g in goons){
			
			goons[g].step();
			goons[g].redraw();
			
			if( !goons[g].$el.parent().is($ls[goons[g].level])){
				goons[g].$el.appendTo($ls[goons[g].level]);
				goons[g].$el.css({'bottom':'0px'});
			}
			
			if(goons[g].plantBombAt){

				let $bomb = $('<batarangbomb>')
				.prependTo($ls[goons[g].level])
				.css('left',goons[g].x*BatarangGame.GRID+'px');

				setTimeout(function(){
					$bomb.addClass('explode');
				},1000);

				setTimeout(function(){
					$bomb.removeClass('explode');
					$bomb.addClass('exploded');
				},1500);

				goons[g].plantBombAt = undefined;

			}

			if( goons[g].dead ){
				goons[g].$el.remove();
				goons.splice(g,1);
				g--;
				didGoonDie = true;
				
			}
			if(didGoonDie && !goons.length) doNextQueue();
		}

		if(batarang){
			batarang.x = getXFor(batarang.wall);
			batarang.dist --;
			batarang.redraw();

			if(batarang.dist == 0){
				
				$('batarangpulse').remove();

				$('<batarangpulse>')
				.appendTo($ls[batarang.level])
				.css('left',batarang.x*BatarangGame.GRID+'px')
				.animate({width:'200px',height:'200px','opacity':0})

				for(var g=0; g<goons.length; g++){
					
					if(goons[g].level==batarang.level){
						let dx = Math.abs( goons[g].x - batarang.x );
						if(dx<0.5){
							goons[g].$el.remove();
							goons.splice(g,1);
							g--;
							if(!goons.length) doNextQueue();
						}
					}
					

				}

				batarang.$el.remove();
				batarang = undefined;

			}
		}
	}
 
	self.setPlayers = function(p){
		xSideToSide = p[0].px/100*GPW;
		xFrontToBack = (1-p[0].pz/100)*GPW;
	}

	self.turnOnOff = function(b){
		clearInterval(interval);
		if(b) interval = setInterval(tick,1000/fps);
	}

	self.turnOnOff(true);

	$game.on('mousemove',function(e){

		let x = (e.pageX/scale)/W*GPW;
		
		xFrontToBack = GPW-Math.max( 0, Math.min( GPW, x));
		xSideToSide = Math.max( 0, Math.min( GPW, x-GPW));
		if( x>GPW*2 ) xFrontToBack = Math.max( 0, Math.min( GPW, x-GPW*2));

		
	})

}