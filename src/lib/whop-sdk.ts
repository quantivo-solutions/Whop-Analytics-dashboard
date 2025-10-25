import { WhopServerSdk } from "@whop/api";

// Try both env var names for compatibility
const apiKey = process.env.WHOP_API_KEY || process.env.WHOP_SK || "";

if (apiKey) {
  console.log('✅ Whop SDK initialized with API key (length:', apiKey.length, ')');
} else {
  console.warn('⚠️  No WHOP_API_KEY found for SDK initialization');
}

export const whopSdk = WhopServerSdk({
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID ?? "app_placeholder",
  appApiKey: apiKey,
});

