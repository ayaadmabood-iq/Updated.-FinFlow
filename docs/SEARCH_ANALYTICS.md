# FineFlow Search & Analytics

## Hybrid Search Overview

FineFlow implements **hybrid search** combining:
1. **Full-Text Search (FTS)** - PostgreSQL tsvector with ranking
2. **Semantic Search** - OpenAI embeddings with pgvector similarity

```
┌─────────────┐     ┌─────────────────────────────────────────┐
│   Query     │────>│         semantic-search function        │
└─────────────┘     ├─────────────────────────────────────────┤
                    │  1. Generate query embedding (OpenAI)   │
                    │  2. Call hybrid_search_documents (RPC)  │
                    │  3. Call hybrid_search_chunks (RPC)     │
                    │  4. Merge and rank results              │
                    └─────────────────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   tsvector      │       │   pgvector      │       │   Combined      │
│   (Full-Text)   │       │   (Semantic)    │       │   Ranking       │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

## Search Modes

### Hybrid (Default)
Combines both FTS and semantic search:
- Generates query embedding via OpenAI
- Runs both search methods
- Combines scores: `0.7 * semantic + 0.3 * fulltext`

### Semantic Only
Pure embedding-based similarity:
- Requires OpenAI API key
- Best for conceptual/meaning-based queries
- Works across languages (if embeddings support it)

### Full-Text Only
Pure PostgreSQL FTS:
- No external API calls
- Fast and deterministic
- Best for exact phrase matching

## Full-Text Search Implementation

### Search Vectors
Created by database triggers on INSERT/UPDATE:

**Documents:**
```sql
search_vector := 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(original_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(extracted_text, '')), 'C');
```

**Chunks:**
```sql
search_vector := to_tsvector('english', COALESCE(content, ''));
```

### Weight System
| Weight | Priority | Fields |
|--------|----------|--------|
| A | Highest | name, original_name |
| B | High | summary |
| C | Normal | extracted_text, content |
| D | Low | (not used) |

### Query Parsing
User query converted to tsquery:
```sql
ts_query := plainto_tsquery('english', search_query);
```

### Ranking
Using `ts_rank_cd` (cover density ranking):
```sql
ts_rank_cd(search_vector, ts_query)
```

### Snippet Highlighting
```sql
ts_headline('english', content, ts_query, 
  'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20')
```

## Semantic Search Implementation

### Embedding Model
- **Model:** `text-embedding-3-small`
- **Dimensions:** 1536
- **Provider:** OpenAI

### Vector Storage
Using pgvector extension:
```sql
embedding vector(1536)
```

### Similarity Calculation
Cosine distance (lower is more similar):
```sql
-- Similarity score (0-1, higher is better)
1 - (embedding <=> query_embedding) AS similarity
```

### Indexing (Optional)
For large datasets, create IVFFlat index:
```sql
CREATE INDEX idx_documents_embedding 
ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## Hybrid Search Functions

### hybrid_search_documents
```sql
hybrid_search_documents(
  search_query TEXT,
  query_embedding VECTOR DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  filter_project_id UUID DEFAULT NULL,
  filter_owner_id UUID DEFAULT NULL,
  filter_mime_types TEXT[] DEFAULT NULL,
  filter_language TEXT DEFAULT NULL,
  filter_date_from TIMESTAMPTZ DEFAULT NULL,
  filter_date_to TIMESTAMPTZ DEFAULT NULL,
  use_semantic BOOLEAN DEFAULT TRUE,
  use_fulltext BOOLEAN DEFAULT TRUE
)
```

**Returns:**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Document ID |
| project_id | uuid | Project ID |
| name | text | Document name |
| similarity | float | Combined score |
| semantic_score | float | Embedding similarity |
| fulltext_score | float | FTS rank |
| matched_snippet | text | Highlighted excerpt |

### hybrid_search_chunks
Same parameters, returns chunk-level results.

## Filters

### By Project
```typescript
await searchService.semanticSearch(query, {
  projectId: "uuid"
});
```

### By File Type
```typescript
await searchService.semanticSearch(query, {
  fileTypes: ["application/pdf", "text/plain"]
});
```

### By Language
```typescript
await searchService.semanticSearch(query, {
  language: "en"
});
```

