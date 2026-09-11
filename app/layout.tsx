import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PT 매니저",
  description: "개인 트레이너를 위한 회원 및 운동기록 관리 앱",
  // basePath가 붙어 있어 manifest/아이콘 경로는 직접 지정한다.
  manifest: "/pt-manager/manifest.json",
  appleWebApp: {
    capable: true,
    title: "PT 매니저",
    statusBarStyle: "default",
  },
  // 파비콘은 브라우저가 오래 캐시한다. 로고를 바꾸면 v를 올려야 탭 아이콘이 바뀐다.
  icons: {
    icon: "/pt-manager/favicon.svg?v=2",
    apple: "/pt-manager/icons/apple-touch-icon.png?v=2",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/*
          Pretendard를 직접 호스팅한다. 동적 서브셋이라 92개 파일로 쪼개져 있고,
          브라우저는 unicode-range를 보고 실제로 쓰는 글자 범위만 내려받는다.
          외부 CDN에 의존하지 않아 PWA로 설치했을 때도 안정적이다.
        */}
        {/* eslint-disable-next-line @next/next/no-css-tags -- 92개 서브셋 파일을 참조하는
            서드파티 CSS라 next/font나 번들 import로는 다룰 수 없다. */}
        <link rel="stylesheet" href="/pt-manager/fonts/pretendard.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
