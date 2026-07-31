import { CANVAS_HEIGHT, CANVAS_WIDTH } from './constants.js';

/**
 * Sistema de input: teclado + mouse.
 *
 * Os handlers do DOM só gravam estado bruto; nada de lógica de jogo aqui. A
 * simulação consulta esse estado uma vez por passo fixo, o que mantém o
 * comportamento independente da taxa de eventos do navegador.
 *
 * Três consultas distintas:
 *   - `isDown(action)`   — a tecla está pressionada agora (mover, correr).
 *   - `wasPressed(action)` — foi pressionada neste passo (pular, pausar).
 *   - `mouse`            — posição em coordenadas do canvas + cliques.
 *
 * `endStep()` limpa os "edge events" e precisa ser chamado ao fim de cada passo.
 */

/** Um mesmo comando aceita várias teclas (setas, WASD e espaço). */
const KEY_BINDINGS = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  KeyP: 'pause',
  Escape: 'pause',
  Enter: 'confirm',
  KeyR: 'restart',
};

/** Teclas cujo comportamento padrão do navegador atrapalha (rolar a página). */
const PREVENT_DEFAULT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export default class InputSystem {
  constructor(canvas) {
    this.canvas = canvas;

    this.held = new Set();
    this.pressed = new Set();

    this.mouse = {
      x: 0,
      y: 0,
      /** `false` enquanto o cursor não entrou no canvas — a mira só vale depois disso. */
      inside: false,
      down: false,
      /** Verdadeiro apenas no passo em que o botão desceu. */
      clicked: false,
    };

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
  }

  attach() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    // `blur` no window: ao trocar de aba com uma tecla pressionada o keyup
    // nunca chega e o personagem ficaria andando sozinho ao voltar.
    window.addEventListener('blur', this.handleBlur);

    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
    // `mouseup` no window para não perder a soltura fora do canvas.
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  detach() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);

    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('mouseup', this.handleMouseUp);

    this.reset();
  }

  isDown(action) {
    return this.held.has(action);
  }

  wasPressed(action) {
    return this.pressed.has(action);
  }

  /** Eixo horizontal em [-1, 1]; teclas opostas se cancelam. */
  getAxisX() {
    return (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
  }

  /** Limpa os eventos de borda. Chamar ao fim de cada passo da simulação. */
  endStep() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }

  reset() {
    this.held.clear();
    this.pressed.clear();
    this.mouse.down = false;
    this.mouse.clicked = false;
  }

  // --- Handlers -------------------------------------------------------------

  handleKeyDown(event) {
    const action = KEY_BINDINGS[event.code];
    if (!action) return;

    if (PREVENT_DEFAULT.has(event.code)) event.preventDefault();

    // `repeat` é o auto-repeat do SO: mantém o `held`, mas não conta como
    // nova pressionada — senão segurar espaço viraria pulo contínuo.
    if (!event.repeat) this.pressed.add(action);
    this.held.add(action);
  }

  handleKeyUp(event) {
    const action = KEY_BINDINGS[event.code];
    if (!action) return;

    this.held.delete(action);
  }

  handleBlur() {
    this.reset();
  }

  handleMouseMove(event) {
    this.updateMousePosition(event);
    this.mouse.inside = true;
  }

  handleMouseDown(event) {
    if (event.button !== 0) return;

    this.updateMousePosition(event);
    this.mouse.inside = true;
    this.mouse.down = true;
    this.mouse.clicked = true;
  }

  handleMouseUp(event) {
    if (event.button !== 0) return;

    this.mouse.down = false;
  }

  handleMouseLeave() {
    this.mouse.inside = false;
    this.mouse.down = false;
  }

  handleContextMenu(event) {
    event.preventDefault();
  }

  /**
   * Converte a posição da tela para coordenadas lógicas do jogo.
   *
   * Usa `CANVAS_WIDTH/HEIGHT` e não `canvas.width`: o buffer do canvas é
   * ampliado pelo devicePixelRatio, e a simulação raciocina em 800x600.
   * O CSS também pode escalar o elemento, daí a razão com o boundingRect.
   */
  updateMousePosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    this.mouse.y = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
  }
}
