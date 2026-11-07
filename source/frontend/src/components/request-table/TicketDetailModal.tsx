"use client";
import { useState } from "react";
import { putTicket, type TicketRow } from "@/lib/ticket";
import { postTask } from "@/lib/task";
import type { Category } from "@/lib/category";
import { outranks, type AccountRole, type Member } from "@/lib/account";
import { formatDueDate } from "@/components/request-table/RequestList";
import {
  DateField,
  FormButton,
  FormColumn,
  FormModal,
  MemberPanel,
  SelectField,
  TextAreaField,
  TextField,
  useFormSubmit,
} from "@/components/request-table/FormParts";

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
  const [editTicketTitle, setEditTicketTitle] = useState(ticket.title);
  const [editTicketDescription, setEditTicketDescription] = useState(
    ticket.description,
  );
  const [editTicketDueDate, setEditTicketDueDate] = useState(
    ticket.dueDateValue,
  );
  const [editTicketCategoryId, setEditTicketCategoryId] = useState<number | "">(
    ticket.categoryId,
  );
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([]);
  const { saving, error, setError, run } = useFormSubmit();

  const canEditTicket =
    ticket.createdById === currentUserId &&
    (ticket.status === "Pending" || ticket.status === "Rejected");

  // only role higher than creator can judge. creator not found = nobody
  const creatorRole = members.find((m) => m.id === ticket.createdById)?.role;
  const canJudge = !!creatorRole && outranks(currentRole, creatorRole);

  async function handleDecision(
    newStatus: TicketRow["status"],
    close: () => void,
  ) {
    if (ticket.status === newStatus) return;
    if (!canJudge) {
      setError("You can't accept or reject this ticket.");
      return;
    }

    // Use the edited form values when the user can edit, otherwise the saved ones
    const title = canEditTicket ? editTicketTitle.trim() : ticket.title;
    const description = canEditTicket
      ? editTicketDescription
      : ticket.description;
    const categoryId = canEditTicket ? editTicketCategoryId : ticket.categoryId;
    const dueDate = canEditTicket ? editTicketDueDate : ticket.dueDateValue;

    if (!title || categoryId === "") {
      setError("Title and category are required.");
      return;
    }

    const backendStatus = newStatus === "Accepted" ? "accepted" : "rejected";
    const previousStatus =
      ticket.status === "Accepted"
        ? "accepted"
        : ticket.status === "Rejected"
          ? "rejected"
          : "pending";

    const ok = await run(async () => {
      // 1. Save the edits and the new status together
      await putTicket(ticket.id, {
        name: title,
        description: description || null,
        category_id: categoryId,
        due_date: dueDate || null,
        status: backendStatus,
      });

      // 2. If accepted, create the task from the edited values
      if (newStatus === "Accepted") {
        try {
          await postTask({
            name: title,
            description: description || null,
            category_id: categoryId,
            due_date: dueDate || null,
            assignees: assignedMemberIds,
          });
        } catch (taskErr) {
          // Task failed: restore the previous status so it can be accepted again
          await putTicket(ticket.id, {
            status: previousStatus,
          }).catch(() => {});
          throw taskErr;
        }
        onTaskCreated();
      }
    }, "Failed to update ticket");

    if (ok) {
      onSaved();
      setAssignedMemberIds([]);
      close();
    }
  }

  async function handleUpdateTicket(close: () => void) {
    if (!editTicketTitle.trim() || editTicketCategoryId === "") {
      setError("Title and category are required.");
      return;
    }

    const ok = await run(
      () =>
        putTicket(ticket.id, {
          name: editTicketTitle.trim(),
          description: editTicketDescription || null,
          category_id: editTicketCategoryId,
          due_date: editTicketDueDate || null,
          status: ticket.status === "Rejected" ? "pending" : undefined,
        }),
      "Failed to update ticket",
    );

    if (ok) {
      onSaved();
      close();
    }
  }

  return (
    <FormModal
      title="Judge ticket"
      onClose={onClose}
      error={error}
      footer={(close) => (
        <>
          {canEditTicket && (
            <FormButton
              color="green"
              onClick={() => handleUpdateTicket(close)}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Changes"}
            </FormButton>
          )}

          {canJudge && (
            <>
              <FormButton
                color="red"
                onClick={() => handleDecision("Rejected", close)}
                disabled={saving || ticket.status === "Rejected"}
              >
                Reject
              </FormButton>
              <FormButton
                color="green"
                onClick={() => handleDecision("Accepted", close)}
                disabled={saving || ticket.status === "Accepted"}
              >
                {saving ? "Saving…" : "Accept"}
              </FormButton>
            </>
          )}
        </>
      )}
    >
      <FormColumn>
        <TextField
          label="Title"
          value={editTicketTitle}
          onChange={setEditTicketTitle}
          readOnly={!canEditTicket}
        />

        <div className="flex gap-4">
          <SelectField
            label="Category"
            className="flex-1 min-w-0"
            value={editTicketCategoryId}
            onChange={setEditTicketCategoryId}
            categories={categories}
            readOnly={!canEditTicket}
            readOnlyText={ticket.category}
          />
          <DateField
            label="Due Date"
            className="flex-1 min-w-0"
            value={editTicketDueDate}
            onChange={setEditTicketDueDate}
            readOnly={!canEditTicket}
            readOnlyText={formatDueDate(ticket)}
          />
        </div>

        <TextAreaField
          label="Description"
          value={editTicketDescription}
          onChange={setEditTicketDescription}
          readOnly={!canEditTicket}
        />

        <TextField label="Created By" value={ticket.createdBy} readOnly />
      </FormColumn>

      {canJudge && ticket.status !== "Accepted" && (
        <MemberPanel
          members={members}
          selectedIds={assignedMemberIds}
          onChange={setAssignedMemberIds}
          hint="Selected members are assigned to the task when you accept."
        />
      )}
    </FormModal>
  );
}
