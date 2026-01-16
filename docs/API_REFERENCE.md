# FineFlow API Reference

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Edge Functions](#edge-functions)
4. [Database RPC Functions](#database-rpc-functions)
5. [Error Handling](#error-handling)
6. [Rate Limits](#rate-limits)

---

## Overview

FineFlow's API consists of:

1. **Edge Functions** - Serverless endpoints for complex operations
2. **Database RPC Functions** - PostgreSQL functions callable via Supabase client
3. **Direct Database Access** - CRUD operations via Supabase client with RLS

### Base URL

```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/
```

### Common Headers

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Authentication

All API requests require a valid JWT token obtained from Supabase Auth.

### Obtain Token

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

const accessToken = data.session.access_token;
```

### Use Token

```typescript
// Via Edge Function
fetch('/functions/v1/process-document', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ documentId: '...' })
});

// Via Supabase client (automatic)
supabase.from('documents').select('*');
```

---

## Edge Functions

### Health Check

**GET** `/health`

Returns system health status. No authentication required.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

---

### Document Processing

#### Process Document

**POST** `/process-document`

Runs the 6-stage document processing pipeline.

**Request:**
```json
{
  "documentId": "uuid",
  "resumeFrom": "chunking",     // Optional: resume from stage
  "forceReprocess": true        // Optional: skip change detection
}
```

**Response:**
```json
{
  "success": true,
  "documentId": "uuid",
  "status": "ready",
  "processingSteps": [
    {
      "stage": "ingestion",
      "status": "completed",
      "duration_ms": 150
    }
  ]
}
```

**Error Codes:**
| Code | Message | Description |
|------|---------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 404 | Document not found | Document doesn't exist or not owned |
| 422 | Processing failed | Critical stage failure |
| 429 | Quota exceeded | Processing quota limit reached |

---

#### Delete Document

**POST** `/delete-document`

Soft-deletes a document and associated data.

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
  "documentId": "uuid"
}
```

---

### Search

#### Semantic Search

**POST** `/semantic-search`

Performs hybrid semantic + full-text search.

**Request:**
```json
{
  "query": "search text",
  "projectId": "uuid",                // Optional
  "mimeTypes": ["application/pdf"],   // Optional
  "language": "en",                   // Optional
  "dateFrom": "2024-01-01",          // Optional
  "dateTo": "2024-12-31",            // Optional
  "limit": 10,                        // Optional, default: 10
  "searchLevel": "chunks",            // "documents" or "chunks"
  "useSemanticSearch": true,          // Optional, default: true
  "useFullTextSearch": true           // Optional, default: true
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "documentId": "uuid",
      "documentName": "report.pdf",
      "content": "matched text...",
      "snippet": "<mark>matched</mark> text...",
      "semanticScore": 0.85,
      "fullTextScore": 0.72,
      "combinedScore": 0.81
    }
  ],
  "query": "search text",
  "totalResults": 15
}
```

---

#### Graph Search

**POST** `/graph-search`

Searches using knowledge graph relationships.

**Request:**
```json
{
  "projectId": "uuid",
  "query": "search text",
  "entityTypes": ["person", "organization"],
  "maxHops": 2,
  "limit": 20
}
```

---

### Training Data

#### Generate Training Data

**POST** `/generate-training-data`

Generates Q&A pairs from document chunks.

**Request:**
```json
{
  "datasetId": "uuid",
  "chunkIds": ["uuid", "uuid"],
  "generationMode": "qa",           // "auto", "qa", "instruction", "conversation"
  "pairsPerChunk": 3,
  "systemPrompt": "Optional custom prompt"
}
```

**Response:**
```json
{
  "success": true,
  "datasetId": "uuid",
  "pairsGenerated": 15,
  "tokensUsed": 2500,
  "qualityMetrics": {
    "avgQualityScore": 0.85,
    "filteredCount": 2
  }
}
```

---

#### Validate Dataset

**POST** `/validate-dataset`

Validates a dataset before training.

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
  "issues": [],
  "stats": {
    "totalPairs": 150,
    "approvedPairs": 145,
    "totalTokens": 75000,
    "estimatedCost": 2.50
  }
}
```

---

### Fine-Tuning

#### Start Training

**POST** `/start-training`

Initiates a fine-tuning job with OpenAI.

**Request:**
```json
{
  "datasetId": "uuid",
  "baseModel": "gpt-4o-mini-2024-07-18",
  "hyperparameters": {
    "n_epochs": 3,
    "batch_size": "auto",
    "learning_rate_multiplier": "auto"
  }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "uuid",
  "openaiJobId": "ftjob-abc123",
  "estimatedCost": 12.50,
  "status": "validating_files"
}
```

---

#### Check Training Status

**POST** `/check-training-status`

Checks the status of a training job.

**Request:**
```json
{
  "jobId": "uuid"
}
```

**Response:**
```json
{
  "status": "running",
  "openaiJobId": "ftjob-abc123",
  "progress": 0.65,
  "trainedTokens": 50000,
  "fineTunedModel": null,
  "error": null
}
```

---

#### Cancel Training

**POST** `/cancel-training`

Cancels a running training job.

**Request:**
```json
{
  "jobId": "uuid"
}
```

---

### Budget & Quota

#### Quota Status

**GET** `/quota-status`

Returns current user's quota usage.

**Response:**
```json
{
  "tier": "pro",
  "documents": {
    "current": 250,
    "limit": 1000
  },
  "processing": {
    "current": 180,
    "limit": 2000,
    "resetDate": "2024-02-01T00:00:00Z"
  },
  "storage": {
    "current": 1073741824,
    "limit": 10737418240
  }
}
```

---

#### Check Budget

**POST** `/check-budget`

Checks if operation fits within budget.

**Request:**
```json
{
  "projectId": "uuid",
  "estimatedCost": 0.50
}
```

**Response:**
```json
{
  "allowed": true,
  "currentSpending": 45.00,
  "monthlyBudget": 100.00,
  "remainingBudget": 55.00,
  "burnRate": 1.50,
  "projectedMonthEnd": 75.00
}
```

---

### Admin

#### Admin Stats

**GET** `/admin-stats`

Returns system-wide statistics. Admin only.

**Response:**
```json
{
  "users": {
    "total": 1500,
    "active": 850,
    "new7Days": 45
  },
  "documents": {
    "total": 25000,
    "processed7Days": 3200
  },
  "processing": {
    "avgDuration": 12500,
    "successRate": 0.97
  },
  "costs": {
    "total30Days": 1250.00,
    "avgPerUser": 0.85
  }
}
```

---

#### Admin Users

**GET/PATCH** `/admin-users`

Manage users. Admin only.

**GET Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1500
}
```

