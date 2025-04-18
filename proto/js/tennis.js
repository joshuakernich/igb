
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

			'tennisdude:nth-of-type(2) tennisdudehead:after':{
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
				'background':'url(proto/img/tennis-racket.png)',
				'background-size':'100%',
				'position':'absolute',
				'top':'-450px',
				'left':'-125px',

			},

			'tennisrackethead':{
				display:'block',
				width:dDude+'px',
				height:dDude+'px',
				transform:'translate(-50%,-50%)',
				'background':'red',
				'position':'absolute',
				'border-radius':rDude+'px',
				'opacity':'0.1',
			}
		}

		$("head").append('<style>'+Css.of(css)+'</style>');

	}

	let self = this;
	self.$el = $(`
			<tennisdude>
				<svg width=300 height=1000>
					
					<path class='tennisArm' d='M110,150 L50,200 L100,220'/>
					<path class='tennisArm' d=''/>
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
		let legBow = Math.max(0,350 - legLength);

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

	self.$racket = $('<tennisracket>');
	self.$rackethead = $('<tennisrackethead>');
	
}

TennisGame = function () {
	
	let W = 1728*1.5;
	let H = 1080*1.5;
	let rBall = 40;
	let rDude = 100;
	let dBall = rBall*2;
	let dDude = rDude*2;
	let minHeader = 20;
	let fps = 50;	

	let iQueue = 0;
	let queue = [
		[0],
		[1],
		[0,0.05],
		[1,0.95],
		[0,0.05,0.1],
		[1,0.95,0.9],
		[0],[0.1],[0.2],[0,0.2],
		[1],[0.9],[0.8],[1,0.8],
		[0,0.1,0.2,0.3],
		[1,0.9,0.8,0.7],
		[1,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.2,0.1,0],
	]

	if(!TennisGame.didInit){

		TennisGame.didInit = true;

		let css = {
			'.tennisbg':{
				'background-image':'url(https://static.vecteezy.com/system/resources/thumbnails/028/636/551/small_2x/view-of-a-tennis-court-with-light-from-the-spotlights-over-dark-background-photo.jpg)',
				'background-size':'100%',
				'background-position-x':'center',
				'background-position-y':'center',
			},

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

				'background-image':'url(proto/tennis-ball.webp)',
				'background-size':'120%;',
				'border-radius':rBall+'px',
			},

			

			'.tennisSVG':{
				'position':'absolute',
				'top':'0px',
				'left':'0px',

				
			},

			'.tennisArmLong':{
				'stroke-width':'20px',
				'stroke-linecap':'round',
				'stroke':'white',
				'fill':'none',
			},

			'tennispulse':{
				"display":"block",
				"position":"absolute",
				"width":(dBall+20)+"px",
				"height":(dBall+20)+"px",
				"border":'20px solid yellow',
				"border-radius":'100%',
				"transform":"translate(-50%,-50%)",
				
				"box-sizing":'border-box'
			},

			'tennisgame h1':{
				'position':'absolute',
				'top':'0px',
				'left':'0px',
				'right':'0px',
				'bottom':'0px',
				'line-height':'600px',
				'font-size':'100px',
				'padding':'0px',
				'margin':'0px',
				'text-align':'center',
				'color':'white',

			}
		}

		$("head").append('<style>'+Css.of(css)+'</style>');
	}

	let self = this;
	self.$el = $('<igb class="tennisbg">');

	$('<igbside>').appendTo(self.$el);
	let $center = $('<igbside>').appendTo(self.$el);
	let $right = $('<igbside>').appendTo(self.$el);
	
	let $game = $('<tennisgame>').appendTo($center);

	let $h = $('<h1>').appendTo($game);

	$('<tennisgamescore>').appendTo($game).text('0');
	$('<tennisgamescore>').appendTo($game).text('0');


	$game.on('mousemove',function(e){
		self.setPlayers([
			{px:e.offsetX/W*100 - 10,py:e.offsetY/W*100},
			{px:e.offsetX/W*100 + 10,py:e.offsetY/W*100},
			{},{},{},{},
			{px:e.offsetX/W*100 + 0,py:e.offsetY/W*100 - 5, rW:0,rX:-0.25,rY:0.5,rZ:0.5},
			]);
	})

	let dudes = [];
	for(var i=0; i<1; i++){
		let dude = new TennisDude(i,rDude);
		dude.$el.appendTo($game);
		dude.$rackethead.appendTo($game);
		dude.$arm = $(`<svg class='tennisSVG' width=${W} height=${H}>
				<path class='tennisArmLong' d='M150,150 L10,150'/>
			</svg>
		`).appendTo($game);
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

	function spawnBalls( ){

		isSpawnPending = false;

		for(var i in queue[iQueue%queue.length]) makeBall(queue[iQueue%queue.length][i]);

		iQueue++;
	}

	function makeBall( pos ){
		let $ball = $('<tennisgameball>').appendTo($game);

		//let r = -Math.random() * Math.PI;
		let r = -Math.PI + Math.PI*pos;

		let dist = W/2;

		let x = Math.cos(r)*dist*1.5;

		ball = {
			r:0,
			x:W/2 + x,
			y:H/2 + Math.sin(r)*dist,
			sx:-x*0.015,
			sy:-10,
			$el:$ball,
			isActive:true};

		balls.push(ball);
	}

	let isSpawnPending = false;
	spawnBalls();

	let prop = 'yaw';
	
	let was = []
	let players = [];
	let racket = {X:0,Y:0,px:40,py:50,rW:0,rX:-0.25,rY:0.5,rZ:0.5};
	let history = [];


	self.setPlayers = function(p){
		was = players.length?players.concat():p;
		if(p[6]) racket = p[6];
		players = p;
		players.length = 1;
		for(var p=0; p<players.length; p++){
			players[p].py = Math.min( 75, 35 + players[p].py );
			dudes[p].setX(players[p].px/100*W);
			dudes[p].setY(players[p].py/100*H);
			dudes[p].setHeight((1-players[p].py/100)*H);
		}

		let q = {W:racket.rW, X:racket.rX, Y:racket.rY, Z:racket.rZ};

		racket.yaw = getYaw(q);
		racket.roll = getRoll(q);
		racket.pitch = getPitch(q);

		racket.py = Math.min( 75, 35 + racket.py );

		dudes[0].$racket.css({ left:racket.px/100*W + 'px', top:racket.py/100*H + 'px', transform:'rotate('+racket.yaw+'rad)'});

		d=`
			M ${players[0].px/100*W + 30},${players[0].py/100*H + 130}
			L ${racket.px/100*W},${racket.py/100*H}
		`

		dudes[0].$arm.find('.tennisArmLong').attr('d',d);


		racket.cx = racket.px/100*W + Math.sin(racket.yaw)*320;
		racket.cy = racket.py/100*H - Math.cos(racket.yaw)*320;

		history.push({cx:racket.cx,cy:racket.cy});
		while(history.length>20) history.shift();

		dudes[0].$rackethead.css({ left:racket.cx + 'px', top: racket.cy + 'px' });
	}

	let collideDist = rDude+rBall;
	let wWas = 0;
	let nTick = 0;

	let scoreLeft = 0;
	let scoreRight = 0;
	let combo = 0;


	function tickBall(ball){
		ball.sy += 0.5;
		ball.y += ball.sy;
		ball.x += ball.sx;
		ball.r += ball.sx*0.5;

		if(ball.isActive){

			if(ball.y>H-rBall){
				ball.y = H-rBall
				ball.sy = -20;
				ball.isActive = false;

				combo = 0;

				$h.text('MISS');

				//spawnBall();
			} else {
				let px = racket.cx;
				let py = racket.cy;
				let xDif = ball.x-px;
				let yDif = ball.y-py;

				let dist = Math.sqrt( xDif*xDif + yDif*yDif );

				if(dist < collideDist){
					
					let xDelta = racket.cx - history[0].cx;
					let yDelta = racket.cy - history[0].cy;

					let r = Math.atan2(yDelta,xDelta);
					let d = Math.sqrt(xDelta*xDelta+yDelta*yDelta);
					let v = Math.max(20,Math.min(100,d*0.2));

					ball.sx = Math.cos(r) * v;
					ball.sy = Math.sin(r) * v;
					ball.isActive = false;


					$('<tennispulse>').css({
						left:ball.x+'px',
						top:ball.y+'px',
					}).prependTo($game).animate({width:'300px',height:'300px',opacity:0},400);

					$('<tennispulse>').css({
						left:ball.x+'px',
						top:ball.y+'px',
					}).prependTo($game).animate({width:'350px',height:'350px',opacity:0},300);

					$('<tennispulse>').css({
						left:ball.x+'px',
						top:ball.y+'px',
						width:'200px',height:'200px',
					}).prependTo($game).animate({width:'350px',height:'350px',opacity:0},700);

					combo++;
					$h.text('COMBO +'+combo);
				}


				ball.$el.css({'top':ball.y+'px',left:ball.x+'px','transform':'rotate('+ball.r+'deg)'});
			}

		} 
		
		ball.$el.css({'top':ball.y+'px',left:ball.x+'px','transform':'rotate('+ball.r+'deg)'});
		
	}

	
	function tick(){

		nTick++;

		wScreen = $center.width();
		if(wScreen != wWas){
			$game.css('transform','scale('+wScreen/W+')');
			wWas = wScreen;
		}

		let hasActiveBall = false;

		for(var b in balls){
			tickBall(balls[b]);
			if(balls[b].isActive) hasActiveBall = true;
		}

		if(!hasActiveBall && !isSpawnPending){
			isSpawnPending = true;
			setTimeout(spawnBalls,1000);
			//spawnBalls();
		}


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