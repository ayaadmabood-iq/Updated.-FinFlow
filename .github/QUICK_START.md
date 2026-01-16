# CI/CD Quick Start Guide

## Setup (One-time)

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Git Hooks
```bash
npm run prepare
```

This installs Husky hooks that will:
- Run linting and type checking before commits
- Run tests before pushes

### 3. Verify Setup
```bash
# Run linting
npm run lint

# Run tests
npm run test

# Check formatting
npm run format:check

# Type check
npm run type-check
```

## Daily Workflow

### Creating a New Feature

1. **Create Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Develop**
   ```bash
   # Make your changes
   npm run dev

   # Run tests as you go
   npm run test:watch
   ```

3. **Commit**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   # Pre-commit hooks run automatically
   ```

4. **Push**
   ```bash
   git push origin feature/your-feature-name
   # Pre-push hooks run automatically
   ```

5. **Create PR**
   - Go to GitHub
   - Create Pull Request to `develop`
   - Fill in PR template
   - Wait for CI checks
   - Request reviews

### Fixing a Bug

```bash
git checkout develop
git pull origin develop
git checkout -b fix/bug-description
# Make fixes
git commit -m "fix: resolve bug description"
git push origin fix/bug-description
# Create PR
```

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructuring
- `test` - Tests
- `chore` - Maintenance

**Examples:**
```bash
git commit -m "feat(auth): add OAuth login"
git commit -m "fix(ui): resolve button alignment"
git commit -m "docs(readme): update setup instructions"
git commit -m "test(api): add user endpoint tests"
```

## Running Checks Locally

Before pushing, run these checks:

```bash
# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check

# Run all tests
npm run test

# Build
npm run build
```

## Bypassing Hooks (Emergency Only)

```bash
# Skip pre-commit (not recommended)
git commit --no-verify -m "message"

# Skip pre-push (not recommended)
git push --no-verify
```

**Note:** CI will still run these checks!

## PR Checklist

Before requesting review, ensure:
- [ ] All tests pass locally
- [ ] No TypeScript errors
- [ ] Code is formatted
- [ ] PR template filled out
- [ ] Tests added for new features
- [ ] Documentation updated

## Getting Help

- **CI Failing?** Check Actions tab for logs
- **Tests Failing?** Run `npm run test` locally
- **Hooks Not Working?** Run `npm run prepare`
- **Merge Conflicts?** Merge develop into your branch

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview build

# Testing
npm run test             # Run tests once
npm run test:watch       # Run tests in watch mode
npm run test:ci          # Run with coverage

# Code Quality
npm run lint             # Check linting
npm run lint:fix         # Fix linting issues
npm run format           # Format code
npm run format:check     # Check formatting
npm run type-check       # TypeScript check

# CI/CD
npm run verify:ai-protection    # Verify AI safety
npm run verify:rate-limiting    # Verify rate limits
```

## Troubleshooting

### "Pre-commit hook failed"
```bash
npm run lint:fix
npm run format
npm run type-check
git commit -m "your message"
```

### "Tests failing"
```bash
npm ci
npm run test
```

### "Type errors"
```bash
npm run type-check
# Fix reported errors
```

### "Format check failed"
```bash
npm run format
git add .
git commit --amend --no-edit
```

## Resources

- [Full CI/CD Documentation](.github/CI-CD-README.md)
- [Deployment Guide](.github/DEPLOYMENT_GUIDE.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

---

**Questions?** Ask in #engineering channel or create an issue.
