BatHeistFigure = function(dark,light){
	let self = this;
	self.$el = $('<heistfigure>');

	$('<heistfiguredisc>').appendTo(self.$el).css({
		'background':dark,
	})
	$('<heistfiguredisc>').appendTo(self.$el).css({
		'transform':`translateZ(${BatHeist.GOON.H*0.7}px)`,
		'background':light,
	})
	$('<heistfiguredisc>').appendTo(self.$el).css({
		'transform':`scale(0.5) translateZ(${BatHeist.GOON.H*0.7}px)`,
		'background':dark,
	})
	$('<heistfiguredisc>').appendTo(self.$el).css({
		'transform':`scale(0.5) translateZ(${BatHeist.GOON.H}px)`,
		'background':light,
	})


}

BatHeistSprite = function(){
	let self = this;
	self.$el = $('<heistsprite>');



	self.setDeg = function(deg){
		self.$el.attr('deg',deg);
	}
	
	self.setPose = function(pose) {
		self.$el.attr('pose',pose);
	}
}


BatHeistDisplay = function(actor){
	let self = this;
	self.$el = $('<heistdisplay>').text(actor.target);
	
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
	const FPLOOP = BatHeist.FPS*10;
	const FPNOTICING = BatHeist.FPS;

	let self = this;
	//self.$el = new BatHeistFigure('#999999','#bbbbbb').$el;

	self.$el = $('<heistempty>');
	let sprite = new BatHeistSprite();
	sprite.setPose('walk');
	sprite.$el.appendTo(self.$el);
	
	self.offset = {x:0,y:-BatHeist.GOON.H + BatHeist.GOON.W/2};
	self.complete = true;

	let $cone = $('<heistcone>').prependTo(self.$el);

	let xAnchor = actor.x;
	let nTick = Math.random()*FPLOOP;

	let isNoticing = false;
	let cntNoticing = 0;

	let mode = 'patrol';

	self.trigger = function(){
		self.triggered = true;
		sprite.setPose('dead');
		$cone.hide();
		return true;
	}

	self.step = function(){
		if(!self.triggered && !self.dead) nTick++;

		let amt = nTick/FPLOOP;
		let rotate = 0;
		
		if(mode=='patrol'){
			let x = actor.x;
			actor.x = xAnchor + Math.cos(amt*Math.PI*2) * 1;
			let dir = actor.x - x;
			rotate = (dir>0)?0:0.5;
		}

		let deg = (rotate*360);
		let degCone = deg-45;
		sprite.setDeg(deg);
		$cone.css('transform','rotate('+degCone+'deg)');


		//interactions happen AFTER a step so this flag persists from the previous interactions
		if(isNoticing) cntNoticing++;
		else cntNoticing = 0;

		isNoticing = false;
	}

	self.die = function(){
		self.dead = true;
		sprite.setPose('dead');
		$cone.hide();
	}

	self.alert = function(){
		$('<heisticon>').appendTo(self.$el);
	}

	self.interactWith = function(other,d) {

		if(self.triggered) return;

		if(d<BatHeist.DCOLLIDE && other.type=='lamp') self.die();

		if ((other.type=='hostage' && other.sprite.free) || (other.type=='goon' && other.sprite.triggered)) isNoticing = true;

		if(cntNoticing >= FPNOTICING && other.type=='hostage' && other.sprite.free){
			self.alert();
			return "Hostage has been spotted!";
		}

		if(cntNoticing >= FPNOTICING && other.type=='goon' && other.sprite.triggered){
			self.alert();
			return "You have been spotted!";
		}
	}
}

