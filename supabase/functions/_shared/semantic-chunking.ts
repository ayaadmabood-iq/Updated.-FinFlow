// ============= Advanced Semantic Chunking v2.0 =============
// Features:
// 1. LLM-based topic break detection (True AI Semantic Chunking)
// 2. Embedding-based similarity clustering
// 3. Entity extraction (dates, names, locations)
// 4. Sentence-boundary aware fallback with RTL/Arabic support
// 5. Keyword extraction for hybrid search enhancement
// Version: 2.0

import { callOpenAIEmbedding, hasOpenAIAPI, callLovableAI } from './executor-utils.ts';

// ============= Types =============

export interface SemanticChunk {
  content: string;
  embedding?: number[];
  clusterIndex: number;
  coherenceScore: number;
  startOffset: number;
  endOffset: number;
}

export interface ChunkingResult {
  chunks: string[];
  method: 'ai_topic_detection' | 'embedding_cluster' | 'sentence_fallback' | 'heuristic_semantic';
  coherenceScores: number[];
  avgCoherence: number;
}

export interface ExtractedEntities {
  dates: string[];
  names: string[];
  locations: string[];
  organizations: string[];
}

export interface EnrichedMetadata {
  entities: ExtractedEntities;
  keywords: string[];
  topicLabels: string[];
  language: string;
  extractedAt: string;
}

// ============= RTL-Aware Sentence Splitting =============

const RTL_SENTENCE_ENDINGS = /(?<=[.!?؟۔。！？])\s+/;
const LTR_SENTENCE_ENDINGS = /(?<=[.!?。！？])\s+/;

// Arabic and RTL language codes
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur', 'yi', 'dv', 'ku', 'ps', 'sd', 'ug'];

export function isRTLLanguage(language?: string): boolean {
  if (!language) return false;
  const baseCode = language.toLowerCase().split('-')[0];
  return RTL_LANGUAGES.includes(baseCode);
}

function splitIntoSentences(text: string, language?: string): string[] {
  const pattern = isRTLLanguage(language) ? RTL_SENTENCE_ENDINGS : LTR_SENTENCE_ENDINGS;
  
  return text
    .split(pattern)
    .map(s => s.trim())
    .filter(s => s.length > 10);
}

// ============= Cosine Similarity =============

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude > 0 ? dotProduct / magnitude : 0;
}

// ============= LLM-Based Topic Break Detection (NEW) =============

