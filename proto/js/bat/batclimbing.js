BatClimbing = function(){

	let W = 1728;
	let H = 1080;
	let GRID = 150;
	let LEVEL = 300;

	const FPS = 50;
	const BARRELSPEED = 3.75
	
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

			'batman[n="1"]:after':{
				'background-image':'url(./proto/img/climb-avatar-blue.png)',
			},

			'batman[n="1"][pose="grapple"]:after':{
				'background-image':'url(./proto/img/climb-avatar-grapple-blue.png)',
			},

			'batcheckpoint:after':{
				'content':'""',
				'display':'block',
				'height':'200px',
				'width':'80px',
				'position':'absolute',
				'bottom':'0px',
				'left':'-40px',
				'background':'linear-gradient(to bottom, red, transparent)',
				'opacity':'0.5',
				'border-radius':'40px 40px 0px 0px',
				'border-top': '2px solid white',
			},

			'batcheckpoint[n="1"]:after':{
				'background':'linear-gradient(to bottom, blue, transparent)',
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

			'batmarker[n="1"]':{
				'border-top': '30px solid blue',
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
		['--^------','<--CC--->','------^--'],

		['-B-----{-','-^--}--B-','<--W-----'],
		['-------->','--B----->','-----{--^'],
		['-CC---^--','---------','---------'],

		['--}-^----','<-B----{-','<-}----B-'],
		['^--------','<-----B--','<-------^'],
		['---------','---------','---^--CC-'],

		['--B---{->','--B---{->','--B---{-^'],
		['^--------','<--------','<--------'],
		['---------','---C-C-->','-------^-'],

		['-----W-->','B--{^}--B','<--W-----'],
		['^--W-----','<--B-B-->','-----W--^'],
		['-C------>','----^----','<------C-'],

		['^-}------','<------->','------{-^'],
		['---W---->','---{^}---','<----W---'],
		['^--------','<--CC--->','--------^'],

		['---------','}---^---{','---------'],
		['---------','--^---^--','---------'],
		['C----W-->','----^----','<--W----C'],

		['^}-----B-','---------','-B-----{^'],
		['-B------^','---------','^------B-'],
		['^--------','<-CC---->','--------^'],
		
		['---------','--^------','<--W-----'],
		['------{->','-------->','------{-^'],
		['^--------','<-}------','<------CC'],

		['---------','------{->','--------^'],
		['---------','^-}------','<--------'],
		['---------','---------','CC---W--^'],
		
		['---------','---------','-^-}-----'],
		['---------','-----W-->','--------^'],
		['---------','^--W---CC','---------'],

		['---------','-B----{-^','---------'],
		['---------','^--------','---------'],
		['---------','----^--CC','---------'],

		['---------','--B---{-^','---------'],
		['---------','^--------','---------'],
		['---------','--^----CC','---------'],

		['---------','---W----^','---------'],
		['---------','^--W-W---','---------'],
		['---------','CC---W--^','---------'],

		['---------','^--W-----','---------'],
		['---------','-----W--^','---------'],
		['---------','^--W---CC','---------'],

		['---------','-------^-','---------'],
		['---------','--^------','---------'],
		['---------','-CC---^--','---------'],
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
	let climbers = [];

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

	
	function getXForT(n,t){
		if(t==0) return -1 + players[n].pxFrontToBack*11;
		if(t==1) return -1 + players[n].pxSideToSide*11;
		if(t==2) return -1 + (1-players[n].pxFrontToBack)*11;
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

		//ITERATE WINDOWS
		for(var n in windows){
			windows[n].tick = (windows[n].tick+1)%(FPS*3);
			if(windows[n].tick == FPS) windows[n].$el.addClass('peak');
			if(windows[n].tick == FPS*2) windows[n].$el.addClass('attack');
			if(windows[n].tick == 0) windows[n].$el.removeClass('peak attack');
		}

		//ITERATE THROWERS
		for(var n in throwers){

			if(throwers[n].dead || throwers[n].iStage != iStage) continue;

			throwers[n].tick = (throwers[n].tick+1)%(FPS*4);

			if(throwers[n].tick == FPS){
				throwers[n].$barrel = $('<batbarrel>').appendTo(towers[throwers[n].t].$ls[throwers[n].y]).css({
					left:throwers[n].x * GRID + 'px',
					bottom:'100px',
				})
			}
			if(throwers[n].tick == FPS*2){
				barrels.push({ 
					dir:throwers[n].dir, 
					$el:throwers[n].$barrel.css('bottom',0), 
					t:throwers[n].t, 
					x:throwers[n].x, 
					y:throwers[n].y,
					iStage:throwers[n].iStage,
				});
			}
		}


		// ITERATE BARRELS
		for(var n in barrels){

			barrels[n].x += BARRELSPEED/FPS*barrels[n].dir;
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
		}

		let iMinStage = 9999;
		
		for(var c in climbers){
			
			climbers[c].xWas = climbers[c].x;

			// MOVE
			climbers[c].x = getXForT(c,climbers[c].t);
			if(climbers[c].x<0.2) climbers[c].x = 0.2;
			if(climbers[c].x>8.8) climbers[c].x = 8.8;

			if(climbers[c].iStage == iStage){
				// FALL
				if(!climbers[c].isTransit){
					let ix = Math.floor(climbers[c].x);
					if(fall[climbers[c].y] && fall[climbers[c].y][climbers[c].t][ix] == 'Y') fallDown(climbers[c]);
				}

				// HIT GRAPPLES
				for(var n in grapnels) collideWith(climbers[c],grapnels[n],grapple);

				// HIT WINDOWS
				for(var n in windows) if( windows[n].tick > FPS*2 ) collideWith(climbers[c],windows[n]);

				// HIT THROWERS
				for(var n in throwers) collideWith(climbers[c],throwers[n],kill);

				// HIT BARRELS
				for(var n in barrels) collideWith(climbers[c],barrels[n]);
			}

			if(climbers[c].xWas != climbers[c].x) climbers[c].dir = (climbers[c].xWas>climbers[c].x)?-1:1;

			// RENDER CLIMBERS and GRAPPLE LINES
			climbers[c].$el.css({
				left:(climbers[c].x*GRID+climbers[c].ox)+'px',
				bottom:climbers[c].oy+'px',
				'transform':'scaleX('+climbers[c].dir+')'
			});
			climbers[c].$marker.css({left:(climbers[c].x*GRID)+'px'});

			let dx = (climbers[c].grapshot.x - climbers[c].x)*GRID - climbers[c].ox;
			let dy = (climbers[c].grapshot.y - climbers[c].y)*GRID + climbers[c].oy - 150;
			let d = Math.hypot(dx,dy);
			let r = Math.atan2(dy,dx) + Math.PI;
			let x = dx + dx*climbers[c].grapshot.deploy;
			let y = dy + dy*climbers[c].grapshot.deploy;

			climbers[c].grapshot.$el.css({
				'left':climbers[c].grapshot.x*GRID-dx*(1-climbers[c].grapshot.deploy)+'px',
				'top':-dy*(1-climbers[c].grapshot.deploy)+'px',
				'transform':'rotate('+r+'rad)', 
				'width':d*climbers[c].grapshot.deploy+'px'
			});

			climbers[c].iStage = Math.floor((data.length-climbers[c].y-1)/FLOORSPERSTAGE);
			iMinStage = Math.min(iMinStage,climbers[c].iStage);
		}

		let iNewStage = iMinStage;
		if(iNewStage != iStage){
			iStage = iNewStage;
			self.$el.find('battower').animate({'bottom':-iStage*FLOORSPERSTAGE*LEVEL+'px'});
		}
		



		//JOKER LOGIC 
		if(iStage == joker.iStage){

			let man = climbers[joker.iTarget%climbers.length];

			if( !joker.isPow && !man.isTransit && !joker.isThrowing){
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

			let timePerThrow = 3-joker.pow*0.5;

			if(!joker.isThrowing && !joker.isPow && !man.isTransit && (joker.n - joker.nThrow) > FPS*timePerThrow){
				//THROW BARREL
				joker.isThrowing = true;
				joker.nThrow = joker.n;
				joker.iTarget++;

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
	}

	function collideWith(climber,thing,fn){
		if( !thing.dead &&
			!climber.isTransit &&
			climber.t == thing.t &&
			climber.y == thing.y &&
			Math.abs( climber.x - thing.x ) < 0.5 ){

			if(fn){
				fn(climber,thing);
			} else {
				die();
			}
		}
	}

	function fallDown(man){
		man.isTransit = true;
		man.y++;	
		man.$el.appendTo(towers[man.t].$ls[man.y]);
		man.$marker.appendTo(towers[man.t].$ls[man.y]);
		man.oy = LEVEL;
		$(man).animate({oy:0},{
			easing:'linear',
			duration:300,
			complete:function(){ 
				man.isTransit=false; 
		}});
	}

	function grapple(man,trigger){
		
		man.isTransit = true;

		let ptWas = getGlobalGameXY(man);

		if(trigger.dir == '>') man.t = trigger.t+1;
		if(trigger.dir == '<') man.t = trigger.t-1;
		if(trigger.dir == '^') man.y = trigger.y-1;
		if(trigger.dir == '^') man.oy = LEVEL;

		man.x = getXForT(man.n,man.t);

		let tx = trigger.x;
		if(trigger.dir == '>') tx = 0.5;
		if(trigger.dir == '<') tx = 8.5;



		if(trigger.dir == '>' && man.iStage==joker.iStage) tx = 1.5;
		if(trigger.dir == '<' && man.iStage==joker.iStage) tx = 7.5;

		let ptNow = getGlobalGameXY(man);

		man.ox = ptWas.x-ptNow.x;
		man.oy = ptWas.y-ptNow.y;

		towers[man.t].$ls[man.y].append(man.$el);
		towers[man.t].$ls[man.y].append(man.$marker);

		let dist = Math.abs(man.ox);
		let extra = dist>1?500:0;

		man.grapshot.x = tx;
		man.grapshot.y = man.y;
		man.grapshot.t = man.t;

		man.grapshot.$el.appendTo(towers[man.grapshot.t].$ls[man.grapshot.y]);

		man.$el.attr('pose','grapple');

		man.grapshot.deploy = 0;
		$(man.grapshot).animate({deploy:1},200);
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
				man.grapshot.$el.remove();
				man.isTransit = false; 
			}});

		
	}

	function kill(climber,thing) {
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


	let dirtyTracking = false;

	let players = [{pxSideToSide:0.5,pxFrontToBack:0.5},{pxSideToSide:0.5,pxFrontToBack:0.5}]

	self.setPlayers = function(p){
		for(var n in players){
			players[n].pxSideToSide = p[n].px;
			players[n].pxFrontToBack = p[n].pz;
		}
		dirtyTracking = true;
	}

	self.turnOnOff = function(b){
		clearInterval(interval);
		if(b) interval = setInterval(tick,1000/FPS);
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
		climbers.length = 0;
		
		

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
					

					if(type=='C' && iStage == iStageForLevel){

						$('<batcheckpoint>').appendTo($g).attr('n',climbers.length);

						climbers.push({ 
							n:climbers.length,
							dir:1, t:t, x:n+0.5, ox:0, y:l, 
							$el:$('<batman>').appendTo($l).attr('n',climbers.length),
							$marker:$('<batmarker>').appendTo($l).attr('n',climbers.length),
							grapshot:{ $el:$('<grapshot>') },
							dir:1,
							iStage:iStageForLevel, 
						});
						self.$el.find('battower').css({'bottom':-iStage*FLOORSPERSTAGE*LEVEL+'px'});
					}

					if(type=='J'){
						joker = { 
							iStage:iStageForLevel, 
							iTarget:0,
							n:0, 
							nThrow:0, 
							pow:0, 
							dir:1,
							t:t, 
							x:n+0.5, 
							ox:0, 
							y:l,
							$el:$('<batjoker>').appendTo($l) };
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