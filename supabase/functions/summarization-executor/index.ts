// ============= Summarization Executor v2 =============
// Responsibility: Generate summary from stored extracted_text
// Input: documentId, projectId (references only)
// Output: StageResult<SummarizationResultData>
// Reads from: documents.extracted_text
// Writes to: documents.summary
// SECURITY: Includes prompt injection safeguards + internal auth
// Stateless - Internal function protected by shared secret auth
// SECURITY: Only callable by pipeline-orchestrator or other internal functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateInternalCall, unauthorizedResponse, logAuthAttempt } from '../_shared/internal-auth.ts';
import {
  validateSummarizationInput,
  buildStageResult,
  EXECUTOR_CONTRACTS,
  type StageResult,
  type SummarizationResultData,
  type SummarizationInput,
} from '../_shared/execution-contracts.ts';
import {
  createServiceClient,
  corsResponse,
  successResponse,
  getDocumentText,
  callLovableAI,
} from '../_shared/executor-utils.ts';
import {
  SAFE_SUMMARIZATION_PROMPT,
  sanitizeAIOutput,
  detectInjectionAttempts,
} from '../_shared/ai-safety.ts';

const VERSION = EXECUTOR_CONTRACTS.summarization.version;
const MAX_INPUT_LENGTH = 10000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  console.log(`[summarization-executor:${VERSION}] Request ${requestId} started`);

  // SECURITY: Validate internal authentication
  const authResult = validateInternalCall(req);
  logAuthAttempt('summarization-executor', authResult, requestId);

  if (!authResult.isAuthorized) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const input: unknown = await req.json();

    // Validate input contract strictly
    const validation = validateSummarizationInput(input);
    if (!validation.valid) {
      console.error(`[summarization-executor:${VERSION}] ${requestId} - Contract violation: ${validation.errors.join(', ')}`);
      const result = buildStageResult<SummarizationResultData>(
        false,
        VERSION,
        startTime,
        undefined,
        `Contract validation failed: ${validation.errors.join(', ')}`
      );
      return successResponse(result);
    }

    const { documentId } = input as SummarizationInput;
    const supabase = createServiceClient();

    // Read extracted text from database (reference-based)
    const { text: cleanedText, error: textError } = await getDocumentText(supabase, documentId);
    if (textError || !cleanedText) {
      throw new Error(textError || 'No extracted text available for summarization');
    }

    // SECURITY: Check for potential prompt injection attempts (for monitoring)
    const injectionCheck = detectInjectionAttempts(cleanedText);
    if (injectionCheck.detected) {
      console.warn(`[summarization-executor:${VERSION}] ${requestId} - Potential injection detected: ${injectionCheck.patterns.join(', ')}`);
      // Continue processing - the AI safety prompt will handle this
    }

    // Generate summary with SECURITY GUARDS
    const truncatedText = cleanedText.substring(0, MAX_INPUT_LENGTH);
    let summary = cleanedText.substring(0, 500) + '...'; // Fallback

    const { content, error: aiError } = await callLovableAI(
      'google/gemini-2.5-flash',
      [
        // SECURITY: Use safe system prompt with injection guards
        { role: 'system', content: SAFE_SUMMARIZATION_PROMPT },
        { role: 'user', content: `Process this document content and provide a summary:\n\n---BEGIN DOCUMENT CONTENT---\n${truncatedText}\n---END DOCUMENT CONTENT---` },
      ],
      25000
    );

    if (!aiError && content) {
      // SECURITY: Sanitize AI output as defense-in-depth
      summary = sanitizeAIOutput(content);
    } else {
      console.warn(`[summarization-executor:${VERSION}] ${requestId} - AI summarization failed, using fallback`);
    }

    const summaryStoredAt = new Date().toISOString();

    // Persist to database
    const { error: updateError } = await supabase
      .from('documents')
      .update({ summary })
      .eq('id', documentId);

    if (updateError) {
      console.error(`[summarization-executor:${VERSION}] ${requestId} - Failed to update: ${updateError.message}`);
    }

    console.log(`[summarization-executor:${VERSION}] ${requestId} - Summary: ${summary.length} chars`);

    const result = buildStageResult<SummarizationResultData>(
      true,
      VERSION,
      startTime,
      {
        summaryLength: summary.length,
        summaryStoredAt,
      },
      undefined,
      {
        inputSizeBytes: truncatedText.length,
        outputSizeBytes: summary.length,
        additionalInfo: { 
          injectionDetected: injectionCheck.detected,
          usedFallback: !!aiError 
        },
      }
    );

    return successResponse(result);

  } catch (error) {
    console.error(`[summarization-executor:${VERSION}] ${requestId} - Error:`, error);
    const result = buildStageResult<SummarizationResultData>(
      false,
      VERSION,
      startTime,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return successResponse(result);
  }
});
