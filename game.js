// === CONFIGURATION PARAMETERS ===
// Platform settings
const PLATFORM_SPACING    = 250;    // Vertical spacing between platforms.
const PLATFORM_SCALE_X    = 0.5;    // Multiply the platform's original width.
const PLATFORM_SCALE_Y    = 0.5;    // Multiply the platform's original height.
const PLATFORM_MIN_SPEED  = 5;      // Minimum horizontal speed.
const PLATFORM_MAX_SPEED  = 90;     // Maximum horizontal speed.

// Empty sprite settings
const TOTAL_EMPTY_SPRITES = 15;     // Total number of empty sprites.
const EMPTY_IDLE_DISTANCE = 10;     // How far (in pixels) the empty sprite floats up.
const EMPTY_IDLE_DURATION = 1000;   // Duration (ms) of the idle tween.
const EMPTY_IDLE_EASE     = 'Sine.easeInOut'; // Easing for the idle tween.

// New configuration for collectible items
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

// Player settings
const PLAYER_SPEED        = 450;    // Maximum horizontal speed.
const PLAYER_JUMP_HEIGHT  = -550;   // Base vertical jump velocity (adjusted by direction).
const PLAYER_WIDTH        = 84;     // Display width for player.
const PLAYER_HEIGHT       = 178;    // Display height for player.
const PLAYER_ANIMATED     = false;  // Set to true if using a spritesheet; false for a static image.
const PLAYER_FRAME_WIDTH  = 1000;   // (If animated) frame width.
const PLAYER_FRAME_HEIGHT = 1000;   // (If animated) frame height.

// Jump particle effect settings (trail)
const PARTICLE_SCALE      = 0.1;    // Starting scale for jump particles.
const TRAIL_PARTICLE_LIFESPAN = 500;              // Lifespan (ms) for each trail particle.
const TRAIL_PARTICLE_SPEED    = { min: -100, max: 100 }; // Speed range for trail particles.
const TRAIL_PARTICLE_OFFSET_Y = 64;                // Vertical offset from player's center to bottom edge.
const TRAIL_PARTICLE_EMIT_DURATION = 200;          // Duration (ms) for emission.

// Star burst particle effect settings (on item collection)
const STAR_BURST_LIFESPAN = 1000;   // Lifespan (ms) for star particles.
const STAR_BURST_QUANTITY = 10;     // Number of star particles in burst.
const STAR_BURST_SCALE    = 0.5;    // Starting scale for star particles.
const STAR_BURST_SPEED    = { min: -200, max: 200 }; // Speed range for star particles.

// Score/HUD settings
const SCORE_FONT_SIZE     = 32;                    // Font size (px) for the score.
const SCORE_FONT_FAMILY   = '"Press Start 2P", cursive'; // Fancy gaming font.
const SCORE_FONT_COLOR    = "#ffffff";             // White color.
const SCORE_X             = 360 / 2;               // Centered horizontally (static for now).
const SCORE_Y             = 10;                    // 10px from top.

// === GAME CONFIGURATION ===
const config = {
  type: Phaser.AUTO,
  width: 360,  // Fixed base width
  height: 640, // Fixed base height
  scale: {
    mode: Phaser.Scale.FIT, // Fit within the screen, maintaining aspect ratio
    autoCenter: Phaser.Scale.CENTER_BOTH // Center both horizontally and vertically
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

// Helper: Spawns an empty sprite (collectible item) on a platform using a random texture 
// and sets up its idle tween.
function spawnEmptyOnPlatform(platform, scene) {
  console.log("Spawning empty sprite on platform at (" + platform.x + ", " + platform.y + ")");
  let platformTop = platform.y - platform.displayHeight / 2;
  // Choose a random item from the list
  let itemKey = Phaser.Utils.Array.GetRandom(ITEM_NAMES);
  let emptySprite = scene.add.sprite(platform.x, platformTop, itemKey);
  emptySprite.setOrigin(0.5, 1); // Align bottom edge.
  
  // Set display size based on the config height while preserving aspect ratio.
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
    ease: EMPTY_IDLE_EASE,
    onStart: () => { console.log("Idle tween started for empty sprite on platform at (" + platform.x + ", " + platform.y + ")"); }
  });
}

