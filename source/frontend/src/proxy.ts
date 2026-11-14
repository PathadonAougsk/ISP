import { NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export default async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);

  if (!claims) {
    const loginUrl = new URL("/auth", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/report/:path*", "/request-table/:path*", "/setting/:path*", '/announcement/:path*'],
};
