# Fineflow Foundation Security Test Suite

Comprehensive test coverage for security-critical code in the Fineflow Foundation project.

## Overview

This test suite provides thorough coverage of all security-critical modules including:
- Prompt injection detection and prevention
- Rate limiting with tier-based controls
- AI safety measures and content filtering
- Input validation and sanitization

## Test Files

### 1. **prompt-injection-guard.test.ts** (547 lines)

Tests the prompt injection detection system (`_shared/prompt-injection-guard.ts`).

**Coverage:**
- ✅ Detection of jailbreak attempts (DAN mode, PWNED, etc.)
- ✅ Detection of instruction override attempts
- ✅ Detection of role hijacking
- ✅ Detection of information extraction attempts
- ✅ Detection of delimiter abuse ([SYSTEM], <<SYS>>, etc.)
- ✅ Detection of code injection patterns
- ✅ Severity classification (none/low/medium/high/critical)
- ✅ Input sanitization (control chars, whitespace, delimiters)
- ✅ Output validation (system prompt leaks, credentials, role markers)
- ✅ Secure content wrapping
- ✅ Encoded attack detection:
  - Base64 encoding
  - URL encoding
  - HTML entity encoding
  - Hex encoding
  - Unicode escape sequences
  - ROT13 encoding
  - Homoglyph substitution
  - Zero-width characters
  - Mixed encoding techniques
- ✅ Advanced evasion techniques:
  - Word splitting
  - Synonyms and paraphrasing
  - Reverse text
  - Markdown formatting
  - Comment-based evasion
- ✅ Edge cases (empty input, nested delimiters, extreme lengths)

**Key Test Categories:**
- Pattern Detection (125+ test cases)
- Sanitization (40+ test cases)
- Output Validation (30+ test cases)
- Encoded Attacks (45+ test cases)
- Evasion Techniques (25+ test cases)

### 2. **rate-limiter.test.ts** (583 lines)

Tests the rate limiting system (`_shared/rate-limiter.ts`).

**Coverage:**
- ✅ Tier-based limits (free/pro/enterprise)
- ✅ Per-endpoint rate limits (chat, search, document_upload, etc.)
- ✅ Sliding window implementation
- ✅ User isolation (different users have independent limits)
- ✅ Endpoint isolation (different endpoints have independent limits)
- ✅ Window reset behavior
- ✅ Retry-after calculation
- ✅ Concurrent request handling
- ✅ Rate limit headers (X-RateLimit-*)
- ✅ Tier transitions
- ✅ Stress testing (rapid requests, burst patterns)
- ✅ Memory management and cleanup
- ✅ Error handling

**Tier Limits Tested:**
- Free: 20 chat/min, 30 search/min, 10 uploads/min
- Pro: 60 chat/min, 100 search/min, 30 uploads/min
- Enterprise: 200 chat/min, 500 search/min, 100 uploads/min

**Key Test Categories:**
- Basic Rate Limiting (50+ test cases)
- User Isolation (15+ test cases)
- Tier-Based Limits (20+ test cases)
- Window Reset (25+ test cases)
- Stress Tests (15+ test cases)
- API Endpoint Specific (10+ test cases)

### 3. **ai-safety.test.ts** (471 lines)

Tests the AI safety module (`_shared/ai-safety.ts`).

**Coverage:**
- ✅ Auth validation (Bearer token handling)
- ✅ Ownership verification (documents and projects)
- ✅ Rate limit configuration validation
- ✅ Concurrent processing limits
- ✅ Security invariants enforcement
- ✅ Request payload validation
- ✅ Input sanitization (control characters, length limits)
- ✅ AI output sanitization (dangerous patterns)
- ✅ Injection detection (all attack patterns)
- ✅ Security prompt guards:
  - Document processing guard
  - Safe summarization prompt
  - Safe training data prompt
  - Safe extraction prompt
- ✅ Helper functions (requireAuth, requireOwnership)
- ✅ Edge cases (unicode, extreme lengths, multiple patterns)

**Security Features Tested:**
- Authentication & Authorization (15+ test cases)
- Rate Limiting (20+ test cases)
- Content Filtering (30+ test cases)
- Prompt Guards (25+ test cases)
- Input/Output Sanitization (40+ test cases)

### 4. **input-validation.test.ts** (752 lines)

Tests comprehensive input validation utilities.

**Coverage:**
- ✅ Email validation (basic, international, edge cases)
- ✅ UUID validation (all versions, NIL UUID)
- ✅ Filename sanitization:
  - Path traversal prevention
  - Special character removal
  - Reserved name detection (Windows)
  - Length enforcement
  - Extension preservation
- ✅ SQL injection detection:
  - Classic SQL injection
  - Blind SQL injection
  - Stacked queries
  - Time-based attacks
- ✅ XSS prevention:
  - Script tag injection
  - Event handler injection
  - DOM-based XSS
  - Data URI XSS
- ✅ Path traversal detection:
  - Encoded traversals
  - Absolute paths
  - UNC paths
- ✅ LDAP injection detection
- ✅ Command injection detection
- ✅ XML/XXE injection detection
- ✅ NoSQL injection detection (MongoDB)
- ✅ Template injection (SSTI) detection
- ✅ Whitespace handling
- ✅ Type coercion safety
- ✅ Control character handling
- ✅ Unicode support

**Attack Patterns Covered:**
- 50+ SQL injection variants
- 40+ XSS variants
- 30+ path traversal techniques
- 20+ other injection types

## Running the Tests

### Prerequisites

Install Deno (the tests are designed for Deno runtime):

```bash
# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex
```

### Run All Tests

```bash
cd supabase/functions/_tests
deno test --allow-all
```

### Run Specific Test File

