# FineFlow Operations Runbook

## Common Incidents

### 1. Document Processing Stuck

**Symptoms:**
- Document status remains "processing" indefinitely
- No progress in processing_steps

**Diagnosis:**
```sql
-- Check document status
SELECT id, name, status, error_message, processing_steps
FROM documents
WHERE id = 'document-uuid';

-- Check processing metrics
SELECT *
FROM processing_stage_metrics
WHERE document_id = 'document-uuid'
ORDER BY created_at DESC;
```

**Resolution:**

A. **Retry Processing:**
```typescript
// Resume from failed stage
await supabase.functions.invoke('process-document', {
  body: {
    documentId: 'uuid',
    resumeFrom: 'chunking',  // Failed stage
    forceReprocess: true
  }
});
```

B. **Reset Document Status:**
```sql
UPDATE documents
SET 
  status = 'uploaded',
  processing_steps = '[]',
  error_message = NULL
WHERE id = 'document-uuid';
```

C. **Manual Stage Execution:**
```typescript
// Run specific executor
await supabase.functions.invoke('extraction-executor', {
  body: {
    documentId: 'uuid',
    projectId: 'project-uuid',
    storagePath: 'path/to/file',
    mimeType: 'application/pdf',
    version: 'v1'
  }
});
```

---

### 2. Extraction Failures

**Symptoms:**
- Document shows "error" status
- Error message: "Extraction failed"

**Common Causes:**
- Unsupported file format
- Corrupted file
- Scanned PDF (no text layer)
- File too large

**Diagnosis:**
```sql
SELECT 
  name, 
  mime_type, 
  size_bytes, 
  error_message,
  processing_steps
FROM documents
WHERE id = 'document-uuid';
```

**Resolution:**

A. **For unsupported formats:**
- Convert to supported format externally
- Re-upload as TXT, PDF, or DOCX

B. **For corrupted files:**
```sql
-- Mark as error with explanation
UPDATE documents
SET 
  status = 'error',
  error_message = 'File corrupted or unreadable'
WHERE id = 'document-uuid';
```

C. **For scanned PDFs:**
- OCR not supported
- Use external OCR tool first
- Re-upload text file

---

### 3. Training Job Stuck

**Symptoms:**
- Training job in "training" status for hours
- No progress updates

**Diagnosis:**
```sql
SELECT 
  id,
  status,
  provider_job_id,
  progress_percent,
  current_step,
  started_at,
  updated_at
FROM training_jobs
WHERE id = 'job-uuid';
```

**Resolution:**

A. **Check OpenAI Status:**
```bash
curl https://api.openai.com/v1/fine_tuning/jobs/{provider_job_id} \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

B. **Manual Cancel:**
```typescript
await supabase.functions.invoke('cancel-training', {
  body: { jobId: 'job-uuid' }
});
```

C. **Force Status Update:**
```sql
UPDATE training_jobs
SET 
  status = 'failed',
  error_message = 'Manually marked as failed due to timeout',
  completed_at = NOW()
WHERE id = 'job-uuid';

-- Reset dataset status
UPDATE training_datasets
SET status = 'ready'
WHERE id = (SELECT dataset_id FROM training_jobs WHERE id = 'job-uuid');
```

---

### 4. Search Returns No Results

**Symptoms:**
- Search queries return empty results
- Documents exist and are in "ready" status

**Diagnosis:**

A. **Check document has embeddings:**
```sql
SELECT 
  id, 
  name,
  embedding IS NOT NULL as has_embedding,
  search_vector IS NOT NULL as has_fts
FROM documents
WHERE project_id = 'project-uuid'
AND status = 'ready';
```

B. **Check chunks have embeddings:**
```sql
SELECT 
  c.id,
  c.embedding IS NOT NULL as has_embedding,
  c.search_vector IS NOT NULL as has_fts
FROM chunks c
JOIN documents d ON c.document_id = d.id
WHERE d.project_id = 'project-uuid'
LIMIT 10;
```

**Resolution:**

A. **Re-index document:**
```typescript
await supabase.functions.invoke('process-document', {
  body: {
    documentId: 'uuid',
    resumeFrom: 'indexing',
    forceReprocess: true
  }
});
```

B. **Regenerate embeddings:**
```typescript
await supabase.functions.invoke('generate-embedding', {
  body: { documentId: 'uuid' }
});
```

C. **Lower search threshold:**
```typescript
// Try with lower threshold (default is 0.5)
const results = await searchService.semanticSearch(query, {
  threshold: 0.3
});
```

---

### 5. Quota Exceeded Errors

**Symptoms:**
- "Quota exceeded" error on upload/processing
- User cannot create new documents

**Diagnosis:**
```sql
SELECT 
  p.name,
  p.email,
  p.subscription_tier,
  u.documents_count,
  u.processing_count,
  u.storage_bytes,
  t.documents_limit,
  t.processing_limit,
  t.storage_bytes_limit
FROM profiles p
JOIN usage_limits u ON p.id = u.user_id
JOIN tier_limits t ON t.tier = p.subscription_tier
WHERE p.id = 'user-uuid';
```

**Resolution:**

A. **Upgrade tier:**
```sql
UPDATE profiles
SET subscription_tier = 'pro'
WHERE id = 'user-uuid';
```

B. **Reset monthly processing count:**
```sql
UPDATE usage_limits
SET 
  processing_count = 0,
  reset_date = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
