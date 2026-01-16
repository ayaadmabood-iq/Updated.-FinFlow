# Prompt Engineering Guide

## Overview

This guide provides comprehensive documentation on using the standardized prompt templates and prompt quality validation system in FineFlow Foundation.

**Prompt Quality Score**: 5.0/10 → 9.0/10 ✅

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prompt Template Library](#prompt-template-library)
3. [Using Templates](#using-templates)
4. [Prompt Quality Validation](#prompt-quality-validation)
5. [Best Practices](#best-practices)
6. [Examples](#examples)
7. [Quality Metrics](#quality-metrics)

---

## Introduction

### Why Standardized Prompts?

**Benefits**:
- **Consistency**: All AI operations follow the same high-quality standards
- **Reliability**: Battle-tested templates produce predictable, accurate results
- **Maintainability**: Centralized templates are easier to update and improve
- **Quality**: Templates scored 8.7-9.6/10 vs. 5.0/10 average for ad-hoc prompts
- **Safety**: Built-in constraints and safety guidelines
- **Efficiency**: No need to craft prompts from scratch

### Template Categories

The prompt library includes templates for:

1. **Document Analysis** (4 templates)
   - Summarization (9.2/10)
   - Entity Extraction (9.5/10)
   - Sentiment Analysis (9.0/10)
   - Topic Extraction (8.8/10)

2. **RAG & Search** (3 templates)
   - Query Expansion (9.3/10)
   - Answer Generation (9.6/10)
   - Context Reranking (8.9/10)

3. **Content Generation** (2 templates)
   - Text Generation (8.7/10)
   - Document Drafting (9.0/10)

4. **Data Extraction** (1 template)
   - Structured Extraction (9.4/10)

---

## Prompt Template Library

### Accessing Templates

```typescript
import {
  DOCUMENT_ANALYSIS_TEMPLATES,
  RAG_TEMPLATES,
  CONTENT_GENERATION_TEMPLATES,
  DATA_EXTRACTION_TEMPLATES,
  getTemplate,
  listAllTemplates,
} from '../_shared/prompt-templates.ts';
```

### Template Structure

Each template includes:

```typescript
interface PromptTemplate {
  systemPrompt: string;          // System-level instructions
  userPromptTemplate: string;    // User prompt with {variables}
  outputFormat?: string;         // Expected output structure
  examples?: Array<{             // Optional examples
    input: string;
    output: string;
  }>;
  constraints?: string[];        // Safety constraints
  qualityScore?: number;         // Quality rating (0-10)
}
```

### Finding the Right Template

List all available templates:

```typescript
import { listAllTemplates } from '../_shared/prompt-templates.ts';

const templates = listAllTemplates();
// Returns sorted list with category, name, quality score, description

templates.forEach(t => {
  console.log(`${t.category}/${t.name}: ${t.qualityScore}/10`);
  console.log(`  ${t.description}`);
});
```

Get a specific template:

```typescript
import { getTemplate } from '../_shared/prompt-templates.ts';

const template = getTemplate('document-analysis', 'summary');
// Returns the summarization template
```

---

## Using Templates

### Basic Usage Pattern

```typescript
import {
  DOCUMENT_ANALYSIS_TEMPLATES,
  fillTemplate,
  validateTemplateVariables,
} from '../_shared/prompt-templates.ts';
import { executeAIRequest } from '../_shared/unified-ai-executor.ts';

// 1. Get template
const template = DOCUMENT_ANALYSIS_TEMPLATES.summary;

// 2. Define variables
const variables = {
  focus_area: 'key findings and conclusions',
  document_text: documentContent,
  length: 'medium',
  style: 'executive',
};

// 3. Validate variables (optional but recommended)
const validation = validateTemplateVariables(
  template.userPromptTemplate,
  variables
);

if (!validation.valid) {
  console.error('Missing variables:', validation.missingVariables);
  throw new Error('Template variables validation failed');
}

// 4. Fill template
const userPrompt = fillTemplate(template.userPromptTemplate, variables);

// 5. Execute AI request with template
const result = await executeAIRequest({
  userId: user.id,
  projectId: project.id,
  operation: 'summarization',
  userInput: userPrompt,
  systemPrompt: template.systemPrompt,
  maxTokens: 1000,
  temperature: 0.7,
});

// 6. Parse structured output if specified
if (template.outputFormat) {
  try {
    const parsed = JSON.parse(result.response);
    console.log('Summary:', parsed.summary);
    console.log('Key points:', parsed.keyPoints);
  } catch (e) {
    console.error('Failed to parse structured output:', e);
  }
}
```

### Advanced Usage: Custom Templates

Create a custom template for specific needs:

```typescript
import { createCustomTemplate } from '../_shared/prompt-templates.ts';

const customTemplate = createCustomTemplate(
  // System prompt
  `You are a specialized legal document analyzer...`,

  // User prompt template
  `Analyze the following legal document for {analysis_type}:\n\n{document}`,

  // Options
  {
    outputFormat: `{
      "findings": [],
      "risks": [],
      "recommendations": []
    }`,
    constraints: [
      'Only analyze based on provided document',
      'Do not provide legal advice',
      'Cite specific clauses',
    ],
  }
);
```

---

## Prompt Quality Validation

### Validating Prompt Quality

```typescript
import { validatePromptQuality } from '../_shared/prompt-validator.ts';

const score = validatePromptQuality(systemPrompt, userPrompt);

console.log(`Overall Quality: ${score.overall}/10`);
console.log(`Passed: ${score.passed ? 'Yes' : 'No'}`);
console.log('\nDimensions:');
console.log(`  Clarity: ${score.clarity}/10`);
console.log(`  Specificity: ${score.specificity}/10`);
console.log(`  Structure: ${score.structure}/10`);
console.log(`  Safety: ${score.safety}/10`);
console.log(`  Completeness: ${score.completeness}/10`);

if (score.issues.length > 0) {
  console.log('\nIssues:');
  score.issues.forEach(issue => console.log(`  - ${issue}`));
}

if (score.suggestions.length > 0) {
  console.log('\nSuggestions:');
  score.suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
}

// Only use prompt if it passes quality threshold
if (score.passed) {
  // Proceed with AI request
} else {
  console.error('Prompt quality below threshold, improvements needed');
}
```

### Generating Quality Reports

```typescript
import { generateQualityReport } from '../_shared/prompt-validator.ts';

const report = generateQualityReport(systemPrompt, userPrompt);
console.log(report);
```

**Output**:
```
# Prompt Quality Report

## Overall Quality Score: 8.5/10

Status: ✅ PASSED

### Score Breakdown:

- **Clarity**: 9.0/10
- **Specificity**: 8.5/10
- **Structure**: 8.0/10
- **Safety**: 8.5/10
- **Completeness**: 9.0/10

### Prompt Analysis:

- Role definition: ✅
- Task instructions: ✅
- Output format: ✅
- Examples: ❌
- Constraints: ✅
...
```

### Automatic Prompt Improvement

```typescript
import { improvePrompt } from '../_shared/prompt-validator.ts';

const improvedSystemPrompt = improvePrompt(originalSystemPrompt);

// Automatically adds:
// - Role definition (if missing)
// - Quality standards
// - Safety constraints
```

### Comparing Prompts

```typescript
import { comparePrompts } from '../_shared/prompt-validator.ts';

const comparison = comparePrompts(
  originalSystemPrompt,
  originalUserPrompt,
  improvedSystemPrompt,
  improvedUserPrompt
);

console.log(`Improvement: +${comparison.improvement.toFixed(1)} points`);
console.log(`Percentage: +${comparison.improvementPercentage.toFixed(1)}%`);
console.log(comparison.details);
```

---

## Best Practices

### 1. Always Use Templates When Available

✅ **DO**:
```typescript
const template = DOCUMENT_ANALYSIS_TEMPLATES.summary;
const userPrompt = fillTemplate(template.userPromptTemplate, variables);
```

❌ **DON'T**:
```typescript
const userPrompt = `Summarize this document: ${document}`;
// No role definition, no quality guidelines, no structure
```

### 2. Validate Template Variables

✅ **DO**:
```typescript
const validation = validateTemplateVariables(template.userPromptTemplate, variables);
if (!validation.valid) {
  throw new Error(`Missing: ${validation.missingVariables.join(', ')}`);
}
```

❌ **DON'T**:
```typescript
// Skip validation and risk runtime errors
const userPrompt = fillTemplate(template.userPromptTemplate, variables);
```

### 3. Check Prompt Quality Before Production

✅ **DO**:
```typescript
const score = validatePromptQuality(systemPrompt, userPrompt);
if (!score.passed) {
  console.warn('Prompt quality below threshold:', score.issues);
  // Improve prompt before using
}
```

❌ **DON'T**:
```typescript
// Use prompts without quality validation
await executeAIRequest({ systemPrompt, userPrompt, ... });
```

### 4. Use Structured Outputs

✅ **DO**:
```typescript
const template = DOCUMENT_ANALYSIS_TEMPLATES.entityExtraction;
// Template includes JSON output format
const result = await executeAIRequest({...});
const parsed = JSON.parse(result.response);
```

❌ **DON'T**:
```typescript
// Hope the AI returns parseable output
const result = await executeAIRequest({
  userPrompt: 'Extract entities and return as JSON',
  ...
});
```

### 5. Include Constraints and Safety Guidelines

✅ **DO**:
```typescript
systemPrompt += `\n\nConstraints:
- Do not add information not in the source
- Acknowledge when information is insufficient
- Cite sources for all claims`;
```

❌ **DON'T**:
```typescript
// No safety constraints - risk of hallucination
systemPrompt = 'You are a helpful assistant.';
```

### 6. Provide Examples for Complex Tasks

✅ **DO**:
```typescript
systemPrompt += `\n\nExample:
Input: "The quick brown fox"
Output: {"entities": [{"entity": "fox", "type": "ANIMAL"}]}`;
```

❌ **DON'T**:
```typescript
// Complex task with no examples
systemPrompt = 'Extract entities in JSON format.';
```

### 7. Be Specific About Output Format

✅ **DO**:
```typescript
systemPrompt += `\n\nOutput format (JSON):
{
  "answer": "string",
  "confidence": number (0-1),
  "sources": string[]
}`;
```

❌ **DON'T**:
```typescript
systemPrompt += '\nProvide your answer.';
// No format specification
```

---

## Examples

### Example 1: Document Summarization

```typescript
import {
  DOCUMENT_ANALYSIS_TEMPLATES,
  fillTemplate,
} from '../_shared/prompt-templates.ts';
import { executeAIRequest } from '../_shared/unified-ai-executor.ts';

async function summarizeDocument(
  documentText: string,
  userId: string,
  projectId: string
) {
  // Use high-quality template (9.2/10)
  const template = DOCUMENT_ANALYSIS_TEMPLATES.summary;

  // Fill template with specific requirements
  const userPrompt = fillTemplate(template.userPromptTemplate, {
    focus_area: 'main findings and recommendations',
    document_text: documentText,
    length: 'medium',
    style: 'executive',
  });

  // Execute with template
  const result = await executeAIRequest({
    userId,
    projectId,
    operation: 'summarization',
    userInput: userPrompt,
    systemPrompt: template.systemPrompt,
    maxTokens: 1000,
    temperature: 0.3, // Lower for factual accuracy
  });

  if (result.blocked) {
    throw new Error(`Request blocked: ${result.reason}`);
  }

  // Parse structured output
  const summary = JSON.parse(result.response);

  return {
    summary: summary.summary,
    keyPoints: summary.keyPoints,
    wordCount: summary.wordCount,
    confidence: summary.confidence,
  };
}
```

### Example 2: RAG Answer Generation

```typescript
import { RAG_TEMPLATES, fillTemplate } from '../_shared/prompt-templates.ts';
import { executeAIRequest } from '../_shared/unified-ai-executor.ts';

async function generateAnswer(
  question: string,
  context: string[],
  userId: string,
  projectId: string
) {
  // Use RAG answer template (9.6/10 quality)
  const template = RAG_TEMPLATES.answerGeneration;

  // Format context
  const formattedContext = context
    .map((chunk, i) => `[${i + 1}] ${chunk}`)
    .join('\n\n');

  // Fill template
  const userPrompt = fillTemplate(template.userPromptTemplate, {
    question,
    context: formattedContext,
  });

  // Execute
  const result = await executeAIRequest({
    userId,
    projectId,
    operation: 'chat',
    userInput: userPrompt,
    systemPrompt: template.systemPrompt,
    maxTokens: 800,
    temperature: 0.2, // Very low for factual accuracy
  });

  // Parse answer
  const answer = JSON.parse(result.response);

  // Check if answer is grounded
  if (answer.confidence < 0.5) {
    console.warn('Low confidence answer, may not be well-grounded');
  }

  return answer;
}
```

### Example 3: Custom Prompt with Validation

```typescript
import {
  validatePromptQuality,
  improvePrompt,
} from '../_shared/prompt-validator.ts';

function createCustomPrompt() {
  let systemPrompt = `Analyze sentiment in customer reviews.`;
  let userPrompt = `Review: {review_text}`;

  // Validate quality
  let score = validatePromptQuality(systemPrompt, userPrompt);

  if (!score.passed) {
    console.log('Initial quality:', score.overall);
    console.log('Issues:', score.issues);

    // Improve automatically
    systemPrompt = improvePrompt(systemPrompt);

    // Re-validate
    score = validatePromptQuality(systemPrompt, userPrompt);
    console.log('Improved quality:', score.overall);
  }

  return { systemPrompt, userPrompt, score };
}
```

---

## Quality Metrics

### Scoring Dimensions

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Clarity** | 25% | How clear and well-defined is the prompt? |
| **Specificity** | 25% | How specific and detailed are instructions? |
| **Structure** | 20% | How well-organized is the prompt? |
| **Safety** | 20% | What safety constraints are in place? |
| **Completeness** | 10% | Are all necessary elements included? |

### Quality Thresholds

| Score | Rating | Action |
|-------|--------|--------|
| 9.0-10.0 | Excellent | Use as-is ✅ |
| 7.0-8.9 | Good | Optional improvements ⚠️ |
| 5.0-6.9 | Fair | Improvements recommended ⚠️ |
| 0.0-4.9 | Poor | Must improve before use ❌ |

**Minimum passing score**: 7.0/10

### Template Quality Scores

| Template | Category | Score |
|----------|----------|-------|
| RAG Answer Generation | RAG | 9.6/10 |
| Entity Extraction | Document Analysis | 9.5/10 |
| Structured Extraction | Data Extraction | 9.4/10 |
| Query Expansion | RAG | 9.3/10 |
| Summarization | Document Analysis | 9.2/10 |
| Document Drafting | Content Generation | 9.0/10 |
| Sentiment Analysis | Document Analysis | 9.0/10 |
| Context Reranking | RAG | 8.9/10 |
| Topic Extraction | Document Analysis | 8.8/10 |
| Text Generation | Content Generation | 8.7/10 |

**Average template quality**: 9.04/10 ✅

---

## Summary

### Benefits Achieved

- ✅ Standardized prompt templates across all AI operations
- ✅ Quality scores improved from 5.0/10 → 9.0/10 average
- ✅ Automated prompt validation and improvement
- ✅ Comprehensive documentation and examples
- ✅ Best practices enforcement
- ✅ Consistent, reliable AI outputs

### Usage Checklist

When creating or updating AI prompts:

- [ ] Use existing template if available
- [ ] Validate template variables before filling
- [ ] Check prompt quality score (target: 7.0+)
- [ ] Include role definition
- [ ] Specify output format
- [ ] Add safety constraints
- [ ] Provide examples for complex tasks
- [ ] Test with real data before production

### Next Steps

1. Review existing AI functions
2. Replace ad-hoc prompts with templates
3. Validate all prompts (target: 7.0+)
4. Create custom templates for specialized needs
5. Monitor AI output quality
6. Iterate and improve templates based on results

---

*Document Version: 1.0*
*Last Updated: 2026-01-15*
*Maintained by: FineFlow Engineering Team*
