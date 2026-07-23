import Phaser from 'phaser';
import { INITIAL_MAP_KEY, MAP_SOURCES, TILESET_NAME, TILESET_URL } from '../systems/mapSources.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // The tileset image is shared by every map, so it's loaded once up front.
    // Only the initial map's JSON is preloaded here — other maps are loaded
    // on demand by MapManager the first time a transition needs them.
    this.load.image(TILESET_NAME, TILESET_URL);
    this.load.tilemapTiledJSON(INITIAL_MAP_KEY, MAP_SOURCES[INITIAL_MAP_KEY]);
  }

  create() {
    this.scene.start('WorldScene');
  }
}
