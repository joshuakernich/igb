Scene3D = function(){
    
    const W = 160;
    const H = 100;

    if( !Scene3D.isStyled) $("head").append(`
        <style>
            scene3D{
                display:block;
                width: ${W}px;
                height: ${H}px;
                
                
                transform-origin: top left;
                overflow: hidden;
            }

            world3D{
                display:block;
                position: absolute;
                left: ${W/2}px;
                top: ${H/2}px;
                perspective-origin: center;
                perspective: ${W}px;
            }
        </style>
    `);

    Scene3D.isStyled = true;
   
    let self = this;
    self.$el = $(`
        <scene3D>
        </scene3D>`
    );

    let $world = $('<world3D>').appendTo(self.$el);

    new Building3D().$el.appendTo($world);
}

Building3D = function(){
    
    let self = this;
    self.$el = $('<building3d>');

    if( !Building3D.isStyled) $("head").append(`
        <style>
            building3d{
                display:block;
                position: absolute;
                transform-style: preserve-3d;
            }
        </style>
    `);

    Building3D.isStyled = true;
   
    const W = 160;
    const D = 160;
    const H = 100;

    const FLOORMAP =
    [
        [
            'AH234',
            '  1  ',
            '  0  ',
        ],
        [
            '98765',
        ]
    ]

    const DIRS = [
        {x:0,y:-1},
        {x:1,y:0},
        {x:0,y:1},
        {x:-1,y:0},
    ]

    function getWalls(level,y,x){

        let map = [];
        for(var d in DIRS){

            let adjacent = level[y+DIRS[d].y]?level[y+DIRS[d].y][x+DIRS[d].x]:undefined;

            if(adjacent==undefined) adjacent = ' ';

            map[d] = (adjacent == ' ')?1:0;
           
        }

        return map;
    }

    function buildLevel(level,y){
        for(var r=0; r<level.length; r++){
            for(var c=0; c<level[r].length; c++){
                let type = level[r][c];

                if(type != ' '){
                    let room = new Room3D(W,D,H,'center/25% url(./proto/img/plant-wall.png)',getWalls(level,r,c));
                    room.$el.appendTo(self.$el).css('transform',`translate3D(${W*c}px,${-H*y}px,${D*r}px)`);

                   room.$el.attr('x',c);
                   room.$el.attr('level',y);
                   room.$el.attr('y',r);
                }
                
            }
        }
    }



    buildLevel(FLOORMAP[0],0);
    buildLevel(FLOORMAP[1],1);

    self.$el.find(`room3D .room3D-front`).hide();

    for(var i=0; i<4; i++){
        self.$el.find(`room3D[x='${i}'][level='${0}'][y='${0}'] .room3D-top`).hide();
        self.$el.find(`room3D[x='${i}'][level='${1}'][y='${0}'] .room3D-bottom`).hide();
    }

}

/*
    w width
    l depth
    h height
    color css wall color
    walls array toggling walls
*/
Room3D = function(w,l,h,color,walls){

    if(!w) w = 100;
    if(!l) l = 100;
    if(!h) h = 100;
    if(!color) color = 'radial-gradient(gray,black)';
    if(!walls) walls = [1,1,1,1];

    if( !Room3D.isStyled) $("head").append(`
        <style>
            room3D{
                display:block;
                transform-style: preserve-3d;
                width: 0px;
                height: 0px;
            }

            room3Dside{
                display:block;
                position:absolute;
                top: 0px;
                left: 0px;
                width: 0px;
                height: 0px;

                box-sizing:border-box;
                transform-style: preserve-3d;
                text-align:center;
                transform-origin: center;
            }  

            room3Dsurface{
                display:block;
                position:absolute;
                transform: translate(-50%,-50%);
            }

        </style>
    `);

    Room3D.isStyled = true;

    let self = this;

    self.$el = $(`
        <room3D>
            <room3Dside class='room3D-bottom' style='transform:translateY(${h/2}px) rotateX(90deg);'>
                <room3Dsurface style='background:${color};width:${w}px;height:${l}px;'></room3Dsurface>
            </room3Dside>
            <room3Dside class='room3D-top' style='transform:translateY(${-h/2}px) rotateX(90deg);'>
                <room3Dsurface style='background:${color};width:${w}px;height:${l}px;'></room3Dsurface>
            </room3Dside>

            ${ walls[0]?`
                <room3Dside class='room3D-back' style='transform:translateZ(${-l/2}px)'>
                    <room3Dsurface style='background:${color};width:${w}px;height:${h}px;'></room3Dsurface>
                </room3Dside>`:'' } 

            ${ walls[1]?`
                <room3Dside class='room3D-right' style='transform:translateX(${w/2}px) rotateY(90deg)'>
                    <room3Dsurface style='background:${color};width:${l}px;height:${h}px;'></room3Dsurface>
                </room3Dside>`:'' } 

            ${ walls[2]?`
                <room3Dside class='room3D-front' style='transform:translateZ(${l/2}px)'>
                    <room3Dsurface style='background:${color};width:${w}px;height:${h}px;'></room3Dsurface>
                </room3Dside>`:'' } 

            ${ walls[3]?`
                <room3Dside class='room3D-left' style='transform:translateX(${-w/2}px) rotateY(90deg)'>
                    <room3Dsurface style='background:${color};width:${l}px;height:${h}px;'></room3Dsurface>
                </room3Dside>`:'' } 
            
        </room3D>
        `)
}





BatVinesPop = function(x,y,w,h){
    let self = this;
    let particles = 5;
    let rMin = Math.min(w/4,h/4);
    let rMax = Math.min(w/3,h/3);


    self.$el = $('<batvinespop>');
    for(var i=0; i<particles; i++){

        let pr = rMin + Math.random()*(rMax-rMin);
        let cx = x + w/2;
        let cy = y + h/2;
        let ox = Math.random() * (w/2-pr) * ((Math.random()>0.5)?1:-1);
        let oy = Math.random() * (h/2-pr) * ((Math.random()>0.5)?1:-1);

        let $p = $('<batvinesparticle>')
        .appendTo(self.$el)
        .css({
            left:(cx+ox)+'px',
            top:(cy+oy)+'px',
            width:(pr*2)+'px',
            height:(pr*2)+'px',
        })
        
        .animate({
            left:(cx + ox*2)+'px',
            top:(cy + oy*2-5-Math.random()*5)+'px',
            width:'0px',
            height:'0px',
        },200+Math.random()*1000);
    }

    setTimeout(self.$el.remove,1500);
}

BatVinesPlayer = function(n){

    let audio = new AudioContext();
    audio.add('throw','./proto/audio/sfx-throw.mp3',0.2);
    audio.add('locking','./proto/audio/sfx-locking.mp3',0.1,true);
    audio.add('cut','./proto/audio/sfx-swipe.mp3',0.1);
    audio.add('reload','./proto/audio/sfx-reload.mp3',0.1);

    const FPFOCUS = BatVines.FPS/2;
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
            'line-height': (1.5-amtFocus*0.5)*BatVines.GRIDSIZE+'px',

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
                'transform':'scale('+(5-amtThrow*4)+') rotate('+(-dir*10)+'deg)',
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

            $zone.css('visibility',self.isActive?'hidden':'visible');
            $batarang.css('opacity',self.isActive?1:0);

            $reticule.attr('active',self.isActive);
            $reticule.text(self.isActive?'':'OFF');
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
            'transform':'scale('+(5)+') rotate('+(-dir*10)+'deg)',
        });
    }
}

