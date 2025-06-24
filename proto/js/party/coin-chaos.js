window.CoinChaosGame = function(){

	let CoinPile = function(n,scale){
		let self = this;
		self.$el = $(`<coinchaospile n=${n}>`);

		$('<coincircle>').appendTo(self.$el);

		self.x = self.y = 0;

		
		
		self.redraw = function(){
			self.$el.css({
				left: self.x * scale,
				top: self.y * scale,
			})
		}
	}

	let Coin = function(n,scale){
		let self = this;
		self.$el = $(`<coinchaoscoin n=${n}>`);
		self.nPile = n;

		self.$el.css({'animation-delay':(-Math.random()*6) + 's'})
		$('<coinshadow>').appendTo(self.$el);
		$('<coinbody>').appendTo(self.$el);

		self.x = self.y = 0;

		self.redraw = function(){
			self.$el.css({
				left: self.x * scale,
				top: self.y * scale,
			}).attr('held',self.holder?'true':'false');
		}
	}

	let Meep = function(n,scale){
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
				left: self.x * scale,
				top: self.y * scale,
			})
		}

		self.grab = function(coin){
			self.coin = coin;
			self.coin.nPile = undefined;
			coin.holder = self;

			meep.$handLeft.css({left:-50,top:220});
			meep.$handRight.css({left:50,top:220});
		}

		self.drop = function(){
			self.coin.holder = undefined;
			self.coin.nPile = n;
			self.coin.redraw();
			self.coin = undefined;

			meep.$handLeft.css({left:'',top:''});
			meep.$handRight.css({left:'',top:''});
		}
	
	}


	const W = 1600;
	const H = 1000;
	const COIN = 100;
	const PLAYERS = 6;

	if(!CoinChaosGame.init){
		CoinChaosGame.init = true;

		$("head").append(`
			<style>
				.coinchaoswrapper{
					background: url(./proto/img/party/bg-mountains-white.jpg);
					background-size: 33.3% 100%;
				}

				coinchaosgame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					position: absolute;
					transform-origin: top left;
					left: 0px;
					perspective: ${W}px;
				}

				coinchaosplatform{
					width: ${W-100}px;
					height: ${W-100}px;
					background: gray;
					transform-origin: bottom center;
					border-radius: 100px;
					transform: rotateX(60deg);
					display: block;
					position: absolute;
					bottom: 100px;
					left: calc( 33.3% + 50px );
					transform-style: preserve-3d;

					background: url(./proto/img/party/bg-floorboards.jpg);
					background-size: 20%;
					border-bottom: 50px solid rgba(0,0,0,0.3);

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
	let $platform = $('<coinchaosplatform>').appendTo($game);
	let $center = $('<coinchaoscenter>').appendTo($platform);

	let audio = new AudioContext();
    audio.add('coin','./proto/audio/party/sfx-coin.mp3',1);
    audio.add('pickup','./proto/audio/party/sfx-pickup.mp3',1);


	function step(){

		for(var m in meeps){

			if(!meeps[m].coin){
				let minDist = 0.1;
				let nCoin = -1;
				for(var c in coins){

					if(!coins[c].holder && coins[c].nPile != m){
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
					meeps[m].grab(coins[nCoin]);
					audio.play('pickup',true);
				}
			} else {
				
				// find distance to home pile
				let dx = piles[m].x - meeps[m].x;
				let dy = piles[m].y - meeps[m].y;
				let d = Math.sqrt(dx*dx + dy*dy);

				if(d<0.14){
					meeps[m].drop();
					audio.play('coin',true);
				}
			}

			meeps[m].redraw();
		}
		resize();
	}

	function resize(){
		let w = $(document).innerWidth();
		scale = (w/3)/W;
		$game.css('transform','scale('+scale+')');
	}

	let hud = new PartyHUD();
	hud.$el.appendTo($game);
	hud.initPlayerCount(initGame);

	let meeps = [];
	let piles = [];
	let coins = [];

	function initGame(PLAYERS){
		for(var i=0; i<PLAYERS; i++){
			meeps[i] = new Meep(i,W/2);
			meeps[i].$el.appendTo($center);

			piles[i] = new CoinPile(i,W/2);
			let p = 1/PLAYERS*(i)*Math.PI*2;
			let x = Math.cos(p) * 0.7;
			let y = Math.sin(p) * 0.7;
			piles[i].x = x;
			piles[i].y = y;
			piles[i].redraw();
			piles[i].$el.appendTo($center);

			for(var c=0; c<10; c++){
				let coin = new Coin(i,W/2);
				coin.x = x + Math.cos(1/5*c*Math.PI*2) * (1+c) * 0.02;
				coin.y = y + Math.sin(1/5*c*Math.PI*2) * (1+c) * 0.02;
				coin.redraw();
				coin.$el.appendTo($center);
				coins.push(coin);
			}
		}

		hud.initTimer(60,finiGame);
	}

	function finiGame(){
		clearInterval(interval);
		hud.initBanner('Time Up!');
		setTimeout(function(){

			let scores = [];

			for(var p in piles) scores[p] = -10;
			for(var c in coins) if( coins[c].nPile != undefined ) scores[ coins[c].nPile ] ++;

			window.doPartyGameComplete(scores);
		},1000)
	}

	

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].x = p[m].x;
			meeps[m].y = -p[m].z;
		}
	}

	const FPS = 20;
	let interval = setInterval(step,1000/FPS);
}