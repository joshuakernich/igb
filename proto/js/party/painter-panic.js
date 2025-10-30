window.PainterPanicGame = function( playersMeta ){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const BOX = 500;
	const THICC = BOX/6;
	const BRUSH = {W:50,H:200};
	const TIME = 60;

	function toPath(arr){
		let path = [];
		for(var i=0; i<arr.length/2; i++){
			path[i] = [ arr[i*2], arr[i*2+1] ];
		}
		return path;
	}

	let PAINTINGS = [];
	for(var p in PAINTING_LIBRARY){
		PAINTINGS.push({
			path:toPath(PAINTING_LIBRARY[p]),
			img:p,
		})
	}

	const STRUCTURE = [
		undefined,
		undefined,
		[
			[PAINTINGS[0],PAINTINGS[1]],
			[PAINTINGS[2],PAINTINGS[3]],
			[PAINTINGS[6],PAINTINGS[7]],
		],
		[
			[PAINTINGS[0],PAINTINGS[1],PAINTINGS[2]],
			[PAINTINGS[6],PAINTINGS[7],PAINTINGS[8]],
		],
		[
			[PAINTINGS[0],PAINTINGS[1],PAINTINGS[2],PAINTINGS[3]],
			[PAINTINGS[6],PAINTINGS[7],PAINTINGS[8],PAINTINGS[9]],
		],
		[
			[PAINTINGS[0],PAINTINGS[1],PAINTINGS[2],PAINTINGS[3],PAINTINGS[4]],
			[PAINTINGS[6],PAINTINGS[7],PAINTINGS[8],PAINTINGS[9],PAINTINGS[10]],
		],
		[
			[PAINTINGS[0],PAINTINGS[1],PAINTINGS[2],PAINTINGS[3],PAINTINGS[4],PAINTINGS[5]],
			[PAINTINGS[6],PAINTINGS[7],PAINTINGS[8],PAINTINGS[9],PAINTINGS[10],PAINTINGS[11]],
		],
	]

	let audio = new AudioPlayer();
	audio.add('music','./proto/audio/party/music-creative.mp3',0.3,true);
	audio.add('tutorial','./proto/audio/party/tutorial-painter.mp3',0.5);

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

					perspective: ${W}px;
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
					stroke-width: 20;
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

				painterbox svg{
					display:block;
					position: absolute;
				}

				painterbox path:last-of-type{
					stroke: #333;
					stroke-width: 10;
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
					background: #DED2C9;

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

				/*painterspace[n='0'] painterscore{ color:var(--n0); }
				painterspace[n='1'] painterscore{ color:var(--n1); }
				painterspace[n='2'] painterscore{ color:var(--n2); }
				painterspace[n='3'] painterscore{ color:var(--n3); }
				painterspace[n='4'] painterscore{ color:var(--n4); }
				painterspace[n='5'] painterscore{ color:var(--n5); }*/

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
					opacity: 0.5;
				}

				painterheader{
					display: block;
					position: absolute;
					bottom: ${BOX/2}px;
					left: ${-BOX/2}px;
					right: ${-BOX/2}px;
					width: ${BOX/3}px;
					margin: auto;

					color: white;
					font-size: 50px;
					line-height: 70px;
					text-align: left;
					border-radius: 20px 20px 0px 0px;
					padding: 0px 20px;

					background: #333;
					transform-origin: bottom center;
					transform: rotateX(-45deg);
				}

				painterheader:before{
					content:"⏱️ ";

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
					filter: grayscale(1);
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

		self.tally = 0;
		self.score = 0;
		self.px = 0;
		self.py = 0;
		self.n = n;
	}

	const MAXPIXELS = (BOX*BOX);
	const STROKE = 50;
	const GRID = Math.floor(BOX/STROKE*2);

	let queue = [];
	const PainterBox = function(n,path,texture){

		let audio = new AudioPlayer();
		audio.add('buzz','./proto/audio/party/sfx-buzz.mp3',0.1,true);
		audio.add('blip','./proto/audio/party/sfx-select.mp3',0.3);
		audio.add('correct','./proto/audio/party/sfx-correct.mp3',0.3);
		audio.add('incorrect','./proto/audio/party/sfx-incorrect.mp3',0.3);

		let self = this;
		self.isForeground = false;
		self.y = 0.5;
		self.x = 0.5;
		self.scale = 0.5;
		self.spin = 80;
		self.twist = 0;
		self.isInside = true;
		self.cntOutside = 0;
		self.amt = 0;
		self.isPaintActive = false;
		self.countup = 0;

		let d = '';

		for(var p=0; p<path.length; p++){
			d = d + (p==0?'M':'L') + path[p][0] + ',' + path[p][1] + ' ';
		}

		d = d + 'Z';

		self.$el = $(`
			<painterspace>
				<painterbox>
					<painterpaint>
						<canvas width=${BOX} height=${BOX}></canvas>
						<canvas width=${BOX} height=${BOX}></canvas>
						<img src='${texture}'/>
					</painterpaint>

					<svg width=${BOX} height=${BOX}>
						<path stroke='black' vector-effect='non-scaling-stroke' d='${d}'></path>
					</svg>



					<painterwall></painterwall>
					<painterwall></painterwall>
					<painterwall></painterwall>
				</painterbox>
			</painterspace>
			`);

		let $start = $('<painterstart>').appendTo(self.$el).css({
			left: '50%',
			top: '50%',
		})

		let grids = [];
		for(var x=0; x<GRID; x++){
			for(var y=0; y<GRID; y++){
				let gx = (x + 0.5) * STROKE/2;
				let gy = (y + 0.5) * STROKE/2;

				if(inside([gx,gy],path,10)){
					let $el = $('<div>').appendTo(self.$el)
					.css({
						position:'absolute',
						width:'4px',
						height:'4px',
						background:'#222',
						left:-BOX/2+gx-2+'px', 
						top:-BOX/2+gy-2+'px'
					})

					grids.push([gx,gy,$el]);
				}
			}
		}

		let $scoreHeader = $('<painterheader>').appendTo(self.$el);
		let $score = $('<painterscore>').appendTo(self.$el).text('');

		let $surface = $('<paintersurface>').appendTo(self.$el);
		let $cut = self.$el.find('path').last();
		let ctx = self.$el.find('canvas')[0].getContext("2d");
		let ctx2 = self.$el.find('canvas')[1].getContext("2d");

		ctx2.lineWidth = ctx.lineWidth = STROKE;
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

		function pointToPolygonDistance(point, polygon) {
		  function pointToSegmentDistance(p, v, w) {
		    const l2 = (w[0] - v[0]) ** 2 + (w[1] - v[1]) ** 2;
		    if (l2 === 0) {
		      // v and w are the same point
		      return Math.hypot(p[0] - v[0], p[1] - v[1]);
		    }
		    let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
		    t = Math.max(0, Math.min(1, t));
		    const projX = v[0] + t * (w[0] - v[0]);
		    const projY = v[1] + t * (w[1] - v[1]);
		    return Math.hypot(p[0] - projX, p[1] - projY);
		  }

		  let minDist = Infinity;
		  for (let i = 0; i < polygon.length; i++) {
		    const v = polygon[i];
		    const w = polygon[(i + 1) % polygon.length];
		    const dist = pointToSegmentDistance(point, v, w);
		    if (dist < minDist) minDist = dist;
		  }
		  return minDist;
		}


		function inside(point, vs, buffer=0) {
		    // ray-casting algorithm based on
		    // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html
		    
		    var x = point[0], y = point[1];
		    
		    var inside = false;
		    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
		        var xi = vs[i][0], yi = vs[i][1];
		        var xj = vs[j][0], yj = vs[j][1];
		        
		        var intersect = ((yi > y) != (yj > y))
		            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
		        if (intersect) inside = !inside;
		    }

		    if(inside && buffer>0){
		    	let dist = pointToPolygonDistance(point,vs);
		    	if(dist<buffer) inside = false;
		    }
		    
		    return inside;
		};
		

		self.step = function(){
			self.isInside = true;

			if(self.meep && self.isForeground){
				let ox = self.meep.px - self.x*W;
				let oy = self.meep.py - self.y*H;

			
				self.meep.$el.css({
					left: ox + 'px',
					top: oy + 'px',
				})

				if(self.isPaintActive){

					ox = ox + (BOX/2);
					oy = oy + (BOX/2);

					if(!self.isPracticeMode) self.isInside = inside([ox,oy],path);

					history.push({
						x:ox,
						y:oy,
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

					let cntPaint = 0;
					for(var g in grids){
						let isPaint = false;
						for(var h in history){
							let dx = history[h].x - grids[g][0];
							let dy = history[h].y - grids[g][1];
							let d = Math.sqrt(dx*dx+dy*dy);
							if(d<STROKE*0.7) isPaint = true;
						}

						if(isPaint){
							grids[g][2].hide();
							cntPaint++;
						} else {
							grids[g][2].show();
						}
					}

					self.amt = Math.floor(cntPaint/grids.length*100);

					if(self.amt>=100){
						self.isComplete = true;
						self.isPaintActive = false;
						audio.play('correct',true);
					}

					ctx.globalCompositeOperation = 'source-in';
					ctx.drawImage(img, 0, 0, BOX, BOX);

				} else {
					
					if(Math.abs(ox)<50 && Math.abs(oy)<50){
						$start.hide();
						self.isPaintActive = true;
					}
				}


				if(!self.isComplete){
					let was = self.countdown;

					let now = new Date().getTime();
					let timeElapsed = now - self.timeStart;
					self.countdown = TIME - Math.floor(timeElapsed/100)/10;

					if(was>10 && self.countdown<=10){
						hud.flashMessage(self.x,self.y,'10 seconds left',50);
					}

					for(var i=1; i<=3; i++){
						if(was>i && self.countdown<=i) hud.flashMessage(self.x,self.y,i);
					}

					if(self.countdown<0) self.countdown = 0;

					if(was>0 && self.countdown <=0){
						hud.flashMessage(self.x,self.y,'Time up!',100);
						self.isComplete = true;
						audio.play('incorrect',true);
					}

					self.countup = TIME-self.countdown;
					self.meep.score = self.meep.tally + self.countup;
				}

				if(self.isPracticeMode){
					self.isComplete = false;
					self.score = 0;
					self.isInside = true;
					self.isPaintActive = true;
					self.cntOutside = 0;
				}
			}
		}

		self.redraw = function(){

			self.$el.css({
				left: self.x*W + (self.isInside?0:-10 + Math.random()*20) + 'px',
				top: self.y*H + (self.isInside?0:-10 + Math.random()*20) + 'px',
				transform: 'scale('+self.scale+') rotateX('+self.spin+'deg) rotateY('+self.twist+'deg)',
			});

			self.meep.$el.css({
				transform: 'rotateX('+(-self.spin)+'deg)',
			});

			$score.text(self.amt+'%');
			$scoreHeader.text(self.countup.toFixed(1));

			if(self.isInside){
				self.cntOutside = 0;
				audio.stop('buzz');
			} else {
				self.cntOutside++;
				audio.play('buzz');
				audio.setVolume('buzz',0.1 + self.cntOutside*(1/FPS) * 0.5);

				if(self.cntOutside>FPS/2){
					self.isInside = true;
					self.cntOutside = 0;
					audio.stop('buzz');
					audio.play('incorrect',true);
					self.isPaintActive = false;
					$start.show();

					ctx.clearRect(0,0,BOX,BOX);
					ctx2.clearRect(0,0,BOX,BOX);

					history.length = 0;
					self.amt = 0;

					for(var g in grids) grids[g][2].show();
				}
			}
		}

		self.setForeground = function(b){
			self.isForeground = b;
			
			if(b){

				self.timeStart = new Date().getTime();
				self.meep.$el.show();

				$scoreHeader.text('')
				$score.text('0%');

				$score.css({
					'top': BOX/2 + 'px',
					'transform':'rotateX(0deg)',
					'transform-origin':'top center',
					'background':'',
					'height':'',
					'line-height':'',
				}).hide();

				$start.show();

			} else { 
				self.meep.$el.hide();

				$scoreHeader.text('')
				
				$score.css({
					'top': BOX/2 + 'px',
					'transform':'rotateX(-90deg)',
					'transform-origin':'top center',
					'background':'none',
					'height':THICC + 'px',
					'line-height':THICC + 'px'
				}).hide();

				$start.hide();
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

		self.toPracticeMode = function(){
			self.isPracticeMode = true;
			self.isPaintActive = true;
			$start.hide();

			$score.hide();
			$scoreHeader.hide();

			for(var g in grids) grids[g][2].remove();

			if(n!=0){
				self.$el.find('painterwall').hide();
				self.$el.find('painterbox').css({background:'none'});
			}
		}
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<paintergame>').appendTo(self.$el);
	let $blur = $('<blurlayer>').appendTo($game);
	let $canvas = $('<paintercanvas>').appendTo($game);

	let hud = new PartyHUD('#C09363');
	hud.$el.appendTo($game);

	if( playersMeta ) setTimeout( function(){ initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	let boxes = [];
	let meeps = [];

	let nPlayer = -1;
	let foregrounds = [];
	let completes = [];

	const FOREGROUND = 2;
	const STACK = 0.06;
	const SPACING = 1/3;
	let slots = [];

	function initGame(count){


		for(var m=0; m<count; m++){
			meeps[m] = new PainterMeep(m);
		}

		initTutorial();
	}

	function initTutorial(){

		hud.initTutorial('Painter Panic',
			{x:1.2, y:0.5, msg:'Align yourself<br>with your canvas',icon:'align'},
			{x:1.8, y:0.5, msg:'Move around to paint<br>within the lines',icon:'around'},
		);

		for(var b=0; b<meeps.length; b++){
			let box = new PainterBox(b,PAINTINGS[6].path,PAINTINGS[6].img);
			box.$el.appendTo($canvas);
			box.bindMeep(meeps[b]);
			box.x = 1.5;
			box.y = 0.6;
			box.redraw();
			boxes[b] = box;
			box.setForeground(true);
			box.scale = 1;
			box.spin = 45;
			box.twist = 0;
			box.toPracticeMode();
		}

		setTimeout(function () {
			audio.play('tutorial');
		},2000)

		hud.initTimer(20,finiTutorial);
	}

	function finiTutorial(){

		$blur.hide();
		hud.finiTimer();
		hud.finiTutorial();
		for(var b in boxes) boxes[b].$el.remove();
		for(var m in meeps) meeps[m].score = 0;
		boxes.length = 0;

		setTimeout(initPlay,1000);
	}

	function initPlay(){
		hud.initPlayers(meeps);
		setTimeout(initNextRound,1000);
	}

	let iRound = -1;
	function initNextRound(){

		iRound++;

		slots.length = 0;
		boxes.length = 0;
		nPlayer = -1;

		let collection = STRUCTURE[meeps.length][iRound];

		if(!collection){
			finiGame();
			return;
		}

		audio.play('music');

		for(var m=0; m<meeps.length; m++){

			meeps[m].tally = meeps[m].score;

			let box = new PainterBox(m,collection[m].path,collection[m].img);
			box.$el.appendTo($canvas);
			box.bindMeep(meeps[m]);
			box.x = 0.75 + m%2 * 0.02;
			box.y = -0.1;
			box.redraw();
			boxes[m] = box;

			$(box).delay((meeps.length-m)*100).animate({
				y:0.78 - STACK*(meeps.length-m-1),
			})

			box.setForeground(false);
		}
		
		setTimeout(function(){
			hud.initRound(iRound,STRUCTURE[meeps.length].length);
		},1500);

		setTimeout(function(){
			hud.finiBanner();
		},3500);

		setTimeout(function(){
			initNextPlayer(false);
			initNextPlayer(false);
		},5000);

		setTimeout(function () {
			hud.summonPlayers([0,1]);
		},6000);

		setTimeout(function(){
			hud.finiBanner();
		},8000);

		setTimeout(function(){
			for(var s in slots) slots[s].setForeground(true);
		},10000);
	}

	function initNextPlayer(isAutoStart){
		nPlayer++;

		if(boxes[nPlayer]){
			let nSlot = 0;
			while(slots[nSlot]) nSlot++;
			slots[nSlot] = boxes[nPlayer];

			$(slots[nSlot])
			.animate(
				{
					x:2 - (nSlot+1) * SPACING,
					y:0.5,
					scale:1,
					spin:45,
					twist:0,
				},
				{
					duration:500,
					complete:function(){
						if(isAutoStart) slots[nSlot].setForeground( true );
					}
				}
			);
		} else {
			let isComplete = true;
			for(var b in boxes) if( !boxes[b].isComplete ) isComplete = false;
			if(isComplete){
				initNextRound();
			}
		}
	}

	function finiPlayerSlot(nSlot){
		
		let box = slots[nSlot];
		let c = completes.push(box)-1;

		$(box)
		.delay(1000)
		.animate({
			x:2.25,
			y:0.78 - STACK*c,
			scale:0.5,
			spin:80,
			twist:0
		},{
			start:function(){
				box.setForeground( false );
			}
		});

		slots[nSlot] = undefined;

		setTimeout(function(){
			initNextPlayer(true);
		},2500);
	}

	function finiGame(){
		
		for(let c=0; c<completes.length; c++){
			
			$(completes[c])
			.delay(completes.length-c*100)
			.animate({
				x:1.2 + c * 1/(completes.length-1) * 0.6,
				y:0.3,
				scale:0.5,
				spin:20,
				twist:-20,
			},{
				step:function(){
					completes[c].redraw();
				}
			});
		}

		let scores = [];
		for(var b in meeps) scores[b] = meeps[b].score;

		let rewards = window.scoresToRewards(scores);

		setTimeout(function(){
			audio.stop('music');
			hud.showFinalScores(scores,rewards);
		},2000);

		setTimeout(function(){
			self.fini();
			window.doPartyGameComplete(rewards);
		},7000);
	}

	self.step = function(){
		for(var b in boxes) boxes[b].step();
		for(var b in boxes) boxes[b].redraw();

		for(var s in slots){
			if(slots[s] && slots[s].isComplete) finiPlayerSlot(s);
		}

		hud.updatePlayers(meeps,1);

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
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	}

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].px = (1 + p[m].px) * W;
			meeps[m].py = (1-p[m].pz) * H;
		}
	}
}