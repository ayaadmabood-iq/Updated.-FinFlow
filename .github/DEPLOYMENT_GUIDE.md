# Deployment Guide

## Quick Reference

### Deployment URLs
- **Production**: https://fineflow.app
- **Staging**: https://staging.fineflow.app

### Branch Mapping
- `main` → Production
- `develop` → Staging
- `staging` → Staging (alternative)

## Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All tests pass locally
- [ ] Code review completed (2 approvals required)
- [ ] Security scan passed
- [ ] Coverage meets threshold (80%+)
- [ ] Breaking changes documented
- [ ] Environment variables updated
- [ ] Database migrations tested
- [ ] Rollback plan prepared
- [ ] Stakeholders notified

## Deployment Process

### Staging Deployment

**Automatic deployment on merge to `develop`**

1. Create feature branch:
   ```bash
   git checkout -b feature/your-feature develop
   ```

2. Develop and test:
   ```bash
   npm run dev
   npm run test
   npm run build
   ```

3. Commit changes:
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

4. Push to GitHub:
   ```bash
   git push origin feature/your-feature
   ```

5. Create Pull Request to `develop`

6. Wait for CI checks to pass

7. Get approvals and merge

8. Automatic deployment to staging begins

9. Verify staging deployment:
   ```bash
   npm run test:smoke -- --url=https://staging.fineflow.app
   ```

### Production Deployment

**Automatic deployment on merge to `main`**

1. Create PR from `develop` to `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b release/v1.x.x
   git merge develop
   git push origin release/v1.x.x
   ```

2. Create Pull Request to `main`

3. Complete production checklist

4. Get required approvals (2 minimum)

5. Merge to `main`

6. Automatic deployment begins:
   - Creates deployment tag
   - Runs all tests
   - Builds application
   - Deploys to production
   - Creates GitHub release
   - Sends notifications

7. Monitor deployment in Actions tab

8. Verify production deployment:
   ```bash
   npm run test:smoke -- --url=https://fineflow.app
   ```

## Manual Deployment

If automatic deployment is disabled:

### Deploy to Staging

```bash
# Build
npm run build

# Deploy using your preferred method
# Example with Vercel:
vercel --env staging

# Example with custom script:
npm run deploy:staging
```

### Deploy to Production

```bash
# Build
npm run build

# Deploy
vercel --prod

# Or
npm run deploy:production
```

## Rollback Procedure

### Quick Rollback

1. Go to GitHub Actions
2. Select "Rollback Deployment" workflow
3. Click "Run workflow"
4. Fill in:
   - **Environment**: production
   - **Tag**: Previous working tag (e.g., v20240114-120000)
   - **Reason**: Brief explanation
5. Click "Run workflow"
6. Monitor rollback progress
7. Verify rollback successful

### Finding Rollback Tags

View recent deployment tags:
```bash
git tag -l "v*" | tail -10
```

Or check GitHub Releases:
- Go to repository → Releases
- Find last working version
- Note the tag (e.g., v20240114-120000)

### Manual Rollback

```bash
# Checkout previous tag
git checkout v20240114-120000

# Build
npm run build

# Deploy
vercel --prod
```

## Post-Deployment

### Verification Steps

1. **Health Check**
   ```bash
   curl https://fineflow.app/api/health
   ```

2. **Smoke Tests**
   ```bash
   npm run test:smoke -- --url=https://fineflow.app
   ```

3. **Manual Testing**
   - Login/logout
   - Critical user flows
   - API endpoints
   - Edge functions

4. **Monitor Logs**
   - Check Sentry for errors
   - Review server logs
   - Monitor performance metrics

5. **Database Verification**
   - Check migrations applied
   - Verify data integrity
   - Test database connections

### Monitoring

- **Application Logs**: Check Vercel/hosting logs
- **Error Tracking**: Sentry dashboard
- **Performance**: Lighthouse CI reports
- **Uptime**: Status page monitoring
- **Alerts**: Slack notifications

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs
2. Review error messages
3. Verify environment variables
4. Check build output
5. Test build locally

### Build Fails

```bash
# Clear cache
rm -rf node_modules dist
npm ci
npm run build

# Check for errors
npm run type-check
npm run lint
```

### Tests Fail

```bash
# Run tests locally
npm run test

# Update snapshots if needed
npm run test -- -u

# Check test coverage
npm run test:ci
```

### Environment Issues

1. Verify secrets are set in GitHub
2. Check environment configuration
3. Validate API keys and tokens
4. Review environment URLs

## Emergency Contacts

### Deployment Issues
- **DevOps Team**: devops@fineflow.app
- **On-Call**: Check PagerDuty

### Security Issues
- **Security Team**: security@fineflow.app
- **Emergency**: Use security hotline

### Critical Bugs
- **Engineering Lead**: lead@fineflow.app
- **Product Team**: product@fineflow.app

## Database Migrations

### Running Migrations

**Staging:**
```bash
# Connect to staging database
export DATABASE_URL=$STAGING_DATABASE_URL

# Run migrations
npm run db:migrate

# Verify
npm run db:verify
```

**Production:**
```bash
# Connect to production database
export DATABASE_URL=$PRODUCTION_DATABASE_URL

# Run migrations (careful!)
npm run db:migrate

# Verify
npm run db:verify
```

### Rollback Migrations

```bash
# Rollback last migration
npm run db:rollback

# Rollback to specific version
npm run db:rollback -- --to=20240114_000000
```

## Feature Flags

Use feature flags for gradual rollouts:

```typescript
// Enable feature for percentage of users
if (isFeatureEnabled('new-feature', { percentage: 10 })) {
  // New feature code
} else {
  // Old feature code
}
```

### Managing Feature Flags

1. Create feature flag in config
2. Deploy with flag disabled
3. Gradually enable for users
4. Monitor metrics
5. Rollback if needed
6. Remove flag when stable

## Blue-Green Deployment

For zero-downtime deployments:

1. Deploy to "green" environment
2. Run smoke tests on green
3. Switch traffic to green
4. Monitor for issues
5. Keep blue as fallback
6. Remove blue when stable

## Canary Deployment

For gradual rollouts:

1. Deploy to small percentage of servers
2. Monitor metrics closely
3. Gradually increase percentage
4. Rollback if issues detected
5. Complete rollout when stable

## Performance Monitoring

### Metrics to Watch

- **Response Time**: < 200ms average
- **Error Rate**: < 0.1%
- **Uptime**: > 99.9%
- **Build Time**: < 5 minutes
- **Bundle Size**: < 500KB

### Alerts

Set up alerts for:
- High error rates
- Slow response times
- Failed deployments
- Security vulnerabilities
- High memory usage

## Compliance and Audit

### Deployment Logs

All deployments are logged with:
- Timestamp
- Deployer
- Commit SHA
- Environment
- Tag/Version
- Success/Failure status

### Audit Trail

View deployment history:
```bash
git log --grep="deploy" --oneline
```

Or check GitHub Actions history.

## Best Practices

1. **Always deploy to staging first**
2. **Test thoroughly before production**
3. **Deploy during low-traffic periods**
4. **Have rollback plan ready**
5. **Monitor closely after deployment**
6. **Communicate with team**
7. **Document changes**
8. **Keep deployment process simple**

## Additional Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vercel Deployment Docs](https://vercel.com/docs)
- [Supabase CLI Docs](https://supabase.com/docs/reference/cli)
- [CI/CD Best Practices](https://www.atlassian.com/continuous-delivery/principles/continuous-integration-vs-delivery-vs-deployment)

---

**For questions or support, contact the DevOps team.**