async function detectTopicBreaksWithAI(
  text: string,
  maxChunkSize: number,
  language?: string
): Promise<{ boundaries: number[]; topicLabels: string[]; error: string | null }> {
  const systemPrompt = `You are a document structure analyzer. Identify natural topic breaks in text.
Output JSON format: { "boundaries": [char_offset1, char_offset2, ...], "labels": ["topic1", "topic2", ...] }
Each boundary is a character offset where a new topic begins.
${isRTLLanguage(language) ? 'The text is in a right-to-left language. Preserve Arabic/Hebrew text correctly.' : ''}
Target ~${maxChunkSize} characters per section. Identify 5-15 topic boundaries maximum.
Only output valid JSON, no explanation.`;

  const truncatedText = text.substring(0, 30000); // Limit for AI call
  
  const { content, error } = await callLovableAI(
    'google/gemini-2.5-flash',
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze this text for topic boundaries:\n\n${truncatedText}` },
    ],
    45000
  );

  if (error || !content) {
    return { boundaries: [], topicLabels: [], error: error || 'No response from AI' };
  }

  try {
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { boundaries: [], topicLabels: [], error: 'No JSON in response' };
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    const boundaries = Array.isArray(parsed.boundaries) ? parsed.boundaries : [];
    const topicLabels = Array.isArray(parsed.labels) ? parsed.labels : [];
    
    return { boundaries, topicLabels, error: null };
  } catch {
    return { boundaries: [], topicLabels: [], error: 'Failed to parse AI response' };
  }
}

// ============= Entity Extraction (NEW) =============

export async function extractEntities(
  text: string,
  language?: string
): Promise<{ entities: ExtractedEntities; keywords: string[]; error: string | null }> {
  const systemPrompt = `Extract entities and keywords from text. Output JSON:
{
  "entities": {
    "dates": ["2024-01-15", "January 2024", ...],
    "names": ["John Smith", "Dr. Ahmed", ...],
    "locations": ["New York", "القاهرة", ...],
    "organizations": ["Google", "MIT", ...]
  },
  "keywords": ["machine learning", "document processing", ...]
}
${isRTLLanguage(language) ? 'Preserve Arabic/Hebrew text in original script.' : ''}
Extract up to 10 items per category and 15 keywords. Only output JSON.`;

  // Sample text for entity extraction
  const sampleSize = 15000;
  const sample = text.length > sampleSize 
    ? text.substring(0, sampleSize / 2) + '\n...\n' + text.substring(text.length - sampleSize / 2)
    : text;

  const { content, error } = await callLovableAI(
    'google/gemini-2.5-flash-lite',
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Extract entities and keywords:\n\n${sample}` },
    ],
    30000
  );

  if (error || !content) {
    return {
      entities: { dates: [], names: [], locations: [], organizations: [] },
      keywords: [],
      error: error || 'No response from AI',
    };
  }

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        entities: { dates: [], names: [], locations: [], organizations: [] },
        keywords: [],
        error: 'No JSON in response',
      };
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    const entities: ExtractedEntities = {
      dates: Array.isArray(parsed.entities?.dates) ? parsed.entities.dates.slice(0, 10) : [],
      names: Array.isArray(parsed.entities?.names) ? parsed.entities.names.slice(0, 10) : [],
      locations: Array.isArray(parsed.entities?.locations) ? parsed.entities.locations.slice(0, 10) : [],
      organizations: Array.isArray(parsed.entities?.organizations) ? parsed.entities.organizations.slice(0, 10) : [],
    };
    const keywords = Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 15) : [];
    
    return { entities, keywords, error: null };
  } catch {
    return {
      entities: { dates: [], names: [], locations: [], organizations: [] },
      keywords: [],
      error: 'Failed to parse entity extraction response',
    };
  }
}

// ============= Build Enriched Metadata (NEW) =============

export async function buildEnrichedMetadata(
  text: string,
  language?: string,
  topicLabels?: string[]
): Promise<EnrichedMetadata> {
  const { entities, keywords, error } = await extractEntities(text, language);
  
  if (error) {
    console.warn(`[semantic-chunking] Entity extraction failed: ${error}`);
  }

  return {
    entities,
    keywords,
    topicLabels: topicLabels || [],
    language: language || 'unknown',
    extractedAt: new Date().toISOString(),
  };
}

// ============= Coherence-Based Boundary Detection =============

function detectBoundaries(
  sentences: string[],
  embeddings: number[][],
  threshold: number = 0.7
): number[] {
  const boundaries: number[] = [0];
  
  for (let i = 1; i < embeddings.length; i++) {
    const similarity = cosineSimilarity(embeddings[i - 1], embeddings[i]);
    if (similarity < threshold) {
      boundaries.push(i);
    }
  }
  
  boundaries.push(sentences.length);
  return boundaries;
}

// ============= Merge Small Chunks =============

function mergeSmallChunks(
  chunks: string[],
  minChunkSize: number,
  maxChunkSize: number
): string[] {
  const result: string[] = [];
  let currentChunk = '';
  
  for (const chunk of chunks) {
    if (currentChunk.length + chunk.length + 1 <= maxChunkSize) {
      currentChunk += (currentChunk ? ' ' : '') + chunk;
    } else {
      if (currentChunk) {
        result.push(currentChunk);
      }
      currentChunk = chunk;
    }
  }
  
  if (currentChunk) {
    result.push(currentChunk);
  }
  
  // Handle chunks that are too small
  const merged: string[] = [];
  let buffer = '';
  
  for (const chunk of result) {
    if (chunk.length < minChunkSize) {
      buffer += (buffer ? ' ' : '') + chunk;
    } else {
      if (buffer) {
        if (buffer.length + chunk.length + 1 <= maxChunkSize) {
          merged.push(buffer + ' ' + chunk);
          buffer = '';
        } else {
          merged.push(buffer);
          merged.push(chunk);
          buffer = '';
        }
      } else {
        merged.push(chunk);
      }
    }
  }
  
  if (buffer) {
    if (merged.length > 0 && merged[merged.length - 1].length + buffer.length + 1 <= maxChunkSize) {
      merged[merged.length - 1] += ' ' + buffer;
    } else {
      merged.push(buffer);
    }
  }
  
  return merged;
}

