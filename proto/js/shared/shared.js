window.shuffleArray = function(array) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}

window.scoresToRewards = function(scores){

  const SCORES = [
    undefined,
    undefined,
    [20,10],
    [20,10,5],
    [20,10,5,2],
    [20,15,10,5,2],
    [20,17,12,10,5,2],
  ];

  let standings = [];
  for(var a=0; a<scores.length; a++){
    standings[a] = scores.length;
    for(var b=0; b<scores.length; b++) if(scores[a] >= scores[b]) standings[a]--;
  }

  let rewards = [];
  for(var s=0; s<standings.length; s++) rewards[s] = SCORES[scores.length][ standings[s] ];

  return rewards;
}