window.CardboardCutoutGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const BOX = 500;
	const CUTTER = {W:50,H:200};

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
					background-position: bottom center;

					perspective: ${W}px;
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
					height: ${BOX/2}px;
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
					height: ${BOX/2}px;
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
					width: ${BOX/2}px;
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
					transform: rotate(10deg);
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

				cutoutscore{
					display: block;
					position: absolute;
					bottom: ${BOX/2+20}px;
					left: ${-BOX/2}px;
					width: ${BOX}px;

					color: white;
					font-size: 80px;
					line-height: 100px;
					text-align: center;
				}

				cutoutheader{
					display: block;
					position: absolute;
					bottom: ${BOX/2 + 100}px;
					left: ${-BOX/2}px;
					width: ${BOX}px;

					color: white;
					font-size: 50px;
					line-height: 100px;
					text-align: center;
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

	// Calculate squared distance from point to segment
	function pointToSegmentDistanceSquared(px, py, x1, y1, x2, y2) {
	    const dx = x2 - x1;
	    const dy = y2 - y1;

	    if (dx === 0 && dy === 0) {
	        // The segment is a single point
	        return (px - x1) ** 2 + (py - y1) ** 2;
	    }

	    // Project point onto segment, computing parameterized t
	    let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);

	    // Clamp t from 0 to 1
	    t = Math.max(0, Math.min(1, t));

	    // Find the closest point on the segment
	    const closestX = x1 + t * dx;
	    const closestY = y1 + t * dy;

	    // Return squared distance from point to closest point
	    return (px - closestX) ** 2 + (py - closestY) ** 2;
	}

	// Main function: get minimum distance from point to polygon border
	function distanceToShapeBorder(point, shapePoints) {
	    let minDistSq = Infinity;

	    for (let i = 0; i < shapePoints.length; i++) {
	        const p1 = shapePoints[i];
	        const p2 = shapePoints[(i + 1) % shapePoints.length]; // wrap around

	        const distSq = pointToSegmentDistanceSquared(point.x, point.y, p1.x, p1.y, p2.x, p2.y);
	        if (distSq < minDistSq) {
	            minDistSq = distSq;
	        }
	    }

	    return Math.sqrt(minDistSq);
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
	const CutoutBox = function(n,x,y){

		let self = this;

		if(!queue.length){
			queue = COLLECTION.concat();
			shuffleArray(queue);
		}

		let pattern = SHAPES[queue.pop()];
		let isCutActive = false;
		let isComplete = false;

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
			`).css({
			left: W + x*W + 'px',
			top: y*H + 'px',
		});

		let $start = $('<cutoutstart>').appendTo(self.$el).css({
			left: pattern[0].x * BOX/2,
			top: pattern[0].y * BOX/2,
		})

		let $scoreHeader = $('<cutoutheader>').appendTo(self.$el);
		let $score = $('<cutoutscore>').appendTo(self.$el).text('Ready...');

		let $surface = $('<cutoutsurface>').appendTo(self.$el);
		let $cut = self.$el.find('path').last();
		
		self.bindMeep = function(meep){
			self.meep = meep;
			self.meep.$el.appendTo($surface);
			self.$el.attr('n',meep.n);
		}

		let history = [];

		self.step = function(){
			if(self.meep){
				let ox = self.meep.px - x*W;
				let oy = self.meep.py - y*H;

				self.meep.$el.css({
					left: ox + 'px',
					top: oy + 'px',
				})

				if(isCutActive){
					history.push({x:ox/(BOX/2),y:oy/(BOX/2)});

					let draw = '';
					for(var h in history) draw = draw + (h==0?'M':'L') + history[h].x + ',' +history[h].y;
					$cut.attr('d',draw);

					let dx = ox - pattern[0].x * BOX/2;
					let dy = oy - pattern[0].y * BOX/2;
					let d = Math.sqrt(dx*dx+dy*dy);

					let distMax = 0;
					for(var h in history){
						let dist = distanceToShapeBorder( history[h], pattern );
						if(dist>distMax) distMax = dist;
					}

					let accuracy = ((1-distMax)*100).toFixed(1);

					$score.text(accuracy + '%');

					if(d<35 && history.length>100){
						isCutActive = false;
						isComplete = true;
						$scoreHeader.text('Finish!');

						$cut.attr('d',draw + 'Z');
						$cut.addClass('done');
					}

				} else if(!isComplete){
					let dx = ox - pattern[0].x * BOX/2;
					let dy = oy - pattern[0].y * BOX/2;
					let d = Math.sqrt(dx*dx+dy*dy);

					if(d<35){
						$start.hide();
						isCutActive = true;
						$scoreHeader.text('Accuracy');
						$score.text('%');
					}
				}
			}
		}
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<cutoutgame>').appendTo(self.$el);

	let hud = new PartyHUD('#C09363');
	hud.$el.appendTo($game);

	hud.initPlayerCount(initGame);

	let boxes = [];
	let meeps = [];

	function initGame(count){

		for(var m=0; m<count; m++){
			meeps[m] = new CutterMeep(m);
			meeps[m].$el.appendTo($game);
		}

		initBox();
		initBox();
	}

	let nNextPlayer = -1;

	function initBox(){

		let nBox = 0;
		if( boxes[0] ) nBox = 1;

		let box = new CutoutBox(0,(nBox==0?0.3:0.7),0.5);
		box.$el.appendTo($game);
		boxes[nBox] = box;

		nNextPlayer++;
		boxes[nBox].bindMeep(meeps[nNextPlayer]);
	}

	self.step = function(){
		for(var b in boxes) boxes[b].step();
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
			meeps[m].px = p[m].px * W;
			meeps[m].py = (1-p[m].pz) * H;
		}
	}
}