// ============= Calculate Coherence Scores =============

function calculateCoherenceScores(
  chunks: string[],
  embeddings: number[][]
): number[] {
  if (chunks.length !== embeddings.length) {
    return chunks.map(() => 0.5);
  }
  
  return embeddings.map((emb, i) => {
    if (i === 0 || i === embeddings.length - 1) return 0.8;
    
    const prevSim = cosineSimilarity(embeddings[i - 1], emb);
    const nextSim = cosineSimilarity(emb, embeddings[i + 1]);
    
    return (prevSim + nextSim) / 2;
  });
}

// ============= AI Topic Detection Chunking (NEW - Highest Quality) =============

export async function createAITopicChunks(
  text: string,
  targetChunkSize: number = 1000,
  minChunkSize: number = 200,
  language?: string
): Promise<ChunkingResult & { topicLabels: string[] }> {
  console.log(`[semantic-chunking] Using AI topic detection chunking`);
  
  const { boundaries, topicLabels, error } = await detectTopicBreaksWithAI(text, targetChunkSize, language);
  
  if (error || boundaries.length === 0) {
    console.warn(`[semantic-chunking] AI topic detection failed: ${error}, falling back to embedding cluster`);
    const fallback = await createSemanticChunksWithEmbeddings(text, targetChunkSize, minChunkSize, language);
    return { ...fallback, topicLabels: [] };
  }
  
  // Sort boundaries and add start/end
  const sortedBoundaries = [0, ...boundaries.filter(b => b > 0 && b < text.length), text.length];
  sortedBoundaries.sort((a, b) => a - b);
  
  // Create chunks from boundaries
  const rawChunks: string[] = [];
  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const chunk = text.substring(sortedBoundaries[i], sortedBoundaries[i + 1]).trim();
    if (chunk.length > 0) {
      rawChunks.push(chunk);
    }
  }
  
  // Merge/split to respect size limits
  const chunks = mergeSmallChunks(rawChunks, minChunkSize, targetChunkSize * 1.5);
  
  console.log(`[semantic-chunking] AI topic detection created ${chunks.length} chunks with ${topicLabels.length} topics`);
  
  return {
    chunks,
    method: 'ai_topic_detection',
    coherenceScores: chunks.map(() => 0.85), // AI-detected topics have high coherence
    avgCoherence: 0.85,
    topicLabels,
  };
}

// ============= Embedding Cluster Semantic Chunking =============

