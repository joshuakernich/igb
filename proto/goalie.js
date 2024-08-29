
GoalieDude = function(p,rDude){

	let dDude = rDude*2;

	if(!GoalieDude.didInit){

		GoalieDude.didInit = true;
		
		let css = {

			'goaliedude':{
				display:'block',
				position:'absolute',
				bottom: '0px',
				left: '0px',
				'opacity':0.2,
			},

			'goaliedudehead':{
				width: dDude+'px',
				height: dDude*1.2+'px',
				display:'block',
				position:'absolute',
				left: -rDude+'px',
				top: -rDude+'px',
				background: 'white',
				'border-radius': rDude+'px',
				//'background-image':'url(https://www.pngall.com/wp-content/uploads/14/Anime-Face-PNG-Images-HD.png)',
				'background-size':'50%',
				'background-position':'center 130px',
				'background-repeat':'no-repeat',
			},

			'goaliedudehead:after':{
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

			'goaliedude:nth-of-type(2) goaliedudehead:after':{
				background: 'blue',
			},

			'goaliedudebody':{
				display:'block',
				position:'absolute',
				width: '80px',
				left: '-40px',
				height: '135px',
				background: 'linear-gradient(to bottom, #ddd, white)',

				top: '100px',
				'border-radius':'20px',

			},

			'goaliedude svg':{
				display:'block',
				position:'absolute',
				top: '-350px',
				left: '-150px',
				'stroke-width':'20px',
				'stroke-linecap':'round',
				'stroke':'white',
				'fill':'none',
			},

			'goaliehands':{
				display:'block',
				'width':'0px',
				'height':'0px',
				
				'position':'absolute',
				'top':'0px',
				'left':'0px',
				
			},

			'goaliehands:after':{
				content:'""',
				display:'block',
				'width':'250px',
				'height':'160px',
				
				'background-image':'url(proto/football-gloves.png)',
				'background-size':'100%',
				'position':'absolute',
				'transform':'translate(-50%, -50%)'


			},

			'goaliehandshead':{
				display:'block',
				width:dDude+'px',
				height:dDude+'px',
				transform:'translate(-50%,-50%)',
				
				'position':'absolute',
				'border-radius':rDude+'px',
				'opacity':'0.1',
			}
		}

		$("head").append('<style>'+Css.of(css)+'</style>');

	}

	let self = this;
	self.$el = $(`
			<goaliedude>
				<svg width=300 height=1000 viewBox="0 -350 300 1000">
					
					<path class='goalieArm' d='M110,150 L50,200 L100,220'/>
					<path class='goalieArm' d='M110,150 L50,200 L100,220'/>
					<path class='goalieleg' d='M120,220 L120,500'/>
					<path class='goalieleg' d='M180,220 L180,500'/>
				</svg>
				<goaliedudebody></goaliedudebody>
				<goaliedudehead></goaliedudehead>
			</goaliedude>
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

		self.$el.find('.goalieleg').eq(0).attr('d',dLeft);
		self.$el.find('.goalieleg').eq(1).attr('d',dRight);
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

		self.$el.find('.goalieArm').eq(0).attr('d',dLeft);
		self.$el.find('.goalieArm').eq(1).attr('d',dRight);
	}

	self.setReach = function(r){

		r += 70;

		let dRight = 'M120,150 Q-50,0 70,'+(r);
		let dLeft = 'M180,150 Q350,0 230,'+(r);
	
		self.$el.find('.goalieArm').eq(0).attr('d',dLeft);
		self.$el.find('.goalieArm').eq(1).attr('d',dRight);
	}

	self.$hands = $('<goaliehands>');
	self.$rackethead = $('<goalierackethead>');
	
}

GoalieGame = function () {
	
	let W = 1728;
	let H = 1080;
	let rBall = 100;
	let rDude = 90;
	let dBall = rBall*2;
	let dDude = rDude*2;
	let minHeader = 20;
	let fps = 50;	

	let ground = 150;

	
	if(!GoalieGame.didInit){

		GoalieGame.didInit = true;

		let css = {
			'.goaliebg':{
				'background-image':'url(proto/bg-stadium.webp)',
				'background-size':'100%',
				'background-position':'center',
			},

			'goaliegame':{
				display:'block',
				position:'relative',
				width:W+'px',
				height:H+'px',
				'transform-origin':'top left',
			},

			'goaliegame *':{
				'pointer-events':'none',
			},

			'goaliegameball':{
				display:'block',
				position:'absolute',
			},

			'goaliegameball:after':{
				content: '""',
				width: dBall+'px',
				height: dBall+'px',
				'border-radius': rBall+'px',
				background: 'white',
				display:'block',
				position:'absolute',
				left: -rBall+'px',
				top: -rBall+'px',

				'background-image':'url(proto/football.png)',
				'background-size':'100%;',
				'border-radius':rBall+'px',
			},

			

			'.goalieSVG':{
				'position':'absolute',
				'top':'0px',
				'left':'0px',

				
			},

			'.goalieArmLong':{
				'stroke-width':'20px',
				'stroke-linecap':'round',
				'stroke':'white',
				'fill':'none',
			}, 

			'goaliegoal':{
				'display':'block',
				'position':'absolute',
				'top':'0px',
				'left':'-100%',
				'right':'-100%',
				'bottom':'0px',
				'background-image':'url(proto/goal-inside.png)',
				'background-size':'100%',

			},

			'goaliegameshadow':{
				'display':'block',
				'position':'absolute',
				'top':'0px',
				'left':'0px',

			},

			'goaliegameshadow:after':{
				content: '""',
				'display':'block',
				'position':'absolute',
				'top':'0px',
				'left':'0px',
				'width':dBall+'px',
				'height':dBall/3+'px',
				'border-radius':'100%',
				'background':'black',
				'transform':'translate(-50%,-50%)',
				'opacity':0.2,
			}
		}

		$("head").append('<style>'+Css.of(css)+'</style>');
	}

	let self = this;
	self.$el = $('<igb class="goaliebg">');

	

	$('<igbside>').appendTo(self.$el);
	let $center = $('<igbside>').appendTo(self.$el);
	let $right = $('<igbside>').appendTo(self.$el);
	let $game = $('<goaliegame>').appendTo($center);

	$('<goaliegoal>').appendTo($game);

	$('<goaliegamescore>').appendTo($game).text('0');
	$('<goaliegamescore>').appendTo($game).text('0');

	$game.on('mousemove',function(e){
		self.setPlayers([
			{px:e.offsetX/W*100,py:e.offsetY/H*100},
			{},
			{},{},{},{},
			{px:e.offsetX/W*100 + 0,py:e.offsetY/W*100 - 5, rW:0,rX:-0.25,rY:0.5,rZ:0.5},
			]);
	})

	let dudes = [];
	for(var i=0; i<1; i++){
		let dude = new GoalieDude(i,rDude);
		dude.$hands.appendTo($game);
		dude.$el.appendTo($game);
		dude.$rackethead.appendTo($game);
		

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

	function spawnBall(){
		let $shadow = $('<goaliegameshadow>').prependTo($game).css({opacity:0});
		let $ball = $('<goaliegameball>').prependTo($game).css({opacity:0});

		
		let x = 150 + Math.random()*(W-300);
		let y = 250 + Math.random()*(H-600);


		ball = {
			r:0,
			x:x,
			elevation: H-y,
			curve: -500 + Math.random()* 1000,
			depth: 100,
			
			$el:$ball,
			$shadow:$shadow,
			isActive:true};

		balls.push(ball);
	}

	//spawnBalls();

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
			let pyHead = Math.min( 75, 35 + players[p].py );
			dudes[p].setX(players[p].px/100*W);
			dudes[p].setY(pyHead/100*H);
			dudes[p].setHeight((1-pyHead/100)*H);

			let q = {W:players[p].rW, X:players[p].rX, Y:players[p].rY, Z:players[p].rZ};
			players[p].yaw = getYaw(q);
			players[p].roll = getRoll(q);
			players[p].pitch = getPitch(q);

			//dudes[p].$hands.css({ left:players[p].px/100*W + 'px', top:players[p].py/100*H + 'px', transform:'rotate('+players[p].yaw+'rad)'});
			dudes[p].$hands.css({ left:players[p].px/100*W + 'px', top:players[p].py/100*H + 'px'});

			dudes[p].setReach((players[p].py-pyHead)/100*H);
		}


	}

	let collideDist = rDude+rBall;
	let wWas = 0;
	let nTick = 0;

	let scoreLeft = 0;
	let scoreRight = 0;


	function tickBall(ball){
		ball.depth --;
		//ball.y += ball.sy;
		//ball.x += ball.sx;
		ball.r += ball.sx*0.5;

		if(ball.isActive){

			if(ball.depth==0){
				ball.isActive = false;
			}

			if(ball.y>H-rBall){
				ball.y = H-rBall
				ball.sy = -20;
				ball.isActive = false;

				//spawnBall();
			} else {
				
				/*let px = players[0].px;
				let py = players[0].py;
				let xDif = ball.x-px;
				let yDif = ball.y-py;

				let dist = Math.sqrt( xDif*xDif + yDif*yDif );

				if(dist < collideDist){
					
					ball.isActive = false;



					//spawnBall();
				}*/

				
			}

		} 

		
		
		let scale = 0.2 + (100-ball.depth)/100*0.8;
		let o = ball.depth>0?1:1+ball.depth/10;

		let p = Math.min( 1, 1-(ball.depth/100));

		let pCurve = Math.sin(p*Math.PI)*1;
		let pHeight = p + pCurve;



			//'transform':'rotate('+ball.r+'deg), scale('+scale+')'
		ball.$el.css({
			'top':(H-ground-rBall-(ball.elevation-ground-rBall)*pHeight)+'px',
			'left':(ball.x+pCurve*ball.curve)+'px',
			'transform':'scale('+scale+')',
			'opacity':o,
		});
		
		ball.$shadow.css({
			'top':(H-ball.depth-50)+'px',
			'left':ball.x+'px',
			'transform':'scale('+scale+')',
			'opacity':o,
		});
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

		if(!hasActiveBall) spawnBall();


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