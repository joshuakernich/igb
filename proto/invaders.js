window.InvadersGame = function(){
	
	let W = 1728;
	let H = 1080;
	let ship = 100;
	let fps = 50;
	let shootDelay = 800;
	let r = 5;
	let c = 5;
	let count = r*c;
	let speedMax = 50;
	let speedMin = 1000;

	let css = {
		'invadergame':{
			display:'block',
			position:'relative',
			width:W+'px',
			height:H+'px',
			'transform-origin':'top left',
			background:'black',
		},

		'invader, alien':{
			display:'block',
			position:'absolute',
			width:ship+'px',
			height:ship+'px',
			background:'blue',
			left:'0px',
			bottom:'0px',
			transform:'translateX(-50%)',
		},

		'cannon':{
			display:'block',
			position:'absolute',
			width:20+'px',
			height:50+'px',
			background:'blue',
			left:'40px',
			top:'0px',
		},

		'bullet':{
			display:'block',
			position:'absolute',
			width:20+'px',
			height:50+'px',
			background:'white',
			left:'0px',
			bottom:'0px',
			transform:'translateX(-50%)',
		},
	}

	$("head").append('<style>'+Css.of(css)+'</style>');

	let self = this;
	self.$el = $('<igb>');

	$('<igbside>').appendTo(self.$el);
	let $center = $('<igbside>').appendTo(self.$el);
	$('<igbside>').appendTo(self.$el);

	let $game = $('<invadergame>').appendTo($center);
	let players;
	let $invader = $(`
		<invader>
			<cannon></cannon>
		</invader>
	`).appendTo($game);

	let wWas = 0;
	let charge = 0;
	let bullets = [];
	
	let aliens = [];

	for(var y=0; y<r; y++){
		for(var x=0; x<c; x++){
			aliens.push({x:100 + x*150,y:50 + y*150,$el:$('<alien>').appendTo($game)});
		}
	}

	let dir = 1;
	function tick(){

		wScreen = $center.width();
		if(wScreen != wWas){
			$('invadergame').css('transform','scale('+wScreen/W+')');
			wWas = wScreen;
		}

		charge ++;
		let amt = charge/(shootDelay/fps);


		$invader.find('cannon').css('top',-amt*50+'px');
		if(charge>=shootDelay/fps){
			spawnBullet();
			charge = 0;
		}

		for(var b in bullets){

			if(!bullets[b].dead){
				bullets[b].y -= 50;
				if(bullets[b].y<0){
					bullets[b].dead = true;
					bullets[b].$el.remove()
				}
				bullets[b].$el.css({
					left:bullets[b].x+'px',
					top:bullets[b].y+'px',
				})
			}
			
		}

		let max = 0;
		let min = W;
		
		let countAlive = 0;
		for(var a in aliens) if(!aliens[a].dead) countAlive ++;

		//start with the last alien (bottom first)
		for(var a=aliens.length-1; a>=0; a--){

			if(!aliens[a].dead){
				aliens[a].x += (speedMin + (speedMax-speedMin) * countAlive/count) /fps*dir;
				aliens[a].$el.css({
					left:aliens[a].x+'px',
					top:aliens[a].y+'px',
				})
			
				//start with the first bullet (top first)
				for(var b=0; b<bullets.length; b++){

					if(!bullets[b].dead){
						let dx = bullets[b].x - aliens[a].x;
						let dy = bullets[b].y - aliens[a].y;

						if(dy>0 && dy<ship/2 && dx<ship/2 && dx>-ship){
			
							aliens[a].$el.remove();
							aliens[a].dead = true;
							
							bullets[b].$el.remove();
							bullets[b].dead = true;

						} else {
							if(aliens[a].x > max) max = aliens[a].x;
							if(aliens[a].x < min) min = aliens[a].x;
						}
					}
				}
			}
		}

		if(min<100 || max>(W-100)){
			if(min<100) dir = 1;
			else if(max>(W-100)) dir = -1;
			for(var a=0; a<aliens.length; a++) aliens[a].y += 50;
		}
	}

	function spawnBullet(){
		let $b = $('<bullet>').appendTo($game);
		let bullet = {x:players[0].px/100*W,y:H-150,$el:$b};
		bullets.push(bullet);
	}

	let interval;
	
	self.turnOnOff = function(b){
		clearInterval(interval);
		if(b) interval = setInterval(tick,1000/fps);
	}


	self.turnOnOff(true);

	
	self.setPlayers = function(p){
		players = p;
		players.length = 1;
		for(var p in players){
			$invader.css('left',players[p].px/100*W+'px');
		}
	}

	self.setPlayers([{px:20}]);


}