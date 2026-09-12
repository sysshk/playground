"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/custom/empty-state";
import { Section, SectionAction } from "./section";
import { formatDateTime } from "@/lib/client";
import { ACTIVITY_HINT, GOAL_LABEL } from "@/lib/nutrition";
import type { NutritionProfile } from "@/lib/types";

/** 계산 결과를 읽는 자리. 계산 자체는 /members/:id/nutrition 화면에서 한다. */
export default function NutritionPanel({
  memberId,
  nutrition,
}: {
  memberId: string;
  nutrition: NutritionProfile | null;
}) {
  const href = `/members/${memberId}/nutrition`;

  return (
    <Section
      title="칼로리 및 영양 계산"
      subtitle={
        nutrition
          ? `${GOAL_LABEL[nutrition.goal]} 목표 · ${formatDateTime(nutrition.updatedAt)} 계산`
          : "회원의 신체 정보와 목표에 맞춘 일일 섭취 기준입니다."
      }
      action={
        nutrition ? (
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

/** 계산 기준 — 평소에는 접어 두고, 펼칠 때 높이가 부드럽게 늘어난다. */
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
