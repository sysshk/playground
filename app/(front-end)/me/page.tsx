/*
  회원 본인 화면 (서버) — 초대 링크로 연결된 내 PT 기록을 읽기 전용으로 보여 줌

  @date : 2026-09-15
*/

import { EmptyState } from "@/components/custom/empty-state";
import { requireClient } from "@/lib/auth";
import { getMyRecord, lessonLimit } from "@/lib/queries";
import {
  LessonHistory,
  NoteSection,
  NutritionPanel,
  WeightSection,
} from "../members/[memberId]/member-sections";

export default async function MyRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ lessons?: string }>;
}) {
  const [viewer, { lessons }] = await Promise.all([requireClient(), searchParams]);
  const member = await getMyRecord(viewer.id, lessonLimit(lessons));

  if (!member) {
    return (
      <EmptyState
        icon="users"
        title="연결된 기록이 없습니다"
        description="트레이너에게 초대 링크를 다시 받아 주세요."
      />
    );
  }

  const latestWeight = member.weights[0]?.weight ?? null;

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-7">
      {/* 요약 */}
      <section className="flex flex-col gap-4 rounded-2xl bg-hero px-5 py-5 text-hero-foreground sm:px-6 sm:py-6">
        <div>
          <p className="text-sm font-semibold opacity-70">{member.name}님의 PT 기록</p>
          <p className="mt-1 text-3xl font-extrabold tracking-[-0.03em]">
            남은 수업{" "}
            <span className="tabular-nums text-primary-bright">{member.remainingSessions}</span>
            <span className="ml-0.5 text-lg">회</span>
          </p>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Stat label="받은 수업" value={`${member.completionTotal}회`} />
          <Stat label="최근 체중" value={latestWeight === null ? "—" : `${latestWeight}kg`} />
          {member.targetWeight !== null && (
            <Stat label="목표 체중" value={`${member.targetWeight}kg`} />
          )}
          {member.goal && <Stat label="목표" value={member.goal} />}
        </dl>
      </section>

      <WeightSection readOnly weights={member.weights} targetWeight={member.targetWeight} />

      <LessonHistory
        readOnly
        memberId={member.id}
        completions={member.completions}
        workouts={member.workouts}
        completionTotal={member.completionTotal}
        lessonTotal={member.lessonTotal}
        lessonLimit={member.lessonLimit}
      />

      <NoteSection readOnly memberId={member.id} notes={member.notes} />

      <NutritionPanel readOnly memberId={member.id} nutrition={member.nutrition} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="opacity-60">{label}</dt>
      <dd className="font-bold tabular-nums">{value}</dd>
    </div>
  );
}
