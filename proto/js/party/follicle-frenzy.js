

window.FollicleFace = function(GRIDSIZE,n,xAnchor,yAnchor){



	const MAP = [
		'  000000  ',
		' 00000000 ',
		' 0  000 0 ',
		'0    00  0',
		'0        0',
		'0        0',
		'0        0',
		'0        0',
		'0 000000 0',
		'00      00',
		'0        0',
		'0        0',
		' 0  00  0 ',
		' 00000000 ',
		'   0000   ',
	]

	let xCenter = GRIDSIZE * MAP[0].length/2;
	let yArm = ( GRIDSIZE + 8 ) * MAP.length;

	let self = this;
	self.score = 0;
	self.n = n;
	self.$el = $('<folliclehead>').attr('n',n).css({
		left: xAnchor + 'px',
		top: yAnchor + 'px',
	});

	$('<folliclebody>').appendTo(self.$el);
	let $face = $('<follicleface>').appendTo(self.$el);
	
	$('<follicleeye>').appendTo($face);
	$('<follicleeye>').appendTo($face);
	$('<folliclemouth>').appendTo($face);

	for(var y in MAP){
		let $row = $('<folliclerow>').appendTo($face);
		for(var x in MAP[y]){
			let $cell = $('<folliclecell>').appendTo($row);
			if(MAP[y][x]=='0') $('<folliclehair>').appendTo($cell).attr('dir',(x>=MAP[y].length/2)?1:-1).attr('x',x).attr('y',y).css('z-index',100-y);
		}
	}

	let $arm = $('<folliclearm>').appendTo(self.$el).css({
		'left':xCenter,
		'top':yArm,
		'width':'200px',
		'height':'200px',
	})

	let $hand = $(`
		<folliclehand>
			<follicleshaver></follicleshaver>
			<folliclefist></folliclefist>
		</folliclehand>
	`).appendTo(self.$el);

	self.redraw = function(){
		
		let ox = (self.x - xAnchor - xCenter);
		let oy = (self.y - yAnchor - yArm);

		let gx = Math.floor( (self.x - xAnchor)/GRIDSIZE );
		let gy = Math.floor( (self.y - yAnchor)/GRIDSIZE );

		let r = (-ox*0.3);
		if(r>45) r = 45;
		if(r<-45) r = -45;



		$hand.css({
			left: (self.x - xAnchor) + 'px',
			top: (self.y - yAnchor) + 'px',
			transform: 'rotate('+r+'deg)',
			'z-index':100-gy-1, 
		});

		let rx = 100;
		let ry = -100;

		$arm.css({
			width: Math.abs(ox) + rx + 'px',
			height: Math.abs(oy) + ry + 'px',
			'transform':'scale('+(ox>0?1:-1)+','+(oy>0?1:-1)+')',
		})

		//if(n==0) console.log(ox,rx);

		
		if( MAP[gy] && MAP[gy][gx] == 0 ){

			let $hair = self.$el.find('folliclehair[x='+gx+'][y='+gy+']');

			if(!$hair.hasClass('dead')){

				let rx = - 100 + Math.random()*200;

				$hair.addClass('dead');
				$hair.css({'z-index':1000}).animate({ top:-50, left:rx*0.1 },200).animate({top:1000,left:rx },1000);
			}
			
		}
	}

}

window.FollicleFrenzyGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 20;
	const PLAYER_COUNT = 6;
	const GRIDSIZE = 30;

	if(!FollicleFrenzyGame.didInit){
		FollicleFrenzyGame.didInit = true;

		$("head").append(`
			<style>
				folliclegame{
					display: block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					
					background: url(./proto/img/party/bg-barber.jpg);
					background-size: 100%;
					background-position: center;
				}

				folliclearm{
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;	
					z-index: 1;
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

				folliclehead{
					display: block;
					
					position: absolute;
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
					height: 200%;
					background: red;
					display:block;
					position: absolute;
					top: -20%;
					left: -30%;
					border-radius: 100% 100% 100% 0px;
					border: 5px solid rgba(0,0,0,0.1);
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
					width: 40px;
					height: 55px;
					background:#687078;
					position: absolute;
					left: 25%;
					top: 40%;
					display: block;
					border-radius: 20px;
				}

				follicleeye:last-of-type{
					left: auto;
					right: 25%;
				}

				folliclehead[n='0'] folliclehair:after { background:red; }
				folliclehead[n='1'] folliclehair:after { background:blue; }
				folliclehead[n='2'] folliclehair:after { background:#33CD32; }
				folliclehead[n='3'] folliclehair:after { background:#DD00FF; }
				folliclehead[n='4'] folliclehair:after { background:#FF6600; }
				folliclehead[n='5'] folliclehair:after { background:#FFBB00; }

				folliclehead[n='0'] follicleshaver { background:red; }
				folliclehead[n='1'] follicleshaver { background:blue; }
				folliclehead[n='2'] follicleshaver { background:#33CD32; }
				folliclehead[n='3'] follicleshaver { background:#DD00FF; }
				folliclehead[n='4'] follicleshaver { background:#FF6600; }
				folliclehead[n='5'] follicleshaver { background:#FFBB00; }


			</style>`);
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<folliclegame>').appendTo(self.$el);
	
	const PLAYER = [
		{wall:1,x:W*1/3},
		{wall:1,x:W*2/3},
		{wall:0,x:W*2/3},
		{wall:2,x:W*1/3},
		{wall:0,x:W*1/3},
		{wall:2,x:W*2/3},
	]

	let $walls = [];
	for(var i=0; i<3; i++){
		$walls[i] = $('<folliclewall>').appendTo($game);
	}

	let meeps = [];
	for(var i=0; i<PLAYER_COUNT; i++){
		meeps[i] = new FollicleFace(GRIDSIZE,i,PLAYER[i].x - GRIDSIZE * 5, H/4);
		meeps[i].wall = PLAYER[i].wall;
		meeps[i].$el.appendTo( $walls[PLAYER[i].wall] );
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
		for(var m in meeps){
			meeps[m].redraw();

			/*meeps[m].$el.css({
				left: meeps[m].wall*W + meeps[m].x + 'px',
			})*/
		}
	}
	

	setInterval(step,1000/FPS);

	$(document).on('mousemove',function(e){
		
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


	})

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].x = (p[m].px/100)*W;
			meeps[m].y = (p[m].py/100)*H;
			meeps[m].z = (p[m].pz/100)*W;
		}
	}
}