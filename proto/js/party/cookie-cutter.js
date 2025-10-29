window.CookieCutterGame = function( playersMeta ){

	const W = 1600;
	const H = 1000;
	const CUTTER = 1500;
	const FPS = 20;

	function toArr(arr){
		let path = [];
		for(var i=0; i<arr.length/2; i++){
			path[i] = [ arr[i*2], arr[i*2+1] ];
		}
		return path;
	}

	let SHAPES = [];
	for(var s in SHAPE_LIBRARY) SHAPES[s] = toArr(SHAPE_LIBRARY[s]);


	function toPath(arr){
		let d = '';
		for(var a=0; a<arr.length; a++) d = d + (a==0?'M':'L') + (arr[a][0]) + ',' + (arr[a][1]);
		return d;
	}

	let CookieComposition = function( ...shapes ){
		let self = this;
		self.$el = $('<cookiecomposition>');
		let $svg = $(`<svg viewBox='0 0 ${CUTTER} ${CUTTER}' xmlns="http://www.w3.org/2000/svg">`).appendTo(self.$el);

		let d = `M0,0 L${CUTTER},0 L${CUTTER},${CUTTER} L0,${CUTTER}`
		let $path = $(`<path d=${d}>`).appendTo($svg);

		self.holes = [];

		function inside(point, vs, buffer=0) {
		    // ray-casting algorithm based on
		    // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html
		    
		    var x = point[0], y = point[1];
		    
		    var inside = false;
		    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
		        var xi = vs[i][0], yi = vs[i][1];
		        var xj = vs[j][0], yj = vs[j][1];
		        
		        var intersect = ((yi > y) != (yj > y))
		            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
		        if (intersect) inside = !inside;
		    }

		    if(inside && buffer>0){
		    	let dist = pointToPolygonDistance(point,vs);
		    	if(dist<buffer) inside = false;
		    }
		    
		    return inside;
		};

		self.isInHole = function( x,y ){

			x = (x+W/2)/W*CUTTER;
			y = (y+W/2)/W*CUTTER;

			let b = false;
			for(var h in self.holes) if( inside([x,y], self.holes[h]) ) b = true;
			return b;
		}

		self.add = function( x, y, nShape, size ){

			size = CUTTER/500 * size;
			
			x = x * CUTTER;
			y = y * CUTTER;

			let arr = [];

			for(var p in SHAPES[nShape]){
				arr[p] = [
					SHAPES[nShape][p][0]*size+x,
					SHAPES[nShape][p][1]*size+y,
				]
			}

			self.holes.push(arr);

			let arrReverse = arr.concat().reverse();
			d = d + toPath(arrReverse);
		}

		for(var s in shapes) self.add(shapes[s].x,shapes[s].y,shapes[s].n,shapes[s].size);

		$path.attr('d',d);
		$svg.html($svg.html());
	}

	

	let COMPOSITIONS = [

		new CookieComposition({x:0,y:0,n:1,size:1}), // star
		new CookieComposition({x:0,y:0,n:1,size:0.5},{x:0.5,y:0.5,n:1,size:0.5}), // stars
		new CookieComposition({x:0,y:0,n:10,size:1}), // heart
		new CookieComposition({x:0.5,y:0,n:1,size:0.5},{x:0,y:0.5,n:10,size:0.5}), // star and heart
		new CookieComposition({x:1/3,y:0,n:10,size:1/3},{x:0,y:1/3,n:10,size:1/3},{x:2/3,y:1/3,n:10,size:1/3},{x:1/3,y:2/3,n:10,size:1/3}), // hearts

		new CookieComposition({x:0,y:0,n:8,size:1}), // stair
		new CookieComposition({x:0,y:0,n:8,size:0.5},{x:0.5,y:0.5,n:8,size:0.5}), // stairs
		new CookieComposition({x:0,y:0,n:9,size:1}), // crescent
		new CookieComposition({x:1/3,y:1/3,n:9,size:2/3},{x:1/3,y:1/3,n:10,size:1/3}), // heart and crescent
		new CookieComposition({x:1/3,y:0,n:9,size:1/3},{x:0,y:1/3,n:8,size:1/3},{x:2/3,y:1/3,n:9,size:1/3},{x:1/3,y:2/3,n:8,size:1/3}), // stairs and crescent

		new CookieComposition({x:0,y:0,n:4,size:1}), // pentagon
		new CookieComposition({x:0,y:0,n:4,size:0.5},{x:0.5,y:0.5,n:1,size:0.5}), // pentagon and star
		new CookieComposition({x:0,y:0,n:3,size:1}), // spark
		new CookieComposition({x:0,y:0,n:3,size:0.5},{x:0.5,y:0.5,n:3,size:0.5}), // star and spark
		new CookieComposition({x:0,y:0,n:3,size:1/3},{x:2/3,y:0,n:4,size:1/3},{x:1/3,y:1/3,n:1,size:1/3},{x:0,y:2/3,n:4,size:1/3},{x:2/3,y:2/3,n:3,size:1/3}), // stars, sparks, and pentagons

		new CookieComposition({x:0,y:0,n:7,size:1}), // cross
		new CookieComposition({x:1/4,y:0,n:7,size:1/2},{x:1/4,y:1/2,n:7,size:1/2}), // crosses
		new CookieComposition({x:0,y:0,n:5,size:1}), // peanut
		new CookieComposition({x:0.5,y:0,n:5,size:0.5},{x:0.5,y:0.5,n:5,size:0.5}), // peanuts
		new CookieComposition({x:0,y:0,n:10,size:1/3},{x:2/3,y:0,n:10,size:1/3},{x:1/3,y:1/3,n:10,size:1/3},{x:0,y:2/3,n:10,size:1/3},{x:2/3,y:2/3,n:10,size:1/3}), // hearts

		new CookieComposition({x:0,y:0,n:6,size:1}), // tri-peanut
		new CookieComposition({x:0,y:0,n:6,size:0.5},{x:0,y:0.5,n:6,size:0.5}), // tri-peanuts
		new CookieComposition({x:0,y:0,n:11,size:1}), // face
		new CookieComposition({x:0,y:1/4,n:11,size:1/2},{x:1/2,y:1/4,n:11,size:1/2}), // faces
		new CookieComposition({x:1/3,y:0,n:1,size:1/3},{x:0,y:1/3,n:1,size:1/3},{x:2/3,y:1/3,n:1,size:1/3},{x:1/3,y:2/3,n:1,size:1/3}), // stars

		
	]

	let sets = [];
	for(var i=0; i<5; i++){
		sets[i] = COMPOSITIONS.slice(i*5,(i+1)*5);
	}

	let first = COMPOSITIONS.slice(0,9);
	let last = COMPOSITIONS.slice(COMPOSITIONS.length-10,COMPOSITIONS.length-1);
	

	const STRUCTURE = [
		undefined,
		undefined,
		[
			{ cohorts:[{players:[0,1],levels:sets[0],timeMax:2000, timeMin:1500}] },
			{ cohorts:[{players:[0,1],levels:sets[1],timeMax:1500, timeMin:1000}] },
			{ cohorts:[{players:[0,1],levels:sets[3],timeMax:1000, timeMin:500}] },
			{ cohorts:[{players:[0,1],levels:sets[4],timeMax:500, timeMin:500}] },
		],
		[
			{ cohorts:[{players:[0,1,2],levels:sets[0],timeMax:2000, timeMin:1500}] },
			{ cohorts:[{players:[0,1,2],levels:sets[1],timeMax:1500, timeMin:1000}] },
			{ cohorts:[{players:[0,1,2],levels:sets[3],timeMax:1000, timeMin:500}] },
			{ cohorts:[{players:[0,1,2],levels:sets[4],timeMax:500, timeMin:500}] },
		],
		[
			{ cohorts:[{players:[0,1,2,3],levels:sets[0],timeMax:2000, timeMin:1500}] },
			{ cohorts:[{players:[0,1,2,3],levels:sets[1],timeMax:1500, timeMin:1000}] },
			{ cohorts:[{players:[0,1,2,3],levels:sets[3],timeMax:1000, timeMin:500}] },
			{ cohorts:[{players:[0,1,2,3],levels:sets[4],timeMax:500, timeMin:500}] },
		],
		[
			{ 
				cohorts:[
					{players:[0,1,2],levels:sets[0],timeMax:1500, timeMin:500},
					{players:[3,4,0],levels:sets[1],timeMax:1500, timeMin:500},
					{players:[1,2,3],levels:sets[2],timeMax:1500, timeMin:500},
					{players:[4,0,1],levels:sets[3],timeMax:1500, timeMin:500},
					{players:[2,3,4],levels:sets[4],timeMax:1500, timeMin:500},
				]
			}
		],
		[
			{ 
				cohorts:[
					{players:[0,1,2],levels:sets[0],timeMax:1500, timeMin:1000},
					{players:[3,4,5],levels:sets[1],timeMax:1500, timeMin:1000},
				]
			},
			{
				cohorts:[
					{players:[0,2,4],levels:sets[3],timeMax:1000, timeMin:500},
					{players:[1,3,5],levels:sets[4],timeMax:1000, timeMin:500},
				]
			}
		],

	]

	if(!CookieCutterGame.didInit){
		CookieCutterGame.didInit = true;

		$("head").append(`
			<style>
				cookiegame{
					display: block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background: linear-gradient( to bottom, orange, rgba(100,80,40,1));
					
					perspective: ${W}px;

					background: url(./proto/img/party/bg-box-factory.png);
					background-size: 100% 110%;
					background-position: bottom center;

				}

				cookiegame:after{
					content:"";
					display: block;
					position: absolute;
					inset: 0px;
					background: linear-gradient( to top, #A3956E, transparent );
				}

				cookieworld{
					transform-origin: center bottom;
					width: ${W}px;
					height: ${W}px;
					position: absolute;
					left: 0px;
					right: 0px;
					bottom: 110px;
					margin: auto;
					transform: rotateX(70deg);
					z-index: 10;
					transform-style:preserve-3d;
					border-radius: 100px;

		
					background: url(./proto/img/party/texture-wood.png);
					box-shadow: 0px 50px 0px #422a23;

				}

				cookiecenter{
					display: block;
					position: absolute;
					top: 50%;
					left: 50%;
					transform-style:preserve-3d;
				}

				cookiestamper{
					transform-origin: center bottom;
					width: ${W}px;
					height: ${W}px;
					position: absolute;
					left: ${-W/2}px;
					top: ${-W/2}px;
					
					transform: translateZ(${H}px);
					transform-style:preserve-3d;
					border-radius: 100px;
					display: block;
					white-space: normal;
					overflow: hidden;
					border-radius: 100px;
					transition: all 0.5s;
					border-bottom: 50px solid black;
					box-shadow: inset 0px 0px 100px white;
				}

				cookiecomposition{
					display: block;
					position: absolute;
					
					width: ${W}px;
					height: ${W}px;
				}

				cookiecomposition path{
					fill: #ddd;
					fill-rule: evenodd;
				}

				cookieshadow cookiecomposition path{
					fill: black;
				}

				cookiecorner{
					display:inline-block;
					width: 50%;
					height: 50%;
					position: relative;
					overflow: hidden;
				}

				cookieshape{
					width: ${W/3}px;
					height: ${W/3}px;
					display: block;
					position: absolute;
					left: 0px;
					right: 0px;
					bottom: 0px;
					top: 0px;
					margin: auto;
					
					border-radius: 100%;
					outline: 500px solid #bbb;
					border-top: 25px solid black;


				}

				cookiestamperbar{
					width: 200px;
					height: ${H}px;

					transform-origin: center bottom;
					transform: translate(-50%) rotateX(-70deg);
					transform-style:preserve-3d;
					display: block;
					position: absolute;
					left: 50%;
					bottom: 50%;
					background: rgba(100,55,0,1);
					border-radius: 0px 0px 35px 35px;
				}

				cookieshadow{
					transform-origin: center bottom;
					width: ${W}px;
					height: ${W}px;
					position: absolute;
					left: ${-W/2}px;
					top: ${-W/2}px;
					
					transform-style:preserve-3d;
					border-radius: 100px;
					
					opacity: 0;

					white-space: normal;
					overflow: hidden;
					transition: all 0.5s;
				}

				cookieshadow cookieshape{
					outline-color: black;
					border: none;
				}

				cookiemeep{
					display: block;
					position: absolute;
					transform-style:preserve-3d;
					transform: rotateX(-90deg);
				}

				cookiescore{
					display: block;
					position: absolute;
					bottom: 300px;
					line-height: 100px;
					font-size: 75px;
					color: white;
					left: -50px;
					right: -50px;
					text-align: center;
					text-shadow: 5px 0px 5px #333, 0px 5px 5px #333, 0 -5px 5px #333, -5px 0px 5px #333;
				}

			</style>`);
	}

	let audio = new AudioPlayer();
	audio.add('music','./proto/audio/party/music-run.mp3',0.3,true);
	audio.add('squish','./proto/audio/party/sfx-squish.mp3',0.3);
	audio.add('woosh','./proto/audio/party/sfx-woosh.mp3',0.1);
	audio.add('woosh-long','./proto/audio/party/sfx-woosh-long.mp3',0.1);
	audio.add('incorrect','./proto/audio/party/sfx-incorrect.mp3',0.3);
	audio.add('correct','./proto/audio/party/sfx-correct.mp3',0.3);
	audio.add('correct-echo','./proto/audio/party/sfx-correct-echo.mp3',0.3);

	const CookieMeep = function(n){
		let self = this;
		self.$el = $('<cookiemeep>');

		self.score = 0;

		let meep = new PartyMeep(n);
		meep.$el.appendTo(self.$el);
		meep.$el.css({
			'transform':'scale(0.8)',
		});

		let $score = $('<cookiescore>').appendTo(self.$el);

		self.addScore = function(score){
			self.score += score;
			$score.text('+1')
			.stop(false,false)
			.css({
				opacity:1,
				bottom: 250,
			}).animate({
				bottom: 350,
			},200).animate({
				bottom: 300,
			},200).delay(700).animate({
				opacity:0
			})
		}
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<cookiegame>').appendTo(self.$el);
	let $world = $('<cookieworld>').appendTo($game);
	let $center = $('<cookiecenter>').appendTo($world);

	let $shadow = $('<cookieshadow>').appendTo($center);
	let $stamper = $('<cookiestamper>').appendTo($center);

	let hud = new PartyHUD('#71A4A2');
	hud.$el.appendTo($game);

	if( playersMeta ) setTimeout( function(){ initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);
	
	let isTutorial = false;
	let nRound = 0;
	let nCohort = -1;
	let cohort;
	let meeps = [];
	function initGame(PLAYER_COUNT){

		for(var i=0; i<PLAYER_COUNT; i++){
			meeps[i] = new CookieMeep(i);
			meeps[i].isActive = false;
			meeps[i].$el.appendTo($center).hide();
			
		}

		initTutorial();
	}

	function initTutorial(){

		isTutorial = true;

		hud.initTutorial('Cookie Cutter',
		{x:1.75,y:0.45,msg:'Move around the box<br>to stand in safe spaces',icon:'around'},
		)

		for(var m in meeps){
			meeps[m].$el.show();
			meeps[m].isActive = true;
			meeps[m].isDead = false;
		}

		cohort = {
			timeMin: 2000,
			timeMax: 2000,
			levels:[ COMPOSITIONS[0], COMPOSITIONS[5], COMPOSITIONS[10], COMPOSITIONS[15] ]
		}

		setTimeout( doNewStamp, 8000 );

		hud.initTimer(30,finiTutorial);
	}

	function finiTutorial(){

		for(var m in meeps){
			meeps[m].$el.hide();
			meeps[m].isActive = false;
			meeps[m].score = 0;
		}

		hud.finiTutorial();
		hud.finiTimer();

		setTimeout(initPlay,1000);
	}


	function initPlay(){
		isTutorial = false;
		hud.initPlayers(meeps);
		setTimeout(initNextCohort,1000);
	}


	function initNextCohort(){

		nCohort++;

		if(!STRUCTURE[meeps.length][nRound].cohorts[nCohort]){
			nCohort = 0;
			nRound++;
		}

		if(!STRUCTURE[meeps.length][nRound]){
			finiGame();
			return;
		}

		audio.play('music');

		let round = STRUCTURE[meeps.length][nRound];
		cohort = round.cohorts[nCohort];

		nStamp = -1;
		
		for(var p in cohort.players){
			let m = cohort.players[p];

			meeps[m].$el.show();
			meeps[m].isActive = true;
			meeps[m].isDead = false;
		}

		let delay = 0;

		if( nCohort==0 ){
			setTimeout(function(){
				hud.initRound(nRound, STRUCTURE[meeps.length].length);
			},delay+=2000);

			setTimeout(function(){
				hud.finiBanner();
			},delay+=2000);
		}

		setTimeout(function(){
			hud.summonPlayers(cohort.players);
		},delay+=2000);

		setTimeout(function(){
			hud.finiBanner();
			doUnstamp();
		},delay+=2000);
	}

	function finiCohort(){

		for(var m in meeps){
			meeps[m].$el.hide();
			meeps[m].isActive = false;
		}

		setTimeout(initNextCohort,1000);
	}
	

	let timer;
	let scale = 1;
	function resize(){
		let w = $(document).innerWidth();
		scale = w/(W*3);
		$game.css('transform','scale('+scale+')');
	}

	let speed = 0.05;
	function step(){
		resize();

		for(var m in meeps){
			if(meeps[m].isActive){
				meeps[m].$el.css({
					left: meeps[m].x + 'px',
					top: meeps[m].y + 'px',
				})
			}
		}
	}

	const MAX = W/2-150;

	let nStamp = -1;

	function doNewStamp(){
		nStamp++;

		$stamper.empty();
		$shadow.empty();
		
		if(!cohort.levels[nStamp]){

			if(isTutorial) return;

			audio.play('correct-echo');
			finiCohort();
			return;
		}

		cohort.levels[nStamp].$el.appendTo($stamper);
		cohort.levels[nStamp].$el.clone().appendTo($shadow);

		doStampReveal();
	}

	function doStampReveal(){

		audio.play('woosh');

		$stamper.css({
			'transform':'translateZ(600px)',
		})

		$shadow.css({
			'opacity':'0.5',
		})

		let nth = nStamp/(cohort.levels.length-1);
		
		let time = cohort.timeMax - (cohort.timeMax-cohort.timeMin) * nth;


		setTimeout(doStamp,Math.max(500, time));
	}

	function doStamp() {
		
		audio.play('woosh-long');

		$stamper.css({
			'transform':'translateZ(30px)',
		})

		$shadow.css({
			'opacity':'1',
		})

		setTimeout(doCrush,150);
		timer = setTimeout(doUnstamp,1500);
	}

	let countSquish = 0;

	function doCrush(){

		for(var m in meeps){
			if(meeps[m].isActive){
				
				let isInHole = cohort.levels[nStamp].isInHole(meeps[m].x,meeps[m].y);

				if(!meeps[m].isDead && !isInHole){
					meeps[m].$el.hide();
					meeps[m].isDead = true;
					audio.play('squish',true);

					countSquish++;
					
				} else {
					meeps[m].addScore( 1 );
				}
			}
		}

		let countAlive = 0;
		for(var m in meeps) if(!meeps[m].isDead && meeps[m].isActive) countAlive++;

		if(!isTutorial && countAlive==0){

			audio.play('incorrect');
			for(var m in meeps) if(!meeps[m].isDead && meeps[m].isActive) meeps[m].addScore( STAMPS.length-nStamp-1 );

			clearTimeout(timer);
			setTimeout( function(){ doUnstamp(false) }, 1000 );
			$stamper.stop(false);

			setTimeout( finiCohort, 3000 );
		} else {
			audio.play('correct');
		}

		hud.updatePlayers(meeps);
	}

	function finiGame(){
		audio.stop('music');

		let scores = [];
		for(var m in meeps){
			meeps[m].isActive = false;
			meeps[m].$el.hide();
			scores[m] = meeps[m].score;
		}

		let rewards = scoresToRewards(scores);
		hud.showFinalScores(scores,rewards);

		setTimeout(function(){
			clearInterval(interval);
			window.doPartyGameComplete(rewards);
		},5000);
	}

	function doUnstamp( doNextStamp=true ) {
		audio.play('woosh-long',true);

		$stamper.css({
			'transform':'translateZ('+H+'px)',
		})

		$shadow.css({
			'opacity':'0',
		})

		if(isTutorial) setTimeout(function(){
			for(var m in meeps){
				meeps[m].$el.show();
				meeps[m].isDead = false;
				meeps[m].isActive = true;
			}
		},100);

		if( doNextStamp ) setTimeout(doNewStamp,1000);
	}

	let interval = setInterval(step,1000/FPS);

	self.setPlayers = function(p){
		for(var m in meeps){
			meeps[m].x = p[m].x*(W/2);
			meeps[m].y = -p[m].z*(W/2);
		}
	}

	self.fini = function(){
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	}
}