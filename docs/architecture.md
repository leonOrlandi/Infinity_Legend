# Arquitetura do projeto

## Estrutura de pastas

- `src/scenes/` — cenas do Phaser (ciclo de vida `preload`/`create`/`update`).
  - `BootScene`: pré-carrega o tileset e o mapa inicial, depois inicia `WorldScene`.
  - `WorldScene`: cena principal do mundo aberto — mapa atual, player e câmera.
- `src/entities/` — classes de entidades do jogo.
  - `entities/player/` — tudo relacionado ao player (ver seção dedicada abaixo).
- `src/systems/` — sistemas reutilizáveis desacoplados das cenas/entidades:
  - `InputSystem`: mapeia teclado (WASD/setas/Shift) para um estado simples de input.
  - `StateMachine`: máquina de estados finita genérica (não é específica de player).
  - `PlaceholderTextures`: gera o spritesheet placeholder do player por código.
  - `MapManager`: carrega/constrói/destrói mapas Tiled (ver "Sistema de mapas" abaixo).
  - `mapSources`: registro central de chaves/URLs de tileset e mapas.
  - `depths`: constantes de profundidade de renderização compartilhadas.
- `src/assets/tilemaps/` — os assets reais do Tiled: `tileset.png`, `village.json`,
  `forest.json`. Esses `.json` são exatamente o formato exportado pelo editor Tiled.
- `public/` — arquivos estáticos servidos diretamente.
- `docs/` — documentação técnica do projeto.

## Fluxo de cenas

```
BootScene -> WorldScene
```

## Sobre a arte placeholder

Nenhum spritesheet/tileset foi desenhado à mão — mas os arquivos são reais:

- **`tileset.png`**: gerado uma única vez por um script Node autônomo (não faz parte
  do jogo) que desenha pixels diretamente e escreve um PNG válido. 8 tiles (32x32) em
  grade 4x2: grama, caminho, água, árvore, pedra, parede, flor, cerca.
- **`village.json` / `forest.json`**: também gerados por script, mas são JSON do Tiled
  **de verdade** — o mesmo formato que o editor Tiled exporta. Isso significa que já
  dá para abrir esses arquivos no Tiled hoje (ver seção abaixo).
- **Spritesheet do player** (`PlaceholderTextures.generateHumanoidSpriteSheet`):
  esse continua sendo gerado em runtime via `Phaser.GameObjects.Graphics`, já que não
  é um asset do Tiled. 4 direções x 4 frames, endereçados como `"down-0"`, `"down-1"` etc.

Ou seja: o **tilemap** já segue o pipeline real de Tiled+Phaser (só a arte dentro dele
é placeholder); o **player** ainda é 100% procedural. Trocar `tileset.png` por uma arte
de verdade é só substituir o arquivo, mantendo o mesmo grid 32x32; trocar o player por
um spritesheet real é ajustar `PlayerAnimations.js` (único lugar que referencia os nomes
dos frames).

## Sistema de mapas Tiled (`MapManager`)

`src/systems/MapManager.js` é o único lugar que sabe como um mapa Tiled vira conteúdo
jogável. `WorldScene` não conhece nada sobre tiles/camadas — só chama
`mapManager.build(mapKey, spawnName)` e usa o resultado.

### Camadas esperadas em cada mapa

| Camada (nome no Tiled) | Tipo | Papel |
|---|---|---|
| `Ground` | tile layer | Chão (grama, caminho, água). Nunca colide. |
| `Decoration` | tile layer | Flores, detalhes visuais. Nunca colide. |
| `Collision` | tile layer | Qualquer tile aqui bloqueia o player (`setCollisionByExclusion([-1])` — a única regra é "tem tile = sólido", não importa qual). |
| `Objects` | object layer | Pontos/retângulos: spawns do player, NPCs, itens, zonas de transição. |

### Object layer: convenção de `type`

`MapManager.parseObjectLayer` lê o campo `type` de cada objeto (não o nome):

- **`spawn`** (point): `{ name: "village_center" }` — um ponto de respawn nomeado.
  `MapManager.build(key, spawnName)` procura por esse nome.
- **`npc`** (point): `{ properties: { npcId: "villager_elder" } }` — hoje só gera um
  marcador visual (círculo laranja + label); não existe entidade de NPC ainda.
