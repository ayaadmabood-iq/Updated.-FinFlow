# FineFlow Governance & Scope Control

> **Status:** ACTIVE  
> **Effective Date:** 2026-01-12  
> **Last Updated:** 2026-01-12  
> **Owner:** Technical Governance Lead

---

## 🚨 Feature Freeze Declaration

### Current Status: **ACTIVE FREEZE**

**Effective immediately**, the following are FROZEN until governance approval:

| Category | Status | Exceptions |
|----------|--------|------------|
| New product features | 🔴 FROZEN | None |
| New AI capabilities | 🔴 FROZEN | None |
| New database tables | 🔴 FROZEN | Critical security fixes |
| New workflows/agents | 🔴 FROZEN | None |
| New edge functions | 🔴 FROZEN | Bug fixes only |
| UI/UX changes | 🟡 LIMITED | Onboarding & clarity improvements |

### Allowed Activities

| Activity | Status | Approval Required |
|----------|--------|-------------------|
| Bug fixes | ✅ ALLOWED | Standard review |
| Security patches | ✅ ALLOWED | Security review |
| Stability improvements | ✅ ALLOWED | Standard review |
| Performance optimization | ✅ ALLOWED | Performance benchmark |
| Documentation | ✅ ALLOWED | None |
| Test coverage | ✅ ALLOWED | None |

---

## 1️⃣ Architecture Change Control

### Review Requirements

Any change affecting the following REQUIRES explicit governance approval:

1. **Backend Ownership**
   - Supabase vs Edge Functions responsibility
   - Data flow between services
   - API boundary changes

2. **Processing Pipeline**
   - Stage additions/removals
   - Stage order changes
   - Stage executor modifications

3. **Data Architecture**
   - New tables or columns
   - Foreign key relationships
   - Index changes on critical tables

### Architecture Review Checklist

Before any architectural change:

- [ ] Written justification provided
- [ ] No dual ownership of responsibilities
- [ ] No overlapping functionality with existing systems
- [ ] Rollback plan documented
- [ ] Performance impact assessed
- [ ] Security implications reviewed

### Decision Record Template

```markdown
## Architecture Decision Record (ADR)

**Title:** [Brief description]
**Date:** YYYY-MM-DD
**Status:** Proposed | Approved | Rejected | Superseded

### Context
[Why is this change needed?]

### Decision
[What change is being made?]

### Consequences
- Positive: [Benefits]
- Negative: [Tradeoffs]
- Risks: [What could go wrong]

### Approval
- [ ] Technical Lead
- [ ] Security Review
- [ ] Performance Assessment
```

---

## 2️⃣ Database Expansion Governance

### Current Database Status

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Tables | 100 | <80 | 🔴 Over limit |
| RLS Policies | ~320 | <70 | 🔴 Over limit |
| Triggers | ~65 | <10 | 🔴 Over limit |
| Functions | ~47 | <10 | 🔴 Over limit |

### Strict Rules

1. **New Tables**
   - DEFAULT STANCE: **REJECT**
   - Requires: Explicit justification + security review + performance assessment
   - Must prove no existing table can be extended

2. **New Triggers**
   - DEFAULT STANCE: **REJECT**
   - Only allowed for: Audit logging, timestamp updates
   - Business logic in triggers is PROHIBITED

3. **New Functions**
   - DEFAULT STANCE: **REJECT**
   - Must be pure utility functions
   - Business logic in PostgreSQL is PROHIBITED

4. **New RLS Policies**
   - DEFAULT STANCE: **REJECT**
   - Must consolidate with existing policies when possible
   - `USING (true)` patterns require security justification

### Database Change Approval Flow

```
Developer Request
       ↓
Written Justification Required
       ↓
Security Review (mandatory)
       ↓
Performance Impact Assessment
       ↓
Governance Approval
       ↓
Implementation with Rollback Plan
       ↓
Post-deployment Verification
```

### Prohibited Patterns

❌ Business logic in triggers  
❌ Complex calculations in PostgreSQL functions  
❌ Cascading trigger chains  
❌ Unversioned schema changes  
❌ Direct production modifications  

---

## 3️⃣ AI Feature Governance

### AI Change Requirements

Any AI-related change MUST include:

| Requirement | Description |
|-------------|-------------|
| User Need Validation | Evidence this solves a real user problem |
| Cost Estimation | Expected token/compute costs |
| Quality Metrics | How success will be measured |
| Rollback Plan | How to revert if issues arise |

### Prohibited AI Patterns

❌ Experimental AI features in production  
❌ "Nice-to-have" AI additions  
❌ Features without clear ROI  
❌ Silent changes to AI behavior  
❌ Unversioned model/prompt changes  

### AI Change Approval Flow

```
Proposed AI Change
       ↓
User Need Evidence Required
       ↓
Cost Estimation (tokens, compute, latency)
       ↓
Quality Baseline Established
       ↓
A/B Test or Shadow Deployment
       ↓
Metrics Review (precision, recall, latency, cost)
       ↓
Governance Approval
       ↓
Gradual Rollout (10% → 50% → 100%)
       ↓
Post-deployment Monitoring
```

### AI Governance Tables

The following tables enforce AI governance:

- `ai_change_requests` - All AI config changes tracked
- `ai_evaluation_gates` - Mandatory evaluation before deployment
- `ai_model_registry` - Model versioning and A/B testing
- `ai_quality_baselines` - Baseline metrics for regression detection
- `ai_regression_alerts` - Automatic regression detection
- `ai_governance_audit` - Immutable audit trail

---

## 4️⃣ Quality Gates & Release Discipline

### Mandatory Quality Gates

