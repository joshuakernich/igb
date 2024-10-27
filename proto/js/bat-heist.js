
BatHeistLamp = function(actor){
	let self = this;
	self.$el = $('<heistlamp>');
	let $upper = $('<heistlampupper>').appendTo(self.$el);
	let $lower = $('<heistlamplower>').appendTo(self.$el);

	self.actor = actor;
	self.offset = {x:0,y:-BatHeist.LAMP.H/2};

	self.trigger = function(){
		$upper.hide();
		self.offset.y = 0;
		$(actor).animate({y:1},{duration:300,easing:'linear',complete:self.die});
	}

	self.die = function(){
		self.dead = true;
		$(actor).stop();
		self.$el.empty();
		$('<heistpulse>').appendTo(self.$el);
	}

	self.interactWith = function(other,d){
		if(d<BatHeist.RTARGET*2) self.die();
	}
}

BatHeistGoon = function(actor){
	const LOOP = BatHeist.FPS*5;

	let self = this;
	self.$el = $('<heistgoon>');
	self.offset = {x:0,y:-BatHeist.GOON.H + BatHeist.GOON.W/2};

	let xAnchor = actor.x;
	let nTick = Math.random()*LOOP;

	self.trigger = function(){
		self.triggered = true;
		self.$el.attr('pose','dead');
	}

	self.step = function(){
		if(!self.triggered && !self.dead) nTick++;
		actor.x = xAnchor + Math.cos(nTick/LOOP*Math.PI*2) * 0.1;
	}

	self.die = function(){
		self.dead = true;
		self.$el.attr('pose','dead');
	}

	self.alert = function(){
		$('<heisticon>').appendTo(self.$el);
	}

	self.interactWith = function(other,d) {

		if(self.triggered) return;

		if(d<BatHeist.RTARGET*2 && other.type=='lamp') self.die();

		if(other.type=='hostage' && other.sprite.free){
			self.alert();
			return "Hostage has been spotted!";
		}

		if(other.type=='goon' && other.sprite.triggered){
			self.alert();
			return "You have been spotted!";
		}


	}
}

BatHeistHostage = function(actor){
	let self = this;
	self.$el = $('<heistgoon>').attr('is','goody').attr('pose','sit');
	self.offset = {x:0,y:-BatHeist.HOSTAGE.H/2};

	let $ropes = $('<heistropes>').appendTo(self.$el);

	self.step = function(){
		if(self.free && !self.dead){
			let dir = actor.x > 0.5?1:-1
			actor.x += dir * 0.002;
			self.complete = (actor.x<0 || actor.x>1);
		}
	}

	self.trigger = function(){
		self.free = true;

		$ropes.hide();
		self.$el.attr('pose','stand');
		self.offset.y = -BatHeist.GOON.H + BatHeist.GOON.W/2;
	}

	self.die = function(){
		self.dead = true;
	}

	self.interactWith = function(other,d) {

		if(d>BatHeist.RTARGET*2) return undefined;

		if(other.type=='lamp'){
			self.die();
			return 'Hostage is knocked out!';
		}

		
	}
}

