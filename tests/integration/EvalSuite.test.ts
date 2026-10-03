import { describe, it, expect } from 'vitest';
import { ALL_EVAL_FIXTURES } from '../../packages/evals/src/EvalRunner.js';

describe('Agent Harness Deterministic Eval Suite (E01 - E10)', () => {
  for (const fixture of ALL_EVAL_FIXTURES) {
    it(`runs ${fixture.id}: ${fixture.name}`, async () => {
      const result = await fixture.run();
      if (!result.passed) {
        console.error(`Fixture ${fixture.id} failed:`, result.error);
      }
      expect(result.passed).toBe(true);
    });
  }
});
