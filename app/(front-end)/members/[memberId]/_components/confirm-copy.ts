import { formatDate, formatDayHour } from "@/lib/client";
import type { CoachingNote, SessionCompletion, Workout } from "@/lib/types";

/** 되돌릴 수 없는 동작만 확인 창을 띄운다. 입력은 전부 화면 안에서 한다. */
export type PendingAction =
  | { type: "completeSession"; date: string; time: number; reason: string | null }
  | { type: "deleteMember" }
  | { type: "deleteWorkout"; workout: Workout }
  | { type: "deleteWeight"; id: string; date: string }
  | { type: "deleteNote"; note: CoachingNote }
  | { type: "cancelCompletion"; completion: SessionCompletion };

/** 0~23 → "오후 2시" */
function hourLabel(hour: number) {
  if (hour === 12) return "정오";
  return hour < 12 ? `오전 ${hour}시` : `오후 ${hour - 12}시`;
}

/** 확인 창에 띄울 문구 */
export function confirmCopy(pending: PendingAction | null, memberName: string) {
  switch (pending?.type) {
    case "completeSession":
      return {
        title: "수업 차감 확인",
        message: `${formatDate(pending.date)} ${hourLabel(pending.time)}, ${memberName} 회원의 수업 1회를 운동 기록 없이 차감할까요?`,
        hint: pending.reason
          ? `사유: ${pending.reason} · 남은 수업이 1회 줄고 이력에 남습니다.`
          : "남은 수업이 1회 줄고 이력에 남습니다. 되돌리려면 이력에서 되돌리기를 누르세요.",
        confirmLabel: "차감하기",
        tone: "primary" as const,
        icon: "minus" as const,
      };
    case "deleteMember":
      return {
        title: "회원 삭제",
        message: `${memberName} 회원을 삭제하시겠습니까?`,
        hint: "운동 기록과 코칭 메모까지 함께 지워지며 복구할 수 없습니다.",
      };
    case "deleteWorkout":
      return {
        title: "운동 기록 삭제",
        message: `${formatDate(pending.workout.date)} 운동 기록을 삭제하시겠습니까?`,
        hint: "삭제된 기록은 복구할 수 없습니다. 이 기록으로 차감한 수업은 그대로 남으니, 되돌리려면 수업 이력에서 되돌리기를 누르세요.",
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
        title: "수업 차감 되돌리기",
        message: `${formatDayHour(pending.completion.completedAt)} 차감을 되돌릴까요?`,
        hint: "남은 수업이 1회 늘어납니다. 연결된 운동 기록은 지워지지 않고 그대로 남습니다.",
        confirmLabel: "되돌리기",
        tone: "primary" as const,
        icon: "undo" as const,
      };
    default:
      return { title: "", message: "" };
  }
}
