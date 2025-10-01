window.CardboardCutoutGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const BOX = 500;
	const CUTTER = {W:50,H:200};
	const TIME = 60;

	let audio = new AudioContext();
	audio.add('music','./proto/audio/party/music-playroom.mp3',0.3,true);

	if( !CardboardCutoutGame.init ){
		CardboardCutoutGame.init = true;

		$("head").append(`
			<style>
				cutoutgame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background-image: url(./proto/img/party/bg-box-factory.png);
					background-size: 100%;
					background-position: bottom 120px center;

					perspective: ${W*3}px;
				}

				cutoutcanvas{
					display:block;
					position: absolute;
					inset: 0px;
					transform-style: preserve-3d;
				}

				cutoutgame:before{
					content: "";
					position: absolute;
					display: block;
					inset: 0px;
					background: linear-gradient(to top, #2963A2, transparent);
				}

				cutoutspace{
					display:block;
					position: absolute;
					transform: rotateX(20deg);
					transform-style: preserve-3d;
				}

				cutoutbox{
					display:block;
					position: absolute;
					width: ${BOX}px;
					height: ${BOX}px;
					background: url(./proto/img/party/texture-cardboard.avif);
					background-size: cover;
					transform: translate(-50%,-50%);
					transform-style: preserve-3d;
				}

				cutoutbox path{
					stroke: red;
					stroke-width: 10;
					fill: none;
				}

				cutoutwall:nth-of-type(1){
					display:block;
					position: absolute;
					width: ${BOX}px;
					height: ${BOX/3}px;
					background: url(./proto/img/party/texture-cardboard.avif);
					background-size: cover;
					transform: rotateX(-90deg);
					transform-style: preserve-3d;
					transform-origin: top center;
					top: 100%;
					left: 0px;
				}

				cutoutwall:nth-of-type(2){
					display:block;
					position: absolute;
					width: ${BOX}px;
					height: ${BOX/3}px;
					background: url(./proto/img/party/texture-cardboard.avif);
					background-size: cover;
					transform: rotateZ(90deg) rotateX(-90deg);
					transform-style: preserve-3d;
					transform-origin: left top;
					top: 0px;
					left: 0px;
				}

				cutoutwall:nth-of-type(3){
					display:block;
					position: absolute;
					width: ${BOX/3}px;
					height: ${BOX}px;
					background: url(./proto/img/party/texture-cardboard.avif);
					background-size: cover;
					transform: rotateY(-90deg);
					transform-style: preserve-3d;
					transform-origin: right top;
					top: 0px;
					right: 0px;
				}

				cutoutwall:after{
					content:"";
					display: block;	
					position: absolute;
					inset: 0px;
					background: black;
					opacity: 0.2;
				}

				cuttermeep{
					display: block;
					position: absolute;

					transform-origin: bottom right;
					transform: rotateX(-90deg);
					transform-style: preserve-3d;
				}

				cutterframe{
					display: block;
					position: absolute;
					width: ${CUTTER.W}px;
					height: ${CUTTER.H-50}px;
					right: 0px;
					bottom: 50px;
					border: 20px solid red;
					border-radius: 10px;
					box-sizing: border-box;
					box-shadow: 10px 0px #222;
				}

				cutterblade{
					display: block;
					position: absolute;
					width: ${CUTTER.W*0.8}px;
					height: ${CUTTER.H}px;
					right: 0px;
					bottom: 0px;
					box-sizing: border-box;
					background: white;
					border-radius: 10px 10px 0px ${CUTTER.W*0.8}px;
					border-right: 10px solid #ddd;
					box-sizing: border-box;
					background: white;
				}

				cutterhead{
					position: absolute;
					display: block;
					bottom: ${CUTTER.H-50}px;
					width: ${CUTTER.W}px;
					right: 0px;
					height: 50px;
					background: white;
					border-radius: 10px 10px 0px 0px;
					box-shadow: 10px 0px gray, 0px 5px 10px rgba(0,0,0,0.5);
				}

				cutterhead:before{
					content:"";
					display: block;
					position: absolute;
					left: 0px;
					right: 0px;
					top: 10px;
					background: red;
					height: 10px;
				}

				cutterhead:after{
					content:". .";
					color: black;
					position: absolute;
					top: 20px;
					left: 0px;
					right: 0px;
					text-align: center;
					font-size: 40px;
					line-height: 0px;
				}

				cuttershadow{
					position: absolute;
					display: block;
					height: ${CUTTER.H}px;
					width: ${CUTTER.W}px;
					background: black;
					right: 0px;
					bottom: 0px;
					transform: rotate(45deg);
					transform-origin: bottom right;

					border-radius: 10px 10px 0px ${CUTTER.W*0.8}px;
					background: linear-gradient(to top, rgba(0,0,0,0.5), transparent);
				}


				cuttermeep[n='0'] cutterframe{ border-color:var(--n0); }
				cuttermeep[n='1'] cutterframe{ border-color:var(--n1); }
				cuttermeep[n='2'] cutterframe{ border-color:var(--n2); }
				cuttermeep[n='3'] cutterframe{ border-color:var(--n3); }
				cuttermeep[n='4'] cutterframe{ border-color:var(--n4); }
				cuttermeep[n='5'] cutterframe{ border-color:var(--n5); }

				cuttermeep[n='0'] cutterhead:before{ background:var(--n0); }
				cuttermeep[n='1'] cutterhead:before{ background:var(--n1); }
				cuttermeep[n='2'] cutterhead:before{ background:var(--n2); }
				cuttermeep[n='3'] cutterhead:before{ background:var(--n3); }
				cuttermeep[n='4'] cutterhead:before{ background:var(--n4); }
				cuttermeep[n='5'] cutterhead:before{ background:var(--n5); }

				cutoutspace[n='0'] path{ stroke:var(--n0); }
				cutoutspace[n='1'] path{ stroke:var(--n1); }
				cutoutspace[n='2'] path{ stroke:var(--n2); }
				cutoutspace[n='3'] path{ stroke:var(--n3); }
				cutoutspace[n='4'] path{ stroke:var(--n4); }
				cutoutspace[n='5'] path{ stroke:var(--n5); }

				cutoutbox path:last-of-type{
					stroke: #222;
					stroke-width: 5;
				}

				cutoutbox path.done{
					fill: rgba(0,0,0,0.7);
				}

				cutoutstart{
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

				cutoutspace[n='0'] cutoutstart{ border-color:var(--n0); }
				cutoutspace[n='1'] cutoutstart{ border-color:var(--n1); }
				cutoutspace[n='2'] cutoutstart{ border-color:var(--n2); }
				cutoutspace[n='3'] cutoutstart{ border-color:var(--n3); }
				cutoutspace[n='4'] cutoutstart{ border-color:var(--n4); }
				cutoutspace[n='5'] cutoutstart{ border-color:var(--n5); }

				cutoutspace[n='0'] cutoutscore{ color:var(--n0); }
				cutoutspace[n='1'] cutoutscore{ color:var(--n1); }
				cutoutspace[n='2'] cutoutscore{ color:var(--n2); }
				cutoutspace[n='3'] cutoutscore{ color:var(--n3); }
				cutoutspace[n='4'] cutoutscore{ color:var(--n4); }
				cutoutspace[n='5'] cutoutscore{ color:var(--n5); }

				cutoutscore{
					display: block;
					position: absolute;
					top: ${-BOX/3}px;
					left: ${-BOX/2}px;
					width: ${BOX}px;

					color: white;
					font-size: 80px;
					line-height: ${BOX/3}px;
					text-align: center;
				}

				cutoutheader{
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
				}

				cutoutheader:before{
					content:"⏱️ ";
				}

				cutoutsurface{
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

			</style>
		`)
	}

	const SHAPES = {
	  triangle: [
	    { x: 0, y: 1 },
	    { x: -0.866, y: -0.5 },
	    { x: 0.866, y: -0.5 }
	  ],
	  square: [
	    { x: -1, y: 1 },
	    { x: 1, y: 1 },
	    { x: 1, y: -1 },
	    { x: -1, y: -1 }
	  ],
	  pentagon: [
	    { x: 0, y: 1 },
	    { x: 0.951, y: 0.309 },
	    { x: 0.588, y: -0.809 },
	    { x: -0.588, y: -0.809 },
	    { x: -0.951, y: 0.309 }
	  ],
	  hexagon: [
	    { x: 0.866, y: 0.5 },
	    { x: 0, y: 1 },
	    { x: -0.866, y: 0.5 },
	    { x: -0.866, y: -0.5 },
	    { x: 0, y: -1 },
	    { x: 0.866, y: -0.5 }
	  ],
	  circle: Array.from({ length: 32 }, (_, i) => {
	    const angle = (Math.PI * 2 * i) / 32;
	    return {
	      x: Math.cos(angle),
	      y: Math.sin(angle)
	    };
	  }),
	  star: [
	    { x: 0, y: 1 },
	    { x: 0.2245, y: 0.309 },
	    { x: 0.951, y: 0.309 },
	    { x: 0.363, y: -0.118 },
	    { x: 0.588, y: -0.809 },
	    { x: 0, y: -0.382 },
	    { x: -0.588, y: -0.809 },
	    { x: -0.363, y: -0.118 },
	    { x: -0.951, y: 0.309 },
	    { x: -0.2245, y: 0.309 }
	  ]
	};

	const SCALING = 0.8;
	const COLLECTION = [];
	for(var s in SHAPES){
		for(var p in SHAPES[s]) SHAPES[s][p] = {x:SHAPES[s][p].x*SCALING,y:SHAPES[s][p].y*SCALING};
		COLLECTION.push(s);
	}

	function pointToPolygonDistance(point, polygon) {
	  function pointToSegmentDistance(p, v, w) {
	    // squared length of segment
	    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
	    if (l2 === 0) {
	      // v and w are the same point
	      return Math.hypot(p.x - v.x, p.y - v.y);
	    }
	    // Project point onto the segment, parameterized t ∈ [0,1]
	    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
	    t = Math.max(0, Math.min(1, t));
	    const projX = v.x + t * (w.x - v.x);
	    const projY = v.y + t * (w.y - v.y);
	    return Math.hypot(p.x - projX, p.y - projY);
	  }

	  let minDist = Infinity;
	  for (let i = 0; i < polygon.length; i++) {
	    const v = polygon[i];
	    const w = polygon[(i + 1) % polygon.length]; // wrap around
	    const dist = pointToSegmentDistance(point, v, w);
	    if (dist < minDist) minDist = dist;
	  }
	  return minDist;
	}

	function pointPolygonProgress(point, polygon) {
	  // Helper: distance between two points
	  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

	  // Compute perimeter lengths
	  const edgeLengths = [];
	  let perimeter = 0;
	  for (let i = 0; i < polygon.length; i++) {
	    const a = polygon[i];
	    const b = polygon[(i + 1) % polygon.length];
	    const len = dist(a, b);
	    edgeLengths.push(len);
	    perimeter += len;
	  }

	  let bestProgress = 0;
	  let minDist = Infinity;
	  let accumulated = 0;

	  for (let i = 0; i < polygon.length; i++) {
	    const a = polygon[i];
	    const b = polygon[(i + 1) % polygon.length];
	    const ab = {x: b.x - a.x, y: b.y - a.y};
	    const ap = {x: point.x - a.x, y: point.y - a.y};

	    const ab2 = ab.x * ab.x + ab.y * ab.y;
	    let t = (ap.x * ab.x + ap.y * ab.y) / ab2;
	    t = Math.max(0, Math.min(1, t));

	    const proj = {x: a.x + t * ab.x, y: a.y + t * ab.y};
	    const d = dist(point, proj);

	    if (d < minDist) {
	      minDist = d;
	      const alongEdge = dist(a, proj);
	      const progressDist = accumulated + alongEdge;
	      bestProgress = progressDist / perimeter;
	    }

	    accumulated += edgeLengths[i];
	  }

	  return bestProgress;
	}

	function polygonLength(points) {
	  let length = 0;

	  for (let i = 0; i < points.length; i++) {
	    let p1 = points[i];
	    let p2 = points[(i + 1) % points.length]; // wrap around to first point

	    let dx = p2.x - p1.x;
	    let dy = p2.y - p1.y;

	    length += Math.sqrt(dx * dx + dy * dy);
	  }

	  return length;
	}

	const CutterMeep = function(n){
		let self = this;
		self.$el = $(`
			<cuttermeep n=${n}>
				<cuttershadow></cuttershadow>
				<cutterblade></cutterblade>
				<cutterframe></cutterframe>
				<cutterhead></cutterhead>
			</cuttermeep>
		`);

		self.px = 0;
		self.py = 0;
		self.n = n;
	}

	let queue = [];
	const CutoutBox = function(n){

		let audio = new AudioContext();
		audio.add('buzz','./proto/audio/party/sfx-buzz.mp3',0.3,true);
		audio.add('blip','./proto/audio/party/sfx-select.mp3',0.3);
		audio.add('incorrect','./proto/audio/party/sfx-incorrect.mp3',0.3);
		audio.add('correct','./proto/audio/party/sfx-correct.mp3',0.3);

		let self = this;
		self.isForeground = false;
		self.y = 0.5;
		self.x = 0.5;
		self.scale = 0.5;
		self.spin = 80;
		self.twist = 0;
		self.score = 0;
		self.isOnLine = true;
		self.drift = 0;

		if(!queue.length){
			queue = COLLECTION.concat();
			shuffleArray(queue);
		}

		let pattern = SHAPES[queue.pop()];
		let isCutActive = false;
		self.isComplete = false;

		let d = '';
		for(var p in pattern) d = d + (p==0?' M':' L')+(pattern[p].x)+','+(pattern[p].y);

		d = d + 'Z';

		self.$el = $(`
			<cutoutspace>
				<cutoutbox>
					<svg viewBox='-1 -1 2 2'>
						<path stroke-dasharray="20 20" vector-effect='non-scaling-stroke' d='${d}'></path>
						<path vector-effect='non-scaling-stroke' d=''></path>
					</svg>
					<cutoutwall></cutoutwall>
					<cutoutwall></cutoutwall>
					<cutoutwall></cutoutwall>
				</cutoutbox>
			</cutoutspace>
			`);

		let $start = $('<cutoutstart>').appendTo(self.$el).css({
			left: pattern[0].x * BOX/2,
			top: pattern[0].y * BOX/2,
		})

		let $scoreHeader = $('<cutoutheader>').appendTo(self.$el);
		let $score = $('<cutoutscore>').appendTo(self.$el).text('');

		let $surface = $('<cutoutsurface>').appendTo(self.$el);
		let $shape = self.$el.find('path').first();
		let $cut = self.$el.find('path').last();
		
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

				if(isCutActive){
					history.push({x:ox/(BOX/2),y:oy/(BOX/2)});

					let draw = '';
					for(var h in history) draw = draw + (h==0?'M':'L') + history[h].x + ',' +history[h].y;
					$cut.attr('d',draw);

					let progress = pointPolygonProgress(history[history.length-1], pattern);
					let length = polygonLength(history);
					let dist = pointToPolygonDistance(history[history.length-1], pattern);
					self.drift = dist;
					self.isOnLine = self.drift < 0.1;

					$score.text( Math.floor(progress*100) + '%');

					if(self.isPractice){
						progress = 0;
						length = 0;
						dist = 0;
						self.isOnLine = true;
					}

					if((progress > 0.98 || progress < 0.02) && length > 2){
						isCutActive = false;
						self.isComplete = true;
						$cut.attr('d',draw + 'Z');
						$cut.addClass('done');

						audio.play('correct');
					}

				} else if(!self.isComplete){
					let dx = ox - pattern[0].x * BOX/2;
					let dy = oy - pattern[0].y * BOX/2;
					let d = Math.sqrt(dx*dx+dy*dy);

					if(d<25){
						$start.hide();
						isCutActive = true;
						audio.play('blip',true);

					}
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

				self.score = TIME-self.countdown;
			}
		}

		self.redraw = function(){
			self.$el.css({
				left: self.x*W + (self.isOnLine?0:-10 + Math.random()*20) + 'px',
				top: self.y*H + (self.isOnLine?0:-10 + Math.random()*20) +'px',
				transform: 'scale('+self.scale+') rotateX('+self.spin+'deg) rotateY('+self.twist+'deg)',
			});

			self.meep.$el.css({
				transform: 'rotateX('+(-self.spin)+'deg)',
			})

			$scoreHeader.text(self.score.toFixed(1));

			if(self.isOnLine){
				self.countOffLine = 0;
				audio.stop('buzz');
			} else {
				audio.play('buzz');
				self.countOffLine ++;
				if(self.countOffLine > FPS/2){
					self.reset();
					audio.play('incorrect');
				}
			}
		}

		self.reset = function(){

			self.isOnLine = true;
			isCutActive = false;
			$start.show();
			history.length = 0;
			$cut.attr('d','');
		}

		self.setForeground = function(b){
			self.isForeground = b;
			
			if(b){

				self.timeStart = new Date().getTime();

				self.meep.$el.show();
				$score.text('0%').hide();
				$score.css({
					'bottom': -BOX/2 + 'px',
					'transform':'rotateX(0deg)',
					'transform-origin':'top center',
				});
			} else { 
				self.meep.$el.hide();

				
				$score.css({
					'top': BOX/2 + 'px',
					'transform':'rotateX(-90deg)',
					'transform-origin':'top center',
				}).hide();
			}
		}

		self.setPracticeMode = function(){
			self.isPractice = true;
			self.isForeground = true;
			$score.hide();
			$scoreHeader.hide();

			

			if(n!=0){
				$shape.hide();
				self.$el.find('cutoutbox').css('background','none');
				self.$el.find('cutoutwall').hide();
			}
			isCutActive = true;
			$start.hide();
		}
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<cutoutgame>').appendTo(self.$el);
	let $blur = $('<blurlayer>').appendTo($game);
	let $canvas = $('<cutoutcanvas>').appendTo($game);

	let hud = new PartyHUD('#C09363');
	hud.$el.appendTo($game);

	hud.initPlayerCount(initGame);

	let boxes = [];
	let meeps = [];

	let nPlayer = -1;
	let foregrounds = [];
	let completes = [];
	let isPlayActive = false;

	const FOREGROUND = 2;

	function initGame(count){

		for(var m=0; m<count; m++){
			meeps[m] = new CutterMeep(m);
		}

		//initBox();
		//initBox();

		isPlayActive = false;
		//setTimeout(doNextSet,1000);


		initPlay();
	}

	function initTutorial(){

		for(var m in meeps){

			let box = new CutoutBox(m);
			box.$el.appendTo($canvas);
			box.bindMeep(meeps[m]);
			box.x = 1.5;
			box.y = 0.6;
			box.scale = 1;
			box.spin = 20;
			box.twist = 0;
			box.redraw();
			boxes[m] = box;
			box.setPracticeMode();
		}

		hud.initTutorial('Cardboard Cutout',
			{x:1.2, y:0.5, msg:'Align yourself<br>with your box',icon:'align'},
			{x:1.8, y:0.5, msg:'Move around to cut<br>along the line',icon:'around'},
		);

		hud.initTimer(30, finiTutorial);
	}

	function finiTutorial(){
		$blur.hide();
		hud.finiTutorial();
		hud.finiTimer();

		for(var b in boxes) boxes[b].$el.remove();
		boxes.length = 0;

		setTimeout(initPlay,2000);
	}

	function initPlay(){
		audio.play('music');

		for(var m in meeps){

			let box = new CutoutBox(m);
			box.$el.appendTo($canvas);
			box.bindMeep(meeps[m]);
			box.x = 0.75 + m%2 * 0.02;
			box.y = 0.78 - 0.09*(meeps.length-m-1);
			box.redraw();
			boxes[m] = box;
			box.setForeground(false);
		}


		hud.initPlayers(boxes);
		initNextPlayer();
		initNextPlayer();
	}

	const SPACING = 1/3;
	let slots = [];

	function initNextPlayer() {
		nPlayer++;

		if(boxes[nPlayer]){
			let nSlot = 0;
			while(slots[nSlot]) nSlot++;
			slots[nSlot] = boxes[nPlayer];

			$(slots[nSlot])
			.animate({
				x:2 - (nSlot+1) * SPACING,
				y:0.5,
				scale:1,
				spin:20,
				twist:5 - nSlot*10,
			},{
				duration:500,
				complete:function(){
					slots[nSlot].setForeground( true );
				}
			});
		}

		let isComplete = true;
		for(var b in boxes) if(!boxes[b].isComplete) isComplete = false;

		if(isComplete){
			isPlayActive = false;
			finiGame();
		} else {
			isPlayActive = true;
		}
	}

	function finiGame(){
		for(var c=0; c<completes.length; c++){
			
			$(completes[c])
			.delay(completes.length-c*100)
			.animate({
				x:1.2 + c * 1/(completes.length-1) * 0.6,
				y:0.3,
				scale:0.5,
				spin:20,
				twist:-20,
			});
		}

		let scores = [];
		for(var b in boxes) scores[b] = boxes[b].score;

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

	function finiSlot(n){
		
		slots[n].setForeground( false );
		completes.push(slots[n]);
		
		$(slots[n])
		.delay(1000)
		.animate({
			x:2.25,
			y:0.78 - 0.09*(completes.length-1),
			scale:0.5,
			spin:80,
			twist:0
		});

		slots[n] = undefined;
		
		setTimeout(initNextPlayer,2000);
	}

	self.step = function(){
		for(var b in boxes) boxes[b].step();
		for(var b in boxes) boxes[b].redraw();

		for(var s in slots ) if( slots[s] && slots[s].isComplete ) finiSlot(s);


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