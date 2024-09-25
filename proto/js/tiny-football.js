TinyBall = function(x,y){

	let self = this;
	self.$el = $(`
		<tinyball>
			<tinyballsprite></tinyballsprite>
		</tinyball>`
	);

	self.x = x;
	self.y = y;
	self.z = 0;

	self.sx = 0;
	self.sy = 0;
	self.sz = 0;


	self.redraw = function(){

		

		self.$el.css({
			left:self.x+'px',
			top:self.y+'px',
		})

		self.$el.find('tinyballsprite').css({'height':self.z+'px'});
	}

	self.redraw(x,y);
}

TinyDude = function(x,y,n){

	const COLORS = ['red','blue','green','purple','orange','yellow'];
	let self = this;
	self.$el = $(`
		<tinydude>
			<tinyfootprint></tinyfootprint>
			<tinyavatar></tinyavatar>
		</tinydude>
		`);



	self.sx = 0;
	self.sy = 0;
	self.wx = 0;
	self.wy = 0;
	self.x = x;
	self.y = y;
	self.r = 0;
	self.racketHistory = [];
	self.history = [];
	self.swing = false;
	self.swinging = false;

	let meep = new Meep(COLORS[n]);
	meep.c.wArm = 0;
	meep.$el.appendTo(self.$el.find('tinyavatar'));

	self.redraw = function(){

		meep.c.r = self.r + Math.PI/2;

		self.$el.css({
			left:self.x+'px',
			top:self.y+'px',
		})

		self.$el.find('tinyfootprint').css({
			'transform':'rotate('+(self.r+Math.PI)+'rad)'
		})

		self.$el.find('tinyavatar').css({
			'z-index':self.y,
		})

		if(self.racket){

			let dirHand = (self.racket.x>self.x)?1:-1;

			self.$racket.css({
				left:(self.x+dirHand*50)+'px',
				top:self.y+'px',

			})

			let r = 120 * dirHand;

			if(self.swing && !self.swinging ){

				self.swinging = true;
				let rSwing = 20 * dirHand;
				self.$racket.find('tinyracketinner').css({transform:`rotate(${rSwing}deg)`});

				let $swoosh = $(`<tinyswoosh dir=${dirHand}>`).appendTo(self.$el.find('tinyavatar'));

				setTimeout(function(){
					$swoosh.remove();
					self.swing = false;
					self.swinging = false;
				},500);

			} else if(!self.swinging){
				self.$racket.find('tinyracketinner').css({transform:`rotate(${r}deg)`});
			}
		}
		
	}

	self.redraw(x,y);
}

