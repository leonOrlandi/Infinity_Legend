import { State } from '../../../systems/StateMachine.js';

export default class RunState extends State {
  enter(player) {
    player.playAnimation('run');
    player.setMoveSpeedTarget(player.runSpeed);
  }

  execute(player) {
    const { moving, sprinting } = player.getMovementInput();
    if (!moving) {
      player.stateMachine.setState('idle');
    } else if (!sprinting) {
      player.stateMachine.setState('walk');
    }
  }
}
