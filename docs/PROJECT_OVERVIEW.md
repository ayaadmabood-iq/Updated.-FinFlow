# FineFlow Project Overview

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [System Requirements](#system-requirements)

---

## Executive Summary

**FineFlow** is an enterprise-grade **Document Intelligence & RAG Training Platform** designed to help teams transform unstructured documents into actionable knowledge. The platform combines advanced document processing, semantic search, and AI-powered training data generation to enable organizations to build custom fine-tuned language models from their proprietary knowledge bases.

### Value Proposition

- **Streamline Document Intelligence**: Automatically process, chunk, and index documents for instant semantic search
- **Build Training Datasets**: Generate high-quality Q&A pairs from document content using AI
- **Fine-tune Custom Models**: Seamless integration with OpenAI's fine-tuning API for building domain-specific LLMs
- **Cost-Conscious AI**: Built-in budget controls and quota management to prevent cost overruns
- **Enterprise Ready**: Multi-tenant architecture with teams, roles, and comprehensive audit logging

---

## Key Features

### Document Processing

| Feature | Description |
|---------|-------------|
| Multi-Format Support | PDF, DOCX, TXT, HTML, JSON, CSV, and more |
| 6-Stage Pipeline | Ingestion → Extraction → Language Detection → Chunking → Summarization → Indexing |
| Smart Chunking | Fixed-size, sentence-based, and heuristic semantic chunking strategies |
| Automatic Summarization | AI-generated document summaries for quick overview |
| Language Detection | Automatic detection of 15+ languages including RTL support |
| Processing Resume | Resume failed processing from any pipeline stage |

### Search & Discovery

| Feature | Description |
|---------|-------------|
| Hybrid Search | Combines full-text (PostgreSQL tsvector) and semantic (pgvector) search |
| Chunk-Level Search | Search within document chunks for precise results |
| Document-Level Search | Search across full documents with summary matching |
| Advanced Filters | Filter by project, file type, language, date range |
| Cross-Language Search | Search in one language, find results in another |

### Training Data Generation

| Feature | Description |
|---------|-------------|
| AI Q&A Generation | Generate instruction-tuning pairs from document content |
| Multiple Formats | OpenAI, Anthropic, Alpaca, ShareGPT export formats |
| Quality Scoring | Automatic quality assessment of generated pairs |
| Manual Curation | Edit, approve, and refine training data |
| Dataset Versioning | Track changes with version history and snapshots |
| Prompt Injection Protection | Built-in guards against malicious content |

### Model Fine-Tuning

| Feature | Description |
|---------|-------------|
| OpenAI Integration | Direct integration with OpenAI Fine-tuning API |
| Job Management | Start, monitor, and cancel training jobs |
| Cost Estimation | Pre-training cost estimates based on dataset size |
| Model Testing | Test fine-tuned models directly in the platform |

### Budget & Quota Management

| Feature | Description |
|---------|-------------|
| Per-Project Budgets | Set monthly spending limits per project |
| Enforcement Modes | Warn, abort, or auto-downgrade when limits reached |
| Cost Tracking | Detailed cost breakdown by operation type |
| Tiered Quotas | Free, Starter, Pro, Enterprise subscription tiers |
| Usage Analytics | Visualize spending trends and projections |

### Collaboration & Teams

| Feature | Description |
|---------|-------------|
| Team Workspaces | Create and manage team projects |
| Role-Based Access | Owner, Admin, Editor, Viewer roles |
| Project Sharing | Share projects across teams |
| Real-time Presence | See who's viewing documents |
| Document Annotations | Add comments and highlights |
| Audit Logging | Complete activity history |

### Knowledge Graph

| Feature | Description |
|---------|-------------|
| Entity Extraction | Automatic extraction of people, orgs, locations, concepts |
| Relationship Mapping | Discover connections between entities |
| Graph Visualization | Interactive 2D force-directed graph |
| Path Finding | Find connection paths between entities |
| Graph-Based Search | Search using entity relationships |

### Content Studio

| Feature | Description |
|---------|-------------|
| Content Generation | Generate presentations, memos, reports from documents |
| Tone Transformation | Convert content between formal, casual, technical styles |
| Template Library | Pre-built templates for common outputs |
| Version History | Track all content iterations |

### Localization

| Feature | Description |
|---------|-------------|
| 7 Languages | English, Arabic, Spanish, French, German, Chinese, Hindi |
| RTL Support | Full right-to-left layout support for Arabic |
| Arabic Dialects | MSA, Gulf, Egyptian, Levantine, Maghrebi detection |
| Jurisdiction Terms | Legal terminology by jurisdiction (UAE, KSA, Egypt, etc.) |

### Admin & Operations

| Feature | Description |
|---------|-------------|
| User Management | View, edit, suspend users (admin only) |
| System Metrics | Processing throughput, error rates, costs |
| Pipeline Analytics | Stage-level performance monitoring |
| Audit Logs | Comprehensive security and activity logging |

---

## Technology Stack

### Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Framework | 18.3.x |
| TypeScript | Type Safety | 5.x |
| Vite | Build Tool | 5.x |
| Tailwind CSS | Styling | 3.x |
| shadcn/ui | Component Library | Latest |
| React Query | Data Fetching | 5.x |
| React Router | Routing | 6.x |
| i18next | Internationalization | 25.x |
| Recharts | Data Visualization | 2.x |
| Lucide React | Icons | 0.462.x |

### Backend (Lovable Cloud / Supabase)

| Technology | Purpose |
|------------|---------|
| Supabase | Backend-as-a-Service |
| PostgreSQL | Primary Database |
| pgvector | Vector Similarity Search |
| Edge Functions | Serverless Compute (Deno) |
| Supabase Auth | Authentication (JWT) |
| Supabase Storage | File Storage (S3-compatible) |
| Row Level Security | Database Access Control |
| Realtime | WebSocket Subscriptions |

### AI Services

| Service | Purpose |
|---------|---------|
| Lovable AI Gateway | Primary AI provider (no API key needed) |
| OpenAI API | Embeddings, Fine-tuning (user's key) |
| Google Gemini | Text generation via Lovable AI |
| GPT-4/5 | Advanced reasoning via Lovable AI |

### Supported AI Models (via Lovable AI)

| Model | Use Case |
|-------|----------|
| google/gemini-2.5-pro | Complex reasoning, multimodal |
| google/gemini-2.5-flash | Balanced performance/cost |
| google/gemini-2.5-flash-lite | Fast, simple tasks |
| openai/gpt-5 | Advanced reasoning |
| openai/gpt-5-mini | Cost-effective AI tasks |
| text-embedding-3-small | Semantic search embeddings |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Linting |
| Vitest | Unit Testing |
| Zod | Schema Validation |

---

## System Requirements

### Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| Chrome | 90+ | Recommended |
| Firefox | 88+ | Full support |
| Safari | 14+ | Full support |
| Edge | 90+ | Full support |
| Mobile Safari | iOS 14+ | PWA support |
| Chrome Mobile | Android 10+ | PWA support |

### Network Requirements

| Requirement | Details |
|-------------|---------|
| Connection | Stable internet (5+ Mbps recommended) |
| Protocol | HTTPS only |
| WebSocket | Required for real-time features |
| Ports | Standard 443 (HTTPS) |

### Device Requirements

| Platform | Minimum Specs |
|----------|---------------|
| Desktop | 4GB RAM, modern CPU |
| Tablet | iPad (2018+) or equivalent |
| Mobile | iPhone 8+ / Android 10+ |
| Screen | 320px minimum width (responsive) |

### File Upload Limits

| Limit | Value |
|-------|-------|
| Maximum File Size | 50 MB |
| Supported Formats | PDF, DOCX, TXT, MD, HTML, JSON, CSV |
| Image Formats | PNG, JPG, GIF, WebP (storage only) |
| Audio/Video | MP3, WAV, MP4 (storage, limited processing) |

### Storage Quotas by Tier

| Tier | Documents | Processing/Month | Storage |
|------|-----------|------------------|---------|
| Free | 10 | 20 | 100 MB |
| Starter | 100 | 200 | 1 GB |
| Pro | 1,000 | 2,000 | 10 GB |
| Enterprise | Unlimited | Unlimited | 100 GB |

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and data flows
- [API_REFERENCE.md](./API_REFERENCE.md) - Complete API documentation
- [USER_GUIDE.md](./USER_GUIDE.md) - End-user documentation
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Development setup and guidelines
