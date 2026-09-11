"use client";

import { FormEvent, useState } from "react";
import { Button, EmptyState, Field, Modal, Section, inputClass } from "./ui";
import { apiFetch, errorMessage, formatDateTime } from "@/lib/client";
import {
  ACTIVITY_HINT,
  ACTIVITY_MULTIPLIER,
  GOAL_LABEL,
  type ActivityLevel,
  type Gender,
  type NutritionGoal,
} from "@/lib/nutrition";
import type { NutritionProfile } from "@/lib/types";

const ACTIVITY_LEVELS = Object.keys(ACTIVITY_MULTIPLIER) as ActivityLevel[];
const GOALS: NutritionGoal[] = ["loss", "maintain", "gain"];

interface FormState {
  gender: Gender;
  age: string;
  height: string;
  weight: string;
  bodyFatPercentage: string;
  skeletalMuscleMass: string;
  leanBodyMass: string;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
}

function toFormState(
  nutrition: NutritionProfile | null,
  suggestedWeight: number | null,
): FormState {
  return {
    gender: nutrition?.gender ?? "male",
    age: nutrition ? String(nutrition.age) : "",
    height: nutrition ? String(nutrition.height) : "",
    weight: nutrition
      ? String(nutrition.weight)
      : suggestedWeight !== null
        ? String(suggestedWeight)
        : "",
    bodyFatPercentage: nutrition?.bodyFatPercentage
      ? String(nutrition.bodyFatPercentage)
      : "",
    skeletalMuscleMass: nutrition?.skeletalMuscleMass
      ? String(nutrition.skeletalMuscleMass)
      : "",
    leanBodyMass: nutrition?.leanBodyMass ? String(nutrition.leanBodyMass) : "",
    activityLevel: nutrition?.activityLevel ?? "moderate",
    goal: nutrition?.goal ?? "maintain",
  };
}

