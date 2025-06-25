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
			self.meep.grabbed = true;
		}
	}

	let Meep = function(n,sx,sy){
		let self = this;
		self.$el = $('<clawmeep>');
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

	function initClaw(){
		let nClaw = Math.floor( Math.random()*meeps.length );
		nClaw = 0;
		$(claw).delay(200).animate({
			x:meeps[nClaw].x,
		}).delay(200).animate({
			h:1.25,
		},{
			duration: 800,
			complete: function(){
				claw.grab(meeps[nClaw]);
			}
		}).delay(200).animate({
			h:0.2,
		}).delay(200).animate({
			x:0,
		})
	}

	initGame(6);

	function step(){
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
}