window.LifeGame = function( ){

	const FPS = 50;
	const W = 1600;
	const H = 1000;
	let self = this;

	self.$el = $('<lifegame>');

	if( !LifeGame.init ){
		LifeGame.init = true;

		$("head").append(`
			<style>
				lifegame{
					display: block;
					position: absolute;
					left: 0px;
					top: 0px;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: #bbb;
				}
		`)
	}

	
	function step(){
		for(var m in meeps){


			if(!meeps[m].pxHistory) meeps[m].pxHistory = [meeps[m].px];

			meeps[m].pxHistory.push(meeps[m].px);

			while(meeps[m].pxHistory.length>FPS/4) meeps[m].pxHistory.shift();

			meeps[m].dx = meeps[m].pxHistory[meeps[m].pxHistory.length-1] - meeps[m].pxHistory[0];

			console.log(meeps[m].dx);

			meeps[m].setHeight((1-meeps[m].py)*H);
			meeps[m].$head.css({
				'transform':'rotate('+(meeps[m].dx*90)+'deg)',
			})
			
			meeps[m].$el.css({
				left: meeps[m].wall * W + meeps[m].px * W + 'px',
				bottom: '0px',
			})
		}
		resize();
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		self.$el.css('transform','scale('+scale+')');
	}

	let meeps = [];
	for(var m=0; m<6; m++){
		meeps[m] = new LifeMeep(m);
		meeps[m].$el.appendTo(self.$el);
	}

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].px = p[m].px;
			meeps[m].py = p[m].py;
			meeps[m].pz = p[m].pz;
			meeps[m].walls = p[m].walls;

			if( p[m].wall != undefined ){
				meeps[m].wall = p[m].wall;
				p[m].wall = undefined;
			} 
			meeps[m].r =  {W:p[m].rW, X:p[m].rX, Y:p[m].rY, Z:p[m].rZ};
		}
	}

	setInterval(step,1000/FPS);
}