/**
 * Query Understanding and Expansion System
 *
 * Advanced query analysis and expansion for improved retrieval quality.
 *
 * Capabilities:
 * - Intent classification (search, question, command, filter)
 * - Named entity extraction
 * - Keyword identification
 * - Query expansion with synonyms
 * - Alternative query generation
 * - Filter extraction
 *
 * Benefits:
 * - Better understanding of user intent
 * - More comprehensive search results
 * - Handles query variations
 * - Improves recall significantly
 */

import { RAG_TEMPLATES, fillTemplate } from './prompt-templates.ts';
import { executeAIRequest } from './unified-ai-executor.ts';

export interface QueryAnalysis {
  originalQuery: string;
  intent: 'search' | 'question' | 'command' | 'filter';
  entities: Array<{ text: string; type: string; }>;
  keywords: string[];
  expandedQuery: string;
  alternativeQueries: string[];
  filters: Record<string, any>;
  confidence: number;
  suggestions?: string[];
}

export interface QueryExpansionResult {
  originalQuery: string;
  expandedQueries: string[];
  synonyms: Record<string, string[]>;
  relatedConcepts: string[];
  confidence: number;
}

/**
 * Analyze and understand user query comprehensively
 *
 * This is the main entry point for query understanding.
 *
 * @param query - User's search query
 * @param userId - User ID for tracking
 * @param context - Optional context (domain, previous queries, etc.)
 * @returns Comprehensive query analysis
 */
export async function analyzeQuery(
  query: string,
  userId: string,
  context?: string
): Promise<QueryAnalysis> {
  // Validate input
  if (!query || query.trim().length === 0) {
    throw new Error('Query cannot be empty');
  }

  const systemPrompt = `You are an expert query understanding system that analyzes search queries to improve information retrieval.

Your capabilities:
1. Intent Classification: Determine if the query is a search, question, command, or filter request
2. Entity Extraction: Identify named entities (people, places, dates, organizations, etc.)
3. Keyword Identification: Extract the most important terms and concepts
4. Query Expansion: Add synonyms and related terms to improve recall
5. Alternative Formulations: Generate different ways to express the same query
6. Filter Extraction: Identify any constraints or filters in the query

Quality standards:
- Be precise and accurate in entity extraction
- Maintain query intent in expansions
- Provide high-confidence classifications
- Generate diverse alternative queries
- Extract explicit and implicit filters

Safety constraints:
- Do not add concepts not implied by the query
- Maintain semantic meaning in expansions
- Flag low-confidence analyses
- Respect user's original intent`;

  const userPrompt = `Analyze this search query: "${query}"

${context ? `Context: ${context}` : ''}

Provide comprehensive analysis including:
1. Intent classification (search, question, command, filter)
2. Named entities with types (PERSON, ORG, LOCATION, DATE, PRODUCT, etc.)
3. Key terms and concepts
4. Expanded query with synonyms and related terms
5. 2-3 alternative query formulations that maintain the same intent
6. Any filters or constraints (date ranges, categories, attributes)
7. Confidence score (0-1)

Return as JSON with this exact structure:
{
  "intent": "search" | "question" | "command" | "filter",
  "entities": [{"text": "entity text", "type": "ENTITY_TYPE"}],
  "keywords": ["keyword1", "keyword2"],
  "expandedQuery": "expanded query text",
  "alternativeQueries": ["alt query 1", "alt query 2"],
  "filters": {"filter_key": "filter_value"},
  "confidence": 0.95,
  "suggestions": ["suggestion 1"]
}`;

  try {
    const result = await executeAIRequest({
      userId,
      projectId: 'system',
      operation: 'custom',
      userInput: userPrompt,
      systemPrompt,
      context: context || '',
      maxTokens: 800,
      temperature: 0.3,
    });

    // Parse the response
    let analysis: any;
    try {
      analysis = JSON.parse(result.response || '{}');
    } catch (parseError) {
      console.error('Failed to parse query analysis:', result.response);
      // Return basic analysis as fallback
      return createFallbackAnalysis(query);
    }

    // Ensure all required fields are present
    return {
      originalQuery: query,
      intent: analysis.intent || 'search',
      entities: analysis.entities || [],
      keywords: analysis.keywords || extractBasicKeywords(query),
      expandedQuery: analysis.expandedQuery || query,
      alternativeQueries: analysis.alternativeQueries || [],
      filters: analysis.filters || {},
      confidence: analysis.confidence || 0.7,
      suggestions: analysis.suggestions || [],
    };

  } catch (error) {
    console.error('Query analysis failed:', error);
    return createFallbackAnalysis(query);
  }
}

