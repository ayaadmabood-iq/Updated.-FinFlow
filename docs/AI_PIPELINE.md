# FineFlow AI Processing Pipeline

## Pipeline Overview

The document processing pipeline transforms uploaded files into searchable, indexed content through 6 sequential stages.

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  INGESTION   │───>│  EXTRACTION  │───>│   LANGUAGE   │
│    Stage 1   │    │    Stage 2   │    │    Stage 3   │
│  (Critical)  │    │  (Critical)  │    │  (Optional)  │
└──────────────┘    └──────────────┘    └──────────────┘
                                               │
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   INDEXING   │<───│ SUMMARIZATION│<───│   CHUNKING   │
│    Stage 6   │    │    Stage 5   │    │    Stage 4   │
│  (Optional)  │    │  (Optional)  │    │  (Critical)  │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Stage Details

### Stage 1: Ingestion
**Executor:** `ingestion-executor`  
**Version:** v1  
**Critical:** Yes

**Purpose:** Validate document exists and is accessible in storage.

**Input:**
```typescript
{
  documentId: string;
  projectId: string;
  storagePath: string;  // e.g., "userId/projectId/timestamp-filename.pdf"
}
```

**Process:**
1. Download file from Supabase Storage
2. Verify file integrity
3. Return byte count

**Output:**
```typescript
{
  bytesDownloaded: number;
  validated: boolean;
  storagePath: string;
}
```

**Failure Handling:** Stops pipeline if file not accessible.

---

### Stage 2: Text Extraction
**Executor:** `extraction-executor`  
**Version:** v1  
**Critical:** Yes

**Purpose:** Extract text content from various file formats.

**Supported Formats:**

| MIME Type | Method | Notes |
|-----------|--------|-------|
| text/plain | Direct read | No processing needed |
| text/html | Strip tags | Basic HTML parsing |
| text/markdown | Direct read | Markdown preserved |
| text/csv | Parse rows | Tab-separated output |
| application/json | Stringify | Pretty printed |
| application/pdf | pdf-parse | Machine-readable PDFs only |
| application/vnd.openxmlformats-officedocument.wordprocessingml.document | mammoth | DOCX extraction |

**Process:**
1. Download file from storage
2. Detect MIME type
3. Apply appropriate extraction method
4. Clean and normalize text
5. Calculate text hash for versioning
6. Store in `documents.extracted_text`

**Output:**
```typescript
{
  extractedLength: number;    // Raw extraction length
  cleanedLength: number;      // After normalization
  extractionMethod: string;   // e.g., "pdf-parse"
  textStoredAt: string;       // "documents.extracted_text"
  extractedTextHash: string;  // For change detection
}
```

**Limitations:**
- No OCR for scanned PDFs
- No image text extraction
- Maximum ~10MB of extracted text

---

### Stage 3: Language Detection
**Executor:** `language-executor`  
**Version:** v1  
**Critical:** No (optional)

**Purpose:** Detect primary language of document content.

**Process:**
1. Read extracted text from DB
2. Sample first 1000 characters
3. Call Lovable AI Gateway for detection
4. Store language code in `documents.language`

**Output:**
```typescript
{
  language: string;      // ISO 639-1 code (e.g., "en")
  confidence?: number;   // 0-1 confidence score
}
```

**Supported Languages:** en, es, fr, de, zh, ar, hi, ja, ko, pt, ru, etc.

---

### Stage 4: Chunking
**Executor:** `chunking-executor`  
**Version:** v2  
**Critical:** Yes

**Purpose:** Split document into smaller chunks for granular search and training.

**Configuration (per project):**
```typescript
{
  chunk_size: number;     // Default: 1000 characters
  chunk_overlap: number;  // Default: 200 characters
  chunk_strategy: 'fixed' | 'sentence' | 'semantic' | 'heuristic_semantic' | 'embedding_cluster';
}
```

**Chunking Strategies:**

