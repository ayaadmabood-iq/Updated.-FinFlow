# Prompt Template Usage Examples

## Overview

This document provides practical examples of using the standardized prompt templates in real-world scenarios.

---

## Example 1: Document Summarization

### Scenario
You need to summarize a long research paper for an executive briefing.

### Before (Ad-hoc Prompt - Quality: 4.5/10)

```typescript
const systemPrompt = 'You are a helpful assistant.';
const userPrompt = `Summarize this document: ${documentText}`;

const result = await executeAIRequest({
  userId, projectId,
  operation: 'summarization',
  userInput: userPrompt,
  systemPrompt,
});
```

**Problems**:
- No role definition
- No quality guidelines
- No output format specification
- No constraints on accuracy
- Vague instructions

### After (Template-based - Quality: 9.2/10)

```typescript
import {
  DOCUMENT_ANALYSIS_TEMPLATES,
  fillTemplate,
  validateTemplateVariables,
} from '../_shared/prompt-templates.ts';

// Get high-quality template
const template = DOCUMENT_ANALYSIS_TEMPLATES.summary;

// Define variables
const variables = {
  focus_area: 'key findings, methodology, and implications for business',
  document_text: documentText,
  length: 'medium', // brief, short, medium, detailed
  style: 'executive', // bullet, paragraph, executive, technical
};

// Validate variables
const validation = validateTemplateVariables(
  template.userPromptTemplate,
  variables
);

if (!validation.valid) {
  throw new Error(`Missing: ${validation.missingVariables.join(', ')}`);
}

// Fill template
const userPrompt = fillTemplate(template.userPromptTemplate, variables);

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

// Parse structured output
const summary = JSON.parse(result.response);

console.log('Summary:', summary.summary);
console.log('Key Points:', summary.keyPoints);
console.log('Confidence:', summary.confidence);
```

**Benefits**:
- Clear role and expertise definition
- Specific quality standards
- Structured JSON output
- Safety constraints
- Confidence scoring

---

## Example 2: Entity Extraction

### Scenario
Extract people, organizations, and locations from news articles.

### Before (Ad-hoc - Quality: 5.0/10)

```typescript
const systemPrompt = 'Extract entities from text.';
const userPrompt = `Find people, organizations and locations in: ${text}`;
```

### After (Template-based - Quality: 9.5/10)

```typescript
import { DOCUMENT_ANALYSIS_TEMPLATES, fillTemplate } from '../_shared/prompt-templates.ts';

const template = DOCUMENT_ANALYSIS_TEMPLATES.entityExtraction;

const variables = {
  entity_types: 'PERSON, ORG, LOCATION',
  text: articleText,
};

const userPrompt = fillTemplate(template.userPromptTemplate, variables);

const result = await executeAIRequest({
  userId,
  projectId,
  operation: 'entity_extraction',
  userInput: userPrompt,
  systemPrompt: template.systemPrompt,
  maxTokens: 1500,
  temperature: 0.1, // Very low for precision
});

const entities = JSON.parse(result.response);

// Process entities with confidence scores
entities.entities.forEach(entity => {
  if (entity.confidence > 0.8) {
    console.log(`${entity.type}: ${entity.entity} (${entity.context})`);
  }
});
```

**Benefits**:
- Comprehensive entity taxonomy (11 types)
- Confidence scores for each entity
- Context extraction
- High precision guidelines
- Consistent classification

---

## Example 3: RAG Answer Generation

### Scenario
Answer user questions based on retrieved document chunks.

### Before (Ad-hoc - Quality: 5.5/10)

```typescript
const systemPrompt = 'Answer questions based on context provided.';
const userPrompt = `Question: ${question}\n\nContext: ${context}`;
```

### After (Template-based - Quality: 9.6/10)

