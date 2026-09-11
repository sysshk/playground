"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "./ui";

// Chromium 계열에서만 쏘는 비표준 이벤트라 직접 타입을 잡는다.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type IosNavigator = Navigator & { standalone?: boolean };

// appinstalled가 떠도 그 순간에는 아직 브라우저 탭이라 display-mode가 바뀌지 않는다.
// 그래서 설치 사실을 모듈 단위 플래그로 따로 기억한다.
let appInstalled = false;

function subscribeInstalled(onChange: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  const onAppInstalled = () => {
    appInstalled = true;
    onChange();
  };

  query.addEventListener("change", onChange);
  window.addEventListener("appinstalled", onAppInstalled);
  return () => {
    query.removeEventListener("change", onChange);
    window.removeEventListener("appinstalled", onAppInstalled);
  };
}

function getInstalled() {
  return (
    appInstalled ||
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as IosNavigator).standalone === true
  );
}

const noopSubscribe = () => () => {};

export default function InstallPrompt() {
  // 브라우저에만 있는 값이라 useSyncExternalStore로 읽는다 (서버에서는 false).
  const installed = useSyncExternalStore(
    subscribeInstalled,
    getInstalled,
    () => false,
  );
  const isIos = useSyncExternalStore(
    noopSubscribe,
    () => /iphone|ipad|ipod/i.test(window.navigator.userAgent),
    () => false,
  );

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // 브라우저 기본 배너 대신 우리 버튼으로 유도
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferredPrompt(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null); // 프롬프트는 한 번만 쓸 수 있다.
  };

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
      <div className="flex items-start gap-3">
        <span className="text-[26px]" aria-hidden="true">
          📱
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-bold tracking-tight">
            {installed
              ? "PT 매니저 앱으로 실행 중"
              : "PT 매니저를 홈 화면에 설치하세요"}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            {installed
              ? "홈 화면에서 빠르게 열고 앱처럼 사용할 수 있습니다."
              : "브라우저 없이 빠르게 열고 전체 화면 앱처럼 사용할 수 있습니다."}
          </p>

          {!installed &&
            (deferredPrompt ? (
              <Button variant="outline" onClick={handleInstall} className="mt-4">
                앱 설치
              </Button>
            ) : isIos ? (
              <p className="mt-3 rounded-xl bg-primary-light px-3.5 py-3 text-[13px] leading-relaxed text-primary-dark">
                Safari의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하세요.
              </p>
            ) : (
              <p className="mt-3 text-[12px] text-muted">
                브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요.
              </p>
            ))}
        </div>
      </div>
    </section>
  );
}
