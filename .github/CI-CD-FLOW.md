# CI/CD Pipeline Flow Diagram

## Overall Architecture

```
Developer → GitHub Repository → GitHub Actions → Staging/Production
    │              │                   │                 │
    │              │                   │                 │
    └─ Local ──────┴─── PR/Merge ─────┴─── Deploy ─────┘
       Hooks            Triggers           Automated
```

## Workflow Trigger Matrix

| Event | Workflow | Actions |
|-------|----------|---------|
| **Push to feature/** | None | Local hooks only |
| **PR to develop** | PR Checks + CI/CD | Validation, tests, build |
| **Merge to develop** | CI/CD + Deploy Staging | Full pipeline + staging deploy |
| **PR to main** | PR Checks + CI/CD | Validation, tests, build |
| **Merge to main** | CI/CD + Deploy Production | Full pipeline + production deploy |
| **Daily (2 AM)** | Security Scan | Vulnerability checks |
| **Weekly (Mon 3 AM)** | Dependency Updates | Update deps, create PR |
| **Manual** | Rollback | Emergency rollback |

## Main CI/CD Pipeline Steps

1. **Code Quality Checks**
   - ESLint validation
   - Prettier formatting
   - TypeScript type checking
   - Console.log detection

2. **Security Scanning**
   - npm audit
   - Hardcoded credential detection
   - API key scanning

3. **Unit Tests**
   - Run all tests
   - Generate coverage reports
   - Upload to artifacts

4. **Build**
   - Production build
   - Size validation
   - Artifact storage

5. **Deploy** (conditional)
   - Staging: develop branch
   - Production: main branch

## Git Hooks Flow

**Pre-commit:**
- ESLint fix
- TypeScript check
- Prettier check

**Pre-push:**
- Run all tests
- Security audit

## Pull Request Lifecycle

1. Create PR
2. Automated checks (title, size, breaking changes)
3. CI/CD pipeline runs
4. Code review (2 approvals required)
5. Merge (if all pass)
6. Auto deployment

## Deployment Flow (main branch)

1. Merge to main
2. Run all tests
3. Build application
4. Create deployment tag (vYYYYMMDD-HHMMSS)
5. Deploy to production
6. Run smoke tests
7. Create GitHub release
8. Send notifications

## Rollback Flow

1. Issue detected
2. Trigger rollback workflow (manual)
3. Select environment and tag
4. Checkout previous version
5. Build and deploy
6. Verify with smoke tests
7. Create incident issue
8. Notify team

## Quality Gates

All must pass before merge:
- Code quality (ESLint, Prettier, TypeScript)
- Security (no secrets, audit pass)
- Tests (80% coverage, all pass)
- Build (success, size check)
- Review (2 approvals, code owner)

---

**All flows are automated and integrated with GitHub Actions.**
