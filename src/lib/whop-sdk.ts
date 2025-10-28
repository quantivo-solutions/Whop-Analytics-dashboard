/**
 * Whop SDK Configuration
 * 
 * Initializes the Whop Server SDK with both API key (for server operations)
 * and OAuth credentials (for user authentication)
 */

import { WhopServerSdk } from "@whop/api";

// Server API Key (for server-to-server operations like API calls)
const apiKey = process.env.WHOP_APP_SERVER_KEY || process.env.WHOP_API_KEY || process.env.WHOP_SK || "";

// OAuth Credentials (for user authentication flows)
const clientId = process.env.WHOP_CLIENT_ID || process.env.NEXT_PUBLIC_WHOP_APP_ID || "";
const clientSecret = process.env.WHOP_CLIENT_SECRET || "";

if (apiKey) {
  console.log('✅ Whop SDK initialized with API key (length:', apiKey.length, ')');
} else {
  console.warn('⚠️  No WHOP_APP_SERVER_KEY found for SDK initialization');
}

if (clientId && clientSecret) {
  console.log('✅ OAuth credentials configured (clientId:', clientId, ')');
} else {
  console.warn('⚠️  OAuth credentials missing! Set WHOP_CLIENT_ID and WHOP_CLIENT_SECRET');
}

export const whopSdk = WhopServerSdk({
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID ?? "app_placeholder",
  appApiKey: apiKey,
  clientId: clientId,
  clientSecret: clientSecret,
});

