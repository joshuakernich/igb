window.MinecraftGame = function( ){

	const MinecraftMeep = function(){

		let self = this;
		self.$el = $('<minecraftmeep>');

		self.setHeight = function(h){

		}
	}

	const MinecraftCube = function(){
		let self = this;
		self.$el = $(`
			<minecraftcube>
				<minecraftcubeside></minecraftcubeside>
				<minecraftcubeside></minecraftcubeside>
				<minecraftcubeside></minecraftcubeside>
				<minecraftcubeside></minecraftcubeside>
				<minecraftcubeside></minecraftcubeside>
				<minecraftcubeside></minecraftcubeside>
			</minecraftcube>
		`);


		self.toggle = function(){
			self.$el.toggleClass('on');
		}
	}

	const FPS = 50;
	const W = 1600;
	const H = 1000;
	const CUBE = 200;
	let self = this;

	self.$el = $('<minecraftgame>');

	let $world = $('<minecraftworld>').appendTo(self.$el);

	for(var i=0; i<8; i++){

		for(var y=0; y<5; y++){
			let cube = new MinecraftCube();
			cube.$el.css({
				left:i*CUBE,
				bottom:'0px',
				'transform':`translateY(${-CUBE}px) translateZ(${CUBE/2 + CUBE*y}px)`,
			});
			cube.$el.appendTo($world);
			cube.$el.click(function(){
				cube.toggle();
			})


		}
	}

	if( !LifeGame.init ){
		LifeGame.init = true;

		$("head").append(`
			<style>
				minecraftgame{
					display: block;
					position: absolute;
					left: 0px;
					top: 0px;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: linear-gradient(to bottom, #2289C7, #77CDEA);
					background-size: 100%;
					perspective: ${W}px;
				}

				minecraftcube{
					display: block;
					position: absolute;
					transform-style: preserve-3d;
				}

				minecraftcubeside{
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
					width: ${CUBE}px;
					height: ${CUBE}px;
					transform-style: preserve-3d;
					background: radial-gradient(red, black);
					background: rgba(0,255,255,0.1);
					box-sizing: border-box;
					border: 5px dashed cyan;
					
					
				}

				minecraftcubeside:nth-of-type(1){	transform: rotateX(-90deg) translateZ(${CUBE/2}px);	}
				minecraftcubeside:nth-of-type(2){	transform: rotateX(-90deg) translateZ(${-CUBE/2}px);	}
				minecraftcubeside:nth-of-type(3){	transform: translateZ(${CUBE/2}px);	}
				minecraftcubeside:nth-of-type(4){	transform: translateZ(${-CUBE/2}px);	}
				minecraftcubeside:nth-of-type(5){	transform: rotateY(90deg) translateZ(${-CUBE/2}px);	}
				minecraftcubeside:nth-of-type(6){	transform: rotateY(90deg) translateZ(${CUBE/2}px);	}

				minecraftcube.on minecraftcubeside{
					background: url(./proto/img/experiments/minecraft-cube.png);
					background-size: 300%;
					background-position-x: -100%;
					background-position-y: 0%;
				}

				minecraftworld{
					display: block;
					position: absolute;
					bottom: 0px;
					width: ${W}px;
					height: ${W*10}px;
					background: black;
					left: ${W}px;
					transform: rotateX(90deg);
					transform-style: preserve-3d;
					transform-origin: bottom center;
					background: url(./proto/img/experiments/minecraft-grass.png);
					background: gray;
					background-size: ${CUBE}px;
					transform-style: preserve-3d;
				}
		`)
	}

	
	function step(){
		for(var m in meeps){
			meeps[m].setHeight((1-meeps[m].py)*H);
			
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
		meeps[m] = new MinecraftMeep(m);
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