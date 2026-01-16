# 🔴 CRITICAL: Credential Rotation Action Plan

**Status:** ⚠️ MUST COMPLETE BEFORE PRODUCTION LAUNCH
**Priority:** HIGH - Security Risk
**Estimated Time:** 35 minutes
**Downtime:** Zero (if followed correctly)

---

## ⚠️ Security Alert

The following credentials were previously exposed in version control and documentation:

- ❌ Supabase Project ID: `jkibxapuxnrbxpjefjdn`
- ❌ Supabase Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraWJ4YXB1eG5yYnhwamVmamRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTY3ODUsImV4cCI6MjA4MzI5Mjc4NX0.qpNBfqweewnQWS-lVUZ9zvyOhi3lhLSoj01e-FlFRIY`
- ❌ Internal Function Secret: `39610d6e479d2bde8c557352baf603036e228be0d8388a9e2d9c4e407e80a167`

**These credentials have been removed from documentation but must be rotated immediately.**

---

## Quick Start Checklist

### Before You Begin
- [ ] Have access to Supabase Dashboard
- [ ] Have `openssl` or equivalent installed
- [ ] Have Supabase CLI installed (`npm install -g supabase`)
- [ ] Are working during a low-traffic period (recommended)
- [ ] Have notified team members of upcoming rotation

---

## Step-by-Step Rotation Procedure

### Phase 1: Generate New Credentials (5 minutes)

#### 1.1 Generate New Supabase Anon Key

```bash
# Open Supabase Dashboard
URL: https://supabase.com/dashboard/project/jkibxapuxnrbxpjefjdn/settings/api
```

**In Dashboard:**
1. Navigate to **Settings** → **API**
2. Scroll to "Project API keys" section
3. Find the "anon public" key
4. Click **"Generate new key"** or **"Rotate key"** button
5. **CRITICAL:** Copy the new key immediately (shown only once)
6. Save to a secure temporary location (password manager)

**Expected Result:**
```bash
# New anon key (example format)
NEW_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.NEW_TOKEN_DATA_HERE.NEW_SIGNATURE_HERE"
```

#### 1.2 Generate New Internal Function Secret

```bash
# Generate 64-character hex string (256 bits)
openssl rand -hex 32

# Alternative if openssl not available (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Alternative (PowerShell on Windows)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
```

**Expected Result:**
```bash
# Save this output
NEW_INTERNAL_SECRET="<64-character-hex-string-here>"
```

**Action Items:**
- [ ] New Supabase anon key generated and saved
- [ ] New internal function secret generated and saved
- [ ] Both credentials saved in password manager

---

### Phase 2: Update Local Environment (2 minutes)

#### 2.1 Backup Current `.env`

```bash
# Create backup (for emergency rollback)
cp .env .env.backup.$(date +%Y%m%d)

# Verify backup created
ls -lh .env.backup.*
```

#### 2.2 Update `.env` File

Edit `.env` with new credentials:

```bash
# Updated credentials
VITE_SUPABASE_PROJECT_ID="jkibxapuxnrbxpjefjdn"  # Unchanged
VITE_SUPABASE_URL="https://jkibxapuxnrbxpjefjdn.supabase.co"  # Unchanged
VITE_SUPABASE_PUBLISHABLE_KEY="<NEW_ANON_KEY_FROM_STEP_1.1>"
VITE_SUPABASE_ANON_KEY="<NEW_ANON_KEY_FROM_STEP_1.1>"  # Same as above

# New internal secret
INTERNAL_FUNCTION_SECRET="<NEW_INTERNAL_SECRET_FROM_STEP_1.2>"
```

**Verification:**
```bash
# Check .env has new credentials
cat .env | grep -E "(PUBLISHABLE_KEY|INTERNAL_FUNCTION_SECRET)"
```

**Action Items:**
- [ ] `.env` backed up
- [ ] `.env` updated with new anon key
- [ ] `.env` updated with new internal secret
- [ ] Changes saved

---

### Phase 3: Update Supabase Edge Functions Secrets (3 minutes)

#### 3.1 Set Internal Function Secret

```bash
# Login to Supabase (if not already)
supabase login

# Link to your project
supabase link --project-ref jkibxapuxnrbxpjefjdn

