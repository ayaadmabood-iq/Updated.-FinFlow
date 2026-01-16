/**
 * Multi-Modal Document Processing Edge Function
 *
 * Processes documents with multiple modalities: images, audio, video, and mixed content.
 * Supports GPT-4 Vision for images, Whisper for audio, and combined processing for complex documents.
 *
 * Features:
 * - Image analysis with GPT-4 Vision
 * - Audio transcription with Whisper
 * - Video processing (frames + audio)
 * - PDF with embedded images
 * - Multi-modal embeddings
 * - Comprehensive metadata extraction
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { executeAIRequest } from '../_shared/unified-ai-executor.ts';
import { checkRateLimit } from '../_shared/rate-limiter.ts';

interface ProcessingOptions {
  prompt?: string;
  language?: string;
  extractKeyFrames?: boolean;
  frameInterval?: number; // seconds
  includeSummary?: boolean;
  includeEmbedding?: boolean;
  detailLevel?: 'low' | 'medium' | 'high';
}

interface ProcessingResult {
  type: string;
  content: any;
  metadata: {
    model: string;
    url: string;
    processingTime: number;
    [key: string]: any;
  };
  embedding?: number[];
  summary?: string;
}

serve(async (req) => {
  // CORS handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  const startTime = Date.now();

  try {
    const { documentUrl, documentType, options = {} }: {
      documentUrl: string;
      documentType: 'image' | 'audio' | 'video' | 'pdf_with_images';
      options?: ProcessingOptions;
    } = await req.json();

    // Validation
    if (!documentUrl || !documentType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: documentUrl, documentType' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting (5 requests per minute for heavy processing)
    const rateLimitResult = await checkRateLimit(supabase, user.id, 'process-multimodal', 5, 60);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Process based on document type
    let result: ProcessingResult;

    switch (documentType) {
      case 'image':
        result = await processImage(documentUrl, options, user.id);
        break;
      case 'audio':
        result = await processAudio(documentUrl, options, user.id);
        break;
      case 'video':
        result = await processVideo(documentUrl, options, user.id);
        break;
      case 'pdf_with_images':
        result = await processPDFWithImages(documentUrl, options, user.id);
        break;
      default:
        throw new Error(`Unsupported document type: ${documentType}`);
    }

    // Add processing time
    result.metadata.processingTime = Date.now() - startTime;

    // Generate embedding if requested
    if (options.includeEmbedding) {
      result.embedding = await generateMultiModalEmbedding(result, user.id);
    }

    // Generate summary if requested
    if (options.includeSummary) {
      result.summary = await generateSummary(result, user.id);
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );

  } catch (error) {
    console.error('Error in process-multimodal-document:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to process multi-modal document',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
});

/**
 * Process image using GPT-4 Vision
 */
