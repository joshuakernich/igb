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
				self.$el.delay(100).animate({'bottom':BatarangGame.LEVEL+'px'},{easing:'linear',duration:2500,complete:function(){
					self.level--;
					iPath++;
					isClimbing = false;
				}})


			} else if(path[iPath]=='D'){

				// climb down
				isClimbing = true;
				self.$el.delay(100).animate({'bottom':-BatarangGame.LEVEL+'px'},{easing:'linear',duration:2500,complete:function(){
					self.level++;
					iPath++;
					isClimbing = false;
				}})

				
				
			} else if(path[iPath]=='B'){
				self.plantBombAt = self.x;
				iPath++;
			} else if(path[iPath]=='E'){
				isClimbing = true;
				isClimbing = true;
				self.$el.delay(100).animate({'bottom':'-0px'},{duration:500,complete:function(){
					self.dead = true;
				}})
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
		self.$el.css('left',(self.x%1)*BatarangGame.GRID+'px');
	}
}

Batarang = function(level, wall, iPlayer){

	const LEVEL = 250;
	const FPS = 50;
	const SECONDS = 0.5;
	const TICKS = FPS*SECONDS;
	const YTRAVEL = LEVEL*3.2 - level*LEVEL;
	const LOCKING = FPS * 1;

	let self = this;
	self.level = level;
	self.wall = wall;
	self.iPlayer = iPlayer;
	self.x = 0;
	self.dist = TICKS;
	self.flying = false;
	self.$reticule = undefined;
	self.locking = 0;

	self.$el = $(`
		<batarang iPlayer=${iPlayer}>
			<bataranginner>
				<batarangspinner></batarangspinner>
			</bataranginner>
		</batarang>`);

	self.redraw = function(){

		let amt = self.dist/TICKS;

		let wx = self.x%BatarangGame.GPW;

		//clamp reticule and adjust x to suit
		wx = Math.max( 1, Math.min(BatarangGame.GPW-1, wx));
		self.x = self.wall * BatarangGame.GPW + wx;

		self.$el.css('left',wx*BatarangGame.GRID+'px');
		self.$el.css('top',LEVEL/2 + amt*YTRAVEL+'px');
		self.$el.css('transform','scale('+(1+self.dist/100*5)+')');

		//TODO convert x into local coordinates
		if(self.$reticule) self.$reticule.css('left',wx*BatarangGame.GRID+'px');

		self.$reticule.css({
			width:100 + self.locking/LOCKING * 100,
			height:50 + self.locking/LOCKING * 100,
		})
	}

	self.doFlying = function(){
		self.$el.addClass('flying');
		//self.$reticule.addClass('locked');
		self.flying = true;
	}

	self.die = function() {
		self.$el.remove();
		self.$reticule.remove();
	}
}

BatarangScope = function(W,H){

	let self = this;	

	self.$el = $(`
		<bat-scope>
			
		</bat-scope>
	`);

	const HOLE = 300;
	const EDGE = 200;
	const MIDY = H*0.42;
	const RANGEY = H*0.8;

	self.redraw = function(nPlayer, y) {

		let py = MIDY + RANGEY*y;
		
		let rect = {top:py-HOLE/2, left:EDGE, right:W-EDGE, bottom:py+HOLE/2 };
		
		self.$el.attr('nPlayer',nPlayer);

		self.$el.html(`
		<bat-scope-bit class='top' style='height:${rect.top}px'></bat-scope-bit>
		<bat-scope-bit class='left' style='top:${rect.top}px;width:${rect.left}px'></bat-scope-bit>
		<bat-scope-bit class='right' style='top:${rect.top}px;left:${rect.right}px'></bat-scope-bit>
		<bat-scope-bit class='bottom' style='top:${rect.bottom}px;'></bat-scope-bit>
		<bat-scope-frame style='top:${rect.top}px; left:${rect.left}px; right:${W-rect.right}px; bottom:${H-rect.bottom}px;'></bat-scope-bit>
		`);
	}

	
}


