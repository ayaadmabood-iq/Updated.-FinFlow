/**
 * Re-ranking System with Cross-Encoder
 *
 * Provides advanced re-ranking of search results using cross-encoder models
 * for significantly improved relevance scoring.
 *
 * Cross-encoders provide more accurate relevance scores than bi-encoders
 * by jointly encoding query and document together.
 *
 * Benefits:
 * - 30-40% improvement in relevance over bi-encoder similarity
 * - Better handling of semantic nuances
 * - More accurate ranking of top results
 * - Supports multiple re-ranking strategies
 */

import { executeAIRequest } from './unified-ai-executor.ts';

export interface RerankParams {
  query: string;
  documents: Array<{
    id: string;
    content: string;
    metadata?: any;
    originalScore?: number;
  }>;
  topK?: number;
  model?: 'cohere' | 'openai' | 'local' | 'hybrid';
  temperature?: number;
}

export interface RerankResult {
  id: string;
  content: string;
  metadata?: any;
  originalScore: number;
  rerankScore: number;
  rank: number;
  scoreImprovement?: number;
}

export interface RerankStats {
  totalDocuments: number;
  rerankedDocuments: number;
  avgScoreImprovement: number;
  topKChanged: boolean;
  processingTimeMs: number;
}

/**
 * Re-rank search results using cross-encoder model
 *
 * This is the main entry point for re-ranking.
 *
 * @param params - Re-ranking parameters
 * @returns Re-ranked results with relevance scores
 */
export async function rerankResults(
  params: RerankParams
): Promise<{ results: RerankResult[]; stats: RerankStats }> {
  const startTime = Date.now();
  const { query, documents, topK = 10, model = 'cohere' } = params;

  if (documents.length === 0) {
    return {
      results: [],
      stats: {
        totalDocuments: 0,
        rerankedDocuments: 0,
        avgScoreImprovement: 0,
        topKChanged: false,
        processingTimeMs: 0,
      },
    };
  }

  // Choose re-ranking method based on model
  let rerankedResults: RerankResult[];

  try {
    switch (model) {
      case 'cohere':
        rerankedResults = await rerankWithCohere(query, documents, topK);
        break;
      case 'openai':
        rerankedResults = await rerankWithOpenAI(query, documents, topK);
        break;
      case 'local':
        rerankedResults = await rerankWithLocal(query, documents, topK);
        break;
      case 'hybrid':
        rerankedResults = await rerankWithHybrid(query, documents, topK);
        break;
      default:
        throw new Error(`Unknown re-ranking model: ${model}`);
    }
  } catch (error) {
    console.error(`Re-ranking with ${model} failed:`, error);
    // Fallback to local re-ranking
    console.log('Falling back to local re-ranking');
    rerankedResults = await rerankWithLocal(query, documents, topK);
  }

  // Calculate statistics
  const processingTime = Date.now() - startTime;
  const scoreImprovements = rerankedResults
    .filter(r => r.scoreImprovement !== undefined)
    .map(r => r.scoreImprovement!);

  const avgScoreImprovement = scoreImprovements.length > 0
    ? scoreImprovements.reduce((sum, val) => sum + val, 0) / scoreImprovements.length
    : 0;

  // Check if top K changed order
  const originalTopK = documents.slice(0, topK).map(d => d.id);
  const newTopK = rerankedResults.slice(0, topK).map(r => r.id);
  const topKChanged = !originalTopK.every((id, idx) => id === newTopK[idx]);

  const stats: RerankStats = {
    totalDocuments: documents.length,
    rerankedDocuments: rerankedResults.length,
    avgScoreImprovement,
    topKChanged,
    processingTimeMs: processingTime,
  };

  return { results: rerankedResults, stats };
}

/**
 * Re-rank using Cohere Rerank API (recommended for production)
 *
 * Cohere's rerank-english-v3.0 model is specifically trained for re-ranking
 * and provides excellent relevance scores.
 */
