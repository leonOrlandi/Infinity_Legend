import {
  CANVAS_WIDTH,
  GROUND_Y,
  PLAYER_HEIGHT,
  PLAYER_MAX_HEALTH,
  PLAYER_WIDTH,
  SCENES,
} from './constants.js';

/**
 * Estado global do jogo.
 *
 * É um objeto simples e mutável — a simulação escreve nele 60x por segundo, e
 * fazer isso via `useState` causaria um re-render do React por frame. O React
 * mantém apenas uma referência (`useRef`); a HUD lê um snapshot em uma
 * frequência bem menor (ver `subscribe` / `notifyUi`).
 */

/** @returns {import('./gameState.js').GameState} */
export function createGameState() {
  return {
    // Cena atual: menu, playing, paused ou gameOver.
    scene: SCENES.MENU,

    // Tempo acumulado de simulação, em segundos (não conta tempo pausado).
    time: 0,

    player: createPlayer(),

    enemies: [],

    /** Hitbox do ataque enquanto ativa; `null` fora do golpe. */
    attack: null,

    /** Contador regressivo até o próximo spawn de inimigo. */
    enemySpawnTimer: 0,

    /** Fatia lida pela HUD em React — só valores que a interface mostra. */
    ui: {
      score: 0,
      health: PLAYER_MAX_HEALTH,
      maxHealth: PLAYER_MAX_HEALTH,
      wave: 1,
      fps: 0,
      scene: SCENES.MENU,
      message: 'Infinity Legend',
    },
  };
}

export function createPlayer() {
  return {
    x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
    y: GROUND_Y - PLAYER_HEIGHT,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    vx: 0,
    vy: 0,
    /** -1 olhando para a esquerda, 1 para a direita. */
    facing: 1,
    onGround: true,
    health: PLAYER_MAX_HEALTH,
    invulnerableFor: 0,
    attackCooldown: 0,
  };
}

/**
 * Reinicia a partida mantendo o mesmo objeto de estado — as referências que
 * `GameEngine` e os sistemas guardam continuam válidas.
 */
export function resetGame(state) {
  state.scene = SCENES.PLAYING;
  state.time = 0;
  state.player = createPlayer();
  state.enemies = [];
  state.attack = null;
  state.enemySpawnTimer = 0;
  state.ui.score = 0;
  state.ui.health = PLAYER_MAX_HEALTH;
  state.ui.wave = 1;
  state.ui.message = '';
  state.ui.scene = SCENES.PLAYING;
}

/**
 * Ponte entre a simulação (mutável, 60 Hz) e o React (imutável, sob demanda).
 *
 * `syncUi` copia os campos observáveis para dentro de `state.ui`; os inscritos
 * recebem um snapshot congelado só quando algo de fato mudou.
 */
export function createUiBridge(state) {
  const listeners = new Set();
  let snapshot = { ...state.ui };

  function snapshotChanged() {
    return Object.keys(state.ui).some((key) => state.ui[key] !== snapshot[key]);
  }

  return {
    getSnapshot: () => snapshot,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Chamado pelo loop; só propaga quando a HUD tem algo novo para mostrar. */
    notify() {
      state.ui.health = state.player.health;
      state.ui.scene = state.scene;

      if (!snapshotChanged()) return;

      snapshot = { ...state.ui };
      listeners.forEach((listener) => listener(snapshot));
    },
  };
}
