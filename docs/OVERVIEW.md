# FineFlow Overview

## What is FineFlow?

FineFlow is a **Document Intelligence & RAG Training Platform** that helps teams:

1. **Process Documents** - Upload, extract text, chunk, and index documents for search
2. **Search Intelligently** - Hybrid search combining full-text and semantic (embedding) search
3. **Build Training Datasets** - Generate Q&A pairs from document chunks using AI
4. **Fine-tune Models** - Submit datasets to OpenAI for model fine-tuning
5. **Manage Costs** - Budget controls and usage quotas per project

## What FineFlow Does

### ✅ Document Processing
- Upload PDF, DOCX, TXT, HTML, JSON, CSV, and other text formats
- Automatic text extraction with multiple strategies
- Language detection
- Smart chunking (fixed-size, sentence-based, or semantic)
- Automatic summarization
- Embedding generation for semantic search

### ✅ Search
- Full-text search using PostgreSQL tsvector
- Semantic search using OpenAI embeddings (text-embedding-3-small)
- Hybrid search combining both methods with configurable weights
- Filters by project, file type, language, date range
- Search at document or chunk level

### ✅ Training Data Generation
- AI-generated Q&A pairs from document chunks
- Multiple modes: auto, Q&A, instruction, conversation
- Support for OpenAI, Anthropic, Alpaca, ShareGPT formats
- Quality scoring and validation
- Manual editing and curation
- Version control for datasets

### ✅ Fine-Tuning Integration
- Direct integration with OpenAI Fine-tuning API
- Real-time job status tracking
- Training job cancellation
- Cost estimation before training

### ✅ Multi-Tenancy & Teams
- Project-based organization
- Team collaboration with roles (owner, admin, editor, viewer)
- Project sharing between teams

### ✅ Budget & Quota Management
- Per-project monthly budgets
- Configurable enforcement modes (warn, abort, auto-downgrade)
- Cost tracking by operation type
- Tiered quotas (free, starter, pro, enterprise)

### ✅ Admin Features
- User management
- System-wide metrics
- Processing stage analytics
- Audit logging

## What FineFlow Does NOT Do

### ❌ Not Implemented / Out of Scope

| Feature | Status | Notes |
|---------|--------|-------|
| OCR for scanned PDFs | ❌ Not implemented | Extraction assumes machine-readable text |
| Audio/Video transcription | ❌ Partial | MIME types defined, but transcription not implemented |
| Image understanding | ❌ Not implemented | Images are stored but not analyzed |
| Real-time collaboration | ❌ Not implemented | No concurrent editing |
| Self-hosted training | ❌ Not implemented | Only OpenAI API integration |
| Custom embedding models | ❌ Not implemented | Fixed to text-embedding-3-small |
| RAG inference endpoint | ❌ Not implemented | Search only, no generation |
| API rate limiting | ❌ Basic | Quota-based, not request-rate based |
| Webhook notifications | ❌ Not implemented | In-app notifications only |
| SSO / SAML | ❌ Not implemented | Email/password auth only |
| Custom domains | ❌ Not implemented | Single deployment domain |
| Data export/backup | ❌ Partial | JSONL export for datasets only |

### ⚠️ Partial Implementations

| Feature | Status | Notes |
|---------|--------|-------|
| NestJS Backend | ⚠️ Scaffolded | Code exists but not active; Supabase is primary |
| Chunking strategies | ⚠️ Partial | "semantic" is heuristic-based, not true embedding clustering |
| RAG evaluation | ⚠️ Basic | Retrieval precision function exists, limited UI |
| Processing resume | ⚠️ Works | Can resume from failed stage, but UI could be clearer |
| Auto-training | ⚠️ Disabled | Feature flags exist but not exposed |

## User Roles

| Role | Permissions |
|------|-------------|
| `user` | CRUD own projects, documents, datasets, training jobs |
| `admin` | All user permissions + view all users, system metrics |
| `super_admin` | All admin permissions + modify user roles |

## Subscription Tiers

| Tier | Documents | Processing/mo | Storage |
|------|-----------|---------------|---------|
| Free | 10 | 20 | 100 MB |
| Starter | 100 | 200 | 1 GB |
| Pro | 1,000 | 2,000 | 10 GB |
| Enterprise | Unlimited | Unlimited | 100 GB |

## Key Limitations

1. **File Size**: Maximum 50 MB per file
2. **Processing Time**: Complex documents may take 30-60 seconds
3. **Embedding API**: Requires OpenAI API key for semantic search
4. **Fine-tuning**: Requires user's own OpenAI API key
5. **Concurrent Processing**: One document at a time per user (double-trigger protection)
6. **Search Results**: Default limit of 1000 rows from Supabase queries
