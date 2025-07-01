window.ClawGame = function(){

	let Claw = function(sx,sy){
		let self = this;
		self.$el = $(`
			<clawgameclaw>
				<clawextendo>
					<clawrope></clawrope>
					<clawhat></clawhat>
				<clawextendo>
				<clawclamp></clawclamp>
			</clawgameclaw>
			`);
		self.x = 1;
		self.y = 0.1;
		self.h = 0.2;

		self.redraw = function(){
			self.$el.css({
				left: self.x * sx + 'px',
				top: self.y * sy + 'px',
			})

			self.$el.find('clawextendo').css({
				height:self.h * sy + 'px',
			})

			if(self.meep){
				self.meep.x = self.x;
				self.meep.y = self.y + self.h;
				self.meep.redraw();
			}
		}

		self.grab = function(meep) {
			self.meep = meep;
			meep.setClaw(true);
		}
	}

	let Meep = function(n,sx,sy){

		// how many entries to track for min and max
		// 20 is one seconds worth
		const SAMPLING = 20;
		const RANGE = 0.1;

		let self = this;
		self.$el = $('<clawmeep>');
		self.$target = $('<clawtarget>');

		let isClaw = false;

		let meep = new PartyMeep(n);
		meep.setHeight(350);
		meep.$el.appendTo(self.$el);
		meep.$el.css({
			bottom: '-350px',
		})

		//actual coords
		self.x = 0;
		self.y = 0.5;

		// target coords
		self.ty = 0;
		self.tx = 0;

		// history of y positions
		self.history = [];
		self.min = 0;
		self.max = 0;

		self.redraw = function(){

			self.$el.css({
				top: self.y * sy + 'px',
				left: self.x * sx + 'px',
			})

			self.$target.css({
				left: self.tx * sx + 'px',
				top: -self.ty * sy + 'px',
				opacity: isClaw?1:0,
			})

			if(self.r){
				let yaw = getYaw(self.r);
				meep.$head.css({
					transform: `rotate(${yaw}deg)`
				})
			}



			if(isClaw){



				//self.ty = Math.max( -0.4, Math.min( self.ty, 0.6 )); // very reasonable upper and lower limits
				self.history.push( self.ty );

				while(self.history.length>20*6) self.history.shift();

				let sorted = self.history.concat();

				sorted.sort();

				self.min = sorted[ Math.floor(sorted.length/3) ];
				self.max = self.min + RANGE;

				/*let min = 0;
				let max = 0;

				let iEnd = self.history.length-1;
				let count = Math.min(SAMPLING,self.history.length);

				for(var i=0; i<count; i++){
					min += self.history[i];
					max += self.history[iEnd-i];
				}

				// add 1 here to max all values positive
				self.max = max/count;
				self.min = min/count;

				if(self.ty>self.max) self.max = self.ty;
				if(self.ty<self.min) self.min = self.ty;

				let dif = self.max - self.min;
				if(dif<0.05){
					//force them apart slightly
					self.min -= 0.03;
					self.max += 0.03;
				} 

				if(dif>0.1){
					self.min = (self.min + self.max)/2 - 0.05;
					self.max = (self.min + self.max)/2 + 0.05;
				}*/

			}
		}

		self.getNormalisedY = function(){
			return (self.ty - self.min) / (self.max - self.min);
		}

		self.setClaw = function(b){

			isClaw = b;

			meep.$body.hide();
			meep.$shadow.hide();
			meep.$legs.hide();
			meep.$handLeft.css({top:0.15*sy});
			meep.$handRight.css({top:0.15*sy});
		}

		function getYaw(q)
	    {
	        let x2 = q.X * q.X;
	        let y2 = q.Y * q.Y;
	        return Math.atan2(2 * q.Y * q.W - 2 * q.Z * q.X, 1 - 2 * y2 - 2 * x2);
	    }
	}

	const W = 1600;
	const H = 1000;

	if( !ClawGame.init ){
		ClawGame.init = true;

		$("head").append(`
			<style>
				clawgame{
					display: block;
					position: absolute;
					left: 0px;
					top: 0px;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: url(./proto/img/party/bg-toys.png);
					background-size: 33.3%;

					--shadow: 0px 5px 10px black;
				}

				clawgame:before{
					content:"";
					position: absolute;
					display: block;
					left: 0px;
					top: 0px;
					right: 0px;
					bottom: 0px;
					background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7));
				}

				clawbar{
					width: 100%;
					height: 30px;
					position: absolute;
					top: 12.5%;
					background: white;
					box-shadow: var(--shadow);
					transform: translateY(-50%);

				}

				clawgameclaw{
					position: absolute;
					
				}

				clawrope{
					width: 20px;
					background: white;
					position: absolute;
					top: 0px;
					left: -10px;
					height: 100%;
					box-shadow: var(--shadow);
				}

				clawclamp{
					width: 150px;
					background: white;
					position: absolute;
					top: -35px;
					left: -75px;
					height: 70px;

					border-radius: 10px;
					box-shadow: var(--shadow);
					background: #999;
				}

				clawanchor{
					position: absolute;
					left: 0px;
					top: 0px;
				}

				clawextendo{
					position: absolute;
					top: 0px;
					height: 300px;
				}

				clawhat{
					position: absolute;
					display: block;
					bottom: 0px;
					width: 80px;
					background: #999;
					left: -40px;
					height: 30px;
					box-shadow: var(--shadow);
					border-radius: 30px 30px 0px 0px;
				}

				clawmeep{
					position: absolute;
					display: block;
					background: red;
				}

				clawtarget{
					width: 50px;
					height: 50px;
					box-sizing: border-box;
					border: 10px solid red;
					transform: translate(-50%, -50%);
					display: block;
					position: absolute;
					border-radius: 100%;

				}


			</style>`);
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<clawgame>').appendTo(self.$el);
	$('<clawbar>').appendTo($game);
	let $anchor = $('<clawanchor>').appendTo($game);

	let audio = new AudioContext();
	audio.add('machine','./proto/audio/party/sfx-machine.mp3',0.1,true);

	const YCLAW = 0.12;

	let claw = new Claw(W,H);
	claw.y = YCLAW;
	claw.x = 1;
	claw.$el.appendTo($anchor);
	
	let meeps = [];
	let hud = new PartyHUD();
	hud.$el.appendTo($game);
	//hud.initPlayerCount(initGame);

	function initGame(count){
		for(var i=0; i<count; i++){
			meeps[i] = new Meep(i,W,H);
			meeps[i].x = 1 + 1/(count+1) * (i+1);
			meeps[i].y = 0.75;
			meeps[i].$el.appendTo($anchor);
			meeps[i].redraw();

			meeps[i].$target.appendTo($anchor);
		}

		claw.$el.appendTo($anchor);

		initClaw();
	}

	let nClawPlayer = undefined;
	let isPlayMode = false;

	function initClaw(){
		nClawPlayer = Math.floor( Math.random()*meeps.length );
		nClawPlayer = 0;
		$(claw).delay(200).animate({
			x:meeps[nClawPlayer].x,
		}).delay(200).animate({
			h:0.65,
		},{
			duration: 800,
			complete: function(){
				claw.grab(meeps[nClawPlayer]);
			}
		}).delay(200).animate({
			h:0.2,
		},{
			complete:initPlay
		})
	}

	function initPlay(){
		isPlayMode = true;
	}

	initGame(6);

	const CLAWSPEED = 0.03;
	function step(){
		if(isPlayMode){

			let isClawMoving = false;

			let dx = claw.x - meeps[nClawPlayer].tx;
			if(Math.abs(dx)>0.04){
				let dir = dx>0?-1:1;
				claw.x += CLAWSPEED * dir;
				isClawMoving = true;
			}

			// 1- because we're going down. not up.
			let yNorm = meeps[nClawPlayer].getNormalisedY();

			if(yNorm<0) yNorm = 0;
			if(yNorm>1) yNorm = 1;

			//let yPos = meeps[nClawPlayer].ty;
			
			let hTarget = 0.1 + yNorm * 0.5;

			if(claw.h < (hTarget-0.03) ){
				claw.h += 0.025;
				isClawMoving = true;
			} else if(claw.h > (hTarget+0.03) ){
				claw.h -= 0.025;
				isClawMoving = true;
			} 

		

			if(isClawMoving) audio.play('machine');
			else audio.stop('machine');
		}
		claw.redraw();
		resize();
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	const FPS = 20;
	let interval = setInterval(step,1000/FPS);

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].tx = 1 + p[m].px;
			meeps[m].ty = p[m].py;
			meeps[m].r =  {W:p[m].rW, X:p[m].rX, Y:p[m].rY, Z:p[m].rZ};
		}
	}
}