let cssBB = {
	

	'.battleboxbg':{
		'background':'black',
		'color':'white',
	},

	'.battleboxbg igbside':{
		'border':'1px solid red',
		'box-sizing':'border-box',
	},

	'battlebox':{
		'width':'4vw',
		'height':'4vw',
		'display':'inline-block',
		'position':'relative',
		'margin':'2vw',
		'transform-style':'preserve-3d',
		'color':'white',
		'line-height':'1vw',
		'vertical-align':'middle',
	},

	'bb-floor':{
		'position':'absolute',
		'top':'0px',
		'left':'0px',
		'width':'100%',
		'height':"100%",
		'border':'0.1vw solid white',
		'background':'rgba(0,0,0,0.3)',
		'transform-style':'preserve-3d',

		'box-sizing':'border-box',
	},

	'bb-wall':{
		'position':'absolute',
		'top':'0px',
		'left':'0px',
		'width':'100%',
		'height':"100%",
		'border':'0.1vw solid white',
		'background':'rgba(0,0,0,0.3)',
		'transform-style':'preserve-3d',

		'box-sizing':'border-box',
	},

	'bb-ceiling':{
		'position':'absolute',
		'top':'0px',
		'left':'0px',
		'width':'4vw',
		'height':"4vw",
		'border':'0.1vw solid white',
		'transform-style':'preserve-3d',
		'transform':'translateZ(4vw)',
		'box-sizing':'border-box',
	},

	'bb-wall:nth-of-type(1)':{ 'transform-origin':'top center', 'transform':'rotateX(90deg)', },
	'bb-wall:nth-of-type(2)':{ 'transform-origin':'bottom center', 'transform':'rotateX(-90deg)', },
	'bb-wall:nth-of-type(3)':{ 'transform-origin':'center left', 'transform':'rotateY(-90deg)' },
	'bb-wall:nth-of-type(4)':{ 'transform-origin':'center right', 'transform':'rotateY(90deg)' },

	'bb-game':{
		'perspective':'33.3vw',
		'display':'block',
		'position':'absolute',
		'top':'0px',
		'left':'0px',
		'width':'100%',
		'height':"100%",
		
	},

	'bb-platform':{
		'line-height':'21vw',
		'transform-style':'preserve-3d',
		'transform':'rotateX(45deg)',
		'position':'absolute',
		'top':'0px',
		'left':'0px',
		'width':'100%',
		'height':"100%",
		'border':'0.1vw solid red',
		'background':'rgba(0,0,0,0.3)',
		'text-align':'center',

	},



	'bb-grid':{
		'display':"block",
		'width':'70%',
		'height':'70%',
		'top':"15%",
		'left':'15%',
		'position':'absolute',
		'box-sizing':'border-box',

		'line-height':'0px',
		'border':'0.05vw solid white',
	},

	'bb-cell':{
		'display':"inline-block",
		'width':'25%',
		'height':'25%',
		'box-sizing':'border-box',
		'border':'0.05vw solid white',
		'color':'white',
		'vertical-align':'middle',
	},

	'bb-cell[state="x"]:after':{
		'content':'"x"',
		'font-size':'0.5vw',
		'line-height':'0.5vw'
	},

	'bb-name':{
		'display':"block",
		'position':'absolute',
		'top':"100%",
		'left':'-100px',
		'right':'-100px',
		'text-align':'center',
		'text-transform':'uppercase',

	},

	'bb-cell[state="0"]':{ 'background':'red' },
	'bb-cell[state="1"]':{ 'background':'blue' },
	'bb-cell[state="2"]':{ 'background':'green' },
	'bb-cell[state="3"]':{ 'background':'purple' },
	'bb-cell[state="4"]':{ 'background':'orange' },
	'bb-cell[state="5"]':{ 'background':'yellow' },

	
}

$("head").append('<style>'+Css.of(cssBB)+'</style>');

BattleBoxSocket = function () {
	// body...
	self.listeners = [];

	self.listen = function(id,fn){
		self.listeners.push({id:id,fn:fn})
	}
	

	self.dispatch = function(id,data){
		for(var l in self.listeners) if(self.listeners[l].id == id) self.listeners[l].fn(data);
	}
}

BattleBoxHost = function () {
	
	let self = this;

	const NAMES = [
		'Boxy McBoxface',
		'Boxinator',
		'Boximus Prime',
		'Boxzilla',
		'Sir Box-a-lot',
		'Box-o-saurus Rex',
		"Pandora's Box",
		"Schrödinger's Box",
		'Boxplosion',
		'Boxpresso',
		'Boxplorers', 
		'Boxercise', 
		'BlackBox', 
		'JackBox', 
		'Dukebox', 
		'BoomBox', 
		'LunchBox', 
		'GiftBox', 
		'Serial Box', 
		'ShoeBox', 
		'GiftBox', 

	]

	let o = 'o';
	let x = 'x';

	self.state = 
	{
		mode:'waiting',
		boxes:[
			{
				name:NAMES[ Math.floor(Math.random()*NAMES.length) ],
				grid:[o,o,o,o,x,x,1,0,o,o,o,o,o,o,o,o]
			},
			{
				name:NAMES[ Math.floor(Math.random()*NAMES.length) ],
				grid:[o,o,1,o,x,o,1,0,o,o,o,o,o,x,o,o]
			},
		]
	}


	
}

BattleBox = function(){

	let self = this;
	self.$el = $(`
		<battlebox>
			<bb-floor>

				
				<bb-name></bb-name>
				<bb-grid></bb-grid>

				<bb-players></bb-players>

			</bb-floor>
			<bb-wall></bb-wall>
			<bb-wall></bb-wall>
			<bb-wall></bb-wall>
			<bb-wall></bb-wall>
			<bb-ceiling></bb-ceiling>
		</battlebox>
		`);

	let r = 0;
	self.setState = function(state){

		let grid = '';
		for(var i=0; i<16; i++) grid += `<bb-cell state=${state.grid[i]}></bb-cell>`;

		self.$el.find('bb-name').text(state.name);
		self.$el.find('bb-grid').html(grid);
	}

	self.step = function () {
		r++;
		self.$el.css('transform','rotateZ('+r+'deg)');
	}
}

BattleBoxGame = function(){
	
	// here's where we would check for a host
	let socket = new BattleBoxSocket();
	let host = new BattleBoxHost();


	let boxes = [];
	let self = this;
	self.$el = $('<igb class="battleboxbg">');

	$('<igbside>').appendTo(self.$el);
	let $front = $('<igbside>').appendTo(self.$el);
	$('<igbside>').appendTo(self.$el);

	let $game= $('<bb-game>').appendTo($front);
	let $platform = $('<bb-platform>').appendTo($game);

	self.redraw = function(){

		let state = host.state;
		for(var i in state.boxes){
			boxes[i] = new BattleBox()
			boxes[i].$el.appendTo($platform);
			boxes[i].setState(state.boxes[i]);
		}
	}

	self.tick = function(){
		for(var i in boxes){
			boxes[i].step();
		}
	}

	setInterval(self.tick,1000/50);
	
	self.redraw();

	
}