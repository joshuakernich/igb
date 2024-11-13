AudioContext = function(){
    let self = this;
    self.$el = $('<div>');
   let audio = {};

    self.add = function(id,src,volume,loop,autoplay){
        let attr = ''+(autoplay?'autoplay ':'')+(loop?'loop ':'');
        audio[id] = $(`<audio ${attr}>
            <source src=${src} type="audio/mpeg">
        </audio>`).appendTo(self.$el)[0];
        audio[id].volume = volume;
    }

    self.play = function(id,restart){
        audio[id].play();
        if(restart) audio[id].currentTime = 0;
    }

    self.stop = function(id){
        audio[id].pause();
    }
}

BatVinesPlayer = function(n){

    let audio = new AudioContext();
    audio.add('throw','./proto/audio/sfx-throw.mp3',0.2);
    audio.add('locking','./proto/audio/sfx-locking.mp3',0.1,true);
    audio.add('cut','./proto/audio/sfx-swipe.mp3',0.1);
    audio.add('reload','./proto/audio/sfx-reload.mp3',0.1);

    const FPFOCUS = BatVines.FPS;
    const FPTHROW = BatVines.FPS/2;

    let self = this;
    self.$el = $('<batvinesplayer>');
    self.isActive = false;
    self.isCutting = false;


    let $zone = $('<batvineszone>').appendTo(self.$el);
    let $batarang = $('<batvinesbatarang>').appendTo(self.$el);
    $('<batvinesspinner>').appendTo($batarang);

    $zone.css('opacity',0);
    $batarang.css('opacity',0);

    let dir = n==0?-1:1;

    let sx = -2;
    let sy = BatVines.ARENA.H + 2;
    if(n==1) sx = BatVines.ARENA.W+2;

    $zone.css('left',sx*BatVines.GRIDSIZE+'px');
    $zone.css('top',BatVines.ARENA.H*BatVines.GRIDSIZE+'px');

    $batarang.css('left',sx*BatVines.GRIDSIZE+'px');
    $batarang.css('top',sy*BatVines.GRIDSIZE+'px');
    $batarang.css('transform','scale(5) rotate('+(-dir*10)+'deg)');
    
    
    self.targeting = 0;
    self.throwing = 0;

    let $reticule = $('<batvinesreticule>').appendTo(self.$el);

    self.setPos = function(px,py){

        let amtFocus = self.targeting/FPFOCUS;
        if(amtFocus>1) amtFocus = 1;

        if(amtFocus>0 && !self.isThrowing) audio.play('locking');
        else audio.stop('locking');

        $reticule.css({
            left:px*BatVines.GRIDSIZE+'px',
            top:py*BatVines.GRIDSIZE+'px',
            width: (2.5-amtFocus*1.5)*BatVines.GRIDSIZE+'px',
            height: (1.5-amtFocus*0.5)*BatVines.GRIDSIZE+'px',
        })

        if(self.isThrowing){

            self.throwing ++;
            let amtThrow = self.throwing/FPTHROW;
            if(amtThrow>1)amtThrow = 1;
           
            let dx = (px-sx);
            let dy = (py-sy);

            let x = sx + dx*amtThrow;
            let y = sy + dy*amtThrow;

            $batarang.css({
                'left':x*BatVines.GRIDSIZE+'px',
                'top':y*BatVines.GRIDSIZE+'px',
                'transform':'scale('+(5-amtThrow*4)+')',
            });

        } else {

            if(
                (!self.isActive && n==0 && px<0 && py>BatVines.ARENA.H) ||
                (!self.isActive && n==1 && px>BatVines.ARENA.W && py>BatVines.ARENA.H)
            ){

                audio.play('reload');
                self.isActive = true;
            }

            if(self.isActive && self.targeting>=FPFOCUS){
                audio.play('throw');
                self.isThrowing = true;
            }

            $zone.css('opacity',self.isActive?0:1);
            $batarang.css('opacity',self.isActive?1:0);
            $reticule.css('opacity',self.isActive?1:0.5);
        }

        $batarang.attr('active',self.isThrowing);

        self.isCutting = self.throwing>=FPTHROW;
        if(self.isCutting) audio.play('cut');
    }

    self.reset = function(){
        self.isCutting = false;
       // self.isActive = false;
        self.isThrowing = false;
        self.targeting = 0;
        self.throwing = 0;

        $batarang.css({
            'left':sx*BatVines.GRIDSIZE+'px',
            'top':sy*BatVines.GRIDSIZE+'px',
            'transform':'scale('+(5)+')',
        });
    }
}

