# FineFlow Architecture

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Database Schema](#database-schema)
4. [Pipeline Architecture](#pipeline-architecture)
5. [Authentication & Authorization](#authentication--authorization)
6. [Data Flow](#data-flow)
7. [Module Structure](#module-structure)

---

## System Overview

FineFlow uses a **serverless architecture** built on Lovable Cloud (powered by Supabase). The frontend is a React SPA that communicates with the backend via:

1. **Supabase Client** - Direct database access with RLS protection
2. **Edge Functions** - Serverless compute for AI operations and complex logic
3. **Realtime** - WebSocket subscriptions for live updates

---

## High-Level Architecture

```mermaid
graph TB
    subgraph Client["Client Layer"]
        Browser["React SPA<br>(Vite + TypeScript)"]
        PWA["PWA Support<br>(Offline Capable)"]
    end

    subgraph Gateway["API Gateway"]
        Auth["Supabase Auth<br>(JWT)"]
        CORS["CORS Middleware"]
    end

    subgraph Compute["Serverless Compute"]
        EF["Edge Functions<br>(Deno Runtime)"]
        Orchestrator["Pipeline Orchestrator"]
        Executors["Stage Executors"]
    end

    subgraph Data["Data Layer"]
        PG["PostgreSQL<br>+ pgvector"]
        Storage["Supabase Storage<br>(S3-compatible)"]
        Realtime["Realtime<br>(WebSocket)"]
    end

    subgraph AI["AI Services"]
        Lovable["Lovable AI Gateway"]
        OpenAI["OpenAI API"]
    end

    Browser --> Auth
    Browser --> PG
    Browser --> Storage
    Browser --> Realtime
    Auth --> EF
    EF --> Orchestrator
    Orchestrator --> Executors
    Executors --> PG
    Executors --> Storage
    Executors --> Lovable
    Executors --> OpenAI
```

### Architecture Layers

| Layer | Technology | Purpose |
|-------|------------|---------|
| Presentation | React, Tailwind, shadcn/ui | User interface |
| State Management | React Query, Context | Client-side state |
| Service | TypeScript services | API abstraction |
| API Gateway | Supabase Auth, Edge Functions | Authentication, routing |
| Business Logic | Edge Functions (Deno) | Document processing, AI |
| Data Access | Supabase Client, RLS | Database operations |
| Storage | Supabase Storage | File storage |
| AI | Lovable AI, OpenAI | Embeddings, generation |

---

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    PROFILES ||--o{ PROJECTS : owns
    PROFILES ||--o{ DOCUMENTS : owns
    PROFILES ||--o{ TRAINING_DATASETS : owns
    PROFILES ||--o{ TRAINING_JOBS : owns
    PROFILES }|--|| USAGE_LIMITS : has
    
    PROJECTS ||--o{ DOCUMENTS : contains
    PROJECTS ||--o{ DATA_SOURCES : contains
    PROJECTS ||--o{ TRAINING_DATASETS : contains
    PROJECTS ||--o{ KNOWLEDGE_GRAPH_NODES : contains
    
    DOCUMENTS ||--o{ CHUNKS : has
    DOCUMENTS ||--o{ MEDIA_ASSETS : has
    
    TRAINING_DATASETS ||--o{ CURATED_QA_PAIRS : contains
    TRAINING_DATASETS ||--o{ TRAINING_JOBS : trains
    
    TEAMS ||--o{ TEAM_MEMBERS : has
    TEAMS ||--o{ PROJECT_SHARES : shares
    
    KNOWLEDGE_GRAPH_NODES ||--o{ KNOWLEDGE_GRAPH_EDGES : connects

    PROFILES {
        uuid id PK
        text name
        text email
        app_role role
        subscription_tier subscription_tier
        timestamp created_at
    }

    PROJECTS {
        uuid id PK
        uuid owner_id FK
        text name
        text description
        numeric monthly_budget_usd
        int chunk_size
        int chunk_overlap
        text chunk_strategy
        timestamp created_at
    }

    DOCUMENTS {
        uuid id PK
        uuid project_id FK
        uuid owner_id FK
        text name
        text mime_type
        text storage_path
        text status
        text extracted_text
        text summary
        vector embedding
        jsonb processing_steps
        timestamp created_at
    }

    CHUNKS {
        uuid id PK
        uuid document_id FK
        int index
        text content
        vector embedding
        text chunking_strategy
        boolean is_duplicate
        numeric quality_score
    }

    TRAINING_DATASETS {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        text name
        text format
        int pairs_count
        int tokens_count
        text status
    }

    CURATED_QA_PAIRS {
        uuid id PK
        uuid dataset_id FK
        text user_message
        text assistant_response
        numeric quality_score
        boolean is_approved
    }

    TRAINING_JOBS {
        uuid id PK
        uuid dataset_id FK
        uuid user_id FK
        text openai_job_id
        text status
        text model_name
        numeric estimated_cost_usd
    }
```

### Core Tables

| Table | Purpose | Row Count Estimate |
|-------|---------|-------------------|
| `profiles` | User accounts and settings | ~1K |
| `projects` | Project containers | ~10K |
| `documents` | Uploaded documents | ~100K |
| `chunks` | Document segments | ~1M |
| `training_datasets` | Training data collections | ~10K |
| `curated_qa_pairs` | Q&A training pairs | ~500K |
| `training_jobs` | Fine-tuning job records | ~5K |
| `knowledge_graph_nodes` | Extracted entities | ~100K |
| `knowledge_graph_edges` | Entity relationships | ~500K |
| `audit_logs` | Activity logging | ~1M |

### Key JSONB Structures

#### `documents.processing_steps`

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
  }
]
```

#### `documents.processing_metadata`

```json
{
  "pipeline_version": "v5.0-artifacts",
  "extracted_text_hash": "sha256...",
  "chunking_config_hash": "sha256...",
  "embedding_model": "text-embedding-3-small",
  "embedding_model_version": "2024-01",
  "artifacts": {
    "extracted_text_ref": "documents.extracted_text",
    "chunks_ref": "chunks table (document_id=..., count=25)",
    "embeddings_ref": "documents.embedding + chunks.embedding"
  }
}
```

---

## Pipeline Architecture

### 6-Stage Document Processing Pipeline

```mermaid
flowchart LR
    subgraph Stage1["Stage 1: Ingestion"]
        I1["Validate Storage"]
        I2["Download File"]
        I3["Verify Integrity"]
    end

    subgraph Stage2["Stage 2: Extraction"]
        E1["Detect Format"]
        E2["Extract Text"]
        E3["Normalize Content"]
    end

    subgraph Stage3["Stage 3: Language"]
        L1["Sample Text"]
        L2["Detect Language"]
        L3["Update Document"]
    end

    subgraph Stage4["Stage 4: Chunking"]
        C1["Apply Strategy"]
        C2["Deduplicate"]
        C3["Score Quality"]
    end

    subgraph Stage5["Stage 5: Summarization"]
        S1["Truncate Text"]
        S2["Call AI"]
        S3["Store Summary"]
    end

    subgraph Stage6["Stage 6: Indexing"]
        X1["Generate Embeddings"]
        X2["Store Vectors"]
        X3["Update Metadata"]
    end

    Stage1 --> Stage2
    Stage2 --> Stage3
    Stage3 --> Stage4
    Stage4 --> Stage5
    Stage5 --> Stage6
```

### Orchestrator Pattern

The `process-document` function acts as a **control plane** orchestrator:

```typescript
// Orchestrator Configuration
const CONFIG = {
  maxRetries: 2,
  stageTimeouts: {
    ingestion: 30000,      // 30s
    text_extraction: 60000, // 60s
    language_detection: 25000,
    chunking: 45000,
    summarization: 30000,
    indexing: 60000,
  },
  criticalStages: ['ingestion', 'text_extraction', 'chunking'],
  continueOnOptionalFailure: true,
};
```

### Design Principles

1. **Reference-Based Data Passing**: Executors receive IDs/paths, not raw data
2. **Versioned Artifacts**: All outputs tracked with version metadata
3. **Failure Isolation**: Optional stages don't block pipeline completion
4. **Resume Capability**: Resume from any failed stage

---

## Authentication & Authorization

### Auth Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Supabase Auth
    participant Database
    participant Edge Function

    User->>Browser: Enter credentials
    Browser->>Supabase Auth: signInWithPassword()
    Supabase Auth->>Browser: JWT Token
    Browser->>Browser: Store in localStorage
    
    Browser->>Database: Query with JWT
    Database->>Database: Validate JWT
    Database->>Database: Apply RLS policies
    Database->>Browser: Filtered results
    
    Browser->>Edge Function: Request with Bearer token
    Edge Function->>Supabase Auth: getUser(token)
    Supabase Auth->>Edge Function: User object
    Edge Function->>Database: Query as user
```

### Role-Based Access Control

| Role | Permissions |
|------|-------------|
| `user` | CRUD own resources only |
| `admin` | View all users, system metrics |
| `super_admin` | Modify user roles, full access |

### RLS Policy Patterns

```sql
-- Owner-based access
CREATE POLICY "Users can view their own projects"
ON projects FOR SELECT
USING (owner_id = auth.uid());

-- Access via join
CREATE POLICY "Users can view chunks of their own documents"
ON chunks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM documents
  WHERE documents.id = chunks.document_id
  AND documents.owner_id = auth.uid()
));

-- Admin override
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (is_admin(auth.uid()));
```

---

## Data Flow

### Document Upload Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Storage
    participant Database
    participant Edge Function

    User->>Frontend: Drop file
    Frontend->>Frontend: Check quota
    Frontend->>Storage: Upload file
    Storage->>Frontend: Storage path
    Frontend->>Database: Insert document record
    Database->>Frontend: Document ID
    Frontend->>Edge Function: process-document(id)
    Edge Function->>Edge Function: Run 6-stage pipeline
    Edge Function->>Database: Update document status
    Database-->>Frontend: Realtime update
    Frontend->>User: Show "Ready" status
```

### Search Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Edge Function
    participant OpenAI
    participant Database

    User->>Frontend: Enter search query
    Frontend->>Edge Function: semantic-search(query)
    Edge Function->>OpenAI: Generate embedding
    OpenAI->>Edge Function: Query vector
    Edge Function->>Database: hybrid_search_documents()
    Database->>Database: Combine vector + fulltext scores
    Database->>Edge Function: Ranked results
    Edge Function->>Frontend: Search results
    Frontend->>User: Display matches
```

---

## Module Structure

### Frontend Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui primitives
│   ├── layout/          # Layout components
│   ├── documents/       # Document components
│   ├── training/        # Training components
│   ├── search/          # Search components
│   ├── graph/           # Knowledge graph components
│   ├── admin/           # Admin components
│   └── ...
├── pages/               # Route components
│   ├── Dashboard.tsx
│   ├── Projects.tsx
│   ├── ProjectDetail.tsx
│   ├── Training.tsx
│   ├── admin/           # Admin pages
│   └── ...
├── hooks/               # React hooks
│   ├── useDocuments.ts
│   ├── useTraining.ts
│   ├── useSearch.ts
│   └── ...
├── services/            # API abstraction
│   ├── documentService.ts
│   ├── trainingService.ts
│   ├── searchService.ts
│   └── ...
├── types/               # TypeScript types
└── lib/                 # Utilities
```

### Edge Functions Structure

```
supabase/functions/
├── _shared/                    # Shared utilities
│   ├── pipeline-types.ts       # Type definitions
│   ├── artifact-registry.ts    # Version tracking
│   ├── execution-contracts.ts  # Schema validation
│   ├── semantic-chunking.ts    # Chunking strategies
│   ├── metrics-collector.ts    # Metrics collection
│   ├── ai-safety.ts            # Prompt injection guards
│   └── stage-helpers.ts        # Common utilities
├── process-document/           # Pipeline orchestrator
├── ingestion-executor/         # Stage 1
├── extraction-executor/        # Stage 2
├── language-executor/          # Stage 3
├── chunking-executor/          # Stage 4
├── summarization-executor/     # Stage 5
├── indexing-executor/          # Stage 6
├── semantic-search/            # Hybrid search
├── generate-training-data/     # Dataset generation
├── start-training/             # OpenAI fine-tuning
└── ...                         # 50+ more functions
```

---

## Related Documentation

- [API_REFERENCE.md](./API_REFERENCE.md) - Complete API documentation
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Full database schema
- [AI_SERVICES.md](./AI_SERVICES.md) - AI providers and prompts
- [SECURITY.md](./SECURITY.md) - Security implementation details
