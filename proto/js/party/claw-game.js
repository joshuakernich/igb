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
		self.x = 0.5;
		self.y = -0.9;
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
		let self = this;
		self.$el = $('<clawmeep>');

		let isClaw = false;

		let meep = new PartyMeep(n);
		meep.setHeight(350);
		meep.$el.appendTo(self.$el);
		meep.$el.css({
			bottom: '-350px',
		})

		self.x = 0;
		self.y = 0.5;

		self.redraw = function(){
			self.$el.css({
				top: self.y * sy + 'px',
				left: self.x * sx + 'px',
			})

			if(!isClaw && self.r){

				let yaw = getYaw(self.r);
				meep.$head.css({
					transform: `rotate(${yaw}deg)`
				})
			}
		}

		self.setClaw = function(b){

			isClaw = b;

			meep.$body.hide();
			meep.$shadow.hide();
			meep.$legs.hide();
			meep.$handLeft.css({top:0.3*sy});
			meep.$handRight.css({top:0.3*sy});
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
					left: 50%;
					top: 50%;
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


			</style>`);
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<clawgame>').appendTo(self.$el);
	$('<clawbar>').appendTo($game);
	let $anchor = $('<clawanchor>').appendTo($game);

	let claw = new Claw(W/2,H/2);
	claw.y = -0.75;
	claw.$el.appendTo($anchor);
	
	let meeps = [];
	let hud = new PartyHUD();
	hud.$el.appendTo($game);
	//hud.initPlayerCount(initGame);

	function initGame(count){
		for(var i=0; i<count; i++){
			meeps[i] = new Meep(i,W/2,H/2);
			meeps[i].x = -1 + 1/(count+1) * (i+1) * 2;
			meeps[i].y = 0.5;
			meeps[i].$el.appendTo($anchor);
			meeps[i].redraw();
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
			h:1.25,
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

	function step(){
		if(isPlayMode){
			claw.x = (claw.x * 10 + meeps[nClawPlayer].tx )/11;
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
			meeps[m].tx = p[m].x;
			meeps[m].ty = p[m].y;
			meeps[m].r =  {W:p[m].rW, X:p[m].rX, Y:p[m].rY, Z:p[m].rZ};
		}
	}
}