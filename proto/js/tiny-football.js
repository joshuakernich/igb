TinyBall = function(x,y){

	let self = this;
	self.$el = $(`
		<tinyball>
			<tinyballsprite></tinyballsprite>
		</tinyball>`
	);

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

	let meep = new Meep(COLORS[n]);
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
				'background-image':'url(proto/img/bg-stadium.webp)',
				'background-position':'center top',
				'background-repeat':'no-repeat',
				'background-size':'100%',
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



				'transform-style':'preserve-3d',
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

				'background-image':'url(proto/img/bg-grass.png)',
				'background-size':'cover',

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
				'transform':'translate(-50%,-50%)',
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
				'top':'0px',
				'left':'0px',
				'transform-style':'preserve-3d',
			},

			'tinyballsprite:after':{
				content:'""',
				display:'block',
				position:'absolute',
				width:'64px',
				height:'64px',
				'background-image':'url(proto/img/football.png)',
				'background-size':'100%',
				'left':'-32px',
				'bottom':'0px',
				'transform-style':'preserve-3d',
				'transform':'rotateX(-30deg)',
				'transform-origin':'bottom center',
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

	$('<tinyscore>').appendTo($center).text('0');
	$('<tinyscore>').appendTo($center).text('0');

	let $h = $('<h1>').appendTo($game);

	let scoreLeft = 0;
	let scoreRight = 0;
	
	let dudes = [];
	while(dudes.length<6){
		let dude = new TinyDude(0,0,dudes.length);
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