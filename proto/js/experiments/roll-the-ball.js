window.RollTheBall = function(){

	let W = 1728;
	let H = 1080;
	let ball = {d:500,x:W*0.25};
	let dude = {w:80,h:300,x:W*0.75,y:H};
	let fps = 50;

	let css = {
		'rollinggame':{
			display:'block',
			position:'relative',
			width:W+'px',
			height:H+'px',
			'transform-origin':'top left',
		},

		'rollingball':{
			display:'block',
			position:'absolute',
			width:ball.d+'px',
			height:ball.d+'px',
			background:'white',
			left:'0px',
			bottom:'0px',
			transform:'translate(-50%,-50%)',
			'border-radius':ball.d/2+'px',
		},

		'rollingavatar':{
			display:'block',
			position:'absolute',
			width:dude.w+'px',
			height:dude.h+'px',
			background:'white',
			left:'0px',
			
			transform:'translate(-50%,-100%)',
			'border-radius':dude.w/2+'px',
		},
	}

	$("head").append('<style>'+Css.of(css)+'</style>');

	let self = this;
	self.$el = $('<igb>');

	$('<igbside>').appendTo(self.$el);
	let $center = $('<igbside>').appendTo(self.$el);
	$('<igbside>').appendTo(self.$el);

	let $game = $('<rollinggame>').appendTo($center);
	let $ball = $('<rollingball>').appendTo($game);
	let $dude = $('<rollingavatar>').appendTo($game);
	let wWas = 0;
	function tick(){
		let wScreen = $center.width();
		if(wScreen != wWas){
			$game.css('transform','scale('+wScreen/W+')');
			wWas = wScreen;
		}

		let dx = dude.x - ball.x;
		let oy = 0;

		if(Math.abs(dx)<ball.d/2){
			oy = -ball.d/2 - Math.sqrt( ball.d/2*ball.d/2 - dx*dx );
			ball.x += dx*0.03;
		}

		$ball.css({left:ball.x+'px',top:H-ball.d/2+'px'});
		$dude.css({left:dude.x+'px',top:dude.y+oy+'px'});
	}

	let interval;
	
	self.turnOnOff = function(b){
		clearInterval(interval);
		if(b) interval = setInterval(tick,1000/fps);
	}

	$game.on('mousemove',function(e){
		self.setPlayers([{px:e.offsetX/W*100}]);
	});

	let players = [];
	self.setPlayers = function(p){
		players = p;
		players.length = 1;
		dude.x = players[0].px/100*W;
		
	}

	self.setPlayers([{px:25}]);

	self.turnOnOff(true);
}