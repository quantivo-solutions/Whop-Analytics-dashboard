import { WhopServerSdk } from "@whop/api";

export const whopSdk = WhopServerSdk({
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID ?? "app_placeholder",
  appApiKey: process.env.WHOP_API_KEY ?? "",
});

