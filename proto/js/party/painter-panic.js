window.PainterPanicGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const BOX = 500;
	const THICC = BOX/6;
	const BRUSH = {W:50,H:200};

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-playroom.mp3',0.3,true);

	if( !PainterPanicGame.init ){
		PainterPanicGame.init = true;

		$("head").append(`
			<style>
				paintergame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background-image: url(./proto/img/party/bg-box-factory.png);
					background-size: 100%;
					background-position: bottom 120px center;

					perspective: ${W*3}px;
				}

				paintercanvas{
					display:block;
					position: absolute;
					inset: 0px;
					transform-style: preserve-3d;
				}

				paintergame:before{
					content: "";
					position: absolute;
					display: block;
					inset: 0px;
					background: linear-gradient(to top, #2963A2, transparent);
				}

				painterspace{
					display:block;
					position: absolute;
					transform: rotateX(20deg);
					transform-style: preserve-3d;
				}

				painterbox{
					display:block;
					position: absolute;
					width: ${BOX}px;
					height: ${BOX}px;
					background: url(./proto/img/party/texture-canvas.jpg);
					background-size: cover;
					transform: translate(-50%,-50%);
					transform-style: preserve-3d;
				}

				painterbox path{
					stroke: red;
					stroke-width: 100;
					fill: none;
				}

				painterwall:nth-of-type(1){
					display:block;
					position: absolute;
					width: ${BOX}px;
					height: ${THICC}px;
					background: url(./proto/img/party/texture-canvas.jpg);
					background-size: cover;
					transform: rotateX(-90deg);
					transform-style: preserve-3d;
					transform-origin: top center;
					top: 100%;
					left: 0px;
				}

				painterwall:nth-of-type(2){
					display:block;
					position: absolute;
					width: ${BOX}px;
					height: ${THICC}px;
					background: url(./proto/img/party/texture-canvas.jpg);
					background-size: cover;
					transform: rotateZ(90deg) rotateX(-90deg);
					transform-style: preserve-3d;
					transform-origin: left top;
					top: 0px;
					left: 0px;
				}

				painterwall:nth-of-type(3){
					display:block;
					position: absolute;
					width: ${THICC}px;
					height: ${BOX}px;
					background: url(./proto/img/party/texture-canvas.jpg);
					background-size: cover;
					transform: rotateY(-90deg);
					transform-style: preserve-3d;
					transform-origin: right top;
					top: 0px;
					right: 0px;
				}

				painterwall:after{
					content:"";
					display: block;	
					position: absolute;
					inset: 0px;
					background: black;
					opacity: 0.2;
				}

				paintermeep{
					display: block;
					position: absolute;

					transform-origin: bottom right;
					transform: rotateX(-90deg);
					transform-style: preserve-3d;
				}

				painterframe{
					display: block;
					position: absolute;
					width: ${BRUSH.W}px;
					height: ${BRUSH.H-50}px;
					right: 0px;
					bottom: 50px;
					border: 20px solid red;
					border-radius: 10px;
					box-sizing: border-box;
					box-shadow: 10px 0px #222;
				}

				painterbrush{
					display: block;
					position: absolute;
					width: ${BRUSH.W}px;
					height: ${BRUSH.W+10}px;
					left: ${-BRUSH.W/2}px;
					bottom: 0px;
					box-sizing: border-box;
					background: white;
					border-radius: 20px 20px 0px ${BRUSH.W*0.5}px;
					box-sizing: border-box;
					background: #e8ceb2;
					box-shadow: inset 0px -25px 5px red;
					border: 2px solid black;
				}

				painterhead{
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
					right: 0px;
				}

				painterhead:before{
					content:"";
					display: block;
					position: absolute;
					top: 30px;
					left: 0px;
					right: 0px;
					border-top: 7px solid red;
					border-radius: 40px 40px 0px 0px;
				}

				painterhead:after{
					content:"..";
					display: block;
					position: absolute;
					top: 30px;
					left: 0px;
					right: 0px;
					color: black;
					font-size: 40px;
					line-height: 0px;
					transform: scaleY(2);
					font-family: serif;
					opacity: 0.7;
					text-align: center;
				}

				painterstick:after{
					content:"";
					display: block;
					position: absolute;
					width: ${BRUSH.W*0.8}px;
					height: 30px;
					left: 0px;
					right: 0px;
					bottom: 0px;
					background: #ffbb55;
					box-sizing: border-box;
					border-radius: 0px 0px 10px 10px;

					box-shadow: inset 0px 0px 10px black;

					display: none;
				}

				painterstick{
					display: block;
					position: absolute;
					width: ${BRUSH.W*0.8}px;
					height: ${BRUSH.H}px;
					bottom: ${BRUSH.W}px;
					left: ${-BRUSH.W*0.4}px;
					background: white;

					border-radius: 50% 50% ${BRUSH.W/2}px ${BRUSH.W/2}px;
					transform-origin: bottom center;
					transform: rotate(-5deg);
					overflow: hidden;

					box-shadow: inset 0px 0px 5px black;
				}

				
				paintershadow{
					position: absolute;
					display: block;
					height: ${BRUSH.H}px;
					width: ${BRUSH.W}px;
					background: black;
					left: ${-BRUSH.W/2}px;
					bottom: 0px;
					transform: rotate(45deg);
					transform-origin: bottom right;
					background: linear-gradient(to top, rgba(0,0,0,0.3), transparent);
				}

				paintermeep[n='0'] painterhead:before{ border-color: var(--n0); }
				paintermeep[n='1'] painterhead:before{ border-color: var(--n1); }
				paintermeep[n='2'] painterhead:before{ border-color: var(--n2); }
				paintermeep[n='3'] painterhead:before{ border-color: var(--n3); }
				paintermeep[n='4'] painterhead:before{ border-color: var(--n4); }
				paintermeep[n='5'] painterhead:before{ border-color: var(--n5s); }

				paintermeep[n='0'] painterbrush{ box-shadow: inset 0px -25px 5px var(--n0); }
				paintermeep[n='1'] painterbrush{ box-shadow: inset 0px -25px 5px var(--n1); }
				paintermeep[n='2'] painterbrush{ box-shadow: inset 0px -25px 5px var(--n2); }
				paintermeep[n='3'] painterbrush{ box-shadow: inset 0px -25px 5px var(--n3); }
				paintermeep[n='4'] painterbrush{ box-shadow: inset 0px -25px 5px var(--n4); }
				paintermeep[n='5'] painterbrush{ box-shadow: inset 0px -25px 5px var(--n5); }

				painterspace[n='0'] path{ stroke:var(--n0); }
				painterspace[n='1'] path{ stroke:var(--n1); }
				painterspace[n='2'] path{ stroke:var(--n2); }
				painterspace[n='3'] path{ stroke:var(--n3); }
				painterspace[n='4'] path{ stroke:var(--n4); }
				painterspace[n='5'] path{ stroke:var(--n5); }

				painterbox path:last-of-type{
					stroke: #222;
					stroke-width: 50;
					stroke-linejoin: round;
					stroke-linecap: round;
				}

				painterbox path.done{
					fill: rgba(0,0,0,0.7);
				}

				painterstart{
					position: absolute;
					display: block;
					width: 70px;
					height: 70px;
					transform: translate(-50%, -50%);
					border-radius: 100%;
					box-sizing: border-box;
					border: 10px solid red;
					background: #C69A64;

					animation: throb;
					animation-iteration-count: infinite;
					animation-duration: 0.5s;
				}

				painterspace[n='0'] painterstart{ border-color:var(--n0); }
				painterspace[n='1'] painterstart{ border-color:var(--n1); }
				painterspace[n='2'] painterstart{ border-color:var(--n2); }
				painterspace[n='3'] painterstart{ border-color:var(--n3); }
				painterspace[n='4'] painterstart{ border-color:var(--n4); }
				painterspace[n='5'] painterstart{ border-color:var(--n5); }

				painterspace[n='0'] painterscore{ color:var(--n0); }
				painterspace[n='1'] painterscore{ color:var(--n1); }
				painterspace[n='2'] painterscore{ color:var(--n2); }
				painterspace[n='3'] painterscore{ color:var(--n3); }
				painterspace[n='4'] painterscore{ color:var(--n4); }
				painterspace[n='5'] painterscore{ color:var(--n5); }

				painterscore{
					display: block;
					position: absolute;
					top: ${-BOX/3}px;
					left: ${-BOX/2}px;
					width: ${BOX}px;

					color: white;
					font-size: 80px;
					line-height:${BOX/3}px;
					text-align: center;
					text-shadow: 0px 0px 20px rgba(255,255,255,0.3);

					background: radial-gradient( #153A65, transparent, transparent );
				}

				painterheader{
					display: block;
					position: absolute;
					top: ${-BOX/2 - BOX/3 - 30}px;
					left: ${-BOX/2}px;
					width: ${BOX}px;

					color: white;
					font-size: 50px;
					line-height: 50px;
					text-align: center;

					background: radial-gradient( #153A65, transparent, transparent );
				}

				paintersurface{
					display: block;
					transform-style: preserve-3d;
				}

				@keyframes throb{
					0%{
						transform: translate(-50%,-50%) scale(1);
					}

					50%{
						transform: translate(-50%,-50%) scale(0.5);
					}

					100%{
						transform: translate(-50%,-50%) scale(1);
					}
				}

				painterbox canvas{
					position: absolute;
					inset: 0px;
					position: absolute;
					mix-blend-mode: layer;
				}

				painterbox canvas:first-of-type{
					filter: contrast(30%) brightness(180%);
				}

				painterbox canvas:last-of-type{
					mix-blend-mode: multiply;
				}


			</style>
		`)
	}

	const PainterMeep = function(n){
		let self = this;
		self.$el = $(`
			<paintermeep n=${n}>
				<paintershadow></paintershadow>
				<painterbrush></painterbrush>
				<painterstick>
					<painterhead></painterhead>
				</painterstick>
			</paintermeep>
		`);

		self.px = 0;
		self.py = 0;
		self.n = n;
	}

	const MAXPIXELS = (BOX*BOX);
	let queue = [];
	const PainterBox = function(n){

		let self = this;
		self.isForeground = false;
		self.y = 0.5;
		self.x = 0.5;
		self.scale = 0.5;
		self.spin = 80;
		self.twist = 0;

		let isPaintActive = true;

		self.$el = $(`
			<painterspace>
				<painterbox>
					<svg viewBox='-1 -1 2 2'>
						<path vector-effect='non-scaling-stroke' d=''></path>
					</svg>
					<painterpaint>
						<canvas width=${BOX} height=${BOX}></canvas>
						<canvas width=${BOX} height=${BOX}></canvas>
						<img src='./proto/img/party/texture-mona-lisa.png'/>
					</painterpaint>
					<painterwall></painterwall>
					<painterwall></painterwall>
					<painterwall></painterwall>
				</painterbox>
			</painterspace>
			`);

		/*let $start = $('<painterstart>').appendTo(self.$el).css({
			left: '50%',
			top: '50%',
		})*/

		let $scoreHeader = $('<painterheader>').appendTo(self.$el);
		let $score = $('<painterscore>').appendTo(self.$el).text('');

		let $surface = $('<paintersurface>').appendTo(self.$el);
		let $cut = self.$el.find('path').last();
		let ctx = self.$el.find('canvas')[0].getContext("2d");
		let ctx2 = self.$el.find('canvas')[1].getContext("2d");

		ctx2.lineWidth = ctx.lineWidth = 50;
		ctx2.lineJoin = ctx.lineJoin = 'round';
		ctx2.lineCap = ctx.lineCap = 'round';
		ctx2.strokeStyle = ctx.strokeStyle = PLAYER_COLORS[n];

		let img = self.$el.find('img')[0];
		//img.crossOrigin = "Anonymous";
		self.$el.find('img').hide();
		
		self.bindMeep = function(meep){
			self.meep = meep;
			self.meep.$el.appendTo($surface);
			self.$el.attr('n',meep.n);
		}

		let history = [];

		

		self.step = function(){
			if(self.meep && self.isForeground){
				let ox = self.meep.px - self.x*W;
				let oy = self.meep.py - self.y*H;

				self.meep.$el.css({
					left: ox + 'px',
					top: oy + 'px',
				})

				if(isPaintActive){
					history.push({
						x:ox + (BOX/2),
						y:oy + (BOX/2),
					});

					ctx.globalCompositeOperation = 'source-out';
					ctx.clearRect(0,0,BOX,BOX);

					ctx.beginPath();
					ctx.moveTo(history[0].x, history[0].y);
					for(var h in history) ctx.lineTo(history[h].x, history[h].y);
					ctx.stroke();

					ctx2.beginPath();
					ctx2.moveTo(history[0].x, history[0].y);
					for(var h in history) ctx2.lineTo(history[h].x, history[h].y);
					ctx2.stroke();

					let data = ctx2.getImageData(0, 0, BOX, BOX);
					let cnt = 0;
					for(var i=0; i<data.data.length; i+=4) if(data.data[i+3]!=0) cnt++; //just check the alpha channel
					let amt = Math.round(cnt/MAXPIXELS*100);
					$score.text(amt+'%');

					self.amt = amt;

					ctx.globalCompositeOperation = 'source-in';
					ctx.drawImage(img, 0, 0, BOX, BOX);

					/*let draw = '';
					for(var h in history) draw = draw + (h==0?'M':'L') + history[h].x + ',' +history[h].y;
					$cut.attr('d',draw);*/

				} else if(!self.isComplete){
					

					if(false){
						$start.hide();
						isPaintActive = true;
						$scoreHeader.text('Coverage');
						$score.text('%');
					}
				}
			}
		}

		self.redraw = function(){

			self.$el.css({
				left: self.x*W + 'px',
				top: self.y*H + 'px',
				transform: 'scale('+self.scale+') rotateX('+self.spin+'deg) rotateY('+self.twist+'deg)',
			});

			self.meep.$el.css({
				transform: 'rotateX('+(-self.spin)+'deg)',
			})
		}

		self.setForeground = function(b){
			self.isForeground = b;
			
			if(b){
				self.meep.$el.show();

				$scoreHeader.text('Coverage');
				$score.text('0%');

				$score.css({
					'top': -BOX/2 - BOX/3 + 'px',
					'transform':'rotateX(0deg)',
					'transform-origin':'top center',
					'background':'',
					'height':'',
					'line-height':'',
				});
			} else { 
				self.meep.$el.hide();

				$scoreHeader.text('');
				
				$score.css({
					'top': BOX/2 + 'px',
					'transform':'rotateX(-90deg)',
					'transform-origin':'top center',
					'background':'none',
					'height':THICC + 'px',
					'line-height':THICC + 'px'
				});
			}

			
		}

		self.setFinalScore = function(){
			$score.css({
				'top': '0px',
				'transform':'rotateX(0deg)',
				'transform-origin':'top center',
				'background':'',
				'height':'',
				'color':'white',
				'line-height':BOX+'px',
			});
		}
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<paintergame>').appendTo(self.$el);
	let $canvas = $('<paintercanvas>').appendTo($game);

	let hud = new PartyHUD('#C09363');
	hud.$el.appendTo($game);

	hud.initPlayerCount(initGame);

	let boxes = [];
	let meeps = [];

	let nPlayer = 0;
	let foregrounds = [];
	let completes = [];
	let isPlayActive = false;

	const FOREGROUND = 2;
	const STACK = 0.06;

	function initGame(count){

		for(var m=0; m<count; m++){
			meeps[m] = new PainterMeep(m);
		
			let box = new PainterBox(m);
			box.$el.appendTo($canvas);
			box.bindMeep(meeps[m]);
			box.x = 0.75 + m%2 * 0.02;
			box.y = 0.78 - STACK*(count-m-1);
			box.redraw();
			boxes[m] = box;

			box.setForeground(false);
		}

		//initBox();
		//initBox();

		isPlayActive = false;
		setTimeout(doNextSet,1000);
	}

	function doNextSet(){
		
		foregrounds.length = 0;

		for(var i=0; i<FOREGROUND; i++){
			if(boxes[nPlayer]){
				foregrounds.push(boxes[nPlayer]);
				nPlayer++;
			}
		}

		let spacing = 1/(foregrounds.length+1);
	
		for(let f=0; f<foregrounds.length; f++){
			$(foregrounds[f])
			.delay(f*200)
			.animate({
				x:2 - (f+1) * spacing,
				y:0.55,
				scale:1,
				spin:20,
				twist:-5 + f*10,
			},{
				duration:500,
				complete:function(){
					foregrounds[f].setForeground( true );
				}
			});
		}

		if(foregrounds.length==0){
			isPlayActive = false;
			finiGame();
		} else {
			isPlayActive = true;
			hud.initTimer(30,finiSet);
		}
	}

	function finiSet(){

		isPlayActive = false;
		setTimeout(doPutAway,1000);
	}

	function finiGame(){
		hud.finiTimer();
		for(var c=0; c<completes.length; c++){
			completes[c].setFinalScore();
			$(completes[c])
			.delay(completes.length-c*100)
			.animate({
				x:1.25 + (c%3)*0.25,
				y:0.3 + Math.floor(c/3)*0.4,
				scale:0.6,
				spin:20,
				twist:0
			});
		}

		setTimeout(function(){
			
			let ranks = [];
			for(var a in boxes){
				ranks[a] = 0;
				for(var b in boxes){
					if(boxes[a].amt >= boxes[b].amt) ranks[a]++;
				}
			}
			let scores = [];
			for(var r in ranks) scores[r] = Math.floor( (10/ranks.length) * (ranks[r]) );
			window.doPartyGameComplete(scores);

		},2000)
	}

	function doPutAway(){
		for(var f in foregrounds){
			foregrounds[f].setForeground( false );
			completes.push(foregrounds[f]);
		}

		for(var c=0; c<completes.length; c++){
			$(completes[c])
			.delay(c*100)
			.animate({
				x:2.25,
				y:0.78 - STACK*(c),
				scale:0.5,
				spin:80,
				twist:0
			});
		}

		setTimeout(doNextSet,2000);
	}

	self.step = function(){
		for(var b in boxes) boxes[b].step();
		for(var b in boxes) boxes[b].redraw();

		let isComplete = isPlayActive;
		for(var f in foregrounds ) if( !foregrounds[f].isComplete ) isComplete = false;

		if(isComplete && isPlayActive){
			finiSet();
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
			meeps[m].px = (1 + p[m].px) * W;
			meeps[m].py = (1-p[m].pz) * H;
		}
	}
}