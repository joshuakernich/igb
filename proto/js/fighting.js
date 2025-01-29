BatFighter = function( fnHandball, fnComplete ){

	let self = this;
	self.$el = $('<fighter>');

	let $panel = $('<fightpanel>').appendTo(self.$el).hide();

	let $fistLeft = $('<fighterfist>').appendTo(self.$el);
	let $fistRight = $('<fighterfist>').appendTo(self.$el);

	for(var i=0; i<3; i++){
		$('<fightpow>').appendTo(self.$el).css({
			'left':(i%2)*100+'%',
			'top':30+i*15+'%',
		}).hide().click(onPow);
	}

	let n = 0;

	let sequence = [
		
	]

	self.at = {x:0,scale:1,iLayer:0};

	self.to = undefined;

	let iSequence = -1;

	function getPt(iWall,iSide,iLayer=0){

		return{
			iWall:iWall,iSide:iSide, iLayer:iLayer,
			x:(iWall + 0.5) * BatFightGame.W + iSide * BatFightGame.W/6,
			scale:1-iLayer*0.3,
		}
	}

	self.spawn = function(iWall,iSide,iLayer=0) {
		sequence.push({ 
			time:0, 
			pt: getPt(iWall,iSide,iLayer),
		})
		return self;
	}

	self.peak = function(){

		let anchor = sequence[sequence.length-1].pt;

		sequence.push({ 
			time:500, 
			pt: getPt(anchor.iWall,anchor.iSide*0.5,anchor.iLayer),
		})

		sequence.push({ 
			time:500, 
			pt: getPt(anchor.iWall,anchor.iSide,anchor.iLayer),
		})
		return self;
	}

	self.sneak = function(iWall,iSide,iLayer=0) {
		sequence.push({ 
			time:1000, 
			pt: getPt(iWall,iSide,iLayer),
		})
		return self;
	}

	self.punch = function(iWall,iSide){
	
		sequence.push({
			fn:function(){ doWarning(iWall,iSide) },
		})

		sequence.push({
			fn:function(){ doPunch(iWall,iSide) },
		})

		sequence.push({
			fn:function(){ doMiss(iWall,iSide) },
		})

		return self;
	}


	function doThrowWarningLeft(){

		audio.play('warning',true);
		
		setTimeout(function(){
			$panel.show();
		},200);

		setTimeout(function(){
			$panel.hide();
		},700)

		setTimeout(function(){
			self.to = undefined;
		},900)
	}

	function doWarning(iWall,iSide){

		let pt = getPt(iWall,iSide);
		$(self.at).animate({x:pt.x},300);

		audio.play('warning',true);
		
		setTimeout(function(){
			$panel.show();
		},200);

		setTimeout(function(){
			$panel.hide();
		},700)

		setTimeout(function(){
			self.to = undefined;
		},900)
	}

	let $projectile;

	function doThrow(){
		
		audio.play('throw',true);

		setTimeout(function(){
			$projectile = $('<fightprojectile>')
			.appendTo(self.$el)
			.css({
				left:'50%',
				bottom:'50%',
			})
			.animate({
				width:'500px',
				height:'500px',
			},{
				duration:500,
				easing:'linear',
			})
		},100)

		

		setTimeout(function(){

			self.to = undefined;
		},600);
	}

	function doThrowHit(){
		audio.stop('warning');
		audio.play('boom',true);
		audio.play('crash',true);
		
		$panel.show();

		$panel.text('HIT!');

		setTimeout(function(){
			self.to = undefined;
			$panel.empty();
			$projectile.remove();
		},800);
	}

	function doThrowMiss(){
		audio.stop('warning');
		$panel.text('DODGED!');
		audio.play('reverse',true);

		$projectile.animate(
		{width:700,height:700,opacity:0},
		{
			duration:500,
			easing:'linear',
		});

		setTimeout(function(){
			self.to = undefined;
			$panel.empty();
			$projectile.remove();
		},800);
	}

	function doPunch(iWall,iSide){

		let pt = getPt(iWall,iSide);

		let $fist = iSide==-1?$fistLeft:$fistRight;

		$fist.animate({
			'bottom':'30%',
			'width':'300px',
			'height':'300px',
		},200);

		setTimeout(function(){
			self.to = undefined;
		},200);
	}

	function doHit(){
		audio.stop('warning');
		audio.play('boom',true);
		audio.play('hit',true);
		$panel.show();

		$panel.text('HIT!');

		setTimeout(function(){
			self.to = undefined;
			resetFists();
		},500);
	}

	let intervalReset;
	function doMiss(){
		audio.stop('warning');
		audio.play('slowmo',true);

		$panel.text('DODGED!');

		setTimeout(function(){
			nPow = -1;
			self.$el.find('fightpow').show();
		},500);

		setTimeout(function(){
			$panel.empty();
			
		},1000);

		$fistLeft.animate({
				bottom: '40%',
				width: '100px',
				height: '100px',
			},2500);

		$fistRight.animate({
				bottom: '40%',
				width: '100px',
				height: '100px',
			},2500);

		intervalReset = setTimeout(function(){
			self.to = undefined;
			audio.stop('slowmo');
			audio.play('reverse',true);
			resetFists();
		},2500);
	}

	function resetFists(){
		$panel.empty();
		self.$el.find('fightpow').hide();

		$fistLeft.animate({
				bottom: '40%',
				width: '100px',
				height: '100px',
			},300);

		$fistRight.animate({
				bottom: '40%',
				width: '100px',
				height: '100px',
			},300);
	}

	let audio = new AudioContext();
	audio.add('warning','./proto/audio/fight-warning.mp3');
	audio.add('punch','./proto/audio/fight-punch.mp3',0.3);
	audio.add('boom','./proto/audio/riddler-boom.mp3');
	audio.add('footsteps','./proto/audio/fight-footsteps.mp3',1,true);
	audio.add('slowmo','./proto/audio/fight-slowmo.mp3', 0.5);
	audio.add('reverse','./proto/audio/fight-reverse.mp3', 0.5);
	audio.add('hit','./proto/audio/fight-hit.mp3', 0.5);
	audio.add('throw','./proto/audio/fight-throw.mp3', 0.5);
	audio.add('crash','./proto/audio/fight-crash.mp3', 0.2);

	audio.add('pow-first','./proto/audio/fight-pow-first.mp3', 1);
	audio.add('pow-second','./proto/audio/fight-pow-second.mp3', 1);
	audio.add('pow-last','./proto/audio/fight-pow-last.mp3', 1);
	let pows = ['pow-first','pow-second','pow-last'];
	
	let nPow = -1;
	function onPow(){
		$(this).hide();
		nPow ++;
		audio.play(pows[nPow],true);
		if(nPow==2){
			audio.play('boom',true);
			clearInterval(intervalReset);
			self.to = undefined;
			audio.stop('slowmo');
			resetFists();
		}
	}

	self.tick = function(){

		if(!self.to){
			iSequence++;
			self.to = sequence[iSequence];
			$panel.hide();

			if(!self.to){
				fnComplete();
				return;
			}

			if(self.to.fn) self.to.fn();

			if(self.to.pt){
				audio.play('footsteps');	
				$(self.at).animate({
					x:self.to.pt.x,
					scale:self.to.pt.scale
				},self.to.time);
				
				setTimeout(function(){
					audio.stop('footsteps');
					self.to = undefined;
				},self.to.time);
			}
		}

		self.$el.css({
			'left':self.at.x+'px',
			'transform':'scale('+self.at.scale+') translateX(-50%)',
		})
	}
}

