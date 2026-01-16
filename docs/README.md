# FineFlow Documentation

> Enterprise Document Intelligence & RAG Training Platform

## Quick Navigation

| Document | Description |
|----------|-------------|
| [Overview](./OVERVIEW.md) | What FineFlow does and doesn't do |
| [Architecture](./ARCHITECTURE.md) | System design, module boundaries, request flows |
| [Database Schema](./DATABASE_SCHEMA.md) | All tables, columns, relationships, RLS policies |
| [Edge Functions](./EDGE_FUNCTIONS.md) | Backend functions reference |
| [AI Pipeline](./AI_PIPELINE.md) | Document processing pipeline details |
| [Search & Analytics](./SEARCH_ANALYTICS.md) | Hybrid search implementation |
| [Training & Fine-Tuning](./TRAINING_FINE_TUNING.md) | Dataset builder and training workflow |
| [Security](./SECURITY.md) | Auth, RLS, secrets, audit logging |
| [Deployment](./DEPLOYMENT.md) | Setup and deployment guide |
| [Operations Runbook](./OPERATIONS_RUNBOOK.md) | Incident handling and debugging |
| [Changelog](./CHANGELOG.md) | Known issues, tech debt, roadmap |

## Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│  (Vite + TailwindCSS + shadcn/ui + React Query)                 │
├──────────────────────────────────────────────────────────────────┤
│                     Service Layer                                │
│  documentService │ trainingService │ searchService │ etc.       │
├──────────────────────────────────────────────────────────────────┤
│                   Supabase Cloud                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Auth      │  │  Database   │  │   Storage   │              │
│  │  (JWT)      │  │ (Postgres)  │  │  (S3-compat)│              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────────────────────────────────────────┐             │
│  │             Edge Functions (Deno)               │             │
│  │  process-document │ semantic-search │ start-   │             │
│  │  training │ generate-training-data │ ...       │             │
│  └─────────────────────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────────┘
```

## Key Flows

### Document Processing
1. **Upload** → File stored in `project-documents` bucket
2. **Process** → 6-stage pipeline (ingestion → extraction → language → chunking → summarization → indexing)
3. **Ready** → Document searchable with hybrid FTS + semantic search

### Training Data
1. **Select Chunks** → From processed documents
2. **Generate Dataset** → AI creates Q&A pairs from chunks
3. **Review/Edit** → Manual curation of training pairs
4. **Export JSONL** → Download in OpenAI/Anthropic/Alpaca format
5. **Start Training** → Submit to OpenAI fine-tuning API

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| State | React Query (TanStack Query) |
| Auth | Supabase Auth (JWT) |
| Database | PostgreSQL (via Supabase) |
| Storage | Supabase Storage (S3-compatible) |
| Backend | Supabase Edge Functions (Deno) |
| AI | OpenAI API (embeddings, fine-tuning), Lovable AI Gateway |
| Search | PostgreSQL FTS + pgvector |

## Getting Started

```bash
# Clone and install
git clone <repo>
cd fineflow
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development
npm run dev
```

See [Deployment Guide](./DEPLOYMENT.md) for full setup instructions.

## Project Structure

```
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API service layer
│   ├── pages/          # Route components
│   ├── types/          # TypeScript definitions
│   └── lib/            # Utilities
├── supabase/
│   ├── functions/      # Edge Functions
│   │   ├── _shared/    # Shared utilities
│   │   └── */          # Individual functions
│   ├── migrations/     # Database migrations
│   └── config.toml     # Supabase configuration
├── apps/
│   └── backend/        # NestJS backend (future)
└── docs/               # This documentation
```

## License

Proprietary - All rights reserved.
