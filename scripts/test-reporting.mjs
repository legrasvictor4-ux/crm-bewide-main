import { execSync } from 'child_process';
import { readFileSync, existsSync, writeFileSync } from 'fs';

const DOMAINS = [
  { name: 'React', dirs: ['tests/stress', 'tests/ui', 'src/components/__tests__'] },
  { name: 'Supabase/Schema', dirs: ['tests/services', 'tests/unit'] },
  { name: 'Voice AI', dirs: ['tests/voice', 'tests/chaos'] },
  { name: 'API', dirs: ['tests/api'] },
  { name: 'Backend', dirs: ['tests/timeline'] },
];

async function main() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: { total: 0, passed: 0, failed: 0, flaky: 0 },
    domains: [],
  };

  for (const domain of DOMAINS) {
    process.stdout.write(`\n[REPORT] Testing domain: ${domain.name}\n`);
    const files = domain.dirs
      .flatMap((d) => {
        try {
          const out = execSync(`npx vitest run ${d} --reporter=json 2>/dev/null`, {
            encoding: 'utf8',
            timeout: 60000,
          });
          return JSON.parse(out);
        } catch (err) {
          try {
            const out = err.stdout?.toString() || '{}';
            return JSON.parse(out);
          } catch {
            return { numTotalTests: 0, numPassedTests: 0, numFailedTests: 0, testResults: [] };
          }
        }
      })
      .filter(Boolean);

    const total = files.reduce((s, f) => s + (f.numTotalTests || 0), 0);
    const passed = files.reduce((s, f) => s + (f.numPassedTests || 0), 0);
    const failed = files.reduce((s, f) => s + (f.numFailedTests || 0), 0);

    report.domains.push({
      name: domain.name,
      total,
      passed,
      failed,
      health: failed === 0 ? 'healthy' : 'fragile',
    });

    report.summary.total += total;
    report.summary.passed += passed;
    report.summary.failed += failed;

    process.stdout.write(`  Tests: ${total} | Passed: ${passed} | Failed: ${failed}\n`);
  }

  if (report.summary.failed > 0) {
    report.summary.flaky = report.summary.failed;
  }

  const json = JSON.stringify(report, null, 2);
  writeFileSync('test-report.json', json, 'utf8');
  process.stdout.write(`\n[REPORT] Written to test-report.json\n`);

  const fragile = report.domains.filter((d) => d.health === 'fragile');
  if (fragile.length > 0) {
    process.stdout.write(`\n⚠  Fragile domains:\n`);
    for (const d of fragile) {
      process.stdout.write(`  - ${d.name} (${d.failed} failed)\n`);
    }
    process.exit(1);
  }

  process.stdout.write(`\n✓ All domains healthy\n`);
}

main().catch((err) => {
  process.stderr.write(`Reporting failed: ${err.message}\n`);
  process.exit(1);
});
