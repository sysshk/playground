/*
  코칭 메모 작성·수정 화면 (서버) — 주소가 notes/new면 새 메모, 아니면 그 메모를 고친다

  @date : 2026-09-12
*/

import { Suspense } from "react";
import { requireTrainer } from "@/lib/auth";
import { getNoteEditor } from "@/lib/queries";
import { EditorMissing } from "../../editor-frame";
import { NoteEditor } from "./note-editor";

type Props = { params: Promise<{ memberId: string; noteId: string }>; };

export default function NotePage(props: Props) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <Screen {...props} />
    </Suspense>
  );
}

/** 작성 화면을 읽는 동안 */
function EditorSkeleton() {
  return (
    <div className="mx-auto h-[420px] w-full max-w-[720px] animate-pulse rounded-2xl border-[1.5px] border-edge bg-surface" />
  );
}

async function Screen({ params }: Props) {
  const { memberId, noteId } = await params;
  const isNew = noteId === "new";
  const trainer = await requireTrainer();
  const data = await getNoteEditor(memberId, trainer.scope, isNew ? undefined : noteId);
  const back = `/members/${memberId}`;

  if (!data) {
    return <EditorMissing back={back} title="코칭 메모" message="회원을 찾을 수 없습니다." />;
  }
  // 주소를 직접 쳐서 없는 메모로 들어온 경우
  if (!isNew && !data.note) {
    return (
      <EditorMissing
        back={back}
        title="코칭 메모"
        name={data.member.name}
        message="메모를 찾을 수 없습니다."
      />
    );
  }

  return <NoteEditor member={data.member} note={data.note} />;
}
