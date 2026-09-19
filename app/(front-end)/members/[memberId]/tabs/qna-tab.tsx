/*
  회원 상세·내 기록 화면 — Q&A 탭
  회원이 묻고 트레이너가 답함. 질문 하나에 답 하나

  @date : 2026-09-19
*/

"use client";

import { useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { EmptyState } from "@/components/custom/empty-state";
import { Button } from "@/components/ui/button";
import { formatDayShort } from "@/lib/client";
import { ANSWER_MAX, QUESTION_MAX, type Question } from "@/lib/types";
import { IconButton, Section, useSave } from "./tab-ui";

// ── Q&A ─────────────────────────────────

/** 회원이 묻고 트레이너가 답함. 질문 하나에 답 하나 */
export function QuestionSection({
  memberId,
  questions,
  role,
}: {
  memberId: string;
  questions: Question[];
  /** member면 질문을 올리고, trainer면 답을 닮 */
  role: "member" | "trainer";
}) {
  const { run, busy } = useSave();
  const [draft, setDraft] = useState("");
  const [removing, setRemoving] = useState<Question | null>(null);
  const waiting = questions.filter((q) => !q.answer).length;

  const ask = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const ok = await run(
      "/api/me/questions",
      { method: "POST", body: JSON.stringify({ body: draft }) },
      "질문을 올렸습니다. 트레이너가 답하면 여기에 보입니다.",
      "질문을 올리지 못했습니다.",
    );
    if (ok) setDraft("");
  };

  return (
    <Section
      title="Q&A"
      subtitle={
        questions.length > 0
          ? `총 ${questions.length}건${waiting ? ` · 답변 대기 ${waiting}건` : ""}`
          : role === "member"
            ? "운동·식단 등 궁금한 것을 트레이너에게 물어보세요."
            : "회원이 남긴 질문이 여기에 보입니다."
      }
    >
      {/* 질문 쓰기 */}
      {role === "member" && (
        <form onSubmit={ask} className="flex flex-col gap-2">
          <textarea
            className="h-24 w-full resize-none rounded-xl border-[1.5px] border-edge bg-field px-3.5 py-3 text-base outline-none transition-colors placeholder:text-subtle focus:border-primary"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={QUESTION_MAX}
            placeholder="예) 스쿼트할 때 무릎이 안으로 모여요. 어떻게 고치면 좋을까요?"
            aria-label="질문"
          />
          <Button
            type="submit"
            loading={busy}
            disabled={!draft.trim()}
            className="self-end px-5"
          >
            질문 올리기
          </Button>
        </form>
      )}

      {questions.length === 0 ? (
        <EmptyState
          icon="clipboard"
          title="아직 질문이 없습니다"
          description={
            role === "member"
              ? "궁금한 것을 남기면 트레이너가 답을 달아 드립니다."
              : "회원이 앱에서 질문을 남기면 여기에 보입니다."
          }
        />
      ) : (
        <ul className="flex flex-col">
          {questions.map((question) => (
            <QuestionItem
              key={question.id}
              memberId={memberId}
              question={question}
              role={role}
              busy={busy}
              run={run}
              onRemove={() => setRemoving(question)}
            />
          ))}
        </ul>
      )}

      {role === "member" && (
        <ConfirmDialog
          open={removing !== null}
          busy={busy}
          title="질문 삭제"
          message="이 질문을 삭제하시겠습니까?"
          hint="답이 달리기 전까지만 지울 수 있습니다."
          onConfirm={async () => {
            if (!removing) return;
            await run(
              `/api/me/questions/${removing.id}`,
              { method: "DELETE" },
              "질문을 삭제했습니다.",
              "질문 삭제에 실패했습니다.",
            );
            setRemoving(null);
          }}
          onCancel={() => setRemoving(null)}
        />
      )}
    </Section>
  );
}

function QuestionItem({
  memberId,
  question,
  role,
  busy,
  run,
  onRemove,
}: {
  memberId: string;
  question: Question;
  role: "member" | "trainer";
  busy: boolean;
  run: ReturnType<typeof useSave>["run"];
  onRemove: () => void;
}) {
  // 트레이너가 답을 쓰는 칸. 답이 없으면 처음부터 펼쳐 둠
  const [answering, setAnswering] = useState(
    role === "trainer" && !question.answer,
  );
  const [answer, setAnswer] = useState(question.answer ?? "");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    const ok = await run(
      `/api/members/${memberId}/questions/${question.id}`,
      { method: "PATCH", body: JSON.stringify({ answer }) },
      question.answer ? "답변을 고쳤습니다." : "답변을 달았습니다.",
      "답변을 저장하지 못했습니다.",
    );
    if (ok) setAnswering(false);
  };

  return (
    <li className="flex flex-col gap-2.5 border-b border-line py-4 first:pt-0 last:border-0 last:pb-0">
      {/* 질문 */}
      <div className="flex items-start gap-2.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-raised text-xs font-extrabold text-muted-foreground">
          Q
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed">
            {question.body}
          </p>
          <p className="text-2xs font-semibold text-subtle">
            {formatDayShort(question.createdAt)}
          </p>
        </div>
        {role === "member" && !question.answer && (
          <IconButton
            icon="trash"
            label="질문 삭제"
            danger
            disabled={busy}
            onClick={onRemove}
          />
        )}
      </div>

      {/* 답 */}
      {answering ? (
        <form onSubmit={submit} className="ml-8 flex flex-col gap-2">
          <textarea
            className="h-24 w-full resize-none rounded-xl border-[1.5px] border-edge bg-field px-3.5 py-3 text-base outline-none transition-colors placeholder:text-subtle focus:border-primary"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={ANSWER_MAX}
            placeholder="답변을 적어 주세요."
            aria-label="답변"
          />
          <div className="flex justify-end gap-2">
            {question.answer && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setAnswering(false)}
              >
                취소
              </Button>
            )}
            <Button
              type="submit"
              loading={busy}
              disabled={!answer.trim()}
              className="px-5"
            >
              {question.answer ? "답변 고치기" : "답변 달기"}
            </Button>
          </div>
        </form>
      ) : question.answer ? (
        <div className="ml-8 flex items-start gap-2.5 rounded-xl bg-primary-light/50 px-3 py-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
            A
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {question.answer}
            </p>
            {question.answeredAt && (
              <p className="text-2xs font-semibold text-subtle">
                {formatDayShort(question.answeredAt)}
              </p>
            )}
          </div>
          {role === "trainer" && (
            <IconButton
              icon="pencil"
              label="답변 고치기"
              onClick={() => setAnswering(true)}
            />
          )}
        </div>
      ) : (
        <p className="ml-8 text-xs font-bold text-warning">답변 대기 중</p>
      )}
    </li>
  );
}
