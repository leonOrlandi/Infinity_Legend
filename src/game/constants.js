/**
 * Valores de configuração do jogo.
 *
 * Todas as unidades são em pixels e segundos: velocidades em px/s,
 * acelerações e gravidade em px/s². O loop trabalha com delta em segundos,
 * então basta multiplicar (`vy += GRAVITY * dt`) sem conversões.
 */

// --- Canvas -----------------------------------------------------------------

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

/** Altura do "chão" medida a partir da base do canvas. */
export const GROUND_HEIGHT = 80;
export const GROUND_Y = CANVAS_HEIGHT - GROUND_HEIGHT;

// --- Loop -------------------------------------------------------------------

/**
 * A simulação roda em passo fixo (60 Hz) alimentado por um acumulador, para que
 * a física não mude de comportamento conforme o refresh rate do monitor.
 */
export const FIXED_TIMESTEP = 1 / 60;

/**
 * Teto do delta de um frame. Ao voltar de uma aba em segundo plano o
 * `requestAnimationFrame` entrega um salto enorme; sem o teto o acumulador
 * dispararia centenas de passos de uma vez (efeito "espiral da morte").
 */
export const MAX_FRAME_DELTA = 0.25;

// --- Física -----------------------------------------------------------------

export const GRAVITY = 2000;

/** Gravidade reduzida enquanto o pulo está sendo segurado (pulo de altura variável). */
export const GRAVITY_JUMP_HOLD = 1200;

/** Velocidade vertical máxima de queda, evita atravessar o chão em um passo. */
export const MAX_FALL_SPEED = 1400;

// --- Player -----------------------------------------------------------------

export const PLAYER_WIDTH = 32;
export const PLAYER_HEIGHT = 48;
export const PLAYER_SPEED = 260;
export const PLAYER_RUN_SPEED = 420;
export const PLAYER_ACCELERATION = 2400;
export const PLAYER_DECELERATION = 3200;
export const PLAYER_JUMP_SPEED = 700;
export const PLAYER_MAX_HEALTH = 5;

/** Tempo de invulnerabilidade após levar dano, em segundos. */
export const PLAYER_INVULNERABILITY_TIME = 1.2;

// --- Ataque -----------------------------------------------------------------

export const ATTACK_WIDTH = 46;
export const ATTACK_HEIGHT = 46;
export const ATTACK_DURATION = 0.12;
export const ATTACK_COOLDOWN = 0.3;

// --- Inimigos ---------------------------------------------------------------

export const ENEMY_WIDTH = 30;
export const ENEMY_HEIGHT = 30;
export const ENEMY_SPEED = 90;
export const ENEMY_DAMAGE = 1;
export const ENEMY_SCORE = 10;

/** Intervalo (em segundos) entre spawns de inimigos. */
export const ENEMY_SPAWN_INTERVAL = 1.8;
export const MAX_ENEMIES = 12;

// --- Cenas ------------------------------------------------------------------

export const SCENES = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameOver',
};

// --- Paleta -----------------------------------------------------------------

/** Sem assets ainda: tudo é retângulo colorido, então a paleta é o "art style". */
export const COLORS = {
  sky: '#12121f',
  skyAccent: '#1d1d33',
  ground: '#2c4a3b',
  groundEdge: '#3f6b55',
  player: '#4ea8ff',
  playerHurt: '#ff6b6b',
  enemy: '#e05263',
  attack: '#ffd166',
  hudText: '#f5f5f5',
  hudDim: '#8a8aa3',
  healthFull: '#4ade80',
  healthEmpty: '#3a3a4d',
  overlay: 'rgba(10, 10, 20, 0.72)',
};