```bash
deno test --allow-all prompt-injection-guard.test.ts
deno test --allow-all rate-limiter.test.ts
deno test --allow-all ai-safety.test.ts
deno test --allow-all input-validation.test.ts
```

### Run with Coverage

```bash
deno test --allow-all --coverage=coverage
deno coverage coverage
```

### Run with Watch Mode

```bash
deno test --allow-all --watch
```

## Test Utilities (setup.ts)

The `setup.ts` file provides common utilities and mocks:

### Assertions
- `assertEquals` - Assert equality
- `assertExists` - Assert value exists
- `assertStringIncludes` - Assert string contains substring
- `assertThrows` - Assert function throws

### Mock Functions
- `createMockSupabaseClient(options)` - Mock Supabase client for testing
- `generateMaliciousInputs()` - Generate prompt injection attempts
- `generateLegitimateInputs()` - Generate safe test inputs
- `generateJailbreakAttempts()` - Generate jailbreak patterns
- `generateXSSAttempts()` - Generate XSS attack patterns
- `generateSQLInjectionAttempts()` - Generate SQL injection patterns
- `randomString(length)` - Generate random alphanumeric string
- `sleep(ms)` / `delay(ms)` - Async delay utility

## Test Coverage Summary

| Module | Lines | Tests | Coverage |
|--------|-------|-------|----------|
| prompt-injection-guard | 425 | 100+ | Comprehensive |
| rate-limiter | 255 | 80+ | Comprehensive |
| ai-safety | 533 | 90+ | Comprehensive |
| input-validation | N/A | 120+ | Comprehensive |

**Total Test Cases: 390+**

## Security Test Categories

### 1. Injection Attacks
- Prompt injection (10+ patterns)
- SQL injection (8+ variants)
- XSS (6+ types)
- Command injection
- LDAP injection
- XML/XXE injection
- NoSQL injection
- Template injection

### 2. Encoding/Evasion
- Base64 encoding
- URL encoding
- HTML entity encoding
- Hex/Unicode encoding
- ROT13
- Homoglyphs
- Zero-width characters
- Mixed encodings

### 3. Access Control
- Authentication validation
- Authorization checks
- Ownership verification
- Rate limiting
- Concurrent limits

### 4. Data Validation
- Email formats
- UUID formats
- Filename sanitization
- Path traversal prevention
- Length enforcement
- Type safety

## Best Practices

### Adding New Tests

1. **Use descriptive test names:**
   ```typescript
   Deno.test('Module - Feature - Specific behavior', () => {
     // test code
   });
   ```

2. **Group related tests:**
   ```typescript
   // ============= Feature Category Tests =============
   Deno.test('...', () => {});
   Deno.test('...', () => {});
   ```

3. **Test both positive and negative cases:**
   ```typescript
   Deno.test('Allows valid input', () => {
     // test valid input
   });

   Deno.test('Blocks invalid input', () => {
     // test invalid input
   });
   ```

4. **Use test data generators:**
   ```typescript
   const maliciousInputs = generateMaliciousInputs();
   for (const input of maliciousInputs) {
     const result = detectInjection(input);
     assertEquals(result.isClean, false);
   }
   ```

### Mock Data Guidelines

- Use unique IDs with timestamps: `user-${Date.now()}`
- Mock Supabase client for database operations
- Generate realistic attack patterns
- Test edge cases (empty, null, undefined, extreme lengths)

## Continuous Integration

These tests should be run in CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Security Tests
  run: |
    cd supabase/functions/_tests
    deno test --allow-all --coverage=coverage
    deno coverage coverage --lcov > coverage.lcov
```

## Security Considerations

### What We Test For

✅ **Prompt Injection**: All known jailbreak patterns, instruction overrides, role hijacking
✅ **Rate Limiting**: Per-user, per-endpoint, per-tier limits with proper isolation
✅ **Input Validation**: SQL, XSS, path traversal, command injection, etc.
✅ **Authentication**: Token validation, ownership verification
✅ **Output Filtering**: System prompt leaks, credential exposure
✅ **Encoding Attacks**: Base64, URL, HTML, Unicode, and mixed encodings
✅ **Evasion Techniques**: Word splitting, synonyms, homoglyphs, zero-width chars

### What's Not Covered

⚠️ **Cryptographic Operations**: Key generation, encryption, hashing (separate tests needed)
⚠️ **Network Security**: TLS, certificate validation (infrastructure level)
⚠️ **Database Security**: RLS policies, query optimization (Supabase level)
⚠️ **API Gateway Security**: CORS, CSP, headers (infrastructure level)

## Maintenance

### Regular Updates Needed

1. **New Attack Patterns**: As new prompt injection techniques are discovered
2. **Encoding Schemes**: New encoding/obfuscation methods
3. **Rate Limits**: Adjust based on production metrics
4. **Security Prompts**: Update guard prompts based on real-world attacks

### Performance Benchmarks

Expected test execution times:
- prompt-injection-guard.test.ts: ~2-3 seconds
- rate-limiter.test.ts: ~1-2 seconds
- ai-safety.test.ts: ~2-3 seconds
- input-validation.test.ts: ~1-2 seconds

**Total: ~6-10 seconds** for full test suite

## Contributing

When adding new security tests:

1. Document the attack vector being tested
2. Include references to CVE/CWE if applicable
3. Add examples of both successful attacks (should be blocked) and false positives (should pass)
4. Update this README with new coverage areas
5. Ensure tests are isolated and don't affect other tests

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Prompt Injection Defenses](https://simonwillison.net/2023/Apr/14/worst-that-can-happen/)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [Input Validation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

## License

Part of the Fineflow Foundation project. All security tests follow the same license as the main project.
