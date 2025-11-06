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

// Log Prisma query events (errors and warnings)
prisma.$on('query' as any, (e: any) => {
  if (e.level === 'error') {
    console.error('❌ [Prisma Error]:', {
      timestamp: new Date().toISOString(),
      message: e.message,
      target: e.target,
    })
  } else if (e.level === 'warn') {
    console.warn('⚠️ [Prisma Warning]:', {
      timestamp: new Date().toISOString(),
      message: e.message,
    })
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
