Meep = function(color){

	let self = this;

	let c = {

		h:300,
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
		color:color?color:'red',
		r:0,
		zHand:100,
	}

	self.c = c;

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
				'fill':'none',
			},

			'meep .meep-eye, meep .meep-mouth':{
				'stroke':'transparent',
				'fill':'rgba(0,0,0,0.5)',
			},

			'meep .meep-arm, meep .meep-leg, meep .meep-thumb':{
				'stroke':'white',
			},

			'.meep-headband':{
				
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

		let yEye = -c.h+c.hHead/2; // 1/2 mark
		let yMouth = -c.h+c.hHead/3*2;	// 2/3 mark
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
		function rotateAround(cx,cy,dx,dy,r){

			// where cx cy is the centre (cx is generally zero)
			// and dx dy is a point on this disc of rotation
			// and the plane of rotation is disc parallel to the ground

			let dist = Math.sqrt(dx*dx+dy*dy);
			let rStart = Math.atan2(dy,dx);
			let rEnd = rStart + r;

			return {
				x: cx + Math.cos(rEnd) * dist,
				y: cy + Math.sin(rEnd) * (dist*plane),
			}
		}

		function makeSymmetrical(cx,cy,dx,dy,r){
			return {
				left:rotateAround(cx,cy,-dx,dy,r),
				right:rotateAround(cx,cy,dx,dy,r),
			}
		}

		let shoulder = makeSymmetrical(0,yShoulder,c.wBody/2,0,c.r);

		let oxHand = c.wBody/2+20;
		let oxElbow = oxHand*1.5;
		
		

		let elbow = {
			left: rotateAround(0,yShoulder+hArmLeft/2,-oxElbow,c.zHandLeft-50,c.r),
			right: rotateAround(0,yShoulder+hArmRight/2,oxElbow,c.zHandRight-50,c.r),
		}

		
		let hand = {
			left: rotateAround(0,yShoulder+hArmLeft,-oxHand,c.zHandLeft,c.r),
			right: rotateAround(0,yShoulder+hArmRight,oxHand,c.zHandRight,c.r),
		}

		let hip = makeSymmetrical(0,yHip,c.wBody/4,0,c.r);

		let knee = {
			left: rotateAround(0,yKneeLeft,-oxKnee,50,c.r),
			right: rotateAround(0,yKneeRight,oxKnee,50,c.r),
		}

		let foot = {
			left: rotateAround(0,c.yFootLeft,-oxHip,0,c.r),
			right: rotateAround(0,c.yFootRight,oxHip,0,c.r),
		}

		let xEye = Math.cos(Math.PI/3)*(c.wHead/2);
		let zEye = Math.sin(Math.PI/3)*(c.wHead/2); // the depth of the face (a little less than the radius of the head)

		let eye = {
			left: rotateAround(0,yEye,-xEye,zEye,c.r),
			right: rotateAround(0,yEye,xEye,zEye,c.r),
		}

		

		eye.left.rx = rotateAround(0,yEye,-xEye+c.rEye,zEye,c.r).x - eye.left.x;
		eye.right.rx = rotateAround(0,yEye,xEye+c.rEye,zEye,c.r).x - eye.right.x;

		if(eye.left.rx<0) eye.left.rx = 0;
		if(eye.right.rx<0) eye.right.rx = 0;

		let mouth = rotateAround(0,yMouth,0,zEye,c.r);
		mouth.rx = rotateAround(0,yMouth,c.wMouth/2,zEye,c.r).x - mouth.x;

		if(mouth.rx<0) mouth.rx = 0;

		self.$el.html(
			`
			<meep-shadow style='width:${c.wHead}px;height:${c.wHead/4}px;'></meep-shadow>
			<svg width=500 height=1100 viewBox='-250 -1050 500 1100'>

				
				<path class='meep-neck' stroke-width=${wNeck} d='M0,${yBody} L0,${yBody}'/>
				
				<rect class='meep-head' width=${c.wHead} height=${c.hHead} x=${-c.wHead/2} y=${-c.h} rx=${rHead} />
				<rect class='meep-body' width=${c.wBody} height=${c.hBody} x=${-c.wBody/2} y=${yBody} rx=${rBody} />

				<path class='meep-arm' stroke-width=${c.wArm} d='M${shoulder.left.x},${shoulder.left.y} Q${elbow.left.x},${elbow.left.y} ${hand.left.x},${hand.left.y}'/>
				<path class='meep-arm' stroke-width=${c.wArm} d='M${shoulder.right.x},${shoulder.right.y} Q${elbow.right.x},${elbow.right.y} ${hand.right.x},${hand.right.y}'/>

				<path class='meep-thumb' stroke-width=${c.wArm/2} d='M${hand.left.x},${hand.left.y} l0,-7'/>
				<path class='meep-thumb' stroke-width=${c.wArm/2} d='M${hand.right.x},${hand.right.y} l0,-7'/>

				<path class='meep-leg' stroke-width=${c.wLeg} d='M${hip.left.x},${hip.left.y} Q${knee.left.x},${knee.left.y} ${foot.left.x},${foot.left.y-c.wFoot/2}'/>
				<path class='meep-leg' stroke-width=${c.wLeg} d='M${hip.right.x},${hip.right.y} Q${knee.right.x},${knee.right.y} ${foot.right.x},${foot.right.y-c.wFoot/2}'/>

				<ellipse class='meep-eye' cx=${eye.left.x} cy=${eye.left.y} rx=${eye.left.rx} ry=${c.rEye} />
				<ellipse class='meep-eye' cx=${eye.right.x} cy=${eye.right.y} rx=${eye.right.rx} ry=${c.rEye} />
				<path class='meep-mouth' d="M${mouth.x-mouth.rx},${mouth.y} q0,${c.wMouth/2} ${mouth.rx},${c.wMouth/2} q${mouth.rx},0 ${mouth.rx},${-c.wMouth/2}" />

				<path class='meep-shoe' d="M${foot.left.x-c.wFoot/2},${foot.left.y} a1,1 0 0,1 ${c.wFoot},0 q${-c.wFoot/2},5 ${-c.wFoot},0" />
				<path class='meep-shoe' d="M${foot.right.x-c.wFoot/2},${foot.right.y} a1,1 0 0,1 ${c.wFoot},0 q${-c.wFoot/2},5 ${-c.wFoot},0" />

				<path class='meep-headband' stroke=${c.color} stroke-width=${c.wHeadband} d='M${-c.wHead/2},${yHeadband} Q0,${yHeadband+5} ${c.wHead/2},${yHeadband}' />
			</svg>`);
	}

	//<path class='meep-neck' stroke-width=${c.wBody/2} d='M0,${yHead+c.hHead/2} L0,${yBody}'/>
	//<path class='meep-head' stroke-width=${c.wHead} d='M0,${yHead} l0,${c.hHead-c.wHead}'/>
	//<path class='meep-body' stroke-width=${c.wBody} d='M0,${yBody} l0,${c.hBody-c.wBody}'/>

	self.redraw();

	let anim = 
	[
		{yFootLeft:0,yFootRight:0,h:340,zHandLeft:50,zHandRight:-50},
		{yFootLeft:0,yFootRight:-20,h:350,zHandLeft:0,zHandRight:0},
		{yFootLeft:0,yFootRight:0,h:340,zHandLeft:-50,zHandRight:50},
		{yFootLeft:-20,yFootRight:0,h:350,zHandLeft:0,zHandRight:0},
		{yFootLeft:0,yFootRight:0,h:340,zHandLeft:50,zHandRight:-50},
	];

	let fps = 50;
	let animTime = 1;
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