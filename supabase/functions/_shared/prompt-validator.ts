/**
 * Prompt Quality Validation and Improvement
 *
 * This module provides tools to validate and improve prompt quality across
 * all AI operations. It checks prompts against best practices and provides
 * actionable suggestions for improvement.
 *
 * Quality dimensions:
 * - Clarity: How clear and well-defined is the prompt?
 * - Specificity: How specific and detailed are the instructions?
 * - Structure: How well-organized and formatted is the prompt?
 * - Safety: What safety constraints and guardrails are in place?
 * - Completeness: Does the prompt include all necessary elements?
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PromptQualityScore {
  overall: number; // 0-10 overall quality score
  clarity: number; // 0-10 clarity score
  specificity: number; // 0-10 specificity score
  structure: number; // 0-10 structure score
  safety: number; // 0-10 safety score
  completeness: number; // 0-10 completeness score
  issues: string[]; // List of issues found
  suggestions: string[]; // Actionable improvement suggestions
  passed: boolean; // Whether prompt meets minimum quality threshold (7.0)
}

export interface PromptAnalysis {
  hasRoleDefinition: boolean;
  hasTaskInstructions: boolean;
  hasOutputFormat: boolean;
  hasExamples: boolean;
  hasConstraints: boolean;
  hasQualityGuidelines: boolean;
  length: number;
  structure: {
    hasSections: boolean;
    hasLineBreaks: boolean;
    hasListsOrBullets: boolean;
  };
}

// ============================================================================
// VALIDATION RULES
// ============================================================================

const QUALITY_RULES = {
  // Clarity rules
  MIN_SYSTEM_PROMPT_LENGTH: 100,
  MIN_USER_PROMPT_LENGTH: 20,
  RECOMMENDED_SYSTEM_PROMPT_LENGTH: 200,

  // Structure rules
  MIN_SECTIONS: 2,
  RECOMMENDED_LINE_BREAKS: 3,

  // Safety rules
  REQUIRED_CONSTRAINTS: ['do not', 'avoid', 'never', 'must not'],

  // Completeness rules
  REQUIRED_ELEMENTS: ['role', 'task', 'output'],
};

// ============================================================================
// PROMPT ANALYSIS
// ============================================================================

/**
 * Analyze prompt structure and elements
 */
