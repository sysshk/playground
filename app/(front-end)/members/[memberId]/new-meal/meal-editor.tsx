/*
  식단 한 끼 작성 화면 — 직접 입력 / 글·사진(준비 중), 그날 그 끼니에 이미 적은 것 지우기
  트레이너(회원 상세)와 회원 본인(/me)이 함께 씀

  @date : 2026-09-19
*/

"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { Field } from "@/components/custom/form-field";
import { Icon, type IconName } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, errorMessage, formatDateShort } from "@/lib/client";
import { MEAL_MAX, MEAL_SLOT_LABEL, type Meal, type MealSlot } from "@/lib/types";
import { EditorPage } from "@/components/custom/editor-page";
import { IconButton } from "../tabs/tab-ui";

type Mode = "ai" | "direct";
type Macro = "carbs" | "fat" | "protein";

const MODES: [Mode, IconName, string][] = [
  ["direct", "pencil", "직접 입력"],
  ["ai", "spark", "글·사진"],
];

const MACRO_FIELDS: { key: Macro; label: string }[] = [
  { key: "carbs", label: "탄수화물" },
  { key: "protein", label: "단백질" },
  { key: "fat", label: "지방" },
];

/**
 * 직접 입력: 음식과 kcal는 필수, 탄단지 g은 선택
 * 글·사진: 글과 사진으로 AI가 kcal·탄단지를 채울 자리. 붙이기 전이라 안내만 두고 저장을 막음
 */
export function MealEditor({
  name,
  meals,
  date,
  slot,
  api,
  back,
}: {
  name?: string; // 트레이너 화면이면 회원 이름을 제목 옆에
  meals: Meal[]; // 그날 그 끼니에 이미 적은 것
  date: string;
  slot: MealSlot;
  api: string; // 회원은 /api/me/meals, 트레이너는 /api/members/:id/meals
  back: string; // 저장·취소 뒤 돌아갈 식단 탭
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [mode, setMode] = useState<Mode>("direct");
  const [content, setContent] = useState("");
  const [calories, setCalories] = useState("");
  const [grams, setGrams] = useState<Record<Macro, string>>({ carbs: "", fat: "", protein: "" });
  const [error, setError] = useState<string | null>(null);
  const label = MEAL_SLOT_LABEL[slot];
  const busy = saving || refreshing;

  const kcal = Number(calories);
  const kcalValid = calories.trim() !== "" && Number.isInteger(kcal) && kcal >= 0;
  const ready = mode === "direct" && content.trim() !== "" && kcalValid;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    const numbers = {
      calories: kcal,
      carbs: grams.carbs || null,
      fat: grams.fat || null,
      protein: grams.protein || null,
    };

    setSaving(true);
    setError(null);
    try {
      await apiFetch(api, {
        method: "POST",
        body: JSON.stringify({ date, slot, content, ...numbers }),
      });
      toast("식단을 기록했습니다.");
      router.replace(back);
    } catch (e) {
      setError(errorMessage(e, "식단을 기록하지 못했습니다."));
      setSaving(false);
    }
  };

  const remove = async (meal: Meal) => {
    setSaving(true);
    try {
      await apiFetch(`${api}/${meal.id}`, { method: "DELETE" });
      toast("식단을 지웠습니다.");
      startRefresh(() => router.refresh());
    } catch (e) {
      toast(errorMessage(e, "식단을 지우지 못했습니다."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditorPage back={back} title={`${label} 기록`} name={name} subtitle={formatDateShort(date)}>
      {/* 이미 적은 것 */}
      {meals.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-bold text-muted-foreground">이미 적은 것</p>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface px-3">
            {meals.map((meal) => (
              <li key={meal.id} className="flex min-h-11 items-center gap-2">
                <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed">
                  {meal.content}
                </p>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-subtle">
                  {meal.calories != null ? `${meal.calories.toLocaleString()} kcal` : "계산 전"}
                </span>
                <IconButton
                  icon="trash"
                  label="식단 삭제"
                  danger
                  disabled={busy}
                  onClick={() => remove(meal)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={save} className="flex flex-col gap-4">
        {/* 입력 방식 */}
        <div
          role="radiogroup"
          aria-label="입력 방식"
          className="grid grid-cols-2 gap-1 rounded-xl border-[1.5px] border-edge bg-surface p-1"
        >
          {MODES.map(([value, icon, text]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => {
                setMode(value);
                setError(null);
              }}
              className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-bold transition-colors ${
                mode === value
                  ? "bg-primary-light text-primary-dark dark:text-primary-bright"
                  : "text-muted-foreground hover:bg-raised"
              }`}
            >
              <Icon name={icon} size={15} />
              {text}
            </button>
          ))}
        </div>

        {mode === "ai" ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-dashed border-line-strong px-4 py-8 text-center">
            <Icon name="spark" size={22} className="text-subtle" />
            <p className="text-sm font-bold">준비 중입니다</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              먹은 것을 글로 적고 사진을 붙이면 kcal·탄단지를 자동으로 계산하는 기능입니다.
              <br />
              지금은 직접 입력으로 적어 주세요.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Field label="음식" required>
              <Input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={MEAL_MAX}
                placeholder="예) 닭가슴살 도시락"
                autoFocus
              />
            </Field>
            <Field label="칼로리 (kcal)" required>
              <Input
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                inputMode="numeric"
                placeholder="예) 450"
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              {MACRO_FIELDS.map(({ key, label: macroLabel }) => (
                <Field key={key} label={`${macroLabel} (g)`}>
                  <Input
                    value={grams[key]}
                    onChange={(e) => setGrams((prev) => ({ ...prev, [key]: e.target.value }))}
                    inputMode="decimal"
                    placeholder="선택"
                  />
                </Field>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="mt-2 flex gap-2.5 tablet:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(back)}
            className="flex-1 tablet:flex-none tablet:px-5"
          >
            취소
          </Button>
          <Button
            type="submit"
            loading={saving}
            disabled={!ready || refreshing}
            className="flex-1 tablet:flex-none tablet:px-7"
          >
            저장
          </Button>
        </div>
      </form>
    </EditorPage>
  );
}