WHERE user_id = 'user-uuid';
```

C. **Adjust limits (temporary):**
```sql
UPDATE usage_limits
SET documents_count = documents_count - 5
WHERE user_id = 'user-uuid';
```

---

### 6. Edge Function Errors

**Symptoms:**
- 500 errors from edge functions
- Functions timing out

**Diagnosis:**

```sql
-- Check edge function logs
SELECT 
  id, 
  timestamp, 
  event_message,
  m.function_id,
  m.execution_time_ms
FROM function_edge_logs
CROSS JOIN UNNEST(metadata) as m
ORDER BY timestamp DESC
LIMIT 50;
```

**Resolution:**

A. **Check secrets:**
```bash
supabase secrets list
```

B. **Redeploy function:**
```bash
supabase functions deploy process-document
```

C. **Check for code errors:**
- Review function logs in Dashboard
- Look for TypeScript/runtime errors

---

## Safe Reprocessing Procedures

### Reprocess Single Document

```typescript
// Full reprocess
await supabase.functions.invoke('process-document', {
  body: {
    documentId: 'uuid',
    forceReprocess: true
  }
});

// Resume from specific stage
await supabase.functions.invoke('process-document', {
  body: {
    documentId: 'uuid',
    resumeFrom: 'chunking'
  }
});
```

### Batch Reprocess

```sql
-- Find all documents needing reprocessing
SELECT id FROM documents
WHERE project_id = 'project-uuid'
AND status = 'error';

-- Use loop in application code to reprocess each
```

### Regenerate All Chunks

```sql
-- Delete existing chunks
DELETE FROM chunks WHERE document_id = 'uuid';

-- Reset document for rechunking
UPDATE documents
SET 
  status = 'processing',
  word_count = NULL,
  quality_score = NULL
WHERE id = 'uuid';
```

---

## Database Maintenance

### Check Table Sizes

```sql
SELECT 
  relname as table,
  pg_size_pretty(pg_total_relation_size(relid)) as size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

### Clean Up Orphaned Chunks

```sql
-- Find chunks without parent document
SELECT c.id
FROM chunks c
LEFT JOIN documents d ON c.document_id = d.id
WHERE d.id IS NULL;

-- Delete orphaned chunks
DELETE FROM chunks c
WHERE NOT EXISTS (
  SELECT 1 FROM documents d
  WHERE d.id = c.document_id
);
```

### Clean Up Soft-Deleted Documents

```sql
-- Documents deleted more than 30 days ago
SELECT id, name, deleted_at
FROM documents
WHERE deleted_at < NOW() - INTERVAL '30 days';

-- Permanent delete (careful!)
DELETE FROM documents
WHERE deleted_at < NOW() - INTERVAL '30 days';
```

### Vacuum and Analyze

```sql
-- Reclaim storage
VACUUM ANALYZE documents;
VACUUM ANALYZE chunks;
```

---

## Monitoring Queries

### Processing Success Rate

```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE success) as success,
  COUNT(*) FILTER (WHERE NOT success) as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE success) / COUNT(*), 2) as success_rate
FROM processing_stage_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Active Users (Last 24h)

```sql
SELECT 
  p.name,
  p.email,
  COUNT(DISTINCT d.id) as documents_uploaded
FROM profiles p
JOIN documents d ON d.owner_id = p.id
WHERE d.created_at > NOW() - INTERVAL '24 hours'
GROUP BY p.id
ORDER BY documents_uploaded DESC;
```

### Storage Usage by User

```sql
SELECT 
  p.name,
  p.email,
  p.subscription_tier,
  pg_size_pretty(SUM(d.size_bytes)) as total_storage,
  COUNT(d.id) as document_count
FROM profiles p
LEFT JOIN documents d ON d.owner_id = p.id AND d.deleted_at IS NULL
GROUP BY p.id
ORDER BY SUM(d.size_bytes) DESC NULLS LAST
LIMIT 20;
```

### Error Frequency by Stage

```sql
SELECT 
  stage,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE NOT success) as errors,
  ROUND(100.0 * COUNT(*) FILTER (WHERE NOT success) / COUNT(*), 2) as error_rate
FROM processing_stage_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY stage
ORDER BY error_rate DESC;
```

---

## Emergency Procedures

### Disable Processing

```sql
-- Set all processing documents to uploaded
UPDATE documents
SET status = 'uploaded'
WHERE status = 'processing';
```

### Kill Stuck Training Jobs

```sql
UPDATE training_jobs
SET 
  status = 'failed',
  error_message = 'Emergency shutdown',
  completed_at = NOW()
WHERE status IN ('pending', 'uploading', 'validating', 'queued', 'training');

UPDATE training_datasets
SET status = 'ready'
WHERE status = 'training';
```

### Rate Limit Recovery

If hitting OpenAI rate limits:
1. Wait for rate limit window to reset
2. Reduce concurrent processing
3. Add delays between API calls

### Database Connection Issues

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Terminate idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < NOW() - INTERVAL '10 minutes';
```