# Set new internal function secret
supabase secrets set INTERNAL_FUNCTION_SECRET="<NEW_INTERNAL_SECRET_FROM_STEP_1.2>"

# Verify secret was set
supabase secrets list
```

**Expected Output:**
```
INTERNAL_FUNCTION_SECRET | <hidden> | Set just now
```

#### 3.2 Restart Edge Functions (if needed)

```bash
# Some functions may need restart to pick up new secret
# This depends on your deployment setup

# If using Supabase hosted functions, they restart automatically
# If self-hosting, restart your function runtime
```

**Action Items:**
- [ ] New internal secret deployed to Supabase
- [ ] Secret deployment verified
- [ ] Edge Functions restarted (if needed)

---

### Phase 4: Test Locally (10 minutes)

#### 4.1 Restart Development Server

```bash
# Stop current dev server (Ctrl+C)

# Clear any caches
rm -rf node_modules/.vite

# Start fresh
npm run dev
```

#### 4.2 Test Critical Functionality

Open http://localhost:5173 and test:

- [ ] **Login/Logout**
  - Can users sign in?
  - Can users sign out?
  - Are sessions maintained?

- [ ] **View Projects**
  - Can users view project list?
  - Can users view project details?
  - Do API calls succeed?

- [ ] **Document Operations**
  - Can users create documents?
  - Can users view documents?
  - Can users delete documents?

- [ ] **Real-time Features**
  - Do real-time updates work?
  - Are WebSocket connections established?

#### 4.3 Verify API Calls

```bash
# Open browser DevTools (F12)
# Go to Network tab
# Filter by "supabase"
# Check request headers contain new apikey value
# Verify responses are successful (200 status)
```

**Expected Results:**
- All API calls return 200 OK
- No 401 Unauthorized errors
- No authentication errors in console
- Real-time features functioning

**Action Items:**
- [ ] Development server running with new credentials
- [ ] Login/logout working
- [ ] Projects accessible
- [ ] Documents CRUD operations working
- [ ] No authentication errors
- [ ] API calls using new key (verified in DevTools)

---

### Phase 5: Deploy to Production (15 minutes)

#### 5.1 Update Production Environment Variables

**For Vercel:**
```bash
# Install Vercel CLI if needed
npm install -g vercel

# Login
vercel login

# Set environment variables
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
# Paste new anon key when prompted

vercel env add VITE_SUPABASE_ANON_KEY production
# Paste new anon key when prompted (same value)

vercel env add INTERNAL_FUNCTION_SECRET production
# Paste new internal secret when prompted
```

**For Netlify:**
```bash
# In Netlify Dashboard
# Site Settings → Environment Variables
# Update:
#   VITE_SUPABASE_PUBLISHABLE_KEY = <new-anon-key>
#   VITE_SUPABASE_ANON_KEY = <new-anon-key>
#   INTERNAL_FUNCTION_SECRET = <new-internal-secret>
```

**For Other Platforms:**
- Update environment variables in your hosting platform dashboard
- Ensure ALL three variables are updated

#### 5.2 Trigger Production Deployment

```bash
# Push to main branch to trigger deployment
git add .
git commit -m "chore: update environment configuration"
git push origin main

# Or manually trigger deployment
vercel --prod  # For Vercel
netlify deploy --prod  # For Netlify
```

#### 5.3 Monitor Deployment

```bash
# Watch deployment logs
# Check for errors
# Typical deployment time: 2-5 minutes
```

**Action Items:**
- [ ] Production environment variables updated
- [ ] Deployment triggered
- [ ] Deployment completed successfully
- [ ] No build errors

---

### Phase 6: Verify Production (5 minutes)

#### 6.1 Test Production Application

**Visit your production URL and test:**

- [ ] **Login/Logout**
  ```
  1. Navigate to login page
  2. Enter credentials
  3. Verify successful login
  4. Check no console errors
  5. Logout successfully
  ```

- [ ] **Create Test Document**
  ```
  1. Create a new project
  2. Upload a test document
  3. Verify processing starts
  4. Check document appears in list
  ```

- [ ] **API Calls**
  ```
  1. Open DevTools → Network tab
  2. Filter by "supabase"
  3. Verify requests succeed (200 status)
  4. Check new apikey in request headers
  ```

#### 6.2 Check Error Tracking

```bash
# If using Sentry
# Check https://sentry.io/organizations/your-org/issues/
# Look for:
#   - "Invalid API key" errors
#   - "Unauthorized" errors
#   - Authentication failures
```

#### 6.3 Verify Edge Functions

```bash
# Test internal function authentication
supabase functions invoke chunking-executor \
  --project-ref jkibxapuxnrbxpjefjdn \
  --body '{"test": true}' \
  --no-verify-jwt

