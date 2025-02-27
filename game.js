// === CONFIGURATION PARAMETERS ===
// (Unchanged from your provided code)
const PLATFORM_SPACING    = 250;
const PLATFORM_SCALE_X    = 0.5;
const PLATFORM_SCALE_Y    = 0.5;
const PLATFORM_MIN_SPEED  = 5;
const PLATFORM_MAX_SPEED  = 90;

const TOTAL_EMPTY_SPRITES = 15;
const EMPTY_IDLE_DISTANCE = 10;
const EMPTY_IDLE_DURATION = 1000;
const EMPTY_IDLE_EASE     = 'Sine.easeInOut';

const ITEM_NAMES = ['icecream', 'banana', 'broccoli', 'carrot', 'cherry', 'kitty', 'mermais', 'princess', 'strawberry', 'unicorn', 'watermelon'];
const EMPTY_SPRITE_CONFIG = {
  icecream:   { height: 64 },
  banana:     { height: 64 },
  broccoli:   { height: 64 },
  carrot:     { height: 64 },
  cherry:     { height: 64 },
  kitty:      { height: 64 },
  mermais:    { height: 64 },
  princess:   { height: 64 },
  strawberry: { height: 64 },
  unicorn:    { height: 64 },
  watermelon: { height: 64 }
};

const PLAYER_SPEED        = 450;
const PLAYER_JUMP_HEIGHT  = -550;
const PLAYER_WIDTH        = 84;
const PLAYER_HEIGHT       = 178;
const PLAYER_ANIMATED     = false;
const PLAYER_FRAME_WIDTH  = 1000;
const PLAYER_FRAME_HEIGHT = 1000;

const PARTICLE_SCALE      = 0.1;
const TRAIL_PARTICLE_LIFESPAN = 500;
const TRAIL_PARTICLE_SPEED    = { min: -100, max: 100 };
const TRAIL_PARTICLE_OFFSET_Y = 64;
const TRAIL_PARTICLE_EMIT_DURATION = 200;

const STAR_BURST_LIFESPAN = 1000;
const STAR_BURST_QUANTITY = 20;
const STAR_BURST_SCALE    = 0.2;
const STAR_BURST_SPEED    = { min: 50, max: 200 };

const SCORE_FONT_SIZE     = 32;
const SCORE_FONT_FAMILY   = '"Press Start 2P", cursive';
const SCORE_FONT_COLOR    = "#ffffff";
const SCORE_X             = 360 / 2;
const SCORE_Y             = 10;

// === GAME CONFIGURATION ===
const config = {
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 600 }, debug: false }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

let player, platforms, empties, scoreText, particles;
let pointerDownStart = { x: null, y: null, time: null };
let isDragging = false;
let score = 0;

const game = new Phaser.Game(config);

function spawnEmptyOnPlatform(platform, scene) {
  let platformTop = platform.y - platform.displayHeight / 2;
  let itemKey = Phaser.Utils.Array.GetRandom(ITEM_NAMES);
  let emptySprite = scene.add.sprite(platform.x, platformTop, itemKey);
  emptySprite.setOrigin(0.5, 1);
  
  let texture = scene.textures.get(itemKey).getSourceImage();
  let originalWidth = texture.width;
  let originalHeight = texture.height;
  let desiredHeight = EMPTY_SPRITE_CONFIG[itemKey].height;
  let scaleFactor = desiredHeight / originalHeight;
  let desiredWidth = originalWidth * scaleFactor;
  emptySprite.setDisplaySize(desiredWidth, desiredHeight);
  
  scene.physics.add.existing(emptySprite);
  emptySprite.body.setAllowGravity(false);
  emptySprite.body.setImmovable(true);
  emptySprite.customOffset = 0;
  emptySprite.parentPlatform = platform;
  platform.emptySprite = emptySprite;
  empties.add(emptySprite);
  scene.tweens.add({
    targets: emptySprite,
    customOffset: EMPTY_IDLE_DISTANCE,
    duration: EMPTY_IDLE_DURATION,
    yoyo: true,
    repeat: -1,
    ease: EMPTY_IDLE_EASE
  });
}

function preload() {
  this.load.image('background', 'assets/background.png');
  this.load.image('platform', 'assets/platform.png');
  if (PLAYER_ANIMATED) {
    this.load.spritesheet('player', 'assets/player.png', {
      frameWidth: PLAYER_FRAME_WIDTH,
      frameHeight: PLAYER_FRAME_HEIGHT
    });
  } else {
    this.load.image('player', 'assets/player.png');
  }
  this.load.image('particle', 'assets/particle.png');
  this.load.image('stars', 'assets/stars.png');
  this.load.image('icecream', 'assets/icecream.png');
  this.load.image('banana', 'assets/banana.png');
  this.load.image('broccoli', 'assets/broccoli.png');
  this.load.image('carrot', 'assets/carrot.png');
  this.load.image('cherry', 'assets/cherry.png');
  this.load.image('kitty', 'assets/kitty.png');
  this.load.image('mermais', 'assets/mermais.png');
  this.load.image('princess', 'assets/princess.png');
  this.load.image('strawberry', 'assets/strawberry.png');
  this.load.image('unicorn', 'assets/unicorn.png');
  this.load.image('watermelon', 'assets/watermelon.png');
}

