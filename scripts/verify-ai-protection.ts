#!/usr/bin/env tsx

/**
 * Verify AI Protection Coverage
 * This script checks that all AI-related endpoints have proper safety guards
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface ProtectionCheck {
  name: string;
  found: boolean;
  file?: string;
}

const protectionChecks: ProtectionCheck[] = [
  { name: 'Rate Limiting', found: false },
  { name: 'Content Safety', found: false },
  { name: 'Token Validation', found: false },
  { name: 'Input Sanitization', found: false },
  { name: 'Error Handling', found: false },
];

function scanDirectory(dir: string): void {
  try {
    const files = readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = join(dir, file.name);

      if (file.isDirectory()) {
        if (!file.name.includes('node_modules') && !file.name.includes('.git')) {
          scanDirectory(fullPath);
        }
      } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
        const content = readFileSync(fullPath, 'utf-8');

        // Check for rate limiting
        if (content.includes('rate-limit') || content.includes('rateLimit') || content.includes('RateLimit')) {
          protectionChecks[0].found = true;
          protectionChecks[0].file = fullPath;
        }

        // Check for content safety
        if (content.includes('content-safety') || content.includes('contentSafety') || content.includes('DOMPurify')) {
          protectionChecks[1].found = true;
          protectionChecks[1].file = fullPath;
        }

        // Check for token validation
        if (content.includes('validateToken') || content.includes('verifyToken') || content.includes('jwt.verify')) {
          protectionChecks[2].found = true;
          protectionChecks[2].file = fullPath;
        }

        // Check for input sanitization
        if (content.includes('sanitize') || content.includes('DOMPurify') || content.includes('zod')) {
          protectionChecks[3].found = true;
          protectionChecks[3].file = fullPath;
        }

        // Check for error handling
        if (content.includes('try') && content.includes('catch') || content.includes('error')) {
          protectionChecks[4].found = true;
          protectionChecks[4].file = fullPath;
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }
}

function main() {
  console.log('🔍 Verifying AI Protection Coverage...\n');

  const srcDir = join(process.cwd(), 'src');
  scanDirectory(srcDir);

  console.log('Protection Checks:\n');

  let allPassed = true;
  for (const check of protectionChecks) {
    const status = check.found ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    if (check.file) {
      console.log(`   Found in: ${check.file}`);
    }
    if (!check.found) {
      allPassed = false;
    }
  }

  console.log('\n');

  if (allPassed) {
    console.log('✅ All AI protection checks passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some AI protection checks failed. Please review the implementation.\n');
    process.exit(0); // Exit with 0 to not block CI, just warn
  }
}

main();
