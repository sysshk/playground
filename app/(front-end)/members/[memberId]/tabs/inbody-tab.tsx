/*
  회원 상세·내 기록 화면 — InBody 탭
  체중·인바디 기록 입력, 체중·골격근량·체지방량 그래프, 최근 인바디 결과지(막대·내장지방)

  @date : 2026-09-19
*/

"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { DatePicker, HourPicker } from "@/components/custom/date-picker";
import { EmptyState } from "@/components/custom/empty-state";
import { Icon } from "@/components/custom/icons";
import { useTheme } from "@/components/custom/theme";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDateShort, formatHourLabel, today } from "@/lib/client";
import { kstHour } from "@/lib/kst";
import { type Gender } from "@/lib/nutrition";
import { BALANCE_LABEL, isInbody, type Balance, type WeightRecord } from "@/lib/types";
import { isValidWeight, WEIGHT_RANGE_MESSAGE } from "@/lib/weight";
import { inbodyStandard, SCALE, scalePosition, type InbodyScale } from "@/lib/inbody";
import { IconButton, Memo, Section, SectionAction, round1, signed } from "./tab-ui";

// ── 체중·인바디 ────────────────────────────

/**
 * 체중·인바디 — 체중만 잰 날도, 인바디를 잰 날도 같은 기록 한 건
 * 위에서부터 체성분 변화 표 → 체중 그래프 → 최근 인바디 결과. 맨 위 기록이 회원 요약의 최신 체중이 됨
 */
export function WeightSection({
  weights,
  targetWeight,
  defaults,
  readOnly = false,
  formOpen = false,
  busy = false,
  serverError = null,
  onToggle,
  onSubmit,
  onSaveGoal,
  onCancel,
  onDelete,
}: {
  weights: WeightRecord[];
  targetWeight: number | null;
  /** 성별·나이·키 처음 값 — 지난 인바디가 없을 때 영양 정보에서 가져옴 */
  defaults?: { gender: Gender | null; age: number | null; height: number | null };
  /** 회원 본인 화면 — 기록·삭제·목표 수정을 숨김. 이때 아래 핸들러는 넘기지 않음 */
  readOnly?: boolean;
  formOpen?: boolean;
  busy?: boolean;
  serverError?: string | null;
  onToggle?: () => void;
  onSubmit?: (payload: InbodyPayload) => void;
  onSaveGoal?: (targetWeight: number | null) => void;
  onCancel?: () => void;
  onDelete?: (record: WeightRecord) => void;
}) {
  // 체중만 잰 날도 같은 표에 두고 "체중만"으로 표시. 결과지 모양은 인바디 기록만
  const inbody = weights.filter(isInbody);
  const last = inbody[0];

  return (
    <>
      <Section
        title="체중 변화"
        subtitle={
          weights.length > 0
            ? undefined
            : "체중만 적어도 되고, 인바디를 쟀으면 결과지 숫자를 같이 적어 두세요."
        }
        action={readOnly ? undefined : <SectionAction icon="plus" label="기록 추가" onClick={onToggle} />}
      >
        {/* 입력 창 — 체중만 필수, 나머지 인바디 칸은 선택 */}
        {!readOnly && onSubmit && onCancel && (
          <Dialog
            open={formOpen}
            onOpenChange={(next) => {
              if (!next) onCancel();
            }}
          >
            <DialogContent dismissOnOutsideClick className="max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>체중·인바디 기록</DialogTitle>
              </DialogHeader>
              <InbodyForm
                initial={{
                  gender: last?.gender ?? defaults?.gender ?? null,
                  age: last?.age ?? defaults?.age ?? null,
                  height: last?.height ?? defaults?.height ?? null,
                }}
                busy={busy}
                serverError={serverError}
                onSubmit={onSubmit}
              />
            </DialogContent>
          </Dialog>
        )}

        {weights.length === 0 ? (
          <EmptyState
            icon="trend"
            title="체중·인바디 기록이 없습니다"
            description={
              readOnly
                ? "트레이너가 체중이나 인바디를 기록하면 여기에 보입니다."
                : "첫 기록을 남기고 변화를 확인해 보세요."
            }
          />
        ) : (
          <>
            {/* 그래프 — 현재 체중·목표·변화 */}
            <WeightChartCard
              weights={weights}
              targetWeight={targetWeight}
              busy={busy}
              onSaveGoal={readOnly ? undefined : onSaveGoal}
              onDelete={readOnly ? undefined : onDelete}
            />
          </>
        )}
      </Section>

      {/* 최근 인바디 결과 */}
      {last && (
        <Section title="InBody" subtitle={`${formatDateShort(last.date)} 측정`}>
          <InbodyResultCard
            latest={last}
            previous={inbody[1]}
            readOnly={readOnly}
            onDelete={() => onDelete?.(last)}
          />
        </Section>
      )}
    </>
  );
}

// ── 인바디 ─────────────────────────────────

