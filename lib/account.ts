/*
  공통 — 로그인 아이디 규칙 (초대 링크 가입 화면과 API가 같이 쓴다)
  나중에 구글 로그인과 계정을 맞추려면 아이디가 이메일이어야 한다.

  @date : 2026-09-15
*/

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN = 6;

export function isEmail(value: string) {
  return value.length <= 100 && EMAIL.test(value);
}
