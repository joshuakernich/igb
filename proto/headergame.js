window.HeaderGame = function () {
	
	let W = 1728;
	let H = 1080;
	let rBall = 70;
	let rDude = 100;
	let dBall = rBall*2;
	let dDude = rDude*2;
	let minHeader = 20;
	let fps = 50;


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

		'headerdudehead':{
			width: dDude+'px',
			height: dDude*1.2+'px',
			display:'block',
			position:'absolute',
			left: -rDude+'px',
			top: -rDude+'px',
			background: 'white',
			'border-radius': rDude+'px',
			'background-image':'url(https://www.pngall.com/wp-content/uploads/14/Anime-Face-PNG-Images-HD.png)',
			'background-size':'50%',
			'background-position':'center 130px',
			'background-repeat':'no-repeat',
		},

		'headerdudehead:after':{
			content: '""',
			display:'block',
			position: 'absolute',
			left: '0px',
			right: '0px',
			top: '70px',
			width: dDude+'px',
			background: 'red',
			height: '40px',

		},

		'headerdude:last-of-type headerdudehead:after':{
			background: 'blue',
		},

		'headerdudebody':{
			display:'block',
			position:'absolute',
			width: '80px',
			left: '-40px',
			height: '135px',
			background: 'linear-gradient(to bottom, #ddd, white)',

			top: '100px',
			'border-radius':'20px',

		},

		'headerdude svg':{
			display:'block',
			position:'absolute',
			top: '0px',
			left: '-150px',
			'stroke-width':'20px',
			'stroke-linecap':'round',
			'stroke':'white',
			'fill':'none',
		},

		'headerscore':{
			'font-size': '50px',
			'color':'white',
			'position':'absolute',
			'top':'10px',
			'left':'20px',
		},

		'headerscore:last-of-type':{
			'left':'auto',
			'right':'20px',
			'text-align':'right',
		},

		'headergoal':{
			width: '1500px',
			height: '750px',
			background: 'url(proto/goal.png)',
			display: 'block',
			position: 'absolute',
			right: '-1470px',
			bottom: '0px',
		},

		'headergoal:last-of-type':{
			right:'auto',
			left:'-1470px',
			transform:'scaleX(-1)',
		},

		'.headergamebg':{
			'background-image':'url(proto/20180220_021.jpg)',
			'background-size':'100%',
			'background-position':'center bottom -70px',
		}
	}

	$("head").append('<style>'+Css.of(css)+'</style>');

	let self = this;
	self.$el = $('<igb class="headergamebg">');


	$('<igbside>').appendTo(self.$el);
	let $center = $('<igbside>').appendTo(self.$el);
	$('<igbside>').appendTo(self.$el);
	

	let $game = $('<headergame>').appendTo($center);
	$('<headergoal>').appendTo($game);
	$('<headergoal>').appendTo($game);

	$('<headerscore>').appendTo($center).text('0');
	$('<headerscore>').appendTo($center).text('0');


	for(var i=0; i<2; i++){
		$(`
			<headerdude>
				<svg width=300 height=600>
					
					<path class='headerArm' d='M150,150 L10,150'/>
					<path class='headerArm' d='M150,150 L290,150'/>
					<path class='headerleg' d='M120,220 L120,500'/>
					<path class='headerleg' d='M180,220 L180,500'/>
				</svg>
				<headerdudebody></headerdudebody>
				<headerdudehead></headerdudehead>
			</headerdude>
		`).appendTo($game);
	}
	
	

	let ballsOld = [];
	let ball;
	

	function spawnBall(){
		if(ball){
			ball.isActive = false;
			ballsOld.push(ball);
		}
		let $ball = $('<headerball>').appendTo($game);
		ball = {x:W/2,y:H/2,sx:0,sy:-30,$el:$ball,isActive:true};

		
	}

	spawnBall();

	let was = []
	let players = [];
	self.setPlayers = function(p){
		was = players.length?players.concat():p;
		players = p;
		players.length = 2;
		for(var p in players){
			players[p].py = Math.min( 75, 40 + players[p].py );
			
			self.$el.find('headerdude').eq(p).css({'left':players[p].px/100*W+'px','top':players[p].py/100*H+'px'});

			let legLength = (1-players[p].py/100)*H - 220;
			let legBow = Math.max(0,150 - legLength);

			let dLeft = 'M120 220 Q'+(120-legBow)+' '+(220+legLength/2)+', 120 '+(220+legLength);
			let dRight = 'M180 220 Q'+(180+legBow)+' '+(220+legLength/2)+', 180 '+(220+legLength);
	
			self.$el.find('headerdude').eq(p).find('.headerleg').eq(0).attr('d',dLeft);
			self.$el.find('headerdude').eq(p).find('.headerleg').eq(1).attr('d',dRight);

		}
	}



	let collideDist = rDude+rBall;
	let wWas = 0;
	let nTick = 0;

	let scoreLeft = 0;
	let scoreRight = 0;


	function tickBall(ball){
		ball.sy += 1;
		ball.y += ball.sy;
		ball.x += ball.sx;

		if(ball.isActive){
			let isGoal = ball.y > (H-750+rBall+40);
			let isAbove = ball.y < (H-750);
			

			if(ball.x>(W-rBall)){
				
				if(isGoal){
					scoreRight++;
					$('headerscore').eq(1).text(scoreRight);
					spawnBall();
				}
				else if(isAbove){
					
					ball.isAbove = true;
					spawnBall();
				} else {
					ball.x = W-rBall;
					ball.sx = -10;
				}

			} else if(ball.x<rBall){
				
				if(isGoal){
					scoreLeft++;
					$('headerscore').eq(0).text(scoreLeft);
					spawnBall();
				} else if(isAbove){
					
					ball.isAbove = true;
					spawnBall();
				} else {
					ball.x = rBall;
					ball.sx = 10;
				}
			}

			if(ball.y>(H-rBall)){
				ball.y = H-rBall;
				ball.sy = -40;
			} else if(ball.y<rBall){
				ball.y = rBall;
				ball.sy = 1;
			}

		} else {
			
			

			if(ball.isAbove){

				if(ball.y>(H-750-rBall)){
					ball.sy = -25;
					ball.y = H-750-rBall;
				}

			} else {
				ball.sx *= 0.975;
				if(ball.y>(H-rBall)){
					ball.y = H-rBall;
					ball.sy = -Math.abs(ball.sy)*0.7;
				} else if(ball.y<(H-750+rBall+40)){
					ball.y = H-750+rBall+40;
					ball.sy = 1;
				}
			}

			ball.$el.css({'top':ball.y+'px',left:ball.x+'px'});
			
		}
		

		
	}

	function tick(){

		nTick++;

		wScreen = $center.width();
		if(wScreen != wWas){
			$('headergame').css('transform','scale('+wScreen/W+')');
			wWas = wScreen;
		}

		tickBall(ball);

		for(var b in ballsOld){
			tickBall(ballsOld[b]);
		}


		for(var p=0; p<players.length; p++){

			let px = players[p].px/100*W;
			let py = players[p].py/100*H;
			let xDif = ball.x-px;
			let yDif = ball.y-py;

			let dx = players[p].px - was[p].px;
			let dy = players[p].py - was[p].py;

			let dist = Math.sqrt( xDif*xDif + yDif*yDif );


			if(dist < collideDist && players[p].py < ball.y && ball.sy > 0){
				
				let r = Math.atan2(yDif,xDif);
				let v = Math.sqrt(ball.sx*ball.sx + ball.sy*ball.sy);
				if(v<minHeader) v = minHeader;
				
				ball.x = px + Math.cos(r) * (rBall+rDude);
				ball.y = py + Math.sin(r) * (rBall+rDude);

				ball.sx = Math.cos(r) * v;
				ball.sy = Math.sin(r) * v;

			}

			let dRight = 'M150,150'
			let dLeft = 'M150,150'
			for(var i=0; i<12; i++){
				dLeft += ' L'+(120-i*10)+','+(150+Math.sin((p*3+nTick+i)*0.4)*20*i/10 + i*5);
				dRight += ' L'+(180+i*10)+','+(150+Math.sin((p*3+3+nTick+i)*0.4)*20*i/10 + i*5);
			}

			self.$el.find('headerdude').eq(p).find('.headerArm').eq(0).attr('d',dLeft);
			self.$el.find('headerdude').eq(p).find('.headerArm').eq(1).attr('d',dRight);
		}

		ball.$el.css({'top':ball.y+'px',left:ball.x+'px'});


	}

	

	let interval;
	
	self.turnOnOff = function(b){
		clearInterval(interval);
		if(b) interval = setInterval(tick,1000/fps);
	}


	self.turnOnOff(true);

}