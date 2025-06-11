
let W = 1728;
let H = 1080;
let css = {
	'floorislava':{
		display:'block',
		position:'relative',
		width:W+'px',
		height:H+'px',
		'transform-origin':'top left',
	},

	'platform':{
		display:'block',
		position:'absolute',
		width:ball.d+'px',
		height:ball.d+'px',
		background:'white',
		left:'0px',
		bottom:'0px',
		transform:'translate(-50%,-50%)',
		'border-radius':ball.d/2+'px',
	},

	'rollingavatar':{
		display:'block',
		position:'absolute',
		width:dude.w+'px',
		height:dude.h+'px',
		background:'white',
		left:'0px',
		
		transform:'translate(-50%,-100%)',
		'border-radius':dude.w/2+'px',
	},
}

$("head").append('<style>'+Css.of(css)+'</style>');


FloorIsLava = function(){
	
}