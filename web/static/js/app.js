// Brunch automatically concatenates all files in your
// watched paths. Those paths can be configured at
// config.paths.watched in "brunch-config.js".
//
// However, those files will only be executed if
// explicitly imported. The only exception are files
// in vendor, which are never wrapped in imports and
// therefore are always executed.

// Import dependencies
//
// If you no longer want to use a dependency, remember
// to also remove its path from "config.paths.watched".
import "phoenix_html"

// Import local files
//
// Local files can be imported directly using relative
// paths "./socket" or full ones "web/static/js/socket".

// import socket from "./socket"


var game = new Phaser.Game('100', '100', Phaser.AUTO, 'phaser-example', { preload: preload, create: create, update: update, render: render });

function preload() {

    game.load.image('ball', 'images/pirate.png');

}

var sprite;
var bmd;

function create() {

    game.stage.backgroundColor = "#0000FF";

    sprite = game.add.sprite(game.world.centerX, game.world.centerY, 'ball');
    sprite.scale.setTo(.2, .2); // SCALING PNG'S IS HARD
    sprite.anchor.setTo(.5, .5);
    game.physics.enable(sprite, Phaser.Physics.ARCADE);

    sprite.body.debug = true;

    bmd = game.add.bitmapData(game.width, game.height);
    bmd.move(game.width, game.height);
    bmd.context.fillStyle = '#ffffff';
    for (let x of [0-game.width, 0, game.width])
        for (let y of [0-game.height, 0, game.height])
            game.add.sprite(x, y, bmd);

    game.world.setBounds(900, 900);
    game.camera.follow(sprite);
    game.camera.bounds = null;

}

function update() {

    //  400 is the speed it will move towards the mouse
    game.physics.arcade.moveToPointer(sprite, 400);
    sprite.rotation = game.physics.arcade.angleToPointer(sprite);

    //  if it's overlapping the mouse, don't move any more
    if (Phaser.Rectangle.contains(sprite.body, game.input.worldX, game.input.worldY))
    {
        sprite.body.velocity.setTo(0, 0);
    }

    bmd.context.fillRect(sprite.x, sprite.y, 2, 2);
    bmd.dirty = true;

    if (sprite.x > game.width) sprite.x = 0;
    if (sprite.x < 0) sprite.x = game.width;
    if (sprite.y > game.height) sprite.y = 0;
    if (sprite.y < 0) sprite.y = game.height;
        
    game.debug.body(sprite);

}

function render() {

    game.debug.cameraInfo(game.camera, 32, 32);
    game.debug.spriteCoords(sprite, 32, 500);
    game.debug.inputInfo(500, 500);

}
