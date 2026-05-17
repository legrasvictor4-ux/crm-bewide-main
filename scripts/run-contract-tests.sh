#!/usr/bin/env bash
# =============================================================================
# CONTRACT TEST RUNNER — CI/CD Gate
# =============================================================================
# Usage: bash scripts/run-contract-tests.sh
#
# This script runs all contract tests and exits with code 1 if ANY test fails.
# Designed as a blocking CI/CD gate — 0 = pass, 1 = block.
# =============================================================================

set -euo pipefail

echo "================================================================"
echo "  DATABASE CONTRACT TEST SUITE — VALIDATION GATE"
echo "================================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
TOTAL=0

TEST_FILES=(
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

echo -e "${YELLOW}Running ${#TEST_FILES[@]} contract test modules...${NC}"
echo ""

for file in "${TEST_FILES[@]}"; do
  echo -e "${CYAN}[CONTRACT]${NC} Running: $file"
  if npx vitest run "$file" --reporter=verbose 2>&1; then
    echo -e "${GREEN}  ✅ PASS${NC}"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}  ❌ FAIL${NC}"
    FAIL=$((FAIL + 1))
  fi
  TOTAL=$((TOTAL + 1))
  echo ""
done

echo "================================================================"
echo -e "${CYAN}CONTRACT TEST SUMMARY${NC}"
echo "================================================================"
echo -e "  Total modules: ${TOTAL}"
echo -e "  ${GREEN}Passed: ${PASS}${NC}"
echo -e "  ${RED}Failed: ${FAIL}${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}❌ VALIDATION GATE: BLOCKED${NC}"
  echo -e "${RED}   $FAIL contract test(s) failed. Fix before deploying.${NC}"
  exit 1
else
  echo -e "${GREEN}✅ VALIDATION GATE: PASSED${NC}"
  echo -e "${GREEN}   All contract tests pass. System is stable.${NC}"
  exit 0
fi
