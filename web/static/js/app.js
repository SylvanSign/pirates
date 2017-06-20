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


var game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-example', { preload: preload, create: create, update: update });

function preload() {

    game.load.image('ball', 'images/pirate.png');

}

var sprite;

function create() {

    game.stage.backgroundColor = "#0000FF";

    sprite = game.add.sprite(game.world.centerX, game.world.centerY, 'ball');
    sprite.scale.setTo(.2, .2); // SCALING PNG'S IS HARD
    sprite.anchor.setTo(.5, .5);
    game.physics.enable(sprite, Phaser.Physics.ARCADE);

}

function update() {

    // //  only move when you click
    // if (game.input.mousePointer.isDown)
    // {
        //  400 is the speed it will move towards the mouse
        game.physics.arcade.moveToPointer(sprite, 400);
        sprite.rotation = game.physics.arcade.angleToPointer(sprite);

        //  if it's overlapping the mouse, don't move any more
        if (Phaser.Rectangle.contains(sprite.body, game.input.x, game.input.y))
        {
            sprite.body.velocity.setTo(0, 0);
        }
    // }
    // else
    // {
    //     sprite.body.velocity.setTo(0, 0);
    // }

}
