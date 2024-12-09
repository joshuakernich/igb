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


				'background-image': 'url(./proto/img/bat-cityscape-brown.png)',
				'background-size': '33.3%',


				'font-family': "Parkinsans",
				'font-weight':'800',
			},

			'batoverlay':{
				'background':'rgba(255,0,0,0.5)',
				'position':'absolute',
				'left':'0px',
				'right':'0px',
				'top':'0px',
				'bottom':'0px',
				'z-index':'10',

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
				
			},


			

			'batgrid':{
				'display':'inline-block',
				'height':'100%',
				'width':'150px',
				
				'background':'transparent',
				'position':'relative',
				'border-top':'2px solid white',
				'box-sizing':'border-box',
				'background':'#422413',
			},

			'batgrid[fall="Y"]':{
				'border-top':'none',
				'background':'none',
			},

			'batsign':{
				'position':"absolute",
				'left':'0px',
				'right':'0px',
				'bottom':'0px',
				'text-align':'center',
				'font-size':'100px',
				'color':'white',


				'z-index':'1',
				'line-height':'0px',
				
				'height':'100px',
				'text-shadow':'0px 0px 50px white',
			},

			'batsign h1':{
				'font-size':'400px',
				'padding':'0px',
				'margin':'0px',
				'position':"absolute",
				'bottom':'0px',
				'left':'0px',
				'right':'0px',
				'height':'150px',
			},

			'batsign h2':{
				'font-size':'80px',
				'padding':'0px',
				'margin':'0px',
				'letter-spacing':'30px',
				'position':"absolute",
				'top':'100%',
				'left':'0px',
				'right':'0px',
				'line-height':'80px',

			},
			

			'batgrid:nth-of-type(even):after':{
				'content':'""',
				'display':'block',
				'position':'absolute',
				'left':'20px',
				'right':'20px',
				'top':'50px',
				'bottom':'100px',
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
				
				'border-left':'20px solid #333',
				'border-right':'20px solid #333',
				'border-top':'20px solid #333 !important',

			},


			'batwindow':{
				
				'display':'block',
				'position':'absolute',
				'left':'20px',
				'right':'20px',
				'top':'50px',
				'bottom':'100px',
				'background':'white',
				'overflow':'hidden',
				'box-sizing':'border-box',
				'border':'2px solid white',
			},

			'batwindow.peak:after':{
				'content':'""',
				'display':'block',
				'position':'absolute',
				'left':'30px',
				'top':'40px',
				
				'height':'200px',
				'width':'130px',

				'background-image':'url(./proto/img/climb-goon.png)',
				'background-size':'100%',
				'opacity':'0.5',
			},

			'batwindow.attack:after':{
				'left':'-50%',
				'opacity':'1',
				'width':'200%',
				'top':'10px',
			},



			'batman':{
				'display':'block',
				'height':'0px',
				'width':'0px',
				'position':'absolute',
				'bottom':'0px',
				'z-index':'10',
				
			},

			'batjoker:after':{
				'content':'" "',
				'display':'block',
				'height':'200px',
				'width':'130px',
				
				'position':'absolute',
				'bottom':'0px',
				
				'border-radius':'50px 50px 0px 0px',
				'background-image':'url(./proto/img/climb-joker.png)',
				'background-size':'100%',
				


				'transform':'translateX(-50%)',
			},

			'batjoker[pose="pow"]':{
				'transform':'scaleX(1) !important',
			},

			'batjoker[pose="pow"]:before':{
				'content':'"POW!"',
				'display':'block',
				'position':'absolute',
				'bottom':'240px',
				'left':'-100px',
				'width':'200px',
				
				'text-align':'center',
				'color':'white',
				'font-size':'60px',
				'background':'red',
			},

			'batthrower:after':{
				'content':'" "',
				'display':'block',
				'height':'220px',
				'width':'140px',
				'background':'url(./proto/img/climb-goon.png)',
				'background-size':'100%',
				'position':'absolute',
				'bottom':'0px',
				
				'transform':'translateX(-50%)',
			},

			'batman:after':{
				'content':'""',
				'display':'block',
				'height':'200px',
				'width':'130px',
				'position':'absolute',
				'bottom':'0px',

				'background-image':'url(./proto/img/climb-avatar-red.png)',
				'background-size':'100%',
				'transform':'translateX(-50%)',
			},

			'batman[pose="falling"]:after':{
				'background-image':'url(./proto/img/climb-avatar-fall.png)',
			},

			'batman[pose="grapple"]:after':{
				'background-image':'url(./proto/img/climb-avatar-grapple.png)',
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
				'box-sizing':'border-box',
				'border':'2px solid white',
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
				'box-sizing':'border-box',
				'border':'2px solid white',
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

			'batmarker':{
				'content':'""',
				'display':'block',
				
				'bottom':'200px',
				'transform':'translate(-50%, -50%)',
				'position':'absolute',

				'width': 0,
				 'height': 0,
				 'border-left': '20px solid transparent',
				 'border-right': '20px solid transparent',
				  
				 'border-top': '30px solid red',
				 'z-index':'1',
			},

			'batskips:before':{
				'content':'"SKIP TO"',

			},

			'batskips':{
				'position':'absolute',
				'left':'0px',
				'bottom':'100px',
				'width':W+'px',
				'text-align':'center',
				'z-index':'100',
				'font-size':'30px',
				'color':'white',
			},

			'batskips button':{
				'font':'inherit',
				
				'width':'100px',
				'height':'100px',
				'color':'inherit',
				
				'border':'none',
				'background':'rgba(255,255,255,0.1)',
				'margin':'10px',
			},



		}

		$("head").append('<style>'+Css.of(css)+'</style>');
	}

	let self = this;
	self.$el = $('<igb>');
	let $game = $('<batgame>').appendTo(self.$el);

	let SCAFFOLD = [
		['NNNNYNNNN','NYNNNNNYN','NNNNYNNNN'],
		['NNNNNNNNN','NYYYYYYYN','NNNNNNNNN'],
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
		['--^------','<---C--->','------^--'],

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

	audio.add('bounce','./proto/audio/climb-bounce.mp3',0.2);
	
	audio.add('warning','./proto/audio/fight-warning.mp3',0.2);
	audio.add('pow','./proto/audio/fight-pow-last.mp3',0.5);
	audio.add('hit','./proto/audio/fight-hit.mp3',0.2);
	audio.add('boom','./proto/audio/riddler-boom.mp3',0.5);

	let towers = [];
	let windows = [];
	let grapnels = [];
	let boxes = [];
	let throwers = [];
	let barrels = [];

	let isLeft = false;
	let isRight = false;

	let isTransit = false;
	let isGrappling = false;
	

	let man;
	let joker;

	const FLOORSPERSTAGE = 3;
	let iStage = 0;


	for(var t=0; t<3; t++){

		let $side= $('<batside>').appendTo($game);
		let $t = $('<battower>').appendTo($side);
		towers[t] = { $el:$t, $ls:[] };

	}


	let $skips = $('<batskips>').appendTo($game);

	for(var i=0; i<data.length/3; i++){
		$('<button>').appendTo($skips).text(i+1).data('iStage',i).click(skipTo);
	}

	
	let wWas;
	let iDudeWas = -1;
	let interval;
	let fps = 50;
	

	let grapshot = { 
		$el:$('<grapshot>') 
	};

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


		if(isLeft || isRight){

			let dir = isLeft?-1:(isRight?1:-1);

			if(man.t == 0) pxFrontToBack += dir*0.01;
			if(man.t == 1) pxSideToSide += dir*0.01;
			if(man.t == 2) pxFrontToBack -= dir*0.01;

			dirtyTracking = true;
		}


		if(dirtyTracking) man.x = getXForT(man.t);
		dirtyTracking = false;

		if(man.x<0.2) man.x = 0.2;
		if(man.x>8.8) man.x = 8.8;

		if(!isTransit){
			let ix = Math.floor(man.x);
			if(fall[man.y] && fall[man.y][man.t][ix] == 'Y'){

				isTransit = true;

				man.y++;
				
				man.$el.appendTo(towers[man.t].$ls[man.y]);
				man.$marker.appendTo(towers[man.t].$ls[man.y]);

				man.oy = LEVEL;
				$(man).animate({oy:0},{easing:'linear',duration:300,complete:function(){ isTransit=false; }});
			}
		}
		

		if(isLeft) man.dir = -1;
		if(isRight) man.dir = 1;


		for(var g in grapnels){



			if(grapnels[g].t == man.t && grapnels[g].y == man.y){

				let d = Math.abs(man.x-grapnels[g].x);

				if(!isTransit && d<0.2){

					isTransit = true;
					isGrappling = true;

					let ptWas = getGlobalGameXY(man);

					if(grapnels[g].dir == '>') man.t = grapnels[g].t+1;
					if(grapnels[g].dir == '<') man.t = grapnels[g].t-1;
					if(grapnels[g].dir == '^') man.y = grapnels[g].y-1;
					if(grapnels[g].dir == '^') man.oy = LEVEL;

					man.x = getXForT(man.t);

					let tx = grapnels[g].x;
					if(grapnels[g].dir == '>') tx = 0.5;
					if(grapnels[g].dir == '<') tx = 8.5;

					
					
					let ptNow = getGlobalGameXY(man);

					man.ox = ptWas.x-ptNow.x;
					man.oy = ptWas.y-ptNow.y;

					towers[man.t].$ls[man.y].append(man.$el);
					towers[man.t].$ls[man.y].append(man.$marker);

					let dist = Math.abs(man.ox);
					let extra = dist>1?500:0;

					grapshot.x = tx;
					grapshot.y = man.y;
					grapshot.t = man.t;

					grapshot.$el.appendTo(towers[grapshot.t].$ls[grapshot.y]);
					//grapshot.$el.css({'left':grapshot.x*GRID+'px'});

					man.$el.attr('pose','grapple');

					grapshot.deploy = 0;
					$(grapshot).animate({deploy:1},200);
					audio.play('hook',true);

					$(man).delay(300).animate({ox:0,oy:0},{
						duration:500 + extra,
						start:function(){
							audio.play('winch',true);
						},
						complete:function(){ 
							audio.stop('winch',true);
							audio.play('arm',true);
							man.$el.attr('pose','idle');
							grapshot.$el.remove();
							isTransit = false; 
						}});

					iStage = Math.floor((data.length-man.y-1)/FLOORSPERSTAGE);
					
					self.$el.find('battower').animate({'bottom':-iStage*FLOORSPERSTAGE*LEVEL+'px'});

				}
			}
		}

		for(var n in windows){
			windows[n].tick = (windows[n].tick+1)%(fps*3);

			if(windows[n].tick == fps) windows[n].$el.addClass('peak');
			if(windows[n].tick == fps*2) windows[n].$el.addClass('attack');
			if(windows[n].tick == 0) windows[n].$el.removeClass('peak attack');

			if( windows[n].tick > fps*2 ) collideWith(windows[n]);
		}

		for(var n in throwers){

			if(throwers[n].dead) continue;

			throwers[n].tick = (throwers[n].tick+1)%(fps*4);

			if(throwers[n].tick == fps){
				throwers[n].$barrel = $('<batbarrel>').appendTo(towers[throwers[n].t].$ls[throwers[n].y]).css({
					left:throwers[n].x * GRID + 'px',
					bottom:'100px',
				})
			}
			if(throwers[n].tick == fps*2){
				barrels.push({ 
					dir:throwers[n].dir, 
					$el:throwers[n].$barrel.css('bottom',0), 
					t:throwers[n].t, 
					x:throwers[n].x, 
					y:throwers[n].y,
					iStage:throwers[n].iStage,
				});
			}

			collideWith(throwers[n],kill);
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

						if(barrels[n].iStage == iStage){

							audio.play('bounce',true);
							setTimeout(function(){
								audio.play('bounce',true);
							},200)
						}
					}
				}
			}

			if(barrels[n].x<0 || barrels[n].x>9) barrels[n].$el.remove();

			collideWith(barrels[n]);
		}

		function collideWith(thing,fn){
			if( !isTransit &&
				thing.t == man.t &&
				thing.y == man.y &&
				Math.abs( thing.x - man.x ) < 0.5 ){

				if(fn){
					fn(thing);
				} else {
					die();
				}
			}
		}

		function kill(thing) {
			thing.$el.remove();
			if(thing.$barrel) thing.$barrel.remove();
			thing.dead = true;
			audio.play('pow',true);
			audio.play('boom',true);
		}

		function die(){
			audio.play('hit',true);
			audio.play('boom',true);
			self.turnOnOff(false);

			$('<batoverlay>').appendTo($game);

			setTimeout( respawn, 1500);

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
		if(iStage == joker.iStage){
			if( !joker.isPow && !isTransit && !joker.isThrowing){
				tx = man.x + (man.t-1) * 10;
				let dxJoker = joker.x - tx;
				let dJoker = dxJoker>0?-1:1;
				joker.dir = dJoker;

				if(dxJoker > 1 || dxJoker < -1) joker.x += dJoker*0.1;
				if(joker.x<2.5) joker.x = 2.5;
				if(joker.x>6.5) joker.x = 6.5;

				joker.$el.css({left:(joker.x*GRID)+'px','transform':'scaleX('+joker.dir+')'});
			}

			if(!joker.isPow && joker.y == man.y && joker.t == man.t){
				let dx = Math.abs(joker.x - (man.x + man.ox/GRID));
				if(dx<1) doPow();
			}

			joker.n++;

			let timePerThrow = 4-joker.pow*0.5;

			if(!joker.isThrowing && !joker.isPow && !isTransit && (joker.n - joker.nThrow) > fps*timePerThrow){
				//THROW BARREL
				joker.isThrowing = true;
				joker.nThrow = joker.n;

				let x = man.x;

				if(man.t!=1){
					let dir = (man.t==0)?-1:1;
					let extra = (2-man.y);
					

					if(man.t==0) x = data[0][0].length - 0.5;
					if(man.t==2) x = 0.5;

					x += extra*dir;
				}

				

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
				
				audio.play('warning',true);

				$barrel.css({
						left: ptJoker.x + 'px',
						bottom: ptJoker.y + 'px',
					})


				$({amt:0}).delay(500).animate({amt:1},{duration:time,step:function(amt){

					let pt = getPtOnBezier( amt, ptJoker, ptA, ptB, ptTarget );
					$barrel.css({
						left: pt.x + 'px',
						bottom: pt.y + 'px',
					})
				},complete:function(){

					joker.isThrowing = false;

					//add joker barrel to array

					audio.stop('warning');
					audio.play('bounce',true);

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

			}
		}

		
		man.$el.css({
			left:(man.x*GRID+man.ox)+'px',
			bottom:man.oy+'px',
			'transform':'scaleX('+man.dir+')'
		});
		man.$marker.css({left:(man.x*GRID)+'px'});

		

		let dx = (grapshot.x - man.x)*GRID - man.ox;
		let dy = (grapshot.y - man.y)*GRID + man.oy - 150;

		
		let d = Math.hypot(dx,dy);
		let r = Math.atan2(dy,dx) + Math.PI;

		let x = dx + dx*grapshot.deploy;
		let y = dy + dy*grapshot.deploy;

		grapshot.$el.css({
			'left':grapshot.x*GRID-dx*(1-grapshot.deploy)+'px',
			'top':-dy*(1-grapshot.deploy)+'px',
			'transform':'rotate('+r+'rad)', 
			'width':d*grapshot.deploy+'px'
		});
	}

	function doPow(){

		joker.pow++;
		joker.isPow = true;
		joker.$el.attr('pose','pow');

		audio.play('pow',true);
		audio.play('boom',true);

		

		setTimeout(function(){
			joker.$el.attr('pose','idle');
			joker.isPow = false;
			
		},2000);
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
	
	let pxSideToSide = 50;
	let pxFrontToBack = 50;
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

	function respawn(){

		self.$el.find('batoverlay').remove();

		self.turnOnOff(false);

		for(t in towers) towers[t].$el.empty();

		windows.length = 0;
		grapnels.length = 0;
		boxes.length = 0;
		throwers.length = 0;
		barrels.length = 0;

		isTransit = false;
		man = undefined;
		

		for(var l in data){

			let iStageForLevel = Math.floor((data.length-l-1)/FLOORSPERSTAGE);

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
					

					if(!man && type=='C' && iStage == iStageForLevel){
						man = { dir:1, t:t, x:n+0.5, ox:0, y:l, 
						$el:$('<batman>').appendTo($l),
						$marker:$('<batmarker>').appendTo($l),
					};
						self.$el.find('battower').css({'bottom':-iStage*FLOORSPERSTAGE*LEVEL+'px'});
					}

					if(type=='J'){
						joker = { iStage:iStageForLevel, n:0, nThrow:0, pow:0, dir:1, t:t, x:n+0.5, ox:0, y:l, $el:$('<batjoker>').appendTo($l) };
						$('<batsign>').appendTo($l).html('<h1>ACE</h1><h2>CHEMICALS</h2>')
					}
					if(type=='}' || type=='{'){
						dir = type=='}'?1:-1;
						throwers.push({ 
							iStage:iStageForLevel, tick:0, t:t, x:n+0.5, y:l, dir:dir,
							$el:$('<batthrower>').appendTo($g).css('transform','scaleX('+dir+')')
						});
					}
					if(type=='B') boxes.push({ t:t, x:n+0.5, y:l, $el:$('<batbox>').appendTo($g) });
					if(type=='W') windows.push({ t:t, tick:0, x:n+0.5, y:l, $el:$('<batwindow>').appendTo($g) });
					if(type=='^' || type=='>' || type=='<') grapnels.push({ dir:type, t:t, x:n+0.5, y:l, $el:$('<batgrapnel>').appendTo($g).attr('type',type) });
					

				}
			}
		}


		//tick();

		self.turnOnOff(true);
		
	}

	respawn();

	function skipTo(){
		iStage = $(this).data('iStage');
		$skips.hide();
		respawn(iStage);
	}
}