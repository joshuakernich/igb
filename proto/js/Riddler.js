


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

		 'font-family': "VCRFONT",


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
		'width':'6.4vw',
		'height':'4.4vw',
		'border':'0.2vw solid #1D3B0F',
		
		'margin':'0.3vw',
		'overflow':'hidden',
		'position':'relative',
		'white-space':'wrap',
		'background-color':'black',
		'transform-style': 'preserve-3d',
		'box-sizing':'border-box',
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
		'clip-path':'polygon(15% 25%, 0% 25%, 0% 0%, 15% 0%, 15% 25%, 85% 25%, 85% 0%, 100% 0%, 100% 25%, 85% 25%, 85% 75%, 100% 75%, 100% 100%, 85% 100%, 85% 75%, 15% 75%, 15% 100%, 0% 100%, 0% 75%, 15% 75% )',
	},

	'riddlerscreen.selected':{
		//'background':'#993300',
	},

	'riddlerscreen.selected:before':{
		'display':'block',
	},

	'riddlerscreen riddlertext':{
		'font-size':'0.7vw',
		'line-height':'0.9vw',
		'box-sizing':'border-box',
		'font-weight':'100',
		'letter-spacing':'0.1vw',
		'display':'inline-block',

		
		
		'position':'absolute',
		'display':'flex',
		'top':'0px',
		'left':'0.2vw',
		'right':'0.2vw',
		'bottom':'0px',

		'text-align':'center',

		'justify-content':'center',
		'align-items':'center',
	},

	'riddlerrow':{
		'transform-style': 'preserve-3d',
		'display':'block',
	},

	'riddlerhead':{
		'background':'url(./bat/batman-red-fadeout.png)',
		'background-position-x':'center',
		'background-position-y':'-15%',
		'width':'7vw',
		'height':'3vw',
		'position':'absolute',
		'bottom':'0px',
		'display':'block',
		'background-size':'100%',
		'background-repeat':'no-repeat',
		'transform':'translateX(-50%)',
		'opacity':'0.5',
		'transform-origin':'bottom center',
		'transition':'background-position-y 0.2s',
	},

	'riddlerbody':{
		'background':'url(./bat/batman-red-fadeout.png)',
		'background-position-x':'center',
		'background-position-y':'95%',
		'width':'7.2vw',
		'height':'7.2vw',
		'position':'absolute',
		'top':'0px',
		'display':'block',
		'background-size':'100%',
		'transform':'translateX(-50%)',
		'transform-origin':'bottom center',
		'opacity':'0.5',
		'background-repeat':'no-repeat',
		'transition':'background-position-y 0.2s',
	},

	'riddlerhead[squat="true"]':{
		'background-position-y':'-100%',
	},

	'riddlerbody[squat="true"]':{
		'background-position-y':'-10%',
	},

	'.riddler button':{
		'background':'none',
		'color':'white',
		'border':'none',
		'font':'inherit',
		'font-size':'1vw',
		'padding':'1vw',
	},

	'.riddler h1':{
		'position':'absolute',
		'top':'0px',
		'bottom':'0px',
		'left':'0px',
		'right':'0px',
		'font-size':'2vw',
		'line-height':'2vw',
	},

	'riddlerbomb':{
		'position':'absolute',
	
		'bottom':'2.5vw',
		'left':'0px',
		'right':'0px',
		'width':'7.5vw',
		'height':'6vw',
		'margin':'auto',
		'background':'url(./proto/img/riddler-bomb.png)',
		'background-size':'100%',
		'background-position':'center',
		'background-repeat':'no-repeat',
		'pointer-events':'none',
	},

	'riddlerbombtimer':{
		
		'top':'0.9vw',
		'bottom':'0vw',
		'left':'0px',
		'right':'0px',
		'width':'5vw',
		'height':'2vw',
		'margin':'auto',
		'background':'black',
		'border-radius':'0.5vw',
		'position':'absolute',
		'font-size':'0.9vw',
		'line-height':'2vw',
		'border':'0.2vw solid #1D3B0F'

	}


}

