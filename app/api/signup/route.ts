import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { user_id, password, name } = await request.json()

    if (!user_id || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호는 필수입니다." },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: user_id }, // DB에서는 email 컬럼 사용
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 존재하는 아이디입니다." },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email: user_id, // DB에서는 email 컬럼에 user_id 저장
        password: hashedPassword,
        name,
      },
    })

    return NextResponse.json(
      {
        message: "회원가입이 완료되었습니다.",
        user: { id: user.id, user_id: user.email, name: user.name }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "회원가입 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
