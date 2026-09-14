/*
  API — 회원가입

  @date : 2025-12-11
*/

import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { SIGNUP_ENABLED } from "@/lib/config"

export async function POST(request: Request) {
  // 화면을 막는 것만으로는 부족하다. API로 직접 호출해도 막혀야 한다.
  if (!SIGNUP_ENABLED) {
    return NextResponse.json(
      { error: "현재 회원가입을 받고 있지 않습니다." },
      { status: 403 }
    )
  }

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
        // 가입은 누구나 회원으로 시작한다. 트레이너 권한은 관리자가 계정 관리에서 준다.
        role: "client",
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
