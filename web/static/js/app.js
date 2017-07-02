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
  game.load.image('mute', 'images/mute.png');
  game.load.audio('chantey', 'sounds/pirates.wav');

}

var player;
let chantey;
var gameState = [];
var spriteCache = [];
var wrapMatrix = [];

function create() {

  game.stage.backgroundColor = "#0000FF";
  // TODO get better mute button asset, size it correctly, add frames
  const muteButton = game.add.button(10, 10, 'mute', toggleMute)
  muteButton.height = 50;
  muteButton.width = 50;
  muteButton.fixedToCamera = true

  // TODO: the following line is for development purposes only;
  // remove this before releasing game
  game.stage.disableVisibilityChange = true;

  player = addSprite();
  player.body.debug = true;
  chantey = game.add.audio('chantey');
  chantey.loopFull(0.3);
  // chantey.mute = true; // remember initial mute state

  game.world.setBounds(0, 0, 2500, 2500);
  game.camera.follow(player);
  game.camera.bounds = null;

  gameChannel.on("state_tick", ({ state }) => {
    gameState = state;
  })

  for (let [ix, x] of [0 - game.world.bounds.width, 0, game.world.bounds.width].entries())
    for (let [iy, y] of [0 - game.world.bounds.height, 0, game.world.bounds.height].entries())
      wrapMatrix[ix * 3 + iy] = { x: x, y: y };
}

const trailInterval = 5;
var trailCounter = trailInterval;

function update() {

  /// Input
  game.physics.arcade.moveToPointer(player, 400);
  player.rotation = game.physics.arcade.angleToPointer(player);
  if (Phaser.Rectangle.contains(player.body, game.input.worldX, game.input.worldY)) {
    player.body.velocity.setTo(0, 0);
  }

  // Drop disconnected sprites
  for (let charId in spriteCache) {
    if (gameState.every(c => c.id != charId)) {
      for (let sprite of spriteCache[charId]) {
        sprite.body = null;
        sprite.destroy();
      }
      spriteCache.splice(charId, 1);
    }
  }

  // Update and cache connected sprites
  for (let char of gameState) {
    let spriteMatrix = spriteCache[char.id] = spriteCache[char.id] || addSpriteMatrix();
    for (let [i, m] of wrapMatrix.entries()) {
      let sprite = spriteMatrix[i];
      sprite.x = char.pos.x + m.x;
      sprite.y = char.pos.y + m.y;
      sprite.rotation = char.rot;
    }
  }

  if (trailCounter++ > trailInterval) {
    trailCounter = 0;

    for (let pos of gameState.map(c => c.pos).concat(player)) {
      // Draw trail
      let trail = game.add.graphics(0, 0);
      for (let x of [0 - game.world.bounds.width, 0, game.world.bounds.width])
        for (let y of [0 - game.world.bounds.height, 0, game.world.bounds.height]) {
          trail.beginFill(0xffffff);
          trail.drawCircle(x + pos.x, y + pos.y, 3);
          trail.endFill();
        }
      setTimeout(() => trail.destroy(), 3000); // Keep trail 3 seconds long
    }
  }

  // Wrap player into game world
  const boundsWidth = game.world.bounds.width;
  const boundsHeight = game.world.bounds.height;
  if (player.x > boundsWidth)
    player.x = player.x - boundsWidth;
  if (player.x < 0)
    player.x = boundsWidth + player.x;
  if (player.y > boundsHeight)
    player.y = player.y - boundsHeight;
  if (player.y < 0)
    player.y = boundsHeight + player.y;

  game.debug.body(player);

  pushStateToServer();
}

function render() {

}

function pushStateToServer() {
  const { offsetX, offsetY, body: { rotation, position: { x, y } } } = player;
  gameChannel.push("player_state", { pos: { x: x + offsetX, y: y + offsetY }, rot: Phaser.Math.degToRad(rotation) })
}

function addSprite() {
  let sprite = game.add.sprite(game.world.centerX, game.world.centerY, 'pirate');
  sprite.anchor.set(0.5);
  game.physics.enable(sprite, Phaser.Physics.ARCADE);
  sprite.body.setCircle(sprite.width / 2, 0, 0);
  return sprite;
}

function addSpriteMatrix() {
  let matrix = [];
  for (let i = 0; i < wrapMatrix.length; i++)
    matrix.push(addSprite());
  return matrix;
}

function toggleMute(/* button, pointer, isOver */) {
  chantey.mute = !chantey.mute
}
