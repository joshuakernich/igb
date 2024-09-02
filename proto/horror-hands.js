

HorrorHands = function(){

	let css = {
		'horrohands':{
			display:'block',
			position:'absolute',
			top:'0px',
			bottom: '0px',
			left: '0px',
			right: '0px',
			bottom: '0px',
			background: 'white',
		},

		'layer':{
			display:'block',
			position:'absolute',
			top:'0px',
			bottom: '0px',
			left: '0px',
			right: '0px',
			bottom: '0px',
			'backdrop-filter':'blur(5px)',
		},

		'man':{
			display:'block',
			position:'absolute',
			
			top: '0px',
			bottom: '0px',
			
			width: '15vw',

			'background-image':'url(./proto/walk-animated.gif)',
			'background-size':'100%',
			'background-repeat':'no-repeat',
			'background-position-y':'bottom',
			'transform':'scaleX(0.5)',

		},

		'layer:nth-of-type(even)':{
			'transform':'scaleX(-1)'
		}

	}

	console.log(Css.of(css));

	$("head").append('<style>'+Css.of(css)+'</style>');


	let self = this;
	self.$el = $(`<horrohands>`);

	for(var i=0; i<5; i++){
		let $l = $('<layer>').appendTo(self.$el);
		$('<man>').appendTo($l).css({'left':'100vw'}).animate({'left':'-15vw'},{duration:10000+i*1000,easing:'linear'});
	}

	for(var i=0; i<5; i++) $('<layer>').appendTo(self.$el);

}