/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
  turbopack: {},
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./node_modules/.prisma/client/**/*'],
      '/dashboard/**/*': ['./node_modules/.prisma/client/**/*'],
      '/experiences/**/*': ['./node_modules/.prisma/client/**/*'],
      '/settings/**/*': ['./node_modules/.prisma/client/**/*'],
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Modern way - allow Whop to embed our app in iframes
          { 
            key: "Content-Security-Policy", 
            value: "frame-ancestors https://*.whop.com https://whop.com 'self';" 
          },
          // Legacy fallback (ignored by modern CSP but some proxies still check it)
          { 
            key: "X-Frame-Options", 
            value: "ALLOW-FROM https://whop.com" 
          },
          // Security hygiene
          { 
            key: "Referrer-Policy", 
            value: "strict-origin-when-cross-origin" 
          },
          { 
            key: "X-Content-Type-Options", 
            value: "nosniff" 
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