/** 인바디 저장 값. 체중 기록과 같은 API로 보냄 */
export interface InbodyPayload {
  date: string;
  weight: number;
  memo: string | null;
  measuredHour: number;
  gender: Gender | null;
  age: number | null;
  height: number | null;
  skeletalMuscle: number | null;
  bodyFatMass: number | null;
  bodyFatPercent: number | null;
  waistHipRatio: number | null;
  visceralFatLevel: number | null;
  visceralFatArea: number | null;
  balanceUpper: Balance | null;
  balanceLower: Balance | null;
  balanceUpperLower: Balance | null;
  leanRightArm: number | null;
  leanRightArmPct: number | null;
  leanLeftArm: number | null;
  leanLeftArmPct: number | null;
  leanTrunk: number | null;
  leanTrunkPct: number | null;
  leanRightLeg: number | null;
  leanRightLegPct: number | null;
  leanLeftLeg: number | null;
  leanLeftLegPct: number | null;
}

/** 인바디 숫자 칸 — [저장 키, 이름, 단위, 예시] */
const INBODY_FIELDS = [
  ["weight", "체중", "kg", "72.5"],
  ["skeletalMuscle", "골격근량", "kg", "31.2"],
  ["bodyFatMass", "체지방량", "kg", "15.8"],
  ["bodyFatPercent", "체지방률", "%", "21.8"],
  ["waistHipRatio", "복부지방률", "", "0.85"],
  ["visceralFatArea", "내장지방 면적", "cm²", "177.5"],
] as const;

type InbodyNumberKey = (typeof INBODY_FIELDS)[number][0];

const BALANCE_PARTS = [
  ["balanceUpper", "상체"],
  ["balanceLower", "하체"],
  ["balanceUpperLower", "상하체"],
] as const;

/** 신체균형 부위 — [kg 칸, % 칸, 이름] */
const LEAN_SEGMENTS = [
  ["leanRightArm", "leanRightArmPct", "오른팔"],
  ["leanLeftArm", "leanLeftArmPct", "왼팔"],
  ["leanTrunk", "leanTrunkPct", "몸통"],
  ["leanRightLeg", "leanRightLegPct", "오른다리"],
  ["leanLeftLeg", "leanLeftLegPct", "왼다리"],
] as const;

type LeanKey =
  (typeof LEAN_SEGMENTS)[number][0] | (typeof LEAN_SEGMENTS)[number][1];

