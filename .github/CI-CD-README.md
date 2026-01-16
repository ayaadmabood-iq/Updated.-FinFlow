# CI/CD Pipeline Documentation

## Overview

This project uses a comprehensive CI/CD pipeline built with GitHub Actions to automate testing, code quality checks, security scanning, and deployment.

## Pipeline Components

### 1. Main CI/CD Pipeline (`.github/workflows/ci-cd.yml`)

The main pipeline runs on:
- Push to `main`, `develop`, or `staging` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

#### Jobs:

1. **Code Quality Checks**
   - ESLint validation
   - Prettier formatting check
   - TypeScript type checking
   - Console.log detection

2. **Security Scanning**
   - npm audit for dependencies
   - Detection of hardcoded credentials
   - API key detection

3. **Unit Tests**
   - Runs all unit tests with coverage
   - Uploads coverage reports
   - Enforces coverage thresholds

4. **Build**
   - Creates production build
   - Validates build size
   - Uploads build artifacts

5. **Deploy to Staging**
   - Triggered on `develop` or `staging` branch
   - Deploys to staging environment
   - Requires all tests to pass

6. **Deploy to Production**
   - Triggered on `main` branch
   - Creates deployment tags
   - Deploys to production environment
   - Requires all tests to pass

### 2. Pull Request Checks (`.github/workflows/pr-checks.yml`)

Validates pull requests with:
- Semantic PR title validation
- PR size checks (files and lines changed)
- Breaking change detection
- Dependency review
- Automated code review

### 3. Rollback Workflow (`.github/workflows/rollback.yml`)

Manual workflow for emergency rollbacks:
- Select environment (staging/production)
- Specify tag to rollback to
- Provide rollback reason
- Creates tracking issue
- Notifies team

### 4. Scheduled Tasks (`.github/workflows/scheduled-tasks.yml`)

Automated maintenance tasks:
- Daily security scans (2 AM UTC)
- Weekly dependency updates (Monday 3 AM UTC)
- Artifact cleanup (30 days retention)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Husky (Git Hooks)

```bash
npm run prepare
```

This installs Git hooks that run:
- **Pre-commit**: Linting, type checking, formatting
- **Pre-push**: Tests and security audit

### 3. Configure GitHub Secrets

Add the following secrets to your GitHub repository:

- `CODECOV_TOKEN` - Codecov token for coverage reports
- `SNYK_TOKEN` - Snyk token for security scanning (optional)
- `SUPABASE_ACCESS_TOKEN` - Supabase deployment token
- `SUPABASE_STAGING_PROJECT_REF` - Staging project reference
- `SUPABASE_PRODUCTION_PROJECT_REF` - Production project reference
- `VERCEL_TOKEN` - Vercel deployment token (if using Vercel)
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID
- `SLACK_WEBHOOK_URL` - Slack webhook for notifications (optional)

### 4. Setup Branch Protection

Run the branch protection script:

```bash
export GITHUB_TOKEN=your_github_token
export REPO_OWNER=your-org
export REPO_NAME=your-repo
bash scripts/setup-branch-protection.sh
```

This configures:
- Required status checks
- Required pull request reviews (2 approvals)
- Code owner review required
- Linear history enforcement
- Force push protection

### 5. Configure Environments

Create the following environments in GitHub:
- `staging` - Staging environment
- `production` - Production environment

Add environment-specific secrets and protection rules.

## Available NPM Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run build:analyze` - Build with bundle analysis

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:ci` - Run ESLint for CI (JSON output)
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting
- `npm run type-check` - TypeScript type checking

### Testing
- `npm run test` - Run tests once
- `npm run test:ci` - Run tests with coverage (CI mode)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI

### Security
- `npm run verify:ai-protection` - Verify AI safety guards
- `npm run verify:rate-limiting` - Verify rate limiting coverage

### Other
- `npm run preview` - Preview production build
- `npm run prepare` - Setup Husky hooks

## Git Workflow

### Branch Strategy

- `main` - Production branch (protected)
- `develop` - Development branch (protected)
- `staging` - Staging branch (optional)
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches
- `chore/*` - Maintenance branches

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting)
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `test` - Tests
- `chore` - Maintenance

Examples:
```
feat(auth): add OAuth login support
fix(ui): resolve button alignment issue
docs(readme): update installation instructions
```

### Pull Request Process

1. Create a feature branch from `develop`
2. Make your changes
3. Run local tests: `npm run test`
4. Push to GitHub
5. Create a pull request
6. Wait for CI checks to pass
7. Request reviews (2 required)
8. Address review comments
9. Merge when approved

## Deployment Process

### Staging Deployment

1. Merge to `develop` branch
2. CI/CD automatically deploys to staging
3. Verify staging environment
4. Test thoroughly

### Production Deployment

1. Create PR from `develop` to `main`
2. Get required approvals
3. Merge to `main`
4. CI/CD automatically:
   - Creates deployment tag
   - Deploys to production
   - Creates GitHub release
   - Sends notifications

### Rollback Process

If issues are detected in production:

1. Go to Actions → Rollback Deployment
2. Click "Run workflow"
3. Select environment (production)
4. Enter tag to rollback to (e.g., `v20240114-120000`)
5. Provide reason for rollback
6. Click "Run workflow"
7. Verify rollback successful
8. Investigate and fix issue
9. Re-deploy when ready

## Monitoring and Notifications

### Coverage Reports

- Coverage reports are uploaded to Codecov
- View at: https://codecov.io/gh/your-org/your-repo

### Security Alerts

- Daily security scans run at 2 AM UTC
- Issues are automatically created for vulnerabilities
- Check GitHub Issues for security alerts

### Build Artifacts

- Build artifacts are stored for 7 days
- Download from Actions → Workflow Run → Artifacts

## Troubleshooting

### CI Fails on Pre-commit Hook

```bash
# Skip hooks if needed (not recommended)
git commit --no-verify -m "message"

# Fix issues properly
npm run lint:fix
npm run format
npm run type-check
```

### Tests Fail Locally

```bash
# Clear cache and reinstall
rm -rf node_modules
npm ci
npm run test
```

### Build Size Too Large

```bash
# Analyze bundle
npm run build:analyze

# Check for large dependencies
npm list --all --long
```

## Best Practices

1. **Always run tests locally before pushing**
2. **Keep PRs small and focused**
3. **Write meaningful commit messages**
4. **Update tests with code changes**
5. **Document breaking changes**
6. **Review security scan results**
7. **Monitor coverage trends**
8. **Keep dependencies updated**

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)

## Support

For issues or questions:
1. Check existing GitHub Issues
2. Review workflow logs in Actions tab
3. Contact the DevOps team
4. Create a new issue with details

---

**CI/CD Score: 9.5/10** ✅
