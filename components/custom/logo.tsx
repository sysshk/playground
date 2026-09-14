/*
  공통 — PT 매니저 로고
  app/favicon.ico, public/icons/*.png도 같은 도형이다. 여기를 바꾸면 함께 바꾼다.

  @date : 2026-09-12
*/

/** 32×32 좌표계. 끝의 V6V26은 기둥을 되짚어 올라갔다 내려오는 것이라 한 획으로 그려진다. */
export const LOGO_PATH = "M5.25 6H20.25A6.5 6.5 0 0 1 20.25 19H16.25V6V26";

export function LogoMark({
  size = 32,
  onDark = false,
  className = "",
  gradientId,
}: {
  size?: number;
  /** 어두운 배경 위에 놓일 때 */
  onDark?: boolean;
  className?: string;
  /**
   * 그라데이션 id. 기본값은 변형별 고정값이라 한 화면에 마크가 여러 개
   * 나와도 보통은 문제가 없다 — 내용이 같으니 어느 것을 참조해도 같다.
   */
  gradientId?: string;
}) {
  // useId()를 쓰면 서버와 클라이언트가 다른 값을 내 hydration이 깨진다.
  const id = gradientId ?? (onDark ? "pt-logo-gradient-dark" : "pt-logo-gradient");

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
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop
            offset="0"
            {...(onDark ? { stopColor: "#5b9bff" } : { className: "pt-logo-from" })}
          />
          <stop
            offset="1"
            {...(onDark ? { stopColor: "#ffffff" } : { className: "pt-logo-to" })}
          />
        </linearGradient>
      </defs>
      <path
        d={LOGO_PATH}
        stroke={`url(#${id})`}
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