- **`item`** (point): mesma ideia, marcador em losango amarelo.
- **`transition`** (rectangle): `{ properties: { targetMap: "forest", targetSpawn: "village_entrance" } }`
  — vira uma zona física invisível (`scene.add.zone` + corpo estático). Quando o
  player sobrepõe essa zona, `WorldScene.handleTransition` é chamado.

### Como uma transição funciona

1. `physics.add.overlap(player, transitionZones, ...)` dispara `handleTransition({ targetMap, targetSpawn })`.
2. `WorldScene` marca `isTransitioning = true` e trava o input do player
   (`player.setInputLocked(true)`) — evita disparar a transição de novo enquanto ela roda.
3. `mapManager.destroyCurrent()` destrói as camadas antigas, os colliders, as zonas de
   transição e os marcadores de NPC/item do mapa anterior.
4. `mapManager.loadMapData(targetMap)` carrega o JSON do novo mapa **sob demanda** —
   `this.load.tilemapTiledJSON` + `this.load.start()` — só se ele ainda não estiver em
   cache. Isso importa para escalar: você não precisa pré-carregar todos os mapas do
   jogo em `BootScene`, só o inicial.
5. O novo mapa é construído, o player é reposicionado no spawn `targetSpawn`, a câmera
   é recentralizada (`centerOn`) para não "deslizar" visualmente pelo mapa antigo, e
   os bounds de física/câmera são recalculados a partir do tamanho do novo mapa.
6. Input do player é destravado.

### Por que profundidade explícita (`depths.js`) importa aqui

Como camadas são destruídas e recriadas a cada transição, uma camada nova sempre entra
**no fim** da display list do Phaser — ou seja, depender da ordem de criação para
"o player desenha por cima do chão" quebra na segunda vez que um mapa é trocado (foi
um bug real durante o desenvolvimento: o player sumia atrás do mapa depois da primeira
transição). A solução é `setDepth()` explícito e fixo em tudo: chão(0) < decoração(1) <
colisão(2) < marcadores(3) < player(10), independente de quando cada objeto foi criado.

### Bounds da câmera/física seguem o mapa carregado

`WorldScene.applyMapBounds()` chama `physics.world.setBounds` e `cameras.main.setBounds`
usando `tilemap.widthInPixels/heightInPixels` do mapa **atual** — recalculado a cada
transição, então os limites sempre batem com o mapa carregado no momento, seja ele a
vila (1280x960) ou a floresta (768x960).

## Estrutura do Player (`src/entities/player/`)

Esta é a parte mais importante para extensibilidade futura (magia, combate), então
o player foi dividido em camadas com responsabilidades bem separadas, em vez de uma
classe única fazendo tudo:

```
entities/player/
  Player.js              — Sprite físico: movimento, input, delega para os outros
  PlayerAnimations.js     — Constrói as animações (idle/walk/run x 4 direções)
  states/
    IdleState.js
    WalkState.js
    RunState.js
```

### 1. Movimento é independente de estado

`Player.applyMovement()` sempre faz a mesma coisa: acelera a velocidade atual em
direção a `direção_do_input * this.targetSpeed`, usando `moveToward` (equivalente ao
`MoveTowards` da Unity) em vez do sistema de `drag`/`acceleration` nativo do Arcade —
isso dá controle explícito e previsível sobre os tempos de aceleração/desaceleração
(`ACCELERATION`/`DECELERATION`, em px/s²), o que importa quando depois for preciso
ajustar coisas como "impulso de ataque" ou "recuo ao tomar dano" com precisão.

O *estado* não mexe em velocidade diretamente — ele só chama
`player.setMoveSpeedTarget(velocidade)`. Isso significa que um futuro `AttackState`
pode travar o personagem (`setMoveSpeedTarget(0)`) ou um `CastState` pode reduzir a
velocidade para "andar conjurando" (`setMoveSpeedTarget(player.walkSpeed * 0.4)`) sem
tocar em `applyMovement()`.

### 2. Máquina de estados genérica (`systems/StateMachine.js`) + estados do player

`StateMachine` não conhece nada sobre "player" — ela só recebe um `context` (aqui, a
própria instância de `Player`) e um mapa `{ chave: instância de State }`. Cada estado
implementa `enter(context)` / `execute(context)` / `exit(context)`. Isso permite:

