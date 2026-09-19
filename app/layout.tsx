/*
  최상위 레이아웃 — 메타데이터, 글꼴, 테마 스크립트

  @date : 2025-12-10
*/

import type { Metadata, Viewport } from "next";
import { THEME_SCRIPT } from "@/components/custom/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "PT 매니저",
  description: "개인 트레이너를 위한 회원 및 운동기록 관리 앱",
  // basePath가 붙어 있어 manifest/아이콘 경로는 직접 지정함
  manifest: "/pt-manager/manifest.json",
  appleWebApp: {
    capable: true,
    title: "PT 매니저",
    statusBarStyle: "default",
  },
  // 파비콘은 브라우저가 오래 캐시함. 로고를 바꾸면 v를 올려야 탭 아이콘이 바뀜
  icons: {
    icon: "/pt-manager/favicon.ico?v=2",
    apple: "/pt-manager/icons/apple-touch-icon.png?v=2",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // 아이폰에서 16px 미만 입력칸을 누를 때 화면이 확대되는 것 막음
  colorScheme: "light dark", // 폰 브라우저가 다크 모드로 색을 강제로 바꾸지 않게 함
  themeColor: "#f7f8fa", // 브라우저 윗줄 색. 다크로 고르면 테마 스크립트가 바꿈
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Pretendard를 직접 호스팅함. 동적 서브셋이라 92개 파일로 쪼개져 있고, */}
        {/* eslint-disable-next-line @next/next/no-css-tags -- 92개 서브셋 파일을 참조하는 */}
        <link rel="stylesheet" href="/pt-manager/fonts/pretendard.css" />
        {/* 저장해 둔 테마를 첫 페인트 전에 입혀 화면이 번쩍이지 않게 함 */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
