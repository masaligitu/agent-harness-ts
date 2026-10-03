export interface EvalResult {
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface EvalFixture {
  id: string;
  name: string;
  description: string;
  run(): Promise<EvalResult>;
}