# Expected: Should fail without X-Internal-Secret header (good)

# Test with secret header (requires manual curl)
curl -X POST https://jkibxapuxnrbxpjefjdn.supabase.co/functions/v1/chunking-executor \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: <NEW_INTERNAL_SECRET>" \
  -d '{"test": true}'

# Expected: Should succeed (or validation error if test payload invalid)
```

**Expected Results:**
- Production accessible
- Users can login
- Documents can be created/processed
- No 401 errors in monitoring
- New API key in use (verified in DevTools)
- Internal functions require new secret

**Action Items:**
- [ ] Production application accessible
- [ ] Login/logout working in production
- [ ] Test document created successfully
- [ ] No auth errors in error tracking
- [ ] New API key verified in use
- [ ] Internal functions protected with new secret

---

### Phase 7: Revoke Old Credentials (5 minutes)

⚠️ **CRITICAL:** Only proceed after verifying production works!

**Final Verification Checklist:**
- [ ] Production deployment successful
- [ ] Production application tested and working
- [ ] No errors in production monitoring
- [ ] At least 10 minutes have passed since deployment
- [ ] All team members have updated local `.env`

#### 7.1 Revoke Old Anon Key

```bash
# Open Supabase Dashboard
URL: https://supabase.com/dashboard/project/jkibxapuxnrbxpjefjdn/settings/api

# In Dashboard:
1. Navigate to Settings → API
2. Find the old anon key (starts with eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)
3. Look for key ending in: ...qpNBfqweewnQWS-lVUZ9zvyOhi3lhLSoj01e-FlFRIY
4. Click "Revoke" or "Delete" button
5. Confirm revocation
```

#### 7.2 Monitor for Issues

```bash
# Watch error tracking for next 30 minutes
# Check for spike in:
#   - 401 Unauthorized errors
#   - Authentication failures
#   - User complaints

# Be ready to rollback if needed (see Phase 8)
```

**Action Items:**
- [ ] Old anon key revoked in Supabase Dashboard
- [ ] Monitoring active for next 30 minutes
- [ ] No spike in auth errors
- [ ] Users not reporting issues

---

### Phase 8: Emergency Rollback (If Needed)

**Only use if production breaks after rotation!**

#### 8.1 Restore Old Credentials

```bash
# Restore backup .env
cp .env.backup.YYYYMMDD .env

# Update production environment variables with old values
# (Use same process as Phase 5.1)

# Trigger immediate redeployment
git add .env
git commit -m "emergency: rollback credentials"
git push origin main --force
```

#### 8.2 Verify Recovery

```bash
# Test production application
# Confirm users can authenticate
# Check error rates return to normal
```

#### 8.3 Investigate Issue

```bash
# Check deployment logs
# Verify new key was correctly configured
# Test new key in local environment
# Identify root cause before retrying
```

---

## Post-Rotation Tasks

### Update Team

```bash
# Send notification to team
Subject: Credential Rotation Complete

Team,

We have successfully rotated our Supabase credentials as part of our security hardening.

Action Required:
1. Pull latest .env.example: git pull origin main
2. Update your local .env with new credentials (sent via 1Password)
3. Restart your dev server: npm run dev

The old credentials are now revoked and will not work.

If you encounter any issues, please reach out immediately.
```

### Update Documentation

```bash
# Update CREDENTIAL_ROTATION_GUIDE.md
# Mark rotation as complete
# Update "Last Rotation Date"
# Archive old credentials documentation
```

### Schedule Next Rotation

```bash
# Add calendar reminder for next rotation
# Recommended: 90 days from today
# Required: After any security incident or team member departure

