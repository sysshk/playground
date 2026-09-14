import { getNoteEditor } from "@/lib/queries";
import { requireTrainer } from "@/lib/session";
import { EditorMissing } from "../../_components/editor-frame";
import { NoteEditor } from "../_components/note-editor";

/** 새 코칭 메모 */
export default async function NewNotePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const trainer = await requireTrainer();
  const data = await getNoteEditor(memberId, trainer.id);
  const back = `/members/${memberId}`;

  if (!data) {
    return <EditorMissing back={back} title="코칭 메모" message="회원을 찾을 수 없습니다." />;
  }

  return <NoteEditor member={data.member} note={null} />;
}
