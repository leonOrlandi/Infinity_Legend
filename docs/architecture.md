# Arquitetura do projeto

## Estrutura de pastas

- `src/scenes/` — cenas do Phaser (ciclo de vida `preload`/`create`/`update`).
  - `BootScene`: carrega assets iniciais e inicia a cena de jogo.
  - `WorldScene`: cena principal do mundo aberto, contém o player e a câmera.
- `src/entities/` — classes de entidades do jogo (player, NPCs, inimigos, etc).
- `src/systems/` — sistemas reutilizáveis desacoplados das cenas (input, save, diálogo, etc).
- `src/assets/` — imagens, spritesheets, tilemaps e áudio importados pelo bundler.
- `public/` — arquivos estáticos servidos diretamente (favicon, assets que não passam pelo bundler).
- `docs/` — documentação técnica do projeto.

## Fluxo de cenas

```
BootScene -> WorldScene
```

`BootScene` é o ponto de entrada: hoje não carrega nada (placeholder para preload de
assets futuros) e imediatamente inicia `WorldScene`.

## Câmera e mundo

`WorldScene` define um mundo de 3200x3200px com uma grade de fundo para dar noção de
escala/movimento. A câmera principal segue o player (`startFollow`) com os bounds do
mundo travados, então o player nunca sai da área jogável e a câmera nunca mostra além
das bordas do mundo.

## Próximos passos sugeridos

- Substituir o retângulo do player por um spritesheet animado.
- Adicionar um tilemap real (Tiled) em vez da grade procedural.
- Adicionar colisão com obstáculos/terreno.
- Sistema de câmera com zoom dinâmico.
