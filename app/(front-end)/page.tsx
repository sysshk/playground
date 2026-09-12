"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import AppPreview from "./_components/app-preview";
import { Icon } from "@/components/custom/icons";
import Logo from "@/components/custom/logo";
import { asset } from "@/lib/client";
import { SIGNUP_ENABLED } from "@/lib/config";

const START_HREF = SIGNUP_ENABLED ? "/join" : "/login";
const START_LABEL = SIGNUP_ENABLED ? "무료로 시작하기" : "로그인하고 시작하기";

/*
 * 소개 페이지 글자·버튼 기준. 섹션마다 따로 정하면 크기가 제각각이 된다.
 * 제목(3xl)과 본문 사이가 너무 벌어지지 않게 본문은 데스크톱에서 lg로 올린다.
 */
const BODY = "mt-5 max-w-[520px] text-md leading-[1.8] text-muted-foreground sm:text-lg";
/** 첫 화면과 마지막의 주요 버튼. 두 버튼의 크기를 똑같이 맞춘다. */
const CTA = "inline-flex h-12 items-center gap-2 rounded-xl px-6 text-md font-bold transition-colors";

const STATS = [
  { value: "세트별", label: "횟수와 무게를 따로 기록" },
  { value: "저장 한 번", label: "기록 저장과 수업 차감을 함께" },
  { value: "한 화면", label: "기록 · 체중 · 메모 · 영양" },
];

const ROWS = [
  {
    image: asset("/images/sets-barbell-rack.jpg"),
    alt: "바벨로 웨이트 트레이닝을 하는 모습",
    title: "세트마다 다르게\n기록됩니다",
    body: "드롭세트도 피라미드도 그대로 남습니다. 1세트 12회 50kg, 2세트 10회 60kg — 세트별로 따로 입력하세요.",
    points: ["세트별 횟수·무게", "맨몸 운동도 그대로", "종목 여러 개를 한 번에"],
  },
  {
    image: asset("/images/coaching-trx.jpg"),
    alt: "트레이너가 회원의 자세를 봐주는 모습",
    title: "통증과 자세를\n다음 수업으로",
    body: "통증 부위, 자세 문제, 움직임 평가, 숙제까지. 지난 수업에서 본 것을 다음 수업에 바로 이어갑니다.",
    points: ["통증 · 자세 문제", "움직임 평가", "다음 수업까지의 숙제"],
  },
  {
    image: asset("/images/nutrition-bowl.jpg"),
    alt: "균형 잡힌 식단이 담긴 접시",
    title: "체성분까지 반영한\n섭취 기준",
    body: "체지방률과 골격근량을 넣으면 제지방량 기반으로 계산합니다. 기초대사량·유지칼로리·목표 칼로리와 매크로까지 한 번에.",
    points: ["Katch-McArdle · Mifflin-St Jeor", "감량 · 유지 · 증량", "단백질 · 탄수화물 · 지방"],
  },
];

