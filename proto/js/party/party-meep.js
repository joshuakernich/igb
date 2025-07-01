window.PartyMeep = function(n){

	const W = 100;
	const H = 350;

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
					width: ${W*0.5}px;
					height: ${W*0.5}px;
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
					height: 150px;
					background: white;
					border-radius: ${W/2}px;
					text-align: center;
					position: relative;
					left: ${-W/2}px;
					padding-top: 30px;
					width: 100px;
					box-sizing: border-box;
					line-height: 0px;
					transform-origin: bottom center;
				}

				partymeephat{
					display: block;
					background: red;
					height: 20px;
					border-radius: 5px;
				}

				partymeepbody{
					display: block;
					height: 100px;
					background: white;
					margin: 0px 15px;
					border-radius: ${W/4}px;
					left: ${-W/2}px;
					position: relative;
				}

				partymeeplegs{
					display:block;
					margin: 0px 25px;
					box-sizing: border-box;
					border-left: 15px solid white;
					border-right: 15px solid white;
					height: calc( 100% - 250px );
					left: ${-W/2}px;
					position: relative;
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
	self.score = 0;
	self.$el = $(`
		<partymeep n=${n}>
			<partymeepshadow></partymeepshadow>
			<partymeepavatar>
				<partymeephead>
					<partymeephat></partymeephat>
					<partymeepeye></partymeepeye>
					<partymeepeye></partymeepeye><br>
					<partymeepmouth></partymeepmouth>
				</partymeephead>
				<partymeepbody></partymeepbody>
				<partymeeplegs></partymeeplegs>
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

	self.setHeight = function(h){
		self.$el.find('partymeepavatar').height(h);
	}

}