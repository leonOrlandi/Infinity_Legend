import { State } from '../../../systems/StateMachine.js';

export default class IdleState extends State {
  enter(player) {
    player.playAnimation('idle');
    player.setMoveSpeedTarget(0);
  }

  execute(player) {
    const { moving, sprinting } = player.getMovementInput();
    if (moving) {
      player.stateMachine.setState(sprinting ? 'run' : 'walk');
    }
  }
}
