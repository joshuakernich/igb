window.SoftServeCone = function(nPlayer){
	let self = this;

	self.px = 0.5;
	self.height = 0;

	self.stack = [];

	self.$el = $(`
		<softcone>
			<svg n=${nPlayer} viewBox='0 0 100 100' preserveAspectRatio="none">
				<path vector-effect="non-scaling-stroke" d=''></path>
			</svg>
			<softhat></softhat>
			<softhead></softhead><br>
			<softbody></softbody>
		</softcone>
	`);

	self.redraw = function(){
		self.$el.css({
			left: self.px*100 + '%'
		})

		let d = '';
		for(var s=0; s<self.stack.length; s++){
			//d = d + ' ' + (s==0?'M':'L') + ' ' + (50 + self.stack[s] * 100) + ',' + (100-s*0.2);
			self.height = s*0.15/100;
			d = d + ' ' + (s==0?'M':'L') + ' ' + ((50 + Math.sin( s*0.2 )*5)*3 + (50+self.stack[s]*100))/4 + ',' + (100-self.height*100);
		}

		if(self.stack.length && self.isAdding){
			d = d + ' L ' + (50+self.stack[s-1]*0.8*100) + ',' + (100-self.height*100 - 2);
			d = d + ' L ' + (50+self.stack[s-1]*100) + ',' + (100-self.height*100 - 5);
		}
		if(d.length) self.$el.find('path').attr('d',d);

		self.isAdding = false;
	}

	self.add = function(dx){

		self.stack.push(dx);
		self.isAdding = true;
	}
}

window.SoftServeStream = function(nPlayer){

	const MULTY = 2;

	let self = this;
	self.history = [];
	self.$el = $(`
		<softstream>
			<svg n=${nPlayer} viewBox='0 0 100 100' preserveAspectRatio="none">
				<path vector-effect="non-scaling-stroke" d=''></path>
			</svg>
		</softstream>
	`);

	self.add = function(x){
		self.history.unshift(x);
		while(self.history.length>(100/MULTY)) self.history.pop();

		let d = '';
		for(var h=0; h<self.history.length; h++){
			d = d + ' ' + (h==0?'M':'L')+' '+self.history[h]*100+','+h*MULTY;
		}

		self.$el.find('path').attr('d',d);
	}

	self.getPXforPY = function(py){
		return self.history[Math.round(py*(100/MULTY))];
	}

	self.cutPY = function(py) {
		self.history.length = Math.round(py*(100/MULTY));
	}


}

window.SoftServeNozzle = function(nPlayer,stream){

	let self = this;
	self.$el = $(`
		<softnozzle>
			<softnozzletip></softnozzletip>
		</softnozzle>
	`);

	let n = 0;
	self.step = function(){
		n++;
		let x = 0.5 + Math.sin( nPlayer*Math.PI + n*0.05 ) * 0.1;
		
		self.$el.css({
			left: x*100 + '%',
		})

		stream.add(x);
	}

	self.getPXforPY = function(py){
		return stream.getPXforPY(py);
	}

	self.cutPY = function(py) {
		stream.cutPY(py);
	}
}