BatVinesArena = function(layout) {

    let self = this;
    self.failState = undefined;
    self.active = false;
    self.isFailed = false;
    self.isCleared = false;

    self.$el = $('<batvinesarena>');
    self.$el.css({
        left:layout.x+'px',
        top:layout.y+'px',
        transform:'scale('+layout.scale+')',
    });



    let knots = [];
    let ropes = [];
    let actors = [];
    let players = [];

    self.reset = function(){

        self.failState = undefined;
        self.isFailed = false;
        self.isCleared = false;
        
        self.$el.empty();

        knots = [];
        ropes = [];
        actors = [];
        players = [];

        for(var r in layout.ropes){
            ropes[r] = new BatVinesRope( layout.ropes[r].x, layout.ropes[r].y, layout.ropes[r].length );
            ropes[r].$el.appendTo(self.$el);
        }
        for(var a in layout.actors){
            actors[a] = new BatVinesActor( layout.actors[a].x, layout.actors[a].y, layout.actors[a].w, layout.actors[a].h, layout.actors[a].type );
            actors[a].$el.appendTo(self.$el);
        }
        for(var k in layout.knots){
            knots[k] = new BatVinesKnot(
                ropes[layout.knots[k].ropeLeft],
                ropes[layout.knots[k].ropeRight],
                actors[layout.knots[k].actor]
                );
        }
        
        for(var i=0; i<2; i++){
            players[i] = new BatVinesPlayer(i);
            players[i].$el.appendTo(self.$el);
        }
    }

    self.reset();

    self.step = function() {

       for(var a in actors) actors[a].step();

       for(var a=0; a<actors.length; a++){
            for(var b=a+1; b<actors.length; b++){
                actors[a].interactWith(actors[b]);
                actors[b].interactWith(actors[a]);
            }
        }

        let complete = true;
        for(var a in actors){
            if( actors[a].failState ) self.failState = actors[a].failState;
            if( !actors[a].complete ) complete = false;
        }

        if(self.failState && !self.isFailed){
            self.$el.html('FAIL!');
            self.isFailed = true;
            $('<batvinesreset>').appendTo(self.$el).click(self.reset);
        }
        if(complete){
            self.$el.html('CLEAR!');
            self.isCleared = true;
            for(var p in players) players[p].isActive = false;
        }
    }

    self.setPlayerPositions = function(positions){
        for(var n in players){

            let rx = 0;
            let ry = 0;

            if(layout.wall==0){
                rx = (positions[n].pz/100);
                ry = (positions[n].px/100);
            } else if(layout.wall==1){
                rx = positions[n].px/100;
                ry = (1-positions[n].pz/100);
            } else if(layout.wall==2){
                rx = (1-positions[n].pz/100);
                ry = (1-positions[n].px/100);
            }

            rx = rx*3 - 1;
            ry = ry*3 - 1;
               
            //get the grid position
            let gx = rx*BatVines.ARENA.W;
            let gy = ry*BatVines.ARENA.H;

            if(players[n].isActive){

                let isTargeting = undefined;

                for(var r in ropes){
                    let dx = ropes[r].tx - gx;
                    let dy = ropes[r].ty - gy;
                    let d = Math.hypot(dx,dy);

                    if(!ropes[r].isCut && d<0.5) isTargeting = ropes[r];
                }

                if( isTargeting ) players[n].targeting++;
                else players[n].targeting = 0;

                if(players[n].isCutting){

                    players[n].reset();
                    
                    if(isTargeting) isTargeting.doCut();
                    

                    
                }
            }

            players[n].setPos(gx,gy);
        }
    }

    self.setActive = function(b){

        self.active = b;
        self.$el.attr('active',b);

        if(b){
            self.$el.css({
                left:BatVines.W/2-BatVines.ARENA.W/2*BatVines.GRIDSIZE+'px',
                top:BatVines.H/2-BatVines.ARENA.H/2*BatVines.GRIDSIZE+'px',
                transform:'scale(1)',
            });
        } else {
            self.$el.css({
                left:layout.x+'px',
                top:layout.y+'px',
                transform:'scale('+layout.scale+')',
            });
        }
    }



}

