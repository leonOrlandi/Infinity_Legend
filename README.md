# Infinity Legend

Jogo 2D em [React](https://react.dev/) + `<canvas>`, com motor próprio (game loop,
input e renderização escritos à mão), rodando sobre [Vite](https://vitejs.dev/).

O app que `npm run dev` abre é o motor React/Canvas — ponto de entrada `src/main.jsx`,
componente principal `src/game/GameEngine.jsx`. Documentação:
[`docs/react-canvas-engine.md`](docs/react-canvas-engine.md).

> **Protótipo Phaser:** o experimento anterior de mundo aberto com
> [Phaser 3](https://phaser.io/) continua no repositório (`src/scenes/`, `src/entities/`,
> `src/systems/`, entrada em `src/main.js`) e está documentado em
> [`docs/architecture.md`](docs/architecture.md). Para voltar a rodá-lo, aponte o
> `<script>` do `index.html` para `/src/main.js`.

## Requisitos

- Node.js 20.19+ ou 22.12+ (recomendado: versão LTS mais recente)
- npm 10+

## Instalação

```bash
npm install
```

## Rodando localmente

```bash
npm run dev
```

Isso inicia o servidor de desenvolvimento do Vite (por padrão em
`http://localhost:5173`). Abra o endereço exibido no terminal no navegador.

## Build de produção

```bash
npm run build
```

Gera os arquivos otimizados na pasta `dist/`.

Para pré-visualizar o build de produção localmente:

```bash
npm run preview
```

## Controles

- **A / D** ou **← / →**: mover
- **W**, **↑** ou **Espaço**: pular (segurar para pular mais alto)
- **Shift** (segurar): correr
- **Clique esquerdo**: atacar na direção do cursor
- **P** ou **Esc**: pausar / continuar
- **Enter**: começar · **R**: reiniciar após o fim de jogo

## Estrutura de pastas

```
src/
  main.jsx    # Ponto de entrada React
  App.jsx
  game/       # Motor React + Canvas
    GameEngine.jsx  # Componente principal (canvas, loop, input, HUD)
    constants.js    # Dimensões do canvas, velocidades, gravidade, cores
    gameState.js    # Estado global (scene, player, enemies, ui)
    InputSystem.js  # Teclado + mouse
    update.js       # Simulação em passo fixo
    render.js       # Desenho no canvas 2D
    useGameLoop.js  # Hook do requestAnimationFrame
    Hud.jsx         # HUD em React sobre o canvas
  scenes/     # (Phaser) Cenas BootScene, WorldScene
  entities/   # (Phaser) Entidades do jogo (Player, etc.)
  systems/    # (Phaser) Sistemas reutilizáveis (input, MapManager, etc.)
  assets/
    tilemaps/ # (Phaser) Mapas Tiled reais
  main.js     # (Phaser) Ponto de entrada do protótipo anterior
public/       # Arquivos estáticos servidos sem passar pelo bundler
docs/         # Documentação técnica
```

## Estado atual — motor React + Canvas

- Canvas de **800x600** (buffer ajustado ao `devicePixelRatio`), tudo desenhado com
  retângulos coloridos — ainda sem assets.
- **Game loop** com `requestAnimationFrame` e passo fixo de 1/60 s via acumulador,
  então a física não muda de comportamento conforme o refresh rate do monitor.
- **Estado global** mutável fora do React (`useRef`), com uma ponte que só notifica a
  HUD quando algum valor visível muda — nada de re-render por frame.
- **Cenas**: menu, jogando, pausado e fim de jogo.
- **Input**: teclado (com "segurando" vs. "pressionado neste passo") e mouse
  (posição em coordenadas de jogo, clique, entrada/saída do canvas).
- **Gameplay**: gravidade e pulo de altura variável, corrida, inimigos que entram pelas
  bordas e perseguem o player, ataque no clique, dano com knockback e invulnerabilidade,
  waves que aceleram o spawn, pontuação e vida na HUD.

Detalhes em [`docs/react-canvas-engine.md`](docs/react-canvas-engine.md).

## Estado do protótipo Phaser

- `BootScene`: pré-carrega o tileset e o mapa inicial (`village`), depois inicia `WorldScene`.
- `WorldScene`: carrega mapas Tiled reais (`src/assets/tilemaps/*.json`) através do
  `MapManager`, com câmera/física cujos limites acompanham o tamanho do mapa atual.
- Dois mapas de exemplo: **vila** (`village.json`) e **entrada da floresta**
  (`forest.json`), conectados por uma zona de transição — atravessar a rua a leste da
  vila carrega a floresta (e sob demanda, não pré-carregado); voltar pela mesma trilha
  retorna à vila.
- Cada mapa tem 4 camadas: `Ground` (chão), `Decoration` (flores, cosmético),
  `Collision` (qualquer tile aqui bloqueia o player) e `Objects` (spawns do player,
  NPCs, itens e zonas de transição — hoje NPCs/itens só viram marcadores visuais).
- Player: sprite humanoide (placeholder gerado por código, sem arte externa) com:
  - Movimento em 8 direções com aceleração/desaceleração suave.
  - Colisão com a camada `Collision` do mapa atual.
  - Máquina de estados (idle / walk / run) que dirige animação e velocidade-alvo.
  - Sprint segurando Shift.

Veja `docs/architecture.md` para mais detalhes sobre a arquitetura — incluindo como o
`Player` foi estruturado para ser estendido com combate e magia, e como usar o editor
Tiled para criar/editar mapas e adicionar novas áreas ao mundo.
