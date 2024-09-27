let css = {


	'riddlerscreens':{
		'height':'80%',
		'text-align':'center',
		'color':'white',
		'font-size':'3vw',
		'line-height':'0px',
		'margin-top':'3vw',
		'display':'block',
		'transform-style': 'preserve-3d',
	},

	'.riddler':{
		'pointer-events':'none',
		'perspective': '1000px',
		'transform-style': 'preserve-3d',
		'position':'relative',

		 'font-family': "Bangers",
		 'font-weight': 400,
	},

	'.riddler audio':{
				'position':'absolute',
				'left':'2vw',
				'bottom':'2vw',
				'z-index':'1',

			},

	'.riddler igbside':{
		'background-image':'url(./proto/img/riddler-bg.png)',
		'background-size':'100%',
		'background-position':'center',
		'transform-style': 'preserve-3d',
		'vertical-align':'top',
	},

	'.riddler.enabled':{
		'pointer-events':'auto',
	},

	'riddlerscreen':{
		'display':'inline-block',
		'width':'6vw',
		'height':'4vw',
		'border':'0.2vw solid #1D3B0F',
		'line-height':'4vw',
		'margin':'0.3vw',
		'overflow':'hidden',
		'position':'relative',
		'white-space':'wrap',
		

		'background':'black',
		
		'transform-style': 'preserve-3d',
	},

	'riddlerscreen.on':{
		'background':'darkgreen',
	},

	'riddlerscreen.on:before':{
		'content':'" "',
		'background-image':'url(https://i.pinimg.com/originals/51/7a/86/517a86be65e2c862e73e1ecd18a85627.gif)',
		'position':'absolute',
		'top':'0px',
		'left':'0px',
		'right':'0px',
		'bottom':'0px',
		'opacity':'0.1',
	},

	'riddlerscreen.on.selected':{
		'background':'limegreen',
	},

	'riddlerscreen.selected':{
		'background':'#993300',
	},

	'riddlerscreen.selected:before':{
		'display':'block',
	},

	'riddlerscreen p':{
		'font-size':'0.5vw',
		'position':'absolute',
		'top':'0px',
		'left':'0px',
		'right':'0px',
		'bottom':'0px',
		'line-height':'0.7vw',
		'padding':'0.4vw',
		'box-sizing':'border-box',
		'font-family': "'Press Start 2P'",
	},

	'riddlerrow':{
		'transform-style': 'preserve-3d',
		'display':'block',
	},

	'riddlerhead':{
		'background':'url(./bat/batman-red-fadeout.png)',
		'background-position':'top center',
		'width':'7vw',
		'height':'3vw',
		'position':'absolute',
		'bottom':'0px',
		'display':'block',
		'background-size':'100%',
		'transform':'translateX(-50%)',
		'opacity':'0.5',
		'transform-origin':'bottom center',
	},

	'riddlerbody':{
		'background':'url(./bat/batman-red-fadeout.png)',
		'background-position':'bottom center',
		'width':'7vw',
		'height':'6vw',
		'position':'absolute',
		'top':'0px',
		'display':'block',
		'background-size':'100%',
		'transform':'translateX(-50%)',
		'transform-origin':'top center',
		'opacity':'0.5',
	},

	'.riddler button':{
		'background':'none',
		'color':'white',
		'font-family': "'Press Start 2P'",
		'border':'none',
		'font-size':'0.5vw',
		'padding':'1.5vw',
	},

	'.riddler h1':{
		'position':'absolute',
		'top':'0px',
		'bottom':'0px',
		'left':'0px',
		'right':'0px',
		'font-size':'2vw',
		'line-height':'2vw',
	}
}

$("head").append('<style>'+Css.of(css)+'</style>');

