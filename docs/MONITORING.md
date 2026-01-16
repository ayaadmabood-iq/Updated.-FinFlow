# Monitoring & Alerting System

FineFlow implements comprehensive monitoring across frontend, backend, and infrastructure layers.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Monitoring Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Frontend (React)           Backend (Edge Functions)            │
│   ┌────────────────┐        ┌────────────────────────┐          │
│   │ Sentry SDK     │        │ Sentry (manual)        │          │
│   │ - Error tracking│        │ - Error tracking       │          │
│   │ - Performance  │        │ - Performance          │          │
│   │ - Session replay│       │ - Breadcrumbs          │          │
│   └────────────────┘        └────────────────────────┘          │
│                                                                  │
│   Performance               Health Checks                        │
│   ┌────────────────┐        ┌────────────────────────┐          │
│   │ Core Web Vitals│        │ /health endpoint       │          │
│   │ - LCP, FID, CLS│        │ - Database check       │          │
│   │ - FCP, TTFB    │        │ - Auth check           │          │
│   └────────────────┘        │ - Storage check        │          │
│                             │ - AI service check     │          │
│   Uptime                    └────────────────────────┘          │
│   ┌────────────────┐                                            │
│   │ UptimeRobot    │        Reports                             │
│   │ - Production   │        ┌────────────────────────┐          │
│   │ - Staging      │        │ Weekly GitHub Issues   │          │
│   │ - Health API   │        │ - Error stats          │          │
│   └────────────────┘        │ - Performance metrics  │          │
│                             │ - Action items         │          │
│                             └────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Error Monitoring (Sentry)

**Frontend** (`src/lib/monitoring.ts`)
- Automatic error capture
- Performance monitoring (10% sample rate in production)
- Session replay (10% normal, 100% on errors)
- Sensitive data filtering

**Edge Functions** (`supabase/functions/_shared/sentry.ts`)
- Manual error capture via `captureException()`
- Message logging via `captureMessage()`
- Performance tracking via `trackPerformance()`

### 2. Performance Monitoring (`src/lib/performance.ts`)

#### Core Web Vitals
Automatically tracked:
- **LCP** (Largest Contentful Paint) - Target: < 2.5s
- **FID** (First Input Delay) - Target: < 100ms
- **CLS** (Cumulative Layout Shift) - Target: < 0.1
- **FCP** (First Contentful Paint) - Target: < 1.8s
- **TTFB** (Time to First Byte) - Target: < 600ms

#### Usage

```typescript
import { trackAPICall, trackPageLoad, trackOperation } from '@/lib/performance';

// Track page load
const finishTracking = trackPageLoad('Dashboard');
// ... page loads ...
finishTracking();

// Track API call
const data = await trackAPICall('fetchProjects', () => 
  supabase.from('projects').select('*')
);

// Track custom operation
const result = await trackOperation('generateReport', 'ai', async () => {
  return await generateAIReport(data);
});
```

### 3. Health Checks

**Endpoint**: `GET /functions/v1/health`

**Query Parameters**:
- `detailed=true` - Include metrics (queue depth, cache hit rate)

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-13T12:00:00Z",
  "version": "1.0.0",
  "uptime": 86400,
  "checks": {
    "database": { "status": "healthy", "responseTime": 45 },
    "auth": { "status": "healthy", "responseTime": 23 },
    "storage": { "status": "healthy", "responseTime": 67 },
    "aiService": { "status": "healthy" }
  },
  "metrics": {
    "queueDepth": 5,
    "cacheHitRate": 0.85
  }
}
```

**Status Codes**:
- `200` - Healthy or Degraded
- `503` - Unhealthy

### 4. Uptime Monitoring (UptimeRobot)

**Setup**:
```bash
UPTIMEROBOT_API_KEY=your_key ./scripts/setup-uptime-monitoring.sh
```

**Monitors Created**:
- Production app availability
- Health API endpoint
- Database connectivity (keyword check)
- Staging environment

### 5. Weekly Reports

Automated GitHub Action (`.github/workflows/monitoring-report.yml`):
- Runs every Monday at 9 AM UTC
- Creates GitHub issue with report
- Includes error stats, health status, action items

## Configuration

### Environment Variables

**Frontend** (`.env`):
```bash
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_APP_VERSION=1.0.0
```

**Edge Functions** (Supabase Secrets):
```bash
SENTRY_DSN=https://xxx@sentry.io/xxx
ENVIRONMENT=production
```

**GitHub Actions**:
- `SENTRY_AUTH_TOKEN` - Sentry API token
- `SENTRY_ORG` - Sentry organization slug
- `UPTIMEROBOT_API_KEY` - UptimeRobot API key

### Alerting Configuration

#### Sentry Alerts
1. Go to Sentry Dashboard → Alerts
2. Create rules for:
   - New issues (immediate notification)
   - Error rate spikes (> 10% increase)
   - Performance degradation (LCP > 4s)

#### UptimeRobot Alerts
1. Configure alert contacts in UptimeRobot dashboard
2. Recommended channels:
   - Email (immediate)
   - Slack webhook (team notification)
   - SMS (critical only)

## Best Practices

### Error Handling
```typescript
import { captureException } from '@/lib/monitoring';

try {
  await riskyOperation();
} catch (error) {
  captureException(error as Error, {
    operation: 'riskyOperation',
    userId: user.id,
    extra: { context: 'relevant data' }
  });
  throw error; // Re-throw for proper error boundaries
}
```

### Performance Budgets
```typescript
import { checkPerformanceBudget } from '@/lib/performance';

const results = checkPerformanceBudget({
  LCP: 2500,
  FID: 100,
  CLS: 0.1,
});

if (!Object.values(results).every(r => r.passes)) {
  console.warn('Performance budget exceeded:', results);
}
```

## Troubleshooting

### Sentry Not Receiving Events
1. Check `VITE_SENTRY_DSN` is set
2. Verify production build (`import.meta.env.PROD === true`)
3. Check browser console for Sentry initialization logs

### Health Check Failing
1. Check Edge Function logs in Supabase dashboard
2. Verify database connectivity
3. Check for service role key permissions

### Missing Performance Data
1. Ensure `initializeWebVitals()` is called
2. Check browser supports PerformanceObserver API
3. Verify production mode for reporting
