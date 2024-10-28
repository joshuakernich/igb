
BatHeistDisplay = function(actor){
	let self = this;
	self.$el = $('<heistdisplay>').text(actor.value);
	
	self.actor = actor;
	self.offset = {x:0,y:0};
	self.complete = false;

	self.trigger = function(){
		return true;
	}

	self.die = function(){
	
	}

	self.interactWith = function(other,d){
		
	}

	self.setValue = function(value){
		self.$el.text(value);
	}

	self.checkValue = function(value){
		if(value==actor.target) self.complete = true;
	}
}

BatHeistButton = function(actor){
	let self = this;
	self.$el = $('<heistbutton>').text(actor.value);
	
	self.actor = actor;
	self.offset = {x:0,y:0};
	self.complete = true;

	self.trigger = function(){
		return false;
	}

	self.die = function(){
	
	}

	self.interactWith = function(other,d){
		
	}
}

BatHeistLamp = function(actor){
	let self = this;
	self.$el = $('<heistlamp>');
	let $upper = $('<heistlampupper>').appendTo(self.$el);
	let $lower = $('<heistlamplower>').appendTo(self.$el);

	self.actor = actor;
	self.offset = {x:0,y:-BatHeist.LAMP.H/2};
	self.complete = true;

	self.trigger = function(){
		$upper.hide();
		self.offset.y = 0;
		$(actor).animate({y:1},{duration:300,easing:'linear',complete:self.die});

		return true;
	}

	self.die = function(){
		self.dead = true;
		$(actor).stop();
		self.$el.empty();
		$('<heistpulse>').appendTo(self.$el).addClass('pulse');
	}

	self.interactWith = function(other,d){
		if(d<BatHeist.DCOLLIDE) self.die();
	}
}