function create() {
  let bg = this.add.image(0, 0, 'background').setOrigin(0, 0);
  bg.displayWidth = config.width;
  bg.displayHeight = config.height;
  
  if (PLAYER_ANIMATED) {
    this.anims.create({
      key: 'idle',
      frames: [{ key: 'player', frame: 0 }],
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'jump',
      frames: [{ key: 'player', frame: 1 }],
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'walk',
      frames: this.anims.generateFrameNumbers('player', { start: 2, end: 5 }),
      frameRate: 10,
      repeat: -1
    });
  }
  
  // Fixed platform creation: one platform per vertical level
  platforms = this.physics.add.group();
  const INITIAL_LEVELS = 8;
  for (let level = 0; level < INITIAL_LEVELS; level++) {
    let y = config.height - 20 - level * PLATFORM_SPACING; // e.g., 620, 370, 120, -130, etc.
    let x = Phaser.Math.Between(20, config.width - 20);    // Random x between 20 and 340
    let plat = platforms.create(x, y, 'platform');
    plat.displayWidth = plat.width * PLATFORM_SCALE_X;
    plat.displayHeight = plat.height * PLATFORM_SCALE_Y;
    plat.body.setImmovable(true);
    plat.body.allowGravity = false;
    let vx = Phaser.Math.Between(PLATFORM_MIN_SPEED, PLATFORM_MAX_SPEED);
    if (Phaser.Math.Between(0, 1)) vx = -vx;
    plat.body.setVelocityX(vx);
    plat.body.setCollideWorldBounds(true);
    plat.body.setBounce(1, 0);
    plat.emptySprite = null;
  }
  
  if (PLAYER_ANIMATED) {
    player = this.physics.add.sprite(config.width / 2, config.height - 50, 'player');
    player.setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT);
    player.anims.play('idle');
  } else {
    player = this.physics.add.sprite(config.width / 2, config.height - 50, 'player');
    player.setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT);
  }
  player.setCollideWorldBounds(true);
  
  this.physics.add.collider(player, platforms);
  
  empties = this.add.group();
  platforms.getChildren().forEach((plat) => {
    if (empties.getLength() < TOTAL_EMPTY_SPRITES) {
      spawnEmptyOnPlatform(plat, this);
    }
  });
  
  score = 0;
  scoreText = this.add.text(SCORE_X, SCORE_Y, "TORI: " + score, { font: SCORE_FONT_SIZE + "px " + SCORE_FONT_FAMILY, fill: SCORE_FONT_COLOR });
  scoreText.setOrigin(0.5, 0);
  
  this.physics.add.overlap(player, empties, (player, emptySprite) => {
    collectEmpty(player, emptySprite, this);
  }, null, this);
  
  this.input.on('pointerdown', (pointer) => {
    pointerDownStart = { x: pointer.x, y: pointer.y, time: pointer.downTime };
    isDragging = false;
  });
  
  this.input.on('pointermove', (pointer) => {
    if (pointer.isDown) {
      let dx = pointer.x - pointerDownStart.x;
      if (Math.abs(dx) > 15) {
        isDragging = true;
        let newVel = Phaser.Math.Clamp((pointer.x - player.x) * 2, -PLAYER_SPEED, PLAYER_SPEED);
        player.setVelocityX(newVel);
      }
    }
  });
  
  this.input.on('pointerup', (pointer) => {
    let dx = pointer.x - pointerDownStart.x;
    let dy = pointer.y - pointerDownStart.y;
    let duration = pointer.upTime - pointerDownStart.time;
    if (!isDragging && duration < 300 && Math.abs(dx) < 15 && Math.abs(dy) < 15) {
      let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
      let velocityX = Math.cos(angle) * PLAYER_SPEED;
      let velocityY = Math.sin(angle) * PLAYER_SPEED;
      velocityY = Math.min(velocityY, PLAYER_JUMP_HEIGHT);
      player.setVelocity(velocityX, velocityY);
      if (PLAYER_ANIMATED) {
        player.anims.play('jump', true);
      }
      particles = this.add.particles(0, 0, 'particle', {
        scale: { start: PARTICLE_SCALE, end: 0 },
        blendMode: 'ADD',
        speed: TRAIL_PARTICLE_SPEED,
        lifespan: TRAIL_PARTICLE_LIFESPAN,
        frequency: 10,
        quantity: 5,
        on: false
      });
      particles.startFollow(player, 0, TRAIL_PARTICLE_OFFSET_Y);
      particles.start();
      this.time.delayedCall(TRAIL_PARTICLE_EMIT_DURATION, () => {
        particles.stop();
        this.time.delayedCall(TRAIL_PARTICLE_LIFESPAN, () => {
          particles.destroy();
        });
      });
    }
    pointerDownStart = { x: null, y: null, time: null };
  });
}

