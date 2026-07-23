// Shared render-depth constants. Tilemap layers are destroyed and recreated
// on every area transition, so stacking must rely on explicit depth rather
// than display-list creation order (which would put a freshly rebuilt layer
// above entities created earlier, like the player).
export const DEPTH = {
  GROUND: 0,
  DECORATION: 1,
  COLLISION: 2,
  MARKER: 3,
  PLAYER: 10,
};