TinyFootball = function(){

	let W = 1728;
	let H = 1080;
	let rBall = 25;
	let rDude = 50;
	let hGoal = 400;
	let typeGame = "tennis";
	
	if(!TinyFootball.didInit){

		TinyFootball.didInit = true;

		let css = {

			'.tinygamebg':{
				'background':'darkgreen',
				'background-image':'url(proto/img/bg-stadium.webp)',
				'background-position':'center top',
				'background-repeat':'no-repeat',
				'background-size':'100%',
			},

			'.tinygamebg button':{
				'padding':'0.5vw',
				'margin':'2vw 1vw',
				'background':'rgba(0,0,0,0.5)',
				'color':'white',
				'border':'none',
			},

			'.tinygamebg audio':{
				'position':'absolute',
				'left':'2vw',
				'bottom':'2vw',
			},

			'tinygame':{
				display:'block',
				position:'absolute',
				'top':'0px',
				'left':'0px',
				width:W+'px',
				height:H+'px',
				'transform-origin':'top left',

				'perspective':W+'px',
				
			},

			'tinyswoosh':{
				'display':'block',
				'width':'200px',
				'height':'200px',
				'background':"url(./proto/img/swoosh.png)",
				'position':'absolute',
				'left':'50px',
				'bottom':'100px',
				'background-size':'100%',
			},

			'tinyswoosh[dir="-1"]':{
				'left':'auto',
				'right':'50px',
				'transform':'scaleX(-1)',
			},



			'tinygame *':{
				'pointer-events':'none',
			},

			'tinyfield':{
				display:'block',
				position:'absolute',
				'bottom':'0px',
				'left':'0px',
				width:W+'px',
				height:H+'px',
				
				'background':'white',
				'box-sizing':'border-box',
				'background-image':'url(proto/img/bg-grass.png)',
				'background-size':'cover',

				'transform':'rotateX(30deg) translateY(-50px) scale(0.85)',
				'transform-origin':'bottom center',
				'transform-style':'preserve-3d',
			},

			'tinyplayarea':{
				display:'block',
				position:'absolute',
				'bottom':'0px',
				'left':'0px',
				width:W+'px',
				height:H+'px',
				
				'transform-style':'preserve-3d',
			},

			'tinymarkings':{
				display:'block',
				position:'absolute',
				'left':'0px',
				'right':'0px',
				'top':'0px',
				'bottom':'0px',
			},

			'tinymarkings:after':{
				content:'""',
				display:'block',
				position:'absolute',
				'left':'50%',
				'width':'10px',
				'top':'10px',
				'bottom':'10px',
				'background':'white',
				'transform':'translateX(-50%)',
			},

			'tinymarkings:before':{
				content:'""',
				display:'block',
				position:'absolute',
				'left':'5px',
				'right':'5px',
				'top':'5px',
				'bottom':'5px',
				'border':'10px solid white',
			},

			'tinyball':{
				display:'block',
				position:'absolute',
				'width':'0px',
				'height':'0px',
				'z-index':2,
				'transform-style':'preserve-3d',
			},

			'tinyball:before':{
				content:'""',
				display:'block',
				position:'absolute',
				width:rBall*2+'px',
				height:rBall*2+'px',
				'background':'black',
				'border-radius':rBall+'px',
				'top':-rBall+'px',
				'left':-rBall+'px',
				'opacity':0.5,
			},

			'tinydude':{
				display:'block',
				position:'absolute',
				width:'0px',
				height:'0px',

				'z-index':1,
				'transform-style':'preserve-3d',
			},

			'tinyfootprint':{
				display:'block',
				position:'absolute',
				width:'0px',
				height:'0px',
			},

			'tinyavatar':{
				display:'block',
				position:'absolute',
				'top':'0px',
				'left':'0px',
				'transform-style':'preserve-3d',
				'transform-origin':'bottom center',
				'transform':'rotateX(-30deg)',
			},



			'tinyballsprite':{
				display:'block',
				position:'absolute',
				'bottom':'0px',
				'left':'-32px',
				'width':'64px',
				'height':'0px',
			
				'transform-style':'preserve-3d',
				'transform':'rotateX(-30deg)',
				'transform-origin':'bottom center',
				'background':'rgba(255,255,255,0.1)',
			},

			'tinyballsprite:after':{
				content:'""',
				display:'block',
				position:'absolute',
				width:'64px',
				height:'64px',
				'background-image':'url(proto/img/football.png)',
				'background-size':'100%',
				'left':'0px',
				'top':'-64px',
				'transform-style':'preserve-3d',
				
				
			},



			'tinyfootprint:after':{
				content:'""',
				display:'block',
				position:'absolute',
				width:rDude*2+'px',
				height:rDude*2+'px',
				'background':'red',
				'border-radius':rDude+'px',
				'top':-rDude+'px',
				'left':-rDude+'px',
				'box-sizing':'border-box',
				'border':'10px solid white',
			},

			'tinyfootprint:before':{
				content:'""',
				display:'block',
				position:'absolute',
				width: rDude+'px',
				height:rDude+'px',
				'top':-rDude/2+'px',
				'left':rDude+'px',
				
				'transform':'rotate(45deg)',
				'box-sizing':'border-box',
				'border-top':'10px solid white',
				'border-right':'10px solid white',
			},

			'tinydude:nth-of-type(1) tinyfootprint:after':{ 'background':'red' },
			'tinydude:nth-of-type(2) tinyfootprint:after':{ 'background':'blue' },
			'tinydude:nth-of-type(3) tinyfootprint:after':{ 'background':'green' },
			'tinydude:nth-of-type(4) tinyfootprint:after':{ 'background':'purple' },
			'tinydude:nth-of-type(5) tinyfootprint:after':{ 'background':'orange' },
			'tinydude:nth-of-type(6) tinyfootprint:after':{ 'background':'yellow' },

			'tinygoal':{
				display:'block',
				'width':'200px',
				'height':hGoal+'px',
				'position':'absolute',
				'left':'-200px',
				'top':'50%',
				'transform':'translateY(-50%)',
				'border':'10px solid white',
				'border-radius':'20px 0px 0px 20px',
				'box-sizing':'border-box',
				'border-right':'0px',
				'background':'red',
			},

			

			'tinygoal:last-of-type':{
				'left':'100%',
				'transform':'translateY(-50%) scaleX(-1)',
				'background':'blue',
			},

			'tinyscore':{
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

			'tinyscore:last-of-type':{
				'right':'auto',
				'left':'50%',
				'background':'blue',
				'border-radius':'0px 0px 0.5vw 0vw',
			},

			'tinygame h1':{
				'position':'absolute',
				'top':'100px',
				'left':'0px',
				'right':'0px',
				
				'line-height':'200px',
				'font-size':'100px',
				'padding':'0px',
				'margin':'0px',
				'text-align':'center',
				'color':'white',
			},

			'tinynet':{
				'display':'block',
				'position':'absolute',
				'bottom':'50%',
				'left':'0px',
				'right':'0px',
				'height':'150px',
				
				'transform':'rotateX(-50deg)',
				'border':'10px solid white',
				'box-sizing':'border-box',
				'border-bottom':'none',
				'transform-origin':'bottom center',
				'background-image':'url(./proto/img/net-pattern.png)',

			},

			'tinyracket':{
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'top':'0px',

				'transform-origin':'bottom center',
				'transform-style':'preserve-3d',
				'transform':'rotateX(-50deg)',
			},

			'tinyracket:before':{
				'content':'""',
				'display':'block',
				'position':'absolute',
				'width':'100px',
				'height':'10px',
				'background':'black',
				'left':'-50px',
				'bottom':'0px',
				'border-radius':'100%',
				'opacity':'0.2',

			},

			'tinyracketinner':{
				'display':'block',
				'position':'absolute',
				'bottom':'150px',
				'left':'0px',
				'transition':'transform 0.2s'
			},

			'tinyracketinner:after':{
				'content':'""',
				'display':'block',
				'position':'absolute',
				'width':'100px',
				'height':'200px',
				
				'left':'-50px',
				'bottom':'0px',
				'background-image':'url(./proto/img/tennis-racket.png)',
				'background-size':'100%',


			},

			'[game=tennis] tinygoal':{
				'display':'none',
			},

			'[game=tennis] tinyfootprint:before':{
				'display':'none',
			},

			

			'[game=tennis] tinyballsprite:after':{
				'background-image':'url(./proto/img/tennis-ball.webp)',
			},

			'[game=tennis] tinyfield':{
				'height':H*2+'px',
				'transform':'rotateX(50deg) translateY(-50px) scale(0.85)',
				'transform-origin':'bottom center',
				'transform-style':'preserve-3d',
			},

			'[game=tennis] tinymarkings':{
				'margin':'200px',
			},

			'[game=tennis] tinyballsprite':{
				'transform':'rotateX(-50deg)',
			},

			'[game=tennis] tinyavatar':{
				'transform':'rotateX(-50deg)',
			},
		}

		$("head").append('<style>'+Css.of(css)+'</style>');
	}

	let self = this;
	self.$el = $('<igb class="tinygamebg">');

	$('<igbside>').appendTo(self.$el);
	let $center = $('<igbside>').appendTo(self.$el);
	let $right = $('<igbside>').appendTo(self.$el);

	$(`
		<audio autoplay controls loop>
			<source src="./proto/audio/cute-amp-classy-218551.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0].volume = 0.25;

	$('<button>FOOTBALL</button>').appendTo($right);
	$('<button>TENNIS</button>').appendTo($right);

	
	let $game = $(`<tinygame game=${typeGame}>`).appendTo($center);
	let $field = $('<tinyfield>').appendTo($game);
	$('<tinymarkings>').appendTo($field);
	let $playArea = $('<tinyplayarea>').appendTo($field);


	$('<tinyscore>').appendTo($center).text('0');
	$('<tinyscore>').appendTo($center).text('0');

	let $h = $('<h1>').appendTo($game);
	
	let scoreLeft = 0;
	let scoreRight = 0;
	let $sfxSwoosh;
	
	let dudes = [];
	let playerCount = (typeGame=='tennis')?2:6;
	while(dudes.length<playerCount){
		let dude = new TinyDude(0,0,dudes.length);
		dude.$el.appendTo($playArea);
		dudes.push(dude);
	}

	if(typeGame=='tennis'){
		dudes[0].r = Math.PI/2;
		dudes[1].r = -Math.PI/2;
		dudes[1].x = W/2;
		dudes[1].y = -H/2;
		$('<tinynet>').appendTo($field);

		dudes[0].$racket = $(`
			<tinyracket>
				<tinyracketinner></tinyracketinner>
			</tinyracket>
		`).appendTo($playArea);

		$sfxSwoosh = $(`<audio>
			<source src="./proto/audio/sfx-swoosh.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el);

		

	} else {
		$('<tinygoal>').appendTo($field);
		$('<tinygoal>').appendTo($field);
	}
	

	let ball;
	let balls = [];

	function spawnBall(){
		
		


		ball = new TinyBall(W/2,H/2);

		if(typeGame=='tennis'){
			ball.y = -H/2;
			ball.sy = 10;
			ball.sx = -10+Math.random()*20;
			ball.z = 200;
			ball.sz = 5;
		}

		ball.$el.appendTo($playArea);

		balls.push(ball);
	}



	spawnBall();
	

	
	let wWas;
	let iDudeWas = -1;
	let gravity = -0.2;

	function tick(){

		let wScreen = $center.width();
		if(wScreen != wWas){
			$game.css('transform','scale('+wScreen/W+')');
			wWas = wScreen;
		}

		let slowdown = (typeGame=='football')?0.95:1;
		for(var b in balls){
			balls[b].sx *= slowdown;
			balls[b].sy *= slowdown;
			balls[b].sz += gravity;
			balls[b].x += balls[b].sx;
			balls[b].y += balls[b].sy;
			balls[b].z += balls[b].sz;

			if(balls[b].z<0){
				balls[b].z = 0;
				balls[b].sz = -balls[b].sz;
			}

			balls[b].redraw();
		}

		if(typeGame=='football') tickFootball();
		if(typeGame=='tennis') tickTennis();
	}

	function tickTennis(){


		for(i in dudes){
			if(dudes[i].racket){
				
				dudes[i].history.push(dudes[i].y);
				while(dudes[i].history.length>fps/2) dudes[i].history.shift();
				let dyDude = dudes[i].history[dudes[i].history.length-1] - dudes[i].history[0];

				dudes[i].racketHistory.push(racket.y);
				while(dudes[i].racketHistory.length>fps/2) dudes[i].racketHistory.shift();
				let dyRacket = dudes[i].racketHistory[dudes[i].racketHistory.length-1] - dudes[i].racketHistory[0];
				
				let dy = dyRacket-dyDude;

				if( dy < -(H*0.05) && !dudes[i].swing ){
					//swing?
					dudes[i].swing = true;
					$sfxSwoosh[0].play();
				}

				if(dudes[i].swinging && ball.sy>0){


					let dx = ball.x - dudes[i].x;
					let dy = ball.y - dudes[i].y;

					
					let ox = Math.abs(dx);
					let oy = Math.abs(dy);

					if(ox<(W*0.2) && oy<(H*0.2)){
						//HIT!

						let dir = (dx>0)?1:-1;
						
					
						let trajectory = ox - (W*0.1);
						

						ball.sx = trajectory*0.05*dir;
						ball.sy = -15;
						ball.sz = 5;
					}
				}
			}
			dudes[i].redraw();
		}





		if(ball.y>H || ball.y<-H) spawnBall();
	}

	function tickFootball(){
		let isLeft = ball.x < rBall;
		let isRight = ball.x > (W-rBall);
		let isGoalish = ball.y>(H/2-hGoal/2) && ball.y<(H/2+hGoal/2);

		if((isLeft || isRight) && isGoalish){

			if(isLeft) scoreLeft++;
			if(isRight) scoreRight++;

			self.$el.find('tinyscore').eq(0).text(scoreLeft);
			self.$el.find('tinyscore').eq(1).text(scoreRight);

			$h.text('GOAL!');
			setTimeout(function(){
				$h.text('');
			},750);

			spawnBall();

		} else if(isLeft){
			ball.x = rBall;
			ball.sx = Math.abs(ball.sx);
		} else if(isRight){
			ball.x = W-rBall;
			ball.sx = -Math.abs(ball.sx);
		}

		if(ball.y < (rBall)){
			ball.y = rBall;
			ball.sy = Math.abs(ball.sy);
		}else if(ball.y > (H-rBall)){
			ball.y = H-rBall;
			ball.sy = -Math.abs(ball.sy);
		}


		let dMin = rBall + rDude;
		let iDudeIs = -1;

		for(i in dudes){

			let dx = dudes[i].x - ball.x;
			let dy = dudes[i].y - ball.y;
			let d = Math.sqrt(dx*dx + dy*dy);


			let dxMove = dudes[i].wx-dudes[i].x;
			let dyMove = dudes[i].wy-dudes[i].y;
			let dMove = Math.sqrt(dxMove*dxMove + dyMove*dyMove);

			if(dMove>30){
				dudes[i].sx = dxMove;
				dudes[i].sy = dyMove;
				dudes[i].wx = dudes[i].x;
				dudes[i].wy = dudes[i].y;
				dudes[i].r = Math.atan2(dyMove,dxMove);
			}
			
			if(d<dMin){
				iDudeIs = i;
				dMin = d;
			}
			
			dudes[i].redraw();
		}

		if(iDudeIs>-1){
		
			let r = Math.atan2(dudes[iDudeIs].sy,dudes[iDudeIs].sx);

			ball.x = dudes[iDudeIs].x - Math.cos(r)*(rDude/2);
			ball.y = dudes[iDudeIs].y - Math.sin(r)*(rDude/2);

			ball.sx = ball.sy = 0;

			if(iDudeIs != iDudeWas){
				dudes[iDudeIs].countdown = fps/2;
			} else {
				dudes[iDudeIs].countdown--;
				if(dudes[iDudeIs].countdown<=0){

					ball.x = dudes[iDudeIs].x - Math.cos(r)*(rBall+rDude);
					ball.y = dudes[iDudeIs].y - Math.sin(r)*(rBall+rDude);

					ball.sx = -Math.cos(r)*35;
					ball.sy = -Math.sin(r)*35;

					iDudeIs = -1;
				}
			}
		}

		iDudeWas = iDudeIs;
		
		ball.redraw();
	}

	let racket = {X:0,Y:0,px:40,py:50,rW:0,rX:-0.25,rY:0.5,rZ:0.5};
	self.setPlayers = function(p){
		

		if(typeGame=='tennis'){

			racket = p[6];
		
			/*let q = {
				W:racket.rW, X:racket.rX, Y:racket.rY, Z:racket.rZ,
			};

			racket.yaw = getYaw(q);
			racket.roll = getRoll(q);
			racket.pitch = getPitch(q);*/



			racket.x = (racket.px/100)*W;
			racket.y = H-(racket.pz/100)*H;



			dudes[0].racket = racket;

			p.length = 1;
		} else {
			p.length = 6;
		}
		
		for(var i=0; i<p.length; i++){
			dudes[i].x = (p[i].px/100)*W;
			dudes[i].y = H-(p[i].pz/100)*H;

			if(dudes[i].racket){
				if(dudes[i].racket.x>dudes[i].x) dudes[i].racket.x = dudes[i].x + 50;
				else dudes[i].racket.x = dudes[i].x - 50;

				dudes[i].racket.y = dudes[i].y;
			}
		}


	}

	let interval;
	let fps = 50;
	
	self.turnOnOff = function(b){
		clearInterval(interval);
		if(b) interval = setInterval(tick,1000/fps);
	}

	self.turnOnOff(true);

	$game.on('mousemove',function(e){
		dudes[0].x = e.offsetX;
		dudes[0].y = e.offsetY;

		//racket.x = dudes[0].x + 50;
		//racket.y = dudes[0].y;
		
	});

	$game.on('click',function(e){
		
		racket.y = dudes[0].y-10;
		
	});

}