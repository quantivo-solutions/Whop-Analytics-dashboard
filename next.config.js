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
        // Allow Whop to embed our app in iframes
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.whop.com https://whop.com",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
