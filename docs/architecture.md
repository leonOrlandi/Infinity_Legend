# Arquitetura do projeto

## Estrutura de pastas

- `src/scenes/` — cenas do Phaser (ciclo de vida `preload`/`create`/`update`).
  - `BootScene`: carrega assets iniciais e inicia a cena de jogo.
  - `WorldScene`: cena principal do mundo aberto — tilemap, player e câmera.
- `src/entities/` — classes de entidades do jogo.
  - `entities/player/` — tudo relacionado ao player (ver seção dedicada abaixo).
- `src/systems/` — sistemas reutilizáveis desacoplados das cenas/entidades:
  - `InputSystem`: mapeia teclado (WASD/setas/Shift) para um estado simples de input.
  - `StateMachine`: máquina de estados finita genérica (não é específica de player).
  - `PlaceholderTextures`: gera texturas (tileset e spritesheet do player) por código,
    sem depender de arquivos de arte externos.
- `src/assets/` — imagens, spritesheets, tilemaps e áudio importados pelo bundler
  (hoje vazio — toda a arte é gerada em runtime, ver "Arte placeholder" abaixo).
- `public/` — arquivos estáticos servidos diretamente.
- `docs/` — documentação técnica do projeto.

## Fluxo de cenas

```
BootScene -> WorldScene
```

## Arte placeholder (sem assets externos)

Como ainda não há spritesheets/tilesets reais, `PlaceholderTextures.js` desenha as
texturas via `Phaser.GameObjects.Graphics` + `generateTexture` em tempo de execução:

- **Tileset** (`generateTilesetTexture`): uma textura 64x32 com 2 tiles lado a lado
  (índice 0 = chão, índice 1 = parede). É usada como um tileset normal do Phaser —
  o código do tilemap não sabe (nem precisa saber) que a imagem foi gerada.
- **Spritesheet do player** (`generateHumanoidSpriteSheet`): uma textura com 4 direções
  (down/left/right/up) x 4 frames cada, endereçadas como `"<direção>-<frame>"` (ex:
  `"down-0"`). As pernas alternam de frame a frame para simular um ciclo de caminhada,
  e um pequeno "notch" branco indica a direção que o personagem está olhando.

**Por que isso importa para trocar por arte real depois:** tanto o tilemap quanto o
player consomem essas texturas pelo *nome da textura* e pelo *nome dos frames*
(`"down-0"`, `"down-1"`, ...), não por "são geradas em código". Para usar arte de
verdade, basta carregar um spritesheet real em `BootScene.preload()` com os mesmos
nomes de frame (ou ajustar `PlayerAnimations.js`, que é o único lugar que referencia
os nomes de frame) — `Player.js`, os estados e o tilemap não mudam.

## Tilemap de teste e colisão

`WorldScene` constrói um tilemap 40x30 a partir de um array 2D gerado em código
(`buildTestLayout`): bordas viram parede, e alguns retângulos internos (`TEST_OBSTACLES`)
formam obstáculos de teste. O layer resultante chama `setCollision(TILE_WALL)` e um
`physics.add.collider(player, groundLayer)` cuida da colisão via Arcade Physics.

Isso é deliberadamente um "nível de teste": quando houver level design real, `buildTestLayout`
é substituído por um layer carregado de um tilemap do Tiled (`this.make.tilemap({ key: ... })`
em vez de `{ data: ... }`) — o resto do pipeline (tileset, collider, câmera com bounds do
mapa) permanece igual.

## Câmera e mundo

Os bounds da física (`physics.world.setBounds`) e da câmera (`cameras.main.setBounds`)
usam `map.widthInPixels`/`heightInPixels`, não um valor fixo — então o mundo jogável
sempre corresponde exatamente ao tamanho do tilemap carregado, qualquer que ele seja.

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

## Próximos passos sugeridos

- Trocar as texturas geradas por spritesheets/tilesets reais (mesmos nomes de frame).
- Carregar um tilemap real do Tiled em vez de `buildTestLayout`.
- Adicionar `AttackState`/`CastState`/`HurtState` reaproveitando a mesma `StateMachine`.
- Sistema de câmera com zoom dinâmico.
