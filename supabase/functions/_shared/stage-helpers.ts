// ============= Stage Helper Functions =============
// Pure utility functions shared across stage executors

import type { DocumentMetadata, ProcessedChunk } from './pipeline-types.ts';

// ============= Text Cleaning =============

export function cleanText(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(/[\t ]+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
  cleaned = cleaned.replace(/[\u2018\u2019]/g, "'");
  cleaned = cleaned.replace(/[\u201C\u201D]/g, '"');
  cleaned = cleaned.replace(/[\u2013\u2014]/g, '-');
  cleaned = cleaned.replace(/([!?])\1+/g, '$1');
  cleaned = cleaned.replace(/\.{4,}/g, '...');
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
  cleaned = cleaned.split('\n')
    .filter(line => {
      const stripped = line.replace(/[^\w\s]/g, '').trim();
      return stripped.length > 2 || line.length === 0;
    })
    .join('\n');
  return cleaned.trim();
}

// ============= HTML Text Extraction =============

export function extractCleanTextFromHTML(html: string): string {
  let text = html;
  
  const blocksToRemove = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    /<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi,
    /<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<canvas\b[^<]*(?:(?!<\/canvas>)<[^<]*)*<\/canvas>/gi,
    /<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi,
    /<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi,
    /<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi,
    /<embed\b[^>]*\/?>/gi,
    /<link\b[^>]*\/?>/gi,
    /<meta\b[^>]*\/?>/gi,
    /<input\b[^>]*\/?>/gi,
    /<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi,
    /<!--[\s\S]*?-->/g,
    /<!DOCTYPE[^>]*>/gi,
    /<\?xml[^>]*\?>/gi,
  ];
  
  for (const pattern of blocksToRemove) {
    text = text.replace(pattern, ' ');
  }
  
  text = text.replace(/\s(on\w+|style|class|id|data-[\w-]+|aria-[\w-]+|role)="[^"]*"/gi, '');
  text = text.replace(/\s(on\w+|style|class|id|data-[\w-]+|aria-[\w-]+|role)='[^']*'/gi, '');
  text = text.replace(/<(br|hr)[^>]*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|li|tr|h[1-6]|article|section|blockquote|pre|td|th)>/gi, '\n');
  text = text.replace(/<(p|div|li|tr|h[1-6]|article|section|blockquote|pre|td|th)[^>]*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  
  const entities: Record<string, string> = {
    '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&quot;': '"', '&#39;': "'", '&apos;': "'",
    '&mdash;': '—', '&ndash;': '–', '&hellip;': '…',
    '&copy;': '©', '&reg;': '®', '&trade;': '™',
  };
  for (const [entity, char] of Object.entries(entities)) {
    text = text.replace(new RegExp(entity, 'gi'), char);
  }
  
  text = text.replace(/&#(\d+);/g, (_, num) => {
    const code = parseInt(num, 10);
    return code > 0 && code < 65536 ? String.fromCharCode(code) : '';
  });
  text = text.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const code = parseInt(hex, 16);
    return code > 0 && code < 65536 ? String.fromCharCode(code) : '';
  });
  
  text = text
    .replace(/[\t ]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return text;
}

// ============= Metadata Extraction =============

export function extractMetadata(text: string, mimeType: string, fileName: string): DocumentMetadata {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^\w]/g, '')));
  const avgWordLength = words.length > 0 
    ? words.reduce((sum, w) => sum + w.length, 0) / words.length 
    : 0;
  
  const hasHeaders = /^#{1,6}\s|^[A-Z][^.]*:$/m.test(text);
  const hasLists = /^[\-\*\•]\s|^\d+\.\s/m.test(text);
  const hasStructure = hasHeaders || hasLists;
  
  const estimatedReadingTime = Math.ceil(words.length / 200);
  
  let contentType = 'general';
  if (/\b(function|const|let|var|class|import|export)\b/.test(text)) {
    contentType = 'code';
  } else if (/\b(article|section|chapter)\b/i.test(text)) {
    contentType = 'article';
  } else if (/\bQ:|A:|FAQ|question|answer/i.test(text)) {
    contentType = 'qa';
  } else if (/\b(step \d|first|second|third|finally)\b/i.test(text)) {
    contentType = 'tutorial';
  }
  
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
  
  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    avgSentenceLength: sentences.length > 0 ? words.length / sentences.length : 0,
    avgWordLength,
    uniqueWordRatio: words.length > 0 ? uniqueWords.size / words.length : 0,
    hasStructure,
    estimatedReadingTime,
    contentType,
    fileExtension,
  };
}

