import { NextResponse } from "next/server"
import { auth } from "@/app/api/auth/auth-config"
import { prisma } from "@/lib/prisma"

// GET - 아이디어 목록 조회
export async function GET() {
  try {
    const session = await auth()

    const ideas = await prisma.idea.findMany({
      include: {
        author: { select: { name: true } },
        likes: true,
      },
      orderBy: { createdAt: "desc" },
    })

    const formattedIdeas = ideas.map(idea => ({
      id: idea.id,
      text: idea.text,
      author: idea.author.name || "익명",
      likes: idea.likes.length,
      isLiked: session?.user?.id ? idea.likes.some(like => like.userId === session.user?.id) : false,
      date: idea.createdAt.toLocaleDateString("ko-KR"),
    }))

    return NextResponse.json(formattedIdeas)
  } catch (error) {
    console.error("Ideas fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch ideas" }, { status: 500 })
  }
}

// POST - 새 아이디어 등록
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { text } = await request.json()
    if (!text?.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    const idea = await prisma.idea.create({
      data: {
        text: text.trim(),
        authorId: session.user.id,
      },
      include: {
        author: { select: { name: true } },
        likes: true,
      },
    })

    return NextResponse.json({
      id: idea.id,
      text: idea.text,
      author: idea.author.name || "익명",
      likes: 0,
      isLiked: false,
      date: idea.createdAt.toLocaleDateString("ko-KR"),
    })
  } catch (error) {
    console.error("Idea create error:", error)
    return NextResponse.json({ error: "Failed to create idea" }, { status: 500 })
  }
}