function update() {
  if (!this.input.activePointer.isDown) {
    player.setVelocityX(player.body.velocity.x * 0.95);
  }
  
  const scrollThreshold = 300;
  if (player.y < scrollThreshold) {
    let delta = scrollThreshold - player.y;
    player.y = scrollThreshold;
    let highestY = Math.min(...platforms.getChildren().map(p => p.y)); // Initial highest platform
    platforms.children.iterate((platform) => {
      platform.y += delta;
      if (platform.y > config.height + platform.displayHeight) {
        platform.y = highestY - PLATFORM_SPACING; // Place above current highest
        highestY = platform.y;                    // Update highestY for next platform
        platform.x = Phaser.Math.Between(20, config.width - 20);
        let newVx = Phaser.Math.Between(PLATFORM_MIN_SPEED, PLATFORM_MAX_SPEED);
        if (Phaser.Math.Between(0, 1)) newVx = -newVx;
        platform.body.setVelocityX(newVx);
        if (platform.emptySprite) {
          platform.emptySprite.destroy();
          platform.emptySprite = null;
        }
        if (Phaser.Math.Between(0, 1)) {
          spawnEmptyOnPlatform(platform, this);
        }
      }
    });
  }
  
  let deltaTime = this.game.loop.delta / 1000;
  platforms.children.iterate((platform) => {
    if (player.body.touching.down && platform.body.touching.up &&
        player.x > platform.x - platform.displayWidth / 2 &&
        player.x < platform.x + platform.displayWidth / 2) {
      player.x += platform.body.velocity.x * deltaTime;
    }
  });
  
  empties.getChildren().forEach((emptySprite) => {
    if (!emptySprite.active) return;
    if (emptySprite.parentPlatform) {
      let platform = emptySprite.parentPlatform;
      let platformTop = platform.y - (platform.displayHeight / 2);
      emptySprite.x = platform.x;
      emptySprite.y = platformTop + emptySprite.customOffset;
    }
  });
  
  scoreText.setText("TORI: " + score);
  
  if (!player.body.touching.down) {
    if (PLAYER_ANIMATED) player.anims.play('jump', true);
  } else {
    if (Math.abs(player.body.velocity.x) > 10) {
      if (PLAYER_ANIMATED) player.anims.play('walk', true);
    } else {
      if (PLAYER_ANIMATED) player.anims.play('idle', true);
    }
  }
  
  if (player.y > config.height) {
    restartGame(this);
  }
}

function collectEmpty(player, emptySprite, scene) {
  if (!emptySprite.active) return;
  emptySprite.scene.tweens.killTweensOf(emptySprite);
  emptySprite.body.enable = false;
  
  let emitterCenterX = emptySprite.x;
  let emitterCenterY = emptySprite.y - (emptySprite.displayHeight / 2);
  let starParticles = scene.add.particles(0, 0, 'stars', {
    scale: { start: STAR_BURST_SCALE, end: 0 },
    blendMode: 'ADD',
    speed: STAR_BURST_SPEED,
    radial: true,
    lifespan: STAR_BURST_LIFESPAN,
    quantity: STAR_BURST_QUANTITY,
    on: false,
    tint: () => Phaser.Utils.Array.GetRandom([0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF])
  });
  starParticles.setPosition(emitterCenterX, emitterCenterY);
  starParticles.start();
  scene.time.delayedCall(300, () => {
    starParticles.stop();
    scene.time.delayedCall(STAR_BURST_LIFESPAN, () => {
      starParticles.destroy();
    });
  });
  
  emptySprite.scene.tweens.add({
    targets: emptySprite,
    x: player.x,
    y: player.y,
    scaleX: 0,
    scaleY: 0,
    duration: 500,
    ease: 'Quad.easeIn',
    onComplete: function() {
      emptySprite.destroy();
    }
  });
  if (emptySprite.parentPlatform) {
    emptySprite.parentPlatform.emptySprite = null;
  }
  score++;
  emptySprite.scene.tweens.add({
    targets: scoreText,
    scale: 1.5,
    duration: 200,
    yoyo: true,
    ease: 'Power1'
  });
}

function restartGame(scene) {
  scene.scene.restart();
}
