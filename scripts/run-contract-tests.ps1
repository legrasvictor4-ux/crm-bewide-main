# =============================================================================
# CONTRACT TEST RUNNER — CI/CD Gate (PowerShell)
# =============================================================================
# Usage: .\scripts\run-contract-tests.ps1
#
# Runs all contract tests. Exits with code 1 if ANY test fails.
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "================================================================"
Write-Host "  DATABASE CONTRACT TEST SUITE — VALIDATION GATE" -ForegroundColor Cyan
Write-Host "================================================================"
Write-Host ""

$PASS = 0
$FAIL = 0

$TEST_FILES = @(
  "tests/contract/01-schema-contract.test.ts"
  "tests/contract/02-security-rls.test.ts"
  "tests/contract/03-data-validation.test.ts"
  "tests/contract/04-api-failure.test.ts"
  "tests/contract/05-crud-flow.test.ts"
  "tests/contract/06-race-chaos.test.ts"
  "tests/contract/07-corruption.test.ts"
  "tests/contract/08-frontend-contract.test.ts"
  "tests/contract/09-regression-lock.test.ts"
  "tests/contract/10-observability.test.ts"
  "tests/contract/11-performance.test.ts"
)

Write-Host "Running $($TEST_FILES.Length) contract test modules..." -ForegroundColor Yellow
Write-Host ""

foreach ($file in $TEST_FILES) {
  Write-Host "[CONTRACT] Running: $file" -ForegroundColor Cyan
  $output = npx vitest run $file --reporter=verbose 2>&1
  $exitCode = $LASTEXITCODE
  
  if ($exitCode -eq 0) {
    Write-Host "  ✅ PASS" -ForegroundColor Green
    $PASS++
  } else {
    Write-Host "  ❌ FAIL" -ForegroundColor Red
    Write-Host $output
    $FAIL++
  }
  Write-Host ""
}

Write-Host "================================================================"
Write-Host "CONTRACT TEST SUMMARY" -ForegroundColor Cyan
Write-Host "================================================================"
Write-Host "  Total modules: $($TEST_FILES.Length)"
Write-Host "  Passed: $PASS" -ForegroundColor Green
Write-Host "  Failed: $FAIL" -ForegroundColor Red
Write-Host ""

if ($FAIL -gt 0) {
  Write-Host "❌ VALIDATION GATE: BLOCKED" -ForegroundColor Red
  Write-Host "   $FAIL contract test(s) failed. Fix before deploying." -ForegroundColor Red
  exit 1
} else {
  Write-Host "✅ VALIDATION GATE: PASSED" -ForegroundColor Green
  Write-Host "   All contract tests pass. System is stable." -ForegroundColor Green
  exit 0
}
