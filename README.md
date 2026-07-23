# Infinity Legend

Protótipo de jogo de mundo aberto construído com [Phaser 3](https://phaser.io/) e
[Vite](https://vitejs.dev/).

> **Nota:** Phaser 3 é um motor 2D (canvas/WebGL). Este projeto implementa um mundo
> aberto em visão top-down 2D — não renderização 3D real. Se o objetivo for 3D
> verdadeiro, considere um motor como Three.js/Babylon.js ou o Phaser 4 (WebGPU/3D).

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

- **W / Seta para cima**: mover para cima
- **S / Seta para baixo**: mover para baixo
- **A / Seta para esquerda**: mover para a esquerda
- **D / Seta para direita**: mover para a direita
- **Shift** (segurar): sprint (corrida) enquanto se move

## Estrutura de pastas

```
src/
  scenes/     # Cenas do Phaser (BootScene, WorldScene)
  entities/   # Entidades do jogo (Player, etc.)
  systems/    # Sistemas reutilizáveis (input, máquina de estados, MapManager, etc.)
  assets/
    tilemaps/ # Mapas Tiled reais: tileset.png, village.json, forest.json
  main.js     # Ponto de entrada, configuração do Phaser.Game
public/       # Arquivos estáticos servidos sem passar pelo bundler
docs/         # Documentação técnica (ver docs/architecture.md)
```

## Estado atual

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
