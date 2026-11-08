"use client";

import { useState } from "react";

import { adminCreateAccount, type UserKind } from "@/lib/account";
import { Toggle } from "@/components/dashboard/overview";
import { CARD, ERROR, FIELD, LABEL, MUTED, SAVE, BTN } from "./settings-style";

const DEFAULT_TRIAL_QUOTA = 10;
const MIN_PASSWORD = 8;

const KINDS: { value: UserKind; label: string; blurb: string }[] = [
  {
    value: "member",
    label: "Member",
    blurb: "No cap - they can file as many tickets as they need.",
  },
  {
    value: "trial",
    label: "Trial",
    blurb: "Capped at a ticket quota, counted down as they file tickets.",
  },
];

type Handover = { username: string; email: string; password: string };

// Nothing is emailed: the admin picks the username, email and password, and
// passes the credentials on themselves, which is why they stay on screen until
// the admin dismisses them.
export default function CreateUser({
  onCreated,
}: {
  onCreated: () => Promise<void> | void;
}) {
  const [kind, setKind] = useState<UserKind>("member");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [quota, setQuota] = useState(String(DEFAULT_TRIAL_QUOTA));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handover, setHandover] = useState<Handover | null>(null);

  const trial = kind === "trial";
  const name = username.trim();
  const login = email.trim();
  const ready =
    Boolean(name) && Boolean(login) && password.length >= MIN_PASSWORD;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!ready || busy) return;

    let cap: number | null = null;
    if (trial) {
      cap = Number(quota);
      if (!Number.isInteger(cap) || cap < 0) {
        setError("Quota has to be a whole number, 0 or more.");
        return;
      }
    }

    setBusy(true);
    try {
      // Everyone starts as a Lab User. Promoting them is a separate step in
      // the member list, so creating one cannot hand out admin in one go.
      const account = await adminCreateAccount({
        username: name,
        email: login,
        password,
        kind,
        ...(trial ? { quota: cap } : {}),
      });

      // The password is never readable again, so show it before clearing.
      setHandover({
        username: account.username,
        email: account.email,
        password,
      });
      setUsername("");
      setEmail("");
      setPassword("");
      setQuota(String(DEFAULT_TRIAL_QUOTA));

      await onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create that member.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={CARD}>
      <div className="flex flex-col gap-1.5">
        <p className="font-semibold">Create A User</p>
        <p className={MUTED}>Create a user here!</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Toggle
          options={KINDS.map((option) => ({
            label: option.label,
            onClick: () => setKind(option.value),
          }))}
          selectedIndex={KINDS.findIndex((k) => k.value === kind)}
          ariaLabel="User kind"
          widthClassName="w-60"
        />

        <p className={MUTED}>
          {KINDS.find((k) => k.value === kind)?.blurb} They join as a Lab User
          and can sign in straight away - nothing is emailed, so pass the
          credentials on to them yourself.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className={LABEL}>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={busy}
              maxLength={100}
              placeholder="Another Win"
              className={FIELD}
            />
          </label>

          <label className={LABEL}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              placeholder="Anawin.c@Chula.th"
              className={FIELD}
            />
          </label>

          <label className={LABEL}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              maxLength={72}
              placeholder={`at least ${MIN_PASSWORD} characters`}
              className={FIELD}
            />
          </label>

          {trial && (
            <label className={LABEL}>
              Ticket quota
              <input
                type="number"
                min={0}
                step={1}
                value={quota}
                onChange={(e) => setQuota(e.target.value)}
                disabled={busy}
                className={FIELD}
              />
            </label>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={!ready || busy} className={SAVE}>
            {busy ? "Creating..." : "Create"}
          </button>
          {password.length > 0 && password.length < MIN_PASSWORD && (
            <span className={MUTED}>
              Password needs {MIN_PASSWORD - password.length} more character
              {MIN_PASSWORD - password.length === 1 ? "" : "s"}.
            </span>
          )}
        </div>
      </form>

      {error && <p className={ERROR}>{error}</p>}

      {handover && (
        <div className="flex flex-col gap-2 rounded-[20px] border-2 border-(--primary-color-2) bg-white p-4">
          <p className="font-semibold">
            {handover.username} can sign in now. Pass these on:
          </p>
          <p className={MUTED}>
            Email <span className="text-black">{handover.email}</span>
            {" · "}
            Password <span className="text-black">{handover.password}</span>
          </p>
          <p className={MUTED}>
            This is the only time the password is shown. Closing this clears it.
          </p>
          <button
            type="button"
            onClick={() => setHandover(null)}
            className={`${BTN} w-25 self-start`}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
