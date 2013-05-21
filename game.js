/* =============================================================
         ____.________   ____ ___  ____________________
        |    |\_____  \ |    |   \/   _____/\__    ___/
        |    | /   |   \|    |   /\_____  \   |    |   
    /\__|    |/    |    \    |  / /        \  |    |   
    \________|\_______  /______/ /_______  /  |____|   
                      \/                 \/            
============================================================= */

var game_canvas = document.getElementById("game");
var bkg_canvas = document.getElementById("bkg");
var game_ctx = game_canvas.getContext("2d");

var CANVAS_WIDTH = 900;
var CANVAS_HEIGHT = 600; 

var world;

var player;
var player_alive;
    
var player_name = "";
var high_score = 0;

var lives;
var level;
var enemies = [];
var platforms = [];
var platform_init = [
    {x:450, y:-40, width: CANVAS_WIDTH + 20, type: 'platform'}, //flight ceiling
    {x:30, y:150, width: 150, height: 20, type: 'platform'},
    {x:70, y:300, width: 150, height: 20, type: 'platform'},
    {x:370, y:175, width: 250, height: 20, type: 'platform'},
    {x:400, y:350, width: 150, height: 20, type: 'platform'},
    {x:870, y:150, width: 150, height: 20, type: 'platform'},
    {x:830, y:300, width: 150, height: 20, type: 'platform'},
    {x:450, y:500, width: 700, height: 20, type: 'platform'}, //ground
    
];

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
        false                //allow sleep
    );

    level = 1;
    lives = 3;
    player_alive = true;
    high_score = localStorage['high_score'];

    createPlatforms();
    createPlayer();
    initEnemies(level)
    
    setUpDebug();

    if (localStorage['player_name'] === "null" || !localStorage['player_name']) {
        player_name = prompt('What\'s your name?');
        localStorage['player_name'] = player_name;
    } else {
        player_name = localStorage['player_name'];
    }

    updatePlayerInfo();
    
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

    handleInteractions();
    checkBoundries(player);
    detectCollisons();
    
    if (player_alive) {
        renderPlayer();
    }

    renderEnemy();
    requestAnimFrame(update);
};

// CREATE PLATFORMS
// ======================================================
function Platform(id) {
    this.box2d = {};
    this.id = id;
}

function createPlatforms() {
    
    var platformBody = new b2BodyDef;
    var platformFix = new b2FixtureDef;
    
    platformBody.type = b2Body.b2_staticBody;
    platformFix.friction = 1;
    
    for(var i = 0; i < platform_init.length; i++) {
        
        var platform = new Platform(i);
        var platform_data = platform_init[i]

        platformBody.position.x = platform_data.x / SCALE;
        platformBody.position.y = platform_data.y / SCALE;
        platformFix.userData = {'type': 'platform', 'id': platform_data.type};

        platformFix.shape = new b2PolygonShape;
        platformFix.shape.SetAsBox((platform_data.width / SCALE) / 2, 20 / SCALE / 2);
        
        platform.box2d = world.CreateBody(platformBody);
        platform.box2d.CreateFixture(platformFix);

        platforms.push(platform)
    }
}

// CREATE PLAYER
// ======================================================
function Player() {
    this.box2d = {};
    this.direction = 'up';
    this.ostridge = new Image();
    this.dude = new Image();
    this.is_flying = false;
    this.flap_wings = false;
    this.type = 'player';
}

function createPlayer() {
    player = new Player();

    var playerBody = new b2BodyDef;
    var playerHead = new b2FixtureDef;
    var playerTorso = new b2FixtureDef;
    var playerLegs = new b2FixtureDef;

    playerBody.type = b2Body.b2_dynamicBody;
    playerBody.position.x = CANVAS_WIDTH / 2 / SCALE;
    playerBody.position.y = (CANVAS_HEIGHT / SCALE) - (150 / SCALE);
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
    playerLegs.friction = 1;
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
    this.direction = "left";
    this.flapSpeed = 0;
    this.id = id;
    this.bird = new Image();
    this.dude = new Image();
    this.is_flying = true;
    this.flap_wings = false;
    this.type = 'enemy';
}

