#!/bin/bash
# Helper script to run webhook tests with .env.local loaded

cd "$(dirname "$0")"

# Load environment variables from .env.local
if [ -f .env.local ]; then
  export WHOP_WEBHOOK_SECRET=$(grep WHOP_WEBHOOK_SECRET .env.local | cut -d '=' -f2-)
  export PROD_URL=$(grep PROD_URL .env.local | cut -d '=' -f2-)
else
  echo "❌ Error: .env.local not found"
  echo "Create .env.local with WHOP_WEBHOOK_SECRET and PROD_URL"
  exit 1
fi

# Run the webhook script with arguments
node scripts/send-whop-webhook.mjs "$@"

