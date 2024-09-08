Meep = function(){

	let self = this;

	let c = self.c = {

		h:500,
		hHead:140,
		wHead:100,
		wArm:10,
		wLeg:10,
		wHeadband:20,
		wMouth:20,
		wFoot:20,
		wBody:50,
		hBody:100,
		rEye:8,
		yFootLeft:0,
		yFootRight:0,
	}

	if(!Meep.didInit){

		Meep.didInit = true;
		
		let css = {

			'meep':{
				display:'block',
				position:'absolute',
				width:'0x',
				height:'0px',
			},

			'meep svg':{
				'position':'absolute',
				'bottom':'0px',
				'left':'-250px',
			},

			'meep-shadow':{
				'display':'block',
				'width':c.wHead+'px',
				'height':c.wHead/4+'px',
				'border-radius':'50%',
				'position':'absolute',
				'bottom':'0px',
				'left':'0px',
				'transform':'translate(-50%, 50%)',
				'background':'rgba(0,0,0,0.2)',
			},

			'meep path':{
				'stroke-linecap':'round',
				'stroke':'white',
				'fill':'none',
			},

			'meep .meep-eye, meep .meep-mouth':{
				'stroke':'transparent',
				'fill':'rgba(0,0,0,0.5)',
			},

			'.meep-headband':{
				'stroke':'red',
				'stroke-linecap':'butt',
			},

			'.meep-shoe':{
				'stroke':'transparent',
				'fill':'white',
			}
		}

		$("head").append('<style>'+Css.of(css)+'</style>');

	}

	
	self.$el = $(`<meep></meep>`);

	self.redraw = function(){

		let yHead = -c.h+c.wHead/2;
		let yEye = -c.h+c.hHead/5*3; // 3/5 mark
		let yMouth = -c.h+c.hHead/4*3;	// 3/4 mark
		let yBody = -c.h+c.hHead+c.wBody/2;
		let yLeg = -c.h+c.hHead+c.hBody-c.wBody/2;
		
		let yKneeLeft = (yLeg+c.yFootLeft)/2;
		let yKneeRight = (yLeg+c.yFootRight)/2;

		let kneeOffset = c.wBody/2;
		let legOffset = c.wBody/4;

		let hArmLeft = c.hBody-c.wBody+c.yFootRight;
		let hArmRight = c.hBody-c.wBody+c.yFootLeft;

		self.$el.html(
			`
			<meep-shadow style='width:${c.wHead}px;height:${c.wHead/4}px;'></meep-shadow>
			<svg width=500 height=1000 viewBox='-250 -1000 500 1000'>

				<path class='meep-neck' stroke-width=${c.wBody/2} d='M0,${yHead+c.hHead/2} L0,${yBody}'/>
				<path class='meep-head' stroke-width=${c.wHead} d='M0,${yHead} l0,${c.hHead-c.wHead}'/>
				<path class='meep-body' stroke-width=${c.wBody} d='M0,${yBody} l0,${c.hBody-c.wBody}'/>

				<path class='meep-arm' stroke-width=${c.wArm} d='M${-c.wBody/2},${yBody} q-100,${hArmLeft/2} -10,${hArmLeft}'/>
				<path class='meep-arm' stroke-width=${c.wArm} d='M${c.wBody/2},${yBody} q100,${hArmRight/2} 10,${hArmRight}'/>

				<path class='meep-thumb' stroke-width=${c.wArm/2} d='M${-c.wBody/2-15},${yBody+hArmLeft} l5,${-c.wArm*0.7}'/>
				<path class='meep-thumb' stroke-width=${c.wArm/2} d='M${c.wBody/2+15},${yBody+hArmRight} l-5,${-c.wArm*0.7}'/>

				<path class='meep-leg' stroke-width=${c.wLeg} d='M${-legOffset},${yLeg} Q${-kneeOffset},${yKneeLeft} ${-legOffset},${c.yFootLeft-c.wLeg/2}'/>
				<path class='meep-leg' stroke-width=${c.wLeg} d='M${legOffset},${yLeg} Q${kneeOffset},${yKneeRight} ${legOffset},${c.yFootRight-c.wLeg/2}'/>

				<circle class='meep-eye' cx=${-c.wHead/4} cy=${yEye} r=${c.rEye} />
				<circle class='meep-eye' cx=${c.wHead/4} cy=${yEye} r=${c.rEye} />
				<path class='meep-mouth' d="M${-c.wMouth/2},${yMouth} a1,1 0 0,0 ${c.wMouth},0" />

				<path class='meep-shoe' d="M${-legOffset},${c.yFootLeft} a1,1 0 0,0 ${-c.wFoot},0" />
				<path class='meep-shoe' d="M${legOffset},${c.yFootRight} a1,1 0 0,1 ${c.wFoot},0" />

				<path class='meep-headband' stroke-width=${c.wHeadband} d='M${-c.wHead/2},${yHead-c.wHeadband/4} l${c.wHead},0' />
			</svg>`);
	}



	self.redraw();

	let anim = 
	[
		{yFootLeft:0,yFootRight:0,h:390},
		{yFootLeft:0,yFootRight:-20,h:400},
		{yFootLeft:0,yFootRight:0,h:390},
		{yFootLeft:-20,yFootRight:0,h:400},
		{yFootLeft:0,yFootRight:0,h:390},
	];

	let fps = 50;
	let animTime = 0.5;
	let timeStart = new Date().getTime();

	function tick(){
		let timeNow = new Date().getTime();
		let timeElapsed = ((timeNow-timeStart)/1000)%animTime;

		let progressOverall = timeElapsed/animTime;

		let iBefore = Math.floor((anim.length-1)*progressOverall);
		let iAfter = Math.ceil((anim.length-1)*progressOverall);
		
		let timePerStep = animTime / (anim.length-1);

		let progress = (timeElapsed%timePerStep)/timePerStep;

		

		for(var p in anim[iBefore]){
			c[p] = anim[iBefore][p] + (anim[iAfter][p] -  anim[iBefore][p])*progress;
		}

		self.redraw();
	}

	setInterval(tick,1000/fps);



}