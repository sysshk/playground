/*
  API — 회원가입

  @date : 2025-12-11
*/

import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { SIGNUP_ENABLED } from "@/lib/config"
import { isEmail, PASSWORD_MIN } from "@/lib/account"
import { readBody, toTrimmed } from "@/lib/api"

export async function POST(request: Request) {
  // 화면을 막는 것만으로는 부족함. API로 직접 호출해도 막혀야 함
  if (!SIGNUP_ENABLED) {
    return NextResponse.json(
      { error: "현재 회원가입을 받고 있지 않습니다." },
      { status: 403 }
    )
  }

  try {
    const body = await readBody(request)
    const email = toTrimmed(body.email)?.toLowerCase()
    const password = typeof body.password === "string" ? body.password : ""
    const name = toTrimmed(body.name)

    if (!email || !isEmail(email)) {
      return NextResponse.json(
        { error: "이메일 주소를 정확히 입력해 주세요." },
        { status: 400 }
      )
    }
    if (password.length < PASSWORD_MIN) {
      return NextResponse.json(
        { error: `비밀번호는 ${PASSWORD_MIN}자 이상으로 입력해 주세요.` },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 가입된 이메일입니다." },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        // 가입은 누구나 회원으로 시작함. 트레이너 권한은 관리자가 계정 관리에서 줌
        role: "client",
      },
    })

    return NextResponse.json(
      {
        message: "회원가입이 완료되었습니다.",
        user: { id: user.id, email: user.email, name: user.name }
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
