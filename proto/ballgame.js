
Dude = function(p,rDude){

	let dDude = rDude*2;

	let css = {

		'headerdude':{
			display:'block',
			position:'absolute',
			bottom: '0px',
			left: '0px',
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
	}

	$("head").append('<style>'+Css.of(css)+'</style>');

	let self = this;
	self.$el = $(`
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
		`);

	self.setX = function (x) {
		self.$el.css({'left':x+'px'});
	}

	self.setY = function (y) {
		self.$el.css({'top':y+'px'});
	}

	self.setHeight = function (h) {

		let legLength = h - 220;
		let legBow = Math.max(0,150 - legLength);

		let dLeft = 'M120 220 Q'+(120-legBow)+' '+(220+legLength/2)+', 120 '+(220+legLength);
		let dRight = 'M180 220 Q'+(180+legBow)+' '+(220+legLength/2)+', 180 '+(220+legLength);

		self.$el.find('.headerleg').eq(0).attr('d',dLeft);
		self.$el.find('.headerleg').eq(1).attr('d',dRight);
	}

	let nTick = 0;
	self.wiggleArms = function(){
		nTick++;
		let dRight = 'M150,150'
		let dLeft = 'M150,150'
		for(var i=0; i<12; i++){
			dLeft += ' L'+(120-i*10)+','+(150+Math.sin((p*3+nTick+i)*0.4)*20*i/10 + i*5);
			dRight += ' L'+(180+i*10)+','+(150+Math.sin((p*3+3+nTick+i)*0.4)*20*i/10 + i*5);
		}

		self.$el.find('.headerArm').eq(0).attr('d',dLeft);
		self.$el.find('.headerArm').eq(1).attr('d',dRight);
	}


}

BallGame = function () {
	
	let W = 1728;
	let H = 1080;
	let rBall = 70;
	let rDude = 100;
	let dBall = rBall*2;
	let dDude = rDude*2;
	let minHeader = 20;
	let fps = 50;	

	let css = {
		'ballgame':{
			display:'block',
			position:'relative',
			width:W+'px',
			height:H+'px',
			'transform-origin':'top left',
		},

		'ballgame *':{
			'pointer-events':'none',
		},


		'ballgameball':{
			display:'block',
			position:'absolute',
		},

		'ballgameball:after':{
			content: '""',
			width: dBall+'px',
			height: dBall+'px',
			'border-radius': rBall+'px',
			background: 'white',
			display:'block',
			position:'absolute',
			left: -rBall+'px',
			top: -rBall+'px',

			'background':'url(proto/football.png)',
			'background-size':'100%',
			'border-radius':'0px',
		},

		'.basketball ballgameball:after':{
			'background':'url(proto/bball.png)',
			'background-size':'100%',
			'border-radius': rBall+'px',
			'background-color':'black',
		},

		'.volleyball ballgameball:after':{
			'background':'url(proto/volleyball.png)',
			'background-size':'100%',
			'border-radius': rBall+'px',
			'background-color':'black',
		},

		'.volleyball:before':{
			content:'" "',
			position:'absolute',
			bottom:'0px',
			left:'0px',
			right:'0px',
			height:'100px',
			background:'url(proto/field.png)',
		},

		'ballgamescore':{
			'font-size': '1.5vw',
			'color':'white',
			'position':'absolute',
			'top':'0vw',
			'right':'50%',
			'width':'3vw',
			'color':'white',
			'background':'red',
			
			'text-align':'center',
			'border-radius':'0px 0px 0vw 0.5vw',
		},

		'ballgamescore:last-of-type':{
			'right':'auto',
			'left':'50%',
			'background':'blue',
			'border-radius':'0px 0px 0.5vw 0vw',
		},

		'footballgoal':{
			width: '1500px',
			height: '750px',
			background: 'url(proto/goal.png)',
			display: 'block',
			position: 'absolute',
			right: '-1470px',
			bottom: '0px',
		},

		'footballgoal:last-of-type':{
			right:'auto',
			left:'-1470px',
			transform:'scaleX(-1)',
		},

		'.footballbg':{
			'background-image':'url(proto/20180220_021.jpg)',
			'background-size':'100%',
			'background-position':'center bottom -70px',
		},

		'bballhoop, bballhoopfront':{
			'height':"1080px",
			'width':'300px',
			'background-image':'url(proto/hoop.png)',
			display:'block',
			position:'absolute',
			right:'0px',
			bottom:'-100px',

		},

		'bballhoopfront':{
			'background-image':'url(proto/hoop-front.png)',
			'z-index':'1',
		},

		'bballhoop:first-of-type, bballhoopfront:first-of-type':{
			right:'auto',
			left:'0px',
			transform:'scaleX(-1)',
		},

		'gamebuttons':{
			'display':'block',
			'position':'absolute',
			'top':'0px',
			'left':'0px',
			'margin':'2vw',
		},

		'gamebutton':{
			'display':'inline-block',
			'background':'white',
			'padding':'1vw',
			'margin':'0.1vw',

		},

		'volleyballnet':{
			'display':'block',
			'position':'absolute',
			'bottom':'0px',
			'left':'50%',
			'height':'400px',
			'width':'100px',
			'background':'url(proto/volleyball-net.png)',
			'transform':'translateX(-50%)'
		}
	}

	$("head").append('<style>'+Css.of(css)+'</style>');

	let self = this;
	self.$el = $('<igb class="footballbg">');

	$('<igbside>').appendTo(self.$el);
	let $center = $('<igbside>').appendTo(self.$el);
	let $right = $('<igbside>').appendTo(self.$el);
	

	let gameType;
	let $game = $('<ballgame>').appendTo($center);

	let games = ['football','basketball','volleyball'];
	let $buttons = $('<gamebuttons>').appendTo($right);
	for(var g in games) $('<gamebutton>').appendTo($buttons).text(games[g]).click(function(){
		switchGame( $(this).text() );
	})

	let tickBall;

	function switchGame( gameSwitch ){

		gameType = gameSwitch;

		$game.removeClass(games.join(' '));
		$game.addClass(gameType);

		$('footballgoal').remove();
		$('bballhoop').remove();
		$('bballhoopfront').remove();
		$('volleyballnet').remove();

		if( gameType == 'football'){
			$('<footballgoal>').appendTo($game);
			$('<footballgoal>').appendTo($game);
			tickBall = tickFootball;
		} else if(gameType == 'volleyball'){
			tickBall = tickVolleyball;
			$('<volleyballnet>').appendTo($game);
		} else if(gameType == 'basketball'){
			$('<bballhoop>').appendTo($game);
			$('<bballhoop>').appendTo($game);
			$('<bballhoopfront>').appendTo($game);
			$('<bballhoopfront>').appendTo($game);
			tickBall = tickBBall;
		}

		$('ballgameball').appendTo($game);

		for(var d in dudes) dudes[d].$el.appendTo($game);

	}

	//switchGame('basketball');


	

	$('<ballgamescore>').appendTo($center).text('0');
	$('<ballgamescore>').appendTo($center).text('0');

	$game.on('mousemove',function(e){
		self.setPlayers([
			{px:e.offsetX/W*100 - 10,py:e.offsetY/W*100},
			{px:e.offsetX/W*100 + 10,py:e.offsetY/W*100},
			]);
	})

	let dudes = [];
	for(var i=0; i<2; i++){
		let dude = new Dude(i,rDude);
		dude.$el.appendTo($game);
		dudes[i] = dude;
	}
	


	let balls = [];
	let ball;
	

	function spawnBall( x ){

		if(ball) ball.isActive = false;

		let $ball = $('<ballgameball>').appendTo($game);
		ball = {r:0,x:x?x:W/2,y:H/2,sx:0,sy:-30,$el:$ball,isActive:true};

		balls.push(ball);
	}

	spawnBall();

	let was = []
	let players = [];
	self.setPlayers = function(p){
		was = players.length?players.concat():p;
		players = p;
		players.length = 2;
		for(var p=0; p<players.length; p++){
			players[p].py = Math.min( 75, 35 + players[p].py );


			if(gameType == 'volleyball'){
				if(p==0) players[p].px = Math.min( 45, players[p].px );
				if(p==1) players[p].px = Math.max( 55, players[p].px );
			}

			dudes[p].setX(players[p].px/100*W);

			

			dudes[p].setY(players[p].py/100*H);
			dudes[p].setHeight((1-players[p].py/100)*H);
		}
	}



	let collideDist = rDude+rBall;
	let wWas = 0;
	let nTick = 0;

	let scoreLeft = 0;
	let scoreRight = 0;


	function tickFootball(ball){
		ball.sy += 1;
		ball.y += ball.sy;
		ball.x += ball.sx;
		ball.r += ball.sx*0.5;

		if(ball.isActive){
			let isGoal = ball.y > (H-750+rBall+40);
			let isAbove = ball.y < (H-750);
			
			if(ball.x>(W-rBall)){
				
				if(isGoal){
					scoreRight++;
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

				if(ball.x<W*1.7 && ball.x>-W*0.7 && ball.y>(H-750-rBall+20)){
					ball.sy = -25;
					ball.y = H-750-rBall+20;
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

			ball.$el.css({'top':ball.y+'px',left:ball.x+'px','transform':'rotate('+ball.r+'deg)'});
			
		}
	}

	function tickVolleyball(ball){
		ball.sy += 1;
		
		ball.y += ball.sy;
		ball.x += ball.sx;
		ball.r += ball.sx*0.5;

		let farLeft = rBall;
		let farRight = W-rBall;
		let isLeft = ball.x < farLeft;
		let isRight = ball.x > farRight;
		let netHeight = 400;

		let isGround = ball.y>(H-rBall);

		if(isGround){
			ball.sy = -Math.abs(ball.sy)*0.5;
			ball.y = H-rBall;

			if(ball.isActive){
				if(ball.x>W/2) scoreRight++;
				else scoreLeft++;

				spawnBall( ball.x>W/2?W*0.75:W*0.25 );
			}
		}

		if(ball.isActive){
			if(isLeft){
				ball.x = farLeft;
				ball.sx = Math.abs(ball.sx);	
			}

			if(isRight){
				ball.x = farRight;
				ball.sx = -Math.abs(ball.sx);
			}

			let isHittingNet = ball.y > (H-netHeight-rBall+20) && ball.x > (W/2-rBall) && ball.x < (W/2+rBall);
			let isFromTheSide = ball.y > (H-netHeight);

			if(isHittingNet && isFromTheSide){

				ball.sx = Math.abs(ball.sx) * (ball.x > W/2)?1:-1;
				ball.x = W/2 + (rBall + 20)*(ball.x > W/2?1:-1);

			} else if( isHittingNet ){
				ball.y = H-netHeight-rBall+20;
				ball.sy = -10;
			}

		} else {
			ball.sx *= 0.99;
		}

		
		ball.$el.css({'top':ball.y+'px',left:ball.x+'px','transform':'rotate('+ball.r+'deg)'});
	}

	function tickBBall(ball){

		ball.sy += 1;
	
		ball.y += ball.sy;
		ball.x += ball.sx;
		ball.r += ball.sx*0.5;

		let isGround = ball.y>(H-rBall);
	
		

		if(ball.isActive){

			if(isGround){
				ball.sy = -40;
				ball.y = H-rBall;
			}

			let hoopAt = 350 + 100;
			let hoopAbove = hoopAt-50;
			let hoopBelow = hoopAt+50;


			let isAbove = ball.y < hoopAbove;
			let isBelow = ball.y > hoopBelow;
			let farLeft = rBall+50;
			let farRight = W-rBall-50;
			let isLeft = ball.x < farLeft;
			let isRight = ball.x > farRight;
			
			let hoopReach = 160;
			let hoopLeft = farLeft + hoopReach + rBall;
			let hoopRight = farRight - hoopReach - rBall;

			if(isBelow && (isLeft || isRight)){
				spawnBall();
			} else if(isAbove && isLeft){
				ball.sx = -ball.sx;
				ball.x = farLeft;
			} else if(isAbove && isRight){
				ball.sx = -ball.sx;
				ball.x = farRight;
			} else if( !isAbove && !isBelow ){

				if(ball.x > (hoopRight + rBall)){
					ball.sx = 2;
					ball.sy = 5;
					ball.x = farRight - hoopReach/2;
					scoreRight ++;
					spawnBall();
				} else if( ball.x < (hoopLeft - rBall)){
					ball.sx = -2;
					ball.sy = 5;
					ball.x = farLeft + hoopReach/2;
					scoreLeft ++;
					spawnBall();
				} else if(ball.x>hoopRight){
					ball.x = hoopRight;
					ball.sx = -10;
					ball.sy = -10;
				} else if(ball.x<hoopLeft){
					ball.x = hoopLeft;
					ball.sx = 10;
					ball.sy = -10;
				} 
			}
		} else {

			if(isGround){
				ball.sy = -Math.abs(ball.sy)*0.8;
				ball.y = H-rBall;
			}

			ball.$el.css({'top':ball.y+'px',left:ball.x+'px','transform':'rotate('+ball.r+'deg)'});
		}

		
	}

	function tick(){

		nTick++;

		wScreen = $center.width();
		if(wScreen != wWas){
			$game.css('transform','scale('+wScreen/W+')');
			wWas = wScreen;
		}

		if(tickBall) for(var b in balls) tickBall(balls[b]);


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

			dudes[p].wiggleArms();
		}

		ball.$el.css({'top':ball.y+'px',left:ball.x+'px','transform':'rotate('+ball.r+'deg)'});

		$('ballgamescore').eq(1).text(scoreLeft);
		$('ballgamescore').eq(0).text(scoreRight);
	}

	

	let interval;
	
	self.turnOnOff = function(b){
		clearInterval(interval);
		if(b) interval = setInterval(tick,1000/fps);
	}


	self.turnOnOff(true);

}