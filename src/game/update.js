import {
  ATTACK_COOLDOWN,
  ATTACK_DURATION,
  ATTACK_HEIGHT,
  ATTACK_WIDTH,
  CANVAS_WIDTH,
  ENEMY_DAMAGE,
  ENEMY_HEIGHT,
  ENEMY_SCORE,
  ENEMY_SPAWN_INTERVAL,
  ENEMY_SPEED,
  ENEMY_WIDTH,
  GRAVITY,
  GRAVITY_JUMP_HOLD,
  GROUND_Y,
  MAX_ENEMIES,
  MAX_FALL_SPEED,
  PLAYER_ACCELERATION,
  PLAYER_DECELERATION,
  PLAYER_INVULNERABILITY_TIME,
  PLAYER_JUMP_SPEED,
  PLAYER_RUN_SPEED,
  PLAYER_SPEED,
  SCENES,
} from './constants.js';
import { resetGame } from './gameState.js';

/**
 * Um passo da simulação, sempre com `dt = FIXED_TIMESTEP`.
 *
 * Cada cena consome o input de um jeito: no menu só interessa confirmar, no
 * jogo roda a física inteira. Nada aqui toca no canvas — desenhar é trabalho
 * do `render.js`.
 */
export function updateGame(state, input, dt) {
  switch (state.scene) {
    case SCENES.MENU:
      updateMenu(state, input);
      break;
    case SCENES.PLAYING:
      updatePlaying(state, input, dt);
      break;
    case SCENES.PAUSED:
      updatePaused(state, input);
      break;
    case SCENES.GAME_OVER:
      updateGameOver(state, input);
      break;
    default:
      break;
  }
}

function updateMenu(state, input) {
  if (input.wasPressed('confirm') || input.wasPressed('jump') || input.mouse.clicked) {
    resetGame(state);
  }
}

function updatePaused(state, input) {
  if (input.wasPressed('pause') || input.wasPressed('confirm')) {
    state.scene = SCENES.PLAYING;
  }
}

function updateGameOver(state, input) {
  if (input.wasPressed('restart') || input.wasPressed('confirm') || input.mouse.clicked) {
    resetGame(state);
  }
}

function updatePlaying(state, input, dt) {
  if (input.wasPressed('pause')) {
    state.scene = SCENES.PAUSED;
    state.ui.message = 'Pausado';
    return;
  }

  state.time += dt;

  updatePlayer(state, input, dt);
  updateAttack(state, input, dt);
  updateEnemies(state, dt);
  spawnEnemies(state, dt);
  resolveCombat(state);

  // A dificuldade sobe por tempo: uma "wave" a cada 20 segundos.
  state.ui.wave = Math.floor(state.time / 20) + 1;
}

// --- Player -----------------------------------------------------------------

