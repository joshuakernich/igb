window.PlatformGame = function(){

	const MeepBall = function(nPlayer){

		let self = this;
		self.$el = $('<platformball>').attr('n',nPlayer);

		self.nPlayer = nPlayer;
		self.x = 0;
		self.y = 0;
		self.px = 0;
		self.py = 0;
		
		self.score = 0;
		self.dead = false;
		
		self.sx = 0;
		self.sy = 0;


		let $elTarget = $('<platformtarget>').appendTo(self.$el);

		let $elAnchor = $('<platformanchor>').appendTo(self.$el);
		let $elAvatar = $('<platformavatar>').appendTo($elAnchor);
		let $elBall = $('<platformballball>').appendTo($elAvatar);

		let avatar = new PartyMeep(i);
		//avatar.$el.appendTo($elAvatar);
		avatar.setHeight(370);
		avatar.$el.css({bottom:'185px'});

		$elAvatar.css({
			'transform-style':'preserve-3d',
			transform: 'rotateX(-60deg) scale(0.8)',
		});

		self.step = function(){

			let dx = self.x - self.px;
			let dy = self.y - self.py;

			//console.log(self.x,self.y,self.px,self.py);

			self.sx = (self.sx + dx*0.1)/2
			self.sy = (self.sy + dy*0.1)/2;

			self.px += self.sx;
			self.py += self.sy;

			let d = Math.sqrt(self.px*self.px + self.py*self.py);

			if(d > 800){
				self.dead = true;
				$elTarget.hide();
				$elAnchor.css({
					'transition':'1s all',
					'transform':'translateZ(-1500px)'
				})
			}
		}

		self.collide = function( other ){
			let dx = self.px - other.px;
			let dy = self.py - other.py;
			let d = Math.sqrt(dy*dy + dx*dx);

			
			if(d<300){
				let r = Math.atan2(dy,dx);
				self.sx = Math.cos(r) * 150;
				self.sy = Math.sin(r) * 150;
			}
		}

		self.redraw = function(){
			$elTarget.css({
				left:self.x + 'px',
				top:self.y + 'px'
			})

			$elAnchor.css({
				left:self.px + 'px',
				top:self.py + 'px'
			})
		}
	}


	const W = 1600;
	const H = 1000;
	const FPS = 20;
	const PLAYER_COUNT = 6;
	const GRIDSIZE = 400;
	const TRACKLENGTH = 200;

	const GRID = {W:W/GRIDSIZE,H:TRACKLENGTH};

	if(!MazeGame.didInit){
		MazeGame.didInit = true;

		$("head").append(`
			<style>
				platformgame{
					display: block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: url(./proto/img/party/bg-mountains.jpg);
					background-size: 100%;
					background-position: center -250px;
					perspective: ${W}px;

				}

				platformworld{
					transform-origin: center bottom;
					width: ${W}px;
					height: ${W}px;
					position: absolute;
					left: 0px;
					right: 0px;
					bottom: 0px;
					margin: auto;
					transform: rotateX(60deg);
					z-index: 10;
					transform-style:preserve-3d;
					border-radius: 100%;
					background: rgba(150,105,50,1);
					border-bottom: 150px solid rgba(100,55,0,1);
				}

				platformball{
					display: block;
					position: absolute;
					transform-style:preserve-3d;
					top: 0px;
					left: 0px;
				}

				platformtarget{
					width: 150px;
					height: 150px;
					box-sizing: border-box;
					border: 20px solid red;
					border-radius: 100%;
					display: block;
					position: absolute;
					transform: translate(-50%, -50%);
				}

				platformballball
				{
					width: 400px;
					height: 400px;
					background: red;
					border-radius: 100%;
					display: block;
					position: absolute;
					transform: translate(-50%, -100%);
				}

				platformavatar{
					display: block;
					position: absolute;
					transform-style:preserve-3d;
				}

				platformanchor{
					display: block;
					position: absolute;
					transform-style:preserve-3d;
				}

				platformanchor:before{
					content:" ";
					width: 200px;
					height: 100px;
					background: black;
					display: block;
					position: absolute;
					transform: translate(-50%, -50%);
					border-radius: 100%;
					opacity: 0.3;
				}

				platformcenter{
					display: block;
					position: absolute;
					top: 50%;
					left: 50%;
					transform-style:preserve-3d;
				}

				
				platformball[n='0'] platformballball { background:red; }
				platformball[n='1'] platformballball { background:blue; }
				platformball[n='2'] platformballball { background:limegreen; }
				platformball[n='3'] platformballball { background:#dd00ff; }
				platformball[n='4'] platformballball { background:#ff6600; }
				platformball[n='5'] platformballball { background:#ffbb00; }

				platformball[n='0'] platformtarget { border-color:red; }
				platformball[n='1'] platformtarget { border-color:blue; }
				platformball[n='2'] platformtarget { border-color:limegreen; }
				platformball[n='3'] platformtarget { border-color:#dd00ff; }
				platformball[n='4'] platformtarget { border-color:#ff6600; }
				platformball[n='5'] platformtarget { border-color:#ffbb00; }

			</style>`);
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<platformgame>').appendTo(self.$el);
	let $world = $('<platformworld>').appendTo($game);
	let $center = $('<platformcenter>').appendTo($world);

	let meeps = [];
	for(var i=0; i<PLAYER_COUNT; i++){

		meeps[i] = new MeepBall(i);
		meeps[i].$el.appendTo($center);
		
		
	}

	let hud = new PartyHUD(meeps);
	hud.$el.appendTo($game);

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	let speed = 0.05;
	function step(){
		resize();

		// step > collide > redraw

		for(var m in meeps) if(!meeps[m].dead) meeps[m].step();
		for(var m in meeps) if(!meeps[m].dead) for(var n in meeps) if( m != n && !meeps[n].dead ) meeps[m].collide( meeps[n] );
		for(var m in meeps) if(!meeps[m].dead) meeps[m].redraw();
			
	}

	setInterval(step,1000/FPS);

	$(document).on('mousemove',function(e){
		
		let o = $game.offset();
		let x = (e.pageX - o.left)/scale;
		let y = (e.pageY - o.top)/scale;

		x = (x%W)/W;
		y = (y/H);
		
		meeps[0].x = (x*2-1)*(W/2);
		meeps[0].y = (y*2-1)*(W/2);
	})

	self.setPlayers = function(p){
		for(var m in meeps){

			meeps[m].x = ((p[m].px/100)*2-1)*(W/2);
			meeps[m].y = (((100-p[m].pz)/100)*2-1)*(W/2);
		
		}
	}
}