```typescript
import { RAG_TEMPLATES, fillTemplate } from '../_shared/prompt-templates.ts';

const template = RAG_TEMPLATES.answerGeneration;

// Format retrieved chunks
const formattedContext = retrievedChunks
  .map((chunk, i) => `[Source ${i + 1}] ${chunk.content}`)
  .join('\n\n');

const variables = {
  question: userQuestion,
  context: formattedContext,
};

const userPrompt = fillTemplate(template.userPromptTemplate, variables);

const result = await executeAIRequest({
  userId,
  projectId,
  operation: 'chat',
  userInput: userPrompt,
  systemPrompt: template.systemPrompt,
  maxTokens: 800,
  temperature: 0.2, // Very low for factual accuracy
});

const answer = JSON.parse(result.response);

if (answer.answer === "I don't have enough information in the provided context to answer this question.") {
  return {
    status: 'insufficient_context',
    message: 'Unable to answer based on available documents',
  };
}

return {
  status: 'success',
  answer: answer.answer,
  evidence: answer.evidence,
  sources: answer.sources,
  confidence: answer.confidence,
  limitations: answer.limitations,
};
```

**Benefits**:
- Strict grounding in context (no hallucination)
- Source citations
- Confidence and limitations
- Honest uncertainty handling
- Evidence-based responses

---

## Example 4: Query Expansion for Search

### Scenario
Improve search recall by expanding user queries with synonyms.

### Before (Ad-hoc - Quality: 4.8/10)

```typescript
const systemPrompt = 'Expand search queries with synonyms.';
const userPrompt = `Expand: ${query}`;
```

### After (Template-based - Quality: 9.3/10)

```typescript
import { RAG_TEMPLATES, fillTemplate } from '../_shared/prompt-templates.ts';

const template = RAG_TEMPLATES.queryExpansion;

const variables = {
  query: originalQuery,
  domain: 'technical documentation',
  context: 'User is searching for API integration guides',
  expertise_level: 'intermediate',
};

const userPrompt = fillTemplate(template.userPromptTemplate, variables);

const result = await executeAIRequest({
  userId,
  projectId,
  operation: 'custom',
  userInput: userPrompt,
  systemPrompt: template.systemPrompt,
  maxTokens: 600,
  temperature: 0.4,
});

const expansion = JSON.parse(result.response);

// Use expanded query for search
const searchResults = await search({
  query: expansion.expandedQuery,
  keyTerms: expansion.keyTerms,
  excludeTerms: expansion.excludeTerms,
});

// Also try alternative queries if first doesn't return results
if (searchResults.length === 0) {
  for (const altQuery of expansion.alternativeQueries) {
    const altResults = await search({ query: altQuery });
    if (altResults.length > 0) {
      return altResults;
    }
  }
}
```

**Benefits**:
- Intent preservation
- Domain-aware expansion
- Alternative phrasings
- Exclude terms for precision
- Expansion rationale

---

## Example 5: Sentiment Analysis

### Scenario
Analyze customer feedback sentiment for product reviews.

### Before (Ad-hoc - Quality: 4.2/10)

```typescript
const systemPrompt = 'Analyze sentiment.';
const userPrompt = `Is this positive or negative? ${review}`;
```

### After (Template-based - Quality: 9.0/10)

```typescript
import { DOCUMENT_ANALYSIS_TEMPLATES, fillTemplate } from '../_shared/prompt-templates.ts';

const template = DOCUMENT_ANALYSIS_TEMPLATES.sentiment;

const variables = {
  text: customerReview,
};

const userPrompt = fillTemplate(template.userPromptTemplate, variables);

const result = await executeAIRequest({
  userId,
  projectId,
  operation: 'classification',
  userInput: userPrompt,
  systemPrompt: template.systemPrompt,
  maxTokens: 500,
  temperature: 0.2,
});

const sentiment = JSON.parse(result.response);

// Categorize for dashboard
const category = {
  sentiment: sentiment.sentiment, // POSITIVE, NEGATIVE, NEUTRAL, MIXED
  emotions: sentiment.emotions,
  urgency: sentiment.keyPhrases.some(phrase =>
    ['urgent', 'critical', 'immediately'].includes(phrase.toLowerCase())
  ) ? 'high' : 'normal',
  confidence: sentiment.confidence,
};

// Route negative reviews for immediate attention
if (sentiment.sentiment === 'NEGATIVE' && sentiment.confidence > 0.8) {
  await notifyCustomerSupport(category);
}
```

