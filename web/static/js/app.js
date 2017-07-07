import "phoenix_html"
import { gameChannel } from "./socket"

const WIDTH = 1920
const HEIGHT = 1080
const WORLD_SCALE = 2

const WORLD_WIDTH = WIDTH * WORLD_SCALE
const WORLD_HEIGHT = HEIGHT * WORLD_SCALE

const PLAYER_ANGULAR_VELOCITY = Phaser.Math.degToRad(2);
const PLAYER_MOVEMENT_VELOCITY = 400;


const game = new Phaser.Game(WIDTH, HEIGHT, Phaser.CANVAS, null, { preload: preload, create: create, update: update, render: render })

function preload() {
  game.load.image('pirate', 'images/pirate.png')
  game.load.image('cannonball', 'images/cannonball.png');
  game.load.image('mute', 'images/mute.png')
  game.load.image('fullscreen', 'images/fullscreen.png')
  game.load.audio('chantey', 'sounds/pirates.wav')
}

let player;
let chantey;
let leftCannons;
let rightCannons;
let gameState = [];
const spriteCache = {};
const wrapMatrix = [];
const sprites = [];

function create() {
  setupScaling()

  game.stage.backgroundColor = "#0000FF"
  createMuteButton()

  // TODO: the following line is for development purposes only
  // remove this before releasing game
  game.stage.disableVisibilityChange = true

  player = addShip()
  game.input.onDown.add(shoot);

  game.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  game.camera.follow(player)

  leftCannons = addWeapons('left');
  rightCannons = addWeapons('right');

  gameChannel.on("state_tick", ({ state }) => {
    gameState = state
    // Update and cache connected sprites
    cleanDisconnectedPlayers()
  })
}

const trailInterval = 5
var trailCounter = trailInterval

function update() {
  /// Input
  handleInput()
  // TODO bundle trails in with player and enemy updating, use weapons module
  updateEnemies()
  // Drop disconnected sprites
  updateTrails()
  // update game server with our own view of the world, whatever that is
  pushStateToServer()
}

function render() {
  // Add post-update rendering here, probably not needed except for debugging
}

function pushStateToServer() {
  const playerState = extractStateData(player);
  const cannonballs = getCannonBalls();
  const cannonballState = cannonballs.map(extractStateData);

  Object.assign(playerState, { cannonballs: cannonballState });

  gameChannel.push("player_state", playerState)
}

function extractStateData(sprite) {
  const { offsetX, offsetY, body: { rotation, position: { x, y } }, visible } = sprite;
  return {
    pos: {
      x: x + offsetX,
      y: y + offsetY
    },
    rot: Phaser.Math.degToRad(rotation),
    visible,
  };
}

function getCannonBalls() {
  const cannonballs = [];
  leftCannons.forEach(c => c.bullets.forEach(b => cannonballs.push(b)));
  rightCannons.forEach(c => c.bullets.forEach(b => cannonballs.push(b)));
  return cannonballs;
}

function addShip() {
  let x = Math.random() * WORLD_WIDTH
  let y = Math.random() * WORLD_HEIGHT
  let sprite = game.add.sprite(x, y, 'pirate')
  sprite.anchor.set(0.5)
  game.physics.enable(sprite, Phaser.Physics.ARCADE)
  sprite.body.setCircle(sprite.width / 2, 0, 0)
  return sprite
}

function addCannonball() {
  let x = game.world.centerX
  let y = game.world.centerY

  let sprite = game.add.sprite(x, y, 'cannonball')
  sprite.anchor.set(0.5)
  sprite.scale.setTo(0.2, 0.2);
  game.physics.enable(sprite, Phaser.Physics.ARCADE)
  sprite.body.setCircle(sprite.width / 10, 0, 0)
  return sprite
}

function createMuteButton() {
  // TODO get better mute button asset, size it correctly, add frames
  const muteButton = game.add.button(10, 10, 'mute', () => chantey.mute = !chantey.mute)
  muteButton.height = 100
  muteButton.width = 100
  muteButton.fixedToCamera = true
  chantey = game.add.audio('chantey')
  chantey.loopFull(0.3)
  chantey.mute = true // remember initial mute state
}
function setupScaling() {
  // configure device-specific settings
  if (game.device.desktop) { // desktop
    // setupChat()
  } else { // mobile

  }

  // configure fullscreen
  if (game.scale.compatibility.supportsFullScreen) {
    game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL
    createFullScreenButton()
  }

  Object.assign(game.scale, {
    scaleMode: Phaser.ScaleManager.SHOW_ALL,
    pageAlignHorizontally: true,
    pageAlignVertically: true,
  })
}

function lockOrientationWhenSupported() {
  screen.orientation.lock('landscape').catch(err => { /* not supported, so do nothing */ })
}