| Gate | Requirement | Blocker? |
|------|-------------|----------|
| Tests Pass | All unit/integration tests | 🔴 YES |
| Type Check | TypeScript compilation | 🔴 YES |
| Lint Clean | ESLint with no errors | 🔴 YES |
| Security Scan | No critical vulnerabilities | 🔴 YES |
| Performance | No regression beyond threshold | 🟡 REVIEW |
| Code Review | Approved by reviewer | 🔴 YES |

### Deployment Rules

1. **Manual deployments are PROHIBITED**
2. All deployments via CI/CD pipeline
3. Every release requires explicit approval
4. Rollback capability must be verified

### Release Checklist

Before any release:

- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] No new linter errors
- [ ] Security scan completed
- [ ] Performance benchmarks met
- [ ] Code review approved
- [ ] Release notes documented
- [ ] Rollback plan tested

---

## 5️⃣ Feature Scope Audit

### Core Features (KEEP)

These features represent FineFlow's core value proposition:

| Feature | Route | Status |
|---------|-------|--------|
| Dashboard | `/dashboard` | ✅ CORE |
| Projects | `/projects` | ✅ CORE |
| Documents | `/projects/:id` | ✅ CORE |
| Search | `/search` | ✅ CORE |
| Settings | `/settings` | ✅ CORE |

### Advanced Features (GATED)

These features are hidden behind "Advanced" section:

| Feature | Route | Status | Justification |
|---------|-------|--------|---------------|
| Training | `/training` | 🟡 GATED | Advanced user need |
| Datasets | `/datasets` | 🟡 GATED | Training prerequisite |
| Models | `/models` | 🟡 GATED | Training result view |
| Templates | `/templates` | 🟡 GATED | Advanced customization |
| Analytics | `/analytics` | 🟡 GATED | Advanced insights |

### Features Under Review (DEFER/REMOVE)

| Feature | Route | Recommendation | Reason |
|---------|-------|----------------|--------|
| Knowledge Graph | `/projects/:id/knowledge-graph` | 🔴 DEFER | Incomplete, complex |
| Studio | `/projects/:id/studio` | 🟡 REVIEW | Scope unclear |
| Pricing | `/pricing` | 🟡 REVIEW | Premature |
| Scan | `/scan` | 🔴 DEFER | Mobile-specific, incomplete |
| Audit Log | `/audit-log` | 🟡 REVIEW | Admin-only |

### Database Tables Review

#### Tables Flagged for Review

Based on current audit, the following tables may be candidates for consolidation:

| Table | Records | Purpose | Recommendation |
|-------|---------|---------|----------------|
| `cultural_tone_templates` | ? | Localization | 🟡 REVIEW |
| `dialect_mappings` | ? | Arabic dialects | 🟡 REVIEW |
| `jurisdiction_terms` | ? | Legal terms | 🟡 REVIEW |
| `rag_experiments` | ? | Experimental | 🔴 DEFER |
| `rag_experiment_runs` | ? | Experimental | 🔴 DEFER |
| `research_tasks` | ? | Agent tasks | 🟡 REVIEW |

---

## 6️⃣ What FineFlow Is NOT

To maintain focus, explicitly document scope exclusions:

### FineFlow is NOT:

- ❌ A general-purpose AI chatbot platform
- ❌ A workflow automation tool (like Zapier)
- ❌ A research paper generator
- ❌ A translation service
- ❌ A real-time collaboration editor
- ❌ A code generation platform
- ❌ A social/sharing platform

### FineFlow IS:

- ✅ A document processing and knowledge extraction platform
- ✅ A semantic search engine for your documents
- ✅ A fine-tuning data preparation tool
- ✅ A way to create AI-ready training datasets from your documents

---

## 7️⃣ Governance Violations & Escalation

### Violation Types

| Severity | Example | Response |
|----------|---------|----------|
| Critical | Unauthorized database changes | Immediate revert, incident review |
| High | Feature added without approval | Block merge, governance review |
| Medium | Quality gate bypass | Code review rejection |
| Low | Documentation missing | Must fix before next release |

### Escalation Path

1. **Developer** notices potential violation
2. **Tech Lead** reviews and confirms
3. **Governance Lead** makes final decision
4. **Incident documented** if violation occurred

---

## 8️⃣ Review Schedule

| Review Type | Frequency | Next Scheduled |
|-------------|-----------|----------------|
| Feature Freeze Status | Weekly | 2026-01-19 |
| Database Complexity | Monthly | 2026-02-12 |
| AI Quality Metrics | Weekly | 2026-01-19 |
| Security Posture | Weekly | 2026-01-19 |
| Scope Creep Audit | Monthly | 2026-02-12 |

---

## Appendix A: Current Security Issues

From latest linter scan (2026-01-12):

| Issue | Severity | Count | Status |
|-------|----------|-------|--------|
| Security Definer Views | ERROR | 4 | 🔴 NEEDS FIX |
| RLS Policy Always True | WARN | 6+ | 🟡 REVIEW |
| Materialized View in API | WARN | 1 | 🟡 REVIEW |
| RLS Enabled No Policy | INFO | 1 | 🟡 REVIEW |

---

## Appendix B: Governance Approval Contacts

| Area | Primary Contact | Backup |
|------|-----------------|--------|
| Architecture | Tech Lead | Sr. Engineer |
| Database | DBA / Tech Lead | Sr. Engineer |
| AI Features | AI Lead | Tech Lead |
| Security | Security Lead | Tech Lead |
| Release | Release Manager | Tech Lead |

---

**Document Version:** 1.0  
**Classification:** Internal  
**Review Cycle:** Monthly
