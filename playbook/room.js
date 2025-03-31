Avatar3D = function (w,h,l) {
    if( !Avatar3D.isStyled) $("head").append(`
        <style>
            avatar3D{
                display:block;
                width: 0px;
                height: 0px;
                left: 0px;
                top: 0px;
                position: absolute;
                transform-style:preserve-3d;
            }



            avatarLayer3D{
                background: linear-gradient(to right, transparent, red);
                border-radius: 100%;
                position: absolute;

            }

             avatar3D:nth-of-type(2) avatarLayer3D{
                background: linear-gradient(to right, transparent, blue);
             }

            avatarLayer3D:first-of-type{
                background: radial-gradient(black, transparent);
                opacity: 0.2;
            }

            avatarShadow{
                display: block;
                background:black;
                border-radius: 100%;
                width: 30px;
                height: 30px;
                transform: translate(-50%, -50%);
                opacity: 0.2;
            }

            avatar2D{
                position: absolute;
                width: 30px;
                display: inline-block;
                left: -15px;
                bottom: 0px;
                transform-origin: bottom center;
                transform: rotateX( -90deg );
                text-align: center;
                line-height: 0px;
            }

            a2DHead{
                display: inline-block;
                width: 70%;
                height: 30px;
                background: white;
                border-radius: 15px;
            }

            a2DBody{
                display: inline-block;
                width: 20px;
                height: 40px;
                background: white;
                border-radius: 10px 10px 5px 5px;
                position: relative;
            }

             a2DLegs{
                display: inline-block;
                width: 15px;
                height: 30px;
                box-sizing: border-box;
                border-left: 5px solid white;
                border-right: 5px solid white;
            }

            a2DArm{
               position: absolute;
               display: block;
               width: 15px;
               height: 35px;
               top: 5px;
               border-top: 5px solid white;
            }

             a2DArm:first-of-type{
                left: 15px;
               top: 5px;
               
               border-right: 5px solid white;
               box-sizing: border-box;
               border-top-right-radius: 10px;
             }

             a2DArm:last-of-type{
             
               left: -10px;
               top: 5px;
               border-left: 5px solid white;
               border-top-left-radius: 10px;
            }
        </style>
    `);

    Avatar3D.isStyled = true;

    let self = this;
    self.position = {x:0,y:0,z:0};
    self.$el = $(`
        <avatar3D>
            <avatarShadow></avatarShadow>
            <avatar2D>
                <a2DHead></a2DHead>
                <a2DBody>
                    <a2DArm></a2DArm>
                    <a2DArm></a2DArm>
                </a2DBody>
                <a2DLegs></a2DLegs>
            </avatar2D>
        </avatar3D>`
    );


    self.redraw = function(){
        self.$el.css({
            left: self.position.x * w/2,
            top: self.position.z * l/2,
        })
    }

    self.redraw();

   /* const HUMAN = [
        1,
        0.6,0.65,0.7,
        0.8,0.8,0.8,
        0.9,
        1,1,1,1,1,
        0.8,
        0.5,0.5,
        0.6,0.7,0.8,0.8,0.7,
        0.5,
    ]

    for(var i=0; i<HUMAN.length; i++){
        let w = HUMAN[i]*50;
        $('<avatarLayer3D>').appendTo(self.$el).css({
            'left':-w/2+'px',
            'top':-w/2+'px',
            'width':w+'px',
            'height':w+'px',
            'transform':'translateZ('+i*5+'px)',
        })
    }*/
}