BatVinesArena = function(layout,puzzle) {

    let audio = new AudioContext();
    audio.add('fail','./proto/audio/plant-fail.mp3',1);
    audio.add('clear','./proto/audio/plant-clear.mp3',0.6);

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

        for(var r in puzzle.ropes){
            ropes[r] = new BatVinesRope( puzzle.ropes[r].x, puzzle.ropes[r].y, puzzle.ropes[r].length, puzzle.ropes[r].count );
            ropes[r].$el.appendTo(self.$el);
        }
        for(var a in puzzle.actors){
            actors[a] = new BatVinesActor( puzzle.actors[a].x, puzzle.actors[a].y, puzzle.actors[a].w, puzzle.actors[a].h, puzzle.actors[a].type, puzzle.actors[a].dir );
            actors[a].$el.appendTo(self.$el);
            actors[a].def = puzzle.actors[a];
        }
        for(var k in puzzle.knots){
            knots[k] = new BatVinesKnot(
                ropes[puzzle.knots[k].ropeLeft],
                ropes[puzzle.knots[k].ropeRight],
                actors[puzzle.knots[k].actor],
                puzzle.knots[k].isRespawn,
                );
        }
        
        for(var i=0; i<2; i++){
            players[i] = new BatVinesPlayer(i);
            players[i].$el.appendTo(self.$el);
        }

        $('<batvinesreset>').appendTo(self.$el).click(self.reset);
    }

    self.reset();

    self.step = function() {

       // $('targetmarker').remove();

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
            if( actors[a].spawning ){
                actors.push(actors[a].spawning);
                actors[a].spawning.$el.prependTo(self.$el);
                actors[a].spawning = undefined;
            }

            if(actors[a].type=='ivy' && actors[a].isReadyToMove){
                self.actorHandball = actors[a];
                actors[a].isReadyToMove = false;
            }
        }

        if(self.failState && !self.isFailed){
           
            self.isFailed = true;
            
            setTimeout(function(){
                audio.play('fail');
                self.$el.html(self.failState);
                $('<batvinesreset>').appendTo(self.$el).click(self.reset);
            },500);
        }
        if(complete && !self.isCleared){
            audio.play('clear');
            self.$el.html('CLEAR!');
            self.isCleared = true;
            for(var p in players) players[p].isActive = false;
        }
    }

    self.getDistance = function(a,b){
        return Math.hypot(a.x-b.x,a.y-b.y);
    }

    self.getTargetAt = function(pt){
        
        let min = 100;
        let targeting = undefined;

        for(var a in actors){
            let d = self.getDistance(pt,actors[a]);
            let size = 1;
            
            if(d<size){
                min = d;
                targeting = actors[a];
            }

            if(actors[a].subtargets){
                for(var s in actors[a].subtargets){
                    let d = self.getDistance(pt, actors[a].subtargets[s]);
                    if(d<1){
                         min = d;
                         targeting = actors[a].subtargets[s];
                    }
                }
            }
        }

        if(min>1) min = 1;

        if(!targeting){
            for(var r in ropes){

                for(var t in ropes[r].targets){
                    let d = self.getDistance(pt,ropes[r].targets[t]);
                    if(!ropes[r].isDamaged && d<min){
                        min = d;
                        targeting = ropes[r];
                    }
                }
            }
        }

        return targeting;
    }

    self.setPlayerPositions = function(positions){
        for(var n in players){

            let rx = 0;
            let ry = 0;

            if(layout.wall==0){
                rx = (positions[n].pz);
                ry = (positions[n].px);
            } else if(layout.wall==1){
                rx = positions[n].px;
                ry = (1-positions[n].pz);
            } else if(layout.wall==2){
                rx = (1-positions[n].pz);
                ry = (1-positions[n].px);
            }

            rx = rx*3 - 1;
            ry = ry*3 - 1;
               
            //get the grid position
            let gx = rx*BatVines.ARENA.W;
            let gy = ry*BatVines.ARENA.H;

            if(players[n].isActive){

                let isTargeting = self.getTargetAt({x:gx,y:gy});

                /*for(var r in ropes){
                    let dx = ropes[r].tx - gx;
                    let dy = ropes[r].ty - gy;
                    let d = Math.hypot(dx,dy);

                    if(!ropes[r].isCut && d<0.5) isTargeting = ropes[r];
                }*/



                if( isTargeting ) players[n].targeting++;
                else players[n].targeting = 0;

                if(players[n].isCutting){
                    players[n].reset();

                    if(isTargeting){
                        if(isTargeting.doCut) isTargeting.doCut(gx,gy);
                        else isTargeting.hitWithBatarang();
                    }
                   
                }
            }

            players[n].setPos(gx,gy);
        }
    }

    self.setActive = function(b){

        self.active = b;
        self.$el.attr('active',b);

        for(var n in players) players[n].reset();

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

    self.handballTo = function( actor, arena ){
        
        let iActor = actors.indexOf(actor);
        actors.splice(iActor,1);
        arena.addActor(actor);

        puzzle.actors.splice( puzzle.actors.indexOf(actor.def), 1 );
    }

    self.addActor = function( actor ){
        actors.push(actor);
        actor.$el.appendTo(self.$el);

        puzzle.actors.push( actor.def );
    }

}

BatVinesRope = function(x,y,length,count=1){
    let self = this;
    let cache = {x:x,y:y,length:length};

    self.x = x;
    self.y = y;
    self.length = length;
    
    self.thick = 1;

    

    self.targets = [];

    self.$el = $('<batrope>').css({left:self.x*BatVines.GRIDSIZE+'px',top:self.y*BatVines.GRIDSIZE+'px'});

    let $svg = $(`<svg viewBox='${-self.length} ${-self.length} ${self.length*2} ${self.length*2}' width=${self.length*2*BatVines.GRIDSIZE} height=${self.length*BatVines.GRIDSIZE*2}>
            <path vector-effect='non-scaling-stroke'></path>
            <path vector-effect='non-scaling-stroke'></path>
            <path vector-effect='non-scaling-stroke'></path>
        </svg>`).appendTo(self.$el);
    let $path = $svg.find('path');

    $path.each(function(n){

        if(n>=count) $(this).hide();
    })

    self.$target = $('<batvinestarget>');
    self.isCut = false;

    self.to = function(x2,y2,hang) {

    
        x2 -= x;
        y2 -= y;

        cache.x2 = x2;
        cache.y2 = y2;
        cache.hang = hang;

        $path.eq(0).attr('d',`M0,0 C 0 ${hang}, ${x2} ${hang}, ${x2} ${y2}`);
        $path.eq(1).attr('d',`M-0.5,0 C 0 ${hang}, ${x2-0.4} ${hang}, ${x2-0.4} ${y2+0.5}`);
        $path.eq(2).attr('d',`M0.5,0 C 0 ${hang}, ${x2+0.4} ${hang}, ${x2+0.4} ${y2-0.5}`);

        for(var i=0; i<5; i++){
            let pt = getPointOnBezier(0,0,0,hang,x2,hang,x2,y2,0.1*i);
            self.targets[i] = {x:self.x + pt.x, y:self.y+pt.y};
        }

        $path.css('stroke-width',2*self.thick*5+'px');
    }

    self.to(self.x,self.y+length,length);

    function getPointOnBezier(p0x,p0y,p1x,p1y,p2x,p2y,p3x,p3y,t){
        let x = (1-t)*(1-t)*(1-t)*p0x + 3*(1-t)*(1-t)*t*p1x + 3*(1-t)*t*t*p2x + t*t*t*p3x;
        let y = (1-t)*(1-t)*(1-t)*p0y + 3*(1-t)*(1-t)*t*p1y + 3*(1-t)*t*t*p2y + t*t*t*p3y;
        return {x:x,y:y};
    }

    self.doCut = function(gx,gy){
        
        if(!self.isDamaged){
            self.$cut = $('<batcut>').appendTo(self.$el).css({
                left:(gx-self.x)*BatVines.GRIDSIZE+'px',
                top:(gy-self.y)*BatVines.GRIDSIZE+'px',
            })

            if(count==1){
                self.length += 0.1;
                self.thick = 0.8;

                $(self).animate({length:self.length+0.4, thick:0.5},{duration:500,
                step:function(){
                    self.knot.rehang();
                },done:function(){
                    finaliseCut();
                }})

                self.isDamaged = true;
            } else{
                count--;
                
                $(self).animate({length:self.length+0.05, thick:self.thick-0.1},{duration:200,
                step:function(){
                    self.knot.rehang();
                },done:function(){
                    $path.eq(count).hide();
                    self.$cut.remove();
                }})
            }

            
        }
        
    }

    function finaliseCut(){
       self.$el.hide();
        self.isCut = true;
        self.$target.trigger('click');
    }

    self.reset = function(){
        self.$cut.remove();
       self.thick = 1;
       self.length = cache.length;
       self.isCut = false;
       self.isDamaged = false;
       self.$el.show();
    }

    self.doRespawnAnim = function(){

        //$path.css('stroke-width',0.3*self.thick+'px');
        let anim = { x:cache.x2, y:cache.y2 };

        $(anim).animate({x:0,y:0},{duration:250, ease:'linear', step:redraw, complete:redraw });

        function redraw(){
            $path.attr('d',`M${anim.x},${anim.y} C${anim.x},${cache.hang} ${cache.x2},${cache.hang} ${cache.x2},${cache.y2}`);
        }
    }
}