function createFullScreenButton() {
  // TODO get better mute button asset, size it correctly, add frames
  const fullscreenButton = game.add.button(10, game.world.bounds.height, 'fullscreen', toggleFullScreen)
  fullscreenButton.anchor.y = 1
  fullscreenButton.height = 100
  fullscreenButton.width = 100
  fullscreenButton.fixedToCamera = true
}

function toggleFullScreen() {
  if (game.scale.isFullScreen) {
    game.scale.stopFullScreen()
  }
  else {
    game.scale.startFullScreen(false)
  }
}

function handleInput() {
  let diff = Phaser.Math.wrapAngle(game.physics.arcade.angleToPointer(player) - player.rotation, true)
  player.rotation += Math.min(Math.abs(diff), PLAYER_ANGULAR_VELOCITY) * Math.sign(diff)
  game.physics.arcade.velocityFromRotation(player.rotation, PLAYER_MOVEMENT_VELOCITY, player.body.velocity)
  if (Phaser.Rectangle.contains(player.body, game.input.worldX, game.input.worldY)) {
    player.body.velocity.setTo(0, 0)
  }
}

function cleanDisconnectedPlayers() {
  const enemyIds = gameState.map(({ id }) => id);

  Object.keys(spriteCache).forEach(id => {
    if (!enemyIds.includes(id)) {
      spriteCache[id].destroy()
      delete spriteCache[id]
    }
  })
}

function updateEnemies() {
  for (let enemy of gameState) {
    const { id, rot, pos: { x, y }, cannonballs } = enemy
    let newEnemy = false;
    if (!spriteCache[id]) {
      spriteCache[id] = addShip()
      newEnemy = true;
    }
    spriteCache[id].x = x
    spriteCache[id].y = y
    spriteCache[id].rotation = rot
    if (newEnemy) {
      spriteCache[id].cannonballs = cannonballs.map(c => addCannonball());
    }
    spriteCache[id].cannonballs.forEach((sprite, ind) => {
      const { visible, rot, pos: { x, y } } = cannonballs[ind];
      sprite.visible = visible;
      sprite.x = x;
      sprite.y = y;
      sprite.rotation = rot;
    })
  }
}

function updateTrails() {
  if (trailCounter++ > trailInterval) {
    trailCounter = 0

    for (let { x, y } of gameState.map(({ pos }) => pos).concat(player)) {
      // Draw trail
      let trail = game.add.graphics(0, 0)
      trail.beginFill(0xffffff)
      trail.drawCircle(x, y, 3)
      trail.endFill()
      setTimeout(() => trail.destroy(), 3000) // Keep trail 3 seconds long
    }
  }
}

function shoot() {
  leftCannons.forEach(c => c.fireAngle = player.angle + 270);
  leftCannons.forEach(c => c.fire());

  rightCannons.forEach(c => c.fireAngle = player.angle + 90);
  rightCannons.forEach(c => c.fire());
}

function addWeapons(side, num = 3) {
  function makeWeapon() {
    const weapon = game.add.weapon(1, 'cannonball');

    weapon.bullets.forEach((b) => {
      b.scale.setTo(0.2, 0.2);
    }, this);

    weapon.bulletKillType = Phaser.Weapon.KILL_LIFESPAN;
    weapon.bulletLifespan = 800;
    weapon.bulletAngleVariance = 10;
    weapon.bulletSpeedVariance = 100;

    weapon.fireRate = 500; // 1 shot per x ms
    weapon.bulletSpeed = 600;

    weapon.trackSprite(player, 0, 0);

    weapon.onFire.add(addShipVelocity);
    return weapon;
  }

  let weapons = []
  for (let i = 0; i != num; ++i) {
    weapons[i] = makeWeapon()
  }
  return weapons;
}

function addShipVelocity(bullet, weapon) {
  bullet.body.velocity.x += player.body.velocity.x;
  bullet.body.velocity.y += player.body.velocity.y;
}

// // TODO: make the chat part of the Phaser Game
// function setupChat() {
//   let chatInput = document.querySelector("#chat-input")
//   chatInput.focus()
//   let messagesContainer = document.querySelector("#messages")

//   chatInput.addEventListener("keypress", event => {
//     if (event.keyCode === 13) {
//       const message = chatInput.value.trim()
//       if (message !== '') {
//         gameChannel.push("new_chatmsg", { body: chatInput.value })
//         chatInput.value = ""
//       }
//     }
//   })

//   gameChannel.on("new_chatmsg", payload => {
//     let messageItem = document.createElement("li")
//     let now = new Date()
//     messageItem.innerText = `[${now.getHours()}:${(now.getMinutes() < 10 ? '0' : '') + now.getMinutes()}] ${payload.user}: ${payload.body}`
//     messagesContainer.insertBefore(messageItem, messagesContainer.firstChild)
//     setTimeout(() => messagesContainer.removeChild(messageItem), 8000)
//   })
// }