window.SoftServeGame = function(){
	
	const FPS = 20;
	const W = 1600;
	const H = 1000;
	const CONE = 200;
	const NOZZLE = 50;
	//const STREAM = H-CONE-NOZZLE;
	const THICC = 50;

	if(!window.SoftServeGame.didInit){
		window.SoftServeGame.didInit = true;
		$("head").append(`
			<style>
				softserve{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					background: url(./proto/img/party/bg-diner.webp);
					transform-origin: top left;
					position: relative;

				}

				softserve:before{
					content: " ";
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
					right: 0px;
					bottom: 0px;
					background: #ff9900;
					opacity: 0.9;
				}

				softservegame{
					width: 33.3%;
					position: absolute;
					top: 0px;
					left: 33.3%;
					display: block;
					height: 100%;
				}

				

				softservefloor{
					display: block;
					position: absolute;
					left: 0px;
					width: 100%;
					bottom: 0px;
					height: 0px;
				}

				softserveceiling{
					display: block;
					position: absolute;
					left: 0px;
					width: 100%;
					top: 0px;
					height: 0px;
				}

				softcone{
					text-align: center;
					display: inline-block;
					position: absolute;
					bottom: 0px;
					left: 0px;
					transform: translateX(-50%);
				}

				softbody{
					width: ${CONE/2}px;
					height: ${CONE/4}px;
					border-radius: ${CONE/2}px ${CONE/2}px 0px 0px;
					background: white;
					display: inline-block;
				}

				softhead{
					width: ${CONE/2}px;
					height: ${CONE/2}px;
					background: white;
					display: inline-block;
					border-radius: 0px 0px ${CONE/2}px ${CONE/2}px;
				}

				softhead:after{
					content:". .";
					display: block;
					position: absolute;
					left: 0px;
					right: 0px;
					line-height: ${CONE/4}px;
					font-size: ${CONE/2}px;
				}

				softhat{
					display: block;
					width: ${CONE}px;
					height: ${CONE/4}px;
					background: red;
					border-radius:  ${CONE/16}px;
				}

				softcone:nth-of-type(2) softhat{
					background: blue;
				}

				softnozzle{
					display: block;
					position: absolute;
					top: 0px;
					left: 0px;
					transform: translateX(-50%);
				}

				softnozzletip{
					display: block;
					width: ${NOZZLE*2}px;
					height: ${NOZZLE}px;
					background: white;

				}

				softstream{
					display: block;
					position: absolute;
					top: ${NOZZLE}px;
					left: 0px;
				}

				softstream svg{
					display: block;
					width: ${W}px;
					height: ${H}px;
					position: absolute;
					top: 0px;
					left: 0px;

					fill: none;
					stroke:white;
					stroke-width:${THICC}px;
					stroke-linecap:round;
					stroke-linejoin:round;
				}

				softcone svg{
					display: block;
					width: ${W}px;
					height: ${H}px;
					position: absolute;
					bottom: ${CONE}px;
					left: ${-W/2 + CONE/2}px;

					fill: none;
					stroke:white;
					stroke-width:${THICC}px;
					stroke-linecap:round;
					stroke-linejoin:round;
				}

				svg[n="0"]{
					stroke:red;
				}

				svg[n="1"]{
					stroke:blue;
				}
			</style>
			`);
	}

	let self = this;
	self.$el = $(`<softserve>`);

	let $game = $('<softservegame>').appendTo(self.$el);

	let $floor = $('<softservefloor>');
	let $ceiling = $('<softserveceiling>');

	const PLAYERS = 2;

	let cones = [];
	for(var i=0; i<PLAYERS; i++){
		cones[i] = new SoftServeCone(i);
		cones[i].$el.appendTo($floor);
	}

	let sources = [];
	for(var i=0; i<cones.length; i++){

		let stream = new SoftServeStream(i);
		stream.$el.appendTo($game);

		sources[i] = new SoftServeNozzle(i,stream);
		sources[i].$el.appendTo($ceiling);
	}

	$ceiling.appendTo($game);
	$floor.appendTo($game);

	let scale = 1;
	function step(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		self.$el.css('transform','scale('+scale+')');

		for(var s in sources) sources[s].step();
		for(var c in cones){
			let range = H;
			let yCone = H - CONE - NOZZLE;
			let py = yCone/range - cones[c].height - 0.05;
			let px = sources[c].getPXforPY(py);


			let w2 = (CONE/W)/2;
			let dx = px - cones[c].px;

			if( Math.abs(dx) < w2 ){
				cones[c].add(dx);
				sources[c].cutPY(py);
			}
		}

		for(var c in cones) cones[c].redraw();
	}

	self.setPlayers = function(p){
		for(var m in cones){
			cones[m].px = p[m].px;
			cones[m].pz = p[m].pz;
			cones[m].py = p[m].py;
		}
	}

	setInterval(step,1000/FPS);
}