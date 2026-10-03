import { HarnessError } from '../errors/HarnessError.js';
import { ErrorCodes } from '../errors/ErrorCodes.js';

export enum AgentState {
  IDLE = 'IDLE',
  THINKING = 'THINKING',
  EXECUTING_TOOL = 'EXECUTING_TOOL',
  EVALUATING = 'EVALUATING',
  TERMINATED = 'TERMINATED',
  ERROR = 'ERROR',
}

const VALID_TRANSITIONS: Record<AgentState, AgentState[]> = {
  [AgentState.IDLE]: [AgentState.THINKING, AgentState.ERROR],
  [AgentState.THINKING]: [AgentState.EXECUTING_TOOL, AgentState.TERMINATED, AgentState.ERROR],
  [AgentState.EXECUTING_TOOL]: [AgentState.EVALUATING, AgentState.ERROR],
  [AgentState.EVALUATING]: [AgentState.THINKING, AgentState.TERMINATED, AgentState.ERROR],
  [AgentState.TERMINATED]: [],
  [AgentState.ERROR]: [],
};

export class StateMachine {
  private _state: AgentState = AgentState.IDLE;

  public get current(): AgentState {
    return this._state;
  }

  public transitionTo(nextState: AgentState): void {
    if (nextState === AgentState.ERROR) {
      this._state = AgentState.ERROR;
      return;
    }

    const allowed = VALID_TRANSITIONS[this._state];
    if (!allowed || !allowed.includes(nextState)) {
      throw new HarnessError({
        code: ErrorCodes.INVALID_STATE_TRANSITION,
        message: `Illegal transition from ${this._state} to ${nextState}`,
        metadata: { from: this._state, to: nextState },
      });
    }

    this._state = nextState;
  }
}
