import { describe, it, expect } from 'vitest';
import { StateMachine, AgentState } from '../../packages/core/src/agent/AgentState.js';
import { HarnessError } from '../../packages/core/src/errors/HarnessError.js';
import { ErrorCodes } from '../../packages/core/src/errors/ErrorCodes.js';

describe('StateMachine', () => {
  it('starts at IDLE and transitions correctly', () => {
    const sm = new StateMachine();
    expect(sm.current).toBe(AgentState.IDLE);

    sm.transitionTo(AgentState.THINKING);
    expect(sm.current).toBe(AgentState.THINKING);

    sm.transitionTo(AgentState.EXECUTING_TOOL);
    expect(sm.current).toBe(AgentState.EXECUTING_TOOL);

    sm.transitionTo(AgentState.EVALUATING);
    expect(sm.current).toBe(AgentState.EVALUATING);

    sm.transitionTo(AgentState.THINKING);
    expect(sm.current).toBe(AgentState.THINKING);

    sm.transitionTo(AgentState.TERMINATED);
    expect(sm.current).toBe(AgentState.TERMINATED);
  });

  it('rejects illegal transition from IDLE directly to EXECUTING_TOOL', () => {
    const sm = new StateMachine();
    try {
      sm.transitionTo(AgentState.EXECUTING_TOOL);
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HarnessError);
      expect(err.code).toBe(ErrorCodes.INVALID_STATE_TRANSITION);
    }
  });

  it('allows transition to ERROR from any state', () => {
    const sm = new StateMachine();
    sm.transitionTo(AgentState.THINKING);
    sm.transitionTo(AgentState.ERROR);
    expect(sm.current).toBe(AgentState.ERROR);
  });
});