/**
 * Expand query with synonyms and related terms
 *
 * Generates multiple alternative formulations of the same query
 * to improve search recall.
 *
 * @param query - Original query
 * @param userId - User ID for tracking
 * @param domain - Optional domain context (e.g., "medical", "legal", "technical")
 * @returns Expanded queries and synonyms
 */
export async function expandQuery(
  query: string,
  userId: string,
  domain?: string
): Promise<QueryExpansionResult> {
  // Use the query expansion template from prompt-templates
  const template = RAG_TEMPLATES.queryExpansion;

  const variables = {
    query: query,
    domain: domain || 'general',
    context: domain ? `This is a ${domain} domain query` : '',
    expertise_level: 'general',
  };

  const userPrompt = fillTemplate(template.userPromptTemplate, variables);

  try {
    const result = await executeAIRequest({
      userId,
      projectId: 'system',
      operation: 'custom',
      userInput: userPrompt,
      systemPrompt: template.systemPrompt,
      context: variables.context,
      maxTokens: 600,
      temperature: 0.5, // Slightly higher for creative expansions
    });

    // Parse the response
    let expansion: any;
    try {
      expansion = JSON.parse(result.response || '{}');
    } catch (parseError) {
      console.error('Failed to parse query expansion:', result.response);
      return createFallbackExpansion(query);
    }

    return {
      originalQuery: query,
      expandedQueries: expansion.alternativeQueries || [query],
      synonyms: expansion.synonyms || {},
      relatedConcepts: expansion.relatedConcepts || [],
      confidence: expansion.confidence || 0.7,
    };

  } catch (error) {
    console.error('Query expansion failed:', error);
    return createFallbackExpansion(query);
  }
}

/**
 * Detect query intent with high accuracy
 */
export function detectQueryIntent(query: string): {
  intent: 'search' | 'question' | 'command' | 'filter';
  confidence: number;
  indicators: string[];
} {
  const lowercaseQuery = query.toLowerCase().trim();
  const indicators: string[] = [];

  // Question indicators
  const questionWords = ['what', 'who', 'where', 'when', 'why', 'how', 'which', 'whom', 'whose'];
  const isQuestion = questionWords.some(word => lowercaseQuery.startsWith(word)) ||
    lowercaseQuery.endsWith('?');

  if (isQuestion) {
    indicators.push('starts with question word or ends with ?');
    return { intent: 'question', confidence: 0.9, indicators };
  }

  // Command indicators
  const commandWords = ['show', 'find', 'get', 'list', 'search', 'fetch', 'retrieve', 'display'];
  const isCommand = commandWords.some(word => lowercaseQuery.startsWith(word));

  if (isCommand) {
    indicators.push('starts with command verb');
    return { intent: 'command', confidence: 0.85, indicators };
  }

  // Filter indicators
  const filterIndicators = ['in:', 'from:', 'to:', 'type:', 'category:', 'before:', 'after:'];
  const hasFilters = filterIndicators.some(indicator => lowercaseQuery.includes(indicator));

  if (hasFilters) {
    indicators.push('contains filter syntax');
    return { intent: 'filter', confidence: 0.8, indicators };
  }

  // Default to search
  indicators.push('no specific indicators, defaulting to search');
  return { intent: 'search', confidence: 0.75, indicators };
}

/**
 * Extract basic keywords from query (fallback method)
 */
function extractBasicKeywords(query: string): string[] {
  // Remove common stop words
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
    'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with'
  ]);

  const words = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Remove duplicates and return
  return Array.from(new Set(words));
}

/**
 * Create fallback analysis when AI analysis fails
 */
function createFallbackAnalysis(query: string): QueryAnalysis {
  const intentDetection = detectQueryIntent(query);

  return {
    originalQuery: query,
    intent: intentDetection.intent,
    entities: [],
    keywords: extractBasicKeywords(query),
    expandedQuery: query,
    alternativeQueries: [],
    filters: {},
    confidence: 0.5, // Low confidence for fallback
    suggestions: ['Query analysis failed, using basic parsing'],
  };
}

/**
 * Create fallback expansion when AI expansion fails
 */
function createFallbackExpansion(query: string): QueryExpansionResult {
  return {
    originalQuery: query,
    expandedQueries: [query],
    synonyms: {},
    relatedConcepts: [],
    confidence: 0.5,
  };
}

/**
 * Detect temporal expressions in query
 */
