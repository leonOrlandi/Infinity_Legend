import { useEffect, useRef } from 'react';
import Hud from './Hud.jsx';
import InputSystem from './InputSystem.js';
import useGameLoop from './useGameLoop.js';
import { createGameState, createUiBridge } from './gameState.js';
import { renderGame } from './render.js';
import { updateGame } from './update.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH, FIXED_TIMESTEP } from './constants.js';

/**
 * Componente principal do jogo.
 *
 * Junta as quatro peças do motor:
 *   - `gameState`  — estado global mutável (cena, player, inimigos, UI)
 *   - `InputSystem` — teclado e mouse
 *   - `updateGame`  — simulação em passo fixo
 *   - `renderGame`  — desenho no canvas 2D
 *
 * O React cuida do ciclo de vida (montar o canvas, ligar/desligar os listeners,
 * renderizar a HUD) e sai da frente do loop: nada do que roda por frame passa
 * por `useState`, senão seriam 60 re-renders por segundo.
 */
export default function GameEngine() {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const inputRef = useRef(null);

  // `useRef(...)` com inicialização preguiçosa: o estado precisa sobreviver aos
  // re-renders e existir uma única vez por instância do motor.
  const stateRef = useRef(null);
  if (stateRef.current === null) stateRef.current = createGameState();

  const uiBridgeRef = useRef(null);
  if (uiBridgeRef.current === null) uiBridgeRef.current = createUiBridge(stateRef.current);

  // Sobras do acumulador de passo fixo e amostragem de FPS entre frames.
  const accumulatorRef = useRef(0);
  const fpsRef = useRef({ frames: 0, elapsed: 0 });

  // Prepara o canvas e liga o input. Roda uma vez, na montagem.
  useEffect(() => {
    const canvas = canvasRef.current;

    // Em telas HiDPI o buffer é maior que os 800x600 lógicos; a transformação
    // deixa todo o resto do código desenhando em coordenadas de jogo.
    const ratio = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * ratio;
    canvas.height = CANVAS_HEIGHT * ratio;

    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    // Retângulos alinhados ao pixel: nada de suavização entre frames.
    context.imageSmoothingEnabled = false;
    contextRef.current = context;

    const input = new InputSystem(canvas);
    input.attach();
    inputRef.current = input;

    return () => input.detach();
  }, []);

  useGameLoop((delta) => {
    const context = contextRef.current;
    const input = inputRef.current;
    if (!context || !input) return;

    const state = stateRef.current;

    // Passo fixo: o acumulador guarda o tempo real e gasta em fatias de
    // `FIXED_TIMESTEP`, então a física é a mesma a 60 Hz ou 144 Hz.
    accumulatorRef.current += delta;
    while (accumulatorRef.current >= FIXED_TIMESTEP) {
      accumulatorRef.current -= FIXED_TIMESTEP;
      updateGame(state, input, FIXED_TIMESTEP);
      // Só depois do passo consumir o input é que os eventos de borda somem.
      input.endStep();
    }

    renderGame(context, state, input);

    updateFps(fpsRef.current, state, delta);
    uiBridgeRef.current.notify();
  });

  return (
    <div style={styles.root}>
      <div style={styles.stage}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={styles.canvas}
          // O canvas precisa de foco para o teclado quando o clique cai nele.
          tabIndex={0}
        />
        <Hud uiBridge={uiBridgeRef.current} />
      </div>

      <p style={styles.help}>
        A/D ou ← → mover · W/↑/Espaço pular · Shift correr · clique atacar · P pausar
      </p>
    </div>
  );
}

/** FPS médio, publicado ~4x por segundo para não re-renderizar a HUD à toa. */
function updateFps(sample, state, delta) {
  sample.frames += 1;
  sample.elapsed += delta;

  if (sample.elapsed < 0.25) return;

  state.ui.fps = Math.round(sample.frames / sample.elapsed);
  sample.frames = 0;
  sample.elapsed = 0;
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    fontFamily: 'system-ui, sans-serif',
  },
  stage: {
    position: 'relative',
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    maxWidth: '100%',
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: '100%',
    background: '#000',
    borderRadius: 6,
    // Sem outline ao focar e sem seleção de texto ao clicar rápido.
    outline: 'none',
    cursor: 'crosshair',
  },
  help: {
    margin: 0,
    fontSize: 13,
    color: '#8a8aa3',
  },
};
