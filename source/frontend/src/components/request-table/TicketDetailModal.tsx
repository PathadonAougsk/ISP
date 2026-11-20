"use client";

import { useState } from "react";
import {
  canJudgeTicket,
  judgeTicket,
  putTicket,
  type TicketRow,
} from "@/lib/ticket";
import type { Category } from "@/lib/category";
import type { AccountRole, Member } from "@/lib/account";
import { TextInput } from "@/components/ui/field";
import {
  FormButton,
  FormColumn,
  FormModal,
  useFormSubmit,
} from "@/components/ui/form-modal";
import MemberPanel from "@/components/request-table/MemberPanel";
import {
  REQUIRED_MESSAGE,
  RequestFields,
  useRequestForm,
} from "@/components/request-table/RequestForm";

export default function TicketDetailModal({
  ticket,
  currentRole,
  currentUserId,
  members,
  categories,
  onClose,
  onSaved,
  onTaskCreated,
}: {
  ticket: TicketRow;
  currentRole: AccountRole;
  currentUserId: string;
  members: Member[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
  onTaskCreated: () => void;
}) {
  const form = useRequestForm(ticket);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const { saving, error, setError, run } = useFormSubmit();
  const [action, setAction] = useState<"update" | "accept" | "reject" | null>(
    null,
  );

  const isMine = ticket.createdById === currentUserId;
  const canEdit =
    isMine && (ticket.status === "Pending" || ticket.status === "Rejected");
  const canJudge = canJudgeTicket(
    currentRole,
    members.find((m) => m.id === ticket.createdById)?.role,
    isMine,
    ticket.status === "Pending",
  );

  // a rejected ticket can be resubmitted as it is
  const hasChanges = form.hasChanges || ticket.status === "Rejected";

  // run one save, then close on success
  async function submit(
    nextAction: NonNullable<typeof action>,
    save: () => Promise<unknown>,
    close: () => void,
  ) {
    setAction(nextAction);

    if (await run(save, "Failed to update ticket")) {
      onSaved();
      close();
    }
  }

  // judge only send the decision, the backend keep the saved fields
  function handleDecision(status: "accepted" | "rejected", close: () => void) {
    submit(
      status === "accepted" ? "accept" : "reject",
      async () => {
        await judgeTicket(ticket.id, status, assignedIds);
        if (status === "accepted") onTaskCreated();
      },
      close,
    );
  }

  function handleUpdate(close: () => void) {
    const values = form.values;
    if (!values) {
      setError(REQUIRED_MESSAGE);
      return;
    }

    submit(
      "update",
      () =>
        putTicket(ticket.id, {
          ...values,
          status: ticket.status === "Rejected" ? "pending" : undefined,
        }),
      close,
    );
  }

  return (
    <FormModal
      title="Judge ticket"
      id={ticket.id}
      onClose={onClose}
      error={error}
      footer={(close) => (
        <>
          {canEdit && (
            <FormButton
              variant="green"
              onClick={() => handleUpdate(close)}
              disabled={saving || !hasChanges || form.dateInvalid}
            >
              {saving && action === "update" ? "Saving…" : "Save"}
            </FormButton>
          )}

          {canJudge && (
            <>
              <FormButton
                variant="red"
                onClick={() => handleDecision("rejected", close)}
                disabled={saving}
              >
                {saving && action === "reject" ? "Rejecting…" : "Reject"}
              </FormButton>
              <FormButton
                variant="green"
                onClick={() => handleDecision("accepted", close)}
                disabled={saving}
              >
                {saving && action === "accept" ? "Accepting…" : "Accept"}
              </FormButton>
            </>
          )}
        </>
      )}
    >
      <FormColumn>
        <RequestFields form={form} categories={categories} readOnly={!canEdit}>
          <TextInput
            name="created_by"
            label="Created By"
            className="min-w-35 flex-1"
            value={ticket.createdBy}
            readOnly
          />
        </RequestFields>
      </FormColumn>

      {canJudge && (
        <MemberPanel
          members={members}
          selectedIds={assignedIds}
          onChange={setAssignedIds}
          hint="Selected members are assigned to the task when you accept."
        />
      )}
    </FormModal>
  );
}
