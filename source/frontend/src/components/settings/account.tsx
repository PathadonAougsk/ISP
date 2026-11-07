"use client";

import { useState } from "react";

import {
  changeEmail,
  changePassword,
  updateAccount,
  type Account,
} from "@/lib/account";
import Row, { EditButton } from "./row";

// Matches MIN_PASSWORD on the backend; Supabase says so in `detail` if its own minimum is stricter.
const MIN_PASSWORD = 8;

const FIELD =
  "h-10 border border-[#d0d0d0] bg-[#dedede] px-3 outline-none placeholder:text-[#8a8a8a] disabled:opacity-50";
const LABEL = "flex flex-col gap-1.5 text-sm text-[#8a8a8a] uppercase";
const SAVE =
  "h-10 w-25 bg-(--primary-color-2) text-base text-white enabled:hover:bg-(--primary-color-2-hover) disabled:opacity-50";

type Field = "username" | "email" | "password";

// Your own account only - the member list is where an admin edits anyone else's.
export default function AccountPanel({
  account,
  loading,
  onChanged,
}: {
  account: Account | null;
  loading: boolean;
  onChanged: () => void;
}) {
  const placeholder = loading ? "Loading..." : "Not available";

  // One editor at a time, so the message at the bottom is never ambiguous.
  const [open, setOpen] = useState<Field | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Passwords never outlive the form they were typed into.
  function clearDrafts() {
    setUsername("");
    setEmail("");
    setEmailPassword("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  function toggle(field: Field) {
    const closing = open === field;

    setError(null);
    setDone(null);
    clearDrafts();
    setOpen(closing ? null : field);

    // Renaming is usually a tweak, not a fresh start.
    if (!closing && field === "username") setUsername(account?.username ?? "");
  }

  // Same ending for every form: show what the server said, or close up and reload the row.
  async function run(action: () => Promise<void>, message: string) {
    if (!account || busy) return;

    setBusy(true);
    setError(null);
    try {
      await action();
      clearDrafts();
      setOpen(null);
      setDone(message);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function submitUsername(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim();
    if (!account || !name) return;

    if (name === account.username) {
      setOpen(null);
      return;
    }

    run(
      () => updateAccount(account.id, { username: name }),
      `Username changed to ${name}.`,
    );
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    const next = email.trim().toLowerCase();
    if (!account || !next || !emailPassword) return;

    if (next === account.email) {
      setOpen(null);
      return;
    }

    run(
      () => changeEmail(account.id, next, emailPassword),
      `Email changed to ${next}. That is what you sign in with from now on.`,
    );
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !currentPassword) return;

    if (newPassword.length < MIN_PASSWORD) {
      setError(`A new password needs at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Those two passwords do not match.");
      return;
    }

    run(
      () => changePassword(account.id, currentPassword, newPassword),
      "Password changed. You are still signed in here.",
    );
  }

  // Nothing is editable until we know whose account it is.
  const ready = Boolean(account) && !loading;
  const editAction = (field: Field) => (
    <EditButton
      onClick={() => toggle(field)}
      open={open === field}
      disabled={!ready || (busy && open !== field)}
    />
  );

  return (
    <>
      <section className="flex flex-col gap-7">
        <h2 className="text-[28px] leading-tight">Account Info</h2>
        <Row
          label="Username"
          value={account?.username ?? placeholder}
          action={editAction("username")}
        >
          {open === "username" && (
            <form onSubmit={submitUsername} className="flex flex-col gap-5">
              <label className={LABEL}>
                New username
                <input
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={busy}
                  maxLength={100}
                  placeholder="What everyone sees you as"
                  className={FIELD}
                />
              </label>
              <button
                type="submit"
                disabled={busy || !username.trim()}
                className={SAVE}
              >
                {busy ? "Saving..." : "Save"}
              </button>
            </form>
          )}
        </Row>
        <Row
          label="Email"
          value={account?.email ?? placeholder}
          reveal={Boolean(account)}
          action={editAction("email")}
        >
          {open === "email" && (
            <form onSubmit={submitEmail} className="flex flex-col gap-5">
              <p className="text-[#8a8a8a]">
                There will be no email sent for verification, so double check
                your email before save or else you will need to contact admin.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className={LABEL}>
                  New email
                  <input
                    autoFocus
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={busy}
                    placeholder="you@chula.th"
                    className={FIELD}
                  />
                </label>
                <label className={LABEL}>
                  Current password
                  <input
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    disabled={busy}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={FIELD}
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={busy || !email.trim() || !emailPassword}
                className={SAVE}
              >
                {busy ? "Saving..." : "Save"}
              </button>
            </form>
          )}
        </Row>
      </section>

      <hr className="my-12 border-[#d0d0d0]" />

      <section className="flex flex-col gap-7">
        <h2 className="text-[28px] leading-tight">Password & Security</h2>
        <Row label="Password" action={editAction("password")}>
          {open === "password" && (
            <form onSubmit={submitPassword} className="flex flex-col gap-5">
              <p className="text-[#8a8a8a]">
                Please remember your password, if forgot you will need to
                contact admin for resetting password.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className={LABEL}>
                  Current password
                  <input
                    autoFocus
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={busy}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={FIELD}
                  />
                </label>
                <label className={LABEL}>
                  New password
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={busy}
                    maxLength={72}
                    autoComplete="new-password"
                    placeholder={`at least ${MIN_PASSWORD} characters`}
                    className={FIELD}
                  />
                </label>
                <label className={LABEL}>
                  New password again
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={busy}
                    maxLength={72}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={FIELD}
                  />
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={busy || !currentPassword || !newPassword}
                  className={SAVE}
                >
                  {busy ? "Saving..." : "Save"}
                </button>
                {newPassword.length > 0 &&
                  newPassword.length < MIN_PASSWORD && (
                    <span className="text-[#8a8a8a]">
                      {MIN_PASSWORD - newPassword.length} more character
                      {MIN_PASSWORD - newPassword.length === 1 ? "" : "s"} to
                      go.
                    </span>
                  )}
              </div>
            </form>
          )}
        </Row>
      </section>

      {error && <p className="mt-7 text-[#b3261e]">{error}</p>}
      {done && !error && (
        <p className="mt-7 text-(--primary-color-deep)">{done}</p>
      )}
    </>
  );
}
