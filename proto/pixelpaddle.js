{
	let css = {

		'.pixelpaddle':{
			
		},

		'.pixelpaddle paddle':{
			'width':'5vw',
			'height':'2vw',
			'bottom':'0px',
			'background':'white',
			'display':'block',
			'transform':'translateX(-50%)',
			'position':'absolute',
		},

		'.pixelpaddle pixel':{
			'width':'2vw',
			'height':'2vw',
			'bottom':'0px',
			'background':'white',
			'display':'block',
			'transform':'translate(-50%,-100%)',
			'position':'absolute',
			'transition-property':'bottom',
			'transition-timing-function':'linear',
		},

		'.pixelpaddle audio':{
			'position':'absolute',
			'top':'0px',
			'left':'0px',
			'right':'0px',
			'bottom':'0px',
			'margin':"auto",
		},

		'.pixelpaddle waterfall':{
			'position':'absolute',
			'top':'0px',
			'left':'0px',
			'right':'0px',
			'bottom':'2vw',
			
		},

	}

	$("head").append('<style>'+Css.of(css)+'</style>');

}

PixelPaddle = function(){

	let self = this;
	self.$el = $('<igb class="pixelpaddle">');

	for(let i=0; i<3; i++){
		$('<igbside>').appendTo(self.$el);
	}

	let $front = self.$el.find('igbside').eq(1);

	let $paddle = $('<paddle>').appendTo($front);

	let $audio = $(`<audio controls>
		<source src="./proto/we-will-rock-you.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el.find('igbside').first());

	let $waterfall = $('<waterfall>').appendTo($front);


	let players = [];
	self.setPlayers = function(p){
		p.length = 1;
		players = p;
		$paddle.css('left',p[0].px+'%');
	}


	self.setPlayers([{px:15}]);

	let bpm = 81;
	
	let secondsPerBeat = 60/bpm;
	


	let beats = [

		
		{px:50,at:6,time:1},
		{px:70,at:8,time:1},
		{px:20,at:10,time:1},
		{px:80,at:12,time:1},
		{px:20,at:14,time:1},
		{px:20,at:16,time:1},
		{px:50,at:18,time:1},
		{px:80,at:20,time:1},
		{px:80,at:22,time:1},

		{px:10,at:23,time:0.7},
		{px:20,at:24,time:0.7},
		{px:30,at:25,time:0.7},
		{px:40,at:26,time:0.7},
		{px:50,at:27,time:0.7},
		{px:60,at:28,time:0.7},
		{px:70,at:29,time:0.7},
		{px:80,at:30,time:0.7},
		{px:90,at:31,time:0.7},

		{px:90,at:32,time:0.7},
		{px:80,at:32,time:0.7},

		{px:70,at:34,time:0.7},
		{px:60,at:34,time:0.7},

		{px:50,at:36,time:0.7},
		{px:40,at:36,time:0.7},

		{px:30,at:37,time:0.7},
		{px:20,at:37,time:0.7},

	];

	for(var b in beats) beats[b].timeSpawn = beats[b].at * secondsPerBeat - beats[b].time;


	let beatWas = 0;
	let beatTravel = 3;
	let pixels = [];
	let offset = 0.1;

	function tick(){
		
		let timeNow = $audio[0].currentTime;
		let beat = timeNow/secondsPerBeat;

		

		for(var b in beats){

			if(!beats[b].$el && timeNow > beats[b].timeSpawn) beats[b].$el = $('<pixel>').appendTo($waterfall);

			if(beats[b].$el){

				if(beats[b].gravity == undefined){
					beats[b].progress = 1 + (timeNow - beats[b].timeSpawn - beats[b].time)/beats[b].time;

					if(beats[b].progress>1){

						for(var n in players){
					 		let dist = players[n].px - beats[b].px;

					 		if(dist < 10 && dist > -10 ){

								beats[b].$el.css({'background':'green'});
								beats[b].progress = 1;
								beats[b].sy = -0.08;
								beats[b].sx = -dist*0.2;
								beats[b].gravity = 0.005;
							} else {

								beats[b].$el.css({'background':'red'});
								beats[b].sy = 0;
								beats[b].gravity = 0.005;
							}
						}
					}

					
				} else {

					beats[b].sy += beats[b].gravity;
					beats[b].progress += beats[b].sy;

					console.log(beats[b].sy,beats[b].progress);
					beats[b].px += beats[b].sx;
				}
				

				beats[b].$el.css({
					'left':(beats[b].px)+'%',
					'top':(beats[b].progress*100)+'%'
				});
			}
		}

		

		if(beat>beatWas){

			/*for(var p in pixels){
			
				if(pixels[p].active){
					pixels[p].beat--;
				} else if(pixels[p].bouncing) {
					pixels[p].beat += pixels[p].sy;
					pixels[p].sy += 0.1;
					pixels[p].px += pixels[p].sx;

				}

				if(pixels[p].beat==-1){
				 
				 	for(var n in players){
				 		let dist = players[n].px - pixels[p].px;

				 		 

				 		if(dist < 10 && dist > -10 ){
				 			pixels[p].beat = 0;
				 			pixels[p].$el.css('background','red');
				 			pixels[p].active = false;
				 			pixels[p].sx = -dist;
				 			pixels[p].sy = 1;
				 			pixels[p].bouncing = true;

				 			pixels[p].$el.css({
								'transition':'none',
							});
				 		}
				 	}

				 	
				}
				if(pixels[p].beat==-2){
					pixels[p].active = false;
					pixels[p].bouncing = false;
				}
			}



			if(beats.indexOf(beat)>-1){
				let $p = $('<pixel>').appendTo($front);

				pixels.push({$el:$p,beat:beatTravel,px:Math.random()*100,py:0, active:true});
			}*/
		}

		/*beatWas = beat;


		for(var p in pixels){
			
			pixels[p].$el.css({
				'left':pixels[p].px+'%',
				'bottom':1 + pixels[p].beat*6+'vw'
			});
		}*/

		
			
	}

	$front.on('mousemove',function(e){
		let px = (e.pageX-$front.offset().left)/$front.width()*100;
		self.setPlayers([{px:px}]);
	})

	setInterval(tick,1000/50);
}