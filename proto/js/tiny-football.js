TinyBall = function(x,y){

	let self = this;
	self.$el = $('<tinyball>');

	self.x = x;
	self.y = y;

	self.sx = 0;
	self.sy = 0;


	self.redraw = function(){

		

		self.$el.css({
			left:self.x+'px',
			top:self.y+'px',
		})
	}

	self.redraw(x,y);
}

TinyDude = function(x,y){

	let self = this;
	self.$el = $('<tinydude>');

	self.sx = 0;
	self.sy = 0;
	self.wx = 0;
	self.wy = 0;
	self.x = x;
	self.y = y;
	self.r = 0;

	self.redraw = function(){



		self.$el.css({
			left:self.x+'px',
			top:self.y+'px',
			'transform':'rotate('+(self.r+Math.PI)+'rad)'
		})
	}

	self.redraw(x,y);
}

TinyFootball = function(){

	let W = 1728;
	let H = 1080;
	let rBall = 25;
	let rDude = 50;
	let hGoal = 400;
	
	if(!TinyFootball.didInit){

		TinyFootball.didInit = true;

		let css = {

			'.tinygamebg':{
				'background':'darkgreen',
				
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
				'box-shadow':'inset 0px 0px 5px white',
			},

			'tinygame *':{
				'pointer-events':'none',
			},

			'tinyfield':{
				display:'block',
				position:'absolute',
				'top':'0px',
				'left':'0px',
				width:W+'px',
				height:H+'px',
				
				'background':'white',
				'box-sizing':'border-box',
				

				'transform':'rotateX(30deg) translateY(-50px) scale(0.85)',
				'transform-origin':'bottom center',

			},

			'tinyfield:after':{
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

			'tinyfield:before':{
				content:'""',
				display:'block',
				position:'absolute',
				'left':'10px',
				'right':'10px',
				'top':'10px',
				'bottom':'10px',
				'background':'green',
			},

			'tinyball':{
				display:'block',
				position:'absolute',
				width:rBall*2+'px',
				height:rBall*2+'px',
				'background':'white',
				'border-radius':rBall+'px',
				'transform':'translate(-50%,-50%)',

				'z-index':2,
			},

			'tinydude':{
				display:'block',
				position:'absolute',
				width:'0px',
				height:'0px',

				'z-index':1,
			},

			'tinydude:after':{
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
				'border':'5px solid white',
			},

			'tinydude:before':{
				content:'""',
				display:'block',
				position:'absolute',
				width: rDude*2+'px',
				height:rDude/2+'px',
				'top':-rDude/4+'px',
				'left':'0px',
				'background':'white',
			},

			'tinydude:nth-of-type(1):after':{ 'background':'red' },
			'tinydude:nth-of-type(2):after':{ 'background':'blue' },
			'tinydude:nth-of-type(3):after':{ 'background':'green' },
			'tinydude:nth-of-type(4):after':{ 'background':'purple' },
			'tinydude:nth-of-type(5):after':{ 'background':'orange' },
			'tinydude:nth-of-type(6):after':{ 'background':'yellow' },

			'tinygoal':{
				display:'block',
				'width':'200px',
				'height':hGoal+'px',
				'position':'absolute',
				'left':'-200px',
				'top':'50%',
				'transform':'translateY(-50%)',
				'border':'20px solid white',
				'border-radius':'20px',
				'box-sizing':'border-box',
				'border-right':'0px',
			},

			'tinygoal:last-of-type':{
				'left':'100%',
				'transform':'translateY(-50%) scaleX(-1)',
			}
		}

		$("head").append('<style>'+Css.of(css)+'</style>');
	}

	let self = this;
	self.$el = $('<igb class="tinygamebg">');

	$('<igbside>').appendTo(self.$el);
	let $center = $('<igbside>').appendTo(self.$el);
	let $right = $('<igbside>').appendTo(self.$el);

	let $game = $('<tinygame>').appendTo($center);
	let $field = $('<tinyfield>').appendTo($game);

	
	$('<tinygoal>').appendTo($field);
	$('<tinygoal>').appendTo($field);


	
	let dudes = [];
	while(dudes.length<6){
		let dude = new TinyDude(0,0);
		dude.$el.appendTo($field);
		dudes.push(dude);
	}

	let ball;
	let balls = [];

	function spawnBall(){
		

		ball = new TinyBall(W/2,H/2);
		ball.$el.appendTo($field);

		balls.push(ball);
	}



	spawnBall();
	

	let slowdown = 0.95;
	let wWas;
	let iDudeWas = -1;

	function tick(){

		let wScreen = $center.width();
		if(wScreen != wWas){
			$game.css('transform','scale('+wScreen/W+')');
			wWas = wScreen;
		}

		for(var b in balls){
			balls[b].sx *= slowdown;
			balls[b].sy *= slowdown;
			balls[b].x += balls[b].sx;
			balls[b].y += balls[b].sy;
			balls[b].redraw();
		}


		let isLeft = ball.x < rBall;
		let isRight = ball.x > (W-rBall);
		let isGoalish = ball.y>(H/2-hGoal/2) && ball.y<(H/2+hGoal/2);

		if((isLeft || isRight) && isGoalish){
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
				dudes[i].r = Math.atan2(dudes[i].sy,dudes[i].sx);

				dudes[i].wx = dudes[i].x;
				dudes[i].wy = dudes[i].y;
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

		//ball.step();


		//ball.redraw();
	}

	
	self.setPlayers = function(p){
		
		p.length = 6;
		for(var i=0; i<p.length; i++){
			dudes[i].x = (p[i].px/100)*W;
			dudes[i].y = H-(p[i].pz/100)*H;
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
	});

}