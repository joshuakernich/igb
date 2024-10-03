Adventure = function(){

	if(!Adventure.didInit){

		Adventure.didInit = true;

		let css = {
			'adventuregame':{
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'right':'0px',
				'top':'0px',
				'bottom':'0px',
				'background-image':'url(./proto/img/bg-forest.jpg)',
				'background-size':'28%',
			},

			'adventureplatform':{
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'right':'0px',
				
				'bottom':'0px',
				'height':'3vw',
				'background-image':'url(./proto/img/platform-grass.png)',
				'background-size':'15%',
			},

			'adventureanchor':{
				'display':'block',
				'position':'absolute',
				'left':'50%',
				'bottom':'0px',
				'width':'0px',
			},

			'adventurearena':{
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'bottom':'0.8vw',
				'width':'0px',
			},

			'adventureplayer':{
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'bottom':'0px',
				'width':'3vw',
				'height':'3vw',
				'background':'black',
				'transform':'translateX(-50%)',
				'text-align':'center',
				'color':'red',
				'font-size':'2vw',
				'line-height':'2vw',
				'font-family':'serif',
				'animation':'throb 0.4s infinite'
			},

			'adventureplayer:before':{
				'content':'". ."',
			},

			'adventurecursor':{
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'bottom':'2vw',
				'width':'2vw',
				'height':'2vw',
				'transform':'translate(-50%,-50%)',
				
				'box-sizing':'border-box',
				'border':'0.2vw solid red',
				'border-radius':'1vw',
			},

			'adventurebarrier':{
				'display':'block',
				'position':'absolute',
				'left':'0px',
				'bottom':'0px',
				'width':'3vw',
				'height':'5vw',
				'background':'black',
				'transform':'translateX(-50%)',
				'text-align':'center',
				'color':'white',
				'font-size':'2vw',
				'line-height':'3.5vw',
				'font-family':'serif',
			},

			'adventurebarrier:before':{
				'content':'"?"',
			},
		}

		$("head").append('<style>'+Css.of(css)+'</style>');
	}

	const PLAYERCOUNT = 1;

	let self = this;
	self.$el = $('<igb class="adventurewrapper">');
	let $game = $('<adventuregame>').appendTo(self.$el);

	let $anchor = $('<adventureanchor>').appendTo($game);
	let $arena = $('<adventurearena>').appendTo($anchor);
	let $platform = $('<adventureplatform>').appendTo($game);

	$(`
		<audio autoplay controls loop>
			<source src="./proto/audio/scenery-125577.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0].volume = 0.5;


	let players = [];
	for(var i=0; i<PLAYERCOUNT; i++){
		let player = {x:0,y:0,tx:0,ty:0};
		player.$cursor = $('<adventurecursor>').appendTo($anchor);
		player.$el = $('<adventureplayer>').appendTo($arena);
		players[i] = player;
	}

	const W2 = 33.3/2;
	const H2 = (33.3/16*10)/2;

	let barriers = [{x:1}];
	for(var b in barriers) barriers[b].$el = $('<adventurebarrier>').appendTo($arena).css({left:barriers[b].x*W2+'vw'});
	

	

	self.setPlayers = function(p){
		for(var i in players){
			players[i].tx = p[i].X;
			players[i].ty = p[i].Z;
			players[i].$cursor.css({left:players[i].tx*W2+'vw',bottom:H2+players[i].ty*H2+'vw'})
		}
	}

	let ox = 0;
	let walk = 0.01;
	let tolerance = 0.02;
	function tick(){

		let ax = 0;
		for(var i in players){
			let px = players[i].x - ox;
			if(px<(players[i].tx+tolerance)) players[i].x += walk;
			if(px>(players[i].tx-tolerance)) players[i].x -= walk;
			players[i].$el.css({left:players[i].x*W2+'vw'});
			ax += players[i].x;
		}

		let oxNew = ax/players.length;
		let dx = oxNew - ox;
		if(dx>0.3) ox += walk;
		if(dx<-0.3) ox -= walk;

		$arena.css({left:-ox*W2+'vw'});
		$platform.css({'background-position-x':-ox*W2+'vw'});
		$game.css({'background-position-x':-ox*W2*0.2+'vw'});
	}

	setInterval(tick,1000/50);

	self.$el.on('mousemove',function(e){
		let px = e.pageX/$(document).innerWidth()*6-3;
		self.setPlayers([{X:px,Z:0}]);
	});
}