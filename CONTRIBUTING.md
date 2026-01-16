# FineFlow Development Rules

> ⚠️ **READ BEFORE CODING**  
> These rules are MANDATORY. Violations will block merges.

## 🚨 FEATURE FREEZE IN EFFECT

**DO NOT:**
- Add new features
- Create new database tables
- Add new AI capabilities
- Create new workflows

**ALLOWED:**
- Bug fixes
- Security patches
- Performance improvements
- Documentation
- Test coverage

---

## Quick Rules

### 1. Database Changes
```
DEFAULT: REJECT
```
- No new tables without governance approval
- No new triggers (business logic belongs in code)
- No new PostgreSQL functions
- All schema changes require security review

### 2. AI Changes
```
DEFAULT: REJECT
```
- No experimental AI in production
- All AI changes require cost estimation
- All AI changes require quality metrics
- A/B test before full rollout

### 3. Architecture Changes
```
DEFAULT: REJECT
```
- No changes to backend ownership
- No changes to pipeline stages
- Written justification required
- Rollback plan required

### 4. Quality Gates
```
ALL REQUIRED:
✓ Tests pass
✓ TypeScript compiles
✓ No lint errors
✓ Security scan clean
✓ Code review approved
```

---

## Core vs Advanced Features

### CORE (Always Visible)
- Dashboard
- Projects
- Search
- Settings

### ADVANCED (Gated)
- Training
- Datasets
- Models
- Templates
- Analytics

### DEFERRED (Do Not Touch)
- Knowledge Graph
- Studio (scope unclear)
- Scan (mobile, incomplete)

---

## Before You Code

1. Check if this is allowed during freeze
2. Check if similar functionality exists
3. Write justification if architectural
4. Get approval if database change
5. Add tests for any change
6. Update docs if behavior changes

---

## Questions?

Read: `docs/GOVERNANCE.md`
