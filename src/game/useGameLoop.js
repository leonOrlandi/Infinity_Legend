import { useEffect, useRef } from 'react';
import { MAX_FRAME_DELTA } from './constants.js';

/**
 * Envolve o `requestAnimationFrame` em um hook.
 *
 * Entrega o delta do frame já em segundos e já limitado por `MAX_FRAME_DELTA`.
 * O callback fica em uma ref, então trocá-lo a cada render não reinicia o loop
 * — o `requestAnimationFrame` é agendado uma única vez, na montagem.
 *
 * @param {(delta: number, elapsed: number) => void} callback
 */
export default function useGameLoop(callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let frameId = 0;
    let previous = performance.now();
    let elapsed = 0;

    const frame = (now) => {
      frameId = requestAnimationFrame(frame);

      const delta = Math.min((now - previous) / 1000, MAX_FRAME_DELTA);
      previous = now;
      elapsed += delta;

      callbackRef.current(delta, elapsed);
    };

    frameId = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(frameId);
  }, []);
}
