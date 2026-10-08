"use client";

import { apiFetch, apiOrThrow, apiSendJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { cached } from "@/lib/cache";

export type AccountRole = "Lab Owner" | "Lab Admin" | "Lab User";

export type Account = {
  id: string;
  username: string;
  email: string;
  role: AccountRole;
  quota: number | null;
  active: boolean;
};

export type AccountsResponse = {
  Accounts: Account[];
};

export type AccountResponse = {
  Account: Account;
};

const ROLES: AccountRole[] = ["Lab Owner", "Lab Admin", "Lab User"];
const ADMIN_ROLES: AccountRole[] = ["Lab Owner", "Lab Admin"];

const ROLE_COOKIE = "account_role";
const ROLE_COOKIE_MAX_AGE = 60 * 60; // an hour, so a role change is picked up soon enough

// Several components (topbar, useCurrentAccount, page guards) ask for the same
// row on every mount, so hold the answer here and share one request between
// concurrent callers. Same lifetime as the role cookie.
const ME_CACHE_TTL = ROLE_COOKIE_MAX_AGE * 1000;

// Cache the promise + Cleared entry cant be re-cached by old request, it never writes here.
let me: { promise: Promise<Account | undefined>; at: number } | null = null;

function primeMeCache(account: Account | undefined) {
  me = { promise: Promise.resolve(account), at: Date.now() };
}

// Call after anything that can change the signed in user's own row.
export function clearMeCache() {
  me = null;
}

export function isAdminRole(role: AccountRole): boolean {
  return ADMIN_ROLES.includes(role);
}

// The cached role is a UI hint only - anyone can edit their own cookies, so dont trust it too much.
export function readCachedRole(): AccountRole | null {
  if (typeof document === "undefined") return null;

  const prefix = `${ROLE_COOKIE}=`;
  const hit = document.cookie
    .split("; ")
    .find((part) => part.startsWith(prefix));
  const value = hit && decodeURIComponent(hit.slice(prefix.length));

  return ROLES.find((role) => role === value) ?? null;
}

export function cacheRole(role: AccountRole) {
  if (typeof document === "undefined") return;

  document.cookie = `${ROLE_COOKIE}=${encodeURIComponent(role)}; path=/; max-age=${ROLE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearCachedRole() {
  clearMeCache();
  getAccounts.clear();

  if (typeof document === "undefined") return;

  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

const ACCOUNTS_CACHE_TTL = 60 * 1000;

async function fetchAccounts(): Promise<AccountsResponse> {
  const res = await apiFetch("/account/");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const getAccounts = cached(fetchAccounts, ACCOUNTS_CACHE_TTL);

// Creates the caller's own row. An invited member has an auth user but no
// account row until they pick a username, so this is step one of setup.
export async function createMyAccount(username: string): Promise<Account> {
  const res = await apiSendJson("/account/", "POST", { username });
  await apiOrThrow(res, "Could not finish setting up your account.");

  const { Account: account } = (await res.json()) as AccountResponse;
  cacheRole(account.role);
  primeMeCache(account);
  getAccounts.clear(); 

  return account;
}

export async function getAccount(userId: string): Promise<Account | undefined> {
  return (await getAccounts()).Accounts.find((user) => user.id === userId);
}

// The signed in user's own account row, straight from /account/{account_id}.
// Cached - pass { force: true } to go back to the network.
export function getMe({ force = false }: { force?: boolean } = {}): Promise<
  Account | undefined
> {
  if (force) clearMeCache();

  if (me && Date.now() - me.at < ME_CACHE_TTL) return me.promise;

  const entry = { promise: fetchMe(), at: Date.now() };
  me = entry;
  // failed request should not stay cached
  entry.promise.catch(() => {
    if (me === entry) me = null;
  });

  return entry.promise;
}

async function fetchMe(): Promise<Account | undefined> {
  const {
    data: { session },
  } = await createClient().auth.getSession();

  if (!session) return undefined;

  const res = await apiFetch(`/account/${session.user.id}`);
  let account: Account | undefined;

  if (res.ok) {
    account = ((await res.json()) as AccountResponse).Account;
  } else if (res.status === 404) {
    // A row that is not keyed to the auth id still has to be findable by email.
    const { Accounts } = await getAccounts();
    account = Accounts.find((user) => user.email === session.user.email);
  } else {
    throw new Error(`HTTP ${res.status}`);
  }

  if (account) cacheRole(account.role);

  return account;
}

// Reads the cookie first, and only falls back to the network on a cold start.
export async function isAdmin(): Promise<boolean> {
  const cached = readCachedRole();

  if (cached) return isAdminRole(cached);

  const account = await getMe();

  return account ? isAdminRole(account.role) : false;
}

export type UserRole = "Lab Admin" | "Lab User";

export type Member = { id: string; name: string; email: string };

export function mapAccountToMember(account: Account): Member {
  return { id: account.id, name: account.username, email: account.email };
}

export type AccountPatch = {
  username?: string;
  quota?: number | null;
  active?: boolean;
};

// Same ending for every write: check the response, then drop the cache.
// Cheaper to drop the cache than to work out whether this was our own row.
async function mutate(request: Promise<Response>, fallback: string) {
  await apiOrThrow(await request, fallback);
  clearMeCache();
  getAccounts.clear(); 
}

// Only the keys present in `patch` are written - see UpdateAccountRequest.
export function updateAccount(
  accountId: string,
  patch: AccountPatch,
): Promise<void> {
  return mutate(
    apiSendJson(`/account/${accountId}`, "PUT", patch),
    "Could not update that account.",
  );
}

export function assignRole(
  accountId: string,
  role: AccountRole,
): Promise<void> {
  return mutate(
    apiSendJson(`/account/${accountId}/role`, "PUT", { role }),
    "Could not change that role.",
  );
}

export function deleteAccount(accountId: string): Promise<void> {
  return mutate(
    apiFetch(`/account/${accountId}`, { method: "DELETE" }),
    "Could not delete that account.",
  );
}

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

// No account yet - still loading, disabled, or signed out. Fails closed on isAdmin.
const SIGNED_OUT = {
  signedIn: false,
  loading: false,
  account: null,
  userRole: "Lab User",
  currentUserId: "",
  isAdmin: false,
} as const;

// Load once on mount, ignore result if unmounted. Pass a stable function.
function useFetched<T>(load: () => Promise<T>, enabled: boolean = true) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    load()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : "Failed to load",
          });
      });

    return () => {
      cancelled = true;
    };
  }, [load, enabled]);

  return state;
}

// Resolves the signed in user against the account table, which is where the username lives - the Supabase access token only carries the id and email.
export function useCurrentAccount(enabled: boolean = true): CurrentAccount {
  const { data: account, loading } = useFetched(getMe, enabled);

  if (!account) return { ...SIGNED_OUT, loading: enabled && loading };

  // "Lab Owner" and "Lab Admin" both count as admin
  const admin = isAdminRole(account.role);

  return {
    signedIn: true,
    loading: false,
    account,
    userRole: admin ? "Lab Admin" : "Lab User",
    currentUserId: account.id,
    isAdmin: admin,
  };
}

export function useMembers() {
  const { data, loading, error } = useFetched(getAccounts);
  const members = useMemo(
    () => data?.Accounts.map(mapAccountToMember) ?? [],
    [data],
  );

  return { members, membersLoading: loading, membersError: error };
}
