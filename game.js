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
var player_name = "";

var lives = 3;
var level = 1;
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
        new b2Vec2(0, 4),    //gravity
        false                 //allow sleep
    );

    createCeiling();
    createPlatforms();
    createGround();
    createPlayer();
    initEnemies(level)
    
    setUpDebug();

    player_name = prompt('What\'s your name?');
    localStorage['player_name'] = player_name;
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
    var playerHead = new b2FixtureDef;
    var playerTorso = new b2FixtureDef;
    var playerLegs = new b2FixtureDef;

    playerBody.type = b2Body.b2_dynamicBody;
    playerBody.position.x = canvas.width / 2 / SCALE;
    playerBody.position.y = (canvas.height / SCALE) - (50 / SCALE);
    playerBody.fixedRotation = true;
    playerBody.userData = {type: 'player'};

    playerHead.shape = new b2PolygonShape;
    playerHead.shape.SetAsArray([
        {x:0 / SCALE, y:0 / SCALE}, 
        {x:14 / SCALE, y:0 / SCALE},
        {x:14 / SCALE, y:10 / SCALE}, 
        {x:0 / SCALE, y:10 / SCALE}
    ], 4);
    playerHead.userData = {id: i, type: 'player', part: 'head'}

    playerTorso.shape = new b2PolygonShape;
    playerTorso.shape.SetAsArray([
        {x:-1 / SCALE, y:10 / SCALE}, 
        {x:15 / SCALE, y:10 / SCALE},
        {x:15 / SCALE, y:20 / SCALE}, 
        {x:-1 / SCALE, y:20 / SCALE}
    ], 4);
    playerTorso.userData = {id: i, type: 'player', part: 'body'}

    playerLegs.shape = new b2PolygonShape;
    playerLegs.shape.SetAsArray([
        {x:-1 / SCALE, y:20 / SCALE}, 
        {x:15 / SCALE, y:20 / SCALE},
        {x:15 / SCALE, y:35 / SCALE}, 
        {x:-1 / SCALE, y:35 / SCALE}
    ], 4);
    playerLegs.userData = {id: i, type: 'player', part: 'legs'}

    player.box2d = world.CreateBody(playerBody)
    player.box2d.CreateFixture(playerLegs);
    player.box2d.CreateFixture(playerTorso);
    player.box2d.CreateFixture(playerHead);
}


// CREATE ENEMIES
// ======================================================

function Enemy(id) {
    this.box2d = {},
    this.direction = 'right';
    this.flapSpeed = 0;
    this.id = id;
}

function createEnemies(count) {
    for(var i = 0; i < count; i++) {
        
        var enemy = new Enemy(i);
        var enemyBody = new b2BodyDef;
        var enemyBottom = new b2FixtureDef;
        var enemyHead = new b2FixtureDef;
        var enemyLegs = new b2FixtureDef;

        enemyBody.type = b2Body.b2_dynamicBody;
        enemyBody.position.x = Math.random() * 25;
        enemyBody.position.y = Math.random() * 25;

        enemyHead.shape = new b2PolygonShape;
        enemyHead.shape.SetAsArray([
            {x:0 / SCALE, y:0 / SCALE}, 
            {x:14 / SCALE, y:0 / SCALE},
            {x:14 / SCALE, y:10 / SCALE}, 
            {x:0 / SCALE, y:10 / SCALE}
        ], 4);
        enemyHead.userData = {id: i, type: 'enemy', part: 'head'}

        enemyBottom.shape = new b2PolygonShape;
        enemyBottom.shape.SetAsArray([
            {x:-1 / SCALE, y:10 / SCALE}, 
            {x:15 / SCALE, y:10 / SCALE},
            {x:15 / SCALE, y:20 / SCALE}, 
            {x:-1 / SCALE, y:20 / SCALE}
        ], 4);
        enemyBottom.userData = {id: i, type: 'enemy', part: 'body'}
        enemyBottom.restitution = .6;

        enemyLegs.shape = new b2PolygonShape;
        enemyLegs.shape.SetAsArray([
            {x:-1 / SCALE, y:20 / SCALE}, 
            {x:15 / SCALE, y:20 / SCALE},
            {x:15 / SCALE, y:35 / SCALE}, 
            {x:-1 / SCALE, y:35 / SCALE}
        ], 4);
        enemyLegs.userData = {id: i, type: 'enemy', part: 'legs'}

        enemy.box2d = world.CreateBody(enemyBody);
        enemy.box2d.CreateFixture(enemyLegs);
        enemy.box2d.CreateFixture(enemyBottom);
        enemy.box2d.CreateFixture(enemyHead);
        
        enemy.flapSpeed = (Math.random() * 100) + 1500;

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
        vel.y = -4;   // up
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
    ctx.drawImage(player_sprite, -5, 0);
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
            if(fixtureA.type === 'player' && fixtureB.type === "enemy" && fixtureB.part === 'head') {
                trash.push(contact.m_fixtureB.m_body);
                killEnemy(contact.m_fixtureB);
            } else if (fixtureB.type === 'player' && fixtureA.type === "enemy" && fixtureA.part === 'head') {
                trash.push(contact.m_fixtureA.m_body);
                killEnemy(contact.m_fixtureA);
            }

            // PLAYER HEAD AND ENEMY BODY --- PLAYER DIES!
            
            if(fixtureA.type === 'player' && fixtureA.part === 'head' && fixtureB.type === 'enemy') {
                killPlayer();
            } else if (fixtureB.type === 'player' && fixtureB.part === 'head' && fixtureA.type === 'enemy') {
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
        enemies['a'] = 'b';
        renderNextLevel();
    }
}

function updateScore() {
    $('#score').html(score);
}

function updateLives() {
    $('#lives span').html(lives);
}

function updateLevel() {
    $('#level span').html(level);
}

function renderNextLevel() {
    level += 1;
    initEnemies(level);
    updateLevel();
}

function resetPlayer() {
    setTimeout(function(){
        createPlayer();
        player_alive = true;
    }, 3000)
}

function killEnemy(enemy) {
    for(var i = 0; i < enemies.length; i++ ) {                
        if (enemies[i].id === enemy.m_userData.id) {
            enemies.splice(i, 1);
        }
    }
    score +=1;
}

function killPlayer(enemy) {
    updateLives();
    lives -= 1;

    if(lives > 0) {
        trash.push(player.box2d)
        player_alive = false;
        resetPlayer();
    } else {
        alert('Sorry ' + player_name + " ,you lose... Your score is " + score);
        level = 1;
        lives = 3;
        score = 0;
        enemies = [];
        updateLevel();
        updateLives();
        updateScore();
        for(var i = 0; i < enemies.length; i++) {
            trash.push(enemies[i].box2d)
        }
        setTimeout(function(){initEnemies(level)}, 500);
        
    }
}

function initEnemies(level) {
    createEnemies(level);
    flapTheWings();
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