Scene3D = function(){

    const W = 160*2;
    const H = 100*2;

    if( !Scene3D.isStyled) $("head").append(`
        <style>
            scene3D{
                display:block;
                width: 1000px;
                height: 500px;
   
                left: -500px;
                top: -250px;
                
                perspective: 1000px;
                 position: absolute;
                  transform-style:preserve-3d;
                transform: rotateX(-15deg);
            }

            world3D{
                display:block;
                position: absolute;
                top: 250px;
                left: 500px;
                width: 0px;
                height: 0px;
                perspective-origin: center;
                transform-style:preserve-3d;
                transform: rotateY(10deg);
                
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

    let r = 0;
    setInterval(function(){
        r++;
        let offset = Math.sin(r*0.01) * 20;
        $world.css('transform','rotateY('+(offset)+'deg)')
    },50)



    let room = new Room3D(W,W,H);
    room.$el.appendTo($world);

    self.doStrafe = function(){

        $(room.avatar.position)
        .animate({ x:-0.7, z:0 },{step:room.avatar.redraw, duration:2000})
        .animate({ x:0.7, z:0 },{step:room.avatar.redraw, duration:2000})
    }

    self.doDolly = function(){

        $(room.avatar.position)
        .animate({ x:0, z:-0.7 },{step:room.avatar.redraw, duration:2000})
        .animate({ x:0, z:0.7 },{step:room.avatar.redraw, duration:2000})
    }

    self.doMousepad = function(){

        $(room.avatar.position)
        .animate({ x:-0.6, z:-0.6 },{step:room.avatar.redraw, duration:2000})
        .animate({ x:0.5, z:0.7 },{step:room.avatar.redraw, duration:2000})
        .animate({ x:-0.5, z:0.4 },{step:room.avatar.redraw, duration:2000})
        .animate({ x:0.6, z:-0.4 },{step:room.avatar.redraw, duration:2000})
    }

    self.doDolly();
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
    if(!color) color = 'radial-gradient(transparent,rgba(255,255,255,0.1))';
    if(!walls) walls = [1,1,1,1];

    color = 'no-repeat center/stretch url(./rainbow.gif)';

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
                box-sizing: border-box;
                display:block;
                position:absolute;
                transform: translate(-50%,-50%);
                border: 4px solid #333;
                background: url('./rainbow.gif');
                background-size: cover;
                opacity: 0.6;
            }

            .room3D-bottom room3Dsurface{
                background: gray;
            }

            .room3D-top room3Dsurface{
               background: none;
            }

            .room3D-top room3Dsurface:after{
               display: none;
            }

            .room3D-front room3Dsurface{
               background: rgba(100,100,255,0.4);
            }

            room3Dsurface:after{
                content: " ";
                display: block;
                position: absolute;
                top: 0px;
                left: 0px;
                right: 0px;
                bottom: 0px;
                background: url(./logo.png);
                background-size: 50%;
                background-position: center;
                background-repeat: no-repeat;
            }



        </style>
    `);

    Room3D.isStyled = true;

    let self = this;

    self.$el = $(`
        <room3D>
            <room3Dside class='room3D-bottom' style='transform:translateY(${h/2}px) rotateX(90deg);'>
                <room3Dsurface style='width:${w}px;height:${l}px;'></room3Dsurface>

            </room3Dside>
            <room3Dside class='room3D-top' style='transform:translateY(${-h/2}px) rotateX(90deg);'>
                <room3Dsurface style='width:${w}px;height:${l}px;'></room3Dsurface>
            </room3Dside>

            ${ walls[0]?`
                <room3Dside class='room3D-back' style='transform:translateZ(${-l/2}px)'>
                    <room3Dsurface style='width:${w}px;height:${h}px;'></room3Dsurface>
                </room3Dside>`:'' } 

            ${ walls[1]?`
                <room3Dside class='room3D-right' style='transform:translateX(${w/2}px) rotateY(90deg) scaleX(-1)'>
                    <room3Dsurface style='width:${l}px;height:${h}px;'></room3Dsurface>
                </room3Dside>`:'' } 

            ${ walls[2]?`
                <room3Dside class='room3D-front' style='transform:translateZ(${l/2}px)'>
                    <room3Dsurface style='width:${w}px;height:${h}px;'></room3Dsurface>
                </room3Dside>`:'' } 

            ${ walls[3]?`
                <room3Dside class='room3D-left' style='transform:translateX(${-w/2}px) rotateY(90deg)'>
                    <room3Dsurface style='width:${l}px;height:${h}px;'></room3Dsurface>
                </room3Dside>`:'' } 
            
        </room3D>
        `);

    self.avatar = new Avatar3D(w,h,l);
    self.avatar.$el.appendTo(self.$el.find('.room3D-bottom'));
    //new Avatar3D().$el.appendTo(self.$el.find('.room3D-bottom')).css({left:'100px'})
}