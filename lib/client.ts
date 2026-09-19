/*
  화면 공통 — API 호출 헬퍼와 날짜·시각 표기
  basePath(/pt-manager)가 fetch에는 자동으로 안 붙어서 API 호출은 항상 apiFetch를 거침
  표기는 한국 시각 기준이라 서버(UTC)에서 그려도 브라우저와 같은 글자가 나옴

  @date : 2026-09-12
*/

import { kstDay, kstHour, kstIso } from "@/lib/kst";

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
    // 서버가 JSON 오류를 못 준 경우(502 등)에도 문구는 보여줌
    const payload = await response.json().catch(() => null);
    throw new ApiError(
      payload?.error ?? "요청을 처리하지 못했습니다.",
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** public/ 자산 경로에 basePath를 붙임 */
export function asset(path: string) {
  return `${BASE_PATH}${path}`;
}

/** API 오류에서 사용자에게 보여줄 문구를 뽑음 */
export function errorMessage(error: unknown, fallback = "오류가 발생했습니다.") {
  return error instanceof Error ? error.message : fallback;
}

/** 오늘 한국 날짜 YYYY-MM-DD */
export function today() {
  return kstDay();
}

/** YYYY-MM-DD → "2026년 9월 11일" */
export function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return `${parsed.getFullYear()}년 ${parsed.getMonth() + 1}월 ${parsed.getDate()}일`;
}

/** ISO 타임스탬프 → "2026년 9월 11일 오후 3시" (한국 시각) */
export function formatDayHour(iso: string) {
  if (!isValidIso(iso)) return iso;
  return `${formatDate(kstDay(iso))} ${formatHourLabel(kstHour(iso))}`;
}

/** 0~23 → "오전 9시" / "정오" / "오후 2시" */
export function formatHourLabel(hour: number) {
  if (hour === 12) return "정오";
  return hour < 12 ? `오전 ${hour}시` : `오후 ${hour - 12}시`;
}

/** 요일 글자. getDay() 순서(일요일부터) */
export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 목록에 쓰는 짧은 날짜 — "9월 11일 (목)". 올해가 아닐 때만 연도를 붙임 */
function shortLabel(parsed: Date) {
  const year =
    String(parsed.getFullYear()) === kstDay().slice(0, 4)
      ? ""
      : `${parsed.getFullYear()}년 `;
  return `${year}${parsed.getMonth() + 1}월 ${parsed.getDate()}일 (${WEEKDAYS[parsed.getDay()]})`;
}

/** YYYY-MM-DD → "9월 11일 (목)" */
export function formatDateShort(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : shortLabel(parsed);
}

/** ISO 타임스탬프 → "9월 11일 (목)" (한국 날짜) */
export function formatDayShort(iso: string) {
  return isValidIso(iso) ? formatDateShort(kstDay(iso)) : iso;
}

/** ISO 타임스탬프 → "오후 3시" (한국 시각) */
export function formatHour(iso: string) {
  return isValidIso(iso) ? formatHourLabel(kstHour(iso)) : "";
}

/** 고른 한국 날짜(YYYY-MM-DD)와 시(0~23)를 수업 시각으로 바꿈. 분·초는 0으로 둠 */
export function completedAtFrom(date: string, hour: number) {
  return kstIso(date, hour);
}

function isValidIso(iso: string) {
  return !Number.isNaN(new Date(iso).getTime());
}
