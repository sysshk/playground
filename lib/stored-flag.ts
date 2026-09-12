"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * 이 브라우저에만 남기는 켜짐/꺼짐 값.
 *
 * 사이드바 접기처럼 서버가 알 필요 없는 개인 취향에 쓴다. React 상태로
 * 복제해 두면 서버가 그린 화면과 어긋나므로 외부 저장소로 보고 읽는다.
 */

const listeners = new Map<string, Set<() => void>>();

function subscribe(key: string, notify: () => void) {
  const set = listeners.get(key) ?? new Set<() => void>();
  set.add(notify);
  listeners.set(key, set);
  // 다른 탭에서 바꾼 경우
  window.addEventListener("storage", notify);
  return () => {
    set.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

export function useStoredFlag(key: string, fallback = false) {
  const value = useSyncExternalStore(
    useCallback((notify: () => void) => subscribe(key, notify), [key]),
    useCallback(() => {
      try {
        const saved = localStorage.getItem(key);
        return saved === null ? fallback : saved === "1";
      } catch {
        // 저장소가 막힌 환경
        return fallback;
      }
    }, [key, fallback]),
    // 서버에는 저장값이 없다. 붙고 나서 진짜 값으로 다시 그린다.
    useCallback(() => fallback, [fallback]),
  );

  const setValue = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // 저장이 막혀 있으면 이번 세션에만 적용된다.
      }
      listeners.get(key)?.forEach((notify) => notify());
    },
    [key],
  );

  return [value, setValue] as const;
}