export async function createSemanticChunksWithEmbeddings(
  text: string,
  targetChunkSize: number = 1000,
  minChunkSize: number = 200,
  language?: string,
  similarityThreshold: number = 0.7
): Promise<ChunkingResult> {
  const sentences = splitIntoSentences(text, language);
  
  // If no OpenAI API or too few sentences, fall back to sentence-based
  if (!hasOpenAIAPI() || sentences.length < 3) {
    console.log('[semantic-chunking] Falling back to sentence-based chunking');
    const chunks = mergeSmallChunks(sentences, minChunkSize, targetChunkSize);
    return {
      chunks,
      method: 'sentence_fallback',
      coherenceScores: chunks.map(() => 0.5),
      avgCoherence: 0.5,
    };
  }
  
  console.log(`[semantic-chunking] Generating embeddings for ${sentences.length} sentences`);
  
  const embeddings: number[][] = [];
  const BATCH_SIZE = 20;
  
  for (let i = 0; i < sentences.length; i += BATCH_SIZE) {
    const batch = sentences.slice(i, i + BATCH_SIZE);
    
    for (const sentence of batch) {
      const { embedding, error } = await callOpenAIEmbedding(sentence, 8000);
      
      if (error || !embedding) {
        console.warn(`[semantic-chunking] Embedding failed for sentence ${i}, using fallback`);
        embeddings.push(new Array(1536).fill(0));
      } else {
        embeddings.push(embedding);
      }
    }
    
    if (i + BATCH_SIZE < sentences.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Detect semantic boundaries
  const boundaries = detectBoundaries(sentences, embeddings, similarityThreshold);
  
  // Create chunks from boundaries
  const rawChunks: string[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    const chunkSentences = sentences.slice(start, end);
    rawChunks.push(chunkSentences.join(' '));
  }
  
  // Merge and split to respect size limits
  const chunks = mergeSmallChunks(rawChunks, minChunkSize, targetChunkSize);
  
  // Generate embeddings for final chunks to calculate coherence
  const chunkEmbeddings: number[][] = [];
  for (const chunk of chunks) {
    const { embedding } = await callOpenAIEmbedding(chunk.substring(0, 8000));
    chunkEmbeddings.push(embedding || new Array(1536).fill(0));
  }
  
  const coherenceScores = calculateCoherenceScores(chunks, chunkEmbeddings);
  const avgCoherence = coherenceScores.reduce((a, b) => a + b, 0) / coherenceScores.length;
  
  console.log(`[semantic-chunking] Created ${chunks.length} semantic chunks, avg coherence: ${avgCoherence.toFixed(3)}`);
  
  return {
    chunks,
    method: 'embedding_cluster',
    coherenceScores,
    avgCoherence,
  };
}

// ============= Heuristic Semantic Chunking =============

export function createHeuristicSemanticChunks(
  text: string,
  maxChunkSize: number,
  overlap: number,
  language?: string
): string[] {
  const sentences = splitIntoSentences(text, language);
  const chunks: string[] = [];
  let currentChunk = '';
  let overlapBuffer: string[] = [];
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    
    if (trimmed.length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        overlapBuffer = currentChunk.split(/\s+/).slice(-Math.floor(overlap / 5));
      }
      
      // Split long sentence into fixed chunks
      let start = 0;
      while (start < trimmed.length) {
        const end = Math.min(start + maxChunkSize, trimmed.length);
        chunks.push(trimmed.substring(start, end));
        start = end - overlap;
      }
      
      currentChunk = '';
      continue;
    }
    
    if (currentChunk.length + trimmed.length + 1 > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      
      const words = currentChunk.split(/\s+/);
      overlapBuffer = words.slice(-Math.floor(overlap / 5));
      currentChunk = overlapBuffer.join(' ') + ' ' + trimmed;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmed;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// ============= Unified Chunking Entry Point =============

export type ChunkingStrategy = 'ai_topic' | 'embedding_cluster' | 'heuristic_semantic' | 'sentence' | 'fixed';

export async function createChunksWithAdvancedStrategy(
  text: string,
  strategy: ChunkingStrategy,
  chunkSize: number,
  chunkOverlap: number,
  language?: string
): Promise<ChunkingResult & { topicLabels?: string[] }> {
  const minChunkSize = Math.max(100, chunkSize / 5);
  
  switch (strategy) {
    case 'ai_topic':
      return createAITopicChunks(text, chunkSize, minChunkSize, language);
      
    case 'embedding_cluster':
      return createSemanticChunksWithEmbeddings(text, chunkSize, minChunkSize, language);
      
    case 'heuristic_semantic':
      const heuristicChunks = createHeuristicSemanticChunks(text, chunkSize, chunkOverlap, language);
      return {
        chunks: heuristicChunks,
        method: 'heuristic_semantic',
        coherenceScores: heuristicChunks.map(() => 0.6),
        avgCoherence: 0.6,
      };
      
    case 'sentence':
      const sentences = splitIntoSentences(text, language);
      const sentenceChunks = mergeSmallChunks(sentences, minChunkSize, chunkSize);
      return {
        chunks: sentenceChunks,
        method: 'sentence_fallback',
        coherenceScores: sentenceChunks.map(() => 0.5),
        avgCoherence: 0.5,
      };
      
    case 'fixed':
    default:
      const fixedChunks = createFixedChunks(text, chunkSize, chunkOverlap);
      return {
        chunks: fixedChunks,
        method: 'sentence_fallback',
        coherenceScores: fixedChunks.map(() => 0.4),
        avgCoherence: 0.4,
      };
  }
}

// ============= Fixed Size Chunking Helper =============

function createFixedChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.substring(start, end));
    start = end - overlap;
    
    // Prevent infinite loop
    if (overlap >= chunkSize) {
      start = end;
    }
  }
  
  return chunks;
}
