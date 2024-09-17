


BatarangGoon = function(level,x){
	let self = this;
	self.level = level;
	self.x = x;

	self.$el = $('<bataranggoon>');

	self.redraw = function(){
		x += 0.1;
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
	let GRIDSPERWALL = 8;
	BatarangGame.GRID = W/GRIDSPERWALL;
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
			},

			'bataranggrid[type=L]:after':{
				'content':'""',
				'display':'block',
				'position':'absolute',
				
				'width':'50px',
			
				'top':'0px',
				'left':'0px',
				'right':'0px',
				'bottom':'0px',
				'margin':'auto',
				
				'border-left':'10px solid black',
				'border-right':'10px solid black',
				'box-sizing':'border-box',
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

			'bataranggoon':{
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
				'border-radius':"100% 100% 0px 0px"
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
	let $ls = [];
	
	let xSideToSide = 0;
	let xFrontToBack = 0;
	let batarang;

	self.$el = $('<igb>');

	let map = [
		'W------WW------WW------W',
		'W------WW------WW---L--W',
		'W---L--WW------WW------W',
	]

	let $game = $('<bataranggame>').appendTo(self.$el);

	for(var i=0; i<3; i++){
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

		/*for(var z=0; z<3; z++){
			$('<batarangzone>').appendTo($l).css({left:150 + z*W+'px'}).attr('level',i).attr('wall',z);

		}*/
	}

	function getXFor(wall){
		if(wall==0) return GRIDSPERWALL - xFrontToBack;
		if(wall==1)	return GRIDSPERWALL + xSideToSide;
		if(wall==2) return GRIDSPERWALL*2 + xFrontToBack;
	}

	function spawnBatarang(e){
		let level = $(this).attr('level');
		let wall = Math.floor( $(this).attr('g')/GRIDSPERWALL );
		
		batarang = new Batarang(level,wall,getXFor(wall));
		batarang.redraw();
		batarang.$el.appendTo($ls[batarang.level]);
	}

	function spawnGoon(){
		let goon = new BatarangGoon(2,2);
		goon.redraw();
		goon.$el.appendTo($ls[goon.level]);
	}

	spawnGoon();

	function tick(){

		let wScreen = self.$el.width();
		if(wScreen != wWas){
			scale = wScreen/(W*3);
			$game.css('transform','scale('+scale+')');
			wWas = wScreen;
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

				

				batarang.$el.remove();
				batarang = undefined;

			}
		}
	}

	self.setPlayers = function(p){
		xSideToSide = p[0].px/100*GRIDSPERWALL;
		xFrontToBack = (1-p[0].pz/100)*GRIDSPERWALL;
	}

	self.turnOnOff = function(b){
		clearInterval(interval);
		if(b) interval = setInterval(tick,1000/fps);
	}

	self.turnOnOff(true);

	$game.on('mousemove',function(e){

		let x = (e.pageX/scale)/W*GRIDSPERWALL;
		
		xFrontToBack = GRIDSPERWALL-Math.max( 0, Math.min( GRIDSPERWALL, x));
		xSideToSide = Math.max( 0, Math.min( GRIDSPERWALL, x-GRIDSPERWALL));
		if( x>GRIDSPERWALL*2 ) xFrontToBack = Math.max( 0, Math.min( GRIDSPERWALL, x-GRIDSPERWALL*2));

		
	})

}