function preload() {
  console.log("Preloading assets...");
  console.log("Phaser version:", Phaser.VERSION); // Verify version
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
  this.load.image('stars', 'assets/stars.png'); // Load stars texture for burst
  this.load.on('filecomplete-image-particle', () => {
    console.log("Particle texture loaded successfully!");
  });
  this.load.on('loaderror', (file) => {
    console.error("Error loading file:", file.key);
  });
  // Load all collectible item textures
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
  console.log("Creating scene...");
  let bg = this.add.image(0, 0, 'background').setOrigin(0, 0);
  bg.displayWidth = config.width;  // Use base width
  bg.displayHeight = config.height; // Use base height
  
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
  
  platforms = this.physics.add.group();
  // Ensure consistent spacing by starting at bottom and decreasing by PLATFORM_SPACING
  let platformY = config.height - 20;
  while (platformY >= -PLATFORM_SPACING) { // Spawn platforms above screen too
    let x = Phaser.Math.Between(20, config.width - 20);
    let plat = platforms.create(x, platformY, 'platform');
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
    platformY -= PLATFORM_SPACING; // Consistent spacing
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
  scoreText = this.add.text(config.width / 2, SCORE_Y, "TORI: " + score, { font: SCORE_FONT_SIZE + "px " + SCORE_FONT_FAMILY, fill: SCORE_FONT_COLOR });
  scoreText.setOrigin(0.5, 0);
  
  this.physics.add.overlap(player, empties, (player, emptySprite) => {
    collectEmpty(player, emptySprite, this);
  }, null, this);
  
  this.input.on('pointerdown', (pointer) => {
    pointerDownStart = { x: pointer.x, y: pointer.y, time: pointer.downTime };
    isDragging = false;
    console.log("Pointer down at (" + pointer.x + ", " + pointer.y + ")");
  });
  
  this.input.on('pointermove', (pointer) => {
    if (pointer.isDown) {
      let dx = pointer.x - pointerDownStart.x;
      if (Math.abs(dx) > 15) {
        isDragging = true;
        let newVel = Phaser.Math.Clamp((pointer.x - player.x) * 2, -PLAYER_SPEED, PLAYER_SPEED);
        player.setVelocityX(newVel);
        console.log("Dragging: setting player velocity to " + newVel);
      }
    }
  });
  
  this.input.on('pointerup', (pointer) => {
    let dx = pointer.x - pointerDownStart.x;
    let dy = pointer.y - pointerDownStart.y;
    let duration = pointer.upTime - pointerDownStart.time;
    console.log("Pointer up after " + duration + " ms, dx: " + dx + ", dy: " + dy);
    if (!isDragging && duration < 300 && Math.abs(dx) < 15 && Math.abs(dy) < 15) {
      let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
      let velocityX = Math.cos(angle) * PLAYER_SPEED;
      let velocityY = Math.sin(angle) * PLAYER_SPEED;
      velocityY = Math.min(velocityY, PLAYER_JUMP_HEIGHT);
      player.setVelocity(velocityX, velocityY);
      console.log("Player jump triggered towards (" + pointer.x + ", " + pointer.y + ")");
      if (PLAYER_ANIMATED) {
        player.anims.play('jump', true);
      }
      // Jump trail particles (Phaser 3.88.2 compatible)
      particles = this.add.particles('particle', {
        frame: { frames: ['particle'], cycle: true },
        scale: { start: PARTICLE_SCALE, end: 0 },
        blendMode: 'ADD',
        speed: TRAIL_PARTICLE_SPEED,
        lifespan: TRAIL_PARTICLE_LIFESPAN,
        frequency: 10,
        quantity: 5,
        emitting: false // Start off
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
    platforms.children.iterate((platform) => {
      platform.y += delta;
      if (platform.y > config.height + PLATFORM_SPACING) { // Ensure full spacing when recycling
        platform.y = -PLATFORM_SPACING; // Start above screen with consistent spacing
        platform.x = Phaser.Math.Between(20, config.width - 20);
        let newVx = Phaser.Math.Between(PLATFORM_MIN_SPEED, PLATFORM_MAX_SPEED);
        if (Phaser.Math.Between(0, 1)) newVx = -newVx;
        platform.body.setVelocityX(newVx);
        if (platform.emptySprite) {
          platform.emptySprite.destroy();
          platform.emptySprite = null;
        }
        spawnEmptyOnPlatform(platform, this);
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
    console.log("Player fell; restarting game.");
    restartGame(this);
  }
}

function collectEmpty(player, emptySprite, scene) {
  if (!emptySprite.active) return;
  console.log("Collecting empty sprite at (" + emptySprite.x + ", " + emptySprite.y + ")");
  emptySprite.scene.tweens.killTweensOf(emptySprite);
  emptySprite.body.enable = false;
  
  // Star burst particles (Phaser 3.88.2 compatible)
  let starParticles = scene.add.particles('stars', {
    frame: { frames: ['stars'], cycle: true },
    scale: { start: STAR_BURST_SCALE, end: 0 },
    blendMode: 'ADD',
    speed: STAR_BURST_SPEED,
    lifespan: STAR_BURST_LIFESPAN,
    quantity: STAR_BURST_QUANTITY,
    emitting: true, // Emit once immediately
    x: emptySprite.x,
    y: emptySprite.y,
    tint: Phaser.Utils.Array.GetRandom([0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF]) // Random colors: red, green, blue, yellow, purple
  });
  scene.time.delayedCall(STAR_BURST_LIFESPAN, () => {
    starParticles.destroy(); // Destroy after last particle dies
  });
  
  emptySprite.scene.tweens.add({
    targets: emptySprite,
    x: player.x,
    y: player.y,
    scaleX: 0,
    scaleY: 0,
    duration: 500,
    ease: 'Quad.easeIn',
    onStart: () => { console.log("Collection tween started for empty sprite."); },
    onComplete: function() {
      console.log("Empty sprite collection tween complete.");
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