BatHeistActor = function(actor) {
	let self = this;
	self.$el = $('<heistactor>');
	self.model = actor;
	self.type = actor.type;
	self.dead = false;
	self.failState = undefined;
	self.sprite = undefined;

	if(actor.type=='lamp') self.sprite = new BatHeistLamp(actor);
	if(actor.type=='goon') self.sprite = new BatHeistGoon(actor);
	if(actor.type=='hostage') self.sprite = new BatHeistHostage(actor);

	self.sprite.$el.appendTo(self.$el);

	let $target = $('<heisttarget>').appendTo(self.$el);

	self.getX = function(){
		return self.model.x*BatHeist.ARENA.W + self.sprite.offset.x;
	}

	self.getY = function(){
		return self.model.y*BatHeist.ARENA.H + self.sprite.offset.y;
	}

	self.trigger = function() {
		if(self.sprite.trigger) self.sprite.trigger();
		$target.hide();
	}

	self.step = function() {
		if(self.sprite.step) self.sprite.step();
		self.complete = self.sprite.complete;
	}

	self.die = function(){	
		if(!self.dead){
			self.dead = true;
			$target.hide();
		}
	}

	self.interactWith = function(other,d){
		let failState = self.sprite.interactWith(other,d);
		if(failState) self.failState = failState;
		if(self.sprite.dead) self.die();
	}

	self.collide = function(other){

		if(self.dead || other.dead) return;

		let dx = self.getX() - other.getX();
		let dy = self.getY() - other.getY();
		let d = Math.sqrt(dx*dx + dy*dy);

		self.interactWith(other,d);
		other.interactWith(self,d);		
	}

	self.redraw = function() {
		if(self.sprite.redraw) self.sprite.redraw();

		self.$el.css({left:self.model.x*BatHeist.ARENA.W +'px',top:self.model.y*BatHeist.ARENA.H + 'px'});
		$target.css({left:self.sprite.offset.x +'px',top:self.sprite.offset.y + 'px'});
	}

	self.redraw();

	$target.click(self.trigger);
}

BatHeistArena = function(layout){
	let self = this;
	self.complete = false;
	self.$el = $('<heistarena>');
	self.$el.css({left:layout.wall*BatHeist.W+layout.x+'px',top:layout.y+'px'});

	let $stage = $('<heiststage>').appendTo(self.$el);
	let $toggle = $('<heisttoggle>').appendTo(self.$el);
	let $info = $('<heistinfo>').appendTo(self.$el).text(layout.ins);
	let $reticule = $('<heistreticule>').appendTo(self.$el);

	self.$toggle = $toggle;

	let actors = [];
	for(var a in layout.actors){
		actors[a] = new BatHeistActor(layout.actors[a]);
		actors[a].$el.appendTo($stage);
	}

	const FOCUS = BatHeist.FPS;
	const SIZEMAX = BatHeist.RTARGET*4;
	const SIZEMIN = BatHeist.RTARGET*2;
	const SIZERANGE = SIZEMAX-SIZEMIN;
	const HITRANGE = BatHeist.RTARGET*4;

	let cntFocus = 0;
	self.step = function(players) {

		if(self.dead) return;

		// FIND THE RETICULE
		let rx;
		let ry;

		if(layout.wall==0){
			rx = (players[0].pz/100);
			ry = (players[0].px/100);
		} else if(layout.wall==1){
			rx = players[0].px/100;
			ry = (1-players[0].pz/100);
		} else if(layout.wall==2){
			rx = (1-players[0].pz/100);
			ry = (1-players[0].px/100);
		}

		rx = rx*BatHeist.W-layout.x;
		ry = ry*BatHeist.H-layout.y;

		let padding = BatHeist.RTARGET*2.5;
		if(rx<padding) rx = padding;
		if(ry<padding) ry = padding
		if(rx>BatHeist.ARENA.W-padding) rx = BatHeist.ARENA.W-padding;
		if(ry>BatHeist.ARENA.H-padding) ry = BatHeist.ARENA.H-padding;

		let failState = undefined;
		let isComplete = true;
		let dMin = HITRANGE;
		let targeting = undefined;

		for(var a in actors) actors[a].step();
		for(var a=0; a<actors.length; a++) for(var b=a+1; b<actors.length; b++) actors[a].collide(actors[b]);
		for(var a in actors) actors[a].redraw();
		for(var a in actors){
			if(actors[a].failState) failState = actors[a].failState;
			if(actors[a].type=='hostage' && !actors[a].complete) isComplete = false;

			let dx = actors[a].getX() - rx;
			let dy = actors[a].getY() - ry;
			let d = Math.sqrt(dx*dx+dy*dy);

			if(d<dMin){
				dMin = d;
				targeting = actors[a];
			}
		}

		if(self.isFocused){
			if(dMin<HITRANGE) cntFocus++;
			else if(cntFocus) cntFocus--;

			if(cntFocus>FOCUS){
				cntFocus = 0;
				targeting.trigger();
			}

			if(failState) self.die(failState);
			if(isComplete) self.setComplete();

			$reticule.css({
				left:rx,
				top:ry, 
				width: SIZEMAX - cntFocus/FOCUS * SIZERANGE,
				height: SIZEMAX - cntFocus/FOCUS * SIZERANGE,
			});
		}

		


		
	}

	self.setComplete = function(){
		self.dead = true;
		self.complete = true;
		self.$el.addClass('complete');
	}

	self.die = function(failState){
		self.dead = true;
		$info.text(failState);
	}

	self.setFocus = function(b){
		self.isFocused = b;
		self.$el.removeClass('focus');
		if(b) self.$el.addClass('focus');
	}
}

