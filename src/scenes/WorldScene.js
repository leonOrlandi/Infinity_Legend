import Phaser from 'phaser';
import Player from '../entities/player/Player.js';
import InputSystem from '../systems/InputSystem.js';
import MapManager from '../systems/MapManager.js';
import { INITIAL_MAP_KEY, INITIAL_SPAWN } from '../systems/mapSources.js';

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene');
  }

  create() {
    this.mapManager = new MapManager(this);
    this.inputSystem = new InputSystem(this);
    this.mapCollider = null;
    this.transitionOverlap = null;
    this.isTransitioning = false;

    this.mapManager.build(INITIAL_MAP_KEY, INITIAL_SPAWN).then(({ spawnPoint }) => {
      this.player = new Player(this, spawnPoint.x, spawnPoint.y, this.inputSystem);
      this.mapCollider = this.physics.add.collider(this.player, this.mapManager.layers.collisionLayer);

      this.applyMapBounds();
      this.registerTransitionOverlap();

      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    });
  }

  applyMapBounds() {
    const { widthInPixels, heightInPixels } = this.mapManager.tilemap;
    this.physics.world.setBounds(0, 0, widthInPixels, heightInPixels);
    this.cameras.main.setBounds(0, 0, widthInPixels, heightInPixels);
  }

  registerTransitionOverlap() {
    this.transitionOverlap = this.physics.add.overlap(
      this.player,
      this.mapManager.transitionZones,
      (player, zone) => this.handleTransition(zone.transitionData),
    );
  }

  async handleTransition({ targetMap, targetSpawn }) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.player.setInputLocked(true);

    this.mapCollider?.destroy();
    this.transitionOverlap?.destroy();

    const { spawnPoint } = await this.mapManager.build(targetMap, targetSpawn);

    this.player.setPosition(spawnPoint.x, spawnPoint.y);
    this.player.body.reset(spawnPoint.x, spawnPoint.y);

    this.mapCollider = this.physics.add.collider(this.player, this.mapManager.layers.collisionLayer);
    this.applyMapBounds();
    this.registerTransitionOverlap();
    this.cameras.main.centerOn(this.player.x, this.player.y);

    this.player.setInputLocked(false);
    this.isTransitioning = false;
  }

  update(time, delta) {
    this.player?.update(time, delta);
  }
}
