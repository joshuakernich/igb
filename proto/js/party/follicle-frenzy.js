



window.FollicleFrenzyGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 50;
	const PLAYER_COUNT = 6;
	const GRIDSIZE = 15;

	const MAP = [
		    "      00000000      ",
		    "    000000000000    ",
		    "  0000000000000000  ",
		    "  0000000000000000  ",
		    " 00     000000   00 ",
		    "00       000      00",
		    "00        00      00",
		    "00          0     00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00   0000000000   00",
		    "00 00000000000000 00",
		    "0000            0000",
		    "000              000",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00                00",
		    "00       00       00",
		    " 00     0000     00 ",
		    "  00000000000000000 ",
		    "  0000000000000000  ",
		    "    000000000000    ",
		    "       000000       "
		]

	if(!FollicleFrenzyGame.didInit){
		FollicleFrenzyGame.didInit = true;

		$("head").append(`
			<style>
				folliclegame{
					display: block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					
					background: url(./proto/img/party/bg-village.png);
					background-size: 33.3% 100%;
					background-position: center;
					perspective: ${W*3}px;
				}

				folliclearm{
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;	
					border-top: 30px solid white;
					border-right: 30px solid white;
					box-sizing: border-box;
					border-top-right-radius: 100%;
					transform-origin: top left;
				}

				folliclehand{
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
				}

				folliclefist{
					display: block;
					position: absolute;
					top: 50px;
					left: -50px;	
					width: 100px;
					height: 100px;
					background: white;
					border-radius: 40px;
				}

				follicleshaver{
					display: block;
					position: absolute;
					width: 50px;
					height: 180px;
					background: red;
					top: 0px;
					left: -25px;
					border-radius: 0px 0px 15px 15px;
					box-sizing: border-box;

					border-top: 10px groove white;
				}

				folliclerow{
					display: block;
				}

				folliclecell{
					display: inline-block;
					width: ${GRIDSIZE}px;
					height: ${GRIDSIZE}px;
				}

				folliclewall{
					width: 33.333%;
					display: inline-block;
					width: ${W}px;
					height: ${H}px;
					text-align: center;
					position: relative;
				}

				folliclemeep{
					display: block;
					position: absolute;
					transform: rotateX(30deg);
					transform-origin: top center;
				}

				folliclebody{
					display: block;
					background: white;
					border-radius: 25%;
					position: absolute;
					width: 60%;
					height: 300px;
					top: 100%;	
					left: 20%;	
						
				}

				follicleface{
					display: inline-block;
					background: white;
					border-radius: 240px;
					position: relative;
				}

				folliclehair{
					width: 100%;
					height: 100%;
					display:block;
					position: relative;
				}

				folliclehair:after{
					content:"";
					width: 160%;
					height: 300%;
					background: gray;
					display:block;
					position: absolute;
					top: -20%;
					left: -30%;
					border-radius: 100% 100% 100% 0px;
					box-sizing: border-box;
				}

				folliclehair[dir='-1']{
					transform: rotate(30deg);
				}

				folliclehair[dir='1']{
					transform: rotate(-30deg);
				}

				folliclehair[dir='1']:after{
					border-radius: 100% 100% 0px 100%;
				}

				folliclemouth{
					width: 70px;
					height: 40px;
					background:#687078;
					position: absolute;
					left: 50%;
					bottom: 26%;
					display: block;
					border-radius: 0px 0px 100% 100%;
					transform: translateX(-50%);
				}


				follicleeye{
					width: 30px;
					height: 55px;
					background:#687078;
					position: absolute;
					left: 28%;
					top: 38%;
					display: block;
					border-radius: 100%;
				}

				follicleeye:last-of-type{
					left: auto;
					right: 28%;
				}

				folliclemeep[n='0'] folliclehair:after { background:red; }
				folliclemeep[n='1'] folliclehair:after { background:blue; }
				folliclemeep[n='2'] folliclehair:after { background:#33CD32; }
				folliclemeep[n='3'] folliclehair:after { background:#DD00FF; }
				folliclemeep[n='4'] folliclehair:after { background:#FF6600; }
				folliclemeep[n='5'] folliclehair:after { background:#FFBB00; }

				folliclemeep[n='0'] follicleshaver { background:red; }
				folliclemeep[n='1'] follicleshaver { background:blue; }
				folliclemeep[n='2'] follicleshaver { background:#33CD32; }
				folliclemeep[n='3'] follicleshaver { background:#DD00FF; }
				folliclemeep[n='4'] follicleshaver { background:#FF6600; }
				folliclemeep[n='5'] follicleshaver { background:#FFBB00; }

				follicleguide{
					width: 300px;
					height: 300px;
					position: absolute;
					top: 30%;
					left: 50%;
					transform: translate(-50%, -50%) rotate(-5deg);
					background: white;
					box-shadow: 0px 5px 20px black;
					background: #ddd;

					border: 20px solid white;
				}

				follicleguide follicleface{
					left: 50%;
					top: 50%;
					transform: translate(-50%, -50%) scale(0.5);

				}


			</style>`);
	}

	const FollicleGuide = function() {
		let self = this;
		self.$el = $('<follicleguide>');

		new FollicleFace().$el.appendTo(self.$el);
	}

	const FollicleFace = function() {

		let self = this;
		self.pw = (GRIDSIZE * MAP[0].length)/W;
		self.$el = $('<follicleface>');

		$('<follicleeye>').appendTo(self.$el);
		$('<follicleeye>').appendTo(self.$el);
		$('<folliclemouth>').appendTo(self.$el);

		for(var y in MAP){
			let $row = $('<folliclerow>').appendTo(self.$el);
			for(var x in MAP[y]){
				let $cell = $('<folliclecell>').appendTo($row);
				if(MAP[y][x]=='0') $('<folliclehair>').appendTo($cell).attr('dir',(x>=MAP[y].length/2)?1:-1).attr('x',x).attr('y',y);
			}
		}

		self.shaveAt = function(ox,oy){
			let gx = (ox*W)/GRIDSIZE;
			let gy = (oy*H)/GRIDSIZE;

			for(var y=0; y<MAP.length; y++){
				for(var x=0; x<MAP[y].length; x++){
					let dx = gx-x;
					let dy = gy-y;
					let d = Math.sqrt(dx*dx + dy*dy);
					if(d<3){
						let $hair = self.$el.find('folliclehair[x='+x+'][y='+y+']');
						if(!$hair.hasClass('dead')){
							let rx = - 100 + Math.random()*200;
							$hair.addClass('dead');
							$hair.animate({ top:-50, left:rx*0.1 },200).animate({top:1000,left:rx },1000);
						}
					}
				}
			}
		}
	}

	const FollicleMeep = function(n){

		let self = this;
		self.score = 0;
		self.n = n;
		self.ax = 0.5;
		self.ay = 0.5;
		self.px = 0.5;
		self.py = 0.5;

		self.$el = $('<folliclemeep>').attr('n',n);

		$('<folliclebody>').appendTo(self.$el);

		let face = new FollicleFace();
		face.$el.appendTo(self.$el);

		let $hand = $(`
			<folliclehand>
				<follicleshaver></follicleshaver>
				<folliclefist></folliclefist>
			</folliclehand>
		`).appendTo(self.$el);

		self.redraw = function(){

			self.$el.css({
				left: W*self.wall + self.ax*W + 'px',
				top: self.ay*H + 'px',
			});

			if(self.wall==1){
				let ox = self.px - self.ax;
				let oy = self.py - self.ay;

				let r = ox>face.pw/2?-30:30;

				$hand.css({
					left: ox*W + 'px',
					top: oy*H + 'px',
					transform: 'rotate('+r+'deg)',
				});

				face.shaveAt(ox,oy);
			}
		}
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<folliclegame>').appendTo(self.$el);

	let meeps = [];
	function initGame(count){
		for(var i=0; i<count; i++){
			meeps[i] = new FollicleMeep(i);
			meeps[i].wall = 0;
			meeps[i].$el.appendTo( $game );
		}

		initNextRound();
	}

	let iRound = -1;
	function initNextRound(){
		iRound++;
		for(var i=0; i<2; i++){
			meeps[iRound+i].wall = 1;
			meeps[iRound+i].ax = 0.25 + 0.5*i - 0.1;
			meeps[iRound+i].ay = 0.3;
		}

		let guide = new FollicleGuide();
		guide.$el.appendTo($game);
	}

	initGame(6);
	

	let hud = new PartyHUD();
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
		for(var m in meeps){
			meeps[m].redraw();

			/*meeps[m].$el.css({
				left: meeps[m].wall*W + meeps[m].x + 'px',
			})*/
		}
	}
	


	setInterval(step,1000/FPS);

	/*$(document).on('mousemove',function(e){
		
		let o = $game.offset();
		let x = (e.pageX - o.left)/scale;
		let y = (e.pageY - o.top)/scale;

		x = x/W;
		y = y/H;
		z = x;

		//meeps[0].wall = Math.floor(x);

		meeps[0].x = (x%1)*W;
		meeps[0].y = (y)*H;
		meeps[0].z = (z%1)*W;

	})*/

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].px = p[m].px;
			meeps[m].py = (1-p[m].pz);
			//meeps[m].z = p[m].pz*W;
		}
	}
}