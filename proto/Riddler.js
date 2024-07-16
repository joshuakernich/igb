let css = {


	'riddlerscreens':{
		'height':'80%',
		'text-align':'center',
		'color':'white',
		'font-size':'3vw',
		'line-height':'0px',
		'margin-top':'3vw',
		'display':'block',
		
	},

	'.riddler':{
		'pointer-events':'none',
	},

	'.riddler.enabled':{
		'pointer-events':'auto',
	},

	'riddlerscreen':{
		'display':'inline-block',
		'width':'6vw',
		'height':'4vw',
		'border':'1px solid white',
		'line-height':'4vw',
		'margin':'0.5vw',
		'overflow':'hidden',
		'position':'relative',
		'white-space':'wrap',
		'background':'darkgreen',

	},

	'riddlerscreen:empty':{
		'background':'black',
	},

	'riddlerscreen:empty:before':{
		'display':'none',
	},

	'riddlerscreen:before':{
		content:'" "',
		'background-image':'url(https://i.pinimg.com/originals/51/7a/86/517a86be65e2c862e73e1ecd18a85627.gif)',
		'position':'absolute',
		'top':'0px',
		'left':'0px',
		'right':'0px',
		'bottom':'0px',
		'opacity':'0.1',
	},

	'riddlerscreen.selected':{
		background:'limegreen',
	},

	'riddlerscreen p':{
		'font-size':'0.5vw',
		'position':'absolute',
		'top':'0px',
		'left':'0px',
		'right':'0px',
		'bottom':'0px',
		'line-height':'0.7vw',
		'padding':'0.3vw',
		'box-sizing':'border-box',
		'font-family': "'Press Start 2P'",
	}
}

$("head").append('<style>'+Css.of(css)+'</style>');

Riddler = function(){

	let questions = [
		{q:['3-C'],s:'CSTCSTCST'},
		{q:['3-NC'],s:'CSTCSTCST'},
		{q:['3-S','1-NS'],s:'CSTCSTCST'},
		{q:['2-S','2-NS','2-NC'],s:'CSTCSTCST'},
	];

	let SHAPES = {
		'C':'circle',
		'S':'square',
		'T':'triangle',
	}

	let SYMBOLS = {
		'C':'◯',
		'S':'▢',
		'T':'△',
	}

	let iQuestion = -1;
	let tri = '△';
	let squ = '▢';
	let cir = '◯';
	let geo = [tri,squ,cir];

	let self = this;
	self.$el = $('<igb class="riddler">');

	let C = 4;
	let R = 2;

	for(let i=0; i<3; i++){
		let $side = $('<igbside>').appendTo(self.$el);
		let $t = $('<riddlerscreens>').appendTo($side);
		for(let y=0; y<R; y++){
			let $r = $('<div>').appendTo($t);
			for(let x=0; x<C; x++){
				let $d = $('<riddlerscreen>').appendTo($r).click(onToggle);
			}
		}
	}

	function shuffle(array) {
	  let currentIndex = array.length;

	  // While there remain elements to shuffle...
	  while (currentIndex != 0) {

	    // Pick a remaining element...
	    let randomIndex = Math.floor(Math.random() * currentIndex);
	    currentIndex--;

	    // And swap it with the current element.
	    [array[currentIndex], array[randomIndex]] = [
	      array[randomIndex], array[currentIndex]];
	  }
	}

	
	
	let selected = [];
	
	function onToggle(){
		

		$(this).toggleClass('selected');

		let isSelected = $(this).hasClass('selected');

		if (isSelected) selected.push(this);
		else selected.splice( selected.indexOf(this), 1 );

		let combo = {'C':0,'T':0,'S':0,'total':0};
		for(var s in selected){
			let shape = $(selected[s]).attr('s');
	
			combo[shape]++;
			combo['total']++;
		}

		let isCorrect = true;
		for(var r in rules){
			if(r.length==1){
				if(combo[r] != rules[r]) isCorrect = false;
			} else{
				let s = r[1];
				if((combo['total'] - combo[s]) < rules[r]) isCorrect = false;
			}
		}

	

		if(isCorrect){
			self.$el.removeClass('enabled');
			setTimeout(celebrate,500);
		}
	}

	function celebrate(){
		self.$el.find('riddlerscreen').html('<p>PERFECT<br>PERFECT<br>PERFECT</p>').removeClass('selected');
		setTimeout(nextQuestion,1000);
	}

	let rules;
	function nextQuestion(){

		rules = {};
		selected = [];
		iQuestion ++;

		self.$el.find('riddlerscreen').empty();

		let things = [];

		let q = questions[iQuestion].q;
		for(var i in q){
			let rule = q[i].split('-');
			let count = rule[0];
			let shape = rule[1];

			rules[shape] = parseInt(count);

			let not = (shape.length==2);
			if(not) shape = shape[1];

			let text = 'Press and hold '+count+' '+(not?'NOT ':'')+SHAPES[shape]+(count?'s':'');
			//self.$el.find('riddlerscreen').eq(i).html('<p>'+text+'</p>');

			things.push({s:'p',t:'<p>'+text+'</p>'});

			
		}

		for(var s=0; s<questions[iQuestion].s.length; s++){
			let shape = questions[iQuestion].s[s];
			things.push({s:shape,t:SYMBOLS[shape]});
		}

		let order = [];
		while(order.length<24) order[order.length] = order.length;
		shuffle(order);

		for(var t in things){
			self.$el.find('riddlerscreen')
			.eq(order[t])
			.attr('s',things[t].s)
			.html(things[t].t);
		}

		self.$el.addClass('enabled');
	}

	nextQuestion();
}