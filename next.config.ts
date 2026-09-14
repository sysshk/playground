import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/pt-manager",

  // 정적 자산 캐시
  async headers() {
    return [
      {
        // 글꼴은 바꾸지 않는다. 바꿀 일이 생기면 파일 이름을 바꿔야 새로 받는다.
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