BatFightGame = function(){

	const W = BatFightGame.W = 1600;
	const H = BatFightGame.H = 1000;
	const FPS = 50;

	$("head").append(`
		<style>

			@import url('https://fonts.googleapis.com/css2?family=Bangers&display=swap');

			fightgame{
				display:block;
				position:absolute;
				top: 0px;
				left: 0px;
				width: ${W*3}px;
				height: ${H}px;
				background: url(./proto/img/fight-bg.png);
				transform-origin: top left;
				background-size: ${W}px;
				background-repeat: no-repeat;

				font-family: "Bangers", system-ui;

				background: linear-gradient(to bottom, #5B0100, #140000);
				
			}

			fightgame:after{
				content:"";
				display:block;
				position:absolute;
				top: 0px;
				left: ${W}px;
				width: ${W}px;
				height: ${H}px;
				border-left: 1px solid white;
				border-right: 1px solid white;
			}

			fightlayer{
				display:block;
				position:absolute;
				top: 0px;
				left: 0px;
				width: ${W}px;
				height: ${H}px;
			}

			

			fighter{
				display:block;
				position:absolute;
				bottom: 0px;
				left: 0px;
				background: black;
				width: 200px;
				height: 600px;
				color: white;
				line-height: 100px;
				border-radius: 100px 100px 0px 0px;
				text-align: center;
				font-size: 100px;
				transform: translateX(-50%);
				transform-origin: bottom left;
				border: 5px solid gray;
				box-sizing: border-box;
			}

			fighter:after{
				content:". .";
			}

			fighterfist{
				width: 100px;
				height: 100px;
				border-radius: 25%;
				background: black;
	
				display:block;
				position:absolute;
				bottom: 40%;
				left: -30%;
				
				border: 5px solid gray;
				box-sizing: border-box;
			}

			fighterfist:last-of-type{
				left: auto;
				right: -30%;
			}


			fightpanel{
				display:block;
				position:absolute;
				width: ${W/3}px;
				height: ${H}px;
				padding: 50px;
				bottom: 0px;
				left: 0px;
				background: rgba(255,255,255,0.1);
				background-size: 20%;
				animation: flash;
				animation-duration: 0.2s;
				animation-iteration-count: infinite;
				
				transform: translateX(-50%);

				line-height: ${H/2}px;
				color: white;
				text-align: center;
				font-size: 100px;

				box-sizing: border-box;
				
				background: radial-gradient( transparent, rgba(255,255,255,0.5) );
				z-index: 10;
			}

			fightpanel[type='hit']{
				background: rgba(255,255,255,0.5);
			}

			fightprojectile{
				display: block;
				width: 100px;
				height: 100px;
				background: white;
				border-radius: 100%;
				position: absolute;
				transform: translate(-50%, -50%);
			}

			
			@keyframes flash{
				0%{
					opacity:1;
				}

				50%{
					opacity:0.8;
				}

				100%{
					opacity:1;
				}
			}

		</style>
	`);

	let self = this;
	self.$el = $('<igb>');
	

	let $game = $('<fightgame>').appendTo(self.$el);
	let $bg = $('<fightlayer>').appendTo($game);
	let $mg = $('<fightlayer>').appendTo($game);
	let $fg = $('<fightlayer>').appendTo($game);

	
	function getPuncher(iWall){
		return new BatFighter(doGoonHandball, doGoonComplete).spawn(iWall,-1,1).peak().sneak(iWall,1,1).peak().sneak(iWall,0,0).punch(iWall,-1,0).sneak(iWall,0,0).punch(iWall,1,0);
	}


	const LEVELS = 
	[
		[ getPuncher(1) ],
		[ getPuncher(1), getPuncher(2) ],
	]

	let audio = new AudioContext();
	audio.add('music','./proto/audio/fight-music.mp3',0.5,true,true);
	

	let iLevel = -1;
	function doNextLevel(){
		iLevel++;
		for(var n in LEVELS[iLevel]) LEVELS[iLevel][n].$el.appendTo($game);
		setInterval(tick,1000/FPS);
	}

	function doGoonHandball(){
		
	}

	function doGoonComplete(){

	}

	doNextLevel();
	
	let layerWas = -1;
	function tick(){
		let w = $(document).innerWidth();
		let scale = (w/3)/W;
		$game.css('transform','scale('+scale+')');

		for(var n in LEVELS[iLevel]) LEVELS[iLevel][n].tick();
		
	}

	$(document).click(function(){
		audio.play('music');
	});

}