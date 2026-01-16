// ============= Extraction Executor v2 =============
// Responsibility: Extract text from document and store in DB
// Input: documentId, storagePath, mimeType, projectId (references only)
// Output: StageResult<ExtractionResultData>
// Stateless - Internal function protected by shared secret auth
// SECURITY: Only callable by pipeline-orchestrator or other internal functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateInternalCall, unauthorizedResponse, logAuthAttempt } from '../_shared/internal-auth.ts';
import JSZip from "https://esm.sh/jszip@3.10.1";
import {
  validateExtractionInput,
  buildStageResult,
  EXECUTOR_CONTRACTS,
  type StageResult,
  type ExtractionResultData,
  type ExtractionInput,
} from '../_shared/execution-contracts.ts';
import {
  TEXT_MIME_TYPES,
  PDF_MIME_TYPE,
  DOCX_MIME_TYPES,
  AUDIO_MIME_TYPES,
  VIDEO_MIME_TYPES,
  IMAGE_MIME_TYPES,
} from '../_shared/pipeline-types.ts';
import {
  cleanText,
  extractCleanTextFromHTML,
  extractTextFromPdfBytes,
} from '../_shared/stage-helpers.ts';
import {
  createServiceClient,
  corsResponse,
  successResponse,
  downloadFromStorage,
  callLovableAI,
  callWhisperTranscription,
} from '../_shared/executor-utils.ts';
import {
  computeTextHash,
  updateAfterExtraction,
} from '../_shared/artifact-registry.ts';

const VERSION = EXECUTOR_CONTRACTS.extraction.version;
const MAX_TEXT_LENGTH = 100000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  console.log(`[extraction-executor:${VERSION}] Request ${requestId} started`);

  // SECURITY: Validate internal authentication
  const authResult = validateInternalCall(req);
  logAuthAttempt('extraction-executor', authResult, requestId);

  if (!authResult.isAuthorized) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const input: unknown = await req.json();

    // Validate input contract strictly
    const validation = validateExtractionInput(input);
    if (!validation.valid) {
      console.error(`[extraction-executor:${VERSION}] ${requestId} - Contract violation: ${validation.errors.join(', ')}`);
      const result = buildStageResult<ExtractionResultData>(
        false,
        VERSION,
        startTime,
        undefined,
        `Contract validation failed: ${validation.errors.join(', ')}`
      );
      return successResponse(result);
    }

    const { documentId, storagePath, mimeType } = input as ExtractionInput;
    console.log(`[extraction-executor:${VERSION}] ${requestId} - Extracting from ${mimeType}`);

    const supabase = createServiceClient();

    let extractedText = '';
    let extractionMethod = 'unknown';

    // Extract based on MIME type
    if (TEXT_MIME_TYPES.includes(mimeType)) {
      const result = await extractTextFromPlainFile(supabase, storagePath, mimeType);
      if (result.error) throw new Error(result.error);
      extractedText = result.text!;
      extractionMethod = 'plain_text';
    } else if (mimeType === PDF_MIME_TYPE) {
      const result = await extractTextFromPdf(supabase, storagePath);
      if (result.error) throw new Error(result.error);
      extractedText = result.text!;
      extractionMethod = 'pdf';
    } else if (DOCX_MIME_TYPES.includes(mimeType)) {
      const result = await extractTextFromDocx(supabase, storagePath);
      if (result.error) throw new Error(result.error);
      extractedText = result.text!;
      extractionMethod = 'docx';
    } else if (AUDIO_MIME_TYPES.includes(mimeType) || VIDEO_MIME_TYPES.includes(mimeType)) {
      const result = await transcribeAudioFile(supabase, storagePath);
      if (result.error) throw new Error(result.error);
      extractedText = result.text!;
      extractionMethod = AUDIO_MIME_TYPES.includes(mimeType) ? 'audio_whisper' : 'video_whisper';
    } else if (IMAGE_MIME_TYPES.includes(mimeType)) {
      const result = await extractTextFromImage(supabase, storagePath, mimeType);
      if (result.error) throw new Error(result.error);
      extractedText = result.text!;
      extractionMethod = 'ocr';
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the document');
    }

    const inputLength = extractedText.length;

    // Truncate if needed
    if (extractedText.length > MAX_TEXT_LENGTH) {
      console.log(`[extraction-executor:${VERSION}] ${requestId} - Truncating from ${extractedText.length} to ${MAX_TEXT_LENGTH}`);
      extractedText = extractedText.substring(0, MAX_TEXT_LENGTH) + '\n\n[Text truncated due to size limit]';
    }

    const cleanedText = cleanText(extractedText);
    const textStoredAt = new Date().toISOString();
    const extractedTextHash = computeTextHash(cleanedText);

    // Persist to database
    const { error: updateError } = await supabase
      .from('documents')
      .update({ extracted_text: cleanedText })
      .eq('id', documentId);

    if (updateError) {
      throw new Error(`Failed to store extracted text: ${updateError.message}`);
    }

    // Update artifact metadata
    await updateAfterExtraction(supabase, documentId, extractedTextHash);

    console.log(`[extraction-executor:${VERSION}] ${requestId} - Extracted ${cleanedText.length} chars via ${extractionMethod}, hash: ${extractedTextHash}`);

    const result = buildStageResult<ExtractionResultData>(
      true,
      VERSION,
      startTime,
      {
        extractedLength: extractedText.length,
        cleanedLength: cleanedText.length,
        extractionMethod,
        textStoredAt,
        extractedTextHash,
      },
      undefined,
      {
        inputSizeBytes: inputLength,
        outputSizeBytes: cleanedText.length,
        additionalInfo: { method: extractionMethod },
      }
    );

    return successResponse(result);

  } catch (error) {
    console.error(`[extraction-executor:${VERSION}] ${requestId} - Error:`, error);
    const result = buildStageResult<ExtractionResultData>(
      false,
      VERSION,
      startTime,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return successResponse(result);
  }
});