export function detectTemporalExpressions(query: string): {
  hasTemporalExpression: boolean;
  expressions: Array<{ text: string; type: string; }>;
} {
  const temporalPatterns = [
    { pattern: /\b(today|yesterday|tomorrow)\b/i, type: 'relative_day' },
    { pattern: /\b(last|this|next)\s+(week|month|year|quarter)\b/i, type: 'relative_period' },
    { pattern: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i, type: 'month' },
    { pattern: /\b(2\d{3})\b/, type: 'year' },
    { pattern: /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/, type: 'date' },
    { pattern: /\b(before|after|since|until)\s+/i, type: 'temporal_preposition' },
    { pattern: /\b(\d+)\s+(days?|weeks?|months?|years?)\s+(ago|old)\b/i, type: 'duration' },
  ];

  const expressions: Array<{ text: string; type: string; }> = [];

  for (const { pattern, type } of temporalPatterns) {
    const matches = query.match(pattern);
    if (matches) {
      expressions.push({
        text: matches[0],
        type,
      });
    }
  }

  return {
    hasTemporalExpression: expressions.length > 0,
    expressions,
  };
}

/**
 * Extract filters from query
 */
export function extractFilters(query: string): Record<string, any> {
  const filters: Record<string, any> = {};

  // Pattern: key:value
  const filterPattern = /(\w+):"([^"]+)"|(\w+):(\S+)/g;
  let match;

  while ((match = filterPattern.exec(query)) !== null) {
    const key = match[1] || match[3];
    const value = match[2] || match[4];
    filters[key] = value;
  }

  // Detect date ranges
  const dateRangePattern = /(before|after|since):\s*(\d{4}-\d{2}-\d{2})/g;
  while ((match = dateRangePattern.exec(query)) !== null) {
    const operator = match[1];
    const date = match[2];
    filters[`date_${operator}`] = date;
  }

  // Detect category/type filters
  const categoryPattern = /(category|type):\s*(\w+)/gi;
  while ((match = categoryPattern.exec(query)) !== null) {
    const filterType = match[1].toLowerCase();
    const value = match[2];
    filters[filterType] = value;
  }

  return filters;
}

/**
 * Generate query variations for better recall
 */
export function generateQueryVariations(query: string): string[] {
  const variations: string[] = [query];

  // Add lowercase version
  if (query !== query.toLowerCase()) {
    variations.push(query.toLowerCase());
  }

  // Remove punctuation
  const noPunctuation = query.replace(/[^\w\s]/g, ' ').trim();
  if (noPunctuation !== query) {
    variations.push(noPunctuation);
  }

  // Stemming-like variations (simple)
  const words = query.split(/\s+/);
  const stemmedWords = words.map(word => {
    // Remove common suffixes
    return word
      .replace(/ing$/, '')
      .replace(/ed$/, '')
      .replace(/s$/, '')
      .replace(/es$/, '');
  });
  const stemmed = stemmedWords.join(' ');
  if (stemmed !== query) {
    variations.push(stemmed);
  }

  // Remove stop words for core query
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
  const coreWords = words.filter(word => !stopWords.has(word.toLowerCase()));
  if (coreWords.length < words.length && coreWords.length > 0) {
    variations.push(coreWords.join(' '));
  }

  // Remove duplicates
  return Array.from(new Set(variations));
}

/**
 * Validate query quality
 */
export function validateQuery(query: string): {
  valid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check length
  if (query.length < 2) {
    issues.push('Query too short (< 2 characters)');
    suggestions.push('Try a longer, more specific query');
  }

  if (query.length > 500) {
    issues.push('Query very long (> 500 characters)');
    suggestions.push('Consider breaking into multiple shorter queries');
  }

  // Check for only special characters
  if (!/[a-zA-Z0-9]/.test(query)) {
    issues.push('Query contains only special characters');
    suggestions.push('Include some letters or numbers');
  }

  // Check for excessive repetition
  const words = query.toLowerCase().split(/\s+/);
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }
  const maxRepetition = Math.max(...Array.from(wordCounts.values()));
  if (maxRepetition > 3) {
    issues.push('Query has excessive word repetition');
    suggestions.push('Remove duplicate words');
  }

  return {
    valid: issues.length === 0,
    issues,
    suggestions,
  };
}

/**
 * Export configuration
 */
export const QUERY_UNDERSTANDING_CONFIG = {
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 500,
  MIN_CONFIDENCE_THRESHOLD: 0.7,
  MAX_ALTERNATIVE_QUERIES: 5,
  MAX_KEYWORDS: 10,
  DEFAULT_TEMPERATURE: 0.3,
  EXPANSION_TEMPERATURE: 0.5,
};
