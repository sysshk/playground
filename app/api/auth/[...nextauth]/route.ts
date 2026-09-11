import type { NextRequest } from "next/server";
import { handlers } from "@/app/api/auth/auth-config";

// "로그인 유지"를 체크하지 않고 로그인하면 세션 쿠키를 브라우저 세션 쿠키로 바꾼다.
//
// Auth.js는 세션 쿠키 만료를 maxAge(기본 30일) 하나로만 정하고, 로그인할 때와
// 세션을 새로 고칠 때(/api/auth/session)마다 Expires를 다시 붙인다. 사용자별로
// 다르게 줄 설정이 없어서 이 라우트의 응답에서 Expires/Max-Age를 걷어낸다.
// 그러면 브라우저를 닫을 때 쿠키가 지워진다.
//
// 어느 세션이 "유지 안 함"인지는 표시 쿠키로 기억한다. 표시 쿠키도 브라우저
// 세션 쿠키라 세션 토큰과 함께 사라진다. auth()는 서버 컴포넌트·API에서 쿠키를
// 쓰지 않으므로 세션 쿠키를 내려보내는 곳은 이 라우트뿐이다.

const SESSION_ONLY_COOKIE = "pt.session-only";
const SESSION_TOKEN = /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?=([^;]*)/;

/** 값이 있는 세션 토큰 쿠키인가. 로그아웃 때 내려오는 삭제용 쿠키(값이 빈)는 건드리면 안 된다. */
function isLiveSessionCookie(cookie: string) {
  const match = cookie.match(SESSION_TOKEN);
  return match !== null && match[1] !== "";
}

function withoutExpiry(cookie: string) {
  return cookie.replace(/;\s*(?:expires|max-age)=[^;]*/gi, "");
}

function sessionOnlyMarker(on: boolean, secure: boolean) {
  const attrs = `Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
  return on
    ? `${SESSION_ONLY_COOKIE}=1; ${attrs}`
    : `${SESSION_ONLY_COOKIE}=; ${attrs}; Max-Age=0`;
}

async function handle(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response>,
) {
  const isLogin =
    req.method === "POST" &&
    req.nextUrl.pathname.endsWith("/callback/credentials");

  // 로그인 요청이면 이번에 체크한 값을, 아니면 로그인할 때 남긴 표시를 따른다.
  const sessionOnly = isLogin
    ? (await req.clone().formData()).get("remember") !== "true"
    : req.cookies.has(SESSION_ONLY_COOKIE);

  const res = await handler(req);
  const cookies = res.headers.getSetCookie();

  // 로그인 실패·로그아웃처럼 세션 토큰을 새로 주지 않는 응답은 그대로 보낸다.
  if (!cookies.some(isLiveSessionCookie)) return res;
  if (!isLogin && !sessionOnly) return res;

  const headers = new Headers(res.headers);
  headers.delete("set-cookie");
  for (const cookie of cookies) {
    headers.append(
      "set-cookie",
      sessionOnly && isLiveSessionCookie(cookie) ? withoutExpiry(cookie) : cookie,
    );
  }
  if (isLogin) {
    headers.append(
      "set-cookie",
      sessionOnlyMarker(sessionOnly, req.nextUrl.protocol === "https:"),
    );
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export const GET = (req: NextRequest) => handle(req, handlers.GET);
export const POST = (req: NextRequest) => handle(req, handlers.POST);
