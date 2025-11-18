const PLAYER_COLORS = [
	'red','blue','limegreen','#dd00ff','#ff6600','#ffbb00',
]

$("head").append(`
	<style>
		body{
			--red: red;
			--blue: blue;
			--green: limegreen;
			--pink: #dd00ff;
			--orange: #ff6600;
			--yellow: #ffbb00;

			--n0: var(--red);
			--n1: var(--blue);
			--n2: var(--green);
			--n3: var(--pink);
			--n4: var(--orange);
			--n5: var(--yellow);
		}
	<style>`);

window.LifeMeepHead = function(n) {
	let self = this;
	self.n = n;
	self.$el = $(`
		<partymeephead n=${n}>
			<partymeephat></partymeephat>
			<partymeepeye></partymeepeye>
			<partymeepeye></partymeepeye><br>
			<partymeepmouth></partymeepmouth>
		</partymeephead>
	`);

	if(!LifeMeep.didInit) new LifeMeep();
}

window.LifeMeep = function(n){

	const W = 100;
	const H = 350;
	const HEAD = {w:W,h:150};
	const BODY = {w:60,h:60};

	if(!LifeMeep.didInit){
		LifeMeep.didInit = true;

		$("head").append(`
			<style>
				lifemeep{
					display:block;
					position: absolute;	
				}

				

				lifemeepshadow{
					display:block;
					position:absolute;
					width: ${W*1.5}px;
					height: ${W/3}px;
					bottom: ${-W/6}px;
					left: ${-W/2*1.5}px;
					background: black;
					border-radius: 50%;
					opacity: 0.5;
				}

				lifemeepavatar{
					display:block;
					position:absolute;
					bottom: 0px;
					width: ${W}px;
					height: ${H}px;
				}

				lifemeephand{
					display:block;
					width: ${W*0.4}px;
					height: ${W*0.4}px;
					transform: translate(-50%, -50%);
					background: white;
					border-radius: ${W*0.25}px;
					top: 60%;
					position: absolute;
					left: ${-W*0.7}px;
					z-index: 1;
				}

				lifemeephand:last-of-type{
					left: ${W*0.7}px;
				}

				lifemeephead{
					display: block;
					height: ${HEAD.h}px;
					
					border-radius: ${W/2}px;
					text-align: center;
					position: relative;
					left: ${-W/2-7}px;
					padding-top: 30px;
					width: ${W+14}px;
					box-sizing: border-box;
					line-height: 0px;
					transform-origin: bottom center;
					position: absolute;
					top: 0px;
					font-size: 50px;
					
					background-image: url(./proto/img/party/life-head.png);
					background-size: 100%;
				}

				lifemeephat{
					display: block;
					background: gray;
					height: 20px;
					border-radius: 5px;
					display: none;
				}

				lifemeepbody:before{
					content:"";
					position: absolute;
					display: block;
					left: 30%;
					top: -10px;
					height: 20px;
					background: white;
					width: 40%;
				}

				lifemeepbody{
					display: block;
					position: absolute;
					background: white;
					height: ${BODY.h}px;
					width: ${BODY.w}px;
					left: ${-BODY.w/2}px;
					top: ${HEAD.h}px;
					border-radius: ${BODY.w/2}px;
				}

				lifemeepaccessory{
					display: block;
					position: absolute;
					inset: -50%;
					background-size: 100%;
				}

				lifemeeplegs{
					display:block;
					position: absolute;
					box-sizing: border-box;
					height: calc( 100% - ${HEAD.h+BODY.h}px );
					top: ${HEAD.h+BODY.h}px;
					transform: translate(-50%);
					transform-origin: top center;
				}	

				lifemeepleg{
					
					position: absolute;
					
					width: 100%;
					top: -20px;
					bottom: -20px;
					border-radius: 100%;

					border: 15px solid white;
					box-sizing: border-box;
				}

				lifemeepleg:first-of-type{
					right: 0px;
					clip-path: inset(0px 20px 20px 0px);
					border-radius: 50% 0px 0px 50%;
				}

				lifemeepleg:last-of-type{
					left: 0px;
					clip-path: inset(0px 0px 20px 20px);
					border-radius: 0px 50% 50% 0px;
				}

				lifemeepfoot{
					width: 20px;
					height: 10px;
					bottom: 0px;
					display: block;
					position: absolute;
					background: white;
					border-radius: 100% 100% 0px 0px;

				}

				lifemeepfoot:first-of-type{
					left: 0px;
					transform-origin: bottom right;
				}

				lifemeepfoot:last-of-type{	
					right: 0px;
					transform-origin: bottom left;
				}

				lifemeepeye{
					display: inline-block;
					width: 0px;
					height: 0px;
					background: gray;
					margin:35px 20px 20px;
				}

				lifemeepeye:after{
					content:"";
					display: block;
					width: 40px;
					height: 20px;
					border-radius: 100px;
					transform: translate(-50%, -50%);
					background: red;
					background: url(./proto/img/party/texture-eye.jpg);
					background-size: 50px;
					background-position: center;
					border-top: 2px solid #333;
				}

				lifemeepmouth{
					display: inline-block;
					width: 20px;
					height: 10px;
					border-radius: 0px 0px 100% 100%;
					background: gray;
					margin-top: 25px;
				}

				lifemeephead[n='0'] lifemeephat{ background: red; }
				lifemeep[n='0'] lifemeephat{ background: red; }
				lifemeep[n='0'] lifemeephat:after{ background: red; }
				lifeplayerhud[n='0'] lifemeephat{ background: red; }

				lifemeephead[n='1'] lifemeephat{ background: blue; }
				lifemeep[n='1'] lifemeephat{ background: blue; }
				lifemeep[n='1'] lifemeephat:after{ background: blue; }
				lifeplayerhud[n='1'] lifemeephat{ background: blue; }

				lifemeephead[n='2'] lifemeephat{ background: limegreen; }
				lifemeep[n='2'] lifemeephat{ background: limegreen; }
				lifemeep[n='2'] lifemeephat:after{ background: limegreen; }
				lifeplayerhud[n='2'] lifemeephat{ background: limegreen; }

				lifemeephead[n='3'] lifemeephat{ background: #dd00ff; }
				lifemeep[n='3'] lifemeephat{ background: #dd00ff; }
				lifemeep[n='3'] lifemeephat:after{ background: #dd00ff; }
				lifeplayerhud[n='3'] lifemeephat{ background: #dd00ff; }

				lifemeephead[n='4'] lifemeephat{ background: #ff6600; }
				lifemeep[n='4'] lifemeephat{ background: #ff6600; }
				lifemeep[n='4'] lifemeephat:after{ background: #ff6600; }
				lifeplayerhud[n='4'] lifemeephat{ background: #ff6600; }

				lifemeephead[n='5'] lifemeephat{ background: #ffbb00; }
				lifemeep[n='5'] lifemeephat{ background: #ffbb00; }
				lifemeep[n='5'] lifemeephat:after{ background: #ffbb00; }
				lifeplayerhud[n='5'] lifemeephat{ background: #ffbb00; }
			</style>`);
	}

	let self = this;
	self.n = n;
	self.score = 0;
	self.$el = $(`
		<lifemeep n=${n}>

			<lifemeepshadow></lifemeepshadow>
			<lifemeepavatar>
				<lifemeeplegs>
					<lifemeepleg></lifemeepleg>
					<lifemeepleg></lifemeepleg>
					<lifemeepfoot></lifemeepfoot>
					<lifemeepfoot></lifemeepfoot>
				</lifemeeplegs>
				<lifemeepbody>
					<lifemeepaccessory></lifemeepaccessory>
				</lifemeepbody>
				<lifemeephead>
					<lifemeephat></lifemeephat>
					<lifemeepeye></lifemeepeye>
					<lifemeepeye></lifemeepeye><br>
					<lifemeepmouth></lifemeepmouth>
				</lifemeephead>
				<lifemeephand></lifemeephand>
				<lifemeephand></lifemeephand>

			</lifemeepavatar>
		</lifemeep>
	`);

	self.$head = self.$el.find('lifemeephead');
	self.$handLeft = self.$el.find('lifemeephand').first();
	self.$handRight = self.$el.find('lifemeephand').last();
	self.$shadow = self.$el.find('lifemeepshadow');
	self.$body = self.$el.find('lifemeepbody');
	self.$accessory = self.$el.find('lifemeepaccessory');
	self.$legs = self.$el.find('lifemeeplegs');
	self.$legLeft = self.$el.find('lifemeepleg').first();
	self.$legRight = self.$el.find('lifemeepleg').last();
	self.$footLeft = self.$el.find('lifemeepfoot').first();
	self.$footRight = self.$el.find('lifemeepfoot').last();

	self.setHeight = function(h){

		self.h = h;

		self.$el.find('lifemeepavatar').height(h);

		let scale = Math.max(0,Math.min(1,H/h));
		self.$legs.css({width:30 + (70*scale) + '%'})
		let round = 50 * scale + '%';
		self.$legLeft.css({'border-radius':`${round} 0px 0px ${round}`});
		self.$legRight.css({'border-radius':`0px ${round} ${round} 0px`});
	}

	self.setHeight(H);

	

}