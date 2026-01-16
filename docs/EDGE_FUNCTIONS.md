# FineFlow Edge Functions Reference

## Overview

All Edge Functions are deployed to Supabase and run on Deno. They require JWT authentication via the `Authorization: Bearer <token>` header unless noted otherwise.

## Function Catalog

### Document Processing

#### process-document
**Purpose:** Pipeline orchestrator - processes documents through 6 stages.

**Request:**
```json
{
  "documentId": "uuid",
  "resumeFrom": "chunking",    // optional: stage to resume from
  "forceReprocess": false      // optional: ignore cached results
}
```

**Response:**
```json
{
  "success": true,
  "documentId": "uuid",
  "status": "ready",
  "stages": [
    { "stage": "ingestion", "status": "completed", "duration_ms": 150 },
    { "stage": "text_extraction", "status": "completed", "duration_ms": 1200 }
    // ...
  ]
}
```

**Error Codes:**
- 401: Unauthorized
- 404: Document not found
- 429: Processing quota exceeded

**Side Effects:**
- Updates `documents.status`, `processing_steps`, `processing_metadata`
- Creates/updates `chunks` table entries
- Increments `usage_limits.processing_count`
- Creates notification on completion/failure

---

#### ingestion-executor
**Purpose:** Stage 1 - Validates document exists in storage.

**Request:**
```json
{
  "documentId": "uuid",
  "projectId": "uuid",
  "storagePath": "user/project/file.pdf",
  "version": "v1"
}
```

**Response:**
```json
{
  "success": true,
  "version": "v1",
  "data": {
    "bytesDownloaded": 12345,
    "validated": true,
    "storagePath": "user/project/file.pdf"
  }
}
```

**Side Effects:** None (validation only)

---

#### extraction-executor
**Purpose:** Stage 2 - Extracts text from document.

**Request:**
```json
{
  "documentId": "uuid",
  "projectId": "uuid",
  "storagePath": "path/to/file",
  "mimeType": "application/pdf",
  "version": "v1"
}
```

**Response:**
```json
{
  "success": true,
  "version": "v1",
  "data": {
    "extractedLength": 50000,
    "cleanedLength": 48000,
    "extractionMethod": "pdf-parse",
    "textStoredAt": "documents.extracted_text",
    "extractedTextHash": "a1b2c3d4"
  }
}
```

**Side Effects:**
- Updates `documents.extracted_text`
- Updates `documents.processing_metadata`

---

#### language-executor
**Purpose:** Stage 3 - Detects document language.

**Request:**
```json
{
  "documentId": "uuid",
  "projectId": "uuid",
  "version": "v1"
}
```

**Response:**
```json
{
  "success": true,
  "version": "v1",
  "data": {
    "language": "en",
    "confidence": 0.98
  }
}
```

**Side Effects:**
- Updates `documents.language`

---

#### chunking-executor
**Purpose:** Stage 4 - Splits text into chunks.

**Request:**
```json
{
  "documentId": "uuid",
  "projectId": "uuid",
  "chunkSize": 1000,
  "chunkOverlap": 200,
  "chunkStrategy": "fixed",
  "version": "v2"
}
```

**Response:**
```json
{
  "success": true,
  "version": "v2",
  "data": {
    "chunkCount": 25,
    "duplicateCount": 2,
    "wordCount": 5000,
    "qualityScore": 0.85,
    "chunkIds": ["uuid1", "uuid2", ...],
    "chunkingConfig": { "size": 1000, "overlap": 200, "strategy": "fixed" },
    "chunkingConfigHash": "abc123"
  }
}
```

**Side Effects:**
- Deletes existing chunks for document
- Inserts new chunks
- Updates `documents.word_count`, `quality_score`

---

#### summarization-executor
**Purpose:** Stage 5 - Generates document summary (optional).

**Request:**
```json
{
  "documentId": "uuid",
  "projectId": "uuid",
  "version": "v1"
}
```

**Response:**
```json
{
  "success": true,
  "version": "v1",
  "data": {
    "summaryLength": 500,
    "summaryStoredAt": "documents.summary"
  }
}
```

**Side Effects:**
- Updates `documents.summary`
- Calls Lovable AI Gateway

---

#### indexing-executor
**Purpose:** Stage 6 - Generates embeddings (optional).

**Request:**
```json
{
  "documentId": "uuid",
  "projectId": "uuid",
  "version": "v1"
}
```

**Response:**
```json
{
  "success": true,
  "version": "v1",
  "data": {
    "documentEmbedding": true,
    "chunkEmbeddingsCount": 25,
    "embeddedChunkIds": ["uuid1", ...],
    "embeddingModel": "text-embedding-3-small",
    "embeddingModelVersion": "2024-01"
  }
}
```