#### Fixed Size
Simple character-based chunking:
- Split at `chunk_size` boundaries
- Overlap by `chunk_overlap` characters
- Fast and predictable

#### Sentence-Based
Respects sentence boundaries:
- Split on sentence endings (., !, ?)
- Group sentences until `chunk_size` reached
- Better semantic coherence

#### Heuristic Semantic (default "semantic")
Uses paragraph and section breaks:
- Split on double newlines
- Respect heading patterns
- Balance size with semantic units

#### Embedding Cluster (experimental)
True semantic chunking using embeddings:
- Generate embeddings for paragraphs
- Cluster similar content
- Requires OpenAI API key

**Deduplication:**
- SHA-256 hash of normalized content
- Marks duplicates with `is_duplicate = true`
- Duplicates excluded from search

**Quality Scoring:**
- Based on character count, structure, vocabulary diversity
- Score 0-1 stored in `chunks.quality_score`

**Output:**
```typescript
{
  chunkCount: number;
  duplicateCount: number;
  wordCount: number;
  qualityScore: number;
  chunkIds: string[];
  chunkingConfig: {
    size: number;
    overlap: number;
    strategy: string;
  };
  chunkingConfigHash: string;  // For version tracking
}
```

---

### Stage 5: Summarization
**Executor:** `summarization-executor`  
**Version:** v1  
**Critical:** No (optional)

**Purpose:** Generate document summary using AI.

**Process:**
1. Read extracted text from DB
2. Truncate to ~8000 characters if needed
3. Call Lovable AI Gateway (Gemini Flash)
4. Store in `documents.summary`

**Prompt:**
```
Summarize this document in 2-3 concise paragraphs. Focus on the main 
topics, key points, and conclusions. Keep it under 500 words.
```

**Output:**
```typescript
{
  summaryLength: number;
  summaryStoredAt: string;  // "documents.summary"
}
```

**Failure:** Non-critical; pipeline continues without summary.

---

### Stage 6: Indexing
**Executor:** `indexing-executor`  
**Version:** v1  
**Critical:** No (optional)

**Purpose:** Generate embeddings for semantic search.

**Process:**
1. Read document summary/text (max 8000 chars)
2. Call OpenAI Embeddings API
3. Store document embedding in `documents.embedding`
4. For each chunk:
   - Call OpenAI Embeddings API
   - Store in `chunks.embedding`
   - Update chunk metadata with model version

**Model:** `text-embedding-3-small` (1536 dimensions)

**Output:**
```typescript
{
  documentEmbedding: boolean;
  chunkEmbeddingsCount: number;
  embeddedChunkIds: string[];
  embeddingModel: string;
  embeddingModelVersion: string;
}
```

**Rate Limiting:** 
- Batch processing for chunks
- 500ms delay between chunks to avoid rate limits

**Failure:** Non-critical; falls back to full-text search only.

---

## Orchestrator Behavior

### Retry Logic
- Maximum 2 retries per stage
- Configurable timeouts per stage:
  - Ingestion: 30s
  - Extraction: 60s
  - Language: 25s
  - Chunking: 45s
  - Summarization: 30s
  - Indexing: 60s

### Critical vs Optional Stages
**Critical stages** (must succeed):
- ingestion
- text_extraction
- chunking

**Optional stages** (continue on failure):
- language_detection
- summarization
- indexing

### Resume Capability
Pipeline can resume from any stage:
```typescript
// Resume from chunking after config change
await processDocument({ 
  documentId: "...", 
  resumeFrom: "chunking" 
});
```

### Smart Re-processing
Orchestrator checks if re-processing is needed:
- Compares `chunkingConfigHash` with current settings
- Skips chunking if config unchanged
- Forces re-processing with `forceReprocess: true`

---

## Version Tracking

### Artifact Registry
Each stage writes version info to `documents.processing_metadata`:

