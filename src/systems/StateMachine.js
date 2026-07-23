export class State {
  enter() {}

  execute() {}

  exit() {}
}

export default class StateMachine {
  constructor(context, states, initialKey) {
    this.context = context;
    this.states = states;
    this.currentKey = null;
    this.currentState = null;
    this.setState(initialKey);
  }

  get key() {
    return this.currentKey;
  }

  setState(key) {
    if (key === this.currentKey) return;
    if (!this.states[key]) {
      throw new Error(`Unknown state: ${key}`);
    }

    this.currentState?.exit(this.context);
    this.currentKey = key;
    this.currentState = this.states[key];
    this.currentState.enter(this.context);
  }

  update(dt) {
    this.currentState?.execute(this.context, dt);
  }
}
