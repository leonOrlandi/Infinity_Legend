import Phaser from 'phaser';
import Player from '../entities/Player.js';
import InputSystem from '../systems/InputSystem.js';

const WORLD_WIDTH = 3200;
const WORLD_HEIGHT = 3200;
const GRID_SIZE = 64;

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene');
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.drawGround();

    this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.inputSystem = new InputSystem(this);

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  drawGround() {
    this.add
      .rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x1b1b2e)
      .setDepth(-1);

    const grid = this.add.graphics().setDepth(-1);
    grid.lineStyle(1, 0x2a2a40, 1);

    for (let x = 0; x <= WORLD_WIDTH; x += GRID_SIZE) {
      grid.lineBetween(x, 0, x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += GRID_SIZE) {
      grid.lineBetween(0, y, WORLD_WIDTH, y);
    }
  }

  update() {
    this.player.update(this.inputSystem);
  }
}