function updatePlayer(state, input, dt) {
  const player = state.player;

  const axisX = input.getAxisX();
  const maxSpeed = input.isDown('run') ? PLAYER_RUN_SPEED : PLAYER_SPEED;

  if (axisX !== 0) {
    player.vx += axisX * PLAYER_ACCELERATION * dt;
    player.vx = clamp(player.vx, -maxSpeed, maxSpeed);
    player.facing = axisX;
  } else {
    // Sem input: freia até zero sem cruzar para o outro lado.
    const drag = PLAYER_DECELERATION * dt;
    player.vx = Math.abs(player.vx) <= drag ? 0 : player.vx - Math.sign(player.vx) * drag;
  }

  if (input.wasPressed('jump') && player.onGround) {
    player.vy = -PLAYER_JUMP_SPEED;
    player.onGround = false;
  }

  // Pulo de altura variável: segurar o botão na subida aplica menos gravidade.
  const holdingJump = input.isDown('jump') && player.vy < 0;
  player.vy += (holdingJump ? GRAVITY_JUMP_HOLD : GRAVITY) * dt;
  player.vy = Math.min(player.vy, MAX_FALL_SPEED);

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // Colisão com o chão e com as bordas do mundo.
  if (player.y + player.height >= GROUND_Y) {
    player.y = GROUND_Y - player.height;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  if (player.x < 0) {
    player.x = 0;
    player.vx = 0;
  } else if (player.x + player.width > CANVAS_WIDTH) {
    player.x = CANVAS_WIDTH - player.width;
    player.vx = 0;
  }

  player.invulnerableFor = Math.max(0, player.invulnerableFor - dt);
  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
}

// --- Ataque -----------------------------------------------------------------

/**
 * Clique do mouse ataca na direção do cursor: a hitbox nasce colada ao player,
 * do lado apontado, e o player vira para lá.
 */
function updateAttack(state, input, dt) {
  const player = state.player;

  if (state.attack) {
    state.attack.remaining -= dt;
    if (state.attack.remaining <= 0) state.attack = null;
  }

  if (!input.mouse.clicked || player.attackCooldown > 0) return;

  const playerCenterX = player.x + player.width / 2;
  const direction = input.mouse.x < playerCenterX ? -1 : 1;
  player.facing = direction;
  player.attackCooldown = ATTACK_COOLDOWN;

  state.attack = {
    x: direction === 1 ? player.x + player.width : player.x - ATTACK_WIDTH,
    y: player.y + player.height / 2 - ATTACK_HEIGHT / 2,
    width: ATTACK_WIDTH,
    height: ATTACK_HEIGHT,
    remaining: ATTACK_DURATION,
  };
}

// --- Inimigos ---------------------------------------------------------------

function spawnEnemies(state, dt) {
  state.enemySpawnTimer -= dt;
  if (state.enemySpawnTimer > 0) return;

  // Waves mais altas spawnam mais rápido, com um piso de 0,5 s.
  const interval = Math.max(0.5, ENEMY_SPAWN_INTERVAL - (state.ui.wave - 1) * 0.2);
  state.enemySpawnTimer = interval;

  if (state.enemies.length >= MAX_ENEMIES) return;

  // Entram andando por uma das bordas, em direção ao centro.
  const fromLeft = Math.random() < 0.5;
  const speed = ENEMY_SPEED + (state.ui.wave - 1) * 10;

  state.enemies.push({
    x: fromLeft ? -ENEMY_WIDTH : CANVAS_WIDTH,
    y: GROUND_Y - ENEMY_HEIGHT,
    width: ENEMY_WIDTH,
    height: ENEMY_HEIGHT,
    vx: fromLeft ? speed : -speed,
    vy: 0,
    alive: true,
  });
}

function updateEnemies(state, dt) {
  const player = state.player;

  for (const enemy of state.enemies) {
    // Perseguem o player na horizontal; a gravidade também vale para eles.
    const targetDirection = Math.sign(player.x - enemy.x) || 1;
    enemy.vx = targetDirection * Math.abs(enemy.vx);
    enemy.x += enemy.vx * dt;

    enemy.vy = Math.min(enemy.vy + GRAVITY * dt, MAX_FALL_SPEED);
    enemy.y += enemy.vy * dt;

    if (enemy.y + enemy.height >= GROUND_Y) {
      enemy.y = GROUND_Y - enemy.height;
      enemy.vy = 0;
    }
  }
}

// --- Combate ----------------------------------------------------------------

function resolveCombat(state) {
  const player = state.player;

  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;

    if (state.attack && intersects(state.attack, enemy)) {
      enemy.alive = false;
      state.ui.score += ENEMY_SCORE;
      continue;
    }

    if (player.invulnerableFor <= 0 && intersects(player, enemy)) {
      player.health -= ENEMY_DAMAGE;
      player.invulnerableFor = PLAYER_INVULNERABILITY_TIME;

      // Empurrão para longe do inimigo, senão o dano se repetiria em loop.
      const knockbackDirection = Math.sign(player.x - enemy.x) || 1;
      player.vx = knockbackDirection * PLAYER_SPEED;
      player.vy = -PLAYER_JUMP_SPEED * 0.5;
      player.onGround = false;
    }
  }

  state.enemies = state.enemies.filter(
    (enemy) => enemy.alive && enemy.x > -200 && enemy.x < CANVAS_WIDTH + 200,
  );

  if (player.health <= 0) {
    player.health = 0;
    state.scene = SCENES.GAME_OVER;
    state.ui.message = 'Fim de jogo';
  }
}

// --- Utilitários ------------------------------------------------------------

/** Colisão AABB entre dois retângulos `{ x, y, width, height }`. */
export function intersects(a, b) {
  return (
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
