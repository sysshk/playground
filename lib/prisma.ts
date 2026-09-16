/*
  서버 공통 — DB 클라이언트 (쓰기용 WebSocket, 읽기용 HTTP)

  @date : 2025-12-11
*/

import { PrismaClient } from '@/app/generated/prisma'
import { PrismaNeon, PrismaNeonHttp } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaRead: PrismaClient | undefined
}

const connectionString = process.env.DATABASE_URL!

/** 쓰기·트랜잭션용. WebSocket 풀이라 트랜잭션을 지원함 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })

/**
 * 읽기 전용. HTTP라 연결 핸드셰이크 없이 바로 쿼리함
 * 트랜잭션을 거부하므로 $transaction이나 쓰기에는 쓰지 않음
 */
export const prismaRead =
  globalForPrisma.prismaRead ??
  new PrismaClient({ adapter: new PrismaNeonHttp(connectionString, {}) })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaRead = prismaRead
}
