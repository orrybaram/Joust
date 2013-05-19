/* =============================================================
         ____.________   ____ ___  ____________________
        |    |\_____  \ |    |   \/   _____/\__    ___/
        |    | /   |   \|    |   /\_____  \   |    |   
    /\__|    |/    |    \    |  / /        \  |    |   
    \________|\_______  /______/ /_______  /  |____|   
                      \/                 \/            
============================================================= */

var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");

var world;

var player;
var player_alive = true;
var player_sprite = new Image();
    player_sprite.src = "images/player1.png";

var lives = 3;

var enemies = [];

var score = 0;
var SCALE = 30;
var keys = [];
var trash = [];


$(function() {
    init();
    update();

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    // disable vertical scrolling from arrows :)
    document.onkeydown=function(){return event.keyCode!=38 && event.keyCode!=40}
})

function init() {
    world = new b2World(
        new b2Vec2(0, 8),    //gravity
        false                 //allow sleep
    );

    createCeiling();
    createPlatforms();
    createGround();
    
    createPlayer();
    createEnemies();
    
    setUpDebug();

    flapTheWings();

    setInterval(changeFlapSpeed, 1000)

};

function update() {
    world.Step(
        1 / 60,   //frame-rate
        10,       //velocity iterations
        10        //position iterations
    );
    world.DrawDebugData();
    world.ClearForces();
    
    destroyObjects();
    updateScore();
    checkStatus();

    if (player_alive) {
        renderPlayer();
    }
    handleInteractions();
    checkBoundries(player);
    detectCollisons();
    
    //ctx.clearRect(0, 0, canvas.width, canvas.height);
    //ctx.fillStyle = "rgb(0, 0, 0)";
    //ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    requestAnimFrame(update);
};

// CREATE GROUND
// ======================================================
function createGround() { 
    var groundBody = new b2BodyDef;
    var groundFix = new b2FixtureDef;

    groundBody.type = b2Body.b2_staticBody;
    groundBody.position.x = canvas.width / 2 / SCALE;
    groundBody.position.y = canvas.height / SCALE;

    groundFix.shape = new b2PolygonShape;
    groundFix.shape.SetAsBox((canvas.width / SCALE) / 2, (10/SCALE) / 2);
    groundFix.userData = 'ground';

    world.CreateBody(groundBody).CreateFixture(groundFix);
}

// CREATE FLIGHT CEILING
// ======================================================
function createCeiling() { 
    var ceilingBody = new b2BodyDef;
    var ceilingFix = new b2FixtureDef;

    ceilingBody.type = b2Body.b2_staticBody;
    ceilingBody.position.x = canvas.width / 2 / SCALE;
    ceilingBody.position.y = 0 - 20 / SCALE;

    ceilingFix.shape = new b2PolygonShape;
    ceilingFix.shape.SetAsBox((canvas.width / SCALE) / 2, (10/SCALE) / 2);
    ceilingFix.userData = 'ceiling';

    world.CreateBody(ceilingBody).CreateFixture(ceilingFix);
}

// CREATE PLATFORMS
// ======================================================
function createPlatforms() {
    var platformBody = new b2BodyDef;
    var platformFix = new b2FixtureDef;
    
    platformBody.type = b2Body.b2_staticBody;

    for(var i = 0; i < 6; i++) {
        if(i % 2 === 0) {
            platformBody.position.x = 100 / SCALE;
        } else {
            platformBody.position.x = (canvas.width / SCALE) - (100 / SCALE);
        }
        platformBody.position.y = (i * 50 / SCALE) + 100 / SCALE;

        platformFix.shape = new b2PolygonShape;
        platformFix.shape.SetAsBox((150 / SCALE) / 2, (10/SCALE) / 2);
        platformFix.userData = 'platform';

        world.CreateBody(platformBody).CreateFixture(platformFix);
    }
}

// CREATE PLAYER
// ======================================================
function Player() {
    this.box2d = {};
}