BatSineVine = function(from, to){

    const SEGMENTS = 30;
    const WAVES = 3;
    const AMPLITUDE = 60;

    let self = this;
    self.$el = $('<batsinevine>');

    let dx =  to.x-from.x;
    let dy = to.y-from.y;
    let dist = Math.hypot(dx,dy);

    let r = Math.atan2(dy,dx);
     self.$el.css({
        'top':from.y*BatVines.GRIDSIZE + 'px',
        'left':from.x*BatVines.GRIDSIZE + 'px',
        'transform':'rotate('+r+'rad)'
    });

    let $svg = $(`<svg preserveAspectRatio='none' viewBox='0 -2 1 4' width=${dist*BatVines.GRIDSIZE} height=${AMPLITUDE*2}>
            <path vector-effect='non-scaling-stroke' stroke='black' stroke-width='10px'></path>
        </svg>`).appendTo(self.$el);
    let $path = $svg.find('path');

    self.start = 0;
    self.progress = 0;
    self.offset = 0;

    self.redraw = function(){
        self.targets = [];

        
        let iMin = Math.round(SEGMENTS*self.start);
        let iMax = Math.round(SEGMENTS*self.progress);

        if(iMin<0) iMin = 0;
        if(iMax>SEGMENTS-1) iMax = SEGMENTS-1;

        let d = '';
        for(var i=iMin; i<iMax; i++){
            d = d + (i==iMin?' M ':' L ')+i/SEGMENTS+','+Math.sin(i/WAVES + self.offset);
        }

        $path.attr('d',d);
    }
}

BatVinesChomp = function( ivy, goody ){

    const SEGMENTS = 50;
    const WAVES = 3;
    const AMPLITUDE = 30;

    let dx =  goody.x-ivy.x;
    let dy = goody.y-ivy.y;
    let dist = Math.hypot(dx,dy);


    let r = Math.atan2(dy,dx);

    let self = this;
    self.$el = $('<batchomp>');
    self.$el.css('transform','rotate('+r+'rad)')
    let $mouth = $('<batchompmouth>').appendTo(self.$el);

    self.goody = goody;
   let $svg = $(`<svg preserveAspectRatio='none' viewBox='0 -2 1 4' width=${dist*BatVines.GRIDSIZE} height=${AMPLITUDE*2}>
            <path vector-effect='non-scaling-stroke' stroke='black' stroke-width='10px'></path>
        </svg>`).appendTo(self.$el);
    let $path = $svg.find('path');

    self.progress = 0;
    self.offset = 0;
    self.targets = [];

    function getXY(i,isGlobal){
        let x = dist*(i/SEGMENTS);
        let y = Math.sin(i/WAVES + self.offset)*AMPLITUDE/BatVines.GRIDSIZE;

        if(isGlobal){
            let r2 = Math.atan2(y,x);
            let dist = Math.hypot(x,y);

            return {
                x:ivy.x - Math.sin(r-Math.PI/2)*dist,
                y:ivy.y + Math.cos(r-Math.PI/2)*dist,
            }
        }

        return {x:x,y:y};
    }

    self.redraw = function(){

        self.targets = [];

        let d = 'M 0,0'
        let iMax = Math.floor(SEGMENTS*self.progress);

        for(var i=0; i<iMax; i++){
            d = d + ' L '+i/SEGMENTS+','+Math.sin(i/WAVES + self.offset);

            self.targets[i] = getXY(i,true);
            self.targets[i].doCut = self.doCut;
        }
        $path.attr('d',d);

        let iPrev = iMax?iMax-1:0;
        let x1 = dist*(iPrev/SEGMENTS)*BatVines.GRIDSIZE;
        let y1 = Math.sin(iPrev/WAVES + self.offset)*AMPLITUDE;

        let x = dist*(iMax/SEGMENTS)*BatVines.GRIDSIZE;
        let y = Math.sin(iMax/WAVES + self.offset)*AMPLITUDE;

        let r = Math.atan2(y-y1, x-x1);

        $mouth.css({
            left:x,
            top:y,
            transform:'rotate('+r+'rad)',
        });


    }

    self.step = function(){
        if(self.progress < 1) self.progress += 0.03/dist;
        else self.progress = 1;
        self.offset += 0.03;
        self.redraw();
    }

    self.doCut = function(){
        self.$el.hide();
        self.dead = true;
    }

    //$(self).animate({progress:1,offset:0},{duration:dist*700,step:self.redraw,ease:'linear'});
}

