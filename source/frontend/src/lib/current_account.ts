"use client";

import { getMe, isAdminRole, type Account, type UserRole } from "@/lib/account";
import { useEffect, useState } from "react";

export type CurrentAccount =
  | {
      signedIn: false;
      loading: boolean;
      account: null;
      userRole: "Lab User";
      currentUserId: "";
      isAdmin: false;
    }
  | {
      signedIn: true;
      loading: false;
      account: Account;
      userRole: UserRole;
      currentUserId: string;
      isAdmin: boolean;
    };

// Resolves the signed in user against the account table, which is where the username lives - the Supabase access token only carries the id and email.
export function useCurrentAccount(enabled: boolean = true): CurrentAccount {
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

  // No account yet - still loading, disabled, or signed out. Fails closed on isAdmin.
  if (!account) {
    return {
      signedIn: false,
      loading: enabled && loading,
      account: null,
      userRole: "Lab User",
      currentUserId: "",
      isAdmin: false,
    };
  }

  // "Lab Owner" and "Lab Admin" both count as admin
  const isAdmin = isAdminRole(account.role);

  return {
    signedIn: true,
    loading: false,
    account,
    userRole: isAdmin ? "Lab Admin" : "Lab User",
    currentUserId: account.id,
    isAdmin,
  };
}
