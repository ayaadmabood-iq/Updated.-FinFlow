# CI/CD Setup Checklist

## Immediate Setup (Required)

### 1. Install Dependencies
- [ ] Run `npm install`
- [ ] Verify all packages installed successfully

### 2. Setup Git Hooks
- [ ] Run `npm run prepare`
- [ ] Verify `.husky` directory was created
- [ ] Test pre-commit hook: `git commit --allow-empty -m "test"`
- [ ] Make hooks executable (Linux/Mac): `chmod +x .husky/*`

### 3. Verify Local Development
- [ ] Run `npm run lint` - should pass
- [ ] Run `npm run format:check` - should pass
- [ ] Run `npm run type-check` - should pass
- [ ] Run `npm run test` - should pass
- [ ] Run `npm run build` - should succeed

### 4. Test Git Workflow
- [ ] Create test branch: `git checkout -b test/ci-setup`
- [ ] Make a small change
- [ ] Commit (hooks should run)
- [ ] Push to GitHub
- [ ] Verify Actions run
- [ ] Delete test branch

## GitHub Configuration (When Ready to Deploy)

### 5. Configure Repository Settings
- [ ] Enable GitHub Actions
- [ ] Enable Issues
- [ ] Enable Pull Requests
- [ ] Set default branch to `main`

### 6. Create Branches
- [ ] Create `develop` branch from `main`
- [ ] Create `staging` branch (optional)

### 7. Setup Environments
- [ ] Create `staging` environment in GitHub
- [ ] Create `production` environment in GitHub
- [ ] Configure environment protection rules

### 8. Add GitHub Secrets (Optional but Recommended)
- [ ] `CODECOV_TOKEN` - For coverage reports
- [ ] `SNYK_TOKEN` - For security scanning
- [ ] `SLACK_WEBHOOK_URL` - For notifications

### 9. Add Deployment Secrets (When Ready)
- [ ] `SUPABASE_ACCESS_TOKEN`
- [ ] `SUPABASE_STAGING_PROJECT_REF`
- [ ] `SUPABASE_PRODUCTION_PROJECT_REF`
- [ ] `VERCEL_TOKEN` (if using Vercel)
- [ ] `VERCEL_ORG_ID`
- [ ] `VERCEL_PROJECT_ID`

### 10. Configure Branch Protection
- [ ] Update `scripts/setup-branch-protection.sh` with your org/repo
- [ ] Set `GITHUB_TOKEN` environment variable
- [ ] Run: `bash scripts/setup-branch-protection.sh`
- [ ] Verify protection rules in GitHub settings

### 11. Update CODEOWNERS
- [ ] Edit `.github/CODEOWNERS`
- [ ] Replace placeholder teams with actual teams
- [ ] Commit changes

## Team Setup

### 12. Create Teams (if using organizations)
- [ ] Create `@your-org/core-team`
- [ ] Create `@your-org/devops-team`
- [ ] Create `@your-org/security-team`
- [ ] Create `@your-org/frontend-team`
- [ ] Create `@your-org/backend-team`
- [ ] Create `@your-org/docs-team`

### 13. Assign Permissions
- [ ] Grant teams appropriate repository access
- [ ] Add members to teams
- [ ] Configure team notifications

## Documentation

### 14. Review Documentation
- [ ] Read `.github/CI-CD-README.md`
- [ ] Read `.github/DEPLOYMENT_GUIDE.md`
- [ ] Read `.github/QUICK_START.md`
- [ ] Share with team

### 15. Update Project README
- [ ] Add CI/CD badges
- [ ] Link to CI/CD documentation
- [ ] Document development workflow

## Optional Enhancements

### 16. Advanced Security (Optional)
- [ ] Enable GitHub Code Scanning
- [ ] Enable Dependabot alerts
- [ ] Enable Secret scanning
- [ ] Configure SECURITY.md

### 17. Monitoring (Optional)
- [ ] Setup Sentry for error tracking
- [ ] Configure performance monitoring
- [ ] Setup uptime monitoring
- [ ] Create status page

### 18. Additional Workflows (Optional)
- [ ] Add E2E tests workflow
- [ ] Add performance testing
- [ ] Add lighthouse CI
- [ ] Add visual regression testing

### 19. Notifications (Optional)
- [ ] Configure Slack integration
- [ ] Setup email notifications
- [ ] Configure Discord webhooks
- [ ] Setup mobile alerts

## Testing

### 20. Test Pull Request Flow
- [ ] Create PR from feature branch to develop
- [ ] Verify all checks run
- [ ] Get required approvals
- [ ] Merge and verify staging deployment

### 21. Test Production Deploy
- [ ] Create PR from develop to main
- [ ] Get required approvals
- [ ] Merge and verify production deployment
- [ ] Check deployment tag created
- [ ] Verify GitHub release created

### 22. Test Rollback
- [ ] Go to Actions → Rollback Deployment
- [ ] Test rollback to previous tag (on staging)
- [ ] Verify rollback successful
- [ ] Check issue created

## Maintenance

### 23. Regular Checks
- [ ] Monitor security scan results
- [ ] Review dependency update PRs
- [ ] Check coverage trends
- [ ] Review failed workflows
- [ ] Update documentation as needed

### 24. Monthly Tasks
- [ ] Review and update dependencies
- [ ] Check for GitHub Actions updates
- [ ] Review security alerts
- [ ] Update workflows if needed
- [ ] Audit access permissions

## Success Criteria

Your CI/CD is fully operational when:
- [ ] All workflows execute successfully
- [ ] Deployments are automated
- [ ] Tests run on every PR
- [ ] Coverage meets thresholds
- [ ] Security scans are passing
- [ ] Team is using the workflow
- [ ] Documentation is up to date

## Getting Help

If you encounter issues:
1. Check `.github/CI-CD-README.md` troubleshooting section
2. Review GitHub Actions logs
3. Check this checklist for missed steps
4. Create an issue with details
5. Contact DevOps team

## Notes

- You can skip deployment-related steps if not ready to deploy
- Local development and testing work without GitHub secrets
- Branch protection can be configured later
- Start with basic setup and add enhancements gradually

---

**Status**: □ Not Started  □ In Progress  ☑ Completed

**Last Updated**: 2024-01-14
