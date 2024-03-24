Demogorgon = function(){

	let self = this;
	
	let timeClimb = 1000;
	let timeJump = 1500;

	self.$el = $('<demogorgon>').appendTo('screen');


	let libraryOfMoves = [queuePopup,queueHide,queueWave,queueFakeout];
	let whatNexts = [];
	let iLayerJump;
	let scale = 1;
	let nObstacle = 0;
	let bCanPopup = false;

	self.nLayer = 0;
	self.isVulnerable = false;
	self.isPopup = false;

	self.setCanPopup = function(b){
		bCanPopup = b;
		console.log(bCanPopup);
	}

	self.hit = function () {

		self.isVulnerable = false;
		self.isPopup = false;

		hitsOnLayer++;
		clearTimeout(iLayerJump);

		let x = self.$el.position().left;
		self.$el
		.animate({left:x-5},20)
		.animate({left:x+5},20)
		.animate({left:x-5},20)
		.animate({left:x+5},20)
		.animate({left:x},{duration:20,complete:queueHide})
	}

	function queuePopup(){
		if(!bCanPopup){
			queueFakeout();
			return;
		}

		self.isPopup = true;

		let x = getRandomX();
		if(self.nLayer == 0) x = x + (Math.random()>0.5?-50:50);
		self.$el.attr('pose','static').css({left:x});

		setTimeout(function(){
			self.isVulnerable = true;
		},500)

		iLayerJump = setTimeout(doClimb,500+timeClimb);
	}

	function doClimb() {
		self.$el.attr('pose','climb');
		iLayerJump = setTimeout(doNextLayer,timeJump-hitsOnLayer*100);
	}

	function queueHide(){
		nObstacle = Math.floor(Math.random()*$('layer').eq(self.nLayer).find('obstacle').length);
		toObstacle( nObstacle );
	}

	function getRandomX(){
		let $obstacle = $('layer').eq(self.nLayer).find('obstacle').eq(nObstacle);
		let left = $obstacle.offset().left - $('screen').offset().left;
		return left + $obstacle.width()*0.1 + Math.random()*$obstacle.width()*0.8;
	}

	function queueWave(){

		self.$el.attr('pose','wave').css({left:getRandomX()});
		
		setTimeout( function(){
			self.$el.attr('pose','crouch');
			queueRandom();
		},500);

	}

	function queueFakeout(){

		self.$el.attr('pose','fakeout').css({left:getRandomX()});

		setTimeout( function(){
			self.$el.attr('pose','crouch');
			queueRandom();
		},500);
	}

	

	function shuffle(array) {
	  let currentIndex = array.length, randomIndex;

	  // While there remain elements to shuffle.
	  while (currentIndex > 0) {

	    // Pick a remaining element.
	    randomIndex = Math.floor(Math.random() * currentIndex);
	    currentIndex--;

	    // And swap it with the current element.
	    [array[currentIndex], array[randomIndex]] = [
	      array[randomIndex], array[currentIndex]];
	  }

	  return array;
	}


	function queueRandom(){
		if(!whatNexts.length) whatNexts = shuffle(libraryOfMoves.concat());
		let whatNext = whatNexts.pop();

		setTimeout( whatNext, 150 + Math.random()*1000 );
	}

	function atObstacle(){
		queueRandom();
	}

	function toObstacle(nObstacle){
		let $obstacle = $('layer').eq(self.nLayer).find('obstacle').eq(nObstacle);
		let left = $obstacle.offset().left - $('screen').offset().left;
		self.$el.attr('pose','crouch');
		self.$el.animate(
			{
				left:left + $obstacle.width()/2
			},
			{
				duration: 1000,
				easing:'swing',
				complete:atObstacle,
			});
	}

	
	function toNextObstacle(){
		nObstacle++;
		toObstacle(nObstacle);
	}

	function toPrevObstacle(){
		nObstacle--;
		toObstacle(nObstacle);
	}

	function doNextLayer(){

		nObstacle = -1;
		doLayer(self.nLayer+1);
	}

	function doLayer(n) {

		hitsOnLayer = 0;
		self.isVulnerable = false;
		self.isPopup = false;

		self.nLayer = n;
		scale = (1+n);

		self.$el
		.attr('pose','dodge')
		.prependTo($('layer').eq(self.nLayer))
		.css({transform:'scale('+scale+')'});


		if( $('layer').eq(self.nLayer).find('obstacle').length ) setTimeout( toNextObstacle, 500 );
	}

	doLayer(0);
}