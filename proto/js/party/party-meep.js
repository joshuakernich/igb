window.PartyMeep = function(n){



	const W = 100;
	const H = 350;
	const HEAD = {w:W,h:150};
	const BODY = {w:W*0.6,h:100};

	if(!PartyMeep.didInit){
		PartyMeep.didInit = true;

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

				partymeep{
					display:block;
					position: absolute;	
				}

				partymeepshadow{
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

				partymeepavatar{
					display:block;
					position:absolute;
					bottom: 0px;
					width: ${W}px;
					height: ${H}px;
				}

				partymeephand{
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

				partymeephand:last-of-type{
					left: ${W*0.7}px;
				}

				partymeephead{
					display: block;
					height: ${HEAD.h}px;
					background: white;
					border-radius: ${W/2}px;
					text-align: center;
					position: relative;
					left: ${-W/2}px;
					padding-top: 30px;
					width: ${HEAD.w}px;
					box-sizing: border-box;
					line-height: 0px;
					transform-origin: bottom center;

					position: absolute;
					top: 0px;
					font-size: 50px;
					box-shadow: 0px 10px 10px rgba(0,0,0,0.2);
				}

				partymeephat{
					display: block;
					background: gray;
					height: 20px;
					border-radius: 5px;
				}

				partymeepbody:before{
					content:"";
					position: absolute;
					display: block;
					left: 30%;
					top: -10px;
					height: 20px;
					background: white;
					width: 40%;
				}

				partymeepbody{
					display: block;
					position: absolute;
					background: white;
					height: ${BODY.h}px;
					width: ${BODY.w}px;
					left: ${-BODY.w/2}px;
					top: ${HEAD.h}px;
					border-radius: ${BODY.w/2}px;
				}

				partymeeplegs{
					display:block;
					position: absolute;
					box-sizing: border-box;
					height: calc( 100% - ${HEAD.h+BODY.h}px );
					top: ${HEAD.h+BODY.h}px;
					transform: translate(-50%);
					transform-origin: top center;
				}	

				partymeepleg{
					
					position: absolute;
					
					width: 100%;
					top: -20px;
					bottom: -20px;
					border-radius: 100%;

					border: 15px solid white;
					box-sizing: border-box;
				}

				partymeepleg:first-of-type{
					right: 0px;
					clip-path: inset(0px 20px 20px 0px);
					border-radius: 50% 0px 0px 50%;
				}

				partymeepleg:last-of-type{
					left: 0px;
					clip-path: inset(0px 0px 20px 20px);
					border-radius: 0px 50% 50% 0px;
				}

				partymeepfoot{
					width: 20px;
					height: 10px;
					bottom: 0px;
					display: block;
					position: absolute;
					background: white;
					border-radius: 100% 100% 0px 0px;

				}

				partymeepfoot:first-of-type{
					left: 0px;
					transform-origin: bottom right;
				}

				partymeepfoot:last-of-type{	
					right: 0px;
					transform-origin: bottom left;
				}

				partymeepeye{
					display: inline-block;
					width: 12px;
					height: 20px;
					border-radius: 6px;
					background: gray;
					margin:25px 15px 0px;
				}

				partymeepmouth{
					display: inline-block;
					width: 20px;
					height: 10px;
					border-radius: 0px 0px 50% 50%;
					background: gray;
					margin-top: 5px;
				}

				partymeephead[n='0'] partymeephat{ background: red; }
				partymeep[n='0'] partymeephat{ background: red; }
				partymeep[n='0'] partymeephat:after{ background: red; }
				partyplayerhud[n='0'] partyscore{ background: red; }
				partyplayerhud[n='0'] partymeephat{ background: red; }

				partymeephead[n='1'] partymeephat{ background: blue; }
				partymeep[n='1'] partymeephat{ background: blue; }
				partymeep[n='1'] partymeephat:after{ background: blue; }
				partyplayerhud[n='1'] partyscore{ background: blue; }
				partyplayerhud[n='1'] partymeephat{ background: blue; }

				partymeephead[n='2'] partymeephat{ background: limegreen; }
				partymeep[n='2'] partymeephat{ background: limegreen; }
				partymeep[n='2'] partymeephat:after{ background: limegreen; }
				partyplayerhud[n='2'] partyscore{ background: limegreen; }
				partyplayerhud[n='2'] partymeephat{ background: limegreen; }

				partymeephead[n='3'] partymeephat{ background: #dd00ff; }
				partymeep[n='3'] partymeephat{ background: #dd00ff; }
				partymeep[n='3'] partymeephat:after{ background: #dd00ff; }
				partyplayerhud[n='3'] partyscore{ background: #dd00ff; }
				partyplayerhud[n='3'] partymeephat{ background: #dd00ff; }

				partymeephead[n='4'] partymeephat{ background: #ff6600; }
				partymeep[n='4'] partymeephat{ background: #ff6600; }
				partymeep[n='4'] partymeephat:after{ background: #ff6600; }
				partyplayerhud[n='4'] partyscore{ background: #ff6600; }
				partyplayerhud[n='4'] partymeephat{ background: #ff6600; }

				partymeephead[n='5'] partymeephat{ background: #ffbb00; }
				partymeep[n='5'] partymeephat{ background: #ffbb00; }
				partymeep[n='5'] partymeephat:after{ background: #ffbb00; }
				partyplayerhud[n='5'] partyscore{ background: #ffbb00; }
				partyplayerhud[n='5'] partymeephat{ background: #ffbb00; }
			</style>`);
	}

	let self = this;
	self.n = n;
	self.score = 0;
	self.$el = $(`
		<partymeep n=${n}>

			<partymeepshadow></partymeepshadow>
			<partymeepavatar>
				<partymeepbody></partymeepbody>
				<partymeephead>
					<partymeephat></partymeephat>
					<partymeepeye></partymeepeye>
					<partymeepeye></partymeepeye><br>
					<partymeepmouth></partymeepmouth>
				</partymeephead>
				
				<partymeeplegs>
					<partymeepleg></partymeepleg>
					<partymeepleg></partymeepleg>

					<partymeepfoot></partymeepfoot>
					<partymeepfoot></partymeepfoot>
				</partymeeplegs>
				<partymeephand></partymeephand>
				<partymeephand></partymeephand>
			</partymeepavatar>
		</partymeep>
	`);

	self.$head = self.$el.find('partymeephead');
	self.$handLeft = self.$el.find('partymeephand').first();
	self.$handRight = self.$el.find('partymeephand').last();
	self.$shadow = self.$el.find('partymeepshadow');
	self.$body = self.$el.find('partymeepbody');
	self.$legs = self.$el.find('partymeeplegs');
	self.$legLeft = self.$el.find('partymeepleg').first();
	self.$legRight = self.$el.find('partymeepleg').last();
	self.$footLeft = self.$el.find('partymeepfoot').first();
	self.$footRight = self.$el.find('partymeepfoot').last();

	self.setHeight = function(h){
		self.$el.find('partymeepavatar').height(h);

		let scale = Math.max(0,Math.min(1,H/h));
		self.$legs.css({width:30 + (70*scale) + '%'})
		let round = 50 * scale + '%';
		self.$legLeft.css({'border-radius':`${round} 0px 0px ${round}`});
		self.$legRight.css({'border-radius':`0px ${round} ${round} 0px`});
	}

	self.setHeight(H);

	self.toSkydiver = function(){
		self.$head.css({
			'transform':'rotate(-10deg) translate(20px)',
		})

		self.$body.css({
			top:'80px',
			'transform':'rotate(15deg) translate(10px)',
		})

		self.$legs.css({
			top: '180px',
			height: '50px',
			'transform':'translate(-55%) rotate(15deg)',
		})

		self.$footLeft.css({
			'transform':'rotate(-25deg)',
		})

		self.$footRight.css({
			'transform':'rotate(25deg)',
		})

		self.$handLeft.css({
			'left':'-100px',
			'top':'150px',
		})

		self.$handRight.css({
			'left':'100px',
			'top':'150px',
		})
	}

	self.toFlyer = function(){
		self.$handLeft.css({
			'left':'-20px',
			'top':'-20px',
		})

		self.$handRight.css({
			'left':'90px',
			'top':'170px',
		})

		self.$head.css({
			'transform':'rotate(10deg) translate(20px)',
		})

		self.$body.css({
			height:'80px',
			top: '130px',
		})

		self.$legs.css({
			top:'215px',
			height: '50px',
			'transform':'translate(-40%) rotate(-15deg)',
		})

	}

}