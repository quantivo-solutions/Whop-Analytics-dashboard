# Whoplytics - Complete Project Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Features & Functionality](#features--functionality)
4. [Authentication & Authorization Flow](#authentication--authorization-flow)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Security Implementation](#security-implementation)
8. [Deployment & Infrastructure](#deployment--infrastructure)
9. [Development Workflow](#development-workflow)
10. [Key Technical Decisions](#key-technical-decisions)
11. [Known Issues & Solutions](#known-issues--solutions)
12. [Future Improvements](#future-improvements)

---

## 🎯 Project Overview

**Whoplytics** is a comprehensive analytics application built for Whop platform creators. It provides real-time insights into revenue, membership metrics, and business performance data directly within the Whop ecosystem.

### Purpose
- Help creators understand what drives their revenue and engagement
- Provide instant access to key business metrics
- Enable data-driven decision making without complex analytics setup
- Seamlessly integrate within Whop's platform via iframe embedding

### Target Users
- Whop creators/sellers who want to track their business metrics
- Users with Free and Pro plans (Pro unlocks advanced features)

---

## 🏗️ Architecture & Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI (Dialog, DropdownMenu, Avatar)
- **Icons**: Lucide React
- **Charts**: Custom components with Recharts (ModernChart component)
- **State Management**: React hooks (useState, useEffect)
- **Whop Integration**: `@whop/react` package for iframe SDK

### Backend
- **Runtime**: Next.js API Routes (Serverless)
- **Database**: PostgreSQL (via Neon)
- **ORM**: Prisma
- **Authentication**: Custom OAuth flow with Whop
- **Email Service**: Resend API
- **Webhook Handling**: Next.js API routes with signature verification

### Infrastructure
- **Hosting**: Vercel
- **Database**: Neon PostgreSQL
- **Environment**: Production on Vercel, development locally
- **Build System**: Next.js Turbo

### Key Dependencies
```json
{
  "@prisma/client": "^6.18.0",
  "@whop/react": "^1.0.0",
  "next": "^14.x",
  "react": "^18.x",
  "typescript": "^5.x",
  "tailwindcss": "^3.x",
  "lucide-react": "^0.x",
  "resend": "^3.x"
}
```

---

## ✨ Features & Functionality

### Core Features

#### 1. **Dashboard View**
- Real-time KPI cards showing:
  - Total Revenue
  - Active Members
  - New Members
  - Cancellations
  - Trial Metrics
- Interactive charts (30-day trend visualization)
- Plan-based feature gating (Free vs Pro)

#### 2. **User Authentication**
- OAuth 2.0 flow with Whop
- Session management via cookies and URL tokens
- Iframe-compatible authentication (handles third-party cookie restrictions)
- Auto-redirects preserve user context

#### 3. **Plan Management**
- Free Plan: Basic dashboard access
- Pro Plan: 
  - Daily email reports
  - Discord webhook integration
  - Advanced analytics
- Seamless in-app upgrades using Whop iFrame SDK

#### 4. **Settings Management**
- Per-company configuration
- Email notification settings (weekly/daily)
- Discord webhook configuration (Pro only)
- Real-time plan status display

#### 5. **Data Ingestion**
- Automated daily metrics collection from Whop API
- Historical data backfilling
- Database storage with Prisma

#### 6. **Email Reports**
- Weekly summary emails
- Daily reports (Pro feature)
- Configurable recipients per company

### User Experience Flow

1. **Installation**: Creator installs app in their Whop account
2. **Login**: OAuth flow authenticates user via Whop
3. **Dashboard**: Real-time metrics displayed with modern UI
4. **Settings**: Configure notifications and webhooks
5. **Upgrade**: In-app Pro plan purchase flow
6. **Data Sync**: Automatic daily metric updates

---

## 🔐 Authentication & Authorization Flow

### OAuth Flow (Whop Integration)

```
1. User clicks "Login with Whop"
   ↓
2. App generates OAuth URL with state (includes experienceId)
   ↓
3. User authorizes on Whop's OAuth page
   ↓
4. Whop redirects to /api/auth/callback with code
   ↓
5. Server exchanges code for access token
   ↓
6. Server fetches user data from Whop API
   ↓
7. Server creates/updates WhopInstallation record
   ↓
8. Server sets session cookie (httpOnly, secure, sameSite: none)
   ↓
9. Server redirects to /auth/loading?redirectTo=...&token=...
   ↓
10. Loading page waits 2s, then redirects to experience page
   ↓
11. Experience page reads token from URL (fallback for iframe cookies)
   ↓
12. Dashboard loads with authenticated session
```

### Session Management

**Session Storage:**
- Cookie: `whop_session` (httpOnly, secure, sameSite: 'none')
- Token: Base64-encoded JSON in URL (fallback for iframe cookie issues)
- Session data: `{ companyId, userId, username, exp }`
- Expiration: 7 days

**Iframe Cookie Handling:**
- Primary: Cookie-based authentication
- Fallback: Token passed through URL on first load
- Why: Third-party cookies may be blocked in iframes

### Authorization Checks

1. **Middleware**: Protects routes, allows public/iframe routes
2. **Session Verification**: Checks cookie or token on each request
3. **Company Access**: Users can only access their own company data
4. **Plan Enforcement**: Pro features gated at API and UI levels

---

## 🗄️ Database Schema

### Prisma Models

#### `WhopInstallation`
Stores app installation data per company/user

```prisma
model WhopInstallation {
  id             String         @id @default(cuid())
  companyId      String         @unique        // Whop company/user ID
  userId         String?                       // Whop user ID for webhook matching
  experienceId   String?        @unique        // Whop experience ID (for iframe)
  plan           String?                       // 'free', 'pro', 'business'
  accessToken    String                        // OAuth access token for Whop API
  username       String?                       // User's Whop username
  email          String?                       // User's email
  profilePicUrl  String?                      // Profile picture URL
  
  // Settings (per-company)
  reportEmail    String?                       // Email for reports
  weeklyEmail    Boolean        @default(true)
  dailyEmail     Boolean        @default(false) // Pro only
  discordWebhook String?                      // Pro only
  
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  
  metrics        MetricsDaily[]
  
  @@index([userId])
}
```

#### `MetricsDaily`
Stores daily aggregated metrics per company

```prisma
model MetricsDaily {
  id            String            @id @default(cuid())
  companyId     String
  date          DateTime
  grossRevenue  Decimal           @db.Decimal(12, 2)
  activeMembers Int
  newMembers    Int
  cancellations Int
  trialsStarted Int
  trialsPaid    Int
  createdAt     DateTime          @default(now())
  installation  WhopInstallation? @relation(fields: [companyId], references: [companyId], onDelete: Cascade)

  @@unique([companyId, date])
  @@index([companyId, date])
}
```

**Key Design Decisions:**
- `onDelete: Cascade` - Deleting installation removes all metrics
- Unique constraint on `[companyId, date]` - One record per company per day
- Indexed for fast queries by company and date range

---

## 🔌 API Endpoints

### Authentication Endpoints

#### `GET /api/auth/init`
Generates OAuth authorization URL

**Query Params:**
- `experienceId` (optional): Whop experience ID
- `companyId` (optional): Company ID from Whop

**Response:**
```json
{
  "url": "https://whop.com/oauth?...",
  "state": "base64-encoded-state"
}
```

**Security:** Public endpoint

---

#### `GET /api/auth/callback`
OAuth callback handler

**Query Params:**
- `code`: OAuth authorization code
- `state`: Base64-encoded state with experienceId

**Process:**
1. Exchanges code for access token
2. Fetches user data from Whop
3. Creates/updates installation
4. Sets session cookie
5. Redirects to loading page with token

**Security:** Public endpoint, validates OAuth state

---

#### `POST /api/auth/logout`
Logs out user

**Process:**
1. Deletes session cookie
2. Returns success response

**Security:** Public endpoint

---

### Data Endpoints

#### `GET /api/settings?companyId=...`
Fetches company settings

**Query Params:**
- `companyId` (optional): Override session companyId

**Response:**
```json
{
  "reportEmail": "user@example.com",
  "weeklyEmail": true,
  "dailyEmail": false,
  "discordWebhook": null,
  "plan": "free",
  "companyId": "user_xxx"
}
```

**Security:** 
- Requires session OR companyId in query
- Validates companyId matches session

---

#### `POST /api/settings`
Updates company settings

**Body:**
```json
{
  "companyId": "user_xxx",  // Optional, must match session
  "reportEmail": "user@example.com",
  "weeklyEmail": true,
  "dailyEmail": false,       // Pro only
  "discordWebhook": "url"    // Pro only
}
```

**Security:**
- Requires session OR companyId in body
- Validates companyId matches session
- Enforces Pro-only features

---

### Webhook Endpoints

#### `POST /api/webhooks/whop`
Handles Whop webhooks

**Headers:**
- `whop-signature`: Webhook signature for verification

**Events Handled:**
- `membership.activated` / `membership_activated`
- `membership.deactivated` / `membership_deactivated`

**Process:**
1. Verifies webhook signature (if secret configured)
2. Parses event type (supports `action`, `type`, or `event` fields)
3. Updates installation plan based on membership status
4. Matches installation by `userId`, `experienceId`, or `companyId`

**Security:**
- Signature verification (optional, warns if not configured)
- Public endpoint (Whop sends webhooks here)

---

### Data Ingestion Endpoints

#### `POST /api/ingest/whop?secret=CRON_SECRET`
Ingests daily metrics from Whop

**Query Params:**
- `secret`: Must match `CRON_SECRET`

**Process:**
1. Validates secret
2. Fetches yesterday's data from Whop API
3. Upserts into `MetricsDaily` table
4. Optionally sends daily report email

**Security:** Requires `CRON_SECRET`

---

#### `POST /api/ingest/whop/backfill?secret=CRON_SECRET`
Backfills historical metrics

**Process:** Similar to daily ingest but for date range

**Security:** Requires `CRON_SECRET`

---

### Report Endpoints

#### `GET /api/report/daily?secret=CRON_SECRET`
Sends daily reports to all enabled companies

**Security:** Requires `CRON_SECRET`

---

#### `GET /api/report/weekly?secret=CRON_SECRET`
Sends weekly reports to all enabled companies

**Security:** Requires `CRON_SECRET`

---

### Debug Endpoints

#### `GET /api/debug/tables?secret=CRON_SECRET`
Shows database table information

**Security:** Requires `CRON_SECRET` (fixed vulnerability)

---

## 🛡️ Security Implementation

### Authentication Security

1. **OAuth State Validation**
   - CSRF protection via state parameter
   - Base64-encoded JSON with timestamp
   - Validated on callback

2. **Session Security**
   - HttpOnly cookies (prevents XSS)
   - Secure flag (HTTPS only)
   - SameSite: 'none' (iframe compatibility)
   - Expiration: 7 days
   - Base64-encoded JSON tokens

3. **Token Fallback**
   - URL tokens for iframe cookie issues
   - Single-use tokens (cleared after first load)
   - Base64 encoding (not encryption - acceptable for session data)

### Authorization Security

1. **Company Access Control**
   - Users can only access their own `companyId`
   - API endpoints validate `companyId` matches session
   - Settings API blocks cross-company access

2. **Plan Enforcement**
   - Pro features checked at API level
   - UI-level gating with blur overlays
   - Database enforces Pro-only settings

3. **Webhook Security**
   - Signature verification (HMAC)
   - Configurable secret (warns if missing)
   - Validates webhook payload integrity

### Input Validation

1. **Database Queries**
   - Prisma ORM (parameterized queries - SQL injection safe)
   - Only one `$queryRaw` usage (debug endpoint, properly scoped)

2. **API Inputs**
   - Email validation (basic format check)
   - URL validation for webhooks
   - TypeScript types for type safety

3. **XSS Prevention**
   - React escapes by default
   - No `dangerouslySetInnerHTML` usage
   - URL encoding for redirects

### Fixed Vulnerabilities

1. **Settings API Authorization** ✅ Fixed
   - Previously allowed companyId override without validation
   - Now validates companyId matches session

2. **Debug Tables Endpoint** ✅ Fixed
   - Previously protected by weak `?show=true` check
   - Now requires `CRON_SECRET`

### Security Best Practices Implemented

- ✅ Environment variables for secrets
- ✅ HttpOnly cookies
- ✅ HTTPS-only cookies
- ✅ CSRF protection via OAuth state
- ✅ Webhook signature verification
- ✅ Input validation and sanitization
- ✅ Authorization checks on all endpoints
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS prevention (React escaping)
- ✅ Rate limiting (via Vercel)

---

## 🚀 Deployment & Infrastructure

### Vercel Configuration

**Build Settings:**
- Framework: Next.js
- Build Command: `yarn build` (or `npm run build`)
- Output Directory: `.next`
- Install Command: `yarn install` (or `npm install`)

**Environment Variables Required:**
```bash
# Database
DATABASE_URL="postgresql://..."

# Whop Configuration
WHOP_APP_SERVER_KEY="app_xxxxx"
WHOP_WEBHOOK_SECRET="webhook_secret"
NEXT_PUBLIC_WHOP_APP_ID="app_xxxxx"
NEXT_PUBLIC_WHOP_PRO_PLAN_ID="plan_xxxxx"
WHOP_CLIENT_ID="app_xxxxx"
WHOP_CLIENT_SECRET="client_secret"

# Security
CRON_SECRET="random_secret_here"

# Email
RESEND_API_KEY="re_xxxxx"
RESEND_FROM_EMAIL="noreply@example.com"
```

**Next.js Configuration:**
- `next.config.js` includes Prisma binary targets for Vercel
- Output file tracing includes Prisma binaries
- Runtime: Node.js (not Edge)

### Database (Neon PostgreSQL)

- **Provider**: Neon.tech
- **Connection**: Pooled connection string
- **Migrations**: Prisma migrations
- **Schema**: Managed via Prisma

**Migration Workflow:**
```bash
# Make schema changes in prisma/schema.prisma
npx prisma migrate dev --name migration_name
# Or push directly (development):
npx prisma db push
```

### Cron Jobs

**Vercel Cron Configuration** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/ingest/whop?secret=CRON_SECRET",
      "schedule": "0 1 * * *"  // Daily at 1 AM UTC
    },
    {
      "path": "/api/report/daily?secret=CRON_SECRET",
      "schedule": "0 8 * * *"  // Daily at 8 AM UTC
    },
    {
      "path": "/api/report/weekly?secret=CRON_SECRET",
      "schedule": "0 9 * * 1"  // Weekly on Monday at 9 AM UTC
    }
  ]
}
```

---

## 💻 Development Workflow

### Local Setup

1. **Clone Repository**
   ```bash
   git clone <repo-url>
   cd AnalyticsDashboard
   ```

2. **Install Dependencies**
   ```bash
   yarn install  # or npm install
   ```

3. **Environment Variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your values
   ```

4. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push  # For development
   # Or use migrations: npx prisma migrate dev
   ```

5. **Run Development Server**
   ```bash
   yarn dev  # or npm run dev
   ```

### File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── callback/      # OAuth callback handler
│   │   │   ├── init/          # OAuth URL generator
│   │   │   └── logout/       # Logout handler
│   │   ├── webhooks/
│   │   │   └── whop/         # Webhook handler
│   │   ├── ingest/
│   │   │   └── whop/         # Data ingestion
│   │   ├── report/           # Email reports
│   │   └── settings/        # Settings API
│   ├── auth/
│   │   └── loading/         # Auth loading page
│   ├── experiences/
│   │   └── [experienceId]/  # Main dashboard page
│   ├── login/               # Login page
│   └── settings/            # Settings page
├── components/
│   ├── dashboard-view.tsx    # Main dashboard component
│   ├── user-profile-menu.tsx # Profile dropdown
│   ├── upgrade-button-iframe.tsx # In-app upgrade
│   └── ui/                  # Reusable UI components
├── lib/
│   ├── prisma.ts            # Prisma client
│   ├── session.ts           # Session management
│   ├── auth.ts              # Auth helpers
│   ├── metrics.ts            # Metrics utilities
│   └── whop-rest.ts         # Whop API client
└── middleware.ts            # Route protection

prisma/
└── schema.prisma            # Database schema
```

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended rules
- **Formatting**: Prettier (if configured)
- **Naming**: camelCase for variables, PascalCase for components

---

## 🔧 Key Technical Decisions

### 1. Why Next.js App Router?

**Decision**: Use Next.js 14 App Router instead of Pages Router

**Reasons:**
- Server components for better performance
- Built-in API routes (simpler than separate backend)
- Vercel deployment optimization
- Modern React features (Suspense, streaming)

### 2. Why Prisma ORM?

**Decision**: Use Prisma instead of raw SQL or TypeORM

**Reasons:**
- Type-safe database queries
- Automatic SQL injection prevention
- Excellent migration system
- Great developer experience
- Vercel compatibility

### 3. Why Token Fallback for Cookies?

**Decision**: Pass session token through URL as fallback

**Reasons:**
- Third-party cookies blocked in many browsers
- Iframe contexts have cookie restrictions
- Ensures authentication works reliably
- Token is cleared after first use

### 4. Why Retry Logic for Installation Lookup?

**Decision**: Retry up to 3 times with 500ms delays

**Reasons:**
- Database write propagation delay
- OAuth callback creates installation immediately
- Loading page redirects quickly
- Retries handle race condition

### 5. Why Loading Page Between OAuth and Dashboard?

**Decision**: Insert `/auth/loading` page between OAuth and dashboard

**Reasons:**
- Gives database time to sync
- Allows cookie propagation
- Provides smooth UX transition
- Handles token passing through URL

### 6. Why Per-Company Settings?

**Decision**: Store settings in `WhopInstallation` model

**Reasons:**
- Each company/user has own settings
- Simplifies access control
- No separate settings table needed
- Easy to query with installation

---

## 🐛 Known Issues & Solutions

### Issue 1: "Unable to Load Dashboard" Error

**Problem**: After OAuth, dashboard sometimes fails to load

**Root Causes:**
- Installation not found (database sync delay)
- Cookie not accessible in iframe
- Session token missing from URL

**Solutions Implemented:**
1. Retry logic for installation lookup (3 attempts)
2. Token fallback in URL
3. Increased loading page delay (2 seconds)
4. Session check before dashboard load

**Status**: ✅ Resolved

---

### Issue 2: Login Loop After OAuth

**Problem**: User redirected back to login page after authorization

**Root Causes:**
- `experienceId` not preserved through OAuth flow
- Cookie not accessible
- Middleware blocking routes

**Solutions Implemented:**
1. Preserve `experienceId` in OAuth state
2. Pass token through URL
3. Add `/auth/loading` to public routes
4. Auto-extract `experienceId` in login form

**Status**: ✅ Resolved

---

### Issue 3: Logout Not Working

**Problem**: Clicking logout reloads dashboard instead of logging out

**Root Causes:**
- Cookie deletion not working in iframe
- Token still in URL after reload
- Session check using token from URL

**Solutions Implemented:**
1. Proper cookie deletion with same options
2. Remove token from URL on logout
3. Clear session check before dashboard load

**Status**: ✅ Resolved

---

### Issue 4: Upgrade Creates Duplicate Installation

**Problem**: Purchasing Pro plan creates new "Quantivo Solutions" Whop

**Root Cause**: Whop platform behavior - Access Pass creates membership portal

**Solution**: Explained to users this is expected behavior, not a bug
- Pro membership is owned by seller (Quantivo Solutions)
- Creates a membership portal in seller's Whop
- This is normal Whop behavior

**Status**: ⚠️ Expected behavior, not a bug

---

### Issue 5: Database Foreign Key Constraint

**Problem**: Cannot delete installation due to foreign key constraint

**Solution**: Added `onDelete: Cascade` to `MetricsDaily` relation

**Status**: ✅ Resolved

---

## 📈 Future Improvements

### High Priority

1. **Rate Limiting**
   - Add rate limiting to API endpoints
   - Prevent abuse of webhook endpoints
   - Consider Vercel Edge Config or Upstash

2. **Error Tracking**
   - Integrate Sentry or similar
   - Better error logging and monitoring
   - User-friendly error messages

3. **Caching**
   - Cache dashboard data (Redis or Vercel KV)
   - Reduce database queries
   - Improve page load times

4. **Data Export**
   - Allow users to export metrics as CSV
   - Scheduled exports via email
   - API endpoint for programmatic access

### Medium Priority

5. **Advanced Analytics**
   - Cohort analysis
   - Revenue forecasting
   - Member lifetime value
   - Churn prediction

6. **Multi-Company Support**
   - Support users with multiple Whop accounts
   - Company switching UI
   - Aggregate views

7. **Real-time Updates**
   - WebSocket connection for live metrics
   - Push notifications for milestones
   - Real-time dashboard updates

8. **Custom Date Ranges**
   - Allow users to select custom date ranges
   - Compare periods
   - Trend analysis

### Low Priority

9. **Dark Mode Toggle**
   - User preference storage
   - System preference detection
   - Smooth theme transitions

10. **Internationalization**
    - Multi-language support
    - Localized date formats
    - Currency formatting

11. **Mobile App**
    - React Native wrapper
    - Push notifications
    - Offline data access

12. **Advanced Chart Types**
    - Heatmaps
    - Funnel charts
    - Geographic distribution

---

## 📚 Additional Resources

### Documentation References
- [Whop Developer Docs](https://docs.whop.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Vercel Documentation](https://vercel.com/docs)

### Key Files to Understand
- `src/app/api/auth/callback/route.ts` - OAuth flow
- `src/app/experiences/[experienceId]/page.tsx` - Main dashboard
- `src/lib/session.ts` - Session management
- `src/middleware.ts` - Route protection
- `prisma/schema.prisma` - Database schema

### Testing Strategy
- Manual testing in Whop iframe
- OAuth flow testing with test account
- Webhook testing via Whop dashboard
- Database operations via Prisma Studio

---

## 🔒 Security Checklist

Before deploying to production, verify:

- [x] All environment variables set correctly
- [x] `CRON_SECRET` is strong and unique
- [x] `WHOP_WEBHOOK_SECRET` is configured
- [x] Database connection uses SSL
- [x] Cookies have `secure` flag in production
- [x] CORS configured correctly
- [x] Rate limiting on public endpoints
- [x] Input validation on all API endpoints
- [x] Authorization checks in place
- [x] SQL injection prevention (Prisma)
- [x] XSS prevention (React escaping)
- [x] Error messages don't leak sensitive info
- [x] Debug endpoints protected
- [x] Webhook signature verification enabled

---

## 📝 Notes for Future Development

### When Adding New Features

1. **Check Authorization**
   - Always validate `companyId` matches session
   - Use Prisma relations for data access
   - Never trust client-provided IDs

2. **Handle Iframe Context**
   - Test in Whop iframe, not just standalone
   - Consider cookie limitations
   - Use token fallback when needed

3. **Database Changes**
   - Always create migrations
   - Test migrations on staging first
   - Consider cascade delete implications

4. **API Design**
   - Follow RESTful conventions
   - Return consistent error formats
   - Log all security-relevant actions

5. **Error Handling**
   - Catch and log errors
   - Return user-friendly messages
   - Never expose internal details

---

## 🎓 Lessons Learned

### What Worked Well

1. **Prisma ORM**: Type-safe queries prevented many bugs
2. **Next.js App Router**: Server components improved performance
3. **Token Fallback**: Solved iframe cookie issues elegantly
4. **Retry Logic**: Handled race conditions gracefully
5. **Modular Architecture**: Easy to add features

### Challenges Overcome

1. **Iframe Cookie Restrictions**: Solved with URL token fallback
2. **OAuth State Management**: Preserved experienceId through flow
3. **Database Race Conditions**: Retry logic and delays
4. **Webhook Format Variations**: Flexible parsing logic
5. **Vercel Prisma Binaries**: Output file tracing configuration

### Best Practices Established

1. Always validate user input
2. Never trust client-provided IDs
3. Log security-relevant actions
4. Test in iframe context, not just standalone
5. Handle errors gracefully
6. Use TypeScript for type safety
7. Document complex flows
8. Fix security issues immediately

---

## 📞 Support & Maintenance

### For Developers

When debugging issues:

1. Check Vercel logs for server-side errors
2. Check browser console for client-side errors
3. Verify environment variables in Vercel dashboard
4. Test OAuth flow in incognito mode
5. Check database directly via Prisma Studio
6. Verify webhook signatures match

### For Users

Common issues and solutions:

1. **Dashboard not loading**: Refresh page, check internet connection
2. **Can't login**: Clear cookies, try incognito mode
3. **Settings not saving**: Check plan status, verify email format
4. **Upgrade not working**: Check Whop membership status

---

## 📄 License & Credits

- Built for Whop platform
- Uses Whop OAuth and API
- Powered by Next.js, Prisma, and Vercel

---

**Last Updated**: October 31, 2025
**Version**: 1.0.0
**Maintainer**: Quantivo Solutions

