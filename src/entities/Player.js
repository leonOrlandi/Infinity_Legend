import Phaser from 'phaser';

const SPEED = 220;

export default class Player extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y) {
    super(scene, x, y, 48, 48, 0x00ff88);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setCollideWorldBounds(true);
    this.speed = SPEED;
  }

  update(inputSystem) {
    const { up, down, left, right } = inputSystem.getState();
    const velocity = new Phaser.Math.Vector2(0, 0);

    if (left) velocity.x -= 1;
    if (right) velocity.x += 1;
    if (up) velocity.y -= 1;
    if (down) velocity.y += 1;

    velocity.normalize().scale(this.speed);
    this.body.setVelocity(velocity.x, velocity.y);
  }
}
