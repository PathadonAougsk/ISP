"use client";

// You could bypass the censor by inspecting the network..
// Maybe I would fix in the future.

import { useCallback, useEffect, useState } from "react";

import {
  getAccounts,
  outranks,
  type Account,
  type AccountRole,
} from "@/lib/account";
import { maskEmail } from "@/lib/format";
import { TextInput } from "@/components/ui/field";
import CreateUser from "./create_user";
import MemberRow from "./member-row";
import {
  ERROR,
  HEAD,
  LIST_PANEL,
  MESSAGE,
  MUTED,
  TITLE,
} from "./settings-style";

// Lab Owner first, then Lab Admin, then Lab User
const ROLE_ORDER: Record<AccountRole, number> = {
  "Lab Owner": 0,
  "Lab Admin": 1,
  "Lab User": 2,
};

// fr cols. grid! because HEAD is flex. admin has 2 more action cols
const COLS_ADMIN =
  "grid! grid-cols-[2fr_2fr_minmax(120px,1.25fr)_minmax(100px,0.75fr)_minmax(100px,0.75fr)_minmax(80px,0.8fr)_minmax(80px,0.8fr)]";

const COLS_USER =
  "grid! grid-cols-[2fr_2fr_minmax(120px,1.25fr)_minmax(100px,0.75fr)_minmax(100px,0.75fr)]";

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

  // Resetting somebody else's login. One row open at a time.
  const [resetId, setResetId] = useState<string | null>(null);

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
  const run = (member: Account) => async (action: () => Promise<void>) => {
    if (!isAdmin) return false;

    setBusyId(member.id);
    try {
      await action();
      setError(null);
      await refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const needle = query.trim().toLowerCase();
  const visible = members.filter(
    (member) =>
      member.username.toLowerCase().includes(needle) ||
      member.email.toLowerCase().includes(needle),
  );

  // Strictly below you, so a Lab Admin cannot touch a peer and nobody can
  // touch a Lab Owner. Just surface UI to preventing french revolution.
  const canEdit = (member: Account) =>
    isAdmin && account !== null && outranks(account.role, member.role);

  // An admin sees real addresses; everyone else only ever sees their own.
  const emailOf = (member: Account) =>
    isAdmin || member.id === account?.id
      ? member.email
      : maskEmail(member.email);

  // same grid for head and rows
  const cols = isAdmin ? COLS_ADMIN : COLS_USER;

  return (
    <section className="flex flex-col gap-5">
      <h1 className={TITLE}>Member</h1>

      <div className="flex flex-col gap-1.5">
        <p className="font-semibold">People In Your Lab</p>
        <p className={MUTED}>Everyone is here!</p>
      </div>

      {isAdmin && <CreateUser onCreated={refresh} />}

      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-semibold w-40">
          All Members
          {!loading && !error && (
            <span className={MUTED}> ({members.length})</span>
          )}
        </p>
        <div className="flex-1">
          <TextInput
            look="outlined"
            value={query}
            onChange={setQuery}
            placeholder="Search by name or email"
            className="w-full"
          />
        </div>
      </div>

      {error && <p className={ERROR}>{error}</p>}

      <div className={LIST_PANEL}>
        <div className={`${HEAD} ${cols}`}>
          <span>Username</span>
          <span>Email</span>
          <span>Role</span>
          <span className="text-center">Quota</span>
          <span className="text-center">Status</span>
        </div>

        {loading ? (
          <p className={MESSAGE}>Loading...</p>
        ) : visible.length === 0 ? (
          <p className={MESSAGE}>
            {members.length === 0
              ? "No members yet."
              : "No members match that search."}
          </p>
        ) : (
          visible.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isMe={member.id === account?.id}
              email={emailOf(member)}
              isAdmin={isAdmin}
              canEdit={canEdit(member)}
              cols={cols}
              busy={busyId === member.id}
              resetOpen={resetId === member.id}
              onToggleReset={() => {
                setError(null);
                setResetId((current) =>
                  current === member.id ? null : member.id,
                );
              }}
              onCloseReset={() => setResetId(null)}
              run={run(member)}
              error={error}
              onError={setError}
            />
          ))
        )}
      </div>
    </section>
  );
}