- Reusar a mesma `StateMachine` para inimigos, NPCs, etc., sem duplicar lógica de FSM.
- Adicionar novos estados do player **sem tocar nos estados existentes**: para combate,
  criar `states/AttackState.js` que, no `enter()`, chama `player.setInputLocked(true)`,
  `player.playAnimation('attack')` e `player.setMoveSpeedTarget(0)`; no `execute()`,
  escuta o fim da animação (`this.sys.animationcomplete`) e volta para `idle`. Para
  magia, o mesmo padrão com `CastState`. Nenhuma mudança é necessária em `Idle`/`Walk`/
  `Run`, em `Player.applyMovement()`, ou no `InputSystem`.
- As transições ficam localizadas: `IdleState` decide quando vira `walk`/`run`,
  `WalkState` decide quando vira `idle`/`run`, etc. — não existe um "switch gigante"
  centralizado que cresce a cada novo estado.

### 3. Input já tem espaço para novas ações

`InputSystem.getState()` retorna um objeto simples (`up/down/left/right/sprint`).
Adicionar uma ação de ataque ou de conjurar magia é uma linha nova nesse objeto (ex:
`attack: this.attackKey.isDown`) — `Player.getMovementInput()` já isola a leitura de
input num único método, então os novos estados de combate/magia leem essa mesma fonte
sem duplicar lógica de teclado.

### 4. Animação é resolvida por convenção, não por acoplamento direto

Cada estado só declara uma *categoria* de animação (`player.playAnimation('walk')`).
`Player.updateAnimation()` monta a chave real (`${categoria}-${facing}`) e só troca de
animação quando ela realmente muda — então adicionar `attack-down`, `attack-left` etc.
mais tarde é só garantir que `PlayerAnimations.js` cria essas chaves; nada no `Player`
precisa mudar.

### Resumo do porquê disso facilita magia/combate depois

| Preocupação | Onde vive | Por que isso ajuda a estender |
|---|---|---|
| Física/aceleração | `Player.applyMovement` | Nunca muda ao adicionar estados novos |
| "Posso me mover agora?" | `player.inputLocked` + `setMoveSpeedTarget` | Um estado de ataque/cast só seta essas duas coisas |
| Transições de comportamento | Estados individuais (`IdleState`, etc.) | Novo estado = novo arquivo, sem editar os outros |
| Leitura de teclado | `InputSystem` + `Player.getMovementInput` | Nova tecla = 1 linha, sem duplicar leitura |
| Nome da animação a tocar | `player.animCategory` + `updateAnimation` | Novo estado só precisa de uma categoria + frames correspondentes |

## Usando o editor Tiled para expandir o mundo

