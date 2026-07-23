import tilesetUrl from '../assets/tilemaps/tileset.png';
import villageMapUrl from '../assets/tilemaps/village.json?url';
import forestMapUrl from '../assets/tilemaps/forest.json?url';

// Must match the tileset "name" embedded in every map JSON's tilesets[0].name,
// and doubles as the Phaser texture cache key the tileset image is loaded under.
export const TILESET_NAME = 'tileset';
export const TILESET_URL = tilesetUrl;

// key -> Tiled map JSON URL. Adding a new map/area is: drop the exported JSON
// here with an entry, then reference it as a transition's targetMap.
export const MAP_SOURCES = {
  village: villageMapUrl,
  forest: forestMapUrl,
};

export const INITIAL_MAP_KEY = 'village';
export const INITIAL_SPAWN = 'village_center';
