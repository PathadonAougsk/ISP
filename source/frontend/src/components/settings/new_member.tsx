"use client";

// The "add a member" form in the Member panel. Nothing is emailed: the admin
// picks the username, email and password, and passes the credentials on
// themselves, which is why they stay on screen until the admin dismisses them.

import { useState } from "react";

import { adminCreateAccount, type MemberKind } from "@/lib/account";

// Keep in step with DEFAULT_TRIAL_QUOTA and the password Field in the backend.
const DEFAULT_TRIAL_QUOTA = 10;
const MIN_PASSWORD = 8;

const KINDS: { value: MemberKind; label: string; blurb: string }[] = [
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

const FIELD =
  "h-10 border border-[#d0d0d0] bg-[#dedede] px-3 outline-none placeholder:text-[#8a8a8a] disabled:opacity-50";
const LABEL = "flex flex-col gap-1.5 text-sm text-[#8a8a8a] uppercase";

type Handover = { username: string; email: string; password: string };

export default function NewMember({
  onCreated,
}: {
  onCreated: () => Promise<void> | void;
}) {
  const [kind, setKind] = useState<MemberKind>("member");
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
      // the member list, so adding someone cannot hand out admin in one go.
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <p>Add A Member</p>
        <p className="text-[#8a8a8a]">
          {KINDS.find((k) => k.value === kind)?.blurb} They join as a Lab User
          and can sign in straight away - nothing is emailed, so pass the
          credentials on to them yourself.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex gap-0.5">
          {KINDS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setKind(option.value)}
              className={`h-10 w-30 text-base ${
                kind === option.value
                  ? "bg-[#9a6fc9] text-white"
                  : "bg-[#d4d4d4] hover:bg-[#c8c8c8]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className={LABEL}>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={busy}
              maxLength={100}
              placeholder="somchai"
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
              placeholder="somchai@ku.th"
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
          <button
            type="submit"
            disabled={!ready || busy}
            className="h-10 w-30 bg-[#d4d4d4] text-base hover:bg-[#c8c8c8] disabled:opacity-50"
          >
            {busy ? "Creating..." : "Create"}
          </button>
          {password.length > 0 && password.length < MIN_PASSWORD && (
            <span className="text-[#8a8a8a]">
              Password needs {MIN_PASSWORD - password.length} more character
              {MIN_PASSWORD - password.length === 1 ? "" : "s"}.
            </span>
          )}
        </div>
      </form>

      {error && <p className="text-[#b3261e]">{error}</p>}

      {handover && (
        <div className="flex flex-col gap-2 border border-[#9a6fc9] bg-[#e4dcef] p-4">
          <p>{handover.username} can sign in now. Pass these on:</p>
          <p className="text-[#8a8a8a]">
            Email <span className="text-[#1a1a1a]">{handover.email}</span>
            {" · "}
            Password <span className="text-[#1a1a1a]">{handover.password}</span>
          </p>
          <p className="text-[#8a8a8a]">
            This is the only time the password is shown. Closing this clears it.
          </p>
          <button
            type="button"
            onClick={() => setHandover(null)}
            className="h-10 w-25 self-start bg-[#d4d4d4] text-base hover:bg-[#c8c8c8]"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
