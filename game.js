function create() {
  console.log("Creating scene...");
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
  
  // New platform creation logic
  platforms = this.physics.add.group();
  const PLATFORMS_PER_LEVEL = 2; // Two platforms per vertical level
  const INITIAL_LEVELS = 8;      // Number of vertical levels to start with
  for (let level = 0; level < INITIAL_LEVELS; level++) {
    let y = config.height - 20 - level * PLATFORM_SPACING; // From 620 down to -1380
    for (let i = 0; i < PLATFORMS_PER_LEVEL; i++) {
      let sectionWidth = config.width / PLATFORMS_PER_LEVEL; // 360 / 2 = 180
      let minX = i * sectionWidth + 20;                      // Left: 20, Right: 200
      let maxX = (i + 1) * sectionWidth - 20;                // Left: 160, Right: 340
      let x = Phaser.Math.Between(minX, maxX);
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
  }
  
  // Player setup remains unchanged
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