export default function HomePage() {
  const { status } = useSession();
  const loggedIn = status === "authenticated";

  const ctaHref = loggedIn ? "/members" : START_HREF;
  const ctaLabel = loggedIn ? "회원 관리로 이동" : START_LABEL;

  return (
    <div className="bg-surface">
      {/* ── 히어로 ───────────────────────────── */}
      <section className="relative isolate min-h-[620px] overflow-hidden bg-hero sm:min-h-[680px]">
        <Image
          src={asset("/images/hero-gym.jpg")}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* 사진 위 글자를 읽히게 하는 어둠. 왼쪽이 더 짙다. */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30" />

        <div className="relative mx-auto flex min-h-[620px] max-w-[1200px] flex-col px-5 sm:min-h-[680px] sm:px-8">
          <header className="flex items-center justify-between py-6">
            <Logo onDark />
          </header>

          <div className="flex flex-1 flex-col justify-center py-14">
            <span className="w-fit rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-sm">
              개인 트레이너를 위한 회원 관리
            </span>

            <h1 className="mt-6 max-w-[660px] text-4xl font-extrabold leading-[1.14] tracking-[-0.035em] text-white sm:text-5xl">
              오늘 수업은
              <br />
              기억이 아니라 기록으로
            </h1>

            <p className="mt-6 max-w-[560px] text-md leading-[1.75] text-white/70 sm:text-lg">
              회원 정보, 남은 수업, 운동 기록, 체중, 코칭 메모까지. 수첩과 메신저에
              흩어지던 것들을 수업 중에 바로 정리하세요.
            </p>

            <div className="mt-9">
              <Link
                href={ctaHref}
                className={`${CTA} bg-primary text-white hover:bg-primary-dark`}
              >
                {ctaLabel}
                <Icon name="arrowRight" size={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 숫자 스트립 ───────────────────────── */}
      <section className="bg-hero">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-10 sm:grid-cols-3 sm:px-8 sm:py-12">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-extrabold tracking-[-0.03em] text-white sm:text-3xl">
                {s.value}
              </p>
              <p className="mt-1.5 text-base text-white/60">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 제품 화면 ─────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_460px] lg:gap-20">
          <div>
            <h2 className="text-2xl font-extrabold leading-[1.3] tracking-[-0.025em] sm:text-3xl">
              회원 한 명의 모든 것이
              <br />한 화면에
            </h2>
            <p className={BODY}>
              남은 수업, 최신 체중, 오늘의 운동 기록까지 한눈에 봅니다. 운동 기록을
              저장하면 수업도 함께 차감됩니다.
            </p>
            <ul className="mt-7 flex flex-col gap-3">
              {[
                "회원 정보와 남은 수업",
                "운동 · 체중 · 코칭 메모를 같은 화면에서 입력",
                "기록 저장과 함께 수업 차감, 잘못 누르면 이력에서 취소",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-base sm:text-md">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-light text-primary-dark">
                    <Icon name="check" size={12} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <AppPreview />
        </div>
      </section>

      {/* ── 사진 + 설명 교차 ──────────────────── */}
      {ROWS.map((row, i) => (
        <section
          key={row.title}
          className={i % 2 === 1 ? "bg-canvas" : "bg-surface"}
        >
          <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:gap-16">
            <div
              className={`relative aspect-4/3 max-w-full overflow-hidden rounded-2xl ${
                i % 2 === 1 ? "lg:order-2" : ""
              }`}
            >
              <Image
                src={row.image}
                alt={row.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
            </div>

            <div>
              <h2 className="whitespace-pre-line text-2xl font-extrabold leading-[1.32] tracking-[-0.025em] sm:text-3xl">
                {row.title}
              </h2>
              <p className={BODY}>
                {row.body}
              </p>
              <ul className="mt-6 flex flex-col gap-2.5">
                {row.points.map((p) => (
                  <li
                    key={p}
                    className="flex items-center gap-2.5 text-base font-medium sm:text-md"
                  >
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ))}

      {/* ── 마무리 ───────────────────────────── */}
      <section className="bg-hero">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 px-5 py-20 text-center sm:px-8 sm:py-24">
          <h2 className="max-w-[560px] text-2xl font-extrabold leading-[1.3] tracking-[-0.025em] text-white sm:text-3xl">
            오늘 수업부터 바로 써보세요
          </h2>
          <p className="max-w-[600px] text-md leading-[1.75] text-white/60 sm:text-lg">
            브라우저에서 바로 열립니다. 홈 화면에 추가하면 앱처럼 쓸 수 있습니다.
          </p>
          <Link
            href={ctaHref}
            className={`mt-2 ${CTA} bg-white text-hero hover:bg-white/90`}
          >
            {ctaLabel}
            <Icon name="arrowRight" size={17} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8">
          <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
            <div className="max-w-[280px]">
              <Logo />
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                개인 트레이너를 위한 회원 및 운동기록 관리 앱. 브라우저에서 바로
                열리고, 홈 화면에 추가하면 앱처럼 쓸 수 있습니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-12 sm:gap-16">
              <nav className="flex flex-col gap-2.5">
                <p className="text-2xs font-bold uppercase tracking-wider text-subtle">
                  서비스
                </p>
                {[
                  ["회원 관리", "/members"],
                  ["로그인", "/login"],
                ].map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              <div className="flex flex-col gap-2.5">
                <p className="text-2xs font-bold uppercase tracking-wider text-subtle">
                  기능
                </p>
                {["세트별 운동 기록", "체중 · 코칭 메모", "칼로리 영양 계산"].map(
                  (t) => (
                    <span key={t} className="text-sm text-muted-foreground">
                      {t}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>

          {/*
            사진 출처 표기는 넣지 않는다. Unsplash 라이선스는 표기를 요구하지 않고,
            Pretendard의 OFL 저작권 문구는 public/fonts/pretendard.css 상단에 그대로 있다.
          */}
          <div className="mt-10 border-t border-line pt-6">
            <p className="text-xs text-subtle">
              © {new Date().getFullYear()} PT 매니저
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
