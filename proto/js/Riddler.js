

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

		 'font-family': "VT323",


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

	'.riddler igbside:first-of-type riddlerscreens':{
		'padding-left':'20%',
	},

	'.riddler igbside:last-of-type riddlerscreens':{
		'padding-right':'20%',
	},

	'.riddler.enabled':{
		'pointer-events':'auto',
	},

	'riddlerscreen':{
		'display':'inline-block',
		'width':'6vw',
		'height':'4vw',
		'border':'0.2vw solid #1D3B0F',
		'line-height':'3.6vw',
		'margin':'0.3vw',
		'overflow':'hidden',
		'position':'relative',
		'white-space':'wrap',
		'background-color':'black',
		'transform-style': 'preserve-3d',
	},

	'riddlerscreen img':{
		'position':'absolute',
		'width':'3vw',
		'height':'3vw',
		'margin':'auto',
		'top':'0px',
		'left':'0px',
		'right':'0px',
		'bottom':'0px',
		'filter': 'invert(100%)',
	},

	'riddlerscreen img.poker-card':{
		'height':'4vw',
		'bottom':'-1vw',
		'transform':'rotate(10deg)',
	},

	'riddlerscreen img.riddler-face':{
		'height':'3.5vw',
		'bottom':'0px',
		'top':'auto',
		'background-position':'center bottom',
	},

	'riddlerscreen.on':{
		'background-color':'darkgreen',
	},

	'riddlerscreen.fail':{
		'background-color':'red',
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

	'riddlerscreen.selected:after':{
		'content':'" "',
		'position':'absolute',
		'top':'0.2vw',
		'left':'0.2vw',
		'right':'0.2vw',
		'bottom':'0.2vw',
		'border':'0.1vw solid white',
	},

	'riddlerscreen.selected':{
		//'background':'#993300',
	},

	'riddlerscreen.selected:before':{
		'display':'block',
	},

	'riddlerscreen p':{
		'font-size':'1vw',
		'line-height':'1vw',
		'box-sizing':'border-box',
		'font-weight':'100',
		'letter-spacing':'0.1vw',
		'display':'inline-block',

		'width':'90%',
		'margin':'0px',
		'padding':'0px',
		'position':'relative',
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
		'border':'none',
		'font':'inherit',
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

EmojiToUnicode = function(emoji){
	return emoji.codePointAt(0).toString(16).toUpperCase();
}

Riddler = function(){

	const LIST = [
		'riddler',
		'🧀','👞','👙','👜','🌝','🍔','🍕','🍉','💧','⛄',
		'🕑','🎪','🚗','🚁','🚀','☂','⚡','🎃','🎄',
	]

	let questions = [

	

		//riddles
		{type:'riddle',q:['I have a face','I have hands'],rights:['🕑'],wrongs:['🙌','🧀','👞','👙','👜','🌝']},
		{type:'riddle',q:['I am not alive','I grow','Water kills me'],rights:['🔥'],wrongs:['🍔','🍕','🍉','💧','⛄']},
		{type:'riddle',q:['I’m full of holes','I hold water'],rights:['🧽'],wrongs:['🍔','🍕','🚗','🎃','⛄']},
		{type:'riddle',q:['I can fly','I have no wings'],rights:['🎈'],wrongs:['🦋','🧀','👞','👙','🕷','🦆']},
		{type:'riddle',q:['I’m tall when I’m young','I’m short when I’m old'],rights:['🕯'],wrongs:['🦋','🧀','👞','👙','📺','🦆']},
		{type:'riddle',q:['The more you use me...','...the smaller I get'],rights:['✏'],wrongs:['🦋','🧀','👞','👙','📺','🦆']},
		{type:'riddle',q:['The more you take away...','...the bigger I get'],rights:['🕳'],wrongs:['🏦','🧀','💰','👙','📺','🦆']},

		//not right
		{type:'riddle',q:['Something is not right'],rights:['⬅'],wrongs:['🍔','🍕','🍉','👞','⛄']},
		{type:'riddle',q:['Some things are not right'],rights:['poker-mistake-3C','poker-mistake-5S'],wrongs:['poker-AS','poker-2S','poker-3S','poker-4C','poker-5S']},

		//not not
		{type:'notnot',q:['3-C'],s:'CSTCSTCST'},
		{type:'notnot',q:['3-NC'],s:'CSTCSTCST'},
		{type:'notnot',q:['3-S','1-NS'],s:'CSTCSTCST'},
		{type:'notnot',q:['2-S','2-NS','2-NC'],s:'CSTCSTCST'},
		{type:'notnot',q:['5-B'],s:'CSTCSTCST'},
		{type:'notnot',q:['1-I'],s:'CSTCSTCST'},
		{type:'notnot',q:['1-B','1-S','1-T','1-C','3-I'],s:'CSTCSTCST'},
		
		//movement
		{type:'notnot',q:['1-R','2-I']},
		{type:'notnot',q:['2-R']},
		{type:'notnot',q:['1-R','1-L']},
		{type:'notnot',q:['1-S','1-NS','2-I','2-B','1-R','1-L'],s:'CSTCSTCST'},

		//final
		{type:'final',q:['Something is not right'],rights:['⬅'],wrongs:['🍔','🍕','🍉','👞','⛄']},

		
	];

	let MOVES = {
		'L':'left',
		'R':'right',
	}

	let SHAPES = {
		'C':'cheese',
		'S':'fire',
		'T':'snowman',
		'B':'blank screen',
		'I':'riddle screen',
	}

	let SYMBOLS = {
		'C':'🧀',
		'S':'🔥',
		'T':'⛄',
	}

	let iQuestion = -1;
	
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
			for(let x=0; x<(i==1?4:3); x++){
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
	let isMistake = false;
	let isTouchCorrect = true;
	let isPositionCorrect = false;
	let question = undefined;
	
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

		if(question.type=='notnot'){
			isTouchCorrect = true;
			for(var r in rules){
			
				if(r != 'R' && r!= 'L'){
					if(r.length==1){
						//right thing but not right number
						if(combo[r] != rules[r]) isTouchCorrect = false;
					} else {
						let s = r[1];
						if((combo['total'] - combo[s]) < rules[r]) isTouchCorrect = false;

					}
				}			
			}
		}
		

		if(question.type=='riddle'){
			
			let cntRight = 0;
			let cntWrong = 0;

			for(var s in selected){
				let value = $(selected[s]).attr('s');
				if(question.rights.indexOf(value) > -1) cntRight++;
				else cntWrong++;
			}

			if(cntRight == question.rights.length) isTouchCorrect = true;
			if(cntWrong > 0) isMistake = true;
		}

		if(question.type=='final'){

			let cntRight = 0;
			let cntWrong = 0;

			for(var s in selected){
				let value = $(selected[s]).attr('s');

				if(value=='0') cntRight++;
				else cntWrong++;
			}

			resetRiddlerTicker(cntRight);

			if(cntRight==20){
				clearInterval(tickRiddler);
				doCorrect();
			}
		}


		checkCorrect();
	}

	function checkCorrect(){
		
		if(isMistake){
			doFail();
			return;
		}

		if(isEnabled && isTouchCorrect && isPositionCorrect) doCorrect();
	}

	function onRiddlerTicker(){


		$('riddlerscreen').each(function(n){

			if(!$(this).hasClass('selected')){
				let s = parseInt($(this).attr('s'));
				s = (s + 1)%LIST.length;
				paintScreen(n,s,undefined,LIST[s]);
			}
			
		})
	}

	let tickRiddler = undefined;
	function resetRiddlerTicker(cntCorrect){
		clearInterval(tickRiddler);
		tickRiddler = setInterval(onRiddlerTicker,1500-cntCorrect*50);
	}

	function doFail(){
		if(isEnabled){
			isEnabled = false;
			self.$el.removeClass('enabled');
			setTimeout(celebrateFailure,500);
		}
	}

	function doCorrect(){
		if(isEnabled){
			isEnabled = false;
			self.$el.removeClass('enabled');
			setTimeout(celebrateCorrect,500);
		}
	}

	function celebrateFailure(){
		self.$el.find('riddlerscreen')
		.removeClass('selected')
		.addClass('fail').each(function(){
			let $p = $('<p>FAIL<br>FAIL<br>FAIL<br>FAIL<br>FAIL<br>FAIL</p>').animate({top:'-2vw'},{duration:1500,easing:'linear'});
			$(this).html($p);
		})
		
		setTimeout(nextQuestion,1500);
	}

	function celebrateCorrect(){

		
		self.$el.find('riddlerscreen')
		.removeClass('selected')
		.addClass('on').each(function(){
			let $p = $('<p>PERFECT<br>PERFECT<br>PERFECT<br>PERFECT<br>PERFECT<br>PERFECT</p>').animate({top:'-2vw'},{duration:1500,easing:'linear'});
			$(this).html($p);
		})

		setTimeout(nextQuestion,1500);
	}

	let rules = {};
	function nextQuestion(){

		rules = {};
		selected = [];
		iQuestion ++;

		self.$el.find('riddlerscreen').empty().removeClass('on fail').attr('s','B');

		let things = [];
		question = questions[iQuestion];
		let range = 20;

		isMistake = false;
		isTouchCorrect = true;
		isPositionCorrect = true;

		if(question.type=='notnot'){
			
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

			if(question.s){
				for(var s=0; s<question.s.length; s++){
					let shape = question.s[s];
					things.push({s:shape,symbol:SYMBOLS[shape]});
				}
			}
		}

		if(question.type=='riddle'){
			isTouchCorrect = false;
			for(var iq in question.q) things.push({s:'I',t:'<p>'+question.q[iq]+'</p>'});
			for(var ir in question.rights) things.push({s:question.rights[ir],symbol:question.rights[ir]});
			for(var id in question.wrongs) things.push({s:question.wrongs[id],symbol:question.wrongs[id]});
		}

		if(question.type=='final') {
			isTouchCorrect = false;
			while(things.length<range) things.push({s:things.length,symbol:LIST[things.length]});

			resetRiddlerTicker(0);
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

			paintScreen(order[t],things[t].s,things[t].t,things[t].symbol);

			
		}

		self.$el.addClass('enabled');
		isEnabled = true;
	}

	function paintScreen(n,s,t,symbol){

		let $s = self.$el.find('riddlerscreen').eq(n);
		$s.attr('s',s).addClass('on');
		if(t) $s.html(t);
		if(symbol){

			if(symbol == 'riddler'){
				$s.html(`<img class='riddler-face' src='./proto/img/riddler.png'>`);
			} else if(symbol.indexOf('poker')>-1){
				$s.html(`<img class='poker-card' src='./proto/img/poker/${symbol.substr(6)}.svg'>`);
			} else {
				$s.html(`<img src='./proto/img/emoji/${EmojiToUnicode(symbol)}.png'>`);
			}
			
		}
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
		//setTimeout( function(){ doTitle('Riddle Challenge')},500);
		//setTimeout( function(){ doTitle('Solve the Riddles<br>and beat the Riddler')},3500);
		//setTimeout( nextQuestion,7000);
		nextQuestion();
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