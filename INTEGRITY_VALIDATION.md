# Data Integrity Validation Guide

This guide explains how to automatically verify that Whoplytics' data integrity and company isolation are 100% correct in production.

## Prerequisites

1. **Vercel URL**: Your deployed application URL (e.g., `https://whoplytics.vercel.app`)
2. **Environment Variables**: 
   - `CRON_SECRET` - From your `.env.local` or Vercel environment variables
   - `WHOP_WEBHOOK_SECRET` - From your `.env.local` or Vercel environment variables
3. **Company ID**: A valid `companyId` from your database (e.g., `biz_xxx`)

## Quick Start

```bash
# Set environment variables
export CRON_SECRET="your-cron-secret"
export WHOP_WEBHOOK_SECRET="your-webhook-secret"

# Run validation
npm run validate:integrity <vercel-url> <companyId>

# Example:
npm run validate:integrity https://whoplytics.vercel.app biz_0wCmeMPNPvxowT
```

Or with environment variables in `.env.local`:

```bash
# .env.local will be automatically loaded
npm run validate:integrity https://whoplytics.vercel.app biz_0wCmeMPNPvxowT
```

## What Gets Tested

### 1. Route Security
- ✅ Verifies `/api/debug/integrity` returns 401 without secret
- ✅ Verifies `/api/debug/smoke` returns 401 without secret

### 2. Integrity Route Validation
- ✅ Checks `ok === true`
- ✅ Checks `installFound === true`
- ✅ Checks `tokens.hasAccessToken === true`
- ✅ Checks `crossTenantLeaks === 0`
- ✅ Shows summary of metrics (totalRows, oldestDate, newestDate, gaps)

### 3. Smoke Route Validation
- ✅ Verifies `ok === true`
- ✅ Verifies `countOther === 0` (no cross-tenant data)

### 4. Webhook Roundtrip Test
- ✅ Constructs fake webhook payload with HMAC signature
- ✅ POSTs to `/api/webhooks/whop`
- ✅ Verifies webhook is accepted (HTTP 200)
- ✅ Checks for `[Whoplytics] webhook` log message (manual check in Vercel logs)

### 5. Plan Gating Validation
- ⚠️ **Manual verification required**
- Visit dashboard URL and verify:
  - Free plan: 3 KPI cards, 7-day chart, locked insights
  - Pro plan: 5 KPI cards, 90-day chart, unlocked insights

### 6. Dashboard Data Isolation
- ⚠️ **Manual verification required**
- Verify dashboard only shows data for the specified companyId

## Expected Output

```
🔍 Whoplytics Data Integrity Validation
============================================================
📍 Vercel URL: https://whoplytics.vercel.app
🏢 Company ID: biz_xxx
🔐 CRON_SECRET: ✅ Set
🔐 WHOP_WEBHOOK_SECRET: ✅ Set
============================================================

📋 Step 2: Route Access Checks
------------------------------------------------------------
Testing /api/debug/integrity without secret...
  ✅ Integrity route correctly returns 401 without secret
Testing /api/debug/smoke without secret...
  ✅ Smoke route correctly returns 401 without secret

📋 Step 3: Integrity Route Validation
------------------------------------------------------------
Calling: https://whoplytics.vercel.app/api/debug/integrity?companyId=biz_xxx&secret=***

📊 Integrity Check Results:
  ok: true
  installFound: true
  hasAccessToken: true
  crossTenantLeaks: 0
  totalRows: 45
  oldestDate: 2025-10-20
  newestDate: 2025-11-04
  gaps: 2 days
  hardcodedDataDetected: false

  ✅ ok === true
  ✅ installFound === true
  ✅ hasAccessToken === true
  ✅ crossTenantLeaks === 0

📋 Step 4: Smoke Route Validation
------------------------------------------------------------
Calling: https://whoplytics.vercel.app/api/debug/smoke?companyId=biz_xxx&secret=***

📊 Smoke Test Results:
  ok: true
  forCompany: 45
  otherCompanies: 0
  isolation: PASS
  ✅ Smoke test passed (ok === true, countOther === 0)

📋 Step 5: Webhook Roundtrip Test
------------------------------------------------------------
Sending webhook payload...
  Type: payment_succeeded
  Company ID: biz_xxx
  ✅ Webhook accepted (HTTP 200)
  Note: Check Vercel logs for [Whoplytics] webhook log message
  Waiting 3 seconds for webhook to process...
  Re-querying integrity route...
  Before newestDate: 2025-11-04
  After newestDate: 2025-11-04
  ✅ Data updated after webhook (or data exists)

📋 Step 6: Plan Gating Validation
------------------------------------------------------------
⚠️  Manual check required:
  1. Visit dashboard URL and verify:
     - Free plan: 3 KPI cards, 7-day chart, locked insights
     - Pro plan: 5 KPI cards, 90-day chart, unlocked insights
  2. Dashboard URL: https://whoplytics.vercel.app/dashboard/biz_xxx

  To test Pro plan:
    - Temporarily update plan in database to "pro"
    - Reload dashboard and verify all Pro features

📋 Step 7: Result Summary
============================================================

✅ Checklist:
  ✅ Integrity route secure
  ✅ Smoke route secure
  ✅ No cross-tenant leaks
  ✅ Data isolation confirmed
  ✅ Webhook ingestion works
  ✅ Plan gating (manual verification)
  ⚠️  Dashboard reflects only company data (manual verification)

============================================================
🎉 All automated tests passed!
⚠️  Please manually verify plan gating and dashboard data isolation
============================================================
```

