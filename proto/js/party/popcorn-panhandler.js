window.PopcornGame = function(){
	const W = 1600;
	const H = 1000;
	const FPS = 50;

	const PopcornMeep = function(){
		let self = this;
		self.$el = $('<popcornmeep>');
	}

	if( !PopcornGame.init ){
		PopcornGame.init = true;

		$("head").append(`
			<style>
				popcorngame{
					display:block;
					width: ${W*3}px;
					height: ${H}px;
					transform-origin: top left;
					background-image: url(./proto/img/party/bg-beach.avif);
					background-size: 33.3% 100%;
					background-position: bottom center;
				}
			</style>
		`)
	}

	let self = this;
	self.$el = $('<igb>');

	let $game = $('<popcorngame>').appendTo(self.$el);
}