Os arquivos em `src/assets/tilemaps/` são JSON reais do Tiled — abra o Tiled (app
desktop, gratuito, https://www.mapeditor.org/), `File > Open`, e selecione
`village.json` ou `forest.json` diretamente. Algumas coisas importantes para não
quebrar a integração com o Phaser:

### 1. Sempre exporte/salve com o tileset embutido ("embedded")

Este é o erro mais comum ao integrar Tiled com Phaser: se você criar um **novo**
tileset no Tiled e salvá-lo como arquivo externo (`.tsx`), o Phaser **não consegue
carregar isso** — o parser de JSON do Phaser só entende tilesets embutidos diretamente
no arquivo do mapa (é assim que os mapas deste projeto foram gerados: o campo
`tilesets` no `.json` já tem os dados do tileset inline, não uma referência `source`).
Ao adicionar um tileset no Tiled, use a opção "Embed in map" (ela aparece no diálogo de
criação de tileset). Se você já tem um `.tsx` separado, o Tiled também permite
"Tileset > Embed Tileset" para convertê-lo.

Se quiser um tileset único compartilhado por muitos mapas (recomendado conforme o
projeto cresce, para não editar propriedades de tile em N lugares), o fluxo mais simples
ainda é manter um `.tsx` como "fonte da verdade" que você importa/embute em cada mapa
ao salvar — chato de manter perfeitamente sincronizado, mas é a forma mais simples que
funciona direto com o loader do Phaser sem escrever um parser próprio.

### 2. Nomeie as camadas exatamente como o `MapManager` espera

`MapManager.build()` chama `map.createLayer('Ground', ...)`, `'Decoration'` e
`'Collision'` por nome exato — se você renomear uma camada no Tiled, atualize
`MapManager.js` também (ou vice-versa). O mesmo vale para a camada de objetos, que
precisa se chamar `Objects` (é isso que `map.getObjectLayer('Objects')` procura).

### 3. Para adicionar obstáculos/parede: desenhe na camada `Collision`

Qualquer tile colocado ali bloqueia automaticamente (não precisa marcar propriedade
nenhuma por tile) — é por isso que o design pede uma camada de colisão dedicada em vez
de misturar com decoração. Coloque só tiles **visualmente sólidos** (árvore, parede,
pedra, água, cerca) nessa camada; qualquer coisa puramente cosmética vai em `Decoration`.

### 4. Para adicionar spawns/NPCs/itens/transições: use a camada `Objects`

No Tiled, insira um objeto de ponto (ícone de ponto na barra de ferramentas) e, no
painel de propriedades do objeto:
- Defina o **Type** do objeto como `spawn`, `npc`, `item` ou `transition`.
- Dê um **Name** (usado como o nome do spawn, ex. `"village_center"`).
- Adicione **Custom Properties** conforme o tipo:
  - `npc` → `npcId` (string)
  - `item` → `itemId` (string)
  - `transition` (desenhe como **retângulo**, não ponto) → `targetMap` (string, a
    chave do mapa destino) e `targetSpawn` (string, o nome do spawn nesse mapa destino).

### 5. Para criar um mapa novo (nova área do mundo)

1. Crie o mapa no Tiled com as 4 camadas (`Ground`, `Decoration`, `Collision`,
   `Objects`), tileset embutido, e exporte/salve como `.json` em
   `src/assets/tilemaps/nome-da-area.json`.
2. Registre em `src/systems/mapSources.js`:
   ```js
   import novaAreaUrl from '../assets/tilemaps/nome-da-area.json?url';
   // ...
   export const MAP_SOURCES = {
     village: villageMapUrl,
     forest: forestMapUrl,
     'nome-da-area': novaAreaUrl,
   };
   ```
3. Adicione um objeto `transition` no mapa de onde se chega até essa área nova
   (`targetMap: 'nome-da-area'`, `targetSpawn: '<nome do spawn de entrada>'`), e um
   objeto `spawn` com esse nome no mapa novo.
4. Pronto — nada em `MapManager.js` ou `WorldScene.js` precisa mudar. O mapa é
   carregado sob demanda na primeira vez que alguém atravessa a transição para ele.

### 6. Escala: muitos mapas grandes

- Continue usando um mapa por área/tela (como vila e floresta aqui) em vez de um único
  mapa gigante — carregar sob demanda só funciona granularmente assim, e é o padrão
  usado por jogos 2D com muitas telas (ex. estilo Zelda/Stardew Valley).
- Se um mapa individual ficar muito grande e pesado, o Tiled também suporta mapas
  "infinite" com chunks — não implementado aqui, mas quando for necessário, é o próximo
  passo antes de tentar otimizar na mão.
- Property-based collision (marcar propriedade `collides` em tiles específicos do
  tileset, em vez de uma camada dedicada) é outra alternativa mais avançada se um dia
  a camada `Collision` separada virar um incômodo — trocaria
  `setCollisionByExclusion([-1])` por `setCollisionByProperty({ collides: true })`,
  mas isso exigiria a camada de decoração também ter as propriedades certas por tile.

## Próximos passos sugeridos

- Trocar o player procedural por um spritesheet real (mesmos nomes de frame).
- Trocar `tileset.png` por uma arte de verdade (mesmo grid 32x32, mesmos 8 índices).
- Construir entidades reais de NPC/Item a partir dos spawns já parseados pelo
  `MapManager` (hoje só viram marcadores visuais).
- Adicionar `AttackState`/`CastState`/`HurtState` reaproveitando a mesma `StateMachine`.
- Sistema de câmera com zoom dinâmico.
- Y-sorting (profundidade por posição vertical) para o player poder ficar atrás de
  árvores/paredes altas — hoje o player sempre renderiza por cima de tudo.