/** 인바디 측정 기록. 체중 기록 중 인바디 칸이 찬 것만 보여 줌 */
function InbodyForm({
  initial,
  busy,
  serverError,
  onSubmit,
}: {
  initial: { gender: Gender | null; age: number | null; height: number | null };
  busy: boolean;
  serverError: string | null;
  onSubmit: (payload: InbodyPayload) => void;
}) {
  const [date, setDate] = useState(today);
  const [hour, setHour] = useState(() => kstHour(new Date()));
  const [gender, setGender] = useState<Gender | null>(initial.gender);
  const [age, setAge] = useState(
    initial.age === null ? "" : String(initial.age),
  );
  const [height, setHeight] = useState(
    initial.height === null ? "" : String(initial.height),
  );
  const [values, setValues] = useState<Record<InbodyNumberKey, string>>({
    weight: "",
    skeletalMuscle: "",
    bodyFatMass: "",
    bodyFatPercent: "",
    waistHipRatio: "",
    visceralFatArea: "",
  });
  const [lean, setLean] = useState<Record<LeanKey, string>>(
    () =>
      Object.fromEntries(
        LEAN_SEGMENTS.flatMap(([kg, pct]) => [
          [kg, ""],
          [pct, ""],
        ]),
      ) as Record<LeanKey, string>,
  );
  const [balance, setBalance] = useState<
    Record<(typeof BALANCE_PARTS)[number][0], Balance | null>
  >({
    balanceUpper: null,
    balanceLower: null,
    balanceUpperLower: null,
  });
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const num = (value: string) => (value.trim() === "" ? null : Number(value));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const weight = Number(values.weight);
    if (values.weight.trim() === "" || !isValidWeight(weight)) {
      setError(`체중: ${WEIGHT_RANGE_MESSAGE}`);
      return;
    }
    const numbers = [
      age,
      height,
      ...Object.values(values),
      ...Object.values(lean),
    ];
    if (numbers.some((v) => v.trim() !== "" && !Number.isFinite(Number(v)))) {
      setError("숫자 칸에는 숫자만 입력해 주세요.");
      return;
    }

    onSubmit({
      date,
      weight,
      memo: memo.trim() || null,
      measuredHour: hour,
      gender,
      age: num(age),
      height: num(height),
      skeletalMuscle: num(values.skeletalMuscle),
      bodyFatMass: num(values.bodyFatMass),
      bodyFatPercent: num(values.bodyFatPercent),
      waistHipRatio: num(values.waistHipRatio),
      visceralFatLevel: null,
      visceralFatArea: num(values.visceralFatArea),
      ...balance,
      ...(Object.fromEntries(
        Object.entries(lean).map(([key, v]) => [key, num(v)]),
      ) as Record<LeanKey, number | null>),
    });
  };

  const field =
    "h-10 w-full min-w-0 rounded-lg border border-line bg-field px-3 text-right text-md font-bold tabular-nums outline-none placeholder:font-medium placeholder:text-line-strong focus:border-primary";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* 측정일시 */}
      <div className="flex flex-wrap items-center gap-2">
        <DatePicker
          value={date}
          onChange={setDate}
          max={today()}
          ariaLabel="측정 날짜"
        />
        <HourPicker value={hour} onChange={setHour} ariaLabel="측정 시각" />
      </div>

      {/* 성별·나이·키 */}
      <div className="grid grid-cols-[auto_1fr_1fr] items-end gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-2xs font-bold text-subtle">성별</span>
          <div className="flex h-10 gap-0.5 rounded-lg bg-canvas p-0.5">
            {(["male", "female"] as Gender[]).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={gender === value}
                onClick={() => setGender(gender === value ? null : value)}
                className={`rounded-md px-3 text-sm font-bold transition-colors ${
                  gender === value
                    ? "bg-primary-light text-primary-dark dark:text-primary-bright"
                    : "text-muted-foreground hover:text-ink"
                }`}
              >
                {value === "male" ? "남" : "여"}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-2xs font-bold text-subtle">나이 (세)</span>
          <input
            className={field}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            inputMode="numeric"
            placeholder="35"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-2xs font-bold text-subtle">키 (cm)</span>
          <input
            className={field}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            inputMode="decimal"
            placeholder="175"
          />
        </label>
      </div>

      {/* 수치 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {INBODY_FIELDS.map(([key, label, unit, example]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-2xs font-bold text-subtle">
              {label}
              {unit && ` (${unit})`}
              {key === "weight" && <span className="text-danger"> *</span>}
            </span>
            <input
              className={field}
              value={values[key]}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, [key]: e.target.value }));
                setError(null);
              }}
              inputMode="decimal"
              placeholder={example}
            />
          </label>
        ))}
      </div>

      {/* 부위별 근육 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-2xs font-bold text-subtle">
          신체균형 — 부위별 근육 (kg · 표준 대비 %)
        </span>
        {LEAN_SEGMENTS.map(([kg, pct, label]) => (
          <div
            key={kg}
            className="grid grid-cols-[4rem_1fr_1fr] items-center gap-2"
          >
            <span className="text-sm font-bold text-muted-foreground">
              {label}
            </span>
            {([kg, pct] as const).map((key) => (
              <label key={key} className="relative">
                <input
                  className={`${field} pr-8`}
                  value={lean[key]}
                  onChange={(e) =>
                    setLean((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  inputMode="decimal"
                  placeholder={key === kg ? "3.55" : "97.5"}
                  aria-label={`${label} ${key === kg ? "근육량 kg" : "표준 대비 %"}`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  {key === kg ? "kg" : "%"}
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>

      {/* 신체균형 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-2xs font-bold text-subtle">신체균형</span>
        {BALANCE_PARTS.map(([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-sm font-bold text-muted-foreground">
              {label}
            </span>
            <div
              role="radiogroup"
              aria-label={`${label} 균형`}
              className="flex gap-0.5 rounded-lg bg-canvas p-0.5"
            >
              {(Object.keys(BALANCE_LABEL) as Balance[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={balance[key] === value}
                  onClick={() =>
                    setBalance((prev) => ({
                      ...prev,
                      [key]: prev[key] === value ? null : value,
                    }))
                  }
                  className={`h-7 rounded-md px-2.5 text-xs font-bold transition-colors ${
                    balance[key] === value
                      ? "bg-primary-light text-primary-dark dark:text-primary-bright"
                      : "text-muted-foreground hover:text-ink"
                  }`}
                >
                  {BALANCE_LABEL[value]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Input
        className="bg-surface py-2"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="메모 — 공복 측정, 운동 후 측정 등"
        aria-label="메모"
      />

      {(error || serverError) && (
        <p className="text-sm text-danger">{error ?? serverError}</p>
      )}

      <Button type="submit" loading={busy}>
        기록하기
      </Button>
    </form>
  );
}

/** 막대 줄의 칸 — 이름, 막대, 값, 표준 범위(폰에서는 숨김) */
const INBODY_ROW =
  "grid grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] items-end gap-2 sm:grid-cols-[5rem_minmax(0,1fr)_4.5rem_6.5rem] sm:gap-3";

/**
 * 막대 묶음의 머리 — 표준이하·표준·표준이상
 * 결과지 눈금은 모든 항목에서 표준이 눈금 3~5번째라 한 줄로 세 막대를 맞춤
 */
function InbodyBarHeader({
  title,
  rangeLabel = "표준 범위",
  unit,
}: {
  title: string;
  rangeLabel?: string;
  /** 눈금 단위 — 체중·골격근·체지방·신체균형은 표준 대비 % */
  unit?: string;
}) {
  const zones = [
    ["표준이하", "0%", "20%"],
    ["표준", "20%", "20%"],
    ["표준이상", "40%", "60%"],
  ] as const;
  const heading = (
    <span className="flex flex-col text-xs font-extrabold">
      {title}
      {unit && <span className="text-[10px] font-bold text-subtle">단위 {unit}</span>}
    </span>
  );
  const zoneRow = (
    <span className="relative h-5">
      {zones.map(([label, left, width]) => (
        <span
          key={label}
          className={`absolute inset-y-0 grid place-items-center border-x border-canvas text-2xs font-bold ${
            label === "표준"
              ? "bg-primary/15 text-primary-dark dark:text-primary-bright"
              : "bg-raised text-muted-foreground"
          }`}
          style={{ left, width }}
        >
          {label}
        </span>
      ))}
    </span>
  );

  return (
    <div className={INBODY_ROW}>
      {heading}
      {zoneRow}
      <span />
      <span className="hidden text-right text-2xs font-bold text-subtle sm:block">
        {rangeLabel}
      </span>
    </div>
  );
}

/** 결과지처럼 한 줄 — 이름, 눈금과 막대(옅은 칸이 표준), 값, 표준 범위 */
function InbodyBar({
  label,
  value,
  unit,
  scale,
  position,
  range,
  tip,
}: {
  label: string;
  value: number;
  unit: string;
  scale: InbodyScale;
  /** 막대 길이를 정하는 값 — 체중·골격근·체지방은 표준 대비 %, 나머지는 값 그대로 */
  position: number;
  range: string;
  /** 막대 끝에 붙이는 글 — 표준 대비 % */
  tip?: string;
}) {
  const low = scalePosition(scale, scale.low);
  const high = scalePosition(scale, scale.high);
  const at = scalePosition(scale, position);
  const tone =
    position < scale.low
      ? "bg-subtle"
      : position > scale.high
        ? "bg-goal"
        : "bg-primary";
  const last = scale.ticks.length - 1;

  return (
    <div className={INBODY_ROW}>
      <span className="pb-px text-xs font-bold text-muted-foreground">
        {label}
      </span>
      <span className="flex flex-col gap-0.5">
        {/* 눈금 — 폰에서는 하나 걸러 보여 줌 */}
        <span className="relative h-3.5">
          {scale.ticks.map((tick, i) => (
            <span
              key={tick}
              className={`absolute top-0 -translate-x-1/2 text-[10px] leading-none tabular-nums text-subtle ${
                i % 2 === 1 ? "hidden sm:block" : ""
              } ${i === 0 ? "translate-x-0" : ""} ${i === last ? "-translate-x-full" : ""}`}
              style={{ left: `${(i / last) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </span>
        <span className="relative h-2.5 rounded-full bg-raised">
          {/* 표준 */}
          <span
            className="absolute inset-y-0 bg-primary/15"
            style={{ left: `${low * 100}%`, width: `${(high - low) * 100}%` }}
          />
          <span
            className={`absolute inset-y-0 left-0 rounded-full ${tone}`}
            style={{ width: `${Math.max(at, 0.02) * 100}%` }}
          />
          {tip && (
            <span
              className={`absolute top-1/2 -translate-y-1/2 text-[10px] font-extrabold leading-none tabular-nums ${
                at > 0.8 ? "-translate-x-full pr-1 text-white" : "pl-1 text-ink"
              }`}
              style={{ left: `${at * 100}%` }}
            >
              {tip}
            </span>
          )}
        </span>
      </span>
      <span className="text-right text-sm font-extrabold leading-none tabular-nums">
        {/* 결과지처럼 소수 자리를 맞춤 — 복부지방률은 둘째 자리까지 */}
        {value.toFixed(unit ? 1 : 2)}
        {unit && (
          <span className="ml-0.5 text-2xs font-bold text-muted-foreground">
            {unit}
          </span>
        )}
      </span>
      <span className="hidden text-right text-2xs leading-none text-subtle tabular-nums sm:block">
        {range}
      </span>
    </div>
  );
}

/**
 * 내장지방 면적 그래프 — 결과지처럼 가로는 나이, 세로는 면적(cm²)
 * 가운데 옅은 띠는 나이대별로 흔한 범위, 100cm² 선을 넘으면 내장지방형 비만
 */
function VisceralFatChart({ area, age }: { area: number; age: number | null }) {
  const width = 300;
  const height = 240;
  const max = 200;
  const left = 34;
  const right = width - 10;
  const top = 12;
  const bottom = height - 30;
  const x = (years: number) => left + ((years - 5) / 90) * (right - left);
  // 200이 넘는 값은 맨 위에 찍고 숫자는 그대로 씀
  const y = (cm2: number) => bottom - (Math.min(cm2, max) / max) * (bottom - top);
  // 나이대별로 흔한 범위 — 결과지의 띠 모양을 따라 그린 근사. 닫힌 매끄러운 곡선
  const points = [
    [12, 18], [25, 26], [40, 40], [55, 58], [70, 78], [80, 96], [84, 125],
    [83, 170], [75, 168], [60, 150], [45, 130], [30, 108], [18, 88], [12, 55],
  ].map(([a, v]) => [x(a), y(v)]);
  const band =
    points
      .map((p, i) => {
        const p0 = points[(i - 1 + points.length) % points.length];
        const p2 = points[(i + 1) % points.length];
        const p3 = points[(i + 2) % points.length];
        const c1 = [p[0] + (p2[0] - p0[0]) / 6, p[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p[0]) / 6, p2[1] - (p3[1] - p[1]) / 6];
        return `${i === 0 ? `M${p[0]},${p[1]} ` : ""}C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
      })
      .join(" ") + " Z";
  const high = area >= 100;
  const px = x(Math.min(Math.max(age ?? 40, 12), 88));
  const py = y(area);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mx-auto h-auto w-full max-w-80"
      role="img"
      aria-label={`내장지방 면적 ${area}cm²`}
    >
      <defs>
        <clipPath id="vfa-above">
          <rect x={0} y={0} width={width} height={y(100)} />
        </clipPath>
        <clipPath id="vfa-below">
          <rect x={0} y={y(100)} width={width} height={height} />
        </clipPath>
      </defs>
      {/* 흔한 범위 — 결과지처럼 100 위는 진한 회색, 아래는 옅은 회색 */}
      <path d={band} clipPath="url(#vfa-below)" className="fill-subtle/25" />
      <path d={band} clipPath="url(#vfa-above)" className="fill-subtle/45" />
      {/* 100cm² 가로선 */}
      <line x1={left} x2={right} y1={y(100)} y2={y(100)} className="stroke-muted-foreground" strokeWidth={1.2} />
      {/* 테두리 */}
      <rect x={left} y={top} width={right - left} height={bottom - top} className="fill-none stroke-line-strong" />
      {/* 눈금 */}
      {[0, 50, 100, 150, 200].map((v) => (
        <text
          key={v}
          x={left - 6}
          y={y(v) + 3.5}
          textAnchor="end"
          className={`text-[10px] tabular-nums ${v === 100 ? "fill-ink font-bold" : "fill-subtle"}`}
        >
          {v}
        </text>
      ))}
      {[20, 40, 60, 80].map((a) => (
        <text key={a} x={x(a)} y={bottom + 16} textAnchor="middle" className="fill-subtle text-[10px]">
          {a}
        </text>
      ))}
      <text x={right} y={bottom + 16} textAnchor="end" className="fill-subtle text-[10px]">
        세
      </text>
      <text x={left + 4} y={top + 12} className="fill-subtle text-[10px]">
        cm²
      </text>
      {/* 내 값 */}
      <circle cx={px} cy={py} r={4.5} className={high ? "fill-goal" : "fill-primary"} />
      <text x={px + 9} y={py + 4} className={`text-[13px] font-extrabold tabular-nums ${high ? "fill-goal" : "fill-primary"}`}>
        {area}
      </text>
    </svg>
  );
}

/** 최근 1회 결과를 결과지처럼 — 위에는 지난 측정 대비 변화, 아래는 골격근·지방 분석과 비만 진단 */
function InbodyResultCard({
  latest,
  previous,
  readOnly,
  onDelete,
}: {
  latest: WeightRecord;
  previous: WeightRecord | undefined;
  readOnly: boolean;
  onDelete: () => void;
}) {
  const { height, gender } = latest;
  const standard =
    height !== null && gender !== null ? inbodyStandard(height, gender) : null;
  // 표준 범위 글 — 결과지처럼 아래 끝은 반올림, 위 끝은 버림
  const between = (low: number, high: number) =>
    `${round1(low).toFixed(1)}~${(Math.floor(high * 10 + 1e-9) / 10).toFixed(1)}`;

  const changes: [string, number | null, number | null, string][] = [
    ["체중", latest.weight, previous?.weight ?? null, "kg"],
    ["골격근량", latest.skeletalMuscle, previous?.skeletalMuscle ?? null, "kg"],
    ["체지방량", latest.bodyFatMass, previous?.bodyFatMass ?? null, "kg"],
    ["체지방률", latest.bodyFatPercent, previous?.bodyFatPercent ?? null, "%"],
  ];

  const profile = [
    gender && (gender === "male" ? "남성" : "여성"),
    latest.age !== null && `${latest.age}세`,
    height !== null && `${height}cm`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line p-4 md:p-5">
      {/* 측정 정보 */}
      <div className="flex items-start justify-between gap-3">
        <p className="flex min-w-0 flex-col gap-0.5">
          <span className="text-2xs font-bold text-subtle">최근 측정</span>
          <span className="text-sm font-extrabold">
            {formatDateShort(latest.date)}
            {latest.measuredHour !== null && (
              <span className="ml-1.5 font-semibold text-muted-foreground">
                {formatHourLabel(latest.measuredHour)}
              </span>
            )}
          </span>
          {profile && (
            <span className="text-2xs font-semibold text-subtle">
              {profile}
            </span>
          )}
        </p>
        {!readOnly && (
          <IconButton
            icon="trash"
            label={`${latest.date} 인바디 기록 삭제`}
            danger
            onClick={onDelete}
          />
        )}
      </div>

      {/* 지난 측정 대비 변화 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {changes.map(([label, now, before, unit]) => {
          const delta =
            now !== null && before !== null ? round1(now - before) : null;
          return (
            <div
              key={label}
              className="flex flex-col gap-0.5 rounded-lg bg-canvas px-3 py-2"
            >
              <span className="text-2xs font-bold text-subtle">{label}</span>
              <span className="text-lg font-extrabold tabular-nums">
                {now?.toFixed(1) ?? "—"}
                {now !== null && (
                  <span className="ml-0.5 text-xs font-bold text-muted-foreground">
                    {unit}
                  </span>
                )}
              </span>
              <span
                className={`text-2xs font-bold tabular-nums ${
                  delta === null || delta === 0
                    ? "text-subtle"
                    : delta < 0
                      ? "text-primary"
                      : "text-goal"
                }`}
              >
                {delta === null
                  ? previous
                    ? "—"
                    : "첫 측정"
                  : `지난번보다 ${signed(delta)}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* 골격근·지방 분석 */}
      {standard && (
        <div className="flex flex-col gap-2.5 border-t border-line pt-4">
          <InbodyBarHeader title="골격근·지방" unit="%" />
          <InbodyBar
            label="체중"
            value={latest.weight}
            unit="kg"
            scale={SCALE.weight}
            position={(latest.weight / standard.weight) * 100}
            tip={`${Math.round((latest.weight / standard.weight) * 100)}%`}
            range={between(standard.weight * 0.85, standard.weight * 1.15)}
          />
          {latest.skeletalMuscle !== null && (
            <InbodyBar
              label="골격근량"
              value={latest.skeletalMuscle}
              unit="kg"
              scale={SCALE.muscle}
              position={(latest.skeletalMuscle / standard.muscle) * 100}
              tip={`${Math.round((latest.skeletalMuscle / standard.muscle) * 100)}%`}
              range={between(standard.muscle * 0.9, standard.muscle * 1.1)}
            />
          )}
          {latest.bodyFatMass !== null && (
            <InbodyBar
              label="체지방량"
              value={latest.bodyFatMass}
              unit="kg"
              scale={SCALE.fat}
              position={(latest.bodyFatMass / standard.fat) * 100}
              tip={`${Math.round((latest.bodyFatMass / standard.fat) * 100)}%`}
              range={between(standard.fat * 0.8, standard.fat * 1.6)}
            />
          )}
        </div>
      )}

      {/* 비만 진단 */}
      {(latest.bodyFatPercent !== null || latest.waistHipRatio !== null) && (
        <div className="flex flex-col gap-2.5 border-t border-line pt-4">
          <InbodyBarHeader title="비만 진단" />
          {latest.bodyFatPercent !== null && (
            <InbodyBar
              label="체지방률"
              value={latest.bodyFatPercent}
              unit="%"
              scale={
                gender === "female" ? SCALE.bodyFatFemale : SCALE.bodyFatMale
              }
              position={latest.bodyFatPercent}
              range={gender === "female" ? "18.0~28.0" : "10.0~20.0"}
            />
          )}
          {latest.waistHipRatio !== null && (
            <InbodyBar
              label="복부지방률"
              value={latest.waistHipRatio}
              unit=""
              scale={gender === "female" ? SCALE.whrFemale : SCALE.whrMale}
              position={latest.waistHipRatio}
              range={gender === "female" ? "0.75~0.85" : "0.80~0.90"}
            />
          )}
        </div>
      )}

      {/* 신체균형 — 부위별 근육. 막대는 표준 대비 % */}
      {LEAN_SEGMENTS.some(([, pct]) => latest[pct] !== null) && (
        <div className="flex flex-col gap-2.5 border-t border-line pt-4">
          <InbodyBarHeader title="신체균형" rangeLabel="표준 대비" unit="%" />
          {LEAN_SEGMENTS.map(([kg, pct, label]) => {
            const value = latest[kg];
            const percent = latest[pct];
            return (
              percent !== null && (
                <InbodyBar
                  key={kg}
                  label={label}
                  value={value ?? percent}
                  unit={value !== null ? "kg" : "%"}
                  scale={SCALE.lean}
                  position={percent}
                  range="90~110%"
                  tip={`${percent}%`}
                />
              )
            );
          })}
          {/* 결과지 오른쪽의 균형 판정 — 입력 창에서 고른 값 */}
          {BALANCE_PARTS.some(([key]) => latest[key]) && (
            <p className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
              {BALANCE_PARTS.map(([key, name]) => {
                const value = latest[key];
                return (
                  value && (
                    <span key={key}>
                      {name}{" "}
                      <span
                        className={`font-bold ${
                          value === "balanced" ? "text-ink" : value === "slight" ? "text-warning" : "text-danger"
                        }`}
                      >
                        {BALANCE_LABEL[value]}
                      </span>
                    </span>
                  )
                );
              })}
            </p>
          )}
        </div>
      )}

      {/* 내장지방 */}
      {latest.visceralFatArea != null && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="flex flex-wrap items-baseline gap-x-2 text-xs font-extrabold">
            내장지방
            <span className="font-semibold text-subtle">면적 100cm² 이상이면 내장지방형 비만</span>
          </p>
          <VisceralFatChart area={latest.visceralFatArea} age={latest.age} />
        </div>
      )}

      {latest.memo && <Memo text={latest.memo} />}
    </div>
  );
}

// ── 체중 그래프 ─────────────────────────────

// 캔버스는 브라우저에서만 그리고, 그래프 라이브러리는 화면이 뜬 뒤에 받음
const ChartCanvas = dynamic(() => import("./inbody-chart"), {
  ssr: false,
  loading: () => <div className="h-52 w-full md:h-60" />,
});

/** 체중 기록이 있으면 보이는 박스. 기록은 최신순으로 받음 */
export function WeightChartCard({
  weights,
  targetWeight,
  busy,
  onSaveGoal,
  onDelete,
}: {
  weights: WeightRecord[];
  targetWeight: number | null;
  busy?: boolean;
  /** 없으면 목표를 보여 주기만 함 (회원 본인 화면). */
  onSaveGoal?: (targetWeight: number | null) => void;
  /** 점을 눌러 고른 기록 지우기. 없으면 보기만 함 */
  onDelete?: (record: WeightRecord) => void;
}) {
  const stats = useMemo(
    () => getStats(weights, targetWeight),
    [weights, targetWeight],
  );
  const { dark } = useTheme();
  const hasInbody = stats.muscle.length > 0 || stats.fat.length > 0;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line p-4 md:p-5">
      {/* 현재 체중·목표 — 한 줄 */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold tracking-[-0.03em] tabular-nums">
            {stats.last.weight}
            <span className="ml-0.5 text-sm font-bold text-muted-foreground">kg</span>
          </span>
          {stats.points.length > 1 && (
            <span className="text-xs text-muted-foreground">
              처음보다 <span className="font-bold text-primary">{signed(stats.change)}kg</span>
            </span>
          )}
        </p>
        {onSaveGoal ? (
          <GoalControl goal={stats.goal} busy={busy ?? false} onSave={onSaveGoal} />
        ) : (
          stats.goal && <GoalText goal={stats.goal} />
        )}
      </div>

      {/* 그래프 — 테마가 바뀌면 새로 만들어 CSS 변수 색을 다시 읽음 */}
      {/* 범례 — 체중은 왼쪽 축, 골격근·체지방은 오른쪽 축 */}
      {hasInbody && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-2xs font-bold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-3.5 rounded-full bg-primary" />
            체중 (왼쪽)
          </span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full bg-ink" />
              골격근량
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full bg-goal" />
              체지방량 (오른쪽)
            </span>
          </span>
        </div>
      )}

      <ChartCanvas key={dark ? "dark" : "light"} stats={stats} />

      {/* 기록 목록 — 늘 같은 자리. 지우기도 여기서 */}
      <RecordsDialog weights={weights} onDelete={onDelete} />
    </div>
  );
}

/** 평소엔 "목표 78kg"로 보이고, 누르면 그 자리에서 숫자 칸과 저장 버튼이 됨. 모바일에서 주로 씀 */
function GoalControl({
  goal,
  busy,
  onSave,
}: {
  goal: Goal | null;
  busy: boolean;
  onSave: (targetWeight: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const open = () => {
    setValue(goal ? String(goal.target) : "");
    setEditing(true);
  };

  const save = (next: number | null) => {
    setEditing(false);
    if (next !== (goal?.target ?? null)) onSave(next);
  };

  // 폼으로 감싸서 모바일 키패드의 완료 키로도 저장됨
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = Number(value.trim());
    if (value.trim() === "" || !isValidWeight(parsed)) {
      toast(WEIGHT_RANGE_MESSAGE);
      return;
    }
    save(parsed);
  };

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-1.5">
        <label htmlFor="weight-goal" className="text-xs font-bold text-subtle">
          목표
        </label>
        <input
          id="weight-goal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="decimal"
          enterKeyHint="done"
          autoFocus
          className="h-8 w-16 rounded-lg border border-goal bg-field px-2 text-right text-sm font-extrabold tabular-nums text-goal outline-none"
        />
        <span className="text-xs font-bold text-muted-foreground">kg</span>
        {goal && (
          <button type="button" onClick={() => save(null)} disabled={busy} className="h-8 px-1.5 text-xs font-bold text-danger disabled:opacity-50">
            지우기
          </button>
        )}
        <button type="button" onClick={() => setEditing(false)} className="h-8 px-1.5 text-xs font-bold text-muted-foreground">
          취소
        </button>
        <button type="submit" disabled={busy} className="h-8 px-1.5 text-xs font-bold text-primary disabled:opacity-50">
          저장
        </button>
      </form>
    );
  }

  if (!goal) {
    return (
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="flex h-8 shrink-0 items-center gap-1 text-sm font-bold text-goal transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        <Icon name="target" size={16} />
        목표 체중 정하기
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      aria-label={`목표 체중 ${goal.target}kg 수정`}
      className="group -mr-2 flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-raised disabled:opacity-50"
    >
      <GoalText goal={goal} />
      <Icon name="pencil" size={12} className="text-subtle transition-colors group-hover:text-ink" />
    </button>
  );
}

/** "목표 75kg · 3.4kg 남음" 한 줄 */
function GoalText({ goal }: { goal: Goal }) {
  return (
    <span className="flex items-baseline gap-1.5 text-xs text-muted-foreground">
      <span className="font-bold text-subtle">목표</span>
      <span className="text-base font-extrabold tabular-nums text-goal">
        {goal.target}
        <span className="ml-0.5 text-xs font-bold text-muted-foreground">kg</span>
      </span>
      ·{" "}
      {goal.reached ? (
        <span className="font-bold text-goal">달성</span>
      ) : (
        <span>
          <span className="font-bold text-ink">{goal.remaining}kg</span> 남음
        </span>
      )}
    </span>
  );
}

/** [기록 N건 관리] — 누르면 창에서 날짜별 기록을 보고 지움. 늘 같은 자리라 화면이 흔들리지 않음 */
function RecordsDialog({
  weights,
  onDelete,
}: {
  weights: WeightRecord[];
  /** 없으면 보기만 함 (회원 본인 화면) */
  onDelete?: (record: WeightRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-fit items-center gap-0.5 self-end rounded-lg px-1 text-xs font-bold text-muted-foreground transition-colors hover:text-ink"
      >
        기록 {weights.length}건 {onDelete ? "관리" : "보기"}
        <Icon name="chevronRight" size={14} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dismissOnOutsideClick className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>체중·인바디 기록 {weights.length}건</DialogTitle>
          </DialogHeader>
          <ul className="flex flex-col">
            {weights.map((record) => (
              <li key={record.id} className="flex h-11 items-center gap-3 border-b border-line text-sm last:border-0">
                <span className="w-28 shrink-0 text-muted-foreground">{formatDateShort(record.date)}</span>
                <span className="font-extrabold tabular-nums">{record.weight.toFixed(1)}kg</span>
                <span className={`text-2xs font-bold ${isInbody(record) ? "text-primary" : "text-subtle"}`}>
                  {isInbody(record) ? "인바디" : "체중만"}
                </span>
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onDelete(record);
                    }}
                    aria-label={`${record.date} 기록 삭제`}
                    className="ml-auto grid size-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-danger/8 hover:text-danger"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── 계산 ─────────────────────────────────────

export type Point = {
  id: string;
  time: number;
  weight: number;
  date: string;
  /** 바로 앞 기록 대비. 첫 기록은 null. */
  delta: number | null;
};

export type Goal = {
  target: number;
  /** 목표까지 남은 kg (절댓값) */
  remaining: number;
  reached: boolean;
};

/** 인바디 선의 점 — 골격근량·체지방량 */
export type SeriesPoint = { id: string; time: number; value: number; date: string };

export type Stats = {
  points: Point[];
  muscle: SeriesPoint[];
  fat: SeriesPoint[];
  first: Point;
  last: Point;
  change: number;
  min: number;
  max: number;
  goal: Goal | null;
};

/** 최신순 기록을 날짜순 점으로 바꾸고 요약 수치를 뽑음 */
function getStats(weights: WeightRecord[], targetWeight: number | null): Stats {
  const sorted = weights
    .map((record) => ({
      id: record.id,
      time: new Date(`${record.date}T00:00:00`).getTime(),
      weight: record.weight,
      date: record.date,
    }))
    .sort((a, b) => a.time - b.time);

  const points = sorted.map((point, index) => ({
    ...point,
    delta: index === 0 ? null : round1(point.weight - sorted[index - 1].weight),
  }));

  const first = points[0];
  const last = points[points.length - 1];
  const values = points.map((point) => point.weight);
  const series = (pick: (r: WeightRecord) => number | null) =>
    weights
      .flatMap((r) => {
        const value = pick(r);
        return value == null
          ? []
          : [
              {
                id: r.id,
                time: new Date(`${r.date}T00:00:00`).getTime(),
                value,
                date: r.date,
              },
            ];
      })
      .sort((a, b) => a.time - b.time);

  return {
    points,
    muscle: series((r) => r.skeletalMuscle),
    fat: series((r) => r.bodyFatMass),
    first,
    last,
    change: round1(last.weight - first.weight),
    min: Math.min(...values),
    max: Math.max(...values),
    goal:
      targetWeight == null
        ? null
        : {
            target: targetWeight,
            remaining: Math.abs(round1(last.weight - targetWeight)),
            // 빼는 목표면 목표 이하, 찌우는 목표면 목표 이상에서 달성임
            reached:
              first.weight >= targetWeight
                ? last.weight <= targetWeight
                : last.weight >= targetWeight,
          },
  };
}