// ============= Quality Scoring =============

export function calculateQualityScore(text: string, metadata: DocumentMetadata): number {
  let score = 0;
  let factors = 0;
  
  const lengthScore = Math.min(1, metadata.wordCount / 500) * 
    (metadata.wordCount <= 10000 ? 1 : Math.max(0.5, 1 - (metadata.wordCount - 10000) / 50000));
  score += lengthScore;
  factors++;
  
  const sentenceScore = metadata.avgSentenceLength >= 10 && metadata.avgSentenceLength <= 30 
    ? 1 : Math.max(0.3, 1 - Math.abs(metadata.avgSentenceLength - 20) / 30);
  score += sentenceScore;
  factors++;
  
  const diversityScore = Math.min(1, metadata.uniqueWordRatio * 2);
  score += diversityScore;
  factors++;
  
  score += metadata.hasStructure ? 1 : 0.6;
  factors++;
  
  const repetitionPenalty = detectRepetition(text);
  score += 1 - repetitionPenalty;
  factors++;
  
  const completenessScore = metadata.paragraphCount >= 2 ? 1 : 0.7;
  score += completenessScore;
  factors++;
  
  return Math.round((score / factors) * 100) / 100;
}

function detectRepetition(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length < 2) return 0;
  
  const normalizedSentences = sentences.map(s => 
    s.toLowerCase().replace(/[^\w\s]/g, '').trim()
  );
  
  const uniqueSentences = new Set(normalizedSentences);
  return Math.min(0.5, 1 - (uniqueSentences.size / normalizedSentences.length));
}

export function calculateChunkQuality(content: string): number {
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let score = 0;
  
  if (words.length >= 50 && words.length <= 800) {
    score += 0.3;
  } else if (words.length >= 20) {
    score += 0.15;
  }
  
  if (sentences.length >= 1) score += 0.3;
  if (/[.!?]$/.test(content.trim())) score += 0.2;
  
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  if (uniqueWords.size / words.length > 0.5) score += 0.2;
  
  return Math.round(score * 100) / 100;
}

// ============= Chunking Strategies =============

export function simpleHash(str: string): string {
  const normalized = str.toLowerCase().replace(/\s+/g, ' ').trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export function createChunksWithStrategy(
  text: string,
  strategy: 'semantic' | 'fixed' | 'sentence',
  chunkSize: number,
  overlap: number,
  language?: string
): string[] {
  switch (strategy) {
    case 'sentence':
      return createSentenceChunks(text, chunkSize, overlap, language);
    case 'semantic':
      return createSentenceChunks(text, chunkSize, overlap, language);
    case 'fixed':
    default:
      return createFixedChunks(text, chunkSize, overlap);
  }
}

function createFixedChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);
    
    if (end < text.length) {
      const lookback = Math.min(100, chunkSize / 4);
      const segment = text.substring(end - lookback, end);
      
      const paragraphBreak = segment.lastIndexOf('\n\n');
      const sentenceBreak = Math.max(
        segment.lastIndexOf('. '),
        segment.lastIndexOf('! '),
        segment.lastIndexOf('? '),
        segment.lastIndexOf('。'),
        segment.lastIndexOf('؟'),
        segment.lastIndexOf('۔')
      );
      const wordBreak = segment.lastIndexOf(' ');
      
      if (paragraphBreak > 0) {
        end = end - lookback + paragraphBreak + 2;
      } else if (sentenceBreak > 0) {
        end = end - lookback + sentenceBreak + 2;
      } else if (wordBreak > 0) {
        end = end - lookback + wordBreak + 1;
      }
    }
    
    const chunk = text.substring(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    start = Math.max(start + 1, end - overlap);
    if (start >= text.length) break;
  }
  
  return chunks;
}

