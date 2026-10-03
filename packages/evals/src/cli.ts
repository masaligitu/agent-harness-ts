import { EvalRunner } from './EvalRunner.js';

async function main() {
  const results = await EvalRunner.runAll();
  const allPassed = results.every((r) => r.passed);
  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
