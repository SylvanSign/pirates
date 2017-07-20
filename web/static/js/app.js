import "phoenix_html"
import { gameChannel } from "./socket"

const WIDTH = 1920
const HEIGHT = 1080
const WORLD_SCALE = 2

const WORLD_WIDTH = WIDTH * WORLD_SCALE
const WORLD_HEIGHT = HEIGHT * WORLD_SCALE


const game = new Phaser.Game(WIDTH, HEIGHT, Phaser.AUTO, null, { preload: preload, create: create, update: update, render: render })

function preload() {
  game.load.image('pirate', 'images/pirate.png')
  game.load.image('mute', 'images/mute.png')
  game.load.image('fullscreen', 'images/fullscreen.png')
  game.load.audio('chantey', 'sounds/pirates.wav')
}

let player
let chantey
let gameState = []
let spriteCache = {}

function create() {
  setupScaling()

  game.time.advancedTiming = true
  game.time.desiredFps = 60

  game.stage.backgroundColor = "#0000FF"
  createMuteButton()

  // TODO: the following line is for development purposes only
  // remove this before releasing game
  game.stage.disableVisibilityChange = true

  player = addSprite({ randomizePosition: true })

  game.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  game.camera.follow(player)

  gameChannel.on("state_tick", ({ state }) => {
    gameState = state
  })
}

const trailInterval = 5
var trailCounter = trailInterval

function update() {
  /// Input
  handleInput()
  // Update and cache connected sprites
  cleanDisconnectedPlayers()
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
  const { offsetX, offsetY, body: { rotation, position: { x, y } } } = player
  gameChannel.push("player_state", { pos: { x: x + offsetX, y: y + offsetY }, rot: Phaser.Math.degToRad(rotation) })
}

function addSprite({ randomizePosition = false } = {}) {
  let x = game.world.centerX
  let y = game.world.centerY
  if (randomizePosition) {
    x = Math.random() * WORLD_WIDTH
    y = Math.random() * WORLD_HEIGHT
  }
  let sprite = game.add.sprite(x, y, 'pirate')
  sprite.anchor.set(0.5)
  game.physics.enable(sprite, Phaser.Physics.ARCADE)
  sprite.body.setCircle(sprite.width / 2, 0, 0)
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
  game.physics.arcade.moveToPointer(player, 400)
  player.rotation = game.physics.arcade.angleToPointer(player)
  if (Phaser.Rectangle.contains(player.body, game.input.worldX, game.input.worldY)) {
    player.body.velocity.setTo(0, 0)
  }
}

function cleanDisconnectedPlayers() {
  const enemyIds = gameState.map(({ id }) => id)
  Object.keys(spriteCache).forEach(id => {
    if (!enemyIds.includes(id)) {
      spriteCache[id].destroy()
      delete spriteCache[id]
    }
  })
}

function updateEnemies() {
  for (let enemy of gameState) {
    const { id, rot, pos: { x, y } } = enemy
    spriteCache[id] = spriteCache[id] || addSprite()
    spriteCache[id].x = x
    spriteCache[id].y = y
    spriteCache[id].rotation = rot
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

// TODO For debugging only, pls remove later
function p(x) {
  console.log(x)
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
