import { getNoteEditor } from "@/lib/queries";
import { requireTrainer } from "@/lib/session";
import { EditorMissing } from "../../_components/editor-frame";
import { NoteEditor } from "../_components/note-editor";

/** 코칭 메모 수정 */
export default async function EditNotePage({
  params,
}: {
  params: Promise<{ memberId: string; noteId: string }>;
}) {
  const { memberId, noteId } = await params;
  const trainer = await requireTrainer();
  const data = await getNoteEditor(memberId, trainer.id, noteId);
  const back = `/members/${memberId}`;

  if (!data) {
    return <EditorMissing back={back} title="코칭 메모" message="회원을 찾을 수 없습니다." />;
  }
  // 주소를 직접 쳐서 없는 메모로 들어온 경우
  if (!data.note) {
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