BatHeistHostage = function(actor){
	let self = this;
	
	self.offset = {x:0,y:-BatHeist.HOSTAGE.H/2};
	self.complete = false;

	self.$el = $('<heistempty>');
	let sprite = new BatHeistSprite();
	sprite.setPose('stand');
	sprite.$el.appendTo(self.$el);

	let $ropes = $('<heistropes>').appendTo(self.$el);

	self.step = function(){
		if(self.free && !self.dead){
			let dir = actor.x > 2?1:-1;
			let deg = actor.x > 2?0:180;
			actor.x += dir * 0.02;
			self.complete = (actor.x<0.1 || actor.x>1.1);
			sprite.setDeg(deg);
		}
	}

	self.trigger = function(){
		self.free = true;
		sprite.setPose('walk');
		$ropes.hide();
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

BatHeistActor = function(actor) {

	actor = { ...actor };

	let self = this;
	self.$el = $('<heistactor>');
	self.model = actor;
	self.type = actor.type;
	self.dead = false;
	self.failState = undefined;
	self.sprite = undefined;

	let $target = $('<heisttarget>').appendTo(self.$el);

	if(actor.type=='lamp') self.sprite = new BatHeistLamp(actor);
	if(actor.type=='goon') self.sprite = new BatHeistGoon(actor);
	if(actor.type=='hostage') self.sprite = new BatHeistHostage(actor);
	if(actor.type=='button') self.sprite = new BatHeistButton(actor);
	if(actor.type=='display') self.sprite = new BatHeistDisplay(actor);

	self.sprite.$el.appendTo(self.$el);

	self.getX = function(){
		return self.model.x;
	}

	self.getY = function(){
		return self.model.y;
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

		self.$el.css({left:(self.model.x+0.5)*BatHeist.GRIDSIZE +'px',top:(self.model.y+0.5)*BatHeist.GRIDSIZE + 'px'});
		//$target.css({left:self.sprite.offset.x +'px',top:self.sprite.offset.y + 'px'});
	}

	self.redraw();
	$target.click(self.trigger);
}

BatHeistArena = function(layout){

	layout.w = BatHeist.ARENA.W;
	layout.h = BatHeist.ARENA.H;
	if(!layout.scale) layout.scale = 0.5;

	layout.x -= layout.w/2;
	layout.y -= layout.h/2;

	let self = this;
	self.layout = layout;
	self.complete = false;
	self.$el = $('<heistarena>');
	self.$el.css({
		left:layout.x+'px',
		top:layout.y+'px',
		width:layout.w+'px',
		height:layout.h+'px',
	});

	let $world = $('<heistworld>').appendTo(self.$el);
	let $stage = $('<heiststage>').appendTo($world);

	let $table = $('<heistgrid>').appendTo($stage);
	for(var y=0; y<5; y++){
		let $tr = $('<tr>').appendTo($table);
		for(var x=0; x<5; x++){
			let $td = $('<td>').appendTo($tr);
		}
	}

	self.doArm = function(e){
	
		e.stopPropagation();
		let id  = $(this).attr('id');
		reticules[id].isArmed = true;
	}

	let reticules = [];
	for(var i=0; i<layout.playerCount; i++){
		reticules[i] = 
		{ 
			$reticule:$('<heistreticule>').appendTo($stage), 
			$pulse:$('<heistpulse>').appendTo($stage),
			$projectile:$(`<heistprojectile><heistspinner></heistspinner></heistprojectile>`).appendTo(self.$el),
			$start:$('<heiststart>HOVER<br>TO ARM</heiststart>').appendTo($stage).click(self.doArm).attr('id',i),
			$arrow:$('<heistarrow>').appendTo($stage),
			rx:0, 
			ry:0,
			cntThrow:0,
			cntFocus:0,
			isThrow:false, 
			isArmed:false,
		};
	}

	

	let actors = [];
	self.reset = function(){

		self.$el.removeClass('fail');
		self.failState = '';

		for(var a in actors) actors[a].$el.remove();
		actors = [];
		
		for(var a in layout.actors){
			let actor = new BatHeistActor(layout.actors[a],layout.w,layout.h);
			actor.$el.appendTo($stage);
			actors.push(actor);
		}

		for(var r in reticules){
			reticules[r].isArmed = false;
			reticules[r].isThrow = false;
			reticules[r].cntThrow = 0;
			reticules[r].cntFocus = 0;
		}

		self.dead = false;
	}

	self.reset();

	function to2Digit(cnt){
		return cnt.toString().length>1?cnt.toString():'0'+cnt.toString();
	}

	const FPTHROW = BatHeist.FPS/2;
	const FPFOCUS = BatHeist.FPS;
	const SIZEFROM = BatHeist.GRIDSIZE;
	const SIZETO = BatHeist.GRIDSIZE/2;
	const SIZERANGE = SIZEFROM-SIZETO;
	const HITRANGE = 0.5;

	

	self.step = function(players) {

		if(self.dead) return;

		let failState = undefined;
		let isComplete = true;
		let cntGoon = 0;
		let cntHostage = 0;

		for(var a in actors) actors[a].step();
		for(var a=0; a<actors.length; a++) for(var b=a+1; b<actors.length; b++) actors[a].collide(actors[b]);
		for(var a in actors) actors[a].redraw();
		for(var a in actors){
			if(actors[a].failState) failState = actors[a].failState;
			if(!actors[a].complete) isComplete = false;
			if(!actors[a].complete && actors[a].type=='hostage') cntHostage++;
			if(!actors[a].dead && !actors[a].triggered && actors[a].type=='goon') cntGoon++;
		}

		if(self.isFocused){

			for(var r=0; r<reticules.length; r++){

				let rx;
				let ry;

				if(layout.wall==0){
					rx = (players[r].pz/100);
					ry = (players[r].px/100);
				} else if(layout.wall==1){
					rx = players[r].px/100;
					ry = (1-players[r].pz/100);
				} else if(layout.wall==2){
					rx = (1-players[r].pz/100);
					ry = (1-players[r].px/100);
				}

				// convert back to a number between -1 and 1 and then multiply it
				const MULTIPLY = 3.5;
				let ox = (rx*2-1)*MULTIPLY;
				let oy = (ry*2-1)*MULTIPLY;

				rx = BatHeist.GRID/2 + ox*(BatHeist.GRID/2) - 0.5;
				ry = BatHeist.GRID/2 + oy*(BatHeist.GRID/2) - 0.5;

				/*if(rx<0) rx = 0;
				if(ry<0) ry = 0
				if(rx>BatHeist.GRID-1) rx = BatHeist.GRID-1;
				if(ry>BatHeist.GRID-1) ry = BatHeist.GRID-1;*/

				if(r==0 && rx<=-1 && ry>0 && ry<BatHeist.GRID-1){
					reticules[r].isArmed = true;
				}

				if(r==1 && rx>=BatHeist.GRID && ry>0 && ry<BatHeist.GRID-1){
					reticules[r].isArmed = true;
				}


				reticules[r].rx = rx;
				reticules[r].ry = ry;

				
				reticules[r].targeting = undefined;

				if(reticules[r].isArmed){

					let dMin = HITRANGE;
					for(var a in actors){

						let dx = actors[a].getX() - reticules[r].rx;
						let dy = actors[a].getY() - reticules[r].ry;

						let d = Math.sqrt(dx*dx+dy*dy);

						if(d<dMin && !actors[a].triggered && !actors[a].dead){
							dMin = d;
							reticules[r].targeting = actors[a];
						}
					}
				}

				if(reticules[r].isThrow){
					reticules[r].cntThrow++;

					if(reticules[r].cntThrow>=FPTHROW){
						reticules[r].cntThrow = 0;
						if(reticules[r].targeting){
							reticules[r].targeting.trigger();
							if(reticules[r].targeting.type=='button') hitButton(reticules[r].targeting.model.value);
						}
						reticules[r].isThrow = false;
						reticules[r].isArmed = false;
						reticules[r].$projectile.removeClass('flying');
						reticules[r].$pulse.css({
							left:(reticules[r].rx+0.5) * BatHeist.GRIDSIZE,
							top:(reticules[r].ry+0.5) * BatHeist.GRIDSIZE,
						}).addClass('pulse');
					}

				} else {

					if(reticules[r].targeting) reticules[r].cntFocus++;
					else if(reticules[r].cntFocus) reticules[r].cntFocus = 0;

					if(reticules[r].cntFocus>=FPFOCUS){
						reticules[r].cntFocus = 0;
						reticules[r].isThrow = true;
						reticules[r].$projectile.addClass('flying');
						reticules[r].$pulse.removeClass('pulse');
					}
				}

					
				

				let amt = reticules[r].cntThrow/FPTHROW;
				let yBottom = BatHeist.H/1.2 - layout.y;
				let yDif = yBottom-((reticules[r].ry+0.5) * BatHeist.GRIDSIZE);
				let y = yBottom - yDif*amt;
				let xStart = BatHeist.ARENA.W/2 + (r==0?-1:1)*200;
				let x = (reticules[r].rx+0.5) * BatHeist.GRIDSIZE;
				let xDif = x-xStart;

				let dist = Math.sqrt(xDif*xDif + yDif*yDif);

				let degs = Math.atan2(yDif,-xDif)*180/Math.PI;
				
				

				reticules[r].$arrow.css({
					left:xStart + xDif*amt,
					top:yBottom, 
					height: dist-30,
					opacity: reticules[r].isArmed && !reticules[r].isThrow?1:0,
					transform: `rotate(${degs+90}deg)`,
				});

				reticules[r].$projectile.css({
					left:xStart + xDif*amt,
					top:y, 
					transform: `rotate(${degs-90}deg) scale(${2-amt})`,
					opacity: reticules[r].isArmed?1:0,

				});

				reticules[r].$start.css({
					opacity: reticules[r].isArmed?0:1,
				})

				reticules[r].$reticule.css({
					left: (reticules[r].rx+0.5) * BatHeist.GRIDSIZE,
					top: (reticules[r].ry+0.5) * BatHeist.GRIDSIZE, 
					width: SIZEFROM - reticules[r].cntFocus/FPFOCUS * SIZERANGE,
					height: SIZEFROM - reticules[r].cntFocus/FPFOCUS * SIZERANGE,
					opacity: reticules[r].isArmed?1:0.3,
				});


				if( reticules[r].isArmed ) reticules[r].$reticule.attr('armed','armed');
				else reticules[r].$reticule.removeAttr('armed');
				
			}

			

			if(failState) self.die(failState);
			if(isComplete) self.setComplete();

			let date = new Date();
			let hrs = to2Digit( date.getHours() );
			let mins = to2Digit( date.getMinutes() );
			let secs = to2Digit( date.getSeconds() ) ;
			let ms = to2Digit( Math.floor(date.getMilliseconds()%1000/10) );
			let stamp = `${hrs}:${mins}:${secs}:${ms}`;

			self.infoRight = `Zoom x 2.0 | ${stamp} local time`;
			self.infoLeft = to2Digit(cntGoon)+' hostiles | '+to2Digit(cntHostage)+' hostages';
		}
		
	}

	self.setComplete = function(){
		self.dead = true;
		self.complete = true;
		self.$el.addClass('complete');
	}

	self.die = function(failState){
		self.dead = true;
		self.failState = failState;
		//$fail.text(failState);
		self.$el.addClass('fail');
	}

	self.setFocus = function(b){
		self.isFocused = b;
		self.$el.removeClass('focus');
		if(b) self.$el.addClass('focus');

		//$world.css('transform','scale('+(b?1:layout.scale)+')')

		for(var r in reticules){
			reticules[r].isArmed = false;
			reticules[r].isThrow = false;
			reticules[r].cntThrow = 0;
			reticules[r].cntFocus = 0;
			reticules[r].$reticule.css('opacity',0);
			reticules[r].$projectile.css('opacity',0);
			reticules[r].$arrow.css('opacity',0);
		}
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

BatHeist3DGame = function(){

	
	
	BatHeist = {};
	BatHeist.ARENA = {W:300,H:300};
	BatHeist.ANGLE = 20;
	BatHeist.GRID = 5;
	BatHeist.GRIDSIZE = BatHeist.ARENA.W/BatHeist.GRID;
	BatHeist.LAMP = {STRING:10,W:80,H:150};
	BatHeist.GOON = {W:BatHeist.GRIDSIZE*0.6,H:BatHeist.GRIDSIZE*1};
	BatHeist.HOSTAGE = {W:BatHeist.GRIDSIZE*0.6,H:BatHeist.GRIDSIZE*1.2};
	BatHeist.ZOOMSCALE = 1.8;

	BatHeist.W = 1600;
	BatHeist.H = 1000;
	BatHeist.FPS = 60;
	BatHeist.DCOLLIDE = BatHeist.GRIDSIZE/2;

	$("head").append(`
		<style>
			@import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap');

			heistcone{
				display:block;
				position: absolute;
				width: ${BatHeist.GRIDSIZE*2}px;
				height: ${BatHeist.GRIDSIZE*2}px;
				background: linear-gradient(to bottom right, rgba(255,255,255,0.2), transparent, transparent);
				top: 0px;
				left: 0px;
				transform: rotate(-45deg);
				transform-origin: top left;
				display: none;
			}

			heistgame{
				width:${BatHeist.W*3}px;
				height:${BatHeist.H}px;
				display:block;
				background:#0F151C;
				box-sizing:border-box;
				transform-origin: top left;
				font-family: "Space Mono";
				font-weight: 300;
			}


			heistwall{
				display:inline-block;
				
				perspective:${BatHeist.W}px;
				width:${BatHeist.W}px;
				height:${BatHeist.H}px;
				position:relative;
				box-sizing: border-box;
				
			}

			heistgame heistgoggles{
				display: none;
			}

			heistgame.focus heistwall heistgoggles{
				background: black;
				display:block;
				position: absolute;
				top: 0px;
				left: 0px;
				right: 0px;
				bottom: 0px;
				pointer-events: none;
			}

			heistgame.focus heistwall.focus heistgoggles{
				background: url(./proto/img/bat-goggles.png);
				background-size: cover;
				z-index: -1;
			}

			heistwall heistwallstage{
				box-sizing:border-box;
				
				transform: rotateX(${BatHeist.ANGLE}deg) translateY(-20px);
				position:absolute;
				top: 0px;
				left: 0px;
				right: 0px;
				bottom: 0px;
				transform-origin: center;
				transform-style: preserve-3d;
			}

			heistgrid{
				display:table;
				position: absolute;
				top: 0px;
				left: 0px;
				right: 0px;
				bottom: 0px;
				width: 100%;
				height: 100%;
				opacity: 0.2;
				border-collapse: collapse;

			}

			heistgrid td{
				border: 2px solid white;
			}

			heistarena h1{
				color: white;
				font-size: ${BatHeist.ARENA.H/10}px;
				line-height: ${BatHeist.ARENA.H/10}px;
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
				position:absolute;
				transform-style: preserve-3d;
			}

			heistfigure{
				display:block;
				position:absolute;
				width: 0px;
				height: 0px;
				top: 0px;
				left: 0px;
				transform-style: preserve-3d;
			}

			heistfiguredisc{
				display:block;
				position:absolute;
				transform-style: preserve-3d;
				width: ${BatHeist.GRIDSIZE*0.6}px;
				height: ${BatHeist.GRIDSIZE*0.6}px;
				top: ${-BatHeist.GRIDSIZE*0.3}px;
				left: ${-BatHeist.GRIDSIZE*0.3}px;
				background: red;
				
				border-radius: ${BatHeist.GRIDSIZE*0.3}px;
			}



			heistworld{
				display:block;
				position:absolute;
				left:0px;
				top:0px;
				bottom:0px;
				right:0px;
				transition: transform 0.5s;
				transform-style: preserve-3d;
			}

			heistarrow{
				display:block;
				position:absolute;
				left:-3px;
				top:0px;
				width: 0px;
				height: 100px;
				border-left: 6px dashed red;
				transform-origin: top center;
				opacity: 0;
				pointer-events: none;
			}

			heistarrow:last-of-type{
				border-color: blue;
			}

			heiststage{
				
				display:block;
				position:absolute;
				left:0px;
				top:0px;
				bottom:0px;
				right:0px;
				box-sizing: border-box;
				transform-style: preserve-3d;
			}

			heistreticule{
				display:block;
				position:absolute;
				width: ${BatHeist.GRIDSIZE}px;
				height: ${BatHeist.GRIDSIZE}px;
				transform: translate(-50%, -50%);
				display:none;
				border-radius: 100%;

				
				background-size: 60%;
				background-position: center;
				background-repeat: no-repeat;

				pointer-events: none;
			}

			heistreticule[armed]{
				background-image: url(./proto/img/bat-symbol-red.png);
			}

			heistreticule:before, heiststart:before{
				content:"";
				display:block;
				position:absolute;
				left:0px;
				top:0px;
				bottom:0px;
				width:10%;
				border: 5px solid red;
				border-right: none;
				z-index: 100;
				border-radius: 100%;
			}

			heistreticule:after, heiststart:after{
				content:"";
				display:block;
				position:absolute;
				right:0px;
				top:0px;
				bottom:0px;
				width:10%;
				border: 5px solid red;
				border-left: none;
				z-index: 100;
				border-radius: 100%;
			}

			heiststart:last-of-type:before,
			heiststart:last-of-type:after,
			heistreticule:last-of-type:before,
			heistreticule:last-of-type:after{
				border-color:blue;
			}

			heiststart{
				display: block;
				position: absolute;
				width: ${BatHeist.GRIDSIZE*1.5}px;
				height: ${BatHeist.GRIDSIZE*1.5}px;

				background-image: url(./proto/img/bat-symbol-red.png);
				background-size: 70%;
				bottom: 0px;
				left: ${-BatHeist.GRIDSIZE*1.75}px;
				background-repeat: no-repeat;
				background-position-x: center;
				background-position-y: 15px;

				display: none;

				line-height: 15px;
				color: red;
				font-size:12px;
				border-radius: 100%;
				font-weight: bold;
				text-align: center;
				box-sizing: border-box;
				padding-top: 50px;
			}	
			
			heiststart[armed]{
				display: none;
			}

			heiststart:last-of-type{
				left: auto;
				right: ${-BatHeist.GRIDSIZE*1.75}px;
				background-image: url(./proto/img/bat-symbol-blue.png);
				color: blue;
			}

			heistarena{
				display:block;
				position:absolute;
				width:${BatHeist.ARENA.W}px;
				height:${BatHeist.ARENA.H}px;

				transform-style: preserve-3d;
				transition: all 0.5s;
			}

			/*heistarena:before{
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
			}*/

			heistinfo{
				display:block;
				position:absolute;
				bottom: 180px;
				left: 250px;
				color: white;
				font-size: 20px;
				line-height: 70px;
				display: none;
				opacity: 0;


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
				font-size:${BatHeist.H/15}px;
				line-height:${BatHeist.H}px;
				pointer-events: none;
			}


			heistinfo.right{
				left: auto;
				right: 250px;
			}

			heistarena heisttarget{
				display: none;
			}

			heistarena.focus{
				transform: scale3d(${BatHeist.ZOOMSCALE},${BatHeist.ZOOMSCALE},${BatHeist.ZOOMSCALE}) translateY(-50px);
				transform-style: preserve-3d;
			}

			heistarena.focus heistworld{
				background:#0F151C;
				
			}

			
			heistarena.focus heistreticule,
			heistarena.focus:before,
			heistarena.focus:after,
			heistwall.focus heistprojectile,
			heistwall.focus heistinfo,
			heistwall.focus heistreset,
			heistwall.focus heisttoggle,
			heistwall.focus heiststart
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
				transform-style: preserve-3d;
			}

			heistempty{
				display:block;
				width: 0px;
				height: 0px;
				position: absolute;
				transform-style: preserve-3d;
				transform: rotateX(-80deg);
				top: 20px;
			}

			heistprojectile heistspinner{
				display:block;
				width: 0px;
				height: 0px;
				position: absolute;
				transform: scaleY(0.5) translateZ(${BatHeist.GRIDSIZE}px);
				transform-style: preserve-3d;
			}

			heistprojectile heistspinner:after{
				content:"";
				display:block;
				width: ${BatHeist.GRIDSIZE*2}px;
				height: ${BatHeist.GRIDSIZE}px;

				position: absolute;
				
				background-image: url(./proto/img/bat-symbol-red.png);
				background-size: 100%;
				background-position: center;
				background-repeat: no-repeat;
				left: ${-BatHeist.GRIDSIZE}px;
				top: ${-BatHeist.GRIDSIZE/2}px;
			}

			heistprojectile:last-of-type heistspinner:after,
			heistreticule[armed]:last-of-type{
				background-image: url(./proto/img/bat-symbol-blue.png);
			}

			heisttarget{
				display:block;
				width: ${BatHeist.GRIDSIZE*0.8}px;
				height: ${BatHeist.GRIDSIZE*0.8}px;
				
				box-sizing: border-box;
				position: absolute;
				transform: translate(-50%,-50%);

				border: 5px dashed white;
				border-radius: ${BatHeist.GRIDSIZE/2}px;


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
				width: ${BatHeist.GRIDSIZE*12}px;
				height:${BatHeist.GRIDSIZE*3}px;
				font-size: ${BatHeist.GRIDSIZE*2}px;
				line-height: ${BatHeist.GRIDSIZE*3}px;
				background: black;
				transform: translate(-50%, -50%);
				text-align: left;
				color: orange;
				padding: 0px ${BatHeist.GRIDSIZE/2}px;
			}

			heistbutton{
				display:block;
				position:absolute;
				top:0px;
				left:0px;
				width: ${BatHeist.GRIDSIZE*3}px;
				height:${BatHeist.GRIDSIZE*3}px;
				font-size: ${BatHeist.GRIDSIZE*2}px;
				line-height: ${BatHeist.GRIDSIZE*3}px;
				background: orange;
				transform: translate(-50%, -50%);
				text-align: center;
			}

			
			heistropes{
				position:absolute;
				display:block;
				width:${BatHeist.GRIDSIZE}px;
				height:${BatHeist.GRIDSIZE}px;
				background:url(./proto/img/bat-ropes.png);
				background-size: 90%;
				background-repeat: no-repeat;
				bottom:0px;
				left:${-BatHeist.GRIDSIZE/2}px;
				transform-style: preserve-3d;
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
				/*display: block;*/
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
				left: 350px;
				width: 120px;
				height: 120px;
				
				background: no-repeat center url(./proto/img/reset-ccw.svg);
				background-size: 80px;
				z-index: 3;

				display: none;
				opacity: 0.3;
			}

			heisttoggle{
				display: block;
				position: absolute;
				top: 130px;
				right: 340px;
				width: 120px;
				height: 120px;
				background: no-repeat center url(./proto/img/zoom-out.svg);
				background-size: 100px;
				margin: auto;
				z-index: 3;
				display: none;
				opacity: 0.3;
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

			heistsprite:after{
				content:"";
				width: 200px;
				height: 200px;
				background-image: url(./proto/img/sprite-char-dark.png);
				background-size: 800%;
				background-position-y: -400%;
				display: block;
				position: absolute;
				bottom: -60px;
				left: -100px;
				transform-style: preserve-3d;
			}

			

			heistsprite[deg='0']:after{ background-position-y: -600%; }
			heistsprite[deg='90']:after{ background-position-y: -400%; }
			heistsprite[deg='180']:after{ background-position-y: -700%; }
			heistsprite[deg='270']:after{ background-position-y: -500%; }

			heistsprite[pose='stand']:after{
				background-position-x: -400%;
				background-position-y: 000%;
			}

			heistsprite[pose='dead']:after{
				background-position-x: -500%;
				background-position-y: -100%;
			}

			heistsprite[pose='walk']:after{
				animation-name: frame6;
				animation-duration: 1s;
				animation-iteration-count: infinite;
				animation-timing-function: steps(6);
			}

			heistsprite{
				width: 0px;
				height: 0px;
				display: block;
				position: absolute;
				top: 0px;
				left: 0px;

				transform-style: preserve-3d;
				

			}

			@keyframes frame6{
				0%{
					background-position-x: 0%;
				}

				100%{
					background-position-x: -600%;
				}
			}

		</style>`
	);

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<heistgame>').appendTo(self.$el);

	let $walls = [];
	let $stages = [];
	for(var i=0; i<3; i++){
		let $w = $('<heistwall>').appendTo($game);
		let $s = $('<heistwallstage>').appendTo($w);
		$walls[i] = $w;
		$stages[i] = $s;

		$('<heistgoggles>').appendTo($w);
		$('<heistreset>').appendTo($w).click(onResetArena);
		$('<heisttoggle>').appendTo($w).click(unfocus);
		$('<heistinfo class="left">').appendTo($w).text('left');
		$('<heistinfo class="right">').appendTo($w).text('right');
		$('<heistfail>').appendTo($w);
	}
	
	let PUZZLES = [
		
		{
			wall:0,
			playerCount:2,
			x:BatHeist.W*0.5,
			y:BatHeist.H*0.5,
			actors:[
				{type:'hostage',x:1,y:2},
				{type:'hostage',x:2,y:3},
				{type:'hostage',x:3,y:2},
			],

			ins: 'Free the hostages',
		},
		{
			wall:1,
			playerCount:2,
			x:BatHeist.W*0.5,
			y:BatHeist.H*0.5,
			actors:[
			
				{type:'goon',x:3,y:4},
				{type:'hostage',x:1,y:2},
				{type:'hostage',x:2,y:2},
				{type:'hostage',x:3,y:2},
			],

			ins: 'Free the hostages',
		},
		{
			wall:2,
			playerCount:2,
			x:BatHeist.W*0.5,
			y:BatHeist.H*0.5,
			actors:[
				//{type:'lamp',x:0.5,y:0.2},
				{type:'goon',x:2,y:0},
				{type:'goon',x:2,y:4},
				{type:'hostage',x:1,y:2},
				{type:'hostage',x:3,y:2},
			],

			ins: 'Free the hostages',
		},
	]

	let $players = [];
	for(var i=0; i<2; i++){
		$players[i] = $(`<heistprojectile><heistspinner></heistspinner></heistprojectile>`).appendTo(self.$el);
	}

	let arenas = [];
	for(var p=0; p<PUZZLES.length; p++){
		arenas[p] = new BatHeistArena(PUZZLES[p]);
		arenas[p].$el.appendTo($stages[PUZZLES[p].wall]);
		arenas[p].$el.attr('id',p);
		arenas[p].$el.click(onToggleArena);
	}

	let $overlay = $('<heistoverlay>').appendTo($game);
	let idFocus = undefined;

	function onToggleArena(){
		let id = $(this).closest('heistarena').attr('id');

		if(id==idFocus){
			//unfocus();
		} else {
			idFocus = id;
			arenas[idFocus].setFocus(true);
			$walls[ arenas[idFocus].layout.wall ].addClass('focus');
			$game.addClass('focus');
		}
	}

	function onResetArena(){
		arenas[idFocus].reset();
	}

	function unfocus(){
		arenas[idFocus].setFocus(false);
		$walls[ arenas[idFocus].layout.wall ].removeClass('focus');
		$game.removeClass('focus');
		idFocus = undefined;
	}

	let scale = 1;
	function tick(){
		let w = $(document).innerWidth();
		scale = w/(BatHeist.W*3);
		$game.css('transform','scale('+scale+')');


		for(var a in arenas) arenas[a].step(players);

		if(idFocus != undefined){
			$walls[ arenas[idFocus].layout.wall ].find('heistinfo.left').text( arenas[idFocus].infoLeft );
			$walls[ arenas[idFocus].layout.wall ].find('heistinfo.right').text( arenas[idFocus].infoRight );
			$walls[ arenas[idFocus].layout.wall ].find('heistfail').text( arenas[idFocus].failState );
			if(arenas[idFocus].complete) unfocus();
		}
	}

	setInterval(tick,1000/BatHeist.FPS);

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
		let x = (e.pageX/scale)/BatHeist.W;
		let y = (e.pageY-oy)/scale/BatHeist.H;


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