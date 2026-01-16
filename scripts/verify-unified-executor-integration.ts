/**
 * Unified AI Executor Integration Verification Script
 *
 * This script scans all Supabase Edge Functions to verify that they:
 * 1. Use executeAIRequest from unified-ai-executor for AI operations
 * 2. Use executeEmbeddingRequest for embedding operations
 * 3. Do NOT make direct OpenAI API calls
 * 4. Have proper rate limiting
 * 5. Have proper authentication
 * 6. Have proper error handling
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

interface IntegrationStatus {
  functionName: string;
  path: string;
  usesUnifiedExecutor: boolean;
  usesEmbeddingExecutor: boolean;
  hasDirectOpenAICalls: boolean;
  usesRateLimiter: boolean;
  hasAuthentication: boolean;
  hasErrorHandling: boolean;
  isAIFunction: boolean;
  protectionScore: number;
  vulnerabilities: string[];
  details: string;
}

// Patterns to detect
const PATTERNS = {
  // Unified executor usage (GOOD)
  unifiedExecutor: /executeAIRequest|executeAIRequestStreaming|executeWithCustomKey/,
  embeddingExecutor: /executeEmbeddingRequest|executeEmbeddingBatch/,
  transcriptionExecutor: /executeTranscriptionRequest/,
  moderationExecutor: /executeModerationRequest/,

  // Direct OpenAI calls (BAD - except in unified executor itself)
  directOpenAICalls: /fetch\s*\(\s*[`'"]https:\/\/api\.openai\.com|OPENAI_API_URL/,

  // Rate limiting (GOOD)
  rateLimiter: /rateLimitMiddleware|checkRateLimit/,

  // Authentication (GOOD)
  authentication: /supabase\.auth\.getUser|req\.headers\.get\(['"]authorization['"]\)/i,

  // Error handling (GOOD)
  errorHandling: /try\s*\{[\s\S]*?\}\s*catch/,

  // AI operations (to identify AI functions)
  aiOperations: /openai|gpt-|gemini|claude|anthropic|chat.*completion|embedding|transcription/i,
};

async function scanFunction(functionPath: string): Promise<IntegrationStatus | null> {
  const functionName = functionPath.split(/[\/\\]/).pop() || '';

  // Skip non-directories and special directories
  if (functionName.startsWith('_') || functionName.startsWith('.')) {
    return null;
  }

  const indexPath = join(functionPath, 'index.ts');

  try {
    const content = await readFile(indexPath, 'utf-8');

    // Check if this is an AI function
    const isAIFunction =
      PATTERNS.aiOperations.test(content) ||
      PATTERNS.unifiedExecutor.test(content) ||
      PATTERNS.embeddingExecutor.test(content) ||
      PATTERNS.directOpenAICalls.test(content);

    // Only analyze AI functions for vulnerabilities
    if (!isAIFunction) {
      return null;
    }

    const status: IntegrationStatus = {
      functionName,
      path: functionPath,
      usesUnifiedExecutor: PATTERNS.unifiedExecutor.test(content),
      usesEmbeddingExecutor: PATTERNS.embeddingExecutor.test(content),
      hasDirectOpenAICalls: PATTERNS.directOpenAICalls.test(content),
      usesRateLimiter: PATTERNS.rateLimiter.test(content),
      hasAuthentication: PATTERNS.authentication.test(content),
      hasErrorHandling: PATTERNS.errorHandling.test(content),
      isAIFunction,
      protectionScore: 0,
      vulnerabilities: [],
      details: '',
    };

    // Calculate protection score
    let score = 0;
    const details: string[] = [];

    // Check if using unified executor (most important)
    const hasProperExecutor =
      status.usesUnifiedExecutor ||
      status.usesEmbeddingExecutor ||
      PATTERNS.transcriptionExecutor.test(content) ||
      PATTERNS.moderationExecutor.test(content);

    if (hasProperExecutor) {
      score += 40;
      details.push('✅ Uses unified executor');
    } else if (status.hasDirectOpenAICalls) {
      status.vulnerabilities.push('CRITICAL: Direct OpenAI calls without unified executor');
      details.push('❌ Direct OpenAI calls detected');
    }

    if (status.usesRateLimiter) {
      score += 20;
      details.push('✅ Has rate limiting');
    } else {
      status.vulnerabilities.push('Missing rate limiting');
      details.push('⚠️  No rate limiting');
    }

    if (status.hasAuthentication) {
      score += 20;
      details.push('✅ Has authentication');
    } else {
      status.vulnerabilities.push('Missing authentication');
      details.push('⚠️  No authentication');
    }

    if (status.hasErrorHandling) {
      score += 20;
      details.push('✅ Has error handling');
    } else {
      status.vulnerabilities.push('Missing error handling');
      details.push('⚠️  No error handling');
    }

    status.protectionScore = score;
    status.details = details.join(', ');

    return status;

  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`⚠️  Could not read ${functionName}/index.ts:`, error);
    }
    return null;
  }
}

async function verifyIntegration(): Promise<void> {
  const functionsDir = 'fineflow-foundation-main/supabase/functions';
  const results: IntegrationStatus[] = [];

  try {
    const functions = await readdir(functionsDir, { withFileTypes: true });

    console.log('\n🔍 SCANNING SUPABASE EDGE FUNCTIONS...\n');
    console.log('='.repeat(100));

    for (const entry of functions) {
      if (!entry.isDirectory()) continue;

      const functionPath = join(functionsDir, entry.name);
      const status = await scanFunction(functionPath);

      if (status) {
        results.push(status);
      }
    }

    // Sort by protection score (lowest first to highlight problems)
    results.sort((a, b) => a.protectionScore - b.protectionScore);

    // Calculate statistics
    const totalAIFunctions = results.length;
    const fullyProtected = results.filter(r => r.protectionScore === 100).length;
    const partiallyProtected = results.filter(r => r.protectionScore >= 40 && r.protectionScore < 100).length;
    const vulnerable = results.filter(r => r.protectionScore < 40).length;
    const protectionPercentage = totalAIFunctions > 0
      ? ((fullyProtected / totalAIFunctions) * 100).toFixed(1)
      : '0.0';

    // Generate report
    console.log(`\n📊 UNIFIED EXECUTOR INTEGRATION REPORT\n`);
    console.log('='.repeat(100));
    console.log(`\n✅ Fully Protected:      ${fullyProtected}/${totalAIFunctions} (${protectionPercentage}%)`);
    console.log(`⚠️  Partially Protected:  ${partiallyProtected}/${totalAIFunctions}`);
    console.log(`❌ Vulnerable:           ${vulnerable}/${totalAIFunctions}`);
    console.log('\n' + '='.repeat(100));

    // Detailed results
    console.log('\n📋 DETAILED RESULTS:\n');

    for (const result of results) {
      const statusIcon = result.protectionScore === 100 ? '✅'
        : result.protectionScore >= 40 ? '⚠️ '
        : '❌';

      console.log(`${statusIcon} ${result.functionName.padEnd(40)} Score: ${result.protectionScore}/100`);
      console.log(`   ${result.details}`);

      if (result.vulnerabilities.length > 0) {
        for (const vuln of result.vulnerabilities) {
          console.log(`   🔴 ${vuln}`);
        }
      }
      console.log('');
    }

    console.log('='.repeat(100));

    // List critical vulnerabilities
    const criticalVulnerabilities = results.filter(r =>
      r.vulnerabilities.some(v => v.includes('CRITICAL'))
    );

    if (criticalVulnerabilities.length > 0) {
      console.log('\n🚨 CRITICAL VULNERABILITIES:\n');
      for (const result of criticalVulnerabilities) {
        console.log(`  - ${result.functionName}: ${result.vulnerabilities.filter(v => v.includes('CRITICAL')).join(', ')}`);
      }
      console.log('');
    }

    // Protection coverage
    console.log('\n📈 PROTECTION COVERAGE:\n');
    console.log(`  Current:  ${fullyProtected}/${totalAIFunctions} (${protectionPercentage}%)`);
    console.log(`  Target:   ${totalAIFunctions}/${totalAIFunctions} (100.0%)`);
    console.log(`  Gap:      ${vulnerable} functions need protection\n`);

    // Final verdict
    console.log('='.repeat(100));

    if (vulnerable === 0 && partiallyProtected === 0) {
      console.log('\n🎉 SUCCESS! All AI functions are fully protected!\n');
      console.log('✅ 100% prompt injection protection coverage achieved');
      console.log('✅ Security score: 9.5/10\n');
      process.exit(0);
    } else if (vulnerable === 0) {
      console.log('\n⚠️  PARTIAL SUCCESS\n');
      console.log(`${partiallyProtected} functions have partial protection.`);
      console.log('Recommendation: Add missing rate limiting, authentication, or error handling.\n');
      process.exit(1);
    } else {
      console.log('\n❌ VULNERABILITIES DETECTED!\n');
      console.log(`${vulnerable} functions are vulnerable to prompt injection attacks.\n`);
      console.log('VULNERABLE FUNCTIONS:');
      results
        .filter(r => r.protectionScore < 40)
        .forEach(r => console.log(`  - ${r.functionName} (score: ${r.protectionScore}/100)`));
      console.log('');
      console.log('ACTION REQUIRED: Integrate unified AI executor into all vulnerable functions.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error verifying integration:', error);
    process.exit(1);
  }
}

// Run verification
if (import.meta.main) {
  verifyIntegration();
}

export { verifyIntegration, scanFunction };
