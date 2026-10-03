import { AgentState } from '../agent/AgentState.js';

export type TraceEventType =
  | 'model_request'
  | 'model_response'
  | 'tool_start'
  | 'tool_success'
  | 'tool_failure'
  | 'retry'
  | 'context_pruned'
  | 'terminated';

export type TraceStatus = 'started' | 'success' | 'failure';

export interface TraceEvent {
  runId: string;
  timestamp: string;
  step: number;
  state: AgentState;
  event: TraceEventType;
  tool?: string;
  attempt?: number;
  durationMs?: number;
  status: TraceStatus;
  error?: {
    code: string;
    message: string;
  };
  metadata?: Record<string, unknown>;
}
