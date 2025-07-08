window.CoconutClimbersGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const DISTANCE = 5;
	const TREE = H*DISTANCE + H/2;
	const THICC = 70;
	const COCONUT = 100;
	
	let CoconutPlayer = function(n,ax){

		

		const MIN = 0.4;
		const MULT = 12; // essentially saying I only need 1/6th of the room width
		const HMEEP = 350;
		const PHMEEP = HMEEP/H;

		let self = this;
		self.$el = $('<coconutplayer>');

		self.countSlipping = 0;
		self.ax = ax;
		self.px = ax;
		self.ay = 0;
		self.py = undefined;
		self.pyWas = undefined;
		self.ticksComplete = undefined;

		let ticksElapsed = 0;

		let meep = new PartyMeep(n);
		meep.$el.appendTo(self.$el);
		meep.$shadow.hide();
		meep.$el.css({
			bottom:'150px',
		});

		meep.$handLeft.appendTo(self.$el).css({top:'auto',left:-THICC/2+'px'});
		meep.$handRight.appendTo(self.$el).css({top:'auto',left:THICC/2+'px'});

		let $tree = $('<coconuttree>').appendTo(self.$el);

		$('<coconut>').appendTo($tree).css({ top:'60px', left:130 + 'px' });
		$('<coconut>').appendTo($tree).css({ top:'80px', left:60 + 'px' });
		$('<coconut>').appendTo($tree).css({ top:'100px', left:-100 + 'px' });

		for(var i=0; i<5; i++){
			let $frond = $('<coconutfrond>').appendTo($tree).css({
				transform:'rotate('+(-180+(i*40))+'deg)',
			})
		}

		let coconuts = [];
		self.addCoconut = function(iSide){

			if(self.ticksComplete != undefined) return;

			coconuts.push({
				iSide:iSide,
				stepsRemaining:FPS*2, 
				stepsTotal:FPS*2,
				ay:Math.min( self.ay, DISTANCE ),
				$el:$('<coconut>').appendTo(self.$el).css({ left:iSide*120 + 'px' }),
			});
		}

		self.step = function(){

			ticksElapsed++;

			for(var c in coconuts){
				if(!coconuts[c].hasHit){
					coconuts[c].stepsRemaining--;
					let progress = (coconuts[c].stepsRemaining/coconuts[c].stepsTotal);
		
					// dy allows the coconut to come closer because we are climbing toward us
					// dividing by 3 means we can climb without having a profound impact on the height of the coconut
					let dy = (coconuts[c].ay-self.ay)/3; 

					coconuts[c].py = progress + dy;

					coconuts[c].$el.css({
						bottom: coconuts[c].py * H + 'px',
					});
				}
			}

			let ox = (self.px - self.ax) * MULT;
			ox = Math.max( -1, Math.min(1, ox));

			let dir = ox > 0?1:-1;
			if(Math.abs(ox)<MIN) ox = MIN * dir;

			meep.$el.css({
				left: ox*10 + 'px',
				transform: 'rotate('+ox*15+'deg)',
			})

			let $handLead = (dir>0)?meep.$handLeft:meep.$handRight;
			let $handFollow = (dir>0)?meep.$handRight:meep.$handLeft;
			
			$handLead.css({
				bottom: (1-self.py) * H + 'px',
			})

			$handFollow.css({
				bottom: (1-self.py) * H - 100 + 'px',
			})

			let oy = 0;
			if(self.countSlipping <= 0 && self.pyWas != undefined){
				self.dy = self.py - self.pyWas;
				if(self.dy>0) self.ay += self.dy;

				if(self.ay > DISTANCE){
					self.ticksComplete = ticksElapsed;
					self.ay = DISTANCE;
				}

				oy = (self.py * 2)-1;
			} else if(self.countSlipping>0){
				self.countSlipping--;
				self.ay -= 0.005;
				if(self.ay<0) self.ay = 0;
			}

			let my = 0.1+oy*0.1;
			meep.$el.css({
				bottom: (my*H) + 'px',
			})

			$tree.css({
				bottom: -self.ay * H + 'px',
			})

			for(var c in coconuts){

				if(!coconuts[c].hasHit && self.ticksComplete == undefined){
					let dy = coconuts[c].py - (my + PHMEEP);
					if(dy<0 && dy>-0.2 && coconuts[c].iSide == dir){
						coconuts[c].hasHit = true;

						self.countSlipping = FPS/2;

						coconuts[c].$el.css({
							transform: 'rotate('+coconuts[c].iSide*60+'deg)',
						}).animate({
							left: coconuts[c].iSide * 200,
							bottom: coconuts[c].py * H + 100 + 'px',
						},{
							duration: 200,
							easing: 'linear',
						}).animate({
							left: coconuts[c].iSide * 300,
							bottom: -100,
						},{
							duration: 500,
						})
					}
				}
			}

			self.pyWas = self.py;
		}
	}

	if( !CoconutClimbersGame.init ){
		CoconutClimbersGame.init = true;

		$("head").append(`
			<style>
				coconutclimbersgame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background-image: url(./proto/img/party/bg-beach.avif);
					background-size: 33.3% 100%;
					background-position: bottom center;
				}

				coconutclimbersgame:before{
					content:"";
					display:block;
					width: 100%:
					height: 100%;
					position: absolute;
					inset: 0px;
					margin: auto;
					box-sizing: border-box;
					background: linear-gradient(to top, #28A9E1, transparent);
				}

				coconut{
					display: block;
					position: absolute;
				}

				coconut:after{
					content: "";
					display: block;
					position: absolute;
					left: ${-COCONUT/2}px;
					bottom: ${-COCONUT/2}px;
					width: ${COCONUT}px;
					height: ${COCONUT}px;
					background: #D59563;
					border-radius: 100% 0px ${COCONUT}px ${COCONUT}px;
					box-shadow: inset 0px 0px 30px #a86939, 0px 10px 20px rgba(0,0,0,0.5);
					transform: rotate(-45deg);

				}

				coconutplayer{
					display: block;
					position: absolute;
					bottom: 0px;
				}

				coconuttree{
					display: block;
					position: absolute;
					bottom: 0px;
					height: ${TREE}px;
					width: 0px;
				}

				coconuttree:before{
					content: "";
					display: block;
					position: absolute;
					height: 100%;
					width: ${THICC}px;
					left: ${-THICC/2}px;
					bottom: 0px;
					background: repeating-linear-gradient(
					  #a86939, #D59563 300px
					);
					box-shadow: 2px 0px 20px black;
				}

				coconutfrond{
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
					z-index: 1;
				}

				coconutfrond:after{
					content:"";
					display: block;
					position: absolute;
					width: 350px;
					height: 100px;
					background: linear-gradient( to right, green, green, #69C159 );
					left: -50px;
					top: -50px;
					border-radius: 50px 100% 0px 50px;
				}

			<style>
		`)
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<coconutclimbersgame>').appendTo(self.$el);

	let meeps = [];
	let countMeeps = undefined;
	function initGame(count){
		countMeeps = count;
		for(var i=0; i<count; i++){
			let px = (i+1) * 1/(count+1);
			meeps[i] = new CoconutPlayer(i,px);
			meeps[i].$el.css({
				'left':W + px * W + 'px',
			}).appendTo($game);
		}
	}

	let hud = new PartyHUD('#FDC972');
	hud.$el.appendTo($game);

	initGame(3);

	let queue = [];
	let nStep = 0;

	function step(){
		nStep++;

		let stepPerCoconut = FPS;

		if(nStep%stepPerCoconut==9){
			if(!queue.length){
				while(queue.length<countMeeps) queue.push(queue.length);
				shuffleArray(queue);
			}
			let iMeep = queue.pop();
			meeps[iMeep].addCoconut( Math.random()>0.5?1:-1);
		}

		for(var m in meeps){
			meeps[m].step();
		}

		resize();
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].px = p[m].px;
			meeps[m].py = p[m].py;
			meeps[m].r =  {W:p[m].rW, X:p[m].rX, Y:p[m].rY, Z:p[m].rZ};
		}
	}

	let interval = setInterval(step,1000/FPS);
}