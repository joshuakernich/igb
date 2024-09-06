BatClimbing = function(){

	let W = 1728;
	let H = 1080;
	let GRID = 150;
	let LEVEL = 300;
	
	if(!BatClimbing.didInit){

		BatClimbing.didInit = true;

		let css = {

			
		
			'batgame':{
				display:'block',
				position:'absolute',
				'top':'0px',
				'left':'0px',
				width:W*3+'px',
				height:H+'px',
				'transform-origin':'top left',
				'perspective':W+'px',
				
				'text-align':'center',
			},

			'batside':{
				'display':'inline-block',
				'width':W+'px',
				'height':H+'px',
				'vertical-align':'top',
				'position':'relative',
			},

			'battower':{
				display:'block',
				'width':'1350px',
				'background':'black',
				'position':'absolute',
				
				'bottom':'0px',
				'left':'0px',
				'right':'0px',
				'margin':'auto',

				'padding-bottom':'150px',
			},

			'batlevel':{
				display:'block',
				'height':'300px',
				'border-top':'20px solid black',
				'box-sizing':'border-box',
				'background':'#555',
				'position':'relative',
			},

			'batgrid':{
				'display':'inline-block',
				'height':'100%',
				'width':'150px',
				
				'background':'transparent',
				'position':'relative',
			},

			'batgrid:nth-of-type(even):after':{
				'content':'""',
				'display':'block',
				'position':'absolute',
				'left':'20px',
				'right':'20px',
				'top':'20px',
				'bottom':'40px',
				'background':'rgba(255,255,255,0.1)',
			},

			'batwindow':{
				
				'display':'block',
				'position':'absolute',
				'left':'20px',
				'right':'20px',
				'top':'20px',
				'bottom':'40px',
				'background':'white',
			},

			'batwindow.peak:after':{
				'content':'""',
				'display':'block',
				'position':'absolute',
				'left':'50%',
				'right':'0px',
				'top':'40px',
				'bottom':'0px',
				'background':'red',
				'border-radius':'50px 0px 0px 0px',
			},

			'batwindow.attack:after':{
				'left':'10px',
				'right':'10px',
				'top':'40px',
				'border-radius':'50px 50px 0px 0px',
			},



			'batman':{
				'display':'block',
				'height':'0px',
				'width':'0px',
				'position':'absolute',
				'bottom':'0px',
				'z-index':2,
				
			},

			'batman:after, batthrower:after':{
				'content':'""',
				'display':'block',
				'height':'200px',
				'width':'100px',
				'background':'black',
				'position':'absolute',
				'bottom':'0px',
				'left':'-50px',
				'border-radius':'50px 50px 0px 0px',
			},

			'batthrower:after':{
				'background':'red',
			},

			'batgrapnel, batbox, batthrower':{
				'display':'block',
				'height':'0px',
				'width':'0px',
				'position':'absolute',
				'bottom':'0px',
				'left':'50%',
			},

			'batbox:after':{
				'content':'""',
				'display':'block',
				'height':'80px',
				'width':'80px',
				'left':'-40px',
				'bottom':'0px',
				'background':'black',
				'position':'absolute',
			},

			'batgrapnel:before':{
				'content':'""',
				'display':'block',
				'height':'100px',
				'width':'100px',
				'background':'white',
				'position':'absolute',
				'bottom':'70px',
				'left':'-50px',
				'border-radius':'50px',
			},

			'batgrapnel:after':{
				'content':'""',
				'position':'absolute',
				'display':'block',
				'height':'50px',
				'width':'50px',
				'border-top':'20px solid orange',
				'border-right':'20px solid orange',
				'box-sizing':'border-box',
				'bottom':'95px',
				'left':'-25px',
				'transform':'rotate(-45deg)',
			},

			'batgrapnel[type=">"]:after':{
				'transform':'rotate(45deg)'
			},

			'batgrapnel[type="<"]:after':{
				'transform':'rotate(-135deg)'
			},

			'grapshot':{
				'display':'block',
				'height':'0px',
				'width':'100px',
				'position':'absolute',
				'top':'0px',
				'left':'0px',
				'transform-origin':'top left',
				'z-index':1,
			},

			'grapshot:before':{
				'content':'""',
				'display':'block',
				'height':'40px',
				'width':'40px',
				'background':'white',
				'position':'absolute',
				'top':'-20px',
				'left':'-20px',
				'border-radius':'20px',
			},

			'grapshot:after':{
				'content':'""',
				'display':'block',
				'height':'10px',
				'width':'100%',
				'background':'white',
				'position':'absolute',
				'bottom':'-5px',
				'left':'0px',
			},


		}

		$("head").append('<style>'+Css.of(css)+'</style>');
	}

	let self = this;
	self.$el = $('<igb>');
	let $game = $('<batgame>').appendTo(self.$el);

	let data = 
	[
		
		['---------','^-}----B-','---------'],
		['---------','--------^','---------'],
		['---------','^-------S','---------'],
		['---------','---W---W^','---------'],
		['---------','^W---W---','---------'],
		['---------','---W---W^','---------'],
		['---------','^--W-----','---------'],
		['---------','-----W--^','---------'],
		['---------','^--W-----','---------'],
		['---------','--------^','---------'],
		['---------','--^------','---------'],
		['---------','------^--','---------'],
	]


	let towers = [];
	let windows = [];
	let grapnels = [];
	let boxes = [];
	let throwers = [];

	for(var t=0; t<3; t++){

		let $side= $('<batside>').appendTo($game);
		let $t = $('<battower>').appendTo($side);
		towers[t] = { $el:$t, $ls:[] };

	}

	for(var l in data){

		for(var t=0; t<data[l].length; t++){

			let $l = $('<batlevel>').appendTo(towers[t].$el);

			towers[t].$ls[l] = $l;

			for(var n=0; n<data[l][t].length; n++){
				
				let type = data[l][t][n];

				let $g = $('<batgrid>').appendTo($l);

				if(type=='S') man = { t:t, x:n+0.5, ox:0, y:l, $el:$('<batman>').appendTo($l) };
				if(type=='}') throwers.push({ t:t, x:n+0.5, y:l, $el:$('<batthrower>').appendTo($g) });
				if(type=='B') boxes.push({ t:t, x:n+0.5, y:l, $el:$('<batbox>').appendTo($g) });
				if(type=='W') windows.push({ t:t, tick:0, x:n+0.5, y:l, $el:$('<batwindow>').appendTo($g) });
				if(type=='^' || type=='>' || type=='<') grapnels.push({ dir:type, t:t, x:n+0.5, y:l, $el:$('<batgrapnel>').appendTo($g).attr('type',type) });
				

			}
		}
	}
	
	let iStage = Math.floor((data.length-man.y-1)/3);
	self.$el.find('battower').css({'bottom':-iStage*3*LEVEL+'px'});

	let wWas;
	let iDudeWas = -1;
	let interval;
	let fps = 50;
	let isLeft = false;
	let isRight = false;
	let isRetractGrapshot = false;

	let grapshot = { $el:$('<grapshot>') }
	

	function tick(){

		let wScreen = self.$el.width();
		if(wScreen != wWas){
			$game.css('transform','scale('+wScreen/(W*3)+')');
			wWas = wScreen;
		}

		if(isRetractGrapshot) man.ox *= 0.95;

		if(isLeft) man.x -= 0.2;
		if(isRight) man.x += 0.2;

		if(man.x<0.2) man.x = 0.2;
		if(man.x>8.8) man.x = 8.8;

		for(var g in grapnels){
			if(grapnels[g].t == man.t && grapnels[g].y == man.y){
				let d = Math.abs(man.x-grapnels[g].x);

				if(d<0.2){
					grapnels[g].$el.remove();

					if(grapnels[g].dir == '^'){
						man.y = grapnels[g].y-1;
						grapshot.x = grapnels[g].x;

						man.$el.css({'bottom':'-300px'});

						let iStage = Math.floor((data.length-man.y-1)/3);

						self.$el.find('battower').animate({'bottom':-iStage*3*LEVEL+'px'});
					}

					if(grapnels[g].dir == '>'){
						man.t = grapnels[g].t+1;
						grapshot.x = 0.5;
						
						let jumpTo = 4;

						isRetractGrapshot = false;
						man.ox = -W - (jumpTo-man.x)*GRID;
						man.x = jumpTo;
					}

					if(grapnels[g].dir == '<'){
						man.t = grapnels[g].t-1;
						grapshot.x = 8.5;
			
						let jumpTo = 5;

						isRetractGrapshot = false;
						man.ox = W - (jumpTo-man.x)*GRID;
						man.x = jumpTo;
					}

					towers[man.t].$ls[man.y].append(man.$el);

					
					grapshot.y = man.y;
					grapshot.$el.appendTo(towers[man.t].$ls[man.y]).css({'left':grapshot.x*GRID+'px','width':LEVEL});

					man.$el
					.delay(200)
					.animate({'bottom':'50px',},{duration:500,start:function(){ isRetractGrapshot = true; } ,complete:hideGrapshot})
					.animate({'bottom':'0px',},{duration:200})
				}
			}
		}

		for(var w in windows){
			windows[w].tick = (windows[w].tick+1)%(fps*3);

			if(windows[w].tick == fps) windows[w].$el.addClass('peak');
			if(windows[w].tick == fps*2) windows[w].$el.addClass('attack');
			if(windows[w].tick == 0) windows[w].$el.removeClass('peak attack');
		}

		man.$el.css({left:(man.x*GRID+man.ox)+'px'});

		let dx = grapshot.x*GRID - (man.x*GRID + man.ox);
		let dy = (grapshot.y-1)*LEVEL - man.y*LEVEL + parseFloat(man.$el.css('bottom')) + 130;

		let d = Math.sqrt(dx*dx+dy*dy);
		let r = Math.atan2(dy,dx) + Math.PI;

		
		grapshot.$el.css({'transform':'rotate('+r+'rad)', 'width':d+'px'});
	}

	function hideGrapshot(){
		grapshot.$el.remove();
	}


	$(document).on('keydown',function(e){
		if(e.which == 37) isLeft = true;
		if(e.which == 39) isRight = true;
	})

	$(document).on('keyup',function(e){
		if(e.which == 37) isLeft = false;
		if(e.which == 39) isRight = false;
	})
	
	self.turnOnOff = function(b){
		clearInterval(interval);
		if(b) interval = setInterval(tick,1000/fps);
	}

	self.turnOnOff(true);
}