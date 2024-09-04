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

	self.redraw = function(){



		self.$el.css({
			left:self.x+'px',
			top:self.y+'px',
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
				
				'background':'green',
				'box-sizing':'border-box',
				

				'transform':'rotateX(30deg) translateY(-50px)',
				'transform-origin':'bottom center',

			},

			'tinyball':{
				display:'block',
				position:'relative',
				width:rBall*2+'px',
				height:rBall*2+'px',
				'background':'white',
				'border-radius':rBall+'px',
				'transform':'translate(-50%,-50%)',
			},

			'tinydude':{
				display:'block',
				position:'absolute',
				width:rDude*2+'px',
				height:rDude*2+'px',
				'background':'red',
				'border-radius':rDude+'px',
				'transform':'translate(-50%,-50%)',
				'box-sizing':'border-box',
				'border':'5px solid white',
			},

			'tinydude:nth-of-type(1)':{ 'background':'red' },
			'tinydude:nth-of-type(2)':{ 'background':'blue' },
			'tinydude:nth-of-type(3)':{ 'background':'green' },
			'tinydude:nth-of-type(4)':{ 'background':'purple' },
			'tinydude:nth-of-type(5)':{ 'background':'orange' },
			'tinydude:nth-of-type(6)':{ 'background':'yellow' },

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

	let ball = new TinyBall(W/2,H/2);
	ball.$el.appendTo($field);

	let slowdown = 0.95;
	let wWas;
	let iDudeWas = -1;

	function tick(){

		let wScreen = $center.width();
		if(wScreen != wWas){
			$game.css('transform','scale('+wScreen/W+')');
			wWas = wScreen;
		}

		ball.sx *= slowdown;
		ball.sy *= slowdown;

		ball.x += ball.sx;
		ball.y += ball.sy;

		if(ball.x < (rBall)){
			ball.x = rBall;
			ball.sx = Math.abs(ball.sx);
		}

		if(ball.y < (rBall)){
			ball.y = rBall;
			ball.sy = Math.abs(ball.sy);
		}

		if(ball.x > (W-rBall)){
			ball.x = W-rBall;
			ball.sx = -Math.abs(ball.sx);
		}

		if(ball.y > (H-rBall)){
			ball.y = H-rBall;
			ball.sy = -Math.abs(ball.sy);
		}


		let dMin = rBall + rDude;
		let iDudeIs = -1;

		for(i in dudes){

			dudes[i].redraw();

			let dx = dudes[i].x - ball.x;
			let dy = dudes[i].y - ball.y;
			let d = Math.sqrt(dx*dx + dy*dy);

			dudes[i].sx = dudes[i].wx-dudes[i].x;
			dudes[i].sy = dudes[i].wy-dudes[i].y;

			dudes[i].wx = dudes[i].x;
			dudes[i].wy = dudes[i].y;
			
			if(d<dMin){
				iDudeIs = i;
				dMin = d;
			}
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

					ball.sx = -Math.cos(r)*25;
					ball.sy = -Math.sin(r)*25;

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
			dudes[i].y = (p[i].pz/100)*H;
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