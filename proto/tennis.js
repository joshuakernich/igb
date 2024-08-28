
TennisDude = function(p,rDude){

	let dDude = rDude*2;

	if(!TennisDude.didInit){

		TennisDude.didInit = true;
		
		let css = {

			'tennisdude':{
				display:'block',
				position:'absolute',
				bottom: '0px',
				left: '0px',
			},

			'tennisdudehead':{
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

			'tennisdudehead:after':{
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

			'tennisdude:last-of-type tennisdudehead:after':{
				background: 'blue',
			},

			'tennisdudebody':{
				display:'block',
				position:'absolute',
				width: '80px',
				left: '-40px',
				height: '135px',
				background: 'linear-gradient(to bottom, #ddd, white)',

				top: '100px',
				'border-radius':'20px',

			},

			'tennisdude svg':{
				display:'block',
				position:'absolute',
				top: '0px',
				left: '-150px',
				'stroke-width':'20px',
				'stroke-linecap':'round',
				'stroke':'white',
				'fill':'none',
			},

			'tennisracket':{
				display:'block',
				'width':'0px',
				'height':'0px',
				
				'position':'absolute',
				'top':'0px',
				'left':'0px',
				
			},

			'tennisracket:after':{
				content:'""',
				display:'block',
				'width':'250px',
				'height':'500px',
				'background':'url(proto/tennis-racket.png)',
				'background-size':'100%',
				'position':'absolute',
				'top':'-450px',
				'left':'-125px',

			}
		}

		$("head").append('<style>'+Css.of(css)+'</style>');

	}

	let self = this;
	self.$el = $(`
			<tennisdude>
				<svg width=300 height=600>
					
					<path class='tennisArm' d='M150,150 L10,150'/>
					<path class='tennisArm' d='M150,150 L290,150'/>
					<path class='tennisleg' d='M120,220 L120,500'/>
					<path class='tennisleg' d='M180,220 L180,500'/>
				</svg>
				<tennisdudebody></tennisdudebody>
				<tennisdudehead></tennisdudehead>
			</tennisdude>
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

		self.$el.find('.tennisleg').eq(0).attr('d',dLeft);
		self.$el.find('.tennisleg').eq(1).attr('d',dRight);
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

		self.$el.find('.tennisArm').eq(0).attr('d',dLeft);
		self.$el.find('.tennisArm').eq(1).attr('d',dRight);
	}

	self.$racket = $('<tennisracket>')


}

TennisGame = function () {
	
	let W = 1728;
	let H = 1080;
	let rBall = 70;
	let rDude = 100;
	let dBall = rBall*2;
	let dDude = rDude*2;
	let minHeader = 20;
	let fps = 50;	

	if(!TennisGame.didInit){

		TennisGame.didInit = true;

		let css = {
			'tennisgame':{
				display:'block',
				position:'relative',
				width:W+'px',
				height:H+'px',
				'transform-origin':'top left',
			},

			'tennisgame *':{
				'pointer-events':'none',
			},


			'tennisgameball':{
				display:'block',
				position:'absolute',
			},

			'tennisgameball:after':{
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

			'tennisgameball':{
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

			'tennisgameball:last-of-type':{
				'right':'auto',
				'left':'50%',
				'background':'blue',
				'border-radius':'0px 0px 0.5vw 0vw',
			},
		}

		$("head").append('<style>'+Css.of(css)+'</style>');
	}

	let self = this;
	self.$el = $('<igb class="tennisbg">');

	$('<igbside>').appendTo(self.$el);
	let $center = $('<igbside>').appendTo(self.$el);
	let $right = $('<igbside>').appendTo(self.$el);
	
	let $game = $('<tennisgame>').appendTo($center);

	$('<tennisgamescore>').appendTo($game).text('0');
	$('<tennisgamescore>').appendTo($game).text('0');


	$game.on('mousemove',function(e){
		self.setPlayers([
			{px:e.offsetX/W*100 - 10,py:e.offsetY/W*100},
			{px:e.offsetX/W*100 + 10,py:e.offsetY/W*100},
			]);
	})

	let dudes = [];
	for(var i=0; i<1; i++){
		let dude = new TennisDude(i,rDude);
		dude.$el.appendTo($game);
		dude.$racket.appendTo($game);
		dudes[i] = dude;
	}
	

	let balls = [];
	let ball;
	

	function getYaw(q)
    {
        let x2 = q.X * q.X;
        let y2 = q.Y * q.Y;
        return Math.atan2(2 * q.Y * q.W - 2 * q.Z * q.X, 1 - 2 * y2 - 2 * x2);
    }

    function getPitch(q)
    {
        return -Math.asin(2 * q.Z * q.Y + 2 * q.X * q.W);
    }

    function getRoll(q)
    {
        let x2 = q.X * q.X;
        let z2 = q.Z * q.Z;
        return -Math.atan2(2 * q.Z * q.W - 2 * q.Y * q.X, 1 - 2 * z2 - 2 * x2);
    }

	function spawnBall( x ){

		if(ball) ball.isActive = false;

		let $ball = $('<ballgameball>').appendTo($game);
		ball = {r:0,x:x?x:W/2,y:H/2,sx:0,sy:-30,$el:$ball,isActive:true};

		balls.push(ball);
	}

	spawnBall();

	let was = []
	let players = [];
	let racket = {X:0,Y:0,px:50,py:50,rW:0,rX:0,rY:0,rZ:0};
	self.setPlayers = function(p){
		was = players.length?players.concat():p;
		if(p[5]) racket = p[5];
		players = p;
		players.length = 1;
		for(var p=0; p<players.length; p++){
			players[p].py = Math.min( 75, 35 + players[p].py );
			dudes[p].setX(players[p].px/100*W);
			dudes[p].setY(players[p].py/100*H);
			dudes[p].setHeight((1-players[p].py/100)*H);
		}

		let q = {W:racket.rW, X:racket.rX, Y:racket.rY, Z:racket.rZ};
		for(var prop in racket) console.log(prop,racket[prop]);
		console.log(q.W,q.X,q.Y,q.Z,getYaw(q),getPitch(q),getRoll(q));

		dudes[0].$racket.css({ left:racket.px/100*W + 'px', top:racket.py/100*H + 'px'});
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

			//dudes[p].wiggleArms();
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