"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * 라이트/다크 모드.
 *
 * 켜고 끄는 스위치 하나로 다룬다. 처음 열면 기기 설정을 따르고, 한 번이라도
 * 직접 켜거나 끄면 그 뒤로는 고른 값을 지킨다. 고른 값은 이 브라우저에만 남는다.
 *
 * 값의 출처는 localStorage 하나다. React 상태로 복제해 두면 서버가 그린
 * 화면과 어긋나므로, 외부 저장소로 보고 useSyncExternalStore로 읽는다.
 */

const STORAGE_KEY = "pt.theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * 첫 페인트 전에 실행해 화면이 번쩍이는 것을 막는다.
 * 이 문자열을 layout의 <script>에 그대로 넣는다.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("${DARK_QUERY}").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

// 같은 탭 안에서 바뀐 것도 알려야 해서 구독자를 직접 들고 있는다.
// storage 이벤트는 다른 탭에서 바꾼 경우에만 날아온다.
let listeners: (() => void)[] = [];

function subscribe(notify: () => void) {
  listeners.push(notify);
  window.addEventListener("storage", notify);
  const query = window.matchMedia(DARK_QUERY);
  // 아직 직접 고르지 않았다면 기기 설정을 따라간다.
  query.addEventListener("change", notify);
  return () => {
    listeners = listeners.filter((l) => l !== notify);
    window.removeEventListener("storage", notify);
    query.removeEventListener("change", notify);
  };
}

/** 지금 다크인가. 저장값이 없으면 기기 설정을 본다. */
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

/** 서버에는 저장값도 기기 설정도 없다. 붙고 나서 진짜 값으로 다시 그린다. */
function getServerSnapshot() {
  return false;
}

export function useTheme() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setDark = useCallback((next: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // 저장이 막혀 있으면 이번 세션에만 적용된다.
    }
    document.documentElement.classList.toggle("dark", next);
    listeners.forEach((notify) => notify());
  }, []);

  return { dark, setDark };
}
