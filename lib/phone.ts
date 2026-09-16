/*
  공통 — 전화번호 모양 맞추기 (회원 등록·내 정보 화면과 API가 같이 씀)
  숫자만 남겨 010-0000-0000, 02-000-0000 모양으로 바꿈

  @date : 2026-09-17
*/

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