export function analyzePrompt(systemPrompt: string, userPrompt: string): PromptAnalysis {
  const combinedPrompt = (systemPrompt + '\n' + userPrompt).toLowerCase();

  return {
    hasRoleDefinition:
      systemPrompt.toLowerCase().includes('you are') ||
      systemPrompt.toLowerCase().includes('your role'),

    hasTaskInstructions:
      combinedPrompt.includes('task') ||
      combinedPrompt.includes('goal') ||
      combinedPrompt.includes('objective') ||
      combinedPrompt.includes('provide') ||
      combinedPrompt.includes('generate') ||
      combinedPrompt.includes('extract'),

    hasOutputFormat:
      combinedPrompt.includes('format') ||
      combinedPrompt.includes('structure') ||
      combinedPrompt.includes('json') ||
      combinedPrompt.includes('output:'),

    hasExamples:
      combinedPrompt.includes('example') ||
      combinedPrompt.includes('for instance') ||
      combinedPrompt.includes('such as'),

    hasConstraints:
      combinedPrompt.includes('do not') ||
      combinedPrompt.includes('avoid') ||
      combinedPrompt.includes('never') ||
      combinedPrompt.includes('must not') ||
      combinedPrompt.includes('should not'),

    hasQualityGuidelines:
      combinedPrompt.includes('quality') ||
      combinedPrompt.includes('standard') ||
      combinedPrompt.includes('guideline') ||
      combinedPrompt.includes('requirement') ||
      combinedPrompt.includes('criteria'),

    length: systemPrompt.length + userPrompt.length,

    structure: {
      hasSections:
        (systemPrompt.match(/\n\n/g) || []).length >= QUALITY_RULES.MIN_SECTIONS ||
        (systemPrompt.match(/#{1,3}\s+/g) || []).length >= QUALITY_RULES.MIN_SECTIONS,

      hasLineBreaks:
        (systemPrompt.match(/\n/g) || []).length >= QUALITY_RULES.RECOMMENDED_LINE_BREAKS,

      hasListsOrBullets:
        systemPrompt.includes('-') ||
        systemPrompt.includes('*') ||
        systemPrompt.includes('•') ||
        /\d+\.\s/.test(systemPrompt),
    },
  };
}

// ============================================================================
// QUALITY SCORING
// ============================================================================

/**
 * Validate and score prompt quality
 */
export function validatePromptQuality(
  systemPrompt: string,
  userPrompt: string
): PromptQualityScore {
  const issues: string[] = [];
  const suggestions: string[] = [];

  let clarityScore = 10;
  let specificityScore = 10;
  let structureScore = 10;
  let safetyScore = 10;
  let completenessScore = 10;

  const analysis = analyzePrompt(systemPrompt, userPrompt);

  // ============================================================================
  // CLARITY CHECKS
  // ============================================================================

  // Check system prompt length
  if (systemPrompt.length < QUALITY_RULES.MIN_SYSTEM_PROMPT_LENGTH) {
    clarityScore -= 3;
    issues.push(`System prompt is too short (${systemPrompt.length} chars, minimum ${QUALITY_RULES.MIN_SYSTEM_PROMPT_LENGTH})`);
    suggestions.push('Expand system prompt with more context, examples, and guidelines');
  } else if (systemPrompt.length < QUALITY_RULES.RECOMMENDED_SYSTEM_PROMPT_LENGTH) {
    clarityScore -= 1;
    suggestions.push('Consider adding more detail to system prompt for better clarity');
  }

  // Check role definition
  if (!analysis.hasRoleDefinition) {
    clarityScore -= 2.5;
    issues.push('System prompt lacks clear role definition');
    suggestions.push('Start with "You are [role]" or "Your role is..." to define AI\'s identity clearly');
  }

  // Check user prompt length
  if (userPrompt.length < QUALITY_RULES.MIN_USER_PROMPT_LENGTH) {
    clarityScore -= 2;
    issues.push('User prompt is too vague or short');
    suggestions.push('Provide more specific instructions in the user prompt');
  }

  // Check for ambiguous language
  const ambiguousTerms = ['maybe', 'perhaps', 'somewhat', 'kind of', 'sort of', 'possibly'];
  const hasAmbiguousLanguage = ambiguousTerms.some(term =>
    systemPrompt.toLowerCase().includes(term) || userPrompt.toLowerCase().includes(term)
  );

  if (hasAmbiguousLanguage) {
    clarityScore -= 1.5;
    issues.push('Prompt contains ambiguous language');
    suggestions.push('Replace ambiguous terms with clear, definitive instructions');
  }

  // ============================================================================
  // SPECIFICITY CHECKS
  // ============================================================================

  // Check task definition
  if (!analysis.hasTaskInstructions) {
    specificityScore -= 3;
    issues.push('Prompt lacks clear task definition');
    suggestions.push('Clearly define what the AI should do (extract, generate, analyze, etc.)');
  }

  // Check output format specification
  if (!analysis.hasOutputFormat) {
    specificityScore -= 2;
    issues.push('No output format specified');
    suggestions.push('Specify the expected output format (JSON structure, paragraph, bullet points, etc.)');
  }

  // Check for examples
  if (!analysis.hasExamples && systemPrompt.length > 300) {
    specificityScore -= 1;
    suggestions.push('Consider adding examples to clarify expected behavior');
  }

  // Check for vague instructions
  const vagueTerms = ['good', 'nice', 'appropriate', 'reasonable', 'suitable'];
  const hasVagueTerms = vagueTerms.some(term =>
    (systemPrompt.toLowerCase().match(new RegExp(`\\b${term}\\b`, 'g')) || []).length > 2
  );

  if (hasVagueTerms) {
    specificityScore -= 1.5;
    issues.push('Prompt uses vague qualitative terms');
    suggestions.push('Replace vague terms (good, appropriate) with specific criteria');
  }

  // ============================================================================
  // STRUCTURE CHECKS
  // ============================================================================

  // Check for sections/organization
  if (!analysis.structure.hasSections) {
    structureScore -= 2.5;
    issues.push('Prompt lacks clear section organization');
    suggestions.push('Organize prompt into clear sections (Role, Task, Guidelines, Output Format)');
  }

  // Check for line breaks
  if (!analysis.structure.hasLineBreaks) {
    structureScore -= 2;
    issues.push('Prompt is a wall of text without line breaks');
    suggestions.push('Use line breaks to separate concepts and improve readability');
  }

  // Check for lists/bullets
  if (!analysis.structure.hasListsOrBullets && systemPrompt.length > 200) {
    structureScore -= 1.5;
    suggestions.push('Consider using bullet points or numbered lists for clarity');
  }

  // Check for quality guidelines
  if (!analysis.hasQualityGuidelines) {
    structureScore -= 1.5;
    issues.push('No quality standards or guidelines specified');
    suggestions.push('Add a "Quality standards:" section defining expectations');
  }

  // ============================================================================
  // SAFETY CHECKS
  // ============================================================================

  // Check for safety constraints
  if (!analysis.hasConstraints) {
    safetyScore -= 3;
    issues.push('No safety constraints or limitations specified');
    suggestions.push('Add constraints section (e.g., "Do not: hallucinate, add unsupported information, etc.")');
  }

  // Check for output validation
  const hasValidation =
    systemPrompt.toLowerCase().includes('valid') ||
    systemPrompt.toLowerCase().includes('check') ||
    systemPrompt.toLowerCase().includes('verify');

  if (!hasValidation) {
    safetyScore -= 1.5;
    suggestions.push('Consider adding output validation instructions');
  }

  // Check for error handling guidance
  const hasErrorHandling =
    (systemPrompt + userPrompt).toLowerCase().includes('if') ||
    (systemPrompt + userPrompt).toLowerCase().includes('when') ||
    (systemPrompt + userPrompt).toLowerCase().includes('unable');

  if (!hasErrorHandling && systemPrompt.length > 200) {
    safetyScore -= 1;
    suggestions.push('Add guidance for handling edge cases or errors');
  }

  // Check for data sensitivity awareness
  const sensitiveDataMentioned =
    (systemPrompt + userPrompt).toLowerCase().includes('personal') ||
    (systemPrompt + userPrompt).toLowerCase().includes('sensitive') ||
    (systemPrompt + userPrompt).toLowerCase().includes('confidential') ||
    (systemPrompt + userPrompt).toLowerCase().includes('private');

  if (!sensitiveDataMentioned && (systemPrompt + userPrompt).toLowerCase().includes('data')) {
    safetyScore -= 0.5;
    suggestions.push('Consider adding guidelines for handling sensitive data');
  }

  // ============================================================================
  // COMPLETENESS CHECKS
  // ============================================================================

  // Check for all essential elements
  const missingElements: string[] = [];

  if (!analysis.hasRoleDefinition) {
    missingElements.push('role definition');
    completenessScore -= 2;
  }

  if (!analysis.hasTaskInstructions) {
    missingElements.push('task instructions');
    completenessScore -= 2.5;
  }

  if (!analysis.hasOutputFormat) {
    missingElements.push('output format');
    completenessScore -= 2;
  }

  if (!analysis.hasConstraints) {
    missingElements.push('safety constraints');
    completenessScore -= 2;
  }

  if (!analysis.hasQualityGuidelines) {
    missingElements.push('quality guidelines');
    completenessScore -= 1.5;
  }

  if (missingElements.length > 0) {
    issues.push(`Prompt is missing essential elements: ${missingElements.join(', ')}`);
    suggestions.push(`Add the following elements: ${missingElements.join(', ')}`);
  }

  // ============================================================================
  // CALCULATE OVERALL SCORE
  // ============================================================================

  const overall =
    (clarityScore * 0.25 +
      specificityScore * 0.25 +
      structureScore * 0.2 +
      safetyScore * 0.2 +
      completenessScore * 0.1);

  // Ensure scores are in valid range
  const clamp = (score: number) => Math.max(0, Math.min(10, score));

  return {
    overall: clamp(overall),
    clarity: clamp(clarityScore),
    specificity: clamp(specificityScore),
    structure: clamp(structureScore),
    safety: clamp(safetyScore),
    completeness: clamp(completenessScore),
    issues,
    suggestions,
    passed: overall >= 7.0,
  };
}

// ============================================================================
// PROMPT IMPROVEMENT
// ============================================================================

/**
 * Automatically improve prompt quality
 */
export function improvePrompt(systemPrompt: string): string {
  let improved = systemPrompt;

  // Add role definition if missing
  if (!systemPrompt.toLowerCase().includes('you are')) {
    improved = `You are an AI assistant specialized in this task.\n\n${improved}`;
  }

  // Add quality standards if missing
  const hasQualitySection =
    improved.toLowerCase().includes('quality') ||
    improved.toLowerCase().includes('standard') ||
    improved.toLowerCase().includes('guideline');

  if (!hasQualitySection) {
    improved += `\n\nQuality standards:
- Be accurate and precise
- Provide clear and concise responses
- Maintain professional tone
- Follow all instructions carefully
- Base responses on provided information`;
  }

  // Add safety constraints if missing
  const hasConstraints =
    improved.toLowerCase().includes('do not') ||
    improved.toLowerCase().includes('avoid') ||
    improved.toLowerCase().includes('never');

  if (!hasConstraints) {
    improved += `\n\nConstraints:
- Do not add information not provided in the input
- Avoid speculation or assumptions
- Maintain factual accuracy
- Acknowledge when information is insufficient`;
  }

  return improved.trim();
}

/**
 * Generate a comprehensive quality report
 */
export function generateQualityReport(
  systemPrompt: string,
  userPrompt: string
): string {
  const score = validatePromptQuality(systemPrompt, userPrompt);
  const analysis = analyzePrompt(systemPrompt, userPrompt);

  let report = '# Prompt Quality Report\n\n';

  // Overall score
  report += `## Overall Quality Score: ${score.overall.toFixed(1)}/10\n\n`;
  report += `Status: ${score.passed ? '✅ PASSED' : '❌ NEEDS IMPROVEMENT'}\n\n`;

  // Dimension scores
  report += `### Score Breakdown:\n\n`;
  report += `- **Clarity**: ${score.clarity.toFixed(1)}/10\n`;
  report += `- **Specificity**: ${score.specificity.toFixed(1)}/10\n`;
  report += `- **Structure**: ${score.structure.toFixed(1)}/10\n`;
  report += `- **Safety**: ${score.safety.toFixed(1)}/10\n`;
  report += `- **Completeness**: ${score.completeness.toFixed(1)}/10\n\n`;

  // Analysis
  report += `### Prompt Analysis:\n\n`;
  report += `- Role definition: ${analysis.hasRoleDefinition ? '✅' : '❌'}\n`;
  report += `- Task instructions: ${analysis.hasTaskInstructions ? '✅' : '❌'}\n`;
  report += `- Output format: ${analysis.hasOutputFormat ? '✅' : '❌'}\n`;
  report += `- Examples: ${analysis.hasExamples ? '✅' : '❌'}\n`;
  report += `- Constraints: ${analysis.hasConstraints ? '✅' : '❌'}\n`;
  report += `- Quality guidelines: ${analysis.hasQualityGuidelines ? '✅' : '❌'}\n`;
  report += `- Structured sections: ${analysis.structure.hasSections ? '✅' : '❌'}\n`;
  report += `- Line breaks: ${analysis.structure.hasLineBreaks ? '✅' : '❌'}\n`;
  report += `- Lists/bullets: ${analysis.structure.hasListsOrBullets ? '✅' : '❌'}\n\n`;

  // Issues
  if (score.issues.length > 0) {
    report += `### Issues Found (${score.issues.length}):\n\n`;
    score.issues.forEach((issue, i) => {
      report += `${i + 1}. ❌ ${issue}\n`;
    });
    report += '\n';
  }

  // Suggestions
  if (score.suggestions.length > 0) {
    report += `### Improvement Suggestions (${score.suggestions.length}):\n\n`;
    score.suggestions.forEach((suggestion, i) => {
      report += `${i + 1}. 💡 ${suggestion}\n`;
    });
    report += '\n';
  }

  // Recommendation
  report += `### Recommendation:\n\n`;
  if (score.overall >= 9.0) {
    report += '✅ Excellent prompt quality. No major improvements needed.\n';
  } else if (score.overall >= 7.0) {
    report += '⚠️ Good prompt quality, but consider addressing the suggestions above.\n';
  } else {
    report += '❌ Prompt quality needs improvement. Please address the issues and implement the suggestions.\n';
  }

  return report;
}

/**
 * Compare two prompts and show improvement
 */
export function comparePrompts(
  originalSystemPrompt: string,
  originalUserPrompt: string,
  improvedSystemPrompt: string,
  improvedUserPrompt: string
): {
  originalScore: number;
  improvedScore: number;
  improvement: number;
  improvementPercentage: number;
  details: string;
} {
  const originalScore = validatePromptQuality(originalSystemPrompt, originalUserPrompt);
  const improvedScore = validatePromptQuality(improvedSystemPrompt, improvedUserPrompt);

  const improvement = improvedScore.overall - originalScore.overall;
  const improvementPercentage = (improvement / originalScore.overall) * 100;

  let details = `# Prompt Improvement Comparison\n\n`;
  details += `## Scores:\n\n`;
  details += `- **Original**: ${originalScore.overall.toFixed(1)}/10\n`;
  details += `- **Improved**: ${improvedScore.overall.toFixed(1)}/10\n`;
  details += `- **Change**: ${improvement >= 0 ? '+' : ''}${improvement.toFixed(1)} (${improvementPercentage >= 0 ? '+' : ''}${improvementPercentage.toFixed(1)}%)\n\n`;

  details += `## Dimension Improvements:\n\n`;
  details += `- Clarity: ${originalScore.clarity.toFixed(1)} → ${improvedScore.clarity.toFixed(1)}\n`;
  details += `- Specificity: ${originalScore.specificity.toFixed(1)} → ${improvedScore.specificity.toFixed(1)}\n`;
  details += `- Structure: ${originalScore.structure.toFixed(1)} → ${improvedScore.structure.toFixed(1)}\n`;
  details += `- Safety: ${originalScore.safety.toFixed(1)} → ${improvedScore.safety.toFixed(1)}\n`;
  details += `- Completeness: ${originalScore.completeness.toFixed(1)} → ${improvedScore.completeness.toFixed(1)}\n`;

  return {
    originalScore: originalScore.overall,
    improvedScore: improvedScore.overall,
    improvement,
    improvementPercentage,
    details,
  };
}

// ============================================================================
// BEST PRACTICES CHECKER
// ============================================================================

/**
 * Check if prompt follows best practices
 */
export function checkBestPractices(
  systemPrompt: string,
  userPrompt: string
): {
  followsBestPractices: boolean;
  practicesFollowed: string[];
  practicesViolated: string[];
} {
  const practicesFollowed: string[] = [];
  const practicesViolated: string[] = [];

  const analysis = analyzePrompt(systemPrompt, userPrompt);

  // Best practice: Clear role definition
  if (analysis.hasRoleDefinition) {
    practicesFollowed.push('✅ Has clear role definition');
  } else {
    practicesViolated.push('❌ Missing role definition');
  }

  // Best practice: Specific task instructions
  if (analysis.hasTaskInstructions) {
    practicesFollowed.push('✅ Has specific task instructions');
  } else {
    practicesViolated.push('❌ Lacks task instructions');
  }

  // Best practice: Output format specification
  if (analysis.hasOutputFormat) {
    practicesFollowed.push('✅ Specifies output format');
  } else {
    practicesViolated.push('❌ No output format specified');
  }

  // Best practice: Safety constraints
  if (analysis.hasConstraints) {
    practicesFollowed.push('✅ Includes safety constraints');
  } else {
    practicesViolated.push('❌ Missing safety constraints');
  }

  // Best practice: Quality guidelines
  if (analysis.hasQualityGuidelines) {
    practicesFollowed.push('✅ Defines quality standards');
  } else {
    practicesViolated.push('❌ No quality guidelines');
  }

  // Best practice: Well-structured
  if (analysis.structure.hasSections) {
    practicesFollowed.push('✅ Well-organized with sections');
  } else {
    practicesViolated.push('❌ Lacks structural organization');
  }

  // Best practice: Examples (optional but recommended for complex tasks)
  if (analysis.hasExamples) {
    practicesFollowed.push('✅ Includes helpful examples');
  }

  return {
    followsBestPractices: practicesViolated.length === 0,
    practicesFollowed,
    practicesViolated,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  validatePromptQuality,
  analyzePrompt,
  improvePrompt,
  generateQualityReport,
  comparePrompts,
  checkBestPractices,
};
