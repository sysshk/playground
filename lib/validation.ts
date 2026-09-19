/*
  공통 — 입력값 검사·다듬기 (화면 폼과 API가 같은 규칙을 씀)
  글자·숫자 다듬기, 날짜, 이메일·비밀번호, 전화번호, 체중

  @date : 2026-09-19
*/

import { kstDay } from "@/lib/kst";

// ── 글자·숫자·날짜 ─────────────────────────

/** 값을 숫자로 바꿈. 비어 있거나 숫자가 아니면 undefined. */
export function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** 문자열을 다듬음. 비면 null. */
export function toTrimmed(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** YYYY-MM 형식인지 확인함 */
export function isValidMonth(value: unknown): value is string {
  return typeof value === "string" && MONTH_PATTERN.test(value);
}

/** YYYY-MM-DD 형식인지 확인함 */
export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

/** YYYY-MM-DD이고 오늘(한국 날짜) 이후가 아님 */
export function isPastOrToday(value: unknown): value is string {
  return isValidDate(value) && value <= kstDay();
}

// ── 이메일·비밀번호 ────────────────────────

/** 로그인 아이디는 이메일. 나중에 구글 로그인과 계정을 맞추려면 이메일이어야 함 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN = 6;

export function isEmail(value: string) {
  return value.length <= 100 && EMAIL.test(value);
}

// ── 전화번호 ──────────────────────────────

/** 숫자만 남겨 010-0000-0000, 02-000-0000 모양으로 바꿈 */
const digitsOf = (value: string) => value.replace(/\D/g, "");

/** 입력 중인 값도 받음. 치는 대로 하이픈을 넣어 돌려줌 */
export function formatPhone(value: string) {
  const d = digitsOf(value).slice(0, 11);

  // 서울 지역번호 02는 두 자리
  if (d.startsWith("02")) {
    const rest = d.slice(2, 10);
    if (rest.length === 0) return d;
    if (rest.length <= 3) return `02-${rest}`;
    const mid = rest.length <= 7 ? 3 : 4;
    return `02-${rest.slice(0, mid)}-${rest.slice(mid)}`;
  }

  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  const mid = d.length <= 10 ? 3 : 4;
  return `${d.slice(0, 3)}-${d.slice(3, 3 + mid)}-${d.slice(3 + mid)}`;
}

/** 저장해도 되는 번호인지 검사 — 0으로 시작, 02는 9~10자리, 나머지는 10~11자리 */
export function validatePhone(value: string) {
  const d = digitsOf(value);
  if (!d.startsWith("0")) return false;
  return d.startsWith("02") ? d.length === 9 || d.length === 10 : d.length === 10 || d.length === 11;
}

export const PHONE_ERROR = "연락처는 010-0000-0000 형식으로 입력해 주세요.";

// ── 체중 ─────────────────────────────────

export const WEIGHT_RANGE_MESSAGE = "0보다 크고 500kg 이하로 입력해 주세요.";

/** 0 초과 500 이하의 숫자인지 */
export function isValidWeight(value: number) {
  return Number.isFinite(value) && value > 0 && value <= 500;
}
