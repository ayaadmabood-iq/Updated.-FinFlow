# FineFlow Changelog

## Version History

| Version | Date | Summary |
|---------|------|---------|
| v5.1 | 2026-01 | Real-time collaboration, security hardening |
| v5.0 | 2024-01 | Pipeline decomposition, AI governance |
| v4.0 | 2023-12 | Budget system, quota management |
| v3.0 | 2023-11 | Training & fine-tuning |
| v2.0 | 2023-10 | Hybrid search, teams |
| v1.0 | 2023-09 | Initial release |

---

## v5.1 - Real-time Collaboration & Security (2026-01)

### Features
- **Real-time Collaboration**: Cursor sharing, document locks, edit history
- **Thread Branching**: Create conversation branches in chat
- **Activity Pulse**: Team activity sidebar
- **Document Annotations**: AI-powered annotation responses

### Security
- Media-assets storage bucket made private
- Owner-scoped RLS policies for storage
- Security definer view fixes
- Enhanced audit logging

### Technical
- Database realtime enabled for collaboration tables
- New `document_locks`, `collaborative_edits`, `user_cursors` tables
- Improved error handling in edge functions

---

## v5.0 - Pipeline Architecture (2024-01)

### Features
- **6-Stage Pipeline**: Ingestion → Extraction → Language → Chunking → Summarization → Indexing
- **Orchestrator Pattern**: Centralized pipeline control
- **Version Tracking**: Artifact registry for all processing outputs
- **Stage Metrics**: Performance monitoring per stage

### Technical
- Isolated stage executors
- Reference-based data passing
- Smart re-processing detection
- Resume from any stage

---

## v4.0 - Budget & Quotas (2023-12)

### Features
- Per-project monthly budgets
- Enforcement modes (warn, abort, auto-downgrade)
- Cost tracking by operation
- Subscription tiers (Free, Starter, Pro, Enterprise)

---

## v3.0 - Training Platform (2023-11)

### Features
- Training dataset creation
- Q&A pair generation from documents
- OpenAI fine-tuning integration
- Dataset versioning

---

## v2.0 - Search & Teams (2023-10)

### Features
- Hybrid search (semantic + full-text)
- Team workspaces
- Role-based access control
- Project sharing

---

## v1.0 - Initial Release (2023-09)

### Features
- Document upload and processing
- Text extraction
- Basic search
- User authentication

---

## Known Issues

| Issue | Status | Workaround |
|-------|--------|------------|
| No OCR for scanned PDFs | Planned | Pre-process externally |
| Large file processing slow | Known | Split documents |
| Training job polling timeout | Known | Manual status check |

---

## Planned Improvements

### Short Term
- [ ] ProcessingTimeline in document detail
- [ ] Improved error messages
- [ ] Better loading states

### Medium Term
- [ ] True semantic chunking
- [ ] RAG evaluation UI
- [ ] Project export/import

### Long Term
- [ ] OCR integration
- [ ] Multiple embedding models
- [ ] SSO/SAML support
