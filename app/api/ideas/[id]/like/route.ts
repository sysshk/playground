import { NextResponse } from "next/server"
import { auth } from "@/app/api/auth/auth-config"
import { prisma } from "@/lib/prisma"

// POST - 좋아요 토글
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: ideaId } = await params

    // 기존 좋아요 확인
    const existingLike = await prisma.ideaLike.findUnique({
      where: {
        ideaId_userId: {
          ideaId,
          userId: session.user.id,
        },
      },
    })

    if (existingLike) {
      // 좋아요 취소
      await prisma.ideaLike.delete({
        where: { id: existingLike.id },
      })
      return NextResponse.json({ liked: false })
    } else {
      // 좋아요 추가
      await prisma.ideaLike.create({
        data: {
          ideaId,
          userId: session.user.id,
        },
      })
      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    console.error("Like toggle error:", error)
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 })
  }
}
