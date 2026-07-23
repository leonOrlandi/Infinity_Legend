import { DEPTH } from './depths.js';
import { MAP_SOURCES, TILESET_NAME } from './mapSources.js';

function propsToObject(properties = []) {
  return Object.fromEntries(properties.map((prop) => [prop.name, prop.value]));
}

/** Parses the Tiled "Objects" layer into the shapes WorldScene/MapManager need. */
function parseObjectLayer(objectLayer) {
  const spawns = {};
  const npcSpawns = [];
  const itemSpawns = [];
  const transitions = [];

  (objectLayer?.objects ?? []).forEach((obj) => {
    const props = propsToObject(obj.properties);

    if (obj.type === 'spawn') {
      spawns[obj.name] = { x: obj.x, y: obj.y };
    } else if (obj.type === 'npc') {
      npcSpawns.push({ x: obj.x, y: obj.y, name: obj.name, ...props });
    } else if (obj.type === 'item') {
      itemSpawns.push({ x: obj.x, y: obj.y, name: obj.name, ...props });
    } else if (obj.type === 'transition') {
      transitions.push({ x: obj.x, y: obj.y, width: obj.width, height: obj.height, ...props });
    }
  });

  return { spawns, npcSpawns, itemSpawns, transitions };
}

/** Placeholder visual marker (no NPC/item entity systems exist yet). */
function createNpcMarker(scene, spawn) {
  const dot = scene.add.circle(spawn.x, spawn.y, 10, 0xffa500).setStrokeStyle(2, 0x7a4b00).setDepth(DEPTH.MARKER);
  const label = scene.add
    .text(spawn.x, spawn.y - 20, spawn.npcId ?? spawn.name, { fontSize: '10px', color: '#ffffff' })
    .setOrigin(0.5, 1)
    .setDepth(DEPTH.MARKER);
  return { destroy: () => { dot.destroy(); label.destroy(); } };
}

function createItemMarker(scene, spawn) {
  const diamond = scene.add
    .rectangle(spawn.x, spawn.y, 14, 14, 0xffe066)
    .setStrokeStyle(2, 0x8a7000)
    .setRotation(Math.PI / 4)
    .setDepth(DEPTH.MARKER);
  const label = scene.add
    .text(spawn.x, spawn.y - 18, spawn.itemId ?? spawn.name, { fontSize: '10px', color: '#ffffff' })
    .setOrigin(0.5, 1)
    .setDepth(DEPTH.MARKER);
  return { destroy: () => { diamond.destroy(); label.destroy(); } };
}

/**
 * Owns the lifecycle of "whichever Tiled map is currently loaded": loading the
 * JSON (once per key, cached after that), building the Ground/Decoration/
 * Collision layers + Objects-layer spawns/transitions, and tearing all of it
 * down cleanly so WorldScene can swap to a different map on a transition.
 */
export default class MapManager {
  constructor(scene) {
    this.scene = scene;
    this.tilemap = null;
    this.layers = {};
    this.spawns = {};
    this.transitionZones = [];
    this.npcMarkers = [];
    this.itemMarkers = [];
    this.currentMapKey = null;
  }

  async loadMapData(key) {
    if (this.scene.cache.tilemap.exists(key)) return;

    const url = MAP_SOURCES[key];
    if (!url) throw new Error(`Unknown map key: ${key}`);

    await new Promise((resolve, reject) => {
      this.scene.load.once('complete', resolve);
      this.scene.load.once('loaderror', reject);
      this.scene.load.tilemapTiledJSON(key, url);
      this.scene.load.start();
    });
  }

  destroyCurrent() {
    this.transitionZones.forEach((zone) => zone.destroy());
    this.npcMarkers.forEach((marker) => marker.destroy());
    this.itemMarkers.forEach((marker) => marker.destroy());
    Object.values(this.layers).forEach((layer) => layer?.destroy());
    this.tilemap?.destroy();

    this.transitionZones = [];
    this.npcMarkers = [];
    this.itemMarkers = [];
    this.layers = {};
    this.tilemap = null;
  }

  /** Loads (if needed), builds and swaps in the map for `key`. Returns the spawn point named `spawnName`. */
  async build(key, spawnName) {
    await this.loadMapData(key);
    this.destroyCurrent();

    const map = this.scene.make.tilemap({ key });
    const tileset = map.addTilesetImage(TILESET_NAME, TILESET_NAME);

    const groundLayer = map.createLayer('Ground', tileset, 0, 0).setDepth(DEPTH.GROUND);
    const decorationLayer = map.createLayer('Decoration', tileset, 0, 0).setDepth(DEPTH.DECORATION);
    const collisionLayer = map.createLayer('Collision', tileset, 0, 0).setDepth(DEPTH.COLLISION);
    collisionLayer.setCollisionByExclusion([-1]);

    const objectLayer = map.getObjectLayer('Objects');
    const { spawns, npcSpawns, itemSpawns, transitions } = parseObjectLayer(objectLayer);

    this.tilemap = map;
    this.layers = { groundLayer, decorationLayer, collisionLayer };
    this.spawns = spawns;
    this.npcMarkers = npcSpawns.map((spawn) => createNpcMarker(this.scene, spawn));
    this.itemMarkers = itemSpawns.map((spawn) => createItemMarker(this.scene, spawn));
    this.transitionZones = transitions.map((transition) => {
      const zone = this.scene.add.zone(
        transition.x + transition.width / 2,
        transition.y + transition.height / 2,
        transition.width,
        transition.height,
      );
      this.scene.physics.add.existing(zone, true);
      zone.transitionData = transition;
      return zone;
    });
    this.currentMapKey = key;

    const spawnPoint = spawns[spawnName] ?? Object.values(spawns)[0];
    return { map, layers: this.layers, spawnPoint, transitionZones: this.transitionZones };
  }
}