BatVinesRope = function(x,y,length){
    let self = this;
    self.x = x;
    self.y = y;
    self.length = length;

    self.$el = $('<batrope>').css({left:self.x*BatVines.GRIDSIZE+'px',top:self.y*BatVines.GRIDSIZE+'px'})

    let $svg = $(`<svg viewBox='${-self.length} ${-self.length} ${self.length*2} ${self.length*2}' width=${self.length*2*BatVines.GRIDSIZE} height=${self.length*BatVines.GRIDSIZE*2}><path></path></svg>`).appendTo(self.$el);
    let $path = $svg.find('path');

    self.$target = $('<batvinestarget>').appendTo(self.$el);
    self.isCut = false;

    self.to = function(x2,y2,hang) {

        x2 -= x;
        y2 -= y;
       // $path.attr('d',`M0,0 L${x2-x},${y2-y}`);
        $path.attr('d',`M0,0 C 0 ${hang}, ${x2} ${hang}, ${x2} ${y2}`);

        let pt = getPointOnBezier(0,0,0,hang,x2,hang,x2,y2,0.2);

        self.tx = self.x + pt.x;
        self.ty = self.y + pt.y;

        self.$target.css('left',pt.x*BatVines.GRIDSIZE+'px');
        self.$target.css('top',pt.y*BatVines.GRIDSIZE+'px');
    }

    self.to(self.x,self.y+length,length);

    function getPointOnBezier(p0x,p0y,p1x,p1y,p2x,p2y,p3x,p3y,t){
        let x = (1-t)*(1-t)*(1-t)*p0x + 3*(1-t)*(1-t)*t*p1x + 3*(1-t)*t*t*p2x + t*t*t*p3x;
        let y = (1-t)*(1-t)*(1-t)*p0y + 3*(1-t)*(1-t)*t*p1y + 3*(1-t)*t*t*p2y + t*t*t*p3y;
        return {x:x,y:y};
    }

    self.doCut = function(){
        self.isCut = true;
        self.$target.trigger('click');
    }
}

BatVinesActor = function(x,y,w,h,type){
    let self = this;
    self.x = x;
    self.y = y;
    self.sy = 0;
    self.w = w;
    self.h = h;
    self.type = type;
    self.grounded = 0;
    self.gravity = false;
    self.dead = false;
    self.failState = undefined;
    self.complete = (type !='goody');
    self.isAttacking = false;
    self.dir = 1;
    self.pause = 0;

     self.$el = $('<batactor>').attr('type',self.type).css({
        width:self.w*BatVines.GRIDSIZE+'px',
        height:self.h*BatVines.GRIDSIZE+'px',
    })

    self.to = function(x,y){

        self.x = x;
        self.y = y;

        let rot = (type=='goody')?(self.grounded?0:-45):0;

        self.$el.css({
            left:self.x*BatVines.GRIDSIZE+'px',
            top:self.y*BatVines.GRIDSIZE+'px',
            transform:'translate(-50%, -50%) rotate('+rot+'deg)',
        }) 
    }

    self.step = function(){

        if(self.dead){
            self.$el.remove();
            if(self.type=='goody') self.failState = 'You killed a goody!';
            return;
        }

        if(self.gravity) self.sy += BatVines.GRAVITY;
        self.y += self.sy;

        if((self.y+self.h/2) > BatVines.ARENA.H){
            self.y = BatVines.ARENA.H-self.h/2;
            self.sy = 1;
            self.grounded ++;

            if(self.grounded > BatVines.FPS) self.complete = true;
        }

        if(self.type=='baddy' && !self.isAttacking && self.pause--<0){
            //back and forth
            self.x += self.dir * 0.05;
            if(self.dir == 1 && self.x>BatVines.ARENA.W){
                self.pause = BatVines.FPS/2;
                self.dir = -1;
            }
            if(self.dir == -1 && self.x<0){
                self.pause = BatVines.FPS/2;
                self.dir = 1;
            }
        }

        self.to(self.x,self.y);
    }

    self.interactWith = function(other) {

        if(self.dead || other.dead) return;

        self.isAttacking = false;

        let dx = other.x - self.x;
        let dy = other.y - self.y;
        let d = Math.hypot(dx,dy);

        let isAttack = (self.type=='baddy' && other.type=='goody');

        if(d<1){
            self.isAttacking = true;
            //genuine collision
            if(self.type=='plant-mouth') other.dead = true;
            if(isAttack) other.dead = true;
        }

        if(isAttack && Math.abs(dy) < 1){
            let dir = dx>0?1:-1;
            self.x += dir*0.1;
        }
    }
}

