"use client";

// You could bypass the censor by inspecting the network..
// Maybe I would fix in the future.

import { useCallback, useEffect, useState } from "react";

import {
  assignRole,
  deleteAccount,
  getAccounts,
  updateAccount,
  type Account,
  type AccountRole,
} from "@/lib/account";
import { maskEmail } from "@/lib/format";

// Lab Owner first, then Lab Admin, then Lab User
const ROLE_ORDER: Record<AccountRole, number> = {
  "Lab Owner": 0,
  "Lab Admin": 1,
  "Lab User": 2,
};

const ASSIGNABLE_ROLES: AccountRole[] = ["Lab Admin", "Lab User"];

function byRoleThenName(a: Account, b: Account) {
  return (
    ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
    a.username.localeCompare(b.username)
  );
}

export default function Member({
  account,
  isAdmin,
}: {
  account: Account | null;
  isAdmin: boolean;
}) {
  const [members, setMembers] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Prevent double firing.
  const [busyId, setBusyId] = useState<string | null>(null);

  // Try-Except helper -> Special thank to Wassawin.
  const refresh = useCallback(
    () =>
      getAccounts()
        .then((body) => {
          setMembers([...body.Accounts].sort(byRoleThenName));
          setError(null);
        })
        .catch(() => {
          setMembers([]);
          setError("Could not load members.");
        })
        .finally(() => {
          setLoading(false);
        }),
    [],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  // The server owns the rules, so show whatever `detail` it sends back.
  async function run(member: Account, action: () => Promise<void>) {
    if (!isAdmin) return;

    setBusyId(member.id);
    try {
      await action();
      setError(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  function handleDelete(member: Account) {
    if (
      !window.confirm(
        `Delete ${member.username}? This cannot be undone. Deactivate instead if they own any tasks or tickets.`,
      )
    )
      return;

    run(member, () => deleteAccount(member.id));
  }

  const needle = query.trim().toLowerCase();
  const visible = members.filter(
    (member) =>
      member.username.toLowerCase().includes(needle) ||
      member.email.toLowerCase().includes(needle),
  );

  // Just surface UI to preventing french revolution.
  const canEdit = (member: Account) =>
    (member.id !== account?.id && account?.role == "Lab Owner") || member.role == "Lab User";

  // An admin sees real addresses; everyone else only ever sees their own.
  const emailOf = (member: Account) =>
    isAdmin || member.id === account?.id
      ? member.email
      : maskEmail(member.email);

  return (
    <section className="flex flex-col gap-7">
      <h2 className="text-[28px] leading-tight">Member</h2>

      <div className="flex flex-col gap-1.5">
        <p>People In Your Lab</p>
        <p className="text-[#8a8a8a]">
          Everyone is here!
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-lg">
          All Members
          {!loading && !error && (
            <span className="text-[#8a8a8a]"> ({members.length})</span>
          )}
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="h-10 w-62.5 border border-[#d0d0d0] bg-[#dedede] px-3 outline-none placeholder:text-[#8a8a8a]"
        />
      </div>

      {error && <p className="text-[#b3261e]">{error}</p>}

      <div className="flex flex-col">
        <div className="flex items-center gap-3 border-b border-[#d0d0d0] pb-2 text-sm text-[#8a8a8a] uppercase">
          <span className="flex-1">Username</span>
          <span className="flex-1">Email</span>
          <span className="w-25 shrink-0">Role</span>
          <span className="w-15 shrink-0 text-right">Quota</span>
          <span className="w-25 shrink-0 text-right">Status</span>
          {isAdmin && <span className="w-25 shrink-0" />}
        </div>

        {loading ? (
          <p className="py-4 text-[#8a8a8a]">Loading...</p>
        ) : visible.length === 0 ? (
          <p className="py-4 text-[#8a8a8a]">
            {members.length === 0
              ? "No members yet."
              : "No members match that search."}
          </p>
        ) : (
          visible.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 border-b border-[#e0e0e0] py-3"
            >
              <span className="flex-1 truncate">
                {member.username}
                {member.id === account?.id && (
                  <span className="text-[#8a8a8a]"> (You)</span>
                )}
              </span>
              <span className="flex-1 truncate">{emailOf(member)}</span>
              {isAdmin && canEdit(member) ? (
                <select
                  value={member.role}
                  disabled={busyId === member.id}
                  onChange={(e) =>
                    run(member, () =>
                      assignRole(member.id, e.target.value as AccountRole),
                    )
                  }
                  className="h-10 w-25 shrink-0 border border-[#d0d0d0] bg-[#dedede] px-2 outline-none disabled:opacity-50"
                >
                  {ASSIGNABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="w-25 shrink-0">{member.role}</span>
              )}

              <span className="w-15 shrink-0 text-right">{member.quota ?? "-"}</span>

              {isAdmin && canEdit(member) ? (
                <button
                  type="button"
                  disabled={busyId === member.id}
                  onClick={() =>
                    run(member, () =>
                      updateAccount(member.id, { active: !member.active }),
                    )
                  }
                  className="h-10 w-25 shrink-0 bg-[#d4d4d4] text-base hover:bg-[#c8c8c8] disabled:opacity-50"
                >
                  {member.active ? "Deactivate" : "Activate"}
                </button>
              ) : (
                <span className="w-25 shrink-0 text-right">
                  {member.active ? "Active" : "Inactive"}
                </span>
              )}

              {isAdmin && (
                <div className="flex w-25 shrink-0 justify-end">
                  {canEdit(member) && (
                    <button
                      type="button"
                      disabled={busyId === member.id}
                      onClick={() => handleDelete(member)}
                      className="h-10 w-25 bg-[#d4d4d4] text-base hover:bg-[#c8c8c8] disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
