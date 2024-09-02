TileGame = function(){
	
	let css = {
		'tilegame':{
			display:'block',
			position:'absolute',
			top:'0px',
			
			left: '33.3%',
			bottom: '0px',
			'width':'1600px',
			'height':'1000px',
			background: 'white',
			'transform-origin':'top left',
		},

		'tilelayer':{
			display:'block',
			'line-height':'0',
			'height':'50px',
		},

		'tiletile':{
			display:'block',
			'width':'50px',
			'height':'50px',
			'background':'#777',
			'display':'inline-block',
			
			'position':'relative',
		},

		'tiletile[type="0"]':{ 'opacity':'0' },
		'tiletile[type="2"]':{ 'background':'red', position:'absolute' },


		

	}

	$("head").append('<style>'+Css.of(css)+'</style>');

	map = [
		'2000000000',
		'0110000110',
		'0100000010',
		'0000000000',
		'0000000000',
		'0000000000',
		'0000000000',
		'0100000010',
		'0110000110',
		'0000000000',
	];

	const W = 1600;
	const H = 1000;
	const TILE = 50;

	let self = this;
	self.$el = $('<tilegame>')

	let $char;
	let char = {x:0,y:0,sx:0,sy:0};
	let scale = 1;

	for(var y=0; y<map.length; y++){
		let $l = $('<tilelayer>').appendTo(self.$el);
		for(var x=0; x<map[y].length; x++){
			let $t = $('<tiletile>').appendTo($l).attr('type',map[y][x]);

			if(map[y][x]=='2'){
				$char = $t;
				char.x = x;
				char.y = y;
			}
		}
	}

	let tx = 0;
	let ty = 0;


	$(document).on('mousemove',function(e){
		let o = self.$el.offset();
		
		tx = (e.pageX - o.left)/scale/50;
		ty = (e.pageY - o.top)/scale/50;

		

	});

	function tick(){

		let w = $(document).innerWidth();
		scale = (w/3)/1600;
		self.$el.css('transform','scale('+scale+')');

		let dx = tx-char.x;
		let dy = ty-char.y;

		char.sx = dx*0.05;
		char.sy = dy*0.05;

		char.x += char.sx;
		char.y += char.sy;

		let fx = Math.floor(char.x);
		let fy = Math.floor(char.y);

		let rx = Math.round(char.x);
		let ry = Math.round(char.y);

		if( char.sx<0 && map[fy] && map[fy][fx] == 1) char.x = fx+1;
		else if( char.sx>0 && map[fy] && map[fy][fx+1] == 1) char.x = fx;

		fx = Math.floor(char.x);

		if( char.sy<0 && map[fy] && map[fy][fx] == 1) char.y = fy+1;
		else if( char.sy>0 && map[fy+1] && map[fy+1][fx] == 1) char.y = fy;

		$char.css({left:char.x*TILE+'px',top:char.y*TILE+'px'});

	}

	setInterval(tick,1000/50);
}