**PATCH Request:**
```json
{
  "userId": "uuid",
  "updates": {
    "status": "suspended",
    "role": "admin"
  }
}
```

---

## Database RPC Functions

### Search Functions

#### hybrid_search_documents

Performs hybrid search across documents.

```typescript
const { data, error } = await supabase.rpc('hybrid_search_documents', {
  search_query: 'find contracts',
  query_embedding: [0.1, 0.2, ...],  // 1536 dimensions
  match_threshold: 0.5,
  match_count: 10,
  filter_project_id: 'uuid',
  filter_owner_id: 'uuid',
  filter_mime_types: ['application/pdf'],
  use_semantic: true,
  use_fulltext: true
});
```

**Returns:**
```typescript
{
  id: string;
  project_id: string;
  name: string;
  semantic_score: number;
  fulltext_score: number;
  combined_score: number;
  matched_snippet: string;
}[]
```

---

#### hybrid_search_chunks

Performs hybrid search across chunks.

```typescript
const { data, error } = await supabase.rpc('hybrid_search_chunks', {
  search_query: 'contract terms',
  query_embedding: [...],
  match_threshold: 0.5,
  match_count: 20,
  filter_project_id: 'uuid'
});
```

---

### Quota Functions

#### check_quota

Checks if user can perform an operation.

```typescript
const { data } = await supabase.rpc('check_quota', {
  _user_id: 'uuid',
  _quota_type: 'processing'  // 'documents' | 'processing' | 'storage'
});

// Returns: { allowed: boolean, current: number, limit: number, tier: string }
```

---

#### increment_usage

Increments usage counter.

```typescript
await supabase.rpc('increment_usage', {
  _user_id: 'uuid',
  _quota_type: 'processing',
  _amount: 1
});
```

---

### Knowledge Graph Functions

#### find_graph_path

Finds path between two entities.

```typescript
const { data } = await supabase.rpc('find_graph_path', {
  p_project_id: 'uuid',
  p_start_node_id: 'uuid',
  p_end_node_id: 'uuid',
  p_max_depth: 5
});

// Returns: { path_nodes: uuid[], path_edges: uuid[], path_length: number }
```

---

#### get_graph_neighbors

Gets neighboring nodes.

```typescript
const { data } = await supabase.rpc('get_graph_neighbors', {
  p_node_id: 'uuid',
  p_depth: 2
});
```

---

### Role Functions

#### is_admin

Checks if user is admin.

```typescript
const { data } = await supabase.rpc('is_admin', {
  _user_id: 'uuid'
});
// Returns: boolean
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `QUOTA_EXCEEDED` | 429 | User quota limit reached |
| `BUDGET_EXCEEDED` | 402 | Project budget limit reached |
| `PROCESSING_ERROR` | 422 | Document processing failed |
| `EXTERNAL_API_ERROR` | 502 | AI service error |
| `TIMEOUT` | 504 | Operation timed out |

---

## Rate Limits

### Quota-Based Limits

| Tier | Documents | Processing/Month | API Keys |
|------|-----------|------------------|----------|
| Free | 10 | 20 | 1 |
| Starter | 100 | 200 | 5 |
| Pro | 1,000 | 2,000 | 20 |
| Enterprise | Unlimited | Unlimited | 100 |

### API Key Rate Limits

```typescript
// Default limits per API key
{
  rate_limit_per_minute: 60,
  rate_limit_per_day: 1000
}
```

### Edge Function Timeouts

| Function | Timeout |
|----------|---------|
| process-document | 300s |
| semantic-search | 30s |
| generate-training-data | 60s |
| start-training | 30s |
| Default | 30s |

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Full database schema
- [SECURITY.md](./SECURITY.md) - Authentication details
