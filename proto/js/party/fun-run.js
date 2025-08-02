window.FunRunGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;

	const QUESTIONS = [
		{
			q:"What was the second meep carrying?",
			type:'item',
			parade:[
				{m:0,i:0},
				{m:1,i:1},
				{m:2,i:2},
			],
			options:[
				{i:0},
				{i:1},
				{i:2,isCorrect:true},
				{i:3},
			]
		},

		{
			q:"What colour was the third meep?",
			type:'meep',
			parade:[
				{m:1,i:2},
				{m:2,i:1},
				{m:0,i:2},
				{m:3,i:1},
			],
			options:[
				{i:0,isCorrect:true},
				{i:1},
				{i:2},
				{i:3},
			]
		},

	]

	

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-playroom.mp3',0.3,true);

	const FunRunVignette = function(parade,callback){
		let self = this;
		self.$el = $('<funrunvignette>');

		for(var i=0; i<parade.length; i++){
			let carrier = new FunRunCarrier( parade[i].m, parade[i].i );
			carrier.$el.appendTo(self.$el);
			carrier.$el.css({
				left: '150%',
				bottom: '50px',
			})
			.delay(i*700)
			.animate({
				left: '-50%',
			},{
				duration:6000,
				easing:'linear',
			})
		}

		setTimeout( callback, 6000 + (i-1)*700 );
	}

	const FunRunOptions = function(type,options){
		let self = this;
		self.$el = $('<funrunoptions>');

		let $options = [];
		for(var o in options){
			$options[o] = $('<funrunoption>').appendTo(self.$el);

			if(type=='meep'){
				new PartyMeepHead(options[o].i).$el.appendTo($options[o]).css({
					'left':'50%',
					'top':'50%',
					'transform':'translateX(-50%) scale(2)',
				})
			} else {
				$('<funrunitem>').appendTo($options[o]).css({
					'background-position-x':-options[o].i*100+'%',
				})
			}

			
		}

		self.showCorrect = function(){
			for(var o in $options){
				if( options[o].isCorrect ) $options[o].addClass('correct');
			}
		}
	}

	const FunRunCarrier = function( nMeep, nItem ){
		let self = this;
		self.$el = $('<funruncarrier>');

		let meep = new PartyMeep(nMeep);
		meep.$el.appendTo(self.$el).css({
			bottom: '0px',
			left: '0px',
		});

		meep.$handLeft.css({left:'-120px',top:'50%'});
		meep.$handRight.css({left:'-30px',top:'65%'});

		let item = $('<funrunitem>').css({
			'background-position-x':-nItem*100+'%',
		})
		item.appendTo(self.$el);
	}

	if( !FunRunGame.init ){
		FunRunGame.init = true;

		$("head").append(`
			<style>
				funrungame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: gray;
					background-position: bottom 120px center;
					perspective: ${W*3}px;


					transition: background-size 1s;
				}

				funruncarrier{
					display: block;
					position: absolute;
				}

				funrunitem{
					display: block;
					position: absolute;
					
					background: url(./proto/img/party/actor-farm-items.png);
					background-size: 1200%;	
					
				}

				funruncarrier funrunitem{
					width: 300px;
					height: 300px;
					bottom: 50px;
					left: -250px;
				}

				funrunoption funrunitem{
					inset: 150px;
				}

				funrunbg.floorview:before{
					bottom: ${H-150}px;
				}

				funrunbg.floorview:after{
					height: ${H-150}px;
				}

				funrunbg{
					display: block;
					position: absolute;
					inset: 0px;

					background: #FAB14B;
				}

				funrunbg:before{
					content:"";
					display: block;
					position: absolute;
					
					background: url(./proto/img/party/bg-farm.png);
					background-size: 100% 100%;
					background-position: bottom center;

					width: 100%;
					height: 100%;
					bottom: 200px;
					left: 0px;

					box-shadow: inset 0px -20px 50px #879B60;

					transition: bottom 1s;
					opacity: 0.8;
				}

				funrunbg:after{
					content:"";
					display: block;
					position: absolute;
					
					bottom: 0px;
					left: 0px;
					right: 0px;

					height: 200px;
					background: linear-gradient(to bottom, #FAB14B, #F27E43);
					background-image: linear-gradient(to bottom, #FAB14B, transparent), url(./proto/img/party/texture-grass.jpg);
					background-size: 100%, 40% 20%;

					transition: height 1s;
				}

				funrunworld{
					position: absolute;
					display: block;
					left: 50%;
					bottom: 0px;
					transform-style: preserve-3d;
					transform: rotateX(-2deg);
					transition: all 1s;
				}

				funrunfloor{
					position: absolute;
					display: block;
					width: ${W}px;
					height: ${W}px;
					left: ${-W/2}px;
					bottom: ${0}px;
					background: #999;
					box-sizing: border-box;
					transform: rotateX(90deg);
					transform-style: preserve-3d;
					transform-origin: bottom center;

					background: radial-gradient(#999, #aaa);

					background: url(./proto/img/party/texture-wood.png);
					background-size: 20%;

					box-shadow: 0px 50px #432D22;
				}

				funrunwall{
					position: absolute;
					display: block;
					width: ${W}px;
					height: ${H}px;
					left: ${-W/2}px;
					bottom: ${0}px;

					box-sizing: border-box;
					transform: translateZ(${-W}px);
					transform-style: preserve-3d;
					transform-origin: bottom center;

					

					background: #875333;
					box-shadow: inset 0px 5px 10px orange;

					background: url(./proto/img/party/texture-wood.png);
					background-size: 20%;
				}

				funrunscreen{
					position: absolute;
					display: block;
					inset: 50px 50px 250px 50px;
					background: black;
					
					background: url(./proto/img/party/bg-cityscape.png);
					background-size: 300% 95%;
					overflow: hidden;

					box-shadow: inset 0px 0px 40px rgba(0,0,0,0.5);

					background: url(./proto/img/party/texture-wood.png);
					background-size: 20%;
				}

				funrunscreen:before{
					content: "";
					position: absolute;
					inset: 0px;
					background: black;
					opacity: 0.3;
				}

				funrunplatform{
					content: "";
					position: absolute;
					bottom: 0px;
					left: 0px; 
					right: 0px;
					height: 15%;
					background: #6C4732;
					background-size: 20% 50%;
					box-shadow: inset 0px 0px 50px rgba(0,0,0,0.5);
				}

				funrundial{
					position: absolute;
					display: block;
					width: 150px;
					height: 150px;
					right: 50px;
					bottom: 50px;
					background: gray;
					border-radius: 100%;
					box-shadow: 0px -5px 20px black;
				}

				funrunspeaker{
					position: absolute;
					display: block;
					width: 350px;
					height: 150px;
					left: 50px;
					bottom: 50px;
					background: gray;
					border-radius: 25px;
					background:repeating-linear-gradient(
						    gray,
						  black 20px,
						  gray 20px,
						  black 25px
						  );
				}

				funruncurtain{
					display: block;
					position: absolute;
					inset: 0px;

				}

				funruncurtain:before{
					content:"";
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
					width: 50%;
					height: 100%;
					background: url(./proto/img/party/texture-curtain.avif);
					background-size: 100% 100%;
					z-index: 1;
					transition: width 1s;
				}

				funruncurtain:after{
					content:"";
					display: block;
					position: absolute;
					top: 0px;
					right: 0px;
					width: 50%;
					height: 100%;
					background: url(./proto/img/party/texture-curtain.avif);
					background-size: 100% 100%;
					z-index: 1;
					transition: width 1s;
				}

				funruncurtain.open:before, funruncurtain.open:after{
					width: 5%;
					transition: width 1s;
				}

				funrunvignette{
					display: block;
					position: absolute;
					inset: 0px;
				}

				funrunoptions{
					display: block;
					position: absolute;
					inset: 0px;
					white-space: normal;
				}

				funrunoption{
					display: inline-block;
					width: 50%;
					height: 50%;
					position: relative;
				}

				funrunoption:before{
					content:"";
					background: rgba(0,0,0,0.1);
					display: block;
					position: absolute;
					inset: 50px;
					border-radius: 20px;
	
					border-top: 10px solid rgba(0,0,0,0.5);
				}

				funrunoption.correct:before{
					background: radial-gradient( transparent, var(--green) );
				}

				funruntick{
					position: absolute;
					display: block;
					background: var(--green);
					background: none;
					width: 100px;
					height: 100px;
					border-radius: 100%;

					bottom: 400px;
					left: -50px;

					color: white;
					line-height: 100px;
					font-size: 100px;
					text-align: center;
				}

				funruntick:before{
					content:"";
					position: absolute;
					display: block;
					width: 30px;
					height: 50px;
					box-sizing: border-box;
					border-right: 10px solid white;
					border-bottom: 10px solid white;
					transform: rotate(45deg);
					margin: auto;
					inset: 0px;

					display: none;
				}


			</style>
		`);
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<funrungame>').appendTo(self.$el);
	let $bg = $('<funrunbg>').appendTo($game);
	let $world = $('<funrunworld>').appendTo($game);

	let $floor = $('<funrunfloor>').appendTo($world);
	let $wall = $('<funrunwall>').appendTo($world);
	let $screen = $('<funrunscreen>').appendTo($wall);
	let $platform = $('<funrunplatform>').appendTo($screen);
	let $curtain = $('<funruncurtain>').appendTo($screen);
	//let $dial = $('<funrundial>').appendTo($wall);
	//let $speaker = $('<funrunspeaker>').appendTo($wall);

	let hud = new PartyHUD();
	hud.$el.appendTo($game);

	let meeps = [];
	function initGame(count){
		for(var i=0; i<count; i++){
			meeps[i] = new PartyMeep(i);
			meeps[i].$el.appendTo($floor);
			meeps[i].$el.css({
				'transform':'rotateX(-90deg)',
			})
		}

		setTimeout( initNextQuestion, 1000 );
	}

	let nQuestion = -1;

	function initNextQuestion(){
		nQuestion++;
		toWall();
		hud.initBanner('Round '+(nQuestion+1));
		setTimeout(initVignette,2000);
	}

	let vignette;
	let question;
	let options;
	
	function initVignette(){
		hud.finiBanner();

		question = QUESTIONS[nQuestion];

		vignette = new FunRunVignette(question.parade,finiVignette);
		vignette.$el.appendTo($screen);
		$curtain.appendTo($screen);

		options = new FunRunOptions(question.type,question.options);
		options.$el.appendTo($floor);
		//options.$el.hide();

		setTimeout(function(){
			$curtain.addClass('open');
		},500);
	}

	function finiVignette(){
		$curtain.addClass('close');
		setTimeout(function(){
			toFloor();
			hud.initBanner(question.q,'small');
			hud.initTimer(10,initSolution);
			options.$el.show();
		},1000);
	}

	function initSolution(){

		for(let m in meeps){
			meeps[m].isFrozen = true;
			meeps[m].iVote = Math.round(meeps[m].px) + Math.round(meeps[m].py)*2;

			if( question.options[meeps[m].iVote].isCorrect ){
				meeps[m].score++;
				options.showCorrect();

				$('<funruntick>').appendTo(meeps[m].$el).text('+'+meeps[m].score);
			}
		}

		setTimeout(finiQuestion,2000);
	}

	function finiQuestion(){

		self.$el.find('funruntick').remove();

		options.$el.remove();
		vignette.$el.remove();

		for(var m in meeps) meeps[m].isFrozen = false;

		initNextQuestion();
	}

	initGame(6);

	function toWall(){
		$world.css({
			transform: 'rotateX(-2deg) scale(1) translateY(-0px)',
		})

		$bg.removeClass('floorview');
		
	}

	function toFloor(){
		$world.css({
			transform: 'rotateX(-20deg) scale(0.85) translateY(-120px)',
		})

		$bg.addClass('floorview');
		$curtain.removeClass('open');
	}

	toFloor();


	self.step = function(){
	
		for(var m in meeps){
			if(!meeps[m].isFrozen) meeps[m].$el.css({
				left: meeps[m].px*W + 'px',
				top: meeps[m].py*W + 'px',
			})
		}

		resize();
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	let interval = setInterval(self.step,1000/FPS);

	self.fini = function(){
		audio.stop('music');
		clearInterval(interval);
	}

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].px = (p[m].px);
			meeps[m].py = (1-p[m].pz);
		}
	}
}