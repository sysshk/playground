/*
  로그인 설정 — NextAuth 자격 증명 방식, JWT 세션

  @date : 2025-12-11
*/

import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma, prismaRead } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { toRole } from "@/lib/types"

/** 세션에 담은 역할을 DB와 다시 맞추는 간격 */
const ROLE_REFRESH_MS = 5 * 60 * 1000

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.roleCheckedAt = Date.now()
      }
      // 관리자가 역할을 바꿔도 다시 로그인하지 않게, 몇 분마다 DB에서 역할을 다시 읽음
      const checkedAt = typeof token.roleCheckedAt === "number" ? token.roleCheckedAt : 0
      if (token.id && Date.now() - checkedAt > ROLE_REFRESH_MS) {
        const found = await prismaRead.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        })
        // 계정이 지워졌으면 세션을 끊음. 남은 쿠키로 권한이 되살아나지 않게
        if (!found) return null
        token.role = toRole(found.role)
        token.roleCheckedAt = Date.now()
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = toRole(token.role)
      }
      return session
    },
  },
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        })

        if (!user) {
          return null
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!passwordMatch) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: toRole(user.role),
        }
      },
    }),
  ],
})