**Side Effects:**
- Updates `documents.embedding`
- Updates `chunks.embedding` for all chunks
- Requires OPENAI_API_KEY secret

---

#### delete-document
**Purpose:** Soft-delete a document and clean up.

**Request:**
```json
{
  "id": "uuid"
}
```

**Response:**
```json
{
  "success": true
}
```

**Side Effects:**
- Sets `documents.deleted_at`
- Decrements `usage_limits.documents_count`
- Decrements `usage_limits.storage_bytes`
- Deletes file from storage (optional)

---

### Search

#### semantic-search
**Purpose:** Hybrid search across documents and chunks.

**Request:**
```json
{
  "query": "search text",
  "projectId": "uuid",           // optional
  "fileTypes": ["application/pdf"], // optional
  "language": "en",              // optional
  "dateFrom": "2024-01-01",      // optional
  "dateTo": "2024-12-31",        // optional
  "limit": 10,                   // default: 10
  "threshold": 0.5,              // default: 0.5
  "searchChunks": true,          // default: true
  "searchMode": "hybrid"         // hybrid, semantic, fulltext
}
```

**Response:**
```json
{
  "success": true,
  "query": "search text",
  "searchMode": "hybrid",
  "results": [
    {
      "id": "uuid",
      "type": "document",
      "name": "file.pdf",
      "similarity": 0.85,
      "semanticScore": 0.80,
      "fulltextScore": 0.90,
      "matchedSnippet": "...highlighted text..."
    }
  ],
  "totalResults": 5,
  "searchDurationMs": 150
}
```

**External Calls:** OpenAI Embeddings API (if semantic mode)

---

#### generate-embedding
**Purpose:** Generate embedding for a single document.

**Request:**
```json
{
  "documentId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "documentEmbedding": true,
  "chunkEmbeddings": 25
}
```

---

### Training & Datasets

#### generate-training-data
**Purpose:** Generate Q&A pairs from document chunks.

**Request:**
```json
{
  "projectId": "uuid",
  "datasetName": "My Dataset",
  "format": "openai",
  "mode": "qa",
  "systemPrompt": "You are a helpful assistant",
  "documentIds": ["uuid1", "uuid2"]  // optional
}
```

**Response:**
```json
{
  "success": true,
  "datasetId": "uuid",
  "totalPairs": 50,
  "totalTokens": 25000,
  "estimatedCost": 0.20,
  "validation": {
    "valid": true,
    "errors": [],
    "warnings": ["Some pairs have short responses"],
    "stats": {
      "totalPairs": 50,
      "avgTokensPerPair": 500,
      "avgQualityScore": 0.85
    }
  }
}
```

**Side Effects:**
- Creates `training_datasets` record
- Creates `training_pairs` records
- Calls Lovable AI Gateway for pair generation

**AI Safety:**
- Uses SAFE_TRAINING_DATA_PROMPT with injection guards
- Sanitizes AI output before parsing
- Filters pairs with detected injection attempts

---

#### start-training
**Purpose:** Submit dataset to OpenAI for fine-tuning.

**Request:**
```json
{
  "datasetId": "uuid",
  "baseModel": "gpt-4o-mini-2024-07-18",
  "apiKey": "sk-...",
  "trainingConfig": {
    "nEpochs": 3,
    "batchSize": 4,
    "learningRateMultiplier": 1.0
  }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "uuid",
  "status": "uploading",
  "message": "Training job started"
}
```

**Side Effects:**
- Creates `training_jobs` record
- Updates `training_datasets.status` to 'training'
- Uploads file to OpenAI
- Creates fine-tuning job at OpenAI
- Background polling for completion

**External Calls:** OpenAI Files API, Fine-tuning API

---

#### cancel-training
**Purpose:** Cancel an in-progress training job.

**Request:**
```json
{
  "jobId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Training job cancelled successfully"
}
```

**Side Effects:**
- Updates `training_jobs.status` to 'cancelled'
- Updates `training_datasets.status` to 'ready'
- Calls OpenAI cancel endpoint (if provider_job_id exists)

---

#### check-training-status
**Purpose:** Check status of a training job.

**Request:**
```json
{
  "jobId": "uuid"
}
```

**Response:**
```json
{
  "status": "training",
  "progress": 60,
  "currentStep": "Training... (12000 tokens trained)"
}
```

---

#### validate-dataset
**Purpose:** Validate dataset before training.

