Volcano = function(){

	const GRID = 3;

	if(!Volcano.didInit){

		Volcano.didInit = true;

		let css = {
			'.volcanowrapper':{
				'background':'#5555dd',
			},

			'volacanoparallax':{
				'content':'""',
				'position':'absolute',
				'left':'0px',
				'bottom':'0px',
				'right':'0px',
				'height':'200px',
				'background':'orange',
			},

			'volcanogame':{
				display:'block',
				position:'absolute',
				'top':'0px',
				'left':'0px',
				'right':'0px',
				'bottom':'0px',
			},

			'volcanoscroller':{
				display:'block',
				position:'absolute',
				'left':'-3vw',
				'right':'0px',
				'bottom':'0px',
				'width':'39.33vw',
				'height':'39.33vw',
				'background':'url(./proto/img/volcano.png)',
				'background-size':'100%',
				'border-bottom':'2vw solid orange',
			},

			'volcanoplatform':{
				display:'block',
				position:'absolute',
				'left':'0px',
				'right':'0px',
				'bottom':'0px',
				'width':GRID+'vw',
				'height':'1vw',
				'background':'#653332',
				'border-radius':'0.2vw 0.2vw 100% 100%',
				'transform':'translate(-50%, 100%)',
				'box-sizing':"border-box",
				'border-top':"0.2vw solid #a85a59",
				'box-shadow':"0px 5px 10px rgba(0,0,0,0.2)",
			},

			'volcanoplatform:after':{
				content:'""',
				display:'block',
				position:'absolute',
				'left':'0px',
				'right':'0px',
				'top':'-0.5vw',
				'height':'0.5vw',
				'background':'#a85a59',
				'border-radius':'100% 100% 0px 0px',
			},

			'volcanoarena':{
				display:'block',
				position:'absolute',
				'left':'50%',
				'bottom':'2vw',
			},

			'volcanoplayer':{
				'width':'1vw',
				'height':'2vw',
				'background':'red',
				'display':'block',
				'position':"absolute",
				'bottom':'0px',
				'transform':'translateX(-50%)',
			},

			'volcanoplayer:nth-of-type(2)':{
				'background':'blue',
			},

			'volcanogame h1':{
				'color':'white',
				'text-align':'center',
				'position':'absolute',
				'top':'-10vw',
				'left':'0px',
				'right':'0px',
			}
		}

		$("head").append('<style>'+Css.of(css)+'</style>');
	}

	let self = this;
	self.$el = $('<igb class="volcanowrapper">');

	let $parallax = $('<volacanoparallax>').appendTo(self.$el);

	$('<igbside>').appendTo(self.$el);
	let $front = $('<igbside>').appendTo(self.$el);
	$('<igbside>').appendTo(self.$el);

	let $game = $('<volcanogame>').appendTo($front);
	let $scroller = $('<volcanoscroller>').appendTo($game);
	let $arena = $('<volcanoarena>').appendTo($scroller);

	$('<h1>').appendTo($scroller).text('BAD ASS!');

	let map = [0,-3,-1,2.5,4.5,1,-2,2,-1,3,-1.5,2,0];

	for(var i=0; i<map.length; i++){
		$('<volcanoplatform>').appendTo($arena).css({left:(map[i]*GRID)+'vw', bottom:(i*GRID)+'vw'});
	}

	let PLAYERCOUNT = 1;
	let players = [];
	let GRAVITY = 0.01;
	for(var p=0; p<PLAYERCOUNT; p++){
		let player = {x:0,y:1,sy:0};
		player.$el = $('<volcanoplayer>').appendTo($arena);
		players[p] = player;
	}

	self.setPlayers = function(p){
		p.length = PLAYERCOUNT;
		for(var i in p){
			players[i].x = (p[i].px/100 - 0.5)*(33.3/GRID);
		}
	}

	$game.on('mousemove',function(e){
		let px = (e.pageX/$(document).innerWidth())*3-1;
		let player = {px:px*100};
		self.setPlayers([player,player]);
	})

	let GRIDPERSTAGE = 4;
	let iStage = 0;
	function tick(){
		let iMin = iStage*GRIDPERSTAGE;
		for(var i in players){

			let iLevelWas =  Math.floor(players[i].y);
			players[i].sy -= GRAVITY;
			players[i].y += players[i].sy;
			let iLevelIs =  Math.floor(players[i].y);

			if(players[i].sy < 0 && iLevelIs<iLevelWas){
				let dist = map[iLevelWas] - players[i].x;
				if(Math.abs(dist) < GRID/5){
					players[i].sy = -0.1;
					players[i].y = iLevelWas;
					players[i].isGrounded = true;
					iMin = Math.min(iLevelWas);
				} else if(players[i].isGrounded){
					players[i].y = iLevelWas + 0.15;
					players[i].sy = 0.18;
					players[i].isGrounded = false;
				} else if(iLevelIs<-3){
					players[i].y = 1;
					players[i].sy = 0;
				}
			}

			players[i].$el.css({
				bottom:(players[i].y*GRID)+'vw',
				left:(players[i].x*GRID)+'vw',
			});
		}

		let iNewStage = Math.floor(iMin/GRIDPERSTAGE);
		if(iNewStage<0) iNewStage = 0;

		if(iNewStage!= iStage){
			$scroller.animate({bottom:-iNewStage*GRIDPERSTAGE*GRID+'vw'});
			$parallax.animate({bottom:-(iNewStage*GRIDPERSTAGE*GRID)/3+'vw'});
			iStage = iNewStage;
		}
	}

	let fps = 50;
	setInterval(tick,1000/fps);
}