"use client";

import { getMe, isAdminRole, type Account, type UserRole } from "@/lib/account";
import { useEffect, useState } from "react";

// Resolves the signed in user against the account table, which is where the username lives - the Supabase access token only carries the id and email.
export function useCurrentAccount(enabled: boolean = true) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    getMe()
      .then((found) => {
        if (!cancelled) setAccount(found ?? null);
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // "Lab Owner" and "Lab Admin" both count as admin; no account falls back to Lab User
  const userRole: UserRole =
    account && isAdminRole(account.role) ? "Lab Admin" : "Lab User";
  const currentUserId = account?.id ?? "";

  return { account, loading: enabled && loading, userRole, currentUserId };
}
