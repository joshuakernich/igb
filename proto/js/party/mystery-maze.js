window.MysteryMazeGame = function(){

	const TUTORIAL = 
	[
		'10',
		'11',
		'01',
	];

	const MAP3x4 = 
	[
		'100',
		'111',
		'001',
		'001',
	];

	const MAP3x5 = 
	[
		'010',
		'110',
		'100',
		'111',
		'001',
	];

	const MAP4x5 = 
	[
		'0001',
		'1111',
		'1000',
		'1110',
		'0010',
	];

	const MAP4x7 = 
	[
		'0001',
		'0011',
		'0010',
		'1110',
		'1000',
		'1100',
		'0100',
	];
	
	function generateVariants(map){
		let arr = [];
		for(var y=0; y<map.length; y++){
			arr[y] = [];
			for(var x=0; x<map[y].length; x++){
				arr[y][x] = parseInt(map[y][x]);
			}
		}

		let flipY = arr.concat().reverse();
		let flipX = arr.concat();
		for(var y in flipX) flipX[y] = flipX[y].concat().reverse();
		let flipXY = flipX.concat().reverse();

		return [arr,flipY,flipX,flipXY];
	}
	

	const ROUNDS = [
		generateVariants(MAP3x4),
		generateVariants(MAP3x5),
		generateVariants(MAP4x5),
	]

	const TUTORIALS = generateVariants(TUTORIAL);

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const PX_CELLH = 150; //pixel height for each cell
	const SAFE_GY = 2; // grid height for safe zones

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
					
					bottom: 100px;
					transform: rotateX(60deg);
					transform-origin: bottom center;
					transform-style: preserve-3d;
					box-sizing: border-box;
				}

				mysteryrow{
					display: block;
					height: ${PX_CELLH}px;
				}

				mysteryrow[safe]{
					background: gray;
					
					box-shadow: 0px 20px 0px black;
				}

				mysterycell{
					display: inline-block;
					height: ${PX_CELLH}px;
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
					width: 150px;
					height: 150px;
					
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

				mysteryscore{
					display: block;
					position: absolute;
					bottom: 400px;
					left: -100px;
					right: -100px;
					color: white;
					text-align: center;
					font-size: 100px;
				}

				mysterytext{
					position: absolute;
					top: ${PX_CELLH}px;
					left: 0px;
					right: 0px;
					line-height: ${PX_CELLH}px;
					font-size: ${PX_CELLH/2}px;
					color: white;
					text-align: center;
					transform: rotateX(-90deg);
					transform-origin: bottom center;
					transform-style: preserve-3d;
				}

			<style>
		`)
	}

	const MysteryMaze = function(n,map,wTrack){
		let self = this;
		self.$el = $(`<mysterymaze n=${n}>`);

		let grid = {
			w:map[0].length,
			h:map.length,
			hFull:map.length + SAFE_GY*2,
			pw:wTrack,
			ph:(map.length+SAFE_GY*2)*PX_CELLH,
			px:wTrack/map[0].length,
			py:PX_CELLH
		};

		let isActive = false;
		let isReady = false;
		let isDead = false;
		let timeout = undefined;

		self.isComplete = false;
		
		self.ax = 0;

		// player location (0-1)
		self.px = 0;
		self.py = 0;

		// reticule location
		self.rx = 0;
		self.ry = 0;

		// target location
		self.tx = 0;
		self.ty = 0;

		self.score = 0;
		self.tally = 0;

		let path = [];
		let nPath = 0;
		let countDead = 0;

		let $reticule = $('<mysteryreticule>').appendTo(self.$el).hide();
		let $target = $('<mysterytarget>').appendTo(self.$el).hide();

		let timeBegin = undefined;

		let meep = new PartyMeep(n);
		meep.$el.appendTo(self.$el).css({
			'left':'50%',
			'transform':'rotateX(-50deg) scale(0.5)',
		});

		for(var i=0; i<SAFE_GY; i++) $('<mysteryrow safe>').appendTo(self.$el);

		let $cells = [];

		for(let r=0; r<grid.h; r++){
			$cells[r] = [];
			let $row = $('<mysteryrow>').appendTo(self.$el);

			for(let c=0; c<grid.w; c++){
				$cells[r][c] = $('<mysterycell>').appendTo($row).css({width:grid.px});
			}
		}

		for(var i=0; i<SAFE_GY; i++) $('<mysteryrow safe>').appendTo(self.$el);

		let $text = $('<mysterytext>').appendTo(self.$el);
		self.$text = $text;

		function showPath(){

			for(var r in map){
				for(var c in map[r]){
					if(map[r][c] == 1){
						$cells[r][c].delay((map.length-r)*100).animate({
							'background-color':'#94EF93',
						}).delay(500).animate({
							'background-color':'#333',
						})
					}
				}
			}

			audio.play('sequence',true);
		}

		self.showPathPreview = function(){
			$text.text('Watch...').css({opacity:1});
			setTimeout(showPath,0);
			setTimeout(showPath,2000);
			setTimeout(showPath,4000);
			setTimeout(function(){
				
				isReady = true;
				if(timeBegin == undefined) timeBegin = new Date().getTime();

				$reticule.show();
				$target.show();
				$text.text('Go!').delay(1000).animate({opacity:0});
			},5000);
		}
		
		function die(){
			isDead = true;
			meep.$el.css({
				'transition':'transform 1s',
				'transform':'rotateX(-50deg) scale(0.6) translateY(2000px)'
			});

			audio.play('fall',true);

			timeout = setTimeout(reset,2000);
		}

		self.step = function(){

			self.rx = (self.px - self.ax) * (W/grid.pw) * grid.w
			self.ry = (-0.4 + self.py * 1.8) * grid.hFull;

			if(timeBegin != undefined && !self.isComplete){
				let timeElapsed = new Date().getTime() - timeBegin;
				self.score = self.tally + timeElapsed/1000;
			}

			if(isActive && !isDead){

				self.tx = self.rx;
				self.ty = self.ry;

				let gx = Math.floor( self.rx );
				let gyFull = Math.floor( self.ry );
				let gy = Math.floor( self.ry ) - SAFE_GY;

				let isWithinBounds = gyFull>=0 && gyFull<grid.hFull && gx >= 0 && gx < grid.w;
				let isWithinMaze = gy>=0 && gy<grid.h && gx >= 0 && gx < grid.w;

				if(isWithinMaze && map[gy][gx] == 1){

					if($cells[gy][gx].attr('safe') == undefined){
						$cells[gy][gx].attr('safe','safe').css({
							'background-color':'#94EF93',
						})
						audio.play('blip',true);
					}
				} else if(isWithinMaze){
					$cells[gy][gx].css('opacity',0);
					die();
				} else if( !isWithinBounds ){
					die();
				} else if(gy<0){
					isDead = true;
					self.isComplete = true;

					audio.play('correct',true);

					$(self).animate({
						tx:grid.w/2,
						ty:SAFE_GY/2,
					});
				}

			} else if(!isDead && !isActive){
				self.tx = grid.w/2;
				self.ty = grid.h + SAFE_GY*1.5;

				if(isReady){
					let dx = self.rx - self.tx;
					let dy = self.ry - self.ty;
					let d = Math.sqrt(dx*dx+dy*dy);

					if(d<0.5){
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
				left: self.rx * grid.px + 'px',
				top: self.ry * grid.py + 'px'
			});

			$target.css({
				left: self.tx * grid.px + 'px',
				top: self.ty * grid.py + 'px'
			});

			meep.$el.css({
				left: self.tx * grid.px + 'px',
				top: self.ty * grid.py + 'px'
			});
		}

		function reset(){
			isActive = false;
			isDead = false;
			isReady = false;

			for(var r in $cells) for(var c in $cells[r]) $cells[r][c].css({'opacity':1,'background-color':'#333'}).removeAttr('safe');

			$target.hide();
			$reticule.hide();
			meep.$el.css({
				'transition':'none',
				'transform':'rotateX(-50deg) scale(0.6)',
			});

			timeout = setTimeout( self.showPathPreview, 1000 );
		}

		self.fini = function() {
			clearTimeout(timeout);
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

	let iRound = -1;
	let nPlayer = -1;
	let countPlayer;

	function initGame(count) {
		
		countPlayer = count;
	
		initTutorial();
	}

	function initTutorial(){

		hud.initTutorial("Mystery Maze",
			{ x:1.15, y:0.5, msg:'Align yourself<br>with your Avatar',icon:'align' },
			{ x:1.75, y:0.5, msg:'Move around the box<br>to navigate the maze',icon:'around' },
		);

		for(var i=0; i<countPlayer; i++){
			let iMaze = i%TUTORIALS.length;
			mazes[i] = new MysteryMaze(i,TUTORIALS[iMaze],W/8);
			mazes[i].ax = 0.1 + 0.7/(countPlayer-1) * i;
			mazes[i].$text.hide();
			mazes[i].$el.appendTo($game).css({
				left:W + mazes[i].ax * W + 'px'
			});
			setTimeout( mazes[i].showPathPreview, 1000 );
		}

		hud.initTimer(10,finiTutorial);
	}

	function finiTutorial(){

		hud.finiTimer();
		hud.finiTutorial();

		for(var m in mazes){
			mazes[m].fini();
			mazes[m].$el.hide();
			mazes[m].isComplete = true;
			mazes[m].score = 0;
		}

		setTimeout(function(){
			hud.initPlayers(mazes,1);
		},1000);
		setTimeout(initNextRound,3000);
	}

	function initNextRound(){

		iRound++;
		nPlayer = -1;

		audio.play('music',false,iRound==ROUNDS.length-1?1.5:1);

		for(var s in slots) slots[s].occupant = -1;

		for(var i=0; i<countPlayer; i++){
			let iMaze = i%ROUNDS[iRound].length;
			let tally = mazes[i]?mazes[i].score:0;
			mazes[i] = new MysteryMaze(i,ROUNDS[iRound][iMaze],W/4);
			mazes[i].$el.appendTo($game).hide();
			mazes[i].score = mazes[i].tally = tally;
		}

		let delay = 0;

		setTimeout(function(){
			hud.initRound(iRound,ROUNDS.length);
		},delay += 1000)

		setTimeout(function(){
			hud.finiBanner();
		},delay += 2000);

		setTimeout(function(){
			initNextPlayer();
			setTimeout( initNextPlayer, 200 );
			setTimeout( initNextPlayer, 400 );
		},delay += 1000);

		setTimeout(function(){
			let summon = [0,1,2];
			if(summon.length>countPlayer) summon.length = countPlayer;
			hud.summonPlayers(summon);
		},delay += 1000);

		setTimeout(function(){
			hud.finiBanner();
		},delay += 2000);

		setTimeout(function(){
			for(var s in slots){
				let m = slots[s].occupant;
				mazes[m].showPathPreview();
			}
		},delay += 1000);
	}

	hud.initPlayerCount(initGame);

	
	function initNextPlayer(triggerPreview=false){
		nPlayer++;

		if(!mazes[nPlayer]){
			checkForRoundComplete();
			return;
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

		if( triggerPreview ) setTimeout( mazes[nPlayer].showPathPreview, 1000 );
	}

	function checkForRoundComplete(){
		let isComplete = true;
		for(var i=0; i<mazes.length; i++) if(!mazes[i].isComplete) isComplete = false;

		if(isComplete){
			initNextRound();
		}
	}

	function finiGame(){


		setTimeout(function(){
			for(var i=0; i<mazes.length; i++){
				let meep = new PartyMeep(i);
				$('<mysterscore>').appendTo(meep.$el).text(mazes[i].score);
				meep.$el.appendTo($game).css({
					'bottom':'-350px',
					'left':W + (0.25 + 1/(mazes.length-1)*0.5 * i)*W + 'px',
				}).animate({
					'bottom':'0px'
				})
			}
		},2000);

		let scores = [];
		for(var i=0; i<mazes.length; i++) scores[i] = mazes[i].score;
		setTimeout( function(){
			window.doPartyGameComplete(scores);
		},4000);
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

						setTimeout( function(){
							initNextPlayer(true);
						}, 2000 );
					}
				}
			}
		}
		for(var m in mazes) mazes[m].redraw();

		hud.updatePlayers(mazes,1);

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