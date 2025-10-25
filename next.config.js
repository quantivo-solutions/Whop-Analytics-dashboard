/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
  turbopack: {},
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./node_modules/.prisma/client/**/*'],
      '/dashboard': ['./node_modules/.prisma/client/**/*'],
      '/settings': ['./node_modules/.prisma/client/**/*'],
    },
  },
}

module.exports = nextConfig
