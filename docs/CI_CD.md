# CI/CD Pipeline Documentation

## Overview

FineFlow uses GitHub Actions for continuous integration and deployment with a robust pipeline that ensures code quality and safe deployments.

## Workflows

### 1. CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main` and `develop` branches.

**Jobs:**
- **Code Quality**: ESLint, Prettier, TypeScript checks
- **Unit Tests**: Vitest with coverage reporting
- **Build**: Production build verification
- **Security Scan**: npm audit and vulnerability checks
- **CI Gate**: Final validation before merge

### 2. Staging Deployment (`.github/workflows/deploy-staging.yml`)

Automatically deploys to staging on push to `develop` branch.

**Features:**
- Runs full CI checks first
- Deploys Supabase edge functions
- Optional Vercel deployment
- Smoke tests
- Slack notifications

**URL:** https://staging.fineflow.app

### 3. Production Deployment (`.github/workflows/deploy-production.yml`)

Automatically deploys to production on push to `main` branch.

**Features:**
- Full CI validation
- Pre-deployment checks
- Sentry release creation
- Edge function deployment
- Health checks
- Emergency deploy option (skip tests)

**URL:** https://fineflow.lovable.app

### 4. Security Scan (`.github/workflows/security-scan.yml`)

Weekly automated security scanning plus on-demand.

**Checks:**
- Dependency vulnerabilities
- CodeQL analysis
- Secret detection
- Edge function security

## Branch Strategy

```
main (production)
  └── develop (staging)
       └── feature/* (development)
```

## Required GitHub Secrets

### Supabase
- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_ANON_KEY`
- `STAGING_SUPABASE_PROJECT_REF`
- `PRODUCTION_SUPABASE_URL`
- `PRODUCTION_SUPABASE_ANON_KEY`
- `PRODUCTION_SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`

### Vercel (Optional)
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### Sentry (Optional)
- `SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`

### Notifications (Optional)
- `SLACK_WEBHOOK_URL`

## Branch Protection Rules

### For `main` branch:
- ✅ Require pull request before merging
- ✅ Require 1 approval
- ✅ Dismiss stale approvals on new commits
- ✅ Require status checks to pass:
  - Code Quality
  - Unit Tests
  - Build Application
  - CI Gate
- ✅ Require conversation resolution

### For `develop` branch:
- ✅ Require pull request before merging
- ✅ Require status checks to pass:
  - Code Quality
  - Unit Tests
  - Build Application

## Deployment Process

### Standard Flow

1. Create feature branch from `develop`
2. Make changes and push
3. Create PR to `develop`
4. CI runs automatically
5. Get approval and merge
6. Staging deploys automatically
7. Test on staging
8. Create PR from `develop` to `main`
9. Get approval and merge
10. Production deploys automatically

### Emergency Deploy

For critical hotfixes, use workflow dispatch with `skip_tests: true`:

```bash
gh workflow run deploy-production.yml -f skip_tests=true
```

⚠️ Use only for critical fixes that have been manually verified.

## Monitoring Deployments

### GitHub Actions UI
View all workflow runs at: `https://github.com/<org>/<repo>/actions`

### Deployment Status
- Check job summaries for deployment details
- View Sentry for error tracking
- Monitor Slack for notifications

## Troubleshooting

### CI Failures

1. **ESLint errors**: Run `npm run lint:fix`
2. **TypeScript errors**: Run `npm run type-check` locally
3. **Test failures**: Run `npm run test` locally
4. **Build failures**: Check for missing dependencies

### Deployment Failures

1. Check GitHub Actions logs
2. Verify secrets are configured
3. Check Supabase/Vercel status
4. Review edge function logs

## Local Commands

```bash
# Run all CI checks locally
npm run lint
npm run format:check
npm run type-check
npm run test
npm run build

# Fix issues
npm run lint:fix
npm run format
```