## Troubleshooting

### Error: CRON_SECRET not set
- Make sure `CRON_SECRET` is in your `.env.local` or environment variables
- Or export it: `export CRON_SECRET="your-secret"`

### Error: WHOP_WEBHOOK_SECRET not set
- Make sure `WHOP_WEBHOOK_SECRET` is in your `.env.local` or environment variables
- Or export it: `export WHOP_WEBHOOK_SECRET="your-secret"`

### Error: 401 Unauthorized
- Check that `CRON_SECRET` matches what's configured in Vercel
- Verify the secret is correct in your environment variables

### Error: No installation found
- Verify the `companyId` exists in your database
- Check that the installation was created via webhook

### Cross-tenant leaks detected
- **CRITICAL**: This indicates data isolation is broken
- Check that all queries filter by `companyId`
- Review recent database changes
- Check webhook handlers for proper `companyId` usage

## Manual Verification Steps

### Plan Gating
1. Visit: `https://your-app.vercel.app/dashboard/{companyId}`
2. **Free Plan**: Verify:
   - Only 3 KPI cards visible (Revenue, New Members, Cancellations)
   - Chart caption shows "Pro unlocks 90-day history"
   - Insights section shows 3 locked cards
3. **Pro Plan**: (Temporarily update plan in DB)
   - Verify 5 KPI cards visible
   - Chart shows 90-day history
   - Insights section is unlocked

### Dashboard Data Isolation
1. Visit dashboard for a specific `companyId`
2. Verify all metrics match that company's data only
3. Check that no other company's data appears
4. Verify `companyId` is displayed in header: "Company: {companyId} • Scope locked"

## Running in CI/CD

You can integrate this into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Validate Data Integrity
  run: |
    npm run validate:integrity ${{ secrets.VERCEL_URL }} ${{ secrets.TEST_COMPANY_ID }}
  env:
    CRON_SECRET: ${{ secrets.CRON_SECRET }}
    WHOP_WEBHOOK_SECRET: ${{ secrets.WHOP_WEBHOOK_SECRET }}
```

## Security Notes

- The script uses `CRON_SECRET` to authenticate with debug routes
- Webhook signatures are computed using `WHOP_WEBHOOK_SECRET`
- Never commit secrets to version control
- Use environment variables or secrets management

## Next Steps

After running validation:

1. **Review the checklist** - All items should be ✅
2. **Check Vercel logs** - Look for `[Whoplytics] webhook` messages
3. **Manual verification** - Test plan gating and data isolation
4. **Fix any failures** - Address any ❌ items immediately

If any test fails, the script will indicate which step failed and what was expected vs. actual.

