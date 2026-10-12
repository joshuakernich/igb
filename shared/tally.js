/*
 * Tally — the coin standings table on the front wall (Box Party, finale).
 *
 *   const tally = new Tally(players);   // players: [{ name, score }, ...]
 *   tally.$el.appendTo(stage.$ui);
 *   tally.showRows();
 *   tally.showResults([10, 6, 2]);      // slide in this round's coins
 *   tally.resolveResults();             // add them up and re-rank
 *
 * Styled by shared/tally.css. Results are added to players[i].score by the
 * caller before resolveResults() redraws.
 */
window.Tally = function (players) {

	const audio = new AudioPlayer();
	audio.add('woosh', 'assets/shared/sfx-woosh.mp3', 0.1);
	audio.add('coin', 'assets/shared/sfx-coin.mp3', 0.3);

	const self = this;
	self.$el = $('<tally-modal>');
	const $table = $('<tally-table>').appendTo(self.$el);

	self.rerank = function () {
		for (const p of players) {
			p.rank = 0;
			for (const q of players) if (q.score > p.score) p.rank++;
		}
	};

	const rows = players.map(function (player, i) {
		const row = new Tally.Row(i, player);
		row.$el.appendTo($table).css({ left: 0, top: 100 * i });
		return row;
	});

	self.showRow = function (r) {
		audio.play('woosh', true);
		rows[r].$el.animate({ left: 0, opacity: 1 });
	};

	self.hideRow = function (r) {
		audio.play('woosh', true);
		rows[r].$el.animate({ left: -800, opacity: 0.5 });
	};

	self.redraw = function () {
		for (const row of rows) row.redraw();
	};

	self.hideRows = function () {
		rows.forEach(function (row, r) {
			row.$el.delay(r * 100).animate({ left: -800, opacity: 0.5 }, { start: function () { audio.play('woosh', true); } });
		});
	};

	self.showRows = function () {
		rows.forEach(function (row, r) {
			row.$el.delay(r * 100).animate({ left: 0, opacity: 1 }, { start: function () { audio.play('woosh', true); } });
		});
	};

	self.showResults = function (results) {
		rows.forEach(function (row, r) { row.showResult(results[r], r * 100); });
	};

	self.resolveResults = function () {
		rows.forEach(function (row, r) { row.resolveResult(r * 100); });
		IGB.later(function () { self.showRank(true); }, (rows.length - 1) * 100 + 500);
	};

	// Re-sort the rows by score; with doAnim they shuffle into place.
	self.showRank = function (doAnim = false) {
		self.rerank();

		let nPos = -1;
		for (let n = 0; n < 6; n++) {
			players.forEach(function (player, p) {
				if (player.rank === n) {
					nPos++;
					rows[p].nPosWas = rows[p].nPos;
					rows[p].nPos = nPos;
					rows[p].$el.css({ top: nPos * 100 });
					rows[p].redraw();
				}
			});
		}

		if (doAnim) {
			for (const row of rows) {
				let dir = 0;
				if (row.nPos > row.nPosWas) dir = 1;
				if (row.nPos < row.nPosWas) dir = -1;
				row.$el.css({ top: row.nPosWas * 100 })
					.animate({ left: dir * 100 })
					.animate({ top: row.nPos * 100 })
					.animate({ left: 0 });
			}
		}
	};

	self.showRank();
};

Tally.Row = function (n, player) {

	const RANKS = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

	const audio = new AudioPlayer();
	audio.add('woosh', 'assets/shared/sfx-woosh.mp3', 0.05);
	audio.add('coin', 'assets/shared/sfx-coin.mp3', 0.3);

	const self = this;
	self.$el = $(`
		<tally-row player=${n}>
			<tally-content>
				<tally-pos></tally-pos>
				<tally-name></tally-name>
				<tally-coin></tally-coin>
				<tally-score></tally-score>
			</tally-content>
			<tally-result-mask>
				<tally-result>+10</tally-result>
			</tally-result-mask>
		</tally-row>`);

	self.$el.find('tally-pos').text(RANKS[player.rank] || '');
	self.$el.find('tally-name').text(player.name);
	self.$el.find('tally-score').text(player.score);
	new MeepHead(n).$el.insertAfter(self.$el.find('tally-pos'));

	const $result = self.$el.find('tally-result');

	self.redraw = function () {
		self.$el.find('tally-score').text(Math.floor(player.score));
		self.$el.find('tally-pos').text(RANKS[player.rank]);
	};

	self.showResult = function (result, delay = 0) {
		if (isNaN(result)) result = 0;
		$result
			.text(result >= 0 ? '+ ' + result : '- ' + (-result))
			.show()
			.css({ left: -120 })
			.delay(delay)
			.animate({ left: 20 }, { start: function () { audio.play('woosh', true); } });
	};

	self.resolveResult = function (delay = 0) {
		$result.delay(delay).animate({ left: -200 }, {
			start: function () { audio.play('coin', true); },
		});
		IGB.later(self.redraw, delay);
	};
};