function createPlayer() {
    player = new Player();

    var playerBody = new b2BodyDef;
    var playerFix = new b2FixtureDef;

    playerBody.type = b2Body.b2_dynamicBody;
    playerBody.position.x = canvas.width / 2 / SCALE;
    playerBody.position.y = (canvas.height / SCALE) - (20 / SCALE);
    playerBody.fixedRotation = true;

    playerFix.shape = new b2PolygonShape;
    playerFix.shape.SetAsBox(10 / SCALE, 15 / SCALE)
    playerFix.userData = 'player';
    playerFix.density = 1.0;
    playerFix.friction = 5;
    playerFix.restitution = .5;

    player.box2d = world.CreateBody(playerBody)
    player.box2d.CreateFixture(playerFix);
}


// CREATE ENEMIES
// ======================================================

function Enemy(id) {
    this.box2d = {},
    this.direction = 'right';
    this.flapSpeed = 0;
    this.id = id;
}

function createEnemies() {
    for(var i = 0; i < 6; i++) {
        
        var enemy = new Enemy(i);
        var enemyBody = new b2BodyDef;
        var enemyBottom = new b2FixtureDef;
        var enemyHead = new b2FixtureDef;

        enemyBody.type = b2Body.b2_dynamicBody;
        enemyBody.position.x = Math.random() * 25;
        enemyBody.position.y = Math.random() * 25;
        
        enemyHead.shape = new b2PolygonShape;
        enemyHead.shape.SetAsArray([{x:0, y:0},{x:.5, y:0},{x:.5, y:.25},{x:0, y:.25}], 4);
        enemyHead.shape.m_centroid.Set(59,100);
        enemyHead.userData = {id: i, type: 'enemy', part: 'head'}

        enemyBottom.shape = new b2PolygonShape;
        enemyBottom.shape.SetAsArray([{x:0, y:.25},{x:.5, y:.205},{x:.5, y:1},{x:0, y:1}], 4);
        enemyBottom.shape.m_centroid.Set(0,0);
        enemyBottom.userData = {id: i, type: 'enemy', part: 'body'}
        enemyBottom.restitution = .6;

        enemy.box2d = world.CreateBody(enemyBody);
        enemy.box2d.CreateFixture(enemyHead);
        enemy.box2d.CreateFixture(enemyBottom);
        

        enemy.flapSpeed = (Math.random() * 500) + 300;

        enemies.push(enemy)
    }
}

function handleKeyDown(evt){
    keys[evt.keyCode] = true;
}
function handleKeyUp(evt){
    keys[evt.keyCode] = false;
}

function handleInteractions(){
    var vel = player.box2d.GetLinearVelocity();
    
    if (keys[38]) {  
        vel.y = -6;   // up
    }
    if (keys[37]) {
        vel.x = -5;   // left
    }
    else if (keys[39]) {
        vel.x = 5;    // right
    }
}

function renderPlayer() {
    var player_pos = player.box2d.GetPosition();
    
    ctx.save();
    ctx.translate(player_pos.x * SCALE, player_pos.y * SCALE);
    ctx.rotate(player.box2d.GetAngle());
    ctx.drawImage(player_sprite, -10, -15);
    ctx.restore();
}

