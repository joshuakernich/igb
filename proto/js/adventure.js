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

			'adventurearena':{
				'display':'block',
				'position':'absolute',
				'left':'50%',
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
		}

		$("head").append('<style>'+Css.of(css)+'</style>');
	}

	const PLAYERCOUNT = 1;

	let self = this;
	self.$el = $('<igb class="adventurewrapper">');
	let $game = $('<adventuregame>').appendTo(self.$el);

	let $arena = $('<adventurearena>').appendTo($game);
	let $platform = $('<adventureplatform>').appendTo($game);

	let players = [];
	for(var i=0; i<PLAYERCOUNT; i++){
		let player = {x:0,y:0,tx:0,ty:0};
		player.$cursor = $('<adventurecursor>').appendTo($arena);
		player.$el = $('<adventureplayer>').appendTo($arena);
		players[i] = player;
	}

	const W2 = 33.3/2;
	const H2 = (33.3/16*10)/2;

	self.setPlayers = function(p){
		for(var i in players){
			players[i].tx = p[i].X;
			players[i].ty = p[i].Z;
			players[i].$cursor.css({left:players[i].tx*W2+'vw',bottom:H2+players[i].ty*H2+'vw'})
		}
	}

	function tick(){
		for(var i in players){
			if(players[i].x<players[i].tx) players[i].x += 0.01;
			if(players[i].x>players[i].tx) players[i].x -= 0.01;
			players[i].$el.css({left:players[i].x*W2+'vw'});
		}
	}

	setInterval(tick,1000/50);
}