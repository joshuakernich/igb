window.HeaderGame = function (argument) {
	
	let W = 1728;
	let H = 1080;
	let rBall = 70;
	let rDude = 100;
	let dBall = rBall*2;
	let dDude = rDude*2;


	let css = {
		'headergame':{
			display:'block',
			position:'relative',
			width:W+'px',
			height:H+'px',
			'transform-origin':'top left',
			
		},

		'headerdude':{
			display:'block',
			position:'absolute',
			bottom: '0px',
			left: '0px',

		},

		'headerball':{
			display:'block',
			position:'absolute',
		},

		'headerball:after':{
			content: '""',
			width: dBall+'px',
			height: dBall+'px',
			'border-radius': rBall+'px',
			background: 'white',
			display:'block',
			position:'absolute',
			left: -rBall+'px',
			top: -rBall+'px',
		},

		'headerdude:after':{
			content: '""',
			width: dDude+'px',
			height: dDude+'px',
			display:'block',
			position:'absolute',
			left: -rDude+'px',
			top: -rDude+'px',
			background: 'white',
			'border-radius': rDude+'px',
			'background-image':'url(https://www.pngall.com/wp-content/uploads/14/Anime-Face-PNG-Images-HD.png)',
			'background-size':'50%',
			'background-position':'center',
			'background-repeat':'no-repeat',
		}
	}

	$("head").append('<style>'+Css.of(css)+'</style>');

	let self = this;
	self.$el = $('<igb>');


	$('<igbside>').appendTo(self.$el);
	let $center = $('<igbside style="border: 1px solid white;box-sizing:border-box;">').appendTo(self.$el);
	$('<igbside>').appendTo(self.$el);

	let $game = $('<headergame>').appendTo($center);


	$('<headerdude>').appendTo($game);
	$('<headerdude>').appendTo($game);

	let ball = {x:50,y:50,sx:10,sy:0};
	let $ball = $('<headerball>').appendTo($game);

	let was = []
	let players = [];
	self.setPlayers = function(p){
		was = players.length?players.concat():p;
		players = p;
		players.length = 2;
		for(var p in players){
			self.$el.find('headerdude').eq(p).css({'left':players[p].px/100*W+'px','top':players[p].py/100*H+'px'});
		}
	}

	let collideDist = rDude+rBall;
	let wWas = 0;
	function tick(){

		wScreen = $center.width();
		if(wScreen != wWas){
			$('headergame').css('transform','scale('+wScreen/W+')');
			wWas = wScreen;
		}

		ball.sy += 1;
		ball.y += ball.sy;
		ball.x += ball.sx;

		if(ball.x>(W-rBall)){
			ball.x = W-rBall;
			ball.sx = -10;
		} else if(ball.x<rBall){
			ball.x = rBall;
			ball.sx = 10;
		}

		if(ball.y>(H-rBall)){
			ball.y = H-rBall;
			ball.sy = -40;
		} else if(ball.y<rBall){
			ball.y = rBall;
			ball.sy = 1;
		}


		for(var p in players){

			let px = players[p].px/100*W;
			let py = players[p].py/100*H;
			let xDif = ball.x-px;
			let yDif = ball.y-py;

			let dx = players[p].px - was[p].px;
			let dy = players[p].py - was[p].py;

			let dist = Math.sqrt( xDif*xDif + yDif*yDif );


			if(dist < collideDist){
				
				
					let r = Math.atan2(yDif,xDif);
					let v = Math.sqrt(ball.sx*ball.sx + ball.sy*ball.sy);
					
					ball.x = px + Math.cos(r) * (rBall+rDude);
					ball.y = py + Math.sin(r) * (rBall+rDude);

					ball.sx = Math.cos(r) * v*1.2;
					ball.sy = Math.sin(r) * v*1.2;

					
				

			}
		}

		$ball.css({'top':ball.y+'px',left:ball.x+'px'});

	}

	let interval = setInterval(tick,1000/50);

}