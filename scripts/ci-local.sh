#!/usr/bin/env bash
set -euo pipefail

# Local CI pipeline — mirrors what a GitHub Actions workflow would run.
# Usage: bash scripts/ci-local.sh [--skip-e2e] [--fix]
#
# Options:
#   --skip-e2e   Skip Playwright end-to-end tests (default: skip)
#   --e2e        Run Playwright end-to-end tests
#   --fix        Auto-fix lint and format issues instead of failing

SKIP_E2E=true
FIX_MODE=false

for arg in "$@"; do
  case $arg in
    --e2e) SKIP_E2E=false ;;
    --skip-e2e) SKIP_E2E=true ;;
    --fix) FIX_MODE=true ;;
  esac
done

BOLD="\033[1m"
GREEN="\033[32m"
RED="\033[31m"
RESET="\033[0m"

pass() { echo -e "${GREEN}${BOLD}PASS${RESET} $1"; }
fail() { echo -e "${RED}${BOLD}FAIL${RESET} $1"; exit 1; }
step() { echo -e "\n${BOLD}--- $1 ---${RESET}"; }

step "1/5 TypeScript type check"
npm run typecheck || fail "typecheck"
pass "typecheck"

step "2/5 ESLint"
if $FIX_MODE; then
  npm run lint -- --fix || fail "lint --fix"
else
  npm run lint || fail "lint"
fi
pass "lint"

step "3/5 Prettier format check"
if $FIX_MODE; then
  npm run format || fail "format"
else
  npm run format:check || fail "format:check"
fi
pass "format"

step "4/5 Unit tests (Vitest)"
npm run test:unit || fail "unit tests"
pass "unit tests"

if $SKIP_E2E; then
  step "5/5 E2E tests (Playwright) — SKIPPED (use --e2e to run)"
else
  step "5/5 E2E tests (Playwright)"
  npm run test:e2e || fail "e2e tests"
  pass "e2e tests"
fi

echo -e "\n${GREEN}${BOLD}All CI checks passed.${RESET}"
