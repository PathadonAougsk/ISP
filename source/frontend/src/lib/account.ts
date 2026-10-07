"use client";

import { apiFetch, apiOrThrow, apiSendJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

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

const ADMIN_ROLES: AccountRole[] = ["Lab Owner", "Lab Admin"];

const ROLE_COOKIE = "account_role";
const ROLE_COOKIE_MAX_AGE = 60 * 60; // an hour, so a role change is picked up soon enough

// Several components (topbar, useCurrentAccount, page guards) ask for the same
// row on every mount, so hold the answer here and share one request between
// concurrent callers. Same lifetime as the role cookie.
const ME_CACHE_TTL = ROLE_COOKIE_MAX_AGE * 1000;

let meCache: { account: Account | undefined; at: number } | null = null;
let meInFlight: Promise<Account | undefined> | null = null;
// Bumped on every invalidation, so a request that was already out cannot come
// back and re-cache a row we have just been told is stale.
let meGeneration = 0;

function primeMeCache(account: Account | undefined) {
  meCache = { account, at: Date.now() };
}

// Call after anything that can change the signed in user's own row.
export function clearMeCache() {
  meCache = null;
  meInFlight = null;
  meGeneration += 1;
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
  const value = hit ? decodeURIComponent(hit.slice(prefix.length)) : null;

  return value === "Lab Owner" || value === "Lab Admin" || value === "Lab User"
    ? value
    : null;
}

export function cacheRole(role: AccountRole) {
  if (typeof document === "undefined") return;

  document.cookie = `${ROLE_COOKIE}=${encodeURIComponent(role)}; path=/; max-age=${ROLE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearCachedRole() {
  clearMeCache();

  if (typeof document === "undefined") return;

  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export async function getAccounts(): Promise<AccountsResponse> {
  const res = await apiFetch("/account/");

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

// Creates the caller's own row. An invited member has an auth user but no
// account row until they pick a username, so this is step one of setup.
export async function createMyAccount(username: string): Promise<Account> {
  const res = await apiSendJson("/account/", "POST", { username });
  await apiOrThrow(res, "Could not finish setting up your account.");

  const { Account: account } = (await res.json()) as AccountResponse;
  cacheRole(account.role);
  primeMeCache(account);

  return account;
}

export async function getAccount(userId: string): Promise<Account | undefined> {
  const { Accounts } = await getAccounts();

  return Accounts.find((user) => user.id === userId);
}

// The signed in user's own account row, straight from /account/{account_id}.
// Cached - pass { force: true } to go back to the network.
export async function getMe({
  force = false,
}: { force?: boolean } = {}): Promise<Account | undefined> {
  if (force) clearMeCache();

  if (meCache && Date.now() - meCache.at < ME_CACHE_TTL) {
    return meCache.account;
  }

  // A second caller during the first request waits on it instead of firing its own.
  if (!meInFlight) {
    const generation = meGeneration;
    const request = fetchMe().then((account) => {
      if (generation === meGeneration) {
        primeMeCache(account);
        meInFlight = null;
      }

      return account;
    });

    meInFlight = request;
    request.catch(() => {
      if (meInFlight === request) meInFlight = null;
    });
  }

  return meInFlight;
}

async function fetchMe(): Promise<Account | undefined> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return undefined;
  }

  const res = await apiFetch(`/account/${session.user.id}`);

  if (res.ok) {
    const { Account: account } = (await res.json()) as AccountResponse;
    cacheRole(account.role);
    return account;
  }

  // A row that is not keyed to the auth id still has to be findable by email.
  if (res.status === 404) {
    const { Accounts } = await getAccounts();
    const account = Accounts.find((user) => user.email === session.user.email);

    if (account) cacheRole(account.role);

    return account;
  }

  throw new Error(`HTTP ${res.status}`);
}

// Reads the cookie first, and only falls back to the network on a cold start.
export async function isAdmin(): Promise<boolean> {
  const cached = readCachedRole();

  if (cached) return isAdminRole(cached);

  const me = await getMe();

  return me ? isAdminRole(me.role) : false;
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

// Only the keys present in `patch` are written - see UpdateAccountRequest.
export async function updateAccount(
  accountId: string,
  patch: AccountPatch,
): Promise<void> {
  const res = await apiSendJson(`/account/${accountId}`, "PUT", patch);
  await apiOrThrow(res, "Could not update that account.");

  // Cheaper to drop the cache than to work out whether this was our own row.
  clearMeCache();
}

export async function assignRole(
  accountId: string,
  role: AccountRole,
): Promise<void> {
  const res = await apiSendJson(`/account/${accountId}/role`, "PUT", { role });
  await apiOrThrow(res, "Could not change that role.");

  clearMeCache();
}

export async function deleteAccount(accountId: string): Promise<void> {
  const res = await apiFetch(`/account/${accountId}`, { method: "DELETE" });
  await apiOrThrow(res, "Could not delete that account.");

  clearMeCache();
}

// Resolves the signed in user against the account table, which is where the username lives - the Supabase access token only carries the id and email.
export function useCurrentAccount(enabled: boolean = true) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    getMe()
      .then((found) => {
        setAccount(found ?? null);
      })
      .catch(() => {
        setAccount(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [enabled]);

  return { account, loading: enabled && loading };
}