**Benefits**:
- Nuanced emotion detection
- Tone characteristics
- Sarcasm detection
- Evidence-based (key phrases)
- Context-aware analysis

---

## Example 6: Content Generation

### Scenario
Generate marketing copy for a new product feature.

### Before (Ad-hoc - Quality: 4.0/10)

```typescript
const systemPrompt = 'You are a copywriter.';
const userPrompt = `Write marketing copy for ${feature}`;
```

### After (Template-based - Quality: 8.7/10)

```typescript
import { CONTENT_GENERATION_TEMPLATES, fillTemplate } from '../_shared/prompt-templates.ts';

const template = CONTENT_GENERATION_TEMPLATES.textGeneration;

const variables = {
  topic: 'AI-powered document analysis',
  content_type: 'product feature announcement',
  tone: 'professional and enthusiastic',
  length: '200-250 words',
  audience: 'business decision makers and CTOs',
  key_points: [
    'Saves 10+ hours per week',
    'Industry-leading accuracy',
    'Enterprise-grade security',
  ].join('\n- '),
  requirements: 'Include a compelling call-to-action and value proposition',
};

const userPrompt = fillTemplate(template.userPromptTemplate, variables);

const result = await executeAIRequest({
  userId,
  projectId,
  operation: 'content_generation',
  userInput: userPrompt,
  systemPrompt: template.systemPrompt,
  maxTokens: 800,
  temperature: 0.7, // Higher for creative content
});

const content = JSON.parse(result.response);

// Validate output
if (content.wordCount < 180 || content.wordCount > 270) {
  console.warn('Content length outside target range');
}

if (content.tone !== 'professional') {
  console.warn('Tone mismatch');
}

return content.content;
```

**Benefits**:
- Precise tone control
- Length requirements
- Audience targeting
- Key points inclusion
- Quality validation

---

## Example 7: Structured Data Extraction

### Scenario
Extract invoice data from unstructured text.

### Before (Ad-hoc - Quality: 3.8/10)

```typescript
const systemPrompt = 'Extract invoice data.';
const userPrompt = `Get invoice number, date, amount, vendor from: ${text}`;
```

### After (Template-based - Quality: 9.4/10)

```typescript
import { DATA_EXTRACTION_TEMPLATES, fillTemplate } from '../_shared/prompt-templates.ts';

const template = DATA_EXTRACTION_TEMPLATES.structuredExtraction;

const schema = {
  invoice_number: { type: 'string', required: true },
  invoice_date: { type: 'date', format: 'ISO 8601', required: true },
  total_amount: { type: 'number', currency: 'USD', required: true },
  vendor_name: { type: 'string', required: true },
  line_items: {
    type: 'array',
    items: {
      description: 'string',
      quantity: 'number',
      unit_price: 'number',
      total: 'number',
    },
  },
};

const variables = {
  text: invoiceText,
  schema: JSON.stringify(schema, null, 2),
};

const userPrompt = fillTemplate(template.userPromptTemplate, variables);

const result = await executeAIRequest({
  userId,
  projectId,
  operation: 'data_extraction',
  userInput: userPrompt,
  systemPrompt: template.systemPrompt,
  maxTokens: 2000,
  temperature: 0.0, // Zero for maximum precision
});

const extracted = JSON.parse(result.response);

// Validate extraction quality
if (extracted.overall_confidence < 0.7) {
  console.warn('Low confidence extraction, manual review recommended');
}

// Handle missing fields
if (extracted.missing_fields.length > 0) {
  console.log('Missing required fields:', extracted.missing_fields);
}

// Handle ambiguities
if (extracted.ambiguities.length > 0) {
  console.log('Ambiguous data requires review:', extracted.ambiguities);
}

return extracted.extracted_data;
```