BatHeistGoon = function(actor){
	const LOOP = BatHeist.FPS*5;

	let self = this;
	self.$el = $('<heistgoon>');
	self.offset = {x:0,y:-BatHeist.GOON.H + BatHeist.GOON.W/2};
	self.complete = true;

	let xAnchor = actor.x;
	let nTick = Math.random()*LOOP;

	self.trigger = function(){
		self.triggered = true;
		self.$el.attr('pose','dead');

		return true;
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

		if(d<BatHeist.DCOLLIDE && other.type=='lamp') self.die();

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
	self.complete = false;

	let $ropes = $('<heistropes>').appendTo(self.$el);

	self.step = function(){
		if(self.free && !self.dead){
			let dir = actor.x > 0.5?1:-1
			actor.x += dir * 0.002;
			self.complete = (actor.x<0.1 || actor.x>1.1);
		}
	}

	self.trigger = function(){
		self.free = true;

		$ropes.hide();
		self.$el.attr('pose','stand');
		self.offset.y = -BatHeist.GOON.H + BatHeist.GOON.W/2;

		return true;
	}

	self.die = function(){
		self.dead = true;
	}

	self.interactWith = function(other,d) {

		if(d>BatHeist.DCOLLIDE) return undefined;

		if(other.type=='lamp'){
			self.die();
			return 'Hostage is knocked out!';
		}

		
	}
}

BatHeistActor = function(actor,w,h) {

	actor = { ...actor };

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
	if(actor.type=='button') self.sprite = new BatHeistButton(actor);
	if(actor.type=='display') self.sprite = new BatHeistDisplay(actor);

	self.sprite.$el.appendTo(self.$el);

	let $target = $('<heisttarget>').appendTo(self.$el);

	self.getX = function(){
		return self.model.x*w + self.sprite.offset.x;
	}

	self.getY = function(){
		return self.model.y*h + self.sprite.offset.y;
	}

	self.trigger = function() {

		if(self.sprite.trigger) self.triggered = self.sprite.trigger();
		if(self.triggered) $target.hide();
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

		self.$el.css({left:self.model.x*w +'px',top:self.model.y*h + 'px'});
		$target.css({left:self.sprite.offset.x +'px',top:self.sprite.offset.y + 'px'});
	}

	self.redraw();

	$target.click(self.trigger);
}

BatHeistArena = function(layout){

	if(!layout.w) layout.w = BatHeist.ARENA.W;
	if(!layout.h) layout.h = BatHeist.ARENA.H;
	if(!layout.scale) layout.scale = 0.5;

	layout.x -= layout.w/2;
	layout.y -= layout.h/2;

	let self = this;
	self.complete = false;
	self.$el = $('<heistarena>');
	self.$el.css({
		left:layout.wall*BatHeist.W+layout.x+'px',
		top:layout.y+'px',
		width:layout.w+'px',
		height:layout.h+'px',
	});

	let $stage = $('<heiststage>').appendTo(self.$el).css({transform:'scale('+layout.scale+')'});
	let $toggle = $('<heisttoggle>').appendTo(self.$el);
	let $reset = $('<heistreset>').appendTo(self.$el);
	let $fail = $('<heistfail>').appendTo(self.$el);
	let $infoLeft = $('<heistinfo class="left">').appendTo(self.$el);
	let $infoRight = $('<heistinfo class="right">').appendTo(self.$el);
	let $reticule = $('<heistreticule>').appendTo(self.$el);
	let $pulse = $('<heistpulse>').appendTo(self.$el);
	
	let $projectile = $(`
		<heistprojectile>
			<heistspinner></heistspinner>
		</heistprojectile>`).appendTo(self.$el);

	self.$toggle = $toggle;


	let actors = [];
	self.reset = function(){

		self.$el.removeClass('fail');
		$fail.text('');

		for(var a in actors) actors[a].$el.remove();
		actors = [];
		
		for(var a in layout.actors){
			let actor = new BatHeistActor(layout.actors[a],layout.w,layout.h);
			actor.$el.appendTo($stage);
			actors.push(actor);
		}

		self.dead = false;
	}

	$reset.click(self.reset);
	self.reset();

	function to2Digit(cnt){
		return cnt.toString().length>1?cnt.toString():'0'+cnt.toString();
	}

	const FPTHROW = BatHeist.FPS/2;
	const FPFOCUS = BatHeist.FPS;
	const SIZEMAX = BatHeist.RTARGET*3;
	const SIZEMIN = BatHeist.RTARGET*2;
	const SIZERANGE = SIZEMAX-SIZEMIN;
	const HITRANGE = BatHeist.RTARGET*2;

	let isThrow = false;
	let cntThrow = 0;
	let cntFocus = 0;

	self.step = function(players) {

		if(self.dead) return;

		let date = new Date();

		let hrs = to2Digit( date.getHours() );
		let mins = to2Digit( date.getMinutes() );
		let secs = to2Digit( date.getSeconds() ) ;
		let ms = to2Digit( Math.floor(date.getMilliseconds()%1000/10) );

		let stamp = `${hrs}:${mins}:${secs}:${ms}`

		$infoRight.text(`Zoom x 2.0 | ${stamp} local time`);

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

		let padding = BatHeist.RTARGET*2;
		if(rx<padding) rx = padding;
		if(ry<padding) ry = padding
		if(rx>layout.w-padding) rx = layout.w-padding;
		if(ry>layout.h-padding) ry = layout.h-padding;

		let failState = undefined;
		
		let isComplete = true;
		let dMin = HITRANGE;
		let targeting = undefined;

		let cntGoon = 0;
		let cntHostage = 0;

		for(var a in actors) actors[a].step();
		for(var a=0; a<actors.length; a++) for(var b=a+1; b<actors.length; b++) actors[a].collide(actors[b]);
		for(var a in actors) actors[a].redraw();
		for(var a in actors){
			if(actors[a].failState) failState = actors[a].failState;
			
			if(!actors[a].complete) isComplete = false;

			let dx = actors[a].getX() - rx;
			let dy = actors[a].getY() - ry;
			let d = Math.sqrt(dx*dx+dy*dy);

			if(d<dMin && !actors[a].triggered && !actors[a].dead){
				dMin = d;
				targeting = actors[a];
			}

			if(!actors[a].complete && actors[a].type=='hostage') cntHostage++;
			if(!actors[a].dead && !actors[a].triggered && actors[a].type=='goon') cntGoon++;
		}

		if(self.isFocused){

			if(isThrow){
				cntThrow++;

				if(cntThrow>=FPTHROW){
					cntThrow = 0;
					if(targeting){
						targeting.trigger();
						if(targeting.type=='button') hitButton(targeting.model.value);
					}
					isThrow = false;
					$projectile.removeClass('flying');

					$pulse.css({left:rx,top:ry}).addClass('pulse');
				}

			} else {
				
				if(dMin<HITRANGE) cntFocus++;
				else if(cntFocus) cntFocus = 0;

				if(cntFocus>=FPFOCUS){
					cntFocus = 0;
					isThrow = true;
					$projectile.addClass('flying');

					$pulse.removeClass('pulse');
				}
			}

			if(failState) self.die(failState);
			if(isComplete) self.setComplete();

			$reticule.css({
				left:rx,
				top:ry, 
				width: SIZEMAX - cntFocus/FPFOCUS * SIZERANGE,
				height: SIZEMAX - cntFocus/FPFOCUS * SIZERANGE,
			});


			let amt = cntThrow/FPTHROW;

			let yBottom = BatHeist.H - layout.y;

			$projectile.css({
				left:rx,
				top:yBottom - (yBottom-ry)*amt, 
				transform: 'scale('+(2-amt)+')',
			});

			$infoLeft.text(to2Digit(cntGoon)+' hostiles | '+to2Digit(cntHostage)+' hostages');
		}
		
	}

	self.setComplete = function(){
		self.dead = true;
		self.complete = true;
		self.$el.addClass('complete');
	}

	self.die = function(failState){
		self.dead = true;
		$fail.text(failState);
		self.$el.addClass('fail');
	}

	self.setFocus = function(b){
		self.isFocused = b;
		self.$el.removeClass('focus');
		if(b) self.$el.addClass('focus');

		$stage.css('transform','scale('+(b?1:layout.scale)+')')
	}

	let textInput = '';
	let hitButton = function(value){

		if(value=='C'){
			textInput = '';
		} else if(value == 'E'){
			for(var a in actors) if(actors[a].type=='display') actors[a].sprite.checkValue(textInput);
		} else {
			textInput += value;
		}

		for(var a in actors) if(actors[a].type=='display') actors[a].sprite.setValue(textInput);
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
	BatHeist.DCOLLIDE = RTARGET*2;

	$("head").append(`
		<style>
			@import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap');

			heistgame{
				width:${W*3}px;
				height:${H}px;
				display:block;
				background:#333;
				box-sizing:border-box;
				transform-origin: top left;
				font-family: "Space Mono";
				font-weight: 300;
			}

			heistgame:after{
				content:"";
				width: 33.3%;
				height: 100%;
				display: block;
				position: absolute;
				left: 0px;
				right:0px;
				top: 0px;
				left: 0px;
				margin: auto;
				box-shadow: 0px 0px 50px black;
				z-index 10;
				pointer-events: none;
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
				
				transform: scale(0.5);
				transition: transform 0.5s;
			}

			heistreticule{
				display:block;
				position:absolute;
				width: ${RTARGET*4}px;
				height: ${RTARGET*4}px;
				transform: translate(-50%, -50%);
				display:none;
			}

			heistreticule:before{
				content:"";
				display:block;
				position:absolute;
				left:0px;
				top:0px;
				bottom:0px;
				width:10%;
				border: 5px solid red;
				border-right: none;
				z-index: 2;
			}

			heistreticule:after{
				content:"";
				display:block;
				position:absolute;
				right:0px;
				top:0px;
				bottom:0px;
				width:10%;
				border: 5px solid red;
				border-left: none;
				z-index: 2;
			}

			heistarena{
				display:block;
				position:absolute;
				
				width:${ARENA.W}px;
				height:${ARENA.H}px;
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
				z-index: 2;
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
				z-index: 2;
			}

			heistinfo{
				display:block;
				position:absolute;
				top: 100%;
				left: 0px;
				color: white;
				font-size: 20px;
				line-height: 70px;
				display: none;
			}

			heistfail{
				display:block;
				position:absolute;
				top: 0px;
				left: 0px;
				right: 0px;
				bottom: 0px;
				text-align: center;
				color: white;
				font-size: 50px;
				line-height:${ARENA.H}px;
				pointer-events: none;
			}


			heistinfo.right{
				left: auto;
				right: 0px;
			}

			heistarena heisttarget{
				display: none;
			}

			heistarena.focus{
				z-index: 3;
			}

			heistarena.focus heiststage{
				background:#444;
				
			}

			heistarena.focus heisttarget,
			heistarena.focus heistreticule,
			heistarena.focus:before,
			heistarena.focus:after,
			heistarena.focus heistinfo,
			heistarena.focus heistprojectile,
			heistarena.focus heistreset
			{
				display: block;
			}

			heistprojectile.flying heistspinner:after{
				animation: spin;
				animation-iteration-count: infinite;
				animation-duration: 0.3s;
				animation-timing-function: linear;
			}

			heistprojectile{
				display:block;
				width: 0px;
				height: 0px;
				position: absolute;
				display: none;
			}

			heistprojectile heistspinner{
				display:block;
				width: 0px;
				height: 0px;
				position: absolute;
				transform: scaleY(0.5);
			}

			heistprojectile heistspinner:after{
				content:"";
				display:block;
				width: ${RTARGET*4}px;
				height: ${RTARGET*2}px;

				position: absolute;
				background-image: url(./proto/img/bat-symbol.png);
				background-size: 100%;
				background-position: center;
				background-repeat: no-repeat;
				left: ${-RTARGET*2}px;
				top: ${-RTARGET}px;
				
				
			}

			heisttarget{
				display:block;
				width: ${RTARGET*2}px;
				height: ${RTARGET*2}px;
				
				box-sizing: border-box;
				position: absolute;
				transform: translate(-50%,-50%);

				background: linear-gradient( to bottom right, transparent, white, transparent, white, transparent );
				background-size: 200%;

				animation-name: shimmer;
				animation-iteration-count: infinite;
				animation-timing-function: linear;
				animation-duration: 1s;
				opacity: 0.3;

				box-shadow: 0px 0px 10px white;
			}

			heistarena.fail heisttarget,
			heistarena.fail heistreticule{
				display: none;
			}

			heistdisplay{
				display:block;
				position:absolute;
				top:0px;
				left:0px;
				width: ${RTARGET*12}px;
				height:${RTARGET*3}px;
				font-size: ${RTARGET*2}px;
				line-height: ${RTARGET*3}px;
				background: black;
				transform: translate(-50%, -50%);
				text-align: left;
				color: orange;
				padding: 0px ${RTARGET/2}px;
			}

			heistbutton{
				display:block;
				position:absolute;
				top:0px;
				left:0px;
				width: ${RTARGET*3}px;
				height:${RTARGET*3}px;
				font-size: ${RTARGET*2}px;
				line-height: ${RTARGET*3}px;
				background: orange;
				transform: translate(-50%, -50%);
				text-align: center;
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
				opacity: 0;
			}

			heistpulse.pulse{
				animation: heistpulse;
				animation-duration: 0.5s;
				animation-fill-mode: forwards;
			}

			heistpulse:after{
				content:" ";
				position:absolute;
				display:block;
				width:${BatHeist.GOON.W*2}px;
				height:${BatHeist.GOON.W*2}px;
				transform:translate(-50%, -50%);
				box-sizing: border-box;
				
				border-radius: 100%;
				background: radial-gradient( transparent, transparent, white, transparent, transparent)
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
				z-index: 2;
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

			heistreset{
				display: block;
				position: absolute;
				top: 120px;
				right: -150px;
				width: 150px;
				height: 120px;
				background: no-repeat center url(./proto/img/reset-ccw.svg);
				background-size: 80px;
				z-index: 3;

				display: none;
			}

			heisttoggle{
				display: block;
				position: absolute;
				top: 0px;
				right: 0px;
				bottom: 0px;
				left: 0px;
				width: 200px;
				height: 200px;
				background: no-repeat center url(./proto/img/zoom-in.svg);
				background-size: 100px;

				margin: auto;
				z-index: 1;
				
			}

			heistarena.complete heisttoggle{
				background-image: url(./proto/img/check-square.svg);
			}

			heistarena.focus heisttoggle{
				width: 150px;
				height: 120px;
				background-size: 100px;
				background-image: url(./proto/img/zoom-out.svg);
				z-index: 4;
				right: -150px;

				top: 0px;
				bottom: auto;
				left: auto;
			}

			@keyframes heistpulse{
				0%{
					transform:scale(1);
					opacity: 1;
				}

				100%{
					transform:scale(1.5);
					opacity: 0;
				}
			}

			@keyframes shimmer{
				0%{
					background-position: 0% 0%;
				}

				100%{
					background-position: 200% 200%;
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
			x:W*0.7,
			y:H*0.6,
			w:500,
			h:500,
			scale:0.2,
			actors:[
				{type:'display',x:0.5,y:0.1,target:'1395'},
				{type:'button',x:0.3,y:0.3,value:'1'},
				{type:'button',x:0.5,y:0.3,value:'2'},
				{type:'button',x:0.7,y:0.3,value:'3'},
				{type:'button',x:0.3,y:0.5,value:'4'},
				{type:'button',x:0.5,y:0.5,value:'5'},
				{type:'button',x:0.7,y:0.5,value:'6'},
				{type:'button',x:0.3,y:0.7,value:'7'},
				{type:'button',x:0.5,y:0.7,value:'8'},
				{type:'button',x:0.7,y:0.7,value:'9'},
				{type:'button',x:0.3,y:0.9,value:'C'},
				{type:'button',x:0.5,y:0.9,value:'0'},
				{type:'button',x:0.7,y:0.9,value:'E'},
			]
		},
		{
			wall:0,
			x:W*0.4,
			y:H*0.5,
			w:800,
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
			x:W*0.5,
			y:H*0.5,
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
			x:W*0.4,
			y:H*0.5,
			w: 800,
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