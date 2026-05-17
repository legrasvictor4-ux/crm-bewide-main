import { execSync } from 'child_process';

const STEPS = [
  { name: 'Lint', cmd: 'npx eslint . --max-warnings=0' },
  { name: 'TypeCheck', cmd: 'npx tsc --noEmit' },
  { name: 'Unit Tests', cmd: 'npx vitest run tests/unit tests/services tests/voice tests/timeline src/components/__tests__' },
  { name: 'Stress Tests', cmd: 'npx vitest run tests/stress' },
  { name: 'Chaos Tests', cmd: 'npx vitest run tests/chaos' },
];

async function main() {
  const results = [];
  let exitCode = 0;

  for (const step of STEPS) {
    process.stdout.write(`\n═══════════════════════════════════════════\n`);
    process.stdout.write(`  [CI] Running: ${step.name}\n`);
    process.stdout.write(`═══════════════════════════════════════════\n`);

    try {
      const output = execSync(step.cmd, { encoding: 'utf8', stdio: 'pipe', timeout: 120000 });
      process.stdout.write(output);
      results.push({ name: step.name, status: 'PASS' });
      process.stdout.write(`  ✓ ${step.name}: PASS\n`);
    } catch (err) {
      process.stderr.write(err.stderr || err.message);
      results.push({ name: step.name, status: 'FAIL' });
      process.stdout.write(`  ✗ ${step.name}: FAIL\n`);
      exitCode = 1;
    }
  }

  process.stdout.write(`\n═══════════════════════════════════════════\n`);
  process.stdout.write(`  CI Pipeline Results\n`);
  process.stdout.write(`═══════════════════════════════════════════\n`);
  for (const r of results) {
    process.stdout.write(`  [${r.status === 'PASS' ? '✓' : '✗'}] ${r.name}\n`);
  }
  process.stdout.write(`\n  Exit code: ${exitCode}\n`);
  process.exit(exitCode);
}

main().catch((err) => {
  process.stderr.write(`CI pipeline crashed: ${err.message}\n`);
  process.exit(1);
});
