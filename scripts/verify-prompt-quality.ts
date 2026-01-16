/**
 * Prompt Quality Verification Script
 *
 * Validates that all AI functions use high-quality prompt templates
 * and meet minimum quality standards.
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

interface PromptQualityCheck {
  functionName: string;
  usesTemplates: boolean;
  hasSystemPrompt: boolean;
  hasStructuredOutput: boolean;
  qualityScore: number;
  issues: string[];
}

// Quality scoring criteria
const QUALITY_CRITERIA = {
  MIN_SYSTEM_PROMPT_LENGTH: 100,
  MIN_USER_PROMPT_LENGTH: 20,
  REQUIRES_ROLE_DEFINITION: true,
  REQUIRES_OUTPUT_FORMAT: true,
  REQUIRES_CONSTRAINTS: true,
};

async function checkFunctionPromptQuality(functionPath: string): Promise<PromptQualityCheck | null> {
  const functionName = functionPath.split(/[\\/\\\\]/).pop() || '';

  // Skip non-directories and special directories
  if (functionName.startsWith('_') || functionName.startsWith('.')) {
    return null;
  }

  const indexPath = join(functionPath, 'index.ts');

  try {
    const content = await readFile(indexPath, 'utf-8');

    // Check if this is an AI function
    const isAIFunction = /executeAIRequest|callLovableAI|openai/i.test(content);

    if (!isAIFunction) {
      return null;
    }

    const check: PromptQualityCheck = {
      functionName,
      usesTemplates: false,
      hasSystemPrompt: false,
      hasStructuredOutput: false,
      qualityScore: 0,
      issues: [],
    };

    // Check for template usage
    check.usesTemplates = /import.*prompt-templates|DOCUMENT_ANALYSIS_TEMPLATES|RAG_TEMPLATES|CONTENT_GENERATION_TEMPLATES/i.test(content);

    // Check for system prompt
    const systemPromptMatch = content.match(/systemPrompt\s*[:=]\s*[`'"]([\s\S]{100,}?)[`'"]/);
    check.hasSystemPrompt = !!systemPromptMatch;

    // Check for structured output
    check.hasStructuredOutput = /outputFormat|outputSchema|requireStructuredOutput/.test(content);

    // Calculate quality score
    let score = 0;

    if (check.usesTemplates) {
      score += 40;
    } else {
      check.issues.push('Does not use standardized prompt templates');
    }

    if (check.hasSystemPrompt) {
      score += 30;

      // Check system prompt quality
      if (systemPromptMatch) {
        const systemPrompt = systemPromptMatch[1];

        // Check for role definition
        if (/you are|your role|you're an expert/i.test(systemPrompt)) {
          score += 10;
        } else {
          check.issues.push('System prompt lacks clear role definition');
        }

        // Check for quality guidelines
        if (/quality|standard|guideline|constraint/i.test(systemPrompt)) {
          score += 10;
        } else {
          check.issues.push('System prompt lacks quality guidelines');
        }

        // Check length
        if (systemPrompt.length < QUALITY_CRITERIA.MIN_SYSTEM_PROMPT_LENGTH) {
          check.issues.push(`System prompt too short (${systemPrompt.length} chars, min ${QUALITY_CRITERIA.MIN_SYSTEM_PROMPT_LENGTH})`);
        }
      }
    } else {
      check.issues.push('Missing system prompt');
    }

    if (check.hasStructuredOutput) {
      score += 10;
    } else {
      check.issues.push('Does not specify structured output format');
    }

    check.qualityScore = Math.min(score, 100);

    return check;

  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`⚠️  Could not read ${functionName}/index.ts:`, error);
    }
    return null;
  }
}

async function verifyPromptQuality(): Promise<void> {
  const functionsDir = 'fineflow-foundation-main/supabase/functions';
  const results: PromptQualityCheck[] = [];

  try {
    const functions = await readdir(functionsDir, { withFileTypes: true });

    console.log('\n🔍 VERIFYING PROMPT QUALITY ACROSS EDGE FUNCTIONS...\n');
    console.log('='.repeat(100));

    for (const entry of functions) {
      if (!entry.isDirectory()) continue;

      const functionPath = join(functionsDir, entry.name);
      const check = await checkFunctionPromptQuality(functionPath);

      if (check) {
        results.push(check);
      }
    }

    // Sort by quality score (lowest first)
    results.sort((a, b) => a.qualityScore - b.qualityScore);

    // Calculate statistics
    const totalFunctions = results.length;
    const highQuality = results.filter(r => r.qualityScore >= 80).length;
    const mediumQuality = results.filter(r => r.qualityScore >= 60 && r.qualityScore < 80).length;
    const lowQuality = results.filter(r => r.qualityScore < 60).length;
    const avgScore = totalFunctions > 0
      ? (results.reduce((sum, r) => sum + r.qualityScore, 0) / totalFunctions).toFixed(1)
      : '0.0';

    // Generate report
    console.log(`\n📊 PROMPT QUALITY REPORT\n`);
    console.log('='.repeat(100));
    console.log(`\n✅ High Quality (80-100):    ${highQuality}/${totalFunctions}`);
    console.log(`⚠️  Medium Quality (60-79):   ${mediumQuality}/${totalFunctions}`);
    console.log(`❌ Low Quality (0-59):       ${lowQuality}/${totalFunctions}`);
    console.log(`📈 Average Quality Score:    ${avgScore}/100`);
    console.log('\n' + '='.repeat(100));

    // Detailed results
    console.log('\n📋 DETAILED QUALITY CHECKS:\n');

    for (const result of results) {
      const statusIcon = result.qualityScore >= 80 ? '✅'
        : result.qualityScore >= 60 ? '⚠️ '
        : '❌';

      console.log(`${statusIcon} ${result.functionName.padEnd(40)} Score: ${result.qualityScore}/100`);

      // Show template usage
      if (result.usesTemplates) {
        console.log(`   ✓ Uses standardized templates`);
      }
      if (result.hasSystemPrompt) {
        console.log(`   ✓ Has system prompt`);
      }
      if (result.hasStructuredOutput) {
        console.log(`   ✓ Specifies structured output`);
      }

      // Show issues
      if (result.issues.length > 0) {
        for (const issue of result.issues) {
          console.log(`   ⚠️  ${issue}`);
        }
      }
      console.log('');
    }

    console.log('='.repeat(100));

    // Functions needing improvement
    const needsImprovement = results.filter(r => r.qualityScore < 80);

    if (needsImprovement.length > 0) {
      console.log('\n📝 FUNCTIONS NEEDING IMPROVEMENT:\n');
      for (const result of needsImprovement) {
        console.log(`  - ${result.functionName} (score: ${result.qualityScore}/100)`);
      }
      console.log('');
    }

    // Template adoption
    const templatesAdopted = results.filter(r => r.usesTemplates).length;
    const adoptionRate = totalFunctions > 0
      ? ((templatesAdopted / totalFunctions) * 100).toFixed(1)
      : '0.0';

    console.log('📈 TEMPLATE ADOPTION:\n');
    console.log(`  Current:  ${templatesAdopted}/${totalFunctions} (${adoptionRate}%)`);
    console.log(`  Target:   ${totalFunctions}/${totalFunctions} (100.0%)`);
    console.log(`  Gap:      ${totalFunctions - templatesAdopted} functions need templates\n`);

    // Final verdict
    console.log('='.repeat(100));

    if (lowQuality === 0 && mediumQuality === 0) {
      console.log('\n🎉 EXCELLENT! All AI functions meet high quality standards!\n');
      console.log('✅ Average quality score: 9.0+/10');
      console.log('✅ All functions use standardized templates\n');
      process.exit(0);
    } else if (lowQuality === 0) {
      console.log('\n✅ GOOD QUALITY\n');
      console.log(`${mediumQuality} functions have medium quality prompts.`);
      console.log('Recommendation: Adopt standardized templates for consistency.\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  QUALITY IMPROVEMENTS NEEDED\n');
      console.log(`${lowQuality} functions have low quality prompts.\n`);
      console.log('LOW QUALITY FUNCTIONS:');
      results
        .filter(r => r.qualityScore < 60)
        .forEach(r => console.log(`  - ${r.functionName} (score: ${r.qualityScore}/100)`));
      console.log('');
      console.log('ACTION REQUIRED: Apply standardized prompt templates to improve quality.\n');
      console.log('See PROMPT_ENGINEERING_GUIDE.md for best practices.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error verifying prompt quality:', error);
    process.exit(1);
  }
}

// Run verification
if (import.meta.main) {
  verifyPromptQuality();
}

export { verifyPromptQuality, checkFunctionPromptQuality };