BatHeistGame = function(){

	const FPS = 60;
	const W = 1600;
	const H = 1000;
	const ARENA = {W:1200,H:600};
	const RTARGET = 25;

	BatHeist = {};
	BatHeist.LAMP = {STRING:10,W:80,H:150};
	BatHeist.GOON = {W:70,H:200};
	BatHeist.HOSTAGE = {W:70,H:150};
	BatHeist.ARENA = ARENA;
	BatHeist.RTARGET = RTARGET;
	BatHeist.W = W;
	BatHeist.H = H;
	BatHeist.FPS = FPS;

	$("head").append(`
		<style>
			@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700');

			heistgame{
				width:${W*3}px;
				height:${H}px;
				display:block;
				background:#333;
				box-sizing:border-box;
				transform-origin: top left;
				font-family: "Chakra Petch";
				font-weight: 300;
			}

			heistarena h1{
				color: white;
				font-size: ${ARENA.H/10}px;
				line-height: ${ARENA.H/10}px;
				text-align:center;
				z-index:2;
				position:absolute;
				background:black;
				left:0px;
				right:0px;
				top:0px;
			}

			heistactor{
				display:block;
				width:0px;
				height:0px;
				position:absolute;
			}

			heiststage{
				overflow:hidden;
				display:block;
				position:absolute;
				left:0px;
				top:0px;
				bottom:0px;
				right:0px;
			}

			heistreticule{
				display:block;
				position:absolute;
				width: ${RTARGET*4}px;
				height: ${RTARGET*4}px;
				transform: translate(-50%, -50%);
				box-sizing: border-box;
				border: 10px dashed red;

				display:none;
			}

			heistarena{
				display:block;
				position:absolute;
				background:#444;
				width:${ARENA.W}px;
				height:${ARENA.H}px;
				transform: scale(0.5);
				transition: transform 0.5s;
			}

			heistarena:before{
				content:"";
				display:block;
				position:absolute;
				left:0px;
				top:0px;
				bottom:0px;
				width:10%;
				border: 5px solid white;
				border-right: none;

				display:none;
			}

			heistarena:after{
				content:"";
				display:block;
				position:absolute;
				right:0px;
				top:0px;
				bottom:0px;
				width:10%;
				border: 5px solid white;
				border-left: none;

				display:none;
			}

			heistinfo{
				display:block;
				position:absolute;
				top: 100%;
				left: 0px;
				color: white;
				font-size: 50px;
				line-height: 70px;

				display: none;
			}

			heistarena heisttarget{
				display: none;
			}

			heistarena.focus{
				transform: scale(1);
				z-index: 1;
			}

			heistarena.focus heisttarget,
			heistarena.focus heistreticule,
			heistarena.focus:before,
			heistarena.focus:after,
			heistarena.focus heistinfo
			{
				display: block;
			}



			heisttarget{
				display:block;
				width: ${RTARGET*2}px;
				height: ${RTARGET*2}px;
				
				border-radius: 100%;
				border: 5px dashed white;
				box-sizing: border-box;
				position: absolute;
				transform: translate(-50%,-50%);
			}

			heistlamp{
				display:block;
				position:absolute;
				top:0px;
				left:0px;
				width:0px;
				height:0px;
			}

			heistlampupper{
				display:block;
				position:absolute;
				bottom:${BatHeist.LAMP.H/2}px;
				left:${-BatHeist.LAMP.STRING/2}px;
				width:${BatHeist.LAMP.STRING}px;
				height:${BatHeist.LAMP.H/2}px;
				background:orange;
			}

			heistlamplower{
				display:block;
				position:absolute;
				bottom:0px;
				left:${-BatHeist.LAMP.STRING/2}px;
				width:${BatHeist.LAMP.STRING}px;
				height:${BatHeist.LAMP.H/2}px;
				background:orange;
			}

			heistlamplower:after{
				display:block;
				position:absolute;
				content:"";
				width:${BatHeist.LAMP.W}px;
				left:${-BatHeist.LAMP.W/2+BatHeist.LAMP.STRING/2}px;
				height:${BatHeist.LAMP.W/2}px;
				border-radius:100% 100% 0px 0px;
				background:orange;
				bottom: 0px;
			}

			heistgoon{
				display:block;
				position:absolute;
				bottom:0px;
				width:${BatHeist.GOON.W}px;
				height:${BatHeist.GOON.H}px;
				transform: translate(-50%);
				background: red;
				border-radius:${BatHeist.GOON.W/2}px ${BatHeist.GOON.W/2}px 0px 0px;
			}

			heistgoon[is='goody']{
				background:green;
			}

			heistgoon[pose='sit']{
				height:${BatHeist.HOSTAGE.H}px;
			}

			heistgoon[pose='dead']{
				width:${BatHeist.GOON.H/2}px;
				height:${BatHeist.GOON.W}px;
			}

			heistropes{
				position:absolute;
				display:block;
				width:${BatHeist.GOON.W + 20}px;
				height:${BatHeist.GOON.W}px;
				background:url(./proto/img/bat-ropes.png);
				background-size: 100%;
				background-repeat: no-repeat;
				top: ${BatHeist.GOON.H/2 - BatHeist.GOON.W/2}px;
				left:-10px;
			}

			heistpulse{
				position:absolute;
				display:block;
				
				width:0px;
				height:0px;
				z-index:1;
				animation: heistpulse;
				animation-duration: 0.5s;
				animation-fill-mode: forwards;
			}

			heistpulse:after{
				content:" ";
				position:absolute;
				display:block;
				width:${BatHeist.GOON.W}px;
				height:${BatHeist.GOON.W}px;
				transform:translate(-50%, -50%);
				background:white;
			}

			heistoverlay{
				
				position: absolute;
				top: 0px;
				left: 0px;
				right: 0px;
				bottom: 0px;
				background: rgba(0,0,0,0.5);
				backdrop-filter: blur(10px);
				opacity:0;
				display: none;
				transition: opacity 0.5s;
			}

			heistgame.focus heistoverlay{
				opacity:1;
				display: block;
			}

			heisticon{
				display: block;
				position:absolute;
				bottom:${BatHeist.GOON.H+10}px;
				left: 0px;
				width:${BatHeist.GOON.W}px;
				height:${BatHeist.GOON.W}px;
				background: url(./proto/img/alert-circle.svg);
				background-size: 100%;
				background-position: center;

			}

			heisttoggle{
				display: block;
				position: absolute;
				top: 0px;
				right: 0px;
				width: 100%;
				height: 100%;
				background: no-repeat center url(./proto/img/zoom-in.svg);
				background-size: 200px;
				transition: all 0.5s;
				z-index: 1;
			}

			heistarena.complete heisttoggle{
				background-image: url(./proto/img/check-square.svg);
			}

			heistarena.focus heisttoggle{
				width: 150px;
				height: 150px;
				background-size: 100px;
				background-image: url(./proto/img/zoom-out.svg);

			}

			@keyframes heistpulse{
				0%{
					transform:scale(1);
				}

				50%{
					transform:scale(1.5) rotate(-90deg);
				}

				100%{
					transform:scale(0) rotate(-180deg);
				}
			}

		</style>`
	);

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<heistgame>').appendTo(self.$el);

	let PUZZLES = [
		{
			wall:0,
			x:W*0.2,
			y:H*0.2,
			actors:[
				{type:'goon',x:0.2,y:1},
				{type:'hostage',x:0.4,y:1},
				{type:'hostage',x:0.5,y:1},
				{type:'hostage',x:0.6,y:1},
			],

			ins:'Free the Hostages.',
		},
		{
			wall:1,
			x:W*0.25,
			y:H*0.2,
			actors:[
				{type:'lamp',x:0.25,y:0.2},
				{type:'lamp',x:0.5,y:0.2},
				{type:'lamp',x:0.75,y:0.2},
				{type:'goon',x:0.2,y:1},
				{type:'goon',x:0.8,y:1},
				{type:'hostage',x:0.4,y:1},
				{type:'hostage',x:0.5,y:1},
				{type:'hostage',x:0.6,y:1},
			],

			ins:'Free the Hostages.',
		},
		{
			wall:2,
			x:W*0.05,
			y:H*0.1,
			actors:[
				{type:'lamp',x:0.5,y:0.2},
				{type:'goon',x:0.5,y:1},
				{type:'goon',x:0.5,y:1},
				{type:'hostage',x:0.2,y:1},
				{type:'hostage',x:0.8,y:1},
			],

			ins:'Free the Hostages.',
		},
	]

	let arenas = [];
	for(var p=0; p<PUZZLES.length; p++){
		arenas[p] = new BatHeistArena(PUZZLES[p]);
		arenas[p].$el.appendTo($game);
		arenas[p].$el.attr('id',p);
		arenas[p].$toggle.click(onToggleArena);
	}

	let $overlay = $('<heistoverlay>').appendTo($game);
	let idFocus = undefined;

	function onToggleArena(){
		let id = $(this).closest('heistarena').attr('id');

		if(id==idFocus){
			unfocus();
		} else {
			arenas[id].setFocus(true);
			$game.addClass('focus');
			idFocus = id;
		}
	}

	function unfocus(){
		arenas[idFocus].setFocus(false);
		$game.removeClass('focus');
		idFocus = undefined;
	}

	let scale = 1;
	function tick(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');


		for(var a in arenas) arenas[a].step(players);

		if(idFocus != undefined && arenas[idFocus].complete){
			unfocus();
		}
	}

	setInterval(tick,1000/FPS);

	let players = [];
	self.setPlayers = function(p){
		players = p;
		players.length = 2;

		for(var i in players){
			players[i].proximity = [];
			players[i].proximity[0] = 1+players[i].X;
			players[i].proximity[1] = 1-players[i].Z;
			players[i].proximity[2] = 1-players[i].X;
		}
	}

	$game.on('mousemove',function(e){

		let oy = $game.offset().top;
		let x = (e.pageX/scale)/W;
		let y = (e.pageY-oy)/scale/H;


		if( x < 1 ){
			//left wall
			players[0].px = (y)*100;
			players[0].pz = (x)*100;
		} else if( x > 2 ){
			//right wall
			players[0].px = (1 - y)*100;
			players[0].pz = (3 - x)*100;
		}
		else{
			//front wall
			players[0].px = (x - 1)*100;
			players[0].pz = (1 - y)*100;
		}
		

		
		players[0].proximity = [0.9,0.9,0.9];
	})
}