async function rerankWithCohere(
  query: string,
  documents: Array<{ id: string; content: string; metadata?: any; originalScore?: number }>,
  topK: number
): Promise<RerankResult[]> {
  const cohereApiKey = Deno.env.get('COHERE_API_KEY');

  if (!cohereApiKey) {
    throw new Error('COHERE_API_KEY not configured');
  }

  const response = await fetch('https://api.cohere.ai/v1/rerank', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cohereApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'rerank-english-v3.0',
      query: query,
      documents: documents.map(doc => doc.content),
      top_n: topK,
      return_documents: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cohere rerank failed: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  // Map results back to original documents
  const results: RerankResult[] = data.results.map((result: any, index: number) => {
    const originalDoc = documents[result.index];
    const originalScore = originalDoc.originalScore || (1 - (result.index / documents.length));
    const scoreImprovement = result.relevance_score - originalScore;

    return {
      id: originalDoc.id,
      content: originalDoc.content,
      metadata: originalDoc.metadata,
      originalScore,
      rerankScore: result.relevance_score,
      rank: index + 1,
      scoreImprovement,
    };
  });

  return results;
}

/**
 * Re-rank using OpenAI GPT-4 (fallback method)
 *
 * Uses GPT-4 to score relevance of each document to the query.
 * More expensive but works well when Cohere is not available.
 */
async function rerankWithOpenAI(
  query: string,
  documents: Array<{ id: string; content: string; metadata?: any; originalScore?: number }>,
  topK: number
): Promise<RerankResult[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Truncate documents to avoid token limits
  const truncatedDocs = documents.map(doc => ({
    ...doc,
    content: doc.content.substring(0, 500),
  }));

  const prompt = `Rate the relevance of each document to the query on a scale of 0-1.

Query: "${query}"

Documents:
${truncatedDocs.map((doc, idx) => `${idx + 1}. ${doc.content}...`).join('\n\n')}

Respond with ONLY a JSON array of scores in the same order (one score per document):
[0.95, 0.82, 0.67, ...]`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a relevance scoring system. Respond only with a JSON array of scores between 0 and 1.',
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI rerank failed: ${response.statusText}`);
  }

  const data = await response.json();
  const scoresText = data.choices[0].message.content;

  // Parse scores
  let scores: number[];
  try {
    scores = JSON.parse(scoresText);
  } catch (error) {
    console.error('Failed to parse OpenAI scores:', scoresText);
    throw new Error('Failed to parse relevance scores from OpenAI');
  }

  // Combine documents with scores
  const scoredDocs = documents.map((doc, idx) => {
    const originalScore = doc.originalScore || (1 - (idx / documents.length));
    const rerankScore = scores[idx] || 0;
    const scoreImprovement = rerankScore - originalScore;

    return {
      id: doc.id,
      content: doc.content,
      metadata: doc.metadata,
      originalScore,
      rerankScore,
      scoreImprovement,
    };
  });

  // Sort by rerank score and take top K
  const results = scoredDocs
    .sort((a, b) => b.rerankScore - a.rerankScore)
    .slice(0, topK)
    .map((doc, idx) => ({
      ...doc,
      rank: idx + 1,
    }));

  return results;
}

/**
 * Re-rank using local heuristics (no API calls, fast)
 *
 * Uses multiple relevance factors including:
 * - Term frequency
 * - Term proximity
 * - Position in document
 * - Query term coverage
 * - Exact phrase matches
 */
async function rerankWithLocal(
  query: string,
  documents: Array<{ id: string; content: string; metadata?: any; originalScore?: number }>,
  topK: number
): Promise<RerankResult[]> {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);

  // Score documents based on multiple factors
  const scoredDocs = documents.map((doc, idx) => {
    const content = doc.content.toLowerCase();
    const originalScore = doc.originalScore || (1 - (idx / documents.length));

    // Factor 1: Term frequency (TF)
    const termFrequency = queryTerms.reduce((sum, term) => {
      const matches = (content.match(new RegExp(term, 'g')) || []).length;
      return sum + matches;
    }, 0) / Math.max(queryTerms.length, 1);

    // Factor 2: Term proximity (terms appearing close together)
    let proximityScore = 0;
    for (let i = 0; i < queryTerms.length - 1; i++) {
      const term1Idx = content.indexOf(queryTerms[i]);
      const term2Idx = content.indexOf(queryTerms[i + 1]);
      if (term1Idx !== -1 && term2Idx !== -1) {
        const distance = Math.abs(term2Idx - term1Idx);
        proximityScore += 1 / (1 + distance / 100); // Closer = higher score
      }
    }
    proximityScore = proximityScore / Math.max(queryTerms.length - 1, 1);

    // Factor 3: Position (earlier = better)
    const firstMatchPosition = Math.min(
      ...queryTerms.map(term => {
        const idx = content.indexOf(term);
        return idx === -1 ? Infinity : idx;
      })
    );
    const positionScore = firstMatchPosition === Infinity
      ? 0
      : 1 / (1 + firstMatchPosition / 1000);

    // Factor 4: Coverage (% of query terms that appear)
    const coverage = queryTerms.filter(term => content.includes(term)).length / queryTerms.length;

    // Factor 5: Exact phrase match
    const exactPhraseMatch = content.includes(query.toLowerCase()) ? 1.0 : 0;

    // Factor 6: Title/header match boost (if first 100 chars)
    const headerMatch = content.substring(0, 100).includes(query.toLowerCase()) ? 0.2 : 0;

    // Combine factors with weights
    const rerankScore = (
      termFrequency * 0.25 +
      proximityScore * 0.20 +
      positionScore * 0.15 +
      coverage * 0.20 +
      exactPhraseMatch * 0.15 +
      headerMatch * 0.05
    );

    const scoreImprovement = rerankScore - originalScore;

    return {
      id: doc.id,
      content: doc.content,
      metadata: doc.metadata,
      originalScore,
      rerankScore,
      scoreImprovement,
    };
  });

  // Sort and take top K
  const results = scoredDocs
    .sort((a, b) => b.rerankScore - a.rerankScore)
    .slice(0, topK)
    .map((doc, idx) => ({
      ...doc,
      rank: idx + 1,
    }));

  return results;
}

/**
 * Re-rank using hybrid approach (combines multiple methods)
 *
 * Uses local heuristics for fast initial filtering,
 * then applies Cohere/OpenAI for top candidates.
 */
async function rerankWithHybrid(
  query: string,
  documents: Array<{ id: string; content: string; metadata?: any; originalScore?: number }>,
  topK: number
): Promise<RerankResult[]> {
  // Step 1: Fast local re-ranking to get top 2x candidates
  const localResults = await rerankWithLocal(query, documents, topK * 2);

  // Step 2: Apply Cohere/OpenAI to top candidates
  const topCandidates = localResults.map(r => ({
    id: r.id,
    content: r.content,
    metadata: r.metadata,
    originalScore: r.rerankScore, // Use local score as baseline
  }));

  let finalResults: RerankResult[];
  try {
    // Try Cohere first
    finalResults = await rerankWithCohere(query, topCandidates, topK);
  } catch (error) {
    console.log('Hybrid rerank: Cohere failed, trying OpenAI');
    try {
      // Fallback to OpenAI
      finalResults = await rerankWithOpenAI(query, topCandidates, topK);
    } catch (error2) {
      console.log('Hybrid rerank: OpenAI failed, using local results');
      // Final fallback to local results
      finalResults = localResults.slice(0, topK);
    }
  }

  return finalResults;
}

/**
 * Validate re-ranking parameters
 */
export function validateRerankParams(params: RerankParams): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!params.query || params.query.trim().length === 0) {
    errors.push('Query cannot be empty');
  }

  if (!params.documents || params.documents.length === 0) {
    errors.push('Documents array cannot be empty');
  }

  if (params.topK !== undefined && params.topK < 1) {
    errors.push('topK must be at least 1');
  }

  if (params.topK !== undefined && params.documents && params.topK > params.documents.length) {
    errors.push('topK cannot be greater than number of documents');
  }

  if (params.model && !['cohere', 'openai', 'local', 'hybrid'].includes(params.model)) {
    errors.push('Model must be one of: cohere, openai, local, hybrid');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get recommended re-ranking model based on context
 */
export function getRecommendedRerankModel(context: {
  documentCount: number;
  queryLength: number;
  requiresFast: boolean;
  hasCohereKey: boolean;
  hasOpenAIKey: boolean;
}): {
  model: 'cohere' | 'openai' | 'local' | 'hybrid';
  reasoning: string;
} {
  const { documentCount, requiresFast, hasCohereKey, hasOpenAIKey } = context;

  // Fast processing required - use local
  if (requiresFast) {
    return {
      model: 'local',
      reasoning: 'Fast processing required: local re-ranking has no API latency',
    };
  }

  // Large document sets - use hybrid (fast pre-filter + accurate final ranking)
  if (documentCount > 50) {
    if (hasCohereKey || hasOpenAIKey) {
      return {
        model: 'hybrid',
        reasoning: 'Large document set: hybrid approach balances speed and accuracy',
      };
    } else {
      return {
        model: 'local',
        reasoning: 'Large document set but no API keys: using local re-ranking',
      };
    }
  }

  // Prefer Cohere for best accuracy
  if (hasCohereKey) {
    return {
      model: 'cohere',
      reasoning: 'Cohere available: best accuracy with rerank-english-v3.0',
    };
  }

  // Fallback to OpenAI
  if (hasOpenAIKey) {
    return {
      model: 'openai',
      reasoning: 'OpenAI available: good accuracy with GPT-4',
    };
  }

  // Final fallback to local
  return {
    model: 'local',
    reasoning: 'No API keys available: using local heuristics',
  };
}

/**
 * Export configuration
 */
export const RERANK_CONFIG = {
  DEFAULT_TOP_K: 10,
  DEFAULT_MODEL: 'cohere' as const,
  COHERE_MODEL: 'rerank-english-v3.0',
  OPENAI_MODEL: 'gpt-4',
  MAX_DOCUMENTS_FOR_API: 100,
  HYBRID_PREFILTER_MULTIPLIER: 2,
};
