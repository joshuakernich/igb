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

	let pixels = [];
	while(pixels.length<10) pixels.push($('<pixel>').appendTo($waterfall).css({'top':'150%'}));

	let bpm = 81;
	
	let secondsPerBeat = 60/bpm;
	
	let long = 1.5;
	let short = 1;

	let beats = [

		
		{px:50,at:6,time:long},
		{px:70,at:8,time:long},
		{px:20,at:10,time:long},
		{px:80,at:12,time:long},
		{px:20,at:14,time:long},
		{px:20,at:16,time:long},
		{px:50,at:18,time:long},
		{px:80,at:20,time:long},
		{px:80,at:22,time:long},

		{px:10,at:23,time:long},
		{px:20,at:24,time:short},
		{px:30,at:25,time:short},
		{px:40,at:26,time:short},
		{px:50,at:27,time:short},
		{px:60,at:28,time:short},
		{px:70,at:29,time:short},
		{px:80,at:30,time:short},
		{px:90,at:31,time:short},

		{px:90,at:32,time:long},
		{px:80,at:32,time:long},

		{px:70,at:34,time:short},
		{px:60,at:34,time:short},

		{px:50,at:36,time:short},
		{px:40,at:36,time:short},

		{px:30,at:37,time:short},
		{px:20,at:37,time:short},

	];

	let n = 40;
	while(beats.length<100){
		
		beats.push({px:10 + Math.random() * 80,at:n,time:long});

		n++;
	}

	for(var b in beats) beats[b].timeSpawn = beats[b].at * secondsPerBeat - beats[b].time;


	let beatWas = 0;
	let beatTravel = 3;
	
	let offset = 0.1;
	let nPixel = 0;

	function tick(){
		
		let timeNow = $audio[0].currentTime;
		let beat = timeNow/secondsPerBeat;

		

		for(var b in beats){

			if(!beats[b].dead && !beats[b].$el && timeNow > beats[b].timeSpawn) beats[b].$el = pixels[ (nPixel++)%pixels.length ]

			if(!beats[b].dead && beats[b].$el){

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
					beats[b].px += beats[b].sx;

					if( beats[b].progress > 1.5 ){
						beats[b].$el.css({'background':'white'});
						beats[b].dead = true;
					}
				}
				

				beats[b].$el.css({
					'left':(beats[b].px)+'%',
					'top':(beats[b].progress*100)+'%'
				});
			}
		}

		

		
		
			
	}

	$front.on('mousemove',function(e){
		let px = (e.pageX-$front.offset().left)/$front.width()*100;
		self.setPlayers([{px:px}]);
	})

	setInterval(tick,1000/50);
}