BatVinesActor = function(x,y,w,h,type,dir){

    const SIZE = {
        'goody':{w:1.5,h:1.5},
        'mouth':{w:2,h:2},
        'bigmouth':{w:4,h:4},
        'baddy':{w:3,h:3},
        'spitter':{w:2.5,h:2.5},
        'tentacle':{w:2,h:2},
        'ivy':{w:0,h:4},
        'arrow':{w:1,h:0.5},
        'fragment':{w:1.5,h:1.5},
        'bomb':{w:2,h:2},
        'beam':{w:4,h:1},
    }

    if(SIZE[type]){
        w = SIZE[type].w;
        h = SIZE[type].h;
    }

    const STOMP = 0.03;
    const WALK = 0.05;
    const SPIT = 1.2;
    const RUN = 0.07;
    const CHASE = 0.1;

    let self = this;
    self.x = x;
    self.y = y;
    self.sy = 0;
    self.w = w;
    self.h = h;
    self.type = type;
    self.grounded = 0;
    self.gravity = false;
    self.active = true;
    self.dead = false;
    self.failState = undefined;
    self.complete = (type !='goody' && type!='bigmouth');
    self.isAttacking = false;
    self.dir = dir?dir:1;
    self.pause = 0;
    self.state = undefined;

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
            transform:'translate(-50%, -50%) rotate('+rot+'deg) scaleX('+self.dir+')',
        }) .attr('state',self.state);

    }

    let nFrame = -1;

    self.step = function(){

        if(!self.active) return;

        nFrame ++;


        if(self.dead){

           if(self.$el.attr('type')){
                self.$el.removeAttr('type');
                new BatVinesPop(0,0,self.w*BatVines.GRIDSIZE,self.h*BatVines.GRIDSIZE).$el.appendTo(self.$el);
                
                if(self.type=='goody') self.failState = 'You killed a goody!';
                if(self.type=='bomb') self.failState = 'The bomb exploded!';
           }
        
            return;
        }

        //APPLY GRAVITY 

        if(self.gravity) self.sy += BatVines.GRAVITY;
        self.y += self.sy;

        if((self.y+self.h/2) > BatVines.ARENA.H){
            self.y = BatVines.ARENA.H-self.h/2;
            self.sy = 1;
            self.grounded ++;


            
            self.$el.attr('grounded','true');

            if(self.type=='goody'){
                //self.dir = (self.x<BatVines.ARENA.W/2)?-1:1;
                self.x += RUN * self.dir;
                 if(self.x < 0 || self.x > BatVines.ARENA.W) self.complete = true;
            }

            if(self.type=='bomb') self.dead = true;
        }

        //DO UNIQUE BEHAVIOURS

        if(self.type=='baddy' && !self.isAttacking && self.pause--<0){
            //back and forth
            self.x += self.dir * STOMP;
            if(self.dir == 1 && self.x>BatVines.ARENA.W){
                self.pause = BatVines.FPS/2;
                self.dir = -1;
            }
            if(self.dir == -1 && self.x<0){
                self.pause = BatVines.FPS/2;
                self.dir = 1;
            }
        }

        if(self.type=='arrow'){
            self.x += self.dir * SPIT;
            if(self.x<0 || self.x>BatVines.ARENA.W) self.dead = true;
        }

        if(self.type=='spitter'){
            // NOTE Spitter used to be a timed thing. Now he spits when he sees you.
            //self.state = (nFrame%BatVines.FPS*2 < BatVines.FPS*1)?'spit':'inhale';
            //if(nFrame%BatVines.FPS*2==0) self.spawning = new BatVinesActor( self.x, self.y, 2, 1, "arrow", self.dir);
        }

        if(self.type=='ivy'){
            
            self.subtargets = [];
            
            //if(!self.targetX) self.targetX = 0.5 * BatVines.ARENA.W; 
            //let dx = self.targetX - self.x;
            //let dir = dx>0?1:-1;

            if(self.grounded && self.state != 'transition'){
                
                if(self.state=='attack'){
                    //check for chomp death
                    let allChompsDead = true;
                    for(var c in self.chomps) if(!self.chomps[c].dead) allChompsDead = false;

                    if(allChompsDead){
                        console.log('all chomps dead');
                        //move to next arena
                        self.targetX = BatVines.ARENA.W;
                        self.state = 'transition';
                        self.y = BatVines.ARENA.H - self.h/2;
                        
                        self.gravity = false;
                        self.grounded = false;

                        self.sy = -0.075;

                        
                        let from = { x:0.5*BatVines.ARENA.W, y:BatVines.ARENA.H };
                        let to = { x:0.5*BatVines.ARENA.W, y:0 };
                        for(var i=0; i<3; i++){

                            let vine = new BatSineVine(from,{x:to.x-1+i,y:to.y});
                            vine.$el.appendTo( self.$el.parent() );
                            vine.offset = Math.PI*2/3*i;
                            vine.progress = 0.1 + i*0.1;
                            vine.start = -1 + 0.2 * i;
                            $(vine).animate({progress:2,start:1},{duration:3500 + i*300,step:vine.redraw,complete:vine.$el.remove});
                        }
                        

                       
                        
                    }
                } else{
                    //unleash the vines
                    self.state = 'attack';
                } 
            } else if( self.state == 'transition' ){

               if(self.y < -h/2 - 10){ // adding the 10 here creates a nice delay between appearances
                    self.isReadyToMove = true;
                    self.state = 'idle';
                    self.y = -h/2;
                    self.chomps = undefined;

                }
            } else if(self.state==undefined || self.state=='idle'){
                //falling
                self.gravity = true;
            }
        }

        // REDRAW
        self.to(self.x,self.y);
    }

    self.interactWith = function(other) {

        if(self.dead || other.dead) return;

        self.isAttacking = false;

        let dx = other.x - self.x;
        let dy = other.y - self.y;
        let d = Math.hypot(dx,dy);
        let dir = dx>0?1:-1;

        let isOtherEnemy = ( other.type=='baddy' || other.type=='spitter' || other.type=='mouth' || other.type=='bigmouth' );
        let isAttacker = ( self.type=='baddy' || self.type=='spitter' || self.type=='ivy' );
        let shouldAttack = (isAttacker && other.type=='goody' && dir == self.dir);

        if(d<1.5){
            //BAD THING HIT OTHER THING
            if(self.type=='arrow' && other.type=='goody'){
                other.dead = true;
                self.dead = true;
            }
            if(self.type=='mouth' && other.type=='goody') other.dead = true;
            if(self.type=='fragment' && !self.grounded){
                self.dead = true;
                other.dead = true;
            }
            if(shouldAttack) other.dead = true;

            if(self.type=='bigmouth' && other.type=='bomb'){
                other.active = false;
                other.$el.hide();
                self.state = 'chew';

                setTimeout(function(){
                    self.dead = true;
                },500);

                setTimeout(function(){
                    self.complete = true;
                },1500);
            }
        }

        if(self.type=='spitter' && shouldAttack && Math.abs(dy) < 1 && self.state != 'spit'){

            self.state = 'spit';
            self.spawning = new BatVinesActor( self.x, self.y, 2, 1, "arrow", self.dir);
        }

        if(self.type=='baddy' && shouldAttack && Math.abs(dy) < 1){
            //CHASE THE HUMAN!
            self.isAttacking = true;
            self.dir = dx>0?1:-1;
            self.x += self.dir*CHASE;
        }

        if(self.type=='goody' && isOtherEnemy && Math.abs(dy) < 1){
            self.dir = -dir;
        }

        if(self.type=='ivy' && self.state=='attack' && other.type=='goody' && !other.complete ){
            
            if( !self.chomps ) self.chomps = [];

            //look for existing chomp
            let chomp;
            for(var c in self.chomps) if(self.chomps[c].goody == other) chomp = self.chomps[c];
            
            if(!chomp){
                chomp = new BatVinesChomp( self, other );
                chomp.$el.appendTo(self.$el);
                self.chomps.push( chomp );
            }

            if(!chomp.dead){
                chomp.step();
                if(chomp.progress==1) chomp.goody.dead = true;
                self.subtargets = self.subtargets.concat(chomp.targets);
            }
        }
    }

    self.hitWithBatarang = function(){
        if(self.type=='goody') self.dead = true;
    }
}

GetHeightForEllipse = function (circumference, width) {
    const a = width / 2; // Semi-major axis
    const pi = Math.PI;

    // Function for the approximate circumference formula
    function ellipseCircumference(a, b) {
        return pi * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
    }

    // Use Newton's method to solve for b
    let b = a; // Start with an initial guess, e.g., a circle
    let tolerance = 1e-6; // Accuracy threshold
    let maxIterations = 100;
    let iteration = 0;

    while (iteration < maxIterations) {
        const currentCircumference = ellipseCircumference(a, b);
        const error = currentCircumference - circumference;

        if (Math.abs(error) < tolerance) {
            break; // Found solution
        }

        // Derivative approximation for Newton's method
        const delta = 1e-6;
        const derivative = 
            (ellipseCircumference(a, b + delta) - currentCircumference) / delta;

        // Update b using Newton's method
        b -= error / derivative;
        iteration++;
    }

    return b * 2; // Return the full height
}




BatVinesKnot = function(left,right,slave,isRespawn){

    let self = this;

    let mx;
    let my;

    self.rehang = function(){

        if(left && !left.isCut && right && !right.isCut){

            left.$el.css({left:left.x*BatVines.GRIDSIZE+'px',top:left.y*BatVines.GRIDSIZE+'px'});
            right.$el.css({left:right.x*BatVines.GRIDSIZE+'px',top:right.y*BatVines.GRIDSIZE+'px'});

            let length = left.length + right.length;
            let width = right.x-left.x;

            let hArc = GetHeightForEllipse(length*2,width);

            mx = ((left.x + left.length) + (right.x - right.length))/2;

            let oxLeft = Math.abs(left.x-mx);
            let oxRight = Math.abs(right.x-mx);

            let hangLeft = left.length - oxLeft;
            let hangRight = right.length - oxRight;

            my = Math.min( left.y + hangLeft, right.y + hangRight );

            left.to(mx,my,hangLeft);
            right.to(mx,my,hangRight);
            slave.to(mx,my);
        } else {

            let only = left.isCut?right:left;
           
            
            mx = only.x;
            my = only.y+only.length;
            only.to(mx,my,my);
            slave.to(mx,my);
            
        }
    }
   
    if(left) left.knot = self;
    if(right) right.knot = self;

    self.rehang();

    function drop(){
       
        if(left){
            $(left).stop();
            left.$el.hide();
            left.isCut = true;
        }
        if(right){
            $(right).stop();
            right.$el.hide();
            right.isCut = true;
        }

        slave.gravity = true;
    }

    function respawn(){
        let respawner = left.isCut?left:right;

        respawner.reset();
        self.rehang();
        respawner.doRespawnAnim();
    }

    function dangle(){
        let rope = left.isCut?right:left;
        
        let pos = {x:mx,y:my};
        $(pos).animate({x:rope.x,y:rope.y+rope.length},{duration:500,easing:'easeOutBack',step:function(value,prop){
           
            let ox = Math.abs(rope.x-pos.x);
            let hang = rope.length - ox;

            rope.to(pos.x,pos.y,hang);
            slave.to(pos.x,pos.y);
        }});
    }

    function onCut(){
    
        let isBoth = (!left || left.isDamaged) && (!right || right.isDamaged);
        

        if(isBoth) drop();
        else if( isRespawn ) respawn();
        else dangle();
    }


    if( right ) right.$target.click(function(){ 
        right.isCut = true;
        onCut(); 
    })

    if( left ) left.$target.click(function(){
        left.isCut = true;
        onCut();
    })
}

