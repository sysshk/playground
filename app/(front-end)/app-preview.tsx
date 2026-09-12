// 히어로에 들어가는 제품 미리보기
//
// 기능을 글로 설명하는 대신 실제 화면을 보여준다.
// 실제 회원 상세 화면과 같은 구성(수업 차감 · 운동 기록)을 축소해 담았다.

import { Icon } from "@/components/custom/icons";
import Logo from "@/components/custom/logo";

const STATS = [
  { label: "남은 수업", value: "8", unit: "회", highlight: true },
  { label: "최신 체중", value: "78.4", unit: "kg", highlight: false },
  { label: "운동 기록", value: "12", unit: "건", highlight: false },
];

const EXERCISES = [
  { name: "벤치프레스", sets: "4세트 × 10회", weight: "60kg" },
  { name: "바벨 스쿼트", sets: "5세트 × 8회", weight: "80kg" },
  { name: "랫 풀다운", sets: "3세트 × 12회", weight: "45kg" },
  { name: "풀업", sets: "3세트 × 8회", weight: "바디웨이트" },
];

export default function AppPreview() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-line bg-canvas shadow-[0_24px_60px_-18px_rgba(15,23,42,0.22)]">
      {/* 앱 바 */}
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <Logo size="sm" />
        <span className="text-2xs font-semibold text-muted-foreground">김트레이너</span>
      </div>

      <div className="flex flex-col gap-3.5 p-4">
        {/* 회원 */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xl font-extrabold tracking-tight">김지훈</p>
            <p className="mt-0.5 truncate text-2xs text-muted-foreground">
              010-2847-1120 · 체중 감량
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary-light px-2.5 py-1 text-2xs font-bold text-primary-dark dark:text-primary-bright">
            남은 수업 8회
          </span>
        </div>

        {/* 지표 */}
        <div className="grid grid-cols-3 gap-2">
          {STATS.map((s) => (
            <div
              key={s.label}
              className={`rounded-xl border px-2.5 py-2.5 ${
                s.highlight
                  ? "border-primary bg-primary-light"
                  : "border-line bg-surface"
              }`}
            >
              <p
                className={`text-2xs font-semibold ${
                  s.highlight ? "text-primary-dark" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </p>
              <p className="mt-1 text-xl font-extrabold leading-none tracking-tight">
                {s.value}
                <span className="ml-0.5 text-2xs font-bold text-muted-foreground">
                  {s.unit}
                </span>
              </p>
            </div>
          ))}
        </div>

        {/* 운동 기록 */}
        <div className="rounded-xl border border-line bg-surface p-3.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold">
              <Icon name="dumbbell" size={14} className="text-primary-dark" />
              오늘 운동 기록
            </span>
            <span className="text-2xs font-semibold text-muted-foreground">9월 12일</span>
          </div>

          <ul className="mt-2.5 flex flex-col gap-2">
            {EXERCISES.map((e) => (
              <li key={e.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {e.name}
                </span>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-2xs text-muted-foreground">{e.sets}</span>
                  <span className="text-2xs font-bold">{e.weight}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 수업 완료 */}
        <div className="flex items-center justify-center gap-1.5 rounded-xl bg-primary-dark py-3 text-xs font-bold text-white">
          <Icon name="check" size={14} />
          운동 기록 저장 · 수업 1회 차감
        </div>
      </div>
    </div>
  );
}
