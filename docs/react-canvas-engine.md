# Motor React + Canvas 2D

Motor de jogo 2D escrito do zero sobre `<canvas>`, com o React cuidando apenas do
ciclo de vida e da HUD. É o app que roda em `npm run dev` hoje (o protótipo Phaser
continua no repositório, veja `docs/architecture.md`).

## Arquivos

```
src/
  main.jsx              # Ponto de entrada React (createRoot)
  App.jsx               # Monta o GameEngine
  game/
    GameEngine.jsx      # Componente principal: canvas + loop + input + HUD
    constants.js        # Dimensões, velocidades, gravidade, cores, cenas
    gameState.js        # Estado global (scene, player, enemies, ui) + ponte de UI
    InputSystem.js      # Teclado + mouse
    update.js           # Simulação (física, spawn, combate) por cena
    render.js           # Desenho no canvas (retângulos coloridos)
    useGameLoop.js      # Hook do requestAnimationFrame
    Hud.jsx             # HUD em React sobreposta ao canvas
```

## Game loop

`useGameLoop` agenda um `requestAnimationFrame` na montagem e entrega o delta do
frame em segundos, limitado por `MAX_FRAME_DELTA` (voltar de uma aba em segundo
plano produziria um delta enorme).

O `GameEngine` acumula esse delta e o consome em fatias fixas de `FIXED_TIMESTEP`
(1/60 s):

```
acumulador += delta
enquanto acumulador >= FIXED_TIMESTEP:
    acumulador -= FIXED_TIMESTEP
    updateGame(state, input, FIXED_TIMESTEP)
    input.endStep()
renderGame(ctx, state, input)
```

Passo fixo para a física, render uma vez por frame: o jogo se comporta igual a
60 Hz e a 144 Hz. `input.endStep()` roda dentro do laço porque os eventos de borda
("foi pressionado neste passo") só podem ser descartados depois que a simulação os
consumiu.

## Estado global

`createGameState()` devolve um objeto **mutável** com quatro áreas:

| Campo     | Conteúdo                                                       |
| --------- | -------------------------------------------------------------- |
| `scene`   | `menu`, `playing`, `paused` ou `gameOver` (ver `SCENES`)         |
| `player`  | posição, velocidade, `facing`, `onGround`, vida, cooldowns       |
| `enemies` | array de retângulos com velocidade e flag `alive`                |
| `ui`      | pontuação, vida, wave, FPS, mensagem — o que a HUD mostra        |

A simulação escreve nesse objeto 60x por segundo. Se ele estivesse em `useState`
seriam 60 re-renders por segundo, então o React guarda só uma referência
(`useRef`) e nunca observa o estado diretamente.

A HUD entra pela ponte `createUiBridge(state)`: o loop chama `notify()` a cada
frame, mas o snapshot só é republicado (e os inscritos só acordam) quando algum
campo de `state.ui` de fato mudou. `Hud.jsx` consome isso com
`useSyncExternalStore`. O FPS é publicado ~4x por segundo pelo mesmo motivo.

## Input

`InputSystem` grava estado bruto nos handlers do DOM e a simulação consulta uma
vez por passo:

- `isDown(action)` — mantido pressionado (mover, correr).
- `wasPressed(action)` — pressionado neste passo (pular, pausar, confirmar).
- `mouse` — `x`/`y` já em coordenadas de jogo, `down`, `clicked`, `inside`.

Várias teclas mapeiam para a mesma ação (`KEY_BINDINGS`), o auto-repeat do SO não
vira nova pressionada, e um `blur` no window zera tudo — sem isso, trocar de aba
com uma tecla pressionada deixaria o player andando sozinho.

A conversão do mouse usa `CANVAS_WIDTH/HEIGHT` e não `canvas.width`, porque o
buffer é ampliado pelo `devicePixelRatio` enquanto a simulação raciocina em
800x600.

## Renderização

`renderGame` é puro: lê o estado e desenha, sem escrever nada. Tudo é `fillRect` —
fundo, "prédios", chão, player, inimigos, hitbox de ataque, mira e overlays de
cena. Trocar por sprites depois é trocar `fillRect` por `drawImage` sem mexer na
simulação.

O canvas tem `width/height` multiplicados pelo `devicePixelRatio` e um
`setTransform(ratio, 0, 0, ratio, 0, 0)` aplicado uma vez, então todo o desenho
acontece em coordenadas lógicas de 800x600 e sai nítido em telas HiDPI.

## Gameplay atual

Plataforma de tela única: inimigos entram pelas bordas e perseguem o player, que
corre, pula (altura variável ao segurar o botão) e ataca com o clique do mouse na
direção do cursor. Levar dano dá knockback e invulnerabilidade temporária; a wave
sobe a cada 20 s e acelera o spawn. Vida zerada leva à cena `gameOver`.

## Próximos passos possíveis

- Trocar o chão único por plataformas/tilemap (a colisão hoje é uma linha só).
- Sprites reais no lugar dos retângulos, isolados em `render.js`.
- Interpolação no render usando a sobra do acumulador (`alpha`), se o movimento
  precisar ficar mais suave que 60 Hz.