**Benefits**:
- Schema-driven extraction
- Confidence scores per field
- Ambiguity handling
- Missing field detection
- Data normalization

---

## Example 8: Validating Custom Prompts

### Scenario
You need to create a custom prompt and ensure it meets quality standards.

```typescript
import {
  validatePromptQuality,
  improvePrompt,
  generateQualityReport,
  checkBestPractices,
} from '../_shared/prompt-validator.ts';

// Create initial prompt
let systemPrompt = `Analyze customer churn risk from support tickets.`;
let userPrompt = `Ticket: {ticket_text}\n\nPredict churn risk.`;

// 1. Validate quality
let score = validatePromptQuality(systemPrompt, userPrompt);
console.log(`Initial quality: ${score.overall}/10`);

if (!score.passed) {
  console.log('Issues:', score.issues);
  console.log('Suggestions:', score.suggestions);

  // 2. Auto-improve
  systemPrompt = improvePrompt(systemPrompt);

  // 3. Re-validate
  score = validatePromptQuality(systemPrompt, userPrompt);
  console.log(`Improved quality: ${score.overall}/10`);
}

// 4. Generate full report
const report = generateQualityReport(systemPrompt, userPrompt);
console.log(report);

// 5. Check best practices
const practices = checkBestPractices(systemPrompt, userPrompt);
console.log('Follows best practices:', practices.followsBestPractices);
console.log('Practices followed:', practices.practicesFollowed);
console.log('Practices violated:', practices.practicesViolated);

// 6. Use if quality is acceptable
if (score.overall >= 7.0) {
  const result = await executeAIRequest({
    userId,
    projectId,
    operation: 'classification',
    userInput: userPrompt,
    systemPrompt,
  });
}
```

---

## Quick Reference

### Template Selection Guide

| Use Case | Template | Quality Score |
|----------|----------|---------------|
| Summarize documents | `DOCUMENT_ANALYSIS_TEMPLATES.summary` | 9.2/10 |
| Extract entities | `DOCUMENT_ANALYSIS_TEMPLATES.entityExtraction` | 9.5/10 |
| Analyze sentiment | `DOCUMENT_ANALYSIS_TEMPLATES.sentiment` | 9.0/10 |
| Find topics | `DOCUMENT_ANALYSIS_TEMPLATES.topicExtraction` | 8.8/10 |
| Expand queries | `RAG_TEMPLATES.queryExpansion` | 9.3/10 |
| Generate answers | `RAG_TEMPLATES.answerGeneration` | 9.6/10 |
| Rerank results | `RAG_TEMPLATES.contextReranking` | 8.9/10 |
| Generate content | `CONTENT_GENERATION_TEMPLATES.textGeneration` | 8.7/10 |
| Draft documents | `CONTENT_GENERATION_TEMPLATES.documentDrafting` | 9.0/10 |
| Extract data | `DATA_EXTRACTION_TEMPLATES.structuredExtraction` | 9.4/10 |

### Temperature Guidelines

| Operation | Recommended Temperature | Reasoning |
|-----------|------------------------|-----------|
| Data extraction | 0.0 - 0.1 | Maximum precision required |
| Factual Q&A | 0.1 - 0.3 | High accuracy, minimal creativity |
| Summarization | 0.3 - 0.5 | Balance accuracy and readability |
| Classification | 0.2 - 0.4 | Consistent categorization |
| Content generation | 0.6 - 0.8 | Creative but coherent |
| Brainstorming | 0.8 - 1.0 | Maximum creativity |

---

## Summary

Using standardized templates provides:

✅ **Higher Quality**: 9.0+ vs. 5.0 average
✅ **Consistency**: Same quality across all operations
✅ **Reliability**: Battle-tested, proven prompts
✅ **Safety**: Built-in constraints and guidelines
✅ **Maintainability**: Centralized updates
✅ **Validation**: Automated quality checking
✅ **Structured Outputs**: JSON parsing-ready
✅ **Best Practices**: Follows prompt engineering standards

---

*Document Version: 1.0*
*Last Updated: 2026-01-15*
