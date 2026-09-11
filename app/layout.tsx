import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

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
  icons: {
    icon: "/pt-manager/favicon.svg",
    apple: "/pt-manager/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={outfit.variable}>{children}</body>
    </html>
  );
}
