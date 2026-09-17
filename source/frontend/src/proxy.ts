import { NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export default async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  if (!user) {
    const loginUrl = new URL("/auth", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/report/:path*", "/request-table/:path*", "/setting/:path*", '/announcement/:path*'],
};
