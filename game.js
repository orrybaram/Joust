var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");
var world;
var keys = [];
var enemies = [];

var Player = function() {  
    this.object = null;  
};
var player = new Player();
var SCALE = 30;

$(function() {
    init();
    requestAnimFrame(update);

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    // disable vertical scrolling from arrows :)
    document.onkeydown=function(){return event.keyCode!=38 && event.keyCode!=40}
})

function init() {
    world = new b2World(
        new b2Vec2(0, 10),    //gravity
        false                 //allow sleep
    );

    var fixDef = new b2FixtureDef;
    fixDef.density = 1.0;
    fixDef.friction = 1;
    fixDef.restitution = 0.2;

    var bodyDef = new b2BodyDef;

    // CREATE GROUND
    // ======================================================
    bodyDef.type = b2Body.b2_staticBody;

    // positions the center of the object (not upper left!)
    bodyDef.position.x = canvas.width / 2 / SCALE;
    bodyDef.position.y = canvas.height / SCALE;

    fixDef.shape = new b2PolygonShape;

    // half width, half height. eg actual height here is 1 unit
    fixDef.shape.SetAsBox((canvas.width / SCALE) / 2, (10/SCALE) / 2);
    world.CreateBody(bodyDef).CreateFixture(fixDef);

    // CREATE PLATFORMS
    // ======================================================
    bodyDef.type = b2Body.b2_staticBody;

    for(var i = 0; i < 6; i++) {
        if(i % 2 === 0) {
            bodyDef.position.x = 100 / SCALE;
        } else {
            bodyDef.position.x = (canvas.width / SCALE) - (100 / SCALE);
        }
        bodyDef.position.y = (i * 50 / SCALE) + 100 / SCALE;

        fixDef.shape = new b2PolygonShape;
        fixDef.shape.SetAsBox((150 / SCALE) / 2, (10/SCALE) / 2);
        world.CreateBody(bodyDef).CreateFixture(fixDef);
    }

    // CREATE PLAYER
    // ======================================================
    bodyDef.type = b2Body.b2_dynamicBody;
    fixDef.shape = new b2PolygonShape;
    fixDef.shape.SetAsBox(10 / SCALE, 10 / SCALE)

    bodyDef.position.x = canvas.width / 2 / SCALE;
    bodyDef.position.y = (canvas.height / SCALE) - (20 / SCALE);
    player.object = world.CreateBody(bodyDef).CreateFixture(fixDef);
    
    setUpDebug();

    // CREATE ENEMIES
    // ======================================================
    for(var i = 0; i < 6; i++) {
        bodyDef.type = b2Body.b2_dynamicBody;
        fixDef.shape = new b2PolygonShape;
        fixDef.shape.SetAsBox(10 / SCALE, 10 / SCALE)

        bodyDef.position.x = Math.random() * 25;
        bodyDef.position.y = Math.random() * 25
        enemy = world.CreateBody(bodyDef).CreateFixture(fixDef);
        enemies.push(enemy)
    }
    setUpDebug();

};

function update() {
    world.Step(
        1 / 60,   //frame-rate
        10,       //velocity iterations
        10        //position iterations
    );
    world.DrawDebugData();
    world.ClearForces();
    requestAnimFrame(update);
    handleInteractions();
    checkBoundries();
};

function handleKeyDown(evt){
    keys[evt.keyCode] = true;
}
function handleKeyUp(evt){
    keys[evt.keyCode] = false;
}

function handleInteractions(){
    var vel = player.object.m_body.GetLinearVelocity();

    // up arrow
    if (keys[38]){
        vel.y = -6;   
    }
    // left/right arrows
    if (keys[37]){
        vel.x = -5;
    }
    else if (keys[39]){
        vel.x = 5;
    }
}

function checkBoundries() {    
    if (player.object.m_body.GetPosition().y > canvas.height / SCALE){
       player.object.m_body.SetPosition(new b2Vec2(20,0),0)

        //KILL PLAYER
    }   
    else if (player.object.m_body.GetPosition().x > canvas.width / SCALE) {
        player.object.m_body.SetPosition(new b2Vec2(0, player.object.m_body.GetPosition().y)); 
        console.log('go left')
    }
    else if (player.object.m_body.GetPosition().x < 0) {
        console.log('go right')
        player.object.m_body.SetPosition(new b2Vec2(canvas.width / SCALE, player.object.m_body.GetPosition().y)); 
    }
}

function setUpDebug() {
    var debugDraw = new b2DebugDraw();
    debugDraw.SetSprite(document.getElementById("game").getContext("2d"));
    debugDraw.SetDrawScale(SCALE);
    debugDraw.SetFillAlpha(.3);
    debugDraw.SetLineThickness(1.0);
    debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
    world.SetDebugDraw(debugDraw);
}







