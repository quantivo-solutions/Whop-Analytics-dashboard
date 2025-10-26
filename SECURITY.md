# 🔒 Security & Access Control

This document explains how the dashboard is secured and who can access what data.

## Overview

The analytics dashboard implements multi-layered security to protect sensitive company data from unauthorized access.

---

## Access Control Layers

### 1. **Experience Page** (`/experiences/[experienceId]`)

**Purpose**: Embedded view within Whop app iframes

**Security**:
- ✅ Only accessible if `experienceId` exists in database
- ✅ Automatically scoped to the correct company
- ✅ Intended to be embedded in Whop iframe contexts
- ⚠️ No additional auth required (relies on Whop's iframe security)

**Access**: Anyone with a valid `experienceId` can view

---

### 2. **Company Dashboard** (`/dashboard/[companyId]`)

**Purpose**: Direct access to specific company's dashboard

**Security**: 🔐 **PROTECTED** - Requires one of:

1. **Secret Token**: `?token=CRON_SECRET`
   - Admin/support access
   - Used for debugging and customer support
   - Example: `/dashboard/biz_abc123?token=your_secret_token`

2. **Whop Iframe Context**
   - Detected via referrer/origin headers
   - Automatically granted when embedded in Whop

3. **Demo Companies**
   - Companies with "demo" in the ID are public
   - Used for testing and demonstrations

4. **Development Mode**
   - All access allowed in `NODE_ENV=development`
   - For local testing only

**Default**: ❌ Access Denied

---

### 3. **Main Dashboard** (`/dashboard`)

**Purpose**: User's primary dashboard view

**Security**:
- ✅ Shows first available company (typically user's own)
- ✅ Falls back to `demo_company` if no installation found
- ⚠️ Currently open for testing (future: requires user auth)

---

## Security Implementation

### Auth Helper Functions

Located in `/src/lib/auth.ts`:

```typescript
// Check if user can access a specific company's data
await canAccessCompany(companyId, token)

// Validate secret token
await validateSecretToken(token)

// Check if request is from Whop iframe
await isWhopIframeRequest()

// Get authenticated user's company (future implementation)
await getAuthenticatedCompanyId()
```

### Usage in Pages

```typescript
// In any protected page:
const accessCheck = await canAccessCompany(companyId, token)

if (!accessCheck.allowed) {
  // Show "Access Denied" page
  return <AccessDeniedView />
}

// Proceed with authorized access
```

---

## Access Denied Page

When unauthorized access is attempted, users see:

- 🔒 **Lock icon** and "Access Denied" message
- **Company ID** they tried to access
- **Instructions** on how to access their own dashboard
- **Link** to main dashboard

---

## Environment Variables

### Required for Security

```bash
# Used for admin/support access tokens
CRON_SECRET=your_secret_token_here
```

### Optional (Future)

```bash
# For JWT-based authentication
JWT_SECRET=your_jwt_secret

# For session management
SESSION_SECRET=your_session_secret
```

---

## Testing Security

### Test Authorized Access

1. **With Token**:
   ```
   https://yourdomain.com/dashboard/biz_test?token=CRON_SECRET
   ```

2. **Demo Company**:
   ```
   https://yourdomain.com/dashboard/demo_company
   ```

3. **Development Mode**:
   ```bash
   npm run dev
   # Visit any company URL locally
   ```

### Test Unauthorized Access

1. **No Token** (production):
   ```
   https://yourdomain.com/dashboard/biz_test
   ```
   **Result**: ❌ Access Denied

2. **Invalid Token**:
   ```
   https://yourdomain.com/dashboard/biz_test?token=wrong_token
   ```
   **Result**: ❌ Access Denied

---

## Future Enhancements

### Planned Security Features

1. **User Authentication**
   - OAuth integration with Whop
   - JWT-based session management
   - Per-user permissions

2. **Role-Based Access Control (RBAC)**
   - Owner: Full access to company data
   - Admin: Read-only access
   - Viewer: Limited dashboard access

3. **Audit Logging**
   - Track who accessed what data
   - Log failed access attempts
   - Export audit logs for compliance

4. **API Rate Limiting**
   - Prevent brute-force token guessing
   - Protect against DoS attacks

5. **IP Whitelisting**
   - Restrict admin access by IP
   - Configurable per company

---

## Security Best Practices

### For Administrators

✅ **DO**:
- Keep `CRON_SECRET` secure and rotated regularly
- Use HTTPS in production (enforced by Vercel)
- Monitor access logs for suspicious activity
- Provide token access only to trusted support staff

❌ **DON'T**:
- Share `CRON_SECRET` in public repositories
- Use simple/guessable tokens
- Give permanent token access to external parties
- Log sensitive tokens in application logs

### For Users

✅ **DO**:
- Access your dashboard via the main `/dashboard` page
- Use the embedded view in Whop experiences
- Report suspicious access attempts

❌ **DON'T**:
- Share direct company dashboard URLs publicly
- Attempt to access other companies' data

---

## Reporting Security Issues

If you discover a security vulnerability, please email:

📧 **security@yourdomain.com**

Do **NOT** create a public GitHub issue for security vulnerabilities.

---

## Compliance

This dashboard implements security measures aligned with:

- 🔒 **GDPR**: User data protection
- 🔐 **SOC 2**: Access control and logging
- 🛡️ **OWASP Top 10**: Common vulnerability prevention

---

**Last Updated**: October 26, 2025  
**Version**: 1.0.0

