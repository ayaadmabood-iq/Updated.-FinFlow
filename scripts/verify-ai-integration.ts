#!/usr/bin/env -S deno run --allow-read --allow-write
// ============= AI Integration Verification Script =============
// Verifies that all AI Edge Functions use the unified executor
// and no direct OpenAI calls exist outside the executor

import { walk } from "https://deno.land/std@0.208.0/fs/walk.ts";

const FUNCTIONS_DIR = "./supabase/functions";
const SHARED_DIR = "./supabase/functions/_shared";

// Files that ARE allowed to have direct OpenAI calls
const ALLOWED_DIRECT_CALL_FILES = [
  "unified-ai-executor.ts",
];

// Patterns that indicate direct OpenAI API calls
const DIRECT_CALL_PATTERNS = [
  /fetch\s*\(\s*['"`]https:\/\/api\.openai\.com/g,
  /openai\.chat\.completions\.create/g,
  /openai\.responses\.create/g,
  /openai\.embeddings\.create/g,
];

// Patterns that indicate proper unified executor usage
const UNIFIED_EXECUTOR_PATTERNS = [
  /import\s+.*from\s+['"].*unified-ai-executor/g,
  /executeAIRequest\s*\(/g,
  /executeEmbeddingRequest\s*\(/g,
  /executeEmbeddingBatch\s*\(/g,
  /executeTranscriptionRequest\s*\(/g,
  /executeModerationRequest\s*\(/g,
  /executeWithCustomKey\s*\(/g,
  /callAI\s*\(/g, // Legacy wrapper
];

interface ViolationResult {
  file: string;
  line: number;
  pattern: string;
  snippet: string;
}

interface VerificationResult {
  passed: boolean;
  totalFunctionsScanned: number;
  violations: ViolationResult[];
  compliantFunctions: string[];
  summary: string;
}

async function readFileContent(path: string): Promise<string> {
  try {
    return await Deno.readTextFile(path);
  } catch {
    return "";
  }
}

function isAllowedFile(filename: string): boolean {
  return ALLOWED_DIRECT_CALL_FILES.some(allowed => filename.endsWith(allowed));
}

function findPatternViolations(content: string, patterns: RegExp[], filename: string): ViolationResult[] {
  const violations: ViolationResult[] = [];
  const lines = content.split("\n");

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    for (const pattern of patterns) {
      // Reset lastIndex for global regex
      pattern.lastIndex = 0;
      const match = pattern.exec(line);
      if (match) {
        violations.push({
          file: filename,
          line: lineNum + 1,
          pattern: pattern.source.substring(0, 50),
          snippet: line.trim().substring(0, 80),
        });
      }
    }
  }

  return violations;
}

function hasUnifiedExecutorImport(content: string): boolean {
  for (const pattern of UNIFIED_EXECUTOR_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      return true;
    }
  }
  return false;
}

async function verifyAIIntegration(): Promise<VerificationResult> {
  const violations: ViolationResult[] = [];
  const compliantFunctions: string[] = [];
  let totalFunctionsScanned = 0;

  console.log("🔍 Scanning Edge Functions for AI integration compliance...\n");

  // Walk through all function directories
  for await (const entry of walk(FUNCTIONS_DIR, {
    maxDepth: 2,
    includeDirs: false,
    exts: [".ts"],
  })) {
    const relativePath = entry.path.replace(/\\/g, "/");
    
    // Skip shared directory except for verification
    if (relativePath.includes("/_shared/") && !isAllowedFile(entry.name)) {
      // Check shared utilities for violations too
      const content = await readFileContent(entry.path);
      const sharedViolations = findPatternViolations(content, DIRECT_CALL_PATTERNS, relativePath);
      violations.push(...sharedViolations);
      continue;
    }

    // Skip allowed files
    if (isAllowedFile(entry.name)) {
      console.log(`  ✅ ${entry.name} (allowed to have direct calls)`);
      continue;
    }

    // Only check index.ts files in function directories
    if (entry.name !== "index.ts") continue;

    totalFunctionsScanned++;
    const content = await readFileContent(entry.path);

    // Check for direct OpenAI calls
    const directCallViolations = findPatternViolations(content, DIRECT_CALL_PATTERNS, relativePath);

    if (directCallViolations.length > 0) {
      violations.push(...directCallViolations);
      console.log(`  ❌ ${relativePath}: ${directCallViolations.length} direct call(s) found`);
    } else if (hasUnifiedExecutorImport(content)) {
      compliantFunctions.push(relativePath);
      console.log(`  ✅ ${relativePath}: Uses unified executor`);
    } else {
      // Function doesn't have violations but also doesn't use executor
      // This might be a non-AI function, which is fine
      console.log(`  ⚪ ${relativePath}: No AI calls detected`);
    }
  }

  const passed = violations.length === 0;
  const summary = passed
    ? `✅ PASSED: All ${totalFunctionsScanned} functions are compliant with unified AI execution`
    : `❌ FAILED: Found ${violations.length} direct OpenAI calls in ${new Set(violations.map(v => v.file)).size} file(s)`;

  return {
    passed,
    totalFunctionsScanned,
    violations,
    compliantFunctions,
    summary,
  };
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("         AI Integration Verification Script");
  console.log("═══════════════════════════════════════════════════════════\n");

  const result = await verifyAIIntegration();

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("                      RESULTS");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log(`📊 Total Functions Scanned: ${result.totalFunctionsScanned}`);
  console.log(`✅ Compliant Functions: ${result.compliantFunctions.length}`);
  console.log(`❌ Violations Found: ${result.violations.length}\n`);

  if (result.violations.length > 0) {
    console.log("🚨 VIOLATIONS:\n");
    for (const v of result.violations) {
      console.log(`  File: ${v.file}`);
      console.log(`  Line: ${v.line}`);
      console.log(`  Pattern: ${v.pattern}`);
      console.log(`  Code: ${v.snippet}`);
      console.log("");
    }
  }

  console.log("\n" + result.summary + "\n");

  if (!result.passed) {
    console.log("🔧 To fix violations:");
    console.log("   1. Replace direct fetch() calls to OpenAI with executeAIRequest()");
    console.log("   2. Replace embedding calls with executeEmbeddingRequest()");
    console.log("   3. Replace transcription calls with executeTranscriptionRequest()");
    console.log("   4. Import from '../_shared/unified-ai-executor.ts'");
    console.log("");
    Deno.exit(1);
  }

  console.log("🎉 All AI functions are properly integrated with the unified executor!\n");
  Deno.exit(0);
}

// Run verification
main().catch(console.error);
