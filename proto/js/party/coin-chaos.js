window.CoinChaosGame = function( playersMeta ){

	const W = 1600;
	const H = 1000;
	const COIN = 100;
	const PLAYERS = 6;
	const SCALE = W/2;
	const FPS = 50;

	const ROUNDS = [
		undefined,
		undefined,
		[
			{cohorts:[[0,1]],speed:0.05,coins:3,time:20},
			{cohorts:[[0,1]],speed:0.1,coins:5,time:30}
		],
		[
			{cohorts:[[0,1,2]],speed:0.05,coins:3,time:20},
			{cohorts:[[0,1,2]],speed:0.1,coins:5,time:30},
		],
		[
			{cohorts:[[0,1,2],[0,1,3],[0,2,3],[1,2,3]],speed:0.05,coins:5,time:20},
		],
		[
			{cohorts:[[0,1,2],[0,3,4],[1,3,4],[2,3,0],[2,4,1]],speed:0.05,coins:5,time:20},
		],
		[
			{cohorts:[[0,1,2],[3,4,5]],speed:0.05,coins:3,time:20},
			{cohorts:[[0,1,2],[3,4,5]],speed:0.1,coins:5,time:20},
		],
	]

	let CoinPile = function(n,speed=0.05){
		let self = this;
		self.$el = $(`<coinchaospile n=${n}>`);

		$('<coincircle>').appendTo(self.$el);

		self.n = n;
		self.coins = [];
		self.position = 0;
		self.x = self.y = 0;
		self.speed = speed;

		self.step = function() {
			//let p = 1/PLAYERS*(i)*Math.PI*2;
			self.position += self.speed/FPS;
			self.x = Math.cos(self.position * Math.PI*2) * 0.7;
			self.y = Math.sin(self.position * Math.PI*2) * 0.7;

			for(var c in self.coins){
				self.coins[c].x = self.x + Math.cos((self.position+self.coins[c].position) * Math.PI*2) * self.coins[c].radius;
				self.coins[c].y = self.y + Math.sin((self.position+self.coins[c].position) * Math.PI*2) * self.coins[c].radius;
			}
		}

		self.redraw = function(){
			self.$el.css({
				left: self.x * SCALE,
				top: self.y * SCALE,
			})
		}

		self.add = function(coin){
			coin.position = Math.random();
			coin.radius = Math.random() * 0.2;
			self.coins.push(coin);
			coin.nPile = n;
		}

		self.remove = function(coin){
			let nCoin = self.coins.indexOf(coin);
			self.coins.splice(nCoin,1);
		}
	}

	let Coin = function(n){
		let self = this;
		self.$el = $(`<coinchaoscoin n=${n}>`);
		self.nPile = n;

		self.$el.css({'animation-delay':(-Math.random()*6) + 's'})
		$('<coinshadow>').appendTo(self.$el);
		let $body = $('<coinbody>').appendTo(self.$el);

		self.x = self.y = 0;

		self.redraw = function(){
			self.$el.css({
				left: self.x * SCALE,
				top: self.y * SCALE,
			}).attr('held',self.holder?'true':'false');
		}

		self.initEntry = function(delay){
			$body.css({
				transform:'rotateX(-90deg) translateY(-1000px)',
				opacity:0,
				transition:'all 0.3s',
			});

			setTimeout(function(){
				audio.play('coin',true);
				$body.css({
					transform:'rotateX(-90deg) translateY(0px)',
					opacity:1,
				});
			},delay);

		}
	}

	let Meep = function(n){
		let self = this;
		self.$el = $('<coinchaosmeep>');
		self.coin = undefined;
		self.x = self.y = 0;
		self.score = 0;

		let meep = new PartyMeep(n);
		meep.setHeight(350);
		meep.$el.appendTo(self.$el);

		self.redraw = function(){

			if(self.coin){
				self.coin.x = self.x;
				self.coin.y = self.y;
				self.coin.redraw();
			}

			self.$el.css({
				left: self.x * SCALE,
				top: self.y * SCALE,
			})
		}

		self.grab = function(coin){
			self.coin = coin;
			coin.holder = self;
			meep.$handLeft.css({left:-50,top:220});
			meep.$handRight.css({left:50,top:220});
		}

		self.drop = function(){
			self.coin.holder = undefined;
			self.coin = undefined;
			meep.$handLeft.css({left:'',top:''});
			meep.$handRight.css({left:'',top:''});
		}
	
	}


	if(!CoinChaosGame.init){
		CoinChaosGame.init = true;

		$("head").append(`
			<style>
				.coinchaoswrapper{
					/*background: url(./proto/img/party/bg-mountains-clouds.png);
					background-size: 100%;*/
				}



				coinchaosgame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					position: absolute;
					transform-origin: top left;
					left: 0px;
					perspective: ${W}px;

					background: url(./proto/img/party/bg-mountains-clouds.png);
					background-size: 100%;
				}

				coinchaosgame:before{
					content: "";
					display: block;
					position: absolute;
					inset: 0px;

					background: linear-gradient(to top, #86C0D4, transparent);
				}

				coinchaosplatform{
					width: ${W}px;
					height: ${W}px;
					background: gray;
					transform-origin: bottom center;
					border-radius: 100%;
					transform: rotateX(60deg);
					display: block;
					position: absolute;
					bottom: 100px;
					left: calc( 33.3% + 50px );
					transform-style: preserve-3d;

					background: url(./proto/img/party/bg-floorboards.jpg);
					background-size: 20%;
					border-bottom: 50px solid rgba(0,0,0,0.3);

					transition: all 0.5s;

				}

				coinchaosplatform:after{
					content:"";
					position: absolute;
					display: block;
					inset: 30%;
					border: 5px solid black;
					border-radius: 100%;
				}

				coinchaoscenter{
					position: absolute;
					top: 50%;
					left: 50%;
					display: block;
					transform-style: preserve-3d;
				}

				coinchaosmeep{
					transform: rotateX(-90deg);
					position: absolute;
					display: block;
					top: 50%;
					left: 50%;
					transform-style: preserve-3d;
				}

				coinchaospile{
					display: block;
					position: absolute;
					transform-style: preserve-3d;
				}

				coincircle
				{
					display: block;
					position: absolute;
					width: 400px;
					height: 400px;
					border-radius: 100%;
					border: 20px dashed red;
					transform: translate(-50%, -50%);
					box-sizing: border-box;
					transform-style: preserve-3d;
					border-color: black;
				}

				coinchaospile[n='0'] coincircle{ border-color:var(--n0); }
				coinchaospile[n='1'] coincircle{ border-color:var(--n1); }
				coinchaospile[n='2'] coincircle{ border-color:var(--n2); }
				coinchaospile[n='3'] coincircle{ border-color:var(--n3); }
				coinchaospile[n='4'] coincircle{ border-color:var(--n4); }
				coinchaospile[n='5'] coincircle{ border-color:var(--n5); }

				coinchaoscoin[n='0'] coinbody{ background:var(--n0); }
				coinchaoscoin[n='1'] coinbody{ background:var(--n1); }
				coinchaoscoin[n='2'] coinbody{ background:var(--n2); }
				coinchaoscoin[n='3'] coinbody{ background:var(--n3); }
				coinchaoscoin[n='4'] coinbody{ background:var(--n4); }
				coinchaoscoin[n='5'] coinbody{ background:var(--n5); }

				coinchaoscoin{
					position: absolute;
					display: block;
					transform-style: preserve-3d;
					animation: spincoin 6s linear infinite;
				}

				coinbody{
					position: absolute;
					display: block;
					width: ${COIN}px;
					height: ${COIN}px;
					background: purple;
					border-radius: 100%;
					left: -${COIN/2}px;
					bottom: 0px;
					transform: rotateX(-90deg);
					transform-style: preserve-3d;
					transform-origin: bottom center;
					border-left: 10px solid white;
					box-sizing: border-box;
					background: black;
				}

				coinchaoscoin[held='true']{
					animation: none;
				}

				coinchaoscoin[held='true'] coinbody{
					transform: translateZ(150px) translateY(${COIN}px);
					
				}

				coinbody:after{
					content:"";
					position: absolute;
					display: block;
					top: 0px;
					left: 0px;
					right: 0px;
					bottom: 0px;
					margin: 20px;
					box-sizing: border-box;
					border: 5px solid black;
					border-radius: 100%;
					box-shadow: 4px 0px white;
				}

				coinshadow
				{
					position: absolute;
					display: block;
					width: ${COIN}px;
					height: ${COIN/2}px;
					background: black;
					border-radius: 100%;
					top: -${COIN/4}px;
					left: -${COIN/2}px;
					transform-style: preserve-3d;
					opacity: 0.3;
				}

				@keyframes spincoin{
					0%{
						transform: rotateZ(0deg);
					}

					100%{
						transform: rotateZ(360deg);
					}
				}
			</style>`);
	}

	let self = this;
	self.$el = $('<igb class="coinchaoswrapper">')
	let $game = $('<coinchaosgame>').appendTo(self.$el);
	let $blur = $('<blurlayer>').appendTo($game);

	let $blurBG = $('<blurlayer>').appendTo($game).css({
		background: 'rgba(0,0,0,0.3)'
	})

	let $platform = $('<coinchaosplatform>').appendTo($game);
	let $center = $('<coinchaoscenter>').appendTo($platform);

	let audio = new AudioPlayer();
	audio.add('music','./proto/audio/party/music-playroom.mp3',0.3,true);
    audio.add('coin','./proto/audio/party/sfx-coin.mp3',0.3);
    audio.add('pickup','./proto/audio/party/sfx-pickup.mp3',0.3);


    let isGameAlive = false;


	function step(){

		for(var p in piles){
			if(isGameAlive) piles[p].step();
			piles[p].redraw();
		}

		for(var m in meeps){

			if(!meeps[m].isActive) continue;

			if(!meeps[m].coin){
				let minDist = 0.1;
				let nCoin = -1;
				for(var c in coins){

					if(!coins[c].holder && coins[c].nPile != m && isGameAlive){
						let dx = coins[c].x - meeps[m].x;
						let dy = coins[c].y - meeps[m].y;

						let d = Math.sqrt(dx*dx + dy*dy);
						if(d<minDist){
							minDist = d;
							nCoin = c;
						}
					}
				}

				if(nCoin>-1){
					for(var p in piles) if(piles[p].n == coins[nCoin].nPile) piles[p].remove(coins[nCoin]);
					meeps[m].grab(coins[nCoin]);
					audio.play('pickup',true);
				}
			} else {
				
				// find distance to home pile
				let nPile = -1;
				for(var p in piles) if( piles[p].n == m ) nPile = p;

				let dx = piles[nPile].x - meeps[m].x;
				let dy = piles[nPile].y - meeps[m].y;
				let d = Math.sqrt(dx*dx + dy*dy);

				if(d<0.14){
					piles[nPile].add(meeps[m].coin);
					meeps[m].drop();
					audio.play('coin',true);
				}
			}

			meeps[m].redraw();
		}

		for(var c in coins) coins[c].redraw();
		for(var p in piles) meeps[piles[p].n].score = piles[p].coins.length;

		hud.updatePlayers(meeps);

		resize();
	}

	function resize(){
		let w = $(document).innerWidth();
		scale = (w/3)/W;
		$game.css('transform','scale('+scale+')');
	}

	let hud = new PartyHUD();
	hud.$el.appendTo($game);
	
	if( playersMeta ) setTimeout( function(){ initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	let meeps = [];
	let piles = [];
	let coins = [];

	function initGame(PLAYERS){
		for(var i=0; i<PLAYERS; i++){
			meeps[i] = new Meep(i);
			meeps[i].$el.appendTo($center).hide();
			meeps[i].isActive = false;
		}

		
		initTutorial();
	}

	function initTutorial(){
		
		$platform.css({
			'bottom':"50px",
			'transform':'scale(1) rotateX(80deg)'
		})

		hud.initTutorial('Coin Chaos',
			{x:1.25, y:0.45, msg:"Move around the box<br>and steal opponent's coins", icon:"around"},
			{x:1.75, y:0.4, msg:"Return stolen coins<br>to your safe zone", icon:"align"},
		);

		for(var m in meeps){
			meeps[m].$el.show();
			meeps[m].isActive = true;

			piles[m] = new CoinPile(m,0.03);
			piles[m].position = 1/meeps.length*m;
			piles[m].$el.appendTo($center);

			for(var c=0; c<4; c++){
				let coin = new Coin(m);
				piles[m].add(coin);
				coin.redraw();
				coin.$el.appendTo($center);
				coins.push(coin);
			}

			piles[m].step();
			piles[m].redraw();
		}

		isGameAlive = true;

		hud.initTimer(30,finiTutorial);
	}

	function finiTutorial(){
		$blur.hide();

		for(var m in meeps) meeps[m].score = 0;
		hud.finiTutorial();
		$blurBG.hide();
		$platform.css({
			'bottom':'100px',
			'transform':'rotateX(60deg)',

		});

		hud.initPlayers(meeps);
		finiRound();
	}

	let iCohort = -1;
	let iRound = 0;
	function initNextCohort(){

		iCohort++;

		if(!ROUNDS[meeps.length][iRound].cohorts[iCohort]){
			iCohort = 0;
			iRound++;
		}

		if(!ROUNDS[meeps.length][iRound]){
			finiGame();
			return;
		}

		let rounds = ROUNDS[meeps.length];
		let round = rounds[iRound];
		let cohort = rounds[iRound].cohorts[iCohort];

		
		
		audio.play('music',false,(rounds.length>1 && iRound==rounds.length-1)?1.25:1);

		if(rounds.length>1){
			hud.initRound(iRound,rounds.length);
			setTimeout(function(){
				hud.finiBanner();
			},2000);
		}
		

		setTimeout(function(){
			hud.summonPlayers(round.cohorts[iCohort]);
			hud.revealTimer(round.time);

			for(var i in cohort){
				let m = cohort[i];

				meeps[m].isActive = true;
				meeps[m].$el.show();

			}

			
		},4000);

		setTimeout(function(){
			hud.finiBanner();
		},6000);

		setTimeout(function(){
			for(var i in cohort){
				let m = cohort[i];

				let coinsStart = meeps[m].score + round.coins;
				meeps[m].score = coinsStart;

				piles[i] = new CoinPile(m,round.speed);
				piles[i].position = 1/cohort.length*i;
				piles[i].$el.appendTo($center);

				for(var c=0; c<coinsStart; c++){
					let coin = new Coin(m);
					piles[i].add(coin);
					coin.redraw();
					coin.$el.appendTo($center);
					coins.push(coin);

					coin.initEntry(Math.random()*500 + (500/coinsStart)*c );
				}

				piles[i].step();
				piles[i].redraw();
			}

			hud.updatePlayers(meeps);

		},7500);

		setTimeout(function(){
			hud.initTimer(round.time,finiRound);
			isGameAlive = true;
		},10000);
	}

	function finiRound(){
		isGameAlive = false;
		hud.finiTimer();

		for(var m in meeps){
			meeps[m].$el.hide();
			meeps[m].isActive = false;
			meeps[m].coin = undefined;
		}

		for(var p in piles){
			piles[p].$el.hide();
		}

		for(var c in coins){
			coins[c].$el.hide();
		}

		piles.length = 0;
		coins.length = 0;

		setTimeout(initNextCohort,2000);
	}

	function finiGame(){
		let scores = [];
		for(var m in meeps) scores[m] = meeps[m].score;
		hud.showFinalScores(scores,scores);

		setTimeout(function(){
			self.fini();
		},6000)
	}

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].x = p[m].x;
			meeps[m].y = -p[m].z;
		}
	}

	
	let interval = setInterval(step,1000/FPS);

	self.fini = function(){
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	}
}