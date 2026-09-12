import { formatDate, formatDayHour } from "@/lib/client";
import type { CoachingNote, SessionCompletion, Workout } from "@/lib/types";

/** 되돌릴 수 없는 동작만 확인 창을 띄운다. 입력은 전부 화면 안에서 한다. */
export type PendingAction =
  | { type: "deleteMember" }
  | { type: "deleteWorkout"; workout: Workout; completionId?: string }
  | { type: "deleteWeight"; id: string; date: string }
  | { type: "deleteNote"; note: CoachingNote }
  | { type: "cancelCompletion"; completion: SessionCompletion };

/** 확인 창에 띄울 문구 */
export function confirmCopy(pending: PendingAction | null, memberName: string) {
  switch (pending?.type) {
    case "deleteMember":
      return {
        title: "회원 삭제",
        message: `${memberName} 회원을 삭제하시겠습니까?`,
        hint: "운동 기록과 코칭 메모까지 함께 지워지며 복구할 수 없습니다.",
      };
    case "deleteWorkout":
      return {
        title: "수업 기록 삭제",
        message: `${formatDate(pending.workout.date)} 수업 기록을 삭제하시겠습니까?`,
        hint: pending.completionId
          ? "종목과 세트가 지워지고 남은 수업이 1회 늘어납니다. 복구할 수 없습니다."
          : "삭제된 기록은 복구할 수 없습니다.",
      };
    case "deleteWeight":
      return {
        title: "체중 기록 삭제",
        message: `${formatDate(pending.date)} 체중 기록을 삭제하시겠습니까?`,
        hint: "삭제된 기록은 복구할 수 없습니다.",
      };
    case "deleteNote":
      return {
        title: "코칭 메모 삭제",
        message: `${formatDate(pending.note.date)} 코칭 메모를 삭제하시겠습니까?`,
        hint: "삭제된 메모는 복구할 수 없습니다.",
      };
    case "cancelCompletion":
      return {
        title: "수업 기록 삭제",
        message: `${formatDayHour(pending.completion.completedAt)} 수업 기록을 삭제하시겠습니까?`,
        hint: "남은 수업이 1회 늘어납니다.",
      };
    default:
      return { title: "", message: "" };
  }
}
