"use client";

import { useState } from "react";
import { putTicket, type TicketRow } from "@/lib/ticket";
import { postTask } from "@/lib/task";
import { categoryOptions, type Category } from "@/lib/category";
import { outranks, type AccountRole, type Member } from "@/lib/account";
import DateInput from "@/components/ui/date-input";
import { Select, TextArea, TextInput } from "@/components/ui/field";
import {
  FormButton,
  FormColumn,
  FormModal,
  useFormSubmit,
} from "@/components/ui/form-modal";
import MemberPanel from "@/components/request-table/MemberPanel";
import { formatDueDate } from "@/components/request-table/RequestList";

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
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description);
  const [dueDate, setDueDate] = useState(ticket.dueDateValue);
  const [categoryId, setCategoryId] = useState<number | "">(ticket.categoryId);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const { saving, error, setError, run } = useFormSubmit();

  const canEdit =
    ticket.createdById === currentUserId &&
    (ticket.status === "Pending" || ticket.status === "Rejected");

  // only role higher than creator can judge. creator not found = nobody
  const creatorRole = members.find((m) => m.id === ticket.createdById)?.role;
  const canJudge = !!creatorRole && outranks(currentRole, creatorRole);

  const hasChanges =
    title.trim() !== ticket.title ||
    (description || "") !== (ticket.description || "") ||
    (dueDate || "") !== (ticket.dueDateValue || "") ||
    categoryId !== ticket.categoryId ||
    ticket.status === "Rejected";

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
    const name = canEdit ? title.trim() : ticket.title;
    const text = canEdit ? description : ticket.description;
    const category = canEdit ? categoryId : ticket.categoryId;
    const due = canEdit ? dueDate : ticket.dueDateValue;

    if (!name || category === "") {
      setError("Title and category are required.");
      return;
    }

    const ok = await run(async () => {
      // 1. Save the edits and the new status together. "Accepted" ->
      // "accepted", the backend uses lowercase
      await putTicket(ticket.id, {
        name,
        description: text || null,
        category_id: category,
        due_date: due || null,
        status: newStatus.toLowerCase(),
      });

      if (newStatus !== "Accepted") return;

      // 2. If accepted, create the task from the same values
      try {
        await postTask({
          name,
          description: text || null,
          category_id: category,
          due_date: due || null,
          assignees: assignedIds,
        });
      } catch (taskError) {
        // Task failed: restore the previous status so it can be accepted again
        await putTicket(ticket.id, {
          status: ticket.status.toLowerCase(),
        }).catch(() => {});
        throw taskError;
      }

      onTaskCreated();
    }, "Failed to update ticket");

    if (ok) {
      onSaved();
      close();
    }
  }

  async function handleUpdate(close: () => void) {
    if (!hasChanges) return;

    if (!title.trim() || categoryId === "") {
      setError("Title and category are required.");
      return;
    }

    const ok = await run(
      () =>
        putTicket(ticket.id, {
          name: title.trim(),
          description: description || null,
          category_id: categoryId,
          due_date: dueDate || null,
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
          {canEdit && (
            <FormButton
              variant="green"
              onClick={() => handleUpdate(close)}
              disabled={saving || !hasChanges}
            >
              {saving ? "Saving…" : "Save Changes"}
            </FormButton>
          )}

          {canJudge && (
            <>
              <FormButton
                variant="red"
                onClick={() => handleDecision("Rejected", close)}
                disabled={saving || ticket.status === "Rejected"}
              >
                Reject
              </FormButton>
              <FormButton
                variant="green"
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
        <TextInput
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="Enter a title"
          readOnly={!canEdit}
        />

        <div className="flex gap-4">
          <TextInput
            label="Created By"
            className="w-[40%] min-w-0"
            value={ticket.createdBy}
            readOnly
          />
          <Select
            label="Category"
            className="w-[40%] min-w-0"
            value={categoryId}
            onChange={(value) => setCategoryId(value ? Number(value) : "")}
            options={categoryOptions(categories)}
            placeholder={{ value: "", label: "Select a category" }}
            readOnly={!canEdit}
            readOnlyText={ticket.category}
          />
          <DateInput
            label="Due Date"
            className="w-[20%] min-w-0"
            value={dueDate}
            onChange={setDueDate}
            readOnly={!canEdit}
            readOnlyText={formatDueDate(ticket)}
          />
        </div>

        <TextArea
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="Add more details"
          readOnly={!canEdit}
          grow
        />
      </FormColumn>

      {canJudge && ticket.status !== "Accepted" && (
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
