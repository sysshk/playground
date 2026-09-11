"use client";

import Link from "next/link";
import { Button } from "@/components/pt/ui";
import InstallPrompt from "@/components/pt/install-prompt";

const FEATURES = [
  {
    icon: "👥",
    title: "회원 관리",
    description: "전체 회원을 한눈에 확인하고 검색할 수 있습니다.",
    items: ["회원 목록 조회", "회원 등록·수정", "회원 삭제"],
  },
  {
    icon: "🎯",
    title: "세션 관리",
    description: "회원별 남은 PT 세션을 실시간으로 관리합니다.",
    items: ["수업 완료 시 1회 차감", "수업 완료 내역 확인"],
  },
  {
    icon: "🏋️",
    title: "운동 기록",
    description: "회원별 운동 기록을 등록하고 최신순으로 확인하세요.",
    items: ["종목·세트·횟수·무게", "바디웨이트 지원", "날짜별 기록"],
  },
  {
    icon: "💪",
    title: "체중 · 체성분",
    description: "체중 변화를 기록하고 최신 체중을 바로 확인합니다.",
    items: ["체중 기록", "측정 상황 메모"],
  },
  {
    icon: "📋",
    title: "코칭 메모",
    description: "통증, 자세와 움직임 평가를 기록해 다음 수업에 활용하세요.",
    items: ["통증 · 자세 문제", "움직임 평가", "숙제"],
  },
  {
    icon: "🍽️",
    title: "칼로리 및 영양 계산",
    description: "성별, 나이, 키, 체중과 활동량을 입력해 섭취 기준을 계산하세요.",
    items: ["기초대사량 · 유지칼로리", "목표 섭취칼로리", "단백질·탄수화물·지방"],
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-line bg-white px-6 py-10 shadow-card sm:px-10 sm:py-14">
        <p className="text-[13px] font-bold tracking-wide text-primary-dark">
          개인 트레이너를 위한
        </p>
        <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-tight sm:text-[40px]">
          회원과 운동기록을
          <br />
          <span className="text-primary-dark">한곳에서 관리</span>
        </h1>
        <p className="mt-4 max-w-[540px] text-[15px] leading-relaxed text-muted">
          PT 매니저로 회원 정보, 남은 세션, 운동 기록을 모바일·태블릿·PC 어디서든
          편리하게 관리하세요.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/members">
            <Button className="px-6">회원 관리 시작하기 →</Button>
          </Link>
        </div>
      </section>

      {/* 주요 기능 */}
      <section>
        <h2 className="text-[18px] font-bold tracking-tight">주요 기능</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-line bg-white p-5 shadow-card"
            >
              <span className="text-[26px]" aria-hidden="true">
                {feature.icon}
              </span>
              <h3 className="mt-2 text-[15px] font-bold tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                {feature.description}
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {feature.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-[13px] text-ink"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <InstallPrompt />
    </div>
  );
}
