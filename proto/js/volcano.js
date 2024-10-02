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

	let platforms = [
		{x:-4,y:0,sy:0,isCheckpoint:true, spawnRange:2},
		{x:3.5,y:4,sy:0,isCheckpoint:true, spawnRange:1.5},
		{x:-2.5,y:8,sy:0,isCheckpoint:true, spawnRange:1.5},
		{x:0,y:12,sy:0,isCheckpoint:true, spawnRange:1},
	]



	

	for(var i=0; i<platforms.length; i++){
		platforms[i].$el = $('<volcanoplatform>').appendTo($arena).css({left:platforms[i].x*GRID+'vw', bottom:platforms[i].y*GRID+'vw'});
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

	
	let threshold = -2;
	let timeSpawn = -1;
	let spawnRange = 2;
	function tick(){

		let didThresholdChange = false;

		for(var p in platforms){
			platforms[p].y += platforms[p].sy;
			platforms[p].$el.css({bottom:platforms[p].y*GRID+'vw'});
		}

		for(var i in players){

			let yWas = players[i].y;
			players[i].sy -= GRAVITY;
			players[i].y += players[i].sy;
			let yNow = players[i].y;

			if(yNow<yWas){
				//we're falling

				let isGrounded = false;
				for(var p in platforms){
					let dx = Math.abs(platforms[p].x - players[i].x);
					let wouldLandHere = (dx<GRID/5);
					let isFallingThrough = (yWas>=platforms[p].y && yNow<platforms[p].y);

					//console.log(yWas,wouldLandHere,isFallingThrough);
					
					if(wouldLandHere && isFallingThrough){
						players[i].y = platforms[p].y;
						players[i].sy = -0.1;
						players[i].didLandOn = platforms[p];
						isGrounded = true;

						if(platforms[p].isCheckpoint){

							if(threshold != platforms[p].y-2){
								didThresholdChange = true;
								threshold = platforms[p].y -2;
								spawnRange = platforms[p].spawnRange;
							}
						}
					}
				}

				if(!isGrounded && players[i].didLandOn){
					players[i].y = players[i].didLandOn.y + 0.15;
					players[i].sy = 0.18;
					players[i].didLandOn = false;
				}
			}

			if(players[i].y < threshold){
				players[i].y = threshold+2;
				players[i].sy = 0;
			}


			players[i].$el.css({
				bottom:(players[i].y*GRID)+'vw',
				left:(players[i].x*GRID)+'vw',
			});
		}

		//iSlide += 0.01;

		//let yScroll = Math.max(1,players[0].y-3);
		

		//$arena.css({bottom:-iSlide*GRID+'vw'});
		//$scroller.css({bottom:-yScroll*GRID+'vw'});

		/*let iNewStage = Math.floor(iMin/GRIDPERSTAGE);
		if(iNewStage<0) iNewStage = 0;

		if(iNewStage!= iStage){
			$scroller.animate({bottom:-iNewStage*GRIDPERSTAGE*GRID+'vw'});
			$parallax.animate({bottom:-(iNewStage*GRIDPERSTAGE*GRID)/3+'vw'});
			iStage = iNewStage;
		}*/

		if( didThresholdChange ){
			didThresholdChange = false;
			$scroller.animate({bottom:-(threshold+2)*GRID+'vw'});
			$parallax.animate({bottom:(-(threshold+2)/3*GRID)+'vw'});
		}

		let timeNow = new Date().getTime();

		if((timeNow-timeSpawn)>1700){
			timeSpawn = timeNow;
			let spawnFromY = Math.min(11.9,threshold+9);
			let platform = {x:(spawnRange*0.4+Math.random()*spawnRange*0.6)*(platforms.length%2?1:-1),y:spawnFromY,sy:-0.02};
			platform.$el = $('<volcanoplatform>').prependTo($arena).css({left:platform.x*GRID+'vw',bottom:platform.y*GRID+'vw'});
			platforms.push(platform);


		}

	}

	let fps = 50;
	setInterval(tick,1000/fps);
}