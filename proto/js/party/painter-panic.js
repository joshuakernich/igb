window.PainterPanicGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const BOX = 500;
	const THICC = BOX/6;
	const BRUSH = {W:50,H:200};

	function toPath(arr){
		let path = [];
		for(var i=0; i<arr.length/2; i++){
			path[i] = [ arr[i*2], arr[i*2+1] ];
		}

		return path;
	}

	let PICASSO = toPath([348,493.25,338.65,478.6,338.65,437.25,334.65,423.95,381.3,405.25,390.65,370.6,362.65,321.3,332,271.95,340,247.95,353.3,230.65,354.65,205.3,378.65,170.65,373.3,161.3,384,93.3,384,40,411.95,0,373.3,-1.35,361.3,30.65,349.3,33.35,336,68,338.65,82.65,334.65,97.3,320,64,288,49.35,245.35,69.35,212,80,166.7,66.65,124,76,117.35,112,128,137.3,150.7,149.3,188,154.65,188,166.65,196,175.95,198.7,197.3,188,246.65,189.35,258.65,194.7,283.95,204,299.95,178.7,315.95,134.7,339.95,118.7,361.3,120,374.6,145.35,402.6,132,417.25,132,429.25,112,457.25,100.05,466.6,96.05,483.9,102.7,493.25,130.7,487.9,137.35,469.25,153.35,449.25,185.35,433.25,208,429.25,250.65,435.95,302.65,462.6,329.3,495.9,333.3,505.25,352,505.25,348,493.25]);
	let HORSE = toPath([221.35,505.25,280,477.25,269.35,469.25,269.35,446.6,194.7,390.6,176,398.6,130.7,379.95,117.35,395.95,122.7,407.95,110.7,429.25,101.35,414.6,100.05,389.25,93.35,383.95,104,363.95,73.35,375.95,56.05,399.95,60.05,413.25,48.05,434.6,36.05,411.95,40.05,387.95,89.35,339.95,113.35,334.6,122.7,339.95,144,326.6,150.7,297.3,178.7,269.3,169.35,255.95,188,254.65,230.65,195.95,221.35,182.65,197.35,181.3,181.35,178.65,172,150.65,190.7,132,233.35,140,225.35,128,260,128,285.35,149.3,297.35,149.3,269.35,112,270.65,82.65,320,136,333.3,113.3,364,109.3,409.3,141.3,378.65,144,377.3,158.65,413.3,164,442.65,189.3,442.65,219.95,411.95,261.3,405.3,293.3,376,318.6,385.3,334.6,427.95,346.6,463.95,371.95,481.3,402.6,502.65,413.25,503.95,462.6,474.65,486.6,427.95,509.25,288,511.9,221.35,505.25]);
	let ANGEL = toPath([-6.6,462.6,77.35,453.25,98.7,393.25,129.35,339.95,113.35,334.6,85.35,301.3,42.7,239.95,16.05,193.3,73.35,182.65,162.7,189.3,201.35,207.95,197.35,182.65,208,169.3,198.7,157.3,202.65,140,200,128,216,100,232,101.3,246.65,85.3,257.35,86.65,277.35,77.3,293.35,77.3,313.3,66.65,345.3,69.35,362.65,89.3,374.65,98.65,397.3,122.65,394.65,144,400,156,389.3,181.3,402.65,217.3,405.3,251.95,417.3,255.95,441.3,281.3,458.65,335.95,435.95,394.6,434.65,430.6,427.95,454.6,505.3,454.6,510.6,514.6,-11.95,503.9,-6.6,462.6,]);
	let APPLE = toPath([94.7,413.25,98.7,517.25,413.3,515.9,413.3,437.25,406.65,354.6,390.65,257.3,362.65,237.3,348,227.95,328,226.65,321.3,215.95,300,202.65,284,186.65,296,165.3,301.35,130.65,301.35,116,321.3,105.3,320,97.3,297.35,97.3,304,88,297.35,80,294.65,57.35,286.65,42.65,266.65,32,242.65,28,214.65,40,204,58.65,201.35,96,182.7,93.3,173.35,97.3,177.35,108,194.7,116,190.7,136,202.65,161.3,209.35,183.95,194.7,210.65,170.7,225.3,132,234.65,110.7,254.65,100.05,294.6,94.7,413.25]);
	let MONA = toPath([137.35,458.6,142.7,475.95,168,493.25,185.35,473.25,204,465.25,272,470.6,354.65,466.6,406.65,461.25,423.95,441.25,425.3,393.25,392,281.3,374.65,253.3,328,219.95,302.65,85.3,276,42.65,249.35,36,210.65,41.35,186.7,73.3,168,125.3,165.35,160,177.35,207.95,168,234.65,138.7,266.65,120,309.3,105.35,338.6,78.7,359.95,68.05,402.6,73.35,425.25,93.35,433.25,128,433.25,149.35,437.25,137.35,458.6]);
	let SCREAM = toPath([114.7,505.25,126.7,443.95,113.35,423.95,113.35,374.6,128,326.6,128,274.65,134.7,234.65,153.35,221.3,176,213.3,160,152,164,125.3,176,98.65,182.7,97.3,204,65.35,240,46.65,272,45.35,294.65,54.65,314.65,76,316,89.3,325.3,90.65,332,108,333.3,146.65,324,178.65,309.3,205.3,310.65,230.65,317.3,265.3,328,269.3,340,318.6,344,363.95,336,399.95,313.3,425.25,298.65,427.95,290.65,461.25,288,507.9,114.7,505.25]);



	const PAINTINGS = [
		{path:APPLE,img:'texture-painting-apple'},
		{path:ANGEL,img:'texture-painting-angel'},
		{path:HORSE,img:'texture-painting-horse'},
		{path:SCREAM,img:'texture-painting-scream'},
		{path:MONA,img:'texture-painting-mona'},
		{path:PICASSO,img:'texture-painting-picasso'},
	]

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
	const STROKE = 50;
	const GRID = Math.floor(BOX/STROKE*2);

	let queue = [];
	const PainterBox = function(n,path,texture){

		let self = this;
		self.isForeground = false;
		self.y = 0.5;
		self.x = 0.5;
		self.scale = 0.5;
		self.spin = 80;
		self.twist = 0;

		let isPaintActive = true;

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
						<img src='./proto/img/party/${texture}.png'/>
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

		/*let $start = $('<painterstart>').appendTo(self.$el).css({
			left: '50%',
			top: '50%',
		})*/

		let grids = [];
		for(var x=0; x<GRID; x++){
			for(var y=0; y<GRID; y++){
				let gx = (x + 0.5) * STROKE/2;
				let gy = (y + 0.5) * STROKE/2;

				if(inside([gx,gy],path)){
					$('<div>').appendTo(self.$el)
					.css({
						position:'absolute',
						width:'4px',
						height:'4px',
						background:'black',
						left:-BOX/2+gx-2+'px', 
						top:-BOX/2+gy-2+'px'
					})

					grids.push([gx,gy]);
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

		function inside(point, vs) {
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
		    
		    return inside;
		};
		

		self.step = function(){
			if(self.meep && self.isForeground){
				let ox = self.meep.px - self.x*W;
				let oy = self.meep.py - self.y*H;

			
				self.meep.$el.css({
					left: ox + 'px',
					top: oy + 'px',
				})

				if(isPaintActive){

					ox = ox + (BOX/2);
					oy = oy + (BOX/2);

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

					/*let data = ctx2.getImageData(0, 0, BOX, BOX);
					let cnt = 0;
					for(var i=0; i<data.data.length; i+=4) if(data.data[i+3]!=0) cnt++; //just check the alpha channel
					let amt = Math.round(cnt/MAXPIXELS*100);
					$score.text(amt+'%');*/

					let cntPaint = 0;
					for(var g in grids){
						let isPaint = false;
						for(var h in history){
							let dx = history[h].x - grids[g][0];
							let dy = history[h].y - grids[g][1];
							let d = Math.sqrt(dx*dx+dy*dy);
							if(d<STROKE) isPaint = true;
						}

						if(isPaint) cntPaint++;
					}

					let amt = Math.round(cntPaint/grids.length*100);
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
		
			let box = new PainterBox(m,PAINTINGS[m].path,PAINTINGS[m].img);
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