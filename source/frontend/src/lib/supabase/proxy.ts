import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// Refreshes the jwt when it expires, and says who the caller is.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Incase jwt expires if it does change jwt to a new one
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        // Also in the upcoming request change the jwt of them too.
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getClaims checks the signature here with the project's public keys, which
  // supabase-js fetches once and caches, instead of asking Supabase who this
  // is on every guarded navigation. It still goes through the session first,
  // so an expired jwt is refreshed and set above exactly as before.
  const { data } = await supabase.auth.getClaims();

  return { response, claims: data?.claims ?? null };
}