async function processImage(
  imageUrl: string,
  options: ProcessingOptions,
  userId: string
): Promise<ProcessingResult> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Determine detail level
  const detail = options.detailLevel || 'high';

  // Construct prompt
  const prompt = options.prompt || `Analyze this image comprehensively. Include:
1. Overall description and context
2. All visible text (OCR)
3. Objects and their relationships
4. Colors, composition, and style
5. Any data, charts, or diagrams
6. Potential use cases or purpose
7. Quality and technical aspects

Provide the analysis in a structured format.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: detail,
              },
            },
          ],
        },
      ],
      max_tokens: detail === 'low' ? 500 : detail === 'medium' ? 1000 : 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Image processing failed: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  // Parse structured content if possible
  const content = data.choices[0].message.content;
  let structured;
  try {
    // Attempt to parse if response is JSON
    structured = JSON.parse(content);
  } catch {
    // If not JSON, structure the text response
    structured = {
      description: content,
      text: extractTextFromContent(content),
      objects: extractObjectsFromContent(content),
    };
  }

  return {
    type: 'image',
    content: structured,
    metadata: {
      model: 'gpt-4-vision-preview',
      url: imageUrl,
      detail: detail,
      tokensUsed: data.usage.total_tokens,
      processingTime: 0,
    },
  };
}

/**
 * Process audio using Whisper
 */
async function processAudio(
  audioUrl: string,
  options: ProcessingOptions,
  userId: string
): Promise<ProcessingResult> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Download audio file
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
  }

  const audioBlob = await audioResponse.blob();

  // Transcribe using Whisper
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.mp3');
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json'); // Get timestamps

  if (options.language) {
    formData.append('language', options.language);
  }

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Audio processing failed: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  // Extract segments with timestamps
  const segments = data.segments?.map((seg: any) => ({
    text: seg.text,
    start: seg.start,
    end: seg.end,
    confidence: seg.no_speech_prob ? 1 - seg.no_speech_prob : undefined,
  })) || [];

  return {
    type: 'audio',
    content: {
      transcription: data.text,
      language: data.language,
      duration: data.duration,
      segments: segments,
    },
    metadata: {
      model: 'whisper-1',
      url: audioUrl,
      language: options.language || 'auto',
      processingTime: 0,
    },
  };
}

/**
 * Process video (extract frames + audio)
 */
async function processVideo(
  videoUrl: string,
  options: ProcessingOptions,
  userId: string
): Promise<ProcessingResult> {
  const extractKeyFrames = options.extractKeyFrames ?? true;
  const frameInterval = options.frameInterval || 5; // seconds

  // For now, this is a simplified implementation
  // In production, you would:
  // 1. Use FFmpeg to extract frames at intervals
  // 2. Process each frame with GPT-4 Vision
  // 3. Extract audio and transcribe with Whisper
  // 4. Combine timeline of events

  // Simplified: Just extract audio for now
  const audioResult = await processAudio(videoUrl, options, userId);

  return {
    type: 'video',
    content: {
      transcription: audioResult.content.transcription,
      language: audioResult.content.language,
      duration: audioResult.content.duration,
      segments: audioResult.content.segments,
      frames: [], // Would contain frame analyses
      timeline: generateTimeline(audioResult.content.segments),
    },
    metadata: {
      model: 'whisper-1 + gpt-4-vision',
      url: videoUrl,
      frameInterval: frameInterval,
      keyFramesExtracted: 0, // Would be actual count
      processingTime: 0,
    },
  };
}

/**
 * Process PDF with embedded images
 */
async function processPDFWithImages(
  pdfUrl: string,
  options: ProcessingOptions,
  userId: string
): Promise<ProcessingResult> {
  // This would require:
  // 1. PDF parsing library to extract text and images
  // 2. Process each image with GPT-4 Vision
  // 3. Combine text and image descriptions into cohesive document

  // For now, return a placeholder
  // In production, use a library like pdf-parse or pdf.js

  return {
    type: 'pdf_with_images',
    content: {
      text: 'PDF text extraction not yet implemented',
      images: [],
      pages: [],
      combined: 'Combined analysis not yet available',
    },
    metadata: {
      model: 'gpt-4-vision + text-extraction',
      url: pdfUrl,
      pageCount: 0,
      imageCount: 0,
      processingTime: 0,
    },
  };
}

/**
 * Generate multi-modal embedding
 */
async function generateMultiModalEmbedding(
  result: ProcessingResult,
  userId: string
): Promise<number[]> {
  // Combine all text content from the multi-modal result
  let combinedText = '';

  switch (result.type) {
    case 'image':
      combinedText = typeof result.content.description === 'string'
        ? result.content.description
        : JSON.stringify(result.content);
      break;
    case 'audio':
    case 'video':
      combinedText = result.content.transcription;
      break;
    case 'pdf_with_images':
      combinedText = result.content.text + '\n\n' + result.content.combined;
      break;
  }

  // Generate embedding using OpenAI
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: combinedText.substring(0, 8000), // Limit to avoid token limits
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate embedding');
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Generate summary of multi-modal content
 */
async function generateSummary(
  result: ProcessingResult,
  userId: string
): Promise<string> {
  let content = '';

  switch (result.type) {
    case 'image':
      content = `Image Analysis:\n${typeof result.content.description === 'string'
        ? result.content.description
        : JSON.stringify(result.content, null, 2)}`;
      break;
    case 'audio':
      content = `Audio Transcription (${result.content.language}):\n${result.content.transcription}`;
      break;
    case 'video':
      content = `Video Content:\nAudio: ${result.content.transcription}\nDuration: ${result.content.duration}s`;
      break;
    case 'pdf_with_images':
      content = `PDF Content:\n${result.content.text}\n\nImages: ${result.content.combined}`;
      break;
  }

  // Use unified AI executor to generate summary
  const summaryResult = await executeAIRequest({
    userId,
    projectId: 'multimodal',
    operation: 'custom',
    userInput: `Provide a concise summary (2-3 sentences) of this multi-modal content:\n\n${content.substring(0, 4000)}`,
    systemPrompt: 'You are an expert at summarizing multi-modal content. Focus on the key information and insights.',
    maxTokens: 200,
    temperature: 0.3,
  });

  return summaryResult.response || 'Summary generation failed';
}

/**
 * Helper: Extract text mentions from image description
 */
function extractTextFromContent(content: string): string[] {
  const textRegex = /"([^"]+)"|'([^']+)'|text:\s*([^\n]+)/gi;
  const matches: string[] = [];
  let match;

  while ((match = textRegex.exec(content)) !== null) {
    matches.push(match[1] || match[2] || match[3]);
  }

  return matches.filter(Boolean);
}

/**
 * Helper: Extract object mentions from image description
 */
function extractObjectsFromContent(content: string): string[] {
  // Simple extraction - in production use more sophisticated NLP
  const objectKeywords = [
    'person', 'people', 'man', 'woman', 'child',
    'car', 'vehicle', 'building', 'tree', 'animal',
    'chair', 'table', 'computer', 'phone', 'book',
    'document', 'chart', 'graph', 'diagram'
  ];

  const objects: string[] = [];
  const lowerContent = content.toLowerCase();

  for (const keyword of objectKeywords) {
    if (lowerContent.includes(keyword)) {
      objects.push(keyword);
    }
  }

  return Array.from(new Set(objects));
}

/**
 * Helper: Generate timeline from audio segments
 */
function generateTimeline(segments: any[]): Array<{
  timestamp: string;
  event: string;
}> {
  return segments.map(seg => ({
    timestamp: formatTimestamp(seg.start),
    event: seg.text.trim(),
  }));
}

/**
 * Helper: Format timestamp (seconds to MM:SS)
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