BatVinesKnot = function(left,right,slave){

    if(!right) right = left;

    let mx = ((left.x + left.length) + (right.x - right.length))/2;


    // maxY should be calculated based on x offset

    let oxLeft = Math.abs(left.x-mx);
    let oxRight = Math.abs(right.x-mx);

    let hangLeft = left.length - oxLeft;
    let hangRight = right.length - oxRight;

    let my = Math.min( left.y + hangLeft, right.y + hangRight );

    left.to(mx,my,hangLeft);
    right.to(mx,my,hangRight);
    slave.to(mx,my);

    function drop(slave){
        slave.gravity = true;
    }

    function dangle(rope){
        let pos = {x:mx,y:my};
        $(pos).animate({x:rope.x,y:rope.y+rope.length},{duration:500,easing:'easeOutBack',step:function(value,prop){
           
            let ox = Math.abs(rope.x-pos.x);
            let hang = rope.length - ox;

            rope.to(pos.x,pos.y,hang);
            slave.to(pos.x,pos.y);
        }});
    }

    if( left != right ) right.$target.click(function(){
        right.$el.hide();
        right = undefined;
        if(left) dangle(left);
        else drop(slave);
    })

    left.$target.click(function(){
        left.$el.hide();
        if(left==right) right = undefined;
        left = undefined;
        if(right) dangle(right);
        else drop(slave);
    })
}

