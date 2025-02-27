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
let player, platforms, items, scoreText, particles, camera, background;
let score = 0;
let lastPlatformY = config.height - 50;

// Game parameters
const PLATFORM_SPACING_MIN = 100;       // Minimum vertical spacing between platforms
const PLATFORM_SPACING_MAX = 200;       // Maximum vertical spacing between platforms
const PLATFORM_LENGTH_MIN = 0.5;        // Minimum width scale factor
const PLATFORM_LENGTH_MAX = 1.5;        // Maximum width scale factor
const PLATFORM_SCALE_Y = 0.2;           // Height scale factor
const PLATFORM_SPEED_MIN = 20;          // Minimum horizontal speed
const PLATFORM_SPEED_MAX = 50;          // Maximum horizontal speed
const SCROLL_THRESHOLD = 300;           // Height at which scrolling triggers

// Preload assets
function preload() {
  this.load.image('background', 'assets/enchanted_forest_background.png');
  this.load.image('platform', 'assets/wooden_platform.png');
  this.load.image('player', 'assets/tori_superhero.png');
  this.load.image('item', 'assets/banana.png');
  this.load.image('stars', 'assets/glowing_stars.png');
  this.load.image('mushrooms', 'assets/colorful_mushrooms.png');
  this.load.image('vines', 'assets/vines_with_orbs.png');
}

// Create game objects
function create() {
  // Background with enchanted forest theme
  background = this.add.tileSprite(0, 0, config.width, config.height * 2, 'background')
    .setOrigin(0, 0)
    .setScrollFactor(0.5); // Parallax effect

  // Decorative elements (mushrooms and vines)
  this.add.image(config.width / 2, config.height - 50, 'mushrooms')
    .setOrigin(0.5, 1)
    .setScrollFactor(0.8);
  this.add.image(config.width / 2, 0, 'vines')
    .setOrigin(0.5, 0)
    .setScrollFactor(0);

  // Groups for platforms and items
  platforms = this.physics.add.group();
  items = this.physics.add.group();

  // Particle emitter for item collection (glowing stars)
  particles = this.add.particles('stars').createEmitter({
    speed: { min: 50, max: 100 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.5, end: 0 },
    blendMode: 'ADD',
    lifespan: 300,
    quantity: 10,
    on: false
  });

  // Generate initial platforms
  lastPlatformY = config.height - 50;
  let currentY = lastPlatformY;
  while (currentY > -PLATFORM_SPACING_MAX) {
    spawnPlatform(this, currentY);
    currentY -= Phaser.Math.Between(PLATFORM_SPACING_MIN, PLATFORM_SPACING_MAX);
  }

  // Player (Tori in superhero costume)
  player = this.physics.add.sprite(config.width / 2, config.height - 100, 'player')
    .setScale(0.5)
    .setCollideWorldBounds(true);
  this.physics.add.collider(player, platforms);
  this.physics.add.overlap(player, items, collectItem, null, this);

  // Camera setup
  camera = this.cameras.main;
  camera.setBounds(0, 0, config.width, Number.MAX_VALUE);
  camera.startFollow(player, false, 0, 0.1);

  // Input handling for jumping
  this.input.on('pointerdown', (pointer) => {
    if (player.body.touching.down) {
      player.setVelocityY(-500); // Jump velocity
    }
  });

  // Score UI with "TORI" branding
  scoreText = this.add.text(config.width / 2, 20, 'TORI Score: 0', {
    fontSize: '24px',
    fontFamily: 'Arial',
    color: '#ffffff'
  }).setOrigin(0.5, 0).setScrollFactor(0);
}

// Update game state
function update() {
  // Scroll when player reaches threshold
  if (player.y < camera.scrollY + SCROLL_THRESHOLD) {
    const delta = (camera.scrollY + SCROLL_THRESHOLD) - player.y;
    camera.scrollY -= delta;

    // Adjust background for parallax effect
    background.tilePositionY -= delta * 0.5;

    // Shift platforms and items downward
    platforms.getChildren().forEach(platform => {
      platform.y += delta;
      platform.body.y += delta;
    });
    items.getChildren().forEach(item => {
      item.y += delta;
      item.body.y += delta;
    });

    // Remove platforms and items below screen
    platforms.getChildren().forEach(platform => {
      if (platform.y > camera.scrollY + config.height + 100) {
        platform.destroy();
      }
    });
    items.getChildren().forEach(item => {
      if (item.y > camera.scrollY + config.height + 50) {
        item.destroy();
      }
    });

    // Generate new platforms above
    let highestY = platforms.getChildren().reduce((min, p) => Math.min(min, p.y), config.height);
    let currentY = highestY - Phaser.Math.Between(PLATFORM_SPACING_MIN, PLATFORM_SPACING_MAX);
    while (currentY > camera.scrollY - PLATFORM_SPACING_MAX) {
      spawnPlatform(this, currentY);
      currentY -= Phaser.Math.Between(PLATFORM_SPACING_MIN, PLATFORM_SPACING_MAX);
    }
  }

  // Update score display
  scoreText.setText(`TORI Score: ${score}`);
}

// Spawn a platform
function spawnPlatform(scene, y) {
  const x = Phaser.Math.Between(50, config.width - 50);
  const platform = platforms.create(x, y, 'platform');
  const widthScale = Phaser.Math.FloatBetween(PLATFORM_LENGTH_MIN, PLATFORM_LENGTH_MAX);
  platform.displayWidth = platform.width * widthScale;
  platform.displayHeight = platform.height * PLATFORM_SCALE_Y;
  platform.body.setImmovable(true);
  platform.body.allowGravity = false;

  // Random horizontal speed and direction
  let speed = Phaser.Math.Between(PLATFORM_SPEED_MIN, PLATFORM_SPEED_MAX);
  speed = Phaser.Math.Between(0, 1) ? speed : -speed;
  platform.body.setVelocityX(speed);
  platform.body.setCollideWorldBounds(true);
  platform.body.setBounceX(1);

  // Spawn item (banana) on platform
  spawnItem(scene, platform);
}

// Spawn an item on the platform
function spawnItem(scene, platform) {
  const itemX = platform.x;
  const itemY = platform.y - platform.displayHeight / 2 - 10;
  const item = items.create(itemX, itemY, 'item');
  item.body.allowGravity = false;

  // Idle animation (floating effect)
  scene.tweens.add({
    targets: item,
    y: itemY - 10,
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
    scale: 1.5,
    duration: 100,
    onComplete: () => {
      particles.emitParticleAt(item.x, item.y);
      item.destroy();
      score++;
    }
  });
}
