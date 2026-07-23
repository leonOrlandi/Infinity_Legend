import Phaser from 'phaser';
import Player from '../entities/player/Player.js';
import InputSystem from '../systems/InputSystem.js';
import { generateTilesetTexture, TILE_SIZE, TILE_WALL } from '../systems/PlaceholderTextures.js';

const MAP_COLS = 40;
const MAP_ROWS = 30;

const PLAYER_SPAWN_TILE = { x: 5, y: 5 };

// Test-only obstacles (tile rects) so collision can be exercised without a
// real Tiled map. Replace `buildTestLayout` with a loaded Tiled JSON layer
// once real level art/design exists; nothing downstream (tileset, layer,
// collider) needs to change.
const TEST_OBSTACLES = [
  { x: 10, y: 8, w: 4, h: 1 },
  { x: 10, y: 8, w: 1, h: 5 },
  { x: 22, y: 15, w: 6, h: 1 },
  { x: 28, y: 5, w: 1, h: 8 },
  { x: 15, y: 20, w: 5, h: 1 },
];

function buildTestLayout(cols, rows) {
  const layout = [];

  for (let y = 0; y < rows; y += 1) {
    const row = [];
    for (let x = 0; x < cols; x += 1) {
      const isBorder = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
      row.push(isBorder ? TILE_WALL : 0);
    }
    layout.push(row);
  }

  TEST_OBSTACLES.forEach(({ x, y, w, h }) => {
    for (let row = y; row < y + h; row += 1) {
      for (let col = x; col < x + w; col += 1) {
        if (layout[row]?.[col] !== undefined) layout[row][col] = TILE_WALL;
      }
    }
  });

  return layout;
}

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene');
  }

  create() {
    const tilesetKey = generateTilesetTexture(this);
    const layout = buildTestLayout(MAP_COLS, MAP_ROWS);

    const map = this.make.tilemap({ data: layout, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage(tilesetKey, tilesetKey, TILE_SIZE, TILE_SIZE);
    const groundLayer = map.createLayer(0, tileset, 0, 0);
    groundLayer.setCollision(TILE_WALL);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    this.inputSystem = new InputSystem(this);
    this.player = new Player(
      this,
      PLAYER_SPAWN_TILE.x * TILE_SIZE + TILE_SIZE / 2,
      PLAYER_SPAWN_TILE.y * TILE_SIZE + TILE_SIZE / 2,
      this.inputSystem,
    );

    this.physics.add.collider(this.player, groundLayer);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  update(time, delta) {
    this.player.update(time, delta);
  }
}
