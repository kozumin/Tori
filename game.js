// Game configuration
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

// Initialize the game
const game = new Phaser.Game(config);

// Game variables
let player, platforms, items, scoreText, particles, camera;
let score = 0;
let lastPlatformY = config.height - 50;

// Game parameters
const PLATFORM_SPACING_MIN = 150;    // Minimum vertical spacing between platforms
const PLATFORM_SPACING_MAX = 250;    // Maximum vertical spacing between platforms
const PLATFORM_LENGTH_MIN = 0.4;     // Minimum scale factor for platform width
const PLATFORM_LENGTH_MAX = 0.8;     // Maximum scale factor for platform width
const PLATFORM_SCALE_Y = 0.5;        // Scale factor for platform height
const PLATFORM_SPEED_MIN = 20;       // Minimum horizontal speed for platforms
const PLATFORM_SPEED_MAX = 80;       // Maximum horizontal speed for platforms
const PLAYER_JUMP_VELOCITY = -500;   // Player's jump velocity
const SCROLL_THRESHOLD = 200;        // Height at which screen scrolls upward
const ITEM_NAMES = ['star', 'gem', 'coin']; // Example item names

// Preload assets
function preload() {
  this.load.image('background', 'assets/background.png');
  this.load.image('platform', 'assets/platform.png');
  this.load.image('player', 'assets/player.png');
  this.load.image('particle', 'assets/particle.png');
  this.load.image('star', 'assets/star.png');
  this.load.image('gem', 'assets/gem.png');
  this.load.image('coin', 'assets/coin.png');
}

// Create game objects
function create() {
  // Background
  const bg = this.add.image(0, 0, 'background').setOrigin(0, 0).setScrollFactor(0);
  bg.displayWidth = config.width;
  bg.displayHeight = config.height;

  // Groups
  platforms = this.physics.add.group();
  items = this.physics.add.group();

  // Initial platforms
  lastPlatformY = config.height - 50;
  for (let i = 0; i < 6; i++) {
    const spacing = Phaser.Math.Between(PLATFORM_SPACING_MIN, PLATFORM_SPACING_MAX);
    lastPlatformY -= spacing;
    const x = Phaser.Math.Between(50, config.width - 50);
    createPlatform(this, x, lastPlatformY);
  }

  // Player
  player = this.physics.add.sprite(config.width / 2, config.height - 100, 'player')
    .setScale(0.5)
    .setCollideWorldBounds(true);
  this.physics.add.collider(player, platforms);
  this.physics.add.overlap(player, items, collectItem, null, this);

  // Camera
  camera = this.cameras.main;
  camera.setBounds(0, 0, config.width, Number.MAX_VALUE);
  camera.startFollow(player, false, 0, 0.1);

  // Input handling
  this.input.on('pointerdown', (pointer) => {
    if (player.body.touching.down) {
      player.setVelocityY(PLAYER_JUMP_VELOCITY);
      // Jump particle effect
      particles = this.add.particles(0, 0, 'particle', {
        scale: { start: 0.1, end: 0 },
        speed: { min: -50, max: 50 },
        lifespan: 300,
        frequency: 10,
        quantity: 5
      });
      particles.startFollow(player);
      this.time.delayedCall(200, () => particles.destroy());
    }
  });

  // Score
  scoreText = this.add.text(config.width / 2, 20, 'Score: 0', {
    fontSize: '24px',
    fontFamily: 'Arial',
    color: '#ffffff'
  }).setOrigin(0.5, 0).setScrollFactor(0);
}

// Update game state
function update() {
  // Screen scrolling
  if (player.y < camera.scrollY + SCROLL_THRESHOLD) {
    camera.scrollY = player.y - SCROLL_THRESHOLD;
  }

  // Platform management
  const bottomThreshold = camera.scrollY + config.height + 100;
  const topThreshold = camera.scrollY - PLATFORM_SPACING_MAX;

  platforms.getChildren().forEach(platform => {
    if (platform.y > bottomThreshold) {
      if (platform.item) platform.item.destroy();
      platform.destroy();
    }
  });

  if (lastPlatformY > topThreshold) {
    const spacing = Phaser.Math.Between(PLATFORM_SPACING_MIN, PLATFORM_SPACING_MAX);
    lastPlatformY -= spacing;
    const x = Phaser.Math.Between(50, config.width - 50);
    createPlatform(this, x, lastPlatformY);
  }

  // Update score display
  scoreText.setText(`Score: ${score}`);
}

// Create a platform
function createPlatform(scene, x, y) {
  const platform = platforms.create(x, y, 'platform');
  const scaleX = Phaser.Math.FloatBetween(PLATFORM_LENGTH_MIN, PLATFORM_LENGTH_MAX);
  platform.setScale(scaleX, PLATFORM_SCALE_Y);
  platform.body.setImmovable(true);
  platform.body.checkCollision.down = false;
  platform.body.checkCollision.left = false;
  platform.body.checkCollision.right = false;

  // Random horizontal movement
  const speed = Phaser.Math.Between(PLATFORM_SPEED_MIN, PLATFORM_SPEED_MAX);
  const direction = Phaser.Math.Between(0, 1) ? 1 : -1;
  platform.body.setVelocityX(speed * direction);
  platform.speed = speed;
  platform.direction = direction;

  // Bounce off world bounds
  platform.update = function() {
    if (this.x < this.displayWidth / 2) {
      this.body.setVelocityX(this.speed);
    } else if (this.x > config.width - this.displayWidth / 2) {
      this.body.setVelocityX(-this.speed);
    }
  };
  scene.physics.world.on('worldstep', () => platform.update());

  // Add item
  const itemName = Phaser.Utils.Array.GetRandom(ITEM_NAMES);
  const item = items.create(x, y - (platform.displayHeight / 2) - 20, itemName)
    .setScale(0.5);
  item.parentPlatform = platform;
  platform.item = item;

  // Idle animation
  scene.tweens.add({
    targets: item,
    y: item.y - 10,
    duration: 1000,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1
  });
}

// Collect an item
function collectItem(player, item) {
  if (!item.active) return;
  item.active = false;

  // Collection animation
  this.tweens.add({
    targets: item,
    scale: 0,
    duration: 300,
    ease: 'Power2',
    onComplete: () => item.destroy()
  });

  // Particle effect
  const particles = this.add.particles(item.x, item.y, 'particle', {
    scale: { start: 0.2, end: 0 },
    speed: { min: 50, max: 150 },
    lifespan: 500,
    quantity: 20,
    radial: true
  });
  this.time.delayedCall(500, () => particles.destroy());

  score++;
  item.parentPlatform.item = null;
}
