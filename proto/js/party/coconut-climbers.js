window.CoconutClimbersGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const DISTANCE = 5;
	const TREE = H*DISTANCE + H/2;
	const THICC = 70;
	
	let CoconutPlayer = function(n,ax){

		const MIN = 0.4;
		const MULT = 12; // essentially saying I only need 1/6th of the room width

		let self = this;
		self.$el = $('<coconutplayer>');



		self.ax = ax;
		self.px = ax;
		self.ay = 0;
		self.py = undefined;
		self.pyWas = undefined;

		let meep = new PartyMeep(n);
		meep.$el.appendTo(self.$el);
		meep.$shadow.hide();
		meep.$el.css({
			bottom:'150px',
		});

		meep.$handLeft.appendTo(self.$el).css({top:'auto',left:-THICC/2+'px'});
		meep.$handRight.appendTo(self.$el).css({top:'auto',left:THICC/2+'px'});

		let $tree = $('<coconuttree>').appendTo(self.$el);

		for(var i=0; i<5; i++){
			let $frond = $('<coconutfrond>').appendTo($tree).css({
				transform:'rotate('+(-180+(i*40))+'deg)',
			})
		}

		self.update = function(){
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

			if(self.pyWas != undefined){
				self.dy = self.py - self.pyWas;
				if(self.dy>0) self.ay += self.dy;

				if(self.ay > DISTANCE) self.ay = DISTANCE;

				let oy = (self.py * 2)-1;

				meep.$el.css({
					bottom: 100 + oy*100 + 'px',
				})

				$tree.css({
					bottom: -self.ay * H + 'px',
				})
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
					  #a86939, #D59563 100px
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

		if(nStep%20){
			if(!queue.length){
				while(queue.length<countMeeps) queue.push(queue.length);
			}
			let iMeep = queue.pop();
		}
		for(var m in meeps) meeps[m].update();

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