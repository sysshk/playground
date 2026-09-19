/*
  회원 상세·내 기록 화면 — 식단 탭
  칼로리·영양정보 카드, 날짜별 식사 기록, 지난 7일 그래프, 영양 계산 결과

  @date : 2026-09-19
*/

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { EmptyState } from "@/components/custom/empty-state";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatDateShort, today, WEEKDAYS } from "@/lib/client";
import { holidayName } from "@/lib/holidays";
import { kstDay, shiftDay, shiftMonth } from "@/lib/kst";
import { ACTIVITY_HINT, GOAL_LABEL } from "@/lib/nutrition";
import { MEAL_DAYS, MEAL_SLOT_LABEL, MEAL_SLOTS, type Meal, type NutritionProfile } from "@/lib/types";
import { IconButton, Section, SectionAction } from "./tab-ui";

// ── 식단 ──────────────────────────────────

/** 섭취량 — kcal와 탄단지 g */
interface Intake {
  calories: number;
  carbs: number;
  fat: number;
  protein: number;
}

type Macro = "carbs" | "fat" | "protein";

const MACROS: { key: Macro; label: string; text: string; bg: string }[] = [
  { key: "carbs", label: "탄수화물", text: "text-carbs", bg: "bg-carbs" },
  { key: "fat", label: "지방", text: "text-fat", bg: "bg-fat" },
  { key: "protein", label: "단백질", text: "text-protein", bg: "bg-protein" },
];

/** 목표 칼로리 위아래로 권장하는 폭 */
const CALORIE_RANGE = 0.1;
/** 칼로리 막대·그래프의 끝 — 목표의 1.3배 */
const CALORIE_SCALE = 1.3;

const HATCH = {
  backgroundImage:
    "repeating-linear-gradient(135deg, currentColor 0 1.5px, transparent 1.5px 4px)",
};

/** 숫자가 붙은 끼니만 더함. 하나도 없으면 null */
function sumIntake(meals: Meal[]): Intake | null {
  const counted = meals.filter((meal) => meal.calories != null);
  if (counted.length === 0) return null;
  return counted.reduce<Intake>(
    (total, meal) => ({
      calories: total.calories + (meal.calories ?? 0),
      carbs: total.carbs + (meal.carbs ?? 0),
      fat: total.fat + (meal.fat ?? 0),
      protein: total.protein + (meal.protein ?? 0),
    }),
    { calories: 0, carbs: 0, fat: 0, protein: 0 },
  );
}

/** 탄단지 g → 칼로리 비율(%). 합이 100이 되도록 단백질에서 맞춤 */
function macroShare(grams: Record<Macro, number>): Record<Macro, number> | null {
  const carbs = grams.carbs * 4;
  const fat = grams.fat * 9;
  const total = carbs + fat + grams.protein * 4;
  if (total === 0) return null;
  const carbsShare = Math.round((carbs / total) * 100);
  const fatShare = Math.round((fat / total) * 100);
  return { carbs: carbsShare, fat: fatShare, protein: 100 - carbsShare - fatShare };
}

/** 먹은 kcal — 숫자가 붙은 끼니가 없으면 0 */
function kcalOf(intake: Intake | null) {
  return Math.round(intake?.calories ?? 0).toLocaleString();
}

