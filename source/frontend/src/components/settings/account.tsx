"use client";

import { useState } from "react";

import {
  changeEmail,
  changePassword,
  updateAccount,
  type Account,
} from "@/lib/account";
import Row, { EditButton } from "./row";
import { ERROR, FIELD, LABEL, MUTED, SAVE, TITLE } from "./settings-style";

const MIN_PASSWORD = 8;

type Field = "username" | "email" | "password";
type Feedback = {
  error: string | null;
  done: string | null;
};

const EMPTY_FEEDBACK: Feedback = { error: null, done: null };

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

  const [open, setOpen] = useState<Field | null>(null);
  const [busy, setBusy] = useState(false);

  const [feedback, setFeedback] = useState<Record<Field, Feedback>>({
    username: { ...EMPTY_FEEDBACK },
    email: { ...EMPTY_FEEDBACK },
    password: { ...EMPTY_FEEDBACK },
  });

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function clearDrafts() {
    setUsername("");
    setEmail("");
    setEmailPassword("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  function clearFeedback(field: Field) {
    setFeedback((prev) => ({
      ...prev,
      [field]: { ...EMPTY_FEEDBACK },
    }));
  }

  function setError(field: Field, error: string) {
    setFeedback((prev) => ({
      ...prev,
      [field]: { error, done: null },
    }));
  }

  function toggle(field: Field) {
    const closing = open === field;

    clearFeedback(field);
    clearDrafts();
    setOpen(closing ? null : field);

    if (!closing && field === "username") {
      setUsername(account?.username ?? "");
    }
  }

  async function run(
    field: Field,
    action: () => Promise<void>,
    message: string,
  ) {
    if (!account || busy) return;

    setBusy(true);
    clearFeedback(field);

    try {
      await action();
      clearDrafts();
      setOpen(null);
      setFeedback((prev) => ({
        ...prev,
        [field]: { error: null, done: message },
      }));
      onChanged();
    } catch (err) {
      setError(
        field,
        err instanceof Error ? err.message : "Something went wrong.",
      );
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
      "username",
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
      "email",
      () => changeEmail(account.id, next, emailPassword),
      `Email changed to ${next}. That is what you sign in with from now on.`,
    );
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !currentPassword) return;

    if (newPassword.length < MIN_PASSWORD) {
      setError(
        "password",
        `A new password needs at least ${MIN_PASSWORD} characters.`,
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("password", "Those two passwords do not match.");
      return;
    }

    run(
      "password",
      () => changePassword(account.id, currentPassword, newPassword),
      "Password changed. You are still signed in here.",
    );
  }

  const ready = Boolean(account) && !loading;

  const editAction = (field: Field) => (
    <EditButton
      onClick={() => toggle(field)}
      open={open === field}
      disabled={!ready || (busy && open !== field)}
    />
  );

  function FeedbackMessage({ field }: { field: Field }) {
    const { error, done } = feedback[field];

    if (error) {
      return <p className={`mt-3 ${ERROR}`}>{error}</p>;
    }

    if (done) {
      return <p className="mt-3 text-(--primary-color-deep)">{done}</p>;
    }

    return null;
  }

  return (
    <>
      <section className="flex flex-col gap-4">
        <h1 className={TITLE}>Account Info</h1>

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
                  onChange={(e) => {
                    setUsername(e.target.value);
                    clearFeedback("username");
                  }}
                  disabled={busy}
                  maxLength={100}
                  placeholder="What everyone sees you as"
                  className={FIELD}
                />
              </label>

              <button
                type="submit"
                disabled={busy || !username.trim()}
                className={`${SAVE} self-start`}
              >
                {busy ? "Saving..." : "Save"}
              </button>
            </form>
          )}

          <FeedbackMessage field="username" />
        </Row>

        <Row
          label="Email"
          value={account?.email ?? placeholder}
          reveal={Boolean(account)}
          action={editAction("email")}
        >
          {open === "email" && (
            <form onSubmit={submitEmail} className="flex flex-col gap-5">
              <p className={MUTED}>
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFeedback("email");
                    }}
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
                    onChange={(e) => {
                      setEmailPassword(e.target.value);
                      clearFeedback("email");
                    }}
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
                className={`${SAVE} self-start`}
              >
                {busy ? "Saving..." : "Save"}
              </button>
            </form>
          )}

          <FeedbackMessage field="email" />
        </Row>
      </section>

      <hr className="my-10 border-gray-200" />

      <section className="flex flex-col gap-4">
        <h1 className={TITLE}>Password & Security</h1>

        <Row label="Password" action={editAction("password")}>
          {open === "password" && (
            <form onSubmit={submitPassword} className="flex flex-col gap-5">
              <p className={MUTED}>
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
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      clearFeedback("password");
                    }}
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
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      clearFeedback("password");
                    }}
                    disabled={busy}
                    maxLength={72}
                    autoComplete="new-password"
                    placeholder={`at least ${MIN_PASSWORD} characters`}
                    className={FIELD}
                  />
                  {newPassword.length > 0 &&
                    newPassword.length < MIN_PASSWORD && (
                      <span className={MUTED}>
                        {MIN_PASSWORD - newPassword.length} more character
                        {MIN_PASSWORD - newPassword.length === 1 ? "" : "s"} to
                        go.
                      </span>
                    )}
                </label>

                <label className={LABEL}>
                  New password again
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearFeedback("password");
                    }}
                    disabled={busy}
                    maxLength={72}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={FIELD}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={busy || !currentPassword || !newPassword}
                className={`${SAVE} self-start`}
              >
                {busy ? "Saving..." : "Save"}
              </button>
            </form>
          )}

          <FeedbackMessage field="password" />
        </Row>
      </section>
    </>
  );
}
