import { useId } from "react";

// PT 매니저 로고
//
// P와 T를 한 줄로 이어 그린 모노그램. T의 가로획이 오른쪽에서 말려 내려와
// P의 둥근 부분이 되고, 세로 기둥은 둘이 함께 쓴다. 선에는 파랑→검정
// (어두운 배경에서는 하늘색→흰색) 그라데이션을 준다.
// 시안은 .pencil/design.pen의 "Logo 시안" D2.
//
// app/favicon.ico와 public/icons/*.png도 같은 도형이다. 여기를 바꾸면 함께 바꾼다.

/** 32×32 좌표계. 끝의 V6V26은 기둥을 되짚어 올라갔다 내려오는 것이라 한 획으로 그려진다. */
export const LOGO_PATH = "M5.25 6H20.25A6.5 6.5 0 0 1 20.25 19H16.25V6V26";

export function LogoMark({
  size = 32,
  onDark = false,
  className = "",
}: {
  size?: number;
  /** 어두운 배경 위에 놓일 때. 그라데이션이 하늘색→흰색으로 바뀐다. */
  onDark?: boolean;
  className?: string;
}) {
  // 한 화면에 로고가 여러 번 나와도 그라데이션 id가 겹치지 않게 한다.
  const gradientId = `pt-logo-${useId().replace(/[^\w-]/g, "")}`;
  const [from, to] = onDark ? ["#5b9bff", "#ffffff"] : ["#1f6feb", "#111111"];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <path
        d={LOGO_PATH}
        stroke={`url(#${gradientId})`}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SIZES = {
  sm: { mark: 24, gap: "gap-1.5", text: "text-xs" },
  md: { mark: 32, gap: "gap-2", text: "text-md" },
} as const;

export default function Logo({
  size = "md",
  onDark = false,
}: {
  size?: keyof typeof SIZES;
  onDark?: boolean;
}) {
  const s = SIZES[size];

  return (
    <span className={`flex min-w-0 items-center ${s.gap}`}>
      <LogoMark size={s.mark} onDark={onDark} />
      <span
        className={`truncate font-extrabold tracking-[-0.035em] ${s.text} ${
          onDark ? "text-white" : "text-ink"
        }`}
      >
        PT 매니저
      </span>
    </span>
  );
}
