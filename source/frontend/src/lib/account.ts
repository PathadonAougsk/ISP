"use client";

import { apiFetch, apiOrThrow, apiSendJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cached, clearAllApiCache } from "@/lib/cache/cache";

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

// Cache API, not memory. Clear also drop old in-flight saves.
const getMeCached = cached(fetchMe, ME_CACHE_TTL, "me");

// Call after anything that can change the signed in user's own row.
export function clearMeCache() {
  return getMeCached.clear();
}

// Drop every account related cache.
export function clearAccountCache() {
  return Promise.all([getMeCached.clear(), getAccounts.clear()]);
}

// Listener, so a write refreshes them without a reload.
const accountListeners = new Set<() => void>();

export function onAccountChange(listener: () => void) {
  accountListeners.add(listener);

  return () => {
    accountListeners.delete(listener);
  };
}

function notifyAccountChange() {
  accountListeners.forEach((listener) => listener());
}

export function isAdminRole(role: AccountRole): boolean {
  return ADMIN_ROLES.includes(role);
}

// higher number = higher role
const ROLE_RANK: Record<AccountRole, number> = {
  "Lab User": 0,
  "Lab Admin": 1,
  "Lab Owner": 2,
};

// true only when actor role is strictly higher than target role
export function outranks(actor: AccountRole, target: AccountRole): boolean {
  return ROLE_RANK[actor] > ROLE_RANK[target];
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
  void clearAccountCache();

  if (typeof document === "undefined") return;

  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

const ACCOUNTS_CACHE_TTL = 60 * 1000;

async function fetchAccounts(): Promise<AccountsResponse> {
  const res = await apiFetch("/account/");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const getAccounts = cached(
  fetchAccounts,
  ACCOUNTS_CACHE_TTL,
  "accounts",
);

// Creates the caller's own row. A user who has a login but no account row
// yet claims it here by picking a username, so this is step one of setup.
export async function createMyAccount(username: string): Promise<Account> {
  const res = await apiSendJson("/account/", "POST", { username });
  await apiOrThrow(res, "Could not finish setting up your account.");

  const { Account: account } = (await res.json()) as AccountResponse;
  cacheRole(account.role);
  await clearAccountCache();
  notifyAccountChange();

  return account;
}

export async function getAccount(userId: string): Promise<Account | undefined> {
  return (await getAccounts()).Accounts.find((user) => user.id === userId);
}

// The signed in user's own account row, straight from /account/{account_id}.
// Cached - pass { force: true } to go back to the network.
export async function getMe({ force = false }: { force?: boolean } = {}): Promise<
  Account | undefined
> {
  if (force) await clearMeCache();

  return (await getMeCached()) ?? undefined;
}

async function endSession(search = "") {
  clearCachedRole();
  await clearAllApiCache();
  await createClient().auth.signOut();

  if (typeof window !== "undefined") {
    window.location.replace(`/auth${search}`);
  }
}

// Sends them back to the login page with a reason, rather than to a blank
// dashboard that fails every request.
function signOutDeactivated() {
  return endSession("?deactivated=1");
}

// Logging out on purpose, so no reason flag - the login page has nothing to
// explain.
export function signOut() {
  return endSession();
}

async function fetchMe(): Promise<Account | null> {
  const {
    data: { session },
  } = await createClient().auth.getSession();

  if (!session) return null;

  const res = await apiFetch(`/account/${session.user.id}`);
  let account: Account | undefined;

  if (res.ok) {
    account = ((await res.json()) as AccountResponse).Account;
  } else if (res.status === 403) {
    await signOutDeactivated();
    return null;
  } else if (res.status === 404) {
    const { Accounts } = await getAccounts();
    account = Accounts.find((user) => user.email === session.user.email);
  } else {
    throw new Error(`HTTP ${res.status}`);
  }

  if (account) cacheRole(account.role);

  return account ?? null;
}

// Reads the cookie first, and only falls back to the network on a cold start.
export async function isAdmin(): Promise<boolean> {
  const cached = readCachedRole();

  if (cached) return isAdminRole(cached);

  const account = await getMe();

  return account ? isAdminRole(account.role) : false;
}

export type UserRole = "Lab Admin" | "Lab User";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
};

export function mapAccountToMember(account: Account): Member {
  return {
    id: account.id,
    name: account.username,
    email: account.email,
    role: account.role,
  };
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
  await clearAccountCache();
  notifyAccountChange();
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

// Both live in the Supabase login rather than the account table, hence their own endpoints instead of a key in AccountPatch.
// `accountId` is your own row, or that of somebody you outrank. The password is always the caller's own - an admin resetting a member never sees theirs.
export function changeEmail(
  accountId: string,
  email: string,
  password: string,
): Promise<void> {
  return mutate(
    apiSendJson(`/account/${accountId}/email`, "PUT", { email, password }),
    "Could not change that email address.",
  );
}

export function changePassword(
  accountId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return mutate(
    apiSendJson(`/account/${accountId}/password`, "PUT", {
      current_password: currentPassword,
      new_password: newPassword,
    }),
    "Could not change your password.",
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

// A "member" is uncapped. A "trial" gets a ticket quota that counts down every
// time they file a ticket - see create_ticket on the backend.
export type UserKind = "member" | "trial";

export type CreateUserPayload = {
  username: string;
  // Supabase keys the login on this, and signing in is email plus password.
  email: string;
  password: string;
  kind: UserKind;
  quota?: number | null;
};

// Creates both halves of a member at once - the Supabase login and the account
// row behind it - so they can sign in with the credentials the admin just
// picked. Nothing is emailed; the admin passes those on themselves. Always a
// Lab User: promoting them is a separate call to assignRole. POST /account/ is
// the other way round, where the member claims their own row once they already
// have a login.
export async function adminCreateAccount(
  payload: CreateUserPayload,
): Promise<Account> {
  const res = await apiSendJson("/account/admin", "POST", payload);
  await apiOrThrow(res, "Could not create that member.");

  const { Account: account } = (await res.json()) as AccountResponse;
  getAccounts.clear();

  return account;
}

export type CurrentAccount = (
  | {
      signedIn: false;
      loading: boolean;
      // set when the request failed. null with no account = really signed out
      error: string | null;
      account: null;
      userRole: "Lab User";
      currentUserId: "";
      isAdmin: false;
    }
  | {
      signedIn: true;
      loading: false;
      error: null;
      account: Account;
      userRole: UserRole;
      currentUserId: string;
      isAdmin: boolean;
    }
) & {
  // Go back for the row after a write. The writes above drop the me cache, so this lands on the network.
  reload: () => void;
};

// No account yet - still loading, disabled, or signed out. Fails closed on isAdmin.
const SIGNED_OUT = {
  signedIn: false,
  loading: false,
  error: null,
  account: null,
  userRole: "Lab User",
  currentUserId: "",
  isAdmin: false,
} as const;

// Load once on mount, ignore result if unmounted. Pass a stable function.
// `reload` bumps a counter the effect watches - `load` itself has to stay stable or the effect loops.
function useFetched<T>(load: () => Promise<T>, enabled: boolean = true) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

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
  }, [load, enabled, attempt]);

  return { ...state, reload };
}

// Resolves the signed in user against the account table, which is where the username lives - the Supabase access token only carries the id and email.
export function useCurrentAccount(enabled: boolean = true): CurrentAccount {
  const { data: account, loading, error, reload } = useFetched(getMe, enabled);

  if (!account)
    return { ...SIGNED_OUT, loading: enabled && loading, error, reload };

  // "Lab Owner" and "Lab Admin" both count as admin
  const admin = isAdminRole(account.role);

  return {
    signedIn: true,
    loading: false,
    error: null,
    account,
    userRole: admin ? "Lab Admin" : "Lab User",
    currentUserId: account.id,
    isAdmin: admin,
    reload,
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
