import Phaser from 'phaser';
import { DEPTH } from '../../systems/depths.js';
import StateMachine from '../../systems/StateMachine.js';
import { generateHumanoidSpriteSheet } from '../../systems/PlaceholderTextures.js';
import { createPlayerAnimations } from './PlayerAnimations.js';
import IdleState from './states/IdleState.js';
import WalkState from './states/WalkState.js';
import RunState from './states/RunState.js';

const TEXTURE_KEY = 'player';

const WALK_SPEED = 160;
const RUN_SPEED = 280;
const ACCELERATION = 900;
const DECELERATION = 1200;

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, inputSystem) {
    generateHumanoidSpriteSheet(scene, TEXTURE_KEY);
    createPlayerAnimations(scene, TEXTURE_KEY);

    super(scene, x, y, TEXTURE_KEY, 'down-0');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Fixed depth, not display-list order: map layers get destroyed/recreated
    // on every area transition and would otherwise re-append above the player.
    this.setDepth(DEPTH.PLAYER);

    this.body.setSize(20, 14).setOffset(6, 34);
    this.body.setCollideWorldBounds(true);
    this.body.setMaxVelocity(RUN_SPEED, RUN_SPEED);

    this.inputSystem = inputSystem;

    this.walkSpeed = WALK_SPEED;
    this.runSpeed = RUN_SPEED;
    this.acceleration = ACCELERATION;
    this.deceleration = DECELERATION;

    this.facing = 'down';
    this.animCategory = 'idle';
    this.targetSpeed = 0;
    this.inputLocked = false;

    // Registering new states here (e.g. attack, cast, hurt) is the only
    // change needed to plug in combat/magic later — see class docs below.
    this.stateMachine = new StateMachine(
      this,
      {
        idle: new IdleState(),
        walk: new WalkState(),
        run: new RunState(),
      },
      'idle',
    );
  }

  /** Locks player input, e.g. while an attack/cast animation plays out. */
  setInputLocked(locked) {
    this.inputLocked = locked;
  }

  /** Called by the current state to set how fast movement should accelerate towards. */
  setMoveSpeedTarget(speed) {
    this.targetSpeed = speed;
  }

  /** Called by the current state to select which animation family to play. */
  playAnimation(category) {
    this.animCategory = category;
  }

  getMovementInput() {
    const vector = new Phaser.Math.Vector2(0, 0);

    if (this.inputLocked) {
      return { moving: false, sprinting: false, vector };
    }

    const { up, down, left, right, sprint } = this.inputSystem.getState();
    if (left) vector.x -= 1;
    if (right) vector.x += 1;
    if (up) vector.y -= 1;
    if (down) vector.y += 1;

    const moving = vector.lengthSq() > 0;
    if (moving) vector.normalize();

    return { moving, sprinting: moving && sprint, vector };
  }

  update(time, delta) {
    const dt = delta / 1000;
    const { vector, moving } = this.getMovementInput();

    this.stateMachine.update(dt);
    this.applyMovement(vector, dt);

    if (moving) this.updateFacing(vector);
    this.updateAnimation();
  }

  applyMovement(direction, dt) {
    const targetVelocity = direction.clone().scale(this.targetSpeed);
    const rate = direction.lengthSq() > 0 ? this.acceleration : this.deceleration;

    const vx = moveToward(this.body.velocity.x, targetVelocity.x, rate * dt);
    const vy = moveToward(this.body.velocity.y, targetVelocity.y, rate * dt);

    this.body.setVelocity(vx, vy);
  }

  updateFacing(vector) {
    if (Math.abs(vector.x) > Math.abs(vector.y)) {
      this.facing = vector.x > 0 ? 'right' : 'left';
    } else if (vector.y !== 0) {
      this.facing = vector.y > 0 ? 'down' : 'up';
    }
  }

  updateAnimation() {
    const key = `${this.animCategory}-${this.facing}`;
    if (this.anims.currentAnim?.key !== key) {
      this.anims.play(key, true);
    }
  }
}

function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}