Riddler = function(){

	let questions = [

		

		{type:'shapes',q:['3-C'],s:'CSTCSTCST'},
		{type:'shapes',q:['3-NC'],s:'CSTCSTCST'},
		{type:'shapes',q:['3-S','1-NS'],s:'CSTCSTCST'},
		{type:'shapes',q:['2-S','2-NS','2-NC'],s:'CSTCSTCST'},
		{type:'shapes',q:['5-B'],s:'CSTCSTCST'},
		{type:'shapes',q:['1-I'],s:'CSTCSTCST'},
		{type:'shapes',q:['1-B','1-S','1-T','1-C','3-I'],s:'CSTCSTCST'},
		

		{type:'move',q:['1-R','2-I']},
		{type:'move',q:['2-R']},
		{type:'move',q:['1-R','1-L']},
		{type:'move',q:['1-S','1-NS','2-I','2-B','1-R','1-L'],s:'CSTCSTCST'},

		
		{type:'move',q:['2-Q']},

		
	];

	let MOVES = {
		'L':'left',
		'R':'right',
	}

	let SHAPES = {
		'C':'circle',
		'S':'square',
		'T':'triangle',
		'B':'blank screen',
		'I':'riddle screen',
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
	let isEnabled = false;

	let self = this;
	self.$el = $('<igb class="riddler">');

	$(`
		<audio autoplay controls loop>
			<source src="./proto/audio/millionaire-2.mp3" type="audio/mpeg">
		</audio>`).appendTo(self.$el)[0].volume = 0.5;

	let C = 4;
	let R = 2;
	let sides = [];

	for(let i=0; i<3; i++){
		let $side = $('<igbside>').appendTo(self.$el);
		let $t = $('<riddlerscreens>').appendTo($side);
		sides[i] = $t;
		for(let y=0; y<R; y++){
			let $r = $('<riddlerrow>').appendTo($t);
			for(let x=0; x<C; x++){
				let $d = $('<riddlerscreen>').appendTo($r).click(onToggle);
			}
		}
	}

	$('<button>SKIP</button>').appendTo(sides[2]).click(doCorrect);


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
	let isTouchCorrect = true;
	let isPositionCorrect = false;
	
	function onToggle(){
		

		$(this).toggleClass('selected');

		let isSelected = $(this).hasClass('selected');

		if (isSelected) selected.push(this);
		else selected.splice( selected.indexOf(this), 1 );

		let combo = {'I':0,'B':0,'C':0,'T':0,'S':0,'total':0};
		for(var s in selected){
			let shape = $(selected[s]).attr('s');

			if(!shape) shape = 'B';
	
			combo[shape]++;
			combo['total']++;
		}

		isTouchCorrect = true;
		for(var r in rules){
		
			if(r != 'R' && r!= 'L'){
				if(r.length==1){
					if(combo[r] != rules[r]) isTouchCorrect = false;
				} else {
					let s = r[1];
					if((combo['total'] - combo[s]) < rules[r]) isTouchCorrect = false;
				}
			}
			

		}

		checkCorrect();
	}

	function checkCorrect(){
		console.log('touch',isTouchCorrect,'position',isPositionCorrect);
		if(isEnabled && isTouchCorrect && isPositionCorrect) doCorrect();
	}

	function doCorrect(){
		if(isEnabled){
			isEnabled = false;
			self.$el.removeClass('enabled');
			setTimeout(celebrate,500);
		}
	}

	function celebrate(){
		self.$el.find('riddlerscreen').html('<p>PERFECT<br>PERFECT<br>PERFECT</p>').removeClass('selected').addClass('on');
		setTimeout(nextQuestion,1000);
	}

	let rules = {};
	function nextQuestion(){

		rules = {};
		selected = [];
		iQuestion ++;

		self.$el.find('riddlerscreen').empty().removeClass('on').attr('s','B');

		let things = [];
		let question = questions[iQuestion];
		let range = 24;

		isTouchCorrect = true;
		isPositionCorrect = true;

		//if(question.type=='shapes'){
			
			let q = question.q;
			for(var i in q){
				let rule = q[i].split('-');
				let count = rule[0];
				let shape = rule[1];

				rules[shape] = parseInt(count);

				let not = (shape.length==2);
				if(not) shape = shape[1];

				let text = ''
				if(shape=='R' || shape=='L'){
					isPositionCorrect = false;
					text = 'Move '+count+' player'+(count>1?'s':'')+' to the '+MOVES[shape];
				}
				else {
					isTouchCorrect = false;
					text = 'Touch '+count+' '+(not?'NOT ':'')+SHAPES[shape]+(count>1?'s':'');
				}

				things.push({s:'I',t:'<p>'+text+'</p>'});
			}


			if(questions[iQuestion].s){
				for(var s=0; s<questions[iQuestion].s.length; s++){
					let shape = questions[iQuestion].s[s];
					things.push({s:shape,t:SYMBOLS[shape]});
				}
			}

			
		//}

		/*if(question.type=='move'){
			let q = question.q;
			for(var i in q){
				let rule =  q[i].split('-');
				let count = rule[0];
				let shape = rule[1];
				let text = 'Move '+count+' player'+(count>1?'s':'')+' to the '+MOVES[shape];
				things.push({s:'I',t:'<p>'+text+'</p>'});

				rules[shape] = parseInt(count);
			}

			sides[1].find('riddlerscreen').addClass('on');

			
		}*/

		let order = [];
		while(order.length<range) order[order.length] = order.length;
		shuffle(order);

		for(var t in things){
			self.$el.find('riddlerscreen')
			.eq((24-range)/2+order[t])
			.attr('s',things[t].s)
			.html(things[t].t)
			.addClass('on');
		}

		self.$el.addClass('enabled');
		isEnabled = true;
	}

	//


	let heads = [];
	let bodies = [];
	
	self.setPlayers = function(p){

		let counts = [0,0,0,0];

		players = p;
		players.length = 2;
		
		for(var p in players){
			if(!heads[p]){
				heads[p] = $('<riddlerhead>');
				bodies[p] = $('<riddlerbody>');
			}
			
			let ix = Math.floor(players[p].px/25);
			counts[ix]++;

	
			isPositionCorrect = true;

			if(rules['L']) isPositionCorrect = isPositionCorrect && (rules['L'] == counts[0]);
			if(rules['R']) isPositionCorrect = isPositionCorrect && (rules['R'] == counts[3]);

			checkCorrect();

			heads[p].appendTo(sides[1].find('riddlerscreen').eq(ix)).css('left',((players[p].px%25)/25)*100+'%');
			bodies[p].appendTo(sides[1].find('riddlerscreen').eq(ix+4)).css('left',((players[p].px%25)/25)*100+'%');

			let scale = 0.5 + (players[p].pz/100)*0.5;
			let o = {
				'opacity':(players[p].pz/2)+'%',
				'transform':'scale('+scale+') translateX(-50%)'
			}

			heads[p].css(o);
			bodies[p].css(o);
		}
	}

	function doIntro(){
		self.$el.find('riddlerscreen').addClass('on');
		setTimeout( function(){ doTitle('Riddle Challenge')},500);
		setTimeout( function(){ doTitle('Solve the Riddles<br>and beat the Riddler')},3500);
		setTimeout( nextQuestion,7000);
	}

	function doTitle(text){
		$('<h1>')
		.appendTo(sides[1])
		.html(text)
		.css({'opacity':0})
		.animate({'opacity':1})
		.delay(1500)
		.animate({'opacity':0},{duration:500,complete:dump});
	}

	function dump(){
		$(this).remove();
	}

	doIntro();
	//nextQuestion();
	self.setPlayers([{px:15}]);
}