export default function NutritionPanel({
  memberId,
  nutrition,
  suggestedWeight,
  onSaved,
}: {
  memberId: string;
  nutrition: NutritionProfile | null;
  /** 최신 체중 기록 — 처음 계산할 때 체중 칸을 미리 채워준다. */
  suggestedWeight: number | null;
  onSaved: (nutrition: NutritionProfile) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    toFormState(nutrition, suggestedWeight),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openForm = () => {
    setForm(toFormState(nutrition, suggestedWeight));
    setError(null);
    setOpen(true);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const age = Number(form.age);
    if (!form.age || !Number.isFinite(age) || age < 1 || age > 120) {
      setError("1~120세 사이로 입력해 주세요.");
      return;
    }

    const height = Number(form.height);
    if (!form.height || !Number.isFinite(height) || height < 50 || height > 250) {
      setError("50~250cm 사이로 입력해 주세요.");
      return;
    }

    const weight = Number(form.weight);
    if (!form.weight || !Number.isFinite(weight) || weight <= 0 || weight > 500) {
      setError("0보다 크고 500kg 이하로 입력해 주세요.");
      return;
    }

    const optional = (raw: string) => (raw.trim() === "" ? null : Number(raw));

    const bodyFatPercentage = optional(form.bodyFatPercentage);
    if (
      bodyFatPercentage !== null &&
      (!Number.isFinite(bodyFatPercentage) ||
        bodyFatPercentage <= 0 ||
        bodyFatPercentage >= 75)
    ) {
      setError("체지방률은 0%보다 크고 75% 미만으로 입력해 주세요.");
      return;
    }

    const skeletalMuscleMass = optional(form.skeletalMuscleMass);
    if (
      skeletalMuscleMass !== null &&
      (!Number.isFinite(skeletalMuscleMass) ||
        skeletalMuscleMass <= 0 ||
        skeletalMuscleMass > weight)
    ) {
      setError("골격근량은 0보다 크고 체중 이하로 입력해 주세요.");
      return;
    }

    const leanBodyMass = optional(form.leanBodyMass);
    if (
      leanBodyMass !== null &&
      (!Number.isFinite(leanBodyMass) ||
        leanBodyMass <= 0 ||
        leanBodyMass > weight)
    ) {
      setError("제지방량은 0보다 크고 체중 이하로 입력해 주세요.");
      return;
    }

    setBusy(true);
    try {
      const result = await apiFetch<{ nutrition: NutritionProfile }>(
        `/api/members/${memberId}/nutrition`,
        {
          method: "PUT",
          body: JSON.stringify({
            gender: form.gender,
            age,
            height,
            weight,
            bodyFatPercentage,
            skeletalMuscleMass,
            leanBodyMass,
            activityLevel: form.activityLevel,
            goal: form.goal,
          }),
        },
      );
      onSaved(result.nutrition);
      setOpen(false);
    } catch (err) {
      setError(errorMessage(err, "계산 결과를 저장하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };

  // 체지방률을 넣었을 때 제지방량 칸에 보여줄 자동 계산값
  const autoLeanBodyMass =
    Number(form.weight) > 0 && Number(form.bodyFatPercentage) > 0
      ? (Number(form.weight) * (1 - Number(form.bodyFatPercentage) / 100)).toFixed(1)
      : null;

  return (
    <>
      <Section
        title="칼로리 및 영양 계산"
        subtitle={
          nutrition
            ? `${GOAL_LABEL[nutrition.goal]} 목표 · ${formatDateTime(nutrition.updatedAt)} 계산`
            : "회원의 신체 정보와 목표에 맞춘 일일 섭취 기준입니다."
        }
        action={
          nutrition ? (
            <Button variant="ghost" onClick={openForm}>
              다시 계산
            </Button>
          ) : null
        }
      >
        {!nutrition ? (
          <EmptyState
            icon="🍽️"
            title="영양 계산 시작"
            description="성별, 나이, 키, 체중과 활동량을 입력해 섭취 기준을 계산하세요."
            action={<Button onClick={openForm}>영양 계산하기</Button>}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-2.5 sm:grid-cols-3">
              <Stat label="기초대사량" value={`${nutrition.bmr}`} unit="kcal" />
              <Stat
                label="유지칼로리"
                value={`${nutrition.maintenanceCalories}`}
                unit="kcal"
              />
              <Stat
                label="목표 섭취칼로리"
                value={`${nutrition.targetCalories}`}
                unit="kcal"
                highlight
              />
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              <Stat
                label="단백질 권장량"
                value={`${nutrition.protein}`}
                unit="g"
                hint={`권장 범위 ${nutrition.proteinMin}~${nutrition.proteinMax}g`}
              />
              <Stat label="탄수화물 권장량" value={`${nutrition.carbs}`} unit="g" />
              <Stat label="지방 권장량" value={`${nutrition.fat}`} unit="g" />
            </div>

            <div className="flex flex-wrap gap-1.5 text-[12px]">
              <Chip>
                {nutrition.gender === "male" ? "남성" : "여성"} · {nutrition.age}세
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

            <details className="rounded-xl border border-line bg-canvas px-4 py-3">
              <summary className="cursor-pointer text-[13px] font-semibold">
                계산 기준
              </summary>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {nutrition.calculationBasis.map((line, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-[12px] leading-relaxed text-muted"
                  >
                    <span aria-hidden="true">·</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </details>

            <p className="text-[12px] leading-relaxed text-muted">
              제지방량이 있으면 체성분 기반 기초대사량을 사용합니다. 결과는 코칭
              참고용 추정치이며 의료 또는 영양 처방을 대신하지 않습니다.
            </p>
          </div>
        )}
      </Section>

      <Modal
        open={open}
        title="칼로리 및 영양 계산"
        onClose={() => setOpen(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="성별" required>
            <div className="grid grid-cols-2 gap-2">
              {(["male", "female"] as Gender[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("gender", value)}
                  className={`rounded-xl border px-4 py-3 text-[14px] font-semibold transition-colors ${
                    form.gender === value
                      ? "border-primary bg-primary-light text-primary-dark"
                      : "border-line bg-white text-muted hover:bg-slate-50"
                  }`}
                >
                  {value === "male" ? "남성" : "여성"}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="나이" required>
              <input
                className={inputClass}
                value={form.age}
                onChange={(e) => set("age", e.target.value)}
                inputMode="numeric"
                placeholder="예: 32"
              />
            </Field>
            <Field label="키 (cm)" required>
              <input
                className={inputClass}
                value={form.height}
                onChange={(e) => set("height", e.target.value)}
                inputMode="decimal"
                placeholder="예: 172"
              />
            </Field>
          </div>

          <Field label="체중 (kg)" required>
            <input
              className={inputClass}
              value={form.weight}
              onChange={(e) => set("weight", e.target.value)}
              inputMode="decimal"
              placeholder="예: 72.5"
            />
          </Field>

          <div className="rounded-xl border border-line bg-canvas p-4">
            <p className="text-[13px] font-bold">체성분</p>
            <p className="mt-0.5 text-[12px] text-muted">
              선택 입력 · 입력할수록 계산이 정교해집니다
            </p>

            <div className="mt-3 flex flex-col gap-3">
              <Field label="체지방률 (%)">
                <input
                  className={inputClass}
                  value={form.bodyFatPercentage}
                  onChange={(e) => set("bodyFatPercentage", e.target.value)}
                  inputMode="decimal"
                  placeholder="예: 22.5"
                />
              </Field>

              <Field label="골격근량 (kg)">
                <input
                  className={inputClass}
                  value={form.skeletalMuscleMass}
                  onChange={(e) => set("skeletalMuscleMass", e.target.value)}
                  inputMode="decimal"
                  placeholder="예: 31.5"
                />
              </Field>

              <Field
                label="제지방량 (kg, 선택)"
                hint="직접 입력하면 체지방률로 계산한 값보다 우선 적용됩니다."
              >
                <input
                  className={inputClass}
                  value={form.leanBodyMass}
                  onChange={(e) => set("leanBodyMass", e.target.value)}
                  inputMode="decimal"
                  placeholder={
                    autoLeanBodyMass
                      ? `자동 계산: ${autoLeanBodyMass}kg`
                      : "예: 56.2"
                  }
                />
              </Field>
            </div>
          </div>

          <Field label="활동량" required>
            <select
              className={inputClass}
              value={form.activityLevel}
              onChange={(e) => set("activityLevel", e.target.value as ActivityLevel)}
            >
              {ACTIVITY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {ACTIVITY_HINT[level]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="목표" required>
            <div className="grid grid-cols-3 gap-2">
              {GOALS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("goal", value)}
                  className={`rounded-xl border px-3 py-3 text-[14px] font-semibold transition-colors ${
                    form.goal === value
                      ? "border-primary bg-primary-light text-primary-dark"
                      : "border-line bg-white text-muted hover:bg-slate-50"
                  }`}
                >
                  {GOAL_LABEL[value]}
                </button>
              ))}
            </div>
          </Field>

          {error && <p className="text-[13px] text-danger">{error}</p>}

          <div className="mt-2 flex gap-2.5">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              취소
            </Button>
            <Button type="submit" loading={busy} className="flex-1">
              계산하고 저장
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function Stat({
  label,
  value,
  unit,
  hint,
  highlight = false,
}: {
  label: string;
  value: string;
  unit: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3.5 ${
        highlight
          ? "border-primary bg-primary-light"
          : "border-line bg-canvas"
      }`}
    >
      <p
        className={`text-[12px] font-semibold ${
          highlight ? "text-primary-dark" : "text-muted"
        }`}
      >
        {label}
      </p>
      <p className="mt-1 text-[22px] font-extrabold leading-none tracking-tight">
        {value}
        <span className="ml-1 text-[12px] font-bold text-muted">{unit}</span>
      </p>
      {hint && <p className="mt-1.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-muted">
      {children}
    </span>
  );
}
