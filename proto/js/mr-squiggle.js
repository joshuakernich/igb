MrSquiggle = function(){
	
	let self = this;
	self.$el = $('<igb>');

	$('<igbside>').appendTo(self.$el);
	let $front = $('<igbside>').appendTo(self.$el);
	$('<igbside>').appendTo(self.$el);

	let $svg = $(`<svg width=1600 height=1000 viewBox='0 0 100 100' style="transform-origin:top left;background:black;"></svg>`).appendTo($front);

	let line = [];
	let $ps = [];
	let positions = [];

	for(var i=0; i<7; i++) line[i] = [];

	let fps = 50;
	let max = fps*5;
	let interval;

	let COLORS = ['red','blue','green','purple','orange','yellow','white'];

	function tick(){

		let wScreen = $front.width();
		$svg.css('transform','scale('+wScreen/1600+')');

		let str = '';

		for(var p in positions){
			line[p].unshift({ x:positions[p].px, y:positions[p].py });
			while(line[p].length>max) line[p].pop();

			let d = '';
			for(var l=0; l<line[p].length; l++) d += (l==0?'M':'L') + line[p][l].x + ',' + line[p][l].y + ' ';
				
			str += `
			<path 
				vector-effect='non-scaling-stroke' 
				stroke-width=10 
				stroke='${COLORS[p]}' 
				fill='transparent' 
				d='${d}' 
			/>`
		}

		$svg.html(str);
	}

	self.setPlayers = function(p){
		positions = p;
	}


	self.turnOnOff = function(b){
		clearInterval(interval);
		if(b) interval = setInterval(tick,1000/fps);
	}

	self.turnOnOff(true);
}