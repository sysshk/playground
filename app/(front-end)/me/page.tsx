/*
  회원 본인 화면 (서버) — 초대 링크로 연결된 내 PT 기록
  수업·몸 상태는 보기만 하고, 식단·개인 운동·Q&A는 직접 씀

  @date : 2026-09-15
*/

import { EmptyState } from "@/components/custom/empty-state";
import { requireClient } from "@/lib/auth";
import { toPastDay } from "@/lib/kst";
import { getMyRecord, lessonLimit } from "@/lib/queries";
import { toMemberTab } from "@/lib/types";
import { DietSection, NutritionPanel } from "../members/[memberId]/tabs/diet-tab";
import { WeightSection } from "../members/[memberId]/tabs/inbody-tab";
import { PersonalWorkoutSection } from "../members/[memberId]/tabs/personal-tab";
import { LessonHistory, NoteSection } from "../members/[memberId]/tabs/pt-tab";
import { QuestionSection } from "../members/[memberId]/tabs/qna-tab";
import { MemberTabs } from "../members/[memberId]/tabs/tab-ui";

export default async function MyRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ lessons?: string; tab?: string; date?: string }>;
}) {
  const [viewer, { lessons, tab, date }] = await Promise.all([requireClient(), searchParams]);
  const mealDate = toPastDay(date);
  const member = await getMyRecord(viewer.id, lessonLimit(lessons), mealDate);

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
    <div className="mx-auto -mt-5 flex w-full max-w-[760px] flex-col gap-7 sm:-mt-7 lg:mt-0">
      <MemberTabs
        initial={toMemberTab(tab)}
        header={
          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface px-5 py-5 text-ink sm:px-6 sm:py-6">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">{member.name}님의 PT 기록</p>
              <p className="mt-1 text-3xl font-extrabold tracking-[-0.03em]">
                남은 수업{" "}
                <span className="tabular-nums text-primary">{member.remainingSessions}</span>
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
        }
        panels={{
          lessons: (
            <>
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
            </>
          ),
          body: (
            <>
              <WeightSection readOnly weights={member.weights} targetWeight={member.targetWeight} />
            </>
          ),
          diet: (
            <>
              <DietSection
                memberId={member.id}
                meals={member.meals}
                nutrition={member.nutrition}
                role="member"
                initialDate={mealDate}
              />
              <NutritionPanel readOnly memberId={member.id} nutrition={member.nutrition} />
            </>
          ),
          personal: <PersonalWorkoutSection editable workouts={member.personalWorkouts} />,
          qna: <QuestionSection memberId={member.id} questions={member.questions} role="member" />,
        }}
      />
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
