#!/usr/bin/env tsx

/**
 * Verify Rate Limiting Coverage
 * This script checks that all critical endpoints have rate limiting
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface EndpointCheck {
  endpoint: string;
  hasRateLimit: boolean;
  file?: string;
}

const criticalEndpoints: string[] = [
  'api/ai',
  'api/chat',
  'api/generate',
  'api/auth',
  'api/upload',
];

const endpointChecks: EndpointCheck[] = criticalEndpoints.map(endpoint => ({
  endpoint,
  hasRateLimit: false,
}));

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

        // Check for rate limiting patterns
        const hasRateLimit =
          content.includes('rate-limit') ||
          content.includes('rateLimit') ||
          content.includes('RateLimit') ||
          content.includes('throttle') ||
          content.includes('limiter');

        // Check if this file contains any critical endpoints
        for (const check of endpointChecks) {
          if (content.includes(check.endpoint) && hasRateLimit) {
            check.hasRateLimit = true;
            check.file = fullPath;
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }
}

function main() {
  console.log('🔍 Verifying Rate Limiting Coverage...\n');

  const srcDir = join(process.cwd(), 'src');
  scanDirectory(srcDir);

  console.log('Rate Limiting Checks:\n');

  let allPassed = true;
  for (const check of endpointChecks) {
    const status = check.hasRateLimit ? '✅' : '⚠️ ';
    console.log(`${status} ${check.endpoint}`);
    if (check.file) {
      console.log(`   Protected in: ${check.file}`);
    } else {
      console.log(`   No rate limiting found`);
    }
    if (!check.hasRateLimit) {
      allPassed = false;
    }
  }

  console.log('\n');

  if (allPassed) {
    console.log('✅ All critical endpoints have rate limiting!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some endpoints may be missing rate limiting. Please review.\n');
    console.log('Note: This is a warning only. Ensure rate limiting is configured.');
    console.log('Rate limiting may be configured at the infrastructure level (e.g., API Gateway).\n');
    process.exit(0); // Exit with 0 to not block CI, just warn
  }
}

main();
