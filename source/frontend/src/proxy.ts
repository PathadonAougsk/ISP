import { NextRequest, NextResponse } from "next/server";

const JWT_COOKIE_KEY = "jwt";

export default function proxy(request: NextRequest) {
  const token = request.cookies.get(JWT_COOKIE_KEY)?.value;

  if (!token) {
    const loginUrl = new URL("/auth", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/report/:path*", "/request-table/:path*"],
};
