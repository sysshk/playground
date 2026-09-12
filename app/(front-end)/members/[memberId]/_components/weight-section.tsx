"use client";

import { EmptyState } from "@/components/custom/empty-state";
import { formatDate } from "@/lib/client";
import type { WeightRecord } from "@/lib/types";
import { IconButton, Section, SectionAction } from "./section";
import WeightForm, { type WeightPayload } from "./weight-form";

/** 체중 기록. 맨 위가 최신이고, 그 값이 회원 요약의 최신 체중이 된다. */
export function WeightSection({
  weights,
  formOpen,
  busy,
  serverError,
  onToggle,
  onSubmit,
  onCancel,
  onDelete,
}: {
  weights: WeightRecord[];
  formOpen: boolean;
  busy: boolean;
  serverError: string | null;
  onToggle: () => void;
  onSubmit: (payload: WeightPayload) => void;
  onCancel: () => void;
  onDelete: (record: WeightRecord) => void;
}) {
  return (
    <Section
      title="체중 기록"
      subtitle={
        weights.length > 0
          ? `총 ${weights.length}건 · 최신순`
          : "체중 변화를 기록해 보세요."
      }
      action={
        <SectionAction
          icon={formOpen ? "close" : "plus"}
          label={formOpen ? "닫기" : "체중 기록"}
          active={formOpen}
          onClick={onToggle}
        />
      }
    >
      {formOpen && (
        <div className="mb-4">
          <WeightForm
            busy={busy}
            serverError={serverError}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </div>
      )}

      {weights.length === 0 ? (
        !formOpen && (
          <EmptyState
            icon="trend"
            title="체중 기록이 없습니다"
            description="첫 체중을 기록하고 변화를 확인해 보세요."
          />
        )
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {weights.map((record) => (
            <li
              key={record.id}
              className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-base font-bold">
                  {record.weight}
                  <span className="ml-0.5 text-2xs font-bold text-muted-foreground">
                    kg
                  </span>
                  <span className="ml-2.5 text-xs font-medium text-muted-foreground">
                    {formatDate(record.date)}
                  </span>
                </p>
                {record.memo && (
                  <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {record.memo}
                  </p>
                )}
              </div>
              <IconButton
                icon="trash"
                label={`${record.date} 체중 기록 삭제`}
                danger
                onClick={() => onDelete(record)}
              />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
