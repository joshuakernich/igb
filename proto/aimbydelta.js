window.AimByDelta = function(){

	class Css {
	  static of (json) {
	    const selectors = Object.keys(json)
	    return selectors.map((selector) => {
	      const definition = json[selector]
	      const rules = Object.keys(definition)
	      const result = rules.map((rule) => {
	        return `${rule}:${definition[rule]}`
	      }).join(';')
	      return `${selector}{${result}}`
	    }).join('\n')
	  }
	}

	let self = this;
	self.$el = $('<igb>')

	let css = {
		'delta':{
			display:'block',
			position:'relative',
		},

		'delta:after':{
			content:'""',
			display:'block',
			width:'1vw',
			height:'1vw',
			background:'red',
			position: 'absolute',
			left: '-0.5vw',
			top: '-0.5vw',
		}
		
	}

	$("head").append('<style>'+Css.of(css)+'</style>');

	for(var i=0; i<6; i++){
		$('<delta>').appendTo(self.$el);
	}

	self.setPlayers = function(players){
		for(var p in players){
			$('delta').eq(p).css({s})
		}
	}
}