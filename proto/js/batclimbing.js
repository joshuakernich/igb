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
				
				
				'text-align':'center',


				'background-image': 'url(./proto/img/bat-skyline.png)',
				'background-size': '33.3%',
			
			},

			'batgame:before':{
				content:'""',
				'background':'linear-gradient(to top, rgba(255,255,255,0.2), transparent, transparent)',
				display:'block',
				position:'absolute',
				'top':'0px',
				'left':'0px',
				'right':'0px',
				'bottom':'0px',
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
				
				'position':'absolute',
				
				'bottom':'0px',
				'left':'0px',
				'right':'0px',
				'margin':'auto',

				'padding-bottom':'100px',

			},

			'batlevel':{
				'display':'block',
				'height':'300px',
				'box-sizing':'border-box',
				'position':'relative',
				'perspective':W+'px',
			},


			

			'batside:nth-of-type(2) batlevel:first-of-type:before':{
				'content':'"ACE CHEMICALS"',
				'text-align':'center',
				'line-height':'160px',
				'color':'white',
				'font-size':'200px',
				'display':"block",
				'position':'absolute',
				'left':'0px',
				'right':'0px',
				'bottom':'0px',
				'text-shadow': '0px 0px 20px yellow, 0px 0px 50px white',
				'white-space':'normal',
				'perspective':'500px',
				'transform':'rotateX(45deg)',
				
				'transform-origin':'bottom center',
				'z-index':'1',
			},

			'batgrid':{
				'display':'inline-block',
				'height':'100%',
				'width':'150px',
				
				'background':'transparent',
				'position':'relative',
				'border-top':'2px solid white',
				'box-sizing':'border-box',
				'background':'#210A37',
			},

			'batgrid[fall="Y"]':{
				'border-top':'none',
				'background':'none',
			},

			
			

			'batgrid:nth-of-type(even):after':{
				'content':'""',
				'display':'block',
				'position':'absolute',
				'left':'20px',
				'right':'20px',
				'top':'20px',
				'bottom':'40px',
				'background':'rgba(255,255,255,0.05)',
			},

			'batgrid[fall="Y"]:after':{
				'display':'none',
			},

			'batlevel:first-of-type batgrid':{
				'background':'none',
				'border-top':"none",
			},

			'batlevel:first-of-type batgrid:after':{
				'display':'none',
			},

			'batgrid[scaffold="Y"]':{
				'box-sizing':'border-box',
				
				'border-left':'20px solid #2C1641',
				'border-right':'20px solid #2C1641',
				'border-top':'40px solid #2C1641 !important',

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
				'background':'orange',
				'border-radius':'50px 0px 0px 0px',
			},

			'batwindow.attack:after':{
				'left':'10px',
				'right':'10px',
				'top':'40px',
				'border-radius':'50px 50px 0px 0px',
				'background':'red',
			},



			'batman':{
				'display':'block',
				'height':'0px',
				'width':'0px',
				'position':'absolute',
				'bottom':'0px',
				'z-index':'200',
				
			},

			'batjoker:after':{
				'content':'" "',
				'display':'block',
				'height':'200px',
				'width':'100px',
				'background':'black',
				'position':'absolute',
				'bottom':'0px',
				'left':'-50px',
				'border-radius':'50px 50px 0px 0px',
				'background-image':'url(./proto/img/climb-joker-face.png)',
				'background-size':'100%',
				'background-position':'top center',
				'background-repeat':'no-repeat',
				'box-shadow':'inset 0px 2px white',


			},

			'batthrower:after':{
				'content':'" "',
				'display':'block',
				'height':'200px',
				'width':'100px',
				'background':'orange',
				'position':'absolute',
				'bottom':'0px',
				'left':'-50px',
				'border-radius':'50px 50px 0px 0px',
			},

			'batman:after':{
				'content':'""',
				'display':'block',
				'height':'230px',
				'width':'100px',
				'position':'absolute',
				'bottom':'0px',
				'left':'-50px',
				'background-image':'url(./proto/img/climb-avatar-red.png)',
				'background-size':'100%',
			},

			'batcheckpoint:after':{
				'content':'""',
				'display':'block',
				'height':'200px',
				'width':'100px',
				'position':'absolute',
				'bottom':'0px',
				'left':'-50px',
				'background-image':'url(proto/img/bat-checkpoint.png)',
				'background-size':'100%',
			},


			'batthrower.warning:after':{
				'background':'red',
			},

			'batgrapnel, batbox, batthrower, batbarrel, batcheckpoint, batjoker':{
				'display':'block',
				'height':'0px',
				'width':'0px',
				'position':'absolute',
				'bottom':'0px',
				'left':'50%',
				'z-index':'2',
			},

			'batbarrel:after':{
				'content':'""',
				'display':'block',
				'height':'80px',
				'width':'80px',
				'left':'-40px',
				'bottom':'0px',
				'background':'red',
				'position':'absolute',
				'border-radius':'40px',
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
				'border':'2px solid white',
				'box-sizing':'border-box',
				'position':'absolute',
				'bottom':'70px',
				'left':'-50px',
				'border-radius':'50px',
			},

			'batgrapnel:after':{
				'content':'""',
				'position':'absolute',
				'display':'block',
				'height':'30px',
				'width':'30px',
				'border-top':'2px solid white',
				'border-right':'2px solid white',
				'box-sizing':'border-box',
				'bottom':'105px',
				'left':'-15px',
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

			'batjokerbarrel':{
				'display':'block',
				'height':'100px',
				'width':'100px',
				'background':'purple',
				'position':"absolute",
				'transform':'translate(-50%, -100%)',
				'border-radius':"100%",
			},


		}

		$("head").append('<style>'+Css.of(css)+'</style>');
	}

	let self = this;
	self.$el = $('<igb>');
	let $game = $('<batgame>').appendTo(self.$el);

	let SCAFFOLD = [
		['NNNNYNNNN','NYNNNNNYN','NNNNYNNNN'],
		['NNNNNNNNN','NYNYYYNYN','NNNNNNNNN'],
		['NNNNNNNNN','NYYYYYYYN','NNNNNNNNN'],
	]

	let fall = [
		['YYNNNNNYY','YYYYYYYYY','YYNNNNNYY'],
		['YNNNNNNNY','YYYYYYYYY','YNNNNNNNY'],
		['NNNNNNNNN','NNNNNNNNN','NNNNNNNNN'],
	]

	let data = 
	[
		['------>--','----J----','--<------'],
		['----^----','  -----  ','----^----'],
		['--^------','<---S--->','------^--'],

		['---------','}---^---{','---------'],
		['---------','--^---^--','---------'],
		['C--W-W-->','----^----','<--W-W--C'],

		['^}-----B-','---------','-B-----{^'],
		['-B------^','---------','^------B-'],
		['^--------','<-C----->','--------^'],
		
		['---------','--^------','<--W-W---'],
		['------{->','-------->','------{-^'],
		['^--------','<-}------','<-------C'],

		['---------','------{->','--------^'],
		['---------','^-}------','<--------'],
		['---------','---------','-C-W-W--^'],
		
		['---------','-}-----B-','-^-}-----'],
		['---------','-------->','--------^'],
		['---------','^--W-W--C','---------'],

		['---------','-B----{-^','---------'],
		['---------','^--------','---------'],
		['---------','----^---C','---------'],

		['---------','--B---{-^','---------'],
		['---------','^--------','---------'],
		['---------','--^-----C','---------'],

		['---------','---W---W^','---------'],
		['---------','^W---W---','---------'],
		['---------','C--W---W^','---------'],

		['---------','^--W-----','---------'],
		['---------','-----W--^','---------'],
		['---------','^--W----C','---------'],

		['---------','--------^','---------'],
		['---------','--^------','---------'],
		['---------','-C----^--','---------'],
	]

	let audio = new AudioContext();
	audio.add('music','./proto/audio/climb-music.mp3',0.5,true,true);
	audio.add('hook','./proto/audio/climb-hook.mp3',1);
	audio.add('winch','./proto/audio/climb-winch.mp3',0.2);
	audio.add('arm','./proto/audio/climb-arm.mp3',0.5);
	audio.add('bounce','./proto/audio/climb-bounce.mp3',0.1);

	let towers = [];
	let windows = [];
	let grapnels = [];
	let boxes = [];
	let throwers = [];
	let barrels = [];
	let checkpoints = [];

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

				let $g = $('<batgrid>').appendTo($l).attr('type',type);

				if(fall[l] && fall[l][t][n] == 'Y'){
					$g.attr('fall','Y');
				}

				if(SCAFFOLD[l] && SCAFFOLD[l][t][n] == 'Y'){
					$g.attr('scaffold','Y');
				}

				if(fall[l-1] && fall[l-1][t][n] == 'Y'){
					$g.attr('fall','Y');
				}
				
				if(type=='C') checkpoints.push({ t:t, x:n+0.5, ox:0, y:l, $el:$('<batcheckpoint>').appendTo($g) });
				if(type=='S') man = { dir:1, t:t, x:n+0.5, ox:0, y:l, $el:$('<batman>').appendTo($l) };
				if(type=='J') joker = { n:0, dir:1, t:t, x:n+0.5, ox:0, y:l, $el:$('<batjoker>').appendTo($l) };
				if(type=='}' || type=='{') throwers.push({ tick:0, t:t, x:n+0.5, y:l, $el:$('<batthrower>').appendTo($g), dir:type=='}'?1:-1 });
				if(type=='B') boxes.push({ t:t, x:n+0.5, y:l, $el:$('<batbox>').appendTo($g) });
				if(type=='W') windows.push({ t:t, tick:0, x:n+0.5, y:l, $el:$('<batwindow>').appendTo($g) });
				if(type=='^' || type=='>' || type=='<') grapnels.push({ dir:type, t:t, x:n+0.5, y:l, $el:$('<batgrapnel>').appendTo($g).attr('type',type) });
				

			}
		}
	}
	
	const FLOORSPERSTAGE = 3;
	let iStage = Math.floor((data.length-man.y-1)/FLOORSPERSTAGE);
	let yMin = 0;
	let yMax = yMin + 3;

	self.$el.find('battower').css({'bottom':-iStage*FLOORSPERSTAGE*LEVEL+'px'});

	let wWas;
	let iDudeWas = -1;
	let interval;
	let fps = 50;
	let isLeft = false;
	let isRight = false;
	let isRetractGrapshot = false;
	let isGrappleTime = false;
	let isFalling = false;

	let grapshot = { $el:$('<grapshot>') }

	function getXForT(t){
		if(t==0) return -1 + pxFrontToBack*11;
		if(t==1) return -1 + pxSideToSide*11;
		if(t==2) return -1 + (1-pxFrontToBack)*11;
	}


	let tx = 0;
	let scale = 1;
	function tick(){

		let wScreen = self.$el.width();
		if(wScreen != wWas){
			scale = wScreen/(W*3);
			$game.css('transform','scale('+scale+')');
			wWas = wScreen;
		}

		if(isRetractGrapshot) man.ox *= 0.95;

		if(isLeft) man.x -= 0.2;
		if(isRight) man.x += 0.2;

		if(dirtyTracking) man.x = getXForT(man.t);
		dirtyTracking = false;

		if(man.x<0.2) man.x = 0.2;
		if(man.x>8.8) man.x = 8.8;

		if(!isGrappleTime && !isFalling){
			let ix = Math.round(man.x);
			if(fall[man.y] && fall[man.y][man.t][ix] == 'Y'){
				man.y++;
				isFalling = true;
				man.$el.appendTo(towers[man.t].$ls[man.y]).css({
					bottom:LEVEL,
				}).animate({
					bottom:0,
				},{duration:500,easing:'linear',complete:function(){ isFalling = false; }});

			}
		}
		

		if(isLeft) man.dir = -1;
		if(isRight) man.dir = 1;

		for(var g in grapnels){
			if(grapnels[g].t == man.t && grapnels[g].y == man.y && Math.abs(man.ox) < GRID){
				let d = Math.abs(man.x-grapnels[g].x);

				if(!isGrappleTime && !isFalling && d<0.2){

					isGrappleTime = true;

					//grapnels[g].$el.remove();

					if(grapnels[g].dir == '^'){
						man.y = grapnels[g].y-1;
						grapshot.x = grapnels[g].x;

						man.$el.css({'bottom':'-300px'});

						iStage = Math.floor((data.length-man.y-1)/FLOORSPERSTAGE);
						yMax = data.length - iStage*FLOORSPERSTAGE;
						yMin = yMax - FLOORSPERSTAGE;

						self.$el.find('battower').animate({'bottom':-iStage*FLOORSPERSTAGE*LEVEL+'px'});
					}

					if(grapnels[g].dir == '>'){
						man.t = grapnels[g].t+1;
						grapshot.x = 0.5;
						
						let jumpTo = getXForT(man.t);

						isRetractGrapshot = false;
						man.ox = -W - (jumpTo-man.x)*GRID;
						man.x = jumpTo;
					}

					if(grapnels[g].dir == '<'){
						man.t = grapnels[g].t-1;
						grapshot.x = 8.5;
			
						let jumpTo = getXForT(man.t);

						isRetractGrapshot = false;
						man.ox = W - (jumpTo-man.x)*GRID;
						man.x = jumpTo;
					}

					towers[man.t].$ls[man.y].append(man.$el);

					
					grapshot.y = man.y;

					grapshot.$el
					.appendTo(towers[man.t].$ls[man.y])
					.css({'left':grapshot.x*GRID+'px'})
					
					setTimeout(function(){
						audio.play('hook',true);
					},200);

					setTimeout(function(){
						audio.play('winch',true) 
					},650);

					setTimeout(function(){
						audio.stop('winch') 
						audio.play('arm',true) 
					},1200);

					man.$el
					.delay(500)
					.animate({'bottom':'50px',},{duration:600,start:function(){ isRetractGrapshot = true; } ,complete:hideGrapshot})
					.animate({'bottom':'0px',},{duration:200})
				}
			}
		}

		for(var n in windows){
			windows[n].tick = (windows[n].tick+1)%(fps*3);

			if(windows[n].tick == fps) windows[n].$el.addClass('peak');
			if(windows[n].tick == fps*2) windows[n].$el.addClass('attack');
			if(windows[n].tick == 0) windows[n].$el.removeClass('peak attack');
		}

		for(var n in throwers){
			throwers[n].tick = (throwers[n].tick+1)%(fps*4);

			if(throwers[n].tick == fps) throwers[n].$el.addClass('warning');
			if(throwers[n].tick == fps*2){
				throwers[n].$el.removeClass('warning');
				barrels.push({ 
					dir:throwers[n].dir, 
					$el:$('<batbarrel>').appendTo(towers[throwers[n].t].$ls[throwers[n].y]), 
					t:throwers[n].t, 
					x:throwers[n].x, 
					y:throwers[n].y 
				});
			}
		}

		for(var n in barrels){

			barrels[n].x += 0.075*barrels[n].dir;
			barrels[n].$el.css({left:barrels[n].x*GRID+'px'});

			for(var b in boxes){
				if(boxes[b].t == barrels[n].t && boxes[b].y == barrels[n].y){
					let dx = Math.abs(barrels[n].x-boxes[b].x);
					if(dx<0.5){
						barrels[n].dir *= -1;
						barrels[n].y++;
						barrels[n].x = boxes[b].x + 0.5*barrels[n].dir;
						barrels[n].$el.appendTo(towers[barrels[n].t].$ls[barrels[n].y]);
						barrels[n].$el
						.css({'bottom':LEVEL+'px'})
						.animate({'bottom':'0px'},200)
						.animate({'bottom':'30px'},100)
						.animate({'bottom':'0px'},100);

						boxes[b].$el.css({'bottom':'10px'}).animate({'bottom':'0px'},100);

						if(barrels[n].y>yMin && barrels[n].y<yMax){
							audio.play('bounce',true);
							setTimeout(function(){
								audio.play('bounce',true);
							},200)
						}
					}
				}
			}

			if(barrels[n].x<0 || barrels[n].x>9) barrels[n].$el.remove();
		}

		function getPtOnBezier(t, p0, p1, p2, p3){
		  var cX = 3 * (p1.x - p0.x),
		      bX = 3 * (p2.x - p1.x) - cX,
		      aX = p3.x - p0.x - cX - bX;

		  var cY = 3 * (p1.y - p0.y),
		      bY = 3 * (p2.y - p1.y) - cY,
		      aY = p3.y - p0.y - cY - bY;

		  var x = (aX * Math.pow(t, 3)) + (bX * Math.pow(t, 2)) + (cX * t) + p0.x;
		  var y = (aY * Math.pow(t, 3)) + (bY * Math.pow(t, 2)) + (cY * t) + p0.y;

		  return {x: x, y: y};
		};


		function getGlobalGameXY(thing){
			let x = thing.t * W + 0.5 * W - data[0][0].length*GRID/2 + thing.x * GRID;

			let sy = data.length - parseInt(thing.y) - 1 - iStage*3;

			let y = sy * LEVEL + 100;
			return {x:x,y:y};
		}

		//JOKER LOGIC 
		if( !isGrappleTime ) tx = man.x + (man.t-1) * 10;
		let dxJoker = joker.x - tx;
		let dJoker = dxJoker>0?-1:1;
		joker.dir = dJoker;

		if(dxJoker > 0.2 || dxJoker < -0.2) joker.x += dJoker*0.1;
		if(joker.x<2.5) joker.x = 2.5;
		if(joker.x>6.5) joker.x = 6.5;

		joker.$el.css({left:(joker.x*GRID)+'px','transform':'scaleX('+joker.dir+')'});

		joker.n++;
		if(joker.n%(fps*4)==0){
			//THROW BARREL

			let x = man.x;
			if(man.t==0) x = data[0][0].length - 0.5;
			if(man.t==2) x = 0.5;

			let target = {t:man.t, x:x, y:man.y};

			let ptTarget = getGlobalGameXY(target);
			let ptJoker = getGlobalGameXY(joker);
			ptJoker.y += 150;

			
			let $barrel = $('<batbarrel>').appendTo($game);

		
			let tx = ptTarget.x - ptJoker.x;
			let dir = tx>0?1:-1;
			let time = Math.abs(tx)/W * 500 + 800;
			let ptA = {x:(ptJoker.x+ptTarget.x)/2,y:ptJoker.y+300};
			let ptB = {x:(ptJoker.x+ptTarget.x)/2,y:ptTarget.y+500};
			

			$({amt:0}).animate({amt:1},{duration:time,step:function(amt){

				let pt = getPtOnBezier( amt, ptJoker, ptA, ptB, ptTarget );

				$barrel.css({
					left: pt.x + 'px',
					bottom: pt.y + 'px',
				})
			},complete:function(){

				//add joker to array

				barrels.push({ 
					dir:dir,
					$el:$barrel.appendTo(towers[target.t].$ls[target.y]), 
					t:target.t, 
					x:target.x, 
					y:target.y,
					
				});

				$barrel.css({
					bottom:0,
					left:target.x*GRID,
				}).animate({bottom:50},{duration:50,ease:'linear'}).animate({bottom:0},{duration:200,ease:'linear'});

			}})

		

			
	
			//console.log(o);
			//$barrel.offset(o);

			/*barrels.push({ 
				dir:joker.dir,
				$el:$('<batbarrel>').appendTo(towers[joker.t].$ls[joker.y]), 
				t:joker.t, 
				x:joker.x, 
				y:joker.y,
				bounce: 5,
				yBounce:1,
				
			});*/
		}

		
		man.$el.css({left:(man.x*GRID+man.ox)+'px','transform':'scaleX('+man.dir+')'});

		let dx = grapshot.x*GRID - (man.x*GRID + man.ox);
		let dy = (grapshot.y-1)*LEVEL - man.y*LEVEL + parseFloat(man.$el.css('bottom')) + 130;

		let d = Math.sqrt(dx*dx+dy*dy);
		let r = Math.atan2(dy,dx) + Math.PI;

		
		grapshot.$el.css({'transform':'rotate('+r+'rad)', 'width':d+'px'});
	}

	function hideGrapshot(){
		isGrappleTime = false;
		grapshot.$el.remove();
	}

	$(document).on('click',function(e){
		audio.play('music');
	});


	$(document).on('keydown',function(e){
		if(e.which == 37) isLeft = true;
		if(e.which == 39) isRight = true;
	})

	$(document).on('keyup',function(e){
		if(e.which == 37) isLeft = false;
		if(e.which == 39) isRight = false;
	})
	
	let pxSideToSide = 0;
	let pxFrontToBack = 0;
	let dirtyTracking = false;

	self.setPlayers = function(p){
		pxSideToSide = p[0].px/100;
		pxFrontToBack = p[0].pz/100;
		dirtyTracking = true;
	}

	self.turnOnOff = function(b){
		clearInterval(interval);
		if(b) interval = setInterval(tick,1000/fps);
	}

	self.turnOnOff(true);
}