function detectCollisons() {
    var listener = new b2ContactListener;

    listener.BeginContact = function(contact) {

        var fixtureA = contact.m_fixtureA.m_userData;
        var fixtureB = contact.m_fixtureB.m_userData;

        if (fixtureA !== null && fixtureB !== null) {

            // PLAYER AND GROUND / PLATFORM
            if(fixtureA === 'player' && fixtureB === 'ground' || 
                fixtureA === 'player' && fixtureB === 'platform') {
                console.log('walking')
            }

            // PLAYER AND ENEMY HEAD --- KILLS ENEMY!
            if(fixtureA === 'player' && fixtureB.part === 'head') {
                trash.push(contact.m_fixtureB.m_body);
                killEnemy(contact.m_fixtureB);
            } else if (fixtureB === 'player' && fixtureA.part === 'head') {
                trash.push(contact.m_fixtureA.m_body);
                killEnemy(contact.m_fixtureA);
            }

            // PLAYER AND ENEMY BODY --- PLAYER DIES!
            if(fixtureA === 'player' && fixtureB.part === 'body') {
                killPlayer();
            } else if (fixtureB === 'player' && fixtureA.part === 'body') {
                killPlayer();
            }

            //ENEMY AND PLATFORM
            if(fixtureA === 'platform' && fixtureB.type === 'enemy' || 
            fixtureB === 'platform' && fixtureA.type === 'enemy') {

                if (fixtureA.type === 'enemy') {
                    for(var i = 0; i < enemies.length; i++) {
                        if (enemies[i].id === fixtureA.id) {
                            enemies[i].direction === 'left' ? enemies[i].direction = 'right' : enemies[i].direction = 'left';
                        }
                    }
                } else {
                    for(var i = 0; i < enemies.length; i++) {
                        if (enemies[i].id === fixtureB.id) {
                            enemies[i].direction === 'left' ? enemies[i].direction = 'right' : enemies[i].direction = 'left';
                        }
                    }
                }
            }

            // ENEMY and ENEMY COLLISION
            if(fixtureA.type === 'enemy' && fixtureB.type === 'enemy') {
                for(var i = 0; i < enemies.length; i++) {
                    if (enemies[i].id === fixtureA.id) {
                        var enemyA = enemies[i];
                    }
                    if (enemies[i].id === fixtureB.id) {
                        var enemyB = enemies[i];
                    }
                    if (enemyA !== undefined && enemyB !== undefined) {
                        
                        if(enemyA.direction === 'left') { 
                            enemyA.direction = 'right'; 
                        } else {
                            enemyA.direction = 'left'; 
                        }
                    }
                }
            }
        }
    }
    listener.EndContact = function(contact) {
        // PLAYER AND GROUND / PLATFORM
        if(contact.m_fixtureA.m_userData === 'player') {
            console.log('flying')
        }
    }

    listener.PostSolve = function(contact, impulse) {
        // console.log(contact + impulse)
    }

    listener.PreSolve = function(contact, oldManifold) {
        // PreSolve
    }

    this.world.SetContactListener(listener);    

}

function makeEnemyFly(enemy) {
        var vel = enemy.box2d.GetLinearVelocity();
        vel.y = (Math.random() * -1) - 1.5;
        if(enemy.direction === 'right') {
            vel.x = (Math.random() * -2) -2;
        } else {
            vel.x = (Math.random() * 2) + 2;
        }
        checkBoundries(enemy)
}

function flapTheWings() {
    for(var i = 0; i < enemies.length; i++) {
        setInterval(function(x) {
            if(enemies[x] !== undefined) {
                makeEnemyFly(enemies[x]);
            }

        }, enemies[i].flapSpeed, i);
    }
}

function changeFlapSpeed() {
    for(var i = 0; i < enemies.length; i++) {
        enemies[i].flapSpeed = (Math.random() * 1000) + 100;
    }
}

function checkBoundries(obj) {    
    if (obj.box2d.GetPosition().y > canvas.height / SCALE){
        obj.box2d.SetPosition(new b2Vec2(20,0),0)
        //KILL PLAYER
    }

    else if (obj.box2d.GetPosition().x > canvas.width / SCALE) {
        obj.box2d.SetPosition(new b2Vec2(0, obj.box2d.GetPosition().y)); 
    }
    else if (obj.box2d.GetPosition().x < 0) {
        obj.box2d.SetPosition(new b2Vec2(canvas.width / SCALE, obj.box2d.GetPosition().y)); 
    }
}

function destroyObjects() {
    for(var i = 0; i < trash.length; i++) {
        world.DestroyBody(trash[i]);
    }
}

function checkStatus() {
    if (enemies.length === 0) {
        showWinScreen();
    }
}

function updateScore() {
    $('#score').html(score);
}

function updateLives() {
    $('#lives span').html(lives);
}

function showWinScreen() {
    resetGame()
}

function resetGame() {
    createEnemies();
}

function resetPlayer() {
    console.log('go')
    setTimeout(function(){
        createPlayer();
        player_alive = true;
    }, 3000)
}

function killEnemy(enemy) {
    for(var i = 0; i < enemies.length; i++ ) {
        
        var userData = enemies[i].box2d.GetFixtureList().m_next.m_userData;
                
        if (userData === enemy.m_userData) {
            enemies.splice(i, 1);
        }
    }
    score +=1;
}

function killPlayer(enemy) {
    lives -= 1;
    updateLives();
    trash.push(player.box2d)
    player_alive = false;
    resetPlayer();
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







