/**
 * Whop SDK Configuration
 * 
 * Initializes the Whop Server SDK with API key for server operations.
 * OAuth credentials are exported separately for use in OAuth flows.
 */

import { WhopServerSdk } from "@whop/api";

// Server API Key (for server-to-server operations like API calls)
const apiKey = process.env.WHOP_APP_SERVER_KEY || process.env.WHOP_API_KEY || process.env.WHOP_SK || "";

// OAuth Credentials (exported for use in OAuth flows)
export const WHOP_CLIENT_ID = process.env.WHOP_CLIENT_ID || process.env.NEXT_PUBLIC_WHOP_APP_ID || "";
export const WHOP_CLIENT_SECRET = process.env.WHOP_CLIENT_SECRET || "";

if (apiKey) {
  console.log('✅ Whop SDK initialized with API key (length:', apiKey.length, ')');
} else {
  console.warn('⚠️  No WHOP_APP_SERVER_KEY found for SDK initialization');
}

if (WHOP_CLIENT_ID && WHOP_CLIENT_SECRET) {
  console.log('✅ OAuth credentials configured (clientId:', WHOP_CLIENT_ID, ')');
} else {
  console.warn('⚠️  OAuth credentials missing! Set WHOP_CLIENT_ID and WHOP_CLIENT_SECRET');
}

export const whopSdk = WhopServerSdk({
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID ?? "app_placeholder",
  appApiKey: apiKey,
});