function createSentenceChunks(
  text: string,
  maxChunkSize: number,
  overlap: number,
  language?: string
): string[] {
  const chunks: string[] = [];
  
  const sentencePattern = language === 'ar' || language === 'fa' || language === 'ur'
    ? /(?<=[.!?؟۔。！？])\s+|(?<=\n)\s*/
    : /(?<=[.!?。！？])\s+|(?<=\n)\s*/;
  
  const sentences = text.split(sentencePattern).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  let overlapBuffer: string[] = [];
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    if (trimmedSentence.length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        overlapBuffer = currentChunk.split(/\s+/).slice(-Math.floor(overlap / 5));
      }
      
      const subChunks = createFixedChunks(trimmedSentence, maxChunkSize, overlap);
      chunks.push(...subChunks);
      
      if (subChunks.length > 0) {
        overlapBuffer = subChunks[subChunks.length - 1].split(/\s+/).slice(-Math.floor(overlap / 5));
      }
      currentChunk = '';
      continue;
    }
    
    if (currentChunk.length + trimmedSentence.length + 1 > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      
      const words = currentChunk.split(/\s+/);
      overlapBuffer = words.slice(-Math.floor(overlap / 5));
      
      currentChunk = overlapBuffer.join(' ') + ' ' + trimmedSentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// ============= PDF Extraction Helpers =============

export function extractTextFromPdfBytes(uint8Array: Uint8Array): string {
  let binaryString = '';
  const CHUNK_SIZE = 65536;
  
  for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
    const chunk = uint8Array.slice(i, Math.min(i + CHUNK_SIZE, uint8Array.length));
    for (let j = 0; j < chunk.length; j++) {
      binaryString += String.fromCharCode(chunk[j]);
    }
  }
  
  const textObjects: string[] = [];
  let inTextBlock = false;
  let currentBlock = '';
  let i = 0;
  
  while (i < binaryString.length - 1) {
    const twoChars = binaryString.substring(i, i + 2);
    
    if (!inTextBlock && twoChars === 'BT') {
      inTextBlock = true;
      currentBlock = '';
      i += 2;
      continue;
    }
    
    if (inTextBlock && twoChars === 'ET') {
      inTextBlock = false;
      const extractedFromBlock = extractTextFromPdfBlock(currentBlock);
      if (extractedFromBlock.trim()) {
        textObjects.push(extractedFromBlock);
      }
      i += 2;
      continue;
    }
    
    if (inTextBlock) {
      currentBlock += binaryString[i];
    }
    
    i++;
  }
  
  return textObjects.join(' ').replace(/\s+/g, ' ').trim();
}

function extractTextFromPdfBlock(textBlock: string): string {
  const parts: string[] = [];
  let i = 0;
  
  while (i < textBlock.length) {
    if (textBlock[i] === '(') {
      let depth = 1;
      let str = '';
      i++;
      while (i < textBlock.length && depth > 0) {
        if (textBlock[i] === '\\' && i + 1 < textBlock.length) {
          const nextChar = textBlock[i + 1];
          if (nextChar === 'n') { str += '\n'; i += 2; continue; }
          if (nextChar === 'r') { str += '\r'; i += 2; continue; }
          if (nextChar === 't') { str += '\t'; i += 2; continue; }
          if (nextChar === '(' || nextChar === ')' || nextChar === '\\') {
            str += nextChar;
            i += 2;
            continue;
          }
        }
        if (textBlock[i] === '(') depth++;
        if (textBlock[i] === ')') depth--;
        if (depth > 0) str += textBlock[i];
        i++;
      }
      if (str.trim()) parts.push(str);
    } else if (textBlock[i] === '<' && textBlock[i + 1] !== '<') {
      let hexStr = '';
      i++;
      while (i < textBlock.length && textBlock[i] !== '>') {
        if (/[0-9A-Fa-f]/.test(textBlock[i])) {
          hexStr += textBlock[i];
        }
        i++;
      }
      let decoded = '';
      for (let j = 0; j < hexStr.length; j += 2) {
        const charCode = parseInt(hexStr.substring(j, j + 2), 16);
        if (charCode >= 32 && charCode < 127) {
          decoded += String.fromCharCode(charCode);
        }
      }
      if (decoded.trim()) parts.push(decoded);
      i++;
    } else {
      i++;
    }
  }
  
  return parts.join(' ');
}
