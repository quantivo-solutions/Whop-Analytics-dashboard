import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  })

// Log all database errors
prisma.$on('error' as any, (e: any) => {
  console.error('❌ [Prisma Error]:', {
    timestamp: new Date().toISOString(),
    message: e.message,
    target: e.target,
  })
})

// Log warnings
prisma.$on('warn' as any, (e: any) => {
  console.warn('⚠️ [Prisma Warning]:', {
    timestamp: new Date().toISOString(),
    message: e.message,
  })
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
