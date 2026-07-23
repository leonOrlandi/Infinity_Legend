export const TILE_SIZE = 32;
export const TILE_FLOOR = 0;
export const TILE_WALL = 1;

export const PLAYER_FRAME_WIDTH = 32;
export const PLAYER_FRAME_HEIGHT = 48;
export const PLAYER_DIRECTIONS = ['down', 'left', 'right', 'up'];
const PLAYER_FRAMES_PER_DIRECTION = 4;

/**
 * Procedurally draws a 2-tile tileset (floor, wall) so the project has a
 * working tilemap without depending on external art. Swap this for a real
 * Tiled tileset image later without touching WorldScene's tilemap code.
 */
export function generateTilesetTexture(scene, key = 'tiles') {
  if (scene.textures.exists(key)) return key;

  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  g.fillStyle(0x2e2e44, 1);
  g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  g.lineStyle(1, 0x3d3d5c, 1);
  g.strokeRect(0.5, 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

  g.fillStyle(0x5a4632, 1);
  g.fillRect(TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
  g.lineStyle(2, 0x3c2f1f, 1);
  g.strokeRect(TILE_SIZE + 1, 1, TILE_SIZE - 2, TILE_SIZE - 2);

  g.generateTexture(key, TILE_SIZE * 2, TILE_SIZE);
  g.destroy();

  return key;
}

/**
 * Procedurally draws a humanoid spritesheet: 4 facing directions x 4 frames
 * each, with alternating legs to fake a walk cycle. Frames are addressed as
 * "<direction>-<frameIndex>" (e.g. "down-0"), which is exactly the frame
 * naming PlayerAnimations expects. Replace with a loaded spritesheet later
 * by keeping the same frame names and directions.
 */
export function generateHumanoidSpriteSheet(scene, key, { bodyColor = 0x00ff88, accentColor = 0x00cc6a } = {}) {
  if (scene.textures.exists(key)) return key;

  const frameW = PLAYER_FRAME_WIDTH;
  const frameH = PLAYER_FRAME_HEIGHT;
  const sheetW = frameW * PLAYER_FRAMES_PER_DIRECTION;
  const sheetH = frameH * PLAYER_DIRECTIONS.length;

  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  PLAYER_DIRECTIONS.forEach((dir, row) => {
    for (let frame = 0; frame < PLAYER_FRAMES_PER_DIRECTION; frame += 1) {
      drawHumanoidFrame(g, frame * frameW, row * frameH, frameW, frameH, dir, frame, bodyColor, accentColor);
    }
  });

  g.generateTexture(key, sheetW, sheetH);
  g.destroy();

  const texture = scene.textures.get(key);
  PLAYER_DIRECTIONS.forEach((dir, row) => {
    for (let frame = 0; frame < PLAYER_FRAMES_PER_DIRECTION; frame += 1) {
      texture.add(`${dir}-${frame}`, 0, frame * frameW, row * frameH, frameW, frameH);
    }
  });

  return key;
}

function drawHumanoidFrame(g, x, y, w, h, dir, frameIndex, bodyColor, accentColor) {
  const bob = frameIndex % 2 === 0 ? 0 : 1;
  const legSwing = frameIndex < 2 ? -3 : 3;

  g.fillStyle(bodyColor, 1);
  g.fillRect(x + 6, y + 8 + bob, w - 12, h - 20);

  g.fillStyle(accentColor, 1);
  g.fillRect(x + 10, y + 2 + bob, w - 20, 10);

  g.fillStyle(0x1b1b2e, 1);
  g.fillRect(x + 8 + legSwing, y + h - 12, 6, 10);
  g.fillRect(x + w - 14 - legSwing, y + h - 12, 6, 10);

  g.fillStyle(0xffffff, 1);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const notchByDirection = {
    down: [cx - 3, cy + 6, 6, 4],
    up: [cx - 3, cy - 10, 6, 4],
    left: [cx - 12, cy - 2, 4, 6],
    right: [cx + 8, cy - 2, 4, 6],
  };
  const [nx, ny, nw, nh] = notchByDirection[dir];
  g.fillRect(nx, ny, nw, nh);
}
