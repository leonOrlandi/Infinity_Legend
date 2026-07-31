import { useSyncExternalStore } from 'react';
import { COLORS, SCENES } from './constants.js';

/**
 * HUD em React sobreposta ao canvas.
 *
 * Lê o snapshot publicado pela ponte de UI (`createUiBridge`), que só notifica
 * quando algum valor observável muda — a HUD re-renderiza quando a pontuação
 * ou a vida muda, não 60 vezes por segundo.
 */
export default function Hud({ uiBridge }) {
  const ui = useSyncExternalStore(uiBridge.subscribe, uiBridge.getSnapshot, uiBridge.getSnapshot);

  return (
    <div style={styles.root}>
      <div style={styles.row}>
        <span style={styles.label}>Pontos</span>
        <strong style={styles.value}>{ui.score}</strong>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>Vida</span>
        <span style={styles.hearts}>
          {Array.from({ length: ui.maxHealth }, (_, index) => (
            <i
              key={index}
              style={{
                ...styles.heart,
                background: index < ui.health ? COLORS.healthFull : COLORS.healthEmpty,
              }}
            />
          ))}
        </span>
      </div>

      {ui.scene === SCENES.PLAYING && (
        <div style={styles.row}>
          <span style={styles.label}>Wave</span>
          <strong style={styles.value}>{ui.wave}</strong>
        </div>
      )}

      <div style={{ ...styles.row, ...styles.fps }}>{ui.fps} FPS</div>
    </div>
  );
}

const styles = {
  root: {
    // `pointerEvents: none` é o que mantém o clique chegando no canvas embaixo.
    position: 'absolute',
    top: 0,
    left: 0,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    pointerEvents: 'none',
    fontFamily: 'system-ui, sans-serif',
    color: COLORS.hudText,
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)',
    userSelect: 'none',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.hudDim,
  },
  value: {
    fontSize: 18,
  },
  hearts: {
    display: 'flex',
    gap: 4,
  },
  heart: {
    display: 'block',
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  fps: {
    fontSize: 12,
    color: COLORS.hudDim,
  },
};
