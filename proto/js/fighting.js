BatFighter = function($warning,$hit,$message){

	const CENTER = {x:800,y:0,scale:1,layer:2};
	const WARNLEFT = {x:600,y:0,scale:1,layer:2};
	const PUNCHLEFT = {x:600,y:0,scale:1,layer:2};
	const MISSLEFT = {x:600,y:0,scale:1,layer:2};
	const HIDELEFT = {x:270,y:150,scale:0.5,layer:0};
	const PEAKLEFT = {x:500,y:150,scale:0.5,layer:0};
	const HIDERIGHT = {x:900,y:300,scale:0.2,layer:0};
	const PEAKRIGHT = {x:800,y:300,scale:0.2,layer:0};
	

	let self = this;
	self.$el = $('<fighter>');

	let $fistLeft = $('<fighterfist>').appendTo(self.$el);
	let $fistRight = $('<fighterfist>').appendTo(self.$el);

	

	let n = 0;

	let sequence = [
		{ time:500, pt:HIDERIGHT },
		{ time:500, pt:PEAKRIGHT },
		{ time:500, pt:HIDERIGHT },
		{ time:1000, pt:HIDELEFT },
		{ time:500, pt:PEAKLEFT },
		{ time:1000, pt:CENTER },

		{ fn:doWarningLeft },
		{ fn:doPunchLeft },
		{ fn:doHitLeft },

		{ time:1000, pt:CENTER },
		{ time:500, pt:HIDERIGHT },
		{ time:1000, pt:HIDELEFT },
		{ time:1000, pt:CENTER },

		{ fn:doWarningLeft },
		{ fn:doPunchLeft },
		{ fn:doMissLeft },

		{ time:1000, pt:CENTER }

		/*{ time:200, pt:PUNCHLEFT },
		{ time:300, fn:doPunchLeft },
		{ time:300, fn:doMissLeft },
		
		{ time:300, pt:CENTER, pose:'idle' },*/
	]

	self.at = {x:870,y:300,scale:0.2,layer:0};

	self.to = undefined;

	let iSequence = -1;



	function doWarningLeft(){

		$(self.at).animate(WARNLEFT,300);

		$fistLeft.animate({
			'left':'-35%',
			'bottom':'50%'
		},300);
		audio.play('warning',true);
		
		setTimeout(function(){
			$warning.show();
		},200);

		setTimeout(function(){
			$warning.hide();
		},700)

		setTimeout(function(){
			self.to = undefined;
		},900)
	}

	function doPunchLeft(){
		$fistLeft.animate({
			'left':'-30%',
			'bottom':'30%',
			'width':'300px',
			'height':'300px',
		},200);

		setTimeout(function(){
			self.to = undefined;
		},200);
	}

	function doHitLeft(){
		audio.stop('warning');
		audio.play('boom',true);
		$hit.show();

		$message.text('HIT!');

		setTimeout(function(){
			self.to = undefined;

			resetFists();
		},500);
	}

	function doMissLeft(){
		audio.stop('warning');
		audio.play('slowmo',true);

		$message.text('DODGED!');

		setTimeout(function(){
			$message.empty();
		},1000);

		$fistLeft.css('z-index',1).animate({
			'left':'150%',
			'bottom':'20%',
			'width':'150px',
			'height':'150px',
		},2500);

		$fistRight.animate({
			'left':'170%',
			'bottom':'10%',
		},2500);

		setTimeout(function(){
			self.to = undefined;
			audio.stop('slowmo');
			audio.play('reverse',true);
			resetFists();
		},2500);
	}

	function resetFists(){
		$message.empty();

		$fistLeft.animate({
				bottom: '40%',
				left: '-10%',
				width: '100px',
				height: '100px',
			},300);

		$fistRight.animate({
				bottom: '40%',
				left: '110%',
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

	self.tick = function(){

		if(!self.to){
			iSequence++;
			self.to = sequence[iSequence%sequence.length];

			$warning.hide();
			$hit.hide();

			if(self.to.fn) self.to.fn();
			if(self.to.pose) self.$el.attr('pose',self.to.pose?self.to.pose:'idle');
			if(self.to.pt){
				audio.play('footsteps');	
				$(self.at).animate(self.to.pt,self.to.time);
				setTimeout(function(){
					self.to = undefined;
					audio.stop('footsteps');
				},self.to.time);
				
			}
		}

	

		self.$el.css({
			'left':self.at.x+'px',
			'bottom':self.at.y+'px',
			'transform':'scale('+self.at.scale+') translateX(-50%)',
		})
	}
}

BatFightGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;

	$("head").append(`
		<style>

			@import url('https://fonts.googleapis.com/css2?family=Bangers&display=swap');

			fightgame{
				display:block;
				position:absolute;
				top: 0px;
				left: 0px;
				width: ${W}px;
				height: ${H}px;
				background: url(./proto/img/fight-bg.png);
				transform-origin: top left;
				background-size: ${W}px;
				background-repeat: no-repeat;

				font-family: "Bangers", system-ui;
			}

			fightlayer{
				display:block;
				position:absolute;
				top: 0px;
				left: 0px;
				width: ${W}px;
				height: ${H}px;
			}

			fightlayer:nth-of-type(2):before{
				content:"";
				display:block;
				position:absolute;
				top: 0px;
				left: 0px;
				width: ${W*0.265}px;
				height: ${H}px;
				background: url(./proto/img/fight-bg.png);
				background-size: ${W}px;
				
				background-repeat: no-repeat;
			}

			fightlayer:nth-of-type(2):after{
				content:"";
				display:block;
				position:absolute;
				top: 0px;
				right: 0px;
				width: ${W*0.468}px;
				height: ${H}px;
				background: url(./proto/img/fight-bg.png);
				background-size: ${W}px;
				
				background-position: top right;
				background-repeat: no-repeat;
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
				transform: translate(-50%,-50%);
				display:block;
				position:absolute;
				bottom: 40%;
				left: -10%;
				
				border: 5px solid gray;
				box-sizing: border-box;
			}

			fighterfist:last-of-type{
				left: 110%;
			}

			fighter[pose='warn-left'] fighterfist:first-of-type{
				
				left: -50%;
				bottom: 50%;
				transform: scale(0.8);
			}

			fighter[pose='punch-left'] fighterfist:first-of-type{
				
				left: -50%;
				bottom: 50%;
				z-index: 2;
				transform: scale(3);
				
			}

			fighthit{
				display:block;
				position:absolute;
				width: 50%;
				height: 100%;
				top: 0px;
				left: 0px;
				background: radial-gradient( transparent, rgba(255,0,0,0.5) );
				box-sizing: border-box;
				border: 10px solid red;
			}

			fightmessage{
				display:block;
				position:absolute;
				width: 50%;
				line-height: ${H/2}px;
				color: white;
				text-align: center;
				font-size: 100px;
			}

			fightwarning{
				display:block;
				position:absolute;
				width: 50%;
				height: 100%;
				top: 0px;
				left: 0px;
				background: rgba(255,255,255,0.1);
				
				
				background-size: 20%;

				animation: flash;
				animation-duration: 0.2s;
				animation-iteration-count: infinite;
			}

			fightwarning:before{
				content:"DODGE";

				
				font-size: 40px;

				text-align: center;

				color: white;
				position: absolute;
				top: 45%;
				left: 0px;
				right: 0px;

			}

			fightwarning:after{
				content:"";
				
				background-image: url(./proto/img/fight-fist-icon.png);
				background-position: center;
				background-repeat: no-repeat;
				background-size: 100%;
				width: 20%;
				position: absolute;
				bottom: 0px;
				left: 0px;
				top: 20%;
				right: 0px;
				margin: auto;
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
	$('<igbside>').appendTo(self.$el);
	let $front = $('<igbside>').appendTo(self.$el);
	$('<igbside>').appendTo(self.$el);

	let $game = $('<fightgame>').appendTo($front);
	let $bg = $('<fightlayer>').appendTo($game);
	let $mg = $('<fightlayer>').appendTo($game);
	let $fg = $('<fightlayer>').appendTo($game);

	let $warning = $('<fightwarning>').appendTo($game).hide();
	let $hit = $('<fighthit>').appendTo($game).hide();
	let $message = $('<fightmessage>').appendTo($game);


	let fighter = new BatFighter($warning,$hit,$message);
	fighter.$el.appendTo($fg);

	let audio = new AudioContext();
	audio.add('music','./proto/audio/fight-music.mp3',0.5,true,true);

	function tick(){
		let w = $(document).innerWidth();
		let scale = (w/3)/W;
		$game.css('transform','scale('+scale+')');

		fighter.tick();
		self.$el.find('fightlayer').eq(Math.round(fighter.at.layer)).append(fighter.$el);
	}

	setInterval(tick,1000/FPS);

	$(document).click(function(){
		audio.play('music');
	});

}