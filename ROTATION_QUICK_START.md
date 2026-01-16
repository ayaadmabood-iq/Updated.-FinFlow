# 🔴 CREDENTIAL ROTATION - QUICK START

**Time Required:** 35 minutes
**Downtime:** Zero

---

## ⚡ Fast Track (Copy-Paste Commands)

### 1. Generate New Secret (1 minute)

```bash
# Generate new internal secret
openssl rand -hex 32

# Save output as NEW_INTERNAL_SECRET
```

### 2. Get New Supabase Key (3 minutes)

```
1. Visit: https://supabase.com/dashboard/project/jkibxapuxnrbxpjefjdn/settings/api
2. Click "Generate new anon key"
3. Copy immediately (shown once)
4. Save as NEW_ANON_KEY
```

### 3. Update Local .env (1 minute)

```bash
# Backup current .env
cp .env .env.backup

# Edit .env - replace these two values:
VITE_SUPABASE_PUBLISHABLE_KEY="<NEW_ANON_KEY>"
VITE_SUPABASE_ANON_KEY="<NEW_ANON_KEY>"
INTERNAL_FUNCTION_SECRET="<NEW_INTERNAL_SECRET>"
```

### 4. Deploy Secret to Supabase (2 minutes)

```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref jkibxapuxnrbxpjefjdn

# Set secret
supabase secrets set INTERNAL_FUNCTION_SECRET="<NEW_INTERNAL_SECRET>"

# Verify
supabase secrets list
```

### 5. Test Local (5 minutes)

```bash
# Restart dev server
npm run dev

# Test in browser:
# - Login/logout
# - View projects
# - Create document
# - Check DevTools for 200 responses
```

### 6. Deploy Production (15 minutes)

**Vercel:**
```bash
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
# Paste NEW_ANON_KEY

vercel env add INTERNAL_FUNCTION_SECRET production
# Paste NEW_INTERNAL_SECRET

vercel --prod
```

**Netlify:**
```
1. Dashboard → Site Settings → Environment Variables
2. Update VITE_SUPABASE_PUBLISHABLE_KEY
3. Update INTERNAL_FUNCTION_SECRET
4. Trigger deployment
```

### 7. Verify Production (5 minutes)

```bash
# Visit production URL
# Test login
# Create test document
# Check no 401 errors
```

### 8. Revoke Old Key (2 minutes)

⚠️ **WAIT 10 minutes after production deployment!**

```
1. Visit: https://supabase.com/dashboard/project/jkibxapuxnrbxpjefjdn/settings/api
2. Find old key ending in: ...qpNBfqweewnQWS-lVUZ9zvyOhi3lhLSoj01e-FlFRIY
3. Click "Revoke"
4. Confirm
```

---

## ✅ Success Criteria

- [ ] New anon key generated
- [ ] New internal secret generated
- [ ] Local `.env` updated and tested
- [ ] Supabase secret deployed
- [ ] Production environment updated
- [ ] Production tested successfully
- [ ] Old key revoked
- [ ] No 401 errors in monitoring

---

## 🆘 Rollback (Emergency Only)

```bash
# Restore backup
cp .env.backup .env

# Update production with old values
# Redeploy

# Investigate issue before retrying
```

---

## 📋 Detailed Instructions

See `CREDENTIAL_ROTATION_ACTION_PLAN.md` for:
- Complete step-by-step guide
- Troubleshooting
- Common issues
- Verification commands

---

**Status:** ⚠️ READY TO EXECUTE
**Priority:** HIGH - Must complete before production launch
