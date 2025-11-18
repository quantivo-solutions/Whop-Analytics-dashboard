# Webhook Verification Guide

## How to Verify Webhooks Are Working

### 1. Check Webhook Configuration in Whop Developer Portal

1. Go to: https://whop.com/developer/apps
2. Select your app: **Analytics Dashboard**
3. Navigate to: **Settings** → **Webhooks**
4. Verify the webhook URL is set to:
   ```
   https://your-vercel-app.vercel.app/api/webhooks/whop
   ```
5. Ensure these events are subscribed:
   - ✅ `app.installed`
   - ✅ `app.uninstalled`
   - ✅ `app.plan.updated`
   - ✅ `app_membership.went_valid` (or `membership.activated`)
   - ✅ `app_membership.went_invalid` (or `membership.deactivated`)

### 2. Check Webhook Secret

Make sure `WHOP_WEBHOOK_SECRET` is set in your Vercel environment variables and matches the secret in Whop Developer Portal.

### 3. Test Webhook Endpoint

Visit: `https://your-vercel-app.vercel.app/api/webhooks/whop`

You should see:
```json
{
  "status": "ok",
  "message": "Webhook endpoint is accessible"
}
```

### 4. Monitor Logs After Purchase

After clicking "Upgrade to Pro" and completing the purchase:

**Check Browser Console:**
- Look for logs starting with `[UpsellModal]`
- Should see: `[UpsellModal] ===== UPGRADE CLICKED =====`
- Should see: `[UpsellModal] Purchase result:`

**Check Vercel Logs:**
- Look for: `[WHOP] membership.activated webhook received`
- Look for: `[WHOP] Full webhook data:`
- Look for: `[WHOP] ✅ Updated installation ... to pro plan`

### 5. Common Issues

**Issue: No logs when clicking upgrade**
- Check browser console is open
- Verify `NEXT_PUBLIC_WHOP_PRO_PLAN_ID` is set
- Check if modal is actually opening

**Issue: Purchase completes but no webhook**
- Verify product is **paid** (not free)
- Check webhook URL is correct in Whop portal
- Verify webhook secret matches
- Check Vercel logs for any webhook errors

**Issue: Webhook received but plan not updated**
- Check webhook logs for: `[WHOP] ⚠️ No installation found`
- Verify installation exists for the companyId
- Check if webhook is finding the correct installation

### 6. Manual Webhook Test

You can manually trigger a webhook using the test script:

```bash
node scripts/send-whop-webhook.mjs membership_went_valid biz_YOUR_COMPANY_ID
```

This will help verify your webhook handler is working correctly.