**Request:**
```json
{
  "datasetId": "uuid"
}
```

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": [],
  "stats": {
    "totalPairs": 100,
    "avgTokensPerPair": 450
  }
}
```

---

### Budget & Quotas

#### check-budget
**Purpose:** Check if operation is within budget.

**Request:**
```json
{
  "projectId": "uuid",
  "estimatedCost": 0.05,
  "config": {}  // optional operation config
}
```

**Response:**
```json
{
  "allowed": true,
  "message": "Within budget",
  "remainingBudget": 45.50,
  "estimatedCost": 0.05,
  "monthSpent": 4.50,
  "monthlyBudget": 50.00,
  "percentUsed": 9,
  "projectedMonthEnd": 15.00,
  "enforceMode": "warn"
}
```

---

#### budget-report
**Purpose:** Get detailed budget report.

**Request:**
```json
{
  "projectId": "uuid"
}
```

**Response:**
```json
{
  "summary": { ... },
  "costBreakdown": [...],
  "savings": { ... },
  "recommendations": [...],
  "recentDecisions": [...],
  "dailySpending": [...]
}
```

---

#### quota-status
**Purpose:** Get current user quota status.

**Request:** None (uses auth token)

**Response:**
```json
{
  "tier": "free",
  "documents": { "current": 5, "limit": 10 },
  "processing": { "current": 12, "limit": 20, "resetDate": "2024-02-01" },
  "storage": { "current": 52428800, "limit": 104857600 }
}
```

---

### Admin Functions

#### admin-stats
**Purpose:** Get system-wide statistics (admin only).

**Response:**
```json
{
  "totalUsers": 150,
  "totalDocuments": 1200,
  "totalStorageBytes": 5368709120,
  "totalProcessingCount": 3500,
  "usersByTier": { "free": 100, "starter": 30, "pro": 15, "enterprise": 5 },
  "usersByRole": { "user": 145, "admin": 5 }
}
```

---

#### admin-metrics
**Purpose:** Get processing metrics (admin only).

**Response:**
```json
{
  "overview": {
    "totalProcessed": 1200,
    "totalErrors": 50,
    "overallSuccessRate": 95.8,
    "avgProcessingTimeMs": 15000
  },
  "processingStageMetrics": [...],
  "fileTypeMetrics": [...],
  "mostActiveUsers": [...],
  "mostActiveProjects": [...],
  "processingTrends": [...]
}
```

---

#### admin-users
**Purpose:** List/update users (admin only).

**GET Response:**
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "pageSize": 20,
  "totalPages": 8
}
```

**PATCH Request:**
```json
{
  "userId": "uuid",
  "role": "admin",
  "subscriptionTier": "pro",
  "status": "active"
}
```

---

### Utility Functions

#### health
**Purpose:** Health check endpoint (no auth required).

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

---

#### send-notification
**Purpose:** Create in-app notification (system use).

**Request:**
```json
{
  "user_id": "uuid",
  "type": "processing_complete",
  "title": "Document Ready",
  "message": "Your document has been processed",
  "data": {}
}
```

---

#### export-document
**Purpose:** Export document in specified format.

**Request:**
```json
{
  "documentId": "uuid",
  "format": "json"  // json, csv, txt
}
```

---

#### seed-demo-data
**Purpose:** Create demo data for new users.

**Request:**
```json
{
  "projectId": "uuid"
}
```

---

## Shared Utilities

Located in `supabase/functions/_shared/`:

| File | Purpose |
|------|---------|
| `pipeline-types.ts` | Type definitions for pipeline stages |
| `artifact-registry.ts` | Version tracking for processing artifacts |
| `execution-contracts.ts` | Schema validation for stage I/O |
| `semantic-chunking.ts` | Chunking strategy implementations |
| `metrics-collector.ts` | Stage metrics collection |
| `ai-safety.ts` | Prompt injection detection and guards |
| `stage-helpers.ts` | Common stage utility functions |
| `executor-utils.ts` | Shared executor code |
| `url-validator.ts` | URL validation utilities |

## Error Response Format

All errors return:
```json
{
  "error": "Human-readable error message"
}
```

With appropriate HTTP status codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Rate Limited / Quota Exceeded
- 500: Internal Server Error

## Secrets Required

| Secret | Required By | Description |
|--------|-------------|-------------|
| SUPABASE_URL | All | Supabase project URL |
| SUPABASE_ANON_KEY | All | Supabase anon key |
| SUPABASE_SERVICE_ROLE_KEY | All | Supabase service role key |
| LOVABLE_API_KEY | summarization, training-data | Lovable AI Gateway |
| OPENAI_API_KEY | semantic-search, indexing | OpenAI API (optional) |
| API_KEY_ENCRYPTION_SECRET | manage-api-keys | User API key encryption |
