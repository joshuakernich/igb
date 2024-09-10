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
		r:0,
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
				'bottom':'-50px',
				'left':'-250px',
			},

			'meep-shadow':{
				'display':'block',
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

			'.meep-shoe, .meep-head, .meep-body':{
				'stroke':'transparent',
				'fill':'white',
			}
		}

		$("head").append('<style>'+Css.of(css)+'</style>');

	}

	
	self.$el = $(`<meep></meep>`);

	self.redraw = function(){

		
		let wNeck = c.wBody/2;

		let yEye = -c.h+c.hHead/5*3; // 3/5 mark
		let yMouth = -c.h+c.hHead/4*3;	// 3/4 mark
		let yBody = -c.h+c.hHead;
		

		let rHead = Math.min(c.wHead/2,c.hHead/2);
		let rBody = Math.min(c.wBody/2,c.hBody/2);

		let yHeadband = -c.h+rHead-c.wHeadband/2;


		let yHip = -c.h+c.hHead+c.hBody-rBody/2;
		let yShoulder = yBody + rBody;
		
		let yKneeLeft = (yHip+c.yFootLeft)/2;
		let yKneeRight = (yHip+c.yFootRight)/2;

		let oxKnee = c.wBody/2;
		let oxHip = c.wBody/4;

		let hArmLeft = c.hBody-rBody*2 + c.yFootRight;
		let hArmRight = c.hBody-rBody*2 + c.yFootLeft;




		
		let plane = 1/4;
		function rotateAround(cx,cy,dist,r){

			return {
				x: cx + Math.cos(r) * dist,
				y: cy + Math.sin(r) * (dist*plane),
			}
		}

		function makeSymmetrical(cx,cy,dist,r){
			return {
				left:rotateAround(cx,cy,dist,r+Math.PI),
				right:rotateAround(cx,cy,dist,r),
			}
		}

		let shoulder = makeSymmetrical(0,yShoulder,c.wBody/2,c.r);

		let oxElbow = c.wBody/2+100;
		let elbow = {
			left: rotateAround(0,yShoulder+hArmLeft/2,oxElbow,c.r+Math.PI),
			right: rotateAround(0,yShoulder+hArmRight/2,oxElbow,c.r),
		}

		let oxHand = c.wBody/2+10;
		let hand = {
			left: rotateAround(0,yShoulder+hArmLeft,oxHand,c.r+Math.PI),
			right: rotateAround(0,yShoulder+hArmRight,oxHand,c.r),
		}

		let hip = makeSymmetrical(0,yHip,c.wBody/4,c.r);

		let knee = {
			left: rotateAround(0,yKneeLeft,oxKnee,c.r+Math.PI),
			right: rotateAround(0,yKneeRight,oxKnee,c.r),
		}

		let foot = {
			left: rotateAround(0,c.yFootLeft,oxHip,c.r+Math.PI),
			right: rotateAround(0,c.yFootRight,oxHip,c.r),
		}

		

		self.$el.html(
			`
			<meep-shadow style='width:${c.wHead}px;height:${c.wHead/4}px;'></meep-shadow>
			<svg width=500 height=1100 viewBox='-250 -1050 500 1100'>

				
				<path class='meep-neck' stroke-width=${wNeck} d='M0,${yBody} L0,${yBody}'/>
				
				<rect class='meep-head' width=${c.wHead} height=${c.hHead} x=${-c.wHead/2} y=${-c.h} rx=${rHead} />
				<rect class='meep-body' width=${c.wBody} height=${c.hBody} x=${-c.wBody/2} y=${yBody} rx=${rBody} />

				<path class='meep-arm' stroke-width=${c.wArm} d='M${shoulder.left.x},${shoulder.left.y} Q${elbow.left.x},${elbow.left.y} ${hand.left.x},${hand.left.y}'/>
				<path class='meep-arm' stroke-width=${c.wArm} d='M${shoulder.right.x},${shoulder.right.y} Q${elbow.right.x},${elbow.right.y} ${hand.right.x},${hand.right.y}'/>

				<path class='meep-thumb' stroke-width=${c.wArm/2} d='M${-c.wBody/2-15},${yShoulder+hArmLeft} l5,${-c.wArm*0.7}'/>
				<path class='meep-thumb' stroke-width=${c.wArm/2} d='M${c.wBody/2+15},${yShoulder+hArmRight} l-5,${-c.wArm*0.7}'/>

				<path class='meep-leg' stroke-width=${c.wLeg} d='M${hip.left.x},${hip.left.y} Q${knee.left.x},${knee.left.y} ${foot.left.x},${foot.left.y-c.wFoot/2}'/>
				<path class='meep-leg' stroke-width=${c.wLeg} d='M${hip.right.x},${hip.right.y} Q${knee.right.x},${knee.right.y} ${foot.right.x},${foot.right.y-c.wFoot/2}'/>

				<circle class='meep-eye' cx=${-c.wHead/4} cy=${yEye} r=${c.rEye} />
				<circle class='meep-eye' cx=${c.wHead/4} cy=${yEye} r=${c.rEye} />
				<path class='meep-mouth' d="M${-c.wMouth/2},${yMouth} a1,1 0 0,0 ${c.wMouth},0" />

				<path class='meep-shoe' d="M${foot.left.x-c.wFoot/2},${foot.left.y} a1,1 0 0,1 ${c.wFoot},0" />
				<path class='meep-shoe' d="M${foot.right.x-c.wFoot/2},${foot.right.y} a1,1 0 0,1 ${c.wFoot},0" />

				<path class='meep-headband' stroke-width=${c.wHeadband} d='M${-c.wHead/2},${yHeadband} Q0,${yHeadband+5} ${c.wHead/2},${yHeadband}' />
			</svg>`);
	}

	//<path class='meep-neck' stroke-width=${c.wBody/2} d='M0,${yHead+c.hHead/2} L0,${yBody}'/>
	//<path class='meep-head' stroke-width=${c.wHead} d='M0,${yHead} l0,${c.hHead-c.wHead}'/>
	//<path class='meep-body' stroke-width=${c.wBody} d='M0,${yBody} l0,${c.hBody-c.wBody}'/>

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