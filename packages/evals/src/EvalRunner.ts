import { EvalResult, EvalFixture } from './EvalTypes.js';
import { E01CorrectTool } from './fixtures/E01-correct-tool.js';
import { E02InvalidArgs } from './fixtures/E02-invalid-args.js';
import { E03Timeout } from './fixtures/E03-timeout.js';
import { E04MalformedOutput } from './fixtures/E04-malformed-output.js';
import { E05DuplicateCall } from './fixtures/E05-duplicate-call.js';
import { E06ContextPressure } from './fixtures/E06-context-pressure.js';
import { E07ModelFailure } from './fixtures/E07-model-failure.js';
import { E08LoopGuard } from './fixtures/E08-loop-guard.js';
import { E09PartialFailure } from './fixtures/E09-partial-failure.js';
import { E10Recovery } from './fixtures/E10-recovery.js';

export const ALL_EVAL_FIXTURES: EvalFixture[] = [
  E01CorrectTool,
  E02InvalidArgs,
  E03Timeout,
  E04MalformedOutput,
  E05DuplicateCall,
  E06ContextPressure,
  E07ModelFailure,
  E08LoopGuard,
  E09PartialFailure,
  E10Recovery,
];

export class EvalRunner {
  public static async runAll(): Promise<EvalResult[]> {
    const results: EvalResult[] = [];
    console.log('\n========================================');
    console.log('AGENT-HARNESS-TS EVALUATION SUITE');
    console.log('========================================\n');

    for (const fixture of ALL_EVAL_FIXTURES) {
      const res = await fixture.run();
      results.push(res);
      const statusStr = res.passed ? 'PASS' : 'FAIL';
      const dots = '.'.repeat(Math.max(2, 40 - fixture.name.length - fixture.id.length));
      console.log(`${fixture.id} ${fixture.name} ${dots} ${statusStr} [${res.durationMs}ms]`);
      if (!res.passed && res.error) {
        console.log(`   └─ Error: ${res.error}`);
      }
    }

    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.length - passedCount;

    console.log('\n----------------------------------------');
    console.log(`Summary: ${passedCount} passed, ${failedCount} failed (${results.length} total)`);
    console.log('----------------------------------------\n');

    return results;
  }
}
