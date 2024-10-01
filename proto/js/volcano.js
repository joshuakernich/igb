Volcano = function(){

	const GRID = 2;

	if(!Volcano.didInit){

		Volcano.didInit = true;

		let css = {
			'.volcanowrapper':{
				'background':'#5555dd',
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
				
				'left':'0px',
				'right':'0px',
				'bottom':'0px',
				'width':'33.3vw',
				'height':'33.3vw',
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
				'width':GRID*2+'vw',
				'height':'1vw',
				'background':'#653332',
				'border-radius':'0.2vw 0.2vw 100% 100%',
				'transform':'translate(-50%, 100%)',
				'box-sizing':"border-box",
				'border-top':"0.2vw solid white",
				'box-shadow':"0px 5px 10px rgba(0,0,0,0.2)",

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
			},

			'volcanoplayer:last-of-type':{
				'background':'blue',
			}
		}

		$("head").append('<style>'+Css.of(css)+'</style>');
	}

	let self = this;
	self.$el = $('<igb class="volcanowrapper">');

	$('<igbside>').appendTo(self.$el);
	let $front = $('<igbside>').appendTo(self.$el);
	$('<igbside>').appendTo(self.$el);

	let $game = $('<volcanogame>').appendTo($front);

	let $scroller = $('<volcanoscroller>').appendTo($game);
	let $arena = $('<volcanoarena>').appendTo($scroller);


	let map = [0,-4,2,-1,3,6,-2,2,-3,3,-2,4,-2,2,-1,0];

	for(var i=0; i<map.length; i++){
		$('<volcanoplatform>').appendTo($arena).css({left:(map[i]*GRID)+'vw', bottom:(i*GRID)+'vw'});
	}

	let players = [];
	let GRAVITY = 0.01;
	for(var p=0; p<2; p++){
		let player = {x:0,y:1,sy:0};
		player.$el = $('<volcanoplayer>').appendTo($arena);
		players[p] = player;
	}
	

	self.setPlayers = function(p){
		
		p.length = 2;

		for(var i in p){
			players[i].x = (p[i].px/100 - 0.5)*(33.3/GRID);
		}
	}

	$game.on('mousemove',function(e){

		let px = (e.pageX/$(document).innerWidth())*3-1;
	

		let player = {px:px*100};

		self.setPlayers([player,player]);

		
	})

	let GRIDPERSTAGE = 5;
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

				if(Math.abs(dist) < GRID/2){
					players[i].sy = -0.1;
					players[i].y = iLevelWas;
					players[i].isGrounded = true;
					iMin = Math.min(iLevelWas);
				} else if(players[i].isGrounded){
					players[i].y = iLevelWas + 0.15;
					players[i].sy = 0.22;
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
			iStage = iNewStage;
		}


	}

	let fps = 50;
	setInterval(tick,1000/fps);

}