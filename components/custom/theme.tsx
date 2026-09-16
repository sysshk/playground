/*
  공통 — 라이트/다크 모드 (첫 페인트 전 테마 스크립트, useTheme)

  @date : 2026-09-12
*/

"use client";

import { useCallback, useSyncExternalStore } from "react";

/** 라이트/다크 모드. */

const STORAGE_KEY = "pt.theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * 첫 페인트 전에 실행해 화면이 번쩍이는 것을 막음
 * 이 문자열을 layout의 <script>에 그대로 넣음
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("${DARK_QUERY}").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

// 같은 탭 안에서 바뀐 것도 알려야 해서 구독자를 직접 들고 있음
// storage 이벤트는 다른 탭에서 바꾼 경우에만 날아옴
let listeners: (() => void)[] = [];

function subscribe(notify: () => void) {
  listeners.push(notify);
  window.addEventListener("storage", notify);
  const query = window.matchMedia(DARK_QUERY);
  // 아직 직접 고르지 않았다면 기기 설정을 따라감
  query.addEventListener("change", notify);
  return () => {
    listeners = listeners.filter((l) => l !== notify);
    window.removeEventListener("storage", notify);
    query.removeEventListener("change", notify);
  };
}

/** 지금 다크인가. 저장값이 없으면 기기 설정을 봄 */
function getSnapshot() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark") return true;
    if (saved === "light") return false;
  } catch {
    // 시크릿 모드 등 저장소가 막힌 환경
  }
  return window.matchMedia(DARK_QUERY).matches;
}

/** 서버에는 저장값도 기기 설정도 없음. 붙고 나서 진짜 값으로 다시 그림 */
function getServerSnapshot() {
  return false;
}

export function useTheme() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setDark = useCallback((next: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // 저장이 막혀 있으면 이번 세션에만 적용됨
    }
    document.documentElement.classList.toggle("dark", next);
    listeners.forEach((notify) => notify());
  }, []);

  return { dark, setDark };
}
