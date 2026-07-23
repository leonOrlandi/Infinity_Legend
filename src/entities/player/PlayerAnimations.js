import { PLAYER_DIRECTIONS } from '../../systems/PlaceholderTextures.js';

/**
 * Builds idle/walk/run animations for every facing direction from a
 * "<direction>-<frameIndex>" spritesheet. Idle reuses each direction's first
 * walk frame instead of a dedicated pose, since a placeholder character has
 * no meaningful "resting" frame to show.
 */
export function createPlayerAnimations(scene, textureKey) {
  PLAYER_DIRECTIONS.forEach((dir) => {
    const walkFrames = [0, 1, 2, 3].map((i) => ({ key: textureKey, frame: `${dir}-${i}` }));

    if (!scene.anims.exists(`idle-${dir}`)) {
      scene.anims.create({
        key: `idle-${dir}`,
        frames: [walkFrames[0]],
        frameRate: 1,
        repeat: -1,
      });
    }

    if (!scene.anims.exists(`walk-${dir}`)) {
      scene.anims.create({
        key: `walk-${dir}`,
        frames: walkFrames,
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!scene.anims.exists(`run-${dir}`)) {
      scene.anims.create({
        key: `run-${dir}`,
        frames: walkFrames,
        frameRate: 14,
        repeat: -1,
      });
    }
  });
}
