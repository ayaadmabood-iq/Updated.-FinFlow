#!/bin/bash

# ============================================================
# Security Tests Runner for FineFlow
# Runs all security-critical tests for Edge Functions
# ============================================================

set -e

echo "🔐 FineFlow Security Tests"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0

# Function to run a test file
run_test() {
  local test_file=$1
  local test_name=$2
  
  echo -e "${YELLOW}▶ Running: ${test_name}${NC}"
  
  if deno test --allow-all --quiet "$test_file" 2>&1; then
    echo -e "${GREEN}✓ PASSED: ${test_name}${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAILED: ${test_name}${NC}"
    ((FAILED++))
  fi
  echo ""
}

# Change to project root
cd "$(dirname "$0")/.."

echo "📂 Test Directory: supabase/functions/_tests/"
echo ""

# Run all security tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                    PROMPT INJECTION TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
run_test "supabase/functions/_tests/prompt-injection-guard.test.ts" "Prompt Injection Guard"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                     RATE LIMITER TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
run_test "supabase/functions/_tests/rate-limiter.test.ts" "Rate Limiter"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                   UNIFIED AI EXECUTOR TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
run_test "supabase/functions/_tests/unified-ai-executor.test.ts" "Unified AI Executor"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                    URL VALIDATOR TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
run_test "supabase/functions/_tests/url-validator.test.ts" "URL Validator (SSRF)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                   INPUT VALIDATION TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
run_test "supabase/functions/_tests/input-validation.test.ts" "Input Validation"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                         SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All security tests passed!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some security tests failed. Please review and fix.${NC}"
  exit 1
fi
