/*
  영양 계산 화면 — 신체 정보·목표 입력과 계산 결과 저장

  @date : 2026-09-12
*/

"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/custom/form-field";
import { Button } from "@/components/ui/button";
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
import { apiFetch, errorMessage } from "@/lib/client";
import type { NutritionProfile } from "@/lib/types";
import { EditorFrame } from "../editor-frame";

const ACTIVITY_LEVELS = Object.keys(ACTIVITY_MULTIPLIER) as ActivityLevel[];
const GOALS: NutritionGoal[] = ["loss", "maintain", "gain"];

interface NutritionPayload {
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

export function NutritionEditor({
  member,
  nutrition,
  latestWeight,
}: {
  member: { id: string; name: string };
  nutrition: NutritionProfile | null;
  /** 최신 체중 기록 — 처음 계산할 때 체중 칸을 미리 채워줌 */
  latestWeight: number | null;
}) {
  const router = useRouter();
  const back = `/members/${member.id}`;
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    toFormState(nutrition, latestWeight),
  );
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

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

    const payload: NutritionPayload = {
      gender: form.gender,
      age,
      height,
      weight,
      bodyFatPercentage,
      skeletalMuscleMass,
      leanBodyMass,
      activityLevel: form.activityLevel,
      goal: form.goal,
    };

    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/members/${member.id}/nutrition`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast("섭취 기준을 계산했습니다.");
      router.replace(back);
    } catch (e) {
      setError(errorMessage(e, "계산 결과를 저장하지 못했습니다."));
      setBusy(false);
    }
  };

  // 체지방률을 넣었을 때 제지방량 칸에 보여줄 자동 계산값
  const autoLeanBodyMass =
    Number(form.weight) > 0 && Number(form.bodyFatPercentage) > 0
      ? (Number(form.weight) * (1 - Number(form.bodyFatPercentage) / 100)).toFixed(1)
      : null;

  return (
    <EditorFrame
      back={back}
      title="영양 계산"
      name={member.name}
      subtitle="신체 정보와 목표를 넣으면 일일 섭취 기준을 계산합니다."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="성별" required group>
          <div className="grid grid-cols-2 gap-1 rounded-xl border-[1.5px] border-edge bg-surface p-1">
            {(["male", "female"] as Gender[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => set("gender", value)}
                aria-pressed={form.gender === value}
                className={`h-10 rounded-lg text-sm font-bold transition-colors ${
                  form.gender === value
                    ? "bg-primary-light text-primary-dark dark:text-primary-bright"
                    : "text-muted-foreground hover:bg-raised"
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

        <div className="flex flex-col gap-3 rounded-xl bg-canvas p-4">
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold">
            체성분
            <span className="text-xs font-medium text-muted-foreground">
              선택 입력 · 넣을수록 계산이 정교해집니다
            </span>
          </p>

          <div className="flex flex-col gap-3">
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

        <Field label="목표" required group>
          <div className="grid grid-cols-3 gap-1 rounded-xl border-[1.5px] border-edge bg-surface p-1">
            {GOALS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => set("goal", value)}
                aria-pressed={form.goal === value}
                className={`h-10 rounded-lg text-sm font-bold transition-colors ${
                  form.goal === value
                    ? "bg-primary-light text-primary-dark dark:text-primary-bright"
                    : "text-muted-foreground hover:bg-raised"
                }`}
              >
                {GOAL_LABEL[value]}
              </button>
            ))}
          </div>
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="mt-2 flex gap-2.5 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(back)}
            className="px-5"
          >
            취소
          </Button>
          <Button type="submit" loading={busy} className="flex-1 sm:flex-none sm:px-7">
            계산하고 저장
          </Button>
        </div>
      </form>
    </EditorFrame>
  );
}