/** YYYY-MM-DD의 요일 (0 = 일요일) */
function dayOfWeek(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** 일요일·공휴일 */
function isRedDay(day: string) {
  return dayOfWeek(day) === 0 || holidayName(day) !== null;
}

/**
 * 식단 탭 — 맨 위에서 고른 날의 섭취 칼로리·탄단지, 끼니 기록, 7일 그래프
 * 서버는 주소의 ?date=까지 MEAL_DAYS일치 식단을 줌. 그 밖의 날을 고르면 주소를 바꿔 다시 받음
 */
export function DietSection({
  memberId,
  meals,
  nutrition,
  role,
  initialDate,
}: {
  memberId: string;
  initialDate: string; // 주소의 ?date= — 서버가 이 날까지 식단을 줌
  meals: Meal[];
  nutrition: NutritionProfile | null;
  role: "member" | "trainer"; // 둘 다 적고 지움 — 회원은 /api/me, 트레이너는 /api/members/:id
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, startLoading] = useTransition();
  const now = today();
  const [date, setDate] = useState(initialDate);

  const byDate = useMemo(() => {
    const map = new Map<string, Meal[]>();
    for (const meal of meals) map.set(meal.date, [...(map.get(meal.date) ?? []), meal]);
    return map;
  }, [meals]);

  const loadedFrom = shiftDay(initialDate, -(MEAL_DAYS - 1));
  const dayMeals = byDate.get(date) ?? [];
  const intake = sumIntake(dayMeals);

  // 7일 그래프까지 받아 둔 범위 안이면 그대로, 벗어나면 그 날 기준으로 다시 받음
  const pick = (day: string) => {
    setDate(day);
    if (shiftDay(day, -6) < loadedFrom || day > initialDate) {
      startLoading(() => router.replace(`${pathname}?tab=diet&date=${day}`, { scroll: false }));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <DayNav date={date} now={now} byDate={byDate} onPick={pick} />
      <div
        className={`flex flex-col gap-3 transition-opacity ${loading ? "pointer-events-none opacity-50" : ""}`}
      >
        <CalorieCard
          title={date === now ? "오늘 먹은 칼로리" : `${formatDateShort(date)} 먹은 칼로리`}
          intake={intake}
          nutrition={nutrition}
        />
        <MacroCard intake={intake} nutrition={nutrition} />
        <MealLog key={date} memberId={memberId} date={date} meals={dayMeals} role={role} />
        <WeekChart date={date} byDate={byDate} target={nutrition?.targetCalories ?? null} />
      </div>
    </div>
  );
}

function DietCard({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 tablet:p-5">
      {title && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold tracking-[-0.02em]">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// ── 식단 · 칼로리 ──────────────────────────

function CalorieCard({
  title,
  intake,
  nutrition,
}: {
  title: string;
  intake: Intake | null;
  nutrition: NutritionProfile | null;
}) {
  const target = nutrition?.targetCalories ?? 0;

  return (
    <DietCard title={title}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <p className="flex items-baseline gap-1.5">
          <span className="text-4xl font-extrabold leading-none tracking-[-0.03em] tabular-nums">
            {kcalOf(intake)}
          </span>
          <span className="text-base font-semibold text-muted-foreground">kcal</span>
        </p>

        {nutrition && (
          <dl className="flex flex-col gap-1 text-xs tabular-nums">
            <div className="flex items-center gap-2">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <span className="grid size-5 place-items-center rounded-full bg-raised text-subtle">
                  <Icon name="target" size={12} />
                </span>
                목표
              </dt>
              <dd className="font-bold">{target.toLocaleString()} kcal</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-5 rounded-full border border-line text-subtle" style={HATCH} />
                권장 범위
              </dt>
              <dd className="font-bold">
                {Math.round(target * (1 - CALORIE_RANGE)).toLocaleString()} -{" "}
                {Math.round(target * (1 + CALORIE_RANGE)).toLocaleString()}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {nutrition ? (
        <CalorieBar eaten={intake?.calories ?? 0} target={target} />
      ) : (
        <p className="rounded-xl bg-raised px-4 py-3 text-xs text-muted-foreground">
          영양 계산을 하면 목표 칼로리가 보입니다.
        </p>
      )}
    </DietCard>
  );
}

/** 0 ~ 목표×1.3 막대 — 먹은 양, 권장 범위(빗금), 목표 표시 */
function CalorieBar({ eaten, target }: { eaten: number; target: number }) {
  const max = Math.round(target * CALORIE_SCALE);
  const pct = (kcal: number) => Math.min(kcal / max, 1) * 100;
  const low = pct(target * (1 - CALORIE_RANGE));
  const high = pct(target * (1 + CALORIE_RANGE));
  const over = eaten > target * (1 + CALORIE_RANGE);

  return (
    <div className="flex flex-col gap-1.5 pt-3">
      <div className="relative h-2.5 rounded-full bg-raised">
        {/* 먹은 양 */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${over ? "bg-goal" : "bg-primary"}`}
          style={{ width: `${pct(eaten)}%` }}
        />
        {/* 권장 범위 */}
        <div
          className="absolute inset-y-0 text-subtle/60"
          style={{ ...HATCH, left: `${low}%`, width: `${high - low}%` }}
        />
        {/* 목표 */}
        <span
          className="absolute top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-subtle"
          style={{ left: `${pct(target)}%` }}
        >
          <Icon name="target" size={14} />
        </span>
      </div>
      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>0</span>
        <span>{max.toLocaleString()}</span>
      </div>
    </div>
  );
}

// ── 식단 · 영양정보 ─────────────────────────

/**
 * 탄단지 막대 하나 — 조각 너비는 칼로리 비율, 조각 안에 먹은 g과 %
 * ▼ 선은 권장 비율의 경계, 아래 줄은 영양소 이름과 목표 g
 */
function MacroCard({
  intake,
  nutrition,
}: {
  intake: Intake | null;
  nutrition: NutritionProfile | null;
}) {
  const current = intake ? macroShare(intake) : null;
  const recommended = nutrition ? macroShare(nutrition) : null;

  return (
    <DietCard
      title="영양정보"
      action={
        recommended && (
          <p className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
            ▼ 권장 비율
            {MACROS.map((macro, i) => (
              <span key={macro.key} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true">·</span>}
                <span className={`font-bold ${macro.text}`}>{recommended[macro.key]}%</span>
              </span>
            ))}
          </p>
        )
      }
    >
      <div className="relative pt-3.5 pb-1">
        <div className="flex h-10 gap-0.5">
          {intake && current ? (
            MACROS.map((macro) => (
              <div
                key={macro.key}
                className={`flex flex-col items-center justify-center overflow-hidden leading-tight text-white first:rounded-l-lg last:rounded-r-lg dark:text-black/80 ${macro.bg}`}
                style={{ width: `${current[macro.key]}%` }}
              >
                {current[macro.key] >= 12 && (
                  <>
                    <span className="text-sm font-extrabold tabular-nums">
                      {Math.round(intake[macro.key])}g
                    </span>
                    <span className="text-2xs font-bold tabular-nums opacity-80">
                      {current[macro.key]}%
                    </span>
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="grid w-full place-items-center rounded-lg bg-raised text-xs text-muted-foreground">
              먹은 기록이 없습니다
            </p>
          )}
        </div>

        {/* 권장 경계 */}
        {recommended &&
          [recommended.carbs, recommended.carbs + recommended.fat].map((at) => (
            <span
              key={at}
              aria-hidden="true"
              className="absolute top-0 bottom-0 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${at}%` }}
            >
              <span className="text-[10px] leading-none text-ink">▼</span>
              <span className="w-0.5 flex-1 bg-ink outline-1 outline-surface" />
            </span>
          ))}
      </div>

      {/* 영양소 · 목표 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {nutrition && <span className="text-muted-foreground">목표</span>}
        {MACROS.map((macro) => (
          <span key={macro.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${macro.bg}`} />
            <span className="font-semibold">{macro.label}</span>
            {nutrition && (
              <span className="tabular-nums text-muted-foreground">{nutrition[macro.key]}g</span>
            )}
          </span>
        ))}
      </div>
    </DietCard>
  );
}

// ── 영양 ──────────────────────────────────

/** 계산 결과를 읽는 자리. 계산 자체는 /members/:id/nutrition 화면에서 함 */
export function NutritionPanel({
  memberId,
  nutrition,
  readOnly = false,
}: {
  memberId: string;
  nutrition: NutritionProfile | null;
  /** 회원 본인 화면 — 다시 계산 버튼을 숨김 */
  readOnly?: boolean;
}) {
  const href = `/members/${memberId}/nutrition`;

  return (
    <Section
      title="칼로리 및 영양 계산"
      subtitle={
        nutrition
          ? `${GOAL_LABEL[nutrition.goal]} 목표 · ${formatDate(kstDay(nutrition.updatedAt))} 계산`
          : "회원의 신체 정보와 목표에 맞춘 일일 섭취 기준입니다."
      }
      action={
        nutrition && !readOnly ? (
          <SectionAction icon="flame" label="다시 계산" href={href} />
        ) : null
      }
    >
      {!nutrition ? (
        <EmptyState
          icon="flame"
          title="영양 계산 시작"
          description="성별, 나이, 키, 체중과 활동량을 입력해 섭취 기준을 계산하세요."
          action={
            <Button asChild>
              <Link href={href}>영양 계산하기</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-primary-light px-4 py-3">
            <p className="text-xs font-bold text-primary-dark dark:text-primary-bright">
              목표 섭취 칼로리
            </p>
            <p className="text-xl font-extrabold leading-none tracking-tight">
              {nutrition.targetCalories}
              <span className="ml-0.5 text-2xs font-bold text-muted-foreground">
                kcal
              </span>
            </p>
          </div>

          <dl className="rounded-xl bg-surface px-4 divide-y divide-line">
            <Row label="기초대사량" value={nutrition.bmr} unit="kcal" />
            <Row
              label="유지칼로리"
              value={nutrition.maintenanceCalories}
              unit="kcal"
            />
            <Row
              label="단백질"
              value={nutrition.protein}
              unit="g"
              hint={`${nutrition.proteinMin}~${nutrition.proteinMax}g`}
            />
            <Row label="탄수화물" value={nutrition.carbs} unit="g" />
            <Row label="지방" value={nutrition.fat} unit="g" />
          </dl>

          <div className="flex flex-wrap gap-1.5 text-xs">
            <Chip>
              {nutrition.gender === "male" ? "남성" : "여성"} · {nutrition.age}
              세
            </Chip>
            <Chip>
              {nutrition.height}cm · {nutrition.weight}kg
            </Chip>
            <Chip>{ACTIVITY_HINT[nutrition.activityLevel]}</Chip>
            <Chip>
              {nutrition.bodyFatPercentage
                ? `체지방률 ${nutrition.bodyFatPercentage}%`
                : "체지방률 미입력"}
            </Chip>
            {nutrition.skeletalMuscleMass && (
              <Chip>골격근량 {nutrition.skeletalMuscleMass}kg</Chip>
            )}
            {nutrition.calculatedLeanBodyMass && (
              <Chip>제지방량 {nutrition.calculatedLeanBodyMass}kg</Chip>
            )}
          </div>

          <CalculationBasis lines={nutrition.calculationBasis} />

          <p className="text-xs leading-relaxed text-muted-foreground">
            제지방량이 있으면 체성분 기반 기초대사량을 사용합니다. 결과는 코칭
            참고용 추정치이며 의료 또는 영양 처방을 대신하지 않습니다.
          </p>
        </div>
      )}
    </Section>
  );
}

/** 계산 기준 (접었다 펴기) */
function CalculationBasis({ lines }: { lines: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl bg-surface px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-sm font-semibold"
      >
        <Icon
          name="chevronRight"
          size={16}
          className={`shrink-0 text-subtle transition-transform duration-300 ${
            open ? "rotate-90" : ""
          }`}
        />
        계산 기준
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {lines.map((line, i) => (
              <li
                key={i}
                className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
              >
                <span aria-hidden="true">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: number;
  unit: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-xs font-semibold text-muted-foreground">
        {label}
        {hint && <span className="ml-1.5 text-2xs text-subtle">{hint}</span>}
      </dt>
      <dd className="text-base font-extrabold tracking-tight">
        {value}
        <span className="ml-0.5 text-2xs font-bold text-muted-foreground">
          {unit}
        </span>
      </dd>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-line px-2.5 py-1 font-semibold text-muted-foreground">
      {children}
    </span>
  );
}

// ── 식단 · 식사 기록 ─────────────────────────

/** 맨 위 날짜 — ‹ ›로 하루씩, 가운데를 누르면 달력 */
function DayNav({
  date,
  now,
  byDate,
  onPick,
}: {
  date: string;
  now: string;
  byDate: Map<string, Meal[]>;
  onPick: (day: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-center gap-3">
      <IconButton icon="chevronLeft" label="전날" onClick={() => onPick(shiftDay(date, -1))} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="날짜 고르기"
        className="flex h-10 min-w-44 items-center justify-center gap-1.5 rounded-full bg-raised px-5 text-base font-extrabold transition-colors hover:bg-line"
      >
        {date === now ? "오늘" : formatDateShort(date)}
        <Icon name="calendar" size={15} className="text-subtle" />
      </button>
      <IconButton
        icon="chevronRight"
        label="다음 날"
        disabled={date >= now}
        onClick={() => onPick(shiftDay(date, 1))}
      />

      {open && (
        <CalendarSheet
          date={date}
          now={now}
          byDate={byDate}
          onPick={(day) => {
            setOpen(false);
            onPick(day);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

/** 폰에서는 아래에서 올라오는 시트, 넓은 화면에서는 가운데 창 */
const SHEET =
  "max-tablet:top-auto max-tablet:bottom-0 max-tablet:left-0 max-tablet:max-h-[88dvh] max-tablet:w-full max-tablet:max-w-none max-tablet:translate-x-0 max-tablet:translate-y-0 max-tablet:rounded-b-none max-tablet:pb-[max(1.5rem,env(safe-area-inset-bottom))] max-tablet:data-open:slide-in-from-bottom max-tablet:data-open:zoom-in-100";

/**
 * 달력 시트 — 날짜판(6주 고정)과 월 선택판. 제목을 누르면 월 선택판, ‹ ›는 한 해씩
 * 오늘은 테두리, 고른 날은 채운 원, 미래는 막음. 기록 있는 날은 점 (받아 둔 범위 안만)
 */
function CalendarSheet({
  date,
  now,
  byDate,
  onPick,
  onClose,
}: {
  date: string;
  now: string;
  byDate: Map<string, Meal[]>;
  onPick: (day: string) => void;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(date.slice(0, 7));
  const [picking, setPicking] = useState(false); // 월 선택판
  const [year, monthNo] = month.split("-").map(Number);
  const nowMonth = now.slice(0, 7);
  const first = `${month}-01`;
  const start = shiftDay(first, -dayOfWeek(first));
  const cells = Array.from({ length: 42 }, (_, i) => shiftDay(start, i));

  const move = (delta: number) => {
    const next = shiftMonth(month, picking ? delta * 12 : delta);
    setMonth(next > nowMonth ? nowMonth : next);
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent dismissOnOutsideClick className={`gap-4 ${SHEET}`}>
        <DialogTitle className="sr-only">날짜 고르기</DialogTitle>

        {/* 달·해 넘기기 */}
        <div className="flex items-center justify-center gap-3">
          <IconButton
            icon="chevronLeft"
            label={picking ? "이전 해" : "이전 달"}
            onClick={() => move(-1)}
          />
          <button
            type="button"
            onClick={() => setPicking(!picking)}
            aria-expanded={picking}
            className="flex min-w-32 items-center justify-center gap-1 rounded-lg px-2 py-1 text-lg font-bold tabular-nums transition-colors hover:bg-raised"
          >
            {picking ? `${year}년` : `${year}년 ${monthNo}월`}
            <Icon
              name="chevronRight"
              size={16}
              className={`text-subtle transition-transform ${picking ? "-rotate-90" : "rotate-90"}`}
            />
          </button>
          <IconButton
            icon="chevronRight"
            label={picking ? "다음 해" : "다음 달"}
            disabled={picking ? year >= Number(now.slice(0, 4)) : month >= nowMonth}
            onClick={() => move(1)}
          />
        </div>

        <div className="h-[21.5rem]">
          {picking ? (
            // 월 선택판
            <div className="grid h-full grid-cols-3 grid-rows-4 gap-2">
              {Array.from({ length: 12 }, (_, i) => {
                const key = `${year}-${String(i + 1).padStart(2, "0")}`;
                const current = key === month;

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={key > nowMonth}
                    onClick={() => {
                      setMonth(key);
                      setPicking(false);
                    }}
                    className={`rounded-xl text-base font-semibold transition-colors disabled:opacity-35 ${
                      current
                        ? "bg-ink text-canvas"
                        : `hover:bg-raised ${key === nowMonth ? "ring-[1.5px] ring-ink/70" : ""}`
                    }`}
                  >
                    {i + 1}월
                  </button>
                );
              })}
            </div>
          ) : (
            // 날짜판
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-7 text-center text-xs font-semibold">
                {WEEKDAYS.map((label, i) => (
                  <span
                    key={label}
                    className={
                      i === 0 ? "text-danger" : i === 6 ? "text-primary" : "text-muted-foreground"
                    }
                  >
                    {label}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-1">
                {cells.map((day) => {
                  const selected = day === date;
                  const future = day > now;
                  const faded = future || day.slice(0, 7) !== month;
                  const dow = dayOfWeek(day);
                  const tone = isRedDay(day) ? "text-danger" : dow === 6 ? "text-primary" : "";

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={future}
                      onClick={() => onPick(day)}
                      aria-pressed={selected}
                      aria-label={formatDateShort(day)}
                      className="flex h-12 flex-col items-center justify-center gap-0.5 disabled:cursor-default"
                    >
                      <span
                        className={`grid size-9 place-items-center rounded-full text-base tabular-nums transition-colors ${
                          selected
                            ? "bg-ink font-bold text-canvas"
                            : `${tone} ${day === now ? "ring-[1.5px] ring-ink/70" : ""} ${future ? "" : "hover:bg-raised"}`
                        } ${faded && !selected ? "opacity-35" : ""}`}
                      >
                        {Number(day.slice(8))}
                      </span>
                      <span
                        className={`size-1 rounded-full ${byDate.has(day) && !selected ? "bg-primary" : "bg-transparent"}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 고른 날의 끼니별 줄. 먹은 것은 끼니 이름 아래에 다 보여 줌
 * +는 그 날짜·끼니의 식단 작성 화면으로 넘어감 (회원·트레이너 둘 다)
 */
function MealLog({
  memberId,
  date,
  meals,
  role,
}: {
  memberId: string;
  date: string;
  meals: Meal[];
  role: "member" | "trainer";
}) {
  const editor = role === "member" ? "/me/new-meal" : `/members/${memberId}/new-meal`;

  return (
    <DietCard title="식사 기록">
      <ul className="flex flex-col">
        {MEAL_SLOTS.map((slot) => {
          const list = meals.filter((meal) => meal.slot === slot);
          const label = MEAL_SLOT_LABEL[slot];

          return (
            <li key={slot} className="group flex items-start gap-4">
              {/* 끼니 kcal */}
              <div className="mt-2 grid size-11 shrink-0 place-content-center rounded-full bg-raised text-center text-xs leading-tight">
                <span className="tabular-nums">{kcalOf(sumIntake(list))}</span>
                <span>kcal</span>
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-3 border-b border-line py-2 group-last:border-0">
                <div className="flex min-h-11 min-w-0 flex-1 flex-col justify-center">
                  <span className="text-base font-medium">{label}</span>
                  {list.length > 0 && (
                    <span className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                      {list.map((meal) => meal.content).join(", ")}
                    </span>
                  )}
                </div>
                <Link
                  href={`${editor}?date=${date}&slot=${slot}`}
                  title={`${label} 기록`}
                  aria-label={`${label} 기록`}
                  className="grid size-9 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-raised"
                >
                  <Icon name="plus" size={22} strokeWidth={1.75} />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </DietCard>
  );
}

// ── 식단 · 지난 7일 ─────────────────────────

/** 고른 날까지 7일 막대 그래프. 고른 날 막대를 진하게 */
function WeekChart({
  date,
  byDate,
  target,
}: {
  date: string;
  byDate: Map<string, Meal[]>;
  target: number | null;
}) {
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(date, i - 6));
  const totals = days.map((day) => sumIntake(byDate.get(day) ?? [])?.calories ?? null);
  const counted = totals.filter((total): total is number => total !== null);
  const average = counted.length
    ? Math.round(counted.reduce((sum, total) => sum + total, 0) / counted.length)
    : null;
  const top = Math.max((target ?? 0) * CALORIE_SCALE, ...counted, 1);
  const y = (kcal: number) => `${(kcal / top) * 100}%`;

  return (
    <DietCard
      title="7일간 칼로리 섭취량"
      action={
        average !== null && (
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            평균 {average.toLocaleString()} kcal
          </span>
        )
      }
    >
      <div className="flex flex-col gap-2">
        <div className="relative h-28 pr-16">
          {/* 막대 */}
          <div className="flex h-full">
            {days.map((day, i) => (
              <div key={day} className="flex flex-1 items-end justify-center">
                {totals[i] !== null && (
                  <span
                    className={`w-3 rounded-t-full ${day === date ? "bg-primary" : "bg-primary/40"}`}
                    style={{ height: y(totals[i]) }}
                  />
                )}
              </div>
            ))}
          </div>
          {/* 목표선 */}
          {target !== null && (
            <>
              <div
                className="absolute left-0 right-16 border-t-2 border-dotted border-line-strong"
                style={{ bottom: y(target) }}
              />
              <span
                className="absolute right-0 translate-y-1/2 rounded-lg border border-line-strong bg-surface px-1.5 py-0.5 text-center text-2xs font-semibold leading-tight tabular-nums"
                style={{ bottom: y(target) }}
              >
                목표
                <br />
                {target.toLocaleString()}
              </span>
            </>
          )}
        </div>

        {/* 날짜 */}
        <div className="flex pr-16">
          {days.map((day) => (
            <span
              key={day}
              className={`flex-1 text-center text-sm tabular-nums ${
                isRedDay(day)
                  ? "text-danger"
                  : day === date
                    ? "text-ink"
                    : "text-muted-foreground"
              } ${day === date ? "font-extrabold" : "font-medium"}`}
            >
              {Number(day.slice(8))}
            </span>
          ))}
        </div>
      </div>
    </DietCard>
  );
}
