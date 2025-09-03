window.PartyPlayerHUD = function(n,meep,type){
 
	let self = this;
	self.$el = $(`
		<partyplayerhud n=${n} type=${type}>
			<partyscore>${Math.floor(meep.score)}</partyscore>	
		</partyplayerhud>`
	);

	let head = new PartyMeepHead(n);
	head.$el.appendTo(self.$el);

	self.redraw = function(score){
		self.$el.find('partyscore').text(Math.floor(score));
	}


}

window.PartyHUD = function( colour='#40B0ED' ){

	const COLOUR = 'gray';
	const THICC = 40;

	let audio = new AudioContext();
	audio.add('tick','./proto/audio/party/sfx-tick.mp3',0.3);
	audio.add('tock','./proto/audio/party/sfx-tock.mp3',0.3);
	audio.add('coin','./proto/audio/party/sfx-coin.mp3',0.3);

	new PartyMeep(0);

	if(!PartyHUD.didInit){
		PartyHUD.didInit = true;

		$("head").append(`
			<style>

				@import url('https://fonts.googleapis.com/css2?family=Paytone+One&display=swap');
				@import url('https://fonts.googleapis.com/css2?family=Knewave&display=swap');

				partyhud{
					position: absolute;
					top: 0px;
					bottom: 0px;
					left: 0px;
					right: 0px;
					display: block;
					z-index: 100;
					text-align: center;

					pointer-events: none;
					
  					font-family: "Paytone One";
				}

				partyhudbaseline{
					display: block;
					bottom: 0px;
					position: absolute;
					left: 0px;
					right: 0px;
					text-align: center;

					bottom: ${-THICC*2}px;
				}

				partyhudtopline{
					display: inline-block;
					position: absolute;
					top: ${-THICC*2}px;
					left: 0px;
					right: 0px;
					text-align: center;
					white-space: nowrap;
					margin: auto;
				}

				partyhudstream{
					display: inline-block;
					white-space: nowrap;
					box-shadow: 0px 0px 20px rgba(0,0,0,0.5);
					
					background: ${COLOUR};
					height: ${THICC*2}px;
					position: relative;
					margin: 0px 30px;
				}

				partyhudtopline partyhudstream{
					padding: 0px;
				}

				partyhudframe{
					display: inline-block;
					width: 33.33%;
					height: 100%;
					position: relative;
					overflow: hidden;
				}

				partyhudborder:nth-of-type(1){
					display: block;
					position: absolute;
					inset: 0px;
					box-sizing: border-box;
					border: ${THICC}px solid black;
					filter: blur(20px);
					opacity: 0.5;
				}

				partyhudborder:nth-of-type(2){
					display: block;
					position: absolute;
					inset: 0px;
					box-sizing: border-box;
					border: ${THICC}px solid ${COLOUR};
				}

				partyhudborder:nth-of-type(3){
					display: block;
					position: absolute;
					inset: 0px;
					box-sizing: border-box;
					border: ${THICC}px solid;
					border-image: url(proto/img/party/texture-paper.jpeg) ${THICC};
					mix-blend-mode: multiply;
					opacity: 0.3;

				}

				partyhudbanner{
					background: ${COLOUR};
					position: absolute;
					left: 0px;
					right: 0px;
					
					top: 110%;
					box-shadow: 0px 2px 20px black;
					font-size: 80px;
					color: white;
					line-height: 80px;
					padding: 40px 0px 50px;
					text-shadow: 0px -3px black;
				}

				partyhudbanner spacer{
					height: 40px;
					display: block;
				}

				partyhudbanner p{
					margin: 0px;
					padding: 0px;
				}

				partyplayerhud{
					width: 190px;
					height: ${THICC*2}px;
					display: inline-block;
					box-sizing: border-box;
					position: relative;
					color: white;
					vertical-align: top;
					overflow: hidden;
				}

				partyhudtimer{
					width: 150px;
					color: #222;
					display: inline-block;
					font-size: 50px;
					line-height: ${THICC*2}px;
					vertical-align: top;
					background: white;
				}

				partyplayerhud partymeephead{
					position: absolute;
					top: 20px;
					left: 30px;
					transform: scale(0.6);
					transform-origin: top left;
				}

				partyplayerhud partyscore{
					display: inline-block;
					position: absolute;
					color: white;
					
					left: 115px;
					top: 0px;
					
					font-weight: bold;
					
					padding: 0px;
					margin: 0px;
					text-align: left;
					
					box-sizing: border-box;
					font-size: ${THICC}px;
					line-height: ${THICC*2}px;
					font-weight: 100;

				}

				partyplayerhud[type='before'] partyscore{ padding-left:50px; }
				partyplayerhud[type='before'] partymeephead{ left:-10px; }

				partyplayerhud[type='after'] partyscore{ padding-right:50px; }
				partyplayerhud[type='after'] partymeephead{ right:-10px; }

				partyhud button{
					font: inherit;
					font-size: 100px;
					background: rgba(0,0,0,0.1);
					background: rgba(255,255,255,0.2);
					border: none;
					padding: 20px 50px 40px;
					margin: 0px 10px;
					color: white;
					border-radius: 30px;
					box-shadow: 0px 5px rgba(0,0,0,0.4);
					text-shadow: 0px -3px black;

					pointer-events: auto;
				}

				partydebug{
					display: inline-block;
					position: absolute;
					top: 350px;
					right: 80px;
				}

				partydebug button{
					font-size: 30px;
					display: block;
					padding: 30px 30px 35px;
					margin-bottom: 20px;
				}

				hudsummonlist{
					display: inline-block;
					line-height: 80px;

					text-align: center;
					margin: 0px 40px;
				}

				hudswaplist{
					display: inline-block;
					line-height: 80px;
					position: absolute;
					top: 50%;
					left: 50%;
				}

				hudswaplist h1{
					position: absolute;
					left: -100px;
					right: -100px;
					top: 50px;
					font-size: 50px;
				}

				hudswaplist partymeephead{
					position: absolute;
					left: auto;
					display: inline-block;
					transform: translate(-50%,-50%);
				}

				hudsummonplayer{
					display: inline-block;
					position: relative;
					margin: 0px 20px;
				}

				hudsummonlist partymeephead{
					position: relative;
					left: auto;
					display: inline-block;
					margin: 0px 20px;

				}

				hudsummonlist.in partymeephead{

				}

				hudsummonlist.out partymeephead{
					margin: 0px -5px;
					transform: scale(0.6);
				}

				hudsummonlist h2{
					display: block;
					line-height: 50px;
					font-size: 50px;
					color: white;
					margin: 0px;
					padding: 0px;
					margin-top: 20px;
				}

				partyhudpips{
					display: block;
				}

				partyhudpip{
					display: inline-block;
					width: 40px;
					height: 40px;
					background: white;
					border-radius: 100%;
					margin: 0px 10px;
					
					
					transform: scale(0.5);

					border: 5px solid #444; 

					box-shadow: 5px 10px 0px #444;
				}

				partyhudpip[fill='true']{
					opacity: 1;
				}

				partyhudpip[highlight='true']{
					transform: scale(1);
				}

				partyhudlayer{
					display: block;
					position: absolute; 
					inset: 0px;
				}

				hudmeepscore{
					display: block;
					position: absolute; 
					bottom: 350px;
					left: -100px;
					right: -100px;
					text-align: center;
					color: white;
					line-height: 150px;
					font-size: 75px;
				}

				hudmeepreward{
					display: block;
					position: absolute; 
					bottom: 100px;
					left: -80px;
					right: -80px;
					text-align: center;
					color: white;
					
					font-size: 60px;
					border: 5px solid white;
					background: #9B62E8; 
					padding: 15px 0px 30px;
					border-radius: 10px;
					transform: rotate(-2deg);
					line-height: 60px;
				}

				hudround{
					font-family: "Knewave", system-ui;
					font-weight: 400;
					font-style: normal;
					font-size: 200px;
					transform: rotate(-5deg);
					display: block;

					text-shadow: 5px 5px 0px #444, 5px -5px 0px #444, -5px -5px 0px #444, -5px 5px 0px #444, 0px 20px 0px #444;
				}
			</style>
			`);
	}

	let self = this;
	self.$el = $('<partyhud>');

	let $banner = $(`<partyhudbanner style="background:${colour};">`).appendTo(self.$el);
	let $debugRight = $('<partydebug>').appendTo(self.$el);
	let $mg = $('<partyhudlayer>').appendTo(self.$el);

	function setBanner(b,isTransparent){

		let location = isTransparent?300:175;

		if(b){
			$banner.css({top:'100%'}).animate({top:location-50+'px'}).animate({location:100+'px'});
		} else {
			let isAtPos = $banner.css('top');
			$banner.animate({top:isAtPos+50+'px'}).animate({top:'-40%'});
		}

		if( b ) $banner.css({
			'background':isTransparent?'transparent':colour,
			'box-shadow':isTransparent?'none':''
		});
	}

	self.initPlayerCount = function(callback){
		setBanner(true);
		$('<p>').text('How big is your squad?').appendTo($banner);
		$('<spacer>').appendTo($banner);
		for(var p=2; p<=6; p++) $('<button>').attr('count',p).appendTo($banner).text(p).click(function(){
			let count = parseInt( $(this).attr('count') );
			callback(count);
			setBanner(false);
		});
	}

	let interval;

	self.initTimer = function(seconds,callback){

		$baseline.animate({bottom:0});
		$timer.text(seconds);

		let timeStart = new Date().getTime();
		let secondsWas = seconds+1;
		interval = setInterval(function(){
			let timeNow = new Date().getTime();
			let timeElapsed = timeNow-timeStart;
			let secondsRemaining = Math.ceil( seconds - (timeElapsed/1000) );
			$timer.text(secondsRemaining);

			if(secondsRemaining<secondsWas && secondsRemaining<=5){
				secondsWas = secondsRemaining;
				if(secondsRemaining==0) audio.play('tock',true);
				else audio.play('tick',true);
			}

			if(secondsRemaining==0){
				self.clearTimer();
				callback();
			}
		},1000/50);
	}

	self.finiTimer = function(){
		$baseline.animate({bottom:-150});
	}

	self.clearTimer = function(){
		clearInterval(interval);
	}

	self.initRound = function(n,max,msg=undefined){
		if(msg==undefined){
			msg = 'Round '+(n+1);
			if(n==(max-1)) msg = 'Final Round';
		}

		setBanner(true,true);

		$banner.empty();
		let $round = $('<hudround>').appendTo($banner);

		for(var m=0; m<msg.length; m++){
			let $char = $('<span>').appendTo($round).text(msg[m]);
			$char.css({
				'position':'relative',
				'left':'500px',
				'opacity':0,
			}).delay(m*100).animate({
				'left':'-30px',
				'opacity':1,
			},300).animate({
				'left':'0px',
			},200).delay(1500-m*50).animate({
				'top':'20px'
			},300).animate({
				'top':'-500px',
				'opacity':0,
			},300)
		}

		//self.initBanner(msg);
		let $pips = $('<partyhudpips>').appendTo($banner).css({
			position: 'relative',
			top:'100px',
		}).delay(2500).animate({
			top:'-500px',
			opacity:0,
		})
		for(var i=0; i<max; i++){
			$('<partyhudpip>').appendTo($pips).attr('fill',(i<=n)).attr('highlight',(i==n));
		}
	}

	self.initBanner = function(msg,size='p'){
		setBanner(true);
		$banner.html(`<${size}>${msg}</${size}>`);
	}

	self.finiBanner = function(){
		setBanner(false);
	}

	self.showFinalScores = function(scores,rewards){
		for(var s=0; s<scores.length; s++){
			let meep = new PartyMeep(s);
			meep.$el.appendTo($mg);
			let p = 0.15 + 0.7/(scores.length-1) * s;
			let pos = (100/3) + (100/3)*p;
			
			let $score = $('<hudmeepscore>').appendTo(meep.$el).text(scores[s]);
			let $reward = $('<hudmeepreward>').appendTo(meep.$el).text('+ '+rewards[s]).hide();

			meep.$el.css({
				left: 100/3 + (100/3)*p + '%',
				bottom: '-400px',
			}).delay(s*200).animate({
				bottom: (THICC+100)+'px',
			},300).animate({
				bottom: THICC+'px',
			},{duration:200,complete:function(){
				meep.setHeight(300);
				setTimeout(function(){
					meep.setHeight(350);
				},200);

				setTimeout(function(){
					$score.hide();
				},2000);

				setTimeout(function(){
					$reward.show().animate({bottom:'+=260px'},300).animate({bottom:'-=20px'},100);
					audio.play('coin',true);
				},2000);
			}})

			meep.$handLeft.delay(s*200 + 2500).animate({
				top: '-10px',
			},300).animate({top:'5px'},100);

			meep.$handRight.delay(s*200 + 2500).animate({
				top: '-10px',
			},300).animate({top:'0px'},100);

			meep.$shadow.hide();
		}
	}

	self.addDebug = function(name,fn){
		$('<button>').text(name).appendTo($debugRight).click(function(){
			fn();
		});
	}

	for(var i=0; i<3; i++){
		$(`
		<partyhudframe>
			<partyhudborder style='border-width:${THICC}px'></partyhudborder>
			<partyhudborder style='border-color:${colour};border-width:${THICC}px'></partyhudborder>
			<partyhudborder style='border-width:${THICC}px'></partyhudborder>

			<svg width='${THICC*2}px' height='${THICC*2}px' style='position:absolute;top:0px;left:0px;'>
				<path d='M0,0 L${THICC},${THICC} L${THICC*1.2},${THICC}' fill='rgba(0,0,0,0.4)'/>
				<path d='M0,0 L${THICC},${THICC} L${THICC},${THICC*1.2}' fill='rgba(255,255,255,0.3)'/>
			</svg>

			<svg width='${THICC*2}px' height='${THICC*2}px' style='position:absolute;top:0px;right:0px;transform:scaleX(-1)'>
				<path d='M0,0 L${THICC},${THICC} L${THICC*1.2},${THICC}' fill='rgba(0,0,0,0.4)'/>
				<path d='M0,0 L${THICC},${THICC} L${THICC},${THICC*1.2}' fill='rgba(255,255,255,0.3)'/>
			</svg>

			<svg width='${THICC*2}px' height='${THICC*2}px' style='position:absolute;bottom:0px;right:0px;transform:scale(-1)'>
				<path d='M0,0 L${THICC},${THICC} L${THICC*1.2},${THICC}' fill='rgba(0,0,0,0.4)'/>
				<path d='M0,0 L${THICC},${THICC} L${THICC},${THICC*1.2}' fill='rgba(255,255,255,0.3)'/>
			</svg>

			<svg width='${THICC*2}px' height='${THICC*2}px' style='position:absolute;bottom:0px;left:0px;transform:scaleY(-1)'>
				<path d='M0,0 L${THICC},${THICC} L${THICC*1.2},${THICC}' fill='rgba(0,0,0,0.4)'/>
				<path d='M0,0 L${THICC},${THICC} L${THICC},${THICC*1.2}' fill='rgba(255,255,255,0.3)'/>
			</svg>

		<partyhudframe>
		`).appendTo(self.$el);
	}

	let $baseline = $('<partyhudbaseline>').appendTo(self.$el);
	let $stream = $(`
		<partyhudstream style='background:${colour};'>
			<svg width='20px' height='80px' style='position:absolute;left:-20px;top:0px;'>
				<path d='M0,40 L20,0 L20,80 L0,80' fill='${colour}'/>
				<path d='M0,40 L20,0 L20,80 L0,80' fill='rgba(0,0,0,0.2)'/>
			</svg>
			<svg width='20px' height='80px' style='transform:scaleX(-1);position:absolute;right:-20px;top:0px;'>
				<path d='M0,40 L20,0 L20,80 L0,80' fill='${colour}'/>
				<path d='M0,40 L20,0 L20,80 L0,80' fill='rgba(0,0,0,0.2)'/>
			</svg>
		</partyhudstream>
	`)//.appendTo($baseline);

	let $topline = $('<partyhudtopline>').appendTo(self.$el);
	let $streamTop = $(`<partyhudstream style='background:${colour};'>
			<svg width='20px' height='80px' style='transform:scaleY(-1);position:absolute;left:-20px;top:0px;'>
				<path d='M0,40 L20,0 L20,80 L0,80' fill='${colour}'/>
				<path d='M0,40 L20,0 L20,80 L0,80' fill='rgba(0,0,0,0.2)'/>
			</svg>
			<svg width='20px' height='80px' style='transform:scale(-1);position:absolute;right:-20px;top:0px;'>
				<path d='M0,40 L20,0 L20,80 L0,80' fill='${colour}'/>
				<path d='M0,40 L20,0 L20,80 L0,80' fill='rgba(0,0,0,0.2)'/>
			</svg>
		</partyhudstream>
	`).appendTo($topline);

	let $streamTimer = $(`<partyhudstream style='background:${colour};'>
			<svg width='20px' height='80px' style='transform:scaleY(-1);position:absolute;left:-20px;top:0px;'>
				<path d='M0,40 L20,0 L20,80 L0,80' fill='${colour}'/>
				<path d='M0,40 L20,0 L20,80 L0,80' fill='rgba(0,0,0,0.2)'/>
			</svg>
			<svg width='20px' height='80px' style='transform:scale(-1);position:absolute;right:-20px;top:0px;'>
				<path d='M0,40 L20,0 L20,80 L0,80' fill='${colour}'/>
				<path d='M0,40 L20,0 L20,80 L0,80' fill='rgba(0,0,0,0.2)'/>
			</svg>
		</partyhudstream>
	`).appendTo($topline);
	
	let huds = [];
	
	let type = 'before'

	let $left = $('<div style="display:inline-block;">').appendTo($stream);
	let $timer = $(`<partyhudtimer>60</partyhudtimer>`).appendTo($stream);
	let $right = $('<div style="display:inline-block;">').appendTo($stream);

	self.initPlayers = function(meeps){
		let iTimer = Math.floor(meeps.length/2);
		for(var i=0; i<meeps.length; i++){
			let hud = new PartyPlayerHUD(i,meeps[i]);
			hud.$el.appendTo($streamTop);
			huds[i] = hud;


		}

		

		$topline.animate({top:0});

		
		$timer.appendTo($streamTimer);
	}

	self.updatePlayers = function(meeps) {
		for(var i=0; i<meeps.length; i++) huds[i].redraw(meeps[i].score);
	}

	self.summonPlayers = function( arrIn, arrOut ){
		setBanner(true);

		$banner.empty();

		if(arrIn && arrIn.length){
			let $listIn = $('<hudsummonlist class="in">');
			for(var a in arrIn) new PartyMeepHead(arrIn[a]).$el.appendTo($listIn);
			$('<h2>').text('STEP FORWARD').appendTo($listIn);
			$banner.append($listIn);
		}

		if(arrOut && arrOut.length){
			let $listOut = $('<hudsummonlist class="out">');
			for(var a in arrOut) new PartyMeepHead(arrOut[a]).$el.appendTo($listOut);
			$('<h2>').text('STEP BACK').appendTo($listOut);
			$banner.append($listOut);
		}
	}

	const RADIUS = 60;
	self.swapPlayers = function(nIn,nOut){

		setBanner(true,true);

		$banner.empty();
		let $swap = $('<hudswaplist>').appendTo($banner);
		let $in = new PartyMeepHead(nIn).$el.appendTo($swap);
		let $out = new PartyMeepHead(nOut).$el.appendTo($swap);
		$('<h1>').appendTo($swap).text('SWAP');

		let anim = {r:0,p:0};

		function redraw(){
			$out.css({
				left:Math.cos(anim.r) * RADIUS,
				top:Math.sin(anim.r) * RADIUS,
				'transform':'translate(-50%, -50%) scale('+(0.5 + anim.p*0.5)+')',
			});
			$in.css({
				left:Math.cos(anim.r) * -RADIUS,
				top:Math.sin(anim.r) * -RADIUS,
				'transform':'translate(-50%, -50%) scale('+(1 - anim.p*0.5)+')',
			})
		}

		redraw();

		$(anim).delay(1000).animate({ r:Math.PI, p:1 },{
			duration: 1000,
			step:redraw		
		})

		//$in.css({top:0,left:100}).delay(1000).animate({left:-100,top:0});
		//$out.css({top:0,left:-100}).delay(1000).animate({left:100,top:0});
	}

	self.redraw = function(sec=0){
		$timer.text(sec);
		for(var h in huds) huds[h].redraw();
	}

	self.redraw();

	self.fini = function(){
		self.clearTimer();
	}
}