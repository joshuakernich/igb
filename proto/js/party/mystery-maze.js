window.MysteryMazeGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const TRACK = {W:W/4,L:W,C:4,R:6,PADY:2};
	TRACK.PW = TRACK.W/W;

	let audio = new AudioContext();
	audio.add('fall','./proto/audio/party/sfx-fall.mp3',0.3);
	audio.add('blip','./proto/audio/party/sfx-select.mp3',0.3);
	audio.add('correct','./proto/audio/party/sfx-correct.mp3',0.3);
	audio.add('sequence','./proto/audio/party/sfx-sequence.mp3',0.3);
	audio.add('music','./proto/audio/party/music-creeping.mp3',0.3,true);

	if( !MysteryMazeGame.init ){
		MysteryMazeGame.init = true;

		$("head").append(`
			<style>
				mysterymazegame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: gray;
					background-position: bottom 120px center;
					perspective: ${W*3}px;
					background: url(./proto/img/party/bg-mountains-clouds.png);
					background-size: 100%;
				}

				mysterymaze{
					display:block;
					position: absolute;
					width: ${TRACK.W}px;
					height: ${TRACK.L}px;
					
					bottom: 100px;
					transform: rotateX(60deg);
					transform-origin: bottom center;
					transform-style: preserve-3d;
					box-sizing: border-box;
				}

				mysteryrow{
					display: block;
					
				}

				mysteryrow[safe]{
					background: gray;
					height: ${TRACK.L/(TRACK.R+TRACK.PADY*2)}px;
					box-shadow: 0px 20px 0px black;
				}

				mysterycell{
					display: inline-block;
					width: ${TRACK.W/TRACK.C}px;
					height: ${TRACK.L/(TRACK.R+TRACK.PADY*2)}px;
					background: #333;
					box-shadow: 0px 20px 0px black;
				}

				mysterycell[safe='safe']{
					background: #94EF93;
				}

				mysteryreticule{
					display: block;
					position: absolute;
					width: 100px;
					height: 100px;
					background: red;
					transform: translate(-50%, -50%);
					border-radius: 100%;
				}

				mysterytarget{
					display: block;
					position: absolute;
					width: 200px;
					height: 200px;
					
					transform: translate(-50%, -50%);
					border-radius: 100%;	
					box-sizing: border-box;
					border: 20px dashed red;
				}

				mysterymaze[n='0'] mysteryreticule{ background:var(--n0); }
				mysterymaze[n='1'] mysteryreticule{ background:var(--n1); }
				mysterymaze[n='2'] mysteryreticule{ background:var(--n2); }
				mysterymaze[n='3'] mysteryreticule{ background:var(--n3); }
				mysterymaze[n='4'] mysteryreticule{ background:var(--n4); }
				mysterymaze[n='5'] mysteryreticule{ background:var(--n5); }

				mysterymaze[n='0'] mysterytarget{ border-color:var(--n0); }
				mysterymaze[n='1'] mysterytarget{ border-color:var(--n1); }
				mysterymaze[n='2'] mysterytarget{ border-color:var(--n2); }
				mysterymaze[n='3'] mysterytarget{ border-color:var(--n3); }
				mysterymaze[n='4'] mysterytarget{ border-color:var(--n4); }
				mysterymaze[n='5'] mysterytarget{ border-color:var(--n5); }

			<style>
		`)
	}



	const MysteryMaze = function(n){
		let self = this;
		self.$el = $(`<mysterymaze n=${n}>`);

		let isActive = false;
		let isReady = false;
		let isDead = false;

		self.isComplete = false;
		
		self.ax = 0;

		self.px = 0;
		self.py = 0;

		self.lx = 0;
		self.ly = 0;

		self.tx = 0;
		self.ty = 0;

		
		let path = [];
		let nPath = 0;

		let $reticule = $('<mysteryreticule>').appendTo(self.$el);
		let $target = $('<mysterytarget>').appendTo(self.$el);

		function next(){

			let seq = [
				{x:Math.random()>0.5?-1:1,y:0},
				{x:0,y:-1},
				{x:0,y:-1},
			]

			if(pos.x==0){
				seq[0].x = 1;
				seq.unshift(seq[0]);
			}
			if(pos.x==TRACK.C-1){
				seq[0].x = -1;
				seq.unshift(seq[0]);
			}

			if(Math.random()>0.5) seq.push({x:0,y:-1});
			
			for(var s in seq){
				pos = {x:pos.x + seq[s].x, y:pos.y + seq[s].y};
				if(pos.y>=0) path.push(pos);
			}

			if(pos.y>0) next();
		}

		let pos = {
			x:Math.floor(Math.random()*TRACK.C),
			y:TRACK.R-1,
		};

		path.push(pos);
		pos = { x:pos.x, y:pos.y-1 };
		path.push(pos);
		next();

		let meep = new PartyMeep(n);
		meep.$el.appendTo(self.$el).css({
			'left':'50%',
			'transform':'rotateX(-50deg) scale(0.6)',
		});

		$('<mysteryrow safe>').appendTo(self.$el);
		$('<mysteryrow safe>').appendTo(self.$el);

		let $cells = [];

		for(let r=0; r<TRACK.R; r++){
			$cells[r] = [];
			let $row = $('<mysteryrow>').appendTo(self.$el);

			for(let c=0; c<TRACK.C; c++){
				$cells[r][c] = $('<mysterycell>').appendTo($row);

				//for(var p in path) if(path[p].x == c && path[p].y == r) $cell.attr('safe','safe');
			}
		}

		$('<mysteryrow safe>').appendTo(self.$el);
		$('<mysteryrow safe>').appendTo(self.$el);

		function showPath(){
			for(var p in path){
				let cell = path[p];
				$cells[cell.y][cell.x].delay(p*50).animate({
					'background-color':'#94EF93',
				},100).delay(500).animate({
					'background-color':'#333',
				},500)
			}

			audio.play('sequence',true);
		}

		self.showPathPreview = function(){
			setTimeout(showPath,0);
			setTimeout(showPath,2000);
			setTimeout(showPath,4000);
			setTimeout(function(){
				isReady = true;
			},5000);
		}
		
		self.step = function(){

			self.lx = self.px - self.ax;
			self.ly = -0.3 + self.py * 1.6;

			if(isActive && !isDead){
				self.tx = self.lx;
				self.ty = self.ly;

				let x = self.lx/(TRACK.W/W);
				let y = self.ly/(TRACK.L/W);

				let gx = Math.floor( x*TRACK.C );
				let gy = Math.floor( y*(TRACK.R + TRACK.PADY*2) ) - TRACK.PADY;

				let isOnPath = gy<0 || gy>=TRACK.R;
				for(var p in path){
					if( path[p].x == gx && path[p].y == gy ){
						isOnPath = true;
						if( $cells[gy][gx].attr('safe') == undefined ){
							$cells[gy][gx].attr('safe','safe').css({
								'background-color':'#94EF93',
							})
							audio.play('blip',true);
						}
					};
				}

				if(!isOnPath){
					isDead = true;

					if( $cells[gy] && $cells[gy][gx] ){
						$cells[gy][gx].css('opacity',0);
					};

					meep.$el.css({
						'transition':'transform 1s',
						'transform':'rotateX(-50deg) scale(0.6) translateY(2000px)'
					});

					audio.play('fall',true);
					setTimeout(reset,2000);

				} else if(gy<0){
					isDead = true;
					$(self).animate({
						tx: TRACK.W/W/2,
						ty: 0.1,
					});

					self.isComplete = true;
					audio.play('correct',true);
				}

			} else if(!isDead){
				self.tx = TRACK.W/W/2;
				self.ty = 0.9;

				if(isReady){
					let dx = self.lx - self.tx;
					let dy = self.ly - self.ty;
					let d = Math.sqrt(dx*dx+dy*dy);

					if(d<0.05){
						audio.play('blip',true);
						$target.hide();
						$reticule.hide();
						isActive = true;
					}
				}
			}
		}

		self.redraw = function(){
			
			$reticule.css({
				left: self.lx * W + 'px',
				top: self.ly * TRACK.L + 'px'
			});

			$target.css({
				left: self.tx * W + 'px',
				top: self.ty * TRACK.L + 'px'
			});

			meep.$el.css({
				left: self.tx * W + 'px',
				top: self.ty * TRACK.L + 'px'
			});
		}

		function reset(){
			isActive = false;
			isDead = false;
			isReady = false;

			for(var r in $cells) for(var c in $cells[r]) $cells[r][c].css({'opacity':1,'background-color':'#333'}).removeAttr('safe');

			$target.show();
			$reticule.show();
			meep.$el.css({
				'transition':'none',
				'transform':'rotateX(-50deg) scale(0.6)',
			});

			setTimeout( self.showPathPreview, 1000 );
		}
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<mysterymazegame>').appendTo(self.$el);
	let meeps = [];
	let mazes = [];

	let hud = new PartyHUD('#aa6ec1');
	hud.$el.appendTo($game);

	let slots = [];
	for(var i=0; i<3; i++) slots[i] = {ax:0.07 + i*0.3, occupant:-1};

	function initGame(count) {
		audio.play('music');

		for(var i=0; i<count; i++){
			mazes[i] = new MysteryMaze(i);
			mazes[i].$el.appendTo($game).hide();
		}

		initNextPlayer();
		setTimeout( initNextPlayer, 200 );
		setTimeout( initNextPlayer, 400 );

		setTimeout(function(){
			hud.initBanner('Watch Closely','small');
		},2000);

		setTimeout(function(){
			hud.finiBanner();
		},10000);
	}

	hud.initPlayerCount(initGame);

	let nPlayer = -1;
	function initNextPlayer(){
		nPlayer++;

		if(!mazes[nPlayer]){
			checkForGameComplete();
		}

		let nSlot = 0;
		while(slots[nSlot].occupant>-1) nSlot++;

		slots[nSlot].occupant = nPlayer;
		mazes[nPlayer].ax = slots[nSlot].ax;
		mazes[nPlayer].$el.show().css({
			bottom: -H,
			left:W + mazes[nPlayer].ax * W + 'px',
		}).animate({
			bottom: 150
		}).animate({
			bottom: 100
		})

		setTimeout( mazes[nPlayer].showPathPreview, 4000 );
	}

	function checkForGameComplete(){
		let isComplete = true;
		for(var i=0; i<mazes.length; i++) if(!mazes[i].isComplete) isComplete = false;
		if(isComplete){
			hud.initBanner("Finish");
			setTimeout(function(){
				let scores = [];
				for(var i=0; i<mazes.length; i++){
					let meep = new PartyMeep(i);
					meep.$el.appendTo($game).css({
						'bottom':'-350px',
						'left':W + (0.3 + 1/(mazes.length-1)*0.4 * i)*W + 'px',
					}).animate({
						'bottom':'0px'
					})
				}
			},2000);
		}
	}

	self.step = function(){
	
		let isComplete = true;
		for(var m in mazes){
			mazes[m].step();
			if(!mazes[m].isComplete){
				isComplete = false;
			} else {
				for(var s in slots){
					if( slots[s].occupant == m ){
						slots[s].occupant = -1;
						mazes[m].$el.delay(1000).animate({
							bottom: W + 'px',
						})

						setTimeout( initNextPlayer, 2000 );
					}
				}
			}
		}
		for(var m in mazes) mazes[m].redraw();

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
		for(var m in mazes){
			mazes[m].px = (p[m].px);
			mazes[m].py = (1-p[m].pz);
		}
	}
}