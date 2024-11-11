BatVinesArena = function(){

    let self = this;
    self.$el = $('<batvinesarena>');

    // module aliases
     var Engine = Matter.Engine,
        Render = Matter.Render,
        Runner = Matter.Runner,
        Body = Matter.Body,
        Composite = Matter.Composite,
        Composites = Matter.Composites,
        Constraint = Matter.Constraint,
        MouseConstraint = Matter.MouseConstraint,
        Mouse = Matter.Mouse,
        Bodies = Matter.Bodies;

    // create an engine
    var engine = Engine.create();

    // create a renderer
    var render = Render.create({
        element: self.$el[0],
        engine: engine,
         options: {
            width: 800,
            height: 600,
            //showAngleIndicator: true,
            //showCollisions: true,
            //showVelocity: true
        }
    });

    // create two boxes and a ground
   
    //var boxB = Bodies.rectangle(600, 50, 80, 80);
    var ground = Bodies.rectangle(400, 610, 810, 60, { isStatic: true });

   

     // add bodies
    var group = Body.nextGroup(true);

     var boxA = Bodies.rectangle(400, 320, 80, 80);
        
    // x y columns rows columngap rowgap
    var ropeA = Composites.stack(395, 0, 1, 8, 0, 5, function(x, y) {
        return Bodies.rectangle(x, y, 10, 30, { collisionFilter: { group: group } });
    });


    Composite.add(ropeA, boxA);
    
    Composites.chain(ropeA, 0, 0.5, 0, -0.5, { stiffness: 0.8, length: 2, render: { type: 'line' } });

    Composite.add(ropeA, Constraint.create({ 
        bodyB: ropeA.bodies[0],
        pointB: { x: 0, y: 0 },
        pointA: { x: ropeA.bodies[0].position.x, y: ropeA.bodies[0].position.y },
        stiffness: 0.5
    }));


    var ropeB = Composites.stack(600, 0, 1, 8, 0, 5, function(x, y) {
        return Bodies.rectangle(x, y, 10, 30, { collisionFilter: { group: group } });
    });



    Composites.chain(ropeB, 0, 0.5, 0, -0.5, { stiffness: 0.8, length: 2, render: { type: 'line' } });

    Composite.add(ropeB, Constraint.create({ 
        bodyB: ropeB.bodies[0],
        pointB: { x: 0, y: 0 },
        pointA: { x: ropeB.bodies[0].position.x, y: ropeB.bodies[0].position.y },
        stiffness: 0.5
    }));


     // add all of the bodies to the world
    Composite.add(engine.world, [ropeA, ropeB, ground]);

    // run the renderer
    Render.run(render);

    // create runner
    var runner = Runner.create();

    // run the engine
    Runner.run(runner, engine);
}

BatVinesGame = function(){

    const W = 1600;
    const H = 1000;

    $("head").append(`
        <style>
            batvinesgame{
                display:block;
                width: ${W*3}px;
                height: ${H}px;
                transform-origin: top left;
                text-align: center;

            }

           batvinesarena{
            display: inline-block;
            margin-top: 200px;
           }

        </style>
    `);

    let self = this;
    self.$el = $('<igb>');

    


    let $game = $('<batvinesgame>').appendTo(self.$el);

    let $walls = [];
    for(var i=0; i<3; i++){
        $walls[i] = $('<igbside>').appendTo($game);
    }

    new BatVinesArena().$el.appendTo($walls[1]);
 

    function tick(){
        let w = $(document).innerWidth();
        let s = w/(W*3);
        console.log(s);
        $game.css('transform','scale('+s+')');
    }

    setInterval(tick,100);

}

