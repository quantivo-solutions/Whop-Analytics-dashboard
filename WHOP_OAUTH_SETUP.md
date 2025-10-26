# 🔐 Whop OAuth Authentication Setup

This guide will help you configure Whop OAuth for your Analytics Dashboard app.

---

## 📋 Prerequisites

1. A Whop developer account
2. Your app created in Whop Developer Portal
3. Access to your deployment URL (e.g., Vercel)

---

## 🚀 Step 1: Configure OAuth in Whop Developer Portal

### 1.1 Go to your Whop App Settings

Visit: https://dash.whop.com/developers

### 1.2 Add OAuth Redirect URLs

In your app settings, add these redirect URLs:

**For Development:**
```
http://localhost:3000/api/auth/callback
```

**For Production:**
```
https://your-app.vercel.app/api/auth/callback
```

### 1.3 Copy Your Credentials

You'll need:
- **Client ID**: Your `NEXT_PUBLIC_WHOP_APP_ID` (starts with `app_`)
- **Client Secret**: Your `WHOP_APP_SERVER_KEY`
- **Webhook Secret**: Your `WHOP_WEBHOOK_SECRET`

---

## ⚙️ Step 2: Configure Environment Variables

### 2.1 Update `.env.local` (for local development)

```bash
# Whop OAuth Configuration
NEXT_PUBLIC_WHOP_APP_ID="app_xxxxx"
WHOP_APP_SERVER_KEY="your_server_key_here"
WHOP_WEBHOOK_SECRET="your_webhook_secret_here"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Database
DATABASE_URL="postgresql://..."

# Other vars...
CRON_SECRET="your_secret"
RESEND_API_KEY="re_xxx"
```

### 2.2 Update Vercel Environment Variables (for production)

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add:
```
NEXT_PUBLIC_WHOP_APP_ID = app_xxxxx
WHOP_APP_SERVER_KEY = your_server_key
WHOP_WEBHOOK_SECRET = your_webhook_secret
NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
```

**Important:** After adding these, redeploy your app!

---

## 🔄 Step 3: How OAuth Flow Works

### User Experience:

1. **User visits your app** → Sees login page
2. **Clicks "Login with Whop"** → Redirects to Whop OAuth
3. **Whop asks for permission** → User authorizes
4. **Callback to your app** → Exchange code for token
5. **Session created** → User redirected to dashboard
6. **Access their data** → Dashboard shows their company's analytics

### Technical Flow:

```
┌──────────┐
│  User    │
└────┬─────┘
     │
     ▼
┌────────────────┐
│ /login page    │  ← User clicks "Login with Whop"
└────┬───────────┘
     │
     ▼
┌────────────────┐
│ Whop OAuth URL │  ← https://whop.com/oauth?client_id=...
└────┬───────────┘
     │
     ▼
┌────────────────┐
│ User Authorizes│  ← On Whop's site
└────┬───────────┘
     │
     ▼
┌─────────────────────────┐
│ /api/auth/callback      │  ← Code exchanged for token
│ - Fetch user/company ID │
│ - Create WhopInstallation
│ - Set session cookie    │
└────┬────────────────────┘
     │
     ▼
┌────────────────┐
│ /dashboard     │  ← User sees their analytics
└────────────────┘
```

---

## 🧪 Step 4: Testing Locally

### 4.1 Start your dev server

```bash
npm run dev
```

### 4.2 Visit the app

```
http://localhost:3000
```

### 4.3 You should see:

- **Login page** with "Login with Whop" button
- Click it → Redirects to Whop
- Authorize → Redirects back to your app
- **Dashboard** shows with your company's data
- **Logout** button visible in top-right

---

## 🔐 Security Features

✅ **HttpOnly Cookies**: Session tokens can't be accessed by JavaScript  
✅ **7-Day Expiry**: Sessions automatically expire after 7 days  
✅ **Middleware Protection**: All routes require authentication  
✅ **Company Isolation**: Users can only see their own company's data  
✅ **Secure in Production**: HTTPS-only cookies in production  

---

## 🛠️ Troubleshooting

### Problem: "Invalid redirect URI"

**Solution:**
- Make sure you added the callback URL in Whop Developer Portal
- Check the URL matches exactly (http vs https, trailing slash, etc.)

### Problem: "Client authentication failed"

**Solution:**
- Verify `WHOP_APP_SERVER_KEY` is correct
- Make sure it's the **Server Key**, not the Client ID

### Problem: "No company found"

**Solution:**
- The OAuth user needs to be associated with a Whop company
- Check the OAuth response in server logs

### Problem: Redirects to login immediately after logging in

**Solution:**
- Check if cookies are being set (look in browser DevTools → Application → Cookies)
- Verify `NEXT_PUBLIC_APP_URL` matches your actual URL
- Clear browser cookies and try again

---

## 📝 Session Management

### Session Structure:

```typescript
{
  companyId: "biz_xxxxx",
  userId: "user_xxxxx",
  exp: 1234567890 // Unix timestamp
}
```

### Session Storage:

- **Cookie name**: `whop_session`
- **Encoding**: Base64-encoded JSON
- **Lifetime**: 7 days
- **HttpOnly**: Yes (can't be accessed by JavaScript)
- **Secure**: Yes (in production)

### Logout:

Users can logout by:
- Clicking the **Logout** button in the dashboard
- Visiting `/api/auth/logout`

This will:
1. Delete the session cookie
2. Redirect to login page

---

## 🎯 Next Steps

Now that OAuth is working:

1. **Test with real Whop data**: Connect your actual Whop company
2. **Verify analytics**: Make sure data shows correctly for your company
3. **Invite teammates**: They can login with their Whop accounts
4. **Monitor webhooks**: Check `/api/webhooks/whop` is receiving install events

---

## 🚨 Production Checklist

Before going live:

- [ ] OAuth callback URL added in Whop portal
- [ ] All environment variables set in Vercel
- [ ] `NEXT_PUBLIC_APP_URL` points to production URL
- [ ] Database is production PostgreSQL (not SQLite)
- [ ] Webhook endpoint tested
- [ ] HTTPS enabled
- [ ] Session cookies working

---

## 📞 Need Help?

If you encounter issues:

1. Check server logs in Vercel
2. Check browser console for errors
3. Verify all environment variables are set
4. Test OAuth flow step-by-step

---

## 🎉 Success!

Once everything is working, users can:
- ✅ Login with their Whop account
- ✅ See their company's analytics
- ✅ Logout anytime
- ✅ Secure, isolated data access

Your Analytics Dashboard is now production-ready! 🚀

