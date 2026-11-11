"use client";

import { apiFetch, apiOrThrow, apiSendJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useMemo } from "react";
import { cached, clearAllApiCache } from "@/lib/cache/cache";
import { useFetched } from "@/lib/hooks";

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

// Several components (topbar, useCurrentAccount, page guards) ask for the same
// row on every mount, so hold the answer here and share one request between
// concurrent callers.
const ME_CACHE_TTL = 60 * 60 * 1000; // an hour, so a role change is picked up soon enough

// Cache API, not memory. Clear also drop old in-flight saves.
const getMeCached = cached(fetchMe, ME_CACHE_TTL, "me");

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

function isAdminRole(role: AccountRole): boolean {
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

const ACCOUNTS_CACHE_TTL = 60 * 1000;

async function fetchAccounts(): Promise<AccountsResponse> {
  const res = await apiFetch("/account/");
  await apiOrThrow(res, `HTTP ${res.status}`);
  return res.json();
}

export const getAccounts = cached(
  fetchAccounts,
  ACCOUNTS_CACHE_TTL,
  "accounts",
);

// The signed in user's own account row, straight from /account/{account_id}.
// Cached - pass { force: true } to go back to the network.
export async function getMe({
  force = false,
}: { force?: boolean } = {}): Promise<Account | undefined> {
  if (force) await getMeCached.clear();

  return (await getMeCached()) ?? undefined;
}

async function endSession(search = "") {
  await clearAllApiCache();
  await createClient().auth.signOut();

  if (typeof window !== "undefined") {
    window.location.replace(`/auth${search}`);
  }
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

  if (res.ok) {
    return ((await res.json()) as AccountResponse).Account;
  }

  // Sends them back to the login page with a reason, rather than to a blank
  // dashboard that fails every request.
  if (res.status === 403) {
    await endSession("?deactivated=1");
    return null;
  }

  if (res.status !== 404) throw new Error(`HTTP ${res.status}`);

  const { Accounts } = await getAccounts();

  return Accounts.find((user) => user.email === session.user.email) ?? null;
}

export type UserRole = "Lab Admin" | "Lab User";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
};

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
// Lab User: promoting them is a separate call to assignRole.
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
    () =>
      data?.Accounts.map((account) => ({
        id: account.id,
        name: account.username,
        email: account.email,
        role: account.role,
      })) ?? [],
    [data],
  );

  return { members, membersLoading: loading, membersError: error };
}
