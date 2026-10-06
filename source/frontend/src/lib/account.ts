import { apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

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

export async function getAccount(userId: string): Promise<Account | undefined> {
  const { Accounts } = await getAccounts();

  return Accounts.find((user) => user.id === userId);
}

// The signed in user's own account row, straight from /account/{account_id}.
export async function getMe(): Promise<Account | undefined> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return undefined;

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
