"use client";

import { useState } from "react";

import {
  assignRole,
  changeEmail,
  changePassword,
  deleteAccount,
  updateAccount,
  type Account,
  type AccountRole,
} from "@/lib/account";
import Button from "@/components/ui/button";
import ConfirmModal from "@/components/ui/confirm-modal";
import { Select, TextInput } from "@/components/ui/field";
import { MUTED } from "./settings-style";

const ASSIGNABLE_ROLES: AccountRole[] = ["Lab Admin", "Lab User"];

const MIN_PASSWORD = 8;

// Runs one write against this member, then reloads the list. Returns false
// when the server refused, with its `detail` already on screen.
export type RunAction = (action: () => Promise<void>) => Promise<boolean>;

// Sets another member's login directly. Either half can be left blank to keep
// it as it is, but not both.
function ResetForm({
  member,
  busy,
  run,
  onDone,
  onError,
}: {
  member: Account;
  busy: boolean;
  run: RunAction;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [myPassword, setMyPassword] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const nextEmail = email.trim().toLowerCase();

    if (!nextEmail && !password) {
      onError("Enter a new email address, a new password, or both.");
      return;
    }
    if (password && password.length < MIN_PASSWORD) {
      onError(
        `The new password must be at least ${MIN_PASSWORD} characters long.`,
      );
      return;
    }
    if (!myPassword) {
      onError("Enter your password to confirm this change.");
      return;
    }

    // Two endpoints, so the email can land and the password still fail. The
    // reload in `run` shows whichever half went through.
    const ok = await run(async () => {
      if (nextEmail) await changeEmail(member.id, nextEmail, myPassword);
      if (password) await changePassword(member.id, myPassword, password);
    });

    if (ok) onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-4">
      <p className={`${MUTED} text-sm!`}>
        Change {member.username}'s login credentials directly. No notification
        email will be sent, so share the updated credentials with the user
        yourself. Leave a field blank to keep its current value.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <TextInput
          label="New email address"
          look="outlined"
          type="email"
          value={email}
          onChange={setEmail}
          disabled={busy}
          placeholder="user@example.com"
          maxLength={255}
          autoComplete="off"
        />
        <TextInput
          label="New password"
          look="outlined"
          type="password"
          value={password}
          onChange={setPassword}
          disabled={busy}
          maxLength={72}
          showCounter={false}
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD} characters`}
        />
        <TextInput
          label="Your password"
          look="outlined"
          type="password"
          value={myPassword}
          onChange={setMyPassword}
          disabled={busy}
          autoComplete="current-password"
          placeholder="••••••••"
          maxLength={72}
          showCounter={false}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="green"
          size="md"
          type="submit"
          disabled={busy}
          className="min-w-25 px-4 font-bold"
        >
          {busy ? "Saving changes..." : "Save Changes"}
        </Button>
        <Button
          variant="outline"
          size="md"
          onClick={onDone}
          disabled={busy}
          className="w-25 font-semibold"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// One member of the lab. Everything an admin can change about somebody they
// outrank is edited in place, except the login, which opens the form below.
export default function MemberRow({
  member,
  isMe,
  email,
  isAdmin,
  canEdit,
  cols,
  busy,
  resetOpen,
  onToggleReset,
  onCloseReset,
  run,
  error,
  onError,
}: {
  member: Account;
  isMe: boolean;
  email: string;
  isAdmin: boolean;
  canEdit: boolean;
  cols: string;
  busy: boolean;
  resetOpen: boolean;
  onToggleReset: () => void;
  onCloseReset: () => void;
  run: RunAction;
  error: string | null;
  onError: (message: string | null) => void;
}) {
  // Inline quota editing. A trial is capped; blank means no cap at all.
  const [quotaDraft, setQuotaDraft] = useState<string | null>(null);

  async function commitQuota(draft: string) {
    setQuotaDraft(null);

    // NULL is what the backend reads as no cap, so blank clears it.
    const raw = draft.trim();
    const quota = raw === "" ? null : Number(raw);

    if (quota !== null && (!Number.isInteger(quota) || quota < 0)) {
      onError(
        "Enter a whole number greater than or equal to 0, or leave blank for unlimited tickets.",
      );
      return;
    }
    if (quota === member.quota) return;

    await run(() => updateAccount(member.id, { quota }));
  }

  // Which confirmation is on screen. Deleting and deactivating both need one;
  // switching somebody back on does not, so that one just happens.
  const [confirming, setConfirming] = useState<"delete" | "deactivate" | null>(
    null,
  );

  // A message left over from another row should not greet a fresh dialog.
  function openConfirm(which: "delete" | "deactivate") {
    onError(null);
    setConfirming(which);
  }

  function setActive(active: boolean) {
    return run(() => updateAccount(member.id, { active }));
  }

  return (
    <div className="flex min-h-10 flex-col justify-center rounded-[20px] bg-white pl-4 pr-2 py-1">
      <div className={`${cols} text-sm items-center gap-3`}>
        <span className="flex min-w-0 items-center">
          <span className="truncate" title={member.username}>
            {member.username}
          </span>
          {isMe && <span className={`${MUTED} shrink-0 ml-1`}>(You)</span>}
        </span>

        <span className="truncate" title={email}>
          {email}
        </span>

        {canEdit ? (
          <Select
            look="outlined"
            className="w-full"
            value={member.role}
            disabled={busy}
            onChange={(role) =>
              run(() => assignRole(member.id, role as AccountRole))
            }
            options={ASSIGNABLE_ROLES.map((role) => ({
              value: role,
              label: role,
            }))}
          />
        ) : (
          <span>{member.role}</span>
        )}

        {canEdit ? (
          quotaDraft !== null ? (
            <TextInput
              look="outlined-sm"
              autoFocus
              type="number"
              min={0}
              step={1}
              value={quotaDraft}
              onChange={setQuotaDraft}
              onBlur={() => commitQuota(quotaDraft)}
              onKeyDown={(event) => {
                // Blur is what commits, so Enter just leaves the field.
                // Escape unmounts it, which fires no blur at all.
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") setQuotaDraft(null);
              }}
              placeholder="Unlimited"
              className="w-full text-right"
            />
          ) : (
            <Button
              variant="outline"
              size="base"
              disabled={busy}
              onClick={() =>
                setQuotaDraft(member.quota === null ? "" : String(member.quota))
              }
              title="Ticket quota. Leave blank for unlimited tickets."
              className="h-8 w-full font-normal text-sm text-center"
            >
              {member.quota ?? "Unlimited"}
            </Button>
          )
        ) : (
          <span className="text-center">{member.quota ?? "-"}</span>
        )}

        {canEdit ? (
          <Button
            variant="outline-white"
            size="sm"
            disabled={busy}
            onClick={() =>
              member.active ? openConfirm("deactivate") : setActive(true)
            }
            className="w-full font-medium text-base"
          >
            {member.active ? "Deactivate" : "Activate"}
          </Button>
        ) : (
          <span className="text-center">
            {member.active ? "Active" : "Inactive"}
          </span>
        )}

        {isAdmin && (
          <div className="flex justify-end">
            {canEdit && (
              <Button
                variant="outline-white"
                size="sm"
                disabled={busy}
                onClick={onToggleReset}
                title="Change this user's email address or password."
                className="w-full font-medium text-base"
              >
                {resetOpen ? "Cancel" : "Reset"}
              </Button>
            )}
          </div>
        )}

        {isAdmin && (
          <div className="flex justify-end">
            {canEdit && (
              <Button
                variant="red"
                size="sm"
                disabled={busy}
                onClick={() => openConfirm("delete")}
                className="w-full font-bold"
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {resetOpen && (
        <ResetForm
          member={member}
          busy={busy}
          run={run}
          onDone={onCloseReset}
          onError={onError}
        />
      )}

      {confirming === "deactivate" && (
        <ConfirmModal
          title={`Deactivate ${member.username}'s account?`}
          confirmLabel="Deactivate"
          busyLabel="Deactivating..."
          error={error}
          onConfirm={() => setActive(false)}
          onClose={() => setConfirming(null)}
        >
          <p>
            {member.username} will keep their existing tasks and tickets but
            will not be able to sign in until their account is reactivated.
          </p>
        </ConfirmModal>
      )}

      {confirming === "delete" && (
        <ConfirmModal
          title={`Delete ${member.username}'s account?`}
          confirmLabel="Delete"
          busyLabel="Deleting..."
          error={error}
          onConfirm={() => run(() => deleteAccount(member.id))}
          onClose={() => setConfirming(null)}
        >
          <p>
            This action cannot be undone. If {member.username} is assigned to
            any tasks or tickets, consider deactivating their account instead.
          </p>
        </ConfirmModal>
      )}
    </div>
  );
}