```json
{
  "pipeline_version": "v5.0-artifacts",
  "extracted_text_hash": "a1b2c3d4",
  "chunking_config_hash": "e5f6g7h8",
  "embedding_model": "text-embedding-3-small",
  "embedding_model_version": "2024-01",
  "artifacts": {
    "extracted_text_ref": "documents.extracted_text",
    "chunks_ref": "chunks table (document_id=..., count=25)",
    "embeddings_ref": "documents.embedding + chunks.embedding"
  },
  "last_extraction_at": "2024-01-15T10:00:00Z",
  "last_chunking_at": "2024-01-15T10:00:05Z",
  "last_indexing_at": "2024-01-15T10:00:30Z"
}
```

### Processing Steps History
Each run appends to `documents.processing_steps`:

```json
[
  {
    "stage": "ingestion",
    "status": "completed",
    "started_at": "2024-01-15T10:00:00Z",
    "completed_at": "2024-01-15T10:00:01Z",
    "duration_ms": 150,
    "executor_version": "ingestion-executor-v1",
    "version_info": {
      "pipeline_version": "v5.0-artifacts",
      "executor_version": "ingestion-executor-v1"
    }
  },
  // ... more stages
]
```

---

## Search Indexing

### Full-Text Search (PostgreSQL)
Trigger auto-updates `search_vector`:

```sql
-- Documents
search_vector = 
  setweight(to_tsvector('english', name), 'A') ||
  setweight(to_tsvector('english', original_name), 'A') ||
  setweight(to_tsvector('english', summary), 'B') ||
  setweight(to_tsvector('english', extracted_text), 'C');

-- Chunks
search_vector = to_tsvector('english', content);
```

### Semantic Search (pgvector)
Vector columns for cosine similarity:

```sql
-- Documents
embedding vector(1536)

-- Chunks  
embedding vector(1536)
```

---

## Failure Modes & Recovery

### Stage Failures

| Stage | Failure Impact | Recovery |
|-------|----------------|----------|
| Ingestion | Pipeline stops | Fix storage access, retry |
| Extraction | Pipeline stops | Check file format, retry |
| Language | Continues | Default to 'en' |
| Chunking | Pipeline stops | Adjust settings, retry |
| Summarization | Continues | No summary available |
| Indexing | Continues | Full-text search only |

### Document Status

| Status | Meaning |
|--------|---------|
| `uploaded` | File stored, not processed |
| `processing` | Pipeline running |
| `ready` | All critical stages complete |
| `error` | Critical stage failed |

### Error Messages
Stored in `documents.error_message`:
```
"Extraction failed: Unsupported file format"
"Chunking failed: Empty extracted text"
"Ingestion failed: File not found in storage"
```

### Resume After Error
```typescript
// Check which stage failed
const steps = document.processing_steps;
const failedStage = steps.find(s => s.status === 'failed')?.stage;

// Fix issue, then resume
await processDocument({
  documentId: document.id,
  resumeFrom: failedStage,
  forceReprocess: true
});
```

---

## Performance Considerations

### Processing Times (typical)

| Stage | Small Doc (<10KB) | Medium (100KB) | Large (1MB) |
|-------|-------------------|----------------|-------------|
| Ingestion | <1s | <2s | <5s |
| Extraction | 1-2s | 3-5s | 10-20s |
| Language | 1-2s | 1-2s | 1-2s |
| Chunking | <1s | 1-3s | 5-10s |
| Summarization | 2-5s | 3-6s | 4-8s |
| Indexing | 2-5s | 10-30s | 30-60s |

### Bottlenecks
1. **Indexing** - Depends on number of chunks and API rate limits
2. **Extraction** - PDF parsing can be slow for complex documents
3. **External APIs** - Lovable AI and OpenAI have rate limits

### Optimization Tips
1. Process documents in batches during off-peak hours
2. Use smaller chunk sizes for faster indexing
3. Consider skipping indexing for documents that don't need semantic search
