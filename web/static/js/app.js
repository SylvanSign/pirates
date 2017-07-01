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

import { gameChannel } from "./socket"


var game = new Phaser.Game('100', '100', Phaser.AUTO, 'phaser-example', { preload: preload, create: create, update: update, render: render });

function preload() {

  game.load.image('pirate', 'images/pirate.png');

}

var player;
var gameWorld;

function create() {

  game.stage.backgroundColor = "#0000FF";

  player = game.add.sprite(game.world.centerX, game.world.centerY, 'pirate');
  player.anchor.setTo(.5, .5);
  game.physics.enable(player, Phaser.Physics.ARCADE);
  player.body.setCircle(player.width / 2, 0, 0);
  player.body.debug = true;

  game.world.setBounds(0, 0, 2500, 2500);
  game.camera.follow(player);
  game.camera.bounds = null;
  // gameWorld.scale.set(.5);

  gameChannel.on("state_tick", ({ state }) => {
    console.log(JSON.stringify(state));
  })
}

const trailInterval = 5;
var trailCounter = trailInterval;

function update() {

  // Move/turn toward pointer
  game.physics.arcade.moveToPointer(player, 400);
  player.rotation = game.physics.arcade.angleToPointer(player);

  // Stop on mouseover
  if (Phaser.Rectangle.contains(player.body, game.input.worldX, game.input.worldY)) {
    player.body.velocity.setTo(0, 0);
  }

  if (trailCounter++ > trailInterval) {
    trailCounter = 0;

    // Draw trail
    var trail = game.add.graphics(0, 0);
    for (let x of [0 - game.world.bounds.width, 0, game.world.bounds.width])
      for (let y of [0 - game.world.bounds.height, 0, game.world.bounds.height]) {
        trail.beginFill(0xffffff);
        trail.drawCircle(x + player.x, y + player.y, 3);
        trail.endFill();
      }
    setTimeout(() => trail.kill(), 3000); // Keep trail 3 seconds long
  }

  // Wrap player into game world
  if (player.x > game.world.bounds.width) player.x = 0;
  if (player.x < 0) player.x = game.world.bounds.width;
  if (player.y > game.world.bounds.height) player.y = 0;
  if (player.y < 0) player.y = game.world.bounds.height;

  game.debug.body(player);

  pushStateToServer();
}

function render() {

  game.debug.cameraInfo(game.camera, 32, 32);
  game.debug.spriteCoords(player, 32, 500);
  game.debug.inputInfo(500, 500);

}

function pushStateToServer() {
  const { body: { position, rotation } } = player;
  gameChannel.push("player_state", { pos: position, rot: rotation })
}
