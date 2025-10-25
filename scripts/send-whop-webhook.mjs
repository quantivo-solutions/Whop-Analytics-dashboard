#!/usr/bin/env node
import crypto from "node:crypto";

const PROD_URL = process.env.PROD_URL || "https://whop-analytics-dashboard-omega.vercel.app";
const SECRET = process.env.WHOP_WEBHOOK_SECRET;
const WHOP_API_KEY = process.env.WHOP_APP_SERVER_KEY;

// Show help if no secret or --help flag
const args = process.argv.slice(2);
if (!SECRET || args.includes("--help") || args.includes("-h")) {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           Whop Webhook Production Tester                        ║
╚══════════════════════════════════════════════════════════════════╝

Usage:
  node scripts/send-whop-webhook.mjs [event] [companyId] [amount]

Examples:
  node scripts/send-whop-webhook.mjs app.installed biz_test_123
  node scripts/send-whop-webhook.mjs app.plan.updated biz_test_123
  node scripts/send-whop-webhook.mjs app.uninstalled biz_test_123
  node scripts/send-whop-webhook.mjs membership_went_valid biz_test_123
  node scripts/send-whop-webhook.mjs payment_succeeded biz_test_123 1299

Or use npm scripts:
  npm run test:webhook:install
  npm run test:webhook:plan
  npm run test:webhook:uninstall
  npm run test:webhook:valid
  npm run test:webhook:cancel
  npm run test:webhook:pay
  npm run test:webhook:refund

Environment:
  WHOP_WEBHOOK_SECRET  - Required (set in .env.local)
  PROD_URL             - Optional (defaults to Vercel URL)

Current Config:
  PROD_URL: ${PROD_URL}
  SECRET:   ${SECRET ? "✅ Set" : "❌ Missing"}

${!SECRET ? "\n❌ Error: WHOP_WEBHOOK_SECRET not set in environment\n   Add it to .env.local and reload your terminal\n" : ""}
  `);
  if (!SECRET) process.exit(1);
  if (args.includes("--help") || args.includes("-h")) process.exit(0);
}

// Parse CLI args
const [EVENT = "membership_went_valid", COMPANY = "biz_test_company_123", AMOUNT = "1299"] = args;

const nowIso = new Date().toISOString();

// Build payload based on event type
const payloads = {
  "app.installed": {
    event: "app.installed",
    data: {
      company_id: COMPANY,
      access_token: WHOP_API_KEY || `tok_test_${Date.now()}`,
      experience_id: `exp_test_${Date.now()}`,
      plan: "free",
      installed_at: nowIso,
    },
  },
  "app.uninstalled": {
    event: "app.uninstalled",
    data: {
      company_id: COMPANY,
      uninstalled_at: nowIso,
    },
  },
  "app.plan.updated": {
    event: "app.plan.updated",
    data: {
      company_id: COMPANY,
      plan: "pro",
      updated_at: nowIso,
    },
  },
  "membership_went_valid": {
    event: "membership_went_valid",
    data: {
      company_id: COMPANY,
      occurred_at: nowIso,
      membership: {
        id: `mem_test_valid_${Date.now()}`,
        status: "active",
        user_id: `user_test_${Date.now()}`,
      },
    },
  },
  "membership_went_invalid": {
    event: "membership_went_invalid",
    data: {
      company_id: COMPANY,
      occurred_at: nowIso,
      membership: {
        id: `mem_test_invalid_${Date.now()}`,
        status: "canceled",
        user_id: `user_test_${Date.now()}`,
      },
    },
  },
  "payment_succeeded": {
    event: "payment_succeeded",
    data: {
      company_id: COMPANY,
      occurred_at: nowIso,
      payment: {
        id: `pay_test_${Date.now()}`,
        amount: Number(AMOUNT),
        currency: "usd",
        status: "paid",
      },
    },
  },
  "refund_created": {
    event: "refund_created",
    data: {
      company_id: COMPANY,
      occurred_at: nowIso,
      refund: {
        id: `ref_test_${Date.now()}`,
        amount: Number(AMOUNT),
        payment_id: `pay_test_${Date.now()}`,
      },
    },
  },
};

// Get payload or use generic format
const payload = payloads[EVENT] || {
  event: EVENT,
  data: {
    company_id: COMPANY,
    occurred_at: nowIso,
  },
};

const body = JSON.stringify(payload, null, 2);
const signature = crypto.createHmac("sha256", SECRET).update(JSON.stringify(payload)).digest("hex");
const url = `${PROD_URL}/api/webhooks/whop`;

console.log(`\n📤 Sending webhook to production...`);
console.log(`   Event:     ${EVENT}`);
console.log(`   Company:   ${COMPANY}`);
console.log(`   URL:       ${url}`);
console.log(`   Signature: ${signature.substring(0, 16)}...`);
console.log(`\n📦 Payload:`);
console.log(body);
console.log(`\n⏳ Sending request...\n`);

(async () => {
  try {
    const startTime = Date.now();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "whop-signature": signature,
      },
      body: JSON.stringify(payload),
    });
    const duration = Date.now() - startTime;
    const text = await res.text();
    
    console.log(`✅ Response received (${duration}ms)`);
    console.log(`   Status: ${res.status} ${res.statusText}`);
    console.log(`   Body:   ${text}`);
    
    if (!res.ok) {
      console.error(`\n❌ Request failed with status ${res.status}`);
      process.exit(1);
    }
    
    console.log(`\n✅ Webhook delivered successfully!`);
    
    // Special message for app.installed
    if (EVENT === "app.installed") {
      console.log(`\n💡 Check your production logs for:`);
      console.log(`   - "Installed companyId=${COMPANY}"`);
      console.log(`   - "📊 Starting 7-day backfill"`);
      console.log(`   - "✅ Backfill complete"`);
    }
    
  } catch (e) {
    console.error(`\n❌ Request failed:`, e.message);
    process.exit(1);
  }
})();