BatVinesGame = function(){

    BatVines = {};
    BatVines.FPS = 50;
    BatVines.W = 1600;
    BatVines.H = 1000;
    BatVines.GRIDSIZE = 50;
    BatVines.GRAVITY = 0.015;
    BatVines.ARENA = {W:16,H:10};

    $("head").append(`
        <style>

            @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap');

            @keyframes batspin{
                0%{
                    transform: rotate(0deg);
                }
                100%{
                    transform: rotate(360deg);
                }
            }

            @keyframes sprite6{
                0%{
                    background-position-x: 0%;
                }
                100%{
                     background-position-x: -600%;
                }
            }

            @keyframes sprite4{
                0%{
                    background-position-x: 0%;
                }
                100%{
                     background-position-x: -400%;
                }
            }

             @keyframes sprite4pause{
                0%{
                    background-position-x: 0%;
                }
                40%{
                    background-position-x: 0%;
                }
                100%{
                     background-position-x: -400%;
                }
            }

            batsinevine{
                display: block;
                position: absolute;
            }

            batchomp:before{
                content:"";
                display:block;
                position: absolute;
                width: 20px;
                height: 20px;
                background: red;
                top: -10px;
                left: -10px;
                border-radius: 100px;
            }

            batchomp{
                display: block;
                position: absolute;
                top: 50%;
            }

             batchompmouth{
                display: block;
                position: absolute;
                top: 0px;
                left: 0px;
            }

            batchompmouth:after{
                content:" ";
                display: block;
                position: absolute;
                width: ${BatVines.GRIDSIZE}px;
                height: ${BatVines.GRIDSIZE}px;
                background: url(./proto/img/plant-chomp.png);
                background-size: 100%;
                position: absolute;
                top: 0px;
                left: 0px;
                transform: translate(-50%, -50%);
            }

            batsinevine svg, batchomp svg{
                position: absolute;
                top: 0px;
                left: 0px;
                transform: translateY(-50%);
            }

            batvinespop{
                display:block;
                position:absolute;
            }

            batvinesparticle{
                display:block;
                position:absolute;
                background:white;
                transform:translate(-50%,-50%);
                border-radius: 100%;
            }

            batvinesgame{
                display:block;
                width: ${BatVines.W*3}px;
                height: ${BatVines.H}px;
                transform-origin: top left;
                text-align: center;
                pointer-events: none;
                background: green;
                font-family: "Lexend", serif;
                font-weight:100;
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
                opacity: 0.8;
                
            }

           batvinesarena{
                position: absolute;
                display: inline-block;
                width: ${BatVines.ARENA.W*BatVines.GRIDSIZE}px;
                height: ${BatVines.ARENA.H*BatVines.GRIDSIZE}px;
               
                
                line-height: ${BatVines.ARENA.H*BatVines.GRIDSIZE}px;
                font-size: ${BatVines.GRIDSIZE*1.5}px;
                transform-origin: top left;
                color: white;

                transition: all 0.5s;

           }   

           batvinesreset{
            position: absolute;
            top: ${-2*BatVines.GRIDSIZE}px;
            left: ${-4*BatVines.GRIDSIZE}px;
            width: ${3*BatVines.GRIDSIZE}px;
            height: ${3*BatVines.GRIDSIZE}px;
           
            background: no-repeat center url(./proto/img/reset-ccw.svg);
            background-size: 50%;
            margin: auto;
            z-index: 4;
            pointer-events: auto;
           }

           batvineszoomout{
             position: absolute;
            top: ${3*BatVines.GRIDSIZE}px;
            right:${3*BatVines.GRIDSIZE}px;
           
            width: ${3*BatVines.GRIDSIZE}px;
            height: ${3*BatVines.GRIDSIZE}px;
           
            background: no-repeat center url(./proto/img/zoom-out.svg);
            background-size: 50%;
            z-index: 4;
            pointer-events: auto;
           }

           batvinesarena batvinesreticule,
           batvinesarena batvinestarget,
           batvinesarena batvinesbatarang,
           batvinesarena batvineszone,
           batvinesarena batvinesreset
           {
                display: none;
           }

           batvinesarena[active='true'] batvinesreticule,
           batvinesarena[active='true'] batvinestarget,
           batvinesarena[active='true'] batvinesbatarang,
           batvinesarena[active='true'] batvineszone,
           batvinesarena[active='true'] batvinesreset
           {
                display: block;
           }

           batzoombutton{
                position: absolute;
                display: block;
                position: absolute;
                pointer-events: auto;
                background: rgba(255,255,255,0.1);
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
            height: 200px;
            background-color: rgba(0,0,0,0.3);
            background-image: url(./proto/img/plant-floor.png);
            background-size: 5%;
           
            backgrounnd-repeat: repeat-x;
 
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
                background: rgba(255,0,0,0.2);
                transform: translate(-50%, -50px) rotate(15deg);

                border: 4px dashed red;
                color: red;
                font-weight: 300;
                line-height: ${BatVines.GRIDSIZE}px;
                font-size: ${BatVines.GRIDSIZE}px;
                padding-top: ${BatVines.GRIDSIZE}px;
               
                animation: flash;
                animation-duration: 0.5s;
                animation-iteration-count: infinite;
           }

           batvineszone:after{

            content:"START HERE";
           
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
                
                color: red;
                font-weight: 300;
               
               font-size: ${BatVines.GRIDSIZE}px;
               animation: flash;
                animation-duration: 0.5s;
                animation-iteration-count: infinite;
           }

           batvinesreticule[active='true']{
            animation: none;
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
            background: rgba(0,0,255,0.2);
            color: blue;
            transform: translate(-50%, -50px) rotate(-15deg);

           }


           batvinesplayer:last-of-type batvinesreticule:before,
           batvinesplayer:last-of-type batvinesreticule:after
           {
             border-color: blue;
           }

           batvinesplayer:last-of-type batvinesreticule{
            color: blue;
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
               
                
                transform: translate(-50%,-50%);
                background-size: 100%;
           }

           batactor[type="beam"]{
                background-image: url(./proto/img/plant-beam.png);
                background-size: 100%;
           }

           batactor[type="baddy"]{
                background-image: url(./proto/img/plant-walk.png);
                background-size: 400%;
               
                animation: sprite4;
                animation-iteration-count: infinite;
                animation-timing-function: steps(4);
                animation-duration: 0.7s;
                animation-fill-mode: forwards;
           }

           

            batactor[type="tentacle"]:after{
                content:"";
                display: block;
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background-image: url(./proto/img/plant-tentacle.png);
                background-size: 600%;
                animation: sprite6;
                animation-timing-function: steps(6);
                animation-duration: 0.5s;
                animation-fill-mode: forwards;
                animation-iteration-count: infinite;
           }

           batactor[type="tentacle"][grounded]:after{
                background-image: url(./proto/img/plant-tentacle-dead.png);
                background-size: 100%;
           }

            batactor[type="ivy"]{
                transform: translate(0px,0px);
            }

            batactor[type="ivy"]:after{
                content:"";
                display: block;
                position: absolute;
                background-image: url(./proto/img/plant-ivy.png);
                background-size: 100%;
                transform: translateX(-50%);
                width: ${4*BatVines.GRIDSIZE}px;
                height: ${4*BatVines.GRIDSIZE}px;
                top: 0px;
                left: 0px;
           }

            batactor[type="ivy"][state="attack"]:after{
                 background-image: url(./proto/img/plant-ivy-squat.png);
            }

           batactor[type="spitter"]{
                background-image: url(./proto/img/plant-spitter.png);
                background-size: 100%;
           }

           batactor[type="spitter"][state='spit']{
                
           }

           batactor[type="arrow"]{
                background-image: url(./proto/img/plant-spit-arrow.png);

                background-position: center;
                background-repeat: no-repeat;
           }

           

            batactor[type="goody"]{
                background-image: url(./proto/img/plant-dude.png);
                background-size: 400%;
               
                animation: sprite4;
                animation-iteration-count: infinite;
                animation-timing-function: steps(4);
                animation-duration: 0.7s;
                animation-fill-mode: forwards;
           }

           

           batactor[type="mouth"], batactor[type="bigmouth"]{
                background-image: url(./proto/img/plant-bigmouth.png);
                 background-size: 400%;
                
                animation: sprite4;
                animation-iteration-count: infinite;
                animation-timing-function: steps(4);
                animation-duration: 0.7s;
                animation-fill-mode: forwards;
           }

           batactor[type="bigmouth"][state="chew"]{
             background: url(./proto/img/plant-bigmouth-chew.png);
             background-size: 100%;
           }



            batactor[type="bomb"]{
                 background-image: url(./proto/img/plant-bomb.png);
           }

            batactor[type="fragment"]{
                 background-image: url(./proto/img/plant-fragment.png);
           }

            batactor[type="fragment"][grounded]{
                background-image: url(./proto/img/plant-fragment-dead.png);
           }

            batactor[type="spitter"][grounded]{
                background-image: url(./proto/img/plant-spitter-grounded.png);
           }

           batrope svg{
               transform: translate(-50%,-50%);
           }

           path{
                stroke: black;
                fill: none;
           }

           batvinestarget{
            display: block;
            position: absolute;
            width: ${BatVines.GRIDSIZE}px;
            height: ${BatVines.GRIDSIZE}px;
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

           batvineszoomout{
            display: none;
           }

            batvineswall[active='true'] batvineszoomout{
                display: block;
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

           batcut{
             width: ${BatVines.GRIDSIZE*2}px;
            height: ${BatVines.GRIDSIZE*2}px;
            background: url(./proto/img/plant-cut.png);
            background-size: 100%;
            position: absolute;
            display:block;
            transform: translate(-50%, -50%);
           }

           batvineskip{
            position:absolute;
            bottom: 200px;
            left: 0px;
            right: 0px;
            padding: 50px;
            font-size: 50px;
            color: white;
            pointer-events: auto;
           }

        batvineswall[active='false'] batvinesgoggles{
            background: black;
           }

           @keyframes flash{
            0%{
                opacity:1;
            }

            50%{
                opacity:0.5;
            }

            100%{
                opacity:1;
            }
           }
           

        </style>
    `);

    let self = this;
    self.$el = $('<igb>');

    // standard arena position and scale for testing
    const MX = BatVines.W/2 - BatVines.ARENA.W/2*BatVines.GRIDSIZE/2;
    const MY = BatVines.H/2 - BatVines.ARENA.W/2*BatVines.GRIDSIZE/2;
    const S = 0.5;


    const LEVELS = [

        [
            //LEVEL 0 //VINES
            {puzzle:0,wall:1,x:MX,y:MY,scale:S},
        ],
        [
            //LEVEL 0 //VINES
            {puzzle:1,wall:1,x:MX,y:MY,scale:S},
            {puzzle:2,wall:2,x:MX,y:MY,scale:S},
        ],
        [
            //LEVEL 1 //MOUTHS
            {puzzle:3,wall:0,x:MX,y:MY,scale:S},
            {puzzle:4,wall:1,x:MX,y:MY,scale:S},
            {puzzle:5,wall:2,x:MX,y:MY,scale:S},
        ],
        [
            //LEVEL 2 //FRAGMENTS
            {puzzle:6,wall:0,x:MX,y:MY,scale:S},
            {puzzle:7,wall:1,x:MX,y:MY,scale:S},
            {puzzle:8,wall:2,x:MX,y:MY,scale:S},
        ],
        [
            //LEVEL 3 //WALKERS
            {puzzle:9,wall:0,x:MX,y:MY,scale:S},
            {puzzle:10,wall:1,x:MX,y:MY,scale:S},
            {puzzle:11,wall:2,x:MX,y:MY,scale:S},
        ],
        [
            //LEVEL 4 //SIMULTANEOUS
            {puzzle:12,wall:0,x:MX,y:MY,scale:S},
            {puzzle:13,wall:1,x:MX,y:MY,scale:S},
            {puzzle:14,wall:2,x:MX,y:MY,scale:S},
        ],
        [
            //LEVEL 5 //SPITTERS
            {puzzle:15,wall:0,x:MX,y:MY,scale:S},
            {puzzle:16,wall:1,x:MX,y:MY,scale:S},
            {puzzle:17,wall:2,x:MX,y:MY,scale:S},
        ],
        [
            //LEVEL 6 //IVY
            {puzzle:18,wall:0,x:MX,y:MY,scale:S},
            {puzzle:19,wall:1,x:MX,y:MY,scale:S},
            {puzzle:20,wall:2,x:MX,y:MY,scale:S},
        ],
        [
            //LEVEL 7 //BOMB
            {puzzle:21,wall:1,x:MX,y:MY,scale:S},
        ]
    ]

    const PUZZLES = [
        
        {
            //LEVEL 1a Two citizens. Two vines.
            ropes:[
                {x:BatVines.ARENA.W*0.4,y:0,length:3}, 
                {x:BatVines.ARENA.W*0.6,y:0,length:5} 
            ],
            actors:[ 
                {type:'goody'},
                {type:'goody'}
            ],
            knots:[
               {ropeLeft:0,ropeRight:-1,actor:0},
               {ropeLeft:1,ropeRight:-1,actor:1},
            ],
        },
        {
            //LEVEL 1b One citizen. One double-vine.
            ropes:[
                {x:BatVines.ARENA.W*0.3,y:0,length:7}, 
                {x:BatVines.ARENA.W*0.6,y:0,length:6} 
            ],
            actors:[ 
               {type:'goody'}
            ],
            knots:[
               {ropeLeft:0,ropeRight:1,actor:0},
            ],
        },
        {
            //LEVEL 1c Two citizen. Two double-vines.
            ropes:[
                {x:BatVines.ARENA.W*0.3,y:0,length:6}, 
                {x:BatVines.ARENA.W*0.5,y:0,length:8},
                {x:BatVines.ARENA.W*0.6,y:0,length:5}, 
                {x:BatVines.ARENA.W*0.8,y:0,length:5}, 
            ],
            actors:[ 
               {type:'goody'},
               {type:'goody'}
            ],
            knots:[
               {ropeLeft:0,ropeRight:2,actor:0},
               {ropeLeft:1,ropeRight:3,actor:1},
            ],
        },
        {
            //LEVEL 2a One double-vine citizen. One mouth monster.
            ropes:[
                {x:BatVines.ARENA.W*0.3,y:0,length:6}, 
                {x:BatVines.ARENA.W*0.7,y:0,length:6} 
            ],
            actors:[ 
                {type:'goody'},
                {x:BatVines.ARENA.W*0.3,y:BatVines.ARENA.H,type:'mouth'},
            ],
            knots:[
               {ropeLeft:0,ropeRight:1,actor:0},
            ],
        },
        {
            //LEVEL 2b Two double-vine citizens. One mouth monster. // VERY GOOD PUZZLE
            ropes:[
                {x:BatVines.ARENA.W*0.3,y:0,length:6}, 
                {x:BatVines.ARENA.W*0.5,y:0,length:8},
                {x:BatVines.ARENA.W*0.6,y:0,length:5}, 
                {x:BatVines.ARENA.W*0.8,y:0,length:5}, 
            ],
            actors:[
                {type:'goody'},
                {type:'goody'},
                {x:BatVines.ARENA.W*0.55,y:BatVines.ARENA.H,type:'mouth'},
            ],
            knots:[
               {ropeLeft:0,ropeRight:2,actor:0},
               {ropeLeft:1,ropeRight:3,actor:1},
            ],
        },
        {
            //LEVEL 2c Three double-vine citizens. Two mouth monsters.
            ropes:[
                {x:BatVines.ARENA.W*0.2,y:0,length:6}, 
                {x:BatVines.ARENA.W*0.3,y:0,length:8},
                {x:BatVines.ARENA.W*0.4,y:0,length:8},
                {x:BatVines.ARENA.W*0.5,y:0,length:8},
                {x:BatVines.ARENA.W*0.6,y:0,length:5}, 
                {x:BatVines.ARENA.W*0.8,y:0,length:5}, 
            ],
            actors:[
                {type:'goody'},
                {type:'goody'},
                {type:'goody'},
                {x:BatVines.ARENA.W*0.55,y:BatVines.ARENA.H,type:'mouth'},
            ],
            knots:[
               {ropeLeft:0,ropeRight:2,actor:0},
               {ropeLeft:1,ropeRight:4,actor:1},
               {ropeLeft:3,ropeRight:5,actor:2},
            ],
        },
        {
            //Level 3a One fragment. Two mouth monsters. One citizen.
            ropes:[
                {x:BatVines.ARENA.W*0.5,y:0,length:6},
                {x:BatVines.ARENA.W*0.7,y:0,length:3},
            ],
            actors:[
                {type:'goody'},
                {type:'fragment'},
                {x:BatVines.ARENA.W*0.3,y:BatVines.ARENA.H,type:'mouth'},
                {x:BatVines.ARENA.W*0.7,y:BatVines.ARENA.H,type:'mouth'},
            ],

            knots:[
                {ropeLeft:0,ropeRight:-1,actor:0},
                {ropeLeft:1,ropeRight:-1,actor:1},
            ],
        },
        {
            //Level 3b One double-vine fragment. Two mouth monsters. One citizen.
            ropes:[
                {x:BatVines.ARENA.W*0.55,y:0,length:3},
                {x:BatVines.ARENA.W*0.3,y:0,length:9},
                {x:BatVines.ARENA.W*0.7,y:0,length:9},
            ],
            actors:[
                {type:'goody'},
                {type:'fragment'},
                {x:BatVines.ARENA.W*0.3,y:BatVines.ARENA.H,type:'mouth'},
                {x:BatVines.ARENA.W*0.7,y:BatVines.ARENA.H,type:'mouth'},
            ],

            knots:[
                {ropeLeft:0,ropeRight:-1,actor:0},
                {ropeLeft:1,ropeRight:2,actor:1},
            ],
        },
        {
            //Level 3c One double-vine fragment. Two mouth monsters. Two citizen.
            ropes:[
                {x:BatVines.ARENA.W*0.1,y:0,length:8},
                {x:BatVines.ARENA.W*0.45,y:0,length:7},
                {x:BatVines.ARENA.W*0.5,y:0,length:3},
                {x:BatVines.ARENA.W*0.55,y:0,length:9},
                {x:BatVines.ARENA.W*0.9,y:0,length:9},
            ],
            actors:[
                {type:'fragment'},
                {type:'goody'},
                {type:'fragment'},
                {x:BatVines.ARENA.W*0.1,y:BatVines.ARENA.H,type:'mouth'},
                {x:BatVines.ARENA.W*0.5,y:BatVines.ARENA.H,type:'mouth'},
                {x:BatVines.ARENA.W*0.9,y:BatVines.ARENA.H,type:'mouth'},
            ],

            knots:[
                
                {ropeLeft:0,ropeRight:1,actor:0},
                {ropeLeft:2,ropeRight:-1,actor:1},
                {ropeLeft:3,ropeRight:4,actor:2},
               
            ],
        },
        {
            //Level 4a Two citizens. One Monster.
            ropes:[
                {x:BatVines.ARENA.W*0.2,y:0,length:5},
                {x:BatVines.ARENA.W*0.8,y:0,length:5},
            ],
            actors:[
                {type:'goody'},
                {type:'goody'},
                {x:BatVines.ARENA.W*0.1,y:BatVines.ARENA.H,type:'baddy'},
            ],

            knots:[
                {ropeLeft:0,ropeRight:-1,actor:0},
                {ropeLeft:1,ropeRight:-1,actor:1},
            ],
        },
        {
            //Level 4b Two double-vine citizens. One Monster.
            ropes:[
                {x:BatVines.ARENA.W*0.2,y:0,length:8},
                {x:BatVines.ARENA.W*0.4,y:0,length:6},
                {x:BatVines.ARENA.W*0.6,y:0,length:6},
                {x:BatVines.ARENA.W*0.8,y:0,length:8},
            ],
            actors:[
                {type:'goody'},
                {type:'goody'},
                {x:BatVines.ARENA.W*0.1,y:BatVines.ARENA.H,type:'baddy'},
            ],

            knots:[
                {ropeLeft:0,ropeRight:1,actor:0},
                {ropeLeft:2,ropeRight:3,actor:1},
            ],
        },
        {
            //Level 4c One fragment. Two crawling monsters. One citizen.
            ropes:[
                {x:BatVines.ARENA.W*0.3,y:0,length:3},
                {x:BatVines.ARENA.W*0.7,y:0,length:5},
            ],
            actors:[
                {type:'fragment'},
                {type:'goody'},
                {x:BatVines.ARENA.W*0.1,y:BatVines.ARENA.H,type:'baddy'},
                {x:BatVines.ARENA.W*0.9,y:BatVines.ARENA.H,type:'baddy'},
            ],

            knots:[
                {ropeLeft:0,ropeRight:-1,actor:0},
                {ropeLeft:1,ropeRight:-1,actor:1},
            ],
        },
        {
            // cut at same time
            ropes:[
                {x:BatVines.ARENA.W*0.2,y:0,length:5},
                {x:BatVines.ARENA.W*0.5,y:0,length:7},
                {x:BatVines.ARENA.W*0.7,y:0,length:6},
               
            ],
            actors:[
                 {type:'goody'},
                 {type:'fragment'},
                 {x:BatVines.ARENA.W*0.3,y:BatVines.ARENA.H,type:'mouth'},
                 {x:BatVines.ARENA.W*0.9,y:BatVines.ARENA.H,type:'mouth'},
            ],

            knots:[
                {ropeLeft:0,ropeRight:1,actor:1},
                {ropeLeft:2,actor:0},
            ],
        },
         {
            // cut at same time
            ropes:[
                 {x:BatVines.ARENA.W*0.5,y:0,length:3},

                {x:BatVines.ARENA.W*0.1,y:0,length:6},
                {x:BatVines.ARENA.W*0.4,y:0,length:6},
                {x:BatVines.ARENA.W*0.3,y:0,length:8},
                {x:BatVines.ARENA.W*0.7,y:0,length:8},
                {x:BatVines.ARENA.W*0.6,y:0,length:6},
                {x:BatVines.ARENA.W*0.9,y:0,length:6},

               
               
            ],
            actors:[
                {type:'goody'},

                {type:'fragment'},
                {type:'fragment'},
                {type:'fragment'},
                 
                 {x:BatVines.ARENA.W*0.25,y:BatVines.ARENA.H,type:'mouth'},
                 {x:BatVines.ARENA.W*0.5,y:BatVines.ARENA.H,type:'mouth'},
                 {x:BatVines.ARENA.W*0.75,y:BatVines.ARENA.H,type:'mouth'},
         
            ],

            knots:[
                {ropeLeft:0,actor:0},
                {ropeLeft:1,ropeRight:2,actor:1},
                {ropeLeft:3,ropeRight:4,actor:2},
                {ropeLeft:5,ropeRight:6,actor:3},

            ],
        },
        {
            // cut at same time
            ropes:[
                 {x:BatVines.ARENA.W*0.4,y:0,length:3},

                {x:BatVines.ARENA.W*0,y:0,length:5},
                {x:BatVines.ARENA.W*0.3,y:0,length:5},
                {x:BatVines.ARENA.W*0.5,y:0,length:8},
                {x:BatVines.ARENA.W*0.8,y:0,length:8},
                {x:BatVines.ARENA.W*1,y:0,length:5},

               
               
            ],
            actors:[
                {type:'goody'},

                {type:'fragment'},
                {type:'fragment'},
                {type:'fragment'},
                 
                 {x:BatVines.ARENA.W*0.15,y:BatVines.ARENA.H,type:'mouth'},
                 {x:BatVines.ARENA.W*0.5,y:BatVines.ARENA.H,type:'baddy'},
                 {x:BatVines.ARENA.W*0.8,y:BatVines.ARENA.H,type:'mouth'},
         
            ],

            knots:[
                {ropeLeft:0,actor:0},
                {ropeLeft:1,ropeRight:2,actor:1},
                {ropeLeft:3,ropeRight:4,actor:2},
                {ropeLeft:5,actor:3},

            ],
        },
        {
            // spitter
            ropes:[
                {x:BatVines.ARENA.W*0.2,y:0,length:8},
                {x:BatVines.ARENA.W*0.6,y:0,length:8},
                {x:BatVines.ARENA.W*0.4,y:0,length:4},
                {x:BatVines.ARENA.W*0.7,y:0,length:5},
            ],
            actors:[
                
                {dir:1,type:'spitter'},
                {type:'goody'},
            ],

            knots:[
                {ropeLeft:0,ropeRight:1,actor:0},
                {ropeLeft:2,ropeRight:3,actor:1},
            ],
        },
        
        {
            // spitter
            ropes:[
                {x:BatVines.ARENA.W*0.2,y:0,length:3},
                {x:BatVines.ARENA.W*0.7,y:0,length:7},
                {x:BatVines.ARENA.W*1,y:0,length:8},
                {x:BatVines.ARENA.W*0.5,y:0,length:7},
            ],
            actors:[
                {type:'goody'},
                {dir:-1,type:'spitter'},
                {type:'fragment'},
            ],

            knots:[
                {ropeLeft:0,ropeRight:-1,actor:0},
                {ropeLeft:1,ropeRight:2,actor:1},
                {ropeLeft:3,ropeRight:-1,actor:2},
            ],
        },
        {
            // spitter
            ropes:[
                {x:BatVines.ARENA.W*0.25,y:0,length:6},
                {x:BatVines.ARENA.W*0.5,y:0,length:3},
                {x:BatVines.ARENA.W*0.75,y:0,length:3},
            ],
            actors:[
                 {dir:1,type:'spitter'},
                 {type:'fragment'},
                {type:'goody'},
               
            ],

            knots:[
                {ropeLeft:0,ropeRight:-1,actor:0},
                {ropeLeft:1,ropeRight:-1,actor:1},
                {ropeLeft:2,ropeRight:-1,actor:2},
            ],
        },
        {
            // IVY
            ropes:[
                {x:BatVines.ARENA.W*0.1,y:0,length:6, count:2},
                {x:BatVines.ARENA.W*0.2,y:0,length:5, count:3},
                
                {x:BatVines.ARENA.W*0.7,y:0,length:6, count:2},
                {x:BatVines.ARENA.W*0.9,y:0,length:4, count:3},
            ],
            actors:[
                {type:'goody'},
                {type:'goody'},
                {type:'goody'},
            ],

            knots:[
                {ropeLeft:0,actor:0},
                {ropeLeft:1,actor:1},
                {ropeLeft:2,ropeRight:3,actor:2},
            ],
        },
        {
            // IVY
            ropes:[
                {x:BatVines.ARENA.W*0.1,y:0,length:5, count:2},
                {x:BatVines.ARENA.W*0.4,y:0,length:6, count:3},
                {x:BatVines.ARENA.W*1,y:0,length:5, count:3},
                {x:BatVines.ARENA.W*0.6,y:0,length:6, count:2},
                {x:BatVines.ARENA.W*0.9,y:0,length:4, count:3},
            ],
            actors:[
                {type:'goody'},
                {type:'goody'},
                {type:'goody'},
                {type:'ivy', x:BatVines.ARENA.W*0.5, y:0},
            ],

            knots:[
                {ropeLeft:0,ropeRight:1,actor:0},
                {ropeLeft:2,actor:1},
                {ropeLeft:3,ropeRight:4,actor:2},
            ],
        },

        {
            // IVY
            ropes:[
                {x:BatVines.ARENA.W*0.1,y:0,length:5, count:2},
                {x:BatVines.ARENA.W*0.4,y:0,length:6, count:3},
                {x:BatVines.ARENA.W*0,y:0,length:5, count:3},
                {x:BatVines.ARENA.W*0.7,y:0,length:6, count:2},
                {x:BatVines.ARENA.W*1,y:0,length:4, count:3},
            ],
            actors:[
                {type:'goody'},
                {type:'goody'},
                {type:'goody'},
            ],

            knots:[
                {ropeLeft:0,ropeRight:1,actor:0},
                {ropeLeft:2,actor:1},
                {ropeLeft:3,ropeRight:4,actor:2},
            ],
        },
        {
            // bomb
            ropes:[
                {x:BatVines.ARENA.W*0.5,y:0,length:6, count:2},
                {x:BatVines.ARENA.W*0.9,y:0,length:6, count:1},
                {x:BatVines.ARENA.W*0.1,y:0,length:5, count:1},
                {x:BatVines.ARENA.W*0.2,y:0,length:3, count:1},
            ],
            actors:[
                {type:'bomb'},
                {type:'bigmouth', x:BatVines.ARENA.W * 0.7, y:BatVines.ARENA.H},
                {type:'goody'},
                {type:'goody'},
                {type:'ivy',x:BatVines.ARENA.W*0.5, y:0},
            ],

            knots:[
                {ropeLeft:0,ropeRight:1,actor:0},
                {ropeLeft:2,actor:2},
                {ropeLeft:3,actor:3},
            ],
        },
         
    ]

    let audio = new AudioContext();
    audio.add('ambience','./proto/audio/plant-ambience.mp3',0.8,true,true);
    audio.add('music','./proto/audio/plant-music-b.mp3',0.4,true,true);
    audio.add('zoom','./proto/audio/sfx-zoom.mp3',0.5);
    
    let $game = $('<batvinesgame>').appendTo(self.$el);
    let $bg = $('<batvinesbg>').appendTo($game);
    let $skip = $('<batvineskip>SKIP</batvineskip>').appendTo($game).click(function(){
         clearArenas();
         doNextLevel();
    })

    let $walls = [];
    for(var i=0; i<3; i++){
        $walls[i] = $('<batvineswall>').appendTo($game);
        $('<batvinesgogglesbg>').appendTo($walls[i]);
        $('<batvinesgoggles>').appendTo($walls[i]);

        $('<batvineszoomout>').appendTo($walls[i]).click(doArenaClose);
        
        //new Scene3D().$el.appendTo($walls[i]).css('transform','scale('+10+')')
    }

    function clearArenas(){
        $('batzoombutton').remove();
        while(arenas.length) arenas.pop().$el.remove();
    }

    let iLevel = -1;
    let arenas = [];
    function doNextLevel(){
        iLevel++;

        iLevel = iLevel%LEVELS.length;

        for(var m in LEVELS[iLevel]){
            let map = LEVELS[iLevel][m];
            let puzzle = PUZZLES[map.puzzle];

            arenas[m] = new BatVinesArena(map,puzzle);
            arenas[m].$el.attr('id',m);
            arenas[m].$el.appendTo($walls[map.wall]);

            $('<batzoombutton>')
            .appendTo($walls[map.wall])
            .css({
                left: map.x + 'px',
                top: map.y + 'px',
                width: map.scale * BatVines.ARENA.W * BatVines.GRIDSIZE + 'px',
                height: map.scale * BatVines.ARENA.H * BatVines.GRIDSIZE + 'px',
            })
            .attr('id',m)
            .click(doArenaOpen);
        }
    }

    let idActive = -1;
    let idLastActive = -1;
    let scale = 1;

    function tick(){
        let w = $(document).innerWidth();
        let s = w/(BatVines.W*3);

        if( s!=scale ) $game.css('transform','scale('+s+')');
        scale = s;

        for(var a=0; a<arenas.length; a++){
            arenas[a].step();
            
            if(arenas[a].actorHandball){
               // let iNextArena = (a+1)%arenas.length; //make more random

                let maybe = [];
                for(var b=0; b<arenas.length; b++) if(a!=b && !arenas[b].isCleared) maybe.push(b);

                if(maybe.length){
                    let iNextArena = maybe[ Math.floor( Math.random()*maybe.length )];
                    arenas[a].handballTo( arenas[a].actorHandball, arenas[iNextArena] );
                } else {
                    //finished
                }

                arenas[a].actorHandball = undefined;
            }
        }

        if(idActive>-1){
            arenas[idActive].setPlayerPositions(players);
            if(arenas[idActive].isCleared){
                idActive = -1;
                setTimeout(doArenaClose,1000);
            }
        }
    }


    function doArenaOpen(){
        idActive = idLastActive = $(this).attr('id');
        arenas[idActive].setActive(true);
        for(var w=0; w<$walls.length; w++) $walls[w].attr('active',w==LEVELS[iLevel][idActive].wall);
        $('batzoombutton').hide();

        audio.play('zoom');
    }

    function doArenaClose(){
        
        idActive = -1;
        arenas[idLastActive].setActive(false);
        for(var w2 in $walls) $walls[w2].removeAttr('active');
        $('batzoombutton').show();

        let isCleared = true;
        for(var a in arenas) isCleared = isCleared && arenas[a].isCleared;
        
        if(isCleared){
            clearArenas();
            setTimeout(doNextLevel,1000);
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

    $(document).on('click',function(e){
        audio.play('music');
        audio.play('ambience');
    });

    let skipID = window.location.search.substr(1).split('&')[1];

    if(skipID!=undefined){
        iLevel = skipID-1;
    } 

    doNextLevel();

}

