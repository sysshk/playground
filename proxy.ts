import { NextResponse, type NextRequest } from "next/server";
import { SIGNUP_ENABLED } from "@/lib/config";

// 로그인하지 않은 접근을 /login으로 돌려보내는 UX용 가드다.
// 실제 권한 검사는 각 API 라우트(requireTrainerId)에서 다시 한다.
//
// auth-config는 Prisma 어댑터와 bcrypt를 쓰기 때문에 Edge 런타임에서
// 그대로 부를 수 없다. 그래서 여기서는 세션 쿠키 존재 여부만 본다.
//
// Next 16부터 middleware.ts 대신 proxy.ts 규약을 쓴다.

/** 로그인 없이 볼 수 있는 화면. "/"는 서비스 소개 겸 랜딩이라 공개한다. */
const PUBLIC_PATHS = ["/", "/login", "/join"];

/** 이미 로그인했다면 머무를 이유가 없는 화면 */
const AUTH_PATHS = ["/login", "/join"];

function hasSessionCookie(request: NextRequest) {
  return (
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token")
  );
}

export function proxy(request: NextRequest) {
  // basePath는 pathname에서 이미 벗겨진 상태로 들어온다.
  const { pathname } = request.nextUrl;
  const loggedIn = hasSessionCookie(request);

  // 가입을 닫아둔 동안은 /join 자체를 열어주지 않는다.
  if (!SIGNUP_ENABLED && pathname === "/join") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!loggedIn && !PUBLIC_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (loggedIn && AUTH_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/members";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 루트는 따로 적어야 한다. 아래 패턴은 path-to-regexp에서 빈 세그먼트에
    // 걸리지 않아 "/"가 가드를 그냥 빠져나간다.
    "/",
    // API·정적 자산·PWA 파일은 건드리지 않는다.
    // 특히 images·fonts는 비로그인 방문자가 보는 소개 페이지의 사진과 글꼴이라
    // 여기서 막으면 랜딩에 사진이 안 뜨고 글꼴이 기본 글꼴로 떨어진다.
    "/((?!api|_next/static|_next/image|images|fonts|icons|favicon.ico|manifest.json|sw.js).*)",
  ],
};
