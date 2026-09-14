import { PrismaClient } from '@/app/generated/prisma'
import { PrismaNeon, PrismaNeonHttp } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaRead: PrismaClient | undefined
}

const connectionString = process.env.DATABASE_URL!

/** 쓰기·트랜잭션용. WebSocket 풀이라 트랜잭션을 지원한다. */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })

/**
 * 읽기 전용. HTTP라 연결 핸드셰이크 없이 바로 쿼리한다.
 * 트랜잭션을 거부하므로 $transaction이나 쓰기에는 쓰지 않는다.
 */
export const prismaRead =
  globalForPrisma.prismaRead ??
  new PrismaClient({ adapter: new PrismaNeonHttp(connectionString, {}) })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaRead = prismaRead
}
