AudioPlayer = function(){
    let self = this;
    self.$el = $('<div>');
   let audio = {};

    self.add = function(id,src,volume,loop,autoplay){
        let attr = ''+(autoplay?'autoplay ':'')+(loop?'loop ':'');
        audio[id] = $(`<audio ${attr}>
            <source src=${src} type="audio/mpeg">
        </audio>`).appendTo(self.$el)[0];
        audio[id].volume = volume?volume:1;

        if(autoplay) audio[id].play();
    }

    self.getTime = function(id){
        return audio[id].currentTime;
    }

    self.setVolume = function(id,volume){
        audio[id].volume = volume;
    }

    self.play = function(id,restart,speed){
        audio[id].play();
        if(restart) audio[id].currentTime = 0;
        if(speed) audio[id].playbackRate = speed;
    }

    self.playAtTime = function(id,timeFrom){
        audio[id].play();
        audio[id].currentTime = timeFrom;
    }

    self.stop = function(id){
        audio[id].pause();
    }

     self.getDuration = function(id){
        return audio[id].duration;
    }

    self.initAnalyser = function(id){
        
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        console.log(audioCtx);
        const analyser = audioCtx.initAnalyser();

        const source = audioCtx.createMediaElementSource(audio[id]);
        source.connect(analyser);
        analyser.connect(distortion);
        distortion.connect(audioCtx.destination);

        analyser.fftSize = 2048;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        return analyser;

        
    }
}