BatVinesGame = function(){

    BatVines = {};
    BatVines.FPS = 50;
    BatVines.W = 1600;
    BatVines.H = 1000;
    BatVines.GRIDSIZE = 50;
    BatVines.GRAVITY = 0.03;
    BatVines.ARENA = {W:12,H:10};

    $("head").append(`
        <style>
            batvinesgame{
                display:block;
                width: ${BatVines.W*3}px;
                height: ${BatVines.H}px;
                transform-origin: top left;
                text-align: center;
                pointer-events: none;
            }

            batvinesbg{
                display:block;
                width: 100%;
                height: 100%;
                position: absolute;
                left: 0px;
                top: 0px;

                background-image:url(./proto/img/bat-greenhouse-bg.png);
                background-size: 100%;
                
            }

           batvinesarena{
                position: absolute;
                display: inline-block;
                width: ${BatVines.ARENA.W*BatVines.GRIDSIZE}px;
                height: ${BatVines.ARENA.H*BatVines.GRIDSIZE}px;
               
                
                line-height: ${BatVines.ARENA.H*BatVines.GRIDSIZE}px;
                font-size: ${BatVines.GRIDSIZE*2}px;
                transform-origin: top left;
                color: white;

                transition: all 0.5s;
           }   

           batvinesreset{
            position: absolute;
            left: 0px;
            right: 0px;
            bottom: ${BatVines.GRIDSIZE}px;
            width: ${3*BatVines.GRIDSIZE}px;
            height: ${3*BatVines.GRIDSIZE}px;
           
            background: no-repeat center url(./proto/img/reset-ccw.svg);
            background-size: 50%;
            margin: auto;
            z-index: 4;
            pointer-events: auto;
           }

           batvinesarena batvinesreticule,
           batvinesarena batvinestarget,
           batvinesarena batvinesprojectile{
                display: none;
           }

           batvinesarena[active='true'] batvinesreticule,
           batvinesarena[active='true'] batvinestarget,
           batvinesarena[active='true'] batvinesprojectile
           {
                display: block;
           }

           batzoombutton{
                position: absolute;
                display: block;
                position: absolute;
                pointer-events: auto;
           }

           batzoombutton:before{
                content:"";
                position: absolute;
                display: block;
                position: absolute;
                top: 0px;
                left: 0px;
                bottom: 0px;
                width: 10%;
                box-sizing: border-box;
                border: 2px solid white;
                border-right: none;
           } 

            batzoombutton:after{
                content:"";
                position: absolute;
                display: block;
                position: absolute;
                top: 0px;
                right: 0px;
                bottom: 0px;
                width: 10%;
                box-sizing: border-box;
                border: 2px solid white;
                border-left: none;
           }

           batvinesarena[active='true']{
             z-index: 2;
           }

           batvinesarena[active='true']:before{
            content:"";
            position: absolute;
            left: -100%;
            right: -100%;
            top: 100%;
            height: 100px;
            background: linear-gradient(to bottom, rgba(0,0,0,0.3), transparent);
           }

           batvinesarena[active='true']:after{
            content:"";
            position: absolute;
            left: -100%;
            right: -100%;
            bottom: 100%;
            height: 100px;
            background: linear-gradient(to top, rgba(0,0,0,0.3), transparent);
           }

           batvinesplayer{
                display: block;
                position: absolute;
                top: 0px;
                left: 0px;
                right: 0px;
                bottom: 0px;
                pointer-events: none;
           }

           batvinesprojectile{
                display: block;
                position: absolute;
                top: 0px;
                left: 0px;
           }

           batvineszone{
                display: block;
                position: absolute;
                
                width: ${BatVines.ARENA.W*BatVines.GRIDSIZE}px;
                height: ${BatVines.ARENA.W*BatVines.GRIDSIZE}px;
                border-radius: 100%;
                background: rgba(255,0,0,0.1);
                transform: translate(-50%, -50px);

                border: 10px dashed red;
           }



           batvinesbatarang{
                display: block;
                position: absolute;
                top: ${BatVines.ARENA.H*BatVines.GRIDSIZE + 50}px;
                
           }



           batvinesreticule{
                display: block;
                position: absolute;
                top: 0px;
                left: 0px;
                width: ${BatVines.GRIDSIZE}px;
                height: ${BatVines.GRIDSIZE}px;
                transform: translate(-50%, -50%);
                box-sizing: border-box;
                
               
           }

           batvinesreticule:before{
                content:"";
                position: absolute;
                display: block;
                position: absolute;
                top: 0px;
                left: 0px;
                bottom: 0px;
                width: 25%;
                box-sizing: border-box;
                border: 4px solid red;
                border-right: none;
           } 

            batvinesreticule:after{
                content:"";
                position: absolute;
                display: block;
                position: absolute;
                top: 0px;
                right: 0px;
                bottom: 0px;
                width: 25%;
                box-sizing: border-box;
                border: 4px solid red;
                border-left: none;
           }



            batvinesspinner{
                display: block;
                position: absolute;
               transform: scaleY(0.5);
           }

           batvinesspinner:after{
                content:"";
                display: block;
                position: absolute;
                top: ${-BatVines.GRIDSIZE}px;
                left: ${-BatVines.GRIDSIZE}px;
                width: ${BatVines.GRIDSIZE*2}px;
                height: ${BatVines.GRIDSIZE*2}px;
                background: url(./proto/img/bat-symbol-red.png);
                background-position: center;
                background-repeat: no-repeat;
                background-size: 100%;
           }

           batvinesplayer:last-of-type batvinesspinner:after{
             background-image: url(./proto/img/bat-symbol-blue.png);
           }

           batvinesbatarang[active='true'] batvinesspinner:after{
                animation: batspin;
                animation-duration: 0.3s;
                animation-iteration-count: infinite;
                animation-timing-function: linear;
           }

           batvinesplayer:last-of-type batvineszone{
             border-color: blue;
            background: rgba(0,0,255,0.1);
           }

           batvinesplayer:last-of-type batvinesreticule:before,
           batvinesplayer:last-of-type batvinesreticule:after
           {
             border-color: blue;
           }

           batrope{
                display: block;
                position: absolute;
                top: 0px;
                left: 0px;
           }

           batactor{
                display: block;
                position: absolute;
                background: black;
                
                transform: translate(-50%,-50%);
                background-size: 100%;
                 border-radius: 50% 50% 10% 10%;
           }

            batactor[type="goody"]:after, batactor[type="baddy"]:after{
                content:". .";
                width: 100%;
                height: 50%;
                background: black;
                border-radius: 100%;
                background-repeat: no-repeat;
                position: absolute;
                bottom: 70%;
                left: 0%;
                display: block;
                font-size: 25px;
                line-height: 25px;
           }

           batactor[type="baddy"]:after{
                color: red;
           }

           batactor[type="plant-mouth"]{
                 background-color: transparent;
                 background-image: url(./proto/img/bat-plant-mouth.png);
                 border-radius: 0px;
           }

           svg{
               transform: translate(-50%,-50%);
               
           }

           path{
                stroke-width: 0.3px;
                stroke: black;
                fill: none;
           }

           batvinestarget{
            display: block;
            position: absolute;
            width: ${BatVines.GRIDSIZE/2}px;
            height: ${BatVines.GRIDSIZE/2}px;
            box-sizing: border-box;
            border: 5px solid white;
            transform: translate(-50%, -50%);
            border-radius: 100%;
            pointer-events: auto;
           }

           batvinesgogglesbg{
            
           }

           batvinesgoggles{
            z-index: 3;
           }

           batvinesgoggles, batvinesgogglesbg{
             display: block;
            position: absolute;
            top: 0px;
            left: 0px;
            right: 0px;
            bottom: 0px;
            
           }

           batvineswall{
            display:inline-block;
            width: 33.3%;
            height: 100%;
            position:relative;
           }

            batvineswall[active='true'] batvinesgogglesbg{
                 z-index: 1;
                backdrop-filter: blur(20px);
                background-color: rgba(100,100,100,0.4);
                background-image: url(./proto/img/bat-vines-frame.png);
                background-size: 80%;
                background-position: center;
            }

           batvineswall[active='true'] batvinesgoggles{
            background: url(./proto/img/bat-goggles.png);
            background-size: 100%;
           }

            batvineswall[active='false'] batvinesgoggles{
            background: black;
           }

           @keyframes batspin{
            0%{
                transform: rotate(0deg);
            }
            100%{
                transform: rotate(360deg);
            }
           }

        </style>
    `);

    let self = this;
    self.$el = $('<igb>');



    const MAPS = [
        {
            wall:0,
            x:400,
            y:480,
            scale:0.3,
            ropes:[
                {x:3,y:0,length:3},
                {x:8,y:0,length:4},
                
                /*new BatVinesRope(3,0,3),
                new BatVinesRope(8,0,4),*/
            ],

            platforms:[

            ],

            actors:[
                {x:0,y:0,w:1,h:2,type:'goody'},
                {x:0,y:0,w:2,h:2,type:'plant-mouth'},
                {x:8,y:BatVines.ARENA.H,w:1,h:2,type:'baddy'},

                /*new BatVinesActor(0,0,0.5,'goody'),
                new BatVinesActor(0,0,1,'plant-mouth'),
                new BatVinesActor(8,BatVines.ARENA.H,0.5,'baddy'),*/
            ],

            knots:[
               {ropeLeft:0,ropeRight:-1,actor:0},
               {ropeLeft:1,ropeRight:-1,actor:1},
            ],
        },
        {
            wall:1,
            x:150,
            y:150,
            scale:0.8,
            ropes:[
                {x:3,y:0,length:7},
                {x:8,y:0,length:5},

                //new BatVinesRope(3,0,7),
                //new BatVinesRope(8,0,5),
            ],

            platforms:[

            ],

            actors:[
                 {x:0,y:0,w:1,h:2,type:'goody'},
                //new BatVinesActor(0,0,0.5,'goody'),
            ],

            knots:[
                {ropeLeft:0,ropeRight:1,actor:0},
            ],
        },
        {
            wall:2,
            x:350,
            y:400,
            scale:0.4,
            ropes:[
                {x:5,y:0,length:7},
                {x:10,y:0,length:5},
                {x:2,y:0,length:8},
                {x:7,y:0,length:6},
                //new BatVinesRope(5,0,6),
                //new BatVinesRope(10,0,5),
                //new BatVinesRope(3,0,6),
                //new BatVinesRope(8,0,7),
            ],

            platforms:[

            ],

            actors:[
                {x:0,y:0,w:1,h:2,type:'goody'},
                {x:0,y:0,w:1,h:2,type:'goody'},
                //new BatVinesActor(0,0,0.5,'goody'),
                //new BatVinesActor(0,0,0.5,'goody'),
            ],

            knots:[
                {ropeLeft:0,ropeRight:1,actor:0},
                {ropeLeft:2,ropeRight:3,actor:1},
            ],
        }
    ]

    

    
    let audio = new AudioContext();
    audio.add('music','./proto/audio/mystery-girl-bgm-184949.mp3',0.3,true,true);
    audio.add('zoom','./proto/audio/sfx-zoom.mp3',0.5);
    

    

    let $game = $('<batvinesgame>').appendTo(self.$el);
    let $bg = $('<batvinesbg>').appendTo($game);

    let $walls = [];
    for(var i=0; i<3; i++){
        $walls[i] = $('<batvineswall>').appendTo($game);
        $('<batvinesgogglesbg>').appendTo($walls[i]);
        $('<batvinesgoggles>').appendTo($walls[i]);
    }

    let arenas = [];
    for(var m in MAPS){
        arenas[m] = new BatVinesArena(MAPS[m]);
        arenas[m].$el.attr('id',m);
        arenas[m].$el.appendTo($walls[MAPS[m].wall]);
        

        $('<batzoombutton>')
        .appendTo($walls[MAPS[m].wall])
        .css({
            left: MAPS[m].x + 'px',
            top: MAPS[m].y + 'px',
            width: MAPS[m].scale * BatVines.ARENA.W * BatVines.GRIDSIZE + 'px',
            height: MAPS[m].scale * BatVines.ARENA.H * BatVines.GRIDSIZE + 'px',
        })
        .attr('id',m)
        .click(onArena);
    }

    let idActive = -1;
    function onArena(){
        idActive = $(this).attr('id');
        arenas[idActive].setActive(true);
        for(var w=0; w<$walls.length; w++) $walls[w].attr('active',w==MAPS[idActive].wall);
        $('batzoombutton').hide();

        audio.play('zoom');
    }

    let scale = 1;
    function tick(){
        let w = $(document).innerWidth();
        let s = w/(BatVines.W*3);

        if( s!=scale ) $game.css('transform','scale('+s+')');
        scale = s;

        for(var a in arenas) arenas[a].step();
        if(idActive>-1){
            arenas[idActive].setPlayerPositions(players);
            if(arenas[idActive].isCleared){
                arenas[idActive].setActive(false);
                for(var w2 in $walls) $walls[w2].removeAttr('active');
                idActive = -1;
                $('batzoombutton').show();
            }
        }


    }

    setInterval(tick,1000/BatVines.FPS);

    let players = [{},{}];
    self.setPlayers = function(p){
        players = p;
        players.length = 2;

        for(var i in players){
            players[i].proximity = [];
            players[i].proximity[0] = 1+players[i].X;
            players[i].proximity[1] = 1-players[i].Z;
            players[i].proximity[2] = 1-players[i].X;
        }
    }

    $(document).on('mousemove',function(e){

        let oy = $game.offset().top;
        let x = (e.pageX/scale)/BatVines.W;
        let y = (e.pageY-oy)/scale/BatVines.H;


        if( x < 1 ){
            //left wall
            players[0].px = (y)*100;
            players[0].pz = (x)*100;
        } else if( x > 2 ){
            //right wall
            players[0].px = (1 - y)*100;
            players[0].pz = (3 - x)*100;
        }
        else{
            //front wall
            players[0].px = (x - 1)*100;
            players[0].pz = (1 - y)*100;
        }

        players[1].px = players[0].px + 5;
        players[1].pz = players[0].pz + 5;

        players[0].proximity = [0.9,0.9,0.9];
    })

    $(document).on('click',function(e){
        audio.play('music');
    });

}