$("head").append('<style>'+Css.of(css)+'</style>');

EmojiToUnicode = function(emoji){
	return emoji.codePointAt(0).toString(16).toUpperCase();
}

Riddler = function(){

	const COUNT = 20;

	const DICTIONARY = {
		'cheese':'🧀',
		'shoe':'👞',
		'bag':'👜',
		'burger':'🍔',
		'pizza':'🍕',
		'melon':'🍉',
		'raindrop':'💧',
		'snowman':'⛄',
		'clock':'🕑',
		'car':'🚗',
		'helicopter':'🚁',
		'rocket':'🚀',
		'umbrella':'☂',
		'pumpkin':'🎃',
	}

	const SYMBOLS = [];
	for(var d in DICTIONARY) SYMBOLS.push({name:d,symbol:DICTIONARY[d]});

	const LIST = [
		'riddler',
		'🧀','👞','👙','👜','🌝','🍔','🍕','🍉','💧','⛄',
		'🕑','🎪','🚗','🚁','🚀','☂','⚡','🎃','🎄',
	]

	let questions = [

	
		//riddles
		{type:'riddle',q:['I have a face…','…and I have hands'],rights:['🕑'],wrongs:['🙌','🧀','👞','👙','👜','🌝']},
		{type:'riddle',q:['I am not alive…','…but I grow…','…and water kills me'],rights:['🔥'],wrongs:['🍔','🍕','🍉','💧','⛄']},
		{type:'riddle',q:['I’m full of holes…','…but I hold water'],rights:['🧽'],wrongs:['🍔','🍕','🚗','🎃','⛄']},
		{type:'riddle',q:['I can fly…','…but I have no wings'],rights:['🎈'],wrongs:['🦋','🧀','👞','👙','🕷','🦆']},
		{type:'riddle',q:['I’m tall when I’m young…','…but I’m short when I’m old'],rights:['🕯'],wrongs:['🦋','🧀','👞','👙','📺','🦆']},
		{type:'riddle',q:['The more you use me…','…the smaller I get'],rights:['✏'],wrongs:['🦋','🎄','👞','👙','📺','🦆']},
		{type:'riddle',q:['The more you take away…','…the bigger I get'],rights:['🕳'],wrongs:['🏦','🧀','💰','👙','📺','🦆']},

		//sides
		{type:'riddle',q:['What has two sides?'],rights:['🪙'],wrongs:['🕑','♥','📽','⬜','♠','🔺','♦','💰','♣']},
		{type:'riddle',q:['What does NOT have two sides?'],rights:['⬜','🔺','🔶','🔴','❌','🔻'],wrongs:[]},

		//not right
		{type:'riddle',q:['Something is not right'],rights:['⬅'],wrongs:['🍔','🍕','🍉','👞','⛄']},
		{type:'riddle',q:['Some things are not right'],rights:['poker-mistake-3C','poker-mistake-5S'],wrongs:['poker-AS','poker-2S','poker-3S','poker-4C','poker-5S']},
		{type:'riddle',q:['Some things are not wrong'],rights:['poker-AS','poker-2S','poker-3S','poker-4C','poker-5S'],wrongs:['poker-mistake-3C','poker-mistake-5S']},
		{type:'riddle',q:["What's left?"],rights:['⬅','👈','🖐'],wrongs:['↔','⬆','⬇','↘','🤚','👉','👆','👇']},

		//not not
		{type:'notnot',q:['3-A'],s:'AAABBBCCC'},
		{type:'notnot',q:['3-NA'],s:'AAABBBCCC'}, 						// introduce NOT
		{type:'notnot',q:['3-B','1-NB'],s:'AAABBBCCCDDD'},
		{type:'notnot',q:['2-NA','2-NB'],s:'AAABBBCCCDDD'},
		{type:'notnot',q:['2-B','2-NB','2-NA'],s:'AAABBBCCCDDD'},
		{type:'notnot',q:['2-NNA'],s:'AAABBBCCCDDD'},  					// introduce NOT NOT
		{type:'notnot',q:['2-NNNB'],s:'AAABBBCCCDDD'},					// introduce NOT NOT NOT
		{type:'notnot',q:['2-NA','1-NNB','1-NNNC'],s:'AAABBBCCCDDD'}, 	// COMBO of NOT NOTS
		{type:'notnot',q:['5-*'],s:'AAABBBCCCDDD'}, 					// introduce nothings
		{type:'notnot',q:['1-?'],s:'AAABBBCCCDDD'},						// introduce riddle screens
		{type:'notnot',q:['1-*','1-B','1-C','1-A','3-?'],s:'AAABBBCCCDDD'},// COMBO (no NOTS)
		
		//movement
		{type:'notnot',q:['1-R','2-?']},
		{type:'notnot',q:['2-R']},
		{type:'notnot',q:['1-R','1-L']},
		{type:'notnot',q:['2-S']},
		{type:'notnot',q:['2-S','1-R','1-L']},

		//two things
		{type:'riddle',q:['It takes two words…','…to flutter by.'],rights:['🧈','🪰'],wrongs:['🙌','🧀','👞','👙','👜','🌝','🛞','🪑']},
		{type:'riddle',q:['It takes two words…','…when you don’t want to knock.'],rights:['🚪','🔔'],wrongs:['🍳','🍰','🛞','🪑','🙌','🧀','👞','👙','👜','🌝']},
		{type:'riddle',q:['It takes two words…','…to get around with a broken leg.'],rights:['🛞','🪑'],wrongs:['🍳','🍰','🚪','🔔','🙌','🧀','👞','👙','👜','🌝']},
		{type:'riddle',q:['It takes two words…','…to make a strange looking shark.'],rights:['🔨','👨‍🦲'],wrongs:['🚪','🔔','🙌','🧀','👞','👙','👜']},
		{type:'riddle',q:['It takes two words…','…to make the flattest breakfast.'],rights:['🍳','🍰'],wrongs:['🙌','🧀','👞','👙','👜','🌝','🛞','🪑']},
		{type:'riddle',q:['It takes two words…','…to bring a twinkle to the ocean.'],rights:['⭐','🐟'],wrongs:['🍳','🍰','🛞','🪑','🙌','🧀','👞','👙','👜','🌝']},
		{type:'riddle',q:['It takes two words…','…to hide things in your car.'],rights:['🥊','📦'],wrongs:['🙌','🧀','👞','👙','👜','🌝','🛞','🪑']},

		//big combo
		{type:'notnot',q:['1-B','1-NB','2-?','2-*','1-R','1-L','1-S'],s:'AAABBBCCC'},

		//final
		{type:'final'},

		
	];

	let MOVES = {
		'L':'left',
		'R':'right',
		'S':'squat',
	}

	

	let iQuestion = -1;
	
	let isEnabled = false;

	let self = this;
	self.$el = $('<igb class="riddler">');



	let audio = new AudioContext();
	audio.add('tension',"./proto/audio/riddler-tension.mp3",0.5,false,true);
	audio.add('boom',"./proto/audio/riddler-boom.mp3");
	audio.add('music',"./proto/audio/riddler-music.mp3",0.5,true,false);
	audio.add('select',"./proto/audio/riddler-select.mp3");
	audio.add('correct',"./proto/audio/riddler-correct.mp3");
	audio.add('fail',"./proto/audio/riddler-fail.mp3");
	audio.add('incorrect',"./proto/audio/riddler-fail-short.mp3");
	audio.add('tv-on',"./proto/audio/riddler-tv-on.mp3");
	audio.add('tv-off',"./proto/audio/riddler-tv-off.mp3");
	audio.add('laugh-a',"./proto/audio/riddler-laugh.mp3");
	audio.add('laugh-b',"./proto/audio/riddler-laugh-b.mp3");
	audio.add('intro',"./proto/audio/riddler-intro.mp3");
	audio.add('intro-finale',"./proto/audio/riddler-intro-finale.mp3");


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

				for(var c=0; c<4; c++) $('<riddlerscreencorner>').appendTo($d);
			}
		}
	}

	$('<button>SKIP</button>').appendTo(sides[2]).click(doCorrect);

	let $bomb = $('<riddlerbomb>').appendTo(sides[1]);
	let $timer = $('<riddlerbombtimer>').appendTo($bomb);


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
	let $mistake = undefined;
	let isTouchCorrect = true;
	let isPositionCorrect = false;
	let question = undefined;
	
	function onToggle(){
		
		

		$(this).toggleClass('selected');

		let isSelected = $(this).hasClass('selected');

		if(isSelected) audio.play('select',true);

		if (isSelected) selected.push(this);
		else selected.splice( selected.indexOf(this), 1 );


		if(question.type=='notnot'){
			isTouchCorrect = true;

			let combo = {
				'A':0,'B':0,'C':0,'D':0,
				'*':0,'?':0,
			};

			let total = 0;
			let notsTotal = 0;

			for(var s in selected){
				let shape = $(selected[s]).attr('s');

				if(!shape) shape = '*';
				combo[shape]++;

				total++;
				if(rules[shape]==undefined) notsTotal ++;
				if(rules[shape]==undefined && rules['N'+shape]>0) $mistake = $(selected[s]);
				
			}


			let totalRequired = 0;
			let notsRequired = 0;

			for(var r in rules){
				
				if(r!= 'L' && r!= 'R'){
					totalRequired += rules[r];
					if( r.length>1 ) notsRequired += rules[r];
				}
			}

			for(var c in combo) combo['N'+c] = total - combo[c];

			if(total<totalRequired) isTouchCorrect = false;

			if(total>totalRequired){
				$mistake = $(selected[s]);
			} else if (notsTotal>notsRequired){
				$mistake = $(selected[s]);
			}else {
				for(var c in combo){

					let input = combo[c];
					let goal = rules[c];

					if(input < goal) isTouchCorrect = false;

					if(c.length==1 && input>goal) $mistake = $(selected[s]);
				}
			}

			/*for(var r in rules){
				// THIS ISN'T ABOUT MOVEMENT
				if(r != 'R' && r!= 'L'){
					// MOVEMENT RULES
					if(r.length==1){
						//right thing but not right number
						if(combo[r] != rules[r]) isTouchCorrect = false;
					} else {
						let s = r[1];
						if((total - combo[s]) < rules[r]) isTouchCorrect = false;

					}
				}			
			}*/
		}
		

		if(question.type=='riddle'){
			
			let cntRight = 0;
			let cntWrong = 0;

			for(var s in selected){
				let value = $(selected[s]).attr('s');
				if(question.rights.indexOf(value) > -1) cntRight++;
				else $mistake = $(selected[s]);
			}

			if(cntRight == question.rights.length) isTouchCorrect = true;
			
		}

		if(question.type=='final'){

			let cntRight = 0;
			let cntWrong = 0;

			for(var s in selected){
				let value = $(selected[s]).attr('s');

				if(value=='0') cntRight++;
				else $mistake = $(selected[s]);
			}

			resetRiddlerTicker(cntRight);


			if(cntRight==COUNT){

				clearTimeout(tickRiddler);
				isTouchCorrect = true;
			}
		}


		checkCorrect();
	}

	function checkCorrect(){
		
		if($mistake){
			doMistake();
			return;
		}

		if(isEnabled && isTouchCorrect && isPositionCorrect) doCorrect();
	}


	const MAXSHUFFLE = 1500;
	const MINSHUFFLE = 400;
	let timePerShuffle = MAXSHUFFLE;
	let hasTickerStarted = false;
	let tickRiddler;

	function onRiddlerTicker(){

		$('riddlerscreen').each(function(n){

			if(!$(this).hasClass('selected')){
				let s = parseInt($(this).attr('s'));
				s = (s + 1)%LIST.length;
				paintScreen(n,s,undefined,LIST[s]);
			}
			
		})

		tickRiddler = setTimeout(onRiddlerTicker,timePerShuffle);
		hasTickerStarted = true;
	}

	
	function resetRiddlerTicker(cntCorrect){
		timePerShuffle = MINSHUFFLE + (MAXSHUFFLE-MINSHUFFLE)*(1-cntCorrect/(COUNT-1));
		if(!hasTickerStarted) tickRiddler = setTimeout(onRiddlerTicker,timePerShuffle);
		hasTickerStarted = true;
	}

	function doMistake(){
		
		if(isEnabled){
			isEnabled = false;
			self.$el.removeClass('enabled');
			setTimeout(celebrateMistake,500);
		}
	}

	function celebrateMistake(){

		audio.play('incorrect',true);

		$mistake.addClass('fail');

		
		setTimeout(resetMistakes,500);
	}

	function resetMistakes(){
		isEnabled = true;
		self.$el.addClass('enabled');

		let $clear = $mistake;
		$mistake = undefined;
		$clear.removeClass('fail').click();

	}

	function doFail(){
		if(isEnabled){
			isEnabled = false;
			self.$el.removeClass('enabled');
			setTimeout(celebrateFailure,1000);
		}
	}

	function doCorrect(){
		if(isEnabled){
			isEnabled = false;
			self.$el.removeClass('enabled');
			setTimeout(celebrateCorrect,1000);
		}
	}

	function celebrateFailure(){

		audio.play('fail',true);

		self.$el.find('riddlerscreen')
		.removeClass('selected')
		.addClass('fail').each(function(){
			let $p = $('<riddlertext>FAIL<br>FAIL<br>FAIL<br>FAIL<br>FAIL<br>FAIL</riddlertext>').animate({top:'-2vw'},{duration:1500,easing:'linear'});
			$(this).html($p);
		})
		
		setTimeout(nextQuestion,1500);
	}

	function celebrateCorrect(){

		audio.play('correct',true);
		
		self.$el.find('riddlerscreen')
		.removeClass('selected')
		.addClass('on').each(function(){
			let $p = $('<riddlertext>PERFECT<br>PERFECT<br>PERFECT<br>PERFECT<br>PERFECT<br>PERFECT</riddlertext>').animate({top:'-2vw'},{duration:1500,easing:'linear'});
			$(this).html($p);
		})

		setTimeout(nextQuestion,1500);
	}

	let rules = {};
	function nextQuestion(){

		rules = {};
		selected = [];
		iQuestion ++;

		self.$el.find('riddlerscreen').empty().removeClass('selected on fail').attr('s','*');

		let things = [];
		question = questions[iQuestion];
		
		let symbols = SYMBOLS.concat();
		shuffle(symbols);

		let symbolsForQuestion = {
			'A':symbols[0],
			'B':symbols[1],
			'C':symbols[2],
			'D':symbols[3],
			'?':{name:'riddle screen'},
			'*':{name:'nothing'},
		}

		isMistake = false;
		isTouchCorrect = true;
		isPositionCorrect = true;

		if(question.type=='notnot'){
			
			let q = question.q;
			let total = 0;
			
			for(var i=0; i<q.length; i++){
				let rule = q[i].split('-');
				
				let count = parseInt(rule[0]);
				let nots = rule[1].substr(0,rule[1].length-1);
				let shape = rule[1][rule[1].length-1];

				let isNot = (nots.length%2==1);

				if(isNot) rules['N'+shape] = parseInt(count);
				else rules[shape] = parseInt(count);

				let text = ''
				if(shape == 'S'){
					isPositionCorrect = false;
					text = count+' player'+(count>1?'s':'')+' must squat';
				} else if(shape=='R' || shape=='L'){
					isPositionCorrect = false;
					text = 'Move '+count+' player'+(count>1?'s':'')+' to the '+MOVES[shape];
				}
				else {
					isTouchCorrect = false;

					let strNots = '';
					for(var n=0; n<nots.length; n++) strNots += 'NOT ';

					text = 'Touch '+count+' '+strNots+symbolsForQuestion[shape].name+(count>1?'s':'');
					total += count;
				}

				if(i>0) text = '…and '+text;

				if(i<q.length-1) text = text+'…';

				things.push({s:'?',t:'<riddlertext>'+text+'</riddlertext>'});
			}



			if(question.s){
				for(var s=0; s<question.s.length; s++){
					let shape = question.s[s];
					things.push({s:shape,symbol:symbolsForQuestion[shape].symbol});
				}
			}
		}

		if(question.type=='riddle'){
			isTouchCorrect = false;
			
			for(var ir in question.rights) things.push({s:question.rights[ir],symbol:question.rights[ir]});
			for(var id in question.wrongs) things.push({s:question.wrongs[id],symbol:question.wrongs[id]});
			shuffle(things);

			for(var iq in question.q) things.unshift({s:'I',t:'<riddlertext>'+question.q[iq]+'</riddlertext>'});
		}
	
		
		if(question.type=='final'){
			isEnabled = false;
			isTouchCorrect = false;
			doIntroFinale();
		} else {

			let order = [];
			while(order.length<COUNT) order[order.length] = order.length;
			shuffle(order);
			

			for(var t=0; t<things.length; t++) paintScreen(order[t],things[t].s,things[t].t,things[t].symbol,200 + t*200);

			isEnabled = true;
			self.$el.addClass('enabled');
		}
	}

	function doIntroFinale(){

		
		
		let order = [];
		while(order.length<COUNT) order[order.length] = order.length;
		shuffle(order);

		let text = '<riddlertext>WHERE<br>AM I?</riddlertext>';

		for(var i=0; i<order.length; i++) paintScreen(order[i],i,text,undefined,7000 + i*100);

		audio.stop('music');
		audio.play('boom',true);
		audio.play('tension');
		
		setTimeout(function(){
			audio.play('intro-finale');
		},2000);


		setTimeout(function(){
			audio.stop('tension');
			audio.play('boom',true);
			self.$el.find('riddlerscreen').empty().removeClass('on').attr('s','*');
		},12000);

		setTimeout(function(){

			for(var i=0; i<order.length; i++) paintScreen(order[i],i,undefined,'riddler');

			audio.play('music',true);

			onRiddlerTicker();

			isEnabled = true;
			self.$el.addClass('enabled');
		},17000);
		
		
	}

	function paintScreen(n,s,t,symbol,delay){

		if(delay){
			setTimeout(function(){
				paintScreen(n,s,t,symbol);
			},delay);
			return;
		}

		audio.play('tv-on',true);

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

	let nData = 0;
	let minPY = [30,30];
	
	self.setPlayers = function(p){

		console.log(minPY);

		let countsX = [0,0,0,0];
		let countsY = [0,0];
		
		nData++;


		players = p;
		players.length = 2;
		
		for(var p in players){
			if(!heads[p]){
				heads[p] = $('<riddlerhead>');
				bodies[p] = $('<riddlerbody>');
			}


			
			let ix = Math.floor(players[p].px/25);
			countsX[ix]++;

			if( players[p].py < minPY[p] && players[p].py > 50 ) minPY[p] = players[p].py;


			let iy = ( players[p].py > (minPY[p] + 15) )?1:0;
			countsY[iy]++;

	
			isPositionCorrect = true;

			if(rules['L']) isPositionCorrect = isPositionCorrect && (rules['L'] == countsX[0]);
			if(rules['R']) isPositionCorrect = isPositionCorrect && (rules['R'] == countsX[3]);
			if(rules['S']) isPositionCorrect = isPositionCorrect && (rules['S'] == countsY[1]);

			checkCorrect();

			let $elHead = sides[1].find('riddlerscreen').eq(ix);
			let $elBody = sides[1].find('riddlerscreen').eq(ix+4);


			if( !heads[p].parent().is($elHead) ) heads[p].appendTo($elHead);
			heads[p].css('left',((players[p].px%25)/25)*100+'%');

			if( !bodies[p].parent().is($elBody) ) bodies[p].appendTo($elBody);
			bodies[p].css('left',((players[p].px%25)/25)*100+'%');

			let scale = 0.5 + (players[p].pz/100)*0.5;
			let o = {
				'opacity':(players[p].pz/2)+'%',
				//'transform':'scale('+scale+') translateX(-50%)'
			}

			heads[p].css(o).attr('squat',iy==1?true:false);
			bodies[p].css(o).attr('squat',iy==1?true:false);
		}
	}

	function doIntro(){
		//self.$el.find('riddlerscreen').addClass('on');
		//setTimeout( function(){ doTitle('Riddle Challenge')},500);
		//setTimeout( function(){ doTitle('Solve the Riddles<br>and beat the Riddler')},3500);
		//setTimeout( nextQuestion,7000);
		//nextQuestion();

		let order = [];
		while(order.length<COUNT) order[order.length] = order.length;
		shuffle(order);

		for(var i=0; i<order.length; i++) paintScreen(order[i],'riddler',undefined,'riddler',2000 + i*200);

		setTimeout(function(){
			audio.play('laugh-a');
		},3000);

		setTimeout(function(){
			audio.play('laugh-b');
		},5000);

		setTimeout(function(){
			audio.play('intro');
		},7000);


		setTimeout(function(){
			audio.play('select',true);
			$timer.text('10:00.00');
		},20000);

		setTimeout(function(){
			for(var i=0; i<COUNT; i++) paintScreen(i,'boom','<riddlertext>BOOM!</riddlertext>',undefined);
			audio.stop('tension');
			audio.play('boom');
		},22500);

		

		setTimeout(doIntroComplete,28000);
	}

	let msStart = undefined;
	const MSMAX = 10*60*1000;
	function to2Digit(value){
		let s = value.toString();
		if(s.length==2) return s;
		return '0'+s;
	}

	function tick(){
		let msNow = new Date().getTime();
		let msElapsed = msNow-msStart;
		let msRemaining = MSMAX-msElapsed;

		let secsRemaining = Math.floor(msRemaining/1000)%60;
		let minsRemaining = Math.floor(msRemaining/(60*1000));
		let jifsRemaining = Math.floor(msRemaining/10)%100;

		let timeStamp = to2Digit(minsRemaining)+':'+to2Digit(secsRemaining)+'.'+to2Digit(jifsRemaining);
		$timer.text(timeStamp);
	}

	function doIntroComplete(){
		
		self.$el.find('riddlerscreen').empty().removeClass('selected on fail').attr('s','*');
		audio.play('select',true);

		

		msStart = new Date().getTime();
		setInterval(tick,20);

		setTimeout(function(){
			audio.play('music');
		}, 500);
		setTimeout(nextQuestion, 2500);
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

	let hasStarted = false;
	$(document).click(function(){
		if(!hasStarted){
			audio.play((iQuestion==-1||iQuestion==questions.length-1)?'tension':'music');
			hasStarted = true;
		}
	});

	let skipID = window.location.search.substr(1).split('&')[1];

	if(skipID!=undefined){
		iQuestion = skipID-1;
		nextQuestion();
	} else {
		//doIntro();
	}

	self.setPlayers([{px:15}]);

	let bSpread = false;
	$(document).on('mousedown',function(e){
		bSpread = true;
	})

	$(document).on('mouseup',function(e){
		bSpread = false;
	})

	$(document).on('mousemove',function(e){
		
		let oSide = sides[1].offset();
		let oGame = self.$el.offset();
		let w = self.$el.width()/3;
		let h = self.$el.height();

		let x = (e.pageX - oSide.left)/w;
		let y = (e.pageY - oGame.top)/h;

		let px = x*100;
		let py = y*100;
		let pz = 80;
		
		self.setPlayers([
			{px:px-5*(bSpread?8:1),py:py,pz:pz},
			{px:px+5*(bSpread?8:1),py:py,pz:pz}
			])
	})

}