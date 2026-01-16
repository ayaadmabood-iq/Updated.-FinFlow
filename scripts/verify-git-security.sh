#!/bin/bash
# ============================================================================
# Git Security Verification Script
# ============================================================================
#
# This script verifies that sensitive files are properly excluded from
# version control to prevent credential exposure.
#
# Usage: ./scripts/verify-git-security.sh
# Exit Code: 0 = All checks passed, 1 = Security issues found
# ============================================================================

set -e

echo "🔍 Git Security Verification"
echo "============================"
echo ""

ERRORS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ----------------------------------------------------------------------------
# Check 1: Verify .gitignore exists
# ----------------------------------------------------------------------------
echo "📋 Check 1: Verifying .gitignore exists..."
if [ ! -f .gitignore ]; then
  echo -e "${RED}✗ FAIL: .gitignore not found${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✓ PASS: .gitignore exists${NC}"
fi
echo ""

# ----------------------------------------------------------------------------
# Check 2: Verify .env patterns in .gitignore
# ----------------------------------------------------------------------------
echo "📋 Check 2: Verifying .env patterns in .gitignore..."
REQUIRED_PATTERNS=(
  "^\.env$"
  "^\.env\.local$"
  "^\.env\.\*\.local$"
)

for pattern in "${REQUIRED_PATTERNS[@]}"; do
  if grep -qE "$pattern" .gitignore; then
    echo -e "${GREEN}✓ PASS: Pattern '$pattern' found in .gitignore${NC}"
  else
    echo -e "${RED}✗ FAIL: Pattern '$pattern' missing from .gitignore${NC}"
    ERRORS=$((ERRORS + 1))
  fi
done
echo ""

# ----------------------------------------------------------------------------
# Check 3: Verify .env is not tracked by git
# ----------------------------------------------------------------------------
echo "📋 Check 3: Verifying .env is not tracked by git..."
if [ -f .env ]; then
  if git ls-files --error-unmatch .env 2>/dev/null; then
    echo -e "${RED}✗ FAIL: .env is tracked by git${NC}"
    echo "  Run: git rm --cached .env"
    ERRORS=$((ERRORS + 1))
  else
    echo -e "${GREEN}✓ PASS: .env is not tracked by git${NC}"
  fi
else
  echo -e "${YELLOW}⚠ WARNING: .env file does not exist${NC}"
fi
echo ""

# ----------------------------------------------------------------------------
# Check 4: Verify .env was never committed to git history
# ----------------------------------------------------------------------------
echo "📋 Check 4: Checking git history for .env commits..."
if git log --all --full-history -- .env 2>/dev/null | grep -q "commit"; then
  echo -e "${RED}✗ FAIL: .env found in git history${NC}"
  echo "  This is a security issue! Credentials may be exposed."
  echo "  Action required: Rotate credentials and clean git history"
  echo "  See: CREDENTIAL_ROTATION_GUIDE.md"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✓ PASS: No .env commits found in git history${NC}"
fi
echo ""

# ----------------------------------------------------------------------------
# Check 5: Verify .env.example exists and has only placeholders
# ----------------------------------------------------------------------------
echo "📋 Check 5: Verifying .env.example..."
if [ ! -f .env.example ]; then
  echo -e "${YELLOW}⚠ WARNING: .env.example not found${NC}"
  echo "  Recommended: Create .env.example with placeholder values"
else
  echo -e "${GREEN}✓ PASS: .env.example exists${NC}"

  # Check for potential real credentials in .env.example
  SUSPICIOUS_PATTERNS=(
    'eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*'  # JWT tokens
    'sk-[a-zA-Z0-9]{32,}'  # OpenAI keys
    'sk-ant-[a-zA-Z0-9-]{32,}'  # Anthropic keys
    '[0-9a-f]{32,64}'  # Hex secrets (but allow placeholders)
  )

  for pattern in "${SUSPICIOUS_PATTERNS[@]}"; do
    # Exclude lines with "your-", "placeholder", "example"
    if grep -E "$pattern" .env.example | grep -vE "your-|placeholder|example" | grep -q .; then
      echo -e "${YELLOW}⚠ WARNING: Potential real credential found in .env.example${NC}"
      echo "  Pattern: $pattern"
      echo "  .env.example should only contain placeholder values"
      # Not counting as error, just warning
    fi
  done
fi
echo ""

# ----------------------------------------------------------------------------
# Check 6: Verify sensitive files are not tracked
# ----------------------------------------------------------------------------
echo "📋 Check 6: Checking for tracked sensitive files..."
SENSITIVE_FILES=(
  ".env"
  ".env.local"
  ".env.development"
  ".env.production"
  ".env.staging"
  "CREDENTIAL_ROTATION_GUIDE.md"
)

for file in "${SENSITIVE_FILES[@]}"; do
  if [ -f "$file" ]; then
    if git ls-files --error-unmatch "$file" 2>/dev/null; then
      echo -e "${RED}✗ FAIL: Sensitive file '$file' is tracked by git${NC}"
      echo "  Run: git rm --cached $file"
      ERRORS=$((ERRORS + 1))
    else
      echo -e "${GREEN}✓ PASS: '$file' is not tracked (if exists)${NC}"
    fi
  fi
done
echo ""

# ----------------------------------------------------------------------------
# Check 7: Scan staged files for potential credentials
# ----------------------------------------------------------------------------
echo "📋 Check 7: Scanning staged files for potential credentials..."
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || echo "")

if [ -n "$STAGED_FILES" ]; then
  FOUND_CREDS=0
  while IFS= read -r file; do
    if [ -f "$file" ]; then
      # Check for JWT patterns
      if grep -qE 'eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*' "$file"; then
        echo -e "${YELLOW}⚠ WARNING: Potential JWT token in staged file: $file${NC}"
        FOUND_CREDS=1
      fi

      # Check for API keys
      if grep -qE 'sk-[a-zA-Z0-9]{32,}|sk-ant-[a-zA-Z0-9-]{32,}' "$file"; then
        echo -e "${YELLOW}⚠ WARNING: Potential API key in staged file: $file${NC}"
        FOUND_CREDS=1
      fi

      # Check for long hex strings (potential secrets)
      if grep -qE '[0-9a-f]{64,}' "$file"; then
        echo -e "${YELLOW}⚠ WARNING: Potential hex secret in staged file: $file${NC}"
        FOUND_CREDS=1
      fi
    fi
  done <<< "$STAGED_FILES"

  if [ $FOUND_CREDS -eq 0 ]; then
    echo -e "${GREEN}✓ PASS: No obvious credentials found in staged files${NC}"
  else
    echo -e "${YELLOW}⚠ Review staged files carefully before committing${NC}"
  fi
else
  echo -e "${GREEN}✓ PASS: No staged files to check${NC}"
fi
echo ""

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------
echo "============================"
echo "🔍 Verification Summary"
echo "============================"
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✓ All security checks passed!${NC}"
  echo ""
  echo "Your repository is properly configured to prevent credential exposure."
  exit 0
else
  echo -e "${RED}✗ $ERRORS security issue(s) found${NC}"
  echo ""
  echo "Please fix the issues above before committing."
  echo "For credential rotation, see: CREDENTIAL_ROTATION_GUIDE.md"
  exit 1
fi