function createEnemies(count) {
    for(var i = 0; i < count; i++) {
        
        var enemy = new Enemy(i);
        var enemyBody = new b2BodyDef;
        var enemyBottom = new b2FixtureDef;
        var enemyHead = new b2FixtureDef;
        var enemyLegs = new b2FixtureDef;

        enemyBody.type = b2Body.b2_dynamicBody;
        
        if(i % 2 === 0) {
            enemyBody.position.x = 0;
        } else {
            enemyBody.position.x = CANVAS_WIDTH;
        }
        
        enemyBody.position.y = (Math.random() * 600 / SCALE) - 80 / SCALE;

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


// RENDER PLAYER
// ======================================================
function renderPlayer() {
    var player_pos = player.box2d.GetPosition();

    player.ostridge.src = "images/white-ostridge/walk1.png";
    player.dude.src = "images/dude/yellow.png";
     //console.log(player.is_flying)
    
    if (player.is_flying) {
        if (player.flap_wings) {
            player.ostridge.src = "images/white-ostridge/fly1.png";
        } else {
            player.ostridge.src = "images/white-ostridge/fly2.png";
        }
    }

    game_ctx.save();
    game_ctx.translate(player_pos.x * SCALE, player_pos.y * SCALE);
    game_ctx.rotate(player.box2d.GetAngle());
    
    if(player.direction === 'left') {
        game_ctx.scale(-1, 1);
        game_ctx.drawImage(
            player.dude,         //image
            -16, -2,              // source position
            24, 14               // width/height
        );
        game_ctx.drawImage(
            player.ostridge,     //image
            -17, 0,              // source position
            22, 34               // width/height
        );
    } else {
        game_ctx.drawImage(
            player.dude,         //image
            0, -2,              // source position
            24, 14               // width/height
        );
        game_ctx.drawImage(
            player.ostridge,   //image
            -3, 0,           // source position
            22, 34           // width/height
        );
        
    }
    game_ctx.restore();
    player.flap_wings = false;
}

// RENDER ENEMY
// ======================================================
function renderEnemy() {
    for(var i = 0; i < enemies.length; i++) {
        enemy = enemies[i];

        var enemy_pos = enemy.box2d.GetPosition();

        enemy.bird.src = "images/enemy-bird/walk1.png";
        enemy.dude.src = "images/dude/yellow.png";
         //console.log(enemy.is_flying)
        
        if (enemy.is_flying) {
            if (enemy.flap_wings) {
                enemy.bird.src = "images/enemy-bird/fly2.png";
            } else {
                enemy.bird.src = "images/enemy-bird/fly1.png";
            }
        }

        game_ctx.save();
        game_ctx.translate(enemy_pos.x * SCALE, enemy_pos.y * SCALE);
        game_ctx.rotate(enemy.box2d.GetAngle());
        
        if(enemy.direction === 'left') {
            game_ctx.scale(-1, 1);
            game_ctx.drawImage(
                enemy.dude,         //image
                -16, -2,            // source position
                24, 14              // width/height
            );
            game_ctx.drawImage(
                enemy.bird,     //image
                -22, -5,        // source position
                30, 40          // width/height
            );
        } else {
            game_ctx.drawImage(
                enemy.dude,         //image
                0, -2,              // source position
                24, 14               // width/height
            );
            game_ctx.drawImage(
                enemy.bird,   //image
                -10, -5,           // source position
                30, 40           // width/height
            );
            
        }
        game_ctx.restore();
    }
}

// RENDER PLATFORMS
// ======================================================
function renderPlatforms() {
    for(var i = 0; i < platform.length; i++) {
        var platform = platforms[i];
        // game_ctx.fillStyle = "rgba(0, 0, 0, .9)";
        // game_ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
}

// EVENT HANDLERS
// ======================================================
function handleKeyDown(evt){
    keys[evt.keyCode] = true;
}
function handleKeyUp(evt){
    keys[evt.keyCode] = false;
}

function handleInteractions(){
    var vel = player.box2d.GetLinearVelocity();
    
    if (keys[38]) {  
        vel.y = -3.5;   // up
        player.flap_wings = true;
    }
    if (keys[37]) {
        vel.x = -3.5;   // left
        player.direction = 'left';
    }
    else if (keys[39]) {
        vel.x = 3.5;    // right
        player.direction = 'right'
    }
}


// COLLISION DETECTION
// ======================================================
function detectCollisons() {
    var listener = new b2ContactListener;

    listener.BeginContact = function(contact) {

        var fixtureA = contact.m_fixtureA.m_userData;
        var fixtureB = contact.m_fixtureB.m_userData;

        if (fixtureA !== null && fixtureB !== null) {

            // PLAYER AND GROUND / PLATFORM
            if(fixtureA.type === 'player' && fixtureA.part !== 'head' && fixtureB.type === 'platform' || 
                fixtureB.type === 'player' && fixtureA.part !== 'head' && fixtureA.type === 'platform') {
                player.is_flying = false;
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
            if(fixtureA.type === 'platform' && fixtureB.type === 'enemy' && fixtureB.part !== 'head' || 
            fixtureB.type === 'platform' && fixtureA.type === 'enemy' && fixtureA.part !== 'head') {

                if (fixtureA.type === 'enemy') {
                    for(var i = 0; i < enemies.length; i++) {
                        if (enemies[i].id === fixtureA.id) {
                            enemies[i].direction === 'left' ? enemies[i].direction = 'right' : enemies[i].direction = 'left';
                            enemies[i].is_flying = false;
                        }
                    }
                } else {
                    for(var i = 0; i < enemies.length; i++) {
                        if (enemies[i].id === fixtureB.id) {
                            enemies[i].direction === 'left' ? enemies[i].direction = 'right' : enemies[i].direction = 'left';
                            enemies[i].is_flying = false;
                        }
                    }
                }
            }

            // ENEMY AND PLATFORM
            if(fixtureA.type === 'enemy' && fixtureA.part !== 'head' && fixtureB.type === 'platform' || 
               fixtureB.type === 'enemy' && fixtureA.part !== 'head' && fixtureA.type === 'platform') {
                
                if (fixtureA.type === 'enemy') {
                    for(var i = 0; i < enemies.length; i++) {
                        if (enemies[i].id === fixtureA.id) {
                            enemies[i].is_flying = false;
                        }
                    }
                } else {
                    if (fixtureB.type === 'enemy') {
                        for(var i = 0; i < enemies.length; i++) {
                            if (enemies[i].id === fixtureB.id) {
                                enemies[i].is_flying = false;
                            }
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
        var fixtureA = contact.m_fixtureA.m_userData;
        var fixtureB = contact.m_fixtureB.m_userData;
        
        if (fixtureA !== null && fixtureB !== null) {
            // PLAYER AND GROUND / PLATFORM
            if( fixtureA.type === 'player' && fixtureB.type === 'platform' || 
                fixtureB.type === 'player' && fixtureA.type === 'platform') {
                player.is_flying = true;
            }

            if( fixtureA.type === 'enemy' && fixtureB.type === 'platform' || 
                fixtureB.type === 'enemy' && fixtureA.type === 'platform') {
                
                if (fixtureA.type === 'enemy') {
                    for(var i = 0; i < enemies.length; i++) {
                        if (enemies[i].id === fixtureA.id) {
                            enemies[i].is_flying = true;
                        }
                    }
                } else {
                    if (fixtureB.type === 'enemy') {
                        for(var i = 0; i < enemies.length; i++) {
                            if (enemies[i].id === fixtureB.id) {
                                enemies[i].is_flying = true;
                            }
                        }
                    }
                }
            }
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

// ANIMATION HANDLERS
// ======================================================
function makeEnemyFly(enemy) {
        var vel = enemy.box2d.GetLinearVelocity();
        vel.y = (Math.random() * -1) - 1.5;
        if(enemy.direction === 'left') {
            vel.x = (Math.random() * -2) -2;
        } else {
            vel.x = (Math.random() * 2) + 2;
        }
        enemy.flap_wings = true;
        setTimeout(function(){enemy.flap_wings = false}, 1000)
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

// STATUS CHECKS
// ======================================================
function checkBoundries(obj) {    
    // BOTTOM OF THE SCREEN
    if (obj.box2d.GetPosition().y > CANVAS_HEIGHT / SCALE){
        // take character off screen and then kill him silently :(
        obj.box2d.SetPosition(new b2Vec2(-999, -999));

        if(obj.type === 'player') { killPlayer() }
        if(obj.type === 'enemy') { killEnemy(obj, true) }
    }
    // LEFT OF THE SCREEN
    else if (obj.box2d.GetPosition().x > CANVAS_WIDTH / SCALE) {
        obj.box2d.SetPosition(new b2Vec2(0, obj.box2d.GetPosition().y)); 
    }
    // RIGHT OF THE SCREEN
    else if (obj.box2d.GetPosition().x < 0) {
        obj.box2d.SetPosition(new b2Vec2(CANVAS_WIDTH / SCALE, obj.box2d.GetPosition().y)); 
    }
}

function checkStatus() {
    if (enemies.length === 0) {
        enemies['a'] = 'b';
        renderNextLevel();
    }
}

// UTILITIES
// ======================================================
function destroyObjects() {
    for(var i = 0; i < trash.length; i++) {
        world.DestroyBody(trash[i]);
    }
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
function killPlayer() {
    lives -= 1;
    updateLives();
    
    if(lives > 0) {
        trash.push(player.box2d)
        player_alive = false;
        resetPlayer();
    
    // GAME OVER
    } else {
        gameOver();
    }
}
function initEnemies(level) {
    createEnemies(level);
    flapTheWings();
}
function killEnemy(enemy, is_fixture_data) {
    for(var i = 0; i < enemies.length; i++ ) {                
        if (is_fixture_data) {
            if (enemies[i].id === enemy.box2d.m_fixtureList.m_userData.id) {
                enemies.splice(i, 1);
            }  
        } else {
            if (enemies[i].id === enemy.m_userData.id) {
                enemies.splice(i, 1);
            }
        }
    }
    score +=1;
}

function updateScore() {
    $('#score span').html(score);
}

function updateLives() {
    $('#lives span').html(lives);
}

function updateLevel() {
    $('#level span').html(level);
}

function updatePlayerInfo() {
    $('#player-name').html(player_name);
    $('#high-score').html(high_score);
}

function gameOver() {
    player_alive = false;
    lives = 0;
    
    updateLives();
    trash.push(player.box2d)

    console.log('Game Over')

    // New High Score        
    if(score > localStorage['high_score'] || !localStorage['high_score']) {
        console.log('New high score!!')
        localStorage['high_score'] = score;
        high_score = score;
        updatePlayerInfo();
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






