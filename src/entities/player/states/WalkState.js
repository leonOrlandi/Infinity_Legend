import { State } from '../../../systems/StateMachine.js';

export default class WalkState extends State {
  enter(player) {
    player.playAnimation('walk');
    player.setMoveSpeedTarget(player.walkSpeed);
  }

  execute(player) {
    const { moving, sprinting } = player.getMovementInput();
    if (!moving) {
      player.stateMachine.setState('idle');
    } else if (sprinting) {
      player.stateMachine.setState('run');
    }
  }
}
