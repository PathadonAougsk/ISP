"use client";

import { useState } from "react";

import { adminCreateAccount, type UserKind } from "@/lib/account";
import Button from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import Toggle from "@/components/ui/toggle";
import { CARD, ERROR, LABEL, MUTED } from "./settings-style";

const DEFAULT_TRIAL_QUOTA = 10;
const MIN_PASSWORD = 8;

const KINDS: { value: UserKind; label: string; blurb: string }[] = [
  {
    value: "member",
    label: "Member",
    blurb: "No ticket limit. This user can submit unlimited tickets.",
  },
  {
    value: "trial",
    label: "Trial",
    blurb:
      "Limited by a ticket quota that decreases with each submitted ticket.",
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
        setError("Enter a whole number greater than or equal to 0.");
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
        err instanceof Error ? err.message : "Could not create the user.",
      );
    } finally {
      setBusy(false);
    }
  }

  const missing = MIN_PASSWORD - password.length;

  return (
    <div className={CARD}>
      <div className="flex flex-col gap-1.5">
        <p className="font-semibold">Create a User</p>
        <p className={MUTED}>Add a new user to your lab.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Toggle
          options={KINDS.map((option) => ({
            label: option.label,
            onClick: () => setKind(option.value),
          }))}
          selectedIndex={KINDS.findIndex((k) => k.value === kind)}
          ariaLabel="Account type"
          widthClassName="w-60"
        />

        <p className={MUTED}>
          {KINDS.find((k) => k.value === kind)?.blurb} The user will be created
          as a Lab User and can sign in immediately. No credentials will be
          emailed, so share them with the user yourself.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Username"
            look="outlined"
            value={username}
            onChange={setUsername}
            disabled={busy}
            maxLength={30}
            placeholder="Enter a username"
            autoComplete="off"
          />

          <TextInput
            label="Email"
            look="outlined"
            type="email"
            value={email}
            onChange={setEmail}
            disabled={busy}
            placeholder="user@example.com"
            maxLength={255}
          />

          <TextInput
            label="Password"
            look="outlined"
            type="password"
            value={password}
            onChange={setPassword}
            disabled={busy}
            maxLength={72}
            showCounter={false}
            placeholder={`At least ${MIN_PASSWORD} characters`}
            autoComplete="new-password"
          />

          {trial && (
            <label className={LABEL}>
              Ticket quota
              <TextInput
                look="outlined"
                type="number"
                min={0}
                step={1}
                value={quota}
                onChange={setQuota}
                disabled={busy}
              />
            </label>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="green"
            size="md"
            type="submit"
            disabled={!ready || busy}
            className="min-w-25 px-4 font-bold"
          >
            {busy ? "Creating user..." : "Create User"}
          </Button>
          {missing > 0 && password.length > 0 && (
            <span className={MUTED}>
              Password must be at least {MIN_PASSWORD} characters long.
            </span>
          )}
        </div>
      </form>

      {error && <p className={ERROR}>{error}</p>}

      {handover && (
        <div className="flex flex-col gap-2 rounded-[20px] border-2 border-(--primary-color-2) bg-white p-4">
          <p className="font-semibold">
            User created successfully. Share these credentials with{" "}
            {handover.username}:
          </p>
          <p className={MUTED}>
            Email address <span className="text-black">{handover.email}</span>
            {" · "}
            Password <span className="text-black">{handover.password}</span>
          </p>
          <p className={MUTED}>
            This password will only be displayed once. Dismissing this message
            will permanently hide it.
          </p>
          <Button
            variant="outline"
            size="md"
            onClick={() => setHandover(null)}
            className="w-25 self-start font-semibold"
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
