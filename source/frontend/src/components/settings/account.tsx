"use client";

import { useState } from "react";

import {
  changeEmail,
  changePassword,
  updateAccount,
  type Account,
} from "@/lib/account";
import Button from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import Row, { EditButton } from "./row";
import { ERROR, MUTED, TITLE } from "./settings-style";

const MIN_PASSWORD = 8;

// the three things you can change about yourself, one open at a time
type Editable = "username" | "email" | "password";

type Feedback = { error: string | null; done: string | null };

const EMPTY_FEEDBACK: Feedback = { error: null, done: null };

// what came of the last attempt on this row
function FeedbackMessage({ error, done }: Feedback) {
  if (error) return <p className={`mt-3 ${ERROR}`}>{error}</p>;
  if (done) return <p className="mt-3 text-(--primary-color-deep)">{done}</p>;

  return null;
}

// the editor under a row: fields, then one Save button
function EditForm({
  onSubmit,
  busy,
  disabled,
  children,
}: {
  onSubmit: (event: React.FormEvent) => void;
  busy: boolean;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {children}

      <Button
        variant="green"
        size="md"
        type="submit"
        disabled={busy || disabled}
        className="min-w-25 self-start px-4 font-bold"
      >
        {busy ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}

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

  const [open, setOpen] = useState<Editable | null>(null);
  const [busy, setBusy] = useState(false);

  const [feedback, setFeedback] = useState<Record<Editable, Feedback>>({
    username: EMPTY_FEEDBACK,
    email: EMPTY_FEEDBACK,
    password: EMPTY_FEEDBACK,
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

  function say(field: Editable, next: Feedback) {
    setFeedback((prev) => ({ ...prev, [field]: next }));
  }

  function toggle(field: Editable) {
    const closing = open === field;

    say(field, EMPTY_FEEDBACK);
    clearDrafts();
    setOpen(closing ? null : field);

    if (!closing && field === "username") {
      setUsername(account?.username ?? "");
    }
  }

  async function run(
    field: Editable,
    action: () => Promise<void>,
    message: string,
  ) {
    if (!account || busy) return;

    setBusy(true);
    say(field, EMPTY_FEEDBACK);

    try {
      await action();
      clearDrafts();
      setOpen(null);
      say(field, { error: null, done: message });
      onChanged();
    } catch (err) {
      say(field, {
        error: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        done: null,
      });
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
      `Your username has been changed to ${name}.`,
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
      `Your email address has been changed to ${next}. Use this address to sign in.`,
    );
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !currentPassword) return;

    if (newPassword.length < MIN_PASSWORD) {
      say("password", {
        error: `A new password needs at least ${MIN_PASSWORD} characters.`,
        done: null,
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      say("password", {
        error: "Passwords do not match.",
        done: null,
      });
      return;
    }

    run(
      "password",
      () => changePassword(account.id, currentPassword, newPassword),
      "Your password has been changed successfully.",
    );
  }

  const ready = Boolean(account) && !loading;

  // typing again puts the last error away
  const draft =
    (field: Editable, set: (value: string) => void) => (value: string) => {
      set(value);
      say(field, EMPTY_FEEDBACK);
    };

  const editAction = (field: Editable) => (
    <EditButton
      onClick={() => toggle(field)}
      open={open === field}
      disabled={!ready || (busy && open !== field)}
    />
  );

  const missing = MIN_PASSWORD - newPassword.length;

  return (
    <>
      <section className="flex flex-col gap-4">
        <h1 className={TITLE}>Account Information</h1>

        <Row
          label="Username"
          value={account?.username ?? placeholder}
          action={editAction("username")}
        >
          {open === "username" && (
            <EditForm
              onSubmit={submitUsername}
              busy={busy}
              disabled={!username.trim()}
            >
              <div className="w-75">
                <TextInput
                  label="New username"
                  look="outlined"
                  autoFocus
                  value={username}
                  onChange={draft("username", setUsername)}
                  disabled={busy}
                  maxLength={30}
                  placeholder="Enter your username"
                />
              </div>
            </EditForm>
          )}

          <FeedbackMessage {...feedback.username} />
        </Row>

        <Row
          label="Email"
          value={account?.email ?? placeholder}
          reveal={Boolean(account)}
          action={editAction("email")}
        >
          {open === "email" && (
            <EditForm
              onSubmit={submitEmail}
              busy={busy}
              disabled={!email.trim() || !emailPassword}
            >
              <p className={MUTED}>
                Your new email address will not be verified. Make sure it is
                correct before saving. Contact an administrator if you need help
                correcting it.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="New email"
                  look="outlined"
                  autoFocus
                  type="email"
                  value={email}
                  onChange={draft("email", setEmail)}
                  disabled={busy}
                  placeholder="you@chula.th"
                  maxLength={255}
                />

                <TextInput
                  label="Confirm your password"
                  look="outlined"
                  type="password"
                  value={emailPassword}
                  onChange={draft("email", setEmailPassword)}
                  disabled={busy}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  maxLength={72}
                  showCounter={false}
                />
              </div>
            </EditForm>
          )}

          <FeedbackMessage {...feedback.email} />
        </Row>
      </section>

      <hr className="my-10 border-gray-200" />

      <section className="flex flex-col gap-4">
        <h1 className={TITLE}>Password and Security</h1>

        <Row label="Password" action={editAction("password")}>
          {open === "password" && (
            <EditForm
              onSubmit={submitPassword}
              busy={busy}
              disabled={!currentPassword || !newPassword}
            >
              <p className={MUTED}>
                Keep your password somewhere safe. If you forget it, contact an
                administrator to reset it.
              </p>

              <div className="flex items-start gap-3">
                <div className="w-1/2">
                  <TextInput
                    label="Current password"
                    look="outlined"
                    autoFocus
                    type="password"
                    value={currentPassword}
                    onChange={draft("password", setCurrentPassword)}
                    disabled={busy}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    maxLength={72}
                    showCounter={false}
                  />
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex w-1/2 flex-col gap-1.5">
                  <TextInput
                    label="New password"
                    look="outlined"
                    type="password"
                    value={newPassword}
                    onChange={draft("password", setNewPassword)}
                    disabled={busy}
                    maxLength={72}
                    showCounter={false}
                    autoComplete="new-password"
                    placeholder={`At least ${MIN_PASSWORD} characters`}
                  />

                  {missing > 0 && newPassword.length > 0 && (
                    <span className={`${MUTED} text-sm`}>
                      {missing} more character{missing === 1 ? "" : "s"} required.
                    </span>
                  )}
                </div>

                <div className="w-1/2">
                  <TextInput
                    label="Confirm new password"
                    look="outlined"
                    type="password"
                    value={confirmPassword}
                    onChange={draft("password", setConfirmPassword)}
                    disabled={busy}
                    maxLength={72}
                    showCounter={false}
                    autoComplete="new-password"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </EditForm>
          )}

          <FeedbackMessage {...feedback.password} />
        </Row>
      </section>
    </>
  );
}
