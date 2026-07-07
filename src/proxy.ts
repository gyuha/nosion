import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// 세션 쿠키가 없으면 보호 경로 접근 시 /login으로 리다이렉트한다.
// (쿠키 존재 여부만 보는 낙관적 검사이며, 실제 세션 검증은 페이지에서 수행한다.)
export default function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/p/:path*"],
};
