BatVinesArena = function(layout) {

    let self = this;
    self.$el = $('<batvinesarena>');
    self.$el.css({
        left:layout.x+'px',
        top:layout.y+'px',
    });

    let knots = [];

    for(var r in layout.ropes) layout.ropes[r].$el.appendTo(self.$el);

    for(var a in layout.actors) layout.actors[a].$el.appendTo(self.$el);

    for(var k in layout.knots){
        knots[k] = new BatVinesKnot(
            layout.ropes[layout.knots[k].ropeLeft],
            layout.ropes[layout.knots[k].ropeRight],
            layout.actors[layout.knots[k].actor]
            );
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

    self.$target = $('<batvinetarget>').appendTo(self.$el);

    self.to = function(x2,y2,hang) {

        x2 -= x;
        y2 -= y;
       // $path.attr('d',`M0,0 L${x2-x},${y2-y}`);
        $path.attr('d',`M0,0 C 0 ${hang}, ${x2} ${hang}, ${x2} ${y2}`);

        let pt = getPointOnBezier(0,0,0,hang,x2,hang,x2,y2,0.2);

        self.$target.css('left',pt.x*BatVines.GRIDSIZE+'px');
        self.$target.css('top',pt.y*BatVines.GRIDSIZE+'px');
    }

    self.to(self.x,self.y+length,length);

    function getPointOnBezier(p0x,p0y,p1x,p1y,p2x,p2y,p3x,p3y,t){
        let x = (1-t)*(1-t)*(1-t)*p0x + 3*(1-t)*(1-t)*t*p1x + 3*(1-t)*t*t*p2x + t*t*t*p3x;
        let y = (1-t)*(1-t)*(1-t)*p0y + 3*(1-t)*(1-t)*t*p1y + 3*(1-t)*t*t*p2y + t*t*t*p3y;
        return {x:x,y:y};
    }

}

BatVinesActor = function(x,y,r){
    let self = this;
    self.x = x;
    self.y = y;
    self.r = r;
    self.gravity = true;

     self.$el = $('<batactor>').css({
        width:self.r*2*BatVines.GRIDSIZE+'px',
        height:self.r*2*BatVines.GRIDSIZE+'px',
    })

     self.to = function(x,y){

        self.x = x;
        self.y = y;

        self.$el.css({
            left:self.x*BatVines.GRIDSIZE+'px',
            top:self.y*BatVines.GRIDSIZE+'px',
        })
       
     }

    self.tick = function(elapsed){
        self.y += elapsed*BatVines.GRAVITY;
    }
}

BatVinesKnot = function(left,right,slave){
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

    right.$target.click(function(){
        right.$el.hide();
        right = undefined;
        if(left) dangle(left);
        else drop(slave);
    })

    left.$target.click(function(){
        left.$el.hide();
        left = undefined;
        if(right) dangle(right);
        else drop(slave);
    })
}

BatVinesGame = function(){

    BatVines = {};
    BatVines.W = 1600;
    BatVines.H = 1000;
    BatVines.GRIDSIZE = 50;

    const ARENA = {w:12,h:8};

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

           batvinesarena{
                position: absolute;
                display: inline-block;
                width: ${ARENA.w*BatVines.GRIDSIZE}px;
                height: ${ARENA.h*BatVines.GRIDSIZE}px;
                background: #777;
                transform: translate(-50%,-50%);
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
                border-radius: 100%;
                transform: translate(-50%,-50%);
           }

           svg{
               transform: translate(-50%,-50%);
               
           }

           path{
                stroke-width: 0.1px;
                stroke: black;
                fill: none;
           }

           batvinetarget{
             display: block;
                position: absolute;
            width: 50px;
            height: 50px;
            box-sizing: border-box;
            border: 5px solid white;
            transform: translate(-50%, -50%);
            border-radius: 100%;
            pointer-events: auto;
           }

        </style>
    `);

    let self = this;
    self.$el = $('<igb>');



    const ARENAS = [

        {
            wall:0,
            x:BatVines.W/2,
            y:BatVines.H/2,
            ropes:[
                new BatVinesRope(1,0,4),
                new BatVinesRope(5,0,5),
                new BatVinesRope(3,0,7),
                new BatVinesRope(8,0,5),
            ],

            platforms:[

            ],

            actors:[
                new BatVinesActor(0,0,0.5),
                new BatVinesActor(0,0,0.5),
            ],

            knots:[
                {ropeLeft:0,ropeRight:1,actor:0},
                {ropeLeft:2,ropeRight:3,actor:1},
            ],
        },
        {
            wall:1,
            x:BatVines.W/2,
            y:BatVines.H/2,
            ropes:[
                new BatVinesRope(5,0,6),
                new BatVinesRope(10,0,5),
                new BatVinesRope(3,0,6),
                new BatVinesRope(8,0,7),
            ],

            platforms:[

            ],

            actors:[
                new BatVinesActor(0,0,0.5),
                new BatVinesActor(0,0,0.5),
            ],

            knots:[
                {ropeLeft:0,ropeRight:1,actor:0},
                {ropeLeft:2,ropeRight:3,actor:1},
            ],
        }
    ]


    let $game = $('<batvinesgame>').appendTo(self.$el);

    let $walls = [];
    for(var i=0; i<3; i++){
        $walls[i] = $('<igbside>').appendTo($game);
    }

    for(var a in ARENAS){
        new BatVinesArena(ARENAS[a]).$el.appendTo($walls[ARENAS[a].wall]);
    }

    //new BatVinesArena().$el.appendTo($walls[1]);
    /*let r1 = new BatRope(100,100,200);
    let r2 = new BatRope(500,100,350);
    let a = new BatActor(200,300,20);

    r1.$el.appendTo($walls[1]);
    r2.$el.appendTo($walls[1]);
    a.$el.appendTo($walls[1]);

    new BatRopeController(r1,r2,a);*/

    function tick(){
        let w = $(document).innerWidth();
        let s = w/(BatVines.W*3);
        $game.css('transform','scale('+s+')');
    }

    setInterval(tick,100);

}

