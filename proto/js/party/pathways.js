window.PathwayRender = function( ){

	const FPS = 50;
	const W = 1600;
	const H = 1000;
	let self = this;

	if( !PathwayRender.init ){
		PathwayRender.init = true;

		$("head").append(`
			<style>
				pathwayrender{
					display: block;
					position: fixed;
					left: 0px;
					top: 0px;
					
					transform-origin: top left;
					background: url(./proto/img/party/bg-village.png);
					background-size: 33.3% 100%;
					white-space: normal;
					line-height: 20px;
					color: white;
					background: black;
					font-family: monospace;
					z-index: 1000;
					background: black;

					width: 100vw;
					height: 100vh;
					overflow: auto;

				}

				pathwaytime{
					width: 30px;
					height: 30px;
					box-sizing: border-box;
					display: inline-block;
					
					
					text-align: center;
				}

				pathwayname{
					display: block;
				}
		`)
	}

	const TIMINGS = {
		'Intro Anim':[105,105,105,105,105,105,105,105,105,105],
		'Name & Avatar':[30,30,45,45,45,60,60,120,120,120],

		'Coconut Climbers':[90,90,110,110,110,120,120,180,195,195],
		'Mystery Maze':[120,120,140,140,140,180,180,300,300,300],
		'Soccer Heads':[240,420,180,185,150,240,420,180,185,150],
		'Volley Heads':[240,420,180,185,150,240,420,180,185,150],
		'Bongo Bounce':[183,183,228,228,228,183,183,228,228,228],
		'Coin Chaos':[110,110,140,160,140,110,110,140,160,140],
		'Find My Meep':[105,105,105,105,105,195,195,195,195,195],
		'Plummet Panic':[250,250,180,210,210,250,250,180,210,210],
		'Milkers':[110,140,160,160,180,110,140,160,160,180],
		'Town Fair':[165,165,165,165,165,165,165,165,165,165],
		'Goal Patrol':[150,330,180,210,240,150,330,180,210,240],
		'Mystery Maze':[120,120,140,140,140,180,180,300,300,300],
		'Stubble Trouble':[120,180,140,160,180,120,180,140,160,180],
		'Popcorn Panhandlers':[180,330,240,285,330,180,330,240,285,330],
		'Melody Match':[120,180,140,180,180,180,420,420,420,420],
		'Final Frenzy':[270,270,360,360,360,270,270,360,360,360],

		'Finale':[60,60,60,60,60,60,60,60,60,60],
		'Outro Anim':[45,45,45,45,45,45,45,45,45,45],
	}
	
	const PATH_30 = [
		['Intro Anim'],
		['Name & Avatar'],
		['Coconut Climbers','Mystery Maze'],
		['Soccer Heads','Volley Heads'],
		['Coin Chaos'],
		['Bongo Bounce','Stubble Trouble'],
		['Find My Meep','Town Fair'],
		['Final Frenzy'],
		['Finale'],
	]

	const ALL_OPTIONS = [
		
		'Coconut Climbers','Mystery Maze',
		'Soccer Heads','Volley Heads',
		'Bongo Bounce','Stubble Trouble',
		'Find My Meep','Town Fair',
		'Milkers','Popcorn Panhandlers','Goal Patrol',
		'Plummet Panic','Melody Match'
	]

	const PATH_60 = [
		['Intro Anim'],
		['Name & Avatar'],
		['Coconut Climbers','Mystery Maze'],
		['Soccer Heads','Volley Heads'],
		['Bongo Bounce','Stubble Trouble'],
		['Find My Meep','Town Fair'],
		['Coin Chaos'],
		['Milkers','Popcorn Panhandlers','Goal Patrol'],
		['Plummet Panic','Melody Match'],
		ALL_OPTIONS,
		ALL_OPTIONS,
		ALL_OPTIONS,
		ALL_OPTIONS,
		['Final Frenzy'],
		['Finale'],
		['Outro Anim'],
	]
	
	self.$el = $('<pathwayrender>').appendTo('body');

	function getAllPaths(locations) {
	  return locations.reduce((acc, boxes) => {
	    const next = [];
	    for (const path of acc) {
	      for (const box of boxes) {
	        next.push([...path, box]);
	      }
	    }
	    return next;
	  }, [[]]);
	}

	function getTime(path){

		let times = [];
		while(times.length<10) times.push(0);

		for(var p in path){
			let id = path[p];
			let map = TIMINGS[id];

			for(var m in map) times[m] += map[m];
		}

		return times;
	}

	const hasDuplicates = arr => new Set(arr).size !== arr.length;

	function generateTimingsForMap(map){
		let pathsRaw = getAllPaths(map);
		let paths = [];

		for(var r in pathsRaw){
			
			if(!hasDuplicates(pathsRaw[r])){
				paths[r] = pathsRaw[r];
			}
		}

		let timings = [];
		for(var p in paths) timings[p] = getTime(paths[p]);
		for(var t in timings){
			$('<pathwayname>').appendTo(self.$el).text(paths[t].join(' - '));
			for(var n in timings[t]){
				if(n==5) $('<br>').appendTo(self.$el);
				$('<pathwaytime>').appendTo(self.$el).text(Math.floor(timings[t][n]/60));
			}
		}
	}

	generateTimingsForMap(PATH_60);
}