Next Rotation Date: [DATE + 90 DAYS]
```

### Security Audit

```bash
# Verify no credentials in git history
git log --all --full-history -- .env

# Verify .gitignore is correct
cat .gitignore | grep -E "(\.env|CREDENTIAL)"

# Run security verification
npm run verify:git-security

# Scan for any missed credential leaks
git secrets --scan
```

---

## Verification Commands

### Quick Health Check

```bash
# Test local environment
npm run dev
# Open http://localhost:5173
# Try logging in

# Test production
curl https://your-production-domain.com/health
# Expected: 200 OK

# Test Supabase connection
curl https://jkibxapuxnrbxpjefjdn.supabase.co/rest/v1/ \
  -H "apikey: <NEW_ANON_KEY>" \
  -H "Authorization: Bearer <NEW_ANON_KEY>"
# Expected: 200 OK with API version info

# Test internal function auth
curl -X POST https://jkibxapuxnrbxpjefjdn.supabase.co/functions/v1/chunking-executor \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: <NEW_INTERNAL_SECRET>" \
  -d '{"test": true}'
# Expected: 200 OK or validation error (not 401)
```

---

## Common Issues & Solutions

### Issue: "Invalid API key" after rotation

**Cause:** New key not properly set in environment
**Solution:**
```bash
# Verify .env has new key
cat .env | grep PUBLISHABLE_KEY

# Check for typos or extra quotes
# Restart dev server
npm run dev
```

### Issue: Production returning 401 errors

**Cause:** Environment variables not updated in hosting platform
**Solution:**
```bash
# Re-deploy environment variables
# Force rebuild
# Check deployment logs for errors
```

### Issue: Edge Functions return 401

**Cause:** INTERNAL_FUNCTION_SECRET not updated
**Solution:**
```bash
# Re-set secret
supabase secrets set INTERNAL_FUNCTION_SECRET="<NEW_SECRET>"

# Verify
supabase secrets list
```

### Issue: Users getting logged out

**Cause:** Old sessions with old key
**Solution:**
```bash
# Expected behavior - users need to re-login
# This is normal after key rotation
# Clear browser cache if issues persist
```

---

## Timeline

| Time | Phase | Duration |
|------|-------|----------|
| T+0:00 | Phase 1: Generate credentials | 5 min |
| T+0:05 | Phase 2: Update local .env | 2 min |
| T+0:07 | Phase 3: Update Supabase secrets | 3 min |
| T+0:10 | Phase 4: Test locally | 10 min |
| T+0:20 | Phase 5: Deploy to production | 15 min |
| T+0:35 | Phase 6: Verify production | 5 min |
| T+0:40 | Wait 10 minutes for monitoring | 10 min |
| T+0:50 | Phase 7: Revoke old credentials | 5 min |
| T+0:55 | Phase 8: Monitor for issues | 30 min |
| **T+1:25** | **Complete** | **85 min total** |

**Downtime:** 0 minutes (zero downtime procedure)

---

## Final Checklist

### Pre-Flight
- [ ] Supabase Dashboard access confirmed
- [ ] Supabase CLI installed and logged in
- [ ] Team notified of rotation
- [ ] Backup .env created

### Credentials
- [ ] New Supabase anon key generated
- [ ] New internal function secret generated
- [ ] Both saved in password manager

### Local Environment
- [ ] `.env` updated with new credentials
- [ ] Local testing passed
- [ ] No authentication errors

### Production
- [ ] Environment variables updated
- [ ] Deployment successful
- [ ] Production testing passed
- [ ] No errors in monitoring

### Cleanup
- [ ] Old anon key revoked
- [ ] Team updated with new credentials
- [ ] Documentation updated
- [ ] Next rotation scheduled

---

## Support

**For Issues:**
1. Check deployment logs
2. Verify environment variables
3. Test with curl commands above
4. Review troubleshooting section

**Emergency Contact:**
- On-call engineer: [CONTACT INFO]
- Security team: [CONTACT INFO]
- DevOps team: [CONTACT INFO]

---

**Last Updated:** 2026-01-16
**Next Review:** After rotation completion
**Status:** ⚠️ AWAITING EXECUTION