### By Date Range
```typescript
await searchService.semanticSearch(query, {
  dateFrom: "2024-01-01",
  dateTo: "2024-06-30"
});
```

## Search API Usage

### Client-Side
```typescript
import { searchService } from '@/services/searchService';

const results = await searchService.semanticSearch("machine learning basics", {
  projectId: "...",
  searchMode: "hybrid",
  limit: 20,
  threshold: 0.5,
  searchChunks: true
});

// Results include documents and chunks
results.results.forEach(r => {
  if (r.type === 'document') {
    console.log(r.name, r.similarity);
  } else {
    console.log(r.documentName, r.chunkIndex, r.similarity);
  }
});
```

### Edge Function
```typescript
// POST /functions/v1/semantic-search
{
  "query": "machine learning basics",
  "projectId": "uuid",
  "searchMode": "hybrid",
  "limit": 20
}
```

## Performance Optimization

### Indexes
```sql
-- Full-text search
CREATE INDEX idx_documents_search_vector 
ON documents USING GIN(search_vector);

CREATE INDEX idx_chunks_search_vector 
ON chunks USING GIN(search_vector);

-- Semantic search (optional for large datasets)
CREATE INDEX idx_documents_embedding 
ON documents USING ivfflat(embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_chunks_embedding 
ON chunks USING ivfflat(embedding vector_cosine_ops)
WITH (lists = 100);
```

### Query Limits
- Default limit: 10 results
- Maximum limit: 100 results
- Supabase row limit: 1000

### Threshold Tuning
| Threshold | Behavior |
|-----------|----------|
| 0.3 | More results, lower precision |
| 0.5 | Balanced (default) |
| 0.7 | Fewer results, higher precision |
| 0.9 | Very strict matching |

## Limitations

### Current Limitations
1. **Single language support per query** - tsvector uses 'english' dictionary
2. **No fuzzy matching** - Exact token matching only
3. **Fixed embedding model** - Cannot swap models without re-indexing
4. **No cross-project search** - Must specify project or search all user docs
5. **No saved searches** - No query history or saved filters

### Known Issues
1. **Empty embeddings** - Documents without embeddings fall back to FTS only
2. **Rate limiting** - OpenAI API may rate-limit high-volume searches
3. **Large documents** - Very long documents may have truncated embeddings

---

## Analytics

### Admin Metrics Dashboard

The admin metrics dashboard provides insights into:

1. **Processing Overview**
   - Total documents processed
   - Error rate
   - Average processing time

2. **Stage Metrics** (via `v_stage_failure_rates` view)
   - Per-stage success rates
   - Average duration
   - P95 latency

3. **File Type Metrics**
   - Error rates by MIME type
   - Processing times by type

4. **User Activity**
   - Most active users
   - Most active projects

5. **Processing Trends**
   - Daily processing volume
   - Error trends

### Metrics Collection

Stage metrics collected in `processing_stage_metrics`:
```typescript
interface ProcessingStageMetrics {
  document_id: uuid;
  stage: string;
  success: boolean;
  duration_ms: number;
  error_message?: string;
  input_size_bytes?: number;
  output_size_bytes?: number;
  executor_version?: string;
  pipeline_version?: string;
  retry_count?: number;
  metadata?: object;
}
```

### RAG Evaluation

Basic retrieval evaluation via `rag_evaluation_results`:
- Precision at K
- Recall metrics
- Relevance scores

Function for computing precision:
```sql
compute_retrieval_precision(
  p_project_id UUID,
  p_query TEXT,
  p_expected_doc_ids UUID[],
  p_top_k INT DEFAULT 10
)
```

### Accessing Analytics

**Admin Dashboard:**
```
/admin/metrics
```

**API:**
```typescript
const metrics = await adminService.getMetrics();
```

### Audit Logging

All user actions logged to `audit_logs`:
- Login/logout events
- Document CRUD operations
- Project changes
- Settings modifications

```typescript
// Audit log entry
{
  user_id: "uuid",
  user_name: "John Doe",
  action: "create",
  resource_type: "document",
  resource_id: "uuid",
  resource_name: "report.pdf",
  details: { ... },
  severity_level: "info"
}
```

### Budget Analytics

Per-project cost tracking:
```typescript
const report = await budgetService.getBudgetReport(projectId);
// Returns spending breakdown, trends, recommendations
```
