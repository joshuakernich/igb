window.FollicleFace = function(){

	

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

	let self = this;
	self.$el = $('<follicleface>');
	
	$('<follicleeye>').appendTo(self.$el);
	$('<follicleeye>').appendTo(self.$el);
	$('<folliclemouth>').appendTo(self.$el);

	for(var y in MAP){
		let $row = $('<folliclerow>').appendTo(self.$el);
		for(var x in MAP[y]){
			let $cell = $('<folliclecell>').appendTo($row);
			if(MAP[y][x]=='0') $('<folliclehair>').appendTo($cell).attr('dir',(x>=MAP[y].length/2)?1:-1);
		}
	}

}

window.FollicleFrenzyGame = function(){

	const W = 1600;
	const H = 1000;
	const FPS = 20;
	const PLAYER_COUNT = 6;
	const GRIDSIZE = 40;

	if(!FollicleFrenzyGame.didInit){
		FollicleFrenzyGame.didInit = true;

		$("head").append(`
			<style>
				folliclegame{
					display: block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: gray;
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
				}

				follicleface{
					margin: 100px;
					border: 1px soid red;
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
			</style>`);
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<folliclegame>').appendTo(self.$el);
	
	const LAYOUT_PER_PLAYER = [
		[],
		[1],
		[1,1],
		[0,1,2],
		[0,1,1,2],
		[0,0,1,1,2],
		[0,0,1,1,2,2],
	]

	let $walls = [];
	for(var i=0; i<3; i++){
		$walls[i] = $('<folliclewall>').appendTo($game);
	}

	let meeps = [];
	for(var i=0; i<PLAYER_COUNT; i++){
		meeps[i] = new PartyMeep(i);
		meeps[i].wall = LAYOUT_PER_PLAYER[PLAYER_COUNT][i];
		meeps[i].$el.appendTo($game);
		meeps[i].$el.css({
				bottom: '0px',
			})

		meeps[i].face = new FollicleFace(i);
		meeps[i].face.$el.appendTo( $walls[meeps[i].wall] );
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
			meeps[m].setHeight(H-meeps[m].y);
			meeps[m].$el.css({
				left: meeps[m].wall*W + meeps[m].x + 'px',
			})
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