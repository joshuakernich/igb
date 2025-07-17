window.SpotTheMeepGame = function(){

	const W = 1600;
	const H = 1000;

	if( !SpotTheMeepGame.init ){
		SpotTheMeepGame.init = true;

		$("head").append(`
			<style>
				spotgame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: url(./proto/img/party/bg-village.png);
					background-size: 33.3% 100%;


				}
			</style>`);
	}

	let self = this;
	self.$el = $('<igb>');
	let $game = $('<spotgame>').appendTo(self.$el);

	let hud = new PartyHUD();
	hud.$el.appendTo($game);
	//hud.initBanner('Find your Meep');

	function step(){
		resize();
	}

	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	const ROUNDS = [
		{count:6},
		{count:12},
		{count:18},
	]
	let nRound = -1;

	let meeps = [];
	let cntCorrect = 0;

	function populateLevel(){

		cntCorrect = 0;
		meeps.length = 0;

		let COUNT = ROUNDS[nRound].count;

		let order = [];
		while(order.length<self.playerCount) order.push(order.length);
		while(order.length<COUNT) order.push(-1);

		shuffleArray(order);

		let countPerWall = Math.floor(COUNT/3);
		let spacing = 200;

		for(var i=0; i<COUNT; i++){

			let nWall = Math.floor(i/countPerWall);
			let nMeep = (i%countPerWall);

			let meep = new PartyMeep(order[i]);
			meep.setHeight(350);
			meep.$el.appendTo($game);
			meep.$el.attr('i',i);
			meep.$el.css({
				'bottom':'100%',
				'left':(nWall + 0.5)*W + (-(countPerWall-1)/2 + nMeep)*spacing+'px',
			}).delay(Math.random()*1000).animate({
				'bottom':20 + (nMeep%2)*5+'%',
			},{
				duration: 300,
				easing: 'linear',
				complete:function(){
					meep.setHeight(300);
					setTimeout(function(){
						meep.setHeight(350);
					},200);
				}
			});

			meep.$el.click(onMeep);

			meeps[i] = meep;
		}
	}

	function onMeep(){

		let i = parseInt( $(this).attr('i') );
		let n = meeps[i].n;

		if(n == -1){

		} else {
			meeps[i].$handLeft.animate({top:'40%'},200);
			meeps[i].$handRight.animate({top:'40%'},200);
			meeps[i].$el.off();

			cntCorrect++;
			if(cntCorrect==self.playerCount) setTimeout( finiRound, 1000 );
		}
	}

	function finiRound(){
		for(var m in meeps) meeps[m].$el.remove();
		hud.finiBanner();
		if( ROUNDS[nRound+1] ) setTimeout( initRound, 2000 );
		else setTimeout( finiGame, 1000 );
	}

	function initRound(){
		nRound++;

		hud.initBanner('Round '+(nRound+1));
		setTimeout(hud.finiBanner,2000);
		setTimeout(function(){
			hud.initBanner('Find your meep');
			populateLevel();
		},3000);
	}

	function finiGame() {
		hud.initBanner('Finish!');
		setTimeout(function(){
			window.doPartyGameComplete([0]);
		},2000);
	}

	function initGame(playerCount){
		self.playerCount = playerCount;
		setTimeout(initRound,1000);
	}

	hud.initPlayerCount(initGame);

	const FPS = 20;
	let interval = setInterval(step,1000/FPS);
}
