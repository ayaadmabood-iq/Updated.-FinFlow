// ============= Ingestion Executor v2 =============
// Responsibility: Validate document exists in storage
// Input: documentId, storagePath, projectId (references only)
// Output: StageResult<IngestionResultData>
// Stateless - Internal function protected by shared secret auth
// SECURITY: Only callable by pipeline-orchestrator or other internal functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateInternalCall, unauthorizedResponse, logAuthAttempt } from '../_shared/internal-auth.ts';
import {
  validateIngestionInput,
  buildStageResult,
  EXECUTOR_CONTRACTS,
  type StageResult,
  type IngestionResultData,
  type IngestionInput,
} from '../_shared/execution-contracts.ts';
import {
  createServiceClient,
  corsResponse,
  successResponse,
  downloadFromStorage,
} from '../_shared/executor-utils.ts';

const VERSION = EXECUTOR_CONTRACTS.ingestion.version;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  console.log(`[ingestion-executor:${VERSION}] Request ${requestId} started`);

  // SECURITY: Validate internal authentication
  const authResult = validateInternalCall(req);
  logAuthAttempt('ingestion-executor', authResult, requestId);

  if (!authResult.isAuthorized) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const input: unknown = await req.json();

    // Validate input contract strictly
    const validation = validateIngestionInput(input);
    if (!validation.valid) {
      console.error(`[ingestion-executor:${VERSION}] ${requestId} - Contract violation: ${validation.errors.join(', ')}`);
      const result = buildStageResult<IngestionResultData>(
        false,
        VERSION,
        startTime,
        undefined,
        `Contract validation failed: ${validation.errors.join(', ')}`
      );
      return successResponse(result);
    }

    const { documentId, storagePath } = input as IngestionInput;
    console.log(`[ingestion-executor:${VERSION}] ${requestId} - Validating document ${documentId}`);

    const supabase = createServiceClient();

    // Download to validate storage access and get size
    const { data, error } = await downloadFromStorage(supabase, storagePath);
    
    if (error || !data) {
      console.error(`[ingestion-executor:${VERSION}] ${requestId} - Storage access failed: ${error}`);
      const result = buildStageResult<IngestionResultData>(
        false,
        VERSION,
        startTime,
        undefined,
        `Failed to access document in storage: ${error}`
      );
      return successResponse(result);
    }

    const arrayBuffer = await data.arrayBuffer();
    const bytesDownloaded = arrayBuffer.byteLength;

    console.log(`[ingestion-executor:${VERSION}] ${requestId} - Validated ${bytesDownloaded} bytes`);

    const result = buildStageResult<IngestionResultData>(
      true,
      VERSION,
      startTime,
      {
        bytesDownloaded,
        validated: true,
        storagePath,
      },
      undefined,
      { inputSizeBytes: bytesDownloaded }
    );

    return successResponse(result);

  } catch (error) {
    console.error(`[ingestion-executor:${VERSION}] ${requestId} - Error:`, error);
    const result = buildStageResult<IngestionResultData>(
      false,
      VERSION,
      startTime,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return successResponse(result);
  }
});
