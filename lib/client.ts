// 클라이언트에서 API를 부를 때 쓰는 얇은 래퍼
//
// next.config.ts의 basePath("/pt-manager")는 <Link>/라우터에는 자동으로 붙지만
// fetch에는 붙지 않는다. 그래서 API 호출은 항상 이 헬퍼를 거친다.

export const BASE_PATH = "/pt-manager";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_PATH}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError("네트워크 연결을 확인해 주세요.", 0);
  }

  if (!response.ok) {
    // 서버가 JSON 오류를 못 준 경우(502 등)에도 문구는 보여준다.
    const payload = await response.json().catch(() => null);
    throw new ApiError(
      payload?.error ?? "요청을 처리하지 못했습니다.",
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** public/ 자산 경로에 basePath를 붙인다. */
export function asset(path: string) {
  return `${BASE_PATH}${path}`;
}

/** API 오류에서 사용자에게 보여줄 문구를 뽑는다. */
export function errorMessage(error: unknown, fallback = "오류가 발생했습니다.") {
  return error instanceof Error ? error.message : fallback;
}

/** 오늘 날짜를 YYYY-MM-DD로 (로컬 타임존 기준) */
export function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** YYYY-MM-DD → "2026년 9월 11일" */
export function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return `${parsed.getFullYear()}년 ${parsed.getMonth() + 1}월 ${parsed.getDate()}일`;
}

/** ISO 타임스탬프 → "2026년 9월 11일" (보는 사람의 시간대 기준) */
export function formatDay(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return `${parsed.getFullYear()}년 ${parsed.getMonth() + 1}월 ${parsed.getDate()}일`;
}

/** ISO 타임스탬프 → "2026년 9월 11일 오후 3시" (시 단위까지만) */
export function formatDayHour(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  const h = parsed.getHours();
  const hour = h === 12 ? "정오" : h < 12 ? `오전 ${h}시` : `오후 ${h - 12}시`;
  return `${formatDay(iso)} ${hour}`;
}

/** ISO 타임스탬프 → "2026. 9. 11. 오후 3:20" */
export function formatDateTime(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** 고른 날짜(YYYY-MM-DD)와 시(0~23)를 차감 시각으로 바꾼다. 분·초는 0으로 둔다. */
export function completedAtFrom(date: string, hour: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, hour).toISOString();
}
