// ============= Language Executor v2 =============
// Responsibility: Detect language from stored extracted_text
// Input: documentId, projectId (references only)
// Output: StageResult<LanguageResultData>
// Reads from: documents.extracted_text
// Writes to: documents.language
// Stateless - Internal function protected by shared secret auth
// SECURITY: Only callable by pipeline-orchestrator or other internal functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateInternalCall, unauthorizedResponse, logAuthAttempt } from '../_shared/internal-auth.ts';
import {
  validateLanguageInput,
  buildStageResult,
  isRTLLanguage,
  EXECUTOR_CONTRACTS,
  type StageResult,
  type LanguageResultData,
  type LanguageInput,
} from '../_shared/execution-contracts.ts';
import {
  createServiceClient,
  corsResponse,
  successResponse,
  getDocumentText,
  callLovableAI,
} from '../_shared/executor-utils.ts';

const VERSION = EXECUTOR_CONTRACTS.language.version;
const SAMPLE_LENGTH = 1000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  console.log(`[language-executor:${VERSION}] Request ${requestId} started`);

  // SECURITY: Validate internal authentication
  const authResult = validateInternalCall(req);
  logAuthAttempt('language-executor', authResult, requestId);

  if (!authResult.isAuthorized) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const input: unknown = await req.json();

    // Validate input contract strictly
    const validation = validateLanguageInput(input);
    if (!validation.valid) {
      console.error(`[language-executor:${VERSION}] ${requestId} - Contract violation: ${validation.errors.join(', ')}`);
      const result = buildStageResult<LanguageResultData>(
        false,
        VERSION,
        startTime,
        undefined,
        `Contract validation failed: ${validation.errors.join(', ')}`
      );
      return successResponse(result);
    }

    const { documentId } = input as LanguageInput;
    const supabase = createServiceClient();

    // Read extracted text from database (reference-based - not passed as parameter)
    const { text, error: textError } = await getDocumentText(supabase, documentId);
    
    if (textError || !text) {
      console.error(`[language-executor:${VERSION}] ${requestId} - No extracted text found`);
      const result = buildStageResult<LanguageResultData>(
        false,
        VERSION,
        startTime,
        undefined,
        textError || 'No extracted text available for language detection'
      );
      return successResponse(result);
    }

    // Detect language using AI
    const sampleText = text.substring(0, SAMPLE_LENGTH);
    let language = 'en';
    let confidence: number | undefined;

    const { content, error: aiError } = await callLovableAI(
      'google/gemini-2.5-flash-lite',
      [
        { role: 'system', content: 'You are a language detection assistant. Respond with only the ISO 639-1 language code (e.g., "en", "es", "fr", "de", "zh", "ja", "ar"). For Arabic text, respond with "ar".' },
        { role: 'user', content: `Detect the language of this text:\n\n${sampleText}` },
      ],
      15000
    );

    if (!aiError && content) {
      language = content.trim().toLowerCase().substring(0, 5);
      // Simple confidence based on whether we got a valid-looking code
      confidence = /^[a-z]{2,3}(-[a-z]{2})?$/.test(language) ? 0.9 : 0.6;
    } else {
      console.warn(`[language-executor:${VERSION}] ${requestId} - AI detection failed, defaulting to 'en'`);
    }

    const isRTL = isRTLLanguage(language);

    // Persist to database
    const { error: updateError } = await supabase
      .from('documents')
      .update({ language })
      .eq('id', documentId);

    if (updateError) {
      console.error(`[language-executor:${VERSION}] ${requestId} - Failed to update: ${updateError.message}`);
    }

    console.log(`[language-executor:${VERSION}] ${requestId} - Detected language: ${language}, RTL: ${isRTL}`);

    const result = buildStageResult<LanguageResultData>(
      true,
      VERSION,
      startTime,
      {
        language,
        confidence,
        isRTL,
      },
      undefined,
      {
        inputSizeBytes: sampleText.length,
        additionalInfo: { detectionMethod: aiError ? 'fallback' : 'ai' },
      }
    );

    return successResponse(result);

  } catch (error) {
    console.error(`[language-executor:${VERSION}] ${requestId} - Error:`, error);
    const result = buildStageResult<LanguageResultData>(
      false,
      VERSION,
      startTime,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return successResponse(result);
  }
});
