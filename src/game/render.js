import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLORS,
  GROUND_Y,
  SCENES,
} from './constants.js';

/**
 * Renderização 2D.
 *
 * Ainda sem assets: tudo é `fillRect`. O desenho é puro — lê o estado e não
 * escreve nele, então rodar o render duas vezes no mesmo estado dá o mesmo
 * resultado.
 */
export function renderGame(ctx, state, input) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawBackground(ctx);
  drawGround(ctx);

  if (state.scene !== SCENES.MENU) {
    state.enemies.forEach((enemy) => drawEnemy(ctx, enemy));
    drawPlayer(ctx, state.player);
    if (state.attack) drawAttack(ctx, state.attack);
  }

  drawCrosshair(ctx, state, input);
  drawOverlay(ctx, state);
}

// --- Cenário ----------------------------------------------------------------

function drawBackground(ctx) {
  ctx.fillStyle = COLORS.sky;
  ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

  // "Prédios" ao fundo: retângulos de altura fixa, apenas para dar profundidade.
  ctx.fillStyle = COLORS.skyAccent;
  for (let i = 0; i < 8; i += 1) {
    const width = 60;
    const height = 60 + ((i * 37) % 120);
    ctx.fillRect(i * 105 + 10, GROUND_Y - height, width, height);
  }
}

function drawGround(ctx) {
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

  ctx.fillStyle = COLORS.groundEdge;
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 4);
}

// --- Entidades --------------------------------------------------------------

function drawPlayer(ctx, player) {
  // Pisca durante a invulnerabilidade: alterna a cada ~0,1 s.
  const blinking = player.invulnerableFor > 0 && Math.floor(player.invulnerableFor * 10) % 2 === 0;

  ctx.fillStyle = blinking ? COLORS.playerHurt : COLORS.player;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Um retângulo menor marca para que lado o player está virado.
  const eyeWidth = 6;
  const eyeX = player.facing === 1 ? player.x + player.width - eyeWidth - 4 : player.x + 4;
  ctx.fillStyle = COLORS.hudText;
  ctx.fillRect(eyeX, player.y + 10, eyeWidth, 6);
}

function drawEnemy(ctx, enemy) {
  ctx.fillStyle = COLORS.enemy;
  ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
}

function drawAttack(ctx, attack) {
  ctx.fillStyle = COLORS.attack;
  ctx.globalAlpha = 0.75;
  ctx.fillRect(attack.x, attack.y, attack.width, attack.height);
  ctx.globalAlpha = 1;
}

/** Mira do mouse, também em retângulos: duas barras cruzadas. */
function drawCrosshair(ctx, state, input) {
  if (!input.mouse.inside || state.scene !== SCENES.PLAYING) return;

  const { x, y } = input.mouse;
  ctx.fillStyle = COLORS.attack;
  ctx.fillRect(x - 8, y - 1, 16, 2);
  ctx.fillRect(x - 1, y - 8, 2, 16);
}

// --- Overlays de cena -------------------------------------------------------

function drawOverlay(ctx, state) {
  if (state.scene === SCENES.PLAYING) return;

  ctx.fillStyle = COLORS.overlay;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.textAlign = 'center';

  const { title, subtitle } = getOverlayText(state);

  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText(title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(subtitle, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 24);

  ctx.textAlign = 'left';
}

function getOverlayText(state) {
  switch (state.scene) {
    case SCENES.MENU:
      return {
        title: 'Infinity Legend',
        subtitle: 'Clique ou pressione Enter para começar',
      };
    case SCENES.PAUSED:
      return { title: 'Pausado', subtitle: 'P ou Esc para continuar' };
    case SCENES.GAME_OVER:
      return {
        title: 'Fim de jogo',
        subtitle: `Pontuação ${state.ui.score} — clique ou R para jogar de novo`,
      };
    default:
      return { title: '', subtitle: '' };
  }
}
