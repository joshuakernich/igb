BatarangGoon = function(level,x,...path){
	let self = this;
	self.level = level;
	self.x = x;
	self.plantBombAt = undefined;

	let xFloat = x*100;
	let isClimbing = false;

	let iSpeed = 0;
	let speeds = [1.5];

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
			xFloat += speeds[iSpeed++%speeds.length]*dir;
			self.x = xFloat/100;

			//snap to finish
			if(dir==1 && self.x>path[iPath] || dir==-1 && self.x<path[iPath]) self.x = path[iPath];
			
		}
	}

	self.redraw = function(){
		self.$el.css('left',self.x*BatarangGame.GRID+'px');
	}
}

Batarang = function(level, wall, iPlayer){

	const FPS = 50;
	const SECONDS = 1.5;

	let self = this;
	self.level = level;
	self.wall = wall;
	self.iPlayer = iPlayer;
	self.x = 0;
	self.dist = FPS*SECONDS;

	self.$el = $(`
		<batarang iPlayer=${iPlayer}>
			<bataranginner>
				<batarangspinner></batarangspinner>
			</bataranginner>
		</batarang>`);

	self.redraw = function(){
		self.$el.css('left',self.x*BatarangGame.GRID+'px');
		self.$el.css('transform','scale('+(1+self.dist/100*5)+') translateY('+self.dist*1.5+'px)');

		if(self.$reticule) self.$reticule.css('left',self.x*BatarangGame.GRID+'px');
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
				'border-top':'100px solid black',
				'border-bottom':'150px solid #484031',
				'box-sizing':'border-box',
			},

			'.batarangbg':{
				'background':'url(https://img.freepik.com/premium-photo/night-sky-with-full-bright-moon-clouds_366165-1377.jpg?w=360)',
				'background-size':'100%',
				'background-position':'center',
			},

			'.batarangbg audio':{
				'position':'absolute',
				'left':'2vw',
				'bottom':'2vw',

			},

			'.batarangbg:after':{
				content:'""',
				position:'absolute',
				'top':'0px',
				'left':'0px',
				'right':'0px',
				'bottom':'0px',
				'background':'url(./proto/img/lighting-overlay.png)',
				'background-size':'100%',
				'pointer-events':'none',
				'z-index':900,
				'opacity':0.3,
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
				'z-index':2000,
			},

			'bataranglevel':{
				display:'block',
				'height':LEVEL+'px',
				
				
				'background':'#937337',
				'background-image':'url(./proto/img/brick-texture.png)',

				'position':'relative',
				'box-shadow':'inset 0px 10px 0px black',
			},

			'bataranglevel:after':{
				'content':'""',
				'position':'absolute',
				'left':'0px',
				'top':'0px',
				'right':'0px',
				'bottom':'0px',
				'background': 'radial-gradient(transparent, rgba(0,0,0,1))',
			},

			

			'bataranggrid':{
				display:'inline-block',
				'width':BatarangGame.GRID+'px',
				'height':'100%',
				
				
				
				'position':'relative',
				
			},

			'bataranglevel:nth-of-type(3) bataranggrid:not([type=W]):after':{
				'content':'""',
				'position':'absolute',
				'left':'0px',
				'top':'0px',
				'right':'0px',
				'bottom':'0px',
				'background': 'url(./proto/img/bat-arch.png)',
				'z-index':'1',
			},

			'bataranglevel:nth-of-type(2) bataranggrid:not([type=W]):after':{
				'content':'""',
				'position':'absolute',
				'left':'0px',
				'top':'0px',
				'right':'0px',
				'bottom':'0px',
				'background': 'url(./proto/img/bat-window.png)',
				'z-index':'1',
			},

			'bataranglevel:nth-of-type(1)':{
				
				'background': 'url(./proto/img/bat-fence.png)',
				
			},

			'bataranggrid[type=W]':{
				'background':'#DBAD51',
				'background-image':'url(./proto/img/brick-texture.png)',
				'z-index':'1',
			},

			'bataranggrid[type=W]:after':{
				'content':'""',
				'position':'absolute',
				'left':'0px',
				'top':'0px',
				'right':'0px',
				'bottom':'0px',
				'background': 'radial-gradient(transparent, rgba(0,0,0,0.4))',
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
				'width':'300px',
				'height':'200px',
				'left':'-150px',
				'bottom':'0px',
				'margin':'auto',
				'background-color':'transparent',
				'border-radius':'0px',
				'background-image':'url(./proto/img/brick-hole.png)',
				'background-size':'100%',
				'background-position':'top center',
				'background-repeat':'no-repeat',
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
				'left':'-50px',
				'width':'100px',
				'bottom':'0px',
				'height':'170px',
				'background-image':'url(./proto/img/inmate.png)',
				'background-size':'contain',
				'background-position':'center',
				'background-repeat':'no-repeat',	
			},

			'batarang':{
				'display':'block',
				'position':'absolute',
				'left':'50%',
				'top':'50%',
				'width':'0px',
				'height':'0px',
				'z-index':'2',
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
				'box-sizing':'border-box',
				'border-top':'5px solid white',
				'border-bottom':'5px solid black',
			},

			'batarang[iPlayer="0"] batarangspinner':{ 'background':'red' },
			'batarang[iPlayer="1"] batarangspinner':{ 'background':'blue' },

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
			},

			'batbutton':{
				'display':'block',
				'position':'absolute',
				'height':LEVEL+'px',
				'z-index':'1000',
			},

			'batbutton:before':{
				'content':'""',
				'position':'absolute',
				'display':'block',
				'left':'30px',
				'top':'30px',
				'right':'30px',
				'bottom':'30px',
				'border-left':'1px solid white',
				'border-right':'1px solid white',
				'border-radius':'30px',
				'box-sizing':'border-box',
			},

			'batbutton battrigger':{
				'display':'inline-block',
				'width':(BatarangGame.GRID-100)+'px',
				'height':'100%',
				'border':'none',
				'position':'relative',
				'background':'transparent',
				'background-image':'url(./proto/img/bat-icon.webp)',
				'background-image':'url(./proto/img/reticule-white.png)',
				'background-size':'50%',
				'background-position':'center',
				'background-repeat':'no-repeat',
				'margin':'0px 50px',
			},

			'batbutton battrigger:before':{
				'content':'""',
				'position':'absolute',
				'display':'block',
				'left': '0px',
				'top':'50px',
				'right':'0px',
				'bottom':'50px',
				'border-left':'4px solid white',
				'border-right':'4px solid white',
				'border-radius':'20px',
				
				'box-sizing':'border-box',


				
			},

			'bat-reticule':{
				'display':'block',
				'width':'100px',
				'height':LEVEL+'px',
				'background-image':'url(./proto/img/reticule-white.png)',
				'background-size':'100%',
				'background-position':'center',
				'background-repeat':'no-repeat',
				'position':'absolute',
				'bottom':'0px',
				'transform':'translateX(-50%)',
				'z-index':'1',
			},

			'bat-reticule[player="0"]':{
				'background-image':'url(./proto/img/reticule-red.png)',
			},

			'bat-reticule[player="1"]':{
				'background-image':'url(./proto/img/reticule-blue.png)',
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
	let goonZoom;

	let LADDERS = [[],[5.5,13.5,20.5],[4.5,11.5,18.5]];
	let BUTTONS = [
		{level:0, x:2, w:GPW-3, align:'left'},
		{level:1, x:2, w:GPW-3, align:'left'},
		{level:2, x:2, w:GPW-3, align:'left'},

		{level:0, x:GPW+1, w:GPW-2, align:'right'},
		{level:1, x:GPW+1, w:GPW-2, align:'left'},
		{level:2, x:GPW+1, w:GPW-2, align:'right'},

		{level:0, x:GPW*2+1, w:GPW-3, align:'right'},
		{level:1, x:GPW*2+1, w:GPW-3, align:'right'},
		{level:2, x:GPW*2+1, w:GPW-3, align:'right'},
	]
	let EXIT = [11,12,11];
	let PAUSE = 100000;
	let BETWEEN = 10000;
	BETWEEN = PAUSE;
	let SEQUENCE = 1500;

	let isGameActive = true;


	let iQueue = 0;
	/*iQueue = 16;
	iQueue = 31;
	iQueue = 47;
	iQueue = 62;
	iQueue = 85;*/

	
	//iQueue = 6;
	

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



	self.$el = $('<igb class="batarangbg">');

	let map = [
		'W-T----WW-----TWW----T-W',
		'W-T----WWT-----WW----T-W',
		'W-T----WW-----TWW----T-W',
	]

	

	let $game = $('<bataranggame>').appendTo(self.$el);

	for(var i=0; i<map.length; i++){
		let $l = $('<bataranglevel>').appendTo($game);
		$ls[i] = $l;
		for(var g=0; g<map[i].length; g++){
			let $g = $('<bataranggrid>')
			.appendTo($l)
			.attr('level',i)
			.attr('g',g)
			.attr('type',map[i][g]);
		}

		for(var l in LADDERS[i]) $('<batarangladder>').appendTo($ls[i]).css('left',LADDERS[i][l]*BatarangGame.GRID+'px');
	}

	for(var b in BUTTONS){

		let $frame = $('<batbutton>').appendTo($game)
		.css({
			'left':BUTTONS[b].x*BatarangGame.GRID+'px',
			'top':BUTTONS[b].level*LEVEL+'px',
			'width':BUTTONS[b].w*BatarangGame.GRID+'px',
			'text-align':BUTTONS[b].align,
			})
		
		$('<battrigger>').appendTo($frame)
		.attr('level',BUTTONS[b].level)
		.attr('g',BUTTONS[b].x)
		.click(spawnBatarang);



	}

	let $h = $('<h1>').appendTo($game);

	$(`
		<audio autoplay controls loop>
			<source src="./proto/audio/epic-orchestral-drums-171728.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0].volume = 0.5;

	function getXFor(batarang){
		if(batarang.wall==0) return GPW - players[batarang.iPlayer].xFrontToBack;
		if(batarang.wall==1) return GPW + players[batarang.iPlayer].xSideToSide;
		if(batarang.wall==2) return GPW*2 + players[batarang.iPlayer].xFrontToBack;
	}

	let batarangs = [];
	function spawnBatarang(e){
		
		let o = $(this).offset();
		let oGame = $game.offset();

		let level = $(this).attr('level');
		let wall = Math.floor( $(this).attr('g')/GPW );

		let pt = {x:0,y:(((o.top-oGame.top)/scale)/H)*100,z:0};

		pt.y = 50;

		if(wall==0) pt.x = 0;
		if(wall==1) pt.x = ((o.left/scale - W)/W)*100;
		if(wall==2) pt.x = 100;

		if(wall==0) pt.z = ((o.left/scale)/W)*100;
		if(wall==1) pt.z = 0;
		if(wall==2) pt.z = ((o.left/scale-W*2)/W)*100;


		function distanceVector( v1, v2 )
		{
		    var dx = v1.x - v2.x;
		    var dy = v1.y - v2.y;
		    var dz = v1.z - v2.z;

		    return Math.sqrt( dx * dx + dy * dy + dz * dz );
		}

		let min = 99999;
		let iMin = 0;
		for(var i in players){
			let d = distanceVector(players[i].ptVirtual,pt);
			if(d<min){
				min = d;
				iMin = i;
			}
		}
		
		let iPlayer = iMin;

		if(!isGameActive) return;

		if(batarangs[iPlayer]) batarangs[iPlayer].$el.remove();

		let $btn = $(e.target).closest('batbutton')
		.animate({'opacity':0},100)
		.animate({'opacity':0},1400)
		.animate({'opacity':1},200);
		
		let batarang = new Batarang(level,wall,iPlayer);

		batarang.x = getXFor(batarang);
		batarang.$reticule = $('<bat-reticule>').appendTo($ls[batarang.level]).attr('player',iPlayer);
		batarang.redraw();
		batarang.$el.appendTo($ls[batarang.level]);
		batarangs[iPlayer] = batarang;


	}

	let intervalQueue;
	function doNextQueue(){

		clearInterval(intervalQueue);
		let g = queue[iQueue];
		if(!g) return;

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
			if(!isGameActive) goonZoome = g;
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

		for(var b in batarangs){

			if(!batarangs[b]) continue;

			let batarang = batarangs[b];
			batarang.x = getXFor(batarang);
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

				batarang.$reticule.remove();
				batarang.$el.remove();
				batarangs[b] = undefined;

			}
		}
	}
 
	self.setPlayers = function(p){
		players = p;
		players.length = 2;

		for(var i in players){

			players[i].ptVirtual = {x:players[i].px,y:players[i].py,z:100-players[i].pz};
			players[i].ptVirtual.y = 50;
		
			players[i].xSideToSide = players[i].px/100*GPW;
			players[i].xFrontToBack = (1-players[i].pz/100)*GPW;
		}
	}

	self.turnOnOff = function(b){
		clearInterval(interval);
		if(b) interval = setInterval(tick,1000/fps);
	}

	self.turnOnOff(true);

	$game.on('mousemove',function(e){

		let x = (e.pageX/scale)/W*GPW;
		
		players[0].xFrontToBack = players[1].xFrontToBack = GPW-Math.max( 0, Math.min( GPW, x));
		players[0].xSideToSide = players[1].xSideToSide = Math.max( 0, Math.min( GPW, x-GPW));
		if( x>GPW*2 ) players[0].xFrontToBack = players[1].xFrontToBack = Math.max( 0, Math.min( GPW, x-GPW*2));

		
	})

}