// ============= Extraction Helpers =============

async function extractTextFromPlainFile(
  supabase: ReturnType<typeof createServiceClient>,
  storagePath: string,
  mimeType: string
): Promise<{ text: string | null; error: string | null }> {
  const { data, error } = await downloadFromStorage(supabase, storagePath);
  if (error || !data) return { text: null, error };

  const text = await data.text();
  
  if (mimeType === 'text/html' || mimeType === 'application/xhtml+xml') {
    return { text: extractCleanTextFromHTML(text), error: null };
  }
  
  return { text, error: null };
}

async function extractTextFromPdf(
  supabase: ReturnType<typeof createServiceClient>,
  storagePath: string
): Promise<{ text: string | null; error: string | null }> {
  const { data, error } = await downloadFromStorage(supabase, storagePath);
  if (error || !data) return { text: null, error };

  const arrayBuffer = await data.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Try direct extraction first
  let text = '';
  try {
    text = extractTextFromPdfBytes(uint8Array);
  } catch (directError) {
    console.warn('Direct PDF extraction failed:', directError);
  }

  if (text && text.trim().length > 100) {
    return { text, error: null };
  }

  // Fall back to OCR
  console.log('PDF appears image-based, using OCR...');
  return await extractTextFromPdfWithOCR(data);
}

async function extractTextFromPdfWithOCR(blob: Blob): Promise<{ text: string | null; error: string | null }> {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  let base64 = '';
  const CHUNK_SIZE = 32768;
  for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
    const chunk = uint8Array.slice(i, Math.min(i + CHUNK_SIZE, uint8Array.length));
    base64 += btoa(String.fromCharCode.apply(null, Array.from(chunk)));
  }

  const { content, error } = await callLovableAI(
    'google/gemini-2.5-flash',
    [{
      role: 'user',
      content: [
        { type: 'text', text: 'Extract ALL text content from this PDF document. Return only the extracted text, preserving paragraphs and structure. Do not add any commentary.' },
        { type: 'image_url', image_url: { url: `data:application/pdf;base64,${base64}` } },
      ],
    }],
    30000
  );

  return { text: content, error };
}

async function extractTextFromDocx(
  supabase: ReturnType<typeof createServiceClient>,
  storagePath: string
): Promise<{ text: string | null; error: string | null }> {
  const { data, error } = await downloadFromStorage(supabase, storagePath);
  if (error || !data) return { text: null, error };

  const arrayBuffer = await data.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');

  if (!documentXml) {
    return { text: null, error: 'Could not find document.xml in DOCX file' };
  }

  let text = documentXml
    .replace(/<w:p[^>]*>/gi, '\n')
    .replace(/<w:br[^>]*>/gi, '\n')
    .replace(/<w:tab[^>]*>/gi, '\t')
    .replace(/<w:t[^>]*>([^<]*)<\/w:t>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .trim();

  if (!text || text.length === 0) {
    return { text: null, error: 'No text content found in DOCX' };
  }

  return { text, error: null };
}

async function transcribeAudioFile(
  supabase: ReturnType<typeof createServiceClient>,
  storagePath: string
): Promise<{ text: string | null; error: string | null }> {
  const { data, error } = await downloadFromStorage(supabase, storagePath);
  if (error || !data) return { text: null, error };

  return await callWhisperTranscription(data);
}

async function extractTextFromImage(
  supabase: ReturnType<typeof createServiceClient>,
  storagePath: string,
  mimeType: string
): Promise<{ text: string | null; error: string | null }> {
  const { data, error } = await downloadFromStorage(supabase, storagePath);
  if (error || !data) return { text: null, error };

  const arrayBuffer = await data.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  const { content, error: aiError } = await callLovableAI(
    'google/gemini-2.5-flash',
    [{
      role: 'user',
      content: [
        { type: 'text', text: 'Perform OCR on this image. Extract ALL text content visible. Return ONLY the extracted text without commentary. If no text is found, return "NO_TEXT_FOUND".' },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
      ],
    }]
  );

  if (aiError) return { text: null, error: aiError };
  if (content === 'NO_TEXT_FOUND' || !content?.trim()) {
    return { text: null, error: 'No text could be extracted from the image' };
  }

  return { text: content, error: null };
}
