import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Placeholder: sprites, tilemaps and audio will be loaded here as they are added.
  }

  create() {
    this.scene.start('WorldScene');
  }
}