BatarangGame = function(){
	
	let W = BatarangGame.W = 1600;
	let H = BatarangGame.H = 1000;
	let GPW = BatarangGame.GPW = 8; //GRIDS PER WALL
	let GRID = BatarangGame.GRID = W/GPW;
	let LEVEL = BatarangGame.LEVEL = 200;
	const PROXIMITY = 0.8;
	const PADDING_TOP = 100;
	const WALLS = 1;

	const Z_BG = 1;
	const Z_MG = 2;
	const Z_FG = 3;
	const Z_LIGHTING = 4;
	const Z_FOCUS = 5;
	const Z_ZOOM = 6;
	const Z_UX = 7;
	const Z_TOP = 8;

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
			},

			'batarangscroller':{
				'padding-top':PADDING_TOP+'px',
				display:'block',
				position:'absolute',
				'top':'0px',
				'left':'0px',
				'bottom':'0px',
				'box-sizing':'border-box',
				'border-bottom':(H-LEVEL*2-PADDING_TOP)+'px solid #484031',
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
				'z-index':Z_LIGHTING,
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
				'z-index':Z_TOP,
			},

			'batarangzoomer':{
				'display':'inline-block',
				'position':'relative',
				'height':LEVEL+'px',
				'box-sizing':'border-box',
				'overflow':'hidden',
			},

			'batarangzoomerworld':{
				'display':'inline-block',
			
				'position':'relative',
				'height':LEVEL+'px',

			},

			'bataranglevel':{
				display:'block',
				'height':LEVEL+'px',
				
				
				'position':'relative',
				
				
				'transform':'scale(1)',
			},

			'bataranglevel:after':{
				'content':'""',
				'position':'absolute',
				'left':'0px',
				'top':'0px',
				'right':'0px',
				'bottom':'0px',
				'display':'none',
			},

			'bataranggrid':{
				display:'inline-block',
				'width':BatarangGame.GRID+'px',
				'height':'100%',
				'position':'relative',
			},

			'bataranggrid:before':{
				'content':'""',
				'position':'absolute',
				'left':'0px',
				'top':'0px',
				'right':'0px',
				'bottom':'0px',
				'background':'#6B5628',
				'background-image':'url(./proto/img/brick-texture.png)',
				'background-size':'100%',
				'background-position':'center',
				'z-index':Z_BG,
			},

			'bataranggrid:after':{
				'background-size':'100%',
				'background-position':'center',
			},

			'bataranglevel:nth-of-type(3) bataranggrid:not([type=W]):after':{
				'content':'""',
				'position':'absolute',
				'left':'0px',
				'top':'0px',
				'right':'0px',
				'bottom':'0px',
				'background-image': 'url(./proto/img/bat-arch.png)',
				'background-position':'top center',
				'z-index':Z_FG,
			},

			'bataranglevel:nth-of-type(2) bataranggrid:not([type=W]):after':{
				'content':'""',
				'position':'absolute',
				'left':'0px',
				'top':'0px',
				'right':'0px',
				'bottom':'0px',
				'background-image': 'url(./proto/img/bat-window.png)',
				'z-index':Z_FG,
			},

			'bataranglevel:nth-of-type(1) bataranggrid:before':{
				'background': 'url(./proto/img/bat-fence.png)',
			},

			'bataranggrid[type=W]':{
				
				
			},

			'bataranggrid[type=W]:after':{
				'content':'""',
				'position':'absolute',
				'left':'0px',
				'top':'0px',
				'right':'0px',
				'bottom':'0px',
				'background':'#DBAD51',
				'background-image':'url(./proto/img/brick-texture.png)',
				'z-index':Z_FG,
			},

			'bataranggrid.destroyed:before':{
				'display':'none',
			},

			'bataranggrid.destroyed:after':{
				'display':'none',
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
				
				'background':'url(./proto/img/ladder.png)',
				'background-size':'100%',
				'box-sizing':'border-box',
				'transform':'rotate(2deg)',
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
				'width':GRID+'px',
				'height':LEVEL+'px',
				'left':-GRID/2+'px',
				'bottom':'0px',
				'background':'url(./proto/img/bat-explosion.gif)',
				'background-position':'center',
				'background-size':'150%',
				'border-radius':'0px',
				'z-index':Z_UX,
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
				'z-index':Z_MG,
			},

			'bataranggoon:after':{
				'content':'""',
				'display':'block',
				'position':'absolute',
				'left':'-50px',
				'width':'100px',
				'bottom':'0px',
				'height':LEVEL*0.7+'px',
				'background-image':'url(./proto/img/inmate.png)',
				'background-size':'contain',
				'background-position':'center',
				'background-repeat':'no-repeat',	
			},

			'batarang':{
				'display':'block',
				'position':'absolute',
				
				'width':'0px',
				'height':'0px',
				'z-index':Z_TOP,
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
				
				'box-sizing':'border-box',
				'border-top':'5px solid white',
				'border-bottom':'5px solid black',
				'transform':'rotate(15deg)',
			},

			'batarang.flying batarangspinner':{
				'animation':'spin',
				'animation-duration':'0.5s',
				'animation-iteration-count':'infinite',
				'animation-timing-function':'linear',
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
				'z-index':Z_UX,
			},

			'bataranglevel.focus':{
				'z-index':Z_FOCUS,
			},

			'bataranglevel.focus batarangzoomer batarangzoomerworld':{
				'filter': 'grayscale(100%) contrast(100%) invert(100%)',
			},

			'bataranglevel.focus batarangzoomer':{
				'transform':'scale(1.2)',
				'transition':'transform 0.7s',
				'z-index':Z_ZOOM,
			},

			'batarangzoomer:before':{
				'content':'""',
				'position':'absolute',
				'display':'block',
				'left':'10px',
				'top':'10px',
				'bottom':'10px',
				'width':BatarangGame.GRID/4+'px',
				'border-top':'3px solid',
				'border-left':'3px solid',
				'border-bottom':'3px solid',
				'box-sizing':'border-box',
				'transition':'0.5s',
				'border-color':'inherit',
				'z-index':Z_UX,
			},

			'batarangzoomer:after':{
				'content':'""',
				'position':'absolute',
				'display':'block',
				'right':'10px',
				'top':'10px',
				'bottom':'10px',
				'width':BatarangGame.GRID/4+'px',
				'border-top':'solid',
				'border-right':'solid',
				'border-bottom':'solid',
				'border-width':'3px',
				'box-sizing':'border-box',
				'transition':'0.5s',
				'border-color':'inherit',
				'z-index':Z_UX,
			},

			'bataranglevel batarangzoomer:not(.focus)':{
				'border-color':'cyan',
			},

			'bataranglevel.focus batarangzoomer:before':{
				'border-width':'10px',
				'top':'0px',
				'left':'0px',
				'bottom':'0px',
			},

			'bataranglevel.focus batarangzoomer:after':{
				'border-width':'10px',
				'top':'0px',
				'right':'0px',
				'bottom':'0px',
			},

			'bataranglevel[player="0"] batarangzoomer':{ 
				'border-color':'red',
			},

			'bataranglevel[player="1"] batarangzoomer':{ 
				'border-color':'blue' 
			},


			'bat-reticule':{
				'display':'block',
				'width':'100px',
				'height':'50px',
				'position':'absolute',
				'top':'50%',
				'transform':'translate(-50%,-50%)',
				'z-index':Z_UX,
				
			},

			'bat-reticule:before':{
				'content':'""',
				'display':'block',
				'position':"absolute",
				'left':'0px',
				'top':'0px',
				'bottom':'0px',
				'width':'20px',
				'border-left':'10px solid',
				'border-top':'10px solid',
				'border-bottom':'10px solid',
				'border-color':'inherit',
			},

			'bat-reticule:after':{
				'content':'""',
				'display':'block',
				'position':"absolute",
				'right':'0px',
				'top':'0px',
				'bottom':'0px',
				'width':'20px',
				'border-right':'10px solid',
				'border-top':'10px solid',
				'border-bottom':'10px solid',
				'border-color':'inherit',
			},


			'bat-reticule[player="0"]':{ 'border-color':'red', },			
			'bat-reticule[player="1"]':{ 'border-color':' blue', },

			'bat-scope':{
				'position':'absolute',
				'display':'block',
				'top':'0px',
				'left':'0px',
				'width':W+'px',
				'height':H+'px',		
				
				'z-index':Z_UX,
			},

			'bat-scope-bit':{
				'position':'absolute',
				'display':'block',
				'backdrop-filter':'blur(50px)',
				'background':'rgba(0,0,0,0.5)',
			},

			'bat-scope-bit.top':{
				'top':'0px',
				'left':'0px',
				'right':'0px',
				'height':'100px',
			},

			'bat-scope-bit.left':{
				'top':'100px',
				'left':'0px',
				'bottom':'300px',
				'width':'300px',
			},

			'bat-scope-bit.right':{
				'top':'100px',
				'right':'0px',
				'left':'300px',
				'bottom':'300px',
			},

			'bat-scope-bit.bottom':{
				'left':'0px',
				'right':'0px',
				'bottom':'0px',
			},

			'bat-scope-frame':{
				'position':'absolute',
				'box-sizing':'border-box',
				'border':'5px solid cyan',
			},

			'bat-scope[nPlayer="0"] bat-scope-frame':{
				'border':'5px solid red',
			},

			'bat-scope[nPlayer="1"] bat-scope-frame':{
				'border':'5px solid blue',
			},

			'batarangwall':{
				'width':W+'px',
				'display':'inline-block',
				'height':LEVEL*3+'px',
			},
		}

		$("head").append('<style>'+Css.of(css)+'</style>');
	}

	let self = this;
	let wWas = 0;
	const FPS = 50;
	const LOCKING = 1 * FPS;
	let interval;
	let goons = [];
	let $ls = []; //levels in the structure $ls[nWall][nLevel]
	let $gs = []; //grids in the structure $ls[nLevel][nGrid]
	
	let xSideToSide = 0;
	let xFrontToBack = 0;
	let batarang;
	let goonZoom;

	let LADDERS = [[],[5.5,13.5,19.5],[4.5,12.5,20.5]];
	let EXIT = [10.5,11.5,10.5];

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

	
	//iQueue = 10;
	

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

	let $game = $('<bataranggame>').appendTo(self.$el);
	let $scroller = $('<batarangscroller>').appendTo($game);

	
	for(var w=0; w<3; w++){
		let $wall = $('<batarangwall>').appendTo($scroller);
		$ls[w] = [];
		for(var l=0; l<3; l++){

			let $level = $('<bataranglevel>')
			.appendTo($wall)
			.attr('level',l)
			.attr('wall',w)
			.click(onZone);

			$ls[w][l] = $level;

			let $zoomer = $('<batarangzoomer>');
			let $world = $('<batarangzoomerworld>').appendTo($zoomer)

			for(var g=0; g<GPW; g++){
				let type = '-';
				if(g<WALLS||g>=(GPW-WALLS)) type = "W";

				if(g==WALLS) $zoomer.appendTo($level);
				let $g = $('<bataranggrid>')
				.appendTo(type=='W'?$level:$world)
				.attr('type',type);

				if(!$gs[l]) $gs[l] = [];
				
				$gs[l][w*GPW+g] = $g;
			}
		}
	}

	for(var l in LADDERS){
		for(var n in LADDERS[l]){

			let g = Math.floor(LADDERS[l][n]);

			let $ladder = $('<batarangladder>').appendTo($gs[l][g]).css({left:LADDERS[l][n]%1*GRID});

			console.log( l,g,$ladder );
		}
	}

	

	let $h = $('<h1>').appendTo($game);

	$(`
		<audio autoplay controls loop>
			<source src="./proto/audio/epic-orchestral-drums-171728.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0].volume = 0.5;

	let sfx = {};
	sfx.zoom = $(`<audio>
			<source src="./proto/audio/sfx-zoom.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0];

	sfx.throw = $(`<audio>
			<source src="./proto/audio/sfx-throw.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0];

	sfx.locking = $(`<audio loop>
			<source src="./proto/audio/sfx-locking.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0];

	sfx.hit = $(`<audio>
			<source src="./proto/audio/sfx-swipe.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0];

	sfx.hit.volume = 0.2;

	sfx.ouch = $(`<audio>
			<source src="./proto/audio/sfx-grunt.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0];


	function getXFor(batarang){
		if(batarang.wall==0) return GPW - players[batarang.iPlayer].xFrontToBack;
		if(batarang.wall==1) return GPW + players[batarang.iPlayer].xSideToSide;
		if(batarang.wall==2) return GPW*2 + players[batarang.iPlayer].xFrontToBack;
	}

	let batarangs = [];
	function onZone(e){

		if(!isGameActive) return;

		let wall = $(this).attr('wall')
		let level = $(this).attr('level')

		let minDist = 100;
		let iPlayer = 0;
		for(var i=0; i<players.length; i++){
			if(players[i].proximity[wall] < minDist){
				minDist = players[i].proximity[wall];
				iPlayer = i;
			}
		}

		sfx.zoom.play();
		//self.$el.find(`batbutton[wall="${wall}"]`).css('opacity',0);
		
		self.$el.find(`bataranglevel[player="${iPlayer}"]`)
		.removeClass('focus')
		.removeAttr('player');

		$(this)
		.css('bataranglevel',1)
		.addClass('focus')
		.attr('player',iPlayer);

		if(batarangs[iPlayer]){
			batarangs[iPlayer].die();
			batarangs[iPlayer] = undefined;
		}
		
		setTimeout(function(){
			spawnBatarang(iPlayer,wall,level);
		},700);		
	}

	function spawnBatarang(iPlayer,wall,level){

		if(!isGameActive) return;
		if(batarangs[iPlayer]) batarangs[iPlayer].die();
		
		let batarang = new Batarang(level,wall,iPlayer);
		batarang.x = getXFor(batarang);
		batarang.locking = LOCKING;
		batarang.$reticule = $('<bat-reticule>').appendTo($ls[wall][batarang.level]).attr('player',iPlayer);
		batarang.redraw();
		batarang.$el.appendTo($ls[wall][batarang.level]);
		batarangs[iPlayer] = batarang;
	}

	function toCenter(){
		$scroller.animate({left:-W+'px'},2000);
	}

	function toLeft(){
		$scroller.animate({left:0+'px'},2000);
	}

	function toRight(){
		$scroller.animate({left:-W*2+'px'},2000);
	}

	let intervalQueue;
	function doNextQueue(){

		clearInterval(intervalQueue);
		let g = queue[iQueue];
		if(!g) return;

		let type = typeof g;

		iQueue++;

		if(g=='ROUND'){

			clearBatarangs();

			$h.text('GET READY...');
			isGameActive = false;
			doNextQueue();
		} else if(g=='GO'){
			$h.text('GO!');
			isGameActive = true;
			setTimeout(function(){$h.text('')},1000);
			doNextQueue();
		} else if(type=='function'){
			g();
			doNextQueue();
		} else if(isNaN(g)){
			//spawn the goon
			if(!isGameActive) goonZoome = g;
			g.redraw();
			g.$el.appendTo($gs[g.level][Math.floor(g.x)]);
			goons.push(g);
			doNextQueue();
		} else{
			intervalQueue = setTimeout(doNextQueue,g);
		}
	}

	doNextQueue();

	function clearBatarangs(){
		for(var b in batarangs){
			if(batarangs[b]){
				batarangs[b].$reticule.remove();
				batarangs[b].$el.remove();
				batarangs[b] = undefined;
			}
		}

		self.$el.find('.focus').removeAttr('player');
		self.$el.find('.focus').removeClass('focus');
	}

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
			
			let x = Math.floor(goons[g].x);


			if( !goons[g].$el.parent().is($gs[goons[g].level][x])){
				goons[g].$el.appendTo($gs[goons[g].level][x]);
				goons[g].$el.css({'bottom':'0px'});
			}
			
			if(goons[g].plantBombAt){

				let xBomb = Math.floor(goons[g].plantBombAt);

				let $bomb = $('<batarangbomb>')
				.appendTo($gs[goons[g].level][xBomb])
				.css('left',0.5*BatarangGame.GRID+'px');

				setTimeout(function(){
					$bomb.addClass('explode');
				},1000);

				setTimeout(function(){
					//$bomb.removeClass('explode');
					//$bomb.addClass('exploded');
					$bomb.remove();
					$gs[goons[g].level][xBomb].addClass('destroyed');
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
			if(batarang.flying) batarang.dist --;
			batarang.redraw();

			if(batarang.dist == 0){
				
				$('batarangpulse').remove();

				let wx = batarang.x%BatarangGame.GPW*BatarangGame.GRID;

				$('<batarangpulse>')
				.appendTo($ls[batarang.wall][batarang.level])
				.css('left',wx+'px')
				.animate({width:'200px',height:'200px','opacity':0})

				for(var g=0; g<goons.length; g++){
					
					if(goons[g].level==batarang.level){
						let dx = Math.abs( goons[g].x - batarang.x );
						if(dx<0.5){
							sfx.ouch.currentTime = 0;
							sfx.ouch.play();
							goons[g].$el.remove();
							goons.splice(g,1);
							g--;
							if(!goons.length) doNextQueue();
						}
					}
				}

				sfx.hit.currentTime = 0;
				sfx.hit.play();
				batarang.$reticule.remove();
				batarang.$el.remove();
				batarangs[b] = undefined;

				spawnBatarang(batarang.iPlayer,batarang.wall,batarang.level);

			} else if(!batarang.flying){

				let isLocking = false;
				for(var g=0; g<goons.length; g++){
					if(goons[g].level==batarang.level){
						let dx = Math.abs( goons[g].x - batarang.x );
						if(dx<0.5) isLocking = true;
					}
				}

				if(isLocking){
					if(batarang.locking == LOCKING) sfx.locking.play();
					batarang.locking --;

					if(batarang.locking<=0){
						sfx.locking.pause();
						batarang.doFlying(); //Found a goon! Throw it!
						sfx.throw.currentTime = 0;
						sfx.throw.play();
					}	
				} else{
					if(batarang.locking < LOCKING ) sfx.locking.pause();
					batarang.locking = LOCKING;
				}
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

			players[i].proximity = [];
			players[i].proximity[0] = 1+players[i].X;
			players[i].proximity[1] = 1-players[i].Z;
			players[i].proximity[2] = 1-players[i].X;
		}
	}

	self.turnOnOff = function(b){
		clearInterval(interval);
		if(b) interval = setInterval(tick,1000/FPS);
	}

	self.turnOnOff(true);

	$game.on('mousemove',function(e){

		let x = (e.pageX/scale)/W*GPW;
		
		players[0].X = x;
		players[0].Z = 0;
		players[0].xFrontToBack = players[1].xFrontToBack = GPW-Math.max( 0, Math.min( GPW, x));
		players[0].xSideToSide = players[1].xSideToSide = Math.max( 0, Math.min( GPW, x-GPW));
		if( x>GPW*2 ) players[0].xFrontToBack = players[1].xFrontToBack = Math.max( 0, Math.min( GPW, x-GPW*2));

		players[0].proximity = [0.9,0.9,0.9];
	})

}