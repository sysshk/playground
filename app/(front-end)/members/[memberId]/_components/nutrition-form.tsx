"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/custom/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export interface NutritionPayload {
  gender: Gender;
  age: number;
  height: number;
  weight: number;
  bodyFatPercentage: number | null;
  skeletalMuscleMass: number | null;
  leanBodyMass: number | null;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
}

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

export default function NutritionForm({
  nutrition,
  suggestedWeight,
  busy = false,
  serverError,
  onSubmit,
  onCancel,
}: {
  nutrition: NutritionProfile | null;
  /** 최신 체중 기록 — 처음 계산할 때 체중 칸을 미리 채워준다. */
  suggestedWeight: number | null;
  busy?: boolean;
  serverError?: string | null;
  onSubmit: (payload: NutritionPayload) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    toFormState(nutrition, suggestedWeight),
  );
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleSubmit = (e: FormEvent) => {
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

    onSubmit({
      gender: form.gender,
      age,
      height,
      weight,
      bodyFatPercentage,
      skeletalMuscleMass,
      leanBodyMass,
      activityLevel: form.activityLevel,
      goal: form.goal,
    });
  };

  // 체지방률을 넣었을 때 제지방량 칸에 보여줄 자동 계산값
  const autoLeanBodyMass =
    Number(form.weight) > 0 && Number(form.bodyFatPercentage) > 0
      ? (Number(form.weight) * (1 - Number(form.bodyFatPercentage) / 100)).toFixed(1)
      : null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="성별" required>
        <div className="grid grid-cols-2 gap-2">
          {(["male", "female"] as Gender[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => set("gender", value)}
              className={`rounded-xl border px-4 py-3 text-base font-semibold transition-colors ${
                form.gender === value
                  ? "border-primary bg-primary-light text-primary-dark"
                  : "border-line bg-surface text-muted-foreground hover:bg-raised"
              }`}
            >
              {value === "male" ? "남성" : "여성"}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="나이" required>
          <Input
            value={form.age}
            onChange={(e) => set("age", e.target.value)}
            inputMode="numeric"
            placeholder="예: 32"
          />
        </Field>
        <Field label="키 (cm)" required>
          <Input
            value={form.height}
            onChange={(e) => set("height", e.target.value)}
            inputMode="decimal"
            placeholder="예: 172"
          />
        </Field>
      </div>

      <Field label="체중 (kg)" required>
        <Input
          value={form.weight}
          onChange={(e) => set("weight", e.target.value)}
          inputMode="decimal"
          placeholder="예: 72.5"
        />
      </Field>

      <div className="rounded-xl border border-line p-4">
        <p className="text-sm font-bold">체성분</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          선택 입력 · 입력할수록 계산이 정교해집니다
        </p>

        <div className="mt-3 flex flex-col gap-3">
          <Field label="체지방률 (%)">
            <Input
              value={form.bodyFatPercentage}
              onChange={(e) => set("bodyFatPercentage", e.target.value)}
              inputMode="decimal"
              placeholder="예: 22.5"
            />
          </Field>

          <Field label="골격근량 (kg)">
            <Input
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
            <Input
              value={form.leanBodyMass}
              onChange={(e) => set("leanBodyMass", e.target.value)}
              inputMode="decimal"
              placeholder={
                autoLeanBodyMass ? `자동 계산: ${autoLeanBodyMass}kg` : "예: 56.2"
              }
            />
          </Field>
        </div>
      </div>

      <Field label="활동량" required>
        <Select
          value={form.activityLevel}
          onValueChange={(v) => set("activityLevel", v as ActivityLevel)}
        >
          <SelectTrigger className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {ACTIVITY_HINT[level]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="목표" required>
        <div className="grid grid-cols-3 gap-2">
          {GOALS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => set("goal", value)}
              className={`rounded-xl border px-3 py-3 text-base font-semibold transition-colors ${
                form.goal === value
                  ? "border-primary bg-primary-light text-primary-dark"
                  : "border-line bg-surface text-muted-foreground hover:bg-raised"
              }`}
            >
              {GOAL_LABEL[value]}
            </button>
          ))}
        </div>
      </Field>

      {(error || serverError) && (
        <p className="text-sm text-danger">{error ?? serverError}</p>
      )}

      <div className="mt-2 flex gap-2.5 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="px-5"
        >
          취소
        </Button>
        <Button type="submit" loading={busy} className="flex-1 sm:flex-none sm:px-7">
          계산하고 저장
        </Button>
      </div>
    </form>
  );
}
